import React, { useState, useContext } from 'react';
import { HabitContext } from '../context/HabitContext.jsx';
import HabitList from '../components/habit/HabitList.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import AddHabitForm from '../components/habit/AddHabitForm.jsx';
import Loader from '../components/common/Loader.jsx';
import useMidnightRefresh from '../hooks/useMidnightRefresh.js';
import { Plus, Target } from 'lucide-react';

const DashboardPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const { 
    habits, 
    completions, 
    isLoading, 
    error, 
    addHabit, 
    updateHabit,
    checkInHabit,
    uncheckHabit,
    archiveHabit,
    deleteHabit,
    clearError,
    fetchTodaysDueHabits
  } = useContext(HabitContext);

  // Auto-refresh at midnight
  useMidnightRefresh(() => {
    console.log('Midnight reached - refreshing today\'s habits');
    fetchTodaysDueHabits();
  }, [fetchTodaysDueHabits]);

  const handleAddHabit = async (habitData) => {
    try {
      clearError(); // Clear any previous errors
      if (editingHabit) {
        await updateHabit(editingHabit._id, habitData);
        setEditingHabit(null);
      } else {
        await addHabit(habitData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving habit:', error);
      // Error is already set in context, modal will stay open so user can retry
    }
  };

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleArchiveHabit = async (habit) => {
    try {
      await archiveHabit(habit._id);
    } catch (error) {
      console.error('Error archiving habit:', error);
    }
  };

  const handleDeleteHabit = async (habit) => {
    try {
      await deleteHabit(habit._id);
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const handleCheckIn = async (habit) => {
    try {
      await checkInHabit(habit._id);
    } catch (error) {
      console.error('Error checking in habit:', error);
    }
  };

  const handleUncheck = async (habit) => {
    try {
      await uncheckHabit(habit._id);
    } catch (error) {
      console.error('Error unchecking habit:', error);
    }
  };

  // Calculate today's stats
  const getTodayStats = () => {
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    
    const todayHabits = habits.filter((habit) => {
      if (habit.frequency?.type === 'daily') return true;
      if (habit.frequency?.type === 'specific') {
        return habit.frequency.days && habit.frequency.days[todayIndex];
      }
      return false;
    });

    const completedCount = todayHabits.filter((habit) => {
      const data = completions[habit._id] || {};
      if (habit.goal?.type === 'target') {
        return (data.progress || 0) >= (habit.goal?.target || 1);
      }
      return data.completed || false;
    }).length;

    return {
      total: todayHabits.length,
      completed: completedCount,
      remaining: todayHabits.length - completedCount,
      percentage: todayHabits.length > 0 
        ? Math.round((completedCount / todayHabits.length) * 100) 
        : 0
    };
  };

  const stats = getTodayStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header Section */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Dashboard
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              size="lg"
              className="hidden sm:flex"
            >
              <Plus size={20} className="mr-2" />
              Add Habit
            </Button>
          </div>

          {/* Stats Cards */}
          {!isLoading && habits.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Today's Progress
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.percentage}%
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Target className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Completed
                    </p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {stats.completed}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Remaining
                    </p>
                    <p className="text-3xl font-bold text-red-500 dark:text-red-500 mt-1">
                      {stats.remaining}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Today
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Mobile Add Button */}
        <div className="mb-6 sm:hidden">
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            className="w-full"
          >
            <Plus size={20} className="mr-2" />
            Add New Habit
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main>
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader size="lg" />
            </div>
          ) : habits.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 mb-6">
                <Target className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No habits yet!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Start building better habits today. Click the button above to create your first habit and begin your journey.
              </p>
              <p className="text-xl text-gray-700 dark:text-gray-100 mb-6 max-w-md mx-auto">
                Every expert was once a beginner!
              </p>
            </div>
          ) : (
            <HabitList
              title="Today's Habits"
              habits={habits}
              completions={completions}
              onCheckIn={handleCheckIn}
              onUncheck={handleUncheck}
              onEdit={handleEditHabit}
              onArchive={handleArchiveHabit}
              onDelete={handleDeleteHabit}
            />
          )}
        </main>

        {/* Add/Edit Habit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingHabit(null);
          }}
          title={editingHabit ? "Edit Habit" : "Create a New Habit"}
        >
          <AddHabitForm 
            habit={editingHabit}
            onSubmit={handleAddHabit}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingHabit(null);
            }}
          />
        </Modal>
      </div>
    </div>
  );
};

export default DashboardPage;