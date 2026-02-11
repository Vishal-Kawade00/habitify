import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * A responsive bar chart to show habit progress over time.
 *
 * @param {object} props
 * @param {Array<object>} props.data - The data to display (e.g., [{ name: 'Week 1', completed: 5 }]).
 * @param {string} props.dataKey - The key in the data object to plot (e.g., "completed").
 * @param {string} props.title - The title for the chart.
 * @param {string} [props.fillColor="#8884d8"] - The hex color for the bars.
 */
const ProgressChart = ({
  data,
  dataKey = 'value', // Default dataKey
  title = 'Monthly Progress',
  fillColor = '#3b82f6', // blue-500
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm w-full h-64 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Not enough data to display chart.
        </p>
      </div>
    );
  }

  // Use a simple check for dark mode to adjust text color
  // Note: Recharts doesn't natively support Tailwind dark: prefixes on its SVG elements.
  const isDarkMode = document.documentElement.classList.contains('dark');
  const tickColor = isDarkMode ? '#9ca3af' : '#6b7280'; // gray-400 : gray-500

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm w-full h-80">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: -10, // Adjust to pull Y-axis labels closer
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDarkMode ? '#374151' : '#e5e7eb'} // gray-700 : gray-200
          />
          <XAxis dataKey="name" stroke={tickColor} fontSize={12} />
          <YAxis
            allowDecimals={false}
            stroke={tickColor}
            fontSize={12}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', // gray-800 : white
              borderColor: isDarkMode ? '#374151' : '#e5e7eb', // gray-700 : gray-200
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: isDarkMode ? '#f9fafb' : '#111827' }} // gray-50 : gray-900
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Bar dataKey={dataKey} fill={fillColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;

