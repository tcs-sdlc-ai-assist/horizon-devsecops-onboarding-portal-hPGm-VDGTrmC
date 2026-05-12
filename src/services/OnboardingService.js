/**
 * Onboarding business logic service for Horizon DevSecOps Portal
 * Orchestrates catalog lookup, toolchain validation, and localStorage persistence.
 * Logs all onboarding actions to audit trail.
 * @module services/OnboardingService
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorageItem, setStorageItem, initializeStorage } from '../utils/localStorage.js';
import {
  MOCK_APPLICATIONS,
  MOCK_DOMAINS,
  MOCK_PORTFOLIOS,
  MOCK_TOOLCHAIN_ASSIGNMENTS,
} from '../constants/mockData.js';
import {
  CRITICALITY_TIER_LIST,
  DOMAIN_LIST,
  ENVIRONMENT_LIST,
  PORTFOLIO_LIST,
  TOOLCHAIN_CATEGORY_LIST,
  TOOL_LIST,
} from '../constants/constants.js';
import { TOOLCHAIN_CATALOG, getToolsByCategory } from '../constants/toolchainData.js';
import { validateOnboardingForm, validateToolchainSelection } from '../utils/validators.js';
import { logAction, AUDIT_ACTIONS } from '../utils/auditLogger.js';
import {
  addApplication,
  getApplicationById,
  getApplications,
  updateApplication,
  getToolchainAssignments,
  saveToolchainAssignment,
  getDomains,
  getPortfolios,
  getToolchains,
} from './CatalogService.js';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = Object.freeze({
  ONBOARDING_RECORDS: 'onboarding_records',
  APPLICATIONS: 'applications',
  TOOLCHAIN_ASSIGNMENTS: 'toolchain_assignments',
});

// ---------------------------------------------------------------------------
// Onboarding Statuses
// ---------------------------------------------------------------------------

/**
 * Possible onboarding statuses.
 * @readonly
 * @enum {string}
 */
export const ONBOARDING_STATUSES = Object.freeze({
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  PENDING_TOOLCHAIN: 'pending_toolchain',
  PENDING_INTEGRATION: 'pending_integration',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Ensure localStorage is initialized with mock data.
 */
const ensureInitialized = () => {
  initializeStorage();
};

/**
 * Load onboarding records from localStorage.
 * @returns {Array<Object>}
 */
const loadOnboardingRecords = () => {
  ensureInitialized();
  const records = getStorageItem(STORAGE_KEYS.ONBOARDING_RECORDS, null);
  if (records !== null && Array.isArray(records)) {
    return records;
  }
  setStorageItem(STORAGE_KEYS.ONBOARDING_RECORDS, []);
  return [];
};

/**
 * Save onboarding records to localStorage.
 * @param {Array<Object>} records
 * @returns {boolean}
 */
const saveOnboardingRecords = (records) => {
  return setStorageItem(STORAGE_KEYS.ONBOARDING_RECORDS, records);
};

/**
 * Case-insensitive string match check.
 * @param {string} source
 * @param {string} query
 * @returns {boolean}
 */
const matchesSearch = (source, query) => {
  if (!source || !query) {
    return false;
  }
  return String(source).toLowerCase().includes(String(query).toLowerCase());
};

// ---------------------------------------------------------------------------
// Public API — Validation
// ---------------------------------------------------------------------------

/**
 * Validate onboarding form data including application fields, toolchain
 * selections, integration choices, and QE tool selections.
 *
 * @param {Object} formData - The onboarding form data.
 * @param {string} formData.name - Application name.
 * @param {string} formData.shortCode - Short code identifier.
 * @param {string} formData.description - Application description.
 * @param {string} formData.domainName - Domain name.
 * @param {string} formData.portfolioName - Portfolio name.
 * @param {string} formData.criticalityTier - Criticality tier.
 * @param {string} formData.ownerName - Owner display name.
 * @param {string} [formData.ownerEmail] - Owner email address.
 * @param {string[]} [formData.environments] - Selected environments.
 * @param {string[]} [formData.techStack] - Technology stack entries.
 * @param {string[]} [formData.tags] - Tags.
 * @param {string} [formData.repoUrl] - Repository URL.
 * @param {Array<Object>} [formData.toolchainSelections] - Toolchain selections.
 * @param {Array<Object>} [formData.integrations] - Integration configurations.
 * @param {string[]} [formData.qeTools] - QE tool selections.
 * @param {string[]} [formData.configurableMetrics] - Configurable metrics selections.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export const validateOnboarding = (formData) => {
  const errors = [];
  const warnings = [];

  if (!formData || typeof formData !== 'object') {
    return { valid: false, errors: ['Onboarding form data is required.'], warnings: [] };
  }

  // Validate core application fields
  const formValidation = validateOnboardingForm(formData);
  if (!formValidation.valid) {
    errors.push(...formValidation.errors);
  }

  // Validate toolchain selections if provided
  if (formData.toolchainSelections !== null && formData.toolchainSelections !== undefined) {
    if (!Array.isArray(formData.toolchainSelections)) {
      errors.push('Toolchain selections must be an array.');
    } else if (formData.toolchainSelections.length > 0) {
      const toolchainValidation = validateToolchainSelection(formData.toolchainSelections);
      if (!toolchainValidation.valid) {
        errors.push(...toolchainValidation.errors);
      }
    }
  }

  // Validate integrations if provided
  if (formData.integrations !== null && formData.integrations !== undefined) {
    if (!Array.isArray(formData.integrations)) {
      errors.push('Integrations must be an array.');
    } else {
      formData.integrations.forEach((integration, index) => {
        if (!integration || typeof integration !== 'object') {
          errors.push(`Integration ${index + 1}: Must be an object with "type" and "config" properties.`);
          return;
        }
        if (!integration.type || typeof integration.type !== 'string' || integration.type.trim().length === 0) {
          errors.push(`Integration ${index + 1}: "type" is required.`);
        }
      });
    }
  }

  // Validate QE tools if provided
  if (formData.qeTools !== null && formData.qeTools !== undefined) {
    if (!Array.isArray(formData.qeTools)) {
      errors.push('QE tools must be an array.');
    } else {
      formData.qeTools.forEach((tool, index) => {
        if (typeof tool !== 'string' || tool.trim().length === 0) {
          errors.push(`QE tool ${index + 1}: Must be a non-empty string.`);
        }
      });
    }
  }

  // Validate configurable metrics if provided
  if (formData.configurableMetrics !== null && formData.configurableMetrics !== undefined) {
    if (!Array.isArray(formData.configurableMetrics)) {
      errors.push('Configurable metrics must be an array.');
    } else {
      formData.configurableMetrics.forEach((metric, index) => {
        if (typeof metric !== 'string' || metric.trim().length === 0) {
          errors.push(`Configurable metric ${index + 1}: Must be a non-empty string.`);
        }
      });
    }
  }

  // Generate warnings for missing optional but recommended fields
  if (
    formData.criticalityTier === 'Business-critical' ||
    formData.criticalityTier === 'Mission-critical'
  ) {
    if (
      !formData.toolchainSelections ||
      !Array.isArray(formData.toolchainSelections) ||
      formData.toolchainSelections.length === 0
    ) {
      warnings.push(
        'Toolchain selections are recommended for Business-critical and Mission-critical applications.',
      );
    }

    if (
      !formData.integrations ||
      !Array.isArray(formData.integrations) ||
      formData.integrations.length === 0
    ) {
      warnings.push(
        'Monitoring and logging integrations are recommended for critical applications.',
      );
    }
  }

  if (!formData.environments || !Array.isArray(formData.environments) || formData.environments.length === 0) {
    warnings.push('At least one environment should be selected for the application.');
  }

  if (!formData.techStack || !Array.isArray(formData.techStack) || formData.techStack.length === 0) {
    warnings.push('Specifying a technology stack helps with pipeline generation.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// ---------------------------------------------------------------------------
// Public API — Submit Onboarding
// ---------------------------------------------------------------------------

/**
 * Submit a new application onboarding request. Creates the application in the
 * catalog, saves toolchain assignments, creates an onboarding record, and
 * logs the action to the audit trail.
 *
 * @param {Object} formData - The onboarding form data.
 * @param {string} formData.name - Application name.
 * @param {string} formData.shortCode - Short code identifier.
 * @param {string} formData.description - Application description.
 * @param {string} formData.domainName - Domain name.
 * @param {string} formData.portfolioName - Portfolio name.
 * @param {string} formData.criticalityTier - Criticality tier.
 * @param {string} formData.ownerName - Owner display name.
 * @param {string} [formData.ownerEmail] - Owner email address.
 * @param {string[]} [formData.environments] - Selected environments.
 * @param {string[]} [formData.techStack] - Technology stack entries.
 * @param {string[]} [formData.tags] - Tags.
 * @param {string} [formData.repoUrl] - Repository URL.
 * @param {Array<Object>} [formData.toolchainSelections] - Toolchain selections.
 * @param {Array<Object>} [formData.integrations] - Integration configurations.
 * @param {string[]} [formData.qeTools] - QE tool selections.
 * @param {string[]} [formData.configurableMetrics] - Configurable metrics selections.
 * @param {string} [formData.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, onboardingId: string|null, applicationId: string|null, errors: string[], warnings: string[] }}
 */
export const submitOnboarding = (formData) => {
  try {
    if (!formData || typeof formData !== 'object') {
      return {
        success: false,
        onboardingId: null,
        applicationId: null,
        errors: ['Onboarding form data is required.'],
        warnings: [],
      };
    }

    // Validate the form data
    const validation = validateOnboarding(formData);
    if (!validation.valid) {
      return {
        success: false,
        onboardingId: null,
        applicationId: null,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    // Add the application to the catalog
    const addResult = addApplication({
      name: formData.name,
      shortCode: formData.shortCode,
      description: formData.description,
      domainName: formData.domainName,
      portfolioName: formData.portfolioName,
      criticalityTier: formData.criticalityTier,
      ownerName: formData.ownerName,
      ownerEmail: formData.ownerEmail || '',
      environments: Array.isArray(formData.environments) ? formData.environments : [ENVIRONMENT_LIST[0]],
      techStack: Array.isArray(formData.techStack) ? formData.techStack : [],
      tags: Array.isArray(formData.tags) ? formData.tags : [],
      repoUrl: formData.repoUrl || '',
      status: 'active',
      userId: formData.userId || null,
    });

    if (!addResult.success) {
      return {
        success: false,
        onboardingId: null,
        applicationId: null,
        errors: addResult.errors,
        warnings: validation.warnings,
      };
    }

    const application = addResult.application;
    const applicationId = application.id;

    // Save toolchain assignments if provided
    if (
      Array.isArray(formData.toolchainSelections) &&
      formData.toolchainSelections.length > 0
    ) {
      const tools = formData.toolchainSelections.map((selection) => ({
        category: selection.category || '',
        tool: selection.tool || '',
        configured: selection.configured !== false,
      }));

      saveToolchainAssignment(
        applicationId,
        application.name,
        tools,
        formData.userId || null,
      );
    }

    // Create onboarding record
    const onboardingId = `ONB-${uuidv4().slice(0, 8).toUpperCase()}`;
    const onboardingRecord = {
      id: onboardingId,
      applicationId,
      applicationName: application.name,
      domainName: application.domainName,
      portfolioName: application.portfolioName,
      criticalityTier: application.criticalityTier,
      ownerName: application.ownerName,
      ownerEmail: formData.ownerEmail || '',
      environments: application.environments,
      techStack: application.techStack,
      tags: application.tags,
      repoUrl: application.repoUrl,
      toolchainSelections: Array.isArray(formData.toolchainSelections)
        ? [...formData.toolchainSelections]
        : [],
      integrations: Array.isArray(formData.integrations)
        ? [...formData.integrations]
        : [],
      qeTools: Array.isArray(formData.qeTools) ? [...formData.qeTools] : [],
      configurableMetrics: Array.isArray(formData.configurableMetrics)
        ? [...formData.configurableMetrics]
        : [],
      status: ONBOARDING_STATUSES.COMPLETED,
      submittedBy: formData.userId || null,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    const records = loadOnboardingRecords();
    records.push(onboardingRecord);
    saveOnboardingRecords(records);

    // Log the onboarding action
    logAction(formData.userId || null, AUDIT_ACTIONS.APPLICATION_ONBOARD, {
      onboardingId,
      applicationId,
      applicationName: application.name,
      domainName: application.domainName,
      portfolioName: application.portfolioName,
      criticalityTier: application.criticalityTier,
      toolchainCount: onboardingRecord.toolchainSelections.length,
      integrationCount: onboardingRecord.integrations.length,
      qeToolCount: onboardingRecord.qeTools.length,
      metricsCount: onboardingRecord.configurableMetrics.length,
    });

    return {
      success: true,
      onboardingId,
      applicationId,
      errors: [],
      warnings: validation.warnings,
    };
  } catch (_err) {
    console.error('OnboardingService: Failed to submit onboarding:', _err);
    return {
      success: false,
      onboardingId: null,
      applicationId: null,
      errors: ['Failed to submit onboarding. Please try again.'],
      warnings: [],
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Onboarded Applications
// ---------------------------------------------------------------------------

/**
 * Get all onboarded applications with their onboarding records.
 *
 * @param {Object} [options]
 * @param {string} [options.domainName] - Filter by domain name.
 * @param {string} [options.portfolioName] - Filter by portfolio name.
 * @param {string} [options.criticalityTier] - Filter by criticality tier.
 * @param {string} [options.status] - Filter by onboarding status.
 * @param {string} [options.search] - Free-text search across name, domain, portfolio, owner.
 * @param {string} [options.sortBy='submittedAt'] - Field to sort by.
 * @param {string} [options.sortOrder='desc'] - Sort order: 'asc' or 'desc'.
 * @param {number} [options.limit] - Maximum number of results.
 * @param {number} [options.offset=0] - Number of results to skip.
 * @returns {{ data: Array<Object>, total: number }}
 */
export const getOnboardedApplications = (options = {}) => {
  try {
    const {
      domainName,
      portfolioName,
      criticalityTier,
      status,
      search,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
      limit,
      offset = 0,
    } = options;

    let records = loadOnboardingRecords();

    // Filter by domain
    if (domainName && typeof domainName === 'string') {
      records = records.filter((r) => r.domainName === domainName);
    }

    // Filter by portfolio
    if (portfolioName && typeof portfolioName === 'string') {
      records = records.filter((r) => r.portfolioName === portfolioName);
    }

    // Filter by criticality tier
    if (criticalityTier && typeof criticalityTier === 'string') {
      records = records.filter((r) => r.criticalityTier === criticalityTier);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      records = records.filter((r) => r.status === status);
    }

    // Free-text search
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.trim();
      records = records.filter((r) => {
        return (
          matchesSearch(r.applicationName, query) ||
          matchesSearch(r.domainName, query) ||
          matchesSearch(r.portfolioName, query) ||
          matchesSearch(r.ownerName, query) ||
          matchesSearch(r.criticalityTier, query) ||
          matchesSearch(r.id, query) ||
          matchesSearch(r.applicationId, query)
        );
      });
    }

    // Sort
    records.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' });
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = records.length;

    // Pagination
    const startIdx = typeof offset === 'number' && offset > 0 ? offset : 0;
    if (typeof limit === 'number' && limit > 0) {
      records = records.slice(startIdx, startIdx + limit);
    } else if (startIdx > 0) {
      records = records.slice(startIdx);
    }

    return { data: records, total };
  } catch (_err) {
    console.error('OnboardingService: Failed to get onboarded applications:', _err);
    return { data: [], total: 0 };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Onboarding Status
// ---------------------------------------------------------------------------

/**
 * Get the onboarding status and record for a specific application.
 *
 * @param {string} appId - The application ID.
 * @returns {{ found: boolean, record: Object|null, application: Object|null, toolchain: Object|null }}
 */
export const getOnboardingStatus = (appId) => {
  try {
    if (!appId || typeof appId !== 'string') {
      return { found: false, record: null, application: null, toolchain: null };
    }

    const records = loadOnboardingRecords();
    const record = records.find((r) => r.applicationId === appId) || null;

    const application = getApplicationById(appId);

    const toolchainAssignments = getToolchainAssignments({ applicationId: appId });
    const toolchain = toolchainAssignments.length > 0 ? toolchainAssignments[0] : null;

    if (!record && !application) {
      return { found: false, record: null, application: null, toolchain: null };
    }

    return {
      found: true,
      record,
      application,
      toolchain,
    };
  } catch (_err) {
    console.error('OnboardingService: Failed to get onboarding status:', _err);
    return { found: false, record: null, application: null, toolchain: null };
  }
};

// ---------------------------------------------------------------------------
// Public API — Update Onboarding Config
// ---------------------------------------------------------------------------

/**
 * Update the onboarding configuration for an existing application.
 * Supports updating toolchain selections, integrations, QE tools,
 * configurable metrics, and application metadata.
 *
 * @param {string} appId - The application ID.
 * @param {Object} config - Configuration updates.
 * @param {Array<Object>} [config.toolchainSelections] - Updated toolchain selections.
 * @param {Array<Object>} [config.integrations] - Updated integration configurations.
 * @param {string[]} [config.qeTools] - Updated QE tool selections.
 * @param {string[]} [config.configurableMetrics] - Updated configurable metrics.
 * @param {string[]} [config.environments] - Updated environments.
 * @param {string[]} [config.techStack] - Updated tech stack.
 * @param {string[]} [config.tags] - Updated tags.
 * @param {string} [config.repoUrl] - Updated repository URL.
 * @param {string} [config.criticalityTier] - Updated criticality tier.
 * @param {string} [config.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, errors: string[] }}
 */
export const updateOnboardingConfig = (appId, config) => {
  try {
    if (!appId || typeof appId !== 'string') {
      return { success: false, errors: ['Application ID is required.'] };
    }

    if (!config || typeof config !== 'object') {
      return { success: false, errors: ['Configuration data is required.'] };
    }

    const errors = [];

    // Validate toolchain selections if provided
    if (config.toolchainSelections !== undefined) {
      if (!Array.isArray(config.toolchainSelections)) {
        errors.push('Toolchain selections must be an array.');
      } else if (config.toolchainSelections.length > 0) {
        const toolchainValidation = validateToolchainSelection(config.toolchainSelections);
        if (!toolchainValidation.valid) {
          errors.push(...toolchainValidation.errors);
        }
      }
    }

    // Validate integrations if provided
    if (config.integrations !== undefined) {
      if (!Array.isArray(config.integrations)) {
        errors.push('Integrations must be an array.');
      } else {
        config.integrations.forEach((integration, index) => {
          if (!integration || typeof integration !== 'object') {
            errors.push(`Integration ${index + 1}: Must be an object.`);
            return;
          }
          if (!integration.type || typeof integration.type !== 'string' || integration.type.trim().length === 0) {
            errors.push(`Integration ${index + 1}: "type" is required.`);
          }
        });
      }
    }

    // Validate QE tools if provided
    if (config.qeTools !== undefined) {
      if (!Array.isArray(config.qeTools)) {
        errors.push('QE tools must be an array.');
      }
    }

    // Validate configurable metrics if provided
    if (config.configurableMetrics !== undefined) {
      if (!Array.isArray(config.configurableMetrics)) {
        errors.push('Configurable metrics must be an array.');
      }
    }

    // Validate criticality tier if provided
    if (config.criticalityTier !== undefined) {
      if (typeof config.criticalityTier !== 'string' || !CRITICALITY_TIER_LIST.includes(config.criticalityTier)) {
        errors.push('Criticality tier must be a valid tier.');
      }
    }

    // Validate environments if provided
    if (config.environments !== undefined) {
      if (!Array.isArray(config.environments)) {
        errors.push('Environments must be an array.');
      } else if (config.environments.length === 0) {
        errors.push('At least one environment must be selected.');
      } else {
        const invalidEnvs = config.environments.filter((env) => !ENVIRONMENT_LIST.includes(env));
        if (invalidEnvs.length > 0) {
          errors.push(`Invalid environment(s): ${invalidEnvs.join(', ')}.`);
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Check application exists
    const application = getApplicationById(appId);
    if (!application) {
      return { success: false, errors: [`Application with ID "${appId}" not found.`] };
    }

    // Update application metadata if applicable
    const appUpdates = {};
    if (config.environments !== undefined) {
      appUpdates.environments = config.environments;
    }
    if (config.techStack !== undefined) {
      appUpdates.techStack = config.techStack;
    }
    if (config.tags !== undefined) {
      appUpdates.tags = config.tags;
    }
    if (config.repoUrl !== undefined) {
      appUpdates.repoUrl = config.repoUrl;
    }
    if (config.criticalityTier !== undefined) {
      appUpdates.criticalityTier = config.criticalityTier;
    }

    if (Object.keys(appUpdates).length > 0) {
      appUpdates.userId = config.userId || null;
      const updateResult = updateApplication(appId, appUpdates);
      if (!updateResult.success) {
        return { success: false, errors: updateResult.errors };
      }
    }

    // Update toolchain assignments if provided
    if (Array.isArray(config.toolchainSelections)) {
      const tools = config.toolchainSelections.map((selection) => ({
        category: selection.category || '',
        tool: selection.tool || '',
        configured: selection.configured !== false,
      }));

      saveToolchainAssignment(
        appId,
        application.name,
        tools,
        config.userId || null,
      );
    }

    // Update onboarding record
    const records = loadOnboardingRecords();
    const recordIndex = records.findIndex((r) => r.applicationId === appId);

    if (recordIndex >= 0) {
      const existingRecord = records[recordIndex];

      if (config.toolchainSelections !== undefined) {
        existingRecord.toolchainSelections = [...config.toolchainSelections];
      }
      if (config.integrations !== undefined) {
        existingRecord.integrations = [...config.integrations];
      }
      if (config.qeTools !== undefined) {
        existingRecord.qeTools = [...config.qeTools];
      }
      if (config.configurableMetrics !== undefined) {
        existingRecord.configurableMetrics = [...config.configurableMetrics];
      }
      if (config.environments !== undefined) {
        existingRecord.environments = [...config.environments];
      }
      if (config.techStack !== undefined) {
        existingRecord.techStack = [...config.techStack];
      }
      if (config.tags !== undefined) {
        existingRecord.tags = config.tags.map((t) => String(t).trim().toLowerCase());
      }
      if (config.repoUrl !== undefined) {
        existingRecord.repoUrl = config.repoUrl ? String(config.repoUrl).trim() : '';
      }
      if (config.criticalityTier !== undefined) {
        existingRecord.criticalityTier = config.criticalityTier;
      }

      existingRecord.updatedAt = new Date().toISOString();
      records[recordIndex] = existingRecord;
      saveOnboardingRecords(records);
    }

    // Log the update action
    logAction(config.userId || null, AUDIT_ACTIONS.APPLICATION_UPDATE, {
      applicationId: appId,
      applicationName: application.name,
      updatedFields: Object.keys(config).filter((k) => k !== 'userId'),
      source: 'onboarding_config_update',
    });

    return { success: true, errors: [] };
  } catch (_err) {
    console.error('OnboardingService: Failed to update onboarding config:', _err);
    return { success: false, errors: ['Failed to update onboarding configuration.'] };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Onboarding Summary
// ---------------------------------------------------------------------------

/**
 * Get a summary of all onboarding activity.
 *
 * @returns {{
 *   totalOnboarded: number,
 *   byStatus: Object<string, number>,
 *   byDomain: Array<{ domain: string, count: number }>,
 *   byCriticality: Array<{ tier: string, count: number }>,
 *   recentOnboardings: Array<Object>,
 * }}
 */
export const getOnboardingSummary = () => {
  try {
    const records = loadOnboardingRecords();

    // Count by status
    const byStatus = {};
    records.forEach((r) => {
      const key = r.status || 'unknown';
      byStatus[key] = (byStatus[key] || 0) + 1;
    });

    // Count by domain
    const domainCounts = {};
    records.forEach((r) => {
      const key = r.domainName || 'Unknown';
      domainCounts[key] = (domainCounts[key] || 0) + 1;
    });
    const byDomain = Object.entries(domainCounts).map(([domain, count]) => ({
      domain,
      count,
    }));

    // Count by criticality
    const critCounts = {};
    records.forEach((r) => {
      const key = r.criticalityTier || 'Unknown';
      critCounts[key] = (critCounts[key] || 0) + 1;
    });
    const byCriticality = Object.entries(critCounts).map(([tier, count]) => ({
      tier,
      count,
    }));

    // Recent onboardings (last 10)
    const sorted = [...records].sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA;
    });
    const recentOnboardings = sorted.slice(0, 10);

    return {
      totalOnboarded: records.length,
      byStatus,
      byDomain,
      byCriticality,
      recentOnboardings,
    };
  } catch (_err) {
    console.error('OnboardingService: Failed to get onboarding summary:', _err);
    return {
      totalOnboarded: 0,
      byStatus: {},
      byDomain: [],
      byCriticality: [],
      recentOnboardings: [],
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Onboarding Catalog Options
// ---------------------------------------------------------------------------

/**
 * Get all available catalog options for the onboarding form.
 * Returns domains, portfolios, criticality tiers, environments,
 * toolchain catalog, and other reference data.
 *
 * @returns {{
 *   domains: Array<Object>,
 *   portfolios: Array<Object>,
 *   domainList: string[],
 *   portfolioList: string[],
 *   criticalityTierList: string[],
 *   environmentList: string[],
 *   toolchainCategoryList: string[],
 *   toolList: string[],
 *   toolchainCatalog: Array<Object>,
 * }}
 */
export const getOnboardingCatalogOptions = () => {
  try {
    const domains = getDomains();
    const portfolios = getPortfolios();
    const toolchainCatalog = getToolchains();

    return {
      domains,
      portfolios,
      domainList: DOMAIN_LIST,
      portfolioList: PORTFOLIO_LIST,
      criticalityTierList: CRITICALITY_TIER_LIST,
      environmentList: ENVIRONMENT_LIST,
      toolchainCategoryList: TOOLCHAIN_CATEGORY_LIST,
      toolList: TOOL_LIST,
      toolchainCatalog,
    };
  } catch (_err) {
    console.error('OnboardingService: Failed to get catalog options:', _err);
    return {
      domains: [],
      portfolios: [],
      domainList: DOMAIN_LIST,
      portfolioList: PORTFOLIO_LIST,
      criticalityTierList: CRITICALITY_TIER_LIST,
      environmentList: ENVIRONMENT_LIST,
      toolchainCategoryList: TOOLCHAIN_CATEGORY_LIST,
      toolList: TOOL_LIST,
      toolchainCatalog: [],
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Portfolios by Domain
// ---------------------------------------------------------------------------

/**
 * Get portfolios filtered by a specific domain name.
 * Useful for cascading dropdowns in the onboarding form.
 *
 * @param {string} domainName - The domain name to filter by.
 * @returns {Array<Object>}
 */
export const getPortfoliosByDomain = (domainName) => {
  try {
    if (!domainName || typeof domainName !== 'string') {
      return getPortfolios();
    }

    return getPortfolios({ domainName });
  } catch (_err) {
    console.error('OnboardingService: Failed to get portfolios by domain:', _err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Toolchain Options by Category
// ---------------------------------------------------------------------------

/**
 * Get available toolchain options filtered by category.
 *
 * @param {string} category - The toolchain category to filter by.
 * @returns {Array<Object>}
 */
export const getToolchainOptionsByCategory = (category) => {
  try {
    if (!category || typeof category !== 'string') {
      return getToolchains();
    }

    return getToolchains({ category });
  } catch (_err) {
    console.error('OnboardingService: Failed to get toolchain options:', _err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Public API — Delete Onboarding Record
// ---------------------------------------------------------------------------

/**
 * Delete an onboarding record by application ID.
 * Does NOT delete the application itself from the catalog.
 *
 * @param {string} appId - The application ID.
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean, error: string|null }}
 */
export const deleteOnboardingRecord = (appId, userId) => {
  try {
    if (!appId || typeof appId !== 'string') {
      return { success: false, error: 'Application ID is required.' };
    }

    const records = loadOnboardingRecords();
    const index = records.findIndex((r) => r.applicationId === appId);

    if (index === -1) {
      return { success: false, error: `Onboarding record for application "${appId}" not found.` };
    }

    const removed = records[index];
    records.splice(index, 1);
    saveOnboardingRecords(records);

    logAction(userId || null, AUDIT_ACTIONS.APPLICATION_DELETE, {
      onboardingId: removed.id,
      applicationId: removed.applicationId,
      applicationName: removed.applicationName,
      source: 'onboarding_record_delete',
    });

    return { success: true, error: null };
  } catch (_err) {
    console.error('OnboardingService: Failed to delete onboarding record:', _err);
    return { success: false, error: 'Failed to delete onboarding record.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Reset Onboarding Records
// ---------------------------------------------------------------------------

/**
 * Reset all onboarding records. Useful for development and testing.
 *
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean }}
 */
export const resetOnboardingRecords = (userId) => {
  try {
    saveOnboardingRecords([]);

    logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      message: 'All onboarding records have been reset.',
    });

    return { success: true };
  } catch (_err) {
    console.error('OnboardingService: Failed to reset onboarding records:', _err);
    return { success: false };
  }
};