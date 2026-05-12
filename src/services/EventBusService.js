/**
 * Frontend event bus service for Horizon DevSecOps Portal
 * Simulates Kafka event-driven integration with publish/subscribe pattern.
 * Supports topics for pipeline execution, incident remediation, SLO breach
 * rollbacks, deployment events, and compliance notifications.
 * Stores event log in localStorage and logs events to audit trail.
 * @module services/EventBusService
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorageItem, setStorageItem, initializeStorage } from '../utils/localStorage.js';
import { logAction, AUDIT_ACTIONS } from '../utils/auditLogger.js';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = Object.freeze({
  EVENT_LOG: 'event_bus_log',
  EVENT_SUBSCRIPTIONS: 'event_bus_subscriptions_meta',
});

// ---------------------------------------------------------------------------
// Event Topics
// ---------------------------------------------------------------------------

/**
 * Supported event topics for the event bus.
 * @readonly
 * @enum {string}
 */
export const EVENT_TOPICS = Object.freeze({
  PIPELINE_EXECUTION: 'pipeline.execution',
  PIPELINE_STAGE_COMPLETE: 'pipeline.stage.complete',
  PIPELINE_SUCCESS: 'pipeline.success',
  PIPELINE_FAILURE: 'pipeline.failure',
  PIPELINE_GENERATED: 'pipeline.generated',
  DEPLOYMENT_STARTED: 'deployment.started',
  DEPLOYMENT_SUCCESS: 'deployment.success',
  DEPLOYMENT_FAILURE: 'deployment.failure',
  DEPLOYMENT_ROLLBACK: 'deployment.rollback',
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_UPDATED: 'incident.updated',
  INCIDENT_RESOLVED: 'incident.resolved',
  INCIDENT_REMEDIATION: 'incident.remediation',
  SLO_BREACH: 'slo.breach',
  SLO_BREACH_ROLLBACK: 'slo.breach.rollback',
  SLO_RECOVERY: 'slo.recovery',
  SECURITY_SCAN_COMPLETE: 'security.scan.complete',
  SECURITY_VULNERABILITY_FOUND: 'security.vulnerability.found',
  COMPLIANCE_CHECK_COMPLETE: 'compliance.check.complete',
  COMPLIANCE_VIOLATION: 'compliance.violation',
  APPLICATION_ONBOARDED: 'application.onboarded',
  APPLICATION_UPDATED: 'application.updated',
  APPLICATION_DELETED: 'application.deleted',
  TOOLCHAIN_CONFIGURED: 'toolchain.configured',
  METRICS_THRESHOLD_BREACH: 'metrics.threshold.breach',
  ALERT_TRIGGERED: 'alert.triggered',
  ALERT_RESOLVED: 'alert.resolved',
  AUDIT_EVENT: 'audit.event',
});

export const EVENT_TOPIC_LIST = Object.freeze(Object.values(EVENT_TOPICS));

// ---------------------------------------------------------------------------
// Event Severities
// ---------------------------------------------------------------------------

/**
 * Event severity levels.
 * @readonly
 * @enum {string}
 */
export const EVENT_SEVERITIES = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
});

export const EVENT_SEVERITY_LIST = Object.freeze(Object.values(EVENT_SEVERITIES));

// ---------------------------------------------------------------------------
// Event Statuses
// ---------------------------------------------------------------------------

/**
 * Event processing statuses.
 * @readonly
 * @enum {string}
 */
export const EVENT_STATUSES = Object.freeze({
  PUBLISHED: 'published',
  DELIVERED: 'delivered',
  PROCESSED: 'processed',
  FAILED: 'failed',
  ACKNOWLEDGED: 'acknowledged',
});

// ---------------------------------------------------------------------------
// Event Catalog
// ---------------------------------------------------------------------------

/**
 * Event catalog describing all supported event types, their topics,
 * expected payloads, and downstream actions.
 * @type {Array<Object>}
 */
const EVENT_CATALOG = Object.freeze([
  {
    topic: EVENT_TOPICS.PIPELINE_EXECUTION,
    name: 'Pipeline Execution Triggered',
    description: 'Fired when a CI/CD pipeline execution is triggered for an application.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'pipeline',
    payloadSchema: {
      pipelineId: 'string',
      applicationId: 'string',
      applicationName: 'string',
      trigger: 'string',
      branch: 'string',
      commitSha: 'string',
    },
    downstreamActions: [
      'Start pipeline monitoring',
      'Update dashboard status',
      'Notify team channel',
    ],
  },
  {
    topic: EVENT_TOPICS.PIPELINE_STAGE_COMPLETE,
    name: 'Pipeline Stage Completed',
    description: 'Fired when an individual pipeline stage completes (success or failure).',
    severity: EVENT_SEVERITIES.INFO,
    category: 'pipeline',
    payloadSchema: {
      pipelineId: 'string',
      applicationName: 'string',
      stageName: 'string',
      stageStatus: 'string',
      durationSeconds: 'number',
    },
    downstreamActions: [
      'Update pipeline visualization',
      'Log stage metrics',
    ],
  },
  {
    topic: EVENT_TOPICS.PIPELINE_SUCCESS,
    name: 'Pipeline Succeeded',
    description: 'Fired when a pipeline run completes successfully.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'pipeline',
    payloadSchema: {
      pipelineId: 'string',
      applicationName: 'string',
      buildNumber: 'number',
      durationSeconds: 'number',
      environment: 'string',
    },
    downstreamActions: [
      'Update deployment tracker',
      'Notify stakeholders',
      'Update DORA metrics',
    ],
  },
  {
    topic: EVENT_TOPICS.PIPELINE_FAILURE,
    name: 'Pipeline Failed',
    description: 'Fired when a pipeline run fails at any stage.',
    severity: EVENT_SEVERITIES.HIGH,
    category: 'pipeline',
    payloadSchema: {
      pipelineId: 'string',
      applicationName: 'string',
      buildNumber: 'number',
      failedStage: 'string',
      errorMessage: 'string',
    },
    downstreamActions: [
      'Create incident ticket',
      'Notify on-call engineer',
      'Block downstream deployments',
      'Update failure metrics',
    ],
  },
  {
    topic: EVENT_TOPICS.PIPELINE_GENERATED,
    name: 'Pipeline Generated',
    description: 'Fired when a Golden Pipeline is generated for an application.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'pipeline',
    payloadSchema: {
      pipelineId: 'string',
      applicationId: 'string',
      applicationName: 'string',
      platform: 'string',
      stageCount: 'number',
    },
    downstreamActions: [
      'Store pipeline artifact',
      'Update application catalog',
      'Log audit event',
    ],
  },
  {
    topic: EVENT_TOPICS.DEPLOYMENT_STARTED,
    name: 'Deployment Started',
    description: 'Fired when a deployment to an environment begins.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'deployment',
    payloadSchema: {
      applicationName: 'string',
      environment: 'string',
      version: 'string',
      deploymentStrategy: 'string',
    },
    downstreamActions: [
      'Enable deployment monitoring',
      'Freeze change window',
    ],
  },
  {
    topic: EVENT_TOPICS.DEPLOYMENT_SUCCESS,
    name: 'Deployment Succeeded',
    description: 'Fired when a deployment completes successfully.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'deployment',
    payloadSchema: {
      applicationName: 'string',
      environment: 'string',
      version: 'string',
      durationSeconds: 'number',
    },
    downstreamActions: [
      'Update deployment tracker',
      'Run post-deploy validation',
      'Update DORA metrics',
      'Notify stakeholders',
    ],
  },
  {
    topic: EVENT_TOPICS.DEPLOYMENT_FAILURE,
    name: 'Deployment Failed',
    description: 'Fired when a deployment fails.',
    severity: EVENT_SEVERITIES.CRITICAL,
    category: 'deployment',
    payloadSchema: {
      applicationName: 'string',
      environment: 'string',
      version: 'string',
      errorMessage: 'string',
    },
    downstreamActions: [
      'Trigger automatic rollback',
      'Create critical incident',
      'Notify on-call team',
      'Update failure metrics',
    ],
  },
  {
    topic: EVENT_TOPICS.DEPLOYMENT_ROLLBACK,
    name: 'Deployment Rollback',
    description: 'Fired when a deployment rollback is initiated.',
    severity: EVENT_SEVERITIES.HIGH,
    category: 'deployment',
    payloadSchema: {
      applicationName: 'string',
      environment: 'string',
      fromVersion: 'string',
      toVersion: 'string',
      reason: 'string',
    },
    downstreamActions: [
      'Execute rollback procedure',
      'Notify stakeholders',
      'Update incident record',
      'Log rollback metrics',
    ],
  },
  {
    topic: EVENT_TOPICS.INCIDENT_CREATED,
    name: 'Incident Created',
    description: 'Fired when a new incident is created.',
    severity: EVENT_SEVERITIES.HIGH,
    category: 'incident',
    payloadSchema: {
      incidentId: 'string',
      applicationName: 'string',
      title: 'string',
      severity: 'string',
      assignee: 'string',
    },
    downstreamActions: [
      'Notify assignment group',
      'Start SLA timer',
      'Update incident dashboard',
    ],
  },
  {
    topic: EVENT_TOPICS.INCIDENT_UPDATED,
    name: 'Incident Updated',
    description: 'Fired when an incident is updated.',
    severity: EVENT_SEVERITIES.MEDIUM,
    category: 'incident',
    payloadSchema: {
      incidentId: 'string',
      applicationName: 'string',
      updatedFields: 'object',
      updatedBy: 'string',
    },
    downstreamActions: [
      'Update incident timeline',
      'Notify watchers',
    ],
  },
  {
    topic: EVENT_TOPICS.INCIDENT_RESOLVED,
    name: 'Incident Resolved',
    description: 'Fired when an incident is resolved.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'incident',
    payloadSchema: {
      incidentId: 'string',
      applicationName: 'string',
      rootCause: 'string',
      resolutionTime: 'number',
    },
    downstreamActions: [
      'Stop SLA timer',
      'Update MTTR metrics',
      'Notify stakeholders',
      'Schedule post-mortem',
    ],
  },
  {
    topic: EVENT_TOPICS.INCIDENT_REMEDIATION,
    name: 'Incident Remediation Triggered',
    description: 'Fired when an automated remediation action is triggered for an incident.',
    severity: EVENT_SEVERITIES.HIGH,
    category: 'incident',
    payloadSchema: {
      incidentId: 'string',
      applicationName: 'string',
      remediationType: 'string',
      remediationAction: 'string',
      automated: 'boolean',
    },
    downstreamActions: [
      'Execute remediation runbook',
      'Monitor remediation progress',
      'Update incident status',
      'Log remediation audit trail',
    ],
  },
  {
    topic: EVENT_TOPICS.SLO_BREACH,
    name: 'SLO Breach Detected',
    description: 'Fired when a Service Level Objective is breached.',
    severity: EVENT_SEVERITIES.CRITICAL,
    category: 'slo',
    payloadSchema: {
      applicationName: 'string',
      sloName: 'string',
      sloTarget: 'number',
      currentValue: 'number',
      environment: 'string',
    },
    downstreamActions: [
      'Create high-priority incident',
      'Notify SRE team',
      'Evaluate rollback criteria',
      'Update SLO dashboard',
    ],
  },
  {
    topic: EVENT_TOPICS.SLO_BREACH_ROLLBACK,
    name: 'SLO Breach Rollback Initiated',
    description: 'Fired when an automatic rollback is triggered due to an SLO breach.',
    severity: EVENT_SEVERITIES.CRITICAL,
    category: 'slo',
    payloadSchema: {
      applicationName: 'string',
      sloName: 'string',
      environment: 'string',
      fromVersion: 'string',
      toVersion: 'string',
      breachDetails: 'object',
    },
    downstreamActions: [
      'Execute rollback deployment',
      'Create critical incident',
      'Notify all stakeholders',
      'Freeze deployments',
      'Log rollback audit trail',
    ],
  },
  {
    topic: EVENT_TOPICS.SLO_RECOVERY,
    name: 'SLO Recovery Detected',
    description: 'Fired when a previously breached SLO recovers to within target.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'slo',
    payloadSchema: {
      applicationName: 'string',
      sloName: 'string',
      sloTarget: 'number',
      currentValue: 'number',
      recoveryDurationMinutes: 'number',
    },
    downstreamActions: [
      'Update SLO dashboard',
      'Close related incident',
      'Unfreeze deployments',
      'Notify stakeholders',
    ],
  },
  {
    topic: EVENT_TOPICS.SECURITY_SCAN_COMPLETE,
    name: 'Security Scan Complete',
    description: 'Fired when a security scan (SAST, DAST, SCA, container) completes.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'security',
    payloadSchema: {
      applicationName: 'string',
      scanType: 'string',
      tool: 'string',
      findingsCount: 'number',
      criticalCount: 'number',
      highCount: 'number',
    },
    downstreamActions: [
      'Update compliance dashboard',
      'Generate scan report',
      'Notify security team if critical findings',
    ],
  },
  {
    topic: EVENT_TOPICS.SECURITY_VULNERABILITY_FOUND,
    name: 'Security Vulnerability Found',
    description: 'Fired when a critical or high severity vulnerability is discovered.',
    severity: EVENT_SEVERITIES.HIGH,
    category: 'security',
    payloadSchema: {
      applicationName: 'string',
      vulnerabilityId: 'string',
      severity: 'string',
      description: 'string',
      source: 'string',
    },
    downstreamActions: [
      'Create security incident',
      'Block pipeline progression',
      'Notify security team',
      'Update vulnerability tracker',
    ],
  },
  {
    topic: EVENT_TOPICS.COMPLIANCE_CHECK_COMPLETE,
    name: 'Compliance Check Complete',
    description: 'Fired when a compliance check or audit completes.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'compliance',
    payloadSchema: {
      applicationName: 'string',
      checkType: 'string',
      status: 'string',
      score: 'number',
    },
    downstreamActions: [
      'Update compliance dashboard',
      'Generate compliance report',
      'Notify compliance team',
    ],
  },
  {
    topic: EVENT_TOPICS.COMPLIANCE_VIOLATION,
    name: 'Compliance Violation Detected',
    description: 'Fired when a compliance violation is detected.',
    severity: EVENT_SEVERITIES.CRITICAL,
    category: 'compliance',
    payloadSchema: {
      applicationName: 'string',
      violationType: 'string',
      description: 'string',
      regulation: 'string',
    },
    downstreamActions: [
      'Create compliance incident',
      'Block deployments',
      'Notify compliance officer',
      'Generate evidence package',
    ],
  },
  {
    topic: EVENT_TOPICS.APPLICATION_ONBOARDED,
    name: 'Application Onboarded',
    description: 'Fired when a new application is onboarded to the platform.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'application',
    payloadSchema: {
      applicationId: 'string',
      applicationName: 'string',
      domainName: 'string',
      portfolioName: 'string',
      criticalityTier: 'string',
    },
    downstreamActions: [
      'Generate Golden Pipeline',
      'Configure monitoring',
      'Set up logging',
      'Create ITSM records',
    ],
  },
  {
    topic: EVENT_TOPICS.APPLICATION_UPDATED,
    name: 'Application Updated',
    description: 'Fired when an application configuration is updated.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'application',
    payloadSchema: {
      applicationId: 'string',
      applicationName: 'string',
      updatedFields: 'object',
    },
    downstreamActions: [
      'Update catalog',
      'Regenerate pipeline if needed',
      'Log audit event',
    ],
  },
  {
    topic: EVENT_TOPICS.APPLICATION_DELETED,
    name: 'Application Deleted',
    description: 'Fired when an application is removed from the platform.',
    severity: EVENT_SEVERITIES.MEDIUM,
    category: 'application',
    payloadSchema: {
      applicationId: 'string',
      applicationName: 'string',
      deletedBy: 'string',
    },
    downstreamActions: [
      'Remove pipeline configs',
      'Archive monitoring data',
      'Update catalog',
      'Log audit event',
    ],
  },
  {
    topic: EVENT_TOPICS.TOOLCHAIN_CONFIGURED,
    name: 'Toolchain Configured',
    description: 'Fired when toolchain assignments are configured for an application.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'toolchain',
    payloadSchema: {
      applicationId: 'string',
      applicationName: 'string',
      toolCount: 'number',
      categories: 'object',
    },
    downstreamActions: [
      'Update integration configs',
      'Validate tool connectivity',
      'Log audit event',
    ],
  },
  {
    topic: EVENT_TOPICS.METRICS_THRESHOLD_BREACH,
    name: 'Metrics Threshold Breach',
    description: 'Fired when an application metric breaches a configured threshold.',
    severity: EVENT_SEVERITIES.HIGH,
    category: 'metrics',
    payloadSchema: {
      applicationName: 'string',
      metricName: 'string',
      threshold: 'number',
      currentValue: 'number',
      environment: 'string',
    },
    downstreamActions: [
      'Trigger alert',
      'Evaluate auto-scaling',
      'Notify operations team',
      'Update metrics dashboard',
    ],
  },
  {
    topic: EVENT_TOPICS.ALERT_TRIGGERED,
    name: 'Alert Triggered',
    description: 'Fired when a monitoring alert is triggered.',
    severity: EVENT_SEVERITIES.HIGH,
    category: 'alert',
    payloadSchema: {
      alertId: 'string',
      applicationName: 'string',
      alertType: 'string',
      message: 'string',
      source: 'string',
    },
    downstreamActions: [
      'Notify on-call team',
      'Create incident if threshold exceeded',
      'Update alert dashboard',
    ],
  },
  {
    topic: EVENT_TOPICS.ALERT_RESOLVED,
    name: 'Alert Resolved',
    description: 'Fired when a monitoring alert is resolved.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'alert',
    payloadSchema: {
      alertId: 'string',
      applicationName: 'string',
      alertType: 'string',
      resolutionDurationMinutes: 'number',
    },
    downstreamActions: [
      'Update alert dashboard',
      'Close related incident',
      'Log resolution metrics',
    ],
  },
  {
    topic: EVENT_TOPICS.AUDIT_EVENT,
    name: 'Audit Event',
    description: 'Generic audit event for tracking system-wide actions.',
    severity: EVENT_SEVERITIES.INFO,
    category: 'audit',
    payloadSchema: {
      action: 'string',
      userId: 'string',
      resource: 'string',
      details: 'object',
    },
    downstreamActions: [
      'Persist to audit log',
      'Update compliance trail',
    ],
  },
]);

// ---------------------------------------------------------------------------
// Internal State — In-Memory Subscriptions
// ---------------------------------------------------------------------------

/**
 * In-memory subscription registry.
 * Map of topic -> Set of handler functions.
 * @type {Map<string, Set<Function>>}
 */
const subscriptions = new Map();

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
 * Load the event log from localStorage.
 * @returns {Array<Object>}
 */
const loadEventLog = () => {
  ensureInitialized();
  const log = getStorageItem(STORAGE_KEYS.EVENT_LOG, null);
  if (log !== null && Array.isArray(log)) {
    return log;
  }
  setStorageItem(STORAGE_KEYS.EVENT_LOG, []);
  return [];
};

/**
 * Save the event log to localStorage.
 * @param {Array<Object>} log
 * @returns {boolean}
 */
const saveEventLog = (log) => {
  return setStorageItem(STORAGE_KEYS.EVENT_LOG, log);
};

/**
 * Trim the event log to prevent localStorage overflow.
 * Keeps the most recent entries up to the specified limit.
 * @param {Array<Object>} log
 * @param {number} [maxEntries=1000]
 * @returns {Array<Object>}
 */
const trimEventLog = (log, maxEntries = 1000) => {
  if (!Array.isArray(log)) {
    return [];
  }
  if (log.length <= maxEntries) {
    return log;
  }
  return log.slice(log.length - maxEntries);
};

/**
 * Validate that a topic is a supported event topic.
 * @param {string} topic
 * @returns {boolean}
 */
const isValidTopic = (topic) => {
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return false;
  }
  return EVENT_TOPIC_LIST.includes(topic.trim());
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

// ---------------------------------------------------------------------------
// Public API — Publish
// ---------------------------------------------------------------------------

/**
 * Publish an event to a topic. Creates an event record, persists it to the
 * event log in localStorage, notifies all subscribers, and logs to the
 * audit trail.
 *
 * @param {string} topic - The event topic (must be one of EVENT_TOPICS).
 * @param {Object} payload - The event payload data.
 * @param {Object} [options]
 * @param {string} [options.severity] - Override the default severity for this topic.
 * @param {string} [options.source] - The source system or component that generated the event.
 * @param {string} [options.userId] - ID of the user who triggered the event.
 * @param {string} [options.correlationId] - Correlation ID for tracing related events.
 * @param {Object} [options.metadata] - Additional metadata to attach to the event.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publish = (topic, payload, options = {}) => {
  try {
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return { success: false, event: null, error: 'Topic is required and must be a non-empty string.', deliveredTo: 0 };
    }

    const trimmedTopic = topic.trim();

    if (!isValidTopic(trimmedTopic)) {
      return {
        success: false,
        event: null,
        error: `Invalid topic: "${trimmedTopic}". Must be one of the supported event topics.`,
        deliveredTo: 0,
      };
    }

    if (!payload || typeof payload !== 'object') {
      return { success: false, event: null, error: 'Payload is required and must be an object.', deliveredTo: 0 };
    }

    const {
      severity,
      source = 'horizon-portal',
      userId = null,
      correlationId = null,
      metadata = null,
    } = options;

    // Look up catalog entry for default severity
    const catalogEntry = EVENT_CATALOG.find((e) => e.topic === trimmedTopic);
    const resolvedSeverity = severity && EVENT_SEVERITY_LIST.includes(severity)
      ? severity
      : (catalogEntry ? catalogEntry.severity : EVENT_SEVERITIES.INFO);

    // Build the event record
    const event = Object.freeze({
      id: `EVT-${uuidv4().slice(0, 12)}`,
      topic: trimmedTopic,
      payload: { ...payload },
      severity: resolvedSeverity,
      source: typeof source === 'string' ? source.trim() : 'horizon-portal',
      userId: userId !== null && userId !== undefined ? String(userId) : null,
      correlationId: correlationId !== null && correlationId !== undefined ? String(correlationId) : `COR-${uuidv4().slice(0, 8)}`,
      metadata: metadata !== null && typeof metadata === 'object' ? { ...metadata } : null,
      status: EVENT_STATUSES.PUBLISHED,
      timestamp: new Date().toISOString(),
      deliveredTo: 0,
      processedBy: [],
    });

    // Persist to event log
    const log = loadEventLog();
    const mutableEvent = { ...event };
    log.push(mutableEvent);
    const trimmedLog = trimEventLog(log);
    saveEventLog(trimmedLog);

    // Deliver to subscribers
    let deliveredCount = 0;
    const topicSubscribers = subscriptions.get(trimmedTopic);

    if (topicSubscribers && topicSubscribers.size > 0) {
      topicSubscribers.forEach((handler) => {
        try {
          handler({
            id: event.id,
            topic: event.topic,
            payload: { ...event.payload },
            severity: event.severity,
            source: event.source,
            userId: event.userId,
            correlationId: event.correlationId,
            metadata: event.metadata ? { ...event.metadata } : null,
            timestamp: event.timestamp,
          });
          deliveredCount++;
        } catch (handlerErr) {
          console.error(`EventBus: Handler error for topic "${trimmedTopic}":`, handlerErr);
        }
      });
    }

    // Also deliver to wildcard subscribers (subscribed to '*')
    const wildcardSubscribers = subscriptions.get('*');
    if (wildcardSubscribers && wildcardSubscribers.size > 0) {
      wildcardSubscribers.forEach((handler) => {
        try {
          handler({
            id: event.id,
            topic: event.topic,
            payload: { ...event.payload },
            severity: event.severity,
            source: event.source,
            userId: event.userId,
            correlationId: event.correlationId,
            metadata: event.metadata ? { ...event.metadata } : null,
            timestamp: event.timestamp,
          });
          deliveredCount++;
        } catch (handlerErr) {
          console.error('EventBus: Wildcard handler error:', handlerErr);
        }
      });
    }

    // Update the event record with delivery info
    mutableEvent.deliveredTo = deliveredCount;
    mutableEvent.status = deliveredCount > 0 ? EVENT_STATUSES.DELIVERED : EVENT_STATUSES.PUBLISHED;

    // Update the log entry
    const updatedLog = loadEventLog();
    const eventIndex = updatedLog.findIndex((e) => e.id === mutableEvent.id);
    if (eventIndex >= 0) {
      updatedLog[eventIndex] = { ...mutableEvent };
      saveEventLog(updatedLog);
    }

    // Log to audit trail
    logAction(userId || null, AUDIT_ACTIONS.SCHEDULED_SCAN, {
      eventId: event.id,
      topic: trimmedTopic,
      severity: resolvedSeverity,
      source: event.source,
      deliveredTo: deliveredCount,
      correlationId: event.correlationId,
      action: 'event_published',
      payloadSummary: Object.keys(payload).join(', '),
    });

    return {
      success: true,
      event: { ...mutableEvent },
      error: null,
      deliveredTo: deliveredCount,
    };
  } catch (_err) {
    console.error('EventBus: Failed to publish event:', _err);
    return { success: false, event: null, error: 'Failed to publish event.', deliveredTo: 0 };
  }
};

// ---------------------------------------------------------------------------
// Public API — Subscribe
// ---------------------------------------------------------------------------

/**
 * Subscribe a handler function to a topic. The handler will be called
 * whenever an event is published to the specified topic.
 *
 * Use topic '*' to subscribe to all events (wildcard).
 *
 * @param {string} topic - The event topic to subscribe to (or '*' for all).
 * @param {Function} handler - The callback function to invoke on event delivery.
 *   Receives a single argument: the event object.
 * @returns {{ success: boolean, error: string|null }}
 */
export const subscribe = (topic, handler) => {
  try {
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return { success: false, error: 'Topic is required and must be a non-empty string.' };
    }

    const trimmedTopic = topic.trim();

    // Allow wildcard '*' or valid topics
    if (trimmedTopic !== '*' && !isValidTopic(trimmedTopic)) {
      return {
        success: false,
        error: `Invalid topic: "${trimmedTopic}". Must be one of the supported event topics or '*' for wildcard.`,
      };
    }

    if (!handler || typeof handler !== 'function') {
      return { success: false, error: 'Handler must be a function.' };
    }

    if (!subscriptions.has(trimmedTopic)) {
      subscriptions.set(trimmedTopic, new Set());
    }

    const topicSubscribers = subscriptions.get(trimmedTopic);

    if (topicSubscribers.has(handler)) {
      return { success: true, error: null }; // Already subscribed, idempotent
    }

    topicSubscribers.add(handler);

    return { success: true, error: null };
  } catch (_err) {
    console.error('EventBus: Failed to subscribe:', _err);
    return { success: false, error: 'Failed to subscribe to topic.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Unsubscribe
// ---------------------------------------------------------------------------

/**
 * Unsubscribe a handler function from a topic.
 *
 * @param {string} topic - The event topic to unsubscribe from (or '*' for wildcard).
 * @param {Function} handler - The handler function to remove.
 * @returns {{ success: boolean, error: string|null }}
 */
export const unsubscribe = (topic, handler) => {
  try {
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return { success: false, error: 'Topic is required and must be a non-empty string.' };
    }

    const trimmedTopic = topic.trim();

    if (!handler || typeof handler !== 'function') {
      return { success: false, error: 'Handler must be a function.' };
    }

    const topicSubscribers = subscriptions.get(trimmedTopic);

    if (!topicSubscribers) {
      return { success: true, error: null }; // No subscribers for this topic, idempotent
    }

    topicSubscribers.delete(handler);

    // Clean up empty sets
    if (topicSubscribers.size === 0) {
      subscriptions.delete(trimmedTopic);
    }

    return { success: true, error: null };
  } catch (_err) {
    console.error('EventBus: Failed to unsubscribe:', _err);
    return { success: false, error: 'Failed to unsubscribe from topic.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Unsubscribe All
// ---------------------------------------------------------------------------

/**
 * Unsubscribe all handlers from a specific topic, or all topics if no
 * topic is specified.
 *
 * @param {string} [topic] - The event topic to clear. If omitted, clears all subscriptions.
 * @returns {{ success: boolean, error: string|null }}
 */
export const unsubscribeAll = (topic) => {
  try {
    if (topic && typeof topic === 'string' && topic.trim().length > 0) {
      const trimmedTopic = topic.trim();
      subscriptions.delete(trimmedTopic);
    } else {
      subscriptions.clear();
    }

    return { success: true, error: null };
  } catch (_err) {
    console.error('EventBus: Failed to unsubscribe all:', _err);
    return { success: false, error: 'Failed to unsubscribe all handlers.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Event Log
// ---------------------------------------------------------------------------

/**
 * Retrieve the event log with optional filtering, sorting, and pagination.
 *
 * @param {Object} [filters]
 * @param {string} [filters.topic] - Filter by event topic.
 * @param {string} [filters.severity] - Filter by severity level.
 * @param {string} [filters.category] - Filter by event category.
 * @param {string} [filters.status] - Filter by event status.
 * @param {string} [filters.source] - Filter by event source.
 * @param {string} [filters.userId] - Filter by user ID.
 * @param {string} [filters.correlationId] - Filter by correlation ID.
 * @param {string|Date} [filters.startDate] - Include events on or after this date.
 * @param {string|Date} [filters.endDate] - Include events on or before this date.
 * @param {string} [filters.search] - Free-text search across topic, payload, source.
 * @param {string} [filters.sortBy='timestamp'] - Field to sort by.
 * @param {string} [filters.sortOrder='desc'] - Sort order: 'asc' or 'desc'.
 * @param {number} [filters.limit] - Maximum number of entries to return.
 * @param {number} [filters.offset=0] - Number of entries to skip.
 * @returns {{ entries: Array<Object>, total: number }}
 */
export const getEventLog = (filters = {}) => {
  try {
    let log = loadEventLog();

    const {
      topic,
      severity,
      category,
      status,
      source,
      userId,
      correlationId,
      startDate,
      endDate,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      limit,
      offset = 0,
    } = filters;

    // Filter by topic
    if (topic && typeof topic === 'string' && topic.trim().length > 0) {
      const t = topic.trim();
      log = log.filter((e) => e.topic === t);
    }

    // Filter by severity
    if (severity && typeof severity === 'string' && severity.trim().length > 0) {
      const s = severity.trim();
      log = log.filter((e) => e.severity === s);
    }

    // Filter by category (look up from catalog)
    if (category && typeof category === 'string' && category.trim().length > 0) {
      const cat = category.trim().toLowerCase();
      const topicsInCategory = EVENT_CATALOG
        .filter((c) => c.category.toLowerCase() === cat)
        .map((c) => c.topic);
      log = log.filter((e) => topicsInCategory.includes(e.topic));
    }

    // Filter by status
    if (status && typeof status === 'string' && status.trim().length > 0) {
      const st = status.trim();
      log = log.filter((e) => e.status === st);
    }

    // Filter by source
    if (source && typeof source === 'string' && source.trim().length > 0) {
      const src = source.trim();
      log = log.filter((e) => matchesSearch(e.source, src));
    }

    // Filter by userId
    if (userId !== null && userId !== undefined && String(userId).trim().length > 0) {
      const uid = String(userId).trim();
      log = log.filter((e) => e.userId === uid);
    }

    // Filter by correlationId
    if (correlationId && typeof correlationId === 'string' && correlationId.trim().length > 0) {
      const cid = correlationId.trim();
      log = log.filter((e) => e.correlationId === cid);
    }

    // Filter by date range
    if (startDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        log = log.filter((e) => {
          const eventDate = new Date(e.timestamp);
          return !Number.isNaN(eventDate.getTime()) && eventDate >= start;
        });
      }
    }

    if (endDate) {
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        log = log.filter((e) => {
          const eventDate = new Date(e.timestamp);
          return !Number.isNaN(eventDate.getTime()) && eventDate <= endOfDay;
        });
      }
    }

    // Free-text search
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.trim();
      log = log.filter((e) => {
        const topicMatch = matchesSearch(e.topic, query);
        const sourceMatch = matchesSearch(e.source, query);
        const severityMatch = matchesSearch(e.severity, query);
        const idMatch = matchesSearch(e.id, query);
        const correlationMatch = matchesSearch(e.correlationId, query);
        const payloadMatch = e.payload && matchesSearch(JSON.stringify(e.payload), query);
        return topicMatch || sourceMatch || severityMatch || idMatch || correlationMatch || payloadMatch;
      });
    }

    // Sort
    log.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

    const total = log.length;

    // Pagination
    const startIdx = typeof offset === 'number' && offset > 0 ? offset : 0;
    if (typeof limit === 'number' && limit > 0) {
      log = log.slice(startIdx, startIdx + limit);
    } else if (startIdx > 0) {
      log = log.slice(startIdx);
    }

    return { entries: log, total };
  } catch (_err) {
    console.error('EventBus: Failed to get event log:', _err);
    return { entries: [], total: 0 };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Event by ID
// ---------------------------------------------------------------------------

/**
 * Get a single event from the log by its ID.
 *
 * @param {string} eventId - The event ID.
 * @returns {Object|null} The event object or null if not found.
 */
export const getEventById = (eventId) => {
  try {
    if (!eventId || typeof eventId !== 'string') {
      return null;
    }

    const log = loadEventLog();
    return log.find((e) => e.id === eventId) || null;
  } catch (_err) {
    console.error('EventBus: Failed to get event by ID:', _err);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Event Catalog
// ---------------------------------------------------------------------------

/**
 * Get the event catalog describing all supported event types.
 *
 * @param {Object} [options]
 * @param {string} [options.category] - Filter by event category.
 * @param {string} [options.severity] - Filter by severity level.
 * @param {string} [options.search] - Free-text search across name, description, topic.
 * @returns {Array<Object>}
 */
export const getEventCatalog = (options = {}) => {
  try {
    const { category, severity, search } = options;

    let catalog = [...EVENT_CATALOG];

    if (category && typeof category === 'string' && category.trim().length > 0) {
      const cat = category.trim().toLowerCase();
      catalog = catalog.filter((e) => e.category.toLowerCase() === cat);
    }

    if (severity && typeof severity === 'string' && severity.trim().length > 0) {
      const sev = severity.trim().toLowerCase();
      catalog = catalog.filter((e) => e.severity.toLowerCase() === sev);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.trim();
      catalog = catalog.filter((e) => {
        return (
          matchesSearch(e.topic, query) ||
          matchesSearch(e.name, query) ||
          matchesSearch(e.description, query) ||
          matchesSearch(e.category, query)
        );
      });
    }

    return catalog;
  } catch (_err) {
    console.error('EventBus: Failed to get event catalog:', _err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Event Categories
// ---------------------------------------------------------------------------

/**
 * Get all unique event categories from the catalog.
 *
 * @returns {Array<string>} Sorted array of unique category strings.
 */
export const getEventCategories = () => {
  const categories = new Set(EVENT_CATALOG.map((e) => e.category));
  return [...categories].sort();
};

// ---------------------------------------------------------------------------
// Public API — Get Subscription Info
// ---------------------------------------------------------------------------

/**
 * Get information about current subscriptions.
 *
 * @returns {{ totalTopics: number, totalHandlers: number, topics: Array<{ topic: string, handlerCount: number }> }}
 */
export const getSubscriptionInfo = () => {
  try {
    const topics = [];
    let totalHandlers = 0;

    subscriptions.forEach((handlers, topic) => {
      const count = handlers.size;
      topics.push({ topic, handlerCount: count });
      totalHandlers += count;
    });

    topics.sort((a, b) => a.topic.localeCompare(b.topic));

    return {
      totalTopics: topics.length,
      totalHandlers,
      topics,
    };
  } catch (_err) {
    console.error('EventBus: Failed to get subscription info:', _err);
    return { totalTopics: 0, totalHandlers: 0, topics: [] };
  }
};

// ---------------------------------------------------------------------------
// Public API — Event Log Summary
// ---------------------------------------------------------------------------

/**
 * Get a summary of the event log grouped by topic, severity, and category.
 *
 * @param {Object} [filters]
 * @param {string|Date} [filters.startDate] - Include events on or after this date.
 * @param {string|Date} [filters.endDate] - Include events on or before this date.
 * @returns {{
 *   totalEvents: number,
 *   byTopic: Array<{ topic: string, count: number }>,
 *   bySeverity: Array<{ severity: string, count: number }>,
 *   byCategory: Array<{ category: string, count: number }>,
 *   byStatus: Array<{ status: string, count: number }>,
 *   recentEvents: Array<Object>,
 * }}
 */
export const getEventLogSummary = (filters = {}) => {
  try {
    const { entries } = getEventLog({
      startDate: filters.startDate,
      endDate: filters.endDate,
      sortOrder: 'desc',
    });

    // Group by topic
    const topicCounts = {};
    entries.forEach((e) => {
      const key = e.topic || 'unknown';
      topicCounts[key] = (topicCounts[key] || 0) + 1;
    });
    const byTopic = Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    // Group by severity
    const severityCounts = {};
    entries.forEach((e) => {
      const key = e.severity || 'unknown';
      severityCounts[key] = (severityCounts[key] || 0) + 1;
    });
    const bySeverity = Object.entries(severityCounts)
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => b.count - a.count);

    // Group by category (look up from catalog)
    const categoryCounts = {};
    entries.forEach((e) => {
      const catalogEntry = EVENT_CATALOG.find((c) => c.topic === e.topic);
      const key = catalogEntry ? catalogEntry.category : 'unknown';
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    });
    const byCategory = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Group by status
    const statusCounts = {};
    entries.forEach((e) => {
      const key = e.status || 'unknown';
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
    const byStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Recent events (last 10)
    const recentEvents = entries.slice(0, 10);

    return {
      totalEvents: entries.length,
      byTopic,
      bySeverity,
      byCategory,
      byStatus,
      recentEvents,
    };
  } catch (_err) {
    console.error('EventBus: Failed to get event log summary:', _err);
    return {
      totalEvents: 0,
      byTopic: [],
      bySeverity: [],
      byCategory: [],
      byStatus: [],
      recentEvents: [],
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Acknowledge Event
// ---------------------------------------------------------------------------

/**
 * Acknowledge an event in the log, marking it as processed.
 *
 * @param {string} eventId - The event ID to acknowledge.
 * @param {Object} [options]
 * @param {string} [options.processedBy] - Identifier of the processor.
 * @param {string} [options.userId] - ID of the user acknowledging the event.
 * @returns {{ success: boolean, error: string|null }}
 */
export const acknowledgeEvent = (eventId, options = {}) => {
  try {
    if (!eventId || typeof eventId !== 'string') {
      return { success: false, error: 'Event ID is required.' };
    }

    const { processedBy = 'manual', userId = null } = options;

    const log = loadEventLog();
    const index = log.findIndex((e) => e.id === eventId);

    if (index === -1) {
      return { success: false, error: `Event with ID "${eventId}" not found.` };
    }

    const event = log[index];
    event.status = EVENT_STATUSES.ACKNOWLEDGED;
    if (!Array.isArray(event.processedBy)) {
      event.processedBy = [];
    }
    event.processedBy.push({
      processor: processedBy,
      acknowledgedAt: new Date().toISOString(),
      userId: userId || null,
    });

    log[index] = event;
    saveEventLog(log);

    return { success: true, error: null };
  } catch (_err) {
    console.error('EventBus: Failed to acknowledge event:', _err);
    return { success: false, error: 'Failed to acknowledge event.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Replay Event
// ---------------------------------------------------------------------------

/**
 * Replay a previously published event by re-delivering it to current
 * subscribers. Creates a new event record linked to the original via
 * correlation ID.
 *
 * @param {string} eventId - The event ID to replay.
 * @param {Object} [options]
 * @param {string} [options.userId] - ID of the user replaying the event.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const replayEvent = (eventId, options = {}) => {
  try {
    if (!eventId || typeof eventId !== 'string') {
      return { success: false, event: null, error: 'Event ID is required.', deliveredTo: 0 };
    }

    const { userId = null } = options;

    const log = loadEventLog();
    const originalEvent = log.find((e) => e.id === eventId);

    if (!originalEvent) {
      return {
        success: false,
        event: null,
        error: `Event with ID "${eventId}" not found.`,
        deliveredTo: 0,
      };
    }

    // Publish a new event with the same topic and payload, linked via correlationId
    const result = publish(originalEvent.topic, { ...originalEvent.payload }, {
      severity: originalEvent.severity,
      source: `replay:${originalEvent.source}`,
      userId,
      correlationId: originalEvent.correlationId || originalEvent.id,
      metadata: {
        replayedFrom: originalEvent.id,
        replayedAt: new Date().toISOString(),
        originalTimestamp: originalEvent.timestamp,
      },
    });

    return result;
  } catch (_err) {
    console.error('EventBus: Failed to replay event:', _err);
    return { success: false, event: null, error: 'Failed to replay event.', deliveredTo: 0 };
  }
};

// ---------------------------------------------------------------------------
// Public API — Clear Event Log
// ---------------------------------------------------------------------------

/**
 * Clear the event log from localStorage.
 * Intended for development and testing purposes.
 *
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean }}
 */
export const clearEventLog = (userId) => {
  try {
    saveEventLog([]);

    logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      message: 'Event bus log cleared.',
      action: 'event_log_cleared',
    });

    return { success: true };
  } catch (_err) {
    console.error('EventBus: Failed to clear event log:', _err);
    return { success: false };
  }
};

// ---------------------------------------------------------------------------
// Public API — Export Event Log
// ---------------------------------------------------------------------------

/**
 * Export the event log as a JSON string suitable for download.
 *
 * @param {Object} [filters] - Same filter criteria as getEventLog.
 * @returns {{ success: boolean, data: string, count: number }}
 */
export const exportEventLog = (filters = {}) => {
  try {
    const exportFilters = { ...filters };
    delete exportFilters.limit;
    delete exportFilters.offset;

    const { entries, total } = getEventLog(exportFilters);
    const jsonData = JSON.stringify(entries, null, 2);

    return { success: true, data: jsonData, count: total };
  } catch (_err) {
    console.error('EventBus: Failed to export event log:', _err);
    return { success: false, data: '', count: 0 };
  }
};

// ---------------------------------------------------------------------------
// Convenience Publishers
// ---------------------------------------------------------------------------

/**
 * Publish a pipeline execution event.
 *
 * @param {Object} payload - Pipeline execution payload.
 * @param {string} payload.pipelineId - The pipeline ID.
 * @param {string} payload.applicationId - The application ID.
 * @param {string} payload.applicationName - The application name.
 * @param {string} [payload.trigger] - What triggered the execution.
 * @param {string} [payload.branch] - The branch being built.
 * @param {string} [payload.commitSha] - The commit SHA.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishPipelineExecution = (payload, options = {}) => {
  return publish(EVENT_TOPICS.PIPELINE_EXECUTION, payload, {
    source: 'pipeline-service',
    ...options,
  });
};

/**
 * Publish a pipeline failure event.
 *
 * @param {Object} payload - Pipeline failure payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishPipelineFailure = (payload, options = {}) => {
  return publish(EVENT_TOPICS.PIPELINE_FAILURE, payload, {
    severity: EVENT_SEVERITIES.HIGH,
    source: 'pipeline-service',
    ...options,
  });
};

/**
 * Publish a deployment success event.
 *
 * @param {Object} payload - Deployment success payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishDeploymentSuccess = (payload, options = {}) => {
  return publish(EVENT_TOPICS.DEPLOYMENT_SUCCESS, payload, {
    source: 'deployment-service',
    ...options,
  });
};

/**
 * Publish a deployment failure event.
 *
 * @param {Object} payload - Deployment failure payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishDeploymentFailure = (payload, options = {}) => {
  return publish(EVENT_TOPICS.DEPLOYMENT_FAILURE, payload, {
    severity: EVENT_SEVERITIES.CRITICAL,
    source: 'deployment-service',
    ...options,
  });
};

/**
 * Publish an incident created event.
 *
 * @param {Object} payload - Incident payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishIncidentCreated = (payload, options = {}) => {
  return publish(EVENT_TOPICS.INCIDENT_CREATED, payload, {
    severity: EVENT_SEVERITIES.HIGH,
    source: 'incident-service',
    ...options,
  });
};

/**
 * Publish an incident remediation event.
 *
 * @param {Object} payload - Remediation payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishIncidentRemediation = (payload, options = {}) => {
  return publish(EVENT_TOPICS.INCIDENT_REMEDIATION, payload, {
    severity: EVENT_SEVERITIES.HIGH,
    source: 'remediation-service',
    ...options,
  });
};

/**
 * Publish an SLO breach event.
 *
 * @param {Object} payload - SLO breach payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishSLOBreach = (payload, options = {}) => {
  return publish(EVENT_TOPICS.SLO_BREACH, payload, {
    severity: EVENT_SEVERITIES.CRITICAL,
    source: 'slo-monitor',
    ...options,
  });
};

/**
 * Publish an SLO breach rollback event.
 *
 * @param {Object} payload - SLO breach rollback payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishSLOBreachRollback = (payload, options = {}) => {
  return publish(EVENT_TOPICS.SLO_BREACH_ROLLBACK, payload, {
    severity: EVENT_SEVERITIES.CRITICAL,
    source: 'slo-monitor',
    ...options,
  });
};

/**
 * Publish an application onboarded event.
 *
 * @param {Object} payload - Application onboarded payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishApplicationOnboarded = (payload, options = {}) => {
  return publish(EVENT_TOPICS.APPLICATION_ONBOARDED, payload, {
    source: 'onboarding-service',
    ...options,
  });
};

/**
 * Publish a security vulnerability found event.
 *
 * @param {Object} payload - Vulnerability payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishSecurityVulnerability = (payload, options = {}) => {
  return publish(EVENT_TOPICS.SECURITY_VULNERABILITY_FOUND, payload, {
    severity: EVENT_SEVERITIES.HIGH,
    source: 'security-scanner',
    ...options,
  });
};

/**
 * Publish a compliance violation event.
 *
 * @param {Object} payload - Compliance violation payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishComplianceViolation = (payload, options = {}) => {
  return publish(EVENT_TOPICS.COMPLIANCE_VIOLATION, payload, {
    severity: EVENT_SEVERITIES.CRITICAL,
    source: 'compliance-service',
    ...options,
  });
};

/**
 * Publish a metrics threshold breach event.
 *
 * @param {Object} payload - Metrics breach payload.
 * @param {Object} [options] - Additional publish options.
 * @returns {{ success: boolean, event: Object|null, error: string|null, deliveredTo: number }}
 */
export const publishMetricsThresholdBreach = (payload, options = {}) => {
  return publish(EVENT_TOPICS.METRICS_THRESHOLD_BREACH, payload, {
    severity: EVENT_SEVERITIES.HIGH,
    source: 'metrics-monitor',
    ...options,
  });
};