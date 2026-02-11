import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

/**
 * CalendarView - Calendar component with heatmap styling
 * 
 * @param {object} props
 * @param {Date} props.value - Currently selected date
 * @param {function} props.onChange - Callback when date is selected
 * @param {Array} props.heatmapData - Array of { date, color, completedCount, totalCount }
 * @param {string} props.className - Additional CSS classes
 */
const CalendarView = ({ value, onChange, heatmapData = [], className = '' }) => {
  // Format date to YYYY-MM-DD for matching
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Get heatmap data for a specific date
  const getDayData = (date) => {
    const dateStr = formatDate(date);
    return heatmapData.find(d => d.date === dateStr);
  };

  // Custom tile content
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayData = getDayData(date);
      
      if (dayData && dayData.totalCount > 0) {
        return (
          <div className="calendar-tile-content">
            <div 
              className="calendar-tile-indicator"
              style={{ backgroundColor: dayData.color }}
            />
            <div className="calendar-tile-text">
              {dayData.completedCount}/{dayData.totalCount}
            </div>
          </div>
        );
      }
    }
    return null;
  };

  // Custom tile className for styling
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dayData = getDayData(date);
      const classes = ['calendar-tile'];
      
      if (dayData) {
        if (dayData.totalCount > 0) {
          classes.push('calendar-tile-has-data');
        }
      }
      
      // Highlight today
      const today = new Date();
      if (formatDate(date) === formatDate(today)) {
        classes.push('calendar-tile-today');
      }
      
      return classes.join(' ');
    }
    return null;
  };

  return (
    <div className={`calendar-view ${className}`}>
      <style>{`
        .react-calendar {
          width: 100%;
          background: white;
          border: 1px solid rgb(229, 231, 235);
          border-radius: 0.5rem;
          font-family: inherit;
          padding: 1rem;
        }
        
        .dark .react-calendar {
          background: rgb(31, 41, 55);
          border-color: rgb(55, 65, 81);
          color: rgb(243, 244, 246);
        }
        
        .react-calendar__navigation {
          display: flex;
          height: 44px;
          margin-bottom: 1em;
        }
        
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 16px;
          margin-top: 8px;
          color: rgb(55, 65, 81);
        }
        
        .dark .react-calendar__navigation button {
          color: rgb(243, 244, 246);
        }
        
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: rgb(243, 244, 246);
          border-radius: 0.375rem;
        }
        
        .dark .react-calendar__navigation button:enabled:hover,
        .dark .react-calendar__navigation button:enabled:focus {
          background-color: rgb(55, 65, 81);
        }
        
        .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.75em;
          color: rgb(107, 114, 128);
        }
        
        .dark .react-calendar__month-view__weekdays {
          color: rgb(156, 163, 175);
        }
        
        .react-calendar__month-view__weekdays__weekday {
          padding: 0.5em;
        }
        
        .react-calendar__month-view__days__day {
          position: relative;
          padding: 0.25rem;
          min-height: 60px;
        }
        
        .react-calendar__tile {
          max-width: 100%;
          padding: 0.5rem;
          background: none;
          text-align: center;
          line-height: 1;
          font-size: 0.875rem;
          color: rgb(55, 65, 81);
          border-radius: 0.375rem;
        }
        
        .dark .react-calendar__tile {
          color: rgb(243, 244, 246);
        }
        
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: rgb(243, 244, 246);
        }
        
        .dark .react-calendar__tile:enabled:hover,
        .dark .react-calendar__tile:enabled:focus {
          background-color: rgb(55, 65, 81);
        }
        
        .react-calendar__tile--active {
          background: rgb(59, 130, 246);
          color: white;
        }
        
        .dark .react-calendar__tile--active {
          background: rgb(59, 130, 246);
          color: white;
        }
        
        .react-calendar__tile--now {
          background: rgb(239, 246, 255);
          font-weight: bold;
        }
        
        .dark .react-calendar__tile--now {
          background: rgb(30, 58, 138);
        }
        
        .calendar-tile-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }
        
        .calendar-tile-indicator {
          width: 100%;
          height: 4px;
          border-radius: 2px;
        }
        
        .calendar-tile-text {
          font-size: 0.625rem;
          color: rgb(107, 114, 128);
          font-weight: 600;
        }
        
        .dark .calendar-tile-text {
          color: rgb(156, 163, 175);
        }
        
        .calendar-tile-today .calendar-tile-text {
          color: rgb(59, 130, 246);
          font-weight: 700;
        }
        
        .dark .calendar-tile-today .calendar-tile-text {
          color: rgb(96, 165, 250);
        }
      `}</style>
      
      <Calendar
        value={value}
        onChange={onChange}
        tileContent={tileContent}
        tileClassName={tileClassName}
        calendarType="gregory"
        showWeekNumbers={false}
        formatShortWeekday={(locale, date) => {
          const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return weekdays[date.getDay()];
        }}
      />
    </div>
  );
};

export default CalendarView;