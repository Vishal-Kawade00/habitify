# ---------------------------------------------------
# Step 3: Personalized Diet & Exercise Recommendation Engine
# ---------------------------------------------------
import pandas as pd
import numpy as np
from pathlib import Path

# -------------------------
# CONFIG: Update this path to match your folder structure exactly!
# -------------------------
# Based on your logs, this is where your Step 2 saved the files:
DATA_DIR = Path(r"C:\Users\Admin\OneDrive\Desktop\COLLEGE_WORK\EDI_Prj_Code\DS\New folder\updtaed_new\model_ready")

# -------------------------
# FIX: Load UN-SCALED food data for human-readable recommendations
# -------------------------
# We look for food_master.csv in the PARENT folder of model_ready (updtaed_new)
food_master_path = DATA_DIR.parent / "food_master.csv"

if food_master_path.exists():
    food_df = pd.read_csv(food_master_path)
    print(f"✅ Loaded REAL food data from: {food_master_path}")
else:
    # If not found, warn the user
    print(f"⚠️ Warning: Could not find 'food_master.csv' at {food_master_path}")
    print("Attempting to load features file (Warning: values might be scaled 0-1 and return empty results!)")
    food_df = pd.read_csv(DATA_DIR / "food_features.csv")

# Load other files (Exercise data doesn't use calorie scaling for filtering, so features file is fine)
exercise_df = pd.read_csv(DATA_DIR / "exercise_features.csv")
medical_df = pd.read_csv(DATA_DIR / "medical_guidelines_features.csv")

print("✅ All datasets loaded successfully!")

# -------------------------
# Utility Functions
# -------------------------
def calculate_tdee(age, gender, height, weight, activity_level):
    if str(gender).lower().startswith('m'):
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    # Activity Factor
    if activity_level == 0: factor = 1.2
    elif activity_level <= 3: factor = 1.375
    elif activity_level <= 5: factor = 1.55
    else: factor = 1.725
    return bmr * factor

def recommend_diet(goal, diet_pref, calorie_target, condition=None):
    df = food_df.copy()

    # 1. Goal-based calorie adjustment
    if goal.lower() == "lose weight":
        target = calorie_target * 0.85
    elif goal.lower() == "gain weight":
        target = calorie_target * 1.15
    else:
        target = calorie_target

    # Meal target (assuming 3 meals a day)
    meal_target = target / 3.0
    # Allow a wider range (e.g., +/- 40%) to ensure we find matches
    lower, upper = meal_target * 0.6, meal_target * 1.4
    
    # Filter by calories (Using REAL numbers now)
    df = df[(df['Calories'] >= lower) & (df['Calories'] <= upper)]

    # 2. Diet preference
    if diet_pref.lower() == 'veg':
        # Filter out non-veg items based on keywords
        df = df[~df['FoodItem'].str.contains('chicken|meat|fish|egg|mutton|prawn|crab|bacon|sausage', case=False, na=False)]

    # 3. Medical Conditions
    if condition and not medical_df.empty:
        # Simple lookup in medical rules
        med_row = medical_df[medical_df['Condition'].str.lower() == condition.lower()]
        if not med_row.empty:
            avoid_txt = str(med_row.iloc[0]['Avoid'])
            if avoid_txt and avoid_txt.lower() != 'nan':
                # Split by comma and filter out
                avoids = [x.strip() for x in avoid_txt.split(',')]
                for a in avoids:
                    if a:
                        df = df[~df['FoodItem'].str.contains(a, case=False, na=False)]

    # 4. Rank by score
    # Ensure columns are numeric
    for col in ["Protein", "Fibre", "Sugar", "Fat"]:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
    df["NutrientScore"] = (
        0.4 * df["Protein"] + 
        0.2 * df["Fibre"] - 
        0.1 * df["Sugar"] - 
        0.1 * df["Fat"]
    )
    
    # Return top 10
    return df.sort_values(by="NutrientScore", ascending=False).head(10)[['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar']]


def recommend_exercises(goal):
    ex = exercise_df.copy()
    
    # Category mapping: 0=Cardio, 1=Strength, 2=Mixed
    if goal.lower() == "lose weight":
        ex = ex[ex['Category'] == 0]
    elif goal.lower() == "gain weight":
        ex = ex[ex['Category'] == 1]
    else:
        ex = ex[ex['Category'].isin([0, 1])]

    ex = ex.sort_values(by='Calories_per_kg', ascending=False).head(5)
    
    # Add YouTube links
    ex['YouTubeDemo'] = ex['Activity'].apply(
        lambda x: f"https://www.youtube.com/results?search_query={str(x).replace(' ','+')}"
    )

    return ex[['Activity','Calories_per_kg','Category','YouTubeDemo']]

# -------------------------
# Run Test
# -------------------------
user = {
    "age": 25, "gender": "Male", "height": 175, "weight": 70,
    "activity_level": 4, "goal": "Lose Weight", "diet_pref": "Veg", "condition": "Diabetes"
}

user_tdee = calculate_tdee(user['age'], user['gender'], user['height'], user['weight'], user['activity_level'])
print(f"\n🔥 Estimated TDEE: {user_tdee:.2f} kcal/day")

diet_recs = recommend_diet(user['goal'], user['diet_pref'], user_tdee, user['condition'])
exercise_recs = recommend_exercises(user['goal'])

print("\n🍽️ Top Diet Recommendations:")
if not diet_recs.empty:
    print(diet_recs.to_string(index=False))
else:
    print("No diet recommendations found. (Try widening the calorie range in the code)")

print("\n🏋️ Top Exercise Recommendations:")
print(exercise_recs.to_string(index=False))