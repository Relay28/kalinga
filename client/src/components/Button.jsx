import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button Component
 * 
 * Reusable button with multiple variants and states
 * 
 * @component
 * @example
 * <Button variant="primary" onClick={handleClick}>
 *   Submit
 * </Button>
 * <Button variant="secondary" disabled>
 *   Cancel
 * </Button>
 */
const Button = React.memo(({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  type = 'button',
  fullWidth = false,
  icon,
  className = '',
  style = {}
}) => {
  // Base classes
  const baseClasses = 'btn';
  
  // Variant classes
  const variantClasses = {
    primary: 'btn-blue',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    teal: 'btn-teal',
    outline: 'btn-outline'
  };

  // Size classes
  const sizeClasses = {
    small: 'btn-sm',
    medium: 'btn-md',
    large: 'btn-lg'
  };

  // Construct class names
  const classes = [
    baseClasses,
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || sizeClasses.medium,
    disabled && 'btn-disabled',
    loading && 'btn-loading',
    fullWidth && 'btn-full-width',
    className
  ].filter(Boolean).join(' ');

  // Construct inline styles
  const buttonStyle = {
    ...style,
    ...(fullWidth && { width: '100%' }),
    ...(disabled && { opacity: 0.6, cursor: 'not-allowed' }),
    ...(loading && { opacity: 0.7, cursor: 'wait' })
  };

  return (
    <button
      type={type}
      className={classes}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      style={buttonStyle}
      aria-busy={loading}
      aria-disabled={disabled}
    >
      {icon && !loading && (
        <span className="btn-icon" style={{ marginRight: children ? '8px' : '0' }}>
          {icon}
        </span>
      )}
      {loading && (
        <span className="btn-spinner" style={{ marginRight: children ? '8px' : '0' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </span>
      )}
      <span className="btn-content">
        {loading ? 'Loading...' : children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'teal', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  fullWidth: PropTypes.bool,
  icon: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object
};

export default Button;
