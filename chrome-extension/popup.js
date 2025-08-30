// ComplianceAI Extension Popup Script (Backend Version)

const API_BASE_URL = 'http://localhost:3000/api'; // Update when deployed

document.addEventListener('DOMContentLoaded', async function() {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const results = document.getElementById('results');
  const settingsBtn = document.getElementById('settingsBtn');
  
  // Load user info and usage stats
  await loadUserInfo();
  
  analyzeBtn.addEventListener('click', analyzeCurrentPage);
  settingsBtn.addEventListener('click', openSettings);
  
  // Check if analysis is already available for current page
  checkExistingAnalysis();
});

async function loadUserInfo() {
  try {
    const { token } = await chrome.storage.sync.get(['token']);
    
    if (!token) {
      showLoginPrompt();
      return;
    }

    // Get user profile
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      updateUsageDisplay(data.user);
    } else if (response.status === 401) {
      // Token expired, show login
      await chrome.storage.sync.remove(['token']);
      showLoginPrompt();
    } else {
      throw new Error('Failed to load user info');
    }

  } catch (error) {
    console.error('Failed to load user info:', error);
    showLoginPrompt();
  }
}

function showLoginPrompt() {
  const content = document.querySelector('.content');
  content.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h3>Welcome to ComplianceAI!</h3>
      <p>Get 3 free analyses to understand Terms & Conditions on any website.</p>
      
      <div style="margin: 20px 0;">
        <input type="email" id="userEmail" placeholder="Enter your email" 
               style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <button id="registerBtn" style="width: 100%; padding: 10px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Start Free Trial
        </button>
      </div>
      
      <div style="font-size: 12px; color: #666; margin-top: 15px;">
        <p>✓ 3 free analyses<br>✓ No credit card required<br>✓ Upgrade anytime for unlimited use</p>
      </div>
      
      <div id="loginStatus" style="margin-top: 10px;"></div>
    </div>
  `;
  
  document.getElementById('registerBtn').addEventListener('click', registerUser);
}

async function registerUser() {
  const email = document.getElementById('userEmail').value.trim();
  const loginStatus = document.getElementById('loginStatus');
  const registerBtn = document.getElementById('registerBtn');
  
  if (!email || !email.includes('@')) {
    loginStatus.innerHTML = '<div style="color: red; font-size: 12px;">Please enter a valid email address</div>';
    return;
  }
  
  registerBtn.disabled = true;
  registerBtn.textContent = 'Creating account...';
  
  try {
    // Generate unique extension ID
    const extensionId = generateExtensionId();
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        extensionId
      })
    });
    
    const data = await response.json();
    
    console.log('Registration response:', response.status, data);
    
    if (response.ok) {
      // Save token and reload
      await chrome.storage.sync.set({ 
        token: data.token, 
        user: data.user,
        extensionId 
      });
      
      loginStatus.innerHTML = '<div style="color: green; font-size: 12px;">Account created successfully!</div>';
      
      // Reload popup
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } else {
      if (response.status === 409) {
        // User exists, try login
        await loginUser(email, extensionId);
      } else {
        console.error('Registration failed:', data);
        const errorMsg = data.errors ? data.errors.map(e => e.msg).join(', ') : (data.error || 'Registration failed');
        throw new Error(errorMsg);
      }
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    loginStatus.innerHTML = `<div style="color: red; font-size: 12px;">Error: ${error.message}</div>`;
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = 'Start Free Trial';
  }
}

async function loginUser(email, extensionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        extensionId
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      await chrome.storage.sync.set({ 
        token: data.token, 
        user: data.user,
        extensionId 
      });
      
      document.getElementById('loginStatus').innerHTML = '<div style="color: green; font-size: 12px;">Logged in successfully!</div>';
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } else {
      throw new Error(data.error || 'Login failed');
    }
    
  } catch (error) {
    document.getElementById('loginStatus').innerHTML = `<div style="color: red; font-size: 12px;">Login failed: ${error.message}</div>`;
  }
}

function generateExtensionId() {
  // Generate a unique ID for this browser/extension installation (lowercase letters only)
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  return Array.from({length: 32}, () => letters[Math.floor(Math.random() * 26)]).join('');
}

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
    
    const termsData = result.result;
    
    if (!termsData.content || termsData.content.length < 100) {
      showStatus('no-terms', 'No Terms & Conditions content detected on this page.');
      return;
    }
    
    statusText.textContent = 'Analyzing content with AI...';
    
    // Get token
    const { token } = await chrome.storage.sync.get(['token']);
    if (!token) {
      showStatus('error', 'Please log in to analyze content.');
      showLoginPrompt();
      return;
    }
    
    // Send to backend for analysis
    const analysisResponse = await fetch(`${API_BASE_URL}/analysis/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: termsData.content,
        url: termsData.url,
        title: termsData.title
      })
    });
    
    const analysisData = await analysisResponse.json();
    
    if (analysisResponse.ok) {
      // Display results
      displayResults(analysisData.analysis);
      updateUsageDisplay(analysisData.usage);
      showStatus('success', 'Analysis complete!');
      
      // Cache results
      await cacheAnalysis(tab.url, analysisData.analysis);
      
    } else if (analysisResponse.status === 429) {
      // Usage limit exceeded
      showStatus('error', analysisData.message);
      showUpgradePrompt(analysisData);
    } else {
      throw new Error(analysisData.error || 'Analysis failed');
    }
    
  } catch (error) {
    console.error('Analysis error:', error);
    showStatus('error', `Error: ${error.message}`);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Page Terms';
  }
}

function extractTermsContent() {
  // Same function as before - extracts terms content from webpage
  // [Previous implementation remains the same]
  const selectors = [
    '[class*="terms"]', '[class*="privacy"]', '[class*="policy"]',
    '[class*="legal"]', '[class*="agreement"]', '[class*="conditions"]',
    '[id*="terms"]', '[id*="privacy"]', '[id*="policy"]', '[id*="legal"]',
    'h1, h2, h3', 'p, div, section, article'
  ];
  
  let content = '';
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const isTermsPage = /terms|privacy|policy|legal|agreement|conditions/.test(url + ' ' + title);
  
  if (isTermsPage) {
    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
    content = main.innerText;
  } else {
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
  
  content = content.replace(/\s+/g, ' ').trim();
  
  return {
    content: content.substring(0, 8000),
    url: window.location.href,
    title: document.title,
    isTermsPage,
    contentLength: content.length
  };
}

function displayResults(analysis) {
  const results = document.getElementById('results');
  const complianceScore = document.getElementById('complianceScore');
  const summary = document.getElementById('summary');
  const requirements = document.getElementById('requirements');
  
  results.style.display = 'block';
  complianceScore.textContent = analysis.compliance_score || '--';
  summary.textContent = analysis.summary || 'Analysis completed successfully.';
  
  requirements.innerHTML = '';
  if (analysis.requirements && analysis.requirements.length > 0) {
    analysis.requirements.forEach(req => {
      const reqDiv = document.createElement('div');
      reqDiv.className = 'requirement';
      reqDiv.innerHTML = `
        <div class="requirement-priority priority-${req.priority || 'medium'}">${(req.priority || 'medium').toUpperCase()}</div>
        <div class="requirement-text">${req.requirement_text || req.plain_english || 'Requirement'}</div>
        <div class="requirement-explanation">${req.plain_english || req.requirement_text || ''}</div>
      `;
      requirements.appendChild(reqDiv);
    });
  } else {
    requirements.innerHTML = '<div class="requirement">No specific requirements identified.</div>';
  }
}

function updateUsageDisplay(usage) {
  if (usage.analysesUsed !== undefined) {
    document.getElementById('dailyUsage').textContent = usage.analysesUsed;
  }
  if (usage.analysesLimit !== undefined) {
    document.getElementById('dailyLimit').textContent = usage.analysesLimit;
  }
}

function showUpgradePrompt(data) {
  const upgradeDiv = document.createElement('div');
  upgradeDiv.innerHTML = `
    <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 10px; border: 2px solid #ff6b6b;">
      <h4 style="margin: 0 0 10px 0; color: #ff6b6b;">Usage Limit Reached</h4>
      <p style="margin: 0 0 10px 0; font-size: 13px;">You've used ${data.analysesUsed}/${data.analysesLimit} analyses.</p>
      <button onclick="openUpgradePage()" style="width: 100%; padding: 8px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Upgrade to Pro ($9.99/month)
      </button>
    </div>
  `;
  
  document.querySelector('.content').appendChild(upgradeDiv);
}

function openUpgradePage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('upgrade.html') });
}

async function cacheAnalysis(url, analysis) {
  const { analysisCache = {} } = await chrome.storage.local.get(['analysisCache']);
  analysisCache[url] = {
    analysis,
    timestamp: Date.now()
  };
  await chrome.storage.local.set({ analysisCache });
}

async function checkExistingAnalysis() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { analysisCache = {} } = await chrome.storage.local.get(['analysisCache']);
  
  const cached = analysisCache[tab.url];
  if (cached && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) {
    displayResults(cached.analysis);
    showStatus('success', 'Showing cached analysis');
  }
}

function showStatus(type, message) {
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  
  status.style.display = 'block';
  status.className = `status ${type}`;
  statusText.textContent = message;
}

function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
}