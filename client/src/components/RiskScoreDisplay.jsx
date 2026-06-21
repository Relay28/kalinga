import React from 'react';
import PropTypes from 'prop-types';
import '../styles/risk-score-display.css';

/**
 * RiskScoreDisplay Component
 * 
 * Displays risk score with circular progress indicator and color-coded severity
 * 
 * Requirements: 7.8, 7.9, 7.10
 * Task 9.2: Display risk factor breakdown with score contributions
 * 
 * @param {Object} props
 * @param {number} props.riskScore - Risk percentage (5-95)
 * @param {string} props.riskLevel - 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK'
 * @param {Array<string>} props.riskFactors - Optional list of contributing factors
 * @param {string} props.size - 'small' | 'medium' | 'large' (default: 'medium')
 */
const RiskScoreDisplay = React.memo(({ riskScore, riskLevel, riskFactors, size = 'medium' }) => {
  // Determine if a factor is high-impact (pushed into higher risk category)
  // High-impact factors: BP ≥140/90 (+25 or +35), BMI ≥30 (+8), Chronic HTN (+20)
  const isHighImpactFactor = (factor) => {
    if (!factor) return false;
    const factorLower = factor.toLowerCase();
    
    // Check for high BP contributions
    if (factorLower.includes('blood pressure') && 
        (factorLower.includes('(+35)') || factorLower.includes('(+25)'))) {
      return true;
    }
    
    // Check for high BMI or chronic conditions
    if (factorLower.includes('bmi ≥30') || 
        factorLower.includes('chronic hypertension') ||
        factorLower.includes('diabetes')) {
      return true;
    }
    
    return false;
  };
  // Determine color based on risk level
  const getRiskColor = () => {
    if (riskScore >= 70) return 'var(--red-alert)';
    if (riskScore >= 40) return 'var(--orange-alert)';
    return 'var(--green-normal)';
  };

  const getRiskBgColor = () => {
    if (riskScore >= 70) return 'var(--red-light)';
    if (riskScore >= 40) return 'var(--orange-light)';
    return 'var(--green-light)';
  };

  const color = getRiskColor();
  const bgColor = getRiskBgColor();

  // Calculate circumference for progress ring
  const radius = size === 'large' ? 80 : size === 'small' ? 50 : 65;
  const circumference = 2 * Math.PI * radius;
  const progress = (riskScore / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className={`risk-score-display risk-score-display-${size}`}>
      {/* Circular Progress Indicator */}
      <div className="risk-score-circle" style={{ '--risk-color': color }}>
        <svg 
          className="risk-score-svg" 
          width={radius * 2 + 20} 
          height={radius * 2 + 20}
          viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
        >
          {/* Background circle */}
          <circle
            cx={(radius * 2 + 20) / 2}
            cy={(radius * 2 + 20) / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx={(radius * 2 + 20) / 2}
            cy={(radius * 2 + 20) / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${(radius * 2 + 20) / 2} ${(radius * 2 + 20) / 2})`}
            className="risk-score-progress"
          />
        </svg>
        
        {/* Center content */}
        <div className="risk-score-center">
          <div className="risk-score-percentage" style={{ color }}>
            {riskScore}%
          </div>
          <div className="risk-score-label" style={{ color }}>
            {riskLevel}
          </div>
        </div>
      </div>

      {/* Risk factors list */}
      {riskFactors && riskFactors.length > 0 && (
        <div className="risk-factors-section">
          <div className="risk-factors-title">
            Factors contributing to this score:
          </div>
          <div className="risk-factors-list">
            {riskFactors.map((factor, index) => {
              const isHighImpact = isHighImpactFactor(factor);
              return (
                <div 
                  key={index} 
                  className={`risk-factor-item ${isHighImpact ? 'high-impact' : ''}`}
                  style={{
                    fontWeight: isHighImpact ? '600' : '400',
                    backgroundColor: isHighImpact ? bgColor : 'transparent',
                    padding: isHighImpact ? '6px 10px' : '4px 0',
                    borderRadius: isHighImpact ? '6px' : '0',
                    marginBottom: isHighImpact ? '4px' : '2px'
                  }}
                >
                  <span className="risk-factor-bullet" style={{ color }}>●</span>
                  <span className="risk-factor-text">{factor}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

RiskScoreDisplay.displayName = 'RiskScoreDisplay';

RiskScoreDisplay.propTypes = {
  riskScore: PropTypes.number.isRequired,
  riskLevel: PropTypes.oneOf(['LOW RISK', 'MODERATE RISK', 'HIGH RISK']).isRequired,
  riskFactors: PropTypes.arrayOf(PropTypes.string),
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default RiskScoreDisplay;
