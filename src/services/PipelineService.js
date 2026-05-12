/**
 * Pipeline generation service for Horizon DevSecOps Portal
 * Generates Golden Pipeline YAML/JSON with embedded SAST, DAST, SCA, QE,
 * observability stages. Supports Jenkins, OpenShift, GitOps configurations.
 * Stores generated pipelines in localStorage. Logs pipeline generation to audit trail.
 * @module services/PipelineService
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorageItem, setStorageItem, initializeStorage } from '../utils/localStorage.js';
import {
  MOCK_PIPELINE_CONFIGS,
  MOCK_PIPELINE_RUNS,
} from '../constants/mockData.js';
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LIST,
  PIPELINE_STATUSES,
  TOOLS,
  ENVIRONMENTS,
  CRITICALITY_TIERS,
} from '../constants/constants.js';
import { validatePipelineConfig } from '../utils/validators.js';
import { logAction, AUDIT_ACTIONS } from '../utils/auditLogger.js';
import { getApplicationById } from './CatalogService.js';
import {
  getGoldenPipelineTemplate,
  getPipelineStages,
  getPolicyRules,
  getPlatformConfig,
  getAvailablePlatforms,
  getPipelineSummary,
  validateStageSelection,
  CICD_PLATFORMS,
  STAGE_TYPES,
  POLICY_ENFORCEMENT,
} from '../utils/pipelineTemplates.js';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = Object.freeze({
  PIPELINE_CONFIGS: 'pipeline_configs',
  PIPELINE_RUNS: 'pipeline_runs',
  GENERATED_PIPELINES: 'generated_pipelines',
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
// Pipeline YAML/JSON Generation Helpers
// ---------------------------------------------------------------------------

/**
 * Map a criticality tier to default security tool selections.
 * @param {string} criticalityTier
 * @returns {{ sast: string[], sca: string[], dast: string[], containerScan: string[] }}
 */
const getDefaultSecurityTools = (criticalityTier) => {
  switch (criticalityTier) {
    case CRITICALITY_TIERS.BUSINESS_CRITICAL:
      return {
        sast: [TOOLS.CHECKMARX, TOOLS.FORTIFY],
        sca: [TOOLS.SNYK, TOOLS.BLACK_DUCK],
        dast: [TOOLS.CHECKMARX],
        containerScan: [TOOLS.TWISTLOCK],
      };
    case CRITICALITY_TIERS.MISSION_CRITICAL:
      return {
        sast: [TOOLS.FORTIFY],
        sca: [TOOLS.SNYK],
        dast: [TOOLS.CHECKMARX],
        containerScan: [TOOLS.TWISTLOCK],
      };
    case CRITICALITY_TIERS.BUSINESS_OPERATIONAL:
      return {
        sast: [TOOLS.SONARQUBE],
        sca: [TOOLS.SNYK],
        dast: [],
        containerScan: [TOOLS.TWISTLOCK],
      };
    case CRITICALITY_TIERS.ADMIN_SERVICES:
    default:
      return {
        sast: [TOOLS.SONARQUBE],
        sca: [TOOLS.SNYK],
        dast: [],
        containerScan: [],
      };
  }
};

/**
 * Generate a Jenkinsfile (declarative pipeline) string from pipeline definition.
 * @param {Object} pipelineDef - The pipeline definition object.
 * @returns {string} Jenkinsfile content.
 */
const generateJenkinsfile = (pipelineDef) => {
  const lines = [];
  lines.push('// Auto-generated Golden Pipeline - Jenkinsfile');
  lines.push(`// Application: ${pipelineDef.applicationName}`);
  lines.push(`// Generated: ${pipelineDef.generatedAt}`);
  lines.push(`// Criticality: ${pipelineDef.criticalityTier}`);
  lines.push('');
  lines.push('pipeline {');
  lines.push('    agent {');
  lines.push('        kubernetes {');
  lines.push("            label 'horizon-build-agent'");
  lines.push("            defaultContainer 'build'");
  lines.push('        }');
  lines.push('    }');
  lines.push('');
  lines.push('    options {');
  lines.push(`        timeout(time: ${pipelineDef.timeoutMinutes || 120}, unit: 'MINUTES')`);
  lines.push('        timestamps()');
  lines.push('        disableConcurrentBuilds()');
  lines.push("        buildDiscarder(logRotator(daysToKeepStr: '30', numToKeepStr: '50'))");
  lines.push('    }');
  lines.push('');
  lines.push('    environment {');
  lines.push(`        APP_NAME = '${pipelineDef.applicationName}'`);
  lines.push(`        APP_SHORT_CODE = '${pipelineDef.applicationShortCode || ''}'`);
  lines.push("        DOCKER_BUILDKIT = '1'");
  lines.push('    }');
  lines.push('');
  lines.push('    stages {');

  if (Array.isArray(pipelineDef.stages)) {
    pipelineDef.stages.forEach((stage) => {
      const stageName = stage.name || stage;
      const stageId = stage.id || stageName.toLowerCase().replace(/[\s/]+/g, '-');
      lines.push(`        stage('${stageName}') {`);

      // Add timeout for each stage
      if (stage.timeoutMinutes) {
        lines.push('            options {');
        lines.push(`                timeout(time: ${stage.timeoutMinutes}, unit: 'MINUTES')`);
        lines.push('            }');
      }

      lines.push('            steps {');

      switch (stage.type) {
        case STAGE_TYPES.SOURCE:
          lines.push('                checkout scm');
          break;
        case STAGE_TYPES.BUILD:
          if (stageId === 'container-build') {
            lines.push("                sh 'docker build -t ${APP_NAME}:${BUILD_NUMBER} .'");
          } else {
            lines.push("                sh 'mvn clean compile -DskipTests'");
          }
          break;
        case STAGE_TYPES.TEST:
          if (stageId === 'unit-test') {
            lines.push("                sh 'mvn test'");
            lines.push("                junit '**/target/surefire-reports/*.xml'");
          } else if (stageId === 'integration-test') {
            lines.push("                sh 'mvn verify -Pintegration-tests'");
          } else {
            lines.push(`                echo 'Running ${stageName}'`);
            lines.push("                sh 'mvn verify -Pperformance-tests'");
          }
          break;
        case STAGE_TYPES.SECURITY:
          if (stageId === 'sast') {
            lines.push("                withSonarQubeEnv('SonarQube') {");
            lines.push("                    sh 'mvn sonar:sonar'");
            lines.push('                }');
          } else if (stageId === 'sca') {
            lines.push("                sh 'snyk test --severity-threshold=high'");
          } else if (stageId === 'dast') {
            lines.push(`                echo 'Running DAST scan against QA environment'`);
          } else if (stageId === 'container-scan') {
            lines.push("                sh 'twistcli images scan ${APP_NAME}:${BUILD_NUMBER}'");
          } else {
            lines.push(`                echo 'Running ${stageName}'`);
          }
          break;
        case STAGE_TYPES.ARTIFACT:
          lines.push("                sh 'mvn deploy -DskipTests'");
          break;
        case STAGE_TYPES.DEPLOY: {
          const env = stage.config && stage.config.environment
            ? stage.config.environment
            : 'dev';
          lines.push(`                echo 'Deploying to ${env}'`);
          lines.push(`                sh 'kubectl apply -f k8s/${env}/ --namespace=${env}'`);
          lines.push(`                sh 'kubectl rollout status deployment/${pipelineDef.applicationName} --namespace=${env} --timeout=120s'`);
          break;
        }
        case STAGE_TYPES.APPROVAL:
          lines.push('                input {');
          lines.push(`                    message 'Approve deployment to production?'`);
          lines.push("                    submitter 'admin,owner'");
          lines.push('                }');
          break;
        case STAGE_TYPES.OBSERVABILITY:
          lines.push(`                echo 'Validating observability hooks'`);
          lines.push("                sh 'curl -sf http://${APP_NAME}/health || exit 1'");
          lines.push(`                echo 'Verifying monitoring and logging pipelines'`);
          break;
        case STAGE_TYPES.VALIDATION:
          lines.push(`                echo 'Running smoke tests'`);
          lines.push("                sh 'mvn verify -Psmoke-tests'");
          break;
        default:
          lines.push(`                echo 'Executing ${stageName}'`);
          break;
      }

      lines.push('            }');
      lines.push('        }');
    });
  }

  lines.push('    }');
  lines.push('');
  lines.push('    post {');
  lines.push('        always {');
  lines.push("            archiveArtifacts artifacts: '**/target/*.jar', allowEmptyArchive: true");
  lines.push("            junit allowEmptyResults: true, testResults: '**/target/surefire-reports/*.xml'");
  lines.push('            cleanWs()');
  lines.push('        }');
  lines.push('        success {');
  lines.push("            echo 'Pipeline completed successfully'");
  lines.push('        }');
  lines.push('        failure {');
  lines.push("            echo 'Pipeline failed - creating incident'");
  lines.push('        }');
  lines.push('    }');
  lines.push('}');

  return lines.join('\n');
};

/**
 * Generate an OpenShift Tekton pipeline YAML string from pipeline definition.
 * @param {Object} pipelineDef - The pipeline definition object.
 * @returns {string} Tekton pipeline YAML content.
 */
const generateTektonYaml = (pipelineDef) => {
  const lines = [];
  lines.push('# Auto-generated Golden Pipeline - Tekton Pipeline');
  lines.push(`# Application: ${pipelineDef.applicationName}`);
  lines.push(`# Generated: ${pipelineDef.generatedAt}`);
  lines.push(`# Criticality: ${pipelineDef.criticalityTier}`);
  lines.push('---');
  lines.push('apiVersion: tekton.dev/v1beta1');
  lines.push('kind: Pipeline');
  lines.push('metadata:');
  lines.push(`  name: ${pipelineDef.pipelineName}`);
  lines.push('  labels:');
  lines.push(`    app: ${pipelineDef.applicationName}`);
  lines.push('    pipeline-type: golden-pipeline');
  lines.push(`    criticality: ${(pipelineDef.criticalityTier || '').toLowerCase().replace(/[\s/]+/g, '-')}`);
  lines.push('spec:');
  lines.push('  params:');
  lines.push('    - name: git-url');
  lines.push('      type: string');
  lines.push('    - name: git-revision');
  lines.push('      type: string');
  lines.push("      default: 'main'");
  lines.push('    - name: image-name');
  lines.push('      type: string');
  lines.push('  workspaces:');
  lines.push('    - name: shared-workspace');
  lines.push('    - name: maven-settings');
  lines.push('  tasks:');

  if (Array.isArray(pipelineDef.stages)) {
    let prevTaskName = null;
    pipelineDef.stages.forEach((stage) => {
      const taskName = (stage.id || stage.name || 'task')
        .toLowerCase()
        .replace(/[\s/]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      lines.push(`    - name: ${taskName}`);
      lines.push(`      taskRef:`);
      lines.push(`        name: ${taskName}-task`);

      if (prevTaskName) {
        lines.push('      runAfter:');
        lines.push(`        - ${prevTaskName}`);
      }

      lines.push('      workspaces:');
      lines.push('        - name: source');
      lines.push('          workspace: shared-workspace');

      if (stage.timeoutMinutes) {
        lines.push(`      timeout: ${stage.timeoutMinutes}m`);
      }

      prevTaskName = taskName;
    });
  }

  return lines.join('\n');
};

/**
 * Generate a GitOps ArgoCD Application YAML string from pipeline definition.
 * @param {Object} pipelineDef - The pipeline definition object.
 * @returns {string} ArgoCD Application YAML content.
 */
const generateGitOpsYaml = (pipelineDef) => {
  const lines = [];
  lines.push('# Auto-generated Golden Pipeline - ArgoCD Application');
  lines.push(`# Application: ${pipelineDef.applicationName}`);
  lines.push(`# Generated: ${pipelineDef.generatedAt}`);
  lines.push(`# Criticality: ${pipelineDef.criticalityTier}`);
  lines.push('---');
  lines.push('apiVersion: argoproj.io/v1alpha1');
  lines.push('kind: Application');
  lines.push('metadata:');
  lines.push(`  name: ${pipelineDef.pipelineName}`);
  lines.push('  namespace: argocd');
  lines.push('  labels:');
  lines.push(`    app: ${pipelineDef.applicationName}`);
  lines.push('    pipeline-type: golden-pipeline');
  lines.push('spec:');
  lines.push('  project: default');
  lines.push('  source:');
  lines.push(`    repoURL: ${pipelineDef.repoUrl || 'https://github.com/horizon-org/gitops-config'}`);
  lines.push("    targetRevision: 'main'");
  lines.push(`    path: environments/`);
  lines.push('    helm:');
  lines.push('      valueFiles:');

  const environments = pipelineDef.environments || [ENVIRONMENTS.DEV, ENVIRONMENTS.PROD];
  environments.forEach((env) => {
    const envLower = String(env).toLowerCase().replace(/[\s-]+/g, '-');
    lines.push(`        - values-${envLower}.yaml`);
  });

  lines.push('  destination:');
  lines.push("    server: 'https://kubernetes.default.svc'");
  lines.push(`    namespace: ${pipelineDef.applicationName}`);
  lines.push('  syncPolicy:');
  lines.push('    automated:');
  lines.push('      prune: true');
  lines.push('      selfHeal: true');
  lines.push('    syncOptions:');
  lines.push('      - CreateNamespace=true');
  lines.push('      - PruneLast=true');
  lines.push('    retry:');
  lines.push('      limit: 3');
  lines.push('      backoff:');
  lines.push("        duration: '5s'");
  lines.push('        factor: 2');
  lines.push("        maxDuration: '3m'");

  // Add CI pipeline stages as annotations for reference
  lines.push('---');
  lines.push('# CI Pipeline Stages (executed before GitOps sync):');
  if (Array.isArray(pipelineDef.stages)) {
    pipelineDef.stages.forEach((stage, index) => {
      const stageName = stage.name || stage;
      lines.push(`# ${index + 1}. ${stageName}`);
    });
  }

  return lines.join('\n');
};

/**
 * Generate pipeline artifact content based on platform.
 * @param {Object} pipelineDef - The pipeline definition object.
 * @param {string} platform - The CI/CD platform identifier.
 * @returns {string} Generated pipeline artifact content.
 */
const generatePipelineArtifactContent = (pipelineDef, platform) => {
  switch (platform) {
    case CICD_PLATFORMS.JENKINS:
      return generateJenkinsfile(pipelineDef);
    case CICD_PLATFORMS.OPENSHIFT:
      return generateTektonYaml(pipelineDef);
    case CICD_PLATFORMS.GITOPS:
      return generateGitOpsYaml(pipelineDef);
    case CICD_PLATFORMS.GITHUB_ACTIONS:
      return generateGitHubActionsYaml(pipelineDef);
    case CICD_PLATFORMS.GITLAB_CI:
      return generateGitLabCIYaml(pipelineDef);
    default:
      return generateJenkinsfile(pipelineDef);
  }
};

/**
 * Generate a GitHub Actions workflow YAML string from pipeline definition.
 * @param {Object} pipelineDef - The pipeline definition object.
 * @returns {string} GitHub Actions workflow YAML content.
 */
const generateGitHubActionsYaml = (pipelineDef) => {
  const lines = [];
  lines.push('# Auto-generated Golden Pipeline - GitHub Actions');
  lines.push(`# Application: ${pipelineDef.applicationName}`);
  lines.push(`# Generated: ${pipelineDef.generatedAt}`);
  lines.push(`# Criticality: ${pipelineDef.criticalityTier}`);
  lines.push('');
  lines.push(`name: ${pipelineDef.pipelineName}`);
  lines.push('');
  lines.push('on:');
  lines.push('  push:');
  lines.push('    branches: [main]');
  lines.push('  pull_request:');
  lines.push('    branches: [main]');
  lines.push('');
  lines.push('jobs:');

  if (Array.isArray(pipelineDef.stages)) {
    const jobDeps = [];
    pipelineDef.stages.forEach((stage) => {
      const jobName = (stage.id || stage.name || 'job')
        .toLowerCase()
        .replace(/[\s/]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      lines.push(`  ${jobName}:`);
      lines.push('    runs-on: ubuntu-latest');

      if (jobDeps.length > 0) {
        lines.push(`    needs: [${jobDeps[jobDeps.length - 1]}]`);
      }

      if (stage.timeoutMinutes) {
        lines.push(`    timeout-minutes: ${stage.timeoutMinutes}`);
      }

      lines.push('    steps:');
      lines.push('      - uses: actions/checkout@v4');
      lines.push(`      - name: ${stage.name || jobName}`);
      lines.push(`        run: echo "Executing ${stage.name || jobName}"`);
      lines.push('');

      jobDeps.push(jobName);
    });
  }

  return lines.join('\n');
};

/**
 * Generate a GitLab CI YAML string from pipeline definition.
 * @param {Object} pipelineDef - The pipeline definition object.
 * @returns {string} GitLab CI YAML content.
 */
const generateGitLabCIYaml = (pipelineDef) => {
  const lines = [];
  lines.push('# Auto-generated Golden Pipeline - GitLab CI');
  lines.push(`# Application: ${pipelineDef.applicationName}`);
  lines.push(`# Generated: ${pipelineDef.generatedAt}`);
  lines.push(`# Criticality: ${pipelineDef.criticalityTier}`);
  lines.push('');
  lines.push('stages:');

  const stageNames = new Set();
  if (Array.isArray(pipelineDef.stages)) {
    pipelineDef.stages.forEach((stage) => {
      const stageName = (stage.type || 'default').toLowerCase();
      if (!stageNames.has(stageName)) {
        stageNames.add(stageName);
        lines.push(`  - ${stageName}`);
      }
    });
  }

  lines.push('');

  if (Array.isArray(pipelineDef.stages)) {
    pipelineDef.stages.forEach((stage) => {
      const jobName = (stage.id || stage.name || 'job')
        .toLowerCase()
        .replace(/[\s/]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      lines.push(`${jobName}:`);
      lines.push(`  stage: ${(stage.type || 'default').toLowerCase()}`);
      lines.push('  script:');
      lines.push(`    - echo "Executing ${stage.name || jobName}"`);

      if (stage.timeoutMinutes) {
        lines.push(`  timeout: ${stage.timeoutMinutes}m`);
      }

      lines.push('');
    });
  }

  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Public API — Generate Pipeline
// ---------------------------------------------------------------------------

/**
 * Generate a Golden Pipeline for an application. Creates a pipeline definition
 * with embedded security, QE, and observability stages based on the application's
 * criticality tier and configuration options.
 *
 * @param {string} appId - The application ID to generate a pipeline for.
 * @param {Object} [config={}] - Pipeline generation configuration.
 * @param {string} [config.platform='jenkins'] - CI/CD platform ('jenkins', 'openshift', 'gitops', 'github_actions', 'gitlab_ci').
 * @param {boolean} [config.includeSecurityStages=true] - Whether to include security scanning stages.
 * @param {boolean} [config.includeQEStages=true] - Whether to include QE/performance testing stages.
 * @param {boolean} [config.includeObservabilityHooks=true] - Whether to include observability validation.
 * @param {boolean} [config.includeApprovalGates=true] - Whether to include manual approval gates.
 * @param {string[]} [config.excludeStages=[]] - Stage IDs to exclude.
 * @param {string[]} [config.securityTools] - Override default security tools.
 * @param {string} [config.sourceControl] - Source control tool override.
 * @param {string} [config.cicdTool] - CI/CD tool override.
 * @param {string} [config.artifactRepo] - Artifact repository override.
 * @param {string} [config.containerPlatform] - Container platform override.
 * @param {string} [config.monitoringTool] - Monitoring tool override.
 * @param {string} [config.loggingTool] - Logging tool override.
 * @param {string[]} [config.triggers] - Pipeline triggers.
 * @param {string} [config.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, pipeline: Object|null, artifact: string|null, errors: string[], warnings: string[] }}
 */
export const generatePipeline = (appId, config = {}) => {
  try {
    if (!appId || typeof appId !== 'string') {
      return {
        success: false,
        pipeline: null,
        artifact: null,
        errors: ['Application ID is required.'],
        warnings: [],
      };
    }

    // Fetch the application
    const application = getApplicationById(appId);
    if (!application) {
      return {
        success: false,
        pipeline: null,
        artifact: null,
        errors: [`Application with ID "${appId}" not found.`],
        warnings: [],
      };
    }

    const {
      platform = CICD_PLATFORMS.JENKINS,
      includeSecurityStages = true,
      includeQEStages = true,
      includeObservabilityHooks = true,
      includeApprovalGates = true,
      excludeStages = [],
      securityTools,
      sourceControl,
      cicdTool,
      artifactRepo,
      containerPlatform,
      monitoringTool,
      loggingTool,
      triggers = ['push to main', 'pull request'],
      userId,
    } = config;

    const warnings = [];
    const criticalityTier = application.criticalityTier || CRITICALITY_TIERS.BUSINESS_OPERATIONAL;

    // Build exclude list based on config flags
    const effectiveExcludeStages = Array.isArray(excludeStages) ? [...excludeStages] : [];

    if (!includeSecurityStages) {
      effectiveExcludeStages.push('sast', 'sca', 'dast', 'container-scan');
    }

    if (!includeQEStages) {
      effectiveExcludeStages.push('qe-automation');
    }

    if (!includeObservabilityHooks) {
      effectiveExcludeStages.push('observability-hooks');
    }

    if (!includeApprovalGates) {
      effectiveExcludeStages.push('uat-sign-off');
    }

    // Get the Golden Pipeline template
    const template = getGoldenPipelineTemplate({
      platform,
      criticalityTier,
      includeOptionalStages: includeQEStages,
      excludeStages: effectiveExcludeStages,
    });

    // Validate stage selection for criticality tier
    const selectedStageIds = template.stages.map((s) => s.id);
    const stageValidation = validateStageSelection(selectedStageIds, criticalityTier);
    if (!stageValidation.valid) {
      warnings.push(...stageValidation.errors);
    }
    if (stageValidation.warnings && stageValidation.warnings.length > 0) {
      warnings.push(...stageValidation.warnings);
    }

    // Determine security tools
    const defaultSecTools = getDefaultSecurityTools(criticalityTier);
    const resolvedSecurityTools = Array.isArray(securityTools) && securityTools.length > 0
      ? securityTools
      : [
          ...defaultSecTools.sast,
          ...defaultSecTools.sca,
          ...defaultSecTools.dast,
          ...defaultSecTools.containerScan,
        ];

    // Determine tool selections
    const resolvedSourceControl = sourceControl || TOOLS.GITHUB;
    const resolvedCicdTool = cicdTool || TOOLS.JENKINS;
    const resolvedArtifactRepo = artifactRepo || TOOLS.ARTIFACTORY;
    const resolvedContainerPlatform = containerPlatform || TOOLS.KUBERNETES;
    const resolvedMonitoringTool = monitoringTool || TOOLS.DYNATRACE;
    const resolvedLoggingTool = loggingTool || TOOLS.SPLUNK;

    // Build pipeline name
    const pipelineName = `${(application.name || '').toLowerCase().replace(/[\s/]+/g, '-')}-golden-pipeline`;

    // Calculate total timeout
    const totalTimeoutMinutes = template.stages.reduce(
      (sum, stage) => sum + (stage.timeoutMinutes || 10),
      0,
    );

    // Build pipeline definition
    const pipelineId = `PIPE-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const pipelineDef = {
      id: pipelineId,
      applicationId: appId,
      applicationName: application.name,
      applicationShortCode: application.shortCode || '',
      pipelineName,
      description: `Golden Pipeline for ${application.name} - ${criticalityTier} tier with ${template.stages.length} stages and ${template.totalPolicyRules} policy rules.`,
      pipelineType: 'Golden',
      platform,
      platformConfig: template.platform,
      criticalityTier,
      sourceControl: resolvedSourceControl,
      cicdTool: resolvedCicdTool,
      artifactRepo: resolvedArtifactRepo,
      containerPlatform: resolvedContainerPlatform,
      securityTools: resolvedSecurityTools,
      monitoringTool: resolvedMonitoringTool,
      loggingTool: resolvedLoggingTool,
      stages: template.stages,
      stageCount: template.stages.length,
      policyRuleCount: template.totalPolicyRules,
      triggers: Array.isArray(triggers) ? [...triggers] : ['push to main'],
      environments: application.environments || [ENVIRONMENTS.DEV, ENVIRONMENTS.PROD],
      repoUrl: application.repoUrl || '',
      timeoutMinutes: totalTimeoutMinutes,
      generatedAt: now,
      generatedBy: userId || null,
      updatedAt: now,
      status: 'generated',
      version: '1.0.0',
    };

    // Generate the pipeline artifact (Jenkinsfile, Tekton YAML, etc.)
    const artifactContent = generatePipelineArtifactContent(pipelineDef, platform);

    // Store the generated pipeline
    const generatedPipelines = loadData(STORAGE_KEYS.GENERATED_PIPELINES, []);
    const existingIndex = generatedPipelines.findIndex(
      (p) => p.applicationId === appId && p.platform === platform,
    );

    const pipelineRecord = {
      ...pipelineDef,
      artifact: artifactContent,
    };

    if (existingIndex >= 0) {
      pipelineRecord.id = generatedPipelines[existingIndex].id;
      pipelineRecord.version = incrementVersion(generatedPipelines[existingIndex].version);
      generatedPipelines[existingIndex] = pipelineRecord;
    } else {
      generatedPipelines.push(pipelineRecord);
    }

    saveData(STORAGE_KEYS.GENERATED_PIPELINES, generatedPipelines);

    // Also update the pipeline configs storage for compatibility
    const pipelineConfigs = loadData(STORAGE_KEYS.PIPELINE_CONFIGS, MOCK_PIPELINE_CONFIGS);
    const configIndex = pipelineConfigs.findIndex((c) => c.applicationId === appId);

    const pipelineConfig = {
      id: pipelineRecord.id,
      applicationId: appId,
      applicationName: application.name,
      name: pipelineName,
      description: pipelineDef.description,
      sourceControl: resolvedSourceControl,
      cicdTool: resolvedCicdTool,
      artifactRepo: resolvedArtifactRepo,
      containerPlatform: resolvedContainerPlatform,
      securityTools: resolvedSecurityTools,
      monitoringTool: resolvedMonitoringTool,
      loggingTool: resolvedLoggingTool,
      stages: template.stages.map((s) => s.name),
      triggers: pipelineDef.triggers,
      createdAt: configIndex >= 0 ? pipelineConfigs[configIndex].createdAt : now,
      updatedAt: now,
    };

    if (configIndex >= 0) {
      pipelineConfig.id = pipelineConfigs[configIndex].id;
      pipelineConfigs[configIndex] = pipelineConfig;
    } else {
      pipelineConfigs.push(pipelineConfig);
    }

    saveData(STORAGE_KEYS.PIPELINE_CONFIGS, pipelineConfigs);

    // Log the pipeline generation
    logAction(userId || null, AUDIT_ACTIONS.PIPELINE_CONFIG_UPDATE, {
      pipelineId: pipelineRecord.id,
      applicationId: appId,
      applicationName: application.name,
      platform,
      criticalityTier,
      stageCount: template.stages.length,
      policyRuleCount: template.totalPolicyRules,
      action: 'pipeline_generated',
    });

    return {
      success: true,
      pipeline: pipelineDef,
      artifact: artifactContent,
      errors: [],
      warnings,
    };
  } catch (_err) {
    console.error('PipelineService: Failed to generate pipeline:', _err);
    return {
      success: false,
      pipeline: null,
      artifact: null,
      errors: ['Failed to generate pipeline. Please try again.'],
      warnings: [],
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Get Pipelines
// ---------------------------------------------------------------------------

/**
 * Get all pipeline configurations, optionally filtered and sorted.
 *
 * @param {Object} [options]
 * @param {string} [options.applicationId] - Filter by application ID.
 * @param {string} [options.applicationName] - Filter by application name.
 * @param {string} [options.platform] - Filter by CI/CD platform.
 * @param {string} [options.status] - Filter by pipeline status.
 * @param {string} [options.search] - Free-text search across name, application, description.
 * @param {string} [options.sortBy='updatedAt'] - Field to sort by.
 * @param {string} [options.sortOrder='desc'] - Sort order: 'asc' or 'desc'.
 * @param {number} [options.limit] - Maximum number of results.
 * @param {number} [options.offset=0] - Number of results to skip.
 * @returns {{ data: Array<Object>, total: number }}
 */
export const getPipelines = (options = {}) => {
  try {
    const {
      applicationId,
      applicationName,
      platform,
      status,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      limit,
      offset = 0,
    } = options;

    // Merge mock pipeline configs with generated pipelines
    const configs = loadData(STORAGE_KEYS.PIPELINE_CONFIGS, MOCK_PIPELINE_CONFIGS);
    const generated = loadData(STORAGE_KEYS.GENERATED_PIPELINES, []);

    // Build a combined list, preferring generated pipelines when they exist
    const generatedAppIds = new Set(generated.map((g) => g.applicationId));
    let pipelines = [
      ...generated,
      ...configs.filter((c) => !generatedAppIds.has(c.applicationId)),
    ];

    // Filter by applicationId
    if (applicationId && typeof applicationId === 'string') {
      pipelines = pipelines.filter((p) => p.applicationId === applicationId);
    }

    // Filter by applicationName
    if (applicationName && typeof applicationName === 'string') {
      pipelines = pipelines.filter((p) => matchesSearch(p.applicationName, applicationName));
    }

    // Filter by platform
    if (platform && typeof platform === 'string') {
      pipelines = pipelines.filter((p) => p.platform === platform);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      pipelines = pipelines.filter((p) => p.status === status);
    }

    // Free-text search
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.trim();
      pipelines = pipelines.filter((p) => {
        return (
          matchesSearch(p.name || p.pipelineName, query) ||
          matchesSearch(p.applicationName, query) ||
          matchesSearch(p.description, query) ||
          matchesSearch(p.platform, query) ||
          matchesSearch(p.criticalityTier, query) ||
          matchesSearch(p.sourceControl, query) ||
          matchesSearch(p.cicdTool, query)
        );
      });
    }

    // Sort
    pipelines.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

    const total = pipelines.length;

    // Pagination
    const startIdx = typeof offset === 'number' && offset > 0 ? offset : 0;
    if (typeof limit === 'number' && limit > 0) {
      pipelines = pipelines.slice(startIdx, startIdx + limit);
    } else if (startIdx > 0) {
      pipelines = pipelines.slice(startIdx);
    }

    return { data: pipelines, total };
  } catch (_err) {
    console.error('PipelineService: Failed to get pipelines:', _err);
    return { data: [], total: 0 };
  }
};

/**
 * Get a single pipeline by its ID.
 *
 * @param {string} pipelineId - The pipeline ID.
 * @returns {Object|null} The pipeline object or null if not found.
 */
export const getPipelineById = (pipelineId) => {
  try {
    if (!pipelineId || typeof pipelineId !== 'string') {
      return null;
    }

    // Check generated pipelines first
    const generated = loadData(STORAGE_KEYS.GENERATED_PIPELINES, []);
    const genPipeline = generated.find((p) => p.id === pipelineId);
    if (genPipeline) {
      return genPipeline;
    }

    // Check pipeline configs
    const configs = loadData(STORAGE_KEYS.PIPELINE_CONFIGS, MOCK_PIPELINE_CONFIGS);
    const configPipeline = configs.find((p) => p.id === pipelineId);
    if (configPipeline) {
      return configPipeline;
    }

    return null;
  } catch (_err) {
    console.error('PipelineService: Failed to get pipeline by ID:', _err);
    return null;
  }
};

/**
 * Get a pipeline by application ID.
 *
 * @param {string} applicationId - The application ID.
 * @returns {Object|null} The pipeline object or null if not found.
 */
export const getPipelineByApplicationId = (applicationId) => {
  try {
    if (!applicationId || typeof applicationId !== 'string') {
      return null;
    }

    // Check generated pipelines first
    const generated = loadData(STORAGE_KEYS.GENERATED_PIPELINES, []);
    const genPipeline = generated.find((p) => p.applicationId === applicationId);
    if (genPipeline) {
      return genPipeline;
    }

    // Check pipeline configs
    const configs = loadData(STORAGE_KEYS.PIPELINE_CONFIGS, MOCK_PIPELINE_CONFIGS);
    const configPipeline = configs.find((p) => p.applicationId === applicationId);
    if (configPipeline) {
      return configPipeline;
    }

    return null;
  } catch (_err) {
    console.error('PipelineService: Failed to get pipeline by application ID:', _err);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API — Pipeline Artifact
// ---------------------------------------------------------------------------

/**
 * Get the generated pipeline artifact (Jenkinsfile, YAML, etc.) for a pipeline.
 *
 * @param {string} pipelineId - The pipeline ID.
 * @returns {{ success: boolean, artifact: string|null, format: string|null, error: string|null }}
 */
export const getPipelineArtifact = (pipelineId) => {
  try {
    if (!pipelineId || typeof pipelineId !== 'string') {
      return { success: false, artifact: null, format: null, error: 'Pipeline ID is required.' };
    }

    const generated = loadData(STORAGE_KEYS.GENERATED_PIPELINES, []);
    const pipeline = generated.find((p) => p.id === pipelineId);

    if (!pipeline) {
      return {
        success: false,
        artifact: null,
        format: null,
        error: `Pipeline with ID "${pipelineId}" not found or has no generated artifact.`,
      };
    }

    if (!pipeline.artifact) {
      // Regenerate the artifact from the pipeline definition
      const artifactContent = generatePipelineArtifactContent(pipeline, pipeline.platform || CICD_PLATFORMS.JENKINS);
      pipeline.artifact = artifactContent;

      // Persist the updated pipeline
      const index = generated.findIndex((p) => p.id === pipelineId);
      if (index >= 0) {
        generated[index] = pipeline;
        saveData(STORAGE_KEYS.GENERATED_PIPELINES, generated);
      }
    }

    const formatMap = {
      [CICD_PLATFORMS.JENKINS]: 'Jenkinsfile',
      [CICD_PLATFORMS.OPENSHIFT]: 'tekton-yaml',
      [CICD_PLATFORMS.GITOPS]: 'argocd-yaml',
      [CICD_PLATFORMS.GITHUB_ACTIONS]: 'github-actions-yaml',
      [CICD_PLATFORMS.GITLAB_CI]: 'gitlab-ci-yaml',
    };

    return {
      success: true,
      artifact: pipeline.artifact,
      format: formatMap[pipeline.platform] || 'Jenkinsfile',
      error: null,
    };
  } catch (_err) {
    console.error('PipelineService: Failed to get pipeline artifact:', _err);
    return { success: false, artifact: null, format: null, error: 'Failed to retrieve pipeline artifact.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Pipeline Runs
// ---------------------------------------------------------------------------

/**
 * Get pipeline runs, optionally filtered by pipeline or application.
 *
 * @param {Object} [options]
 * @param {string} [options.pipelineId] - Filter by pipeline ID.
 * @param {string} [options.applicationName] - Filter by application name.
 * @param {string} [options.status] - Filter by run status.
 * @param {string} [options.search] - Free-text search.
 * @param {string} [options.sortBy='startedAt'] - Field to sort by.
 * @param {string} [options.sortOrder='desc'] - Sort order.
 * @param {number} [options.limit] - Maximum number of results.
 * @param {number} [options.offset=0] - Number of results to skip.
 * @returns {{ data: Array<Object>, total: number }}
 */
export const getPipelineRuns = (options = {}) => {
  try {
    const {
      pipelineId,
      applicationName,
      status,
      search,
      sortBy = 'startedAt',
      sortOrder = 'desc',
      limit,
      offset = 0,
    } = options;

    let runs = loadData(STORAGE_KEYS.PIPELINE_RUNS, MOCK_PIPELINE_RUNS);

    if (pipelineId && typeof pipelineId === 'string') {
      runs = runs.filter((r) => r.pipelineId === pipelineId);
    }

    if (applicationName && typeof applicationName === 'string') {
      runs = runs.filter((r) => matchesSearch(r.applicationName, applicationName));
    }

    if (status && typeof status === 'string') {
      runs = runs.filter((r) => r.status === status);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const query = search.trim();
      runs = runs.filter((r) => {
        return (
          matchesSearch(r.pipelineName, query) ||
          matchesSearch(r.applicationName, query) ||
          matchesSearch(r.status, query) ||
          matchesSearch(r.triggeredBy, query) ||
          matchesSearch(r.branch, query) ||
          matchesSearch(r.commitSha, query)
        );
      });
    }

    runs.sort((a, b) => compareValues(a[sortBy], b[sortBy], sortOrder));

    const total = runs.length;

    const startIdx = typeof offset === 'number' && offset > 0 ? offset : 0;
    if (typeof limit === 'number' && limit > 0) {
      runs = runs.slice(startIdx, startIdx + limit);
    } else if (startIdx > 0) {
      runs = runs.slice(startIdx);
    }

    return { data: runs, total };
  } catch (_err) {
    console.error('PipelineService: Failed to get pipeline runs:', _err);
    return { data: [], total: 0 };
  }
};

/**
 * Get a single pipeline run by its ID.
 *
 * @param {string} runId - The pipeline run ID.
 * @returns {Object|null} The pipeline run object or null if not found.
 */
export const getPipelineRunById = (runId) => {
  try {
    if (!runId || typeof runId !== 'string') {
      return null;
    }

    const runs = loadData(STORAGE_KEYS.PIPELINE_RUNS, MOCK_PIPELINE_RUNS);
    return runs.find((r) => r.id === runId) || null;
  } catch (_err) {
    console.error('PipelineService: Failed to get pipeline run by ID:', _err);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API — Validate Pipeline Config
// ---------------------------------------------------------------------------

/**
 * Validate a pipeline configuration object. Wraps the validators utility
 * and adds pipeline-specific validation logic.
 *
 * @param {Object} config - The pipeline configuration to validate.
 * @param {string} config.name - Pipeline name.
 * @param {string} config.applicationId - Associated application ID.
 * @param {string} config.sourceControl - Source control tool.
 * @param {string} config.cicdTool - CI/CD tool.
 * @param {string[]} config.stages - Ordered list of pipeline stages.
 * @param {string[]} [config.triggers] - Pipeline triggers.
 * @param {string[]} [config.securityTools] - Security scanning tools.
 * @param {string} [config.platform] - CI/CD platform.
 * @param {string} [config.criticalityTier] - Application criticality tier.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export const validatePipelineConfiguration = (config) => {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Pipeline configuration is required.'], warnings: [] };
  }

  // Use the base validator
  const baseValidation = validatePipelineConfig(config);
  if (!baseValidation.valid) {
    errors.push(...baseValidation.errors);
  }

  // Additional validation: check application exists
  if (config.applicationId && typeof config.applicationId === 'string') {
    const application = getApplicationById(config.applicationId);
    if (!application) {
      errors.push(`Application with ID "${config.applicationId}" not found.`);
    }
  }

  // Validate platform if provided
  if (config.platform && typeof config.platform === 'string') {
    const validPlatforms = Object.values(CICD_PLATFORMS);
    if (!validPlatforms.includes(config.platform)) {
      errors.push(`Invalid platform: "${config.platform}". Valid platforms: ${validPlatforms.join(', ')}.`);
    }
  }

  // Validate criticality-specific requirements
  if (config.criticalityTier && Array.isArray(config.stages)) {
    const stageSet = new Set(config.stages);

    if (
      config.criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL ||
      config.criticalityTier === CRITICALITY_TIERS.MISSION_CRITICAL
    ) {
      // Security stages required
      const requiredSecurityStages = [PIPELINE_STAGES.SAST, PIPELINE_STAGES.SCA];
      const missingSecStages = requiredSecurityStages.filter((s) => !stageSet.has(s));
      if (missingSecStages.length > 0) {
        warnings.push(
          `${config.criticalityTier} applications should include security stages: ${missingSecStages.join(', ')}.`,
        );
      }

      // Container scan recommended
      if (!stageSet.has(PIPELINE_STAGES.CONTAINER_SCAN)) {
        warnings.push('Container scanning is recommended for critical applications.');
      }

      // Approval gate recommended
      if (!stageSet.has(PIPELINE_STAGES.UAT_SIGN_OFF)) {
        warnings.push('UAT sign-off approval gate is recommended for critical applications.');
      }
    }

    // Post-deploy validation recommended for all tiers
    if (!stageSet.has(PIPELINE_STAGES.POST_DEPLOY_VALIDATION)) {
      warnings.push('Post-deployment validation is recommended for all applications.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// ---------------------------------------------------------------------------
// Public API — Update Pipeline
// ---------------------------------------------------------------------------

/**
 * Update an existing generated pipeline configuration.
 *
 * @param {string} pipelineId - The pipeline ID to update.
 * @param {Object} updates - Partial pipeline data to merge.
 * @param {string} [updates.userId] - ID of the user performing the action.
 * @returns {{ success: boolean, pipeline: Object|null, errors: string[] }}
 */
export const updatePipeline = (pipelineId, updates) => {
  try {
    if (!pipelineId || typeof pipelineId !== 'string') {
      return { success: false, pipeline: null, errors: ['Pipeline ID is required.'] };
    }

    if (!updates || typeof updates !== 'object') {
      return { success: false, pipeline: null, errors: ['Update data is required.'] };
    }

    const generated = loadData(STORAGE_KEYS.GENERATED_PIPELINES, []);
    const index = generated.findIndex((p) => p.id === pipelineId);

    if (index === -1) {
      // Check pipeline configs
      const configs = loadData(STORAGE_KEYS.PIPELINE_CONFIGS, MOCK_PIPELINE_CONFIGS);
      const configIndex = configs.findIndex((c) => c.id === pipelineId);

      if (configIndex === -1) {
        return {
          success: false,
          pipeline: null,
          errors: [`Pipeline with ID "${pipelineId}" not found.`],
        };
      }

      // Update the config
      const existing = configs[configIndex];
      const updatedConfig = { ...existing };

      if (updates.name !== undefined) {
        updatedConfig.name = String(updates.name).trim();
      }
      if (updates.description !== undefined) {
        updatedConfig.description = String(updates.description).trim();
      }
      if (updates.stages !== undefined && Array.isArray(updates.stages)) {
        updatedConfig.stages = [...updates.stages];
      }
      if (updates.triggers !== undefined && Array.isArray(updates.triggers)) {
        updatedConfig.triggers = [...updates.triggers];
      }
      if (updates.securityTools !== undefined && Array.isArray(updates.securityTools)) {
        updatedConfig.securityTools = [...updates.securityTools];
      }
      if (updates.sourceControl !== undefined) {
        updatedConfig.sourceControl = updates.sourceControl;
      }
      if (updates.cicdTool !== undefined) {
        updatedConfig.cicdTool = updates.cicdTool;
      }
      if (updates.monitoringTool !== undefined) {
        updatedConfig.monitoringTool = updates.monitoringTool;
      }
      if (updates.loggingTool !== undefined) {
        updatedConfig.loggingTool = updates.loggingTool;
      }

      updatedConfig.updatedAt = new Date().toISOString();
      configs[configIndex] = updatedConfig;
      saveData(STORAGE_KEYS.PIPELINE_CONFIGS, configs);

      logAction(updates.userId || null, AUDIT_ACTIONS.PIPELINE_CONFIG_UPDATE, {
        pipelineId,
        applicationName: updatedConfig.applicationName,
        updatedFields: Object.keys(updates).filter((k) => k !== 'userId'),
      });

      return { success: true, pipeline: updatedConfig, errors: [] };
    }

    // Update the generated pipeline
    const existing = generated[index];
    const updatedPipeline = { ...existing };

    if (updates.pipelineName !== undefined) {
      updatedPipeline.pipelineName = String(updates.pipelineName).trim();
    }
    if (updates.description !== undefined) {
      updatedPipeline.description = String(updates.description).trim();
    }
    if (updates.triggers !== undefined && Array.isArray(updates.triggers)) {
      updatedPipeline.triggers = [...updates.triggers];
    }
    if (updates.securityTools !== undefined && Array.isArray(updates.securityTools)) {
      updatedPipeline.securityTools = [...updates.securityTools];
    }
    if (updates.sourceControl !== undefined) {
      updatedPipeline.sourceControl = updates.sourceControl;
    }
    if (updates.cicdTool !== undefined) {
      updatedPipeline.cicdTool = updates.cicdTool;
    }
    if (updates.monitoringTool !== undefined) {
      updatedPipeline.monitoringTool = updates.monitoringTool;
    }
    if (updates.loggingTool !== undefined) {
      updatedPipeline.loggingTool = updates.loggingTool;
    }
    if (updates.status !== undefined) {
      updatedPipeline.status = String(updates.status).trim();
    }

    updatedPipeline.updatedAt = new Date().toISOString();
    updatedPipeline.version = incrementVersion(existing.version);

    generated[index] = updatedPipeline;
    saveData(STORAGE_KEYS.GENERATED_PIPELINES, generated);

    logAction(updates.userId || null, AUDIT_ACTIONS.PIPELINE_CONFIG_UPDATE, {
      pipelineId,
      applicationName: updatedPipeline.applicationName,
      updatedFields: Object.keys(updates).filter((k) => k !== 'userId'),
    });

    return { success: true, pipeline: updatedPipeline, errors: [] };
  } catch (_err) {
    console.error('PipelineService: Failed to update pipeline:', _err);
    return { success: false, pipeline: null, errors: ['Failed to update pipeline.'] };
  }
};

// ---------------------------------------------------------------------------
// Public API — Delete Pipeline
// ---------------------------------------------------------------------------

/**
 * Delete a generated pipeline by its ID.
 *
 * @param {string} pipelineId - The pipeline ID to delete.
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean, error: string|null }}
 */
export const deletePipeline = (pipelineId, userId) => {
  try {
    if (!pipelineId || typeof pipelineId !== 'string') {
      return { success: false, error: 'Pipeline ID is required.' };
    }

    const generated = loadData(STORAGE_KEYS.GENERATED_PIPELINES, []);
    const index = generated.findIndex((p) => p.id === pipelineId);

    if (index === -1) {
      return { success: false, error: `Pipeline with ID "${pipelineId}" not found.` };
    }

    const removed = generated[index];
    generated.splice(index, 1);
    saveData(STORAGE_KEYS.GENERATED_PIPELINES, generated);

    logAction(userId || null, AUDIT_ACTIONS.PIPELINE_CONFIG_UPDATE, {
      pipelineId: removed.id,
      applicationId: removed.applicationId,
      applicationName: removed.applicationName,
      action: 'pipeline_deleted',
    });

    return { success: true, error: null };
  } catch (_err) {
    console.error('PipelineService: Failed to delete pipeline:', _err);
    return { success: false, error: 'Failed to delete pipeline.' };
  }
};

// ---------------------------------------------------------------------------
// Public API — Pipeline Summary & Statistics
// ---------------------------------------------------------------------------

/**
 * Get a summary of all pipelines and their statistics.
 *
 * @returns {{
 *   totalPipelines: number,
 *   totalGenerated: number,
 *   totalRuns: number,
 *   byPlatform: Array<{ platform: string, count: number }>,
 *   byStatus: Array<{ status: string, count: number }>,
 *   recentRuns: Array<Object>,
 *   successRate: number,
 *   averageDurationSeconds: number,
 * }}
 */
export const getPipelinesSummary = () => {
  try {
    const configs = loadData(STORAGE_KEYS.PIPELINE_CONFIGS, MOCK_PIPELINE_CONFIGS);
    const generated = loadData(STORAGE_KEYS.GENERATED_PIPELINES, []);
    const runs = loadData(STORAGE_KEYS.PIPELINE_RUNS, MOCK_PIPELINE_RUNS);

    // Count by platform
    const platformCounts = {};
    generated.forEach((p) => {
      const key = p.platform || 'unknown';
      platformCounts[key] = (platformCounts[key] || 0) + 1;
    });
    const byPlatform = Object.entries(platformCounts).map(([platform, count]) => ({
      platform,
      count,
    }));

    // Count runs by status
    const statusCounts = {};
    runs.forEach((r) => {
      const key = r.status || 'unknown';
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Calculate success rate
    const completedRuns = runs.filter(
      (r) => r.status === PIPELINE_STATUSES.SUCCESS || r.status === PIPELINE_STATUSES.FAILED,
    );
    const successfulRuns = runs.filter((r) => r.status === PIPELINE_STATUSES.SUCCESS);
    const successRate =
      completedRuns.length > 0
        ? parseFloat(((successfulRuns.length / completedRuns.length) * 100).toFixed(2))
        : 0;

    // Calculate average duration
    const runsWithDuration = runs.filter(
      (r) => typeof r.durationSeconds === 'number' && r.durationSeconds > 0,
    );
    const averageDurationSeconds =
      runsWithDuration.length > 0
        ? Math.round(
            runsWithDuration.reduce((sum, r) => sum + r.durationSeconds, 0) /
              runsWithDuration.length,
          )
        : 0;

    // Recent runs (last 5)
    const sortedRuns = [...runs].sort((a, b) => {
      const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return dateB - dateA;
    });
    const recentRuns = sortedRuns.slice(0, 5);

    return {
      totalPipelines: configs.length + generated.filter(
        (g) => !configs.some((c) => c.applicationId === g.applicationId),
      ).length,
      totalGenerated: generated.length,
      totalRuns: runs.length,
      byPlatform,
      byStatus,
      recentRuns,
      successRate,
      averageDurationSeconds,
    };
  } catch (_err) {
    console.error('PipelineService: Failed to get pipeline summary:', _err);
    return {
      totalPipelines: 0,
      totalGenerated: 0,
      totalRuns: 0,
      byPlatform: [],
      byStatus: [],
      recentRuns: [],
      successRate: 0,
      averageDurationSeconds: 0,
    };
  }
};

// ---------------------------------------------------------------------------
// Public API — Golden Pipeline Template Access
// ---------------------------------------------------------------------------

/**
 * Get the Golden Pipeline template for preview or configuration.
 * Delegates to the pipelineTemplates utility.
 *
 * @param {Object} [options]
 * @param {string} [options.platform='jenkins'] - CI/CD platform identifier.
 * @param {string} [options.criticalityTier] - Application criticality tier.
 * @param {boolean} [options.includeOptionalStages=true] - Whether to include optional stages.
 * @param {string[]} [options.excludeStages=[]] - Stage IDs to exclude.
 * @returns {Object} Golden Pipeline template object.
 */
export const getGoldenPipeline = (options = {}) => {
  return getGoldenPipelineTemplate(options);
};

/**
 * Get all available CI/CD platforms.
 *
 * @returns {Array<Object>} Array of platform configuration summaries.
 */
export const getAvailableCICDPlatforms = () => {
  return getAvailablePlatforms();
};

/**
 * Get pipeline policy rules, optionally filtered.
 *
 * @param {Object} [options]
 * @param {string} [options.stageId] - Filter by stage ID.
 * @param {string} [options.stageType] - Filter by stage type.
 * @param {string} [options.enforcement] - Filter by enforcement level.
 * @param {string} [options.criticalityTier] - Filter by criticality tier.
 * @returns {Array<Object>} Array of policy rule objects.
 */
export const getPipelinePolicyRules = (options = {}) => {
  return getPolicyRules(options);
};

/**
 * Get pipeline summary statistics for a given criticality tier.
 *
 * @param {Object} [options]
 * @param {string} [options.platform] - CI/CD platform.
 * @param {string} [options.criticalityTier] - Application criticality tier.
 * @returns {Object} Pipeline summary statistics.
 */
export const getGoldenPipelineSummary = (options = {}) => {
  return getPipelineSummary(options);
};

// ---------------------------------------------------------------------------
// Public API — Reset
// ---------------------------------------------------------------------------

/**
 * Reset all generated pipelines. Useful for development and testing.
 *
 * @param {string} [userId] - ID of the user performing the action.
 * @returns {{ success: boolean }}
 */
export const resetGeneratedPipelines = (userId) => {
  try {
    saveData(STORAGE_KEYS.GENERATED_PIPELINES, []);
    saveData(STORAGE_KEYS.PIPELINE_CONFIGS, MOCK_PIPELINE_CONFIGS);
    saveData(STORAGE_KEYS.PIPELINE_RUNS, MOCK_PIPELINE_RUNS);

    logAction(userId || null, AUDIT_ACTIONS.SETTINGS_UPDATE, {
      message: 'All generated pipelines have been reset.',
    });

    return { success: true };
  } catch (_err) {
    console.error('PipelineService: Failed to reset generated pipelines:', _err);
    return { success: false };
  }
};

// ---------------------------------------------------------------------------
// Internal Utility
// ---------------------------------------------------------------------------

/**
 * Increment a semver version string.
 * @param {string} version - Current version string (e.g. '1.0.0').
 * @returns {string} Incremented version string.
 */
const incrementVersion = (version) => {
  if (!version || typeof version !== 'string') {
    return '1.0.1';
  }

  const parts = version.split('.');
  if (parts.length !== 3) {
    return '1.0.1';
  }

  const patch = parseInt(parts[2], 10);
  if (Number.isNaN(patch)) {
    return '1.0.1';
  }

  return `${parts[0]}.${parts[1]}.${patch + 1}`;
};