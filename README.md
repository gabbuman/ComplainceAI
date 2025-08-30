# ComplianceAI

An AI-powered document compliance analysis tool that analyzes Terms of Service, Privacy Policies, and other legal documents to extract key requirements and obligations.

## Features

- **Document Analysis**: Upload and analyze PDF, DOCX, and TXT documents
- **AI-Powered Extraction**: Uses Claude AI to identify compliance requirements
- **Plain English Explanations**: Complex legal text translated into understandable language
- **Usage Tracking**: Built-in token usage limits to control API costs
- **Web Interface**: User-friendly FastAPI-based web application

## Cost Management

The application includes built-in cost controls to prevent excessive API usage:
- **Daily Request Limit**: 50 requests per day
- **Token Limits**: 2,000 tokens per request, 100,000 tokens per day
- **Usage Tracking**: Real-time monitoring of API usage
- **Budget Protection**: Designed for ~$5 monthly budget

## Quick Start

1. **Install Dependencies**
   ```bash
   # Activate virtual environment
   ./venv/Scripts/activate  # Windows
   # or
   source venv/bin/activate  # Linux/Mac
   
   # Install requirements
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   # Edit .env file
   CLAUDE_API_KEY=your_api_key_here
   ```

3. **Run Application**
   ```bash
   python run.py
   ```

4. **Access Application**
   - Main app: http://127.0.0.1:8000
   - API docs: http://127.0.0.1:8000/docs
   - Usage stats: http://127.0.0.1:8000/api/dashboard/usage

## API Endpoints

### Document Analysis
- `POST /api/documents/upload` - Upload and analyze document
- `GET /api/documents/{id}` - Get document analysis results

### Dashboard
- `GET /api/dashboard/stats` - User dashboard statistics
- `GET /api/dashboard/usage` - API usage statistics

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

## Chrome Extension (Planned)

The next phase will convert this application into a Chrome extension that can:
- Automatically detect Terms of Service pages
- Analyze content directly in the browser
- Provide real-time compliance insights
- Work on any website with T&C content

## File Structure

```
ComplianceAI/
├── app/
│   ├── api/              # API routes
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── documents.py  # Document processing endpoints
│   │   └── dashboard.py  # Dashboard and stats endpoints
│   ├── core/             # Core configuration
│   │   ├── config.py     # Application settings
│   │   └── database.py   # Database configuration
│   ├── models/           # Data models
│   │   ├── models.py     # SQLAlchemy models
│   │   └── schemas.py    # Pydantic schemas
│   ├── services/         # Business logic
│   │   ├── ai_analyzer.py    # Claude AI integration
│   │   ├── usage_tracker.py  # API usage tracking
│   │   ├── auth.py           # Authentication service
│   │   └── document_processor.py # Document processing
│   ├── static/           # Static files
│   └── templates/        # HTML templates
├── .env                  # Environment variables (not in repo)
├── .gitignore           # Git ignore rules
├── requirements.txt     # Python dependencies
└── run.py              # Application launcher
```

## Environment Variables

```bash
# Database (SQLite for development)
DATABASE_URL=sqlite:///./compliance_ai.db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Claude AI API
CLAUDE_API_KEY=your-claude-api-key-here

# App Settings
APP_NAME=ComplianceAI
DEBUG=True
```

## Usage Limits Configuration

Default limits (configurable in config.py):
- `MAX_TOKENS_PER_REQUEST`: 2,000 tokens
- `MAX_DAILY_REQUESTS`: 50 requests
- `DAILY_TOKEN_LIMIT`: 100,000 tokens

## Development

1. **Database**: Uses SQLite (no setup required)
2. **Auto-reload**: Enabled during development
3. **Testing**: Check API at `/docs` endpoint
4. **Logs**: Monitor console output for errors

## Troubleshooting

### Common Issues

1. **ModuleNotFoundError**: Ensure virtual environment is activated
2. **API Key Errors**: Check `.env` file configuration  
3. **Usage Limits**: Check `/api/dashboard/usage` endpoint
4. **Database Errors**: Delete `compliance_ai.db` and restart

### Support

- Check application logs in console
- Test endpoints using `/docs` interface
- Monitor usage with `/api/dashboard/usage`

## Security

- Environment variables stored in `.env` (gitignored)
- JWT token authentication
- Input validation on all endpoints
- SQL injection protection via SQLAlchemy ORM

## License

This project is for educational/demo purposes. Modify and use as needed.