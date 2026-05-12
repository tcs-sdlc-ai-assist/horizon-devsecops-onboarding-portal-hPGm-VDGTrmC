/**
 * Integration management service for Horizon DevSecOps Portal
 * Manages plug-and-play external system integrations (Postgres, MongoDB,
 * Elastic, Splunk, Dynatrace, etc.). Validates connection configs,
 * tests connectivity (simulated), and stores integration state in localStorage.
 * @module services/IntegrationService
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorageItem, setStorageItem, initializeStorage } from '../utils/localStorage.js';
import { logAction, AUDIT_ACTIONS } from '../utils/auditLogger.js';
import { getApplicationById } from './CatalogService.js';
import { TOOLCHAIN_CATALOG, getToolById } from '../constants/toolchainData.js';
import { TOOLS, TOOLCHAIN_CATEGORIES } from '../constants/constants.js';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = Object.freeze({
  INTEGRATIONS: 'integrations',
  INTEGRATION_TEST_RESULTS: 'integration_test_results',
});

// ---------------------------------------------------------------------------
// Integration Statuses
// ---------------------------------------------------------------------------

/**
 * Possible integration statuses.
 * @readonly
 * @enum {string}
 */
export const INTEGRATION_STATUSES = Object.freeze({
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  PENDING: 'pending',
  NOT_CONFIGURED: 'not_configured',
});

// ---------------------------------------------------------------------------
// Integration Types
// ---------------------------------------------------------------------------

/**
 * Supported integration type identifiers.
 * @readonly
 * @enum {string}
 */
export const INTEGRATION_TYPES = Object.freeze({
  MONITORING: 'monitoring',
  LOGGING: 'logging',
  DATABASE: 'database',
  MESSAGING: 'messaging',
  SECURITY_SCANNING: 'security_scanning',
  ITSM: 'itsm',
  COLLABORATION: 'collaboration',
  CI_CD: 'ci_cd',
  ARTIFACT_MANAGEMENT: 'artifact_management',
  CONTAINERIZATION: 'containerization',
  SOURCE_CONTROL: 'source_control',
  API_MANAGEMENT: 'api_management',
  DATA_PLATFORM: 'data_platform',
  QE_TOOLS: 'qe_tools',
});

export const INTEGRATION_TYPE_LIST = Object.freeze(Object.values(INTEGRATION_TYPES));

// ---------------------------------------------------------------------------
// Available Integrations Catalog
// ---------------------------------------------------------------------------

/**
 * Catalog of available plug-and-play integrations with default configs
 * and validation rules.
 * @type {Array<Object>}
 */
const INTEGRATION_CATALOG = Object.freeze([
  // -------------------------------------------------------------------------
  // Monitoring
  // -------------------------------------------------------------------------
  {
    id: 'dynatrace',
    name: 'Dynatrace',
    type: INTEGRATION_TYPES.MONITORING,
    description: 'AI-powered full-stack observability platform for monitoring applications, infrastructure, and user experience.',
    icon: 'activity',
    configSchema: {
      apiUrl: { type: 'string', required: true, label: 'API URL', placeholder: 'https://your-env.live.dynatrace.com/api' },
      environmentId: { type: 'string', required: true, label: 'Environment ID', placeholder: 'abc12345' },
      apiToken: { type: 'password', required: true, label: 'API Token', placeholder: 'dt0c01.XXXXXXXX' },
      oneAgentEnabled: { type: 'boolean', required: false, label: 'OneAgent Enabled', defaultValue: true },
      realUserMonitoring: { type: 'boolean', required: false, label: 'Real User Monitoring', defaultValue: true },
    },
    testEndpoint: '/api/v2/entities',
    documentationUrl: 'https://www.dynatrace.com/support/help/',
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    type: INTEGRATION_TYPES.MONITORING,
    description: 'Open-source systems monitoring and alerting toolkit with dimensional data model.',
    icon: 'bar-chart-2',
    configSchema: {
      serverUrl: { type: 'string', required: true, label: 'Server URL', placeholder: 'http://prometheus:9090' },
      scrapeInterval: { type: 'string', required: false, label: 'Scrape Interval', placeholder: '15s', defaultValue: '15s' },
      alertmanagerUrl: { type: 'string', required: false, label: 'Alertmanager URL', placeholder: 'http://alertmanager:9093' },
    },
    testEndpoint: '/-/healthy',
    documentationUrl: 'https://prometheus.io/docs/',
  },
  {
    id: 'grafana',
    name: 'Grafana',
    type: INTEGRATION_TYPES.MONITORING,
    description: 'Open-source analytics and interactive visualization platform for metrics, logs, and traces.',
    icon: 'layout-dashboard',
    configSchema: {
      serverUrl: { type: 'string', required: true, label: 'Server URL', placeholder: 'http://grafana:3000' },
      apiKey: { type: 'password', required: true, label: 'API Key', placeholder: 'eyJrIjoiXXXX' },
      orgId: { type: 'number', required: false, label: 'Organization ID', defaultValue: 1 },
    },
    testEndpoint: '/api/health',
    documentationUrl: 'https://grafana.com/docs/',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    type: INTEGRATION_TYPES.MONITORING,
    description: 'Cloud-scale monitoring and security platform for infrastructure, applications, and logs.',
    icon: 'dog',
    configSchema: {
      apiKey: { type: 'password', required: true, label: 'API Key', placeholder: 'your-api-key' },
      appKey: { type: 'password', required: true, label: 'Application Key', placeholder: 'your-app-key' },
      site: { type: 'string', required: false, label: 'Site', placeholder: 'datadoghq.com', defaultValue: 'datadoghq.com' },
      apmEnabled: { type: 'boolean', required: false, label: 'APM Enabled', defaultValue: true },
    },
    testEndpoint: '/api/v1/validate',
    documentationUrl: 'https://docs.datadoghq.com/',
  },

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------
  {
    id: 'splunk',
    name: 'Splunk',
    type: INTEGRATION_TYPES.LOGGING,
    description: 'Enterprise platform for searching, monitoring, and analyzing machine-generated data and logs.',
    icon: 'file-text',
    configSchema: {
      apiUrl: { type: 'string', required: true, label: 'API URL', placeholder: 'https://splunk.example.com:8089' },
      hecToken: { type: 'password', required: true, label: 'HEC Token', placeholder: 'your-hec-token' },
      hecPort: { type: 'number', required: false, label: 'HEC Port', defaultValue: 8088 },
      index: { type: 'string', required: false, label: 'Default Index', placeholder: 'main', defaultValue: 'main' },
      sourcetype: { type: 'string', required: false, label: 'Source Type', placeholder: 'json', defaultValue: 'json' },
      sslEnabled: { type: 'boolean', required: false, label: 'SSL Enabled', defaultValue: true },
    },
    testEndpoint: '/services/server/info',
    documentationUrl: 'https://docs.splunk.com/',
  },
  {
    id: 'elastic',
    name: 'Elastic (ELK Stack)',
    type: INTEGRATION_TYPES.LOGGING,
    description: 'Distributed search and analytics engine for centralized logging, observability, and security analytics.',
    icon: 'search',
    configSchema: {
      apiUrl: { type: 'string', required: true, label: 'Elasticsearch URL', placeholder: 'https://elastic.example.com:9200' },
      username: { type: 'string', required: false, label: 'Username', placeholder: 'elastic' },
      password: { type: 'password', required: false, label: 'Password', placeholder: '••••••••' },
      indexPattern: { type: 'string', required: false, label: 'Index Pattern', placeholder: 'app-logs-*', defaultValue: 'app-logs-*' },
      kibanaUrl: { type: 'string', required: false, label: 'Kibana URL', placeholder: 'https://kibana.example.com:5601' },
      apmEnabled: { type: 'boolean', required: false, label: 'APM Enabled', defaultValue: true },
    },
    testEndpoint: '/_cluster/health',
    documentationUrl: 'https://www.elastic.co/guide/',
  },

  // -------------------------------------------------------------------------
  // Database
  // -------------------------------------------------------------------------
  {
    id: 'postgres',
    name: 'PostgreSQL',
    type: INTEGRATION_TYPES.DATABASE,
    description: 'Advanced open-source relational database with strong ACID compliance and extensibility.',
    icon: 'database',
    configSchema: {
      host: { type: 'string', required: true, label: 'Host', placeholder: 'db.example.com' },
      port: { type: 'number', required: false, label: 'Port', defaultValue: 5432 },
      database: { type: 'string', required: true, label: 'Database Name', placeholder: 'mydb' },
      username: { type: 'string', required: true, label: 'Username', placeholder: 'postgres' },
      password: { type: 'password', required: true, label: 'Password', placeholder: '••••••••' },
      sslMode: { type: 'string', required: false, label: 'SSL Mode', placeholder: 'require', defaultValue: 'require' },
      maxConnections: { type: 'number', required: false, label: 'Max Connections', defaultValue: 100 },
    },
    testEndpoint: null,
    documentationUrl: 'https://www.postgresql.org/docs/',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    type: INTEGRATION_TYPES.DATABASE,
    description: 'Document-oriented NoSQL database for flexible schema design and horizontal scaling.',
    icon: 'database',
    configSchema: {
      connectionString: { type: 'string', required: true, label: 'Connection String', placeholder: 'mongodb+srv://user:pass@cluster.mongodb.net/db' },
      database: { type: 'string', required: true, label: 'Database Name', placeholder: 'mydb' },
      replicaSet: { type: 'string', required: false, label: 'Replica Set', placeholder: 'rs0' },
      tls: { type: 'boolean', required: false, label: 'TLS Enabled', defaultValue: true },
      maxPoolSize: { type: 'number', required: false, label: 'Max Pool Size', defaultValue: 50 },
    },
    testEndpoint: null,
    documentationUrl: 'https://www.mongodb.com/docs/',
  },
  {
    id: 'oracle',
    name: 'Oracle Database',
    type: INTEGRATION_TYPES.DATABASE,
    description: 'Enterprise relational database management system with advanced features for high availability.',
    icon: 'database',
    configSchema: {
      host: { type: 'string', required: true, label: 'Host', placeholder: 'oracle.example.com' },
      port: { type: 'number', required: false, label: 'Port', defaultValue: 1521 },
      serviceName: { type: 'string', required: true, label: 'Service Name', placeholder: 'ORCL' },
      username: { type: 'string', required: true, label: 'Username', placeholder: 'system' },
      password: { type: 'password', required: true, label: 'Password', placeholder: '••••••••' },
      tdeEnabled: { type: 'boolean', required: false, label: 'TDE Enabled', defaultValue: true },
    },
    testEndpoint: null,
    documentationUrl: 'https://docs.oracle.com/en/database/',
  },

  // -------------------------------------------------------------------------
  // Messaging
  // -------------------------------------------------------------------------
  {
    id: 'kafka',
    name: 'Apache Kafka',
    type: INTEGRATION_TYPES.MESSAGING,
    description: 'Distributed event streaming platform for high-throughput, fault-tolerant real-time data pipelines.',
    icon: 'radio',
    configSchema: {
      brokerUrl: { type: 'string', required: true, label: 'Broker URL', placeholder: 'kafka.example.com:9092' },
      clusterId: { type: 'string', required: false, label: 'Cluster ID', placeholder: 'cluster-001' },
      topicPrefix: { type: 'string', required: false, label: 'Topic Prefix', placeholder: 'horizon.' },
      securityProtocol: { type: 'string', required: false, label: 'Security Protocol', placeholder: 'SASL_SSL', defaultValue: 'SASL_SSL' },
      saslMechanism: { type: 'string', required: false, label: 'SASL Mechanism', placeholder: 'PLAIN', defaultValue: 'PLAIN' },
      username: { type: 'string', required: false, label: 'Username', placeholder: 'kafka-user' },
      password: { type: 'password', required: false, label: 'Password', placeholder: '••••••••' },
    },
    testEndpoint: null,
    documentationUrl: 'https://kafka.apache.org/documentation/',
  },

  // -------------------------------------------------------------------------
  // Security Scanning
  // -------------------------------------------------------------------------
  {
    id: 'sonarqube',
    name: 'SonarQube',
    type: INTEGRATION_TYPES.SECURITY_SCANNING,
    description: 'Continuous code quality and security inspection platform for detecting bugs and vulnerabilities.',
    icon: 'shield',
    configSchema: {
      serverUrl: { type: 'string', required: true, label: 'Server URL', placeholder: 'https://sonarqube.example.com' },
      token: { type: 'password', required: true, label: 'Authentication Token', placeholder: 'squ_XXXXXXXX' },
      projectKey: { type: 'string', required: false, label: 'Project Key', placeholder: 'my-project' },
      qualityGate: { type: 'string', required: false, label: 'Quality Gate', placeholder: 'Sonar way', defaultValue: 'Sonar way' },
    },
    testEndpoint: '/api/system/health',
    documentationUrl: 'https://docs.sonarqube.org/',
  },
  {
    id: 'snyk',
    name: 'Snyk',
    type: INTEGRATION_TYPES.SECURITY_SCANNING,
    description: 'Developer-first security platform for finding and fixing vulnerabilities in code and dependencies.',
    icon: 'shield-check',
    configSchema: {
      apiToken: { type: 'password', required: true, label: 'API Token', placeholder: 'your-snyk-token' },
      organization: { type: 'string', required: false, label: 'Organization', placeholder: 'my-org' },
      severityThreshold: { type: 'string', required: false, label: 'Severity Threshold', placeholder: 'high', defaultValue: 'high' },
    },
    testEndpoint: '/v1/user',
    documentationUrl: 'https://docs.snyk.io/',
  },
  {
    id: 'checkmarx',
    name: 'Checkmarx',
    type: INTEGRATION_TYPES.SECURITY_SCANNING,
    description: 'Application security testing platform providing SAST, SCA, and supply chain security analysis.',
    icon: 'shield-alert',
    configSchema: {
      serverUrl: { type: 'string', required: true, label: 'Server URL', placeholder: 'https://checkmarx.example.com' },
      username: { type: 'string', required: true, label: 'Username', placeholder: 'admin' },
      password: { type: 'password', required: true, label: 'Password', placeholder: '••••••••' },
      teamName: { type: 'string', required: false, label: 'Team Name', placeholder: 'CxServer' },
      preset: { type: 'string', required: false, label: 'Preset', placeholder: 'Checkmarx Default', defaultValue: 'Checkmarx Default' },
    },
    testEndpoint: '/cxrestapi/auth/identity/connect/token',
    documentationUrl: 'https://checkmarx.com/resource/documents/',
  },

  // -------------------------------------------------------------------------
  // ITSM
  // -------------------------------------------------------------------------
  {
    id: 'servicenow',
    name: 'ServiceNow',
    type: INTEGRATION_TYPES.ITSM,
    description: 'Enterprise IT service management platform for incident, change, and problem management.',
    icon: 'ticket',
    configSchema: {
      instanceUrl: { type: 'string', required: true, label: 'Instance URL', placeholder: 'https://your-instance.service-now.com' },
      username: { type: 'string', required: true, label: 'Username', placeholder: 'admin' },
      password: { type: 'password', required: true, label: 'Password', placeholder: '••••••••' },
      assignmentGroup: { type: 'string', required: false, label: 'Assignment Group', placeholder: 'Platform Engineering' },
      changeModel: { type: 'string', required: false, label: 'Change Model', placeholder: 'standard', defaultValue: 'standard' },
    },
    testEndpoint: '/api/now/table/sys_user?sysparm_limit=1',
    documentationUrl: 'https://docs.servicenow.com/',
  },
  {
    id: 'jira',
    name: 'Jira',
    type: INTEGRATION_TYPES.ITSM,
    description: 'Agile project management and issue tracking tool for planning, tracking, and releasing software.',
    icon: 'clipboard-list',
    configSchema: {
      serverUrl: { type: 'string', required: true, label: 'Server URL', placeholder: 'https://your-org.atlassian.net' },
      email: { type: 'string', required: true, label: 'Email', placeholder: 'user@example.com' },
      apiToken: { type: 'password', required: true, label: 'API Token', placeholder: 'your-api-token' },
      projectKey: { type: 'string', required: false, label: 'Project Key', placeholder: 'PROJ' },
    },
    testEndpoint: '/rest/api/3/myself',
    documentationUrl: 'https://developer.atlassian.com/cloud/jira/',
  },

  // -------------------------------------------------------------------------
  // Collaboration
  // -------------------------------------------------------------------------
  {
    id: 'slack',
    name: 'Slack',
    type: INTEGRATION_TYPES.COLLABORATION,
    description: 'Channel-based messaging platform for team communication with extensive bot and integration support.',
    icon: 'message-square',
    configSchema: {
      webhookUrl: { type: 'string', required: true, label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/XXX/YYY/ZZZ' },
      channelId: { type: 'string', required: false, label: 'Channel ID', placeholder: 'C0123456789' },
      botToken: { type: 'password', required: false, label: 'Bot Token', placeholder: 'xoxb-XXXXXXXX' },
      notifyOnBuildFailure: { type: 'boolean', required: false, label: 'Notify on Build Failure', defaultValue: true },
      notifyOnDeployment: { type: 'boolean', required: false, label: 'Notify on Deployment', defaultValue: true },
      notifyOnIncident: { type: 'boolean', required: false, label: 'Notify on Incident', defaultValue: true },
    },
    testEndpoint: null,
    documentationUrl: 'https://api.slack.com/',
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    type: INTEGRATION_TYPES.COLLABORATION,
    description: 'Unified communication and collaboration platform with chat, video meetings, and application integrations.',
    icon: 'message-circle',
    configSchema: {
      webhookUrl: { type: 'string', required: true, label: 'Webhook URL', placeholder: 'https://outlook.office.com/webhook/XXX' },
      tenantId: { type: 'string', required: false, label: 'Tenant ID', placeholder: 'your-tenant-id' },
      teamId: { type: 'string', required: false, label: 'Team ID', placeholder: 'your-team-id' },
      channelId: { type: 'string', required: false, label: 'Channel ID', placeholder: 'your-channel-id' },
      notifyOnBuildFailure: { type: 'boolean', required: false, label: 'Notify on Build Failure', defaultValue: true },
      notifyOnDeployment: { type: 'boolean', required: false, label: 'Notify on Deployment', defaultValue: true },
      notifyOnIncident: { type: 'boolean', required: false, label: 'Notify on Incident', defaultValue: true },
    },
    testEndpoint: null,
    documentationUrl: 'https://learn.microsoft.com/en-us/microsoftteams/',
  },

  // -------------------------------------------------------------------------
  // Data Platform
  // -------------------------------------------------------------------------
  {
    id: 'databricks',
    name: 'Databricks',
    type: INTEGRATION_TYPES.DATA_PLATFORM,
    description: 'Unified analytics platform for data engineering, data science, and machine learning.',
    icon: 'cpu',
    configSchema: {
      workspaceUrl: { type: 'string', required: true, label: 'Workspace URL', placeholder: 'https://adb-XXXXXXXX.azuredatabricks.net' },
      token: { type: 'password', required: true, label: 'Access Token', placeholder: 'dapi-XXXXXXXX' },
      clusterId: { type: 'string', required: false, label: 'Cluster ID', placeholder: '0123-456789-abcdefgh' },
    },
    testEndpoint: '/api/2.0/clusters/list',
    documentationUrl: 'https://docs.databricks.com/',
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    type: INTEGRATION_TYPES.DATA_PLATFORM,
    description: 'Cloud-native data platform for data warehousing, data lakes, and data sharing.',
    icon: 'snowflake',
    configSchema: {
      accountUrl: { type: 'string', required: true, label: 'Account URL', placeholder: 'https://account.snowflakecomputing.com' },
      username: { type: 'string', required: true, label: 'Username', placeholder: 'snowflake_user' },
      password: { type: 'password', required: true, label: 'Password', placeholder: '••••••••' },
      warehouse: { type: 'string', required: false, label: 'Warehouse', placeholder: 'COMPUTE_WH' },
      database: { type: 'string', required: false, label: 'Database', placeholder: 'MY_DB' },
      role: { type: 'string', required: false, label: 'Role', placeholder: 'SYSADMIN' },
    },
    testEndpoint: null,
    documentationUrl: 'https://docs.snowflake.com/',
  },

  // -------------------------------------------------------------------------
  // CI/CD
  // -------------------------------------------------------------------------
  {
    id: 'jenkins',
    name: 'Jenkins',
    type: INTEGRATION_TYPES.CI_CD,
    description: 'Open-source automation server for building, testing, and deploying software.',
    icon: 'settings',
    configSchema: {
      serverUrl: { type: 'string', required: true, label: 'Server URL', placeholder: 'https://jenkins.example.com' },
      username: { type: 'string', required: true, label: 'Username', placeholder: 'admin' },
      apiToken: { type: 'password', required: true, label: 'API Token', placeholder: 'your-api-token' },
      agentLabel: { type: 'string', required: false, label: 'Agent Label', placeholder: 'default' },
    },
    testEndpoint: '/api/json',
    documentationUrl: 'https://www.jenkins.io/doc/',
  },

  // -------------------------------------------------------------------------
  // Artifact Management
  // -------------------------------------------------------------------------
  {
    id: 'artifactory',
    name: 'JFrog Artifactory',
    type: INTEGRATION_TYPES.ARTIFACT_MANAGEMENT,
    description: 'Universal artifact repository for managing binaries and build artifacts.',
    icon: 'package',
    configSchema: {
      serverUrl: { type: 'string', required: true, label: 'Server URL', placeholder: 'https://artifactory.example.com' },
      username: { type: 'string', required: true, label: 'Username', placeholder: 'admin' },
      apiKey: { type: 'password', required: true, label: 'API Key', placeholder: 'your-api-key' },
      repositoryType: { type: 'string', required: false, label: 'Repository Type', placeholder: 'local', defaultValue: 'local' },
    },
    testEndpoint: '/api/system/ping',
    documentationUrl: 'https://jfrog.com/help/',
  },
]);

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
 * Load integrations from localStorage.
 * @returns {Array<Object>}
 */
const loadIntegrations = () => {
  ensureInitialized();
  const data = getStorageItem(STORAGE_KEYS.INTEGRATIONS, null);
  if (data !== null && Array.isArray(data)) {
    return data;
  }
  setStorageItem(STORAGE_KEYS.INTEGRATIONS, []);
  return [];
};

/**
 * Save integrations to localStorage.
 * @param {Array<Object>} integrations
 * @returns {boolean}
 */
const saveIntegrationsData = (integrations) => {
  return setStorageItem(STORAGE_KEYS.INTEGRATIONS, integrations);
};

/**
 * Load integration test results from localStorage.
 * @returns {Array<Object>}
 */
const loadTestResults = () => {
  ensureInitialized();
  const data = getStorageItem(STORAGE_KEYS.INTEGRATION_TEST_RESULTS, null);
  if (data !== null && Array.isArray(data)) {
    return data;
  }
  setStorageItem(STORAGE_KEYS.INTEGRATION_TEST_RESULTS, []);
  return [];
};

/**
 * Save integration test results to localStorage.
 * @param {Array<Object>} results
 * @returns {boolean}
 */
const saveTestResults = (results) => {
  return setStorageItem(STORAGE_KEYS.INTEGRATION_TEST_RESULTS, results);
};

/**
 * Trim test results to prevent localStorage overflow.
 * @param {Array<Object>} results
 * @param {number} [maxEntries=500]
 * @returns {Array<Object>}
 */
const trimTestResults = (results, maxEntries = 500) => {
  if (!Array.isArray(results)) {
    return [];
  }
  if (results.length <= maxEntries) {
    return results;
  }
  return results.slice(results.length - maxEntries);
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

/**
 * Mask sensitive fields in a config object for logging purposes.
 * @param {Object} config
 * @param {Object} schema
 * @returns {Object}
 */
const maskSensitiveFields = (config, schema) => {
  if (!config || typeof config !== 'object') {
    return {};
  }

  const masked = { ...config };

  if (schema && typeof schema === 'object') {
    for (const [key, schemaDef] of Object.entries(schema)) {
      if (schemaDef && schemaDef.type === 'password' && masked[key]) {
        masked[key] = '********';
      }
    }
  }

  return masked;
};

/**
 * Simulate a connection test with a delay.
 * In prototype mode, this returns a simulated result based on config validation.
 * @param {Object} catalogEntry
 * @param {Object} config
 * @returns {Promise<Object>}
 */
const simulateConnectionTest = (catalogEntry, config) => {
  return new Promise((resolve) => {
    // Simulate network delay (300-1500ms)
    const delay = 300 + Math.random() * 1200;

    setTimeout(() => {
      // Validate required fields
      const missingFields = [];
      if (catalogEntry.configSchema && typeof catalogEntry.configSchema === 'object') {
        for (const [key, schemaDef] of Object.entries(catalogEntry.configSchema)) {
          if (schemaDef.required === true) {
            const val = config[key];
            if (val === null || val === undefined || (typeof val === 'string' && val.trim().length === 0)) {
              missingFields.push(schemaDef.label || key);
            }
          }
        }
      }

      if (missingFields.length > 0) {
        resolve({
          success: false,
          status: INTEGRATION_STATUSES.ERROR,
          message: `Missing required field(s): ${missingFields.join(', ')}.`,
          responseTimeMs: Math.round(delay),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Simulate success (90% chance) or transient failure (10% chance)
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        resolve({
          success: true,
          status: INTEGRATION_STATUSES.CONNECTED,
          message: `Successfully connected to ${catalogEntry.name}.`,
          responseTimeMs: Math.round(delay),
          timestamp: new Date().toISOString(),
          details: {
            version: '1.0.0',
            serverInfo: `${catalogEntry.name} (simulated)`,
            endpoint: catalogEntry.testEndpoint || 'N/A',
          },
        });
      } else {
        resolve({
          success: false,
          status: INTEGRATION_STATUSES.ERROR,
          message: `Connection to ${catalogEntry.name} timed out. Please verify the configuration and try again.`,
          responseTimeMs: Math.round(delay),
          timestamp: new Date().toISOString(),
        });
      }
    }, delay);
  });
};

// ---------------------------------------------------------------------------
// Public API — Available Integrations
// ---------------------------------------------------------------------------

/**
 * Get all available integrations from the catalog.
 *
 * @param {Object} [options]
 * @param {string} [options.type] - Filter by integration type.
 * @param {string} [options.search] - Free-text search across name and description.
 * @param {string} [options.sortBy='name'] - Field to sort by.
 * @param {string} [options.sortOrder='asc'] - Sort order: 'asc' or 'desc'.
 * @returns {Array<Object>}
 */
export const getAvailableIntegrations = (options = {}) => {
  try {
    const { type, search, sortBy = 'name', sortOrder = 'asc' } = options;

    let catalog = [...INTEGRATION_CATALOG];

    // Filter by type
    if (type && typeof type === 'string' && type.trim().length > 0) {
      const t = type.trim();
      catalog = catalog.filter((entry) => entry.type === t);
    }

    // Free-text search
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.trim();
      catalog = catalog.filter((entry) => {
        return (
          matchesSearch(entry.name, query) ||
          matchesSearch(entry.description, query) ||
          matchesSearch(entry.type, query) ||
          matchesSearch(entry.id, query)
        );
      });
    }

    // Sort
    catalog.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

    return catalog;
  } catch (_err) {
    console.error('IntegrationService: Failed to get available integrations:', _err);
    return [];
  }
};

/**
 * Get a single integration catalog entry by its ID.
 *
 * @param {string} integrationId - The integration catalog ID.
 * @returns {Object|null} The catalog entry or null if not found.
 */
export const getAvailableIntegrationById = (integrationId) => {
  if (!integrationId || typeof integrationId !== 'string') {
    return null;
  }

  return INTEGRATION_CATALOG.find((entry) => entry.id === integrationId) || null;
};

/**
 * Get all unique integration types from the catalog.
 *
 * @returns {Array<{ type: string, label: string, count: number }>}
 */
export const getIntegrationTypes = () => {
  try {
    const typeCounts = {};
    INTEGRATION_CATALOG.forEach((entry) => {
      const key = entry.type || 'unknown';
      typeCounts[key] = (typeCounts[key] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (_err) {
    console.error('IntegrationService: Failed to get integration types:', _err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Public API — Test Integration
// ---------------------------------------------------------------------------

/**
 * Test connectivity to an external system integration. Validates the
 * configuration against the catalog schema and simulates a connection test.
 *
 * @param {string} toolId - The integration catalog ID (e.g. 'dynatrace', 'splunk', 'postgres').
 * @param {Object} config - The connection configuration object.
 * @param {Object} [options]
 * @param {string} [options.userId] - ID of the user performing the test.
 * @param {string} [options.applicationId] - Associated application ID.
 * @returns {Promise<{ success: boolean, result: Object|null, error: string|null }>}
 */
export const testIntegration = async (toolId, config, options = {}) => {
  try {
    if (!toolId || typeof toolId !== 'string' || toolId.trim().length === 0) {
      return { success: false, result: null, error: 'Integration tool ID is required.' };
    }

    if (!config || typeof config !== 'object') {
      return { success: false, result: null, error: 'Configuration object is required.' };
    }

    const trimmedId = toolId.trim().toLowerCase();
    const { userId = null, applicationId = null } = options;

    // Look up the integration in the catalog
    const catalogEntry = INTEGRATION_CATALOG.find((entry) => entry.id === trimmedId);

    if (!catalogEntry) {
      return {
        success: false,
        result: null,
        error: `Integration "${trimmedId}" not found in the catalog. Available integrations: ${INTEGRATION_CATALOG.map((e) => e.id).join(', ')}.`,
      };
    }

    // Validate config against schema
    const validationErrors = validateIntegrationConfig(trimmedId, config);
    if (validationErrors.length > 0) {
      return {
        success: false,
        result: {
          success: false,
          status: INTEGRATION_STATUSES.ERROR,
          message: `Configuration validation failed: ${validationErrors.join('; ')}`,
          timestamp: new Date().toISOString(),
        },
        error: validationErrors.join('; '),
      };
    }

    // Simulate the connection test
    const testResult = await simulateConnectionTest(catalogEntry, config);

    // Store the test result
    const testResults = loadTestResults();
    const testRecord = {
      id: `TST-${uuidv4().slice(0, 8).toUpperCase()}`,
      integrationId: trimmedId,
      integrationName: catalogEntry.name,
      integrationType: catalogEntry.type,
      applicationId: applicationId || null,
      config: maskSensitiveFields(config, catalogEntry.configSchema),
      result: testResult,
      testedBy: userId || null,
      testedAt: new Date().toISOString(),
    };

    testResults.push(testRecord);
    const trimmed = trimTestResults(testResults);
    saveTestResults(trimmed);

    // Log the test action
    logAction(userId || null, AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE, {
      action: 'integration_test',
      integrationId: trimmedId,
      integrationName: catalogEntry.name,
      integrationType: catalogEntry.type,
      applicationId: applicationId || null,
      testSuccess: testResult.success,
      testStatus: testResult.status,
      responseTimeMs: testResult.responseTimeMs,
    });

    return {
      success: testResult.success,
      result: testResult,
      error: testResult.success ? null : testResult.message,
    };
  } catch (_err) {
    console.error('IntegrationService: Failed to test integration:', _err);
    return { success: false, result: null, error: 'Failed to test integration. Please try again.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Save Integration
// ---------------------------------------------------------------------------

/**
 * Save one or more integrations for an application. Creates or updates
 * integration records in localStorage.
 *
 * @param {string} appId - The application ID.
 * @param {Array<Object>} integrations - Array of integration objects to save.
 * @param {string} integrations[].toolId - The integration catalog ID.
 * @param {Object} integrations[].config - The connection configuration.
 * @param {boolean} [integrations[].enabled=true] - Whether the integration is enabled.
 * @param {Object} [options]
 * @param {string} [options.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, saved: number, errors: string[] }}
 */
export const saveIntegration = (appId, integrations, options = {}) => {
  try {
    if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
      return { success: false, saved: 0, errors: ['Application ID is required.'] };
    }

    if (!integrations || !Array.isArray(integrations)) {
      return { success: false, saved: 0, errors: ['Integrations must be an array.'] };
    }

    if (integrations.length === 0) {
      return { success: false, saved: 0, errors: ['At least one integration is required.'] };
    }

    const { userId = null } = options;
    const errors = [];
    let savedCount = 0;

    // Verify application exists
    const application = getApplicationById(appId);
    if (!application) {
      return { success: false, saved: 0, errors: [`Application with ID "${appId}" not found.`] };
    }

    const allIntegrations = loadIntegrations();

    integrations.forEach((integration, index) => {
      const entryNum = index + 1;

      if (!integration || typeof integration !== 'object') {
        errors.push(`Integration ${entryNum}: Must be an object.`);
        return;
      }

      const toolId = integration.toolId;
      if (!toolId || typeof toolId !== 'string' || toolId.trim().length === 0) {
        errors.push(`Integration ${entryNum}: "toolId" is required.`);
        return;
      }

      const trimmedToolId = toolId.trim().toLowerCase();

      // Validate tool exists in catalog
      const catalogEntry = INTEGRATION_CATALOG.find((entry) => entry.id === trimmedToolId);
      if (!catalogEntry) {
        errors.push(`Integration ${entryNum}: "${trimmedToolId}" is not a recognized integration.`);
        return;
      }

      const config = integration.config || {};
      if (typeof config !== 'object') {
        errors.push(`Integration ${entryNum}: "config" must be an object.`);
        return;
      }

      // Validate config against schema
      const configErrors = validateIntegrationConfig(trimmedToolId, config);
      if (configErrors.length > 0) {
        errors.push(`Integration ${entryNum} (${catalogEntry.name}): ${configErrors.join('; ')}`);
        return;
      }

      const enabled = integration.enabled !== false;

      // Check if integration already exists for this app
      const existingIndex = allIntegrations.findIndex(
        (i) => i.applicationId === appId && i.toolId === trimmedToolId,
      );

      const integrationRecord = {
        id: existingIndex >= 0 ? allIntegrations[existingIndex].id : `INT-${uuidv4().slice(0, 8).toUpperCase()}`,
        applicationId: appId,
        applicationName: application.name,
        toolId: trimmedToolId,
        toolName: catalogEntry.name,
        type: catalogEntry.type,
        config: { ...config },
        enabled,
        status: INTEGRATION_STATUSES.PENDING,
        createdAt: existingIndex >= 0 ? allIntegrations[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: existingIndex >= 0 ? allIntegrations[existingIndex].createdBy : userId,
        updatedBy: userId,
      };

      if (existingIndex >= 0) {
        allIntegrations[existingIndex] = integrationRecord;
      } else {
        allIntegrations.push(integrationRecord);
      }

      savedCount++;
    });

    if (savedCount > 0) {
      saveIntegrationsData(allIntegrations);

      logAction(userId || null, AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE, {
        action: 'integration_save',
        applicationId: appId,
        applicationName: application.name,
        savedCount,
        integrationIds: integrations
          .filter((i) => i && i.toolId)
          .map((i) => i.toolId),
      });
    }

    return {
      success: savedCount > 0 && errors.length === 0,
      saved: savedCount,
      errors,
    };
  } catch (_err) {
    console.error('IntegrationService: Failed to save integration:', _err);
    return { success: false, saved: 0, errors: ['Failed to save integration.'] };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Integrations
// ---------------------------------------------------------------------------

/**
 * Get integrations for a specific application or all integrations.
 *
 * @param {string} [appId] - The application ID. If omitted, returns all integrations.
 * @param {Object} [options]
 * @param {string} [options.type] - Filter by integration type.
 * @param {string} [options.status] - Filter by integration status.
 * @param {boolean} [options.enabledOnly] - Return only enabled integrations.
 * @param {string} [options.search] - Free-text search across tool name, type, application name.
 * @param {string} [options.sortBy='updatedAt'] - Field to sort by.
 * @param {string} [options.sortOrder='desc'] - Sort order: 'asc' or 'desc'.
 * @returns {Array<Object>}
 */
export const getIntegrations = (appId, options = {}) => {
  try {
    const {
      type,
      status,
      enabledOnly,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = options;

    let integrations = loadIntegrations();

    // Filter by application ID
    if (appId && typeof appId === 'string' && appId.trim().length > 0) {
      integrations = integrations.filter((i) => i.applicationId === appId.trim());
    }

    // Filter by type
    if (type && typeof type === 'string' && type.trim().length > 0) {
      integrations = integrations.filter((i) => i.type === type.trim());
    }

    // Filter by status
    if (status && typeof status === 'string' && status.trim().length > 0) {
      integrations = integrations.filter((i) => i.status === status.trim());
    }

    // Filter by enabled
    if (enabledOnly === true) {
      integrations = integrations.filter((i) => i.enabled === true);
    }

    // Free-text search
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.trim();
      integrations = integrations.filter((i) => {
        return (
          matchesSearch(i.toolName, query) ||
          matchesSearch(i.toolId, query) ||
          matchesSearch(i.type, query) ||
          matchesSearch(i.applicationName, query) ||
          matchesSearch(i.status, query)
        );
      });
    }

    // Sort
    integrations.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

    return integrations;
  } catch (_err) {
    console.error('IntegrationService: Failed to get integrations:', _err);
    return [];
  }
};

/**
 * Get a single integration by its ID.
 *
 * @param {string} integrationId - The integration record ID.
 * @returns {Object|null} The integration record or null if not found.
 */
export const getIntegrationById = (integrationId) => {
  try {
    if (!integrationId || typeof integrationId !== 'string') {
      return null;
    }

    const integrations = loadIntegrations();
    return integrations.find((i) => i.id === integrationId) || null;
  } catch (_err) {
    console.error('IntegrationService: Failed to get integration by ID:', _err);
    return null;
  }
};

/**
 * Get a specific integration for an application by tool ID.
 *
 * @param {string} appId - The application ID.
 * @param {string} toolId - The integration tool ID.
 * @returns {Object|null} The integration record or null if not found.
 */
export const getIntegrationByToolId = (appId, toolId) => {
  try {
    if (!appId || !toolId || typeof appId !== 'string' || typeof toolId !== 'string') {
      return null;
    }

    const integrations = loadIntegrations();
    return integrations.find(
      (i) => i.applicationId === appId && i.toolId === toolId.trim().toLowerCase(),
    ) || null;
  } catch (_err) {
    console.error('IntegrationService: Failed to get integration by tool ID:', _err);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API — Update Integration
// ---------------------------------------------------------------------------

/**
 * Update an existing integration record.
 *
 * @param {string} appId - The application ID.
 * @param {string} toolId - The integration tool ID.
 * @param {Object} updates - Partial integration data to merge.
 * @param {Object} [updates.config] - Updated configuration.
 * @param {boolean} [updates.enabled] - Updated enabled state.
 * @param {string} [updates.status] - Updated status.
 * @param {Object} [options]
 * @param {string} [options.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, integration: Object|null, error: string|null }}
 */
export const updateIntegration = (appId, toolId, updates, options = {}) => {
  try {
    if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
      return { success: false, integration: null, error: 'Application ID is required.' };
    }

    if (!toolId || typeof toolId !== 'string' || toolId.trim().length === 0) {
      return { success: false, integration: null, error: 'Tool ID is required.' };
    }

    if (!updates || typeof updates !== 'object') {
      return { success: false, integration: null, error: 'Update data is required.' };
    }

    const { userId = null } = options;
    const trimmedToolId = toolId.trim().toLowerCase();

    const integrations = loadIntegrations();
    const index = integrations.findIndex(
      (i) => i.applicationId === appId && i.toolId === trimmedToolId,
    );

    if (index === -1) {
      return {
        success: false,
        integration: null,
        error: `Integration "${trimmedToolId}" not found for application "${appId}".`,
      };
    }

    const existing = integrations[index];

    // Validate config if being updated
    if (updates.config !== undefined && typeof updates.config === 'object') {
      const mergedConfig = { ...existing.config, ...updates.config };
      const configErrors = validateIntegrationConfig(trimmedToolId, mergedConfig);
      if (configErrors.length > 0) {
        return {
          success: false,
          integration: null,
          error: `Configuration validation failed: ${configErrors.join('; ')}`,
        };
      }
      existing.config = mergedConfig;
    }

    if (updates.enabled !== undefined) {
      existing.enabled = updates.enabled === true;
    }

    if (updates.status !== undefined && typeof updates.status === 'string') {
      existing.status = updates.status.trim();
    }

    existing.updatedAt = new Date().toISOString();
    existing.updatedBy = userId;

    integrations[index] = existing;
    saveIntegrationsData(integrations);

    logAction(userId || null, AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE, {
      action: 'integration_update',
      integrationId: existing.id,
      applicationId: appId,
      toolId: trimmedToolId,
      toolName: existing.toolName,
      updatedFields: Object.keys(updates),
    });

    return { success: true, integration: existing, error: null };
  } catch (_err) {
    console.error('IntegrationService: Failed to update integration:', _err);
    return { success: false, integration: null, error: 'Failed to update integration.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Remove Integration
// ---------------------------------------------------------------------------

/**
 * Remove an integration from an application.
 *
 * @param {string} appId - The application ID.
 * @param {string} toolId - The integration tool ID to remove.
 * @param {Object} [options]
 * @param {string} [options.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, error: string|null }}
 */
export const removeIntegration = (appId, toolId, options = {}) => {
  try {
    if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
      return { success: false, error: 'Application ID is required.' };
    }

    if (!toolId || typeof toolId !== 'string' || toolId.trim().length === 0) {
      return { success: false, error: 'Tool ID is required.' };
    }

    const { userId = null } = options;
    const trimmedToolId = toolId.trim().toLowerCase();

    const integrations = loadIntegrations();
    const index = integrations.findIndex(
      (i) => i.applicationId === appId && i.toolId === trimmedToolId,
    );

    if (index === -1) {
      return {
        success: false,
        error: `Integration "${trimmedToolId}" not found for application "${appId}".`,
      };
    }

    const removed = integrations[index];
    integrations.splice(index, 1);
    saveIntegrationsData(integrations);

    logAction(userId || null, AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE, {
      action: 'integration_remove',
      integrationId: removed.id,
      applicationId: appId,
      applicationName: removed.applicationName,
      toolId: trimmedToolId,
      toolName: removed.toolName,
      type: removed.type,
    });

    return { success: true, error: null };
  } catch (_err) {
    console.error('IntegrationService: Failed to remove integration:', _err);
    return { success: false, error: 'Failed to remove integration.' };
  }
};

/**
 * Remove all integrations for an application.
 *
 * @param {string} appId - The application ID.
 * @param {Object} [options]
 * @param {string} [options.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, removed: number, error: string|null }}
 */
export const removeAllIntegrations = (appId, options = {}) => {
  try {
    if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
      return { success: false, removed: 0, error: 'Application ID is required.' };
    }

    const { userId = null } = options;

    const integrations = loadIntegrations();
    const remaining = integrations.filter((i) => i.applicationId !== appId);
    const removedCount = integrations.length - remaining.length;

    if (removedCount === 0) {
      return { success: true, removed: 0, error: null };
    }

    saveIntegrationsData(remaining);

    logAction(userId || null, AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE, {
      action: 'integration_remove_all',
      applicationId: appId,
      removedCount,
    });

    return { success: true, removed: removedCount, error: null };
  } catch (_err) {
    console.error('IntegrationService: Failed to remove all integrations:', _err);
    return { success: false, removed: 0, error: 'Failed to remove integrations.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Validate Integration Config
// ---------------------------------------------------------------------------

/**
 * Validate an integration configuration against the catalog schema.
 *
 * @param {string} toolId - The integration catalog ID.
 * @param {Object} config - The configuration object to validate.
 * @returns {string[]} Array of error messages. Empty array means valid.
 */
export const validateIntegrationConfig = (toolId, config) => {
  const errors = [];

  if (!toolId || typeof toolId !== 'string') {
    return ['Tool ID is required.'];
  }

  if (!config || typeof config !== 'object') {
    return ['Configuration must be an object.'];
  }

  const trimmedId = toolId.trim().toLowerCase();
  const catalogEntry = INTEGRATION_CATALOG.find((entry) => entry.id === trimmedId);

  if (!catalogEntry) {
    return [`Integration "${trimmedId}" not found in the catalog.`];
  }

  const schema = catalogEntry.configSchema;
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  for (const [key, schemaDef] of Object.entries(schema)) {
    if (!schemaDef || typeof schemaDef !== 'object') {
      continue;
    }

    const value = config[key];
    const label = schemaDef.label || key;

    // Check required fields
    if (schemaDef.required === true) {
      if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
        errors.push(`"${label}" is required.`);
        continue;
      }
    }

    // Skip validation for empty optional fields
    if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
      continue;
    }

    // Type validation
    switch (schemaDef.type) {
      case 'string':
      case 'password': {
        if (typeof value !== 'string' && typeof value !== 'number') {
          errors.push(`"${label}" must be a string.`);
        }
        break;
      }
      case 'number': {
        const num = Number(value);
        if (Number.isNaN(num)) {
          errors.push(`"${label}" must be a number.`);
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          const strVal = String(value).toLowerCase();
          if (!['true', 'false', '1', '0', 'yes', 'no'].includes(strVal)) {
            errors.push(`"${label}" must be a boolean.`);
          }
        }
        break;
      }
      default:
        break;
    }

    // URL validation for fields that look like URLs
    if (
      (schemaDef.type === 'string' || schemaDef.type === 'password') &&
      typeof value === 'string' &&
      (key.toLowerCase().includes('url') || key.toLowerCase().includes('endpoint'))
    ) {
      const trimmedValue = value.trim();
      if (trimmedValue.length > 0 && !trimmedValue.startsWith('http://') && !trimmedValue.startsWith('https://')) {
        // Only warn for URL-like fields, don't block
        // Some fields like webhookUrl are required to be URLs
        if (key.toLowerCase().includes('url')) {
          try {
            new URL(trimmedValue);
          } catch (_urlErr) {
            errors.push(`"${label}" must be a valid URL.`);
          }
        }
      }
    }
  }

  return errors;
};

// ---------------------------------------------------------------------------
// Public API — Integration Summary
// ---------------------------------------------------------------------------

/**
 * Get a summary of all integrations across applications.
 *
 * @returns {{
 *   totalIntegrations: number,
 *   totalApplications: number,
 *   byType: Array<{ type: string, count: number }>,
 *   byStatus: Array<{ status: string, count: number }>,
 *   byApplication: Array<{ applicationId: string, applicationName: string, count: number }>,
 *   recentTests: Array<Object>,
 * }}
 */
export const getIntegrationSummary = () => {
  try {
    const integrations = loadIntegrations();
    const testResults = loadTestResults();

    // Count by type
    const typeCounts = {};
    integrations.forEach((i) => {
      const key = i.type || 'unknown';
      typeCounts[key] = (typeCounts[key] || 0) + 1;
    });
    const byType = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Count by status
    const statusCounts = {};
    integrations.forEach((i) => {
      const key = i.status || 'unknown';
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
    const byStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Count by application
    const appCounts = {};
    const appNames = {};
    integrations.forEach((i) => {
      const key = i.applicationId || 'unknown';
      appCounts[key] = (appCounts[key] || 0) + 1;
      if (i.applicationName) {
        appNames[key] = i.applicationName;
      }
    });
    const byApplication = Object.entries(appCounts)
      .map(([applicationId, count]) => ({
        applicationId,
        applicationName: appNames[applicationId] || 'Unknown',
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Unique applications
    const uniqueApps = new Set(integrations.map((i) => i.applicationId));

    // Recent test results (last 10)
    const sortedTests = [...testResults].sort((a, b) => {
      const dateA = a.testedAt ? new Date(a.testedAt).getTime() : 0;
      const dateB = b.testedAt ? new Date(b.testedAt).getTime() : 0;
      return dateB - dateA;
    });
    const recentTests = sortedTests.slice(0, 10);

    return {
      totalIntegrations: integrations.length,
      totalApplications: uniqueApps.size,
      byType,
      byStatus,
      byApplication,
      recentTests,
    };
  } catch (_err) {
    console.error('IntegrationService: Failed to get integration summary:', _err);
    return {
      totalIntegrations: 0,
      totalApplications: 0,
      byType: [],
      byStatus: [],
      byApplication: [],
      recentTests: [],
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Test Results
// ---------------------------------------------------------------------------

/**
 * Get integration test results, optionally filtered.
 *
 * @param {Object} [options]
 * @param {string} [options.integrationId] - Filter by integration catalog ID.
 * @param {string} [options.applicationId] - Filter by application ID.
 * @param {boolean} [options.successOnly] - Return only successful tests.
 * @param {boolean} [options.failedOnly] - Return only failed tests.
 * @param {string} [options.sortBy='testedAt'] - Field to sort by.
 * @param {string} [options.sortOrder='desc'] - Sort order.
 * @param {number} [options.limit] - Maximum number of results.
 * @param {number} [options.offset=0] - Number of results to skip.
 * @returns {{ data: Array<Object>, total: number }}
 */
export const getTestResults = (options = {}) => {
  try {
    const {
      integrationId,
      applicationId,
      successOnly,
      failedOnly,
      sortBy = 'testedAt',
      sortOrder = 'desc',
      limit,
      offset = 0,
    } = options;

    let results = loadTestResults();

    if (integrationId && typeof integrationId === 'string') {
      results = results.filter((r) => r.integrationId === integrationId.trim().toLowerCase());
    }

    if (applicationId && typeof applicationId === 'string') {
      results = results.filter((r) => r.applicationId === applicationId);
    }

    if (successOnly === true) {
      results = results.filter((r) => r.result && r.result.success === true);
    }

    if (failedOnly === true) {
      results = results.filter((r) => r.result && r.result.success === false);
    }

    results.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

    const total = results.length;

    const startIdx = typeof offset === 'number' && offset > 0 ? offset : 0;
    if (typeof limit === 'number' && limit > 0) {
      results = results.slice(startIdx, startIdx + limit);
    } else if (startIdx > 0) {
      results = results.slice(startIdx);
    }

    return { data: results, total };
  } catch (_err) {
    console.error('IntegrationService: Failed to get test results:', _err);
    return { data: [], total: 0 };
  }
};

// ---------------------------------------------------------------------------
// Public API — Bulk Operations
// ---------------------------------------------------------------------------

/**
 * Enable or disable multiple integrations for an application.
 *
 * @param {string} appId - The application ID.
 * @param {string[]} toolIds - Array of tool IDs to update.
 * @param {boolean} enabled - Whether to enable or disable.
 * @param {Object} [options]
 * @param {string} [options.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, updated: number, errors: string[] }}
 */
export const bulkToggleIntegrations = (appId, toolIds, enabled, options = {}) => {
  try {
    if (!appId || typeof appId !== 'string') {
      return { success: false, updated: 0, errors: ['Application ID is required.'] };
    }

    if (!toolIds || !Array.isArray(toolIds) || toolIds.length === 0) {
      return { success: false, updated: 0, errors: ['Tool IDs array is required.'] };
    }

    const { userId = null } = options;
    const errors = [];
    let updatedCount = 0;

    const integrations = loadIntegrations();

    toolIds.forEach((toolId) => {
      if (!toolId || typeof toolId !== 'string') {
        errors.push(`Invalid tool ID: ${toolId}`);
        return;
      }

      const trimmedToolId = toolId.trim().toLowerCase();
      const index = integrations.findIndex(
        (i) => i.applicationId === appId && i.toolId === trimmedToolId,
      );

      if (index === -1) {
        errors.push(`Integration "${trimmedToolId}" not found for application "${appId}".`);
        return;
      }

      integrations[index].enabled = enabled === true;
      integrations[index].updatedAt = new Date().toISOString();
      integrations[index].updatedBy = userId;
      updatedCount++;
    });

    if (updatedCount > 0) {
      saveIntegrationsData(integrations);

      logAction(userId || null, AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE, {
        action: enabled ? 'integration_bulk_enable' : 'integration_bulk_disable',
        applicationId: appId,
        toolIds: toolIds.map((t) => t.trim().toLowerCase()),
        updatedCount,
      });
    }

    return {
      success: updatedCount > 0,
      updated: updatedCount,
      errors,
    };
  } catch (_err) {
    console.error('IntegrationService: Failed to bulk toggle integrations:', _err);
    return { success: false, updated: 0, errors: ['Failed to update integrations.'] };
  }
};

// ---------------------------------------------------------------------------
// Public API — Reset
// ---------------------------------------------------------------------------

/**
 * Reset all integration data. Useful for development and testing.
 *
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean }}
 */
export const resetIntegrations = (userId) => {
  try {
    saveIntegrationsData([]);
    saveTestResults([]);

    logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      message: 'All integration data has been reset.',
      action: 'integration_reset',
    });

    return { success: true };
  } catch (_err) {
    console.error('IntegrationService: Failed to reset integrations:', _err);
    return { success: false };
  }
};

/**
 * Export all integrations as a JSON string suitable for download.
 *
 * @param {Object} [options]
 * @param {string} [options.appId] - Filter by application ID.
 * @param {boolean} [options.maskSecrets=true] - Whether to mask sensitive fields.
 * @returns {{ success: boolean, data: string, count: number }}
 */
export const exportIntegrations = (options = {}) => {
  try {
    const { appId, maskSecrets = true } = options;

    let integrations = loadIntegrations();

    if (appId && typeof appId === 'string') {
      integrations = integrations.filter((i) => i.applicationId === appId);
    }

    if (maskSecrets) {
      integrations = integrations.map((integration) => {
        const catalogEntry = INTEGRATION_CATALOG.find((e) => e.id === integration.toolId);
        const schema = catalogEntry ? catalogEntry.configSchema : {};
        return {
          ...integration,
          config: maskSensitiveFields(integration.config, schema),
        };
      });
    }

    const jsonData = JSON.stringify(integrations, null, 2);

    return { success: true, data: jsonData, count: integrations.length };
  } catch (_err) {
    console.error('IntegrationService: Failed to export integrations:', _err);
    return { success: false, data: '', count: 0 };
  }
};