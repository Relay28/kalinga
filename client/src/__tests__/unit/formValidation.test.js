import { describe, it, expect } from 'vitest';

describe('Form Validation Functions', () => {
  // PhilHealth ID validation
  const validatePhilHealth = (value) => {
    if (!value) return 'PhilHealth number is required';
    const philhealthRegex = /^\d{2}-\d{9}-\d{1}$/;
    if (!philhealthRegex.test(value)) {
      return 'Invalid format. Use: XX-XXXXXXXXX-X';
    }
    return null;
  };

  // Mobile validation
  const validateMobile = (value) => {
    if (!value) return 'Mobile number is required';
    const mobileRegex = /^(09\d{2}-?\d{3}-?\d{4})$/;
    if (!mobileRegex.test(value.replace(/-/g, ''))) {
      return 'Invalid mobile number format';
    }
    return null;
  };

  // Blood pressure validation
  const validateBloodPressure = (value) => {
    if (!value) return 'Blood pressure is required';
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    if (!bpRegex.test(value)) {
      return 'Format: systolic/diastolic (e.g., 120/80)';
    }
    const [systolic, diastolic] = value.split('/').map(Number);
    if (systolic < 70 || systolic > 250) {
      return 'Systolic must be between 70-250';
    }
    if (diastolic < 40 || diastolic > 150) {
      return 'Diastolic must be between 40-150';
    }
    return null;
  };

  // Weight validation
  const validateWeight = (value) => {
    if (!value) return 'Weight is required';
    const w = parseFloat(value);
    if (isNaN(w) || w < 30 || w > 200) {
      return 'Weight must be between 30-200 kg';
    }
    return null;
  };

  // Height validation
  const validateHeight = (value) => {
    if (!value) return 'Height is required';
    const h = parseFloat(value);
    if (isNaN(h) || h < 100 || h > 250) {
      return 'Height must be between 100-250 cm';
    }
    return null;
  };

  describe('PhilHealth ID Validation', () => {
    it('should accept valid PhilHealth ID format', () => {
      expect(validatePhilHealth('71-024481935-2')).toBeNull();
      expect(validatePhilHealth('12-345678901-2')).toBeNull();
    });

    it('should reject invalid PhilHealth ID formats', () => {
      expect(validatePhilHealth('123-45678901-2')).toContain('Invalid format');
      expect(validatePhilHealth('12-34567890-2')).toContain('Invalid format');
      expect(validatePhilHealth('12-3456789012-2')).toContain('Invalid format');
      expect(validatePhilHealth('AB-123456789-1')).toContain('Invalid format');
    });

    it('should reject empty PhilHealth ID', () => {
      expect(validatePhilHealth('')).toContain('required');
      expect(validatePhilHealth(null)).toContain('required');
    });
  });

  describe('Mobile Number Validation', () => {
    it('should accept valid mobile numbers', () => {
      expect(validateMobile('0917-123-4567')).toBeNull();
      expect(validateMobile('09171234567')).toBeNull();
    });

    it('should reject invalid mobile numbers', () => {
      expect(validateMobile('0817-123-4567')).toContain('Invalid');
      expect(validateMobile('917-123-4567')).toContain('Invalid');
      expect(validateMobile('0917-123-456')).toContain('Invalid');
    });

    it('should reject empty mobile number', () => {
      expect(validateMobile('')).toContain('required');
    });
  });

  describe('Blood Pressure Validation', () => {
    it('should accept valid blood pressure ranges', () => {
      expect(validateBloodPressure('120/80')).toBeNull();
      expect(validateBloodPressure('155/95')).toBeNull();
      expect(validateBloodPressure('70/40')).toBeNull();
      expect(validateBloodPressure('250/150')).toBeNull();
    });

    it('should reject invalid blood pressure formats', () => {
      expect(validateBloodPressure('120-80')).toContain('Format');
      expect(validateBloodPressure('120')).toContain('Format');
      expect(validateBloodPressure('120/')).toContain('Format');
    });

    it('should reject out of range values', () => {
      expect(validateBloodPressure('69/80')).toContain('Systolic');
      expect(validateBloodPressure('251/80')).toContain('Systolic');
      expect(validateBloodPressure('120/39')).toContain('Diastolic');
      expect(validateBloodPressure('120/151')).toContain('Diastolic');
    });

    it('should reject empty blood pressure', () => {
      expect(validateBloodPressure('')).toContain('required');
    });
  });

  describe('Weight Validation', () => {
    it('should accept valid weights', () => {
      expect(validateWeight('50')).toBeNull();
      expect(validateWeight('79.5')).toBeNull();
      expect(validateWeight('30')).toBeNull();
      expect(validateWeight('200')).toBeNull();
    });

    it('should reject out of range weights', () => {
      expect(validateWeight('29')).toContain('between 30-200');
      expect(validateWeight('201')).toContain('between 30-200');
    });

    it('should reject invalid weight values', () => {
      expect(validateWeight('abc')).toContain('between 30-200');
      expect(validateWeight('')).toContain('required');
    });
  });

  describe('Height Validation', () => {
    it('should accept valid heights', () => {
      expect(validateHeight('150')).toBeNull();
      expect(validateHeight('160')).toBeNull();
      expect(validateHeight('100')).toBeNull();
      expect(validateHeight('250')).toBeNull();
    });

    it('should reject out of range heights', () => {
      expect(validateHeight('99')).toContain('between 100-250');
      expect(validateHeight('251')).toContain('between 100-250');
    });

    it('should reject invalid height values', () => {
      expect(validateHeight('xyz')).toContain('between 100-250');
      expect(validateHeight('')).toContain('required');
    });
  });
});
