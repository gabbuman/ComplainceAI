// ComplianceAI Extension Popup Script

document.addEventListener('DOMContentLoaded', async function() {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const results = document.getElementById('results');
  const settingsBtn = document.getElementById('settingsBtn');
  
  // Load usage stats
  await loadUsageStats();
  
  analyzeBtn.addEventListener('click', analyzeCurrentPage);
  settingsBtn.addEventListener('click', openSettings);
  
  // Check if analysis is already available for current page
  checkExistingAnalysis();
});

async function analyzeCurrentPage() {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const results = document.getElementById('results');
  
  try {
    // Disable button and show analyzing status
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    status.style.display = 'block';
    status.className = 'status analyzing';
    statusText.textContent = 'Scanning page for Terms & Conditions...';
    results.style.display = 'none';
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject content script to extract terms content
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractTermsContent
    });
    
    const termsContent = result.result;
    
    if (!termsContent || termsContent.length < 100) {
      showStatus('no-terms', 'No Terms & Conditions content detected on this page.');
      return;
    }
    
    statusText.textContent = 'Analyzing content with AI...';
    
    // Check usage limits
    const canAnalyze = await checkUsageLimits();
    if (!canAnalyze) {
      showStatus('error', 'Daily usage limit reached. Please try again tomorrow.');
      return;
    }
    
    // Send to AI for analysis
    const analysis = await analyzeWithAI(termsContent, tab.url);
    
    // Display results
    displayResults(analysis);
    
    // Update usage stats
    await updateUsageStats(analysis.tokensUsed || 1000);
    
    showStatus('success', 'Analysis complete!');
    
  } catch (error) {
    console.error('Analysis error:', error);
    showStatus('error', `Error: ${error.message}`);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Page Terms';
  }
}

function extractTermsContent() {
  // Function that runs in the page context to extract T&C content
  const selectors = [
    '[class*="terms"]',
    '[class*="privacy"]',
    '[class*="policy"]',
    '[class*="legal"]',
    '[class*="agreement"]',
    '[class*="conditions"]',
    '[id*="terms"]',
    '[id*="privacy"]',
    '[id*="policy"]',
    '[id*="legal"]',
    'h1, h2, h3',
    'p, div, section, article'
  ];
  
  let content = '';
  
  // Check if this looks like a terms/privacy page by URL or title
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const isTermsPage = /terms|privacy|policy|legal|agreement|conditions/.test(url + ' ' + title);
  
  if (isTermsPage) {
    // If it's a dedicated terms page, get main content
    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
    content = main.innerText;
  } else {
    // Look for terms-related content
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.innerText || element.textContent || '';
        if (text.length > 50 && /terms|privacy|policy|legal|agreement|condition|data|user|service/.test(text.toLowerCase())) {
          content += text + '\n\n';
        }
      }
    }
  }
  
  // Clean and truncate content
  content = content.replace(/\s+/g, ' ').trim();
  
  // Return first 8000 characters to avoid token limits
  return content.substring(0, 8000);
}

async function analyzeWithAI(content, pageUrl) {
  // Get API key from storage (for testing only - production uses backend)
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  
  console.log('Retrieved API key from storage');
  
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key not configured. Please set it in Settings.');
  }
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.3,
      system: 'You are a compliance expert. Analyze Terms & Conditions for key requirements and obligations.',
      messages: [{
        role: 'user',
        content: `Analyze these Terms & Conditions from ${pageUrl}:

${content}

Provide analysis in JSON format:
{
  "summary": "Brief summary of key points",
  "compliance_score": 75,
  "requirements": [
    {
      "requirement_text": "Original requirement",
      "plain_english": "Simple explanation", 
      "category": "data_protection",
      "priority": "high"
    }
  ]
}

Focus on: data collection, user rights, liability, cancellation, dispute resolution.
Priority: critical, high, medium, low
Categories: data_protection, user_rights, liability, payment, termination`
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const resultText = data.content[0].text;
  
  console.log('Raw AI response:', resultText); // Debug logging
  
  // Parse AI response with robust JSON handling
  const analysis = parseAIResponse(resultText);
  analysis.tokensUsed = data.usage.input_tokens + data.usage.output_tokens;
  
  return analysis;
}

function parseAIResponse(resultText) {
  try {
    // Method 1: Try direct JSON parsing (if response is clean)
    let jsonData = tryDirectJSONParse(resultText);
    if (jsonData) return jsonData;
    
    // Method 2: Extract JSON block and clean it
    jsonData = tryJSONExtraction(resultText);
    if (jsonData) return jsonData;
    
    // Method 3: Parse structured text if JSON fails
    console.warn('JSON parsing failed, using text parsing fallback');
    return parseStructuredText(resultText);
    
  } catch (error) {
    console.error('All parsing methods failed:', error);
    return createFallbackAnalysis(resultText);
  }
}

function tryDirectJSONParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function tryJSONExtraction(text) {
  try {
    // Multiple extraction patterns
    const patterns = [
      /\{[\s\S]*?\}/g,              // Basic JSON block
      /```json\s*(\{[\s\S]*?\})\s*```/gi,  // Code block JSON
      /```(\{[\s\S]*?\})```/gi,     // Code block without json
      /(\{[\s\S]*"requirements"[\s\S]*?\})/gi  // Look for requirements block
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          let jsonStr = match.replace(/```json|```/g, '').trim();
          
          // Clean common JSON issues
          jsonStr = cleanJSONString(jsonStr);
          
          try {
            const parsed = JSON.parse(jsonStr);
            if (isValidAnalysis(parsed)) {
              return parsed;
            }
          } catch (e) {
            console.log('Failed to parse JSON attempt:', e.message);
            continue;
          }
        }
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

function cleanJSONString(jsonStr) {
  // Fix common JSON formatting issues
  return jsonStr
    .replace(/,(\s*[}\]])/g, '$1')     // Remove trailing commas
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"')     // Replace single quotes with double
    .replace(/\n/g, ' ')                     // Remove newlines
    .replace(/\s+/g, ' ')                    // Normalize whitespace
    .trim();
}

function isValidAnalysis(data) {
  return data && 
         typeof data === 'object' && 
         (data.summary || data.compliance_score || data.requirements);
}

function parseStructuredText(text) {
  // Extract information from structured text when JSON fails
  const analysis = {
    summary: extractSummary(text),
    compliance_score: extractScore(text),
    requirements: extractRequirements(text)
  };
  
  return analysis;
}

function extractSummary(text) {
  const summaryPatterns = [
    /summary[\":\s]+([^\n]+)/i,
    /brief summary[\":\s]+([^\n]+)/i,
    /^([^.]+\.)/m
  ];
  
  for (const pattern of summaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/["\[\]]/g, '').trim();
    }
  }
  
  return "Document analyzed - see requirements below for details.";
}

function extractScore(text) {
  const scorePatterns = [
    /compliance_score[\":\s]+(\d+)/i,
    /score[\":\s]+(\d+)/i,
    /(\d+)(?:\s*%|\s*out\s*of\s*100)/i
  ];
  
  for (const pattern of scorePatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return 50; // Default score
}

function extractRequirements(text) {
  const requirements = [];
  
  // Look for requirement patterns
  const reqPatterns = [
    /requirement[s]?[\":\s]*\[([\s\S]*?)\]/i,
    /requirements[\":\s]*([^\n]*(?:\n(?!\w+:)[^\n]*)*)/gi
  ];
  
  // Try to extract structured requirements
  const lines = text.split('\n');
  let currentReq = null;
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    // Look for requirement indicators
    if (/^[-*•]\s|^\d+\.\s/.test(cleanLine)) {
      if (currentReq) {
        requirements.push(currentReq);
      }
      
      currentReq = {
        requirement_text: cleanLine.replace(/^[-*•\d.\s]+/, ''),
        plain_english: cleanLine.replace(/^[-*•\d.\s]+/, ''),
        category: guessCategory(cleanLine),
        priority: guessPriority(cleanLine)
      };
    }
  }
  
  if (currentReq) {
    requirements.push(currentReq);
  }
  
  // If no requirements found, create a generic one
  if (requirements.length === 0) {
    requirements.push({
      requirement_text: "Please review the terms and conditions manually for specific requirements.",
      plain_english: "This document contains terms that should be reviewed by the user.",
      category: "general",
      priority: "medium"
    });
  }
  
  return requirements.slice(0, 5); // Limit to 5 requirements
}

function guessCategory(text) {
  const categories = {
    'data_protection': /data|privacy|personal|collect|process|gdpr|ccpa/i,
    'user_rights': /rights|delete|access|download|portability/i,
    'liability': /liable|responsible|damages|limit|disclaim/i,
    'payment': /payment|billing|refund|cancel|subscription/i,
    'termination': /terminate|suspend|close|end|expire/i
  };
  
  for (const [category, pattern] of Object.entries(categories)) {
    if (pattern.test(text)) {
      return category;
    }
  }
  
  return 'general';
}

function guessPriority(text) {
  if (/critical|important|must|required|shall/i.test(text)) return 'high';
  if (/optional|may|can|should/i.test(text)) return 'low';
  return 'medium';
}

function createFallbackAnalysis(text) {
  return {
    summary: "Document analysis completed. The terms contain various legal provisions that should be reviewed.",
    compliance_score: 50,
    requirements: [
      {
        requirement_text: "Manual review recommended",
        plain_english: "This document should be reviewed manually for specific legal requirements.",
        category: "general",
        priority: "medium"
      }
    ]
  };
}

function displayResults(analysis) {
  const results = document.getElementById('results');
  const complianceScore = document.getElementById('complianceScore');
  const summary = document.getElementById('summary');
  const requirements = document.getElementById('requirements');
  
  // Show results
  results.style.display = 'block';
  
  // Display score
  complianceScore.textContent = analysis.compliance_score || '--';
  
  // Display summary
  summary.textContent = analysis.summary || 'Analysis completed successfully.';
  
  // Display requirements
  requirements.innerHTML = '';
  
  if (analysis.requirements && analysis.requirements.length > 0) {
    analysis.requirements.forEach(req => {
      const reqDiv = document.createElement('div');
      reqDiv.className = 'requirement';
      
      const priority = req.priority || 'medium';
      reqDiv.innerHTML = `
        <div class="requirement-priority priority-${priority}">${priority}</div>
        <div class="requirement-text">${req.requirement_text || req.plain_english || 'Requirement'}</div>
        <div class="requirement-explanation">${req.plain_english || req.requirement_text || ''}</div>
      `;
      
      requirements.appendChild(reqDiv);
    });
  } else {
    requirements.innerHTML = '<div class="requirement">No specific requirements identified.</div>';
  }
}

async function checkUsageLimits() {
  const today = new Date().toDateString();
  const { usageData = {} } = await chrome.storage.local.get(['usageData']);
  
  const todayUsage = usageData[today] || { requests: 0, tokens: 0 };
  
  return todayUsage.requests < 50 && todayUsage.tokens < 100000;
}

async function updateUsageStats(tokensUsed) {
  const today = new Date().toDateString();
  const { usageData = {} } = await chrome.storage.local.get(['usageData']);
  
  if (!usageData[today]) {
    usageData[today] = { requests: 0, tokens: 0 };
  }
  
  usageData[today].requests += 1;
  usageData[today].tokens += tokensUsed;
  
  await chrome.storage.local.set({ usageData });
  await loadUsageStats();
}

async function loadUsageStats() {
  const today = new Date().toDateString();
  const { usageData = {} } = await chrome.storage.local.get(['usageData']);
  
  const todayUsage = usageData[today] || { requests: 0, tokens: 0 };
  
  document.getElementById('dailyUsage').textContent = todayUsage.requests;
  document.getElementById('tokensUsed').textContent = todayUsage.tokens;
}

function showStatus(type, message) {
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  
  status.style.display = 'block';
  status.className = `status ${type}`;
  statusText.textContent = message;
}

async function checkExistingAnalysis() {
  // Check if we have cached analysis for current URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { analysisCache = {} } = await chrome.storage.local.get(['analysisCache']);
  
  const cached = analysisCache[tab.url];
  if (cached && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) { // 24 hours
    displayResults(cached.analysis);
    showStatus('success', 'Showing cached analysis');
  }
}

function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
}