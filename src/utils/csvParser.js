/**
 * CSV/Excel parsing utility for Horizon DevSecOps Portal
 * Provides file parsing, validation, and data transformation for
 * bulk application onboarding and metrics import workflows.
 * @module utils/csvParser
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { validateCSVData, validateExcelData } from './validators.js';
import {
  CRITICALITY_TIER_LIST,
  DOMAIN_LIST,
  ENVIRONMENT_LIST,
  PORTFOLIO_LIST,
} from '../constants/constants.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum file size in bytes (10 MB).
 * @type {number}
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Supported MIME types for CSV files.
 * @type {string[]}
 */
const CSV_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
];

/**
 * Supported MIME types for Excel files.
 * @type {string[]}
 */
const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

/**
 * Required columns for onboarding data.
 * @type {string[]}
 */
const ONBOARDING_REQUIRED_COLUMNS = [
  'name',
  'shortCode',
  'description',
  'domainName',
  'portfolioName',
  'criticalityTier',
  'ownerName',
];

/**
 * Required columns for metrics data.
 * @type {string[]}
 */
const METRICS_REQUIRED_COLUMNS = [
  'applicationName',
  'metricName',
  'value',
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a file object is present and within size limits.
 * @param {File|null|undefined} file - The file to validate.
 * @param {string[]} allowedMimeTypes - Array of allowed MIME types.
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateFile = (file, allowedMimeTypes) => {
  const errors = [];

  if (!file) {
    return { valid: false, errors: ['No file provided.'] };
  }

  if (!(file instanceof File) && !(file instanceof Blob)) {
    return { valid: false, errors: ['Invalid file object.'] };
  }

  if (file.size === 0) {
    errors.push('File is empty.');
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds the maximum of ${MAX_FILE_SIZE / (1024 * 1024)} MB.`);
  }

  if (allowedMimeTypes.length > 0 && file.type) {
    const isAllowed = allowedMimeTypes.includes(file.type);
    const hasValidExtension = file.name &&
      (file.name.endsWith('.csv') ||
       file.name.endsWith('.xlsx') ||
       file.name.endsWith('.xls'));

    if (!isAllowed && !hasValidExtension) {
      errors.push(`Unsupported file type: "${file.type || 'unknown'}". Expected CSV or Excel file.`);
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
};

/**
 * Read a file as text using FileReader.
 * @param {File} file - The file to read.
 * @returns {Promise<string>} The file contents as a string.
 */
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };
    reader.readAsText(file);
  });
};

/**
 * Read a file as an ArrayBuffer using FileReader.
 * @param {File} file - The file to read.
 * @returns {Promise<ArrayBuffer>} The file contents as an ArrayBuffer.
 */
const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Trim whitespace from all string values in a row object.
 * @param {Object} row - A single row object.
 * @returns {Object} Row with trimmed string values.
 */
const trimRow = (row) => {
  if (!row || typeof row !== 'object') {
    return row;
  }

  const trimmed = {};
  for (const [key, value] of Object.entries(row)) {
    const trimmedKey = typeof key === 'string' ? key.trim() : key;
    trimmed[trimmedKey] = typeof value === 'string' ? value.trim() : value;
  }
  return trimmed;
};

/**
 * Filter out completely empty rows from parsed data.
 * @param {Array<Object>} data - Array of row objects.
 * @returns {Array<Object>} Filtered array without empty rows.
 */
const filterEmptyRows = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }

    return Object.values(row).some((value) => {
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return true;
    });
  });
};

/**
 * Detect column type mismatches against an expected schema.
 * @param {Array<Object>} data - Parsed row data.
 * @param {Object} schema - Schema definition with column names and expected types.
 * @returns {string[]} Array of error messages for type mismatches.
 */
const detectTypeMismatches = (data, schema) => {
  const errors = [];

  if (!data || !Array.isArray(data) || data.length === 0) {
    return errors;
  }

  if (!schema || typeof schema !== 'object') {
    return errors;
  }

  data.forEach((row, index) => {
    const rowNum = index + 1;

    for (const [column, expectedType] of Object.entries(schema)) {
      const value = row[column];

      if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
        continue;
      }

      switch (expectedType) {
        case 'number': {
          const num = Number(value);
          if (Number.isNaN(num)) {
            errors.push(`Row ${rowNum}: "${column}" expected a number but got "${value}".`);
          }
          break;
        }
        case 'string': {
          if (typeof value !== 'string' && typeof value !== 'number') {
            errors.push(`Row ${rowNum}: "${column}" expected a string but got ${typeof value}.`);
          }
          break;
        }
        case 'boolean': {
          const lower = String(value).toLowerCase();
          if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
            errors.push(`Row ${rowNum}: "${column}" expected a boolean but got "${value}".`);
          }
          break;
        }
        case 'date': {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            errors.push(`Row ${rowNum}: "${column}" expected a valid date but got "${value}".`);
          }
          break;
        }
        case 'array': {
          // Arrays in CSV are typically comma-separated or pipe-separated strings
          if (typeof value !== 'string') {
            errors.push(`Row ${rowNum}: "${column}" expected a delimited string for array but got ${typeof value}.`);
          }
          break;
        }
        default:
          break;
      }
    }
  });

  return errors;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSV file and return structured data with error reporting.
 *
 * @param {File} file - The CSV file to parse.
 * @param {Object} [options]
 * @param {boolean} [options.header=true] - Whether the first row contains headers.
 * @param {boolean} [options.skipEmptyLines=true] - Whether to skip empty lines.
 * @param {boolean} [options.dynamicTyping=false] - Whether to auto-detect types.
 * @param {string} [options.delimiter] - Custom delimiter (auto-detected if omitted).
 * @returns {Promise<{ success: boolean, data: Array<Object>, errors: string[], meta: Object }>}
 */
export const parseCSV = async (file, options = {}) => {
  try {
    const {
      header = true,
      skipEmptyLines = true,
      dynamicTyping = false,
      delimiter,
    } = options;

    // Validate file
    const fileValidation = validateFile(file, CSV_MIME_TYPES);
    if (!fileValidation.valid) {
      return {
        success: false,
        data: [],
        errors: fileValidation.errors,
        meta: {},
      };
    }

    // Read file contents
    const text = await readFileAsText(file);

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        data: [],
        errors: ['File is empty or contains no readable content.'],
        meta: {},
      };
    }

    // Parse with PapaParse
    return new Promise((resolve) => {
      const parseConfig = {
        header,
        skipEmptyLines: skipEmptyLines ? 'greedy' : false,
        dynamicTyping,
        transformHeader: (h) => (typeof h === 'string' ? h.trim() : h),
        complete: (results) => {
          const parseErrors = [];

          // Collect PapaParse errors
          if (results.errors && results.errors.length > 0) {
            results.errors.forEach((err) => {
              const rowInfo = err.row !== undefined ? ` (Row ${err.row + 1})` : '';
              parseErrors.push(`${err.type}: ${err.message}${rowInfo}`);
            });
          }

          // Trim and filter data
          let data = Array.isArray(results.data) ? results.data : [];
          data = data.map(trimRow);
          data = filterEmptyRows(data);

          const meta = {
            delimiter: results.meta?.delimiter || ',',
            linebreak: results.meta?.linebreak || '\n',
            fields: results.meta?.fields || [],
            rowCount: data.length,
            truncated: results.meta?.truncated || false,
            fileName: file.name || 'unknown',
            fileSize: file.size || 0,
          };

          if (data.length === 0 && parseErrors.length === 0) {
            parseErrors.push('No data rows found after parsing.');
          }

          resolve({
            success: parseErrors.length === 0 && data.length > 0,
            data,
            errors: parseErrors,
            meta,
          });
        },
        error: (error) => {
          resolve({
            success: false,
            data: [],
            errors: [`Parse error: ${error.message || 'Unknown error'}`],
            meta: { fileName: file.name || 'unknown', fileSize: file.size || 0 },
          });
        },
      };

      if (delimiter) {
        parseConfig.delimiter = delimiter;
      }

      Papa.parse(text, parseConfig);
    });
  } catch (err) {
    return {
      success: false,
      data: [],
      errors: [`Unexpected error parsing CSV: ${err.message || 'Unknown error'}`],
      meta: {},
    };
  }
};

/**
 * Parse an Excel file and return structured data with error reporting.
 *
 * @param {File} file - The Excel file to parse.
 * @param {Object} [options]
 * @param {string} [options.sheetName] - Specific sheet name to parse. Defaults to the first sheet.
 * @param {boolean} [options.header=true] - Whether the first row contains headers.
 * @param {boolean} [options.allSheets=false] - Whether to parse all sheets.
 * @returns {Promise<{ success: boolean, data: Array<Object>, errors: string[], meta: Object }>}
 */
export const parseExcel = async (file, options = {}) => {
  try {
    const {
      sheetName,
      header = true,
      allSheets = false,
    } = options;

    // Validate file
    const fileValidation = validateFile(file, EXCEL_MIME_TYPES);
    if (!fileValidation.valid) {
      return {
        success: false,
        data: [],
        errors: fileValidation.errors,
        meta: {},
      };
    }

    // Read file as ArrayBuffer
    const buffer = await readFileAsArrayBuffer(file);

    // Parse with XLSX
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    } catch (parseErr) {
      return {
        success: false,
        data: [],
        errors: [`Failed to parse Excel file: ${parseErr.message || 'Invalid format'}`],
        meta: { fileName: file.name || 'unknown', fileSize: file.size || 0 },
      };
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        data: [],
        errors: ['Excel file contains no sheets.'],
        meta: { fileName: file.name || 'unknown', fileSize: file.size || 0 },
      };
    }

    const errors = [];
    let allData = [];

    const sheetsToProcess = allSheets
      ? workbook.SheetNames
      : [sheetName || workbook.SheetNames[0]];

    const sheetResults = {};

    for (const name of sheetsToProcess) {
      if (!workbook.SheetNames.includes(name)) {
        errors.push(`Sheet "${name}" not found in workbook. Available sheets: ${workbook.SheetNames.join(', ')}.`);
        continue;
      }

      const worksheet = workbook.Sheets[name];

      const headerOption = header ? 1 : undefined;
      let sheetData;
      try {
        sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: headerOption,
          defval: '',
          blankrows: false,
        });
      } catch (sheetErr) {
        errors.push(`Failed to parse sheet "${name}": ${sheetErr.message || 'Unknown error'}`);
        continue;
      }

      // Trim and filter
      sheetData = Array.isArray(sheetData) ? sheetData : [];
      sheetData = sheetData.map(trimRow);
      sheetData = filterEmptyRows(sheetData);

      sheetResults[name] = sheetData;
      allData = allData.concat(sheetData);
    }

    if (allData.length === 0 && errors.length === 0) {
      errors.push('No data rows found in the Excel file.');
    }

    const meta = {
      sheetNames: workbook.SheetNames,
      processedSheets: sheetsToProcess.filter((s) => workbook.SheetNames.includes(s)),
      rowCount: allData.length,
      sheetResults: allSheets ? sheetResults : undefined,
      fileName: file.name || 'unknown',
      fileSize: file.size || 0,
    };

    return {
      success: errors.length === 0 && allData.length > 0,
      data: allData,
      errors,
      meta,
    };
  } catch (err) {
    return {
      success: false,
      data: [],
      errors: [`Unexpected error parsing Excel: ${err.message || 'Unknown error'}`],
      meta: {},
    };
  }
};

/**
 * Validate parsed data against a schema definition.
 *
 * @param {Array<Object>} data - Array of parsed row objects.
 * @param {Object} schema - Schema definition object.
 * @param {string[]} schema.requiredColumns - Array of required column names.
 * @param {Object} [schema.columnTypes] - Object mapping column names to expected types
 *   ('string', 'number', 'boolean', 'date', 'array').
 * @param {string[]} [schema.allowedValues] - Not used directly; per-column allowed values
 *   should be specified in schema.columnValidation.
 * @param {Object} [schema.columnValidation] - Object mapping column names to arrays of allowed values.
 * @param {number} [schema.maxRows=500] - Maximum number of rows allowed.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export const validateParsedData = (data, schema) => {
  const errors = [];
  const warnings = [];

  if (!data || !Array.isArray(data)) {
    return { valid: false, errors: ['Data must be an array of row objects.'], warnings: [] };
  }

  if (data.length === 0) {
    return { valid: false, errors: ['No data rows to validate.'], warnings: [] };
  }

  if (!schema || typeof schema !== 'object') {
    return { valid: false, errors: ['Schema definition is required.'], warnings: [] };
  }

  const {
    requiredColumns = [],
    columnTypes = {},
    columnValidation = {},
    maxRows = 500,
  } = schema;

  // Check max rows
  if (data.length > maxRows) {
    errors.push(`Data exceeds the maximum of ${maxRows} rows (found ${data.length}).`);
  }

  // Check required columns exist
  if (requiredColumns.length > 0 && data.length > 0) {
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const missingColumns = requiredColumns.filter((col) => !columns.includes(col));

    if (missingColumns.length > 0) {
      errors.push(`Missing required column(s): ${missingColumns.join(', ')}.`);
      return { valid: false, errors, warnings };
    }
  }

  // Check required values in each row
  data.forEach((row, index) => {
    const rowNum = index + 1;

    requiredColumns.forEach((col) => {
      const val = row[col];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim().length === 0)) {
        errors.push(`Row ${rowNum}: "${col}" is required.`);
      }
    });

    // Check column validation (allowed values)
    for (const [col, allowedValues] of Object.entries(columnValidation)) {
      const val = row[col];
      if (val !== null && val !== undefined && String(val).trim().length > 0) {
        const strVal = String(val).trim();
        if (Array.isArray(allowedValues) && !allowedValues.includes(strVal)) {
          errors.push(`Row ${rowNum}: "${col}" value "${strVal}" is not valid. Allowed values: ${allowedValues.join(', ')}.`);
        }
      }
    }
  });

  // Check type mismatches
  if (Object.keys(columnTypes).length > 0) {
    const typeMismatches = detectTypeMismatches(data, columnTypes);
    errors.push(...typeMismatches);
  }

  // Generate warnings for potential issues
  if (data.length > 0) {
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const extraColumns = columns.filter((col) => !requiredColumns.includes(col));

    if (extraColumns.length > 0) {
      warnings.push(`Extra column(s) detected and will be ignored: ${extraColumns.join(', ')}.`);
    }
  }

  // Check for duplicate entries based on common unique fields
  const nameSet = new Set();
  const shortCodeSet = new Set();
  data.forEach((row, index) => {
    const rowNum = index + 1;

    if (row.name && typeof row.name === 'string') {
      const name = row.name.trim().toLowerCase();
      if (nameSet.has(name)) {
        warnings.push(`Row ${rowNum}: Duplicate name "${row.name.trim()}" detected.`);
      }
      nameSet.add(name);
    }

    if (row.shortCode && typeof row.shortCode === 'string') {
      const code = row.shortCode.trim().toUpperCase();
      if (shortCodeSet.has(code)) {
        warnings.push(`Row ${rowNum}: Duplicate short code "${row.shortCode.trim()}" detected.`);
      }
      shortCodeSet.add(code);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Transform parsed CSV/Excel data into application onboarding data format.
 *
 * @param {Array<Object>} parsed - Array of parsed row objects.
 * @param {Object} [options]
 * @param {boolean} [options.generateIds=true] - Whether to generate unique IDs for each entry.
 * @param {string} [options.defaultStatus='active'] - Default application status.
 * @returns {{ success: boolean, data: Array<Object>, errors: string[], skipped: Array<{ row: number, reason: string }> }}
 */
export const transformToOnboardingData = (parsed, options = {}) => {
  const {
    generateIds = true,
    defaultStatus = 'active',
  } = options;

  const errors = [];
  const skipped = [];
  const transformed = [];

  if (!parsed || !Array.isArray(parsed)) {
    return {
      success: false,
      data: [],
      errors: ['Parsed data must be an array of row objects.'],
      skipped: [],
    };
  }

  if (parsed.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['No data rows to transform.'],
      skipped: [],
    };
  }

  // Validate required columns exist
  const firstRow = parsed[0];
  const columns = Object.keys(firstRow);
  const missingColumns = ONBOARDING_REQUIRED_COLUMNS.filter((col) => !columns.includes(col));

  if (missingColumns.length > 0) {
    return {
      success: false,
      data: [],
      errors: [`Missing required column(s) for onboarding: ${missingColumns.join(', ')}.`],
      skipped: [],
    };
  }

  parsed.forEach((row, index) => {
    const rowNum = index + 1;

    try {
      // Check required fields
      const missingFields = ONBOARDING_REQUIRED_COLUMNS.filter((col) => {
        const val = row[col];
        return val === null || val === undefined || (typeof val === 'string' && val.trim().length === 0);
      });

      if (missingFields.length > 0) {
        skipped.push({
          row: rowNum,
          reason: `Missing required field(s): ${missingFields.join(', ')}.`,
        });
        return;
      }

      // Validate domain
      const domainName = String(row.domainName).trim();
      if (!DOMAIN_LIST.includes(domainName)) {
        skipped.push({
          row: rowNum,
          reason: `Invalid domain: "${domainName}".`,
        });
        return;
      }

      // Validate criticality tier
      const criticalityTier = String(row.criticalityTier).trim();
      if (!CRITICALITY_TIER_LIST.includes(criticalityTier)) {
        skipped.push({
          row: rowNum,
          reason: `Invalid criticality tier: "${criticalityTier}".`,
        });
        return;
      }

      // Parse environments (comma or pipe separated)
      let environments = [];
      if (row.environments && typeof row.environments === 'string' && row.environments.trim().length > 0) {
        const separator = row.environments.includes('|') ? '|' : ',';
        environments = row.environments
          .split(separator)
          .map((e) => e.trim())
          .filter((e) => e.length > 0);

        const invalidEnvs = environments.filter((e) => !ENVIRONMENT_LIST.includes(e));
        if (invalidEnvs.length > 0) {
          environments = environments.filter((e) => ENVIRONMENT_LIST.includes(e));
          if (environments.length === 0) {
            environments = [ENVIRONMENT_LIST[0]];
          }
        }
      } else {
        environments = [ENVIRONMENT_LIST[0]];
      }

      // Parse tech stack (comma or pipe separated)
      let techStack = [];
      if (row.techStack && typeof row.techStack === 'string' && row.techStack.trim().length > 0) {
        const separator = row.techStack.includes('|') ? '|' : ',';
        techStack = row.techStack
          .split(separator)
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }

      // Parse tags (comma or pipe separated)
      let tags = [];
      if (row.tags && typeof row.tags === 'string' && row.tags.trim().length > 0) {
        const separator = row.tags.includes('|') ? '|' : ',';
        tags = row.tags
          .split(separator)
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0);
      }

      const entry = {
        id: generateIds ? `APP-${uuidv4().slice(0, 8).toUpperCase()}` : undefined,
        name: String(row.name).trim(),
        shortCode: String(row.shortCode).trim().toUpperCase(),
        description: String(row.description).trim(),
        domainName,
        portfolioName: String(row.portfolioName).trim(),
        criticalityTier,
        ownerName: String(row.ownerName).trim(),
        ownerEmail: row.ownerEmail ? String(row.ownerEmail).trim() : '',
        environments,
        techStack,
        tags,
        repoUrl: row.repoUrl ? String(row.repoUrl).trim() : '',
        status: defaultStatus,
        onboardedAt: new Date().toISOString(),
      };

      // Remove undefined id if not generating
      if (!generateIds) {
        delete entry.id;
      }

      transformed.push(entry);
    } catch (rowErr) {
      skipped.push({
        row: rowNum,
        reason: `Transform error: ${rowErr.message || 'Unknown error'}`,
      });
    }
  });

  if (transformed.length === 0) {
    errors.push('No rows were successfully transformed.');
  }

  return {
    success: errors.length === 0 && transformed.length > 0,
    data: transformed,
    errors,
    skipped,
  };
};

/**
 * Transform parsed CSV/Excel data into metrics data format.
 *
 * @param {Array<Object>} parsed - Array of parsed row objects.
 * @param {Object} [options]
 * @param {boolean} [options.generateIds=true] - Whether to generate unique IDs for each entry.
 * @param {string} [options.defaultPeriod] - Default period if not specified in data. Defaults to current month.
 * @returns {{ success: boolean, data: Array<Object>, errors: string[], skipped: Array<{ row: number, reason: string }> }}
 */
export const transformToMetricsData = (parsed, options = {}) => {
  const now = new Date();
  const defaultPeriodValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const {
    generateIds = true,
    defaultPeriod = defaultPeriodValue,
  } = options;

  const errors = [];
  const skipped = [];
  const transformed = [];

  if (!parsed || !Array.isArray(parsed)) {
    return {
      success: false,
      data: [],
      errors: ['Parsed data must be an array of row objects.'],
      skipped: [],
    };
  }

  if (parsed.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['No data rows to transform.'],
      skipped: [],
    };
  }

  // Validate required columns exist
  const firstRow = parsed[0];
  const columns = Object.keys(firstRow);
  const missingColumns = METRICS_REQUIRED_COLUMNS.filter((col) => !columns.includes(col));

  if (missingColumns.length > 0) {
    return {
      success: false,
      data: [],
      errors: [`Missing required column(s) for metrics: ${missingColumns.join(', ')}.`],
      skipped: [],
    };
  }

  parsed.forEach((row, index) => {
    const rowNum = index + 1;

    try {
      // Check required fields
      const missingFields = METRICS_REQUIRED_COLUMNS.filter((col) => {
        const val = row[col];
        return val === null || val === undefined || (typeof val === 'string' && val.trim().length === 0);
      });

      if (missingFields.length > 0) {
        skipped.push({
          row: rowNum,
          reason: `Missing required field(s): ${missingFields.join(', ')}.`,
        });
        return;
      }

      // Validate value is numeric
      const rawValue = row.value;
      const numericValue = Number(rawValue);
      if (Number.isNaN(numericValue)) {
        skipped.push({
          row: rowNum,
          reason: `"value" must be a number but got "${rawValue}".`,
        });
        return;
      }

      const entry = {
        id: generateIds ? `MET-${uuidv4().slice(0, 8).toUpperCase()}` : undefined,
        applicationName: String(row.applicationName).trim(),
        metricName: String(row.metricName).trim(),
        value: numericValue,
        unit: row.unit ? String(row.unit).trim() : '',
        period: row.period ? String(row.period).trim() : defaultPeriod,
        environment: row.environment ? String(row.environment).trim() : '',
        timestamp: row.timestamp ? String(row.timestamp).trim() : new Date().toISOString(),
        metadata: {},
      };

      // Remove undefined id if not generating
      if (!generateIds) {
        delete entry.id;
      }

      // Collect any extra columns as metadata
      for (const [key, value] of Object.entries(row)) {
        if (!METRICS_REQUIRED_COLUMNS.includes(key) && !['unit', 'period', 'environment', 'timestamp'].includes(key)) {
          if (value !== null && value !== undefined && String(value).trim().length > 0) {
            entry.metadata[key] = typeof value === 'string' ? value.trim() : value;
          }
        }
      }

      if (Object.keys(entry.metadata).length === 0) {
        delete entry.metadata;
      }

      transformed.push(entry);
    } catch (rowErr) {
      skipped.push({
        row: rowNum,
        reason: `Transform error: ${rowErr.message || 'Unknown error'}`,
      });
    }
  });

  if (transformed.length === 0) {
    errors.push('No rows were successfully transformed.');
  }

  return {
    success: errors.length === 0 && transformed.length > 0,
    data: transformed,
    errors,
    skipped,
  };
};