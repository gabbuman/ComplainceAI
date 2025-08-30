# ComplianceAI Backend Deployment Guide

## Deploying to Hostinger Shared Hosting

### Prerequisites
- Hostinger hosting account with Node.js support
- Domain name configured
- Claude API key from Anthropic

### Step 1: Prepare Your Files

1. **Create production .env file**:
   ```bash
   cp .env.example .env
   ```
   
2. **Edit .env with production values**:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_PATH=./database/users.db
   CLAUDE_API_KEY=your-actual-claude-api-key
   JWT_SECRET=generate-long-random-string-here
   ALLOWED_ORIGINS=chrome-extension://your-extension-id,https://your-domain.com
   ```

3. **Generate secure JWT secret**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

### Step 2: Upload Files to Hostinger

1. **Connect via File Manager or FTP**:
   - Upload all backend files to your domain's root directory
   - Or upload to a subdirectory like `/api/`

2. **Install Dependencies**:
   ```bash
   npm install --production
   ```

### Step 3: Configure Node.js on Hostinger

1. **Access hPanel > Node.js**
2. **Create Node.js App**:
   - App root: `/public_html` (or your subdirectory)
   - Startup file: `server.js`
   - Node.js version: 18 or higher

3. **Set Environment Variables** in hPanel:
   ```
   NODE_ENV=production
   CLAUDE_API_KEY=your-key
   JWT_SECRET=your-secret
   ALLOWED_ORIGINS=chrome-extension://your-id,https://your-domain.com
   ```

### Step 4: Database Setup

The app uses SQLite, so no additional database setup is needed. The database file will be created automatically.

### Step 5: Update Chrome Extension

1. **Update config.js**:
   ```javascript
   const CONFIG = {
     API_BASE_URL: 'https://your-domain.com/api',
     // ... rest of config
   };
   ```

2. **Update manifest.json**:
   ```json
   "host_permissions": [
     "https://your-domain.com/*"
   ]
   ```

### Step 6: SSL Certificate

Ensure your domain has SSL enabled in Hostinger for HTTPS connections.

### Step 7: Test Deployment

1. **Health Check**:
   ```
   GET https://your-domain.com/api/health
   ```

2. **Test Registration**:
   ```bash
   curl -X POST https://your-domain.com/api/auth/register \
   -H "Content-Type: application/json" \
   -d '{"email":"test@example.com","extensionId":"test123456789012345678901234567890"}'
   ```

## Alternative: VPS Deployment

If you need more control, consider upgrading to Hostinger VPS:

### VPS Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone your repository
git clone your-repo-url
cd complianceai-backend

# Install dependencies
npm install --production

# Create .env file
nano .env

# Start with PM2
pm2 start server.js --name complianceai
pm2 save
pm2 startup
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Considerations

1. **Rate Limiting**: Already implemented
2. **CORS**: Configured for your extension only
3. **JWT Tokens**: Secure and expiring
4. **Input Validation**: All endpoints validated
5. **SQL Injection**: Using parameterized queries

## Monitoring & Maintenance

1. **Log Files**: Check application logs regularly
2. **Database Cleanup**: Run cleanup function monthly
3. **Usage Monitoring**: Track API costs via Claude dashboard
4. **Backups**: Regular database backups recommended

## Scaling Considerations

1. **Database**: Consider PostgreSQL for heavy usage
2. **Caching**: Add Redis for session management
3. **Load Balancing**: Multiple server instances
4. **CDN**: Static asset delivery

## Cost Estimation

### Claude API Costs (with 10,000 users):
- Free tier: 3 analyses × 10,000 users = 30,000 analyses
- Average tokens per analysis: ~2,000
- Total tokens: ~60 million
- Estimated cost: ~$30/month at Claude Haiku pricing

### Revenue Projections:
- 10% conversion to Pro ($9.99/month): 1,000 × $9.99 = $9,990/month
- Operating costs: ~$50/month (hosting + API)
- Net profit: ~$9,940/month

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Check ALLOWED_ORIGINS in .env
   - Verify extension ID in manifest

2. **Database Errors**:
   - Ensure write permissions on database directory
   - Check disk space

3. **API Rate Limits**:
   - Monitor Claude API usage
   - Adjust rate limits if needed

4. **JWT Errors**:
   - Verify JWT_SECRET is set
   - Check token expiration settings

### Debug Mode:
```bash
NODE_ENV=development npm start
```

## Support

For deployment issues:
1. Check Hostinger documentation
2. Review application logs
3. Test endpoints with Postman
4. Monitor Claude API dashboard