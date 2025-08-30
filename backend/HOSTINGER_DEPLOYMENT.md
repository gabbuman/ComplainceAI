# 🚀 Hostinger Deployment Guide - ComplianceAI Backend

## Prerequisites
- Hostinger hosting account with Node.js support
- Domain name configured
- FTP/File Manager access

## Step-by-Step Deployment

### 1. 📁 Prepare Files

**Files to upload to Hostinger:**
```
backend/
├── server.js
├── package.json
├── .env (create from .env.production)
├── routes/
│   ├── auth.js
│   ├── analysis.js
│   └── payment.js
├── utils/
│   └── database.js
├── middleware/
│   └── errorHandler.js
└── database/ (empty folder - will be created)
```

### 2. 🌐 Upload to Hostinger

**Option A: File Manager (Recommended)**
1. Login to hPanel
2. Go to File Manager
3. Navigate to your domain folder (usually `public_html`)
4. Upload all backend files to root or create `/api` subfolder

**Option B: FTP**
1. Use FileZilla or similar FTP client
2. Connect with your Hostinger FTP credentials
3. Upload all files to your domain directory

### 3. ⚙️ Configure Node.js App

1. **Go to hPanel → Node.js**
2. **Click "Create Application"**
3. **Settings:**
   - **App root:** `/public_html` (or your upload path)
   - **Startup file:** `server.js`
   - **Node.js version:** `18.x` or higher
   - **Application mode:** `Production`

### 4. 🔐 Environment Variables

**In hPanel Node.js section, add these environment variables:**

```bash
NODE_ENV=production
PORT=3000
DATABASE_PATH=./database/users.db
CLAUDE_API_KEY=your-actual-claude-api-key-here
JWT_SECRET=your-super-secure-jwt-secret-here
ALLOWED_ORIGINS=chrome-extension://your-extension-id,https://your-domain.com
MAX_FREE_ANALYSES_PER_USER=3
BCRYPT_ROUNDS=12
TOKEN_EXPIRY=7d
```

**⚠️ IMPORTANT:** Generate a new JWT_SECRET for production:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. 📦 Install Dependencies

**In hPanel Node.js section:**
1. Click "Run NPM Install"
2. Wait for dependencies to install
3. Check logs for any errors

### 6. 🚀 Start Application

1. **Click "Start Application"** in hPanel
2. **Check status** - should show "Running"
3. **View logs** for any startup errors

### 7. 🧪 Test Deployment

**Test these URLs (replace with your domain):**

```bash
# Health check
GET https://your-domain.com/api/health

# Registration (should return 400 without data)
POST https://your-domain.com/api/auth/register

# Analysis (should return 401 without token)
POST https://your-domain.com/api/analysis/analyze
```

**Expected Health Check Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-30T...",
  "version": "1.0.0"
}
```

## 8. 🔧 Update Extension

**Update these files in your extension:**

**config.js:**
```javascript
const CONFIG = {
  API_BASE_URL: 'https://your-domain.com/api',
  // ... rest of config
};
```

**manifest.json:**
```json
{
  "host_permissions": [
    "https://your-domain.com/*"
  ]
}
```

## 9. ✅ Final Testing

1. **Reload extension** in Chrome
2. **Clear extension storage:** `chrome.storage.sync.clear()`
3. **Test registration** with new email
4. **Test analysis** on terms page
5. **Check backend logs** in hPanel

## 🔧 Troubleshooting

### Common Issues:

**1. App won't start:**
- Check Node.js version (needs 18+)
- Verify all files uploaded correctly
- Check environment variables are set
- Review application logs

**2. Database errors:**
- Ensure `database/` folder exists and has write permissions
- Check SQLite is available on server

**3. CORS errors:**
- Update `ALLOWED_ORIGINS` with correct extension ID
- Verify domain spelling in origins

**4. 502/503 errors:**
- Check if app is running in hPanel
- Verify startup file path
- Review error logs

### Debug Commands:

**Test locally first:**
```bash
NODE_ENV=production npm start
curl http://localhost:3000/api/health
```

**Check logs:**
- hPanel → Node.js → Your App → Logs
- Look for startup errors, database issues

### Performance Settings:

**Recommended hPanel settings:**
- **Memory limit:** 512MB minimum
- **CPU limit:** Shared/Basic plan sufficient
- **Auto-restart:** Enabled
- **Logs retention:** 7 days

## 🚀 Production Checklist

- [ ] All files uploaded to Hostinger
- [ ] Node.js app created and configured
- [ ] Environment variables set
- [ ] Dependencies installed successfully
- [ ] Application started without errors
- [ ] Health check returns 200 OK
- [ ] Extension config updated with production URL
- [ ] CORS configured for your domain
- [ ] SSL certificate active (HTTPS)
- [ ] Database folder has write permissions
- [ ] Registration and analysis tested end-to-end

## 📊 Monitoring

**Track these metrics:**
- API response times
- Registration rate
- Analysis usage per user
- Claude API costs
- Error rates

**Cost estimates:**
- Hosting: ~$10-20/month
- Claude API: ~$0.001 per analysis
- SSL: Usually included with Hostinger

Your backend is now ready for production users! 🎉