<<<<<<< Updated upstream
# kalinga
Is this the dagger
<img width="735" height="823" alt="image" src="https://github.com/user-attachments/assets/301d14c9-1157-49a8-a8a3-d00a48f65d65" />

=======
# Kalinga AI: FetalCLIP & NatalIA (PBF-US1) Integration

Kalinga AI is a modern clinical decision support and telemedicine system designed for low-resource Barangay Health Centers. It shifts high-fidelity AI classification and preeclampsia triage risk scoring from edge PWAs to a self-hosted backend utilizing **FetalCLIP** and the **NatalIA (PBF-US1)** standard planes dataset.

---

## 🔬 FetalCLIP Foundation Model

FetalCLIP is a vision-language foundation model pre-trained on 210,035 fetal ultrasound images paired with text, optimizing zero-shot representation learning for obstetric care.

### 🔧 Installation & Environment Setup

Configure a dedicated environment for running the FetalCLIP inference engine:

```bash
# Create and activate environment
conda create -n fetalclip python=3.9
conda activate fetalclip

# Install open_clip and PyTorch dependencies
pip install -r requirements.txt
```

### 📥 Download Pretrained Weights

Store the model configuration and pretrained weights in the `scripts/` directory:
- **Configuration**: [FetalCLIP_config.json]
- **Weights**: [FetalCLIP_weights.pt] (Download via HuggingFace LFS)

### ⚡ Quick Start Inference

Use the following snippet to initialize and register `FetalCLIP` inside the open_clip registry:

```python
import json
import torch
import open_clip
from PIL import Image

# Define paths for model configuration and weights
PATH_FETALCLIP_CONFIG = "scripts/FetalCLIP_config.json"
PATH_FETALCLIP_WEIGHT = "scripts/FetalCLIP_weights.pt"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load and register model configuration
with open(PATH_FETALCLIP_CONFIG, "r") as file:
    config_fetalclip = json.load(file)
open_clip.factory._MODEL_CONFIGS["FetalCLIP"] = config_fetalclip

# Load FetalCLIP model and preprocessing transforms
model, preprocess_train, preprocess_test = open_clip.create_model_and_transforms(
    "FetalCLIP", 
    pretrained=PATH_FETALCLIP_WEIGHT
)
tokenizer = open_clip.get_tokenizer("FetalCLIP")
model.eval()
model.to(device)

# Load target scan frame
img = Image.open("image1.jpg")
image_tensor = preprocess_test(img).unsqueeze(0).to(device)

# Define zero-shot classification prompts
text_prompts = [
    "Ultrasound image focusing on the fetal abdominal area, highlighting structural development.",
    "Fetal ultrasound image focusing on the heart, highlighting detailed cardiac structures.",
    "Ultrasound image focusing on the fetal brain or biparietal area, highlighting cerebral structures and skull."
]
text_tokens = tokenizer(text_prompts).to(device)

with torch.no_grad():
    image_features = model.encode_image(image_tensor)
    text_features = model.encode_text(text_tokens)

    # Normalize embedding features
    image_features /= image_features.norm(dim=-1, keepdim=True)
    text_features /= text_features.norm(dim=-1, keepdim=True)

    # Compute similarity probabilities
    text_probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)

print("Label probabilities:", text_probs)
```

---

## 📂 NatalIA: PBF-US1 Dataset

NatalIA provides a standardized set of fetal sweeps collected using Kyoto Kagaku phantoms and Clarius point-of-care ultrasound devices, representing a 23-week fetus in multiple scanning protocols.

### 📥 Package Installation

```bash
pip install PBFUS1
```

### 📋 Dataset Features

Includes 5 standard fetal planes representing transverse sweeps:
1. **Biparietal standard plane** (Value: `0`, 42 frames)
2. **Abdominal standard plane** (Value: `1`, 63 frames)
3. **Heart standard plane** (Value: `2`, 61 frames)
4. **Spine standard plane** (Value: `3`, 134 frames)
5. **Femur standard plane** (Value: `4`, 46 frames)
6. **No plane / Background noise** (Value: `5`, 19,061 frames)

### ⚡ Python Integration Example

Utilize the package API to load study files and metadata dynamically:

```python
from PBFUS1.metadata import count_elements_per_class, get_images_by_class_value, load_studies_metadata
from PBFUS1.data_loader import download_dataset, load_images_info

# Download and extract the dataset automatically into './data'
download_dataset()

# Load details and dataframes
images_df = load_images_info()
studies_df = load_studies_metadata()

# Check class frequencies
class_count = count_elements_per_class()

# Filter images belonging to Heart standard plane (value = 2)
heart_images = get_images_by_class_value(2)
```

---

## 🛠️ Architecture Workflow

1. **Midwife Capture**: The PWA captures the ultrasound frame offline, saving it locally.
2. **Store-and-Forward Sync**: Once online, the client pushes the sync payload to the backend.
3. **FetalCLIP Backend Inference**: The backend spawns `fetalclip_inference.py` using `FetalCLIP_weights.pt` to compute zero-shot diagnostic probabilities.
4. **Triage Risk Assessment**: The system runs `riskService.ts` to output preeclampsia risk levels and populates the OB-GYN prioritized dashboard queue.
>>>>>>> Stashed changes
