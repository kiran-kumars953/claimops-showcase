import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    HF_API_KEY = os.getenv("HF_API_KEY")
    HF_MODEL = os.getenv("HF_MODEL", "HuggingFaceH4/zephyr-7b-beta") # Robust model for extraction
    TESSERACT_PATH = os.getenv("TESSERACT_PATH", None) # Optional path to tesseract executable

    if not HF_API_KEY:
        print("WARNING: HF_API_KEY not found in environment variables.")

config = Config()
