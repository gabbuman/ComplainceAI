// ComplianceAI Extension Configuration

const CONFIG = {
  // Backend API URL (update this when you deploy to Hostinger)
  API_BASE_URL: 'http://localhost:3000/api',
  
  // Production API URL (uncomment when deployed)
  // API_BASE_URL: 'https://your-domain.com/api',
  
  // Extension settings
  MAX_CONTENT_LENGTH: 8000,
  ANALYSIS_TIMEOUT: 30000, // 30 seconds
  
  // User plans
  PLANS: {
    FREE: {
      name: 'Free',
      analysesLimit: 3,
      price: 0
    },
    PRO: {
      name: 'Pro', 
      analysesLimit: 100,
      price: 9.99
    },
    ENTERPRISE: {
      name: 'Enterprise',
      analysesLimit: 1000,
      price: 29.99
    }
  }
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.COMPLIANCE_AI_CONFIG = CONFIG;
}