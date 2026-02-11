import React from 'react';

/**
 * A reusable loading spinner component.
 *
 * @param {object} props
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - The size of the spinner.
 * @param {string} [props.className=''] - Additional class names for custom styling.
 */
const Loader = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-blue-600 border-t-transparent ${sizes[size]}`}
        style={{ borderTopColor: 'transparent' }} // Fallback for some Tailwind versions
      ></div>
    </div>
  );
};

export default Loader;
