/**
 * Validation utilities for Horizon DevSecOps Portal
 * @module utils/validators
 */

import {
  CRITICALITY_TIER_LIST,
  ENVIRONMENT_LIST,
  DOMAIN_LIST,
  PORTFOLIO_LIST,
  TOOLCHAIN_CATEGORY_LIST,
  TOOL_LIST,
  PIPELINE_STAGE_LIST,
} from '../constants/constants.js';

// ---------------------------------------------------------------------------
// Result factory
// ---------------------------------------------------------------------------

/**
 * Create a successful validation result.
 * @returns {{ valid: true, errors: [] }}
 */
const validResult = () => ({ valid: true, errors: [] });

/**
 * Create a failed validation result.
 * @param {string[]} errors - Array of error message strings.
 * @returns {{ valid: false, errors: string[] }}
 */
const invalidResult = (errors) => ({ valid: false, errors });

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------

/**
 * Validate that a value is present (not null, undefined, or empty string after trim).
 *
 * @param {*} value - The value to check.
 * @param {string} [fieldName='Field'] - Human-readable field name for the error message.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (value === null || value === undefined) {
    return invalidResult([`${fieldName} is required.`]);
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return invalidResult([`${fieldName} is required.`]);
  }

  if (Array.isArray(value) && value.length === 0) {
    return invalidResult([`${fieldName} is required.`]);
  }

  return validResult();
};

/**
 * Validate that a string is a well-formed email address.
 *
 * @param {string|null|undefined} value - The email string to validate.
 * @param {Object} [options]
 * @param {boolean} [options.required=true] - Whether the field is required.
 * @param {string} [options.fieldName='Email'] - Human-readable field name.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateEmail = (value, options = {}) => {
  const { required = true, fieldName = 'Email' } = options;

  if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
    if (required) {
      return invalidResult([`${fieldName} is required.`]);
    }
    return validResult();
  }

  const str = String(value).trim();

  // RFC 5322 simplified pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(str)) {
    return invalidResult([`${fieldName} must be a valid email address.`]);
  }

  if (str.length > 254) {
    return invalidResult([`${fieldName} must not exceed 254 characters.`]);
  }

  return validResult();
};

/**
 * Check whether a string is valid JSON.
 *
 * @param {string|null|undefined} value - The string to parse.
 * @returns {boolean} `true` when the string is valid JSON, `false` otherwise.
 */
export const isValidJSON = (value) => {
  if (value === null || value === undefined || typeof value !== 'string') {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch (_err) {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Application Onboarding Form Validation
// ---------------------------------------------------------------------------

/**
 * Validate the application onboarding form data.
 *
 * @param {Object} formData - The form data object.
 * @param {string} formData.name - Application name.
 * @param {string} formData.shortCode - Short code identifier.
 * @param {string} formData.description - Application description.
 * @param {string} formData.domainName - Domain name.
 * @param {string} formData.portfolioName - Portfolio name.
 * @param {string} formData.criticalityTier - Criticality tier.
 * @param {string} formData.ownerName - Owner display name.
 * @param {string} formData.ownerEmail - Owner email address.
 * @param {string[]} [formData.environments] - Selected environments.
 * @param {string[]} [formData.techStack] - Technology stack entries.
 * @param {string} [formData.repoUrl] - Repository URL.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateOnboardingForm = (formData) => {
  const errors = [];

  if (!formData || typeof formData !== 'object') {
    return invalidResult(['Form data is required.']);
  }

  // Name
  const nameResult = validateRequired(formData.name, 'Application name');
  if (!nameResult.valid) {
    errors.push(...nameResult.errors);
  } else if (typeof formData.name === 'string') {
    if (formData.name.trim().length < 2) {
      errors.push('Application name must be at least 2 characters.');
    }
    if (formData.name.trim().length > 100) {
      errors.push('Application name must not exceed 100 characters.');
    }
  }

  // Short code
  const shortCodeResult = validateRequired(formData.shortCode, 'Short code');
  if (!shortCodeResult.valid) {
    errors.push(...shortCodeResult.errors);
  } else if (typeof formData.shortCode === 'string') {
    const code = formData.shortCode.trim();
    if (code.length < 2 || code.length > 10) {
      errors.push('Short code must be between 2 and 10 characters.');
    }
    if (!/^[A-Za-z0-9]+$/.test(code)) {
      errors.push('Short code must contain only alphanumeric characters.');
    }
  }

  // Description
  const descResult = validateRequired(formData.description, 'Description');
  if (!descResult.valid) {
    errors.push(...descResult.errors);
  } else if (typeof formData.description === 'string' && formData.description.trim().length > 500) {
    errors.push('Description must not exceed 500 characters.');
  }

  // Domain
  const domainResult = validateRequired(formData.domainName, 'Domain');
  if (!domainResult.valid) {
    errors.push(...domainResult.errors);
  } else if (typeof formData.domainName === 'string' && !DOMAIN_LIST.includes(formData.domainName)) {
    errors.push('Domain must be a valid domain name.');
  }

  // Portfolio
  const portfolioResult = validateRequired(formData.portfolioName, 'Portfolio');
  if (!portfolioResult.valid) {
    errors.push(...portfolioResult.errors);
  } else if (typeof formData.portfolioName === 'string' && !PORTFOLIO_LIST.includes(formData.portfolioName)) {
    errors.push('Portfolio must be a valid portfolio name.');
  }

  // Criticality tier
  const critResult = validateRequired(formData.criticalityTier, 'Criticality tier');
  if (!critResult.valid) {
    errors.push(...critResult.errors);
  } else if (typeof formData.criticalityTier === 'string' && !CRITICALITY_TIER_LIST.includes(formData.criticalityTier)) {
    errors.push('Criticality tier must be a valid tier.');
  }

  // Owner name
  const ownerNameResult = validateRequired(formData.ownerName, 'Owner name');
  if (!ownerNameResult.valid) {
    errors.push(...ownerNameResult.errors);
  }

  // Owner email (optional field — only validate format when provided)
  if (formData.ownerEmail !== null && formData.ownerEmail !== undefined && String(formData.ownerEmail).trim().length > 0) {
    const emailResult = validateEmail(formData.ownerEmail, { required: false, fieldName: 'Owner email' });
    if (!emailResult.valid) {
      errors.push(...emailResult.errors);
    }
  }

  // Environments
  if (formData.environments !== null && formData.environments !== undefined) {
    if (!Array.isArray(formData.environments)) {
      errors.push('Environments must be an array.');
    } else if (formData.environments.length === 0) {
      errors.push('At least one environment must be selected.');
    } else {
      const invalidEnvs = formData.environments.filter((env) => !ENVIRONMENT_LIST.includes(env));
      if (invalidEnvs.length > 0) {
        errors.push(`Invalid environment(s): ${invalidEnvs.join(', ')}.`);
      }
    }
  }

  // Tech stack
  if (formData.techStack !== null && formData.techStack !== undefined) {
    if (!Array.isArray(formData.techStack)) {
      errors.push('Tech stack must be an array.');
    }
  }

  // Repo URL
  if (formData.repoUrl !== null && formData.repoUrl !== undefined && String(formData.repoUrl).trim().length > 0) {
    const url = String(formData.repoUrl).trim();
    try {
      new URL(url);
    } catch (_err) {
      errors.push('Repository URL must be a valid URL.');
    }
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
};

// ---------------------------------------------------------------------------
// CSV Data Validation
// ---------------------------------------------------------------------------

/**
 * Required column headers for CSV application import.
 * @type {string[]}
 */
const CSV_REQUIRED_COLUMNS = [
  'name',
  'shortCode',
  'description',
  'domainName',
  'portfolioName',
  'criticalityTier',
  'ownerName',
];

/**
 * Validate parsed CSV data for bulk application import.
 *
 * @param {Array<Object>} data - Array of row objects (e.g. from PapaParse).
 * @param {Object} [options]
 * @param {number} [options.maxRows=500] - Maximum number of rows allowed.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateCSVData = (data, options = {}) => {
  const { maxRows = 500 } = options;
  const errors = [];

  if (!data || !Array.isArray(data)) {
    return invalidResult(['CSV data must be an array of row objects.']);
  }

  if (data.length === 0) {
    return invalidResult(['CSV file contains no data rows.']);
  }

  if (data.length > maxRows) {
    errors.push(`CSV file exceeds the maximum of ${maxRows} rows (found ${data.length}).`);
  }

  // Check required columns exist in the first row
  const firstRow = data[0];
  if (typeof firstRow !== 'object' || firstRow === null) {
    return invalidResult(['CSV data rows must be objects.']);
  }

  const columns = Object.keys(firstRow);
  const missingColumns = CSV_REQUIRED_COLUMNS.filter((col) => !columns.includes(col));
  if (missingColumns.length > 0) {
    errors.push(`Missing required column(s): ${missingColumns.join(', ')}.`);
  }

  // Validate each row
  if (missingColumns.length === 0) {
    data.forEach((row, index) => {
      const rowNum = index + 1;

      CSV_REQUIRED_COLUMNS.forEach((col) => {
        const val = row[col];
        if (val === null || val === undefined || String(val).trim().length === 0) {
          errors.push(`Row ${rowNum}: "${col}" is required.`);
        }
      });

      // Validate domain name if present
      if (row.domainName && typeof row.domainName === 'string' && row.domainName.trim().length > 0) {
        if (!DOMAIN_LIST.includes(row.domainName.trim())) {
          errors.push(`Row ${rowNum}: "${row.domainName}" is not a valid domain.`);
        }
      }

      // Validate criticality tier if present
      if (row.criticalityTier && typeof row.criticalityTier === 'string' && row.criticalityTier.trim().length > 0) {
        if (!CRITICALITY_TIER_LIST.includes(row.criticalityTier.trim())) {
          errors.push(`Row ${rowNum}: "${row.criticalityTier}" is not a valid criticality tier.`);
        }
      }

      // Validate short code format if present
      if (row.shortCode && typeof row.shortCode === 'string' && row.shortCode.trim().length > 0) {
        const code = row.shortCode.trim();
        if (!/^[A-Za-z0-9]+$/.test(code)) {
          errors.push(`Row ${rowNum}: Short code must contain only alphanumeric characters.`);
        }
      }
    });
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
};

// ---------------------------------------------------------------------------
// Excel Data Validation
// ---------------------------------------------------------------------------

/**
 * Validate parsed Excel data for bulk application import.
 * Follows the same rules as CSV validation but accepts sheet-level metadata.
 *
 * @param {Array<Object>} data - Array of row objects (e.g. from xlsx).
 * @param {Object} [options]
 * @param {number} [options.maxRows=500] - Maximum number of rows allowed.
 * @param {string} [options.sheetName='Sheet1'] - Name of the sheet being validated.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateExcelData = (data, options = {}) => {
  const { maxRows = 500, sheetName = 'Sheet1' } = options;
  const errors = [];

  if (!data || !Array.isArray(data)) {
    return invalidResult([`Sheet "${sheetName}": Data must be an array of row objects.`]);
  }

  if (data.length === 0) {
    return invalidResult([`Sheet "${sheetName}": No data rows found.`]);
  }

  if (data.length > maxRows) {
    errors.push(`Sheet "${sheetName}": Exceeds the maximum of ${maxRows} rows (found ${data.length}).`);
  }

  // Check required columns exist in the first row
  const firstRow = data[0];
  if (typeof firstRow !== 'object' || firstRow === null) {
    return invalidResult([`Sheet "${sheetName}": Data rows must be objects.`]);
  }

  const columns = Object.keys(firstRow);
  const missingColumns = CSV_REQUIRED_COLUMNS.filter((col) => !columns.includes(col));
  if (missingColumns.length > 0) {
    errors.push(`Sheet "${sheetName}": Missing required column(s): ${missingColumns.join(', ')}.`);
  }

  // Validate each row
  if (missingColumns.length === 0) {
    data.forEach((row, index) => {
      const rowNum = index + 1;

      CSV_REQUIRED_COLUMNS.forEach((col) => {
        const val = row[col];
        if (val === null || val === undefined || String(val).trim().length === 0) {
          errors.push(`Sheet "${sheetName}", Row ${rowNum}: "${col}" is required.`);
        }
      });

      // Validate domain name if present
      if (row.domainName && typeof row.domainName === 'string' && row.domainName.trim().length > 0) {
        if (!DOMAIN_LIST.includes(row.domainName.trim())) {
          errors.push(`Sheet "${sheetName}", Row ${rowNum}: "${row.domainName}" is not a valid domain.`);
        }
      }

      // Validate criticality tier if present
      if (row.criticalityTier && typeof row.criticalityTier === 'string' && row.criticalityTier.trim().length > 0) {
        if (!CRITICALITY_TIER_LIST.includes(row.criticalityTier.trim())) {
          errors.push(`Sheet "${sheetName}", Row ${rowNum}: "${row.criticalityTier}" is not a valid criticality tier.`);
        }
      }

      // Validate short code format if present
      if (row.shortCode && typeof row.shortCode === 'string' && row.shortCode.trim().length > 0) {
        const code = row.shortCode.trim();
        if (!/^[A-Za-z0-9]+$/.test(code)) {
          errors.push(`Sheet "${sheetName}", Row ${rowNum}: Short code must contain only alphanumeric characters.`);
        }
      }
    });
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
};

// ---------------------------------------------------------------------------
// Toolchain Selection Validation
// ---------------------------------------------------------------------------

/**
 * Validate a toolchain selection for an application.
 *
 * @param {Array<Object>} selections - Array of tool selection objects.
 * @param {string} selections[].category - Toolchain category.
 * @param {string} selections[].tool - Tool name.
 * @param {Object} [options]
 * @param {string[]} [options.requiredCategories] - Categories that must have at least one tool selected.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateToolchainSelection = (selections, options = {}) => {
  const { requiredCategories = [] } = options;
  const errors = [];

  if (!selections || !Array.isArray(selections)) {
    return invalidResult(['Toolchain selections must be an array.']);
  }

  // Validate each selection entry
  selections.forEach((selection, index) => {
    if (!selection || typeof selection !== 'object') {
      errors.push(`Selection ${index + 1}: Must be an object with "category" and "tool" properties.`);
      return;
    }

    if (!selection.category || typeof selection.category !== 'string' || selection.category.trim().length === 0) {
      errors.push(`Selection ${index + 1}: "category" is required.`);
    } else if (!TOOLCHAIN_CATEGORY_LIST.includes(selection.category)) {
      errors.push(`Selection ${index + 1}: "${selection.category}" is not a valid toolchain category.`);
    }

    if (!selection.tool || typeof selection.tool !== 'string' || selection.tool.trim().length === 0) {
      errors.push(`Selection ${index + 1}: "tool" is required.`);
    } else if (!TOOL_LIST.includes(selection.tool)) {
      errors.push(`Selection ${index + 1}: "${selection.tool}" is not a recognized tool.`);
    }
  });

  // Check required categories
  if (requiredCategories.length > 0 && selections.length > 0) {
    const selectedCategories = new Set(
      selections
        .filter((s) => s && typeof s === 'object' && s.category)
        .map((s) => s.category),
    );

    requiredCategories.forEach((cat) => {
      if (!selectedCategories.has(cat)) {
        errors.push(`A tool must be selected for the "${cat}" category.`);
      }
    });
  }

  // Check for duplicate tool entries within the same category
  const seen = new Set();
  selections.forEach((selection) => {
    if (selection && selection.category && selection.tool) {
      const key = `${selection.category}::${selection.tool}`;
      if (seen.has(key)) {
        errors.push(`Duplicate selection: "${selection.tool}" is already selected for "${selection.category}".`);
      }
      seen.add(key);
    }
  });

  return errors.length > 0 ? invalidResult(errors) : validResult();
};

// ---------------------------------------------------------------------------
// Pipeline Configuration Validation
// ---------------------------------------------------------------------------

/**
 * Validate a pipeline configuration object.
 *
 * @param {Object} config - The pipeline configuration.
 * @param {string} config.name - Pipeline name.
 * @param {string} config.applicationId - Associated application ID.
 * @param {string} config.sourceControl - Source control tool.
 * @param {string} config.cicdTool - CI/CD tool.
 * @param {string[]} config.stages - Ordered list of pipeline stages.
 * @param {string[]} [config.triggers] - Pipeline triggers.
 * @param {string[]} [config.securityTools] - Security scanning tools.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validatePipelineConfig = (config) => {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return invalidResult(['Pipeline configuration is required.']);
  }

  // Name
  const nameResult = validateRequired(config.name, 'Pipeline name');
  if (!nameResult.valid) {
    errors.push(...nameResult.errors);
  } else if (typeof config.name === 'string') {
    const name = config.name.trim();
    if (name.length < 3) {
      errors.push('Pipeline name must be at least 3 characters.');
    }
    if (name.length > 100) {
      errors.push('Pipeline name must not exceed 100 characters.');
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\s_-]*$/.test(name)) {
      errors.push('Pipeline name must start with an alphanumeric character and contain only letters, numbers, spaces, hyphens, or underscores.');
    }
  }

  // Application ID
  const appIdResult = validateRequired(config.applicationId, 'Application ID');
  if (!appIdResult.valid) {
    errors.push(...appIdResult.errors);
  }

  // Source control
  const scResult = validateRequired(config.sourceControl, 'Source control tool');
  if (!scResult.valid) {
    errors.push(...scResult.errors);
  }

  // CI/CD tool
  const cicdResult = validateRequired(config.cicdTool, 'CI/CD tool');
  if (!cicdResult.valid) {
    errors.push(...cicdResult.errors);
  }

  // Stages
  if (!config.stages || !Array.isArray(config.stages)) {
    errors.push('Pipeline stages must be an array.');
  } else if (config.stages.length === 0) {
    errors.push('At least one pipeline stage is required.');
  } else {
    const invalidStages = config.stages.filter((stage) => !PIPELINE_STAGE_LIST.includes(stage));
    if (invalidStages.length > 0) {
      errors.push(`Invalid pipeline stage(s): ${invalidStages.join(', ')}.`);
    }

    // Check for duplicate stages
    const uniqueStages = new Set(config.stages);
    if (uniqueStages.size !== config.stages.length) {
      errors.push('Pipeline stages must not contain duplicates.');
    }
  }

  // Triggers (optional but must be array if provided)
  if (config.triggers !== null && config.triggers !== undefined) {
    if (!Array.isArray(config.triggers)) {
      errors.push('Pipeline triggers must be an array.');
    } else {
      config.triggers.forEach((trigger, index) => {
        if (typeof trigger !== 'string' || trigger.trim().length === 0) {
          errors.push(`Trigger ${index + 1}: Must be a non-empty string.`);
        }
      });
    }
  }

  // Security tools (optional but must be array if provided)
  if (config.securityTools !== null && config.securityTools !== undefined) {
    if (!Array.isArray(config.securityTools)) {
      errors.push('Security tools must be an array.');
    }
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
};