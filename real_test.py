import torch
import open_clip
from PIL import Image
from tqdm import tqdm
from PBFUS1.data_loader import load_images_info

# 1. Load the real dataset metadata you downloaded
print("Loading NatalIA dataset info...")
df = load_images_info()

# To keep the test fast on your laptop, let's test a sample of 100 images
df_sample = df.sample(n=100, random_state=42)

# 2. Build dataset-aligned text prompts from the metadata so labels match
# Use the dataset `class` strings associated with each `value` to create
# text prompts in the same index order as the numeric labels.
unique = df[['value', 'class']].drop_duplicates().sort_values('value')
class_mapping = {int(r['value']): r['class'] for _, r in unique.iterrows()}

# Create descriptive prompts directly from the dataset class names
labels = sorted(class_mapping.keys())
prompts = [f"Ultrasound image showing {class_mapping[v]}" for v in labels]

# 3. Set up the open-source model layers
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Running evaluation on: {device}")

# Using standard OpenCLIP to load the model base
model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
tokenizer = open_clip.get_tokenizer('ViT-B-32')
model.to(device)
model.eval()

# Encode our target class text prompts (tokenize)
text_tokens = tokenizer(prompts).to(device)

with torch.no_grad():
    text_features = model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

# 4. Start the live testing loop over the physical files
correct_predictions = 0
processed = 0
skipped = 0
pred_counts = {v: 0 for v in labels}
print("\nStarting zero-shot testing over ultrasound frames...")

for idx, row in tqdm(df_sample.iterrows(), total=len(df_sample)):
    try:
        img_path = row['image']
        if not img_path or not isinstance(img_path, str):
            skipped += 1
            continue
        image = preprocess(Image.open(img_path)).unsqueeze(0).to(device)

        with torch.no_grad():
            image_features = model.encode_image(image)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
            predicted_class_idx = int(similarity.argmax().item())

        actual_class = int(row['value'])
        pred_counts[predicted_class_idx] = pred_counts.get(predicted_class_idx, 0) + 1
        processed += 1
        if predicted_class_idx == actual_class:
            correct_predictions += 1

    except Exception as e:
        skipped += 1
        # don't silently swallow errors during debugging
        print(f"Skipped index {idx} (image={row.get('image')}): {e}")
        continue

# Print debug stats
print(f"Processed: {processed}, Skipped: {skipped}")
print("Prediction counts:", pred_counts)

# 5. Print out the real verified results
final_accuracy = (correct_predictions / len(df_sample)) * 100
print("\n" + "="*40)
print(f" VERIFIED TEST ACCURACY: {final_accuracy:.2f}%")
print("="*40)
