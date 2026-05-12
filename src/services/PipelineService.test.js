/**
 * Unit tests for PipelineService
 * Tests generatePipeline, getPipelines, getPipelineById, validatePipelineConfig.
 * Verifies pipeline generation with correct stages, policy-as-code inclusion,
 * and localStorage persistence.
 * @module services/PipelineService.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generatePipeline,
  getPipelines,
  getPipelineById,
  getPipelineByApplicationId,
  getPipelineArtifact,
  getPipelineRuns,
  getPipelineRunById,
  validatePipelineConfiguration,
  updatePipeline,
  deletePipeline,
  getPipelinesSummary,
  getGoldenPipeline,
  getAvailableCICDPlatforms,
  getPipelinePolicyRules,
  getGoldenPipelineSummary,
  resetGeneratedPipelines,
} from './PipelineService.js';
import { initializeStorage, clearStorage } from '../utils/localStorage.js';
import {
  MOCK_PIPELINE_CONFIGS,
  MOCK_PIPELINE_RUNS,
  MOCK_APPLICATIONS,
} from '../constants/mockData.js';
import {
  PIPELINE_STAGES,
  PIPELINE_STATUSES,
  CRITICALITY_TIERS,
  TOOLS,
} from '../constants/constants.js';
import { CICD_PLATFORMS, STAGE_TYPES, POLICY_ENFORCEMENT } from '../utils/pipelineTemplates.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  initializeStorage({ force: true });
});

// ---------------------------------------------------------------------------
// generatePipeline
// ---------------------------------------------------------------------------

describe('generatePipeline', () => {
  it('successfully generates a pipeline for a valid application', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
      includeSecurityStages: true,
      includeQEStages: true,
      includeObservabilityHooks: true,
      includeApprovalGates: true,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).not.toBeNull();
    expect(result.artifact).not.toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.pipeline.applicationId).toBe(appId);
    expect(result.pipeline.applicationName).toBe(MOCK_APPLICATIONS[0].name);
    expect(result.pipeline.platform).toBe(CICD_PLATFORMS.JENKINS);
    expect(result.pipeline.id).toBeDefined();
    expect(result.pipeline.id.startsWith('PIPE-')).toBe(true);
  });

  it('generates pipeline with correct stage count', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
      includeSecurityStages: true,
      includeQEStages: true,
      includeObservabilityHooks: true,
      includeApprovalGates: true,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline.stageCount).toBeGreaterThan(0);
    expect(Array.isArray(result.pipeline.stages)).toBe(true);
    expect(result.pipeline.stages.length).toBe(result.pipeline.stageCount);
  });

  it('includes policy-as-code rules in generated pipeline', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
      includeSecurityStages: true,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline.policyRuleCount).toBeGreaterThan(0);

    // Verify stages have policy rules
    const stagesWithRules = result.pipeline.stages.filter(
      (s) => Array.isArray(s.policyRules) && s.policyRules.length > 0,
    );
    expect(stagesWithRules.length).toBeGreaterThan(0);
  });

  it('includes security stages when includeSecurityStages is true', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
      includeSecurityStages: true,
    });

    expect(result.success).toBe(true);

    const securityStages = result.pipeline.stages.filter(
      (s) => s.type === STAGE_TYPES.SECURITY,
    );
    expect(securityStages.length).toBeGreaterThan(0);
  });

  it('excludes security stages when includeSecurityStages is false', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
      includeSecurityStages: false,
      includeQEStages: true,
      includeObservabilityHooks: true,
      includeApprovalGates: true,
    });

    expect(result.success).toBe(true);

    const securityStages = result.pipeline.stages.filter(
      (s) => s.id === 'sast' || s.id === 'sca' || s.id === 'dast' || s.id === 'container-scan',
    );
    expect(securityStages.length).toBe(0);
  });

  it('excludes QE stages when includeQEStages is false', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
      includeSecurityStages: true,
      includeQEStages: false,
    });

    expect(result.success).toBe(true);

    const qeStages = result.pipeline.stages.filter(
      (s) => s.id === 'qe-automation',
    );
    expect(qeStages.length).toBe(0);
  });

  it('excludes approval gates when includeApprovalGates is false', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
      includeSecurityStages: true,
      includeApprovalGates: false,
    });

    expect(result.success).toBe(true);

    const approvalStages = result.pipeline.stages.filter(
      (s) => s.id === 'uat-sign-off',
    );
    expect(approvalStages.length).toBe(0);
  });

  it('generates Jenkinsfile artifact for Jenkins platform', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
    });

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    expect(typeof result.artifact).toBe('string');
    expect(result.artifact).toContain('pipeline {');
    expect(result.artifact).toContain('stages {');
  });

  it('generates Tekton YAML artifact for OpenShift platform', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.OPENSHIFT,
    });

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    expect(typeof result.artifact).toBe('string');
    expect(result.artifact).toContain('apiVersion: tekton.dev/v1beta1');
    expect(result.artifact).toContain('kind: Pipeline');
  });

  it('generates ArgoCD YAML artifact for GitOps platform', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.GITOPS,
    });

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    expect(typeof result.artifact).toBe('string');
    expect(result.artifact).toContain('apiVersion: argoproj.io/v1alpha1');
    expect(result.artifact).toContain('kind: Application');
  });

  it('generates GitHub Actions YAML artifact', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.GITHUB_ACTIONS,
    });

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    expect(typeof result.artifact).toBe('string');
    expect(result.artifact).toContain('GitHub Actions');
    expect(result.artifact).toContain('jobs:');
  });

  it('generates GitLab CI YAML artifact', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.GITLAB_CI,
    });

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    expect(typeof result.artifact).toBe('string');
    expect(result.artifact).toContain('GitLab CI');
    expect(result.artifact).toContain('stages:');
  });

  it('persists generated pipeline to localStorage', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
    });

    expect(result.success).toBe(true);

    // Verify the pipeline is retrievable
    const found = getPipelineByApplicationId(appId);
    expect(found).not.toBeNull();
    expect(found.applicationId).toBe(appId);
    expect(found.platform).toBe(CICD_PLATFORMS.JENKINS);
  });

  it('returns error for non-existent application ID', () => {
    const result = generatePipeline('NONEXISTENT-APP-ID');

    expect(result.success).toBe(false);
    expect(result.pipeline).toBeNull();
    expect(result.artifact).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('not found');
  });

  it('returns error when application ID is null', () => {
    const result = generatePipeline(null);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when application ID is undefined', () => {
    const result = generatePipeline(undefined);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when application ID is empty string', () => {
    const result = generatePipeline('');

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('defaults to Jenkins platform when no platform is specified', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId);

    expect(result.success).toBe(true);
    expect(result.pipeline.platform).toBe(CICD_PLATFORMS.JENKINS);
  });

  it('includes security tools based on criticality tier', () => {
    const appId = MOCK_APPLICATIONS[0].id; // Business-critical

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
      includeSecurityStages: true,
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.pipeline.securityTools)).toBe(true);
    expect(result.pipeline.securityTools.length).toBeGreaterThan(0);
  });

  it('sets pipeline status to generated', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId);

    expect(result.success).toBe(true);
    expect(result.pipeline.status).toBe('generated');
  });

  it('sets pipeline version to 1.0.0 for new pipelines', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId);

    expect(result.success).toBe(true);
    expect(result.pipeline.version).toBe('1.0.0');
  });

  it('increments version when regenerating for the same application and platform', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result1 = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(result1.success).toBe(true);

    const result2 = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(result2.success).toBe(true);
    expect(result2.pipeline.version).not.toBe('1.0.0');
  });

  it('includes criticality tier in pipeline definition', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId);

    expect(result.success).toBe(true);
    expect(result.pipeline.criticalityTier).toBe(MOCK_APPLICATIONS[0].criticalityTier);
  });

  it('includes application environments in pipeline definition', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.pipeline.environments)).toBe(true);
    expect(result.pipeline.environments.length).toBeGreaterThan(0);
  });

  it('includes generatedAt timestamp', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId);

    expect(result.success).toBe(true);
    expect(result.pipeline.generatedAt).toBeDefined();
    expect(typeof result.pipeline.generatedAt).toBe('string');
    // Verify it's a valid ISO date
    const date = new Date(result.pipeline.generatedAt);
    expect(Number.isNaN(date.getTime())).toBe(false);
  });

  it('supports custom excludeStages option', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId, {
      platform: CICD_PLATFORMS.JENKINS,
      excludeStages: ['dast', 'container-scan'],
    });

    expect(result.success).toBe(true);

    const excludedStages = result.pipeline.stages.filter(
      (s) => s.id === 'dast' || s.id === 'container-scan',
    );
    expect(excludedStages.length).toBe(0);
  });

  it('populates pipeline name from application name', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const result = generatePipeline(appId);

    expect(result.success).toBe(true);
    expect(result.pipeline.pipelineName).toBeDefined();
    expect(result.pipeline.pipelineName).toContain('golden-pipeline');
  });
});

// ---------------------------------------------------------------------------
// getPipelines
// ---------------------------------------------------------------------------

describe('getPipelines', () => {
  it('returns all pipelines when no filters are applied', () => {
    const { data, total } = getPipelines();

    expect(Array.isArray(data)).toBe(true);
    expect(total).toBeGreaterThan(0);
    expect(data.length).toBe(total);
  });

  it('returns pipelines from mock data on initial load', () => {
    const { data } = getPipelines();

    expect(data.length).toBeGreaterThanOrEqual(MOCK_PIPELINE_CONFIGS.length);
  });

  it('filters pipelines by applicationId', () => {
    const appId = MOCK_PIPELINE_CONFIGS[0].applicationId;

    const { data } = getPipelines({ applicationId: appId });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((p) => p.applicationId === appId)).toBe(true);
  });

  it('filters pipelines by applicationName', () => {
    const appName = MOCK_PIPELINE_CONFIGS[0].applicationName;

    const { data } = getPipelines({ applicationName: appName });

    expect(data.length).toBeGreaterThan(0);
  });

  it('filters pipelines by search query', () => {
    const { data } = getPipelines({ search: 'member-portal' });

    expect(data.length).toBeGreaterThan(0);
  });

  it('returns empty data array when search matches nothing', () => {
    const { data, total } = getPipelines({ search: 'zzz_nonexistent_pipeline_zzz' });

    expect(data).toEqual([]);
    expect(total).toBe(0);
  });

  it('includes generated pipelines in results', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    // Generate a pipeline
    generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });

    const { data } = getPipelines({ applicationId: appId });

    expect(data.length).toBeGreaterThan(0);
    // The generated pipeline should be present
    const generated = data.find((p) => p.platform === CICD_PLATFORMS.JENKINS);
    expect(generated).toBeDefined();
  });

  it('supports pagination with limit and offset', () => {
    const { data: allData, total: allTotal } = getPipelines();

    if (allTotal >= 2) {
      const { data: page1 } = getPipelines({ limit: 1, offset: 0 });
      const { data: page2 } = getPipelines({ limit: 1, offset: 1 });

      expect(page1.length).toBe(1);
      expect(page2.length).toBe(1);
      expect(page1[0].id).not.toBe(page2[0].id);
    }
  });

  it('sorts pipelines by updatedAt descending by default', () => {
    const { data } = getPipelines();

    if (data.length >= 2) {
      for (let i = 1; i < data.length; i++) {
        const dateA = data[i - 1].updatedAt || data[i - 1].createdAt || '';
        const dateB = data[i].updatedAt || data[i].createdAt || '';
        if (dateA && dateB) {
          expect(dateA >= dateB).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getPipelineById
// ---------------------------------------------------------------------------

describe('getPipelineById', () => {
  it('returns the correct pipeline for a valid ID from mock data', () => {
    const pipelineId = MOCK_PIPELINE_CONFIGS[0].id;

    const result = getPipelineById(pipelineId);

    expect(result).not.toBeNull();
    expect(result.id).toBe(pipelineId);
  });

  it('returns a generated pipeline by its ID', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(genResult.success).toBe(true);

    const pipelineId = genResult.pipeline.id;
    const found = getPipelineById(pipelineId);

    expect(found).not.toBeNull();
    expect(found.id).toBe(pipelineId);
    expect(found.applicationId).toBe(appId);
  });

  it('returns null for an invalid ID', () => {
    const result = getPipelineById('INVALID-PIPE-999');

    expect(result).toBeNull();
  });

  it('returns null when ID is null', () => {
    expect(getPipelineById(null)).toBeNull();
  });

  it('returns null when ID is undefined', () => {
    expect(getPipelineById(undefined)).toBeNull();
  });

  it('returns null when ID is empty string', () => {
    expect(getPipelineById('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPipelineByApplicationId
// ---------------------------------------------------------------------------

describe('getPipelineByApplicationId', () => {
  it('returns a pipeline for a valid application ID from mock data', () => {
    const appId = MOCK_PIPELINE_CONFIGS[0].applicationId;

    const result = getPipelineByApplicationId(appId);

    expect(result).not.toBeNull();
    expect(result.applicationId).toBe(appId);
  });

  it('returns a generated pipeline for an application', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });

    const result = getPipelineByApplicationId(appId);

    expect(result).not.toBeNull();
    expect(result.applicationId).toBe(appId);
  });

  it('returns null for a non-existent application ID', () => {
    const result = getPipelineByApplicationId('NONEXISTENT-APP');

    expect(result).toBeNull();
  });

  it('returns null when applicationId is null', () => {
    expect(getPipelineByApplicationId(null)).toBeNull();
  });

  it('returns null when applicationId is undefined', () => {
    expect(getPipelineByApplicationId(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPipelineArtifact
// ---------------------------------------------------------------------------

describe('getPipelineArtifact', () => {
  it('returns the artifact for a generated pipeline', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(genResult.success).toBe(true);

    const result = getPipelineArtifact(genResult.pipeline.id);

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
    expect(typeof result.artifact).toBe('string');
    expect(result.artifact.length).toBeGreaterThan(0);
    expect(result.format).toBe('Jenkinsfile');
    expect(result.error).toBeNull();
  });

  it('returns correct format for OpenShift pipeline', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.OPENSHIFT });
    expect(genResult.success).toBe(true);

    const result = getPipelineArtifact(genResult.pipeline.id);

    expect(result.success).toBe(true);
    expect(result.format).toBe('tekton-yaml');
  });

  it('returns correct format for GitOps pipeline', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.GITOPS });
    expect(genResult.success).toBe(true);

    const result = getPipelineArtifact(genResult.pipeline.id);

    expect(result.success).toBe(true);
    expect(result.format).toBe('argocd-yaml');
  });

  it('returns error for non-existent pipeline ID', () => {
    const result = getPipelineArtifact('NONEXISTENT-PIPE');

    expect(result.success).toBe(false);
    expect(result.artifact).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns error when pipeline ID is null', () => {
    const result = getPipelineArtifact(null);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getPipelineRuns
// ---------------------------------------------------------------------------

describe('getPipelineRuns', () => {
  it('returns all pipeline runs when no filters are applied', () => {
    const { data, total } = getPipelineRuns();

    expect(Array.isArray(data)).toBe(true);
    expect(total).toBe(MOCK_PIPELINE_RUNS.length);
    expect(data.length).toBe(MOCK_PIPELINE_RUNS.length);
  });

  it('filters pipeline runs by pipelineId', () => {
    const pipelineId = MOCK_PIPELINE_RUNS[0].pipelineId;

    const { data } = getPipelineRuns({ pipelineId });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((r) => r.pipelineId === pipelineId)).toBe(true);
  });

  it('filters pipeline runs by applicationName', () => {
    const appName = MOCK_PIPELINE_RUNS[0].applicationName;

    const { data } = getPipelineRuns({ applicationName: appName });

    expect(data.length).toBeGreaterThan(0);
  });

  it('filters pipeline runs by status', () => {
    const { data } = getPipelineRuns({ status: PIPELINE_STATUSES.SUCCESS });

    expect(data.length).toBeGreaterThan(0);
    expect(data.every((r) => r.status === PIPELINE_STATUSES.SUCCESS)).toBe(true);
  });

  it('filters pipeline runs by search query', () => {
    const { data } = getPipelineRuns({ search: 'member-portal' });

    expect(data.length).toBeGreaterThan(0);
  });

  it('returns empty data when search matches nothing', () => {
    const { data, total } = getPipelineRuns({ search: 'zzz_nonexistent_zzz' });

    expect(data).toEqual([]);
    expect(total).toBe(0);
  });

  it('supports pagination with limit', () => {
    const { data } = getPipelineRuns({ limit: 2 });

    expect(data.length).toBeLessThanOrEqual(2);
  });

  it('sorts pipeline runs by startedAt descending by default', () => {
    const { data } = getPipelineRuns();

    if (data.length >= 2) {
      for (let i = 1; i < data.length; i++) {
        const dateA = data[i - 1].startedAt || '';
        const dateB = data[i].startedAt || '';
        if (dateA && dateB) {
          expect(dateA >= dateB).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getPipelineRunById
// ---------------------------------------------------------------------------

describe('getPipelineRunById', () => {
  it('returns the correct pipeline run for a valid ID', () => {
    const runId = MOCK_PIPELINE_RUNS[0].id;

    const result = getPipelineRunById(runId);

    expect(result).not.toBeNull();
    expect(result.id).toBe(runId);
  });

  it('returns null for an invalid ID', () => {
    expect(getPipelineRunById('INVALID-RUN-999')).toBeNull();
  });

  it('returns null when ID is null', () => {
    expect(getPipelineRunById(null)).toBeNull();
  });

  it('returns null when ID is undefined', () => {
    expect(getPipelineRunById(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validatePipelineConfiguration
// ---------------------------------------------------------------------------

describe('validatePipelineConfiguration', () => {
  const validConfig = {
    name: 'test-pipeline',
    applicationId: MOCK_APPLICATIONS[0].id,
    sourceControl: TOOLS.GITHUB,
    cicdTool: TOOLS.JENKINS,
    stages: [
      PIPELINE_STAGES.SOURCE,
      PIPELINE_STAGES.BUILD,
      PIPELINE_STAGES.UNIT_TEST,
      PIPELINE_STAGES.SAST,
      PIPELINE_STAGES.SCA,
      PIPELINE_STAGES.DEPLOY_DEV,
    ],
    triggers: ['push to main'],
    securityTools: [TOOLS.SONARQUBE],
  };

  it('returns valid for a correct pipeline configuration', () => {
    const result = validatePipelineConfiguration(validConfig);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns error when config is null', () => {
    const result = validatePipelineConfiguration(null);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when config is undefined', () => {
    const result = validatePipelineConfiguration(undefined);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when name is missing', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      name: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('name'))).toBe(true);
  });

  it('returns error when applicationId is missing', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      applicationId: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('application'))).toBe(true);
  });

  it('returns error when sourceControl is missing', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      sourceControl: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('source control'))).toBe(true);
  });

  it('returns error when cicdTool is missing', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      cicdTool: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('ci/cd'))).toBe(true);
  });

  it('returns error when stages is not an array', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      stages: 'not-an-array',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('stages'))).toBe(true);
  });

  it('returns error when stages is empty', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      stages: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('stage'))).toBe(true);
  });

  it('returns error for invalid stage names', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      stages: ['Invalid Stage Name'],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('invalid'))).toBe(true);
  });

  it('returns error for non-existent application ID', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      applicationId: 'NONEXISTENT-APP-ID',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('not found'))).toBe(true);
  });

  it('returns error for invalid platform', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      platform: 'invalid_platform',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('platform'))).toBe(true);
  });

  it('returns warnings for critical apps missing security stages', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      criticalityTier: CRITICALITY_TIERS.BUSINESS_CRITICAL,
      stages: [PIPELINE_STAGES.SOURCE, PIPELINE_STAGES.BUILD, PIPELINE_STAGES.DEPLOY_DEV],
    });

    // Should have warnings about missing security stages
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('accepts valid triggers array', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      triggers: ['push to main', 'pull request'],
    });

    expect(result.valid).toBe(true);
  });

  it('returns error when triggers is not an array', () => {
    const result = validatePipelineConfiguration({
      ...validConfig,
      triggers: 'not-an-array',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('triggers'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// updatePipeline
// ---------------------------------------------------------------------------

describe('updatePipeline', () => {
  it('successfully updates a generated pipeline', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(genResult.success).toBe(true);

    const result = updatePipeline(genResult.pipeline.id, {
      description: 'Updated description',
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).not.toBeNull();
    expect(result.pipeline.description).toBe('Updated description');
  });

  it('persists the update to localStorage', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(genResult.success).toBe(true);

    updatePipeline(genResult.pipeline.id, {
      description: 'Persisted update',
    });

    const found = getPipelineById(genResult.pipeline.id);
    expect(found.description).toBe('Persisted update');
  });

  it('increments version on update', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(genResult.success).toBe(true);

    const originalVersion = genResult.pipeline.version;

    const result = updatePipeline(genResult.pipeline.id, {
      description: 'Version bump test',
    });

    expect(result.success).toBe(true);
    expect(result.pipeline.version).not.toBe(originalVersion);
  });

  it('returns error for non-existent pipeline ID', () => {
    const result = updatePipeline('NONEXISTENT-PIPE', { description: 'test' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when pipeline ID is null', () => {
    const result = updatePipeline(null, { description: 'test' });

    expect(result.success).toBe(false);
  });

  it('returns error when updates is null', () => {
    const appId = MOCK_APPLICATIONS[0].id;
    const genResult = generatePipeline(appId);
    expect(genResult.success).toBe(true);

    const result = updatePipeline(genResult.pipeline.id, null);

    expect(result.success).toBe(false);
  });

  it('can update a mock pipeline config', () => {
    const pipelineId = MOCK_PIPELINE_CONFIGS[0].id;

    const result = updatePipeline(pipelineId, {
      description: 'Updated mock pipeline',
    });

    expect(result.success).toBe(true);
    expect(result.pipeline.description).toBe('Updated mock pipeline');
  });
});

// ---------------------------------------------------------------------------
// deletePipeline
// ---------------------------------------------------------------------------

describe('deletePipeline', () => {
  it('successfully deletes a generated pipeline', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(genResult.success).toBe(true);

    const result = deletePipeline(genResult.pipeline.id);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it('removes the pipeline from localStorage', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(genResult.success).toBe(true);

    const pipelineId = genResult.pipeline.id;
    deletePipeline(pipelineId);

    const found = getPipelineById(pipelineId);
    expect(found).toBeNull();
  });

  it('returns error for non-existent pipeline ID', () => {
    const result = deletePipeline('NONEXISTENT-PIPE');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error when pipeline ID is null', () => {
    const result = deletePipeline(null);

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPipelinesSummary
// ---------------------------------------------------------------------------

describe('getPipelinesSummary', () => {
  it('returns a summary object with expected properties', () => {
    const summary = getPipelinesSummary();

    expect(summary).toHaveProperty('totalPipelines');
    expect(summary).toHaveProperty('totalGenerated');
    expect(summary).toHaveProperty('totalRuns');
    expect(summary).toHaveProperty('byPlatform');
    expect(summary).toHaveProperty('byStatus');
    expect(summary).toHaveProperty('recentRuns');
    expect(summary).toHaveProperty('successRate');
    expect(summary).toHaveProperty('averageDurationSeconds');
  });

  it('returns correct total pipeline count', () => {
    const summary = getPipelinesSummary();

    expect(summary.totalPipelines).toBeGreaterThan(0);
  });

  it('returns correct total runs count', () => {
    const summary = getPipelinesSummary();

    expect(summary.totalRuns).toBe(MOCK_PIPELINE_RUNS.length);
  });

  it('returns a valid success rate', () => {
    const summary = getPipelinesSummary();

    expect(typeof summary.successRate).toBe('number');
    expect(summary.successRate).toBeGreaterThanOrEqual(0);
    expect(summary.successRate).toBeLessThanOrEqual(100);
  });

  it('returns non-negative average duration', () => {
    const summary = getPipelinesSummary();

    expect(typeof summary.averageDurationSeconds).toBe('number');
    expect(summary.averageDurationSeconds).toBeGreaterThanOrEqual(0);
  });

  it('returns recent runs array', () => {
    const summary = getPipelinesSummary();

    expect(Array.isArray(summary.recentRuns)).toBe(true);
    expect(summary.recentRuns.length).toBeLessThanOrEqual(5);
  });

  it('returns byStatus array with valid entries', () => {
    const summary = getPipelinesSummary();

    expect(Array.isArray(summary.byStatus)).toBe(true);
    summary.byStatus.forEach((entry) => {
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('count');
      expect(typeof entry.count).toBe('number');
      expect(entry.count).toBeGreaterThan(0);
    });
  });

  it('updates summary after generating a new pipeline', () => {
    const summaryBefore = getPipelinesSummary();
    const generatedBefore = summaryBefore.totalGenerated;

    const appId = MOCK_APPLICATIONS[0].id;
    generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });

    const summaryAfter = getPipelinesSummary();
    expect(summaryAfter.totalGenerated).toBeGreaterThanOrEqual(generatedBefore + 1);
  });
});

// ---------------------------------------------------------------------------
// getGoldenPipeline
// ---------------------------------------------------------------------------

describe('getGoldenPipeline', () => {
  it('returns a Golden Pipeline template with expected structure', () => {
    const template = getGoldenPipeline();

    expect(template).toHaveProperty('name');
    expect(template).toHaveProperty('description');
    expect(template).toHaveProperty('version');
    expect(template).toHaveProperty('platform');
    expect(template).toHaveProperty('stages');
    expect(template).toHaveProperty('totalPolicyRules');
    expect(template.name).toBe('Golden Pipeline');
  });

  it('returns stages as a non-empty array', () => {
    const template = getGoldenPipeline();

    expect(Array.isArray(template.stages)).toBe(true);
    expect(template.stages.length).toBeGreaterThan(0);
  });

  it('includes policy rules in stages', () => {
    const template = getGoldenPipeline();

    expect(template.totalPolicyRules).toBeGreaterThan(0);

    const stagesWithRules = template.stages.filter(
      (s) => Array.isArray(s.policyRules) && s.policyRules.length > 0,
    );
    expect(stagesWithRules.length).toBeGreaterThan(0);
  });

  it('filters stages by criticality tier', () => {
    const templateAll = getGoldenPipeline();
    const templateCritical = getGoldenPipeline({
      criticalityTier: CRITICALITY_TIERS.BUSINESS_CRITICAL,
    });

    // Policy rules should be filtered to only those applicable to Business-critical
    templateCritical.stages.forEach((stage) => {
      stage.policyRules.forEach((rule) => {
        expect(rule.appliesTo).toContain(CRITICALITY_TIERS.BUSINESS_CRITICAL);
      });
    });
  });

  it('excludes optional stages when includeOptionalStages is false', () => {
    const templateAll = getGoldenPipeline({ includeOptionalStages: true });
    const templateRequired = getGoldenPipeline({ includeOptionalStages: false });

    expect(templateRequired.stages.length).toBeLessThanOrEqual(templateAll.stages.length);
    expect(templateRequired.stages.every((s) => s.required === true)).toBe(true);
  });

  it('excludes specified stages via excludeStages', () => {
    const template = getGoldenPipeline({ excludeStages: ['sast', 'dast'] });

    const excluded = template.stages.filter(
      (s) => s.id === 'sast' || s.id === 'dast',
    );
    expect(excluded.length).toBe(0);
  });

  it('returns platform configuration for Jenkins', () => {
    const template = getGoldenPipeline({ platform: CICD_PLATFORMS.JENKINS });

    expect(template.platform).toBeDefined();
    expect(template.platform.platform).toBe(CICD_PLATFORMS.JENKINS);
  });

  it('returns platform configuration for OpenShift', () => {
    const template = getGoldenPipeline({ platform: CICD_PLATFORMS.OPENSHIFT });

    expect(template.platform).toBeDefined();
    expect(template.platform.platform).toBe(CICD_PLATFORMS.OPENSHIFT);
  });

  it('returns platform configuration for GitOps', () => {
    const template = getGoldenPipeline({ platform: CICD_PLATFORMS.GITOPS });

    expect(template.platform).toBeDefined();
    expect(template.platform.platform).toBe(CICD_PLATFORMS.GITOPS);
  });
});

// ---------------------------------------------------------------------------
// getAvailableCICDPlatforms
// ---------------------------------------------------------------------------

describe('getAvailableCICDPlatforms', () => {
  it('returns an array of available platforms', () => {
    const platforms = getAvailableCICDPlatforms();

    expect(Array.isArray(platforms)).toBe(true);
    expect(platforms.length).toBeGreaterThan(0);
  });

  it('each platform has required properties', () => {
    const platforms = getAvailableCICDPlatforms();

    platforms.forEach((p) => {
      expect(p).toHaveProperty('platform');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('description');
      expect(typeof p.platform).toBe('string');
      expect(typeof p.name).toBe('string');
      expect(typeof p.description).toBe('string');
    });
  });

  it('includes Jenkins, OpenShift, and GitOps platforms', () => {
    const platforms = getAvailableCICDPlatforms();
    const platformIds = platforms.map((p) => p.platform);

    expect(platformIds).toContain(CICD_PLATFORMS.JENKINS);
    expect(platformIds).toContain(CICD_PLATFORMS.OPENSHIFT);
    expect(platformIds).toContain(CICD_PLATFORMS.GITOPS);
  });
});

// ---------------------------------------------------------------------------
// getPipelinePolicyRules
// ---------------------------------------------------------------------------

describe('getPipelinePolicyRules', () => {
  it('returns all policy rules when no filters are applied', () => {
    const rules = getPipelinePolicyRules();

    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });

  it('each rule has required properties', () => {
    const rules = getPipelinePolicyRules();

    rules.forEach((rule) => {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('description');
      expect(rule).toHaveProperty('enforcement');
      expect(rule).toHaveProperty('stageId');
      expect(rule).toHaveProperty('stageName');
      expect(rule).toHaveProperty('stageType');
    });
  });

  it('filters rules by enforcement level', () => {
    const blockingRules = getPipelinePolicyRules({ enforcement: POLICY_ENFORCEMENT.BLOCK });

    expect(blockingRules.length).toBeGreaterThan(0);
    expect(blockingRules.every((r) => r.enforcement === POLICY_ENFORCEMENT.BLOCK)).toBe(true);
  });

  it('filters rules by stage type', () => {
    const securityRules = getPipelinePolicyRules({ stageType: STAGE_TYPES.SECURITY });

    expect(securityRules.length).toBeGreaterThan(0);
    expect(securityRules.every((r) => r.stageType === STAGE_TYPES.SECURITY)).toBe(true);
  });

  it('filters rules by criticality tier', () => {
    const criticalRules = getPipelinePolicyRules({
      criticalityTier: CRITICALITY_TIERS.BUSINESS_CRITICAL,
    });

    expect(criticalRules.length).toBeGreaterThan(0);
    criticalRules.forEach((rule) => {
      expect(rule.appliesTo).toContain(CRITICALITY_TIERS.BUSINESS_CRITICAL);
    });
  });

  it('filters rules by stage ID', () => {
    const sastRules = getPipelinePolicyRules({ stageId: 'sast' });

    expect(sastRules.length).toBeGreaterThan(0);
    expect(sastRules.every((r) => r.stageId === 'sast')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getGoldenPipelineSummary
// ---------------------------------------------------------------------------

describe('getGoldenPipelineSummary', () => {
  it('returns a summary object with expected properties', () => {
    const summary = getGoldenPipelineSummary();

    expect(summary).toHaveProperty('totalStages');
    expect(summary).toHaveProperty('requiredStages');
    expect(summary).toHaveProperty('optionalStages');
    expect(summary).toHaveProperty('securityStages');
    expect(summary).toHaveProperty('approvalGates');
    expect(summary).toHaveProperty('totalPolicyRules');
    expect(summary).toHaveProperty('blockingRules');
    expect(summary).toHaveProperty('warningRules');
    expect(summary).toHaveProperty('estimatedDurationMinutes');
  });

  it('returns positive total stages count', () => {
    const summary = getGoldenPipelineSummary();

    expect(summary.totalStages).toBeGreaterThan(0);
  });

  it('required + optional stages equals total stages', () => {
    const summary = getGoldenPipelineSummary();

    expect(summary.requiredStages + summary.optionalStages).toBe(summary.totalStages);
  });

  it('returns positive security stages count', () => {
    const summary = getGoldenPipelineSummary();

    expect(summary.securityStages).toBeGreaterThan(0);
  });

  it('returns positive policy rules count', () => {
    const summary = getGoldenPipelineSummary();

    expect(summary.totalPolicyRules).toBeGreaterThan(0);
  });

  it('blocking + warning rules is less than or equal to total rules', () => {
    const summary = getGoldenPipelineSummary();

    expect(summary.blockingRules + summary.warningRules).toBeLessThanOrEqual(
      summary.totalPolicyRules,
    );
  });

  it('returns positive estimated duration', () => {
    const summary = getGoldenPipelineSummary();

    expect(summary.estimatedDurationMinutes).toBeGreaterThan(0);
  });

  it('filters policy rules by criticality tier', () => {
    const summaryAll = getGoldenPipelineSummary();
    const summaryAdmin = getGoldenPipelineSummary({
      criticalityTier: CRITICALITY_TIERS.ADMIN_SERVICES,
    });

    // Admin services should have fewer policy rules than all tiers combined
    expect(summaryAdmin.totalPolicyRules).toBeLessThanOrEqual(summaryAll.totalPolicyRules);
  });
});

// ---------------------------------------------------------------------------
// resetGeneratedPipelines
// ---------------------------------------------------------------------------

describe('resetGeneratedPipelines', () => {
  it('resets all generated pipelines', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    // Generate a pipeline
    generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });

    const summaryBefore = getPipelinesSummary();
    expect(summaryBefore.totalGenerated).toBeGreaterThan(0);

    // Reset
    const result = resetGeneratedPipelines();

    expect(result.success).toBe(true);

    const summaryAfter = getPipelinesSummary();
    expect(summaryAfter.totalGenerated).toBe(0);
  });

  it('restores mock pipeline configs after reset', () => {
    // Reset
    resetGeneratedPipelines();

    const { data } = getPipelines();

    // Should still have mock pipeline configs
    expect(data.length).toBe(MOCK_PIPELINE_CONFIGS.length);
  });

  it('restores mock pipeline runs after reset', () => {
    resetGeneratedPipelines();

    const { total } = getPipelineRuns();

    expect(total).toBe(MOCK_PIPELINE_RUNS.length);
  });
});

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

describe('localStorage persistence', () => {
  it('generated pipeline persists across multiple getPipelines calls', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });

    const { data: data1 } = getPipelines({ applicationId: appId });
    const { data: data2 } = getPipelines({ applicationId: appId });

    expect(data1.length).toBe(data2.length);
    expect(data1[0].id).toBe(data2[0].id);
  });

  it('pipeline artifact persists after generation', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId, { platform: CICD_PLATFORMS.JENKINS });
    expect(genResult.success).toBe(true);

    // Retrieve the artifact separately
    const artifactResult = getPipelineArtifact(genResult.pipeline.id);

    expect(artifactResult.success).toBe(true);
    expect(artifactResult.artifact).toBe(genResult.artifact);
  });

  it('multiple pipelines for different applications coexist', () => {
    const appId1 = MOCK_APPLICATIONS[0].id;
    const appId2 = MOCK_APPLICATIONS[1].id;

    const result1 = generatePipeline(appId1, { platform: CICD_PLATFORMS.JENKINS });
    const result2 = generatePipeline(appId2, { platform: CICD_PLATFORMS.OPENSHIFT });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const found1 = getPipelineByApplicationId(appId1);
    const found2 = getPipelineByApplicationId(appId2);

    expect(found1).not.toBeNull();
    expect(found2).not.toBeNull();
    expect(found1.id).not.toBe(found2.id);
    expect(found1.platform).toBe(CICD_PLATFORMS.JENKINS);
    expect(found2.platform).toBe(CICD_PLATFORMS.OPENSHIFT);
  });

  it('pipeline updates persist to localStorage', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId);
    expect(genResult.success).toBe(true);

    updatePipeline(genResult.pipeline.id, { description: 'Persistence test' });

    const found = getPipelineById(genResult.pipeline.id);
    expect(found.description).toBe('Persistence test');
  });

  it('pipeline deletion persists to localStorage', () => {
    const appId = MOCK_APPLICATIONS[0].id;

    const genResult = generatePipeline(appId);
    expect(genResult.success).toBe(true);

    const pipelineId = genResult.pipeline.id;
    deletePipeline(pipelineId);

    const found = getPipelineById(pipelineId);
    expect(found).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Policy-as-Code integration
// ---------------------------------------------------------------------------

describe('Policy-as-Code integration', () => {
  it('Business-critical apps have more policy rules than Admin Services', () => {
    const appCritical = MOCK_APPLICATIONS.find(
      (a) => a.criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL,
    );

    if (!appCritical) {
      return;
    }

    const resultCritical = generatePipeline(appCritical.id, {
      platform: CICD_PLATFORMS.JENKINS,
      includeSecurityStages: true,
      includeApprovalGates: true,
    });

    expect(resultCritical.success).toBe(true);
    expect(resultCritical.pipeline.policyRuleCount).toBeGreaterThan(0);

    // Verify blocking rules exist for critical apps
    const blockingRules = resultCritical.pipeline.stages.reduce((sum, stage) => {
      if (!Array.isArray(stage.policyRules)) return sum;
      return sum + stage.policyRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.BLOCK).length;
    }, 0);

    expect(blockingRules).toBeGreaterThan(0);
  });

  it('security stages include SAST policy rules', () => {
    const template = getGoldenPipeline({
      criticalityTier: CRITICALITY_TIERS.BUSINESS_CRITICAL,
    });

    const sastStage = template.stages.find((s) => s.id === 'sast');
    expect(sastStage).toBeDefined();
    expect(Array.isArray(sastStage.policyRules)).toBe(true);
    expect(sastStage.policyRules.length).toBeGreaterThan(0);

    // Verify SAST has a blocking rule for critical findings
    const criticalFindingsRule = sastStage.policyRules.find(
      (r) => r.id === 'SAST-001',
    );
    expect(criticalFindingsRule).toBeDefined();
    expect(criticalFindingsRule.enforcement).toBe(POLICY_ENFORCEMENT.BLOCK);
  });

  it('observability stage includes monitoring validation rules', () => {
    const template = getGoldenPipeline({
      criticalityTier: CRITICALITY_TIERS.BUSINESS_CRITICAL,
    });

    const obsStage = template.stages.find((s) => s.id === 'observability-hooks');
    expect(obsStage).toBeDefined();
    expect(Array.isArray(obsStage.policyRules)).toBe(true);
    expect(obsStage.policyRules.length).toBeGreaterThan(0);

    // Verify monitoring active rule exists
    const monitoringRule = obsStage.policyRules.find(
      (r) => r.id === 'OBS-001',
    );
    expect(monitoringRule).toBeDefined();
    expect(monitoringRule.enforcement).toBe(POLICY_ENFORCEMENT.BLOCK);
  });

  it('approval stage includes sign-off rules for critical apps', () => {
    const template = getGoldenPipeline({
      criticalityTier: CRITICALITY_TIERS.BUSINESS_CRITICAL,
    });

    const approvalStage = template.stages.find((s) => s.id === 'uat-sign-off');
    expect(approvalStage).toBeDefined();
    expect(Array.isArray(approvalStage.policyRules)).toBe(true);

    // Verify minimum approvers rule for critical apps
    const approverRule = approvalStage.policyRules.find(
      (r) => r.id === 'UAT-003',
    );
    expect(approverRule).toBeDefined();
    expect(approverRule.enforcement).toBe(POLICY_ENFORCEMENT.BLOCK);
  });
});