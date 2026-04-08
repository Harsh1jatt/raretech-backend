// ================= VALIDATION UTILITIES =================

const validateRequired = (fields, body) => {
  const missing = fields.filter(field => !body[field] || body[field].toString().trim() === '');
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
};

const validatePassword = (password) => {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  // Optional: Add stronger password validation
  // if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
  //   throw new Error('Password must contain uppercase, lowercase, and numbers');
  // }
};

const validatePhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('Phone number must be 10 digits');
  }
};

const validateObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new Error('Invalid ID format');
  }
};

const validateNumber = (value, fieldName, min = 0, max = Infinity) => {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
};

const validateArray = (arr, fieldName, minLength = 1) => {
  if (!Array.isArray(arr)) {
    throw new Error(`${fieldName} must be an array`);
  }
  if (arr.length < minLength) {
    throw new Error(`${fieldName} must have at least ${minLength} item(s)`);
  }
};

const validateDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  return date;
};

const validateString = (value, fieldName, minLength = 1, maxLength = Infinity) => {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (value.length < minLength || value.length > maxLength) {
    throw new Error(`${fieldName} must be between ${minLength} and ${maxLength} characters`);
  }
};

module.exports = {
  validateRequired,
  validateEmail,
  validatePassword,
  validatePhone,
  validateObjectId,
  validateNumber,
  validateArray,
  validateDate,
  validateString,
};