import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import CalendarView from '../components/calendar/CalendarView.jsx';
import DayDetails from '../components/calendar/DayDetails.jsx';
import Loader from '../components/common/Loader.jsx';
import * as habitService from '../services/habitService.js';

const ProgressTrackerPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateData, setDateData] = useState(null);
  const [monthData, setMonthData] = useState([]);
  const [isLoadingDate, setIsLoadingDate] = useState(false);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [error, setError] = useState(null);

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Fetch data for selected date
  const fetchDateData = async (date) => {
    try {
      setIsLoadingDate(true);
      setError(null);
      const dateStr = formatDate(date);
      const data = await habitService.getHabitsForDate(dateStr);
      setDateData(data);
    } catch (err) {
      console.error('Error fetching date data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load date data');
      setDateData(null);
    } finally {
      setIsLoadingDate(false);
    }
  };

  // Fetch month heatmap data
  const fetchMonthData = async (date) => {
    try {
      setIsLoadingMonth(true);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript months are 0-indexed
      const data = await habitService.getMonthHeatmap(year, month);
      setMonthData(data.data || []);
    } catch (err) {
      console.error('Error fetching month data:', err);
      // Don't set error for month data, just log it
      setMonthData([]);
    } finally {
      setIsLoadingMonth(false);
    }
  };

  // Fetch data when date changes
  useEffect(() => {
    fetchDateData(selectedDate);
    fetchMonthData(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CalendarIcon className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Progress Tracker
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Review your habit progress and plan ahead
              </p>
            </div>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Calendar
              </h2>
              {isLoadingMonth ? (
                <div className="flex justify-center items-center py-20">
                  <Loader size="md" />
                </div>
              ) : (
                <CalendarView
                  value={selectedDate}
                  onChange={handleDateChange}
                  heatmapData={monthData}
                />
              )}
              
              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Completion Rate:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ebedf0' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">None</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#c6e48b' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Low (0-24%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#7bc96f' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Medium (25-49%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#239a3b' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">High (50-74%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#196127' }}></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Very High (75%+)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Day Details */}
          <div>
            <DayDetails dateData={dateData} isLoading={isLoadingDate} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTrackerPage;


