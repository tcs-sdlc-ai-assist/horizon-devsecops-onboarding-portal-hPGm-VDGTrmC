/**
 * Dashboard data aggregation service for Horizon DevSecOps Portal
 * Aggregates mock MELT data from Dynatrace/Splunk/Elastic sources,
 * correlates with business KPIs, and supports per-domain/app configuration.
 * Stores dashboard state in localStorage and logs actions to audit trail.
 * @module services/DashboardDataService
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorageItem, setStorageItem, initializeStorage } from '../utils/localStorage.js';
import { logAction, AUDIT_ACTIONS } from '../utils/auditLogger.js';
import {
  MOCK_MELT_METRICS,
  MOCK_MELT_EVENTS,
  MOCK_MELT_LOGS,
  MOCK_MELT_TRACES,
  MOCK_KPI_METRICS,
  MOCK_KPI_TRENDS,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_INCIDENTS,
  MOCK_PIPELINE_RUNS,
  MOCK_COMPLIANCE_ARTIFACTS,
  MOCK_APPLICATIONS,
  MOCK_DOMAINS,
} from '../constants/mockData.js';
import {
  KPI_METRICS,
  DORA_METRICS,
  DORA_METRIC_LIST,
  SEVERITY_LEVELS,
  ENVIRONMENTS,
  CRITICALITY_TIERS,
  DOMAINS,
  COMPLIANCE_STATUSES,
  PIPELINE_STATUSES,
} from '../constants/constants.js';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = Object.freeze({
  MELT_METRICS: 'melt_metrics',
  MELT_EVENTS: 'melt_events',
  MELT_LOGS: 'melt_logs',
  MELT_TRACES: 'melt_traces',
  KPI_METRICS: 'kpi_metrics',
  KPI_TRENDS: 'kpi_trends',
  DASHBOARD_SUMMARY: 'dashboard_summary',
  INCIDENTS: 'incidents',
  PIPELINE_RUNS: 'pipeline_runs',
  COMPLIANCE_ARTIFACTS: 'compliance_artifacts',
  APPLICATIONS: 'applications',
  DOMAINS: 'domains',
  DASHBOARD_CONFIG: 'dashboard_config',
  DASHBOARD_CACHE: 'dashboard_cache',
});

// ---------------------------------------------------------------------------
// Dashboard Data Schema Version
// ---------------------------------------------------------------------------

const DASHBOARD_SCHEMA_VERSION = 1;

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
 * Load a dataset from localStorage with fallback to provided default.
 * @param {string} key - Storage key.
 * @param {*} fallback - Default data if key is missing.
 * @returns {*}
 */
const loadData = (key, fallback) => {
  ensureInitialized();
  const data = getStorageItem(key, null);
  if (data !== null) {
    return data;
  }
  setStorageItem(key, fallback);
  return Array.isArray(fallback) ? [...fallback] : { ...fallback };
};

/**
 * Persist a dataset to localStorage.
 * @param {string} key - Storage key.
 * @param {*} data - Data to persist.
 * @returns {boolean}
 */
const saveData = (key, data) => {
  return setStorageItem(key, data);
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
 * Filter an array by domain name.
 * @param {Array<Object>} items
 * @param {string} domainName
 * @returns {Array<Object>}
 */
const filterByDomain = (items, domainName) => {
  if (!domainName || typeof domainName !== 'string' || domainName.trim().length === 0) {
    return items;
  }
  const apps = loadData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
  const domainApps = apps.filter((a) => matchesSearch(a.domainName, domainName.trim()));
  const appIds = new Set(domainApps.map((a) => a.id));
  const appNames = new Set(domainApps.map((a) => a.name));
  return items.filter((item) => {
    if (item.applicationId && appIds.has(item.applicationId)) {
      return true;
    }
    if (item.applicationName && appNames.has(item.applicationName)) {
      return true;
    }
    return false;
  });
};

/**
 * Filter an array by application name or ID.
 * @param {Array<Object>} items
 * @param {string} application - Application name or ID.
 * @returns {Array<Object>}
 */
const filterByApplication = (items, application) => {
  if (!application || typeof application !== 'string' || application.trim().length === 0) {
    return items;
  }
  const trimmed = application.trim();
  return items.filter((item) => {
    if (item.applicationId && item.applicationId === trimmed) {
      return true;
    }
    if (item.applicationName && matchesSearch(item.applicationName, trimmed)) {
      return true;
    }
    return false;
  });
};

/**
 * Filter an array by environment.
 * @param {Array<Object>} items
 * @param {string} environment
 * @returns {Array<Object>}
 */
const filterByEnvironment = (items, environment) => {
  if (!environment || typeof environment !== 'string' || environment.trim().length === 0) {
    return items;
  }
  const trimmed = environment.trim();
  return items.filter((item) => {
    if (item.environment && item.environment === trimmed) {
      return true;
    }
    return false;
  });
};

/**
 * Apply common filters to a dataset.
 * @param {Array<Object>} items
 * @param {Object} filters
 * @param {string} [filters.domain]
 * @param {string} [filters.application]
 * @param {string} [filters.environment]
 * @returns {Array<Object>}
 */
const applyFilters = (items, filters = {}) => {
  let result = [...items];
  if (filters.domain) {
    result = filterByDomain(result, filters.domain);
  }
  if (filters.application) {
    result = filterByApplication(result, filters.application);
  }
  if (filters.environment) {
    result = filterByEnvironment(result, filters.environment);
  }
  return result;
};

/**
 * Calculate an average from an array of numbers.
 * @param {number[]} values
 * @returns {number}
 */
const calculateAverage = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const validValues = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (validValues.length === 0) {
    return 0;
  }
  return parseFloat((validValues.reduce((sum, v) => sum + v, 0) / validValues.length).toFixed(2));
};

/**
 * Calculate a sum from an array of numbers.
 * @param {number[]} values
 * @returns {number}
 */
const calculateSum = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.filter((v) => typeof v === 'number' && !Number.isNaN(v)).reduce((sum, v) => sum + v, 0);
};

// ---------------------------------------------------------------------------
// Public API — MELT Data
// ---------------------------------------------------------------------------

/**
 * Get MELT (Metrics, Events, Logs, Traces) data aggregated from
 * Dynatrace, Splunk, and Elastic sources. Supports filtering by
 * domain, application, and environment.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @param {string} [filters.environment] - Filter by environment.
 * @param {string} [filters.source] - Filter by data source (e.g. 'Dynatrace', 'Splunk', 'Elastic').
 * @param {string} [filters.severity] - Filter events/logs by severity.
 * @param {string} [filters.level] - Filter logs by level.
 * @param {string|Date} [filters.startDate] - Include data on or after this date.
 * @param {string|Date} [filters.endDate] - Include data on or before this date.
 * @returns {{
 *   metrics: Array<Object>,
 *   events: Array<Object>,
 *   logs: Array<Object>,
 *   traces: Array<Object>,
 *   summary: Object,
 *   sources: Array<string>,
 *   lastUpdated: string,
 * }}
 */
export const getMELTData = (filters = {}) => {
  try {
    const { source, severity, level, startDate, endDate } = filters;

    let metrics = loadData(STORAGE_KEYS.MELT_METRICS, MOCK_MELT_METRICS);
    let events = loadData(STORAGE_KEYS.MELT_EVENTS, MOCK_MELT_EVENTS);
    let logs = loadData(STORAGE_KEYS.MELT_LOGS, MOCK_MELT_LOGS);
    let traces = loadData(STORAGE_KEYS.MELT_TRACES, MOCK_MELT_TRACES);

    // Apply common filters
    metrics = applyFilters(metrics, filters);
    events = applyFilters(events, filters);
    logs = applyFilters(logs, filters);
    traces = applyFilters(traces, filters);

    // Filter events by source
    if (source && typeof source === 'string' && source.trim().length > 0) {
      const src = source.trim();
      events = events.filter((e) => matchesSearch(e.source, src));
      logs = logs.filter((l) => matchesSearch(l.source, src));
    }

    // Filter events by severity
    if (severity && typeof severity === 'string' && severity.trim().length > 0) {
      const sev = severity.trim();
      events = events.filter((e) => e.severity === sev);
    }

    // Filter logs by level
    if (level && typeof level === 'string' && level.trim().length > 0) {
      const lvl = level.trim().toUpperCase();
      logs = logs.filter((l) => l.level === lvl);
    }

    // Filter by date range
    if (startDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        events = events.filter((e) => new Date(e.timestamp) >= start);
        logs = logs.filter((l) => new Date(l.timestamp) >= start);
        traces = traces.filter((t) => new Date(t.startTime) >= start);
      }
    }

    if (endDate) {
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        events = events.filter((e) => new Date(e.timestamp) <= endOfDay);
        logs = logs.filter((l) => new Date(l.timestamp) <= endOfDay);
        traces = traces.filter((t) => new Date(t.startTime) <= endOfDay);
      }
    }

    // Build summary
    const avgCpu = calculateAverage(metrics.map((m) => m.metrics?.cpuUtilization).filter(Boolean));
    const avgMemory = calculateAverage(metrics.map((m) => m.metrics?.memoryUtilization).filter(Boolean));
    const avgResponseTime = calculateAverage(metrics.map((m) => m.metrics?.responseTimeP95Ms).filter(Boolean));
    const avgErrorRate = calculateAverage(metrics.map((m) => m.metrics?.errorRate).filter(Boolean));
    const avgAvailability = calculateAverage(metrics.map((m) => m.metrics?.availability).filter(Boolean));
    const totalRequests = calculateSum(metrics.map((m) => m.metrics?.requestsPerSecond).filter(Boolean));

    const criticalEvents = events.filter((e) => e.severity === SEVERITY_LEVELS.CRITICAL).length;
    const highEvents = events.filter((e) => e.severity === SEVERITY_LEVELS.HIGH).length;
    const errorLogs = logs.filter((l) => l.level === 'ERROR').length;
    const warnLogs = logs.filter((l) => l.level === 'WARN').length;
    const errorTraces = traces.filter((t) => t.status === 'error').length;

    // Collect unique sources
    const sourceSet = new Set();
    events.forEach((e) => { if (e.source) { sourceSet.add(e.source); } });
    logs.forEach((l) => { if (l.source) { sourceSet.add(l.source); } });
    const sources = [...sourceSet].sort();

    const summary = {
      metricsCount: metrics.length,
      eventsCount: events.length,
      logsCount: logs.length,
      tracesCount: traces.length,
      avgCpuUtilization: avgCpu,
      avgMemoryUtilization: avgMemory,
      avgResponseTimeP95Ms: avgResponseTime,
      avgErrorRate: avgErrorRate,
      avgAvailability: avgAvailability,
      totalRequestsPerSecond: totalRequests,
      criticalEvents,
      highEvents,
      errorLogs,
      warnLogs,
      errorTraces,
    };

    return {
      metrics,
      events,
      logs,
      traces,
      summary,
      sources,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get MELT data:', _err);
    return {
      metrics: [],
      events: [],
      logs: [],
      traces: [],
      summary: {},
      sources: [],
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — KPI Data
// ---------------------------------------------------------------------------

/**
 * Get KPI data for dashboards. Supports filtering by domain and application.
 * Returns current metrics and historical trends.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @param {string} [filters.period] - Filter by period (e.g. '2024-11').
 * @param {string} [filters.metricName] - Filter trends by specific metric name.
 * @returns {{
 *   metrics: Array<Object>,
 *   trends: Array<Object>,
 *   summary: Object,
 *   lastUpdated: string,
 * }}
 */
export const getKPIData = (filters = {}) => {
  try {
    const { period, metricName } = filters;

    let metrics = loadData(STORAGE_KEYS.KPI_METRICS, MOCK_KPI_METRICS);
    let trends = loadData(STORAGE_KEYS.KPI_TRENDS, MOCK_KPI_TRENDS);

    // Apply common filters
    metrics = applyFilters(metrics, filters);
    trends = applyFilters(trends, filters);

    // Filter by period
    if (period && typeof period === 'string' && period.trim().length > 0) {
      const p = period.trim();
      metrics = metrics.filter((m) => m.period === p);
    }

    // Filter trends by metric name
    if (metricName && typeof metricName === 'string' && metricName.trim().length > 0) {
      const mn = metricName.trim();
      trends = trends.filter((t) => t.metric === mn);
    }

    // Build summary across all metrics
    const allMetricValues = metrics.map((m) => m.metrics).filter(Boolean);

    const summary = {
      applicationCount: metrics.length,
      avgDeploymentFrequency: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.DEPLOYMENT_FREQUENCY]),
      ),
      avgLeadTime: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.LEAD_TIME_FOR_CHANGES]),
      ),
      avgChangeFailureRate: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.CHANGE_FAILURE_RATE]),
      ),
      avgMTTR: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.MEAN_TIME_TO_RECOVERY]),
      ),
      avgPipelineSuccessRate: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.PIPELINE_SUCCESS_RATE]),
      ),
      avgCodeCoverage: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.CODE_COVERAGE]),
      ),
      totalVulnerabilities: calculateSum(
        allMetricValues.map((m) => m[KPI_METRICS.VULNERABILITY_COUNT]),
      ),
      totalCriticalVulnerabilities: calculateSum(
        allMetricValues.map((m) => m[KPI_METRICS.CRITICAL_VULNERABILITY_COUNT]),
      ),
      avgAvailability: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.AVAILABILITY]),
      ),
      avgComplianceScore: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.COMPLIANCE_SCORE]),
      ),
      avgSecurityScanPassRate: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.SECURITY_SCAN_PASS_RATE]),
      ),
      avgResponseTimeP95: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.RESPONSE_TIME_P95]),
      ),
      totalOpenIncidents: calculateSum(
        allMetricValues.map((m) => m[KPI_METRICS.OPEN_INCIDENTS]),
      ),
      avgTechnicalDebtHours: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.TECHNICAL_DEBT_HOURS]),
      ),
      avgToilReduction: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.TOIL_REDUCTION]),
      ),
      avgOnboardingTime: calculateAverage(
        allMetricValues.map((m) => m[KPI_METRICS.ONBOARDING_TIME]),
      ),
    };

    return {
      metrics,
      trends,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get KPI data:', _err);
    return {
      metrics: [],
      trends: [],
      summary: {},
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — DORA Metrics
// ---------------------------------------------------------------------------

/**
 * Get DORA (DevOps Research and Assessment) metrics.
 * Returns deployment frequency, lead time for changes, change failure rate,
 * and mean time to recovery aggregated across applications.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @param {string} [filters.period] - Filter by period.
 * @returns {{
 *   metrics: Array<Object>,
 *   trends: Array<Object>,
 *   summary: Object,
 *   classifications: Object,
 *   lastUpdated: string,
 * }}
 */
export const getDORAMetrics = (filters = {}) => {
  try {
    const kpiData = getKPIData(filters);
    const allMetricValues = kpiData.metrics.map((m) => m.metrics).filter(Boolean);

    // Extract DORA-specific metrics per application
    const doraMetrics = kpiData.metrics.map((m) => ({
      applicationId: m.applicationId,
      applicationName: m.applicationName,
      period: m.period,
      deploymentFrequency: m.metrics ? m.metrics[DORA_METRICS.DEPLOYMENT_FREQUENCY] : null,
      leadTimeForChanges: m.metrics ? m.metrics[DORA_METRICS.LEAD_TIME_FOR_CHANGES] : null,
      changeFailureRate: m.metrics ? m.metrics[DORA_METRICS.CHANGE_FAILURE_RATE] : null,
      meanTimeToRecovery: m.metrics ? m.metrics[DORA_METRICS.MEAN_TIME_TO_RECOVERY] : null,
    }));

    // Filter trends to DORA metrics only
    const doraTrends = kpiData.trends.filter((t) => DORA_METRIC_LIST.includes(t.metric));

    // Aggregate summary
    const avgDeployFreq = calculateAverage(
      allMetricValues.map((m) => m[DORA_METRICS.DEPLOYMENT_FREQUENCY]),
    );
    const avgLeadTime = calculateAverage(
      allMetricValues.map((m) => m[DORA_METRICS.LEAD_TIME_FOR_CHANGES]),
    );
    const avgCFR = calculateAverage(
      allMetricValues.map((m) => m[DORA_METRICS.CHANGE_FAILURE_RATE]),
    );
    const avgMTTR = calculateAverage(
      allMetricValues.map((m) => m[DORA_METRICS.MEAN_TIME_TO_RECOVERY]),
    );

    // Classify DORA performance level
    const classifyDeployFreq = (val) => {
      if (val >= 30) return 'Elite';
      if (val >= 7) return 'High';
      if (val >= 1) return 'Medium';
      return 'Low';
    };

    const classifyLeadTime = (val) => {
      if (val <= 1) return 'Elite';
      if (val <= 7) return 'High';
      if (val <= 30) return 'Medium';
      return 'Low';
    };

    const classifyCFR = (val) => {
      if (val <= 5) return 'Elite';
      if (val <= 10) return 'High';
      if (val <= 15) return 'Medium';
      return 'Low';
    };

    const classifyMTTR = (val) => {
      if (val <= 1) return 'Elite';
      if (val <= 24) return 'High';
      if (val <= 168) return 'Medium';
      return 'Low';
    };

    const classifications = {
      deploymentFrequency: classifyDeployFreq(avgDeployFreq),
      leadTimeForChanges: classifyLeadTime(avgLeadTime),
      changeFailureRate: classifyCFR(avgCFR),
      meanTimeToRecovery: classifyMTTR(avgMTTR),
    };

    // Determine overall DORA level
    const levels = Object.values(classifications);
    const levelOrder = ['Elite', 'High', 'Medium', 'Low'];
    const worstLevel = levels.reduce((worst, current) => {
      return levelOrder.indexOf(current) > levelOrder.indexOf(worst) ? current : worst;
    }, 'Elite');

    const summary = {
      avgDeploymentFrequency: avgDeployFreq,
      avgLeadTimeForChanges: avgLeadTime,
      avgChangeFailureRate: avgCFR,
      avgMeanTimeToRecovery: avgMTTR,
      overallLevel: worstLevel,
      applicationCount: doraMetrics.length,
    };

    return {
      metrics: doraMetrics,
      trends: doraTrends,
      summary,
      classifications,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get DORA metrics:', _err);
    return {
      metrics: [],
      trends: [],
      summary: {},
      classifications: {},
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — MTTR Metrics
// ---------------------------------------------------------------------------

/**
 * Get Mean Time To Recovery (MTTR) metrics aggregated from incidents
 * and KPI data.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @param {string} [filters.severity] - Filter incidents by severity.
 * @returns {{
 *   incidents: Array<Object>,
 *   mttrByApplication: Array<Object>,
 *   mttrBySeverity: Array<Object>,
 *   summary: Object,
 *   lastUpdated: string,
 * }}
 */
export const getMTTRMetrics = (filters = {}) => {
  try {
    const { severity } = filters;

    let incidents = loadData(STORAGE_KEYS.INCIDENTS, MOCK_INCIDENTS);

    // Apply common filters
    incidents = applyFilters(incidents, filters);

    // Filter by severity
    if (severity && typeof severity === 'string' && severity.trim().length > 0) {
      incidents = incidents.filter((i) => i.severity === severity.trim());
    }

    // Calculate MTTR for resolved incidents
    const resolvedIncidents = incidents.filter((i) => i.status === 'Resolved' && i.resolvedAt && i.createdAt);
    const mttrValues = resolvedIncidents.map((i) => {
      const created = new Date(i.createdAt).getTime();
      const resolved = new Date(i.resolvedAt).getTime();
      if (Number.isNaN(created) || Number.isNaN(resolved)) {
        return null;
      }
      return (resolved - created) / (1000 * 60 * 60); // hours
    }).filter((v) => v !== null);

    // MTTR by application
    const appMttrMap = {};
    resolvedIncidents.forEach((i) => {
      const key = i.applicationName || 'Unknown';
      if (!appMttrMap[key]) {
        appMttrMap[key] = { applicationName: key, applicationId: i.applicationId, values: [], incidentCount: 0 };
      }
      const created = new Date(i.createdAt).getTime();
      const resolved = new Date(i.resolvedAt).getTime();
      if (!Number.isNaN(created) && !Number.isNaN(resolved)) {
        appMttrMap[key].values.push((resolved - created) / (1000 * 60 * 60));
        appMttrMap[key].incidentCount++;
      }
    });

    const mttrByApplication = Object.values(appMttrMap).map((entry) => ({
      applicationName: entry.applicationName,
      applicationId: entry.applicationId,
      avgMttrHours: calculateAverage(entry.values),
      minMttrHours: entry.values.length > 0 ? parseFloat(Math.min(...entry.values).toFixed(2)) : 0,
      maxMttrHours: entry.values.length > 0 ? parseFloat(Math.max(...entry.values).toFixed(2)) : 0,
      incidentCount: entry.incidentCount,
    }));

    // MTTR by severity
    const sevMttrMap = {};
    resolvedIncidents.forEach((i) => {
      const key = i.severity || 'Unknown';
      if (!sevMttrMap[key]) {
        sevMttrMap[key] = { severity: key, values: [], incidentCount: 0 };
      }
      const created = new Date(i.createdAt).getTime();
      const resolved = new Date(i.resolvedAt).getTime();
      if (!Number.isNaN(created) && !Number.isNaN(resolved)) {
        sevMttrMap[key].values.push((resolved - created) / (1000 * 60 * 60));
        sevMttrMap[key].incidentCount++;
      }
    });

    const mttrBySeverity = Object.values(sevMttrMap).map((entry) => ({
      severity: entry.severity,
      avgMttrHours: calculateAverage(entry.values),
      incidentCount: entry.incidentCount,
    }));

    const summary = {
      totalIncidents: incidents.length,
      resolvedIncidents: resolvedIncidents.length,
      openIncidents: incidents.filter((i) => i.status !== 'Resolved').length,
      criticalIncidents: incidents.filter((i) => i.severity === SEVERITY_LEVELS.CRITICAL).length,
      avgMttrHours: calculateAverage(mttrValues),
      minMttrHours: mttrValues.length > 0 ? parseFloat(Math.min(...mttrValues).toFixed(2)) : 0,
      maxMttrHours: mttrValues.length > 0 ? parseFloat(Math.max(...mttrValues).toFixed(2)) : 0,
    };

    return {
      incidents,
      mttrByApplication,
      mttrBySeverity,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get MTTR metrics:', _err);
    return {
      incidents: [],
      mttrByApplication: [],
      mttrBySeverity: [],
      summary: {},
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — QE Metrics
// ---------------------------------------------------------------------------

/**
 * Get Quality Engineering (QE) metrics including code coverage,
 * test pass rates, pipeline success rates, and security scan results.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @returns {{
 *   metrics: Array<Object>,
 *   pipelineRuns: Array<Object>,
 *   summary: Object,
 *   lastUpdated: string,
 * }}
 */
export const getQEMetrics = (filters = {}) => {
  try {
    let kpiMetrics = loadData(STORAGE_KEYS.KPI_METRICS, MOCK_KPI_METRICS);
    let pipelineRuns = loadData(STORAGE_KEYS.PIPELINE_RUNS, MOCK_PIPELINE_RUNS);

    kpiMetrics = applyFilters(kpiMetrics, filters);
    pipelineRuns = applyFilters(pipelineRuns, filters);

    const allMetricValues = kpiMetrics.map((m) => m.metrics).filter(Boolean);

    // Build per-application QE metrics
    const qeMetrics = kpiMetrics.map((m) => ({
      applicationId: m.applicationId,
      applicationName: m.applicationName,
      period: m.period,
      codeCoverage: m.metrics ? m.metrics[KPI_METRICS.CODE_COVERAGE] : null,
      pipelineSuccessRate: m.metrics ? m.metrics[KPI_METRICS.PIPELINE_SUCCESS_RATE] : null,
      pipelineDurationAvg: m.metrics ? m.metrics[KPI_METRICS.PIPELINE_DURATION_AVG] : null,
      securityScanPassRate: m.metrics ? m.metrics[KPI_METRICS.SECURITY_SCAN_PASS_RATE] : null,
      vulnerabilityCount: m.metrics ? m.metrics[KPI_METRICS.VULNERABILITY_COUNT] : null,
      criticalVulnerabilityCount: m.metrics ? m.metrics[KPI_METRICS.CRITICAL_VULNERABILITY_COUNT] : null,
      technicalDebtHours: m.metrics ? m.metrics[KPI_METRICS.TECHNICAL_DEBT_HOURS] : null,
    }));

    // Pipeline run statistics
    const totalRuns = pipelineRuns.length;
    const successRuns = pipelineRuns.filter((r) => r.status === PIPELINE_STATUSES.SUCCESS).length;
    const failedRuns = pipelineRuns.filter((r) => r.status === PIPELINE_STATUSES.FAILED).length;
    const runningRuns = pipelineRuns.filter((r) => r.status === PIPELINE_STATUSES.RUNNING).length;

    const durations = pipelineRuns
      .filter((r) => typeof r.durationSeconds === 'number' && r.durationSeconds > 0)
      .map((r) => r.durationSeconds);

    const summary = {
      applicationCount: qeMetrics.length,
      avgCodeCoverage: calculateAverage(allMetricValues.map((m) => m[KPI_METRICS.CODE_COVERAGE])),
      avgPipelineSuccessRate: calculateAverage(allMetricValues.map((m) => m[KPI_METRICS.PIPELINE_SUCCESS_RATE])),
      avgPipelineDurationMinutes: calculateAverage(allMetricValues.map((m) => m[KPI_METRICS.PIPELINE_DURATION_AVG])),
      avgSecurityScanPassRate: calculateAverage(allMetricValues.map((m) => m[KPI_METRICS.SECURITY_SCAN_PASS_RATE])),
      totalVulnerabilities: calculateSum(allMetricValues.map((m) => m[KPI_METRICS.VULNERABILITY_COUNT])),
      totalCriticalVulnerabilities: calculateSum(allMetricValues.map((m) => m[KPI_METRICS.CRITICAL_VULNERABILITY_COUNT])),
      avgTechnicalDebtHours: calculateAverage(allMetricValues.map((m) => m[KPI_METRICS.TECHNICAL_DEBT_HOURS])),
      totalPipelineRuns: totalRuns,
      successfulRuns: successRuns,
      failedRuns,
      runningRuns,
      pipelineSuccessRate: totalRuns > 0 ? parseFloat(((successRuns / (successRuns + failedRuns || 1)) * 100).toFixed(2)) : 0,
      avgPipelineDurationSeconds: calculateAverage(durations),
    };

    return {
      metrics: qeMetrics,
      pipelineRuns,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get QE metrics:', _err);
    return {
      metrics: [],
      pipelineRuns: [],
      summary: {},
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — AI Adoption Metrics
// ---------------------------------------------------------------------------

/**
 * Get AI adoption metrics for the platform. In the prototype phase,
 * these are simulated metrics representing AI/ML tool adoption,
 * automation rates, and toil reduction.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @returns {{
 *   metrics: Array<Object>,
 *   summary: Object,
 *   lastUpdated: string,
 * }}
 */
export const getAIAdoptionMetrics = (filters = {}) => {
  try {
    let kpiMetrics = loadData(STORAGE_KEYS.KPI_METRICS, MOCK_KPI_METRICS);
    kpiMetrics = applyFilters(kpiMetrics, filters);

    const allMetricValues = kpiMetrics.map((m) => m.metrics).filter(Boolean);

    const aiMetrics = kpiMetrics.map((m) => ({
      applicationId: m.applicationId,
      applicationName: m.applicationName,
      period: m.period,
      toilReduction: m.metrics ? m.metrics[KPI_METRICS.TOIL_REDUCTION] : null,
      onboardingTime: m.metrics ? m.metrics[KPI_METRICS.ONBOARDING_TIME] : null,
      pipelineSuccessRate: m.metrics ? m.metrics[KPI_METRICS.PIPELINE_SUCCESS_RATE] : null,
      automationScore: m.metrics
        ? parseFloat(((m.metrics[KPI_METRICS.TOIL_REDUCTION] || 0) * 0.6 + (m.metrics[KPI_METRICS.PIPELINE_SUCCESS_RATE] || 0) * 0.4).toFixed(2))
        : null,
    }));

    const summary = {
      applicationCount: aiMetrics.length,
      avgToilReduction: calculateAverage(allMetricValues.map((m) => m[KPI_METRICS.TOIL_REDUCTION])),
      avgOnboardingTimeDays: calculateAverage(allMetricValues.map((m) => m[KPI_METRICS.ONBOARDING_TIME])),
      avgAutomationScore: calculateAverage(aiMetrics.map((m) => m.automationScore).filter(Boolean)),
      pipelineAutoGenerationRate: 85.0, // simulated
      aiAssistedRemediationRate: 42.0, // simulated
      predictiveAlertAccuracy: 78.5, // simulated
      chatOpsAdoptionRate: 65.0, // simulated
    };

    return {
      metrics: aiMetrics,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get AI adoption metrics:', _err);
    return {
      metrics: [],
      summary: {},
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Cost & FinOps Metrics
// ---------------------------------------------------------------------------

/**
 * Get Cost and FinOps metrics. In the prototype phase, these are
 * simulated metrics representing infrastructure costs, optimization
 * opportunities, and cost allocation by domain/application.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @returns {{
 *   costByDomain: Array<Object>,
 *   costByApplication: Array<Object>,
 *   costTrends: Array<Object>,
 *   summary: Object,
 *   lastUpdated: string,
 * }}
 */
export const getCostFinOpsMetrics = (filters = {}) => {
  try {
    const apps = loadData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
    const domains = loadData(STORAGE_KEYS.DOMAINS, MOCK_DOMAINS);

    let filteredApps = [...apps];
    if (filters.domain) {
      filteredApps = filteredApps.filter((a) => matchesSearch(a.domainName, filters.domain));
    }
    if (filters.application) {
      filteredApps = filteredApps.filter((a) =>
        a.id === filters.application || matchesSearch(a.name, filters.application),
      );
    }

    // Simulated cost data per application
    const costSeed = {
      [CRITICALITY_TIERS.BUSINESS_CRITICAL]: { base: 12000, variance: 3000 },
      [CRITICALITY_TIERS.MISSION_CRITICAL]: { base: 9500, variance: 2500 },
      [CRITICALITY_TIERS.BUSINESS_OPERATIONAL]: { base: 5000, variance: 1500 },
      [CRITICALITY_TIERS.ADMIN_SERVICES]: { base: 2000, variance: 800 },
    };

    const costByApplication = filteredApps.map((app, index) => {
      const seed = costSeed[app.criticalityTier] || costSeed[CRITICALITY_TIERS.BUSINESS_OPERATIONAL];
      // Deterministic pseudo-random based on index
      const factor = ((index * 7 + 3) % 10) / 10;
      const monthlyCost = seed.base + Math.round(seed.variance * factor);
      const optimizationPotential = Math.round(monthlyCost * (0.05 + factor * 0.1));

      return {
        applicationId: app.id,
        applicationName: app.name,
        domainName: app.domainName,
        criticalityTier: app.criticalityTier,
        monthlyCost,
        computeCost: Math.round(monthlyCost * 0.45),
        storageCost: Math.round(monthlyCost * 0.25),
        networkCost: Math.round(monthlyCost * 0.15),
        licensingCost: Math.round(monthlyCost * 0.15),
        optimizationPotential,
        costPerTransaction: parseFloat((monthlyCost / (1000 + index * 500)).toFixed(4)),
      };
    });

    // Aggregate by domain
    const domainCostMap = {};
    costByApplication.forEach((entry) => {
      const key = entry.domainName || 'Unknown';
      if (!domainCostMap[key]) {
        domainCostMap[key] = { domainName: key, totalCost: 0, applicationCount: 0, optimizationPotential: 0 };
      }
      domainCostMap[key].totalCost += entry.monthlyCost;
      domainCostMap[key].applicationCount++;
      domainCostMap[key].optimizationPotential += entry.optimizationPotential;
    });

    const costByDomain = Object.values(domainCostMap).sort((a, b) => b.totalCost - a.totalCost);

    // Simulated cost trends (last 6 months)
    const months = ['2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11'];
    const totalMonthlyCost = calculateSum(costByApplication.map((c) => c.monthlyCost));
    const costTrends = months.map((month, idx) => {
      const trendFactor = 1 - (5 - idx) * 0.03; // slight upward trend
      return {
        period: month,
        totalCost: Math.round(totalMonthlyCost * trendFactor),
        computeCost: Math.round(totalMonthlyCost * trendFactor * 0.45),
        storageCost: Math.round(totalMonthlyCost * trendFactor * 0.25),
        networkCost: Math.round(totalMonthlyCost * trendFactor * 0.15),
        licensingCost: Math.round(totalMonthlyCost * trendFactor * 0.15),
      };
    });

    const totalOptimization = calculateSum(costByApplication.map((c) => c.optimizationPotential));

    const summary = {
      totalMonthlyCost,
      totalAnnualCost: totalMonthlyCost * 12,
      totalOptimizationPotential: totalOptimization,
      avgCostPerApplication: costByApplication.length > 0
        ? Math.round(totalMonthlyCost / costByApplication.length)
        : 0,
      applicationCount: costByApplication.length,
      domainCount: costByDomain.length,
      costEfficiencyScore: totalMonthlyCost > 0
        ? parseFloat(((1 - totalOptimization / totalMonthlyCost) * 100).toFixed(1))
        : 100,
    };

    return {
      costByDomain,
      costByApplication,
      costTrends,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get Cost/FinOps metrics:', _err);
    return {
      costByDomain: [],
      costByApplication: [],
      costTrends: [],
      summary: {},
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Governance Data
// ---------------------------------------------------------------------------

/**
 * Get governance and compliance data including compliance artifact status,
 * policy adherence, and audit readiness metrics.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @param {string} [filters.status] - Filter by compliance status.
 * @returns {{
 *   artifacts: Array<Object>,
 *   complianceByApplication: Array<Object>,
 *   complianceByStatus: Array<Object>,
 *   summary: Object,
 *   lastUpdated: string,
 * }}
 */
export const getGovernanceData = (filters = {}) => {
  try {
    const { status } = filters;

    let artifacts = loadData(STORAGE_KEYS.COMPLIANCE_ARTIFACTS, MOCK_COMPLIANCE_ARTIFACTS);
    artifacts = applyFilters(artifacts, filters);

    // Filter by compliance status
    if (status && typeof status === 'string' && status.trim().length > 0) {
      artifacts = artifacts.filter((a) => a.status === status.trim());
    }

    // Group by application
    const appComplianceMap = {};
    artifacts.forEach((artifact) => {
      const key = artifact.applicationName || 'Unknown';
      if (!appComplianceMap[key]) {
        appComplianceMap[key] = {
          applicationName: key,
          applicationId: artifact.applicationId,
          totalArtifacts: 0,
          compliant: 0,
          nonCompliant: 0,
          partial: 0,
          pendingReview: 0,
          notApplicable: 0,
          findings: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        };
      }
      const entry = appComplianceMap[key];
      entry.totalArtifacts++;

      switch (artifact.status) {
        case COMPLIANCE_STATUSES.COMPLIANT:
          entry.compliant++;
          break;
        case COMPLIANCE_STATUSES.NON_COMPLIANT:
          entry.nonCompliant++;
          break;
        case COMPLIANCE_STATUSES.PARTIAL:
          entry.partial++;
          break;
        case COMPLIANCE_STATUSES.PENDING_REVIEW:
          entry.pendingReview++;
          break;
        case COMPLIANCE_STATUSES.NOT_APPLICABLE:
          entry.notApplicable++;
          break;
        default:
          break;
      }

      if (artifact.findings && typeof artifact.findings === 'object') {
        entry.findings.critical += artifact.findings.critical || 0;
        entry.findings.high += artifact.findings.high || 0;
        entry.findings.medium += artifact.findings.medium || 0;
        entry.findings.low += artifact.findings.low || 0;
        entry.findings.info += artifact.findings.info || 0;
      }
    });

    const complianceByApplication = Object.values(appComplianceMap).map((entry) => ({
      ...entry,
      complianceRate: entry.totalArtifacts > 0
        ? parseFloat(((entry.compliant / entry.totalArtifacts) * 100).toFixed(1))
        : 0,
    }));

    // Group by status
    const statusCounts = {};
    artifacts.forEach((a) => {
      const key = a.status || 'Unknown';
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
    const complianceByStatus = Object.entries(statusCounts).map(([s, count]) => ({
      status: s,
      count,
      percentage: artifacts.length > 0 ? parseFloat(((count / artifacts.length) * 100).toFixed(1)) : 0,
    }));

    // Summary
    const totalArtifacts = artifacts.length;
    const compliantCount = artifacts.filter((a) => a.status === COMPLIANCE_STATUSES.COMPLIANT).length;
    const nonCompliantCount = artifacts.filter((a) => a.status === COMPLIANCE_STATUSES.NON_COMPLIANT).length;
    const pendingCount = artifacts.filter((a) => a.status === COMPLIANCE_STATUSES.PENDING_REVIEW).length;

    const totalFindings = artifacts.reduce((sum, a) => {
      if (a.findings && typeof a.findings === 'object') {
        return sum + (a.findings.critical || 0) + (a.findings.high || 0) + (a.findings.medium || 0) + (a.findings.low || 0);
      }
      return sum;
    }, 0);

    const criticalFindings = artifacts.reduce((sum, a) => {
      if (a.findings && typeof a.findings === 'object') {
        return sum + (a.findings.critical || 0);
      }
      return sum;
    }, 0);

    const summary = {
      totalArtifacts,
      compliantCount,
      nonCompliantCount,
      pendingReviewCount: pendingCount,
      partialCount: artifacts.filter((a) => a.status === COMPLIANCE_STATUSES.PARTIAL).length,
      overallComplianceRate: totalArtifacts > 0
        ? parseFloat(((compliantCount / totalArtifacts) * 100).toFixed(1))
        : 0,
      totalFindings,
      criticalFindings,
      highFindings: artifacts.reduce((sum, a) => sum + ((a.findings && a.findings.high) || 0), 0),
      applicationCount: complianceByApplication.length,
      auditReadinessScore: totalArtifacts > 0
        ? parseFloat((((compliantCount + artifacts.filter((a) => a.status === COMPLIANCE_STATUSES.NOT_APPLICABLE).length) / totalArtifacts) * 100).toFixed(1))
        : 0,
    };

    return {
      artifacts,
      complianceByApplication,
      complianceByStatus,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get governance data:', _err);
    return {
      artifacts: [],
      complianceByApplication: [],
      complianceByStatus: [],
      summary: {},
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Dashboard Summary
// ---------------------------------------------------------------------------

/**
 * Get the overall dashboard summary combining data from all sources.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @returns {{
 *   overview: Object,
 *   dora: Object,
 *   melt: Object,
 *   qe: Object,
 *   governance: Object,
 *   cost: Object,
 *   aiAdoption: Object,
 *   mttr: Object,
 *   lastUpdated: string,
 * }}
 */
export const getDashboardSummary = (filters = {}) => {
  try {
    const dashboardSummary = loadData(STORAGE_KEYS.DASHBOARD_SUMMARY, MOCK_DASHBOARD_SUMMARY);
    const doraData = getDORAMetrics(filters);
    const meltData = getMELTData(filters);
    const qeData = getQEMetrics(filters);
    const governanceData = getGovernanceData(filters);
    const costData = getCostFinOpsMetrics(filters);
    const aiData = getAIAdoptionMetrics(filters);
    const mttrData = getMTTRMetrics(filters);

    const apps = loadData(STORAGE_KEYS.APPLICATIONS, MOCK_APPLICATIONS);
    let filteredApps = [...apps];
    if (filters.domain) {
      filteredApps = filteredApps.filter((a) => matchesSearch(a.domainName, filters.domain));
    }
    if (filters.application) {
      filteredApps = filteredApps.filter((a) =>
        a.id === filters.application || matchesSearch(a.name, filters.application),
      );
    }

    const overview = {
      totalApplications: filteredApps.length,
      totalDomains: new Set(filteredApps.map((a) => a.domainName)).size,
      activeIncidents: mttrData.summary.openIncidents || 0,
      criticalIncidents: mttrData.summary.criticalIncidents || 0,
      overallAvailability: meltData.summary.avgAvailability || dashboardSummary.overallAvailability || 99.98,
      overallComplianceScore: governanceData.summary.overallComplianceRate || dashboardSummary.complianceScore || 91.2,
      pipelineSuccessRate: qeData.summary.avgPipelineSuccessRate || dashboardSummary.pipelineSuccessRate || 92.4,
      securityScanPassRate: qeData.summary.avgSecurityScanPassRate || dashboardSummary.securityScanPassRate || 95.8,
      applicationsByDomain: dashboardSummary.applicationsByDomain || [],
      applicationsByCriticality: dashboardSummary.applicationsByCriticality || [],
      recentDeployments: dashboardSummary.recentDeployments || [],
    };

    return {
      overview,
      dora: doraData.summary,
      melt: meltData.summary,
      qe: qeData.summary,
      governance: governanceData.summary,
      cost: costData.summary,
      aiAdoption: aiData.summary,
      mttr: mttrData.summary,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get dashboard summary:', _err);
    return {
      overview: {},
      dora: {},
      melt: {},
      qe: {},
      governance: {},
      cost: {},
      aiAdoption: {},
      mttr: {},
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Refresh Dashboard Data
// ---------------------------------------------------------------------------

/**
 * Refresh all dashboard data by reloading from localStorage and
 * recalculating aggregations. Optionally accepts new data to merge.
 *
 * @param {Object} [options]
 * @param {Object} [options.newData] - New data to merge into existing datasets.
 * @param {Array<Object>} [options.newData.meltMetrics] - New MELT metrics to add.
 * @param {Array<Object>} [options.newData.meltEvents] - New MELT events to add.
 * @param {Array<Object>} [options.newData.meltLogs] - New MELT logs to add.
 * @param {Array<Object>} [options.newData.kpiMetrics] - New KPI metrics to add or replace.
 * @param {string} [options.userId] - ID of the user performing the refresh.
 * @returns {{ success: boolean, summary: Object, error: string|null }}
 */
export const refreshDashboardData = (options = {}) => {
  try {
    const { newData, userId } = options;

    if (newData && typeof newData === 'object') {
      // Merge new MELT metrics
      if (Array.isArray(newData.meltMetrics) && newData.meltMetrics.length > 0) {
        const existing = loadData(STORAGE_KEYS.MELT_METRICS, MOCK_MELT_METRICS);
        const merged = [...existing, ...newData.meltMetrics];
        saveData(STORAGE_KEYS.MELT_METRICS, merged);
      }

      // Merge new MELT events
      if (Array.isArray(newData.meltEvents) && newData.meltEvents.length > 0) {
        const existing = loadData(STORAGE_KEYS.MELT_EVENTS, MOCK_MELT_EVENTS);
        const merged = [...existing, ...newData.meltEvents];
        saveData(STORAGE_KEYS.MELT_EVENTS, merged);
      }

      // Merge new MELT logs
      if (Array.isArray(newData.meltLogs) && newData.meltLogs.length > 0) {
        const existing = loadData(STORAGE_KEYS.MELT_LOGS, MOCK_MELT_LOGS);
        const merged = [...existing, ...newData.meltLogs];
        saveData(STORAGE_KEYS.MELT_LOGS, merged);
      }

      // Merge or replace KPI metrics
      if (Array.isArray(newData.kpiMetrics) && newData.kpiMetrics.length > 0) {
        const existing = loadData(STORAGE_KEYS.KPI_METRICS, MOCK_KPI_METRICS);
        const existingMap = new Map(existing.map((m) => [m.applicationId, m]));

        newData.kpiMetrics.forEach((newMetric) => {
          if (newMetric.applicationId) {
            existingMap.set(newMetric.applicationId, newMetric);
          }
        });

        saveData(STORAGE_KEYS.KPI_METRICS, [...existingMap.values()]);
      }
    }

    // Recalculate dashboard summary
    const summary = getDashboardSummary();

    // Update cached dashboard summary
    saveData(STORAGE_KEYS.DASHBOARD_CACHE, {
      ...summary,
      _schemaVersion: DASHBOARD_SCHEMA_VERSION,
      _refreshedAt: new Date().toISOString(),
    });

    logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      action: 'dashboard_data_refresh',
      hasNewData: newData !== null && newData !== undefined,
      newDataKeys: newData ? Object.keys(newData).filter((k) => Array.isArray(newData[k]) && newData[k].length > 0) : [],
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      summary,
      error: null,
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to refresh dashboard data:', _err);
    return {
      success: false,
      summary: null,
      error: 'Failed to refresh dashboard data.',
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Dashboard Configuration
// ---------------------------------------------------------------------------

/**
 * Get the dashboard configuration for a specific domain and/or application.
 * Supports per-domain/app metric configuration.
 *
 * @param {Object} [options]
 * @param {string} [options.domain] - Domain name.
 * @param {string} [options.application] - Application name or ID.
 * @returns {Object} Dashboard configuration object.
 */
export const getDashboardConfig = (options = {}) => {
  try {
    const { domain, application } = options;

    const configs = loadData(STORAGE_KEYS.DASHBOARD_CONFIG, {});

    // Build config key
    let configKey = 'default';
    if (domain && typeof domain === 'string') {
      configKey = `domain:${domain.trim()}`;
    }
    if (application && typeof application === 'string') {
      configKey = `app:${application.trim()}`;
    }

    const specificConfig = configs[configKey] || null;
    const defaultConfig = configs['default'] || getDefaultDashboardConfig();

    if (specificConfig) {
      return { ...defaultConfig, ...specificConfig, _configKey: configKey };
    }

    return { ...defaultConfig, _configKey: configKey };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get dashboard config:', _err);
    return getDefaultDashboardConfig();
  }
};

/**
 * Save dashboard configuration for a specific domain and/or application.
 *
 * @param {Object} config - The configuration to save.
 * @param {Object} [options]
 * @param {string} [options.domain] - Domain name.
 * @param {string} [options.application] - Application name or ID.
 * @param {string} [options.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, error: string|null }}
 */
export const saveDashboardConfig = (config, options = {}) => {
  try {
    if (!config || typeof config !== 'object') {
      return { success: false, error: 'Configuration must be an object.' };
    }

    const { domain, application, userId } = options;

    const configs = loadData(STORAGE_KEYS.DASHBOARD_CONFIG, {});

    let configKey = 'default';
    if (domain && typeof domain === 'string') {
      configKey = `domain:${domain.trim()}`;
    }
    if (application && typeof application === 'string') {
      configKey = `app:${application.trim()}`;
    }

    configs[configKey] = {
      ...config,
      _updatedAt: new Date().toISOString(),
      _updatedBy: userId || null,
    };

    saveData(STORAGE_KEYS.DASHBOARD_CONFIG, configs);

    logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      action: 'dashboard_config_save',
      configKey,
      updatedFields: Object.keys(config),
    });

    return { success: true, error: null };
  } catch (_err) {
    console.error('DashboardDataService: Failed to save dashboard config:', _err);
    return { success: false, error: 'Failed to save dashboard configuration.' };
  }
};

/**
 * Get the default dashboard configuration.
 * @returns {Object}
 */
const getDefaultDashboardConfig = () => ({
  widgets: [
    { id: 'overview', type: 'summary', title: 'Overview', enabled: true, order: 1 },
    { id: 'dora', type: 'chart', title: 'DORA Metrics', enabled: true, order: 2 },
    { id: 'melt', type: 'chart', title: 'MELT Overview', enabled: true, order: 3 },
    { id: 'qe', type: 'chart', title: 'Quality Engineering', enabled: true, order: 4 },
    { id: 'compliance', type: 'chart', title: 'Compliance Status', enabled: true, order: 5 },
    { id: 'incidents', type: 'table', title: 'Active Incidents', enabled: true, order: 6 },
    { id: 'pipelines', type: 'table', title: 'Recent Pipeline Runs', enabled: true, order: 7 },
    { id: 'cost', type: 'chart', title: 'Cost & FinOps', enabled: true, order: 8 },
    { id: 'ai-adoption', type: 'stat', title: 'AI Adoption', enabled: true, order: 9 },
  ],
  refreshIntervalSeconds: 300,
  defaultEnvironment: ENVIRONMENTS.PROD,
  metricsToDisplay: [
    KPI_METRICS.DEPLOYMENT_FREQUENCY,
    KPI_METRICS.LEAD_TIME_FOR_CHANGES,
    KPI_METRICS.CHANGE_FAILURE_RATE,
    KPI_METRICS.MEAN_TIME_TO_RECOVERY,
    KPI_METRICS.PIPELINE_SUCCESS_RATE,
    KPI_METRICS.CODE_COVERAGE,
    KPI_METRICS.AVAILABILITY,
    KPI_METRICS.ERROR_RATE,
    KPI_METRICS.RESPONSE_TIME_P95,
    KPI_METRICS.COMPLIANCE_SCORE,
    KPI_METRICS.SECURITY_SCAN_PASS_RATE,
    KPI_METRICS.VULNERABILITY_COUNT,
  ],
  chartType: 'line',
  dateRange: 'last_6_months',
  _schemaVersion: DASHBOARD_SCHEMA_VERSION,
});

// ---------------------------------------------------------------------------
// Public API — Configurable Metrics
// ---------------------------------------------------------------------------

/**
 * Get the list of configurable metrics available for a domain or application.
 * Returns all KPI metric keys with their display names and current values.
 *
 * @param {Object} [filters]
 * @param {string} [filters.domain] - Filter by domain name.
 * @param {string} [filters.application] - Filter by application name or ID.
 * @returns {{
 *   availableMetrics: Array<Object>,
 *   configuredMetrics: Array<string>,
 *   lastUpdated: string,
 * }}
 */
export const getConfigurableMetrics = (filters = {}) => {
  try {
    const config = getDashboardConfig(filters);
    const kpiData = getKPIData(filters);

    const metricDisplayNames = {
      [KPI_METRICS.DEPLOYMENT_FREQUENCY]: 'Deployment Frequency',
      [KPI_METRICS.LEAD_TIME_FOR_CHANGES]: 'Lead Time for Changes',
      [KPI_METRICS.CHANGE_FAILURE_RATE]: 'Change Failure Rate',
      [KPI_METRICS.MEAN_TIME_TO_RECOVERY]: 'Mean Time to Recovery',
      [KPI_METRICS.PIPELINE_SUCCESS_RATE]: 'Pipeline Success Rate',
      [KPI_METRICS.PIPELINE_DURATION_AVG]: 'Avg Pipeline Duration',
      [KPI_METRICS.CODE_COVERAGE]: 'Code Coverage',
      [KPI_METRICS.VULNERABILITY_COUNT]: 'Vulnerability Count',
      [KPI_METRICS.CRITICAL_VULNERABILITY_COUNT]: 'Critical Vulnerabilities',
      [KPI_METRICS.OPEN_INCIDENTS]: 'Open Incidents',
      [KPI_METRICS.MTTR_INCIDENTS]: 'MTTR (Incidents)',
      [KPI_METRICS.SLA_COMPLIANCE]: 'SLA Compliance',
      [KPI_METRICS.AVAILABILITY]: 'Availability',
      [KPI_METRICS.ERROR_RATE]: 'Error Rate',
      [KPI_METRICS.RESPONSE_TIME_P95]: 'Response Time (P95)',
      [KPI_METRICS.SECURITY_SCAN_PASS_RATE]: 'Security Scan Pass Rate',
      [KPI_METRICS.COMPLIANCE_SCORE]: 'Compliance Score',
      [KPI_METRICS.TECHNICAL_DEBT_HOURS]: 'Technical Debt (Hours)',
      [KPI_METRICS.TOIL_REDUCTION]: 'Toil Reduction',
      [KPI_METRICS.ONBOARDING_TIME]: 'Onboarding Time (Days)',
    };

    const metricUnits = {
      [KPI_METRICS.DEPLOYMENT_FREQUENCY]: 'deployments/month',
      [KPI_METRICS.LEAD_TIME_FOR_CHANGES]: 'days',
      [KPI_METRICS.CHANGE_FAILURE_RATE]: '%',
      [KPI_METRICS.MEAN_TIME_TO_RECOVERY]: 'hours',
      [KPI_METRICS.PIPELINE_SUCCESS_RATE]: '%',
      [KPI_METRICS.PIPELINE_DURATION_AVG]: 'minutes',
      [KPI_METRICS.CODE_COVERAGE]: '%',
      [KPI_METRICS.VULNERABILITY_COUNT]: 'count',
      [KPI_METRICS.CRITICAL_VULNERABILITY_COUNT]: 'count',
      [KPI_METRICS.OPEN_INCIDENTS]: 'count',
      [KPI_METRICS.MTTR_INCIDENTS]: 'hours',
      [KPI_METRICS.SLA_COMPLIANCE]: '%',
      [KPI_METRICS.AVAILABILITY]: '%',
      [KPI_METRICS.ERROR_RATE]: '%',
      [KPI_METRICS.RESPONSE_TIME_P95]: 'ms',
      [KPI_METRICS.SECURITY_SCAN_PASS_RATE]: '%',
      [KPI_METRICS.COMPLIANCE_SCORE]: '%',
      [KPI_METRICS.TECHNICAL_DEBT_HOURS]: 'hours',
      [KPI_METRICS.TOIL_REDUCTION]: '%',
      [KPI_METRICS.ONBOARDING_TIME]: 'days',
    };

    const metricCategories = {
      [KPI_METRICS.DEPLOYMENT_FREQUENCY]: 'DORA',
      [KPI_METRICS.LEAD_TIME_FOR_CHANGES]: 'DORA',
      [KPI_METRICS.CHANGE_FAILURE_RATE]: 'DORA',
      [KPI_METRICS.MEAN_TIME_TO_RECOVERY]: 'DORA',
      [KPI_METRICS.PIPELINE_SUCCESS_RATE]: 'Quality',
      [KPI_METRICS.PIPELINE_DURATION_AVG]: 'Quality',
      [KPI_METRICS.CODE_COVERAGE]: 'Quality',
      [KPI_METRICS.VULNERABILITY_COUNT]: 'Security',
      [KPI_METRICS.CRITICAL_VULNERABILITY_COUNT]: 'Security',
      [KPI_METRICS.OPEN_INCIDENTS]: 'Operations',
      [KPI_METRICS.MTTR_INCIDENTS]: 'Operations',
      [KPI_METRICS.SLA_COMPLIANCE]: 'Operations',
      [KPI_METRICS.AVAILABILITY]: 'Operations',
      [KPI_METRICS.ERROR_RATE]: 'Operations',
      [KPI_METRICS.RESPONSE_TIME_P95]: 'Performance',
      [KPI_METRICS.SECURITY_SCAN_PASS_RATE]: 'Security',
      [KPI_METRICS.COMPLIANCE_SCORE]: 'Governance',
      [KPI_METRICS.TECHNICAL_DEBT_HOURS]: 'Quality',
      [KPI_METRICS.TOIL_REDUCTION]: 'Efficiency',
      [KPI_METRICS.ONBOARDING_TIME]: 'Efficiency',
    };

    const availableMetrics = Object.entries(metricDisplayNames).map(([key, displayName]) => {
      // Get current aggregate value from KPI summary
      const summaryKey = `avg${displayName.replace(/[\s()]/g, '')}`;
      const currentValue = kpiData.summary[summaryKey] !== undefined
        ? kpiData.summary[summaryKey]
        : null;

      return {
        key,
        displayName,
        unit: metricUnits[key] || '',
        category: metricCategories[key] || 'Other',
        currentValue,
        enabled: Array.isArray(config.metricsToDisplay) && config.metricsToDisplay.includes(key),
      };
    });

    const configuredMetrics = Array.isArray(config.metricsToDisplay)
      ? config.metricsToDisplay
      : [];

    return {
      availableMetrics,
      configuredMetrics,
      lastUpdated: new Date().toISOString(),
    };
  } catch (_err) {
    console.error('DashboardDataService: Failed to get configurable metrics:', _err);
    return {
      availableMetrics: [],
      configuredMetrics: [],
      lastUpdated: new Date().toISOString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Data Purge
// ---------------------------------------------------------------------------

/**
 * Purge old dashboard data from localStorage based on TTL.
 * Removes cached data older than the specified number of days.
 *
 * @param {Object} [options]
 * @param {number} [options.ttlDays=30] - Number of days to retain data.
 * @param {string} [options.userId] - ID of the user performing the purge.
 * @returns {{ success: boolean, purgedKeys: string[] }}
 */
export const purgeOldData = (options = {}) => {
  try {
    const { ttlDays = 30, userId } = options;
    const purgedKeys = [];

    const cache = getStorageItem(STORAGE_KEYS.DASHBOARD_CACHE, null);
    if (cache && cache._refreshedAt) {
      const refreshedAt = new Date(cache._refreshedAt);
      const now = new Date();
      const diffDays = (now.getTime() - refreshedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > ttlDays) {
        saveData(STORAGE_KEYS.DASHBOARD_CACHE, {});
        purgedKeys.push(STORAGE_KEYS.DASHBOARD_CACHE);
      }
    }

    if (purgedKeys.length > 0) {
      logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
        action: 'dashboard_data_purge',
        ttlDays,
        purgedKeys,
      });
    }

    return { success: true, purgedKeys };
  } catch (_err) {
    console.error('DashboardDataService: Failed to purge old data:', _err);
    return { success: false, purgedKeys: [] };
  }
};

// ---------------------------------------------------------------------------
// Public API — Reset Dashboard Data
// ---------------------------------------------------------------------------

/**
 * Reset all dashboard data to default mock data state.
 * Useful for development and testing.
 *
 * @param {string} [userId] - ID of the user performing the reset.
 * @returns {{ success: boolean }}
 */
export const resetDashboardData = (userId) => {
  try {
    saveData(STORAGE_KEYS.MELT_METRICS, MOCK_MELT_METRICS);
    saveData(STORAGE_KEYS.MELT_EVENTS, MOCK_MELT_EVENTS);
    saveData(STORAGE_KEYS.MELT_LOGS, MOCK_MELT_LOGS);
    saveData(STORAGE_KEYS.MELT_TRACES, MOCK_MELT_TRACES);
    saveData(STORAGE_KEYS.KPI_METRICS, MOCK_KPI_METRICS);
    saveData(STORAGE_KEYS.KPI_TRENDS, MOCK_KPI_TRENDS);
    saveData(STORAGE_KEYS.DASHBOARD_SUMMARY, MOCK_DASHBOARD_SUMMARY);
    saveData(STORAGE_KEYS.INCIDENTS, MOCK_INCIDENTS);
    saveData(STORAGE_KEYS.PIPELINE_RUNS, MOCK_PIPELINE_RUNS);
    saveData(STORAGE_KEYS.COMPLIANCE_ARTIFACTS, MOCK_COMPLIANCE_ARTIFACTS);
    saveData(STORAGE_KEYS.DASHBOARD_CONFIG, {});
    saveData(STORAGE_KEYS.DASHBOARD_CACHE, {});

    logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      message: 'Dashboard data reset to default mock data.',
      action: 'dashboard_data_reset',
    });

    return { success: true };
  } catch (_err) {
    console.error('DashboardDataService: Failed to reset dashboard data:', _err);
    return { success: false };
  }
};