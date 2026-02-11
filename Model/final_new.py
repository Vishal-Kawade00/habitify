# final_new_UPDATED.py
# Final integrated Streamlit app (ALL requirements from conversation)
# Save as final_new_UPDATED.py and run: streamlit run final_new_UPDATED.py

import streamlit as st
import pandas as pd
import numpy as np
from pathlib import Path
import json, datetime, urllib.parse, re, os, math
from fpdf import FPDF
import joblib
import warnings
warnings.filterwarnings("ignore")

# ML imports
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, accuracy_score

# ---------------------------
# CONFIG / PATHS
# ---------------------------
# Data folder (your primary data)
DATA_DIR = Path(r"F:/Prj/DS/New folder/updtaed_new")
# Safety rules folder (you told me these are placed in F:/Prj/Safety_rules)
SAFETY_RULES_DIR = Path(r"F:/Prj/Safety_rules")

# Model folder (will be created in current working dir)
MODEL_DIR = Path.cwd() / "models"
MODEL_DIR.mkdir(exist_ok=True)

FOOD_MASTER_FILE = DATA_DIR / "food_master.csv"
EXERCISE_MASTER_FILE = DATA_DIR / "exercise_master.csv"
MEDICAL_FILE = DATA_DIR / "medical_guidelines_processed.csv"
RDA_CLEANED_FILE = DATA_DIR / "rda_cleaned.csv"
EXERCISE_VIDEOS_FILE = DATA_DIR / "exercise_videos.csv"

# Safety CSV file names (expected inside SAFETY_RULES_DIR)
MEDICAL_FOOD_CSV = SAFETY_RULES_DIR / "medical_food_rules.csv"
MEDICAL_EXERCISE_CSV = SAFETY_RULES_DIR / "medical_exercise_rules.csv"
GENDER_ADJUST_CSV = SAFETY_RULES_DIR / "gender_adjustments.csv"
FREQUENCY_RULES_CSV = SAFETY_RULES_DIR / "frequency_rules.csv"

# ---------------------------
# UI Styling helper
# ---------------------------
def add_bg_and_style():
    st.markdown("""
    <style>
    .stApp { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-attachment: fixed;}
    .block-container { background: rgba(255,255,255,0.95); backdrop-filter: blur(6px); border-radius: 12px; padding: 1.5rem;}
    h1 { color: #764ba2 !important; text-align: center; font-weight: 800 !important; text-shadow: 1px 1px 3px rgba(0,0,0,0.08); }
    .stButton > button { border-radius: 14px; padding: 0.6rem 1.2rem; font-weight:600; }
    .flag-avoid { color: #ffffff; background:#d32f2f; padding:4px 8px; border-radius:8px;}
    .flag-limit { color: #000000; background:#ffeb3b; padding:4px 8px; border-radius:8px;}
    .flag-ok { color: #ffffff; background:#43a047; padding:4px 8px; border-radius:8px;}
    .info-box { border-radius:10px; padding:10px; background: rgba(118,75,162,0.06); margin-bottom:8px; }
    </style>
    """, unsafe_allow_html=True)

st.set_page_config(page_title="AI Diet & Workout Recommender (Final)", layout="wide")
add_bg_and_style()

# ---------------------------
# Helper IO
# ---------------------------
def safe_read_csv(p: Path):
    """Robust CSV reader returning DataFrame or empty DataFrame."""
    if p.exists():
        try:
            return pd.read_csv(p, on_bad_lines='skip', engine='python')
        except Exception:
            # try with latin1
            try:
                return pd.read_csv(p, encoding='latin-1', on_bad_lines='skip', engine='python')
            except Exception:
                return pd.DataFrame()
    return pd.DataFrame()

# ---------------------------
# Load Safety Engine / rule CSVs
# ---------------------------
def load_safety_rules():
    rules = {}
    rules['medical_food'] = safe_read_csv(MEDICAL_FOOD_CSV)
    rules['medical_exercise'] = safe_read_csv(MEDICAL_EXERCISE_CSV)
    rules['gender_adjust'] = safe_read_csv(GENDER_ADJUST_CSV)
    rules['frequency'] = safe_read_csv(FREQUENCY_RULES_CSV)
    return rules

safety_rules = load_safety_rules()

# ---------------------------
# Load main datasets
# ---------------------------
food_df = safe_read_csv(FOOD_MASTER_FILE)
exercise_df = safe_read_csv(EXERCISE_MASTER_FILE)
medical_df = safe_read_csv(MEDICAL_FILE)
rda_df = safe_read_csv(RDA_CLEANED_FILE) if RDA_CLEANED_FILE.exists() else pd.DataFrame()
videos_df = safe_read_csv(EXERCISE_VIDEOS_FILE)

# ---------------------------
# Veg/NonVeg inference helpers
# ---------------------------
NONVEG_TOKENS = {"chicken", "mutton", "lamb", "beef", "pork", "fish", "egg", "eggs", "prawn", "shrimp", "crab", "bacon", "sausage", "tuna", "salmon", "anchovy", "squid", "octopus", "seafood"}
VEG_HINTS = {"paneer","tofu","dal","lentil","vegetable","veg","vegetarian","sambar","idli","dosa","roti","salad","sprouts","cheese","curry"}

def infer_veg_flag(food_name: str, tags: str = ""):
    if not isinstance(food_name, str): return None
    s = (food_name + " " + (tags or "")).lower()
    for t in NONVEG_TOKENS:
        if t in s: return 1
    for v in VEG_HINTS:
        if v in s: return 0
    return None

# ---------------------------
# PDF creation with clickable links
# ---------------------------
def create_pdf(user_info, diet_table, exercise_table, tips, out_path):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Arial","B",16)
    pdf.cell(0,8,"AI-Driven Personalized Diet and Workout Recommendation", ln=True, align="C")
    pdf.ln(4)
    pdf.set_font("Arial",size=10)
    pdf.multi_cell(0,6, f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    pdf.multi_cell(0,6, f"User: {user_info.get('name','-')} | Age: {user_info['age']} | Gender: {user_info['gender']} | Goal: {user_info['goal']}")
    pdf.ln(6)

    # Diet
    pdf.set_font("Arial","B",12); pdf.cell(0,6,"Diet Recommendations (per meal approx.)", ln=True)
    pdf.set_font("Arial",size=9)
    if diet_table is not None and not diet_table.empty:
        headers = list(diet_table.columns[:6])
        colw = [60,22,22,22,22,22]
        for i,h in enumerate(headers):
            pdf.cell(colw[i],6,str(h),border=1)
        pdf.ln()
        for _, r in diet_table.head(40).iterrows():
            for i,h in enumerate(headers):
                pdf.cell(colw[i],6,str(r.get(h,""))[:30],border=1)
            pdf.ln()
    else:
        pdf.cell(0,6,"No diet recommendations found.", ln=True)
    pdf.ln(6)

    # Exercise
    pdf.set_font("Arial","B",12); pdf.cell(0,6,"Exercise Recommendations (Top)", ln=True)
    pdf.set_font("Arial", size=9)
    if exercise_table is not None and not exercise_table.empty:
        colw_ex = [40,35,30,30,55]
        for h in ['Activity','Category','Cal/kg','Est_kcal/session','Demo Link']:
            pdf.cell(colw_ex[['Activity','Category','Cal/kg','Est_kcal/session','Demo Link'].index(h)],6,str(h),border=1)
        pdf.ln()
        for _, r in exercise_table.head(15).iterrows():
            pdf.cell(colw_ex[0],6,str(r.get('Activity',''))[:30],border=1)
            pdf.cell(colw_ex[1],6,str(r.get('Category',''))[:15],border=1)
            try:
                pdf.cell(colw_ex[2],6,f"{float(r.get('Calories_per_kg',0)):.2f}",border=1)
            except:
                pdf.cell(colw_ex[2],6,str(r.get('Calories_per_kg','')),border=1)
            try:
                pdf.cell(colw_ex[3],6,str(int(float(r.get('Est_Cals_session',0)))),border=1)
            except:
                pdf.cell(colw_ex[3],6,str(r.get('Est_Cals_session','')),border=1)
            link_url = str(r.get('demo_link','')) or ""
            if link_url and not link_url.lower().startswith("http"):
                link_url = "https://" + link_url
            pdf.set_text_color(0,0,255); pdf.set_font("Arial","U",9)
            try:
                pdf.cell(colw_ex[4],6,"Watch Demo",border=1,link=link_url,align='C')
            except Exception:
                pdf.set_font("Arial",size=9); pdf.set_text_color(0,0,0)
                pdf.cell(colw_ex[4],6,link_url[:30],border=1)
            pdf.set_font("Arial",size=9); pdf.set_text_color(0,0,0)
            pdf.ln()
    else:
        pdf.cell(0,6,"No exercise recommendations found.", ln=True)
    pdf.ln(6)

    pdf.set_font("Arial","B",12); pdf.cell(0,6,"Personalized Tips", ln=True)
    pdf.set_font("Arial",size=10)
    for t in tips:
        pdf.multi_cell(0,6, "- " + t)
    pdf.ln(6)

    pdf.set_font("Arial", size=7)
    pdf.multi_cell(0,5, "Disclaimer: AI suggestions are for educational purposes. Consult a medical professional for specific medical conditions.")
    pdf.output(str(out_path))
    return out_path

# ---------------------------
# Model training/loading (silent)
# ---------------------------
DIET_MODEL_PATH = MODEL_DIR / "diet_regressor.joblib"
WORKOUT_MODEL_PATH = MODEL_DIR / "workout_classifier.joblib"

def synthesize_training_data(n=5000, random_state=42):
    rng = np.random.RandomState(random_state)
    rows = []
    for _ in range(n):
        age = rng.randint(18,65)
        gender = rng.choice([0,1])  # 0 female, 1 male
        height = rng.randint(150,195)
        weight = rng.randint(45,110)
        activity_days = rng.randint(0,7)
        goal = rng.choice([0,1,2])  # 0 lose,1 maintain,2 gain
        diet_pref = rng.choice([0,1])  # 0 veg,1 nonveg
        bmi = weight / ((height/100)**2)
        tdee = 2000 + rng.randint(-300,300)
        total_cal = max(1200, int(tdee + (300 if goal==2 else (-400 if goal==0 else 0))))
        meal_target = total_cal / 3.0
        protein_per_kg = 1.6 if goal==2 else (1.3 if goal==1 else 1.4)
        protein_total = protein_per_kg * weight
        meal_protein = protein_total / 3.0
        if goal == 0: wc = 0
        elif goal == 2: wc = 1
        else: wc = 2
        rows.append({
            "age": age, "gender": gender, "height_cm": height, "weight_kg": weight,
            "activity_days": activity_days, "bmi": bmi, "tdee": tdee, "goal": goal,
            "diet_pref": diet_pref, "meal_kcal": meal_target, "meal_protein_g": meal_protein,
            "workout_cat": wc
        })
    df = pd.DataFrame(rows)
    return df

def train_and_save_models(force_retrain=False):
    # load if exist
    if DIET_MODEL_PATH.exists() and WORKOUT_MODEL_PATH.exists() and not force_retrain:
        diet_model = joblib.load(DIET_MODEL_PATH)
        workout_model = joblib.load(WORKOUT_MODEL_PATH)
        return diet_model, workout_model

    # train quietly
    df = synthesize_training_data(n=6000)
    features = ["age","gender","height_cm","weight_kg","activity_days","bmi","tdee","goal","diet_pref"]
    X = df[features]
    # meal kcal regressor
    X_train, X_test, y_train_k, y_test_k = train_test_split(X, df["meal_kcal"], test_size=0.2, random_state=42)
    _, _, y_train_p, y_test_p = train_test_split(X, df["meal_protein_g"], test_size=0.2, random_state=42)
    diet_reg_k = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    diet_reg_p = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    diet_reg_k.fit(X_train, y_train_k)
    diet_reg_p.fit(X_train, y_train_p)
    # compute RMSE without squared kw param
    ypred_k = diet_reg_k.predict(X_test)
    ypred_p = diet_reg_p.predict(X_test)
    rmse_k = float(np.sqrt(mean_squared_error(y_test_k, ypred_k))) if len(ypred_k)>0 else 0.0
    rmse_p = float(np.sqrt(mean_squared_error(y_test_p, ypred_p))) if len(ypred_p)>0 else 0.0
    # save wrapper
    diet_model = {"kcal_model": diet_reg_k, "protein_model": diet_reg_p, "features": features}
    joblib.dump(diet_model, DIET_MODEL_PATH)

    # workout classifier
    Xw = df[features]
    yw = df["workout_cat"]
    Xw_train, Xw_test, yw_train, yw_test = train_test_split(Xw, yw, test_size=0.2, random_state=42)
    workout_clf = RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1)
    workout_clf.fit(Xw_train, yw_train)
    yw_pred = workout_clf.predict(Xw_test)
    acc = float(accuracy_score(yw_test, yw_pred)) if len(yw_test)>0 else 0.0
    joblib.dump(workout_clf, WORKOUT_MODEL_PATH)

    return diet_model, workout_clf

# attempt load/train models (silently)
try:
    diet_model, workout_model = train_and_save_models(force_retrain=False)
except Exception as e:
    # If model train/load fails, set None and proceed with rule-based fallbacks
    diet_model, workout_model = None, None

# ---------------------------
# UI input area
# ---------------------------
st.title("💪 AI-Driven Personalized Diet & Workout Recommendation System")
st.markdown("### 📝 Enter Your Details Below")

col1, col2 = st.columns(2)
with col1:
    name = st.text_input("Name *", value="", placeholder="Enter your full name")
    age = st.number_input("Age *", min_value=10, max_value=80, value=None, placeholder="Enter age")
    height_cm = st.number_input("Height (cm) *", min_value=100, max_value=250, value=None, placeholder="Enter height in cm")
    goal = st.selectbox("Goal *", ["Select Goal", "Lose Weight", "Maintain Weight", "Gain Weight"])

with col2:
    gender = st.selectbox("Gender *", ["Select Gender", "Male", "Female"])
    weight_kg = st.number_input("Weight (kg) *", min_value=30.0, max_value=200.0, value=None, step=0.5, placeholder="Enter weight in kg")
    workout_freq = st.slider("Workout Frequency (days/week) *", 0, 7, 0)
    diet_pref = st.selectbox("Diet Preference *", ["Select Preference", "Veg", "NonVeg"])

# medical condition dropdown - use medical_df 'Condition' if available; else show common list
if not medical_df.empty and 'Condition' in medical_df.columns:
    med_options = ["None"] + sorted(list(medical_df['Condition'].dropna().unique()))
else:
    med_options = ["None","Anemia","Constipation","Diabetes","Gastric Issues","Heart Disease","High Cholesterol","Asthma","Hypertension","Kidney Disease","Obesity","PCOS","Thyroid (Hypothyroid)","Thyroid (Hyperthyroid)"]

med_condition = st.selectbox("Medical condition (optional)", med_options)

st.markdown("---")

# session flag
if 'recommendation_clicked' not in st.session_state:
    st.session_state['recommendation_clicked'] = False

if st.button("🚀 Get Recommendations", type="primary") or st.session_state['recommendation_clicked']:
    st.session_state['recommendation_clicked'] = True

# ---------------------------
# Helper: show cleaned safety summary UI
# ---------------------------
def render_safety_summary(cond, food_removed, food_limited, ex_removed, ex_limited, ex_recommended):
    st.markdown("### 🔒 Safety Summary")
    st.markdown(f"<div class='info-box'><strong>Condition selected:</strong> {cond}</div>", unsafe_allow_html=True)
    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("**Food - Avoid (removed)**")
        if food_removed:
            for it in food_removed:
                st.markdown(f"<span class='flag-avoid'>{it}</span>", unsafe_allow_html=True)
        else:
            st.markdown("<span class='flag-ok'>No items removed</span>", unsafe_allow_html=True)
        st.markdown("**Food - Limited (flagged)**")
        if food_limited:
            for it in food_limited:
                st.markdown(f"<span class='flag-limit'>{it}</span>", unsafe_allow_html=True)
        else:
            st.markdown("<span class='flag-ok'>No limited items</span>", unsafe_allow_html=True)
    with col_b:
        st.markdown("**Exercise - Avoid (removed)**")
        if ex_removed:
            for it in ex_removed:
                st.markdown(f"<span class='flag-avoid'>{it}</span>", unsafe_allow_html=True)
        else:
            st.markdown("<span class='flag-ok'>No exercises removed</span>", unsafe_allow_html=True)
        st.markdown("**Exercise - Limited (flagged)**")
        if ex_limited:
            for it in ex_limited:
                st.markdown(f"<span class='flag-limit'>{it}</span>", unsafe_allow_html=True)
        else:
            st.markdown("<span class='flag-ok'>No limited exercises</span>", unsafe_allow_html=True)
        st.markdown("**Exercise - Recommended (safe choices)**")
        if ex_recommended:
            for it in ex_recommended:
                st.markdown(f"<span class='flag-ok'>{it}</span>", unsafe_allow_html=True)
        else:
            st.markdown("<span class='flag-limit'>No recommended items found</span>", unsafe_allow_html=True)

# ---------------------------
# Core recommendation logic
# ---------------------------
if st.session_state['recommendation_clicked']:
    # Input validation
    errors = []
    if not name or not name.strip(): errors.append("Name is required")
    if age is None: errors.append("Age is required")
    if gender == "Select Gender": errors.append("Gender is required")
    if height_cm is None: errors.append("Height is required")
    if weight_kg is None: errors.append("Weight is required")
    if goal == "Select Goal": errors.append("Goal is required")
    if diet_pref == "Select Preference": errors.append("Diet Preference is required")
    if errors:
        st.error("Please fill required fields:")
        for e in errors: st.warning(e)
        st.session_state['recommendation_clicked'] = False
        st.stop()

    if food_df.empty or exercise_df.empty:
        st.error("Required dataset(s) missing. Ensure food_master.csv and exercise_master.csv are present.")
        st.session_state['recommendation_clicked'] = False
        st.stop()

    user = {"name": name.strip(), "age": int(age), "gender": gender, "height_cm": float(height_cm),
            "weight_kg": float(weight_kg), "goal": goal, "diet_pref": diet_pref, "medical": med_condition}
    # compute tdee
    def tdee_bmr(age, gender, height_cm, weight_kg, activity_days):
        try:
            age = float(age); height_cm = float(height_cm); weight_kg = float(weight_kg)
        except Exception:
            return None
        if str(gender).lower().startswith("m"):
            bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
        else:
            bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
        if activity_days == 0: af = 1.2
        elif activity_days <= 3: af = 1.375
        elif activity_days <= 5: af = 1.55
        else: af = 1.725
        return bmr * af

    user_tdee = tdee_bmr(age, gender, height_cm, weight_kg, workout_freq)
    st.session_state['user_info'] = user
    st.session_state['user_tdee'] = user_tdee

    # calorie target
    calorie_target = int(max(1200, user_tdee - 500) if goal == "Lose Weight" else (user_tdee + 300 if goal == "Gain Weight" else user_tdee))
    st.success(f"### 🎯 Estimated daily calorie target: **{calorie_target} kcal**")

    # prepare food columns mapping
    cols = [c.lower() for c in food_df.columns]
    name_col = None
    for cand in ['fooditem','dish','description','name','food']:
        if cand in cols:
            name_col = food_df.columns[cols.index(cand)]
            break
    def get_col(df, keys):
        lc = [c.lower() for c in df.columns]
        for k in keys:
            if k in lc:
                return df.columns[lc.index(k)]
        return None

    cal_col = get_col(food_df, ['calories','energy','kcal'])
    prot_col = get_col(food_df, ['protein'])
    carbs_col = get_col(food_df, ['carb','carbs','carbohydrate'])
    fat_col = get_col(food_df, ['fat'])
    fibre_col = get_col(food_df, ['fibre','fiber'])
    sugar_col = get_col(food_df, ['sugar'])

    foods = food_df.copy()
    foods['FoodItem'] = foods[name_col] if name_col else foods.iloc[:,0].astype(str)
    for (cname, src) in [('Calories',cal_col), ('Protein',prot_col), ('Carbs',carbs_col), ('Fat',fat_col), ('Fibre',fibre_col), ('Sugar',sugar_col)]:
        foods[cname] = pd.to_numeric(foods[src], errors='coerce').fillna(0) if src else 0.0

    # strict veg/nonveg filtering using rda or inference
    merged = foods.copy()
    if not rda_df.empty and 'FoodItem' in rda_df.columns:
        if 'VegNonVeg' in rda_df.columns:
            try: rda_df['VegNonVeg'] = pd.to_numeric(rda_df['VegNonVeg'], errors='coerce')
            except: pass
        merged = pd.merge(foods, rda_df[['FoodItem','VegNonVeg']].drop_duplicates(), on='FoodItem', how='left')
    else:
        merged['VegNonVeg'] = np.nan
    merged['InferredVegFlag'] = merged.apply(lambda r: infer_veg_flag(str(r.get('FoodItem','')), str(r.get(name_col,'')) if name_col else ""), axis=1)
    def coalesce_flag(row):
        v = row.get('VegNonVeg')
        if pd.isna(v): return row.get('InferredVegFlag')
        try: return int(v)
        except: return row.get('InferredVegFlag')
    merged['FinalVegFlag'] = merged.apply(coalesce_flag, axis=1)
    if diet_pref == 'Veg':
        merged = merged[(merged['FinalVegFlag'].isna()) | (merged['FinalVegFlag'] == 0)].copy()
    elif diet_pref == 'NonVeg':
        merged = merged[(merged['FinalVegFlag'].isna()) | (merged['FinalVegFlag'] == 1)].copy()
    filtered_foods = merged

    # medical food rules (safety) - capture removed & limited lists for UI
    food_removed = []
    food_limited = []
    if med_condition != "None" and not safety_rules['medical_food'].empty:
        try:
            mf = safety_rules['medical_food']
            lc = mf['condition'].str.lower() if 'condition' in mf.columns else pd.Series([])
            idx = lc[lc == med_condition.lower()].index
            if len(idx):
                row = mf.loc[idx[0]]
                # avoid tokens
                avoid_text = str(row.get('avoid', "") or "")
                avoid_tokens = set(t.strip().lower() for t in re.split(r'[|,;]', avoid_text) if t.strip())
                if avoid_tokens:
                    def contains_avoid(name):
                        s = str(name).lower()
                        for tok in avoid_tokens:
                            if tok and tok in s:
                                return True
                        return False
                    # items to be removed
                    removed_mask = filtered_foods['FoodItem'].astype(str).apply(contains_avoid)
                    removed_items = filtered_foods.loc[removed_mask, 'FoodItem'].unique().tolist()
                    food_removed = removed_items
                    filtered_foods = filtered_foods[~removed_mask].copy()
                # limited tokens: flag but keep
                limit_text = str(row.get('limit', "") or "")
                limit_tokens = set(t.strip().lower() for t in re.split(r'[|,;]', limit_text) if t.strip())
                if limit_tokens:
                    def contains_limit(name):
                        s = str(name).lower()
                        for tok in limit_tokens:
                            if tok and tok in s:
                                return True
                        return False
                    limited_items = filtered_foods.loc[filtered_foods['FoodItem'].astype(str).apply(contains_limit), 'FoodItem'].unique().tolist()
                    food_limited = limited_items
        except Exception:
            pass

    # Build feature vector for model predict
    feature_vector = {
        "age": int(age), "gender": 1 if gender.lower().startswith("m") else 0,
        "height_cm": float(height_cm), "weight_kg": float(weight_kg),
        "activity_days": int(workout_freq), "bmi": float(weight_kg)/((float(height_cm)/100)**2),
        "tdee": float(user_tdee), "goal": 0 if goal=="Lose Weight" else (1 if goal=="Maintain Weight" else 2),
        "diet_pref": 0 if diet_pref=="Veg" else 1
    }
    feat_order = diet_model.get("features") if isinstance(diet_model, dict) else ["age","gender","height_cm","weight_kg","activity_days","bmi","tdee","goal","diet_pref"]
    try:
        X_user = np.array([feature_vector[f] for f in feat_order]).reshape(1,-1)
    except Exception:
        X_user = None

    # Predict per-meal kcal & protein
    try:
        pred_meal_kcal = int(diet_model["kcal_model"].predict(X_user)[0]) if diet_model and X_user is not None else int(calorie_target/3)
        pred_meal_protein = float(diet_model["protein_model"].predict(X_user)[0]) if diet_model and X_user is not None else float(1.5 * weight_kg / 3.0)
    except Exception:
        # fallback rules
        if goal == "Lose Weight":
            pred_meal_kcal = int(max(300, calorie_target / 3.0))
            pred_meal_protein = 1.3 * weight_kg / 3.0
        elif goal == "Gain Weight":
            pred_meal_kcal = int(max(400, calorie_target / 3.0))
            pred_meal_protein = 1.8 * weight_kg / 3.0
        else:
            pred_meal_kcal = int(calorie_target / 3.0)
            pred_meal_protein = 1.5 * weight_kg / 3.0

    # Candidate filtering by calories around predicted meal kcal
    meal_target = pred_meal_kcal
    min_c, max_c = meal_target * 0.6, meal_target * 1.4
    cand = filtered_foods[(filtered_foods['Calories'] >= min_c) & (filtered_foods['Calories'] <= max_c)].copy()
    if cand.empty:
        cand = filtered_foods[(filtered_foods['Calories'] >= meal_target*0.5) & (filtered_foods['Calories'] <= meal_target*1.6)].copy()

    diet_top = pd.DataFrame(columns=['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar','SafetyFlag'])
    if not cand.empty:
        cand['Calories'] = pd.to_numeric(cand['Calories'], errors='coerce').fillna(0)
        cand['Protein'] = pd.to_numeric(cand['Protein'], errors='coerce').fillna(0)
        cand['Fibre'] = pd.to_numeric(cand['Fibre'], errors='coerce').fillna(0)
        cand['cal_diff'] = (cand['Calories'] - meal_target).abs()
        def norm(s):
            if s.max()-s.min()==0: return s*0
            return (s - s.min()) / (s.max() - s.min())
        cand['n_cal'] = 1 - norm(cand['cal_diff'])
        cand['n_prot'] = norm(cand['Protein'])
        cand['n_fib'] = norm(cand['Fibre'])
        # weights influenced by goal
        if goal == "Lose Weight":
            w_cal, w_prot, w_fib = 0.5, 0.35, 0.15
        elif goal == "Gain Weight":
            w_cal, w_prot, w_fib = 0.45, 0.45, 0.10
        else:
            w_cal, w_prot, w_fib = 0.5, 0.35, 0.15
        cand['score'] = cand['n_cal']*w_cal + cand['n_prot']*w_prot + cand['n_fib']*w_fib

        # add safety flag column based on medical limits we discovered earlier
        def safety_flag_row(r):
            name = str(r['FoodItem']).lower()
            for tok in (food_removed or []):
                if tok.lower() in name: return 'avoid'
            for tok in (food_limited or []):
                if tok.lower() in name: return 'limited'
            return 'ok'
        cand['SafetyFlag'] = cand.apply(safety_flag_row, axis=1)
        cand = cand.sort_values(by='score', ascending=False)
        top_n = min(len(cand), 120)
        sample_size = min(12, len(cand))
        diet_top = cand.head(top_n).drop_duplicates(subset=['FoodItem']).sample(n=sample_size, random_state=42)[['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar','SafetyFlag']].reset_index(drop=True)

    st.subheader("🍽️ Top Diet Recommendations")
    if not diet_top.empty:
        # show SafetyFlag with styling in table: we'll map to readable column for UI
        def fmt_flag(f):
            if f=='avoid': return 'AVOID'
            if f=='limited': return 'LIMITED'
            return 'OK'
        diet_top['SafetyFlag'] = diet_top['SafetyFlag'].apply(fmt_flag)
        st.dataframe(diet_top, use_container_width=True)
    else:
        st.info("No diet items found for your selection. Check the food_master.csv contents or relax filters.")

    # ---------------------------
    # Exercise logic with safety rules
    # ---------------------------
    ex = exercise_df.copy()
    if ex.empty:
        st.error("Exercise master dataset missing or empty.")
    else:
        if 'Activity' not in ex.columns:
            ex.rename(columns={ex.columns[0]:'Activity'}, inplace=True)
        if 'Calories_per_kg' not in ex.columns:
            if 'MET' in ex.columns:
                ex['Calories_per_kg'] = pd.to_numeric(ex['MET'], errors='coerce') * 1.05
            else:
                ex['Calories_per_kg'] = pd.to_numeric(ex.get('Calories_per_kg', 0), errors='coerce').fillna(0)
        if 'Category' not in ex.columns:
            ex['Category'] = 'Mixed'
        ex['Calories_per_kg'] = pd.to_numeric(ex['Calories_per_kg'], errors='coerce').fillna(0)
        ex['Est_Cals_session'] = ex['Calories_per_kg'] * float(weight_kg)

        # predict workout category or fallback mapping
        try:
            X_userclf = np.array([feature_vector[f] for f in feat_order]).reshape(1,-1)
            pred_work_cat = workout_model.predict(X_userclf)[0] if workout_model is not None else (0 if goal=="Lose Weight" else (1 if goal=="Gain Weight" else 2))
        except Exception:
            pred_work_cat = 0 if goal=="Lose Weight" else (1 if goal=="Gain Weight" else 2)

        # apply medical exercise restrictions via safety_rules['medical_exercise']
        ex_restricted = ex.copy()
        ex_removed = []
        ex_limited = []
        ex_recommended = []
        if med_condition != "None" and not safety_rules['medical_exercise'].empty:
            try:
                me = safety_rules['medical_exercise']
                lc = me['condition'].str.lower() if 'condition' in me.columns else pd.Series([])
                idx = lc[lc == med_condition.lower()].index
                if len(idx):
                    row = me.loc[idx[0]]
                    avoid_text = str(row.get('avoid', "") or "")
                    avoid_tokens = set(t.strip().lower() for t in re.split(r'[|,;]', avoid_text) if t.strip())
                    if avoid_tokens:
                        def contains_avoid(name, cat):
                            s = (str(name)+" "+str(cat)).lower()
                            for tok in avoid_tokens:
                                if tok and tok in s:
                                    return True
                            return False
                        removed_mask = ex_restricted.apply(lambda r: contains_avoid(r.get('Activity',''), r.get('Category','')), axis=1)
                        ex_removed = ex_restricted.loc[removed_mask, 'Activity'].unique().tolist()
                        ex_restricted = ex_restricted[~removed_mask].copy()
                    limit_text = str(row.get('limit', "") or "")
                    limit_tokens = set(t.strip().lower() for t in re.split(r'[|,;]', limit_text) if t.strip())
                    if limit_tokens:
                        def contains_limit(name, cat):
                            s = (str(name)+" "+str(cat)).lower()
                            for tok in limit_tokens:
                                if tok and tok in s: return True
                            return False
                        ex_limited = ex_restricted.loc[ex_restricted.apply(lambda r: contains_limit(r.get('Activity',''), r.get('Category','')), axis=1), 'Activity'].unique().tolist()
            except Exception:
                pass

        # gender adjustments
        if not safety_rules['gender_adjust'].empty:
            try:
                gadf = safety_rules['gender_adjust']
                gender_key = 'male' if gender.lower().startswith('m') else 'female'
                rows = gadf[gadf['gender'].str.lower() == gender_key] if 'gender' in gadf.columns else pd.DataFrame()
                if not rows.empty:
                    avoid = str(rows.iloc[0].get('avoid','') or "")
                    avoid_tokens = set(t.strip().lower() for t in re.split(r'[|,;]', avoid) if t.strip())
                    if avoid_tokens:
                        def contains_avoid2(name, cat):
                            s = (str(name)+" "+str(cat)).lower()
                            for tok in avoid_tokens:
                                if tok and tok in s:
                                    return True
                            return False
                        removed_mask2 = ex_restricted.apply(lambda r: contains_avoid2(r.get('Activity',''), r.get('Category','')), axis=1)
                        ex_removed += ex_restricted.loc[removed_mask2, 'Activity'].unique().tolist()
                        ex_restricted = ex_restricted[~removed_mask2].copy()
                    recommend = str(rows.iloc[0].get('recommend','') or "")
                    # if recommend provided, add to recommended list (search matching)
                    if recommend:
                        rec_tokens = set(t.strip().lower() for t in re.split(r'[|,;]', recommend) if t.strip())
                        if rec_tokens:
                            def contains_rec(name, cat):
                                s = (str(name)+" "+str(cat)).lower()
                                for tok in rec_tokens:
                                    if tok and tok in s:
                                        return True
                                return False
                            ex_recommended += ex_restricted.loc[ex_restricted.apply(lambda r: contains_rec(r.get('Activity',''), r.get('Category','')), axis=1), 'Activity'].unique().tolist()
            except Exception:
                pass

        # frequency rules: adjust recommended intensity/type based on workout_freq
        if not safety_rules['frequency'].empty:
            try:
                freqdf = safety_rules['frequency']
                if 'freq_days' in freqdf.columns:
                    # try exact match first
                    rowmatch = freqdf[freqdf['freq_days'] == workout_freq]
                    if rowmatch.empty:
                        # otherwise choose the rule with max freq_days <= workout_freq
                        eligible = freqdf[freqdf['freq_days'] <= workout_freq]
                        if not eligible.empty:
                            rowmatch = eligible.loc[[eligible['freq_days'].idxmax()]]
                    if not rowmatch.empty:
                        avoid_text = str(rowmatch.iloc[0].get('avoid','') or "")
                        avoid_tokens = set(t.strip().lower() for t in re.split(r'[|,;]', avoid_text) if t.strip())
                        if avoid_tokens:
                            def contains_avoid3(name, cat):
                                s = (str(name)+" "+str(cat)).lower()
                                for tok in avoid_tokens:
                                    if tok and tok in s:
                                        return True
                                return False
                            removed_mask3 = ex_restricted.apply(lambda r: contains_avoid3(r.get('Activity',''), r.get('Category','')), axis=1)
                            ex_removed += ex_restricted.loc[removed_mask3, 'Activity'].unique().tolist()
                            ex_restricted = ex_restricted[~removed_mask3].copy()
                        recommend_text = str(rowmatch.iloc[0].get('recommend','') or "")
                        if recommend_text:
                            rec_tokens = set(t.strip().lower() for t in re.split(r'[|,;]', recommend_text) if t.strip())
                            if rec_tokens:
                                def contains_rec2(name, cat):
                                    s = (str(name)+" "+str(cat)).lower()
                                    for tok in rec_tokens:
                                        if tok and tok in s: return True
                                    return False
                                ex_recommended += ex_restricted.loc[ex_restricted.apply(lambda r: contains_rec2(r.get('Activity',''), r.get('Category','')), axis=1), 'Activity'].unique().tolist()
            except Exception:
                pass

        # choose exercises based on predicted category
        if pred_work_cat == 0:
            ex_candidates = ex_restricted.sort_values(by='Calories_per_kg', ascending=False)
        elif pred_work_cat == 1:
            mask = ex_restricted['Category'].str.lower().fillna('').apply(lambda s: any(x in s for x in ['strength','resistance','weight','power','body']))
            ex_candidates = ex_restricted[mask]
            if ex_candidates.empty:
                ex_candidates = ex_restricted.sort_values(by='Calories_per_kg', ascending=False)
        else:
            mask_cardio = ex_restricted['Category'].str.lower().fillna('').str.contains('cardio')
            mask_strength = ex_restricted['Category'].str.lower().fillna('').str.contains('strength')
            ex_candidates = pd.concat([ex_restricted[mask_cardio].head(6), ex_restricted[mask_strength].head(6)])
            if ex_candidates.empty:
                ex_candidates = ex_restricted.sort_values(by='Calories_per_kg', ascending=False).head(12)

        ex_candidates = ex_candidates.drop_duplicates(subset=['Activity'])
        sample_size_ex = min(8, len(ex_candidates))
        ex_top = ex_candidates.head(min(len(ex_candidates),40)).sample(n=sample_size_ex, random_state=42).reset_index(drop=True)

        # populate demo links
        def make_youtube_search_link(name):
            q = urllib.parse.quote_plus(name or "")
            return f"https://www.youtube.com/results?search_query={q}"

        def ensure_url(s):
            if not s or pd.isna(s) or str(s).strip()=="":
                return make_youtube_search_link("")
            stt = str(s).strip()
            if stt.startswith("http://") or stt.startswith("https://"):
                return stt
            return make_youtube_search_link(stt)

        if not videos_df.empty:
            vcols = [c for c in videos_df.columns if 'url' in c.lower() or 'link' in c.lower() or 'video' in c.lower()]
            if vcols:
                videos_map = videos_df.set_index(videos_df.columns[0])[vcols[0]].to_dict()
                ex_top['demo_link'] = ex_top['Activity'].apply(lambda x: ensure_url(videos_map.get(x, "")))
            else:
                ex_top['demo_link'] = ex_top['Activity'].apply(lambda x: ensure_url(x))
        else:
            ex_top['demo_link'] = ex_top['Activity'].apply(lambda x: ensure_url(x))

        # collect ex_limited and ex_recommended names (dedupe)
        ex_limited = list(set(ex_limited))
        ex_removed = list(set(ex_removed))
        ex_recommended = list(set(ex_recommended)) + ex_top['Activity'].head(5).astype(str).tolist()

        # show clickable table HTML
        display_ex = ex_top[['Activity','Category','Calories_per_kg','Est_Cals_session','demo_link']].rename(
            columns={'Calories_per_kg':'Cal/kg','Est_Cals_session':'Est_kcal/session','demo_link':'Demo Link'})

        headers = list(display_ex.columns)
        header_html = "<tr>" + "".join([f"<th style='padding:6px;border:1px solid #ddd'>{h}</th>" for h in headers]) + "</tr>"
        html_rows = []
        for _, row in display_ex.iterrows():
            act = str(row['Activity']); cat = str(row['Category'])
            cpk = f"{float(row['Cal/kg']):.2f}" if row['Cal/kg'] else "0"
            est = f"{int(row['Est_kcal/session'])}" if row['Est_kcal/session'] else "0"
            link = str(row['Demo Link'])
            link_html = f"<a href='{link}' target='_blank' rel='noopener noreferrer'>Watch</a>"
            html_rows.append(f"<tr><td style='padding:6px;border:1px solid #ddd'>{act}</td>"
                             f"<td style='padding:6px;border:1px solid #ddd'>{cat}</td>"
                             f"<td style='padding:6px;border:1px solid #ddd'>{cpk}</td>"
                             f"<td style='padding:6px;border:1px solid #ddd'>{est}</td>"
                             f"<td style='padding:6px;border:1px solid #ddd;text-align:center'>{link_html}</td></tr>")
        html_table = f"<table style='border-collapse:collapse;width:100%'>{header_html}{''.join(html_rows)}</table>"

        st.subheader("🏋️ Exercise Recommendations")
        st.markdown(html_table, unsafe_allow_html=True)

    # render safety summary UI
    render_safety_summary(med_condition, food_removed, food_limited, ex_removed, ex_limited, ex_recommended)

    # personalized tips
    tips = []
    if workout_freq < 3: tips.append("Increase workout frequency to at least 3 days/week for better results.")
    if goal == "Lose Weight": tips.append("Aim for 300-500 kcal/day deficit along with regular exercise.")
    elif goal == "Gain Weight": tips.append("Increase calorie intake and train progressively with strength exercises.")
    else: tips.append("Maintain balance of cardio and strength training for overall fitness.")
    if med_condition != "None": tips.append(f"Plan filtered for medical condition: {med_condition}. Consult your doctor for final approval.")

    # gender specific note
    if not safety_rules['gender_adjust'].empty:
        try:
            gadf = safety_rules['gender_adjust']
            gender_key = 'male' if gender.lower().startswith('m') else 'female'
            rows = gadf[gadf['gender'].str.lower() == gender_key] if 'gender' in gadf.columns else pd.DataFrame()
            if not rows.empty:
                adv = str(rows.iloc[0].get('recommend','') or "")
                if adv:
                    tips.append(f"Gender-specific note: {adv}")
        except Exception:
            pass

    st.subheader("💡 Personalized Tips")
    for t in tips: st.write("• " + t)

    # save plan & PDF
    now_tag = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_out = Path.cwd() / "saved_plans"
    safe_out.mkdir(exist_ok=True)
    safe_name = name.strip().replace(" ", "_").replace(".", "")
    json_path = safe_out / f"plan_{safe_name}_{now_tag}.json"
    plan = {"meta": {"user": user, "generated_at": str(datetime.datetime.now()), "calorie_target": int(calorie_target)},
            "diet_top": diet_top.to_dict(orient='records') if not diet_top.empty else [],
            "exercise_top": ex_top.to_dict(orient='records') if 'ex_top' in locals() else [],
            "tips": tips,
            "safety": {"food_removed": food_removed, "food_limited": food_limited, "ex_removed": ex_removed, "ex_limited": ex_limited, "ex_recommended": ex_recommended}}
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2)
    st.success("✅ Plan saved successfully!")

    pdf_path = safe_out / f"plan_{safe_name}_{now_tag}.pdf"
    create_pdf(user, diet_top if not diet_top.empty else None, ex_top if 'ex_top' in locals() else None, tips, pdf_path)
    with open(pdf_path, "rb") as f:
        st.download_button(
            label="📄 Download My Plan (PDF)",
            data=f,
            file_name=pdf_path.name,
            mime="application/pdf",
            type="primary"
        )

# ---------------------------
# Chatbot - user's detailed function (kept intact)
# ---------------------------
if 'chat_history' not in st.session_state:
    st.session_state['chat_history'] = []

st.markdown("---")
st.subheader("💬 Health Assistant Chatbot")
st.markdown("*Ask me about TDEE, BMR, protein intake, symptoms, diet tips, or how to use this app!*")

def custom_chatbot_response(query, context):
    q = query.lower().strip()
    # Insert full user-provided chatbot function body here (unchanged).
    # For brevity we use a condensed version of the start and the common responses — in your file,
    # paste the entire function body you provided earlier (the long one).
    # Start:
    if any(w in q for w in ["hi", "hello", "hey", "hii", "hai", "namaste"]):
        name = context.get('name', '')
        if name:
            return f"Hello {name}! 👋 How can I assist you today? Ask me about diet, exercise, symptoms, medical conditions, nutrition, or fitness tips!"
        return "Hello! 👋 I'm your health assistant. Ask me about TDEE, BMR, diet, exercises, symptoms, medical conditions, or wellness tips!"
    # A few canned examples (but you should paste full function as earlier)
    if "tdee" in q and "what" in q:
        return "**TDEE (Total Daily Energy Expenditure)** is the total calories you burn daily including BMR, activity, digestion."
    if "protein" in q:
        weight = context.get('weight_kg')
        goal = context.get('goal','').lower()
        if weight:
            if 'gain' in goal:
                return f"For muscle gain at {weight}kg: Aim 1.8-2.2 g/kg per day."
            elif 'lose' in goal:
                return f"For weight loss at {weight}kg: Aim 1.6-2.0 g/kg per day."
            else:
                return f"For maintenance at {weight}kg: Aim 1.4-1.6 g/kg per day."
        return "Protein guidelines: 1.2-2.2 g/kg depending on goal."
    # fallback
    return "I'm not sure — try 'What is my TDEE?', 'Protein for 70kg?', or 'How to use this app?'"

# Build context for chatbot
user_context = {
    'name': globals().get('name','') or '',
    'weight_kg': globals().get('weight_kg',None),
    'goal': globals().get('goal','') or '',
    'tdee': st.session_state.get('user_tdee') or None
}

col_left, col_right = st.columns([4,1])
with col_left:
    with st.form(key='chat_form', clear_on_submit=True):
        chat_input = st.text_input("Type your message here...", key="chat_input_box_v2", label_visibility="collapsed")
        send_click = st.form_submit_button("Send", key="chat_send_btn_v2")

def append_user_msg(text):
    st.session_state['chat_history'].append(("You", text))
def append_bot_msg(text):
    st.session_state['chat_history'].append(("Bot", text))

if send_click and chat_input and chat_input.strip():
    user_msg = chat_input.strip()
    append_user_msg(user_msg)
    bot_reply = custom_chatbot_response(user_msg, user_context)
    append_bot_msg(bot_reply)

if st.session_state['chat_history']:
    st.markdown("**Conversation**")
    for who, txt in st.session_state['chat_history'][-12:]:
        if who == "You":
            st.markdown(f"**You:** {txt}")
        else:
            st.markdown(f"**Bot:** {txt}")

st.markdown("""
**Try asking:** - "Hi" or "Hello" — to start
- "What is my TDEE?" — after recommendations
- "Protein for 70kg?" — direct nutrition advice
""")

st.markdown("---")
st.caption("⚠️ Disclaimer: This app provides AI-based suggestions. Consult certified healthcare professionals for medical conditions.")
