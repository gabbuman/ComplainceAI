// ComplianceAI Background Service Worker

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      autoAnalyze: false,
      notifications: true,
      maxTokensPerRequest: 2000,
      dailyRequestLimit: 50
    });
    
    // Open welcome page
    chrome.tabs.create({ url: 'settings.html' });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    chrome.action.openPopup();
  } else if (request.action === 'analyzeTab') {
    analyzeTab(request.tabId).then(sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'getUsageStats') {
    getUsageStats().then(sendResponse);
    return true;
  }
});

// Handle tab updates to detect terms pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const { autoAnalyze } = await chrome.storage.sync.get(['autoAnalyze']);
    
    if (autoAnalyze && isTermsUrl(tab.url)) {
      // Show notification that terms page was detected
      showTermsDetectedBadge(tabId);
      
      // Optionally auto-analyze
      const { notifications } = await chrome.storage.sync.get(['notifications']);
      if (notifications && chrome.notifications && chrome.notifications.create) {
        chrome.notifications.create(`terms-detected-${tabId}`, {
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'ComplianceAI',
          message: 'Terms & Conditions page detected. Click extension to analyze.',
          buttons: [{ title: 'Analyze Now' }]
        });
      }
    }
  }
});

// Handle notification button clicks (check if notifications API is available)
if (chrome.notifications && chrome.notifications.onButtonClicked) {
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId.startsWith('terms-detected-') && buttonIndex === 0) {
      const tabId = parseInt(notificationId.split('-').pop());
      analyzeTab(tabId);
    }
  });
}

async function analyzeTab(tabId) {
  try {
    // Check usage limits
    const canAnalyze = await checkUsageLimits();
    if (!canAnalyze) {
      throw new Error('Daily usage limit reached');
    }
    
    // Extract content from tab
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      function: () => {
        return window.extractTermsContent ? window.extractTermsContent() : null;
      }
    });
    
    if (!result?.result?.content) {
      throw new Error('No terms content found');
    }
    
    // Analyze with AI
    const analysis = await analyzeWithAI(result.result);
    
    // Update usage stats
    await updateUsageStats(analysis.tokensUsed || 1000);
    
    // Send analysis to content script for display
    chrome.tabs.sendMessage(tabId, {
      action: 'showPanel',
      analysis
    });
    
    // Cache analysis
    const { analysisCache = {} } = await chrome.storage.local.get(['analysisCache']);
    analysisCache[result.result.url] = {
      analysis,
      timestamp: Date.now()
    };
    await chrome.storage.local.set({ analysisCache });
    
    return analysis;
    
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

async function analyzeWithAI(contentData) {
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  
  if (!apiKey) {
    throw new Error('API key not configured');
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
      system: `You are a legal compliance expert. Analyze Terms & Conditions and Privacy Policies to identify key obligations, rights, and requirements that users should be aware of.`,
      messages: [{
        role: 'user',
        content: `Analyze these Terms & Conditions from ${contentData.url}:

Title: ${contentData.title}
Content: ${contentData.content}

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
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const resultText = data.content[0].text;
  
  // Parse JSON response
  const jsonMatch = resultText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid AI response format');
  }
  
  const analysis = JSON.parse(jsonMatch[0]);
  analysis.tokensUsed = data.usage.input_tokens + data.usage.output_tokens;
  analysis.url = contentData.url;
  analysis.analyzedAt = new Date().toISOString();
  
  return analysis;
}

function isTermsUrl(url) {
  const urlLower = url.toLowerCase();
  const keywords = ['terms', 'privacy', 'policy', 'legal', 'agreement', 'conditions', 'tos', 'eula'];
  
  return keywords.some(keyword => urlLower.includes(keyword));
}

function showTermsDetectedBadge(tabId) {
  chrome.action.setBadgeText({
    text: '!',
    tabId
  });
  
  chrome.action.setBadgeBackgroundColor({
    color: '#667eea',
    tabId
  });
  
  // Clear badge after 10 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '', tabId });
  }, 10000);
}

async function checkUsageLimits() {
  const today = new Date().toDateString();
  const { usageData = {}, dailyRequestLimit = 50 } = await chrome.storage.local.get(['usageData', 'dailyRequestLimit']);
  
  const todayUsage = usageData[today] || { requests: 0, tokens: 0 };
  
  return todayUsage.requests < dailyRequestLimit && todayUsage.tokens < 100000;
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
}

async function getUsageStats() {
  const today = new Date().toDateString();
  const { usageData = {}, dailyRequestLimit = 50 } = await chrome.storage.local.get(['usageData', 'dailyRequestLimit']);
  
  const todayUsage = usageData[today] || { requests: 0, tokens: 0 };
  
  return {
    today: todayUsage,
    limits: {
      dailyRequests: dailyRequestLimit,
      dailyTokens: 100000
    },
    remaining: {
      requests: dailyRequestLimit - todayUsage.requests,
      tokens: 100000 - todayUsage.tokens
    }
  };
}