/**
 * Request Validation Middleware using Joi
 * Validates request body, query params, and route params
 */

const Joi = require('joi');
const { AppError } = require('./errorHandler');

/**
 * Validation schemas for different endpoints
 */
const schemas = {
  // Patient validation
  createPatient: Joi.object({
    id: Joi.string().required().messages({
      'string.empty': 'Patient ID (PhilHealth number) is required',
      'any.required': 'Patient ID (PhilHealth number) is required'
    }),
    philhealthId: Joi.string().optional(),
    firstName: Joi.string().required().min(1).max(100).messages({
      'string.empty': 'First name is required',
      'any.required': 'First name is required'
    }),
    middleName: Joi.string().optional().allow('').max(100),
    lastName: Joi.string().required().min(1).max(100).messages({
      'string.empty': 'Last name is required',
      'any.required': 'Last name is required'
    }),
    dob: Joi.string().isoDate().required().messages({
      'string.isoDate': 'Date of birth must be a valid ISO date',
      'any.required': 'Date of birth is required'
    }),
    age: Joi.number().integer().min(0).max(120).optional(),
    mobile: Joi.string().pattern(/^[0-9]{10,15}$/).optional().messages({
      'string.pattern.base': 'Mobile number must be 10-15 digits'
    }),
    bp: Joi.string().pattern(/^\d{2,3}\/\d{2,3}$/).optional().messages({
      'string.pattern.base': 'Blood pressure must be in format: systolic/diastolic (e.g., 120/80)'
    }),
    weight: Joi.number().min(30).max(200).optional().messages({
      'number.min': 'Weight must be at least 30 kg',
      'number.max': 'Weight must not exceed 200 kg'
    }),
    height: Joi.number().min(100).max(250).optional().messages({
      'number.min': 'Height must be at least 100 cm',
      'number.max': 'Height must not exceed 250 cm'
    }),
    bmi: Joi.number().min(10).max(60).optional(),
    lmp: Joi.string().isoDate().optional(),
    history: Joi.string().optional().allow(''),
    location: Joi.string().optional().allow(''),
    midwifeId: Joi.string().optional().allow(''),
    timestamp: Joi.string().optional().allow(''),
    riskFactors: Joi.object({
      hypertension: Joi.boolean().optional(),
      family: Joi.boolean().optional(),
      firstpreg: Joi.boolean().optional(),
      multiple: Joi.boolean().optional(),
      diabetes: Joi.boolean().optional(),
      csection: Joi.boolean().optional(),
      pain: Joi.boolean().optional()
    }).optional(),
    status: Joi.string().optional().allow(''),
    riskScore: Joi.number().min(5).max(95).optional(),
    heartRate: Joi.number().min(60).max(200).optional().allow(null),
    fetalAge: Joi.string().optional().allow('', null),
    review: Joi.object().optional().allow(null)
  }),

  // Scan validation
  createScan: Joi.object({
    id: Joi.string().required().messages({
      'string.empty': 'Scan ID is required',
      'any.required': 'Scan ID is required'
    }),
    patientId: Joi.string().required().messages({
      'string.empty': 'Patient ID is required',
      'any.required': 'Patient ID is required'
    }),
    frames: Joi.array().items(Joi.object()).min(1).max(10).optional().messages({
      'array.min': 'At least 1 frame is required',
      'array.max': 'Maximum 10 frames allowed'
    }),
    riskScore: Joi.number().min(5).max(95).required().messages({
      'number.min': 'Risk score must be between 5 and 95',
      'number.max': 'Risk score must be between 5 and 95',
      'any.required': 'Risk score is required'
    }),
    riskLevel: Joi.string().valid('LOW RISK', 'MODERATE RISK', 'HIGH RISK').optional(),
    status: Joi.string().valid('Submitted', 'Reviewed', 'Failed').optional(),
    timestamp: Joi.string().optional().allow(''),
    patient: Joi.object().optional() // Embedded patient data from client
  }),

  // Specialist verdict validation
  verifyVerdict: Joi.object({
    verdict: Joi.string().valid('Normal', 'High Risk', 'Urgent Referral').required().messages({
      'any.only': 'Verdict must be one of: Normal, High Risk, Urgent Referral',
      'any.required': 'Verdict is required'
    }),
    notes: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Notes must not exceed 1000 characters'
    }),
    specialistName: Joi.string().optional().default('Dr. Duque')
  }),

  // Notification mark as read
  markNotificationRead: Joi.object({
    read: Joi.boolean().optional().default(true)
  })
};

/**
 * Generic validation middleware factory
 */
function validate(schemaName, source = 'body') {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return next(new AppError(`Validation schema '${schemaName}' not found`, 500));
    }

    // Get data to validate based on source
    const dataToValidate = source === 'body' ? req.body :
                           source === 'query' ? req.query :
                           source === 'params' ? req.params :
                           req.body;

    // Validate
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first
      stripUnknown: false, // Allow unknown fields to pass through
      allowUnknown: true
    });

    if (error) {
      // Extract validation error details
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new AppError('Validation failed', 422, details));
    }

    // Replace request data with validated value
    if (source === 'body') req.body = value;
    else if (source === 'query') req.query = value;
    else if (source === 'params') req.params = value;

    next();
  };
}

module.exports = {
  validate,
  schemas
};
