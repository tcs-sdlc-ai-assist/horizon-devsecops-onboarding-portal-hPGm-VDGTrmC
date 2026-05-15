/**
 * LocalStorage utility for Horizon DevSecOps Portal
 * Provides JSON-safe get/set/remove with error handling, key prefixing,
 * mock-data initialization on first load, and data migration helpers.
 * @module utils/localStorage
 */

import { LOCAL_STORAGE_KEYS } from '../constants/constants.js';
import {
  MOCK_USERS,
  MOCK_DOMAINS,
  MOCK_PORTFOLIOS,
  MOCK_APPLICATIONS,
  MOCK_PIPELINE_CONFIGS,
  MOCK_PIPELINE_RUNS,
  MOCK_KPI_METRICS,
  MOCK_KPI_TRENDS,
  MOCK_MELT_METRICS,
  MOCK_MELT_EVENTS,
  MOCK_MELT_LOGS,
  MOCK_MELT_TRACES,
  MOCK_COMPLIANCE_ARTIFACTS,
  MOCK_AUDIT_LOGS,
  MOCK_INCIDENTS,
  MOCK_NOTIFICATIONS,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_TOOLCHAIN_ASSIGNMENTS,
} from '../constants/mockData.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'horizon_';
const STORAGE_VERSION_KEY = 'horizon_storage_version';
const CURRENT_STORAGE_VERSION = 1;
const INITIALIZED_KEY = 'horizon_initialized';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Prefix a key with the horizon namespace if it is not already prefixed.
 * @param {string} key
 * @returns {string}
 */
const prefixKey = (key) => {
  if (typeof key !== 'string' || key.length === 0) {
    return KEY_PREFIX;
  }
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`;
};

/**
 * Safely access window.localStorage.
 * Returns null when localStorage is unavailable (e.g. SSR, security restrictions).
 * @returns {Storage|null}
 */
const getStorage = () => {
  try {
    const storage = globalThis.localStorage;
    // Quick write/read test
    const testKey = '__horizon_storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch (_err) {
    console.warn('localStorage is not available.');
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve a value from localStorage, automatically JSON-parsing the result.
 * Returns `defaultValue` when the key does not exist or on any error.
 *
 * @param {string} key - Storage key (will be prefixed with `horizon_` if needed).
 * @param {*} [defaultValue=null] - Fallback value when key is missing or on error.
 * @returns {*} The parsed value or `defaultValue`.
 */
export const getStorageItem = (key, defaultValue = null) => {
  try {
    const storage = getStorage();
    if (!storage) {
      return defaultValue;
    }
    const prefixed = prefixKey(key);
    const raw = storage.getItem(prefixed);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (_err) {
    console.error(`Failed to get localStorage key "${key}":`, _err);
    return defaultValue;
  }
};

/**
 * Store a value in localStorage, automatically JSON-stringifying it.
 *
 * @param {string} key - Storage key (will be prefixed with `horizon_` if needed).
 * @param {*} value - The value to store (must be JSON-serialisable).
 * @returns {boolean} `true` on success, `false` on failure.
 */
export const setStorageItem = (key, value) => {
  try {
    const storage = getStorage();
    if (!storage) {
      return false;
    }
    const prefixed = prefixKey(key);
    const serialised = JSON.stringify(value);
    storage.setItem(prefixed, serialised);
    return true;
  } catch (_err) {
    console.error(`Failed to set localStorage key "${key}":`, _err);
    return false;
  }
};

/**
 * Remove a single key from localStorage.
 *
 * @param {string} key - Storage key (will be prefixed with `horizon_` if needed).
 * @returns {boolean} `true` on success, `false` on failure.
 */
export const removeStorageItem = (key) => {
  try {
    const storage = getStorage();
    if (!storage) {
      return false;
    }
    const prefixed = prefixKey(key);
    storage.removeItem(prefixed);
    return true;
  } catch (_err) {
    console.error(`Failed to remove localStorage key "${key}":`, _err);
    return false;
  }
};

/**
 * Remove ALL horizon-prefixed keys from localStorage.
 *
 * @returns {boolean} `true` on success, `false` on failure.
 */
export const clearStorage = () => {
  try {
    const storage = getStorage();
    if (!storage) {
      return false;
    }
    const keysToRemove = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => storage.removeItem(k));
    return true;
  } catch (_err) {
    console.error('Failed to clear horizon localStorage keys:', _err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Migration helpers
// ---------------------------------------------------------------------------

/**
 * Return the current storage schema version persisted in localStorage.
 * @returns {number} Version number, or 0 if not set.
 */
export const getStorageVersion = () => {
  try {
    const storage = getStorage();
    if (!storage) {
      return 0;
    }
    const raw = storage.getItem(STORAGE_VERSION_KEY);
    if (raw === null) {
      return 0;
    }
    const version = parseInt(raw, 10);
    return Number.isNaN(version) ? 0 : version;
  } catch (_err) {
    return 0;
  }
};

/**
 * Persist the current storage schema version.
 * @param {number} version
 * @returns {boolean}
 */
const setStorageVersion = (version) => {
  try {
    const storage = getStorage();
    if (!storage) {
      return false;
    }
    storage.setItem(STORAGE_VERSION_KEY, String(version));
    return true;
  } catch (_err) {
    return false;
  }
};

/**
 * Run any necessary data migrations when the storage schema version changes.
 * Each migration step should be idempotent.
 *
 * @returns {boolean} `true` when migrations completed (or none needed), `false` on error.
 */
export const migrateStorage = () => {
  try {
    const currentVersion = getStorageVersion();

    if (currentVersion >= CURRENT_STORAGE_VERSION) {
      return true;
    }

    // Migration from version 0 → 1: initial schema, re-seed mock data
    if (currentVersion < 1) {
      seedMockData();
    }

    // Future migrations would be added here:
    // if (currentVersion < 2) { ... }

    setStorageVersion(CURRENT_STORAGE_VERSION);
    return true;
  } catch (_err) {
    console.error('Storage migration failed:', _err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Mock data seeding
// ---------------------------------------------------------------------------

/**
 * Write all mock/seed datasets into localStorage so the portal can operate
 * without a backend during the prototype phase.
 */
const seedMockData = () => {
  setStorageItem('users', MOCK_USERS);
  setStorageItem('domains', MOCK_DOMAINS);
  setStorageItem('portfolios', MOCK_PORTFOLIOS);
  setStorageItem('applications', MOCK_APPLICATIONS);
  setStorageItem('pipeline_configs', MOCK_PIPELINE_CONFIGS);
  setStorageItem('pipeline_runs', MOCK_PIPELINE_RUNS);
  setStorageItem('kpi_metrics', MOCK_KPI_METRICS);
  setStorageItem('kpi_trends', MOCK_KPI_TRENDS);
  setStorageItem('melt_metrics', MOCK_MELT_METRICS);
  setStorageItem('melt_events', MOCK_MELT_EVENTS);
  setStorageItem('melt_logs', MOCK_MELT_LOGS);
  setStorageItem('melt_traces', MOCK_MELT_TRACES);
  setStorageItem('compliance_artifacts', MOCK_COMPLIANCE_ARTIFACTS);
  setStorageItem('audit_logs', MOCK_AUDIT_LOGS);
  setStorageItem('incidents', MOCK_INCIDENTS);
  setStorageItem('notifications', MOCK_NOTIFICATIONS);
  setStorageItem('dashboard_summary', MOCK_DASHBOARD_SUMMARY);
  setStorageItem('toolchain_assignments', MOCK_TOOLCHAIN_ASSIGNMENTS);
};

/**
 * Initialise localStorage on first load.
 * Seeds mock data when the store has never been initialised, and runs any
 * pending migrations when the schema version is outdated.
 *
 * Safe to call multiple times — subsequent calls are no-ops when the store
 * is already at the current version.
 *
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - When `true`, clears existing data and re-seeds.
 * @returns {boolean} `true` on success, `false` on failure.
 */
export const initializeStorage = (options = {}) => {
  try {
    const { force = false } = options;

    if (force) {
      clearStorage();
    }

    const storage = getStorage();
    if (!storage) {
      return false;
    }

    const alreadyInitialised = storage.getItem(INITIALIZED_KEY) === 'true';

    if (!alreadyInitialised || force) {
      seedMockData();

      // Set sensible defaults for user-preference keys
      if (!getStorageItem(LOCAL_STORAGE_KEYS.THEME)) {
        setStorageItem(LOCAL_STORAGE_KEYS.THEME, 'dark');
      }
      if (!getStorageItem(LOCAL_STORAGE_KEYS.SIDEBAR_COLLAPSED)) {
        setStorageItem(LOCAL_STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
      }
      if (!getStorageItem(LOCAL_STORAGE_KEYS.TABLE_PAGE_SIZE)) {
        setStorageItem(LOCAL_STORAGE_KEYS.TABLE_PAGE_SIZE, 20);
      }
      if (!getStorageItem(LOCAL_STORAGE_KEYS.RECENT_SEARCHES)) {
        setStorageItem(LOCAL_STORAGE_KEYS.RECENT_SEARCHES, []);
      }
      if (!getStorageItem(LOCAL_STORAGE_KEYS.FILTERS)) {
        setStorageItem(LOCAL_STORAGE_KEYS.FILTERS, {});
      }
      if (!getStorageItem(LOCAL_STORAGE_KEYS.USER_PREFERENCES)) {
        setStorageItem(LOCAL_STORAGE_KEYS.USER_PREFERENCES, {});
      }
      if (!getStorageItem(LOCAL_STORAGE_KEYS.NOTIFICATION_DISMISSED)) {
        setStorageItem(LOCAL_STORAGE_KEYS.NOTIFICATION_DISMISSED, []);
      }

      storage.setItem(INITIALIZED_KEY, 'true');
    }

    // Always run migrations in case the schema version has bumped
    migrateStorage();

    return true;
  } catch (_err) {
    console.error('Failed to initialise storage:', _err);
    return false;
  }
};