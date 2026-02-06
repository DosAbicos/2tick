/**
 * Calculator utility for computed placeholders
 * Supports:
 * - Basic arithmetic: +, -, *, /
 * - Date difference (returns days)
 * - Chained calculations (using results from other calculated fields)
 * - Rounding options (integer or decimal)
 */

/**
 * Parse a date value and return a Date object
 */
const parseDate = (value) => {
  if (!value) return null;
  
  // Handle ISO format (2026-02-15)
  if (typeof value === 'string' && value.includes('-')) {
    return new Date(value);
  }
  
  // Handle DD.MM.YYYY format
  if (typeof value === 'string' && value.includes('.')) {
    const [day, month, year] = value.split('.');
    return new Date(year, month - 1, day);
  }
  
  // Handle Date object
  if (value instanceof Date) {
    return value;
  }
  
  return new Date(value);
};

/**
 * Calculate the difference between two dates in days
 */
const daysBetween = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2 || isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return 0;
  }
  
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get the value of a placeholder, handling calculated fields recursively
 */
const getPlaceholderValue = (name, values, placeholders, calculatedCache = {}) => {
  // Check cache first to avoid infinite loops
  if (calculatedCache[name] !== undefined) {
    return calculatedCache[name];
  }
  
  const config = placeholders[name];
  if (!config) return 0;
  
  // If it's a calculated field, compute it
  if (config.type === 'calculated' && config.formula) {
    const result = computeFormula(config.formula, values, placeholders, calculatedCache);
    calculatedCache[name] = result;
    return result;
  }
  
  // Return the direct value
  const value = values[name];
  
  // For dates, return the Date object for calculations
  if (config.type === 'date') {
    return value;
  }
  
  // For numbers, parse as float
  return parseFloat(value) || 0;
};

/**
 * Evaluate a simple formula with two operands
 */
const evaluateSimpleFormula = (operand1Value, operation, operand2Value, placeholders, op1Name, op2Name) => {
  const op1Config = placeholders[op1Name];
  const op2Config = placeholders[op2Name];
  
  // Handle date operations
  const isDate1 = op1Config?.type === 'date';
  const isDate2 = op2Config?.type === 'date';
  
  if (isDate1 && isDate2 && operation === 'subtract') {
    // Date minus date = days
    return daysBetween(operand1Value, operand2Value);
  }
  
  if ((isDate1 || isDate2) && operation === 'days_between') {
    return Math.abs(daysBetween(operand1Value, operand2Value));
  }
  
  // For numerical operations
  const val1 = isDate1 ? 0 : (parseFloat(operand1Value) || 0);
  const val2 = isDate2 ? 0 : (parseFloat(operand2Value) || 0);
  
  switch (operation) {
    case 'add':
      return val1 + val2;
    case 'subtract':
      return val1 - val2;
    case 'multiply':
      return val1 * val2;
    case 'divide':
      return val2 !== 0 ? val1 / val2 : 0;
    case 'modulo':
      return val2 !== 0 ? val1 % val2 : 0;
    default:
      return 0;
  }
};

/**
 * Tokenize a text formula into tokens
 */
const tokenize = (formula) => {
  const tokens = [];
  let current = '';
  
  for (let i = 0; i < formula.length; i++) {
    const char = formula[i];
    
    if (char === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    
    if (['+', '-', '*', '/', '(', ')'].includes(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }
  
  if (current) {
    tokens.push(current);
  }
  
  return tokens;
};

/**
 * Parse and evaluate a text formula with percentage support
 * Supports: placeholders, numbers, +, -, *, /, parentheses, and percentages (%)
 * Examples: 
 *   - TOTAL_AMOUNT * 15%  → TOTAL_AMOUNT * 0.15
 *   - 100 - 15%           → 100 - (100 * 0.15) = 85
 *   - TOTAL_AMOUNT * PREPAYMENT_PERCENT% → multiply by percent as decimal
 */
const evaluateTextFormula = (textFormula, values, placeholders, calculatedCache) => {
  if (!textFormula) return 0;
  
  try {
    // Replace placeholder names with their values
    let expression = textFormula;
    
    // Find all placeholder names in the formula
    const placeholderNames = Object.keys(placeholders);
    
    // Sort by length descending to avoid partial replacements
    placeholderNames.sort((a, b) => b.length - a.length);
    
    for (const name of placeholderNames) {
      const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (expression.includes(name)) {
        const value = getPlaceholderValue(name, values, placeholders, calculatedCache);
        
        // Handle dates specially
        const config = placeholders[name];
        if (config?.type === 'date') {
          // Store date values for special handling
          expression = expression.replace(regex, `__DATE_${name}__`);
        } else {
          expression = expression.replace(regex, value.toString());
        }
      }
    }
    
    // Handle date subtraction specially
    const dateSubtractionRegex = /__DATE_(\w+)__\s*-\s*__DATE_(\w+)__/g;
    let match;
    while ((match = dateSubtractionRegex.exec(expression)) !== null) {
      const date1Name = match[1];
      const date2Name = match[2];
      const date1 = values[date1Name];
      const date2 = values[date2Name];
      const days = daysBetween(date1, date2);
      expression = expression.replace(match[0], days.toString());
    }
    
    // Remove any remaining date placeholders (shouldn't happen in valid formulas)
    expression = expression.replace(/__DATE_\w+__/g, '0');
    
    // Safely evaluate the mathematical expression
    // Only allow numbers, operators, parentheses, and whitespace
    const safeExpression = expression.replace(/[^0-9+\-*/().]/g, '');
    
    if (!safeExpression) return 0;
    
    // Use Function constructor for safe evaluation
    const result = new Function(`return ${safeExpression}`)();
    return isNaN(result) ? 0 : result;
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return 0;
  }
};

/**
 * Main function to compute a formula
 */
export const computeFormula = (formula, values, placeholders, calculatedCache = {}) => {
  if (!formula) return 0;
  
  let result;
  
  if (formula.useTextFormula && formula.textFormula) {
    // Use text formula
    result = evaluateTextFormula(formula.textFormula, values, placeholders, calculatedCache);
  } else {
    // Use simple formula
    const { operand1, operation, operand2 } = formula;
    
    if (!operand1 || !operand2) return 0;
    
    const val1 = getPlaceholderValue(operand1, values, placeholders, calculatedCache);
    const val2 = getPlaceholderValue(operand2, values, placeholders, calculatedCache);
    
    result = evaluateSimpleFormula(val1, operation, val2, placeholders, operand1, operand2);
  }
  
  // Apply rounding
  if (formula.roundingMode === 'integer') {
    result = Math.round(result);
  } else if (formula.roundingMode === 'decimal') {
    result = Math.round(result * 100) / 100; // 2 decimal places
  }
  
  return result;
};

/**
 * Compute all calculated fields and return updated values
 */
export const computeAllCalculatedFields = (values, placeholders) => {
  const calculatedCache = {};
  const updatedValues = { ...values };
  
  // Find all calculated fields
  const calculatedFields = Object.entries(placeholders)
    .filter(([_, config]) => config.type === 'calculated' && config.formula)
    .map(([name]) => name);
  
  // Compute each calculated field
  for (const name of calculatedFields) {
    const config = placeholders[name];
    const result = computeFormula(config.formula, values, placeholders, calculatedCache);
    updatedValues[name] = result;
    calculatedCache[name] = result;
  }
  
  return updatedValues;
};

export default {
  computeFormula,
  computeAllCalculatedFields,
  daysBetween
};
