// ComplianceAI Settings Script

document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  loadUsageStats();
  
  // Event listeners
  document.getElementById('testApiKey').addEventListener('click', testApiKey);
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('clearUsage').addEventListener('click', clearUsageData);
  document.getElementById('clearCache').addEventListener('click', clearCache);
  
  // Auto-save on input changes
  const inputs = document.querySelectorAll('input[type="checkbox"], input[type="number"]');
  inputs.forEach(input => {
    input.addEventListener('change', saveSettings);
  });
});

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'apiKey',
      'autoAnalyze',
      'notifications',
      'maxTokensPerRequest',
      'dailyRequestLimit',
      'cacheResults'
    ]);
    
    // Populate form fields
    if (settings.apiKey) {
      document.getElementById('apiKey').value = settings.apiKey;
    }
    
    document.getElementById('autoAnalyze').checked = settings.autoAnalyze || false;
    document.getElementById('notifications').checked = settings.notifications !== false; // Default true
    document.getElementById('maxTokens').value = settings.maxTokensPerRequest || 2000;
    document.getElementById('dailyLimit').value = settings.dailyRequestLimit || 50;
    document.getElementById('cacheResults').checked = settings.cacheResults !== false; // Default true
    
  } catch (error) {
    showStatus('error', 'Failed to load settings: ' + error.message);
  }
}

async function saveSettings() {
  try {
    const apiKeyInput = document.getElementById('apiKey');
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
    console.log('API key from input:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Empty');
    const autoAnalyze = document.getElementById('autoAnalyze').checked;
    const notifications = document.getElementById('notifications').checked;
    const maxTokensPerRequest = parseInt(document.getElementById('maxTokens').value);
    const dailyRequestLimit = parseInt(document.getElementById('dailyLimit').value);
    const cacheResults = document.getElementById('cacheResults').checked;
    
    // Validation
    if (apiKey && !apiKey.startsWith('sk-ant-api03-')) {
      showStatus('error', 'Invalid API key format. Claude API keys start with "sk-ant-api03-"');
      return;
    }
    
    if (maxTokensPerRequest < 500 || maxTokensPerRequest > 4000) {
      showStatus('error', 'Max tokens must be between 500 and 4000');
      return;
    }
    
    if (dailyRequestLimit < 1 || dailyRequestLimit > 200) {
      showStatus('error', 'Daily limit must be between 1 and 200');
      return;
    }
    
    // Save settings
    await chrome.storage.sync.set({
      apiKey,
      autoAnalyze,
      notifications,
      maxTokensPerRequest,
      dailyRequestLimit,
      cacheResults
    });
    
    console.log('Settings saved, API key:', apiKey ? 'Set' : 'Empty');
    showStatus('success', 'Settings saved successfully!');
    
    // Update usage stats with new limits
    loadUsageStats();
    
  } catch (error) {
    showStatus('error', 'Failed to save settings: ' + error.message);
  }
}

async function testApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const button = document.getElementById('testApiKey');
  
  if (!apiKey) {
    showApiStatus('error', 'Please enter an API key first');
    return;
  }
  
  button.disabled = true;
  button.textContent = 'Testing...';
  
  try {
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
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Hello'
        }]
      })
    });
    
    if (response.ok) {
      showApiStatus('success', 'API key is valid and working!');
    } else {
      const errorData = await response.json().catch(() => ({}));
      showApiStatus('error', `API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }
    
  } catch (error) {
    showApiStatus('error', 'Network error: ' + error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Test API Key';
  }
}

async function loadUsageStats() {
  try {
    const today = new Date().toDateString();
    const { usageData = {}, dailyRequestLimit = 50 } = await chrome.storage.local.get(['usageData']);
    
    const todayUsage = usageData[today] || { requests: 0, tokens: 0 };
    const remainingRequests = Math.max(0, dailyRequestLimit - todayUsage.requests);
    
    // Estimate cost (Claude Haiku pricing: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens)
    // Rough estimate: $0.5 per 1M tokens average
    const estimatedCost = (todayUsage.tokens * 0.5 / 1000000).toFixed(4);
    
    document.getElementById('todayRequests').textContent = todayUsage.requests;
    document.getElementById('todayTokens').textContent = todayUsage.tokens.toLocaleString();
    document.getElementById('remainingRequests').textContent = remainingRequests;
    document.getElementById('estimatedCost').textContent = '$' + estimatedCost;
    
    // Update daily limit display
    document.getElementById('dailyLimit').value = dailyRequestLimit;
    
  } catch (error) {
    console.error('Failed to load usage stats:', error);
  }
}

async function clearUsageData() {
  if (confirm('Are you sure you want to clear all usage data? This cannot be undone.')) {
    try {
      await chrome.storage.local.remove(['usageData']);
      loadUsageStats();
      showStatus('success', 'Usage data cleared successfully!');
    } catch (error) {
      showStatus('error', 'Failed to clear usage data: ' + error.message);
    }
  }
}

async function clearCache() {
  if (confirm('Are you sure you want to clear all cached analysis results?')) {
    try {
      await chrome.storage.local.remove(['analysisCache']);
      showStatus('success', 'Analysis cache cleared successfully!');
    } catch (error) {
      showStatus('error', 'Failed to clear cache: ' + error.message);
    }
  }
}

function showStatus(type, message) {
  const statusDiv = document.getElementById('saveStatus');
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

function showApiStatus(type, message) {
  const statusDiv = document.getElementById('apiStatus');
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  
  // Auto-hide after 10 seconds for API status
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 10000);
}