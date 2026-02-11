import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { HabitContext } from '../context/HabitContext.jsx';
import Loader from '../components/common/Loader.jsx';
import Heatmap from '../components/stats/Heatmap.jsx';
import ProgressChart from '../components/stats/ProgressChart.jsx';
import { ArrowLeft, Target, TrendingUp, Calendar, Award, Flame } from 'lucide-react';
import * as habitService from '../services/habitService.js';

// Helper component for Stat Cards
const StatCard = ({ title, value, icon, unit = 'days', color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]} mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {value}{' '}
            {unit && (
              <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                {unit}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

const HabitStatsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { habits, isLoading: isContextLoading } = useContext(HabitContext);

  const [habit, setHabit] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch habit stats
  useEffect(() => {
    const fetchHabitStats = async () => {
      if (isContextLoading) return;

      try {
        setIsLoading(true);
        setError(null);

        // Find the habit from context
        const foundHabit = habits.find((h) => h._id === id);

        if (!foundHabit) {
          setError('Habit not found');
          setIsLoading(false);
          return;
        }

        setHabit(foundHabit);

        // Fetch stats from the API
        const habitStats = await habitService.getHabitStats(id);
        setStats(habitStats);
      } catch (err) {
        console.error('Error fetching habit stats:', err);
        setError(err.message || 'Failed to load habit statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHabitStats();
  }, [id, habits, isContextLoading]);

  // Calculate completion rate (only count days when habit should be done)
  const getCompletionRate = () => {
    if (!stats?.heatmapData || stats.heatmapData.length === 0 || !habit) return 0;
    
    // Get all days when habit was completed
    const completedDays = stats.heatmapData.filter(day => day.count > 0);
    
    // Count only relevant days based on frequency
    let relevantDays = 0;
    const today = new Date();
    
    // For daily habits, count all days in heatmap
    if (habit.frequency?.type === 'daily') {
      relevantDays = stats.heatmapData.length;
    } else if (habit.frequency?.type === 'specific' && habit.frequency?.days) {
      // For specific days, count only those days
      stats.heatmapData.forEach(dayData => {
        const date = new Date(dayData.date);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        // Convert to our day index (0 = Monday, 6 = Sunday)
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        if (habit.frequency.days.includes(dayIndex)) {
          relevantDays++;
        }
      });
    }
    
    if (relevantDays === 0) return 0;
    
    const completedRelevantDays = completedDays.filter(dayData => {
      const date = new Date(dayData.date);
      const dayOfWeek = date.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      if (habit.frequency?.type === 'daily') return true;
      if (habit.frequency?.type === 'specific' && habit.frequency?.days) {
        return habit.frequency.days.includes(dayIndex);
      }
      return false;
    }).length;
    
    return Math.round((completedRelevantDays / relevantDays) * 100);
  };

  // Calculate total completions
  const getTotalCompletions = () => {
    if (!stats?.heatmapData) return 0;
    return stats.heatmapData.reduce((sum, day) => sum + day.count, 0);
  };

  // Handle loading state
  if (isLoading || isContextLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Loader size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Loading habit statistics...
        </p>
      </div>
    );
  }

  // Handle error state
  if (error || !habit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {error || 'Habit Not Found'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The habit you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Dashboard
          </Link>

          {/* Habit Header */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-2 h-16 rounded-full"
              style={{ backgroundColor: habit.color || '#3b82f6' }}
            />
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {habit.name}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Track your progress and celebrate your achievements
              </p>
            </div>
          </div>
        </header>

        <main className="space-y-8">
          {/* Key Stats Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Current Streak"
              value={stats?.currentStreak || 0}
              icon={<Flame size={24} />}
              unit="days"
              color="orange"
            />
            <StatCard
              title="Longest Streak"
              value={stats?.longestStreak || 0}
              icon={<Award size={24} />}
              unit="days"
              color="purple"
            />
            <StatCard
              title="Completion Rate"
              value={getCompletionRate()}
              icon={<Target size={24} />}
              unit="%"
              color="green"
            />
            <StatCard
              title="Total Completions"
              value={getTotalCompletions()}
              icon={<Calendar size={24} />}
              unit="times"
              color="blue"
            />
          </section>

          {/* Heatmap Section */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="text-gray-700 dark:text-gray-300" size={28} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Completion Heatmap
              </h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              {stats?.heatmapData && stats.heatmapData.length > 0 ? (
                <Heatmap
                  data={stats.heatmapData}
                  startDate={new Date(new Date().setDate(new Date().getDate() - 90))}
                  endDate={new Date()}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No completion data available yet. Start tracking this habit to see your progress!
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Progress Chart Section */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-gray-700 dark:text-gray-300" size={28} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Monthly Progress
              </h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              {stats?.chartData && stats.chartData.length > 0 ? (
                <ProgressChart 
                  data={stats.chartData} 
                  dataKey="value"
                  title="Monthly Progress"
                  fillColor={habit.color || '#3b82f6'} 
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No monthly data available yet. Keep tracking to see your trends!
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Additional Insights */}
          {stats?.currentStreak > 0 && (
            <section className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-full">
                  <Flame className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    🎉 You're on fire!
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    You've completed this habit for {stats.currentStreak} consecutive days. 
                    {stats.currentStreak >= stats.longestStreak 
                      ? " That's your best streak yet! Keep it going! 🚀"
                      : ` Keep going to beat your record of ${stats.longestStreak} days! 💪`
                    }
                  </p>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default HabitStatsPage;