from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
from pathlib import Path
import uvicorn
import datetime
import urllib.parse
from fpdf import FPDF
import os
import unicodedata

# Initialize App
app = FastAPI(title="Diet & Workout AI API")

# -------------------------
# CORS (CRITICAL FOR REACT)
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (like localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# CONFIG & DATA LOADING
# -------------------------
# Path Configuration (Matches your logs)
# Updated path relative to your new project directory
DATA_DIR = Path(r"C:\Users\Admin\OneDrive\Desktop\COLLEGE_WORK\Semester-project-5\Model\DS\New folder\updtaed_new\model_ready")
GENERATED_PDF_DIR = Path.cwd() / "generated_pdfs"
GENERATED_PDF_DIR.mkdir(exist_ok=True)

try:
    # 1. Load REAL food data (Unscaled) from parent folder
    food_path = DATA_DIR.parent / "food_master.csv"
    if food_path.exists():
        food_df = pd.read_csv(food_path)
        print(f"✅ Food Data Loaded: {len(food_df)} items")
    else:
        # Fallback
        food_df = pd.read_csv(DATA_DIR / "food_features.csv")
        print("⚠️ Loaded Scaled Food Data (Fallback)")

    # 2. Load other datasets
    exercise_df = pd.read_csv(DATA_DIR / "exercise_features.csv")
    medical_df = pd.read_csv(DATA_DIR / "medical_guidelines_features.csv")
    print("✅ Exercise & Medical Data Loaded")

except Exception as e:
    print(f"❌ Critical Error Loading Data: {e}")
    # Initialize empty DFs to prevent crash
    food_df, exercise_df, medical_df = pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

# -------------------------
# INPUT SCHEMA
# -------------------------
class UserInput(BaseModel):
    age: int
    gender: str
    height: float
    weight: float
    activity_level: int
    goal: str
    diet_pref: str
    condition: str = "None"

class ChatRequest(BaseModel):
    message: str
    context: dict = {}

class PdfRequest(BaseModel):
    user_info: dict
    diet_plan: list
    exercise_plan: list
    tips: list

# -------------------------
# LOGIC FUNCTIONS
# -------------------------
def calculate_tdee(age, gender, height, weight, activity_level):
    if str(gender).lower().startswith('m'):
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    # Activity Factor
    factors = {0: 1.2, 3: 1.375, 4: 1.55, 5: 1.725, 7: 1.9}
    # Default to 1.375 if unknown
    factor = factors.get(activity_level, 1.375)
    return bmr * factor

def get_diet_recommendations(goal, diet_pref, calorie_target, condition):
    df = food_df.copy()
    if df.empty: return []

    # Goal adjustment
    if goal.lower() == "lose weight": target = calorie_target * 0.85
    elif goal.lower() == "gain weight": target = calorie_target * 1.15
    else: target = calorie_target

    meal_target = target / 3.0
    lower, upper = meal_target * 0.6, meal_target * 1.4
    
    # Filter by Calorie Range
    df = df[(df['Calories'] >= lower) & (df['Calories'] <= upper)]

    # Filter by Diet Preference
    if diet_pref.lower() == 'veg':
        df = df[~df['FoodItem'].str.contains('chicken|meat|fish|egg|mutton|prawn|crab', case=False, na=False)]

    # Filter by Medical Condition
    if condition and condition != "None" and not medical_df.empty:
        med_row = medical_df[medical_df['Condition'].str.lower() == condition.lower()]
        if not med_row.empty:
            avoid_txt = str(med_row.iloc[0]['Avoid'])
            if avoid_txt and avoid_txt.lower() != 'nan':
                avoids = [x.strip() for x in avoid_txt.split(',')]
                for a in avoids:
                    if a: df = df[~df['FoodItem'].str.contains(a, case=False, na=False)]

    # Scoring
    cols = ["Protein", "Fibre", "Sugar", "Fat"]
    for c in cols: df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0)

    df["NutrientScore"] = (0.4 * df["Protein"] + 0.2 * df["Fibre"] - 0.1 * df["Sugar"] - 0.1 * df["Fat"])
    
    # Return top items (Clean NaN values for JSON)
    top_items = df.sort_values(by="NutrientScore", ascending=False).head(18)
    
    # FIX: Convert NaN to None for JSON compatibility
    return top_items.replace({np.nan: None}).to_dict(orient="records")

def get_exercise_recommendations(goal):
    ex = exercise_df.copy()
    if ex.empty: return []

    if goal.lower() == "lose weight": ex = ex[ex['Category'] == 0]
    elif goal.lower() == "gain weight": ex = ex[ex['Category'] == 1]
    else: ex = ex[ex['Category'].isin([0, 1])]

    top_ex = ex.sort_values(by='Calories_per_kg', ascending=False).head(7)
    
    # Add YouTube Links
    top_ex['YouTubeDemo'] = top_ex['Activity'].apply(
        lambda x: f"https://www.youtube.com/results?search_query={str(x).replace(' ','+')}"
    )
    
    # FIX: Convert NaN to None for JSON compatibility
    return top_ex.replace({np.nan: None}).to_dict(orient="records")

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
        return "TDEE stands for Total Daily Energy Expenditure. It's the total number of calories you burn in a day, including your BMR (Basal Metabolic Rate) and physical activity."
    
    # What is BMR?
    if "what" in q and "bmr" in q:
        return "BMR (Basal Metabolic Rate) is the number of calories your body needs at rest to maintain basic functions like breathing, circulation, and cell production."
    
    # My TDEE
    if "my tdee" in q or "tdee" in q:
        tdee = context.get('tdee')
        if tdee:
            return f"Your estimated TDEE is approximately **{int(tdee)} kcal/day**. This is based on your age, gender, height, weight, and activity level."
        return "I don't have your TDEE yet. Please generate a plan first to calculate it."
    
    # Protein intake
    if "protein" in q:
        weight = context.get('weight_kg')
        if weight:
            return f"For your weight ({weight} kg), aim for approximately **{round(1.6 * float(weight), 1)}g of protein per day**. Range: 1.2-2.0 g/kg depending on your activity level and goals."
        return "Aim for 1.2–2.0 g of protein per kg of body weight daily. For muscle gain, go higher (1.6-2.0 g/kg)."
    
    # Symptoms
    if "fever" in q: return "For fever: Rest, stay hydrated, and take paracetamol if needed. Consult a doctor if high fever persists."
    if "cough" in q: return "For cough: Stay hydrated, use honey or warm water. If persistent, see a healthcare professional."
    if "headache" in q: return "For headache: Rest in a quiet dark room, stay hydrated. If severe, consult a doctor."
    
    # Weight loss
    if "lose weight" in q or "weight loss" in q:
        return "For weight loss: Create a calorie deficit (300-500 kcal/day), focus on high-protein and high-fiber foods, do cardio + strength training 4-5 days/week."
    
    # Default fallback
    return ("I'm not sure about that. Try asking me: 'What is TDEE?', 'How much protein should I eat?', 'How to lose weight?', or say 'hi'!")

def sanitize_text(text):
    """Convert Unicode text to ASCII-compatible text for FPDF"""
    if not text:
        return ""
    # Normalize Unicode characters and replace problematic ones
    text = str(text)
    # Replace common Unicode characters with ASCII equivalents
    replacements = {
        '\u2026': '...',  # Horizontal ellipsis
        '\u2019': "'",    # Right single quotation mark
        '\u2018': "'",    # Left single quotation mark
        '\u201C': '"',    # Left double quotation mark
        '\u201D': '"',    # Right double quotation mark
        '\u2013': '-',    # En dash
        '\u2014': '--',   # Em dash
        '\u00A0': ' ',   # Non-breaking space
    }
    for unicode_char, ascii_char in replacements.items():
        text = text.replace(unicode_char, ascii_char)
    # Try to encode as latin-1, replacing any remaining problematic characters
    try:
        text = text.encode('latin-1', errors='replace').decode('latin-1')
    except:
        # Fallback: remove any remaining non-ASCII characters
        text = ''.join(char for char in text if ord(char) < 256)
    return text

def generate_pdf_file(user_info, diet_list, exercise_list, tips):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    
    # Title
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 8, sanitize_text("AI-Driven Personalized Diet and Workout Plan"), ln=True, align="C")
    pdf.ln(4)
    
    # User Info
    pdf.set_font("Arial", size=10)
    user_name = sanitize_text(user_info.get('name', 'User'))
    goal = sanitize_text(user_info.get('goal', '-'))
    weight = user_info.get('weight', '-')
    user_info_text = f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\nUser: {user_name} | Goal: {goal} | Weight: {weight}kg"
    pdf.multi_cell(0, 6, sanitize_text(user_info_text))
    pdf.ln(6)

    # Diet Section
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 6, sanitize_text("Diet Recommendations"), ln=True)
    pdf.set_font("Arial", size=9)
    
    if diet_list:
        # Headers
        headers = ["Meal", "Food Item", "Calories", "Protein"]
        col_widths = [40, 80, 25, 25]
        for i, h in enumerate(headers):
            pdf.cell(col_widths[i], 6, sanitize_text(h), border=1)
        pdf.ln()
        
        # Rows
        for item in diet_list[:15]:  # Limit rows for PDF
            meal = sanitize_text(str(item.get('meal', '-')))
            food = sanitize_text(str(item.get('food', item.get('FoodItem', '-'))))[:35]
            calories = str(item.get('calories', item.get('Calories', '0')))
            protein = str(item.get('protein', item.get('Protein', '0')))
            pdf.cell(col_widths[0], 6, meal, border=1)
            pdf.cell(col_widths[1], 6, food, border=1)
            pdf.cell(col_widths[2], 6, calories, border=1)
            pdf.cell(col_widths[3], 6, protein, border=1)
            pdf.ln()
    else:
        pdf.cell(0, 6, sanitize_text("No diet data available."), ln=True)
    pdf.ln(6)

    # Exercise Section
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 6, sanitize_text("Exercise Plan"), ln=True)
    pdf.set_font("Arial", size=9)
    
    if exercise_list:
        headers = ["Day", "Workout", "Duration"]
        col_widths = [30, 90, 40]
        for i, h in enumerate(headers):
            pdf.cell(col_widths[i], 6, sanitize_text(h), border=1)
        pdf.ln()
        
        for item in exercise_list[:10]:
            day = sanitize_text(str(item.get('day', '-')))
            workout = sanitize_text(str(item.get('workout', item.get('Activity', '-'))))[:40]
            duration = sanitize_text(str(item.get('duration', '30 mins')))
            pdf.cell(col_widths[0], 6, day, border=1)
            pdf.cell(col_widths[1], 6, workout, border=1)
            pdf.cell(col_widths[2], 6, duration, border=1)
            pdf.ln()
    else:
        pdf.cell(0, 6, sanitize_text("No exercise data available."), ln=True)
    pdf.ln(6)

    # Tips Section
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 6, sanitize_text("Personalized Tips"), ln=True)
    pdf.set_font("Arial", size=10)
    for t in tips:
        tip_text = sanitize_text(str(t))
        pdf.multi_cell(0, 6, "- " + tip_text)
    
    # Save
    safe_name = sanitize_text(user_info.get('name', 'user')).replace(' ', '_').replace('.', '')
    filename = f"plan_{safe_name}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    file_path = GENERATED_PDF_DIR / filename
    pdf.output(str(file_path))
    return file_path

# -------------------------
# API ENDPOINTS
# -------------------------
@app.post("/recommend")
async def generate_recommendations(user: UserInput):
    try:
        print(user)
        # 1. Calculate TDEE
        tdee = calculate_tdee(user.age, user.gender, user.height, user.weight, user.activity_level)
        
        # 2. Get Diet
        diet_plan = get_diet_recommendations(user.goal, user.diet_pref, tdee, user.condition)
        
        # 3. Get Workout
        workout_plan = get_exercise_recommendations(user.goal)
        print(workout_plan)
        print(diet_plan)
        
        return {
            "status": "success",
            "meta": {
                "tdee": round(tdee, 2),
                "goal_calories": round(tdee * (0.85 if user.goal == "Lose Weight" else 1.15 if user.goal == "Gain Weight" else 1), 2)
            },
            "diet": diet_plan,
            "exercises": workout_plan
        }

    except Exception as e:
        # Print error to console for debugging
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        response_text = custom_chatbot_response(request.message, request.context)
        return {"response": response_text}
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-pdf")
async def pdf_endpoint(request: PdfRequest):
    try:
        file_path = generate_pdf_file(
            request.user_info, 
            request.diet_plan, 
            request.exercise_plan, 
            request.tips
        )
        return FileResponse(path=file_path, filename=file_path.name, media_type='application/pdf')
    except Exception as e:
        print(f"PDF Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Ensure this port matches what React is calling (8000)
    uvicorn.run(app, host="0.0.0.0", port=8000)