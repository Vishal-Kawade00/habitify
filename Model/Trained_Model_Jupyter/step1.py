import pandas as pd
import numpy as np
import os
from pathlib import Path

# -------------------------
# Config: adjust paths here
# -------------------------
DATA_DIR = Path(r"C:\Users\Admin\OneDrive\Desktop\COLLEGE_WORK\EDI_Prj_Code\DS\New folder")   # <- change if your files are elsewhere
OUT_DIR  = Path(r"C:\Users\Admin\OneDrive\Desktop\COLLEGE_WORK\EDI_Prj_Code\DS\New folder\updtaed_new")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Filenames you mentioned (will try multiple common names)
FILES = {
    "exercise": ["exercise_cleaned.csv", "exercise.csv", "exercise_master.csv"],
    "food_usda": ["food.csv", "food1.csv"],
    "food_indian": ["food_cleaned.csv", "indian_food.csv"],
    "rda": ["rda_cleaned.csv", "rda.csv"],
    "met": ["met.csv", "met_values.csv"],
    "medical_guidelines": ["medical_guidelines.csv"],
    "who_rda": ["who_rda_reference.csv"]
}

def find_file(names):
    for n in names:
        p = DATA_DIR / n
        if p.exists():
            return p
    return None

# -------------------------
# Load helper (safe)
# -------------------------
def safe_read(path, **kwargs):
    try:
        return pd.read_csv(path, **kwargs)
    except Exception as e:
        print(f"Warning: couldn't read {path} -> {e}")
        return pd.DataFrame()

# -------------------------
# 1) Load datasets
# -------------------------
print("Loading files...")
exercise_path = find_file(FILES["exercise"])
food_usda_path = find_file(FILES["food_usda"])
food_indian_path = find_file(FILES["food_indian"])
rda_path = find_file(FILES["rda"])
met_path = find_file(FILES["met"])
medical_path = find_file(FILES["medical_guidelines"])
who_rda_path = find_file(FILES["who_rda"])

print("Paths found:")
print(" exercise:", exercise_path)
print(" food_usda:", food_usda_path)
print(" food_indian:", food_indian_path)
print(" rda:", rda_path)
print(" met:", met_path)
print(" medical:", medical_path)
print(" who_rda:", who_rda_path)

exercise_df = safe_read(exercise_path) if exercise_path else pd.DataFrame()
food_usda_df = safe_read(food_usda_path) if food_usda_path else pd.DataFrame()
food_indian_df = safe_read(food_indian_path) if food_indian_path else pd.DataFrame()
rda_df = safe_read(rda_path) if rda_path else pd.DataFrame()
met_df = safe_read(met_path) if met_path else pd.DataFrame()
medical_df = safe_read(medical_path) if medical_path else pd.DataFrame()
who_rda_df = safe_read(who_rda_path) if who_rda_path else pd.DataFrame()

# -------------------------
# 2) Clean / standardize columns
# -------------------------
def clean_column_names(df):
    df = df.copy()
    df.columns = [str(c).strip().replace("\u200b","") for c in df.columns]
    df.columns = [c.replace("\n"," ").strip() for c in df.columns]
    return df

exercise_df = clean_column_names(exercise_df)
food_usda_df = clean_column_names(food_usda_df)
food_indian_df = clean_column_names(food_indian_df)
rda_df = clean_column_names(rda_df)
met_df = clean_column_names(met_df)
medical_df = clean_column_names(medical_df)
who_rda_df = clean_column_names(who_rda_df)

# --- Exercise: rename expected columns robustly ---
def prepare_exercise(df):
    if df.empty:
        return df
    df = df.copy()
    # find Activity-like col
    possible_activity = [c for c in df.columns if 'activity' in c.lower() or 'title' in c.lower() or 'activity'==c.lower()]
    if possible_activity:
        df = df.rename(columns={possible_activity[0]: "Activity"})
    # find calories-per-kg or equivalent
    possible_cpk = [c for c in df.columns if 'per_kg' in c.lower() or 'calories_per_kg' in c.lower() or 'calories per kg' in c.lower()]
    if possible_cpk:
        df = df.rename(columns={possible_cpk[0]: "Calories_per_kg"})
    # if separate columns for weights, keep them
    for wcol in ["130 lb","Calories_130lb","Calories_130 lb","130lb","Calories_130lb"]:
        if wcol in df.columns:
            df = df.rename(columns={wcol: "Calories_130lb"})
    # coerce numeric
    for col in df.columns:
        if col != "Activity":
            try:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            except:
                pass
    # fill small NaNs
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].fillna(0)
    return df

exercise_df = prepare_exercise(exercise_df)

# --- METs: normalize
def prepare_met(df):
    if df.empty:
        return df
    df = df.copy()
    # possible activity column
    if 'Description' in df.columns and 'MET' in df.columns:
        df = df.rename(columns={'Description':'Activity','MET':'MET'})
    elif 'ActvitiyCode' in df.columns and 'MET' in df.columns:
        # rename possible misspelling
        df = df.rename(columns={'ActvitiyCode':'Activity','MET':'MET'})
    df['Activity'] = df['Activity'].astype(str).str.strip()
    df['MET'] = pd.to_numeric(df['MET'], errors='coerce').fillna(0)
    return df

met_df = prepare_met(met_df)

# Link met -> exercise by fuzzy match will be done later if possible

# --- Food (USDA-style): extract key nutrient columns when present
def normalize_food_usda(df):
    if df.empty:
        return df
    df = df.copy()
    # Lowercase column names map
    colmap = {c:c for c in df.columns}
    lc = {c.lower():c for c in df.columns}
    # heuristics for calories/protein/carbs/fat/sugar/fibre
    picks = {}
    for target, keywords in {
        "FoodItem": ["description","name","food","category","long_desc"],
        "Calories": ["energy","calories","energy kcal","kcal"],
        "Protein": ["protein"],
        "Carbs": ["carbohydrate","carbs","carbohydrate, by difference"],
        "Fat": ["total lipid","fat"],
        "Sugar": ["sugar","sugars","free sugar"],
        "Fibre": ["fiber","fibre"],
        "Sodium": ["sodium"],
        "Calcium": ["calcium"],
        "Iron": ["iron"],
        "VitaminC": ["vitamin c","vit c"]
    }.items():
        found = None
        for k in keywords:
            if k in lc:
                found = lc[k]; break
        if found:
            picks[target] = found
    # create minimal df
    out = pd.DataFrame()
    if "FoodItem" in picks:
        out["FoodItem"] = df[picks["FoodItem"]].astype(str).str.strip()
    else:
        # try first text-like column
        text_cols = [c for c in df.columns if df[c].dtype == object]
        out["FoodItem"] = df[text_cols[0]].astype(str).str.strip() if text_cols else "unknown"
    for nut in ["Calories","Protein","Carbs","Fat","Sugar","Fibre","Sodium","Calcium","Iron","VitaminC"]:
        if nut in picks:
            out[nut] = pd.to_numeric(df[picks[nut]], errors='coerce')
        else:
            out[nut] = np.nan
    # drop rows with no FoodItem or all NaNs
    out = out.dropna(subset=["FoodItem"]).reset_index(drop=True)
    return out

food_usda_core = normalize_food_usda(food_usda_df)

# --- Food Indian / cleaned: prefer this as primary source for names, calories etc.
def prepare_food_indian(df):
    if df.empty:
        return df
    df = df.copy()
    # Standardize common columns
    col_lc = {c.lower():c for c in df.columns}
    rename_map = {}
    # possible mappings
    if 'dish' in col_lc: rename_map[col_lc['dish']] = 'FoodItem'
    if 'food items' in col_lc: rename_map[col_lc['food items']] = 'FoodItem'
    if 'calories' in col_lc: rename_map[col_lc['calories']] = 'Calories'
    if 'protein' in col_lc: rename_map[col_lc['protein']] = 'Protein'
    if 'carbs' in col_lc: rename_map[col_lc['carbs']] = 'Carbs'
    if 'fat' in col_lc: rename_map[col_lc['fat']] = 'Fat'
    if 'fibre' in col_lc: rename_map[col_lc['fibre']] = 'Fibre'
    if 'sugar' in col_lc: rename_map[col_lc['sugar']] = 'Sugar'
    # apply
    df = df.rename(columns=rename_map)
    # keep minimal columns
    required = ['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar']
    for c in required:
        if c not in df.columns:
            df[c] = np.nan
    df['FoodItem'] = df['FoodItem'].astype(str).str.strip()
    # numeric coercion
    for c in ['Calories','Protein','Carbs','Fat','Fibre','Sugar']:
        df[c] = pd.to_numeric(df[c], errors='coerce')
    return df[required].drop_duplicates(subset=['FoodItem']).reset_index(drop=True)

food_indian_core = prepare_food_indian(food_indian_df)

# --- RDA cleaned dataset: prepare
def prepare_rda(df):
    if df.empty:
        return df
    df = df.copy()
    # unify names
    col_lc = {c.lower():c for c in df.columns}
    rename = {}
    if 'food_items' in col_lc: rename[col_lc['food_items']] = 'FoodItem'
    if 'vegnovveg' in col_lc: rename[col_lc['vegnovveg']] = 'VegNonVeg'
    if 'breakfast' in col_lc: rename[col_lc['breakfast']] = 'Breakfast'
    if 'lunch' in col_lc: rename[col_lc['lunch']] = 'Lunch'
    if 'dinner' in col_lc: rename[col_lc['dinner']] = 'Dinner'
    if 'calories' in col_lc: rename[col_lc['calories']] = 'Calories'
    df = df.rename(columns=rename)
    # standardize VegNonVeg: try to map strings to 0/1
    if 'VegNonVeg' in df.columns:
        df['VegNonVeg'] = df['VegNonVeg'].astype(str).str.strip()
        df['VegNonVeg'] = df['VegNonVeg'].replace({'Veg':0,'NonVeg':1,'Vegetarian':0,'Non Vegetarian':1,'':np.nan})
        # fallback: if col numeric leave as-is
        try:
            df['VegNonVeg'] = pd.to_numeric(df['VegNonVeg'], errors='coerce')
        except:
            pass
    # ensure FoodItem text
    if 'FoodItem' in df.columns:
        df['FoodItem'] = df['FoodItem'].astype(str).str.strip()
    return df

rda_core = prepare_rda(rda_df)

# -------------------------
# 3) Build food_master: merge indian core + usda core (prioritize indian names)
# -------------------------
def build_food_master(indian_core, usda_core):
    # Start with indian core as authoritative for indian dishes
    base = indian_core.copy() if not indian_core.empty else pd.DataFrame()
    # If usda has FoodItem names, merge where names match (simple exact join)
    if not usda_core.empty:
        # dedupe by fooditem in usda
        us = usda_core.drop_duplicates(subset=['FoodItem']).copy()
        # left-join on FoodItem
        if not base.empty:
            merged = pd.merge(base, us, on='FoodItem', how='left', suffixes=('_ind','_us'))
        else:
            merged = us.copy()
        # fill missing nutrition columns using usda data if indian lacks them
        for col in ['Calories','Protein','Carbs','Fat','Fibre','Sugar','Sodium','Calcium','Iron','VitaminC']:
            col_ind = col + '_ind' if col + '_ind' in merged.columns else col
            col_us = col + '_us' if col + '_us' in merged.columns else col
            if col_ind in merged.columns and col_us in merged.columns:
                merged[col] = merged[col_ind].fillna(merged[col_us])
            elif col in merged.columns:
                merged[col] = merged[col]
            else:
                merged[col] = np.nan
        # ensure FoodItem exists
        if 'FoodItem' not in merged.columns and 'FoodItem' in us.columns:
            merged['FoodItem'] = us['FoodItem']
        # keep canonical cols
        keep = ['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar','Sodium','Calcium','Iron','VitaminC']
        for k in keep:
            if k not in merged.columns:
                merged[k] = np.nan
        master = merged[keep].drop_duplicates(subset=['FoodItem']).reset_index(drop=True)
    else:
        master = base.copy()
    # final cleaning
    for c in ['Calories','Protein','Carbs','Fat','Fibre','Sugar','Sodium','Calcium','Iron','VitaminC']:
        if c in master.columns:
            master[c] = pd.to_numeric(master[c], errors='coerce')
    master = master.drop_duplicates(subset=['FoodItem']).reset_index(drop=True)
    return master

food_master = build_food_master(food_indian_core, food_usda_core)

# If food_master is empty, fall back to any available food df
if food_master.empty and not food_indian_df.empty:
    food_master = prepare_food_indian(food_indian_df)

# -------------------------
# 4) Build exercise_master: map MET or calories_per_kg
# -------------------------
def build_exercise_master(ex_df, met_df):
    if ex_df.empty:
        return ex_df
    ex = ex_df.copy()
    # Ensure Activity exists
    if 'Activity' not in ex.columns:
        possible = [c for c in ex.columns if 'title' in c.lower() or 'name' in c.lower()]
        if possible:
            ex = ex.rename(columns={possible[0]:'Activity'})
    ex['Activity'] = ex['Activity'].astype(str).str.strip()
    # If Calories_per_kg exists use it; else attempt to compute from MET
    if 'Calories_per_kg' not in ex.columns or ex['Calories_per_kg'].isna().all():
        # try to join on Activity with METs and compute calories_per_kg = MET * 1.05 (approx)
        if not met_df.empty:
            # simple exact join first
            merged = pd.merge(ex, met_df[['Activity','MET']].drop_duplicates(), on='Activity', how='left')
            if 'MET' in merged.columns:
                merged['Calories_per_kg'] = merged['MET'] * 1.05  # conversion rule used earlier
            ex = merged
    # fill numeric
    ex['Calories_per_kg'] = pd.to_numeric(ex.get('Calories_per_kg', pd.Series(np.nan)), errors='coerce').fillna(0)
    # Infer category column if missing
    if 'BodyPart' in ex.columns:
        ex['Category'] = ex['BodyPart']
    else:
        # keyword-based
        cardio_kw = ['run','cycle','swim','cardio','aerobic','stair','ski']
        strength_kw = ['barbell','kettlebell','weight','press','squat','deadlift','bench','lift','curl','pull','push']
        def detect_cat(a):
            a_low = str(a).lower()
            if any(k in a_low for k in cardio_kw): return 'Cardio'
            if any(k in a_low for k in strength_kw): return 'Strength'
            return 'Mixed'
        ex['Category'] = ex['Activity'].apply(detect_cat)
    # drop duplicates and return
    return ex[['Activity','Calories_per_kg','Category']].drop_duplicates(subset=['Activity']).reset_index(drop=True)

exercise_master = build_exercise_master(exercise_df, met_df)

# -------------------------
# 5) Integrate medical_guidelines & who_rda (just load)
# -------------------------
medical_master = medical_df.copy() if not medical_df.empty else pd.DataFrame()
who_rda_master = who_rda_df.copy() if not who_rda_df.empty else pd.DataFrame()

# -------------------------
# 6) Save outputs and print checks
# -------------------------
food_master.to_csv(OUT_DIR / "food_master.csv", index=False)
exercise_master.to_csv(OUT_DIR / "exercise_master.csv", index=False)
medical_master.to_csv(OUT_DIR / "medical_guidelines_processed.csv", index=False)
who_rda_master.to_csv(OUT_DIR / "who_rda_processed.csv", index=False)

print("\nSaved processed files to:", OUT_DIR)
print("Food master shape:", food_master.shape)
print("Exercise master shape:", exercise_master.shape)
print("Medical rules rows:", 0 if medical_master.empty else medical_master.shape[0])
print("WHO RDA rows:", 0 if who_rda_master.empty else who_rda_master.shape[0])

# Quick head previews
print("\n--- Food master sample ---")
print(food_master.head(5).to_string(index=False))
print("\n--- Exercise master sample ---")
print(exercise_master.head(8).to_string(index=False))

# Sanity checks
if food_master['FoodItem'].duplicated().any():
    print("Warning: duplicate food items present.")
if exercise_master['Activity'].duplicated().any():
    print("Warning: duplicate exercise activities present.")
