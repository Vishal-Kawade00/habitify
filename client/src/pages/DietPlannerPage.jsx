import React, { useState, useEffect } from 'react';
import Button from '../components/common/Button.jsx';
import Loader from '../components/common/Loader.jsx';
import Modal from '../components/common/Modal.jsx';
import { useAuth } from '../context/AuthContext';
import * as dietService from '../services/dietService';
import { Download, Save, Bot, Utensils, Dumbbell, TrendingUp, HeartPulse, Leaf, History, X } from 'lucide-react';

const DietPlannerPage = () => {
  // -------------------------------------------------------------------------
  // 1. STATE INITIALIZATION
  // -------------------------------------------------------------------------
  const [formData, setFormData] = useState({
    goal: 'lose_weight',
    weight: 70,
    height: 170,
    age: 25,
    gender: 'male',
    activity: 'moderate',
    diet_pref: 'veg',      // Defaulting to veg
    condition: 'none'      // Defaulting to none
  });
  
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false); // New state for PDF loading
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const { isAuthenticated } = useAuth();

  // -------------------------------------------------------------------------
  // 2. CONSTANTS & MAPPINGS
  // -------------------------------------------------------------------------
  
  // Medical conditions list matching your backend logic (step3.py / api.py)
  const medicalConditions = [
    { value: 'none', label: 'None' },
    { value: 'diabetes', label: 'Diabetes' },
    { value: 'hypertension', label: 'Hypertension' },
    { value: 'heart_disease', label: 'Heart Disease' },
    { value: 'kidney_disease', label: 'Kidney Disease' },
    { value: 'pcos', label: 'PCOS' },
    { value: 'thyroid_hypo', label: 'Hypothyroidism' },
    { value: 'thyroid_hyper', label: 'Hyperthyroidism' },
    { value: 'anemia', label: 'Anemia' },
    { value: 'obesity', label: 'Obesity' }
  ];

  // Map frontend string activity to integer for Python API
  const mapActivityLevel = (level) => {
    switch (level) {
      case 'sedentary': return 0;
      case 'light': return 3;
      case 'moderate': return 4;
      case 'very': return 5;
      case 'extra': return 7;
      default: return 3;
    }
  };

  // Map frontend string goal to specific string for Python API
  const mapGoal = (goal) => {
    switch (goal) {
      case 'lose_weight': return 'Lose Weight';
      case 'gain_muscle': return 'Gain Weight';
      case 'maintain_weight': return 'Maintain Weight';
      default: return 'Lose Weight';
    }
  };

  // Map diet preference
  const mapDietPref = (pref) => (pref === 'veg' ? 'Veg' : 'NonVeg');
  
  // Map medical condition (simple capitalization or lookup)
  const mapCondition = (cond) => {
    if (cond === 'none') return 'None';
    const found = medicalConditions.find(c => c.value === cond);
    return found ? found.label : 'None';
  };

  // -------------------------------------------------------------------------
  // 3. HANDLERS
  // -------------------------------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'weight' || name === 'height' || name === 'age' 
        ? Number(value) 
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setPlan(null);
    
    try {
      // Prepare Payload for Python API
      const payload = {
        age: formData.age,
        // Capitalize gender for backend consistency (male -> Male)
        gender: formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1), 
        height: formData.height,
        weight: formData.weight,
        activity_level: mapActivityLevel(formData.activity),
        goal: mapGoal(formData.goal),
        diet_pref: mapDietPref(formData.diet_pref),
        condition: mapCondition(formData.condition)
      };

      console.log("Sending Payload to API:", payload);

      // Make Request to FastAPI
      const response = await fetch('http://localhost:8000/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Received Data from API:", data);

      // --- Transform Data for UI ---

      // 1. Format Diet Data
      // The API returns a list of items. We assign meal labels cyclically.
      const mealLabels = ["Breakfast", "Mid-Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack"];
      
      const formattedDiet = data.diet && data.diet.length > 0 
        ? data.diet.map((item, index) => ({
            meal: mealLabels[index % mealLabels.length] + (index >= mealLabels.length ? ` (Option ${Math.floor(index/6) + 1})` : ""),
            food: item.FoodItem,
            calories: Math.round(item.Calories),
            protein: Math.round(item.Protein || 0),
            carbs: Math.round(item.Carbs || 0),
            fat: Math.round(item.Fat || 0)
          }))
        : [];

      // 2. Format Exercise Data
      const days = ["Monday", "Wednesday", "Friday", "Saturday"];
      
      const formattedExercise = data.exercises && data.exercises.length > 0
        ? data.exercises.map((item, index) => ({
            day: days[index % days.length] || "Flexible Day",
            workout: item.Activity,
            duration: "30-45 mins", // Estimate
            videoUrl: item.YouTubeDemo
          }))
        : [];

      // Update State
      setPlan({
        meta: data.meta,
        diet: formattedDiet,
        exercise: formattedExercise
      });

    } catch (err) {
      console.error('Error generating plan:', err);
      if (err.message.includes('Failed to fetch')) {
        setError('Connection failed. Is the Python backend server running at http://localhost:8000?');
      } else {
        setError(err.message || 'Failed to generate plan. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    
    if (!isAuthenticated) {
      alert('Please log in to save your plan to the database.');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      // Prepare plan data for backend
      const planData = {
        plan: {
          meta: plan.meta || {
            tdee: plan.meta?.tdee || 0,
            goal_calories: getTotalCalories()
          },
          diet: plan.diet || [],
          exercise: plan.exercise || []
        },
        name: `Plan ${new Date().toLocaleDateString()} - ${formData.goal.replace('_', ' ')}`
      };

      await dietService.savePlan(planData);
      alert('Plan saved successfully to your account!');
      // Optionally refresh saved plans list
      if (showSavedPlans) {
        loadSavedPlans();
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to save plan. Please try again.';
      alert(errorMsg);
      console.error('Error saving plan:', err);
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedPlans = async () => {
    if (!isAuthenticated) {
      setSavedPlans([]);
      return;
    }

    setIsLoadingPlans(true);
    try {
      const response = await dietService.getSavedPlans();
      setSavedPlans(response.plans || []);
    } catch (err) {
      console.error('Error loading saved plans:', err);
      setError('Failed to load saved plans');
      setSavedPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleViewSavedPlans = async () => {
    if (!isAuthenticated) {
      alert('Please log in to view your saved plans.');
      return;
    }
    setShowSavedPlans(true);
    await loadSavedPlans();
  };

  const handleLoadPlan = (savedPlan) => {
    // Convert saved plan format to current plan format
    const loadedPlan = {
      meta: savedPlan.meta || {},
      diet: savedPlan.diet || [],
      exercise: savedPlan.exercise || []
    };
    setPlan(loadedPlan);
    setShowSavedPlans(false);
    // Scroll to plan section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadPDF = async () => {
    if (!plan) return;
    setIsPdfLoading(true); // Start loading state
    
    try {
      // 1. Prepare data for PDF generation endpoint
      const payload = {
        user_info: {
          name: "User", // You can connect this to auth user context if available
          ...formData
        },
        diet_plan: plan.diet,
        exercise_plan: plan.exercise,
        tips: [
          "Stay hydrated and drink at least 3 liters of water daily.",
          "Ensure you get 7-8 hours of sleep for recovery.",
          `Follow the ${formData.goal === 'lose_weight' ? 'calorie deficit' : 'calorie surplus'} consistency.`
        ]
      };

      // 2. Call Python Backend
      const response = await fetch('http://localhost:8000/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to generate PDF';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `Failed to generate PDF: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // 3. Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        // If not PDF, try to read as JSON to get error
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Server returned non-PDF response');
      }

      // 4. Handle Binary Data (Blob)
      const blob = await response.blob();
      
      // Verify blob is not empty
      if (blob.size === 0) {
        throw new Error('PDF file is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      
      // 5. Trigger Download
      const a = document.createElement('a');
      a.href = url;
      a.download = `HealthPlan_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error downloading PDF:', err);
      const errorMessage = err.message || 'Failed to generate PDF';
      
      // Check if it's a network error
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        alert('Connection failed. Please ensure the Python backend server is running at http://localhost:8000');
      } else {
        alert(`Failed to generate PDF: ${errorMessage}`);
      }
    } finally {
      setIsPdfLoading(false); // Stop loading state
    }
  };

  const handleAddToHabits = () => {
    if (!plan) return;
    alert('Feature coming soon: Convert plan items to trackable habits!');
  };

  // Helper: Calculate total calories
  const getTotalCalories = () => {
    if (!plan?.diet) return 0;
    return plan.diet.reduce((sum, item) => sum + (item.calories || 0), 0);
  };

  // -------------------------------------------------------------------------
  // 4. RENDER HELPERS
  // -------------------------------------------------------------------------

  const renderDietTable = (dietData) => {
    if (!dietData || dietData.length === 0) {
      return (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          No diet recommendations found for these criteria. Try adjusting your preferences.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Meal
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Food
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Calories
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Protein (g)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Carbs (g)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Fat (g)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {dietData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.meal}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.food}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.calories}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.protein || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.carbs || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.fat || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderExerciseTable = (exerciseData) => {
    if (!exerciseData || exerciseData.length === 0) {
      return (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          No exercise recommendations found for these criteria.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Day
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Workout
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Duration
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Video Guide
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {exerciseData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.day}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.workout}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.duration}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.videoUrl ? (
                    <a
                      href={item.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Watch Demo
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 5. MAIN RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg">
              <Bot className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              AI Diet & Exercise Planner
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Get personalized meal and workout plans powered by AI
          </p>
        </header>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md mb-8 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Your Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Goal */}
            <div>
              <label htmlFor="goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Goal
              </label>
              <select
                id="goal"
                name="goal"
                value={formData.goal}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="lose_weight">Lose Weight</option>
                <option value="maintain_weight">Maintain Weight</option>
                <option value="gain_muscle">Gain Muscle</option>
              </select>
            </div>

            {/* Weight */}
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Weight (kg)
              </label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                min="30"
                max="300"
                required
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>

            {/* Height */}
            <div>
              <label htmlFor="height" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Height (cm)
              </label>
              <input
                type="number"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleChange}
                min="100"
                max="250"
                required
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Age
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="13"
                max="100"
                required
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Activity Level */}
            <div>
              <label htmlFor="activity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Level
              </label>
              <select
                id="activity"
                name="activity"
                value={formData.activity}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="sedentary">Sedentary (Office job)</option>
                <option value="light">Lightly Active (1-2 days/week)</option>
                <option value="moderate">Moderate (3-5 days/week)</option>
                <option value="very">Very Active (6-7 days/week)</option>
                <option value="extra">Extremely Active (Athlete)</option>
              </select>
            </div>

            {/* Diet Preference - NEW FIELD */}
            <div>
              <label htmlFor="diet_pref" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Leaf size={16} /> Diet Preference
              </label>
              <select
                id="diet_pref"
                name="diet_pref"
                value={formData.diet_pref}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="veg">Vegetarian</option>
                <option value="non_veg">Non-Vegetarian</option>
              </select>
            </div>

            {/* Medical Condition - NEW FIELD */}
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <HeartPulse size={16} /> Medical Condition
              </label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              >
                {medicalConditions.map(cond => (
                  <option key={cond.value} value={cond.value}>{cond.label}</option>
                ))}
              </select>
            </div>

          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Bot size={20} className="mr-2" />
                  Generate My Plan
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-center">
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Generating your personalized plan...
            </p>
          </div>
        )}

        {/* Results Section */}
        {plan && !isLoading && (
          <div className="space-y-8">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-2">
                  <Utensils className="text-blue-600 dark:text-blue-400" size={24} />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Daily Calories
                  </h3>
                </div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {getTotalCalories()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total per day
                </p>
              </div>

              <div className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-2">
                  <Dumbbell className="text-green-600 dark:text-green-400" size={24} />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Workout Days
                  </h3>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {plan.exercise?.filter(e => e.workout.toLowerCase() !== 'rest').length || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Per week
                </p>
              </div>

              <div className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Your Goal
                  </h3>
                </div>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formData.goal.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </p>
              </div>
            </div>

            {/* Diet Plan Section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Utensils className="text-blue-600 dark:text-blue-400" size={28} />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Your Daily Diet Plan
                </h2>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                {renderDietTable(plan.diet)}
              </div>
            </section>

            {/* Exercise Plan Section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Dumbbell className="text-green-600 dark:text-green-400" size={28} />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Your Weekly Exercise Plan
                </h2>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                {renderExerciseTable(plan.exercise)}
              </div>
            </section>

            {/* Action Buttons */}
            <section className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={handleSavePlan}
                variant="primary"
                size="lg"
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} className="mr-2" />
                    Save Plan
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownloadPDF}
                variant="secondary"
                size="lg"
                disabled={isPdfLoading}
                className="flex-1"
              >
                {isPdfLoading ? (
                  <>
                    <Loader size="sm" className="mr-2" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download size={20} className="mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button
                onClick={handleViewSavedPlans}
                variant="secondary"
                size="lg"
                className="flex-1"
              >
                <History size={20} className="mr-2" />
                View Saved Plans
              </Button>
              <Button
                onClick={handleAddToHabits}
                variant="secondary"
                size="lg"
                className="flex-1"
              >
                <TrendingUp size={20} className="mr-2" />
                Add to Habits
              </Button>
            </section>

          </div>
        )}

        {/* Saved Plans Modal */}
        <Modal
          isOpen={showSavedPlans}
          onClose={() => setShowSavedPlans(false)}
          title="Your Saved Plans"
          size="xl"
        >
          {isLoadingPlans ? (
            <div className="flex items-center justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : savedPlans.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No saved plans yet. Generate and save a plan to see it here!
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {savedPlans.map((savedPlan) => (
                <div
                  key={savedPlan._id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {savedPlan.name || `Plan from ${new Date(savedPlan.createdAt).toLocaleDateString()}`}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Created: {new Date(savedPlan.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Diet Items: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {savedPlan.diet?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Exercises: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {savedPlan.exercise?.length || 0}
                      </span>
                    </div>
                    {savedPlan.meta?.goal_calories && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Calories: </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {Math.round(savedPlan.meta.goal_calories)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleLoadPlan(savedPlan)}
                    variant="primary"
                    size="sm"
                    className="w-full"
                  >
                    Load This Plan
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default DietPlannerPage;