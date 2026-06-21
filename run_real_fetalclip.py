import os
import json
import torch
import sys
from PIL import Image
from tqdm import tqdm
from PBFUS1.data_loader import load_images_info

# Point to your cloned repository folder
sys.path.append(os.path.join(os.path.dirname(__file__), 'fetalclip_src'))
import open_clip

# 1. Paths to the real MBZUAI model definition files
PATH_CONFIG = "fetalclip_src/FetalCLIP_config.json"
PATH_WEIGHTS = "fetalclip_src/FetalCLIP_weights.pt"

if not os.path.exists(PATH_WEIGHTS):
    print("\n" + "="*70)
    print(" CRITICAL ERROR: MISSING MBZUAI MEDICAL WEIGHTS FILE")
    print("="*70)
    print(f"The structural code is ready, but you need to place the file:")
    print(f" -> '{PATH_WEIGHTS}'")
    print("into your folder to run the live deep-learning inference loop.")
    print("="*70)
    sys.exit(1)

print("Loading genuine MBZUAI FetalCLIP configurations...")

# 2. Inject and register the custom FetalCLIP architecture into open_clip factory
with open(PATH_CONFIG, "r") as file:
    config_fetalclip = json.load(file)
open_clip.factory._MODEL_CONFIGS["FetalCLIP"] = config_fetalclip

# 3. Load the real trained weights brain
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess_train, preprocess_test = open_clip.create_model_and_transforms(
    "FetalCLIP", 
    pretrained=PATH_WEIGHTS
)
tokenizer = open_clip.get_tokenizer("FetalCLIP")
model.to(device)
model.eval()

# 4. Load your real NatalIA images dataset
df = load_images_info()
df_sample = df.sample(n=50, random_state=42)

class_prompts = [
    "an ultrasound image of a biparietal standard plane",
    "an ultrasound image of a heart standard plane",
    "an ultrasound image of an abdominal standard plane",
    "an ultrasound image of a spine standard plane",
    "an ultrasound image of a femur standard plane",
    "an ultrasound image showing no standard plane"
]

text_tokens = tokenizer(class_prompts).to(device)
with torch.no_grad():
    text_features = model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

correct = 0
print("\nRunning real FetalCLIP zero-shot classification matrix...")

for idx, row in tqdm(df_sample.iterrows(), total=len(df_sample)):
    try:
        image = preprocess_test(Image.open(row['image'])).unsqueeze(0).to(device)
        with torch.no_grad():
            image_features = model.encode_image(image)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
            predicted_idx = similarity.argmax().item()
            
        if predicted_idx == int(row['value']):
            correct += 1
    except Exception:
        continue

print(f"\nREAL MODEL ACCURACY: {(correct / len(df_sample)) * 100:.2f}%")
