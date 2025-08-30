# ComplianceAI Setup Instructions

## Prerequisites
- Python 3.8+ installed
- VS Code
- OpenAI API key (optional for testing, required for AI analysis)

## Quick Start

### 1. Install Dependencies
```bash
# Make sure you're in the ComplianceAI directory with activated venv
pip install -r requirements.txt
```

### 2. Set Up Environment
```bash
# Copy the .env file and add your OpenAI API key
# Edit .env file and replace with your actual OpenAI API key:
# OPENAI_API_KEY=sk-your-key-here
```

### 3. Run the Application
```bash
python run.py
```

### 4. Open Your Browser
- Main app: http://127.0.0.1:8000
- API docs: http://127.0.0.1:8000/docs

## First Steps

1. **Register an Account**: Click "Sign Up" on the homepage
2. **Upload a Document**: Try uploading a PDF, DOCX, or TXT file
3. **View Analysis**: See the AI-powered compliance analysis

## File Structure
```
ComplianceAI/
├── app/
│   ├── api/           # API routes
│   ├── core/          # Configuration and database
│   ├── models/        # Database models and schemas
│   ├── services/      # Business logic
│   ├── static/        # Static files
│   └── templates/     # HTML templates
├── uploads/           # Uploaded documents (created automatically)
├── .env              # Environment variables
├── requirements.txt  # Python dependencies
└── run.py           # Main run script
```

## Testing Without OpenAI

The app will work without an OpenAI API key - it will use a fallback analysis system for testing. To enable full AI analysis, add your OpenAI API key to the `.env` file.

## Troubleshooting

### Common Issues:

1. **Import Errors**: Make sure your virtual environment is activated
```bash
venv\Scripts\activate  # Windows
```

2. **Database Errors**: Delete `compliance_ai.db` if it exists and restart the app

3. **Port Already in Use**: Change the port in `run.py` from 8000 to another number (e.g., 8001)

4. **File Upload Errors**: Make sure the `uploads/` directory exists and has write permissions

## Development

- The app uses SQLite database (no setup required)
- Auto-reload is enabled - changes are reflected immediately
- Check the console for error messages
- Use the FastAPI docs at `/docs` for API testing

## Next Steps

Once everything is working:
1. Add your OpenAI API key for real AI analysis
2. Try uploading different document types
3. Explore the API documentation
4. Customize the templates and styling