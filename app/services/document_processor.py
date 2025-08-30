import os
from typing import Tuple
from pypdf import PdfReader
from docx import Document
from pathlib import Path

class DocumentProcessor:
    """Simple document processor for PDF and DOCX files"""
    
    def __init__(self):
        self.supported_types = {'.pdf', '.docx', '.txt'}
    
    def extract_text(self, file_path: str) -> Tuple[str, str]:
        """
        Extract text from document
        Returns: (extracted_text, file_type)
        """
        file_path = Path(file_path)
        file_extension = file_path.suffix.lower()
        
        if file_extension not in self.supported_types:
            raise ValueError(f"Unsupported file type: {file_extension}")
        
        try:
            if file_extension == '.pdf':
                return self._extract_from_pdf(file_path), 'pdf'
            elif file_extension == '.docx':
                return self._extract_from_docx(file_path), 'docx'
            elif file_extension == '.txt':
                return self._extract_from_txt(file_path), 'txt'
        except Exception as e:
            raise Exception(f"Error extracting text from {file_path}: {str(e)}")
    
    def _extract_from_pdf(self, file_path: Path) -> str:
        """Extract text from PDF using pypdf"""
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"PDF extraction failed: {str(e)}")
    
    def _extract_from_docx(self, file_path: Path) -> str:
        """Extract text from DOCX file"""
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"DOCX extraction failed: {str(e)}")
    
    def _extract_from_txt(self, file_path: Path) -> str:
        """Extract text from TXT file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read().strip()
        except Exception as e:
            raise Exception(f"TXT extraction failed: {str(e)}")
    
    def get_file_info(self, file_path: str) -> dict:
        """Get basic file information"""
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        return {
            'name': file_path.name,
            'size': file_path.stat().st_size,
            'extension': file_path.suffix.lower(),
            'created': file_path.stat().st_ctime,
            'modified': file_path.stat().st_mtime
        }