import streamlit as st
import pandas as pd
import numpy as np
from pathlib import Path
import json
import datetime
from fpdf import FPDF # pip install fpdf
import urllib.parse

# Optional OpenAI usage flag (safe import)
try:
    import openai
    HAS_OPENAI = True
except Exception:
    HAS_OPENAI = False

# --- Start: UI/Style Helper Function (Kept as per user request) ---
def add_bg_and_style():
    st.markdown("""
    <style>
    /* Gradient background */
    .stApp {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        background-attachment: fixed;
    }
    
    /* Content container with glass effect */
    .block-container {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 2rem;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    }
    
    /* Headers */
    h1 {
        color: #764ba2 !important;
        text-align: center;
        font-weight: 800 !important;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    
    h2, h3 {
        color: #667eea !important;
        font-weight: 700 !important;
    }
    
    /* Input fields */
    .stTextInput > div > div > input,
    .stNumberInput > div > div > input,
    .stSelectbox > div > div > select {
        background-color: rgba(255, 255, 255, 0.9);
        border: 2px solid #667eea;
        border-radius: 10px;
    }
    
    /* Buttons */
    .stButton > button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 25px;
        padding: 0.75rem 2rem;
        font-weight: 600;
        box-shadow: 0 4px 15px 0 rgba(118, 75, 162, 0.4);
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px 0 rgba(118, 75, 162, 0.6);
    }
    
    /* DataFrames */
    .stDataFrame {
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    /* Chat messages */
    .chat-message {
        padding: 1rem;
        border-radius: 15px;
        margin: 0.5rem 0;
        background: rgba(102, 126, 234, 0.1);
    }
    </style>
    """, unsafe_allow_html=True)
# --- End: UI/Style Helper Function ---

st.set_page_config(page_title="AI Diet & Workout Recommender", layout="wide")
# Call this function after set_page_config
add_bg_and_style()

# ---------------------------
# CONFIG
# ---------------------------
DATA_DIR = Path(r"F:/Prj/DS/New folder/updtaed_new")
FOOD_MASTER_FILE = DATA_DIR / "food_master.csv"
EXERCISE_MASTER_FILE = DATA_DIR / "exercise_master.csv"
MEDICAL_FILE = DATA_DIR / "medical_guidelines_processed.csv"
WHO_RDA_FILE = DATA_DIR / "who_rda_processed.csv"
EXERCISE_VIDEOS_FILE = DATA_DIR / "exercise_videos.csv"

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
    if str(gender).lower().startswith("m"):
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

# --- Start: PDF Generation Update for Clickable Links ---
def create_pdf(user_info, diet_table, exercise_table, tips, out_path):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 8, "AI-Driven Personalized Diet and Workout Recommendation", ln=True, align="C")
    pdf.ln(4)
    pdf.set_font("Arial", size=10)
    pdf.multi_cell(0, 6, f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    pdf.multi_cell(0, 6, f"User: {user_info.get('name','-')} | Age: {user_info['age']} | Gender: {user_info['gender']} | Goal: {user_info['goal']}")
    pdf.ln(6)
    
    # Diet Section
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
    
    # Exercise Section
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 6, "Exercise Recommendations (Top)", ln=True)
    pdf.set_font("Arial", size=9)
    if not exercise_table.empty:
        # Columns for PDF: Activity, Category, Cal/kg, Est_Cals_session, Demo Link
        headers = ['Activity','Category','Calories_per_kg','Est_Cals_session','demo_link']
        colw_ex = [40, 35, 30, 30, 55] # Adjusted width for new 'Demo Link' column

        # Print headers
        for h in ['Activity', 'Category', 'Cal/kg', 'Est_kcal/session', 'Demo Link']:
            pdf.cell(colw_ex[headers.index(h)], 6, str(h), border=1)
        pdf.ln()

        # Print data rows
        for _, r in exercise_table.head(10).iterrows(): # Use head(10) to match display_ex
            # Activity
            pdf.cell(colw_ex[0], 6, str(r['Activity'])[:25], border=1)
            # Category
            pdf.cell(colw_ex[1], 6, str(r['Category'])[:15], border=1)
            # Calories_per_kg
            pdf.cell(colw_ex[2], 6, f"{r['Calories_per_kg']:.2f}", border=1)
            # Est_Cals_session
            pdf.cell(colw_ex[3], 6, f"{int(r['Est_Cals_session'])}", border=1)
            # Demo Link (Text and Link)
            link_text = "Watch Demo"
            link_url = str(r['demo_link'])
            
            # Set cursor to start of cell for link
            x, y = pdf.get_x(), pdf.get_y()
            pdf.set_text_color(0, 0, 255) # Blue color for link
            pdf.cell(colw_ex[4], 6, link_text, border=1, link=link_url, align='C')
            pdf.set_text_color(0, 0, 0) # Reset color
            
            pdf.ln()
    else:
        pdf.cell(0, 6, "No exercise recommendations found.", ln=True)
    pdf.ln(6)

    # Tips Section
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 6, "Personalized Tips", ln=True)
    pdf.set_font("Arial", size=10)
    for t in tips:
        pdf.multi_cell(0, 6, "- " + t)
    pdf.ln(6)
    
    # Disclaimer
    pdf.set_font("Arial", size=7)
    pdf.multi_cell(0, 5, "Disclaimer: This is an AI-based suggestion intended for general purpose only. For medical conditions, consult a certified health professional.")
    pdf.output(str(out_path))
    return out_path
# --- End: PDF Generation Update for Clickable Links ---

# ---------------------------
# Load datasets
# ---------------------------
food_df = safe_read_csv(FOOD_MASTER_FILE)
exercise_df = safe_read_csv(EXERCISE_MASTER_FILE)
medical_df = safe_read_csv(MEDICAL_FILE)
who_rda_df = safe_read_csv(WHO_RDA_FILE)
videos_df = safe_read_csv(EXERCISE_VIDEOS_FILE)

# ---------------------------
# UI: Inputs with validation placeholders
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

med_condition = st.selectbox("Medical condition (optional)", ["None"] + list(medical_df['Condition'].unique()) if not medical_df.empty else ["None"])

# --- Start: Chatbot OpenAI Key Input (Moved from recommendation button block) ---
openai_key = st.text_input("🔑 Paste OpenAI API Key here (optional for enhanced chatbot)", type="password")
# --- End: Chatbot OpenAI Key Input ---

st.markdown("---")

# ---------------------------
# Validation and Recommendation Logic
# ---------------------------
# --- Start: Use Session State to manage click ---
if 'recommendation_clicked' not in st.session_state:
    st.session_state['recommendation_clicked'] = False

if st.button("🚀 Get Recommendations", type="primary") or st.session_state['recommendation_clicked']:
    st.session_state['recommendation_clicked'] = True
# --- End: Use Session State to manage click ---

# Re-run logic only if button was clicked or session state is set
if st.session_state['recommendation_clicked']:
    # Input validation
    errors = []
    if not name or not name.strip():
        errors.append("❌ Name is required")
    if age is None:
        errors.append("❌ Age is required")
    if gender == "Select Gender":
        errors.append("❌ Gender is required")
    if height_cm is None:
        errors.append("❌ Height is required")
    if weight_kg is None:
        errors.append("❌ Weight is required")
    if goal == "Select Goal":
        errors.append("❌ Goal is required")
    if diet_pref == "Select Preference":
        errors.append("❌ Diet Preference is required")
    
    if errors:
        st.error("### ⚠️ Please fill in all required fields:")
        for err in errors:
            st.warning(err)
        # Reset flag if there are errors so the user has to click again
        st.session_state['recommendation_clicked'] = False
        st.stop()

    if food_df.empty or exercise_df.empty:
        st.error("Required dataset(s) missing.")
        st.session_state['recommendation_clicked'] = False
        st.stop()

    user = {"name": name.strip(), "age": int(age), "gender": gender, "height_cm": float(height_cm), 
            "weight_kg": float(weight_kg), "goal": goal, "diet_pref": diet_pref, "medical": med_condition}
    
    user_tdee = tdee_bmr(age, gender, height_cm, weight_kg, workout_freq)
    
    # Store in session for chatbot
    st.session_state['user_info'] = user
    st.session_state['user_tdee'] = user_tdee
    
    calorie_target = max(1200, user_tdee - 500) if goal == "Lose Weight" else (user_tdee + 300 if goal == "Gain Weight" else user_tdee)
    
    st.success(f"### 🎯 Estimated daily calorie target: **{int(calorie_target)} kcal**")

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
    carbs_col = get_col(food_df, ['carb','carbs','carbohydrate'])
    fat_col = get_col(food_df, ['fat'])
    fibre_col = get_col(food_df, ['fibre','fiber'])
    sugar_col = get_col(food_df, ['sugar'])

    foods = food_df.copy()
    foods['FoodItem'] = foods[name_col] if name_col else foods.iloc[:,0]
    for (cname, src) in [('Calories',cal_col), ('Protein',prot_col), ('Carbs',carbs_col), ('Fat',fat_col), ('Fibre',fibre_col), ('Sugar',sugar_col)]:
        foods[cname] = pd.to_numeric(foods[src], errors='coerce').fillna(0) if src else 0.0

    # --- Start: Fixed Veg/NonVeg filtering logic ---
    filtered_foods = foods.copy()
    rda_path = DATA_DIR / "rda_cleaned.csv"
    if rda_path.exists():
        rda_df_local = safe_read_csv(rda_path)
        # Ensure columns exist and the VegNonVeg column is numeric (0=Veg, 1=NonVeg)
        if {'FoodItem','VegNonVeg'}.issubset(rda_df_local.columns):
            rda_df_local['VegNonVeg'] = pd.to_numeric(rda_df_local['VegNonVeg'], errors='coerce')
            merged = pd.merge(filtered_foods, rda_df_local[['FoodItem','VegNonVeg']].drop_duplicates(), on='FoodItem', how='left')
            
            if diet_pref == 'Veg':
                # Keep Veg (0) or items with no category (NaN) - Safe fallback
                filtered_foods = merged[(merged['VegNonVeg'].isna()) | (merged['VegNonVeg'] == 0)]
            elif diet_pref == 'NonVeg':
                # Keep NonVeg (1) or items with no category (NaN) - Safe fallback
                filtered_foods = merged[(merged['VegNonVeg'].isna()) | (merged['VegNonVeg'] == 1)]
    
    # --- End: Fixed Veg/NonVeg filtering logic ---

    # Filter by medical condition
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
        prot_max = cand['Protein'].max() if cand['Protein'].max() > 0 else 1.0
        fibre_max = cand['Fibre'].max() if cand['Fibre'].max() > 0 else 1.0
        cand['score'] = (-cand['cal_diff']/(cand['cal_diff'].max()+1e-6)) + (cand['Protein']/prot_max)*0.6 + (cand['Fibre']/fibre_max)*0.3
        cand = cand.sort_values(by='score', ascending=False)
        
        # --- Start: Added diversity by sampling from top candidates ---
        sample_size = min(10, len(cand))
        # Take the top 5*N candidates and sample 10 from them to add diversity
        top_n = min(len(cand), 50) 
        diet_top = cand.head(top_n).drop_duplicates().sample(n=sample_size, replace=False, random_state=42)
        # --- End: Added diversity ---
        
        diet_top = diet_top[['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar']].reset_index(drop=True)
    else:
        diet_top = pd.DataFrame(columns=['FoodItem','Calories','Protein','Carbs','Fat','Fibre','Sugar'])

    st.subheader("🍽️ Top Diet Recommendations")
    if not diet_top.empty:
        st.dataframe(diet_top, use_container_width=True)
    else:
        st.info("No suitable diet items found for your criteria.")

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

    # --- Start: Added exercise diversity by sampling from top candidates ---
    ex_candidates_final = ex_candidates.drop_duplicates(subset=['Activity'])
    sample_size_ex = min(10, len(ex_candidates_final))
    
    # Use top 20 candidates for sampling
    top_n_ex = min(len(ex_candidates_final), 20)
    ex_top = ex_candidates_final.head(top_n_ex).sample(n=sample_size_ex, replace=False, random_state=42)
    # --- End: Added exercise diversity ---

    ex_top = ex_top.reset_index(drop=True)
    ex_top['demo_link'] = ex_top['Activity'].apply(lambda x: make_youtube_search_link(x))

    st.subheader("🏋️ Exercise Recommendations")
    
    # --- Start: Made YouTube links clickable in Streamlit table ---
    # Create a column with clickable markdown links
    display_ex = ex_top[['Activity','Category','Calories_per_kg','Est_Cals_session','demo_link']].rename(
        columns={'Calories_per_kg':'Cal/kg','Est_Cals_session':'Est_kcal/session','demo_link':'Demo Link'})
    
    # Convert 'Demo Link' column to markdown for display in st.dataframe
    display_ex['Demo Link'] = display_ex.apply(lambda row: f"[Watch]({row['Demo Link']})", axis=1)

    # Use st.markdown and the to_html/css styling for rendering clickable links inside a DataFrame
    # Note: Streamlit's st.dataframe does not support clickable markdown links directly. 
    # The following workaround uses st.markdown to render the HTML, making the links clickable.
    st.markdown(
        display_ex.to_html(escape=False, index=False),
        unsafe_allow_html=True
    )
    # Fallback to st.dataframe if the above HTML is too complex or fails (removed for clean output):
    # st.dataframe(display_ex.head(10), use_container_width=True) 
    
    # --- End: Made YouTube links clickable in Streamlit table ---

    # Personalized tips
    tips = []
    if workout_freq < 3:
        tips.append("Increase workout frequency to at least 3 days/week for better results.")
    if goal == "Lose Weight":
        tips.append("Aim for 300-500 kcal/day deficit along with regular exercise.")
    elif goal == "Gain Weight":
        tips.append("Increase calorie intake and train progressively with strength exercises.")
    else:
        tips.append("Maintain balance of cardio and strength training for overall fitness.")
    if med_condition != "None":
        tips.append(f"Diet filtered for medical condition: {med_condition}. Consult a doctor for specific advice.")

    st.subheader("💡 Personalized Tips")
    for t in tips:
        st.write("• " + t)

    # Save plan
    now_tag = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_out = Path.cwd() / "saved_plans"
    safe_out.mkdir(exist_ok=True)
    safe_name = name.strip().replace(" ", "_").replace(".", "")
    json_path = safe_out / f"plan_{safe_name}_{now_tag}.json"
    plan = {"meta": {"user": user, "generated_at": str(datetime.datetime.now()), "calorie_target": int(calorie_target)}, 
            "diet_top": diet_top.to_dict(orient='records'), 
            "exercise_top": ex_top.to_dict(orient='records'), # Save ex_top with original structure for PDF/JSON
            "tips": tips}
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2)
    st.success(f"✅ Plan saved successfully!")

    pdf_path = safe_out / f"plan_{safe_name}_{now_tag}.pdf"
    create_pdf(user, diet_top, ex_top, tips, pdf_path)
    with open(pdf_path, "rb") as f:
        st.download_button("📄 Download My Plan (PDF)", data=f, file_name=pdf_path.name, type="primary")

# ---------------------------
# Custom Chatbot (Project-specific, no OpenAI)
# ---------------------------

if 'chat_history' not in st.session_state:
    st.session_state['chat_history'] = []

st.markdown("---")
st.subheader("💬 Health Assistant Chatbot")
st.markdown("*Ask me about TDEE, BMR, protein intake, symptoms, diet tips, or how to use this app!*")

# The custom_chatbot_response function remains the same as provided by the user (no changes here)
def custom_chatbot_response(query, context):
    q = query.lower().strip()
    
    # Greetings
    if any(w in q for w in ["hi", "hello", "hey", "hii", "hai"]):
        name = context.get('name', '')
        if name:
            return f"Hello {name}! 👋 How can I assist you today? You can ask me about TDEE, BMR, diet, exercises, symptoms, or medical conditions."
        return "Hello! 👋 I'm your health assistant. Ask me about TDEE, protein needs, symptoms, or how to use this app!"
    
    # Farewell
    if any(w in q for w in ["bye", "goodbye", "see you", "thanks", "thank you"]):
        return "You're welcome! Stay healthy and feel free to ask anytime. Take care! 😊"
    
    # What is TDEE?
    if "what" in q and "tdee" in q:
        return "TDEE stands for Total Daily Energy Expenditure. It's the total number of calories you burn in a day, including your BMR (Basal Metabolic Rate) and physical activity. Your TDEE helps determine how many calories you should eat to lose, maintain, or gain weight."
    
    # What is BMR?
    if "what" in q and "bmr" in q:
        return "BMR (Basal Metabolic Rate) is the number of calories your body needs at rest to maintain basic functions like breathing, circulation, and cell production. TDEE = BMR × Activity Factor."
    
    # My TDEE
    if "my tdee" in q or "tdee" in q:
        tdee = context.get('tdee')
        if tdee:
            return f"Your estimated TDEE is approximately **{int(tdee)} kcal/day**. This is based on your age, gender, height, weight, and activity level."
        return "I don't have your TDEE yet. Please click 'Get Recommendations' button after entering your details to calculate your TDEE."
    
    # Protein intake
    if "protein" in q:
        weight = context.get('weight_kg')
        if weight:
            return f"For your weight ({weight} kg), aim for approximately **{round(1.6 * weight, 1)}g of protein per day**. Range: 1.2-2.0 g/kg depending on your activity level and goals."
        return "Aim for 1.2–2.0 g of protein per kg of body weight daily. For muscle gain, go higher (1.6-2.0 g/kg). Please enter your weight for a personalized recommendation."
    
    # Symptoms - Fever
    if "fever" in q or "temperature" in q:
        return "For fever: Rest, stay hydrated, and take paracetamol if needed. If fever persists beyond 3 days or exceeds 103°F (39.4°C), consult a doctor immediately."
    
    # Symptoms - Cough
    if "cough" in q:
        return "For cough: Stay hydrated, use honey or warm water, avoid cold foods. If cough persists for more than 2 weeks or includes blood, see a healthcare professional."
    
    # Symptoms - Headache
    if "headache" in q or "head ache" in q:
        return "For headache: Rest in a quiet, dark room, stay hydrated, and try a cold/warm compress. Avoid screens. If severe or persistent, consult a doctor."
    
    # Diabetes
    if "diabetes" in q:
        return "For diabetes management: Focus on low-GI foods (whole grains, legumes, vegetables), avoid refined sugars, maintain regular meal times, and monitor blood sugar levels. Exercise regularly and consult your doctor for personalized advice."
    
    # Hypertension
    if "hypertension" in q or "blood pressure" in q or "bp" in q:
        return "For hypertension: Reduce sodium intake, eat potassium-rich foods (bananas, spinach), limit caffeine and alcohol, exercise regularly, manage stress, and maintain a healthy weight. Regular monitoring is important."
    
    # Weight loss
    if "lose weight" in q or "weight loss" in q:
        return "For weight loss: Create a calorie deficit (300-500 kcal/day), focus on high-protein and high-fiber foods, do cardio + strength training 4-5 days/week, stay hydrated, and get adequate sleep (7-8 hours)."
    
    # Weight gain
    if "gain weight" in q or "weight gain" in q:
        return "For weight gain: Eat in a calorie surplus (+300-500 kcal/day), increase protein intake, do strength training 4-5 times/week, eat frequent meals, and include healthy fats (nuts, avocado, olive oil)."
    
    # Exercise
    if "exercise" in q or "workout" in q:
        goal = context.get('goal', '')
        if "lose" in goal.lower():
            return "For weight loss: Focus on cardio exercises (running, cycling, swimming) 4-5 times/week, combined with strength training 2-3 times/week. Aim for 150-300 minutes of moderate activity per week."
        elif "gain" in goal.lower():
            return "For weight gain: Prioritize strength training (weightlifting, resistance exercises) 4-5 times/week. Focus on compound movements like squats, deadlifts, bench press. Limit cardio to 2-3 times/week."
        return "For maintenance: Combine cardio (3 days/week) and strength training (3 days/week). Aim for at least 150 minutes of moderate exercise weekly."
    
    # How to use app
    if "how" in q and ("use" in q or "work" in q) and ("app" in q or "this" in q):
        return "To use this app: 1) Fill in all required fields (name, age, gender, height, weight, goal, diet preference). 2) Click 'Get Recommendations' to see personalized diet and exercise plans. 3) Download your plan as PDF. 4) Ask me any questions here in the chatbot!"
    
    # Download plan
    if "download" in q or "pdf" in q:
        return "After generating recommendations, scroll down to find the '📄 Download My Plan (PDF)' button. Your personalized plan will be saved with your name and timestamp."
    
    # Medical condition
    if "medical condition" in q or "health condition" in q:
        return "You can select a medical condition from the dropdown (optional). The app will filter out foods you should avoid. For serious conditions, always consult a healthcare professional."
    
    # Small talk
    if any(w in q for w in ["how are you", "how r u", "how's it going"]):
        return "I'm doing great, thank you for asking! 😊 I'm here to help you with diet and exercise recommendations. What would you like to know?"
    
    # Default fallback
    return ("I'm not sure about that. Try asking me: 'What is TDEE?', 'What is BMR?', 'How much protein should I eat?', "
            "'What should I do for fever?', 'How to lose weight?', 'How to use this app?', or say 'hi' to chat!")

# ----- Chat UI integration -----

# Build context from available user inputs (these variables should exist in your app)
user_context = {
    'name': globals().get('name', '') or '',
    'weight_kg': globals().get('weight_kg', None),
    'goal': globals().get('goal', '') or '',
    'tdee': None
}
# Try to compute TDEE if inputs exist (safe)
try:
    _age = int(globals().get('age')) if globals().get('age') is not None and globals().get('age') != '' else None
    _height = float(globals().get('height_cm')) if globals().get('height_cm') is not None and globals().get('height_cm') != '' else None
    _weight = float(globals().get('weight_kg')) if globals().get('weight_kg') is not None and globals().get('weight_kg') != '' else None
    _gender = globals().get('gender') if globals().get('gender') is not None else ''
    _freq = int(globals().get('workout_freq')) if globals().get('workout_freq') is not None else 0
    if _age and _height and _weight and _gender != 'Select Gender':
        try:
            user_context['tdee'] = int(tdee_bmr(_age, _gender, _height, _weight, _freq))
        except Exception:
            user_context['tdee'] = None
    else:
        user_context['tdee'] = None
except Exception:
    user_context['tdee'] = None


# --- Start: Chat input & send button (Modified for Enter key submission) ---
col_left, col_right = st.columns([4,1])
with col_left:
    # Use a form to capture the enter key press
    with st.form(key='chat_form', clear_on_submit=True):
        chat_input = st.text_input("Type your message here...", key="chat_input_box_v2", label_visibility="collapsed")
        send_click = st.form_submit_button("Send", key="chat_send_btn_v2") # This button is submitted on enter key press
# --- End: Chat input & send button ---


def append_user_msg(text):
    st.session_state['chat_history'].append(("You", text))

def append_bot_msg(text):
    st.session_state['chat_history'].append(("Bot", text))

# If OpenAI key exists and you want to use it, keep that logic; otherwise fallback to local function
use_openai = False
try:
    if openai_key and HAS_OPENAI: # Check the new openai_key variable
        use_openai = True
        import openai
        openai.api_key = openai_key
except Exception:
    use_openai = False

if send_click and chat_input and chat_input.strip():
    user_msg = chat_input.strip()
    append_user_msg(user_msg)

    bot_reply = None

    # Try OpenAI if user provided key and library present
    if use_openai:
        try:
            resp = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a concise, friendly health assistant. Keep answers non-medical and suggest seeing a clinician for serious issues."},
                    {"role": "user", "content": user_msg}
                ],
                max_tokens=250,
                temperature=0.2
            )
            bot_reply = resp.choices[0].message.content.strip()
        except Exception as e:
            # fallback to local function on any error
            bot_reply = custom_chatbot_response(user_msg, user_context)
    else:
        # Local rule-based reply using the function the user provided
        bot_reply = custom_chatbot_response(user_msg, user_context)

    append_bot_msg(bot_reply)

# Display chat history (most recent last)
if st.session_state['chat_history']:
    st.markdown("**Conversation**")
    # Display the last 10 messages
    for who, txt in st.session_state['chat_history'][-10:]:
        if who == "You":
            st.markdown(f"**You:** {txt}")
        else:
            # bot replies may contain markdown (like **bold**) — render as-is
            st.markdown(f"**Bot:** {txt}")

# Small quick prompts to help user interact
st.markdown(
    """
**Try asking:** - "Hi" or "Hello" — to start a conversation  
- "What is my TDEE?" — after you've clicked Get Recommendations  
- "Protein for 70kg?" — direct nutrition advice  
- "Download plan" — how to download your PDF plan  
"""
)

# Footer
st.markdown("---")
st.caption("⚠️ Disclaimer: This app provides AI-based suggestions for educational purposes only. It is NOT a substitute for professional medical advice. Consult certified healthcare professionals for medical conditions.")