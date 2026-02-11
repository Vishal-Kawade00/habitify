import React from 'react';

/**
 * A reusable button component with multiple variants.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The content inside the button.
 * @param {function} props.onClick - The click event handler.
 * @param {'primary' | 'secondary' | 'danger' | 'ghost'} [props.variant='primary'] - The button style variant.
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - The button size.
 * @param {string} [props.className=''] - Additional class names for custom styling.
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @param {'button' | 'submit' | 'reset'} [props.type='button'] - The native button type.
 * @param {React.ReactNode} [props.icon] - An optional icon element to display before the children.
 */
const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  icon,
  ...props // Pass down any other native button attributes
}) => {
  // Base styles (common to all variants)
  const baseStyles = 'flex items-center justify-center font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 ease-in-out';

  // Styles for different variants
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-400',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-blue-500 dark:text-gray-300 dark:hover:bg-gray-800 disabled:text-gray-400',
  };

  // Styles for different sizes
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const appliedStyles = `
    ${baseStyles}
    ${variants[variant]}
    ${sizes[size]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  return (
    <button
      type={type}
      onClick={onClick}
      className={appliedStyles.trim()}
      disabled={disabled}
      {...props}
    >
      {icon && <span className={children ? 'mr-2' : ''}>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
