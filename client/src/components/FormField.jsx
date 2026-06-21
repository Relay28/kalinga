import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * FormField Component
 * 
 * Reusable form input field with validation support
 * 
 * @component
 * @example
 * <FormField
 *   label="Email"
 *   value={email}
 *   onChange={setEmail}
 *   type="email"
 *   placeholder="Enter email"
 *   error="Invalid email format"
 *   required
 * />
 */
const FormField = React.memo(({
  label,
  value,
  onChange,
  fieldName,
  error,
  isValid,
  type = 'text',
  placeholder = '',
  required = true,
  readOnly = false,
  step,
  onBlur,
  subLabel
}) => {
  const showValidIcon = isValid && value && !readOnly;
  const showError = error && value;
  const inputId = `input-${fieldName || Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const descriptionId = subLabel ? `${inputId}-description` : undefined;

  return (
    <div className="form-group">
      <label htmlFor={inputId}>
        {label} {required && <span style={{ color: 'var(--red-alert)' }} aria-label="required">*</span>}
        {subLabel && (
          <span 
            id={descriptionId}
            className="checkbox-sub" 
            style={{ display: 'block', fontSize: '10px', fontWeight: '400' }}
          >
            {subLabel}
          </span>
        )}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          type={type}
          className={`form-input ${showError ? 'form-input-error' : ''} ${showValidIcon ? 'form-input-valid' : ''}`}
          required={required}
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-label={label}
          aria-invalid={!!showError}
          aria-describedby={[showError && errorId, descriptionId].filter(Boolean).join(' ') || undefined}
          aria-required={required}
        />
        {showValidIcon && (
          <CheckCircle2 
            size={18} 
            style={{ 
              position: 'absolute', 
              right: '8px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--green-normal)',
              pointerEvents: 'none'
            }} 
            aria-hidden="true"
          />
        )}
      </div>
      {showError && (
        <div className="validation-error" id={errorId} role="alert">
          {error}
        </div>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  fieldName: PropTypes.string,
  error: PropTypes.string,
  isValid: PropTypes.bool,
  type: PropTypes.oneOf(['text', 'email', 'tel', 'date', 'number', 'password']),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  readOnly: PropTypes.bool,
  step: PropTypes.string,
  onBlur: PropTypes.func,
  subLabel: PropTypes.string
};

export default FormField;
