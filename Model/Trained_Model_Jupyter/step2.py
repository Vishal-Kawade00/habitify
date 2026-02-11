# ---------------------------------------------------
# Step 2: Feature Engineering - Prepare Model Inputs
# ---------------------------------------------------
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)


# -------------------------
# Path Configuration
# -------------------------
DATA_DIR = Path(r"C:\Users\Admin\OneDrive\Desktop\COLLEGE_WORK\EDI_Prj_Code\DS\New folder\updtaed_new")
OUT_DIR = DATA_DIR / "model_ready"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------
# Load Processed Files
# -------------------------
food_master = pd.read_csv(DATA_DIR / "food_master.csv")
exercise_master = pd.read_csv(DATA_DIR / "exercise_master.csv")
medical_df = pd.read_csv(DATA_DIR / "medical_guidelines_processed.csv")
who_rda_df = pd.read_csv(DATA_DIR / "who_rda_processed.csv")

print("✅ Datasets Loaded Successfully")
print(f"Food shape: {food_master.shape}, Exercise shape: {exercise_master.shape}")

# -------------------------
# Normalize Food Nutrients
# -------------------------
nutrient_cols = ['Calories', 'Protein', 'Carbs', 'Fat', 'Fibre', 'Sugar']
food_master[nutrient_cols] = food_master[nutrient_cols].fillna(0)

scaler = MinMaxScaler()
food_master_scaled = food_master.copy()
food_master_scaled[nutrient_cols] = scaler.fit_transform(food_master[nutrient_cols])

# -------------------------
# Label Encode Category / Type
# -------------------------
exercise_master['Category'] = exercise_master['Category'].replace({
    'Cardio': 0, 'Strength': 1, 'Mixed': 2
})

# -------------------------
# Feature Summary Statistics
# -------------------------
food_summary = food_master_scaled.describe().T
exercise_summary = exercise_master.describe().T

print("\n--- Food Nutrient Summary ---")
print(food_summary[['min','max','mean']])
print("\n--- Exercise Feature Summary ---")
print(exercise_summary[['min','max','mean']])

# -------------------------
# Save Model-Ready Datasets
# -------------------------
food_master_scaled.to_csv(OUT_DIR / "food_features.csv", index=False)
exercise_master.to_csv(OUT_DIR / "exercise_features.csv", index=False)
medical_df.to_csv(OUT_DIR / "medical_guidelines_features.csv", index=False)
who_rda_df.to_csv(OUT_DIR / "who_rda_features.csv", index=False)

print("\n✅ Feature Engineering Completed Successfully")
print(f"Saved model-ready files to: {OUT_DIR}")
