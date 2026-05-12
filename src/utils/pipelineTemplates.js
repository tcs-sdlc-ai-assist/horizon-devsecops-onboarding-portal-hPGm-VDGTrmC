/**
 * Pipeline template definitions for Horizon DevSecOps Portal
 * Provides Golden Pipeline template with stages, tools, config,
 * and policy-as-code rules. Supports Jenkins, OpenShift, GitOps configurations.
 * @module utils/pipelineTemplates
 */

import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LIST,
  TOOLS,
  TOOLCHAIN_CATEGORIES,
  ENVIRONMENTS,
  CRITICALITY_TIERS,
} from '../constants/constants.js';

// ---------------------------------------------------------------------------
// Stage Type Definitions
// ---------------------------------------------------------------------------

/**
 * Pipeline stage types for categorisation.
 * @readonly
 * @enum {string}
 */
export const STAGE_TYPES = Object.freeze({
  SOURCE: 'source',
  BUILD: 'build',
  TEST: 'test',
  SECURITY: 'security',
  ARTIFACT: 'artifact',
  DEPLOY: 'deploy',
  APPROVAL: 'approval',
  OBSERVABILITY: 'observability',
  VALIDATION: 'validation',
});

// ---------------------------------------------------------------------------
// Policy Severity Levels
// ---------------------------------------------------------------------------

/**
 * Policy enforcement levels.
 * @readonly
 * @enum {string}
 */
export const POLICY_ENFORCEMENT = Object.freeze({
  BLOCK: 'block',
  WARN: 'warn',
  INFO: 'info',
});

// ---------------------------------------------------------------------------
// CI/CD Platform Configurations
// ---------------------------------------------------------------------------

/**
 * Supported CI/CD platform identifiers.
 * @readonly
 * @enum {string}
 */
export const CICD_PLATFORMS = Object.freeze({
  JENKINS: 'jenkins',
  OPENSHIFT: 'openshift',
  GITOPS: 'gitops',
  GITHUB_ACTIONS: 'github_actions',
  GITLAB_CI: 'gitlab_ci',
});

// ---------------------------------------------------------------------------
// Golden Pipeline Stage Definitions
// ---------------------------------------------------------------------------

/**
 * Complete set of Golden Pipeline stage definitions.
 * Each stage includes name, type, tools, config, and policy-as-code rules.
 * @type {Array<Object>}
 */
const GOLDEN_PIPELINE_STAGES = Object.freeze([
  {
    id: 'source',
    name: PIPELINE_STAGES.SOURCE,
    order: 1,
    type: STAGE_TYPES.SOURCE,
    description: 'Source code checkout and branch validation.',
    tools: [TOOLS.GITHUB, TOOLS.GITLAB, TOOLS.BITBUCKET],
    config: {
      defaultBranch: 'main',
      branchProtection: true,
      requirePrReviews: true,
      minReviewers: 1,
      signedCommits: false,
      shallowClone: true,
      fetchDepth: 1,
    },
    policyRules: [
      {
        id: 'SRC-001',
        name: 'Branch protection required',
        description: 'Main branch must have branch protection rules enabled.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'branch_protection === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'SRC-002',
        name: 'Pull request review required',
        description: 'All changes must go through a pull request with at least one reviewer.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'pr_reviews >= 1',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
      {
        id: 'SRC-003',
        name: 'Signed commits recommended',
        description: 'Commits should be GPG-signed for auditability.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'signed_commits === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 5,
  },
  {
    id: 'build',
    name: PIPELINE_STAGES.BUILD,
    order: 2,
    type: STAGE_TYPES.BUILD,
    description: 'Compile source code and resolve dependencies.',
    tools: [TOOLS.JENKINS, TOOLS.GITHUB_ACTIONS, TOOLS.GITLAB_CI, TOOLS.AZURE_DEVOPS],
    config: {
      cacheEnabled: true,
      parallelBuild: true,
      buildArgs: {},
      reproducibleBuild: false,
      maxRetries: 1,
    },
    policyRules: [
      {
        id: 'BLD-001',
        name: 'Build must complete within timeout',
        description: 'Build stage must complete within the configured timeout period.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'duration_minutes <= timeout_minutes',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
      {
        id: 'BLD-002',
        name: 'No compiler warnings for critical apps',
        description: 'Business-critical applications must have zero compiler warnings.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'compiler_warnings === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 15,
  },
  {
    id: 'unit-test',
    name: PIPELINE_STAGES.UNIT_TEST,
    order: 3,
    type: STAGE_TYPES.TEST,
    description: 'Execute unit tests and collect code coverage metrics.',
    tools: [TOOLS.JUNIT, TOOLS.CYPRESS, TOOLS.SELENIUM],
    config: {
      coverageEnabled: true,
      coverageThreshold: 80,
      failOnCoverageDecrease: true,
      parallelExecution: true,
      reportFormat: 'junit',
      testResultsPath: 'test-results/',
    },
    policyRules: [
      {
        id: 'UT-001',
        name: 'Minimum code coverage',
        description: 'Code coverage must meet the minimum threshold.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'code_coverage >= 80',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'UT-002',
        name: 'No test failures allowed',
        description: 'All unit tests must pass before proceeding.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'test_failures === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
      {
        id: 'UT-003',
        name: 'Coverage must not decrease',
        description: 'Code coverage must not decrease from the previous build.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'coverage_delta >= 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 15,
  },
  {
    id: 'sast',
    name: PIPELINE_STAGES.SAST,
    order: 4,
    type: STAGE_TYPES.SECURITY,
    description: 'Static Application Security Testing to identify vulnerabilities in source code.',
    tools: [TOOLS.SONARQUBE, TOOLS.CHECKMARX, TOOLS.FORTIFY],
    config: {
      scanType: 'full',
      incremental: false,
      failOnSeverity: 'critical',
      excludePatterns: ['**/test/**', '**/vendor/**', '**/node_modules/**'],
      qualityGate: 'Sonar way',
      reportFormat: 'sarif',
    },
    policyRules: [
      {
        id: 'SAST-001',
        name: 'No critical vulnerabilities',
        description: 'No critical severity vulnerabilities allowed in SAST scan results.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'critical_findings === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
      {
        id: 'SAST-002',
        name: 'No high vulnerabilities for critical apps',
        description: 'Business-critical applications must have zero high severity findings.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'high_findings === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL],
      },
      {
        id: 'SAST-003',
        name: 'Quality gate must pass',
        description: 'SonarQube quality gate must pass for the project.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'quality_gate_status === "passed"',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'SAST-004',
        name: 'Medium findings threshold',
        description: 'Medium severity findings should not exceed threshold.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'medium_findings <= 10',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 30,
  },
  {
    id: 'sca',
    name: PIPELINE_STAGES.SCA,
    order: 5,
    type: STAGE_TYPES.SECURITY,
    description: 'Software Composition Analysis to identify vulnerabilities in third-party dependencies.',
    tools: [TOOLS.SNYK, TOOLS.BLACK_DUCK],
    config: {
      scanType: 'full',
      failOnSeverity: 'high',
      licenseCheck: true,
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
      blockedLicenses: ['GPL-3.0', 'AGPL-3.0'],
      monitorOnBuild: true,
      policyPath: '.snyk',
    },
    policyRules: [
      {
        id: 'SCA-001',
        name: 'No critical dependency vulnerabilities',
        description: 'No critical severity vulnerabilities in third-party dependencies.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'critical_findings === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
      {
        id: 'SCA-002',
        name: 'License compliance',
        description: 'All dependencies must use approved licenses.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'blocked_licenses_found === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'SCA-003',
        name: 'No high dependency vulnerabilities for critical apps',
        description: 'Business-critical applications must have zero high severity dependency findings.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'high_findings === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL],
      },
      {
        id: 'SCA-004',
        name: 'Outdated dependencies warning',
        description: 'Dependencies with available patches should be updated.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'patchable_findings <= 5',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 15,
  },
  {
    id: 'artifact-publish',
    name: PIPELINE_STAGES.ARTIFACT_PUBLISH,
    order: 6,
    type: STAGE_TYPES.ARTIFACT,
    description: 'Publish build artifacts to the artifact repository.',
    tools: [TOOLS.ARTIFACTORY, TOOLS.NEXUS],
    config: {
      repositoryType: 'release',
      versionStrategy: 'semver',
      retentionDays: 90,
      checksumValidation: true,
      signArtifacts: false,
      immutableArtifacts: true,
    },
    policyRules: [
      {
        id: 'ART-001',
        name: 'Artifact integrity validation',
        description: 'Published artifacts must pass checksum validation.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'checksum_valid === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
      {
        id: 'ART-002',
        name: 'Immutable artifacts for production',
        description: 'Artifacts published for production must be immutable.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'immutable === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 10,
  },
  {
    id: 'container-build',
    name: PIPELINE_STAGES.CONTAINER_BUILD,
    order: 7,
    type: STAGE_TYPES.BUILD,
    description: 'Build container image from Dockerfile or Containerfile.',
    tools: [TOOLS.DOCKER, TOOLS.KUBERNETES, TOOLS.OPENSHIFT],
    config: {
      dockerfilePath: 'Dockerfile',
      buildContext: '.',
      multiStage: true,
      tagStrategy: 'semver',
      baseImageAllowList: [],
      noCache: false,
      squash: false,
      labels: {
        maintainer: '',
        version: '',
        buildDate: '',
        commitSha: '',
      },
    },
    policyRules: [
      {
        id: 'CTR-001',
        name: 'Approved base images only',
        description: 'Container images must use approved base images from the allow list.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'base_image_approved === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'CTR-002',
        name: 'Multi-stage build required',
        description: 'Container builds must use multi-stage Dockerfiles to minimize image size.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'multi_stage === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'CTR-003',
        name: 'Image must be labelled',
        description: 'Container images must include standard labels for traceability.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'labels_present === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
    ],
    required: true,
    timeoutMinutes: 15,
  },
  {
    id: 'container-scan',
    name: PIPELINE_STAGES.CONTAINER_SCAN,
    order: 8,
    type: STAGE_TYPES.SECURITY,
    description: 'Scan container image for vulnerabilities and compliance issues.',
    tools: [TOOLS.TWISTLOCK, TOOLS.SNYK],
    config: {
      complianceThreshold: 'high',
      vulnerabilityThreshold: 'critical',
      blockOnFailure: true,
      scanLayers: true,
      checkMalware: true,
      reportFormat: 'sarif',
    },
    policyRules: [
      {
        id: 'CSCAN-001',
        name: 'No critical container vulnerabilities',
        description: 'Container images must have zero critical vulnerabilities.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'critical_findings === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
      {
        id: 'CSCAN-002',
        name: 'Compliance check passed',
        description: 'Container image must pass compliance checks.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'compliance_passed === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'CSCAN-003',
        name: 'No malware detected',
        description: 'Container image must be free of malware.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'malware_detected === false',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
    ],
    required: true,
    timeoutMinutes: 15,
  },
  {
    id: 'deploy-dev',
    name: PIPELINE_STAGES.DEPLOY_DEV,
    order: 9,
    type: STAGE_TYPES.DEPLOY,
    description: 'Deploy application to the development environment.',
    tools: [TOOLS.KUBERNETES, TOOLS.OPENSHIFT, TOOLS.JENKINS],
    config: {
      environment: ENVIRONMENTS.DEV,
      deploymentStrategy: 'rolling',
      autoRollback: true,
      healthCheckEnabled: true,
      healthCheckPath: '/health',
      healthCheckTimeoutSeconds: 60,
      replicaCount: 1,
      resourceLimits: {
        cpu: '500m',
        memory: '512Mi',
      },
    },
    policyRules: [
      {
        id: 'DDEV-001',
        name: 'Health check must pass',
        description: 'Application health check must pass after deployment.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'health_check_passed === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
    ],
    required: true,
    timeoutMinutes: 10,
  },
  {
    id: 'integration-test',
    name: PIPELINE_STAGES.INTEGRATION_TEST,
    order: 10,
    type: STAGE_TYPES.TEST,
    description: 'Execute integration tests against the deployed application.',
    tools: [TOOLS.SELENIUM, TOOLS.CYPRESS, TOOLS.JUNIT],
    config: {
      environment: ENVIRONMENTS.DEV,
      parallelExecution: true,
      retries: 1,
      reportFormat: 'junit',
      testSuites: ['smoke', 'integration'],
      timeoutPerTestSeconds: 120,
    },
    policyRules: [
      {
        id: 'INT-001',
        name: 'All integration tests must pass',
        description: 'All integration test suites must pass before promotion.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'test_failures === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
      {
        id: 'INT-002',
        name: 'Integration test coverage',
        description: 'Integration tests must cover all critical API endpoints.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'api_coverage >= 90',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 30,
  },
  {
    id: 'deploy-qa',
    name: PIPELINE_STAGES.DEPLOY_QA,
    order: 11,
    type: STAGE_TYPES.DEPLOY,
    description: 'Deploy application to the QA environment for further testing.',
    tools: [TOOLS.KUBERNETES, TOOLS.OPENSHIFT, TOOLS.JENKINS],
    config: {
      environment: ENVIRONMENTS.QA,
      deploymentStrategy: 'rolling',
      autoRollback: true,
      healthCheckEnabled: true,
      healthCheckPath: '/health',
      healthCheckTimeoutSeconds: 60,
      replicaCount: 2,
      resourceLimits: {
        cpu: '1000m',
        memory: '1Gi',
      },
    },
    policyRules: [
      {
        id: 'DQA-001',
        name: 'Health check must pass',
        description: 'Application health check must pass after QA deployment.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'health_check_passed === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
    ],
    required: true,
    timeoutMinutes: 10,
  },
  {
    id: 'dast',
    name: PIPELINE_STAGES.DAST,
    order: 12,
    type: STAGE_TYPES.SECURITY,
    description: 'Dynamic Application Security Testing against the running application.',
    tools: [TOOLS.CHECKMARX, TOOLS.FORTIFY],
    config: {
      targetEnvironment: ENVIRONMENTS.QA,
      scanType: 'full',
      authEnabled: true,
      crawlDepth: 5,
      maxScanDurationMinutes: 60,
      excludeUrls: ['/health', '/metrics', '/ready'],
      reportFormat: 'sarif',
    },
    policyRules: [
      {
        id: 'DAST-001',
        name: 'No critical DAST findings',
        description: 'No critical severity findings from DAST scan.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'critical_findings === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'DAST-002',
        name: 'No high DAST findings for critical apps',
        description: 'Business-critical applications must have zero high severity DAST findings.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'high_findings === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL],
      },
      {
        id: 'DAST-003',
        name: 'OWASP Top 10 compliance',
        description: 'Application must not have OWASP Top 10 vulnerabilities.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'owasp_top10_findings === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 60,
  },
  {
    id: 'qe-automation',
    name: PIPELINE_STAGES.PERFORMANCE_TEST,
    order: 13,
    type: STAGE_TYPES.TEST,
    description: 'QE automation including performance, load, and regression testing.',
    tools: [TOOLS.SELENIUM, TOOLS.CYPRESS, TOOLS.JUNIT],
    config: {
      environment: ENVIRONMENTS.QA,
      testTypes: ['performance', 'load', 'regression'],
      virtualUsers: 100,
      rampUpMinutes: 5,
      durationMinutes: 30,
      slaThresholds: {
        avgResponseTimeMs: 2000,
        p95ResponseTimeMs: 5000,
        errorRatePercent: 1,
        throughputPerSec: 100,
      },
      reportFormat: 'junit',
    },
    policyRules: [
      {
        id: 'QE-001',
        name: 'Performance SLA compliance',
        description: 'Application must meet performance SLA thresholds.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'avg_response_time_ms <= 2000 && error_rate_percent <= 1',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'QE-002',
        name: 'P95 response time threshold',
        description: 'P95 response time must be within acceptable limits.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'p95_response_time_ms <= 5000',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'QE-003',
        name: 'Regression tests must pass',
        description: 'All regression test suites must pass.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'regression_failures === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
    ],
    required: false,
    timeoutMinutes: 45,
  },
  {
    id: 'deploy-uat',
    name: PIPELINE_STAGES.DEPLOY_UAT,
    order: 14,
    type: STAGE_TYPES.DEPLOY,
    description: 'Deploy application to the UAT environment for user acceptance testing.',
    tools: [TOOLS.KUBERNETES, TOOLS.OPENSHIFT, TOOLS.JENKINS],
    config: {
      environment: ENVIRONMENTS.UAT,
      deploymentStrategy: 'blue-green',
      autoRollback: true,
      healthCheckEnabled: true,
      healthCheckPath: '/health',
      healthCheckTimeoutSeconds: 120,
      replicaCount: 2,
      resourceLimits: {
        cpu: '1000m',
        memory: '1Gi',
      },
    },
    policyRules: [
      {
        id: 'DUAT-001',
        name: 'Health check must pass',
        description: 'Application health check must pass after UAT deployment.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'health_check_passed === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
    ],
    required: true,
    timeoutMinutes: 15,
  },
  {
    id: 'uat-sign-off',
    name: PIPELINE_STAGES.UAT_SIGN_OFF,
    order: 15,
    type: STAGE_TYPES.APPROVAL,
    description: 'Manual approval gate for UAT sign-off before production promotion.',
    tools: [TOOLS.SERVICENOW, TOOLS.JIRA],
    config: {
      approvalType: 'manual',
      requiredApprovers: 1,
      approverRoles: ['Owner', 'Admin'],
      timeoutHours: 72,
      notifyOnPending: true,
      notificationChannels: ['email', 'teams'],
      changeRequestRequired: true,
      changeModel: 'standard',
    },
    policyRules: [
      {
        id: 'UAT-001',
        name: 'UAT sign-off required',
        description: 'UAT must be signed off by an authorized approver before production deployment.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'approval_status === "approved"',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
      {
        id: 'UAT-002',
        name: 'Change request required for production',
        description: 'A ServiceNow change request must be created and approved.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'change_request_approved === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'UAT-003',
        name: 'Minimum approvers for critical apps',
        description: 'Business-critical applications require at least 2 approvers.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'approver_count >= 2',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 4320, // 72 hours
  },
  {
    id: 'deploy-pre-prod',
    name: PIPELINE_STAGES.DEPLOY_PRE_PROD,
    order: 16,
    type: STAGE_TYPES.DEPLOY,
    description: 'Deploy application to the pre-production environment for final validation.',
    tools: [TOOLS.KUBERNETES, TOOLS.OPENSHIFT, TOOLS.JENKINS],
    config: {
      environment: ENVIRONMENTS.PRE_PROD,
      deploymentStrategy: 'blue-green',
      autoRollback: true,
      healthCheckEnabled: true,
      healthCheckPath: '/health',
      healthCheckTimeoutSeconds: 120,
      replicaCount: 3,
      resourceLimits: {
        cpu: '2000m',
        memory: '2Gi',
      },
    },
    policyRules: [
      {
        id: 'DPP-001',
        name: 'Health check must pass',
        description: 'Application health check must pass after pre-prod deployment.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'health_check_passed === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
    ],
    required: true,
    timeoutMinutes: 15,
  },
  {
    id: 'smoke-test',
    name: PIPELINE_STAGES.SMOKE_TEST,
    order: 17,
    type: STAGE_TYPES.VALIDATION,
    description: 'Execute smoke tests to validate core functionality in pre-production.',
    tools: [TOOLS.SELENIUM, TOOLS.CYPRESS],
    config: {
      environment: ENVIRONMENTS.PRE_PROD,
      testSuites: ['smoke', 'critical-path'],
      retries: 2,
      timeoutPerTestSeconds: 60,
      reportFormat: 'junit',
    },
    policyRules: [
      {
        id: 'SMK-001',
        name: 'All smoke tests must pass',
        description: 'All smoke tests must pass before production deployment.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'test_failures === 0',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
    ],
    required: true,
    timeoutMinutes: 15,
  },
  {
    id: 'deploy-prod',
    name: PIPELINE_STAGES.DEPLOY_PROD,
    order: 18,
    type: STAGE_TYPES.DEPLOY,
    description: 'Deploy application to the production environment.',
    tools: [TOOLS.KUBERNETES, TOOLS.OPENSHIFT, TOOLS.JENKINS],
    config: {
      environment: ENVIRONMENTS.PROD,
      deploymentStrategy: 'blue-green',
      autoRollback: true,
      healthCheckEnabled: true,
      healthCheckPath: '/health',
      healthCheckTimeoutSeconds: 180,
      replicaCount: 3,
      canaryPercentage: 10,
      canaryDurationMinutes: 15,
      resourceLimits: {
        cpu: '2000m',
        memory: '2Gi',
      },
      maintenanceWindow: {
        enabled: false,
        dayOfWeek: 'Saturday',
        startHour: 22,
        endHour: 6,
      },
    },
    policyRules: [
      {
        id: 'DPRD-001',
        name: 'Health check must pass',
        description: 'Application health check must pass after production deployment.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'health_check_passed === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL, CRITICALITY_TIERS.ADMIN_SERVICES],
      },
      {
        id: 'DPRD-002',
        name: 'Deployment within maintenance window',
        description: 'Production deployments for critical apps should occur within maintenance windows.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'within_maintenance_window === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL],
      },
      {
        id: 'DPRD-003',
        name: 'Rollback plan documented',
        description: 'A rollback plan must be documented before production deployment.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'rollback_plan_exists === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 30,
  },
  {
    id: 'observability-hooks',
    name: PIPELINE_STAGES.POST_DEPLOY_VALIDATION,
    order: 19,
    type: STAGE_TYPES.OBSERVABILITY,
    description: 'Post-deployment observability validation including monitoring, logging, and alerting verification.',
    tools: [TOOLS.DYNATRACE, TOOLS.PROMETHEUS, TOOLS.GRAFANA, TOOLS.SPLUNK, TOOLS.ELASTIC, TOOLS.DATADOG],
    config: {
      environment: ENVIRONMENTS.PROD,
      validationDurationMinutes: 15,
      checks: {
        monitoringEnabled: true,
        loggingEnabled: true,
        alertingEnabled: true,
        dashboardExists: true,
        sloConfigured: true,
      },
      thresholds: {
        errorRatePercent: 1,
        responseTimeP95Ms: 500,
        availabilityPercent: 99.9,
        cpuUtilizationPercent: 80,
        memoryUtilizationPercent: 85,
      },
      deploymentMarker: true,
      notifyOnAnomaly: true,
      notificationChannels: ['email', 'teams', 'slack'],
    },
    policyRules: [
      {
        id: 'OBS-001',
        name: 'Monitoring must be active',
        description: 'Application monitoring must be active and reporting metrics post-deployment.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'monitoring_active === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
      {
        id: 'OBS-002',
        name: 'Error rate within threshold',
        description: 'Post-deployment error rate must be within acceptable threshold.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'error_rate_percent <= 1',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'OBS-003',
        name: 'Logging pipeline active',
        description: 'Application logs must be flowing to the centralized logging platform.',
        enforcement: POLICY_ENFORCEMENT.BLOCK,
        condition: 'logging_active === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL, CRITICALITY_TIERS.BUSINESS_OPERATIONAL],
      },
      {
        id: 'OBS-004',
        name: 'Alerting configured',
        description: 'Alerting rules must be configured for the application.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'alerting_configured === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
      {
        id: 'OBS-005',
        name: 'SLO configured',
        description: 'Service Level Objectives must be configured for production applications.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'slo_configured === true',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL],
      },
      {
        id: 'OBS-006',
        name: 'Response time within threshold',
        description: 'Post-deployment P95 response time must be within acceptable threshold.',
        enforcement: POLICY_ENFORCEMENT.WARN,
        condition: 'response_time_p95_ms <= 500',
        appliesTo: [CRITICALITY_TIERS.BUSINESS_CRITICAL, CRITICALITY_TIERS.MISSION_CRITICAL],
      },
    ],
    required: true,
    timeoutMinutes: 20,
  },
]);

// ---------------------------------------------------------------------------
// Platform-Specific Configurations
// ---------------------------------------------------------------------------

/**
 * Jenkins-specific pipeline configuration.
 * @type {Object}
 */
const JENKINS_CONFIG = Object.freeze({
  platform: CICD_PLATFORMS.JENKINS,
  name: 'Jenkins Declarative Pipeline',
  description: 'Jenkins declarative pipeline configuration with shared libraries and agent management.',
  config: {
    pipelineType: 'declarative',
    jenkinsfileLocation: 'Jenkinsfile',
    sharedLibraries: ['horizon-pipeline-lib@main'],
    agentLabel: 'kubernetes',
    agentImage: 'horizon/build-agent:latest',
    credentialsBindings: [
      { type: 'usernamePassword', id: 'scm-credentials', variable: 'SCM_CREDS' },
      { type: 'string', id: 'sonar-token', variable: 'SONAR_TOKEN' },
      { type: 'string', id: 'artifactory-token', variable: 'ARTIFACTORY_TOKEN' },
      { type: 'file', id: 'kubeconfig', variable: 'KUBECONFIG' },
    ],
    triggers: {
      pollScm: false,
      webhook: true,
      cron: '',
      upstream: [],
    },
    options: {
      timeout: { time: 120, unit: 'MINUTES' },
      timestamps: true,
      ansiColor: true,
      disableConcurrentBuilds: true,
      buildDiscarder: { daysToKeep: 30, numToKeep: 50 },
    },
    postActions: {
      always: ['archiveArtifacts', 'publishTestResults', 'cleanWorkspace'],
      success: ['notifySuccess'],
      failure: ['notifyFailure', 'createIncident'],
      unstable: ['notifyUnstable'],
    },
    environment: {
      JAVA_HOME: '/usr/lib/jvm/java-17',
      MAVEN_OPTS: '-Xmx1024m',
      DOCKER_BUILDKIT: '1',
    },
  },
});

/**
 * OpenShift-specific pipeline configuration.
 * @type {Object}
 */
const OPENSHIFT_CONFIG = Object.freeze({
  platform: CICD_PLATFORMS.OPENSHIFT,
  name: 'OpenShift Pipeline (Tekton)',
  description: 'OpenShift Pipelines (Tekton) configuration with BuildConfig and DeploymentConfig integration.',
  config: {
    pipelineType: 'tekton',
    pipelineRunTemplate: 'horizon-golden-pipeline',
    namespace: '',
    serviceAccount: 'pipeline',
    workspaces: [
      { name: 'shared-workspace', type: 'PersistentVolumeClaim', claimName: 'pipeline-pvc' },
      { name: 'maven-settings', type: 'ConfigMap', configMapName: 'maven-settings' },
      { name: 'docker-credentials', type: 'Secret', secretName: 'docker-registry-creds' },
    ],
    tasks: {
      cloneTask: 'git-clone',
      buildTask: 'maven-build',
      testTask: 'maven-test',
      imageTask: 'buildah',
      deployTask: 'openshift-client',
      scanTask: 'sonarqube-scanner',
    },
    buildConfig: {
      strategy: 'Docker',
      sourceType: 'Git',
      outputImageStream: '',
      triggers: ['ConfigChange', 'ImageChange'],
    },
    deploymentConfig: {
      strategy: 'Rolling',
      replicas: 2,
      triggers: ['ConfigChange', 'ImageChange'],
      readinessProbe: {
        httpGet: { path: '/health', port: 8080 },
        initialDelaySeconds: 10,
        periodSeconds: 5,
      },
      livenessProbe: {
        httpGet: { path: '/health', port: 8080 },
        initialDelaySeconds: 30,
        periodSeconds: 10,
      },
    },
    routes: {
      enabled: true,
      tls: { termination: 'edge', insecureEdgeTerminationPolicy: 'Redirect' },
    },
  },
});

/**
 * GitOps-specific pipeline configuration.
 * @type {Object}
 */
const GITOPS_CONFIG = Object.freeze({
  platform: CICD_PLATFORMS.GITOPS,
  name: 'GitOps (ArgoCD)',
  description: 'GitOps-based deployment configuration using ArgoCD for declarative continuous delivery.',
  config: {
    pipelineType: 'gitops',
    gitOpsRepo: '',
    gitOpsPath: 'environments/',
    syncPolicy: {
      automated: {
        prune: true,
        selfHeal: true,
        allowEmpty: false,
      },
      syncOptions: ['CreateNamespace=true', 'PruneLast=true'],
      retry: {
        limit: 3,
        backoff: {
          duration: '5s',
          factor: 2,
          maxDuration: '3m',
        },
      },
    },
    applicationSet: {
      enabled: true,
      generators: ['git', 'cluster'],
    },
    helmConfig: {
      enabled: true,
      chartPath: 'charts/',
      valuesFiles: {
        [ENVIRONMENTS.DEV]: 'values-dev.yaml',
        [ENVIRONMENTS.QA]: 'values-qa.yaml',
        [ENVIRONMENTS.UAT]: 'values-uat.yaml',
        [ENVIRONMENTS.PRE_PROD]: 'values-preprod.yaml',
        [ENVIRONMENTS.PROD]: 'values-prod.yaml',
      },
    },
    kustomizeConfig: {
      enabled: false,
      overlaysPath: 'overlays/',
    },
    notifications: {
      onSyncSuccess: true,
      onSyncFailure: true,
      onHealthDegraded: true,
      channels: ['slack', 'teams'],
    },
    imageUpdater: {
      enabled: true,
      strategy: 'semver',
      allowTags: 'regexp:^v[0-9]+\\.[0-9]+\\.[0-9]+$',
    },
  },
});

/**
 * Map of all platform configurations.
 * @type {Object}
 */
const PLATFORM_CONFIGS = Object.freeze({
  [CICD_PLATFORMS.JENKINS]: JENKINS_CONFIG,
  [CICD_PLATFORMS.OPENSHIFT]: OPENSHIFT_CONFIG,
  [CICD_PLATFORMS.GITOPS]: GITOPS_CONFIG,
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the complete Golden Pipeline template with all stages, configurations,
 * and policy-as-code rules.
 *
 * @param {Object} [options]
 * @param {string} [options.platform='jenkins'] - CI/CD platform identifier.
 * @param {string} [options.criticalityTier] - Application criticality tier to filter policy rules.
 * @param {boolean} [options.includeOptionalStages=true] - Whether to include optional stages.
 * @param {string[]} [options.excludeStages=[]] - Stage IDs to exclude from the template.
 * @returns {{ name: string, description: string, version: string, platform: Object, stages: Array<Object>, totalPolicyRules: number }}
 */
export const getGoldenPipelineTemplate = (options = {}) => {
  const {
    platform = CICD_PLATFORMS.JENKINS,
    criticalityTier,
    includeOptionalStages = true,
    excludeStages = [],
  } = options;

  let stages = [...GOLDEN_PIPELINE_STAGES];

  // Filter out optional stages if requested
  if (!includeOptionalStages) {
    stages = stages.filter((stage) => stage.required === true);
  }

  // Filter out excluded stages
  if (Array.isArray(excludeStages) && excludeStages.length > 0) {
    const excludeSet = new Set(excludeStages);
    stages = stages.filter((stage) => !excludeSet.has(stage.id));
  }

  // Filter policy rules by criticality tier if specified
  if (criticalityTier && typeof criticalityTier === 'string') {
    stages = stages.map((stage) => {
      const filteredRules = stage.policyRules.filter(
        (rule) => Array.isArray(rule.appliesTo) && rule.appliesTo.includes(criticalityTier),
      );
      return { ...stage, policyRules: filteredRules };
    });
  }

  // Get platform configuration
  const platformConfig = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS[CICD_PLATFORMS.JENKINS];

  // Count total policy rules
  const totalPolicyRules = stages.reduce((sum, stage) => sum + stage.policyRules.length, 0);

  return {
    name: 'Golden Pipeline',
    description:
      'Enterprise-standard CI/CD pipeline template with integrated security scanning, quality gates, approval workflows, and observability hooks.',
    version: '1.0.0',
    platform: platformConfig,
    stages,
    totalPolicyRules,
  };
};

/**
 * Get all pipeline stage definitions from the Golden Pipeline template.
 *
 * @param {Object} [options]
 * @param {string} [options.type] - Filter stages by type (e.g. 'security', 'test', 'deploy').
 * @param {boolean} [options.requiredOnly=false] - Return only required stages.
 * @param {string} [options.criticalityTier] - Filter policy rules by criticality tier.
 * @returns {Array<Object>} Array of pipeline stage definitions.
 */
export const getPipelineStages = (options = {}) => {
  const { type, requiredOnly = false, criticalityTier } = options;

  let stages = [...GOLDEN_PIPELINE_STAGES];

  // Filter by type
  if (type && typeof type === 'string') {
    stages = stages.filter((stage) => stage.type === type);
  }

  // Filter by required
  if (requiredOnly) {
    stages = stages.filter((stage) => stage.required === true);
  }

  // Filter policy rules by criticality tier
  if (criticalityTier && typeof criticalityTier === 'string') {
    stages = stages.map((stage) => {
      const filteredRules = stage.policyRules.filter(
        (rule) => Array.isArray(rule.appliesTo) && rule.appliesTo.includes(criticalityTier),
      );
      return { ...stage, policyRules: filteredRules };
    });
  }

  return stages;
};

/**
 * Get all policy-as-code rules from the Golden Pipeline template.
 *
 * @param {Object} [options]
 * @param {string} [options.stageId] - Filter rules by stage ID.
 * @param {string} [options.stageType] - Filter rules by stage type.
 * @param {string} [options.enforcement] - Filter rules by enforcement level ('block', 'warn', 'info').
 * @param {string} [options.criticalityTier] - Filter rules by criticality tier applicability.
 * @returns {Array<Object>} Array of policy rule objects with stage context.
 */
export const getPolicyRules = (options = {}) => {
  const { stageId, stageType, enforcement, criticalityTier } = options;

  let stages = [...GOLDEN_PIPELINE_STAGES];

  // Filter stages by ID
  if (stageId && typeof stageId === 'string') {
    stages = stages.filter((stage) => stage.id === stageId);
  }

  // Filter stages by type
  if (stageType && typeof stageType === 'string') {
    stages = stages.filter((stage) => stage.type === stageType);
  }

  // Flatten policy rules with stage context
  let rules = [];
  stages.forEach((stage) => {
    stage.policyRules.forEach((rule) => {
      rules.push({
        ...rule,
        stageId: stage.id,
        stageName: stage.name,
        stageType: stage.type,
        stageOrder: stage.order,
      });
    });
  });

  // Filter by enforcement level
  if (enforcement && typeof enforcement === 'string') {
    rules = rules.filter((rule) => rule.enforcement === enforcement);
  }

  // Filter by criticality tier
  if (criticalityTier && typeof criticalityTier === 'string') {
    rules = rules.filter(
      (rule) => Array.isArray(rule.appliesTo) && rule.appliesTo.includes(criticalityTier),
    );
  }

  return rules;
};

/**
 * Get the platform-specific configuration for a given CI/CD platform.
 *
 * @param {string} platform - CI/CD platform identifier (e.g. 'jenkins', 'openshift', 'gitops').
 * @returns {Object|null} Platform configuration object, or null if not found.
 */
export const getPlatformConfig = (platform) => {
  if (!platform || typeof platform !== 'string') {
    return null;
  }

  return PLATFORM_CONFIGS[platform] || null;
};

/**
 * Get all available CI/CD platform configurations.
 *
 * @returns {Array<Object>} Array of platform configuration summaries.
 */
export const getAvailablePlatforms = () => {
  return Object.values(PLATFORM_CONFIGS).map((config) => ({
    platform: config.platform,
    name: config.name,
    description: config.description,
  }));
};

/**
 * Get a specific stage definition by its ID.
 *
 * @param {string} stageId - The stage identifier.
 * @returns {Object|undefined} The stage definition, or undefined if not found.
 */
export const getStageById = (stageId) => {
  if (!stageId || typeof stageId !== 'string') {
    return undefined;
  }

  return GOLDEN_PIPELINE_STAGES.find((stage) => stage.id === stageId);
};

/**
 * Get all unique stage types available in the Golden Pipeline.
 *
 * @returns {Array<string>} Sorted array of unique stage type strings.
 */
export const getStageTypes = () => {
  const types = new Set(GOLDEN_PIPELINE_STAGES.map((stage) => stage.type));
  return [...types].sort();
};

/**
 * Validate that a set of selected stages meets the minimum requirements
 * for a given criticality tier.
 *
 * @param {string[]} selectedStageIds - Array of selected stage IDs.
 * @param {string} criticalityTier - The application criticality tier.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export const validateStageSelection = (selectedStageIds, criticalityTier) => {
  const errors = [];
  const warnings = [];

  if (!selectedStageIds || !Array.isArray(selectedStageIds)) {
    return { valid: false, errors: ['Stage selection must be an array of stage IDs.'], warnings: [] };
  }

  if (selectedStageIds.length === 0) {
    return { valid: false, errors: ['At least one pipeline stage must be selected.'], warnings: [] };
  }

  // Validate all stage IDs are valid
  const validStageIds = new Set(GOLDEN_PIPELINE_STAGES.map((s) => s.id));
  const invalidIds = selectedStageIds.filter((id) => !validStageIds.has(id));
  if (invalidIds.length > 0) {
    errors.push(`Invalid stage ID(s): ${invalidIds.join(', ')}.`);
  }

  // Check required stages are included
  const requiredStages = GOLDEN_PIPELINE_STAGES.filter((s) => s.required);
  const selectedSet = new Set(selectedStageIds);
  const missingRequired = requiredStages.filter((s) => !selectedSet.has(s.id));

  if (missingRequired.length > 0) {
    const missingNames = missingRequired.map((s) => s.name);
    warnings.push(`Missing recommended stages: ${missingNames.join(', ')}.`);
  }

  // Criticality-specific requirements
  if (
    criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL ||
    criticalityTier === CRITICALITY_TIERS.MISSION_CRITICAL
  ) {
    const securityStages = GOLDEN_PIPELINE_STAGES.filter((s) => s.type === STAGE_TYPES.SECURITY);
    const missingSecurityStages = securityStages.filter((s) => !selectedSet.has(s.id));

    if (missingSecurityStages.length > 0) {
      const missingNames = missingSecurityStages.map((s) => s.name);
      errors.push(
        `${criticalityTier} applications require all security stages: ${missingNames.join(', ')}.`,
      );
    }

    // Approval gate required for critical apps
    const approvalStages = GOLDEN_PIPELINE_STAGES.filter((s) => s.type === STAGE_TYPES.APPROVAL);
    const missingApproval = approvalStages.filter((s) => !selectedSet.has(s.id));

    if (missingApproval.length > 0) {
      errors.push(`${criticalityTier} applications require approval gates before production deployment.`);
    }

    // Observability hooks required for critical apps
    const obsStages = GOLDEN_PIPELINE_STAGES.filter((s) => s.type === STAGE_TYPES.OBSERVABILITY);
    const missingObs = obsStages.filter((s) => !selectedSet.has(s.id));

    if (missingObs.length > 0) {
      errors.push(`${criticalityTier} applications require observability validation post-deployment.`);
    }
  }

  // Source stage should always be first
  if (selectedStageIds.length > 0 && selectedStageIds[0] !== 'source' && selectedSet.has('source')) {
    warnings.push('Source stage should be the first stage in the pipeline.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Generate a pipeline summary for display purposes.
 *
 * @param {Object} [options]
 * @param {string} [options.platform='jenkins'] - CI/CD platform identifier.
 * @param {string} [options.criticalityTier] - Application criticality tier.
 * @returns {{ totalStages: number, requiredStages: number, optionalStages: number, securityStages: number, approvalGates: number, totalPolicyRules: number, blockingRules: number, warningRules: number, estimatedDurationMinutes: number }}
 */
export const getPipelineSummary = (options = {}) => {
  const { criticalityTier } = options;

  const stages = [...GOLDEN_PIPELINE_STAGES];

  const requiredStages = stages.filter((s) => s.required);
  const optionalStages = stages.filter((s) => !s.required);
  const securityStages = stages.filter((s) => s.type === STAGE_TYPES.SECURITY);
  const approvalGates = stages.filter((s) => s.type === STAGE_TYPES.APPROVAL);

  let allRules = [];
  stages.forEach((stage) => {
    stage.policyRules.forEach((rule) => {
      allRules.push(rule);
    });
  });

  // Filter rules by criticality tier if specified
  if (criticalityTier && typeof criticalityTier === 'string') {
    allRules = allRules.filter(
      (rule) => Array.isArray(rule.appliesTo) && rule.appliesTo.includes(criticalityTier),
    );
  }

  const blockingRules = allRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.BLOCK);
  const warningRules = allRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.WARN);

  const estimatedDurationMinutes = stages.reduce((sum, stage) => sum + (stage.timeoutMinutes || 0), 0);

  return {
    totalStages: stages.length,
    requiredStages: requiredStages.length,
    optionalStages: optionalStages.length,
    securityStages: securityStages.length,
    approvalGates: approvalGates.length,
    totalPolicyRules: allRules.length,
    blockingRules: blockingRules.length,
    warningRules: warningRules.length,
    estimatedDurationMinutes,
  };
};