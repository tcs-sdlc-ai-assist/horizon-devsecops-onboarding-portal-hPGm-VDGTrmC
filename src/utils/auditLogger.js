/**
 * Audit logging utility for Horizon DevSecOps Portal
 * Provides immutable audit trail with localStorage persistence,
 * filtering, and export capabilities.
 * @module utils/auditLogger
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorageItem, setStorageItem } from './localStorage.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUDIT_STORAGE_KEY = 'audit_logs';

/**
 * Known audit action types for consistent categorisation.
 * @readonly
 * @enum {string}
 */
export const AUDIT_ACTIONS = Object.freeze({
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',
  APPLICATION_ONBOARD: 'APPLICATION_ONBOARD',
  APPLICATION_UPDATE: 'APPLICATION_UPDATE',
  APPLICATION_DELETE: 'APPLICATION_DELETE',
  PIPELINE_DEPLOY: 'PIPELINE_DEPLOY',
  PIPELINE_FAILED: 'PIPELINE_FAILED',
  PIPELINE_CONFIG_UPDATE: 'PIPELINE_CONFIG_UPDATE',
  TOOLCHAIN_CONFIG_UPDATE: 'TOOLCHAIN_CONFIG_UPDATE',
  COMPLIANCE_REVIEW: 'COMPLIANCE_REVIEW',
  COMPLIANCE_ARTIFACT_UPLOAD: 'COMPLIANCE_ARTIFACT_UPLOAD',
  INCIDENT_CREATE: 'INCIDENT_CREATE',
  INCIDENT_UPDATE: 'INCIDENT_UPDATE',
  INCIDENT_RESOLVE: 'INCIDENT_RESOLVE',
  REPORT_EXPORT: 'REPORT_EXPORT',
  SCHEDULED_SCAN: 'SCHEDULED_SCAN',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_IMPORT: 'DATA_IMPORT',
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve the current audit log entries from localStorage.
 * @returns {Array<Object>} Array of audit log entries.
 */
const loadAuditLogs = () => {
  const logs = getStorageItem(AUDIT_STORAGE_KEY, []);
  return Array.isArray(logs) ? logs : [];
};

/**
 * Persist audit log entries to localStorage.
 * @param {Array<Object>} logs - The full array of audit log entries.
 * @returns {boolean} `true` on success, `false` on failure.
 */
const saveAuditLogs = (logs) => {
  return setStorageItem(AUDIT_STORAGE_KEY, logs);
};

/**
 * Parse a value into a Date object. Returns `null` when the value is invalid.
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
const toDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Log an audit action. Creates an immutable audit entry and appends it to
 * the persisted audit trail in localStorage.
 *
 * @param {string|null} userId - The ID of the user performing the action (null for system actions).
 * @param {string} action - The action type (preferably one of AUDIT_ACTIONS).
 * @param {Object|string} [details={}] - Additional details about the action.
 * @param {string|null} [artifactRef=null] - Optional reference to a related artifact, resource, or entity ID.
 * @returns {{ success: boolean, entry: Object|null }} The created audit entry, or null on failure.
 */
export const logAction = (userId, action, details = {}, artifactRef = null) => {
  try {
    if (!action || typeof action !== 'string' || action.trim().length === 0) {
      console.error('Audit log: "action" is required and must be a non-empty string.');
      return { success: false, entry: null };
    }

    const entry = Object.freeze({
      id: `AUD-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      userId: userId !== null && userId !== undefined ? String(userId) : null,
      action: action.trim(),
      details: typeof details === 'string' ? { message: details } : { ...details },
      artifactRef: artifactRef !== null && artifactRef !== undefined ? String(artifactRef) : null,
    });

    const logs = loadAuditLogs();
    logs.push(entry);
    const saved = saveAuditLogs(logs);

    if (!saved) {
      console.error('Audit log: Failed to persist entry to localStorage.');
      return { success: false, entry };
    }

    return { success: true, entry };
  } catch (_err) {
    console.error('Audit log: Unexpected error while logging action:', _err);
    return { success: false, entry: null };
  }
};

/**
 * Retrieve audit log entries with optional filtering.
 *
 * @param {Object} [filters={}] - Filter criteria.
 * @param {string} [filters.userId] - Filter by user ID (exact match).
 * @param {string} [filters.action] - Filter by action type (exact match).
 * @param {string|Date} [filters.startDate] - Include entries on or after this date.
 * @param {string|Date} [filters.endDate] - Include entries on or before this date.
 * @param {string} [filters.artifactRef] - Filter by artifact reference (exact match).
 * @param {string} [filters.search] - Free-text search across action, details, and artifactRef.
 * @param {string} [filters.sortOrder='desc'] - Sort order by timestamp: 'asc' or 'desc'.
 * @param {number} [filters.limit] - Maximum number of entries to return.
 * @param {number} [filters.offset=0] - Number of entries to skip (for pagination).
 * @returns {{ entries: Array<Object>, total: number }} Filtered entries and total count before pagination.
 */
export const getAuditLogs = (filters = {}) => {
  try {
    let logs = loadAuditLogs();

    const {
      userId,
      action,
      startDate,
      endDate,
      artifactRef,
      search,
      sortOrder = 'desc',
      limit,
      offset = 0,
    } = filters;

    // Filter by userId
    if (userId !== null && userId !== undefined && String(userId).trim().length > 0) {
      const uid = String(userId).trim();
      logs = logs.filter((entry) => entry.userId === uid);
    }

    // Filter by action
    if (action !== null && action !== undefined && String(action).trim().length > 0) {
      const act = String(action).trim();
      logs = logs.filter((entry) => entry.action === act);
    }

    // Filter by artifactRef
    if (artifactRef !== null && artifactRef !== undefined && String(artifactRef).trim().length > 0) {
      const ref = String(artifactRef).trim();
      logs = logs.filter((entry) => entry.artifactRef === ref);
    }

    // Filter by date range
    const start = toDate(startDate);
    const end = toDate(endDate);

    if (start) {
      logs = logs.filter((entry) => {
        const entryDate = toDate(entry.timestamp);
        return entryDate !== null && entryDate >= start;
      });
    }

    if (end) {
      // Set end date to end of day for inclusive filtering
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      logs = logs.filter((entry) => {
        const entryDate = toDate(entry.timestamp);
        return entryDate !== null && entryDate <= endOfDay;
      });
    }

    // Free-text search
    if (search !== null && search !== undefined && String(search).trim().length > 0) {
      const query = String(search).trim().toLowerCase();
      logs = logs.filter((entry) => {
        const actionMatch = entry.action && entry.action.toLowerCase().includes(query);
        const refMatch = entry.artifactRef && entry.artifactRef.toLowerCase().includes(query);
        const detailsMatch =
          entry.details && JSON.stringify(entry.details).toLowerCase().includes(query);
        const userMatch = entry.userId && entry.userId.toLowerCase().includes(query);
        return actionMatch || refMatch || detailsMatch || userMatch;
      });
    }

    // Sort by timestamp
    logs.sort((a, b) => {
      const dateA = toDate(a.timestamp);
      const dateB = toDate(b.timestamp);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return sortOrder === 'asc'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });

    const total = logs.length;

    // Pagination
    const start_idx = typeof offset === 'number' && offset > 0 ? offset : 0;
    if (typeof limit === 'number' && limit > 0) {
      logs = logs.slice(start_idx, start_idx + limit);
    } else if (start_idx > 0) {
      logs = logs.slice(start_idx);
    }

    return { entries: logs, total };
  } catch (_err) {
    console.error('Audit log: Failed to retrieve audit logs:', _err);
    return { entries: [], total: 0 };
  }
};

/**
 * Export audit log entries as a JSON string suitable for download or transfer.
 * Applies the same filtering as {@link getAuditLogs}.
 *
 * @param {Object} [filters={}] - Same filter criteria as getAuditLogs.
 * @param {Object} [options={}] - Export options.
 * @param {string} [options.format='json'] - Export format: 'json' or 'csv'.
 * @returns {{ success: boolean, data: string, count: number, format: string }}
 */
export const exportAuditLogs = (filters = {}, options = {}) => {
  try {
    const { format = 'json' } = options;

    // Remove pagination for export — get all matching entries
    const exportFilters = { ...filters };
    delete exportFilters.limit;
    delete exportFilters.offset;

    const { entries, total } = getAuditLogs(exportFilters);

    if (format === 'csv') {
      const csvData = convertToCSV(entries);
      return { success: true, data: csvData, count: total, format: 'csv' };
    }

    // Default: JSON
    const jsonData = JSON.stringify(entries, null, 2);
    return { success: true, data: jsonData, count: total, format: 'json' };
  } catch (_err) {
    console.error('Audit log: Failed to export audit logs:', _err);
    return { success: false, data: '', count: 0, format: options.format || 'json' };
  }
};

/**
 * Convert an array of audit log entries to a CSV string.
 * @param {Array<Object>} entries - The audit log entries.
 * @returns {string} CSV-formatted string.
 */
const convertToCSV = (entries) => {
  if (!entries || entries.length === 0) {
    return '';
  }

  const headers = ['id', 'timestamp', 'userId', 'action', 'details', 'artifactRef'];
  const escapeCSV = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = entries.map((entry) =>
    headers.map((header) => escapeCSV(entry[header])).join(','),
  );

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Get a summary of audit log activity grouped by action type.
 *
 * @param {Object} [filters={}] - Same filter criteria as getAuditLogs (excluding sort/pagination).
 * @returns {Object} Object keyed by action type with count values.
 */
export const getAuditSummary = (filters = {}) => {
  try {
    const summaryFilters = { ...filters };
    delete summaryFilters.limit;
    delete summaryFilters.offset;
    delete summaryFilters.sortOrder;

    const { entries } = getAuditLogs(summaryFilters);

    const summary = {};
    entries.forEach((entry) => {
      const action = entry.action || 'UNKNOWN';
      summary[action] = (summary[action] || 0) + 1;
    });

    return summary;
  } catch (_err) {
    console.error('Audit log: Failed to generate audit summary:', _err);
    return {};
  }
};

/**
 * Get the total count of audit log entries, optionally filtered.
 *
 * @param {Object} [filters={}] - Same filter criteria as getAuditLogs.
 * @returns {number} Total count of matching entries.
 */
export const getAuditLogCount = (filters = {}) => {
  const countFilters = { ...filters };
  delete countFilters.limit;
  delete countFilters.offset;
  const { total } = getAuditLogs(countFilters);
  return total;
};

/**
 * Clear all audit logs from localStorage.
 * This is intended for development/testing purposes only.
 *
 * @returns {boolean} `true` on success, `false` on failure.
 */
export const clearAuditLogs = () => {
  try {
    return saveAuditLogs([]);
  } catch (_err) {
    console.error('Audit log: Failed to clear audit logs:', _err);
    return false;
  }
};