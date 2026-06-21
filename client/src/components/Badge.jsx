import React from 'react';
import PropTypes from 'prop-types';

/**
 * Badge Component
 * 
 * Reusable badge for status indicators and labels
 * 
 * @component
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="danger" icon="⚠">High Risk</Badge>
 */
const Badge = React.memo(({
  children,
  variant = 'default',
  size = 'medium',
  icon,
  count,
  dot = false,
  className = '',
  style = {}
}) => {
  // Variant styles
  const variantStyles = {
    default: {
      backgroundColor: 'var(--bg-light)',
      color: 'var(--text-dark)',
      border: '1px solid var(--border-color)'
    },
    primary: {
      backgroundColor: 'var(--primary-blue)',
      color: 'white',
      border: 'none'
    },
    success: {
      backgroundColor: 'var(--green-light)',
      color: 'var(--green-normal)',
      border: '1px solid var(--green-normal)'
    },
    warning: {
      backgroundColor: 'var(--orange-light)',
      color: 'var(--orange-alert)',
      border: '1px solid var(--orange-alert)'
    },
    danger: {
      backgroundColor: 'var(--red-light)',
      color: 'var(--red-alert)',
      border: '1px solid var(--red-alert)'
    },
    teal: {
      backgroundColor: 'var(--primary-teal-light)',
      color: 'var(--primary-teal)',
      border: '1px solid var(--primary-teal)'
    },
    info: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
      border: '1px solid #3b82f6'
    }
  };

  // Size styles
  const sizeStyles = {
    small: {
      fontSize: '10px',
      padding: '2px 6px',
      borderRadius: '8px'
    },
    medium: {
      fontSize: '11px',
      padding: '4px 10px',
      borderRadius: '12px'
    },
    large: {
      fontSize: '12px',
      padding: '6px 14px',
      borderRadius: '14px'
    }
  };

  // Dot badge style (notification indicator)
  if (dot) {
    return (
      <span
        className={`badge badge-dot ${className}`}
        style={{
          display: 'inline-block',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: variantStyles[variant]?.backgroundColor || variantStyles.danger.backgroundColor,
          border: '2px solid var(--bg-white)',
          ...style
        }}
        aria-label={children || 'notification indicator'}
      />
    );
  }

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontWeight: '600',
    fontFamily: 'var(--font-display)',
    whiteSpace: 'nowrap',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style
  };

  // Count badge (numeric indicator)
  if (count !== undefined && count !== null) {
    return (
      <span
        className={`badge badge-count ${className}`}
        style={{
          ...badgeStyle,
          minWidth: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
          height: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
          borderRadius: '50%',
          padding: '0',
          fontSize: size === 'small' ? '9px' : size === 'large' ? '11px' : '10px'
        }}
        aria-label={`${count} items`}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  return (
    <span
      className={`badge ${className}`}
      style={badgeStyle}
      role="status"
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {icon && (
        <span className="badge-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children && (
        <span className="badge-text">
          {children}
        </span>
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger', 'teal', 'info']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  icon: PropTypes.node,
  count: PropTypes.number,
  dot: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object
};

export default Badge;
