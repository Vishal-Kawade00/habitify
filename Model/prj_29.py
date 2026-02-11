# app_streamlit_final.py
import streamlit as st
import pandas as pd
import numpy as np
from pathlib import Path
import json
import datetime
from fpdf import FPDF  # pip install fpdf
import urllib.parse

# Optional OpenAI usage; import on-demand
try:
    import openai
    HAS_OPENAI = True
except Exception:
    HAS_OPENAI = False

st.set_page_config(page_title="AI Diet & Workout Recommender", layout="wide")

# ---------------------------
# CONFIG - change this path if needed
# ---------------------------
DATA_DIR = Path(r"F:/Prj/DS/New folder/updtaed_new")
FOOD_MASTER_FILE = DATA_DIR / "food_master.csv"
EXERCISE_MASTER_FILE = DATA_DIR / "exercise_master.csv"
MEDICAL_FILE = DATA_DIR / "medical_guidelines_processed.csv"
WHO_RDA_FILE = DATA_DIR / "who_rda_processed.csv"
EXERCISE_VIDEOS_FILE = DATA_DIR / "exercise_videos.csv"  # optional

# ---------------------------
# Helper Functions
# ---------------------------
def safe_read_csv(p: Path):
    if p.exists():
        try:
            return pd.read_csv(p)
        except Exception as e:
            st.error(f"Error reading {p.name}: {e}")
            return pd.DataFrame()
    else:
        return pd.DataFrame()

def tdee_bmr(age, gender, height_cm, weight_kg, activity_days):
    if gender.lower().startswith("m"):
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    if activity_days == 0:
        af = 1.2
    elif activity_days <= 3:
        af = 1.375
    elif activity_days <= 5:
        af = 1.55
    else:
        af = 1.725
    return bmr * af

def make_youtube_search_link(name):
    q = urllib.parse.quote_plus(name)
    return f"https://www.youtube.com/results?search_query={q}"

def create_pdf(user_info, diet_table, exercise_table, tips, out_path):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 8, "AI-Driven Personalized Diet and Workout Recommendation", ln=True, align="C")
    pdf.ln(4)
    pdf.set_font("Arial", size=10)
    pdf.multi_cell(0, 6, f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    pdf.multi_cell(0, 6, f"User: {user_info.get('name','-')}  | Age: {user_info['age']} | Gender: {user_info['gender']} | Goal: {user_info['goal']}")
    pdf.ln(6)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 6, "Diet Recommendations (per meal approx.)", ln=True)
    pdf.set_font("Arial", size=9)
    if not diet_table.empty:
        colw = [60, 22, 22, 22, 22, 22]
        headers = list(diet_table.columns[:6])
        for i, h in enumerate(headers):
            pdf.cell(colw[i], 6, str(h), border=1)
        pdf.ln()
        for _, r in diet_table.head(20).iterrows():
            vals = [str(r.get(c,"")) for c in headers]
            for i,v in enumerate(vals):
                pdf.cell(colw[i], 6, v[:25], border=1)
            pdf.ln()
    else:
        pdf.cell(0, 6, "No diet recommendations found.", ln=True)
    pdf.ln(6)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 6, "Exercise Recommendations (Top)", ln=True)
    pdf.set_font("Arial", size=9)
    if not exercise_table.empty:
        headers = list(exercise_table[['Activity','Category','Calories_per_kg','Est_Cals_session']].columns)
        for h in headers:
            pdf.cell(45, 6, str(h), border=1)
        pdf.ln()
        for _, r in exercise_table.head(20).iterrows():
            pdf.cell(45, 6, str(r['Activity'])[:30], border=1)
            pdf.cell(45, 6, str(r['Category']), border=1)
            pdf.cell(45, 6, f"{r['Calories_per_kg']:.2f}", border=1)
            pdf.cell(45, 6, f"{int(r['Est_Cals_session'])}", border=1)
            pdf.ln()
    else:
        pdf.cell(0, 6, "No exercise recommendations found.", ln=True)
    pdf.ln(6)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 6, "Personalized Tips", ln=True)
    pdf.set_font("Arial", size=10)
    for t in tips:
        pdf.multi_cell(0, 6, "- " + t)
    pdf.ln(6)
    pdf.set_font("Arial", size=7)
    pdf.multi_cell(0, 5, "Disclaimer: This is an AI-based suggestion intended for general purpose only. For medical conditions, consult a certified health professional.")
    pdf.output(str(out_path))
    return out_path

# ---------------------------
# Load datasets
# ---------------------------
food_df = safe_read_csv(FOOD_MASTER_FILE)
exercise_df = safe_read_csv(EXERCISE_MASTER_FILE)
medical_df = safe_read_csv(MEDICAL_FILE)
who_rda_df = safe_read_csv(WHO_RDA_FILE)
videos_df = safe_read_csv(EXERCISE_VIDEOS_FILE)

# ---------------------------
# UI
# ---------------------------
st.title("💪 AI-Driven Personalized Diet & Workout Recommendation System")

st.header("Enter Your Details")
name = st.text_input("Name", value="")
age = st.number_input("Age", min_value=10, max_value=80, value=25)
gender = st.selectbox("Gender", ["Male", "Female"])
height_cm = st.number_input("Height (cm)", min_value=100, max_value=250, value=170)
weight_kg = st.number_input("Weight (kg)", min_value=30.0, max_value=200.0, value=70.0, step=0.5)
goal = st.selectbox("Goal", ["Lose Weight", "Maintain Weight", "Gain Weight"])
workout_freq = st.slider("Workout Frequency (days/week)", 0, 7, 3)
diet_pref = st.selectbox("Diet Preference", ["Veg", "NonVeg"])
med_condition = st.selectbox("Medical condition (optional)", ["None"] + list(medical_df['Condition'].unique()) if not medical_df.empty else ["None"])
openai_key = st.text_input("🔑 Paste OpenAI API Key here (optional for chatbot)", type="password")

st.markdown("---")

# ---------------------------
# Recommendation Logic
# ---------------------------
if st.button("Get Recommendations"):
    if food_df.empty or exercise_df.empty:
        st.error("Required dataset(s) missing.")
        st.stop()

    user = {"name": name, "age": int(age), "gender": gender, "height_cm": float(height_cm), "weight_kg": float(weight_kg), "goal": goal, "diet_pref": diet_pref, "medical": med_condition}
    user_tdee = tdee_bmr(age, gender, height_cm, weight_kg, workout_freq)
    calorie_target = max(1200, user_tdee - 500) if goal == "Lose Weight" else (user_tdee + 300 if goal == "Gain Weight" else user_tdee)
    st.subheader(f"Estimated daily calorie target: {int(calorie_target)} kcal")

    # Diet processing
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
    carbs_col = get_col(food_df, ['carb'])
    fat_col = get_col(food_df, ['fat'])
    fibre_col = get_col(food_df, ['fibre','fiber'])
    sugar_col = get_col(food_df, ['sugar'])

    foods = food_df.copy()
    foods['FoodItem'] = foods[name_col] if name_col else foods.iloc[:,0]
    for (cname, src) in [('Calories',cal_col), ('Protein',prot_col), ('Carbs',carbs_col), ('Fat',fat_col), ('Fibre',fibre_col), ('Sugar',sugar_col)]:
        foods[cname] = pd.to_numeric(foods[src], errors='coerce').fillna(0) if src else 0.0

    # ✅ Correct Veg/NonVeg filtering
    filtered_foods = foods.copy()
    rda_path = DATA_DIR / "rda_cleaned.csv"
    if rda_path.exists():
        rda_df = safe_read_csv(rda_path)
        if {'FoodItem','VegNonVeg'}.issubset(rda_df.columns):
            merged = pd.merge(filtered_foods, rda_df[['FoodItem','VegNonVeg']].drop_duplicates(), on='FoodItem', how='left')
            if diet_pref == 'Veg':
                merged = merged[(merged['VegNonVeg'].isna()) | (merged['VegNonVeg'] == 0)]
            else:
                merged = merged[(merged['VegNonVeg'].isna()) | (merged['VegNonVeg'] == 1)]
            filtered_foods = merged

    if med_condition != "None" and not medical_df.empty:
        row = medical_df[medical_df['Condition'].str.lower() == med_condition.lower()]
        if not row.empty:
            avoid_text = str(row.iloc[0].get('Avoid',''))
            avoid_tokens = [t.strip().lower() for t in avoid_text.split(',') if t.strip()]
            filtered_foods = filtered_foods[~filtered_foods['FoodItem'].astype(str).str.lower().apply(lambda x: any(tok in x for tok in avoid_tokens))]

    meal_target = calorie_target / 3
    min_c, max_c = meal_target*0.75, meal_target*1.25
    cand = filtered_foods[(filtered_foods['Calories'] >= min_c) & (filtered_foods['Calories'] <= max_c)]
    if cand.empty:
        cand = filtered_foods[(filtered_foods['Calories'] >= meal_target*0.6) & (filtered_foods['Calories'] <= meal_target*1.4)]

    if not cand.empty:
        cand['cal_diff'] = (cand['Calories'] - meal_target).abs()
        cand['score'] = (-cand['cal_diff']/(cand['cal_diff'].max()+1e-6)) + (cand['Protein']/(cand['Protein'].max()+1e-6))*0.6 + (cand['Fibre']/(cand['Fibre'].max()+1e-6))*0.3
        cand = cand.sort_values(by='score', ascending=False)
        diet_top = cand[['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar']].drop_duplicates().head(10)
    else:
        diet_top = pd.DataFrame(columns=['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar'])

    st.subheader("🍽️ Top Diet Recommendations")
    st.table(diet_top)

    # Exercise recommendation
    ex = exercise_df.copy()
    if 'Activity' not in ex.columns:
        ex.rename(columns={ex.columns[0]:'Activity'}, inplace=True)
    if 'Calories_per_kg' not in ex.columns:
        ex['Calories_per_kg'] = pd.to_numeric(ex['MET'], errors='coerce')*1.05 if 'MET' in ex.columns else 0.0
    if 'Category' not in ex.columns:
        ex['Category'] = 'Mixed'
    ex['Calories_per_kg'] = pd.to_numeric(ex['Calories_per_kg'], errors='coerce').fillna(0)
    ex['Est_Cals_session'] = ex['Calories_per_kg'] * weight_kg

    if goal == "Lose Weight":
        ex_candidates = ex.sort_values(by='Calories_per_kg', ascending=False)
    elif goal == "Gain Weight":
        ex_candidates = ex[ex['Category'].str.lower().str.contains('strength')]
        if ex_candidates.empty:
            ex_candidates = ex.sort_values(by='Calories_per_kg', ascending=False)
    else:
        cardio = ex[ex['Category'].str.lower().str.contains('cardio')].head(3)
        strength = ex[ex['Category'].str.lower().str.contains('strength')].head(2)
        ex_candidates = pd.concat([cardio, strength])
    if ex_candidates.empty:
        ex_candidates = ex.sort_values(by='Calories_per_kg', ascending=False).head(5)

    ex_top = ex_candidates.head(10).reset_index(drop=True)
    ex_top['demo_link'] = ex_top['Activity'].apply(lambda x: make_youtube_search_link(x))

    st.subheader("🏋️ Exercise Recommendations")
    display_ex = ex_top[['Activity','Category','Calories_per_kg','Est_Cals_session','demo_link']].rename(columns={'Calories_per_kg':'Cal/kg','Est_Cals_session':'Est_kcal/session','demo_link':'Demo Link'})
    st.table(display_ex.head(10))

    # Personalized tips
    tips = []
    if workout_freq < 3:
        tips.append("Increase workout frequency to at least 3 days/week.")
    if goal == "Lose Weight":
        tips.append("Aim for 300-500 kcal/day deficit.")
    elif goal == "Gain Weight":
        tips.append("Increase calorie intake and train progressively.")
    else:
        tips.append("Maintain balance of cardio and strength training.")
    if med_condition != "None":
        tips.append(f"Filtered for medical condition: {med_condition}.")

    st.subheader("💡 Personalized Tips")
    for t in tips:
        st.write("• " + t)

    # ✅ Safety fallback
    if 'diet_top' not in locals() or diet_top is None:
        diet_top = pd.DataFrame(columns=['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar'])
    if 'display_ex' not in locals() or display_ex is None:
        display_ex = pd.DataFrame(columns=['Activity','Category','Calories_per_kg','Est_Cals_session','Demo Link'])

    # Save plan
    now_tag = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_out = Path.cwd() / "saved_plans"
    safe_out.mkdir(exist_ok=True)
    json_path = safe_out / f"plan_{(name or 'user')}_{now_tag}.json"
    plan = {"meta": {"user": user, "generated_at": str(datetime.datetime.now()), "calorie_target": int(calorie_target)}, "diet_top": diet_top.to_dict(orient='records'), "exercise_top": display_ex.to_dict(orient='records'), "tips": tips}
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2)
    st.success(f"Plan saved at {json_path}")

    pdf_path = safe_out / f"plan_{(name or 'user')}_{now_tag}.pdf"
    create_pdf(user, diet_top, ex_top, tips, pdf_path)
    with open(pdf_path, "rb") as f:
        st.download_button("📄 Download My Plan (PDF)", data=f, file_name=pdf_path.name)

    # Chatbot section
    st.markdown("---")
    st.subheader("Chatbot (Ask about app, TDEE, or diet tips)")
    use_openai = bool(openai_key and HAS_OPENAI)
    if use_openai:
        openai.api_key = openai_key

    q = st.text_input("Ask something", "")
    if st.button("Send"):
        if use_openai:
            try:
                resp = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role":"system","content":"You are a health assistant."},{"role":"user","content":q}],
                    max_tokens=250
                )
                st.success(resp.choices[0].message.content.strip())
            except Exception as e:
                st.error(f"API Error: {e}")
        else:
            if "tdee" in q.lower():
                st.success(f"Your TDEE ≈ {int(user_tdee)} kcal/day.")
            elif "protein" in q.lower():
                st.success("Aim 1.2–2.0g protein per kg body weight daily.")
            elif "calorie" in q.lower():
                st.success("Maintain 300–500 kcal/day deficit for healthy fat loss.")
            else:
                st.success("Try asking: 'What is TDEE?' or 'How to gain muscle safely?'")
