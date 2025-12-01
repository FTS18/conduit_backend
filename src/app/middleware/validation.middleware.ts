import express from 'express';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'boolean' | 'date';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export const validateRequest = (rules: ValidationRule[]) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const errors: string[] = [];
    const data = req.body || req.query;

    for (const rule of rules) {
      const value = data[rule.field];

      // Check if required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Type validation
      const actualType = typeof value;
      if (rule.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${rule.field} must be a valid email`);
        }
      } else if (rule.type === 'number') {
        if (isNaN(Number(value))) {
          errors.push(`${rule.field} must be a number`);
        } else {
          const numValue = Number(value);
          if (rule.min !== undefined && numValue < rule.min) {
            errors.push(`${rule.field} must be at least ${rule.min}`);
          }
          if (rule.max !== undefined && numValue > rule.max) {
            errors.push(`${rule.field} must be at most ${rule.max}`);
          }
        }
      } else if (rule.type === 'date') {
        if (isNaN(Date.parse(value))) {
          errors.push(`${rule.field} must be a valid date`);
        }
      } else if (actualType !== rule.type) {
        errors.push(`${rule.field} must be of type ${rule.type}`);
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors.push(`${rule.field} has invalid format`);
      }

      // String length validation
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min} characters`);
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`${rule.field} must be at most ${rule.max} characters`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        errors,
        status: 'validation_error',
      });
    }

    next();
  };
};
