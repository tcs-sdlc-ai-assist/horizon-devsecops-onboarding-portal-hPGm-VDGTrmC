/**
 * Catalog data service for Horizon DevSecOps Portal
 * Provides CRUD operations for domains, portfolios, applications, and toolchains.
 * Reads/writes from localStorage with mock data initialization on first access.
 * @module services/CatalogService
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorageItem, setStorageItem, initializeStorage } from '../utils/localStorage.js';
import {
  MOCK_DOMAINS,
  MOCK_PORTFOLIOS,
  MOCK_APPLICATIONS,
  MOCK_TOOLCHAIN_ASSIGNMENTS,
  MOCK_PIPELINE_CONFIGS,
  MOCK_KPI_METRICS,
} from '../constants/mockData.js';
import {
  DOMAIN_LIST,
  PORTFOLIO_LIST,
  CRITICALITY_TIER_LIST,
  ENVIRONMENT_LIST,
  TOOLCHAIN_CATEGORY_LIST,
  TOOL_LIST,
} from '../constants/constants.js';
import { TOOLCHAIN_CATALOG, getCatalogByCategory } from '../constants/toolchainData.js';
import { validateOnboardingForm } from '../utils/validators.js';
import { logAction, AUDIT_ACTIONS } from '../utils/auditLogger.js';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = Object.freeze({
  DOMAINS: 'domains',
  PORTFOLIOS: 'portfolios',
  APPLICATIONS: 'applications',
  TOOLCHAIN_ASSIGNMENTS: 'toolchain_assignments',
  PIPELINE_CONFIGS: 'pipeline_configs',
  KPI_METRICS: 'kpi_metrics',
});

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Ensure localStorage is initialized with mock data.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
const ensureInitialized = () => {
  initializeStorage();
};

/**
 * Load a dataset from localStorage with fallback to provided default.
 * @param {string} key - Storage key.
 * @param {Array} fallback - Default data if key is missing.
 * @returns {Array}
 */
const loadData = (key, fallback) => {
  ensureInitialized();
  const data = getStorageItem(key, null);
  if (data !== null && Array.isArray(data)) {
    return data;
  }
  // Seed the fallback and return it
  setStorageItem(key, fallback);
  return [...fallback];
};

/**
 * Persist a dataset to localStorage.
 * @param {string} key - Storage key.
 * @param {Array} data - Data to persist.
 * @returns {boolean} `true` on success.
 */
const saveData = (key, data) => {
  return setStorageItem(key, data);
};

/**
 * Case-insensitive string match check.
 * @param {string} source - The string to search in.
 * @param {string} query - The search query.
 * @returns {boolean}
 */
const matchesSearch = (source, query) => {
  if (!source || !query) {
    return false;
  }
  return String(source).toLowerCase().includes(String(query).toLowerCase());
};

/**
 * Generic sort comparator.
 * @param {*} a - First value.
 * @param {*} b - Second value.
 * @param {string} order - 'asc' or 'desc'.
 * @returns {number}
 */
const compareValues = (a, b, order = 'asc') => {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  let comparison = 0;
  if (typeof a === 'string' && typeof b === 'string') {
    comparison = a.localeCompare(b, undefined, { sensitivity: 'base' });
  } else if (typeof a === 'number' && typeof b === 'number') {
    comparison = a - b;
  } else {
    comparison = String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
  }

  return order === 'desc' ? -comparison : comparison;
};

// ---------------------------------------------------------------------------
// Public API — Full Catalog
// ---------------------------------------------------------------------------

/**
 * Get the complete catalog including domains, portfolios, applications,
 * toolchains, and metadata.
 *
 * @returns {{
 *   domains: Array<Object>,
 *   portfolios: Array<Object>,
 *   applications: Array<Object>,
 *   toolchainCatalog: Array<Object>,
 *   toolchainByCategory: Object,
 *   toolchainAssignments: Array<Object>,
 *   pipelineConfigs: Array<Object>,
 *   kpiMetrics: Array<Object>,
 *   domainList: string[],
 *   portfolioList: string[],
 *   criticalityTierList: string[],
 *   environmentList: string[],
 *   toolchainCategoryList: string[],
 *   toolList: string[],
 * }}
 */
export const getCatalog = () => {
  const domains = getDomains();
  const portfolios = getPortfolios();
  const applications = getApplications();
  const toolchainAssignments = getToolchainAssignments();
  const pipelineConfigs = getPipelineConfigs();
  const kpiMetrics = getKpiMetrics();

  return {
    domains,
    portfolios,
    applications,
    toolchainCatalog: TOOLCHAIN_CATALOG,
    toolchainByCategory: getCatalogByCategory(),
    toolchainAssignments,
    pipelineConfigs,
    kpiMetrics,
    domainList: DOMAIN_LIST,
    portfolioList: PORTFOLIO_LIST,
    criticalityTierList: CRITICALITY_TIER_LIST,
    environmentList: ENVIRONMENT_LIST,
    toolchainCategoryList: TOOLCHAIN_CATEGORY_LIST,
    toolList: TOOL_LIST,
  };
};

/**
 * Update the entire catalog (or a subset) in localStorage.
 * Accepts an object with optional keys: domains, portfolios, applications,
 * toolchainAssignments, pipelineConfigs, kpiMetrics.
 *
 * @param {Object} data - Partial catalog data to merge/replace.
 * @param {Array<Object>} [data.domains] - Domains array.
 * @param {Array<Object>} [data.portfolios] - Portfolios array.
 * @param {Array<Object>} [data.applications] - Applications array.
 * @param {Array<Object>} [data.toolchainAssignments] - Toolchain assignments array.
 * @param {Array<Object>} [data.pipelineConfigs] - Pipeline configs array.
 * @param {Array<Object>} [data.kpiMetrics] - KPI metrics array.
 * @returns {{ success: boolean, error: string|null }}
 */
export const updateCatalog = (data) => {
  try {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Catalog data must be an object.' };
    }

    if (Array.isArray(data.domains)) {
      saveData(STORAGE_KEYS.DOMAINS, data.domains);
    }
    if (Array.isArray(data.portfolios)) {
      saveData(STORAGE_KEYS.PORTFOLIOS, data.portfolios);
    }
    if (Array.isArray(data.applications)) {
      saveData(STORAGE_KEYS.APPLICATIONS, data.applications);
    }
    if (Array.isArray(data.toolchainAssignments)) {
      saveData(STORAGE_KEYS.TOOLCHAIN_ASSIGNMENTS, data.toolchainAssignments);
    }
    if (Array.isArray(data.pipelineConfigs)) {
      saveData(STORAGE_KEYS.PIPELINE_CONFIGS, data.pipelineConfigs);
    }
    if (Array.isArray(data.kpiMetrics)) {
      saveData(STORAGE_KEYS.KPI_METRICS, data.kpiMetrics);
    }

    logAction(null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      message: 'Catalog data updated.',
      updatedKeys: Object.keys(data).filter((k) => Array.isArray(data[k])),
    });

    return { success: true, error: null };
  } catch (_err) {
    console.error('CatalogService: Failed to update catalog:', _err);
    return { success: false, error: 'Failed to update catalog.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Domains
// ---------------------------------------------------------------------------

/**
 * Get all domains, optionally filtered and sorted.
 *
 * @param {Object} [options]
 * @param {string} [options.search] - Free-text search across name and description.
 * @param {string} [options.sortBy='name'] - Field to sort by.
 * @param {string} [options.sortOrder='asc'] - Sort order: 'asc' or 'desc'.
 * @returns {Array<Object>}
 */
export const getDomains = (options = {}) => {
  const { search, sortBy = 'name', sortOrder = 'asc' } = options;

  let domains = loadData(STORAGE_KEYS.DOMAINS, MOCK_DOMAINS);

  if (search && typeof search === 'string' && search.trim().length > 0) {
    const query = search.trim();
    domains = domains.filter(
      (d) => matchesSearch(d.name, query) || matchesSearch(d.description, query),
    );
  }

  domains.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

  return domains;
};

/**
 * Get a single domain by its ID.
 *
 * @param {string} domainId - The domain ID.
 * @returns {Object|null} The domain object or null if not found.
 */
export const getDomainById = (domainId) => {
  if (!domainId) {
    return null;
  }
  const domains = loadData(STORAGE_KEYS.DOMAINS, MOCK_DOMAINS);
  return domains.find((d) => d.id === domainId) || null;
};

/**
 * Get a domain by its name.
 *
 * @param {string} domainName - The domain name.
 * @returns {Object|null} The domain object or null if not found.
 */
export const getDomainByName = (domainName) => {
  if (!domainName) {
    return null;
  }
  const domains = loadData(STORAGE_KEYS.DOMAINS, MOCK_DOMAINS);
  return domains.find((d) => d.name === domainName) || null;
};

// ---------------------------------------------------------------------------
// Public API — Portfolios
// ---------------------------------------------------------------------------

/**
 * Get portfolios, optionally filtered by domain and/or search query.
 *
 * @param {Object} [options]
 * @param {string} [options.domainId] - Filter by domain ID.
 * @param {string} [options.domainName] - Filter by domain name.
 * @param {string} [options.search] - Free-text search across name.
 * @param {string} [options.sortBy='name'] - Field to sort by.
 * @param {string} [options.sortOrder='asc'] - Sort order: 'asc' or 'desc'.
 * @returns {Array<Object>}
 */
export const getPortfolios = (options = {}) => {
  const { domainId, domainName, search, sortBy = 'name', sortOrder = 'asc' } = options;

  let portfolios = loadData(STORAGE_KEYS.PORTFOLIOS, MOCK_PORTFOLIOS);

  if (domainId && typeof domainId === 'string') {
    portfolios = portfolios.filter((p) => p.domainId === domainId);
  }

  if (domainName && typeof domainName === 'string') {
    portfolios = portfolios.filter((p) => p.domainName === domainName);
  }

  if (search && typeof search === 'string' && search.trim().length > 0) {
    const query = search.trim();
    portfolios = portfolios.filter(
      (p) => matchesSearch(p.name, query) || matchesSearch(p.domainName, query),
    );
  }

  portfolios.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

  return portfolios;
};

/**
 * Get a single portfolio by its ID.
 *
 * @param {string} portfolioId - The portfolio ID.
 * @returns {Object|null} The portfolio object or null if not found.
 */
export const getPortfolioById = (portfolioId) => {
  if (!portfolioId) {
    return null;
  }
  const portfolios = loadData(STORAGE_KEYS.PORTFOLIOS, MOCK_PORTFOLIOS);
  return portfolios.find((p) => p.id === portfolioId) || null;
};

// ---------------------------------------------------------------------------
// Public API — Applications
// ---------------------------------------------------------------------------

/**
 * Get applications, optionally filtered by domain, portfolio, criticality,
 * environment, search query, and sorted.
 *
 * @param {Object} [options]
 * @param {string} [options.domainId] - Filter by domain ID.
 * @param {string} [options.domainName] - Filter by domain name.
 * @param {string} [options.portfolioId] - Filter by portfolio ID.
 * @param {string} [options.portfolioName] - Filter by portfolio name.
 * @param {string} [options.criticalityTier] - Filter by criticality tier.
 * @param {string} [options.environment] - Filter by environment (checks environments array).
 * @param {string} [options.status] - Filter by status.
 * @param {string} [options.search] - Free-text search across name, shortCode, description, tags.
 * @param {string} [options.sortBy='name'] - Field to sort by.
 * @param {string} [options.sortOrder='asc'] - Sort order: 'asc' or 'desc'.
 * @param {number} [options.limit] - Maximum number of results.
 * @param {number} [options.offset=0] - Number of results to skip.
 * @returns {{ data: Array<Object>, total: number }}
 */
export const getApplications = (options = {}) => {
  const {
    domainId,
    domainName,
    portfolioId,
    portfolioName,
    criticalityTier,
    environment,
    status,
    search,
    sortBy = 'name',
    sortOrder = 'asc',
    limit,
    offset = 0,
  } = options;

  let apps = loadData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);

  // Filter by domain
  if (domainId && typeof domainId === 'string') {
    apps = apps.filter((a) => a.domainId === domainId);
  }
  if (domainName && typeof domainName === 'string') {
    apps = apps.filter((a) => a.domainName === domainName);
  }

  // Filter by portfolio
  if (portfolioId && typeof portfolioId === 'string') {
    apps = apps.filter((a) => a.portfolioId === portfolioId);
  }
  if (portfolioName && typeof portfolioName === 'string') {
    apps = apps.filter((a) => a.portfolioName === portfolioName);
  }

  // Filter by criticality tier
  if (criticalityTier && typeof criticalityTier === 'string') {
    apps = apps.filter((a) => a.criticalityTier === criticalityTier);
  }

  // Filter by environment
  if (environment && typeof environment === 'string') {
    apps = apps.filter(
      (a) => Array.isArray(a.environments) && a.environments.includes(environment),
    );
  }

  // Filter by status
  if (status && typeof status === 'string') {
    apps = apps.filter((a) => a.status === status);
  }

  // Free-text search
  if (search && typeof search === 'string' && search.trim().length > 0) {
    const query = search.trim();
    apps = apps.filter((a) => {
      const nameMatch = matchesSearch(a.name, query);
      const shortCodeMatch = matchesSearch(a.shortCode, query);
      const descMatch = matchesSearch(a.description, query);
      const domainMatch = matchesSearch(a.domainName, query);
      const portfolioMatch = matchesSearch(a.portfolioName, query);
      const ownerMatch = matchesSearch(a.ownerName, query);
      const tagMatch =
        Array.isArray(a.tags) && a.tags.some((tag) => matchesSearch(tag, query));
      const techMatch =
        Array.isArray(a.techStack) && a.techStack.some((tech) => matchesSearch(tech, query));
      return (
        nameMatch ||
        shortCodeMatch ||
        descMatch ||
        domainMatch ||
        portfolioMatch ||
        ownerMatch ||
        tagMatch ||
        techMatch
      );
    });
  }

  // Sort
  apps.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

  const total = apps.length;

  // Pagination
  const startIdx = typeof offset === 'number' && offset > 0 ? offset : 0;
  if (typeof limit === 'number' && limit > 0) {
    apps = apps.slice(startIdx, startIdx + limit);
  } else if (startIdx > 0) {
    apps = apps.slice(startIdx);
  }

  return { data: apps, total };
};

/**
 * Get a single application by its ID.
 *
 * @param {string} applicationId - The application ID.
 * @returns {Object|null} The application object or null if not found.
 */
export const getApplicationById = (applicationId) => {
  if (!applicationId) {
    return null;
  }
  const apps = loadData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
  return apps.find((a) => a.id === applicationId) || null;
};

/**
 * Get a single application by its short code.
 *
 * @param {string} shortCode - The application short code.
 * @returns {Object|null} The application object or null if not found.
 */
export const getApplicationByShortCode = (shortCode) => {
  if (!shortCode) {
    return null;
  }
  const apps = loadData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
  const code = String(shortCode).trim().toUpperCase();
  return apps.find((a) => a.shortCode && a.shortCode.toUpperCase() === code) || null;
};

/**
 * Add a new application to the catalog.
 *
 * @param {Object} appData - The application data.
 * @param {string} appData.name - Application name.
 * @param {string} appData.shortCode - Short code identifier.
 * @param {string} appData.description - Application description.
 * @param {string} appData.domainName - Domain name.
 * @param {string} appData.portfolioName - Portfolio name.
 * @param {string} appData.criticalityTier - Criticality tier.
 * @param {string} appData.ownerName - Owner display name.
 * @param {string} [appData.ownerEmail] - Owner email address.
 * @param {string[]} [appData.environments] - Selected environments.
 * @param {string[]} [appData.techStack] - Technology stack entries.
 * @param {string[]} [appData.tags] - Tags.
 * @param {string} [appData.repoUrl] - Repository URL.
 * @param {string} [appData.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, application: Object|null, errors: string[] }}
 */
export const addApplication = (appData) => {
  try {
    if (!appData || typeof appData !== 'object') {
      return { success: false, application: null, errors: ['Application data is required.'] };
    }

    // Validate using the onboarding form validator
    const validation = validateOnboardingForm(appData);
    if (!validation.valid) {
      return { success: false, application: null, errors: validation.errors };
    }

    const apps = loadData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);

    // Check for duplicate name
    const nameExists = apps.some(
      (a) => a.name && a.name.toLowerCase() === String(appData.name).trim().toLowerCase(),
    );
    if (nameExists) {
      return {
        success: false,
        application: null,
        errors: [`Application with name "${appData.name.trim()}" already exists.`],
      };
    }

    // Check for duplicate short code
    const codeExists = apps.some(
      (a) =>
        a.shortCode &&
        a.shortCode.toUpperCase() === String(appData.shortCode).trim().toUpperCase(),
    );
    if (codeExists) {
      return {
        success: false,
        application: null,
        errors: [`Application with short code "${appData.shortCode.trim()}" already exists.`],
      };
    }

    // Resolve domain and portfolio IDs
    const domains = loadData(STORAGE_KEYS.DOMAINS, MOCK_DOMAINS);
    const portfolios = loadData(STORAGE_KEYS.PORTFOLIOS, MOCK_PORTFOLIOS);

    const domain = domains.find((d) => d.name === String(appData.domainName).trim());
    const portfolio = portfolios.find((p) => p.name === String(appData.portfolioName).trim());

    const newApp = {
      id: `APP-${uuidv4().slice(0, 8).toUpperCase()}`,
      name: String(appData.name).trim(),
      shortCode: String(appData.shortCode).trim().toUpperCase(),
      description: String(appData.description).trim(),
      domainId: domain ? domain.id : null,
      domainName: String(appData.domainName).trim(),
      portfolioId: portfolio ? portfolio.id : null,
      portfolioName: String(appData.portfolioName).trim(),
      criticalityTier: String(appData.criticalityTier).trim(),
      owner: appData.ownerId || null,
      ownerName: String(appData.ownerName).trim(),
      techStack: Array.isArray(appData.techStack) ? [...appData.techStack] : [],
      environments: Array.isArray(appData.environments)
        ? [...appData.environments]
        : [ENVIRONMENT_LIST[0]],
      onboardedAt: new Date().toISOString(),
      status: appData.status || 'active',
      repoUrl: appData.repoUrl ? String(appData.repoUrl).trim() : '',
      tags: Array.isArray(appData.tags)
        ? appData.tags.map((t) => String(t).trim().toLowerCase())
        : [],
    };

    apps.push(newApp);
    saveData(STORAGE_KEYS.APPLICATIONS, apps);

    // Update domain application count
    if (domain) {
      const updatedDomains = domains.map((d) => {
        if (d.id === domain.id) {
          return { ...d, applicationCount: (d.applicationCount || 0) + 1 };
        }
        return d;
      });
      saveData(STORAGE_KEYS.DOMAINS, updatedDomains);
    }

    // Update portfolio application count
    if (portfolio) {
      const updatedPortfolios = portfolios.map((p) => {
        if (p.id === portfolio.id) {
          return { ...p, applicationCount: (p.applicationCount || 0) + 1 };
        }
        return p;
      });
      saveData(STORAGE_KEYS.PORTFOLIOS, updatedPortfolios);
    }

    logAction(appData.userId || null, AUDIT_ACTIONS.APPLICATION_ONBOARD, {
      applicationId: newApp.id,
      applicationName: newApp.name,
      domainName: newApp.domainName,
      portfolioName: newApp.portfolioName,
      criticalityTier: newApp.criticalityTier,
    });

    return { success: true, application: newApp, errors: [] };
  } catch (_err) {
    console.error('CatalogService: Failed to add application:', _err);
    return { success: false, application: null, errors: ['Failed to add application.'] };
  }
};

/**
 * Update an existing application by its ID.
 *
 * @param {string} applicationId - The application ID to update.
 * @param {Object} updates - Partial application data to merge.
 * @param {string} [updates.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, application: Object|null, errors: string[] }}
 */
export const updateApplication = (applicationId, updates) => {
  try {
    if (!applicationId || typeof applicationId !== 'string') {
      return { success: false, application: null, errors: ['Application ID is required.'] };
    }

    if (!updates || typeof updates !== 'object') {
      return { success: false, application: null, errors: ['Update data is required.'] };
    }

    const apps = loadData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
    const index = apps.findIndex((a) => a.id === applicationId);

    if (index === -1) {
      return {
        success: false,
        application: null,
        errors: [`Application with ID "${applicationId}" not found.`],
      };
    }

    const existing = apps[index];

    // Check for duplicate name if name is being changed
    if (
      updates.name &&
      typeof updates.name === 'string' &&
      updates.name.trim().toLowerCase() !== existing.name.toLowerCase()
    ) {
      const nameExists = apps.some(
        (a) =>
          a.id !== applicationId &&
          a.name &&
          a.name.toLowerCase() === updates.name.trim().toLowerCase(),
      );
      if (nameExists) {
        return {
          success: false,
          application: null,
          errors: [`Application with name "${updates.name.trim()}" already exists.`],
        };
      }
    }

    // Check for duplicate short code if short code is being changed
    if (
      updates.shortCode &&
      typeof updates.shortCode === 'string' &&
      updates.shortCode.trim().toUpperCase() !== (existing.shortCode || '').toUpperCase()
    ) {
      const codeExists = apps.some(
        (a) =>
          a.id !== applicationId &&
          a.shortCode &&
          a.shortCode.toUpperCase() === updates.shortCode.trim().toUpperCase(),
      );
      if (codeExists) {
        return {
          success: false,
          application: null,
          errors: [`Application with short code "${updates.shortCode.trim()}" already exists.`],
        };
      }
    }

    // Build the updated application
    const updatedApp = { ...existing };

    if (updates.name !== undefined) {
      updatedApp.name = String(updates.name).trim();
    }
    if (updates.shortCode !== undefined) {
      updatedApp.shortCode = String(updates.shortCode).trim().toUpperCase();
    }
    if (updates.description !== undefined) {
      updatedApp.description = String(updates.description).trim();
    }
    if (updates.domainName !== undefined) {
      updatedApp.domainName = String(updates.domainName).trim();
      const domains = loadData(STORAGE_KEYS.DOMAINS, MOCK_DOMAINS);
      const domain = domains.find((d) => d.name === updatedApp.domainName);
      updatedApp.domainId = domain ? domain.id : existing.domainId;
    }
    if (updates.portfolioName !== undefined) {
      updatedApp.portfolioName = String(updates.portfolioName).trim();
      const portfolios = loadData(STORAGE_KEYS.PORTFOLIOS, MOCK_PORTFOLIOS);
      const portfolio = portfolios.find((p) => p.name === updatedApp.portfolioName);
      updatedApp.portfolioId = portfolio ? portfolio.id : existing.portfolioId;
    }
    if (updates.criticalityTier !== undefined) {
      updatedApp.criticalityTier = String(updates.criticalityTier).trim();
    }
    if (updates.ownerName !== undefined) {
      updatedApp.ownerName = String(updates.ownerName).trim();
    }
    if (updates.owner !== undefined) {
      updatedApp.owner = updates.owner;
    }
    if (updates.environments !== undefined && Array.isArray(updates.environments)) {
      updatedApp.environments = [...updates.environments];
    }
    if (updates.techStack !== undefined && Array.isArray(updates.techStack)) {
      updatedApp.techStack = [...updates.techStack];
    }
    if (updates.tags !== undefined && Array.isArray(updates.tags)) {
      updatedApp.tags = updates.tags.map((t) => String(t).trim().toLowerCase());
    }
    if (updates.repoUrl !== undefined) {
      updatedApp.repoUrl = updates.repoUrl ? String(updates.repoUrl).trim() : '';
    }
    if (updates.status !== undefined) {
      updatedApp.status = String(updates.status).trim();
    }

    updatedApp.updatedAt = new Date().toISOString();

    apps[index] = updatedApp;
    saveData(STORAGE_KEYS.APPLICATIONS, apps);

    logAction(updates.userId || null, AUDIT_ACTIONS.APPLICATION_UPDATE, {
      applicationId: updatedApp.id,
      applicationName: updatedApp.name,
      updatedFields: Object.keys(updates).filter((k) => k !== 'userId'),
    });

    return { success: true, application: updatedApp, errors: [] };
  } catch (_err) {
    console.error('CatalogService: Failed to update application:', _err);
    return { success: false, application: null, errors: ['Failed to update application.'] };
  }
};

/**
 * Delete an application by its ID.
 *
 * @param {string} applicationId - The application ID to delete.
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean, error: string|null }}
 */
export const deleteApplication = (applicationId, userId) => {
  try {
    if (!applicationId || typeof applicationId !== 'string') {
      return { success: false, error: 'Application ID is required.' };
    }

    const apps = loadData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
    const index = apps.findIndex((a) => a.id === applicationId);

    if (index === -1) {
      return { success: false, error: `Application with ID "${applicationId}" not found.` };
    }

    const removed = apps[index];
    apps.splice(index, 1);
    saveData(STORAGE_KEYS.APPLICATIONS, apps);

    logAction(userId || null, AUDIT_ACTIONS.APPLICATION_DELETE, {
      applicationId: removed.id,
      applicationName: removed.name,
      domainName: removed.domainName,
      portfolioName: removed.portfolioName,
    });

    return { success: true, error: null };
  } catch (_err) {
    console.error('CatalogService: Failed to delete application:', _err);
    return { success: false, error: 'Failed to delete application.' };
  }
};

/**
 * Bulk add applications from parsed CSV/Excel data.
 *
 * @param {Array<Object>} applicationsData - Array of application data objects.
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean, added: number, skipped: Array<{ index: number, name: string, reason: string }>, errors: string[] }}
 */
export const bulkAddApplications = (applicationsData, userId) => {
  try {
    if (!applicationsData || !Array.isArray(applicationsData)) {
      return { success: false, added: 0, skipped: [], errors: ['Data must be an array.'] };
    }

    if (applicationsData.length === 0) {
      return { success: false, added: 0, skipped: [], errors: ['No data to import.'] };
    }

    let addedCount = 0;
    const skipped = [];
    const errors = [];

    for (let i = 0; i < applicationsData.length; i++) {
      const appData = applicationsData[i];
      const result = addApplication({ ...appData, userId });

      if (result.success) {
        addedCount++;
      } else {
        skipped.push({
          index: i + 1,
          name: appData.name || `Row ${i + 1}`,
          reason: result.errors.join('; '),
        });
      }
    }

    if (addedCount === 0 && skipped.length > 0) {
      errors.push('No applications were successfully imported.');
    }

    logAction(userId || null, AUDIT_ACTIONS.DATA_IMPORT, {
      message: 'Bulk application import completed.',
      totalRecords: applicationsData.length,
      added: addedCount,
      skipped: skipped.length,
    });

    return {
      success: addedCount > 0,
      added: addedCount,
      skipped,
      errors,
    };
  } catch (_err) {
    console.error('CatalogService: Bulk add failed:', _err);
    return { success: false, added: 0, skipped: [], errors: ['Bulk import failed.'] };
  }
};

// ---------------------------------------------------------------------------
// Public API — Toolchains
// ---------------------------------------------------------------------------

/**
 * Get the toolchain catalog (all available tools).
 *
 * @param {Object} [options]
 * @param {string} [options.category] - Filter by toolchain category.
 * @param {string} [options.search] - Free-text search across name and description.
 * @returns {Array<Object>}
 */
export const getToolchains = (options = {}) => {
  const { category, search } = options;

  let tools = [...TOOLCHAIN_CATALOG];

  if (category && typeof category === 'string') {
    tools = tools.filter((t) => t.category === category);
  }

  if (search && typeof search === 'string' && search.trim().length > 0) {
    const query = search.trim();
    tools = tools.filter(
      (t) => matchesSearch(t.name, query) || matchesSearch(t.description, query),
    );
  }

  return tools;
};

/**
 * Get toolchain assignments for all applications or a specific application.
 *
 * @param {Object} [options]
 * @param {string} [options.applicationId] - Filter by application ID.
 * @returns {Array<Object>}
 */
export const getToolchainAssignments = (options = {}) => {
  const { applicationId } = options;

  let assignments = loadData(STORAGE_KEYS.TOOLCHAIN_ASSIGNMENTS, MOCK_TOOLCHAIN_ASSIGNMENTS);

  if (applicationId && typeof applicationId === 'string') {
    assignments = assignments.filter((a) => a.applicationId === applicationId);
  }

  return assignments;
};

/**
 * Save or update toolchain assignments for an application.
 *
 * @param {string} applicationId - The application ID.
 * @param {string} applicationName - The application name.
 * @param {Array<Object>} tools - Array of tool assignment objects.
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean, error: string|null }}
 */
export const saveToolchainAssignment = (applicationId, applicationName, tools, userId) => {
  try {
    if (!applicationId || !applicationName) {
      return { success: false, error: 'Application ID and name are required.' };
    }

    if (!Array.isArray(tools)) {
      return { success: false, error: 'Tools must be an array.' };
    }

    const assignments = loadData(STORAGE_KEYS.TOOLCHAIN_ASSIGNMENTS, MOCK_TOOLCHAIN_ASSIGNMENTS);
    const existingIndex = assignments.findIndex((a) => a.applicationId === applicationId);

    const assignment = {
      applicationId,
      applicationName,
      tools: tools.map((t) => ({
        category: t.category || '',
        tool: t.tool || '',
        configured: t.configured !== false,
      })),
    };

    if (existingIndex >= 0) {
      assignments[existingIndex] = assignment;
    } else {
      assignments.push(assignment);
    }

    saveData(STORAGE_KEYS.TOOLCHAIN_ASSIGNMENTS, assignments);

    logAction(userId || null, AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE, {
      applicationId,
      applicationName,
      toolCount: tools.length,
    });

    return { success: true, error: null };
  } catch (_err) {
    console.error('CatalogService: Failed to save toolchain assignment:', _err);
    return { success: false, error: 'Failed to save toolchain assignment.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Pipeline Configs
// ---------------------------------------------------------------------------

/**
 * Get pipeline configurations, optionally filtered by application.
 *
 * @param {Object} [options]
 * @param {string} [options.applicationId] - Filter by application ID.
 * @returns {Array<Object>}
 */
export const getPipelineConfigs = (options = {}) => {
  const { applicationId } = options;

  let configs = loadData(STORAGE_KEYS.PIPELINE_CONFIGS, MOCK_PIPELINE_CONFIGS);

  if (applicationId && typeof applicationId === 'string') {
    configs = configs.filter((c) => c.applicationId === applicationId);
  }

  return configs;
};

// ---------------------------------------------------------------------------
// Public API — KPI Metrics
// ---------------------------------------------------------------------------

/**
 * Get KPI metrics, optionally filtered by application.
 *
 * @param {Object} [options]
 * @param {string} [options.applicationId] - Filter by application ID.
 * @returns {Array<Object>}
 */
export const getKpiMetrics = (options = {}) => {
  const { applicationId } = options;

  let metrics = loadData(STORAGE_KEYS.KPI_METRICS, MOCK_KPI_METRICS);

  if (applicationId && typeof applicationId === 'string') {
    metrics = metrics.filter((m) => m.applicationId === applicationId);
  }

  return metrics;
};

// ---------------------------------------------------------------------------
// Public API — Statistics & Summaries
// ---------------------------------------------------------------------------

/**
 * Get summary statistics for the catalog.
 *
 * @returns {{
 *   totalDomains: number,
 *   totalPortfolios: number,
 *   totalApplications: number,
 *   applicationsByDomain: Array<{ domain: string, count: number }>,
 *   applicationsByCriticality: Array<{ tier: string, count: number }>,
 *   applicationsByStatus: Array<{ status: string, count: number }>,
 * }}
 */
export const getCatalogSummary = () => {
  const domains = getDomains();
  const portfolios = getPortfolios();
  const { data: apps } = getApplications();

  // Group by domain
  const domainCounts = {};
  apps.forEach((app) => {
    const key = app.domainName || 'Unknown';
    domainCounts[key] = (domainCounts[key] || 0) + 1;
  });
  const applicationsByDomain = Object.entries(domainCounts).map(([domain, count]) => ({
    domain,
    count,
  }));

  // Group by criticality
  const critCounts = {};
  apps.forEach((app) => {
    const key = app.criticalityTier || 'Unknown';
    critCounts[key] = (critCounts[key] || 0) + 1;
  });
  const applicationsByCriticality = Object.entries(critCounts).map(([tier, count]) => ({
    tier,
    count,
  }));

  // Group by status
  const statusCounts = {};
  apps.forEach((app) => {
    const key = app.status || 'unknown';
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });
  const applicationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  return {
    totalDomains: domains.length,
    totalPortfolios: portfolios.length,
    totalApplications: apps.length,
    applicationsByDomain,
    applicationsByCriticality,
    applicationsByStatus,
  };
};

/**
 * Search across all catalog entities (domains, portfolios, applications).
 *
 * @param {string} query - The search query string.
 * @param {Object} [options]
 * @param {number} [options.limit=20] - Maximum results per entity type.
 * @returns {{
 *   domains: Array<Object>,
 *   portfolios: Array<Object>,
 *   applications: Array<Object>,
 *   totalResults: number,
 * }}
 */
export const searchCatalog = (query, options = {}) => {
  const { limit = 20 } = options;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return { domains: [], portfolios: [], applications: [], totalResults: 0 };
  }

  const trimmedQuery = query.trim();

  const domains = getDomains({ search: trimmedQuery }).slice(0, limit);
  const portfolios = getPortfolios({ search: trimmedQuery }).slice(0, limit);
  const { data: applications } = getApplications({ search: trimmedQuery, limit });

  return {
    domains,
    portfolios,
    applications,
    totalResults: domains.length + portfolios.length + applications.length,
  };
};

/**
 * Reset the catalog to its default mock data state.
 * Useful for development and testing.
 *
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean }}
 */
export const resetCatalog = (userId) => {
  try {
    saveData(STORAGE_KEYS.DOMAINS, MOCK_DOMAINS);
    saveData(STORAGE_KEYS.PORTFOLIOS, MOCK_PORTFOLIOS);
    saveData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
    saveData(STORAGE_KEYS.TOOLCHAIN_ASSIGNMENTS, MOCK_TOOLCHAIN_ASSIGNMENTS);
    saveData(STORAGE_KEYS.PIPELINE_CONFIGS, MOCK_PIPELINE_CONFIGS);
    saveData(STORAGE_KEYS.KPI_METRICS, MOCK_KPI_METRICS);

    logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      message: 'Catalog reset to default mock data.',
    });

    return { success: true };
  } catch (_err) {
    console.error('CatalogService: Failed to reset catalog:', _err);
    return { success: false };
  }
};