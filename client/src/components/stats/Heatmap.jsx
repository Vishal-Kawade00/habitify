import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

/**
 * A heatmap component to visualize habit completion over time.
 *
 * @param {object} props
 * @param {Array<{date: string, count: number}>} props.data - Array of completion data with date (YYYY-MM-DD) and count
 * @param {Date} [props.startDate] - Optional start date (defaults to 365 days ago)
 * @param {Date} [props.endDate] - Optional end date (defaults to today)
 */
const Heatmap = ({ data = [], startDate, endDate }) => {
  // Default to last 365 days if dates not provided
  const end = endDate || new Date();
  const start = startDate || new Date(new Date().setDate(new Date().getDate() - 365));

  // Transform data to the format expected by react-calendar-heatmap
  // Format: { date: 'YYYY-MM-DD', count: number }
  const heatmapValues = data.map((item) => ({
    date: item.date,
    count: item.count || 0,
  }));

  // Class for each heatmap cell based on count
  const getClassForValue = (value) => {
    if (!value || value.count === 0) {
      return 'color-empty';
    }
    if (value.count === 1) {
      return 'color-scale-1';
    }
    if (value.count === 2) {
      return 'color-scale-2';
    }
    if (value.count >= 3) {
      return 'color-scale-3';
    }
    return 'color-empty';
  };

  // Title for tooltip
  const titleForValue = (value) => {
    if (!value || value.count === 0) {
      return `No completions on ${value?.date || 'this day'}`;
    }
    return `${value.count} ${value.count === 1 ? 'completion' : 'completions'} on ${value.date}`;
  };

  // Check if dark mode is enabled
  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <div className="heatmap-container">
      <style>{`
        .react-calendar-heatmap {
          font-family: inherit;
        }
        .react-calendar-heatmap text {
          font-size: 10px;
          fill: ${isDarkMode ? '#9ca3af' : '#6b7280'};
        }
        .react-calendar-heatmap .react-calendar-heatmap-small-text {
          font-size: 5px;
        }
        .react-calendar-heatmap rect:hover {
          stroke: ${isDarkMode ? '#60a5fa' : '#3b82f6'};
          stroke-width: 2px;
        }
        .react-calendar-heatmap .color-empty {
          fill: ${isDarkMode ? '#374151' : '#e5e7eb'};
        }
        .react-calendar-heatmap .color-scale-1 {
          fill: ${isDarkMode ? '#065f46' : '#34d399'};
        }
        .react-calendar-heatmap .color-scale-2 {
          fill: ${isDarkMode ? '#047857' : '#10b981'};
        }
        .react-calendar-heatmap .color-scale-3 {
          fill: ${isDarkMode ? '#059669' : '#059669'};
        }
        .react-calendar-heatmap .color-scale-4 {
          fill: ${isDarkMode ? '#047857' : '#047857'};
        }
      `}</style>
      <CalendarHeatmap
        startDate={start}
        endDate={end}
        values={heatmapValues}
        classForValue={getClassForValue}
        titleForValue={titleForValue}
        showWeekdayLabels={true}
        onClick={(value) => {
          if (value) {
            console.log(`Clicked on ${value.date}: ${value.count} completions`);
          }
        }}
      />
      <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}></div>
            <div className="w-3 h-3 rounded" style={{ backgroundColor: isDarkMode ? '#065f46' : '#34d399' }}></div>
            <div className="w-3 h-3 rounded" style={{ backgroundColor: isDarkMode ? '#047857' : '#10b981' }}></div>
            <div className="w-3 h-3 rounded" style={{ backgroundColor: isDarkMode ? '#059669' : '#059669' }}></div>
          </div>
          <span>More</span>
        </div>
        <span>{heatmapValues.filter(v => v.count > 0).length} days with completions</span>
      </div>
    </div>
  );
};

export default Heatmap;
