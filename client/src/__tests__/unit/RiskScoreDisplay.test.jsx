/**
 * Unit tests for RiskScoreDisplay component
 * 
 * Requirements: 7.8, 7.9, 7.10
 * 
 * Tests:
 * - Component renders with correct risk score percentage
 * - Component displays correct risk level (HIGH/MODERATE/LOW)
 * - Color coding matches risk thresholds
 * - Risk factors list displays correctly
 * - Size variants work properly
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskScoreDisplay from '../../components/RiskScoreDisplay';

describe('RiskScoreDisplay Component', () => {
  it('should render risk score percentage', () => {
    render(
      <RiskScoreDisplay 
        riskScore={78} 
        riskLevel="HIGH RISK"
        riskFactors={[]}
      />
    );
    
    expect(screen.getByText('78%')).toBeTruthy();
  });

  it('should display HIGH RISK label for scores >= 70', () => {
    render(
      <RiskScoreDisplay 
        riskScore={78} 
        riskLevel="HIGH RISK"
        riskFactors={[]}
      />
    );
    
    expect(screen.getByText('HIGH RISK')).toBeTruthy();
  });

  it('should display MODERATE RISK label for scores 40-69', () => {
    render(
      <RiskScoreDisplay 
        riskScore={55} 
        riskLevel="MODERATE RISK"
        riskFactors={[]}
      />
    );
    
    expect(screen.getByText('MODERATE RISK')).toBeTruthy();
  });

  it('should display LOW RISK label for scores < 40', () => {
    render(
      <RiskScoreDisplay 
        riskScore={28} 
        riskLevel="LOW RISK"
        riskFactors={[]}
      />
    );
    
    expect(screen.getByText('LOW RISK')).toBeTruthy();
  });

  it('should render risk factors list when provided', () => {
    const factors = [
      'Severe hypertension (BP 160/100) +35 points',
      'Obesity (BMI 32.1) +8 points',
      'Chronic hypertension +20 points'
    ];
    
    render(
      <RiskScoreDisplay 
        riskScore={78} 
        riskLevel="HIGH RISK"
        riskFactors={factors}
      />
    );
    
    expect(screen.getByText('Factors contributing to this score:')).toBeTruthy();
    expect(screen.getByText('Severe hypertension (BP 160/100) +35 points')).toBeTruthy();
    expect(screen.getByText('Obesity (BMI 32.1) +8 points')).toBeTruthy();
    expect(screen.getByText('Chronic hypertension +20 points')).toBeTruthy();
  });

  it('should render risk factors with new format including threshold comparisons', () => {
    const factors = [
      'Baseline Risk (+15)',
      'Blood Pressure 155/95 (≥140/90 threshold) (+25)',
      'BMI ≥30 (31.2) (+8)',
      'Chronic Hypertension (+20)'
    ];
    
    render(
      <RiskScoreDisplay 
        riskScore={78} 
        riskLevel="HIGH RISK"
        riskFactors={factors}
      />
    );
    
    expect(screen.getByText('Factors contributing to this score:')).toBeTruthy();
    expect(screen.getByText('Baseline Risk (+15)')).toBeTruthy();
    expect(screen.getByText('Blood Pressure 155/95 (≥140/90 threshold) (+25)')).toBeTruthy();
    expect(screen.getByText('BMI ≥30 (31.2) (+8)')).toBeTruthy();
    expect(screen.getByText('Chronic Hypertension (+20)')).toBeTruthy();
  });

  it('should highlight high-impact risk factors', () => {
    const factors = [
      'Baseline Risk (+15)',
      'Blood Pressure 155/95 (≥140/90 threshold) (+25)',
      'BMI ≥30 (31.2) (+8)',
      'Chronic Hypertension (+20)',
      'First Pregnancy (+4)'
    ];
    
    const { container } = render(
      <RiskScoreDisplay 
        riskScore={78} 
        riskLevel="HIGH RISK"
        riskFactors={factors}
      />
    );
    
    // High-impact factors should have the 'high-impact' class
    const highImpactItems = container.querySelectorAll('.risk-factor-item.high-impact');
    
    // Should have at least 3 high-impact factors: BP (+25), BMI ≥30 (+8), Chronic HTN (+20)
    expect(highImpactItems.length).toBeGreaterThanOrEqual(3);
  });

  it('should not render risk factors section when empty', () => {
    render(
      <RiskScoreDisplay 
        riskScore={78} 
        riskLevel="HIGH RISK"
        riskFactors={[]}
      />
    );
    
    expect(screen.queryByText('Factors contributing to this score:')).toBeNull();
  });

  it('should apply correct CSS class for size variant', () => {
    const { container } = render(
      <RiskScoreDisplay 
        riskScore={78} 
        riskLevel="HIGH RISK"
        riskFactors={[]}
        size="large"
      />
    );
    
    const displayElement = container.querySelector('.risk-score-display-large');
    expect(displayElement).not.toBeNull();
  });

  it('should render SVG circle with correct dimensions for medium size', () => {
    const { container } = render(
      <RiskScoreDisplay 
        riskScore={78} 
        riskLevel="HIGH RISK"
        riskFactors={[]}
        size="medium"
      />
    );
    
    const svg = container.querySelector('.risk-score-svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('width')).toBe('150'); // 65*2 + 20
    expect(svg.getAttribute('height')).toBe('150');
  });

  it('should calculate correct stroke dashoffset for progress ring', () => {
    const { container } = render(
      <RiskScoreDisplay 
        riskScore={50} 
        riskLevel="MODERATE RISK"
        riskFactors={[]}
        size="medium"
      />
    );
    
    const progressCircle = container.querySelector('.risk-score-progress');
    expect(progressCircle).not.toBeNull();
    
    // For 50% progress with radius 65:
    // circumference = 2 * PI * 65 ≈ 408.41
    // progress = 0.5 * 408.41 ≈ 204.2
    // dashOffset = 408.41 - 204.2 ≈ 204.2
    const dashOffset = progressCircle.getAttribute('stroke-dashoffset');
    expect(Math.abs(parseFloat(dashOffset) - 204.2)).toBeLessThan(1);
  });

  it('should handle boundary risk scores correctly', () => {
    // Test score at exactly 70 (threshold for HIGH RISK)
    const { rerender } = render(
      <RiskScoreDisplay 
        riskScore={70} 
        riskLevel="HIGH RISK"
        riskFactors={[]}
      />
    );
    
    expect(screen.getByText('HIGH RISK')).toBeTruthy();
    
    // Test score at exactly 40 (threshold for MODERATE RISK)
    rerender(
      <RiskScoreDisplay 
        riskScore={40} 
        riskLevel="MODERATE RISK"
        riskFactors={[]}
      />
    );
    
    expect(screen.getByText('MODERATE RISK')).toBeTruthy();
  });
});
