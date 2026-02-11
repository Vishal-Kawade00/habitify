import pandas as pd

# Lazy load CSV inside functions (safer)
def filter_food(medical_conditions, food_list):
    medical_food_rules = pd.read_csv("data/medical_food_rules.csv")
    # implement your filtering logic
    return food_list

def filter_exercise(medical_conditions, exercise_list):
    medical_exercise_rules = pd.read_csv("data/medical_exercise_rules.csv")
    # implement your filtering logic
    return exercise_list

def adjust_plan(predictions, gender):
    gender_adj = pd.read_csv("data/gender_adjustments.csv")
    # implement adjustment logic
    return predictions
