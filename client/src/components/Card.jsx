import React from 'react';
import PropTypes from 'prop-types';

/**
 * Card Component
 * 
 * Reusable card container for consistent layout
 * 
 * @component
 * @example
 * <Card title="Patient Info" variant="outlined">
 *   <p>Card content here</p>
 * </Card>
 */
const Card = React.memo(({
  children,
  title,
  subtitle,
  variant = 'default',
  padding = 'medium',
  onClick,
  className = '',
  style = {},
  headerAction,
  footer
}) => {
  // Variant styles
  const variantStyles = {
    default: {
      backgroundColor: 'var(--bg-white)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)'
    },
    outlined: {
      backgroundColor: 'var(--bg-white)',
      border: '2px solid var(--border-color)'
    },
    elevated: {
      backgroundColor: 'var(--bg-white)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-md)'
    },
    flat: {
      backgroundColor: 'var(--bg-light)',
      border: 'none'
    },
    teal: {
      backgroundColor: 'var(--primary-teal-light)',
      border: '1px solid var(--primary-teal)',
      borderLeft: '4px solid var(--primary-teal)'
    },
    warning: {
      backgroundColor: 'var(--orange-light)',
      border: '1px solid var(--orange-alert)',
      borderLeft: '4px solid var(--orange-alert)'
    },
    danger: {
      backgroundColor: 'var(--red-light)',
      border: '1px solid var(--red-alert)',
      borderLeft: '4px solid var(--red-alert)'
    },
    success: {
      backgroundColor: 'var(--green-light)',
      border: '1px solid var(--green-normal)',
      borderLeft: '4px solid var(--green-normal)'
    }
  };

  // Padding styles
  const paddingStyles = {
    none: '0',
    small: '8px',
    medium: '14px',
    large: '20px'
  };

  const cardStyle = {
    borderRadius: '12px',
    overflow: 'hidden',
    ...variantStyles[variant],
    ...style
  };

  const contentStyle = {
    padding: paddingStyles[padding] || paddingStyles.medium
  };

  const hasHeader = title || subtitle || headerAction;

  return (
    <div 
      className={`card ${className}`} 
      style={cardStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick && title ? `${title} card` : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
    >
      {hasHeader && (
        <div 
          className="card-header" 
          style={{ 
            padding: paddingStyles[padding] || paddingStyles.medium,
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            {title && (
              <h3 
                className="card-title" 
                style={{ 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  color: 'var(--text-dark)',
                  margin: 0
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p 
                className="card-subtitle" 
                style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)',
                  margin: title ? '4px 0 0 0' : 0
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="card-header-action">
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className="card-content" style={contentStyle}>
        {children}
      </div>
      {footer && (
        <div 
          className="card-footer" 
          style={{ 
            padding: paddingStyles[padding] || paddingStyles.medium,
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-light)'
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
});

Card.displayName = 'Card';

Card.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'outlined', 'elevated', 'flat', 'teal', 'warning', 'danger', 'success']),
  padding: PropTypes.oneOf(['none', 'small', 'medium', 'large']),
  onClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  headerAction: PropTypes.node,
  footer: PropTypes.node
};

export default Card;
