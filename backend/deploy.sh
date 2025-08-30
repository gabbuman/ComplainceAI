#!/bin/bash
# ComplianceAI Hostinger Deployment Script

echo "🚀 Starting ComplianceAI Backend Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the backend directory."
    exit 1
fi

# Create production environment file
echo "📝 Setting up production environment..."
if [ ! -f ".env" ]; then
    cp .env.production .env
    echo "✅ Created .env from .env.production template"
    echo "⚠️  IMPORTANT: Edit .env file to update:"
    echo "   - Your domain in ALLOWED_ORIGINS"
    echo "   - Extension ID after Chrome Web Store publish"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p database
mkdir -p logs

# Install dependencies
echo "📦 Installing production dependencies..."
npm install --production

# Test the application
echo "🧪 Running basic tests..."
node -e "console.log('Node.js version:', process.version)"
node -e "require('./server.js')" --timeout=5000 &
TEST_PID=$!
sleep 3

if ps -p $TEST_PID > /dev/null 2>&1; then
    echo "✅ Server starts successfully"
    kill $TEST_PID
else
    echo "❌ Server failed to start"
    exit 1
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "📋 Next steps for Hostinger:"
echo "1. Upload all files to your domain directory"
echo "2. In hPanel, go to Node.js section"
echo "3. Create new Node.js app:"
echo "   - App root: /public_html (or your directory)"
echo "   - Startup file: server.js"
echo "   - Node.js version: 18 or higher"
echo "4. Set environment variables in hPanel Node.js section"
echo "5. Start the application"
echo ""
echo "🔗 After deployment, test:"
echo "   - https://your-domain.com/api/health"
echo "   - https://your-domain.com/api/auth/register (POST)"
echo ""
echo "📧 Don't forget to:"
echo "   - Update ALLOWED_ORIGINS with your domain"
echo "   - Update extension manifest.json host_permissions"
echo "   - Test registration and analysis flows"