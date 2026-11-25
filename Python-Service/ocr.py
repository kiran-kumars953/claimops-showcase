import pdfplumber
import pytesseract
from PIL import Image
import os
import logging

from config import config

logger = logging.getLogger("ocr-service")

if config.TESSERACT_PATH:
    pytesseract.pytesseract.tesseract_cmd = config.TESSERACT_PATH

def extract_text_from_pdf(file_path: str, claim_id: str) -> str:
    """Extracts text from a PDF file using pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        logger.info(f"[{claim_id}] Successfully extracted text from PDF: {file_path}")
    except Exception as e:
        logger.error(f"[{claim_id}] Error extracting text from PDF {file_path}: {str(e)}")
        raise e
    return text

def extract_text_from_image(file_path: str, claim_id: str) -> str:
    """Extracts text from an image file using pytesseract."""
    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        logger.info(f"[{claim_id}] Successfully extracted text from Image: {file_path}")
        return text
    except Exception as e:
        logger.error(f"[{claim_id}] Error extracting text from image {file_path}: {str(e)}")
        raise e

def extract_content(file_path: str, claim_id: str) -> str:
    """Orchestrates extraction based on file extension."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_path, claim_id)
    elif ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
        return extract_text_from_image(file_path, claim_id)
    else:
        logger.warning(f"[{claim_id}] Unsupported file format: {ext}")
        return ""
