import logging
import sys
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from extractor import process_claim_documents

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("main")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Insurance Claim Extraction Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DocumentInput(BaseModel):
    type: str
    path: str

class ExtractionRequest(BaseModel):
    claim_id: str
    documents: List[DocumentInput]

class ExtractionResponse(BaseModel):
    claim_id: str
    status: str
    confidence: float
    data: dict
    warnings: List[str]

@app.get("/")
async def health_check():
    return {"status": "running", "service": "ocr-llm-extraction"}

@app.post("/extract", response_model=ExtractionResponse)
async def extract_data(request: ExtractionRequest):
    logger.info(f"[{request.claim_id}] Received extraction request for {len(request.documents)} documents.")
    
    try:
        result = process_claim_documents(request.claim_id, request.documents)
        return result
    except Exception as e:
        logger.error(f"[{request.claim_id}] Unexpected error in /extract: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)

