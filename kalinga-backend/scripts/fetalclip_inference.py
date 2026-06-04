# scripts/fetalclip_inference.py
"""
Kalinga AI — FetalCLIP/CLIP Backend Inference Service
-----------------------------------------------------
Receives a base64-encoded ultrasound image on stdin, pre-processes it using CLAHE/Cropping,
runs zero-shot classification using OpenCLIP, and prints the result as JSON to stdout.
"""

import os
import sys
import base64
import json
import numpy as np
import cv2
from PIL import Image
import io

import torch
import open_clip

# Disable symlinks warnings on Windows
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

def process_image(base64_str):
    # 1. Decode base64 to image bytes
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    
    img_data = base64.b64decode(base64_str)
    img_np = np.frombuffer(img_data, dtype=np.uint8)
    img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Failed to decode image from base64 string")
        
    # 2. Image Preprocessing (Cropping & CLAHE)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    
    # Crop central scan area (remove 10% outer boundaries to strip metadata text/noise)
    crop_h = int(h * 0.1)
    crop_w = int(w * 0.1)
    cropped = gray[crop_h:h-crop_h, crop_w:w-crop_w]
    
    # Equalize contrast using CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    equalized = clahe.apply(cropped)
    
    # Convert back to RGB format for CLIP model input
    img_rgb = cv2.cvtColor(equalized, cv2.COLOR_GRAY2RGB)
    pil_image = Image.fromarray(img_rgb)
    
    return pil_image

def main():
    try:
        # Read base64 payload from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps({"error": "No input received on stdin"}))
            sys.exit(1)
            
        # Decode and pre-process the image
        pil_image = process_image(input_data)
        
        # Load and register FetalCLIP model configuration and weights
        PATH_FETALCLIP_CONFIG = os.path.join(os.path.dirname(__file__), "FetalCLIP_config.json")
        PATH_FETALCLIP_WEIGHT = os.path.join(os.path.dirname(__file__), "FetalCLIP_weights.pt")

        device = "cuda" if torch.cuda.is_available() else "cpu"

        with open(PATH_FETALCLIP_CONFIG, "r") as file:
            config_fetalclip = json.load(file)
        open_clip.factory._MODEL_CONFIGS["FetalCLIP"] = config_fetalclip

        # Load the FetalCLIP model and preprocessing transforms as well as tokenizer
        model, preprocess_train, preprocess_test = open_clip.create_model_and_transforms(
            "FetalCLIP", 
            pretrained=PATH_FETALCLIP_WEIGHT
        )
        tokenizer = open_clip.get_tokenizer("FetalCLIP")
        
        # Prepare inputs (using preprocess_test for zero-shot classification evaluation)
        image_input = preprocess_test(pil_image).unsqueeze(0).to(device)
        
        # Zero-shot prompts mapping to Normal, Abnormal, and Inconclusive classes
        prompts = [
            "a standard diagnostic ultrasound scan showing normal healthy fetal anatomy",
            "an abnormal ultrasound scan showing structural anomalies, pathology or key deviations",
            "a noisy, blurry, inconclusive background ultrasound image or artifact"
        ]
        text_input = tokenizer(prompts).to(device)
        
        # Run inference
        with torch.no_grad():
            image_features = model.encode_image(image_input)
            text_features = model.encode_text(text_input)
            
            # Normalize features
            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)
            
            # Calculate cosine similarities and apply softmax
            similarity = (100.0 * image_features @ text_features.T)
            probs = similarity.softmax(dim=-1).cpu().numpy()[0]
            
        # Formulate output
        result = {
            "normal": float(probs[0]),
            "abnormal": float(probs[1]),
            "inconclusive": float(probs[2])
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
