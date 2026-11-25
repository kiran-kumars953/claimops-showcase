from huggingface_hub import InferenceClient
import logging
import json
from config import config

logger = logging.getLogger("llm-service")

FALLBACK_MODELS = [
    "Qwen/Qwen2.5-72B-Instruct",
    "meta-llama/Llama-3.2-3B-Instruct",
    "mistralai/Mistral-Nemo-Instruct-2407",
    "microsoft/Phi-3.5-mini-instruct"
]

def call_huggingface_llm(prompt: str, claim_id: str) -> str:
    """Calls HuggingFace Inference API with robust fallback strategy."""
    if not config.HF_API_KEY or not str(config.HF_API_KEY).startswith("hf_"):
        raise RuntimeError("HF_API_KEY missing or invalid. Set a valid Hugging Face token in environment.")

    client = InferenceClient(token=config.HF_API_KEY)
    
    # Combine configured model with fallbacks (deduplicate)
    models_to_try = [config.HF_MODEL] + [m for m in FALLBACK_MODELS if m != config.HF_MODEL]
    
    last_exception = None

    for model in models_to_try:
        try:
            logger.info(f"[{claim_id}] Attempting LLM call with model: {model}")
            
            response = client.chat_completion(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that extracts structured JSON data from text."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.1
            )
            
            content = response.choices[0].message.content
            if content:
                logger.info(f"[{claim_id}] Success with model: {model}")
                return content
                
        except Exception as e:
            logger.warning(f"[{claim_id}] Failed with model {model}: {str(e)}")
            # Auth/config issues won't recover by trying fallback models.
            error_text = str(e).lower()
            if "api key" in error_text or "auto-router" in error_text or "unauthorized" in error_text:
                raise RuntimeError(str(e))
            last_exception = e
            continue
            
    # If all models fail
    logger.error(f"[{claim_id}] All LLM models failed.")
    raise last_exception or Exception("All LLM attempts failed")

def clean_llm_json(raw_output: str) -> dict:
    """Extracts and parses JSON block from LLM string output with high robustness."""
    raw_output = raw_output.strip()
    
    # 1. Direct parsing
    try:
        return json.loads(raw_output)
    except Exception:
        pass

    # 2. Extract from backticks if present
    try:
        if "```json" in raw_output:
            json_str = raw_output.split("```json")[1].split("```")[0].strip()
            return json.loads(json_str)
        elif "```" in raw_output:
            json_str = raw_output.split("```")[1].split("```")[0].strip()
            return json.loads(json_str)
    except Exception:
        pass

    # 3. Robust extraction using JSONDecoder beginning from the first '{'
    try:
        start_idx = raw_output.find('{')
        if start_idx != -1:
            content_to_decode = raw_output[start_idx:]
            decoder = json.JSONDecoder()
            obj, end_pos = decoder.raw_decode(content_to_decode)
            return obj
    except Exception as e:
        logger.debug(f"JSONDecoder failed: {str(e)}")

    # 4. Fallback: log raw output for debugging
    logger.error(f"Failed to parse LLM JSON. Raw output: {raw_output}")
    raise ValueError("LLM output is not valid JSON")
