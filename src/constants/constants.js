/**
 * Application-wide constants for Horizon DevSecOps Portal
 * @module constants
 */

// ---------------------------------------------------------------------------
// Domain Names
// ---------------------------------------------------------------------------
export const DOMAINS = Object.freeze({
  CORPORATE_FUNCTIONS: 'Corporate Functions',
  HEALTH_AND_NETWORK: 'Health and Network',
  DIGITAL_EXPERIENCE: 'Digital Experience',
  DATA_AND_ANALYTICS: 'Data and Analytics',
  SECURITY_AND_COMPLIANCE: 'Security and Compliance',
  INFRASTRUCTURE_SERVICES: 'Infrastructure Services',
  ENTERPRISE_PLATFORMS: 'Enterprise Platforms',
});

export const DOMAIN_LIST = Object.freeze(Object.values(DOMAINS));

// ---------------------------------------------------------------------------
// Portfolio Names
// ---------------------------------------------------------------------------
export const PORTFOLIOS = Object.freeze({
  FINANCE: 'Finance',
  HR: 'Human Resources',
  LEGAL: 'Legal',
  MARKETING: 'Marketing',
  NETWORK_OPS: 'Network Operations',
  HEALTH_MONITORING: 'Health Monitoring',
  CUSTOMER_PORTAL: 'Customer Portal',
  MOBILE_APPS: 'Mobile Applications',
  DATA_PLATFORM: 'Data Platform',
  ANALYTICS_ENGINE: 'Analytics Engine',
  IDENTITY_ACCESS: 'Identity & Access',
  THREAT_MANAGEMENT: 'Threat Management',
  CLOUD_INFRA: 'Cloud Infrastructure',
  ON_PREM_INFRA: 'On-Prem Infrastructure',
  ERP: 'ERP',
  CRM: 'CRM',
});

export const PORTFOLIO_LIST = Object.freeze(Object.values(PORTFOLIOS));

// ---------------------------------------------------------------------------
// Application Names
// ---------------------------------------------------------------------------
export const APPLICATIONS = Object.freeze({
  GENERAL_LEDGER: 'General Ledger',
  PAYROLL_SYSTEM: 'Payroll System',
  TALENT_MANAGEMENT: 'Talent Management',
  CONTRACT_MANAGER: 'Contract Manager',
  CAMPAIGN_HUB: 'Campaign Hub',
  NETWORK_MONITOR: 'Network Monitor',
  HEALTH_DASHBOARD: 'Health Dashboard',
  CUSTOMER_WEB: 'Customer Web Portal',
  MOBILE_IOS: 'Mobile iOS App',
  MOBILE_ANDROID: 'Mobile Android App',
  DATA_LAKE: 'Data Lake',
  BI_REPORTS: 'BI Reports',
  SSO_GATEWAY: 'SSO Gateway',
  SIEM_PLATFORM: 'SIEM Platform',
  CLOUD_ORCHESTRATOR: 'Cloud Orchestrator',
  VM_MANAGER: 'VM Manager',
  SAP_CORE: 'SAP Core',
  SALESFORCE_CRM: 'Salesforce CRM',
});

export const APPLICATION_LIST = Object.freeze(Object.values(APPLICATIONS));

// ---------------------------------------------------------------------------
// Criticality Tiers
// ---------------------------------------------------------------------------
export const CRITICALITY_TIERS = Object.freeze({
  BUSINESS_CRITICAL: 'Business-critical',
  MISSION_CRITICAL: 'Mission-critical',
  BUSINESS_OPERATIONAL: 'Business Operational',
  ADMIN_SERVICES: 'Admin Services',
});

export const CRITICALITY_TIER_LIST = Object.freeze(Object.values(CRITICALITY_TIERS));

// ---------------------------------------------------------------------------
// Environment Types
// ---------------------------------------------------------------------------
export const ENVIRONMENTS = Object.freeze({
  PROD: 'Prod',
  PRE_PROD: 'Pre-Prod',
  UAT: 'UAT',
  QA: 'QA',
  DEV: 'Dev',
});

export const ENVIRONMENT_LIST = Object.freeze(Object.values(ENVIRONMENTS));

// ---------------------------------------------------------------------------
// RBAC Roles
// ---------------------------------------------------------------------------
export const ROLES = Object.freeze({
  ADMIN: 'Admin',
  AUDITOR: 'Auditor',
  ENGINEER: 'Engineer',
  OWNER: 'Owner',
  EXECUTIVE: 'Executive',
});

export const ROLE_LIST = Object.freeze(Object.values(ROLES));

// ---------------------------------------------------------------------------
// Toolchain Categories & Tools
// ---------------------------------------------------------------------------
export const TOOLCHAIN_CATEGORIES = Object.freeze({
  SOURCE_CONTROL: 'Source Control',
  CI_CD: 'CI/CD',
  ARTIFACT_MANAGEMENT: 'Artifact Management',
  CONTAINERIZATION: 'Containerization',
  SECURITY_SCANNING: 'Security Scanning',
  MONITORING: 'Monitoring',
  LOGGING: 'Logging',
  ITSM: 'ITSM',
  COLLABORATION: 'Collaboration',
  TESTING: 'Testing',
});

export const TOOLCHAIN_CATEGORY_LIST = Object.freeze(Object.values(TOOLCHAIN_CATEGORIES));

export const TOOLS = Object.freeze({
  // Source Control
  GITHUB: 'GitHub',
  GITLAB: 'GitLab',
  BITBUCKET: 'Bitbucket',

  // CI/CD
  JENKINS: 'Jenkins',
  GITHUB_ACTIONS: 'GitHub Actions',
  GITLAB_CI: 'GitLab CI',
  AZURE_DEVOPS: 'Azure DevOps',

  // Artifact Management
  ARTIFACTORY: 'JFrog Artifactory',
  NEXUS: 'Nexus Repository',

  // Containerization
  DOCKER: 'Docker',
  KUBERNETES: 'Kubernetes',
  OPENSHIFT: 'OpenShift',

  // Security Scanning
  SONARQUBE: 'SonarQube',
  CHECKMARX: 'Checkmarx',
  SNYK: 'Snyk',
  TWISTLOCK: 'Twistlock',
  BLACK_DUCK: 'Black Duck',
  FORTIFY: 'Fortify',

  // Monitoring
  DYNATRACE: 'Dynatrace',
  DATADOG: 'Datadog',
  PROMETHEUS: 'Prometheus',
  GRAFANA: 'Grafana',

  // Logging
  SPLUNK: 'Splunk',
  ELASTIC: 'Elastic',
  ELK_STACK: 'ELK Stack',

  // ITSM
  SERVICENOW: 'ServiceNow',
  JIRA: 'Jira',

  // Collaboration
  CONFLUENCE: 'Confluence',
  TEAMS: 'Microsoft Teams',
  SLACK: 'Slack',

  // Testing
  SELENIUM: 'Selenium',
  CYPRESS: 'Cypress',
  JUNIT: 'JUnit',
});

export const TOOL_LIST = Object.freeze(Object.values(TOOLS));

export const TOOLS_BY_CATEGORY = Object.freeze({
  [TOOLCHAIN_CATEGORIES.SOURCE_CONTROL]: [TOOLS.GITHUB, TOOLS.GITLAB, TOOLS.BITBUCKET],
  [TOOLCHAIN_CATEGORIES.CI_CD]: [
    TOOLS.JENKINS,
    TOOLS.GITHUB_ACTIONS,
    TOOLS.GITLAB_CI,
    TOOLS.AZURE_DEVOPS,
  ],
  [TOOLCHAIN_CATEGORIES.ARTIFACT_MANAGEMENT]: [TOOLS.ARTIFACTORY, TOOLS.NEXUS],
  [TOOLCHAIN_CATEGORIES.CONTAINERIZATION]: [TOOLS.DOCKER, TOOLS.KUBERNETES, TOOLS.OPENSHIFT],
  [TOOLCHAIN_CATEGORIES.SECURITY_SCANNING]: [
    TOOLS.SONARQUBE,
    TOOLS.CHECKMARX,
    TOOLS.SNYK,
    TOOLS.TWISTLOCK,
    TOOLS.BLACK_DUCK,
    TOOLS.FORTIFY,
  ],
  [TOOLCHAIN_CATEGORIES.MONITORING]: [
    TOOLS.DYNATRACE,
    TOOLS.DATADOG,
    TOOLS.PROMETHEUS,
    TOOLS.GRAFANA,
  ],
  [TOOLCHAIN_CATEGORIES.LOGGING]: [TOOLS.SPLUNK, TOOLS.ELASTIC, TOOLS.ELK_STACK],
  [TOOLCHAIN_CATEGORIES.ITSM]: [TOOLS.SERVICENOW, TOOLS.JIRA],
  [TOOLCHAIN_CATEGORIES.COLLABORATION]: [TOOLS.CONFLUENCE, TOOLS.TEAMS, TOOLS.SLACK],
  [TOOLCHAIN_CATEGORIES.TESTING]: [TOOLS.SELENIUM, TOOLS.CYPRESS, TOOLS.JUNIT],
});

// ---------------------------------------------------------------------------
// Pipeline Stage Definitions
// ---------------------------------------------------------------------------
export const PIPELINE_STAGES = Object.freeze({
  SOURCE: 'Source',
  BUILD: 'Build',
  UNIT_TEST: 'Unit Test',
  SAST: 'SAST',
  SCA: 'SCA',
  ARTIFACT_PUBLISH: 'Artifact Publish',
  CONTAINER_BUILD: 'Container Build',
  CONTAINER_SCAN: 'Container Scan',
  DEPLOY_DEV: 'Deploy Dev',
  INTEGRATION_TEST: 'Integration Test',
  DEPLOY_QA: 'Deploy QA',
  DAST: 'DAST',
  PERFORMANCE_TEST: 'Performance Test',
  DEPLOY_UAT: 'Deploy UAT',
  UAT_SIGN_OFF: 'UAT Sign-Off',
  DEPLOY_PRE_PROD: 'Deploy Pre-Prod',
  SMOKE_TEST: 'Smoke Test',
  DEPLOY_PROD: 'Deploy Prod',
  POST_DEPLOY_VALIDATION: 'Post-Deploy Validation',
});

export const PIPELINE_STAGE_LIST = Object.freeze(Object.values(PIPELINE_STAGES));

export const PIPELINE_STAGE_ORDER = Object.freeze(
  PIPELINE_STAGE_LIST.map((stage, index) => ({ stage, order: index + 1 })),
);

// ---------------------------------------------------------------------------
// Pipeline Status
// ---------------------------------------------------------------------------
export const PIPELINE_STATUSES = Object.freeze({
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  SKIPPED: 'Skipped',
  CANCELLED: 'Cancelled',
});

export const PIPELINE_STATUS_LIST = Object.freeze(Object.values(PIPELINE_STATUSES));

// ---------------------------------------------------------------------------
// KPI Metric Keys
// ---------------------------------------------------------------------------
export const KPI_METRICS = Object.freeze({
  DEPLOYMENT_FREQUENCY: 'deployment_frequency',
  LEAD_TIME_FOR_CHANGES: 'lead_time_for_changes',
  CHANGE_FAILURE_RATE: 'change_failure_rate',
  MEAN_TIME_TO_RECOVERY: 'mean_time_to_recovery',
  PIPELINE_SUCCESS_RATE: 'pipeline_success_rate',
  PIPELINE_DURATION_AVG: 'pipeline_duration_avg',
  CODE_COVERAGE: 'code_coverage',
  VULNERABILITY_COUNT: 'vulnerability_count',
  CRITICAL_VULNERABILITY_COUNT: 'critical_vulnerability_count',
  OPEN_INCIDENTS: 'open_incidents',
  MTTR_INCIDENTS: 'mttr_incidents',
  SLA_COMPLIANCE: 'sla_compliance',
  AVAILABILITY: 'availability',
  ERROR_RATE: 'error_rate',
  RESPONSE_TIME_P95: 'response_time_p95',
  SECURITY_SCAN_PASS_RATE: 'security_scan_pass_rate',
  COMPLIANCE_SCORE: 'compliance_score',
  TECHNICAL_DEBT_HOURS: 'technical_debt_hours',
  TOIL_REDUCTION: 'toil_reduction',
  ONBOARDING_TIME: 'onboarding_time',
});

export const KPI_METRIC_LIST = Object.freeze(Object.values(KPI_METRICS));

// ---------------------------------------------------------------------------
// DORA Metrics (subset of KPI)
// ---------------------------------------------------------------------------
export const DORA_METRICS = Object.freeze({
  DEPLOYMENT_FREQUENCY: KPI_METRICS.DEPLOYMENT_FREQUENCY,
  LEAD_TIME_FOR_CHANGES: KPI_METRICS.LEAD_TIME_FOR_CHANGES,
  CHANGE_FAILURE_RATE: KPI_METRICS.CHANGE_FAILURE_RATE,
  MEAN_TIME_TO_RECOVERY: KPI_METRICS.MEAN_TIME_TO_RECOVERY,
});

export const DORA_METRIC_LIST = Object.freeze(Object.values(DORA_METRICS));

// ---------------------------------------------------------------------------
// Compliance Artifact Types
// ---------------------------------------------------------------------------
export const COMPLIANCE_ARTIFACT_TYPES = Object.freeze({
  SAST_REPORT: 'SAST Report',
  DAST_REPORT: 'DAST Report',
  SCA_REPORT: 'SCA Report',
  CONTAINER_SCAN_REPORT: 'Container Scan Report',
  PENETRATION_TEST: 'Penetration Test',
  RISK_ASSESSMENT: 'Risk Assessment',
  CHANGE_REQUEST: 'Change Request',
  APPROVAL_RECORD: 'Approval Record',
  AUDIT_LOG: 'Audit Log',
  DEPLOYMENT_MANIFEST: 'Deployment Manifest',
  ARCHITECTURE_DIAGRAM: 'Architecture Diagram',
  RUNBOOK: 'Runbook',
  DISASTER_RECOVERY_PLAN: 'Disaster Recovery Plan',
  SLA_DOCUMENT: 'SLA Document',
  COMPLIANCE_CHECKLIST: 'Compliance Checklist',
  EVIDENCE_PACKAGE: 'Evidence Package',
});

export const COMPLIANCE_ARTIFACT_TYPE_LIST = Object.freeze(
  Object.values(COMPLIANCE_ARTIFACT_TYPES),
);

// ---------------------------------------------------------------------------
// Compliance Statuses
// ---------------------------------------------------------------------------
export const COMPLIANCE_STATUSES = Object.freeze({
  COMPLIANT: 'Compliant',
  NON_COMPLIANT: 'Non-Compliant',
  PARTIAL: 'Partial',
  PENDING_REVIEW: 'Pending Review',
  NOT_APPLICABLE: 'Not Applicable',
});

export const COMPLIANCE_STATUS_LIST = Object.freeze(Object.values(COMPLIANCE_STATUSES));

// ---------------------------------------------------------------------------
// localStorage Keys
// ---------------------------------------------------------------------------
export const LOCAL_STORAGE_KEYS = Object.freeze({
  AUTH_TOKEN: 'horizon_auth_token',
  AUTH_USER: 'horizon_auth_user',
  THEME: 'horizon_theme',
  SIDEBAR_COLLAPSED: 'horizon_sidebar_collapsed',
  SELECTED_DOMAIN: 'horizon_selected_domain',
  SELECTED_PORTFOLIO: 'horizon_selected_portfolio',
  SELECTED_APPLICATION: 'horizon_selected_application',
  SELECTED_ENVIRONMENT: 'horizon_selected_environment',
  DASHBOARD_LAYOUT: 'horizon_dashboard_layout',
  TABLE_PAGE_SIZE: 'horizon_table_page_size',
  RECENT_SEARCHES: 'horizon_recent_searches',
  FILTERS: 'horizon_filters',
  USER_PREFERENCES: 'horizon_user_preferences',
  NOTIFICATION_DISMISSED: 'horizon_notification_dismissed',
});

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
export const THEMES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
});

export const THEME_LIST = Object.freeze(Object.values(THEMES));

// ---------------------------------------------------------------------------
// Pagination Defaults
// ---------------------------------------------------------------------------
export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
});

// ---------------------------------------------------------------------------
// Severity Levels
// ---------------------------------------------------------------------------
export const SEVERITY_LEVELS = Object.freeze({
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFO: 'Info',
});

export const SEVERITY_LEVEL_LIST = Object.freeze(Object.values(SEVERITY_LEVELS));

// ---------------------------------------------------------------------------
// Date / Time Formats
// ---------------------------------------------------------------------------
export const DATE_FORMATS = Object.freeze({
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
  TIME_ONLY: 'HH:mm:ss',
});

// ---------------------------------------------------------------------------
// API Endpoints (relative paths)
// ---------------------------------------------------------------------------
export const API_ENDPOINTS = Object.freeze({
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  USERS: '/users',
  DOMAINS: '/domains',
  PORTFOLIOS: '/portfolios',
  APPLICATIONS: '/applications',
  PIPELINES: '/pipelines',
  DEPLOYMENTS: '/deployments',
  METRICS: '/metrics',
  KPI: '/kpi',
  COMPLIANCE: '/compliance',
  ARTIFACTS: '/artifacts',
  INCIDENTS: '/incidents',
  AUDIT_LOGS: '/audit-logs',
  NOTIFICATIONS: '/notifications',
  REPORTS: '/reports',
});