// ComplianceAI Content Script
// Runs on all web pages to detect and highlight terms content

let compliancePanel = null;
let isAnalyzing = false;

// Initialize content script
(function() {
  // Auto-detect terms pages
  detectTermsPage();
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      sendResponse(extractTermsContent());
    } else if (request.action === 'highlightTerms') {
      highlightImportantTerms(request.requirements);
    } else if (request.action === 'showPanel') {
      showCompliancePanel(request.analysis);
    }
    return true;
  });
})();

function detectTermsPage() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const keywords = ['terms', 'privacy', 'policy', 'legal', 'agreement', 'conditions'];
  
  const isTermsPage = keywords.some(keyword => 
    url.includes(keyword) || title.includes(keyword)
  );
  
  if (isTermsPage) {
    // Add a subtle indicator for terms pages
    addTermsPageIndicator();
  }
}

function addTermsPageIndicator() {
  // Create a small floating indicator
  const indicator = document.createElement('div');
  indicator.id = 'compliance-ai-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: transform 0.2s ease;
    ">
      📋 ComplianceAI
    </div>
  `;
  
  const indicatorDiv = indicator.querySelector('div');
  
  indicator.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
  
  // Add hover effects
  indicatorDiv.addEventListener('mouseover', () => {
    indicatorDiv.style.transform = 'scale(1.05)';
  });
  
  indicatorDiv.addEventListener('mouseout', () => {
    indicatorDiv.style.transform = 'scale(1)';
  });
  
  document.body.appendChild(indicator);
}

function extractTermsContent() {
  const selectors = [
    // Common terms/privacy selectors
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
    
    // Content selectors
    'main',
    '[role="main"]',
    '.content',
    '.main-content',
    'article',
    '.article',
    '.page-content',
    
    // Fallback selectors
    'h1, h2, h3, h4',
    'p',
    'div',
    'section'
  ];
  
  let content = '';
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  
  // Check if this is a dedicated terms/privacy page
  const isTermsPage = /terms|privacy|policy|legal|agreement|conditions/.test(url + ' ' + title);
  
  if (isTermsPage) {
    // Get main content from dedicated page
    const mainElements = document.querySelectorAll('main, [role="main"], .content, .main-content, article');
    
    if (mainElements.length > 0) {
      content = Array.from(mainElements)
        .map(el => el.innerText || el.textContent || '')
        .join('\n\n');
    } else {
      // Fallback to body content
      content = document.body.innerText || document.body.textContent || '';
    }
  } else {
    // Look for terms-related content on regular pages
    const keywordRegex = /terms|privacy|policy|legal|agreement|condition|data protection|cookie|consent|liability|disclaimer/i;
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          const text = element.innerText || element.textContent || '';
          
          if (text.length > 100 && keywordRegex.test(text)) {
            content += text + '\n\n';
            
            // Stop if we have enough content
            if (content.length > 5000) break;
          }
        }
        
        if (content.length > 5000) break;
      } catch (e) {
        continue; // Skip invalid selectors
      }
    }
  }
  
  // Clean up content
  content = content
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\n\s*\n/g, '\n\n')    // Clean up line breaks
    .trim();
  
  // Return metadata with content
  return {
    content: content.substring(0, 8000), // Limit for API
    url: window.location.href,
    title: document.title,
    isTermsPage,
    contentLength: content.length
  };
}

function highlightImportantTerms(requirements) {
  if (!requirements || requirements.length === 0) return;
  
  // Extract key phrases from requirements
  const keyPhrases = requirements
    .flatMap(req => [
      req.requirement_text,
      req.plain_english
    ])
    .filter(text => text && text.length > 10)
    .flatMap(text => text.split(/[.!?;]/).filter(sentence => sentence.length > 20))
    .slice(0, 10); // Limit to prevent performance issues
  
  // Highlight phrases in the document
  keyPhrases.forEach((phrase, index) => {
    if (phrase.length < 20 || phrase.length > 200) return;
    
    try {
      highlightText(phrase.trim(), `compliance-highlight-${index % 3}`);
    } catch (e) {
      // Skip if highlighting fails
    }
  });
}

function highlightText(searchText, className) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  
  while (node = walker.nextNode()) {
    if (node.nodeValue.toLowerCase().includes(searchText.toLowerCase())) {
      textNodes.push(node);
    }
  }
  
  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return;
    
    const text = textNode.nodeValue;
    const regex = new RegExp(`(${escapeRegExp(searchText)})`, 'gi');
    
    if (regex.test(text)) {
      const span = document.createElement('span');
      span.innerHTML = text.replace(regex, `<mark class="${className}" style="background: rgba(255, 235, 59, 0.3); padding: 2px 4px; border-radius: 2px;">$1</mark>`);
      parent.replaceChild(span, textNode);
    }
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showCompliancePanel(analysis) {
  // Remove existing panel
  if (compliancePanel) {
    compliancePanel.remove();
  }
  
  // Create floating panel
  compliancePanel = document.createElement('div');
  compliancePanel.id = 'compliance-ai-panel';
  compliancePanel.innerHTML = createPanelHTML(analysis);
  
  document.body.appendChild(compliancePanel);
  
  // Add event listeners
  const closeBtn = compliancePanel.querySelector('.close-panel');
  closeBtn?.addEventListener('click', () => {
    compliancePanel.remove();
    compliancePanel = null;
  });
  
  // Make draggable
  makePanelDraggable(compliancePanel);
}

function createPanelHTML(analysis) {
  const requirements = analysis.requirements || [];
  const requirementsHTML = requirements
    .slice(0, 5) // Show only top 5 requirements
    .map(req => `
      <div class="panel-requirement">
        <span class="priority priority-${req.priority || 'medium'}">${(req.priority || 'medium').toUpperCase()}</span>
        <div class="req-text">${req.plain_english || req.requirement_text || 'Requirement'}</div>
      </div>
    `).join('');
  
  return `
    <div style="
      position: fixed;
      top: 80px;
      right: 20px;
      width: 320px;
      max-height: 400px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      border: 1px solid #e1e5e9;
    ">
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <div style="font-weight: 600; font-size: 14px;">ComplianceAI Analysis</div>
          <div style="font-size: 12px; opacity: 0.9;">Score: ${analysis.compliance_score || '--'}</div>
        </div>
        <button class="close-panel" style="
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.8;
        ">×</button>
      </div>
      
      <div style="padding: 15px; max-height: 320px; overflow-y: auto;">
        <div style="
          background: #f8f9fa;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 15px;
          font-size: 13px;
          line-height: 1.4;
        ">
          ${analysis.summary || 'Analysis completed successfully.'}
        </div>
        
        <div style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #333;">
          Key Requirements:
        </div>
        
        <div class="panel-requirements">
          ${requirementsHTML || '<div style="color: #666; font-size: 12px; font-style: italic;">No specific requirements identified.</div>'}
        </div>
      </div>
    </div>
    
    <style>
      .panel-requirement {
        margin-bottom: 10px;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 4px;
        font-size: 12px;
      }
      
      .priority {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      .priority-critical { background: #ffebee; color: #c62828; }
      .priority-high { background: #fff3e0; color: #f57c00; }
      .priority-medium { background: #e3f2fd; color: #1565c0; }
      .priority-low { background: #e8f5e8; color: #2e7d32; }
      
      .req-text {
        line-height: 1.3;
        color: #333;
      }
    </style>
  `;
}

function makePanelDraggable(panel) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  const header = panel.querySelector('div');
  header.style.cursor = 'move';
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  
  function onMouseMove(e) {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    panel.style.left = (startLeft + deltaX) + 'px';
    panel.style.top = (startTop + deltaY) + 'px';
    panel.style.right = 'auto';
  }
  
  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}