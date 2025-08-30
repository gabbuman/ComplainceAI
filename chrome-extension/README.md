# ComplianceAI Chrome Extension

A Chrome extension that analyzes Terms of Service and Privacy Policies on any webpage using AI-powered insights to help users understand their rights and obligations.

## Features

- **Instant Analysis**: Analyze Terms & Conditions on any webpage with one click
- **Plain English**: Complex legal text translated into understandable language
- **Smart Detection**: Automatically detects terms and privacy policy pages
- **Cost Control**: Built-in usage limits to manage API costs
- **Privacy Focused**: All data processing is transparent and user-controlled

## Installation

### Method 1: Developer Mode (Recommended for Testing)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-extension` folder
5. The extension should now appear in your Chrome toolbar

### Method 2: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store once published.

## Setup

1. **Get Claude API Key**
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Create an account and generate an API key
   - Copy the API key (starts with `sk-ant-api03-`)

2. **Configure Extension**
   - Click the ComplianceAI extension icon
   - Click "Settings" button
   - Enter your Claude API key
   - Adjust usage limits as needed
   - Save settings

3. **Test the Extension**
   - Visit any website with Terms of Service (e.g., Google, Facebook, Twitter)
   - Click the ComplianceAI extension icon
   - Click "Analyze Page Terms"
   - View the AI-powered analysis

## Usage

### Analyzing Terms & Conditions

1. **Manual Analysis**:
   - Navigate to any webpage with terms content
   - Click the ComplianceAI extension icon
   - Click "Analyze Page Terms"
   - View results in the popup or floating panel

2. **Auto-Detection** (Optional):
   - Enable in Settings > "Auto-detect Terms & Conditions pages"
   - Extension will automatically detect terms pages
   - Shows notification badge and optional notifications
   - Click extension icon to analyze

3. **Results Display**:
   - **Compliance Score**: Overall assessment (0-100)
   - **Summary**: Key points in 2-3 sentences
   - **Requirements**: Specific obligations and rights
   - **Priority Levels**: Critical, High, Medium, Low

### Understanding the Analysis

- **Critical**: Immediately actionable items (e.g., data deletion rights)
- **High**: Important limitations or obligations
- **Medium**: Good to know information
- **Low**: Minor details or standard clauses

### Categories

- **Data Protection**: Privacy, data collection, GDPR rights
- **User Rights**: Account access, deletion, portability
- **Liability**: Service limitations, disclaimers
- **Payment**: Billing, refunds, cancellation
- **Termination**: Account closure, data retention
- **Dispute Resolution**: Legal processes, arbitration

## Cost Management

### Built-in Limits

- **Daily Requests**: 50 analyses per day (default)
- **Token Limit**: 100,000 tokens per day
- **Per-Request**: 2,000 tokens maximum

### Estimated Costs

Based on Claude Haiku pricing (~$0.50 per 1M tokens):
- **Per Analysis**: ~$0.001 - $0.01 (1-10¢)
- **Daily Budget**: ~$0.05 - $0.50 (5-50¢)
- **Monthly Budget**: ~$1.50 - $15.00

### Usage Monitoring

- View real-time usage in extension popup
- Detailed statistics in Settings page
- Automatic daily limit resets
- Clear usage data if needed

## Privacy & Security

### What Data is Sent

- **Webpage text content** (terms & conditions only)
- **Page URL and title** (for context)
- **Your analysis requests** (to Anthropic's API)

### What is NOT Sent

- **Personal information** from forms
- **Login credentials** or cookies  
- **Browsing history** or unrelated content
- **API keys** (stored locally only)

### Data Storage

- **API Key**: Stored locally in Chrome's secure storage
- **Usage Stats**: Stored locally for cost tracking
- **Analysis Cache**: Stored locally (optional, 24hr expiry)
- **Settings**: Synced across Chrome browsers (if signed in)

## Troubleshooting

### Common Issues

1. **"No Terms & Conditions content detected"**
   - The page might not contain recognizable terms content
   - Try visiting the dedicated Terms/Privacy page
   - Some dynamic content might not be detected

2. **"API key not configured"**
   - Go to Settings and enter your Claude API key
   - Make sure it starts with `sk-ant-api03-`
   - Test the API key using the "Test API Key" button

3. **"Daily usage limit reached"**
   - Wait until tomorrow for limits to reset
   - Or increase limits in Settings (will increase costs)
   - Check current usage in Settings > Usage Statistics

4. **"API Error: 401"**
   - Invalid or expired API key
   - Check your Anthropic Console for key status
   - Generate a new API key if needed

5. **Extension not working**
   - Refresh the webpage and try again
   - Check if extension has permissions for the site
   - Disable other extensions that might conflict

### Performance Tips

- **Cache Results**: Enable result caching to avoid re-analyzing same pages
- **Adjust Token Limits**: Lower limits for faster, cheaper analysis
- **Selective Analysis**: Only analyze pages when needed
- **Clear Cache**: Periodically clear old cached results

## Development

### File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup UI
├── popup.js               # Popup functionality
├── content.js             # Webpage content analysis
├── content.css            # Content script styles
├── background.js          # Background service worker
├── settings.html          # Settings page
├── settings.js            # Settings functionality
├── icons/                 # Extension icons
└── README.md             # This file
```

### Key Components

- **Content Script**: Extracts terms content from webpages
- **Popup**: Main user interface for analysis
- **Background**: Handles API calls and notifications
- **Settings**: Configuration and usage monitoring

### API Integration

Uses Anthropic's Claude API:
- **Model**: claude-3-haiku-20240307 (cost-effective)
- **Max Tokens**: 2,000 per request (configurable)
- **Temperature**: 0.3 (focused, consistent results)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes thoroughly  
4. Submit a pull request

## License

This project is for educational/demonstration purposes. Modify and use as needed.

## Support

- Check the Settings page for usage statistics
- Test API connectivity in Settings
- Report issues on GitHub
- Check Chrome Developer Console for error messages

## Version History

### v1.0.0 (Current)
- Initial release
- Basic terms analysis functionality
- Cost controls and usage limits
- Auto-detection of terms pages
- Settings and configuration UI