# ComplianceAI Railway Deployment Guide

## Deploying to Railway

Railway is a modern cloud platform that makes deploying Python FastAPI applications simple and cost-effective.

### Prerequisites
- Railway account (free tier available)
- GitHub account
- Claude API key from Anthropic
- Git repository with your code

### Step 1: Prepare Your Repository

1. **Ensure all files are committed**:
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Environment Variables Needed**:
   - `CLAUDE_API_KEY`: Your Anthropic API key
   - `DATABASE_URL`: Will be provided by Railway for PostgreSQL (optional)
   - `SECRET_KEY`: Random string for JWT tokens
   - `ENVIRONMENT`: Set to "production"

### Step 2: Deploy to Railway

#### Method 1: Deploy from GitHub (Recommended)

1. **Visit Railway Dashboard**:
   - Go to [railway.app](https://railway.app)
   - Sign up/login with GitHub

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your ComplianceAI repository

3. **Railway Auto-Detection**:
   - Railway will automatically detect Python/FastAPI
   - It will use the `railway.json` and `Procfile` configurations
   - Build process will install from `requirements.txt`

#### Method 2: Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**:
   ```bash
   railway login
   railway link
   railway up
   ```

### Step 3: Configure Environment Variables

In Railway Dashboard:

1. **Go to Variables tab**
2. **Add environment variables**:
   ```
   CLAUDE_API_KEY=your-actual-claude-api-key
   SECRET_KEY=generate-random-64-char-string
   ENVIRONMENT=production
   ```

3. **Generate secure secret key**:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

### Step 4: Database Setup (Optional)

For production use, consider adding PostgreSQL:

1. **Add PostgreSQL Service**:
   - In Railway dashboard, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

2. **Update database configuration**:
   - The app will automatically use PostgreSQL if `DATABASE_URL` is set
   - Otherwise, it defaults to SQLite (suitable for small deployments)

### Step 5: Custom Domain (Optional)

1. **In Railway Dashboard**:
   - Go to Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

2. **SSL Certificate**:
   - Automatically provided by Railway
   - HTTPS enabled by default

### Step 6: Update Chrome Extension

1. **Update backend URL in extension**:
   ```javascript
   // In chrome-extension/config.js
   const CONFIG = {
     API_BASE_URL: 'https://your-app-name.up.railway.app',
     // ... rest of config
   };
   ```

2. **Update manifest.json permissions**:
   ```json
   "host_permissions": [
     "https://your-app-name.up.railway.app/*",
     "https://*.up.railway.app/*"
   ]
   ```

### Step 7: Test Deployment

1. **Health Check**:
   ```bash
   curl https://your-app-name.up.railway.app/health
   ```

2. **API Documentation**:
   ```
   https://your-app-name.up.railway.app/docs
   ```

3. **Test Registration**:
   ```bash
   curl -X POST https://your-app-name.up.railway.app/api/auth/register \
   -H "Content-Type: application/json" \
   -d '{"email":"test@example.com","password":"testpassword123"}'
   ```

## Railway Configuration Files

### railway.json
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "healthcheckPath": "/health"
  }
}
```

### Procfile
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Cost Estimation

### Railway Pricing:
- **Starter Plan**: $5/month (512MB RAM, 1GB storage)
- **Developer Plan**: $20/month (8GB RAM, 100GB storage)
- **Team Plan**: $100/month (32GB RAM, 100GB storage)

### Claude API Costs (with 10,000 users):
- Free tier: 3 analyses × 10,000 users = 30,000 analyses
- Average tokens per analysis: ~2,000
- Total tokens: ~60 million
- Estimated cost: ~$30/month at Claude Haiku pricing

### Total Monthly Costs:
- Railway Starter + Claude API: ~$35/month
- Revenue potential (10% conversion at $9.99/month): ~$9,990/month
- Net profit potential: ~$9,955/month

## Advantages of Railway vs Hostinger

### Railway Advantages:
- **Zero Config**: Automatic deployments from Git
- **Modern Stack**: Native Python/FastAPI support
- **Scaling**: Automatic scaling based on traffic
- **Monitoring**: Built-in logs and metrics
- **Database**: Easy PostgreSQL integration
- **HTTPS**: SSL certificates included
- **Git Integration**: Deploy on push

### When to Use Railway:
- Modern web applications
- Automatic scaling needs  
- Development/staging environments
- Teams wanting CI/CD integration

## Monitoring & Maintenance

### Built-in Monitoring:
1. **Railway Dashboard**: Real-time metrics
2. **Logs**: View application logs in real-time
3. **Deployments**: Track deployment history
4. **Usage**: Monitor resource consumption

### Health Checks:
- Railway automatically monitors `/health` endpoint
- Restarts service if health checks fail
- Email notifications for downtime

### Automatic Deployments:
- Push to main branch → automatic deployment
- Review apps for pull requests
- Rollback to previous versions easily

## Scaling Considerations

### Vertical Scaling:
- Upgrade Railway plan for more resources
- Automatic scaling within plan limits

### Horizontal Scaling:
- Multiple service instances (higher plans)
- Database connection pooling
- Redis for session management

### Performance Optimization:
1. **Database**: Use PostgreSQL for production
2. **Caching**: Add Redis service
3. **CDN**: Use Railway's built-in CDN
4. **Monitoring**: Set up alerts and notifications

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check `requirements.txt` compatibility
   - Verify Python version in runtime
   - Review build logs in Railway dashboard

2. **Start Command Issues**:
   - Ensure `Procfile` or `railway.json` has correct command
   - Check that `$PORT` environment variable is used
   - Verify app listens on `0.0.0.0`, not `127.0.0.1`

3. **Environment Variables**:
   - Double-check variable names and values
   - Restart deployment after changing variables
   - Use Railway CLI to debug: `railway logs`

4. **Database Connection**:
   - Verify `DATABASE_URL` if using PostgreSQL
   - Check database service is running
   - Review connection string format

### Debug Commands:
```bash
# View logs
railway logs

# Run commands on Railway
railway run python manage.py migrate

# Connect to database
railway connect postgres
```

## Support

For Railway deployment issues:
1. Check [Railway Documentation](https://docs.railway.app)
2. Review application logs in Railway dashboard
3. Test locally first: `railway run python -m uvicorn app.main:app`
4. Railway Discord community for support
5. Monitor Claude API dashboard for usage