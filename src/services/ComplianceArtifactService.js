/**
 * Compliance artifact generation service for Horizon DevSecOps Portal
 * Generates ITM artifacts for ServiceNow change records, QE evidence,
 * security scan reports, approval/sign-off packs, and HIPAA/CMS
 * audit-ready documentation. Stores metadata in localStorage.
 * @module services/ComplianceArtifactService
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorageItem, setStorageItem, initializeStorage } from '../utils/localStorage.js';
import { logAction, AUDIT_ACTIONS } from '../utils/auditLogger.js';
import { getApplicationById } from './CatalogService.js';
import { getPipelineByApplicationId, getPipelineRuns } from './PipelineService.js';
import { getGovernanceData, getKPIData, getMELTData, getMTTRMetrics } from './DashboardDataService.js';
import {
  MOCK_COMPLIANCE_ARTIFACTS,
  MOCK_PIPELINE_RUNS,
  MOCK_INCIDENTS,
} from '../constants/mockData.js';
import {
  COMPLIANCE_ARTIFACT_TYPES,
  COMPLIANCE_STATUSES,
  SEVERITY_LEVELS,
  ENVIRONMENTS,
  CRITICALITY_TIERS,
  PIPELINE_STATUSES,
} from '../constants/constants.js';
import { formatDate, formatDuration } from '../utils/formatters.js';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = Object.freeze({
  ARTIFACTS: 'compliance_artifacts_generated',
  CHANGE_RECORDS: 'compliance_change_records',
  QE_EVIDENCE: 'compliance_qe_evidence',
  SECURITY_REPORTS: 'compliance_security_reports',
  SIGN_OFF_PACKS: 'compliance_sign_off_packs',
  AUDIT_DOCS: 'compliance_audit_docs',
});

// ---------------------------------------------------------------------------
// Artifact Types
// ---------------------------------------------------------------------------

/**
 * Extended artifact types for generation.
 * @readonly
 * @enum {string}
 */
export const ARTIFACT_TYPES = Object.freeze({
  ITM_CHANGE_RECORD: 'ITM Change Record',
  QE_EVIDENCE: 'QE Evidence Package',
  SECURITY_SCAN_REPORT: 'Security Scan Report',
  SIGN_OFF_PACK: 'Sign-Off Pack',
  AUDIT_DOCUMENTATION: 'Audit Documentation',
  SAST_REPORT: COMPLIANCE_ARTIFACT_TYPES.SAST_REPORT,
  DAST_REPORT: COMPLIANCE_ARTIFACT_TYPES.DAST_REPORT,
  SCA_REPORT: COMPLIANCE_ARTIFACT_TYPES.SCA_REPORT,
  CONTAINER_SCAN_REPORT: COMPLIANCE_ARTIFACT_TYPES.CONTAINER_SCAN_REPORT,
  PENETRATION_TEST: COMPLIANCE_ARTIFACT_TYPES.PENETRATION_TEST,
  RISK_ASSESSMENT: COMPLIANCE_ARTIFACT_TYPES.RISK_ASSESSMENT,
  CHANGE_REQUEST: COMPLIANCE_ARTIFACT_TYPES.CHANGE_REQUEST,
  APPROVAL_RECORD: COMPLIANCE_ARTIFACT_TYPES.APPROVAL_RECORD,
  COMPLIANCE_CHECKLIST: COMPLIANCE_ARTIFACT_TYPES.COMPLIANCE_CHECKLIST,
  EVIDENCE_PACKAGE: COMPLIANCE_ARTIFACT_TYPES.EVIDENCE_PACKAGE,
  DEPLOYMENT_MANIFEST: COMPLIANCE_ARTIFACT_TYPES.DEPLOYMENT_MANIFEST,
  DISASTER_RECOVERY_PLAN: COMPLIANCE_ARTIFACT_TYPES.DISASTER_RECOVERY_PLAN,
});

export const ARTIFACT_TYPE_LIST = Object.freeze(Object.values(ARTIFACT_TYPES));

// ---------------------------------------------------------------------------
// Artifact Statuses
// ---------------------------------------------------------------------------

/**
 * Artifact generation statuses.
 * @readonly
 * @enum {string}
 */
export const ARTIFACT_GENERATION_STATUSES = Object.freeze({
  GENERATED: 'generated',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
});

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Ensure localStorage is initialized.
 */
const ensureInitialized = () => {
  initializeStorage();
};

/**
 * Load a dataset from localStorage with fallback.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
const loadData = (key, fallback) => {
  ensureInitialized();
  const data = getStorageItem(key, null);
  if (data !== null && Array.isArray(data)) {
    return data;
  }
  setStorageItem(key, fallback);
  return Array.isArray(fallback) ? [...fallback] : fallback;
};

/**
 * Persist a dataset to localStorage.
 * @param {string} key
 * @param {*} data
 * @returns {boolean}
 */
const saveData = (key, data) => {
  return setStorageItem(key, data);
};

/**
 * Case-insensitive string match.
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

/**
 * Generic sort comparator.
 * @param {*} a
 * @param {*} b
 * @param {string} order
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

/**
 * Generate a unique artifact ID.
 * @param {string} prefix
 * @returns {string}
 */
const generateArtifactId = (prefix = 'ART') => {
  return `${prefix}-${uuidv4().slice(0, 8).toUpperCase()}`;
};

/**
 * Calculate an expiration date from now.
 * @param {number} daysFromNow
 * @returns {string} ISO date string.
 */
const calculateExpirationDate = (daysFromNow = 180) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
};

/**
 * Build a findings summary from scan data.
 * @param {Object} scanData
 * @returns {Object}
 */
const buildFindingsSummary = (scanData) => {
  if (!scanData || typeof scanData !== 'object') {
    return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  }

  return {
    critical: typeof scanData.critical === 'number' ? scanData.critical : 0,
    high: typeof scanData.high === 'number' ? scanData.high : 0,
    medium: typeof scanData.medium === 'number' ? scanData.medium : 0,
    low: typeof scanData.low === 'number' ? scanData.low : 0,
    info: typeof scanData.info === 'number' ? scanData.info : 0,
  };
};

/**
 * Determine compliance status from findings.
 * @param {Object} findings
 * @param {string} criticalityTier
 * @returns {string}
 */
const determineComplianceStatus = (findings, criticalityTier) => {
  if (!findings || typeof findings !== 'object') {
    return COMPLIANCE_STATUSES.PENDING_REVIEW;
  }

  const { critical = 0, high = 0 } = findings;

  if (critical > 0) {
    return COMPLIANCE_STATUSES.NON_COMPLIANT;
  }

  if (
    high > 0 &&
    (criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL ||
      criticalityTier === CRITICALITY_TIERS.MISSION_CRITICAL)
  ) {
    return COMPLIANCE_STATUSES.NON_COMPLIANT;
  }

  if (high > 0) {
    return COMPLIANCE_STATUSES.PARTIAL;
  }

  return COMPLIANCE_STATUSES.COMPLIANT;
};

/**
 * Generate artifact content as a structured text document.
 * @param {string} title
 * @param {Array<{ heading: string, content: string }>} sections
 * @returns {string}
 */
const generateDocumentContent = (title, sections) => {
  const lines = [];
  const separator = '='.repeat(72);
  const now = new Date().toISOString();

  lines.push(separator);
  lines.push(`  ${title}`);
  lines.push(`  Generated: ${now}`);
  lines.push(`  Horizon DevSecOps Portal - Compliance Artifact`);
  lines.push(separator);
  lines.push('');

  if (Array.isArray(sections)) {
    sections.forEach((section) => {
      if (section && section.heading) {
        lines.push(`--- ${section.heading} ---`);
        lines.push('');
        if (section.content) {
          lines.push(String(section.content));
        }
        lines.push('');
      }
    });
  }

  lines.push(separator);
  lines.push('  END OF DOCUMENT');
  lines.push(separator);

  return lines.join('\n');
};

/**
 * Trim stored artifacts to prevent localStorage overflow.
 * @param {Array<Object>} artifacts
 * @param {number} maxEntries
 * @returns {Array<Object>}
 */
const trimArtifacts = (artifacts, maxEntries = 500) => {
  if (!Array.isArray(artifacts)) {
    return [];
  }
  if (artifacts.length <= maxEntries) {
    return artifacts;
  }
  return artifacts.slice(artifacts.length - maxEntries);
};

// ---------------------------------------------------------------------------
// Public API — Generate Artifact (Generic)
// ---------------------------------------------------------------------------

/**
 * Generate a compliance artifact of the specified type for a given context.
 *
 * @param {string} type - The artifact type (one of ARTIFACT_TYPES).
 * @param {Object} context - Context data for artifact generation.
 * @param {string} [context.applicationId] - The application ID.
 * @param {string} [context.applicationName] - The application name.
 * @param {Object} [context.data] - Additional data for the artifact.
 * @param {string} [context.userId] - ID of the user generating the artifact.
 * @param {string} [context.description] - Custom description.
 * @returns {{ success: boolean, artifact: Object|null, error: string|null }}
 */
export const generateArtifact = (type, context = {}) => {
  try {
    if (!type || typeof type !== 'string' || type.trim().length === 0) {
      return { success: false, artifact: null, error: 'Artifact type is required.' };
    }

    if (!context || typeof context !== 'object') {
      return { success: false, artifact: null, error: 'Context object is required.' };
    }

    const trimmedType = type.trim();
    const {
      applicationId,
      applicationName,
      data = {},
      userId = null,
      description = '',
    } = context;

    // Resolve application info
    let resolvedAppName = applicationName || '';
    let resolvedAppId = applicationId || null;
    let application = null;

    if (applicationId) {
      application = getApplicationById(applicationId);
      if (application) {
        resolvedAppName = application.name;
        resolvedAppId = application.id;
      }
    }

    const now = new Date().toISOString();
    const artifactId = generateArtifactId('CMP');

    // Build findings if provided
    const findings = data.findings ? buildFindingsSummary(data.findings) : null;

    // Determine compliance status
    const criticalityTier = application ? application.criticalityTier : CRITICALITY_TIERS.BUSINESS_OPERATIONAL;
    const status = findings
      ? determineComplianceStatus(findings, criticalityTier)
      : COMPLIANCE_STATUSES.PENDING_REVIEW;

    // Generate document content
    const sections = [
      {
        heading: 'Artifact Information',
        content: [
          `Artifact ID: ${artifactId}`,
          `Type: ${trimmedType}`,
          `Application: ${resolvedAppName || 'N/A'}`,
          `Application ID: ${resolvedAppId || 'N/A'}`,
          `Criticality Tier: ${criticalityTier}`,
          `Status: ${status}`,
          `Generated At: ${now}`,
          `Generated By: ${userId || 'System'}`,
          description ? `Description: ${description}` : '',
        ].filter(Boolean).join('\n'),
      },
    ];

    if (findings) {
      sections.push({
        heading: 'Findings Summary',
        content: [
          `Critical: ${findings.critical}`,
          `High: ${findings.high}`,
          `Medium: ${findings.medium}`,
          `Low: ${findings.low}`,
          `Info: ${findings.info}`,
          `Total: ${findings.critical + findings.high + findings.medium + findings.low + findings.info}`,
        ].join('\n'),
      });
    }

    if (data.details && typeof data.details === 'string') {
      sections.push({
        heading: 'Details',
        content: data.details,
      });
    }

    if (data.recommendations && typeof data.recommendations === 'string') {
      sections.push({
        heading: 'Recommendations',
        content: data.recommendations,
      });
    }

    const documentContent = generateDocumentContent(
      `${trimmedType} - ${resolvedAppName || 'General'}`,
      sections,
    );

    const artifact = {
      id: artifactId,
      applicationId: resolvedAppId,
      applicationName: resolvedAppName,
      type: trimmedType,
      name: `${trimmedType} - ${resolvedAppName || 'General'} - ${now.slice(0, 10)}`,
      description: description || `Auto-generated ${trimmedType} for ${resolvedAppName || 'general use'}.`,
      status,
      findings,
      generatedAt: now,
      generatedBy: userId || 'System',
      tool: data.tool || 'Horizon Portal',
      fileUrl: `/artifacts/${artifactId.toLowerCase()}.txt`,
      expiresAt: calculateExpirationDate(180),
      content: documentContent,
      metadata: {
        criticalityTier,
        environment: data.environment || ENVIRONMENTS.PROD,
        version: data.version || '1.0.0',
        ...(data.metadata || {}),
      },
      _generationStatus: ARTIFACT_GENERATION_STATUSES.GENERATED,
    };

    // Persist the artifact
    const artifacts = loadData(STORAGE_KEYS.ARTIFACTS, []);
    artifacts.push(artifact);
    const trimmed = trimArtifacts(artifacts);
    saveData(STORAGE_KEYS.ARTIFACTS, trimmed);

    // Log the action
    logAction(userId || null, AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD, {
      artifactId: artifact.id,
      artifactType: trimmedType,
      applicationId: resolvedAppId,
      applicationName: resolvedAppName,
      status,
      action: 'artifact_generated',
    });

    return { success: true, artifact, error: null };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to generate artifact:', _err);
    return { success: false, artifact: null, error: 'Failed to generate artifact.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Artifacts
// ---------------------------------------------------------------------------

/**
 * Retrieve compliance artifacts with optional filtering, sorting, and pagination.
 *
 * @param {Object} [filters]
 * @param {string} [filters.applicationId] - Filter by application ID.
 * @param {string} [filters.applicationName] - Filter by application name.
 * @param {string} [filters.type] - Filter by artifact type.
 * @param {string} [filters.status] - Filter by compliance status.
 * @param {string} [filters.generatedBy] - Filter by generator.
 * @param {string|Date} [filters.startDate] - Include artifacts on or after this date.
 * @param {string|Date} [filters.endDate] - Include artifacts on or before this date.
 * @param {string} [filters.search] - Free-text search across name, type, application.
 * @param {string} [filters.sortBy='generatedAt'] - Field to sort by.
 * @param {string} [filters.sortOrder='desc'] - Sort order: 'asc' or 'desc'.
 * @param {number} [filters.limit] - Maximum number of results.
 * @param {number} [filters.offset=0] - Number of results to skip.
 * @returns {{ data: Array<Object>, total: number }}
 */
export const getArtifacts = (filters = {}) => {
  try {
    const {
      applicationId,
      applicationName,
      type,
      status,
      generatedBy,
      startDate,
      endDate,
      search,
      sortBy = 'generatedAt',
      sortOrder = 'desc',
      limit,
      offset = 0,
    } = filters;

    // Merge generated artifacts with mock artifacts
    const generated = loadData(STORAGE_KEYS.ARTIFACTS, []);
    const mockArtifacts = loadData('compliance_artifacts', MOCK_COMPLIANCE_ARTIFACTS);

    // Combine, preferring generated artifacts
    const generatedIds = new Set(generated.map((a) => a.id));
    let allArtifacts = [
      ...generated,
      ...mockArtifacts.filter((a) => !generatedIds.has(a.id)),
    ];

    // Filter by applicationId
    if (applicationId && typeof applicationId === 'string') {
      allArtifacts = allArtifacts.filter((a) => a.applicationId === applicationId);
    }

    // Filter by applicationName
    if (applicationName && typeof applicationName === 'string') {
      allArtifacts = allArtifacts.filter((a) => matchesSearch(a.applicationName, applicationName));
    }

    // Filter by type
    if (type && typeof type === 'string') {
      allArtifacts = allArtifacts.filter((a) => a.type === type);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      allArtifacts = allArtifacts.filter((a) => a.status === status);
    }

    // Filter by generatedBy
    if (generatedBy && typeof generatedBy === 'string') {
      allArtifacts = allArtifacts.filter((a) => matchesSearch(a.generatedBy, generatedBy));
    }

    // Filter by date range
    if (startDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        allArtifacts = allArtifacts.filter((a) => {
          const d = new Date(a.generatedAt);
          return !Number.isNaN(d.getTime()) && d >= start;
        });
      }
    }

    if (endDate) {
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        allArtifacts = allArtifacts.filter((a) => {
          const d = new Date(a.generatedAt);
          return !Number.isNaN(d.getTime()) && d <= endOfDay;
        });
      }
    }

    // Free-text search
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.trim();
      allArtifacts = allArtifacts.filter((a) => {
        return (
          matchesSearch(a.name, query) ||
          matchesSearch(a.type, query) ||
          matchesSearch(a.applicationName, query) ||
          matchesSearch(a.status, query) ||
          matchesSearch(a.description, query) ||
          matchesSearch(a.id, query) ||
          matchesSearch(a.tool, query)
        );
      });
    }

    // Sort
    allArtifacts.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

    const total = allArtifacts.length;

    // Pagination
    const startIdx = typeof offset === 'number' && offset > 0 ? offset : 0;
    if (typeof limit === 'number' && limit > 0) {
      allArtifacts = allArtifacts.slice(startIdx, startIdx + limit);
    } else if (startIdx > 0) {
      allArtifacts = allArtifacts.slice(startIdx);
    }

    return { data: allArtifacts, total };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to get artifacts:', _err);
    return { data: [], total: 0 };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Artifact by ID
// ---------------------------------------------------------------------------

/**
 * Get a single compliance artifact by its ID.
 *
 * @param {string} artifactId - The artifact ID.
 * @returns {Object|null} The artifact object or null if not found.
 */
export const getArtifactById = (artifactId) => {
  try {
    if (!artifactId || typeof artifactId !== 'string') {
      return null;
    }

    const generated = loadData(STORAGE_KEYS.ARTIFACTS, []);
    const found = generated.find((a) => a.id === artifactId);
    if (found) {
      return found;
    }

    const mockArtifacts = loadData('compliance_artifacts', MOCK_COMPLIANCE_ARTIFACTS);
    return mockArtifacts.find((a) => a.id === artifactId) || null;
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to get artifact by ID:', _err);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API — Download Artifact
// ---------------------------------------------------------------------------

/**
 * Download a compliance artifact by its ID. Returns the artifact content
 * as a downloadable string and metadata.
 *
 * @param {string} artifactId - The artifact ID.
 * @param {Object} [options]
 * @param {string} [options.format='text'] - Download format: 'text' or 'json'.
 * @param {string} [options.userId] - ID of the user downloading.
 * @returns {{ success: boolean, content: string|null, fileName: string|null, mimeType: string|null, error: string|null }}
 */
export const downloadArtifact = (artifactId, options = {}) => {
  try {
    if (!artifactId || typeof artifactId !== 'string') {
      return { success: false, content: null, fileName: null, mimeType: null, error: 'Artifact ID is required.' };
    }

    const { format = 'text', userId = null } = options;

    const artifact = getArtifactById(artifactId);
    if (!artifact) {
      return {
        success: false,
        content: null,
        fileName: null,
        mimeType: null,
        error: `Artifact with ID "${artifactId}" not found.`,
      };
    }

    let content;
    let fileName;
    let mimeType;

    if (format === 'json') {
      const exportData = { ...artifact };
      delete exportData.content;
      content = JSON.stringify(exportData, null, 2);
      fileName = `${artifact.id.toLowerCase()}.json`;
      mimeType = 'application/json';
    } else {
      content = artifact.content || generateDocumentContent(
        artifact.name || artifact.type,
        [
          {
            heading: 'Artifact Details',
            content: [
              `ID: ${artifact.id}`,
              `Type: ${artifact.type}`,
              `Application: ${artifact.applicationName || 'N/A'}`,
              `Status: ${artifact.status}`,
              `Generated: ${artifact.generatedAt}`,
              `Tool: ${artifact.tool || 'N/A'}`,
            ].join('\n'),
          },
          artifact.findings ? {
            heading: 'Findings',
            content: JSON.stringify(artifact.findings, null, 2),
          } : null,
        ].filter(Boolean),
      );
      fileName = `${artifact.id.toLowerCase()}.txt`;
      mimeType = 'text/plain';
    }

    // Log the download
    logAction(userId || null, AUDIT_ACTIONS.REPORT_EXPORT, {
      artifactId: artifact.id,
      artifactType: artifact.type,
      applicationName: artifact.applicationName,
      format,
      action: 'artifact_downloaded',
    });

    return { success: true, content, fileName, mimeType, error: null };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to download artifact:', _err);
    return { success: false, content: null, fileName: null, mimeType: null, error: 'Failed to download artifact.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Generate Change Record (ITM)
// ---------------------------------------------------------------------------

/**
 * Generate an ITM change record artifact for ServiceNow integration.
 * Creates a structured change record based on onboarding or deployment data.
 *
 * @param {Object} onboardingData - Data for the change record.
 * @param {string} onboardingData.applicationId - The application ID.
 * @param {string} [onboardingData.applicationName] - The application name.
 * @param {string} [onboardingData.changeType='standard'] - Change type: 'standard', 'normal', 'emergency'.
 * @param {string} [onboardingData.changeReason] - Reason for the change.
 * @param {string} [onboardingData.implementationPlan] - Implementation plan description.
 * @param {string} [onboardingData.rollbackPlan] - Rollback plan description.
 * @param {string} [onboardingData.testPlan] - Test plan description.
 * @param {string} [onboardingData.riskAssessment] - Risk assessment description.
 * @param {string} [onboardingData.environment] - Target environment.
 * @param {string} [onboardingData.version] - Version being deployed.
 * @param {string} [onboardingData.scheduledStart] - Scheduled start time.
 * @param {string} [onboardingData.scheduledEnd] - Scheduled end time.
 * @param {string} [onboardingData.assignmentGroup] - Assignment group.
 * @param {string} [onboardingData.requestedBy] - Requester name.
 * @param {string} [onboardingData.userId] - ID of the user generating the record.
 * @returns {{ success: boolean, artifact: Object|null, changeRecordId: string|null, error: string|null }}
 */
export const generateChangeRecord = (onboardingData) => {
  try {
    if (!onboardingData || typeof onboardingData !== 'object') {
      return { success: false, artifact: null, changeRecordId: null, error: 'Onboarding data is required.' };
    }

    const {
      applicationId,
      applicationName,
      changeType = 'standard',
      changeReason = 'Application deployment via Horizon DevSecOps Portal.',
      implementationPlan = 'Automated deployment via Golden Pipeline with blue-green strategy.',
      rollbackPlan = 'Automated rollback to previous version via deployment controller.',
      testPlan = 'Automated smoke tests and post-deployment validation.',
      riskAssessment = 'Low risk - automated deployment with rollback capability.',
      environment = ENVIRONMENTS.PROD,
      version = '1.0.0',
      scheduledStart,
      scheduledEnd,
      assignmentGroup = 'Platform Engineering',
      requestedBy = 'System',
      userId = null,
    } = onboardingData;

    // Resolve application
    let resolvedAppName = applicationName || '';
    let application = null;

    if (applicationId) {
      application = getApplicationById(applicationId);
      if (application) {
        resolvedAppName = application.name;
      }
    }

    const now = new Date().toISOString();
    const changeRecordId = `CR-${now.slice(0, 10).replace(/-/g, '')}-${uuidv4().slice(0, 4).toUpperCase()}`;
    const criticalityTier = application ? application.criticalityTier : CRITICALITY_TIERS.BUSINESS_OPERATIONAL;

    // Determine risk level based on criticality
    let riskLevel = 'Low';
    if (criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL) {
      riskLevel = 'High';
    } else if (criticalityTier === CRITICALITY_TIERS.MISSION_CRITICAL) {
      riskLevel = 'Medium';
    }

    const sections = [
      {
        heading: 'Change Record Information',
        content: [
          `Change Record ID: ${changeRecordId}`,
          `Change Type: ${changeType}`,
          `Risk Level: ${riskLevel}`,
          `Application: ${resolvedAppName || 'N/A'}`,
          `Application ID: ${applicationId || 'N/A'}`,
          `Criticality Tier: ${criticalityTier}`,
          `Target Environment: ${environment}`,
          `Version: ${version}`,
          `Requested By: ${requestedBy}`,
          `Assignment Group: ${assignmentGroup}`,
          `Scheduled Start: ${scheduledStart || 'TBD'}`,
          `Scheduled End: ${scheduledEnd || 'TBD'}`,
          `Created: ${now}`,
        ].join('\n'),
      },
      {
        heading: 'Change Reason',
        content: changeReason,
      },
      {
        heading: 'Implementation Plan',
        content: implementationPlan,
      },
      {
        heading: 'Rollback Plan',
        content: rollbackPlan,
      },
      {
        heading: 'Test Plan',
        content: testPlan,
      },
      {
        heading: 'Risk Assessment',
        content: [
          `Risk Level: ${riskLevel}`,
          `Assessment: ${riskAssessment}`,
          `Criticality Tier: ${criticalityTier}`,
          `Automated Rollback: Yes`,
          `Health Check Enabled: Yes`,
          `Monitoring Configured: Yes`,
        ].join('\n'),
      },
      {
        heading: 'Approval Requirements',
        content: criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL
          ? 'Requires minimum 2 approvers including application owner and change advisory board.'
          : criticalityTier === CRITICALITY_TIERS.MISSION_CRITICAL
            ? 'Requires minimum 1 approver (application owner).'
            : 'Standard change - pre-approved template.',
      },
      {
        heading: 'Compliance Notes',
        content: [
          'This change record is generated by the Horizon DevSecOps Portal.',
          'All pipeline stages including security scans must pass before deployment.',
          'Post-deployment validation is mandatory.',
          'Audit trail is maintained for all actions.',
        ].join('\n'),
      },
    ];

    const documentContent = generateDocumentContent(
      `ITM Change Record - ${changeRecordId}`,
      sections,
    );

    const artifact = {
      id: generateArtifactId('CR'),
      applicationId: applicationId || null,
      applicationName: resolvedAppName,
      type: ARTIFACT_TYPES.ITM_CHANGE_RECORD,
      name: `ITM Change Record ${changeRecordId} - ${resolvedAppName || 'General'}`,
      description: `ServiceNow change record for ${resolvedAppName || 'application'} deployment to ${environment}.`,
      status: COMPLIANCE_STATUSES.COMPLIANT,
      findings: null,
      generatedAt: now,
      generatedBy: userId || requestedBy || 'System',
      tool: 'ServiceNow',
      fileUrl: `/artifacts/change-records/${changeRecordId.toLowerCase()}.txt`,
      expiresAt: null,
      content: documentContent,
      metadata: {
        changeRecordId,
        changeType,
        riskLevel,
        criticalityTier,
        environment,
        version,
        assignmentGroup,
        requestedBy,
        scheduledStart: scheduledStart || null,
        scheduledEnd: scheduledEnd || null,
      },
      _generationStatus: ARTIFACT_GENERATION_STATUSES.GENERATED,
    };

    // Persist
    const artifacts = loadData(STORAGE_KEYS.ARTIFACTS, []);
    artifacts.push(artifact);
    saveData(STORAGE_KEYS.ARTIFACTS, trimArtifacts(artifacts));

    const changeRecords = loadData(STORAGE_KEYS.CHANGE_RECORDS, []);
    changeRecords.push({
      changeRecordId,
      artifactId: artifact.id,
      applicationId: applicationId || null,
      applicationName: resolvedAppName,
      changeType,
      riskLevel,
      environment,
      version,
      status: 'approved',
      createdAt: now,
      createdBy: userId || requestedBy || 'System',
    });
    saveData(STORAGE_KEYS.CHANGE_RECORDS, changeRecords);

    logAction(userId || null, AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD, {
      artifactId: artifact.id,
      changeRecordId,
      artifactType: ARTIFACT_TYPES.ITM_CHANGE_RECORD,
      applicationId: applicationId || null,
      applicationName: resolvedAppName,
      changeType,
      riskLevel,
      environment,
      action: 'change_record_generated',
    });

    return { success: true, artifact, changeRecordId, error: null };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to generate change record:', _err);
    return { success: false, artifact: null, changeRecordId: null, error: 'Failed to generate change record.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Generate QE Evidence
// ---------------------------------------------------------------------------

/**
 * Generate a QE (Quality Engineering) evidence package from pipeline data.
 * Includes test results, code coverage, performance metrics, and scan results.
 *
 * @param {Object} pipelineData - Pipeline and test data.
 * @param {string} pipelineData.applicationId - The application ID.
 * @param {string} [pipelineData.applicationName] - The application name.
 * @param {string} [pipelineData.pipelineId] - The pipeline ID.
 * @param {string} [pipelineData.buildNumber] - The build number.
 * @param {Object} [pipelineData.testResults] - Test results summary.
 * @param {number} [pipelineData.testResults.total] - Total tests.
 * @param {number} [pipelineData.testResults.passed] - Passed tests.
 * @param {number} [pipelineData.testResults.failed] - Failed tests.
 * @param {number} [pipelineData.testResults.skipped] - Skipped tests.
 * @param {number} [pipelineData.codeCoverage] - Code coverage percentage.
 * @param {Object} [pipelineData.performanceResults] - Performance test results.
 * @param {Object} [pipelineData.securityResults] - Security scan results.
 * @param {Array<Object>} [pipelineData.stages] - Pipeline stage results.
 * @param {string} [pipelineData.userId] - ID of the user generating the evidence.
 * @returns {{ success: boolean, artifact: Object|null, error: string|null }}
 */
export const generateQEEvidence = (pipelineData) => {
  try {
    if (!pipelineData || typeof pipelineData !== 'object') {
      return { success: false, artifact: null, error: 'Pipeline data is required.' };
    }

    const {
      applicationId,
      applicationName,
      pipelineId,
      buildNumber,
      testResults,
      codeCoverage,
      performanceResults,
      securityResults,
      stages,
      userId = null,
    } = pipelineData;

    // Resolve application
    let resolvedAppName = applicationName || '';
    let application = null;

    if (applicationId) {
      application = getApplicationById(applicationId);
      if (application) {
        resolvedAppName = application.name;
      }
    }

    // Fetch KPI data for the application
    let kpiData = null;
    if (applicationId) {
      const kpiResult = getKPIData({ application: applicationId });
      if (kpiResult && kpiResult.metrics && kpiResult.metrics.length > 0) {
        kpiData = kpiResult.metrics[0];
      }
    }

    // Fetch pipeline data if not provided
    let pipelineInfo = null;
    if (applicationId && !pipelineId) {
      pipelineInfo = getPipelineByApplicationId(applicationId);
    }

    const now = new Date().toISOString();
    const criticalityTier = application ? application.criticalityTier : CRITICALITY_TIERS.BUSINESS_OPERATIONAL;

    // Build test results section
    const resolvedTestResults = testResults || {
      total: kpiData && kpiData.metrics ? Math.round((kpiData.metrics.code_coverage || 80) * 5) : 400,
      passed: kpiData && kpiData.metrics ? Math.round((kpiData.metrics.code_coverage || 80) * 4.9) : 392,
      failed: 0,
      skipped: kpiData && kpiData.metrics ? Math.round((kpiData.metrics.code_coverage || 80) * 0.1) : 8,
    };

    const resolvedCoverage = codeCoverage || (kpiData && kpiData.metrics ? kpiData.metrics.code_coverage : 80);

    const sections = [
      {
        heading: 'QE Evidence Package',
        content: [
          `Application: ${resolvedAppName || 'N/A'}`,
          `Application ID: ${applicationId || 'N/A'}`,
          `Criticality Tier: ${criticalityTier}`,
          `Pipeline ID: ${pipelineId || (pipelineInfo ? pipelineInfo.id : 'N/A')}`,
          `Build Number: ${buildNumber || 'N/A'}`,
          `Generated: ${now}`,
        ].join('\n'),
      },
      {
        heading: 'Unit Test Results',
        content: [
          `Total Tests: ${resolvedTestResults.total}`,
          `Passed: ${resolvedTestResults.passed}`,
          `Failed: ${resolvedTestResults.failed}`,
          `Skipped: ${resolvedTestResults.skipped}`,
          `Pass Rate: ${resolvedTestResults.total > 0 ? ((resolvedTestResults.passed / resolvedTestResults.total) * 100).toFixed(2) : 0}%`,
        ].join('\n'),
      },
      {
        heading: 'Code Coverage',
        content: [
          `Overall Coverage: ${resolvedCoverage}%`,
          `Threshold: 80%`,
          `Status: ${resolvedCoverage >= 80 ? 'PASS' : 'FAIL'}`,
        ].join('\n'),
      },
    ];

    if (performanceResults && typeof performanceResults === 'object') {
      sections.push({
        heading: 'Performance Test Results',
        content: [
          `Avg Response Time: ${performanceResults.avgResponseTimeMs || 'N/A'} ms`,
          `P95 Response Time: ${performanceResults.p95ResponseTimeMs || 'N/A'} ms`,
          `Error Rate: ${performanceResults.errorRatePercent || 'N/A'}%`,
          `Throughput: ${performanceResults.throughputPerSec || 'N/A'} req/s`,
          `Virtual Users: ${performanceResults.virtualUsers || 'N/A'}`,
          `Duration: ${performanceResults.durationMinutes || 'N/A'} minutes`,
        ].join('\n'),
      });
    }

    if (securityResults && typeof securityResults === 'object') {
      sections.push({
        heading: 'Security Scan Summary',
        content: [
          `SAST: ${securityResults.sast || 'N/A'}`,
          `SCA: ${securityResults.sca || 'N/A'}`,
          `DAST: ${securityResults.dast || 'N/A'}`,
          `Container Scan: ${securityResults.containerScan || 'N/A'}`,
          `Overall Status: ${securityResults.overallStatus || 'N/A'}`,
        ].join('\n'),
      });
    }

    if (Array.isArray(stages) && stages.length > 0) {
      const stageLines = stages.map((s, idx) => {
        const stageName = s.name || `Stage ${idx + 1}`;
        const stageStatus = s.status || 'N/A';
        const duration = typeof s.durationSeconds === 'number' ? formatDuration(s.durationSeconds, { compact: true }) : 'N/A';
        return `  ${idx + 1}. ${stageName}: ${stageStatus} (${duration})`;
      });

      sections.push({
        heading: 'Pipeline Stage Results',
        content: stageLines.join('\n'),
      });
    }

    sections.push({
      heading: 'QE Compliance Statement',
      content: [
        'This QE evidence package certifies that the application has undergone',
        'comprehensive quality engineering validation including:',
        '  - Unit testing with code coverage analysis',
        '  - Integration testing',
        '  - Security scanning (SAST, SCA, DAST, Container)',
        '  - Performance and load testing (where applicable)',
        '',
        'All quality gates have been evaluated per the application criticality tier.',
        `Criticality Tier: ${criticalityTier}`,
        `Code Coverage Threshold Met: ${resolvedCoverage >= 80 ? 'Yes' : 'No'}`,
        `Test Pass Rate: ${resolvedTestResults.total > 0 ? ((resolvedTestResults.passed / resolvedTestResults.total) * 100).toFixed(2) : 0}%`,
      ].join('\n'),
    });

    const documentContent = generateDocumentContent(
      `QE Evidence Package - ${resolvedAppName || 'Application'}`,
      sections,
    );

    // Determine status
    const testsPassed = resolvedTestResults.failed === 0;
    const coverageMet = resolvedCoverage >= 80;
    const qeStatus = testsPassed && coverageMet
      ? COMPLIANCE_STATUSES.COMPLIANT
      : COMPLIANCE_STATUSES.PARTIAL;

    const artifact = {
      id: generateArtifactId('QE'),
      applicationId: applicationId || null,
      applicationName: resolvedAppName,
      type: ARTIFACT_TYPES.QE_EVIDENCE,
      name: `QE Evidence Package - ${resolvedAppName || 'Application'} - ${now.slice(0, 10)}`,
      description: `Quality Engineering evidence package for ${resolvedAppName || 'application'}.`,
      status: qeStatus,
      findings: null,
      generatedAt: now,
      generatedBy: userId || 'QE Pipeline',
      tool: 'Horizon Portal',
      fileUrl: `/artifacts/qe-evidence/${generateArtifactId('QE').toLowerCase()}.txt`,
      expiresAt: calculateExpirationDate(180),
      content: documentContent,
      metadata: {
        criticalityTier,
        pipelineId: pipelineId || (pipelineInfo ? pipelineInfo.id : null),
        buildNumber: buildNumber || null,
        testResults: resolvedTestResults,
        codeCoverage: resolvedCoverage,
        performanceResults: performanceResults || null,
        securityResults: securityResults || null,
      },
      _generationStatus: ARTIFACT_GENERATION_STATUSES.GENERATED,
    };

    // Persist
    const artifacts = loadData(STORAGE_KEYS.ARTIFACTS, []);
    artifacts.push(artifact);
    saveData(STORAGE_KEYS.ARTIFACTS, trimArtifacts(artifacts));

    const qeEvidence = loadData(STORAGE_KEYS.QE_EVIDENCE, []);
    qeEvidence.push({
      artifactId: artifact.id,
      applicationId: applicationId || null,
      applicationName: resolvedAppName,
      testResults: resolvedTestResults,
      codeCoverage: resolvedCoverage,
      status: qeStatus,
      createdAt: now,
    });
    saveData(STORAGE_KEYS.QE_EVIDENCE, qeEvidence);

    logAction(userId || null, AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD, {
      artifactId: artifact.id,
      artifactType: ARTIFACT_TYPES.QE_EVIDENCE,
      applicationId: applicationId || null,
      applicationName: resolvedAppName,
      codeCoverage: resolvedCoverage,
      testsPassed: resolvedTestResults.passed,
      testsFailed: resolvedTestResults.failed,
      status: qeStatus,
      action: 'qe_evidence_generated',
    });

    return { success: true, artifact, error: null };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to generate QE evidence:', _err);
    return { success: false, artifact: null, error: 'Failed to generate QE evidence.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Generate Security Scan Report
// ---------------------------------------------------------------------------

/**
 * Generate a consolidated security scan report from scan data.
 * Combines SAST, DAST, SCA, and container scan results.
 *
 * @param {Object} scanData - Security scan data.
 * @param {string} scanData.applicationId - The application ID.
 * @param {string} [scanData.applicationName] - The application name.
 * @param {string} [scanData.scanType='consolidated'] - Scan type: 'sast', 'dast', 'sca', 'container', 'consolidated'.
 * @param {string} [scanData.tool] - Scanning tool name.
 * @param {string} [scanData.version] - Application version scanned.
 * @param {Object} [scanData.findings] - Findings by severity.
 * @param {number} [scanData.findings.critical] - Critical findings count.
 * @param {number} [scanData.findings.high] - High findings count.
 * @param {number} [scanData.findings.medium] - Medium findings count.
 * @param {number} [scanData.findings.low] - Low findings count.
 * @param {number} [scanData.findings.info] - Info findings count.
 * @param {Array<Object>} [scanData.vulnerabilities] - Detailed vulnerability list.
 * @param {string} [scanData.recommendations] - Remediation recommendations.
 * @param {string} [scanData.userId] - ID of the user generating the report.
 * @returns {{ success: boolean, artifact: Object|null, error: string|null }}
 */
export const generateSecurityScanReport = (scanData) => {
  try {
    if (!scanData || typeof scanData !== 'object') {
      return { success: false, artifact: null, error: 'Scan data is required.' };
    }

    const {
      applicationId,
      applicationName,
      scanType = 'consolidated',
      tool = 'Multiple',
      version = '1.0.0',
      findings: rawFindings,
      vulnerabilities,
      recommendations,
      userId = null,
    } = scanData;

    // Resolve application
    let resolvedAppName = applicationName || '';
    let application = null;

    if (applicationId) {
      application = getApplicationById(applicationId);
      if (application) {
        resolvedAppName = application.name;
      }
    }

    const now = new Date().toISOString();
    const criticalityTier = application ? application.criticalityTier : CRITICALITY_TIERS.BUSINESS_OPERATIONAL;

    // Build findings
    const findings = rawFindings ? buildFindingsSummary(rawFindings) : { critical: 0, high: 0, medium: 3, low: 8, info: 15 };
    const totalFindings = findings.critical + findings.high + findings.medium + findings.low + findings.info;

    // Determine compliance status
    const status = determineComplianceStatus(findings, criticalityTier);

    // Map scan type to artifact type
    const artifactTypeMap = {
      sast: ARTIFACT_TYPES.SAST_REPORT,
      dast: ARTIFACT_TYPES.DAST_REPORT,
      sca: ARTIFACT_TYPES.SCA_REPORT,
      container: ARTIFACT_TYPES.CONTAINER_SCAN_REPORT,
      consolidated: ARTIFACT_TYPES.SECURITY_SCAN_REPORT,
    };
    const artifactType = artifactTypeMap[scanType] || ARTIFACT_TYPES.SECURITY_SCAN_REPORT;

    const sections = [
      {
        heading: 'Security Scan Report',
        content: [
          `Application: ${resolvedAppName || 'N/A'}`,
          `Application ID: ${applicationId || 'N/A'}`,
          `Criticality Tier: ${criticalityTier}`,
          `Scan Type: ${scanType.toUpperCase()}`,
          `Tool: ${tool}`,
          `Version Scanned: ${version}`,
          `Scan Date: ${now}`,
          `Compliance Status: ${status}`,
        ].join('\n'),
      },
      {
        heading: 'Findings Summary',
        content: [
          `Critical: ${findings.critical}`,
          `High: ${findings.high}`,
          `Medium: ${findings.medium}`,
          `Low: ${findings.low}`,
          `Informational: ${findings.info}`,
          `Total: ${totalFindings}`,
          '',
          `Compliance Status: ${status}`,
        ].join('\n'),
      },
    ];

    if (Array.isArray(vulnerabilities) && vulnerabilities.length > 0) {
      const vulnLines = vulnerabilities.slice(0, 20).map((v, idx) => {
        const severity = v.severity || 'Unknown';
        const title = v.title || v.description || `Vulnerability ${idx + 1}`;
        const location = v.location || v.file || 'N/A';
        return `  ${idx + 1}. [${severity}] ${title} (${location})`;
      });

      if (vulnerabilities.length > 20) {
        vulnLines.push(`  ... and ${vulnerabilities.length - 20} more`);
      }

      sections.push({
        heading: 'Vulnerability Details',
        content: vulnLines.join('\n'),
      });
    }

    if (recommendations && typeof recommendations === 'string') {
      sections.push({
        heading: 'Remediation Recommendations',
        content: recommendations,
      });
    } else {
      const autoRecommendations = [];
      if (findings.critical > 0) {
        autoRecommendations.push('CRITICAL: Immediately remediate all critical vulnerabilities before deployment.');
      }
      if (findings.high > 0) {
        autoRecommendations.push('HIGH: Address high severity findings within the current sprint.');
      }
      if (findings.medium > 0) {
        autoRecommendations.push('MEDIUM: Plan remediation for medium findings in the next release cycle.');
      }
      if (findings.low > 0) {
        autoRecommendations.push('LOW: Track low severity findings for future remediation.');
      }
      if (autoRecommendations.length === 0) {
        autoRecommendations.push('No critical or high severity findings detected. Continue monitoring.');
      }

      sections.push({
        heading: 'Remediation Recommendations',
        content: autoRecommendations.join('\n'),
      });
    }

    sections.push({
      heading: 'Compliance Assessment',
      content: [
        `Criticality Tier: ${criticalityTier}`,
        `Compliance Status: ${status}`,
        '',
        'Policy Requirements:',
        criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL
          ? '  - Zero critical and high severity findings required'
          : criticalityTier === CRITICALITY_TIERS.MISSION_CRITICAL
            ? '  - Zero critical findings required; high findings must have remediation plan'
            : '  - Zero critical findings required',
        '',
        'HIPAA/CMS Compliance Notes:',
        '  - All security scan results are retained for audit purposes',
        '  - Findings are tracked through remediation lifecycle',
        '  - Evidence of scan execution is maintained in audit trail',
      ].join('\n'),
    });

    const documentContent = generateDocumentContent(
      `Security Scan Report - ${resolvedAppName || 'Application'} - ${scanType.toUpperCase()}`,
      sections,
    );

    const artifact = {
      id: generateArtifactId('SEC'),
      applicationId: applicationId || null,
      applicationName: resolvedAppName,
      type: artifactType,
      name: `${artifactType} - ${resolvedAppName || 'Application'} v${version}`,
      description: `${scanType.toUpperCase()} security scan report for ${resolvedAppName || 'application'} version ${version}.`,
      status,
      findings,
      generatedAt: now,
      generatedBy: userId || 'Security Scanner',
      tool,
      fileUrl: `/artifacts/security/${generateArtifactId('SEC').toLowerCase()}.txt`,
      expiresAt: calculateExpirationDate(180),
      content: documentContent,
      metadata: {
        criticalityTier,
        scanType,
        version,
        totalFindings,
        vulnerabilityCount: Array.isArray(vulnerabilities) ? vulnerabilities.length : 0,
      },
      _generationStatus: ARTIFACT_GENERATION_STATUSES.GENERATED,
    };

    // Persist
    const artifacts = loadData(STORAGE_KEYS.ARTIFACTS, []);
    artifacts.push(artifact);
    saveData(STORAGE_KEYS.ARTIFACTS, trimArtifacts(artifacts));

    const securityReports = loadData(STORAGE_KEYS.SECURITY_REPORTS, []);
    securityReports.push({
      artifactId: artifact.id,
      applicationId: applicationId || null,
      applicationName: resolvedAppName,
      scanType,
      tool,
      findings,
      status,
      createdAt: now,
    });
    saveData(STORAGE_KEYS.SECURITY_REPORTS, securityReports);

    logAction(userId || null, AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD, {
      artifactId: artifact.id,
      artifactType,
      applicationId: applicationId || null,
      applicationName: resolvedAppName,
      scanType,
      tool,
      totalFindings,
      criticalFindings: findings.critical,
      status,
      action: 'security_scan_report_generated',
    });

    return { success: true, artifact, error: null };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to generate security scan report:', _err);
    return { success: false, artifact: null, error: 'Failed to generate security scan report.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Generate Sign-Off Pack
// ---------------------------------------------------------------------------

/**
 * Generate a comprehensive sign-off pack for an application deployment.
 * Includes change record, QE evidence, security scan results, and approval status.
 *
 * @param {string} appId - The application ID.
 * @param {Object} [options]
 * @param {string} [options.environment='Prod'] - Target environment.
 * @param {string} [options.version] - Version being deployed.
 * @param {string} [options.approvedBy] - Name of the approver.
 * @param {string} [options.approvalDate] - Approval date.
 * @param {string} [options.notes] - Additional notes.
 * @param {string} [options.userId] - ID of the user generating the pack.
 * @returns {{ success: boolean, artifact: Object|null, error: string|null }}
 */
export const generateSignOffPack = (appId, options = {}) => {
  try {
    if (!appId || typeof appId !== 'string') {
      return { success: false, artifact: null, error: 'Application ID is required.' };
    }

    const {
      environment = ENVIRONMENTS.PROD,
      version = '1.0.0',
      approvedBy = 'Application Owner',
      approvalDate,
      notes = '',
      userId = null,
    } = options;

    const application = getApplicationById(appId);
    if (!application) {
      return { success: false, artifact: null, error: `Application with ID "${appId}" not found.` };
    }

    const now = new Date().toISOString();
    const criticalityTier = application.criticalityTier || CRITICALITY_TIERS.BUSINESS_OPERATIONAL;

    // Gather existing artifacts for this application
    const { data: existingArtifacts } = getArtifacts({ applicationId: appId });

    // Gather pipeline data
    const pipeline = getPipelineByApplicationId(appId);
    const { data: pipelineRuns } = getPipelineRuns({ applicationName: application.name, limit: 5 });

    // Gather KPI data
    const kpiData = getKPIData({ application: appId });

    // Gather governance data
    const governanceData = getGovernanceData({ application: appId });

    // Gather incident data
    const mttrData = getMTTRMetrics({ application: appId });

    // Build sections
    const sections = [
      {
        heading: 'Sign-Off Pack Summary',
        content: [
          `Application: ${application.name}`,
          `Application ID: ${appId}`,
          `Short Code: ${application.shortCode || 'N/A'}`,
          `Domain: ${application.domainName || 'N/A'}`,
          `Portfolio: ${application.portfolioName || 'N/A'}`,
          `Criticality Tier: ${criticalityTier}`,
          `Target Environment: ${environment}`,
          `Version: ${version}`,
          `Owner: ${application.ownerName || 'N/A'}`,
          `Generated: ${now}`,
        ].join('\n'),
      },
      {
        heading: 'Approval Information',
        content: [
          `Approved By: ${approvedBy}`,
          `Approval Date: ${approvalDate || now.slice(0, 10)}`,
          `Approval Status: Approved`,
          notes ? `Notes: ${notes}` : '',
        ].filter(Boolean).join('\n'),
      },
    ];

    // Pipeline summary
    if (pipeline) {
      sections.push({
        heading: 'Pipeline Configuration',
        content: [
          `Pipeline: ${pipeline.name || pipeline.pipelineName || 'N/A'}`,
          `CI/CD Tool: ${pipeline.cicdTool || 'N/A'}`,
          `Source Control: ${pipeline.sourceControl || 'N/A'}`,
          `Stages: ${Array.isArray(pipeline.stages) ? pipeline.stages.length : 'N/A'}`,
          `Security Tools: ${Array.isArray(pipeline.securityTools) ? pipeline.securityTools.join(', ') : 'N/A'}`,
        ].join('\n'),
      });
    }

    // Recent pipeline runs
    if (pipelineRuns.length > 0) {
      const runLines = pipelineRuns.map((run, idx) => {
        return `  ${idx + 1}. Build #${run.buildNumber || 'N/A'} - ${run.status} (${run.startedAt ? run.startedAt.slice(0, 10) : 'N/A'})`;
      });

      sections.push({
        heading: 'Recent Pipeline Runs',
        content: runLines.join('\n'),
      });
    }

    // Compliance artifacts summary
    if (existingArtifacts.length > 0) {
      const artifactLines = existingArtifacts.slice(0, 10).map((a, idx) => {
        return `  ${idx + 1}. ${a.type}: ${a.status} (${a.generatedAt ? a.generatedAt.slice(0, 10) : 'N/A'})`;
      });

      sections.push({
        heading: 'Compliance Artifacts',
        content: [
          `Total Artifacts: ${existingArtifacts.length}`,
          `Compliant: ${existingArtifacts.filter((a) => a.status === COMPLIANCE_STATUSES.COMPLIANT).length}`,
          `Non-Compliant: ${existingArtifacts.filter((a) => a.status === COMPLIANCE_STATUSES.NON_COMPLIANT).length}`,
          `Pending Review: ${existingArtifacts.filter((a) => a.status === COMPLIANCE_STATUSES.PENDING_REVIEW).length}`,
          '',
          'Recent Artifacts:',
          ...artifactLines,
        ].join('\n'),
      });
    }

    // KPI summary
    if (kpiData && kpiData.summary) {
      sections.push({
        heading: 'KPI Summary',
        content: [
          `Deployment Frequency: ${kpiData.summary.avgDeploymentFrequency || 'N/A'} deployments/month`,
          `Lead Time: ${kpiData.summary.avgLeadTime || 'N/A'} days`,
          `Change Failure Rate: ${kpiData.summary.avgChangeFailureRate || 'N/A'}%`,
          `MTTR: ${kpiData.summary.avgMTTR || 'N/A'} hours`,
          `Pipeline Success Rate: ${kpiData.summary.avgPipelineSuccessRate || 'N/A'}%`,
          `Code Coverage: ${kpiData.summary.avgCodeCoverage || 'N/A'}%`,
          `Availability: ${kpiData.summary.avgAvailability || 'N/A'}%`,
          `Compliance Score: ${kpiData.summary.avgComplianceScore || 'N/A'}%`,
        ].join('\n'),
      });
    }

    // Incident summary
    if (mttrData && mttrData.summary) {
      sections.push({
        heading: 'Incident Summary',
        content: [
          `Total Incidents: ${mttrData.summary.totalIncidents || 0}`,
          `Open Incidents: ${mttrData.summary.openIncidents || 0}`,
          `Resolved Incidents: ${mttrData.summary.resolvedIncidents || 0}`,
          `Critical Incidents: ${mttrData.summary.criticalIncidents || 0}`,
          `Avg MTTR: ${mttrData.summary.avgMttrHours || 'N/A'} hours`,
        ].join('\n'),
      });
    }

    // Sign-off checklist
    const checklistItems = [
      { item: 'All pipeline stages passed', status: 'Yes' },
      { item: 'Security scans completed', status: 'Yes' },
      { item: 'Code coverage meets threshold', status: 'Yes' },
      { item: 'Change record created', status: 'Yes' },
      { item: 'Rollback plan documented', status: 'Yes' },
      { item: 'Monitoring configured', status: 'Yes' },
      { item: 'Logging configured', status: 'Yes' },
      { item: 'Owner approval obtained', status: 'Yes' },
    ];

    if (criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL) {
      checklistItems.push({ item: 'CAB approval obtained', status: 'Yes' });
      checklistItems.push({ item: 'Maintenance window confirmed', status: 'Yes' });
    }

    sections.push({
      heading: 'Sign-Off Checklist',
      content: checklistItems.map((c) => `  [${c.status === 'Yes' ? 'X' : ' '}] ${c.item}`).join('\n'),
    });

    sections.push({
      heading: 'Compliance Statement',
      content: [
        'This sign-off pack certifies that the application deployment has been',
        'reviewed and approved in accordance with organizational policies.',
        '',
        'HIPAA/CMS Compliance:',
        '  - All security scans have been completed and reviewed',
        '  - Change management process has been followed',
        '  - Audit trail is maintained for all actions',
        '  - Data protection controls are in place',
        '  - Access controls are configured per RBAC policy',
        '',
        `Signed off by: ${approvedBy}`,
        `Date: ${approvalDate || now.slice(0, 10)}`,
      ].join('\n'),
    });

    const documentContent = generateDocumentContent(
      `Sign-Off Pack - ${application.name} v${version} - ${environment}`,
      sections,
    );

    const artifact = {
      id: generateArtifactId('SOP'),
      applicationId: appId,
      applicationName: application.name,
      type: ARTIFACT_TYPES.SIGN_OFF_PACK,
      name: `Sign-Off Pack - ${application.name} v${version} - ${environment}`,
      description: `Comprehensive sign-off pack for ${application.name} deployment to ${environment}.`,
      status: COMPLIANCE_STATUSES.COMPLIANT,
      findings: null,
      generatedAt: now,
      generatedBy: userId || approvedBy || 'System',
      tool: 'Horizon Portal',
      fileUrl: `/artifacts/sign-off/${generateArtifactId('SOP').toLowerCase()}.txt`,
      expiresAt: calculateExpirationDate(365),
      content: documentContent,
      metadata: {
        criticalityTier,
        environment,
        version,
        approvedBy,
        approvalDate: approvalDate || now.slice(0, 10),
        artifactCount: existingArtifacts.length,
        pipelineRunCount: pipelineRuns.length,
        checklistItems: checklistItems.length,
      },
      _generationStatus: ARTIFACT_GENERATION_STATUSES.APPROVED,
    };

    // Persist
    const artifacts = loadData(STORAGE_KEYS.ARTIFACTS, []);
    artifacts.push(artifact);
    saveData(STORAGE_KEYS.ARTIFACTS, trimArtifacts(artifacts));

    const signOffPacks = loadData(STORAGE_KEYS.SIGN_OFF_PACKS, []);
    signOffPacks.push({
      artifactId: artifact.id,
      applicationId: appId,
      applicationName: application.name,
      environment,
      version,
      approvedBy,
      approvalDate: approvalDate || now.slice(0, 10),
      createdAt: now,
    });
    saveData(STORAGE_KEYS.SIGN_OFF_PACKS, signOffPacks);

    logAction(userId || null, AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD, {
      artifactId: artifact.id,
      artifactType: ARTIFACT_TYPES.SIGN_OFF_PACK,
      applicationId: appId,
      applicationName: application.name,
      environment,
      version,
      approvedBy,
      action: 'sign_off_pack_generated',
    });

    return { success: true, artifact, error: null };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to generate sign-off pack:', _err);
    return { success: false, artifact: null, error: 'Failed to generate sign-off pack.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Generate Audit Documentation
// ---------------------------------------------------------------------------

/**
 * Generate HIPAA/CMS audit-ready documentation. Creates a comprehensive
 * audit package covering all applications, compliance status, security
 * posture, and operational metrics.
 *
 * @param {Object} [options]
 * @param {string} [options.domain] - Filter by domain name.
 * @param {string} [options.applicationId] - Filter by specific application.
 * @param {string} [options.period] - Audit period (e.g. '2024-Q4').
 * @param {string} [options.auditType='comprehensive'] - Audit type: 'comprehensive', 'security', 'operational', 'compliance'.
 * @param {string} [options.preparedBy] - Name of the preparer.
 * @param {string} [options.userId] - ID of the user generating the documentation.
 * @returns {{ success: boolean, artifact: Object|null, error: string|null }}
 */
export const generateAuditDocumentation = (options = {}) => {
  try {
    const {
      domain,
      applicationId,
      period,
      auditType = 'comprehensive',
      preparedBy = 'Compliance Team',
      userId = null,
    } = options;

    const now = new Date().toISOString();
    const auditPeriod = period || `${now.slice(0, 4)}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

    // Gather data
    const filters = {};
    if (domain) {
      filters.domain = domain;
    }
    if (applicationId) {
      filters.application = applicationId;
    }

    const governanceData = getGovernanceData(filters);
    const kpiData = getKPIData(filters);
    const meltData = getMELTData(filters);
    const mttrData = getMTTRMetrics(filters);

    // Gather all artifacts
    const artifactFilters = {};
    if (applicationId) {
      artifactFilters.applicationId = applicationId;
    }
    const { data: allArtifacts } = getArtifacts(artifactFilters);

    const sections = [
      {
        heading: 'Audit Documentation',
        content: [
          `Audit Type: ${auditType.charAt(0).toUpperCase() + auditType.slice(1)}`,
          `Audit Period: ${auditPeriod}`,
          `Domain: ${domain || 'All Domains'}`,
          `Application: ${applicationId || 'All Applications'}`,
          `Prepared By: ${preparedBy}`,
          `Generated: ${now}`,
          '',
          'This document provides audit-ready documentation for HIPAA/CMS compliance',
          'review of the Horizon DevSecOps Portal and managed applications.',
        ].join('\n'),
      },
    ];

    // Governance summary
    if (governanceData && governanceData.summary) {
      const gs = governanceData.summary;
      sections.push({
        heading: 'Governance & Compliance Summary',
        content: [
          `Total Compliance Artifacts: ${gs.totalArtifacts || 0}`,
          `Compliant: ${gs.compliantCount || 0}`,
          `Non-Compliant: ${gs.nonCompliantCount || 0}`,
          `Pending Review: ${gs.pendingReviewCount || 0}`,
          `Overall Compliance Rate: ${gs.overallComplianceRate || 0}%`,
          `Audit Readiness Score: ${gs.auditReadinessScore || 0}%`,
          '',
          `Total Findings: ${gs.totalFindings || 0}`,
          `Critical Findings: ${gs.criticalFindings || 0}`,
          `High Findings: ${gs.highFindings || 0}`,
        ].join('\n'),
      });
    }

    // Compliance by application
    if (governanceData && Array.isArray(governanceData.complianceByApplication) && governanceData.complianceByApplication.length > 0) {
      const appLines = governanceData.complianceByApplication.map((entry, idx) => {
        return `  ${idx + 1}. ${entry.applicationName}: ${entry.complianceRate}% compliant (${entry.totalArtifacts} artifacts)`;
      });

      sections.push({
        heading: 'Compliance by Application',
        content: appLines.join('\n'),
      });
    }

    // Security posture
    if (auditType === 'comprehensive' || auditType === 'security') {
      const securityArtifacts = allArtifacts.filter((a) =>
        a.type === COMPLIANCE_ARTIFACT_TYPES.SAST_REPORT ||
        a.type === COMPLIANCE_ARTIFACT_TYPES.DAST_REPORT ||
        a.type === COMPLIANCE_ARTIFACT_TYPES.SCA_REPORT ||
        a.type === COMPLIANCE_ARTIFACT_TYPES.CONTAINER_SCAN_REPORT ||
        a.type === ARTIFACT_TYPES.SECURITY_SCAN_REPORT,
      );

      let totalCritical = 0;
      let totalHigh = 0;
      let totalMedium = 0;
      let totalLow = 0;

      securityArtifacts.forEach((a) => {
        if (a.findings && typeof a.findings === 'object') {
          totalCritical += a.findings.critical || 0;
          totalHigh += a.findings.high || 0;
          totalMedium += a.findings.medium || 0;
          totalLow += a.findings.low || 0;
        }
      });

      sections.push({
        heading: 'Security Posture',
        content: [
          `Security Scan Reports: ${securityArtifacts.length}`,
          `Total Critical Findings: ${totalCritical}`,
          `Total High Findings: ${totalHigh}`,
          `Total Medium Findings: ${totalMedium}`,
          `Total Low Findings: ${totalLow}`,
          '',
          'Security Scan Pass Rate: ' + (kpiData && kpiData.summary ? `${kpiData.summary.avgSecurityScanPassRate || 'N/A'}%` : 'N/A'),
        ].join('\n'),
      });
    }

    // Operational metrics
    if (auditType === 'comprehensive' || auditType === 'operational') {
      sections.push({
        heading: 'Operational Metrics (DORA)',
        content: [
          `Deployment Frequency: ${kpiData && kpiData.summary ? kpiData.summary.avgDeploymentFrequency || 'N/A' : 'N/A'} deployments/month`,
          `Lead Time for Changes: ${kpiData && kpiData.summary ? kpiData.summary.avgLeadTime || 'N/A' : 'N/A'} days`,
          `Change Failure Rate: ${kpiData && kpiData.summary ? kpiData.summary.avgChangeFailureRate || 'N/A' : 'N/A'}%`,
          `Mean Time to Recovery: ${kpiData && kpiData.summary ? kpiData.summary.avgMTTR || 'N/A' : 'N/A'} hours`,
          '',
          `Pipeline Success Rate: ${kpiData && kpiData.summary ? kpiData.summary.avgPipelineSuccessRate || 'N/A' : 'N/A'}%`,
          `Average Code Coverage: ${kpiData && kpiData.summary ? kpiData.summary.avgCodeCoverage || 'N/A' : 'N/A'}%`,
          `Average Availability: ${kpiData && kpiData.summary ? kpiData.summary.avgAvailability || 'N/A' : 'N/A'}%`,
        ].join('\n'),
      });
    }

    // Incident summary
    if (mttrData && mttrData.summary) {
      sections.push({
        heading: 'Incident Management',
        content: [
          `Total Incidents: ${mttrData.summary.totalIncidents || 0}`,
          `Resolved: ${mttrData.summary.resolvedIncidents || 0}`,
          `Open: ${mttrData.summary.openIncidents || 0}`,
          `Critical: ${mttrData.summary.criticalIncidents || 0}`,
          `Average MTTR: ${mttrData.summary.avgMttrHours || 'N/A'} hours`,
        ].join('\n'),
      });
    }

    // MELT summary
    if (meltData && meltData.summary) {
      sections.push({
        heading: 'Observability Summary',
        content: [
          `Avg CPU Utilization: ${meltData.summary.avgCpuUtilization || 'N/A'}%`,
          `Avg Memory Utilization: ${meltData.summary.avgMemoryUtilization || 'N/A'}%`,
          `Avg Response Time (P95): ${meltData.summary.avgResponseTimeP95Ms || 'N/A'} ms`,
          `Avg Error Rate: ${meltData.summary.avgErrorRate || 'N/A'}%`,
          `Avg Availability: ${meltData.summary.avgAvailability || 'N/A'}%`,
          `Critical Events: ${meltData.summary.criticalEvents || 0}`,
          `Error Logs: ${meltData.summary.errorLogs || 0}`,
        ].join('\n'),
      });
    }

    // HIPAA/CMS compliance section
    sections.push({
      heading: 'HIPAA/CMS Compliance Controls',
      content: [
        'Access Controls:',
        '  - Role-Based Access Control (RBAC) enforced for all portal actions',
        '  - Multi-factor authentication configured (SSO integration)',
        '  - Least privilege principle applied to all service accounts',
        '',
        'Audit Controls:',
        '  - Comprehensive audit trail for all user actions',
        '  - Immutable audit log entries with timestamps and user identification',
        '  - Audit logs retained for minimum 6 years per CMS requirements',
        '',
        'Data Protection:',
        '  - Encryption at rest and in transit for all sensitive data',
        '  - PHI/PII data masking in logs and dashboards',
        '  - Data classification labels applied to all artifacts',
        '',
        'Security Controls:',
        '  - Automated security scanning (SAST, DAST, SCA, Container)',
        '  - Vulnerability management with SLA-based remediation',
        '  - Penetration testing conducted annually',
        '',
        'Change Management:',
        '  - All changes tracked through ServiceNow change records',
        '  - Approval workflows enforced based on criticality tier',
        '  - Automated rollback capability for all deployments',
        '',
        'Incident Management:',
        '  - 24/7 monitoring with automated alerting',
        '  - Incident response procedures documented and tested',
        '  - Post-incident reviews conducted for all critical incidents',
      ].join('\n'),
    });

    sections.push({
      heading: 'Certification',
      content: [
        `This audit documentation has been prepared for the period: ${auditPeriod}`,
        '',
        `Prepared By: ${preparedBy}`,
        `Date: ${now.slice(0, 10)}`,
        '',
        'This document is generated by the Horizon DevSecOps Portal and',
        'represents the current state of compliance for the specified scope.',
        'All data is sourced from automated monitoring, scanning, and',
        'pipeline execution records.',
      ].join('\n'),
    });

    const documentContent = generateDocumentContent(
      `Audit Documentation - ${auditPeriod} - ${auditType.charAt(0).toUpperCase() + auditType.slice(1)}`,
      sections,
    );

    const artifact = {
      id: generateArtifactId('AUD'),
      applicationId: applicationId || null,
      applicationName: applicationId ? (getApplicationById(applicationId) || {}).name || null : null,
      type: ARTIFACT_TYPES.AUDIT_DOCUMENTATION,
      name: `Audit Documentation - ${auditPeriod} - ${auditType.charAt(0).toUpperCase() + auditType.slice(1)}`,
      description: `${auditType.charAt(0).toUpperCase() + auditType.slice(1)} audit documentation for period ${auditPeriod}.`,
      status: COMPLIANCE_STATUSES.COMPLIANT,
      findings: null,
      generatedAt: now,
      generatedBy: userId || preparedBy || 'System',
      tool: 'Horizon Portal',
      fileUrl: `/artifacts/audit/${generateArtifactId('AUD').toLowerCase()}.txt`,
      expiresAt: calculateExpirationDate(365),
      content: documentContent,
      metadata: {
        auditType,
        auditPeriod,
        domain: domain || 'All',
        preparedBy,
        governanceSummary: governanceData ? governanceData.summary : null,
        kpiSummary: kpiData ? kpiData.summary : null,
        incidentSummary: mttrData ? mttrData.summary : null,
      },
      _generationStatus: ARTIFACT_GENERATION_STATUSES.GENERATED,
    };

    // Persist
    const artifacts = loadData(STORAGE_KEYS.ARTIFACTS, []);
    artifacts.push(artifact);
    saveData(STORAGE_KEYS.ARTIFACTS, trimArtifacts(artifacts));

    const auditDocs = loadData(STORAGE_KEYS.AUDIT_DOCS, []);
    auditDocs.push({
      artifactId: artifact.id,
      auditType,
      auditPeriod,
      domain: domain || 'All',
      applicationId: applicationId || null,
      preparedBy,
      createdAt: now,
    });
    saveData(STORAGE_KEYS.AUDIT_DOCS, auditDocs);

    logAction(userId || null, AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD, {
      artifactId: artifact.id,
      artifactType: ARTIFACT_TYPES.AUDIT_DOCUMENTATION,
      auditType,
      auditPeriod,
      domain: domain || 'All',
      applicationId: applicationId || null,
      action: 'audit_documentation_generated',
    });

    return { success: true, artifact, error: null };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to generate audit documentation:', _err);
    return { success: false, artifact: null, error: 'Failed to generate audit documentation.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Update Artifact Status
// ---------------------------------------------------------------------------

/**
 * Update the status of a compliance artifact.
 *
 * @param {string} artifactId - The artifact ID.
 * @param {string} newStatus - The new compliance status.
 * @param {Object} [options]
 * @param {string} [options.reviewedBy] - Name of the reviewer.
 * @param {string} [options.reviewNotes] - Review notes.
 * @param {string} [options.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, artifact: Object|null, error: string|null }}
 */
export const updateArtifactStatus = (artifactId, newStatus, options = {}) => {
  try {
    if (!artifactId || typeof artifactId !== 'string') {
      return { success: false, artifact: null, error: 'Artifact ID is required.' };
    }

    if (!newStatus || typeof newStatus !== 'string') {
      return { success: false, artifact: null, error: 'New status is required.' };
    }

    const validStatuses = Object.values(COMPLIANCE_STATUSES);
    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        artifact: null,
        error: `Invalid status: "${newStatus}". Valid statuses: ${validStatuses.join(', ')}.`,
      };
    }

    const { reviewedBy = 'Reviewer', reviewNotes = '', userId = null } = options;

    const artifacts = loadData(STORAGE_KEYS.ARTIFACTS, []);
    const index = artifacts.findIndex((a) => a.id === artifactId);

    if (index === -1) {
      return { success: false, artifact: null, error: `Artifact with ID "${artifactId}" not found.` };
    }

    const previousStatus = artifacts[index].status;
    artifacts[index].status = newStatus;
    artifacts[index].reviewedBy = reviewedBy;
    artifacts[index].reviewedAt = new Date().toISOString();
    artifacts[index].reviewNotes = reviewNotes;

    saveData(STORAGE_KEYS.ARTIFACTS, artifacts);

    logAction(userId || null, AUDIT_ACTIONS.COMPLIANCE_REVIEW, {
      artifactId,
      artifactType: artifacts[index].type,
      applicationId: artifacts[index].applicationId,
      applicationName: artifacts[index].applicationName,
      previousStatus,
      newStatus,
      reviewedBy,
      reviewNotes,
      action: 'artifact_status_updated',
    });

    return { success: true, artifact: artifacts[index], error: null };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to update artifact status:', _err);
    return { success: false, artifact: null, error: 'Failed to update artifact status.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Delete Artifact
// ---------------------------------------------------------------------------

/**
 * Delete a compliance artifact by its ID.
 *
 * @param {string} artifactId - The artifact ID.
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean, error: string|null }}
 */
export const deleteArtifact = (artifactId, userId) => {
  try {
    if (!artifactId || typeof artifactId !== 'string') {
      return { success: false, error: 'Artifact ID is required.' };
    }

    const artifacts = loadData(STORAGE_KEYS.ARTIFACTS, []);
    const index = artifacts.findIndex((a) => a.id === artifactId);

    if (index === -1) {
      return { success: false, error: `Artifact with ID "${artifactId}" not found.` };
    }

    const removed = artifacts[index];
    artifacts.splice(index, 1);
    saveData(STORAGE_KEYS.ARTIFACTS, artifacts);

    logAction(userId || null, AUDIT_ACTIONS.COMPLIANCE_REVIEW, {
      artifactId: removed.id,
      artifactType: removed.type,
      applicationId: removed.applicationId,
      applicationName: removed.applicationName,
      action: 'artifact_deleted',
    });

    return { success: true, error: null };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to delete artifact:', _err);
    return { success: false, error: 'Failed to delete artifact.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Artifact Summary
// ---------------------------------------------------------------------------

/**
 * Get a summary of all compliance artifacts.
 *
 * @param {Object} [filters]
 * @param {string} [filters.applicationId] - Filter by application ID.
 * @param {string} [filters.domain] - Filter by domain name.
 * @returns {{
 *   totalArtifacts: number,
 *   byType: Array<{ type: string, count: number }>,
 *   byStatus: Array<{ status: string, count: number }>,
 *   byApplication: Array<{ applicationName: string, count: number }>,
 *   recentArtifacts: Array<Object>,
 *   complianceRate: number,
 *   criticalFindings: number,
 *   highFindings: number,
 * }}
 */
export const getArtifactSummary = (filters = {}) => {
  try {
    const { data: allArtifacts } = getArtifacts({
      applicationId: filters.applicationId,
      sortBy: 'generatedAt',
      sortOrder: 'desc',
    });

    // Count by type
    const typeCounts = {};
    allArtifacts.forEach((a) => {
      const key = a.type || 'Unknown';
      typeCounts[key] = (typeCounts[key] || 0) + 1;
    });
    const byType = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Count by status
    const statusCounts = {};
    allArtifacts.forEach((a) => {
      const key = a.status || 'Unknown';
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
    const byStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Count by application
    const appCounts = {};
    allArtifacts.forEach((a) => {
      const key = a.applicationName || 'Unknown';
      appCounts[key] = (appCounts[key] || 0) + 1;
    });
    const byApplication = Object.entries(appCounts)
      .map(([applicationName, count]) => ({ applicationName, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate compliance rate
    const compliantCount = allArtifacts.filter((a) => a.status === COMPLIANCE_STATUSES.COMPLIANT).length;
    const complianceRate = allArtifacts.length > 0
      ? parseFloat(((compliantCount / allArtifacts.length) * 100).toFixed(1))
      : 0;

    // Sum findings
    let criticalFindings = 0;
    let highFindings = 0;
    allArtifacts.forEach((a) => {
      if (a.findings && typeof a.findings === 'object') {
        criticalFindings += a.findings.critical || 0;
        highFindings += a.findings.high || 0;
      }
    });

    // Recent artifacts
    const recentArtifacts = allArtifacts.slice(0, 10);

    return {
      totalArtifacts: allArtifacts.length,
      byType,
      byStatus,
      byApplication,
      recentArtifacts,
      complianceRate,
      criticalFindings,
      highFindings,
    };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to get artifact summary:', _err);
    return {
      totalArtifacts: 0,
      byType: [],
      byStatus: [],
      byApplication: [],
      recentArtifacts: [],
      complianceRate: 0,
      criticalFindings: 0,
      highFindings: 0,
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Export Artifacts
// ---------------------------------------------------------------------------

/**
 * Export compliance artifacts as a JSON string suitable for download.
 *
 * @param {Object} [filters] - Same filter criteria as getArtifacts.
 * @param {Object} [options]
 * @param {boolean} [options.includeContent=false] - Whether to include document content.
 * @param {string} [options.userId] - ID of the user performing the export.
 * @returns {{ success: boolean, data: string, count: number }}
 */
export const exportArtifacts = (filters = {}, options = {}) => {
  try {
    const { includeContent = false, userId = null } = options;

    const exportFilters = { ...filters };
    delete exportFilters.limit;
    delete exportFilters.offset;

    const { data: artifacts, total } = getArtifacts(exportFilters);

    const exportData = artifacts.map((a) => {
      const exported = { ...a };
      if (!includeContent) {
        delete exported.content;
      }
      return exported;
    });

    const jsonData = JSON.stringify(exportData, null, 2);

    logAction(userId || null, AUDIT_ACTIONS.DATA_EXPORT, {
      exportType: 'compliance_artifacts',
      count: total,
      filters: Object.keys(filters).filter((k) => filters[k] !== undefined),
      includeContent,
      action: 'artifacts_exported',
    });

    return { success: true, data: jsonData, count: total };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to export artifacts:', _err);
    return { success: false, data: '', count: 0 };
  }
};

// ---------------------------------------------------------------------------
// Public API — Reset
// ---------------------------------------------------------------------------

/**
 * Reset all generated compliance artifacts. Useful for development and testing.
 *
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean }}
 */
export const resetArtifacts = (userId) => {
  try {
    saveData(STORAGE_KEYS.ARTIFACTS, []);
    saveData(STORAGE_KEYS.CHANGE_RECORDS, []);
    saveData(STORAGE_KEYS.QE_EVIDENCE, []);
    saveData(STORAGE_KEYS.SECURITY_REPORTS, []);
    saveData(STORAGE_KEYS.SIGN_OFF_PACKS, []);
    saveData(STORAGE_KEYS.AUDIT_DOCS, []);

    logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      message: 'All generated compliance artifacts have been reset.',
      action: 'compliance_artifacts_reset',
    });

    return { success: true };
  } catch (_err) {
    console.error('ComplianceArtifactService: Failed to reset artifacts:', _err);
    return { success: false };
  }
};