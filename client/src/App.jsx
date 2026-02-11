import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // <--- Import AuthProvider
import { HabitProvider } from './context/HabitContext';
import PrivateRoute from './components/common/PrivateRoute'; // <--- Import PrivateRoute

// Import Pages
import LoginPage from './pages/LoginPage';   // <--- Import Login
import SignupPage from './pages/SignupPage'; // <--- Import Signup
import DashboardPage from './pages/DashboardPage';
import HabitStatsPage from './pages/HabitStatsPage';
import DietPlannerPage from './pages/DietPlannerPage';
import ArchivedHabitsPage from './pages/ArchivedHabitsPage';
import ProgressTrackerPage from './pages/ProgressTrackerPage';

// Import Common Components
import Navbar from './components/common/Navbar';
import ChatbotWidget from './components/chatbot/ChatbotWidget';

// Import Global Styles
import './App.css';

// Layout for Protected Pages
// This component wraps the pages that require login.
// It includes the Navbar and Chatbot, ensuring they only appear when authenticated.
function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/habit/:id" element={<HabitStatsPage />} />
          <Route path="/diet-planner" element={<DietPlannerPage />} />
          <Route path="/archived" element={<ArchivedHabitsPage />} />
          <Route path="/progress-tracker" element={<ProgressTrackerPage />} />
          {/* Redirect any unknown routes inside the protected area to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Chatbot only appears for logged-in users */}
      <ChatbotWidget />
    </div>
  );
}

function App() {
  return (
    <Router>
      {/* 1. AuthProvider wraps the app to provide user state globally */}
      <AuthProvider>
        {/* 2. HabitProvider is nested inside because it might need access to the user */}
        <HabitProvider>
          <Routes>
            {/* --- Public Routes (No Login Required) --- */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* --- Private Routes (Login Required) --- */}
            {/* The PrivateRoute component checks if the user is logged in */}
            <Route element={<PrivateRoute />}>
               {/* If logged in, render the ProtectedLayout for all other paths */}
               <Route path="/*" element={<ProtectedLayout />} />
            </Route>
          </Routes>
        </HabitProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;