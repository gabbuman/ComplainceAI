const express = require('express');
const { body, validationResult } = require('express-validator');
const anthropic = require('@anthropic-ai/sdk');
const { authenticateToken } = require('./auth');
const { getUser, updateUserAnalysesUsed, logAnalysis } = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Initialize Claude client
const claude = new anthropic.Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Analyze terms and conditions
router.post('/analyze', authenticateToken, [
  body('content').isLength({ min: 100, max: 10000 }).trim(),
  body('url').isURL(),
  body('title').optional().isLength({ max: 200 }).trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, url, title } = req.body;
    const userId = req.user.userId;

    // Get user and check usage limits
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has exceeded their limit
    if (user.analysesUsed >= user.analysesLimit) {
      return res.status(429).json({ 
        error: 'Analysis limit exceeded',
        message: user.plan === 'free' 
          ? 'You have used all your free analyses. Please upgrade to continue.'
          : 'Daily analysis limit reached. Please try again tomorrow.',
        analysesUsed: user.analysesUsed,
        analysesLimit: user.analysesLimit,
        plan: user.plan
      });
    }

    // Generate analysis ID
    const analysisId = uuidv4();

    // Analyze with Claude
    const analysis = await analyzeWithClaude(content, url, title);

    // Update user's usage count
    await updateUserAnalysesUsed(userId, user.analysesUsed + 1);

    // Log the analysis
    await logAnalysis({
      id: analysisId,
      userId,
      url,
      title: title || 'Untitled',
      contentLength: content.length,
      tokensUsed: analysis.tokensUsed,
      createdAt: new Date().toISOString()
    });

    // Return analysis results
    res.json({
      analysisId,
      analysis: {
        summary: analysis.summary,
        compliance_score: analysis.compliance_score,
        requirements: analysis.requirements
      },
      usage: {
        analysesUsed: user.analysesUsed + 1,
        analysesLimit: user.analysesLimit,
        remaining: user.analysesLimit - user.analysesUsed - 1
      },
      tokensUsed: analysis.tokensUsed
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    if (error.message.includes('API')) {
      res.status(503).json({ 
        error: 'Analysis service temporarily unavailable',
        message: 'Please try again in a few moments'
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get user's analysis history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Get user's analysis history from database
    // Implementation depends on your database structure
    
    res.json({
      analyses: [], // Would contain analysis history
      total: 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Claude analysis function
async function analyzeWithClaude(content, url, title) {
  try {
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.3,
      system: `You are a legal compliance expert. Analyze Terms & Conditions and Privacy Policies to identify key obligations, rights, and requirements that users should be aware of.`,
      messages: [{
        role: 'user',
        content: `Analyze these Terms & Conditions from ${url}:

Title: ${title || 'Terms & Conditions'}
Content: ${content}

Provide your analysis in JSON format:
{
  "summary": "2-3 sentence summary of the most important points",
  "compliance_score": 75,
  "requirements": [
    {
      "requirement_text": "Original legal text",
      "plain_english": "Simple explanation of what this means for users",
      "category": "data_protection",
      "priority": "high"
    }
  ]
}

Focus on identifying:
- Data collection and usage practices
- User rights and how to exercise them
- Important limitations of liability
- Cancellation and refund policies
- Dispute resolution mechanisms
- Account termination conditions
- Key obligations for users

Priority levels: critical (immediately actionable), high (important to know), medium (good to know), low (minor details)
Categories: data_protection, user_rights, liability, payment, termination, dispute_resolution, usage_rules`
      }]
    });

    const resultText = response.content[0].text;
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    // Parse JSON response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    analysis.tokensUsed = tokensUsed;

    return analysis;

  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Analysis API error: ' + error.message);
  }
}

module.exports = router;