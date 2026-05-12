/**
 * Pipeline generation component for Horizon DevSecOps Portal
 * Select onboarded application, configure pipeline stages (SAST, DAST, SCA, QE,
 * observability), choose CI/CD platform (Jenkins, OpenShift, GitOps), set
 * policy-as-code rules, preview generated pipeline YAML/JSON, trigger generation.
 * Shows generation progress and result. Links to generated pipeline artifact.
 * @module components/pipeline/PipelineGenerator
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  Info,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Wrench,
  X,
  Eye,
  EyeOff,
  Activity,
  TestTube2,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Select from '../common/Select.jsx';
import Tabs from '../common/Tabs.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import {
  generatePipeline,
  getPipelines,
  getPipelineByApplicationId,
  getGoldenPipeline,
  getAvailableCICDPlatforms,
  getPipelinePolicyRules,
  getGoldenPipelineSummary,
  getPipelineArtifact,
} from '../../services/PipelineService.js';
import { getApplications, getApplicationById } from '../../services/CatalogService.js';
import {
  CRITICALITY_TIER_LIST,
  CRITICALITY_TIERS,
  PIPELINE_STAGES,
} from '../../constants/constants.js';
import {
  CICD_PLATFORMS,
  STAGE_TYPES,
  POLICY_ENFORCEMENT,
} from '../../utils/pipelineTemplates.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { value: CICD_PLATFORMS.JENKINS, label: 'Jenkins Declarative Pipeline' },
  { value: CICD_PLATFORMS.OPENSHIFT, label: 'OpenShift Pipeline (Tekton)' },
  { value: CICD_PLATFORMS.GITOPS, label: 'GitOps (ArgoCD)' },
  { value: CICD_PLATFORMS.GITHUB_ACTIONS, label: 'GitHub Actions' },
  { value: CICD_PLATFORMS.GITLAB_CI, label: 'GitLab CI' },
];

const STAGE_TYPE_ICONS = {
  [STAGE_TYPES.SOURCE]: GitBranch,
  [STAGE_TYPES.BUILD]: Wrench,
  [STAGE_TYPES.TEST]: TestTube2,
  [STAGE_TYPES.SECURITY]: Shield,
  [STAGE_TYPES.ARTIFACT]: FileText,
  [STAGE_TYPES.DEPLOY]: Server,
  [STAGE_TYPES.APPROVAL]: ClipboardCheck,
  [STAGE_TYPES.OBSERVABILITY]: Activity,
  [STAGE_TYPES.VALIDATION]: CheckCircle2,
};

const STAGE_TYPE_COLORS = {
  [STAGE_TYPES.SOURCE]: 'text-blue-600 dark:text-blue-400',
  [STAGE_TYPES.BUILD]: 'text-amber-600 dark:text-amber-400',
  [STAGE_TYPES.TEST]: 'text-pink-600 dark:text-pink-400',
  [STAGE_TYPES.SECURITY]: 'text-red-600 dark:text-red-400',
  [STAGE_TYPES.ARTIFACT]: 'text-purple-600 dark:text-purple-400',
  [STAGE_TYPES.DEPLOY]: 'text-green-600 dark:text-green-400',
  [STAGE_TYPES.APPROVAL]: 'text-indigo-600 dark:text-indigo-400',
  [STAGE_TYPES.OBSERVABILITY]: 'text-cyan-600 dark:text-cyan-400',
  [STAGE_TYPES.VALIDATION]: 'text-teal-600 dark:text-teal-400',
};

const ENFORCEMENT_VARIANT_MAP = {
  [POLICY_ENFORCEMENT.BLOCK]: 'danger',
  [POLICY_ENFORCEMENT.WARN]: 'warning',
  [POLICY_ENFORCEMENT.INFO]: 'info',
};

const CRITICALITY_VARIANT_MAP = {
  [CRITICALITY_TIERS.BUSINESS_CRITICAL]: 'danger',
  [CRITICALITY_TIERS.MISSION_CRITICAL]: 'warning',
  [CRITICALITY_TIERS.BUSINESS_OPERATIONAL]: 'info',
  [CRITICALITY_TIERS.ADMIN_SERVICES]: 'neutral',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Application selector for pipeline generation.
 */
function ApplicationSelector({ applications, selectedAppId, onChange, disabled }) {
  const options = useMemo(() => {
    return applications.map((app) => ({
      value: app.id,
      label: app.name,
      description: `${app.domainName || 'N/A'} · ${app.criticalityTier || 'N/A'}`,
    }));
  }, [applications]);

  return (
    <Select
      id="pipeline-app-selector"
      label="Select Application"
      placeholder="Choose an onboarded application..."
      options={options}
      value={selectedAppId}
      onChange={onChange}
      searchable={options.length > 5}
      searchPlaceholder="Search applications..."
      clearable
      required
      disabled={disabled}
      size="md"
      fullWidth
      emptyMessage="No onboarded applications available."
      noResultsMessage="No applications match your search."
      hint="Select the application to generate a Golden Pipeline for."
    />
  );
}

ApplicationSelector.propTypes = {
  applications: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedAppId: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Application info card displayed after selection.
 */
function ApplicationInfoCard({ application }) {
  if (!application) {
    return null;
  }

  const critVariant = CRITICALITY_VARIANT_MAP[application.criticalityTier] || 'neutral';

  return (
    <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            {application.name}
          </h4>
          {application.shortCode && (
            <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
              {application.shortCode}
            </p>
          )}
          {application.description && (
            <p className="mt-1 line-clamp-2 text-xs text-surface-500 dark:text-surface-400">
              {application.description}
            </p>
          )}
        </div>
        <Badge variant={critVariant} size="sm" dot>
          {application.criticalityTier || 'N/A'}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-surface-500 dark:text-surface-400">
        <span className="flex items-center gap-1">
          <Server size={12} className="text-surface-400 dark:text-surface-500" />
          {application.domainName || 'N/A'}
        </span>
        <span className="flex items-center gap-1">
          <Wrench size={12} className="text-surface-400 dark:text-surface-500" />
          {application.portfolioName || 'N/A'}
        </span>
        {application.ownerName && (
          <span className="flex items-center gap-1">
            <Info size={12} className="text-surface-400 dark:text-surface-500" />
            {application.ownerName}
          </span>
        )}
      </div>
      {Array.isArray(application.techStack) && application.techStack.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {application.techStack.map((tech) => (
            <Badge key={tech} variant="info" size="sm">
              {tech}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

ApplicationInfoCard.propTypes = {
  application: PropTypes.object,
};

/**
 * Platform selector component.
 */
function PlatformSelector({ value, onChange, disabled }) {
  return (
    <Select
      id="pipeline-platform-selector"
      label="CI/CD Platform"
      placeholder="Select CI/CD platform..."
      options={PLATFORM_OPTIONS}
      value={value}
      onChange={onChange}
      required
      disabled={disabled}
      size="md"
      fullWidth
      hint="Choose the CI/CD platform for pipeline generation."
    />
  );
}

PlatformSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Pipeline configuration toggles.
 */
function PipelineConfigToggles({ config, onChange, disabled }) {
  const handleToggle = useCallback(
    (key) => {
      onChange({ ...config, [key]: !config[key] });
    },
    [config, onChange],
  );

  const toggles = [
    {
      key: 'includeSecurityStages',
      label: 'Security Scanning Stages',
      description: 'Include SAST, DAST, SCA, and container scanning stages.',
      icon: Shield,
      color: 'text-red-600 dark:text-red-400',
    },
    {
      key: 'includeQEStages',
      label: 'QE & Performance Testing',
      description: 'Include performance, load, and regression testing stages.',
      icon: TestTube2,
      color: 'text-pink-600 dark:text-pink-400',
    },
    {
      key: 'includeObservabilityHooks',
      label: 'Observability Hooks',
      description: 'Include post-deployment monitoring and logging validation.',
      icon: Activity,
      color: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      key: 'includeApprovalGates',
      label: 'Approval Gates',
      description: 'Include manual approval gates before production deployment.',
      icon: ClipboardCheck,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
        Pipeline Configuration
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {toggles.map((toggle) => {
          const Icon = toggle.icon;
          const isEnabled = config[toggle.key] !== false;

          return (
            <button
              key={toggle.key}
              type="button"
              onClick={() => handleToggle(toggle.key)}
              disabled={disabled}
              className={clsx(
                'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all duration-200',
                disabled && 'pointer-events-none opacity-50',
                isEnabled
                  ? 'border-horizon-500 bg-horizon-50 dark:border-horizon-500 dark:bg-horizon-900/20'
                  : 'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600',
              )}
            >
              <div
                className={clsx(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all duration-200',
                  isEnabled
                    ? 'border-horizon-500 bg-horizon-500 text-white'
                    : 'border-surface-300 bg-white dark:border-surface-600 dark:bg-surface-800',
                )}
              >
                {isEnabled && <CheckCircle2 size={12} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={toggle.color} />
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {toggle.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                  {toggle.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

PipelineConfigToggles.propTypes = {
  config: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Pipeline stages preview component.
 */
function StagesPreview({ stages, criticalityTier }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (!stages || !Array.isArray(stages) || stages.length === 0) {
    return null;
  }

  const displayStages = expanded ? stages : stages.slice(0, 8);
  const hasMore = stages.length > 8;

  return (
    <div className="rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-horizon-500" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Pipeline Stages ({stages.length})
          </h4>
        </div>
        {criticalityTier && (
          <Badge variant={CRITICALITY_VARIANT_MAP[criticalityTier] || 'neutral'} size="sm" dot>
            {criticalityTier}
          </Badge>
        )}
      </div>
      <div className="p-4">
        <div className="space-y-2">
          {displayStages.map((stage, index) => {
            const Icon = STAGE_TYPE_ICONS[stage.type] || Settings;
            const colorClass = STAGE_TYPE_COLORS[stage.type] || 'text-surface-500';

            return (
              <div
                key={stage.id || index}
                className="flex items-center gap-3 rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-200 text-2xs font-semibold text-surface-600 dark:bg-surface-700 dark:text-surface-400">
                  {stage.order || index + 1}
                </span>
                <Icon size={14} className={clsx('flex-shrink-0', colorClass)} />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-surface-900 dark:text-surface-100">
                    {stage.name}
                  </span>
                </div>
                <Badge
                  variant={
                    stage.type === STAGE_TYPES.SECURITY
                      ? 'danger'
                      : stage.type === STAGE_TYPES.TEST
                        ? 'purple'
                        : stage.type === STAGE_TYPES.DEPLOY
                          ? 'success'
                          : 'neutral'
                  }
                  size="sm"
                >
                  {stage.type}
                </Badge>
                {stage.required && (
                  <Badge variant="horizon" size="sm">
                    Required
                  </Badge>
                )}
                {stage.policyRules && stage.policyRules.length > 0 && (
                  <span className="text-2xs text-surface-400 dark:text-surface-500">
                    {stage.policyRules.length} {stage.policyRules.length === 1 ? 'rule' : 'rules'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={toggleExpanded}
            className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
          >
            {expanded ? (
              <>
                <ChevronUp size={14} />
                Show less
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Show all {stages.length} stages
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

StagesPreview.propTypes = {
  stages: PropTypes.arrayOf(PropTypes.object),
  criticalityTier: PropTypes.string,
};

/**
 * Policy rules preview component.
 */
function PolicyRulesPreview({ stages }) {
  const [visible, setVisible] = useState(false);

  const toggleVisible = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  const allRules = useMemo(() => {
    if (!stages || !Array.isArray(stages)) {
      return [];
    }
    const rules = [];
    stages.forEach((stage) => {
      if (Array.isArray(stage.policyRules)) {
        stage.policyRules.forEach((rule) => {
          rules.push({
            ...rule,
            stageName: stage.name,
            stageType: stage.type,
          });
        });
      }
    });
    return rules;
  }, [stages]);

  const blockingRules = useMemo(
    () => allRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.BLOCK),
    [allRules],
  );
  const warningRules = useMemo(
    () => allRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.WARN),
    [allRules],
  );

  if (allRules.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
      <button
        type="button"
        onClick={toggleVisible}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-50 dark:hover:bg-surface-700/50"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-horizon-500" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Policy-as-Code Rules ({allRules.length})
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="danger" size="sm">
            {blockingRules.length} blocking
          </Badge>
          <Badge variant="warning" size="sm">
            {warningRules.length} warning
          </Badge>
          {visible ? (
            <ChevronUp size={16} className="text-surface-400 dark:text-surface-500" />
          ) : (
            <ChevronDown size={16} className="text-surface-400 dark:text-surface-500" />
          )}
        </div>
      </button>
      {visible && (
        <div className="border-t border-surface-200 p-4 dark:border-surface-700">
          <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
            {allRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start gap-3 rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <Badge
                  variant={ENFORCEMENT_VARIANT_MAP[rule.enforcement] || 'neutral'}
                  size="sm"
                  className="mt-0.5 flex-shrink-0"
                >
                  {rule.enforcement}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-surface-900 dark:text-surface-100">
                    {rule.name}
                  </p>
                  <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
                    {rule.description}
                  </p>
                  <p className="mt-0.5 text-2xs text-surface-400 dark:text-surface-500">
                    Stage: {rule.stageName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

PolicyRulesPreview.propTypes = {
  stages: PropTypes.arrayOf(PropTypes.object),
};

/**
 * Pipeline summary statistics.
 */
function PipelineSummaryStats({ summary }) {
  if (!summary) {
    return null;
  }

  const stats = [
    { label: 'Total Stages', value: summary.totalStages || 0, color: 'text-horizon-600 dark:text-horizon-400' },
    { label: 'Security Stages', value: summary.securityStages || 0, color: 'text-red-600 dark:text-red-400' },
    { label: 'Approval Gates', value: summary.approvalGates || 0, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Policy Rules', value: summary.totalPolicyRules || 0, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Blocking Rules', value: summary.blockingRules || 0, color: 'text-red-600 dark:text-red-400' },
    { label: 'Est. Duration', value: `${summary.estimatedDurationMinutes || 0}m`, color: 'text-green-600 dark:text-green-400' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800"
        >
          <span className={clsx('text-lg font-semibold', stat.color)}>{stat.value}</span>
          <span className="mt-0.5 text-center text-2xs text-surface-500 dark:text-surface-400">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

PipelineSummaryStats.propTypes = {
  summary: PropTypes.object,
};

/**
 * Generated pipeline artifact viewer.
 */
function ArtifactViewer({ artifact, format, pipelineName }) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const toggleVisible = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  const handleCopy = useCallback(() => {
    if (!artifact) {
      return;
    }
    try {
      navigator.clipboard.writeText(artifact);
      setCopied(true);
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    } catch (_err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = artifact;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [artifact]);

  const handleDownload = useCallback(() => {
    if (!artifact) {
      return;
    }

    const extensionMap = {
      Jenkinsfile: 'Jenkinsfile',
      'tekton-yaml': 'tekton-pipeline.yaml',
      'argocd-yaml': 'argocd-application.yaml',
      'github-actions-yaml': 'ci-cd.yml',
      'gitlab-ci-yaml': '.gitlab-ci.yml',
    };

    const fileName = extensionMap[format] || `${(pipelineName || 'pipeline').toLowerCase().replace(/[\s/]+/g, '-')}.txt`;
    const blob = new Blob([artifact], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [artifact, format, pipelineName]);

  if (!artifact) {
    return null;
  }

  return (
    <div className="rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-horizon-500" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Generated Pipeline Artifact
          </h4>
          {format && (
            <Badge variant="neutral" size="sm">
              {format}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            title="Copy to clipboard"
          >
            {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            title="Download artifact"
          >
            <Download size={14} />
            Download
          </button>
          <button
            type="button"
            onClick={toggleVisible}
            className="flex items-center gap-1.5 text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {visible && (
        <div className="max-h-96 overflow-auto scrollbar-thin">
          <pre className="m-0 rounded-none border-0 bg-surface-900 p-4 text-xs leading-relaxed text-surface-100">
            <code>{artifact}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

ArtifactViewer.propTypes = {
  artifact: PropTypes.string,
  format: PropTypes.string,
  pipelineName: PropTypes.string,
};

/**
 * Generation result display.
 */
function GenerationResult({ result, onViewPipelines, onGenerateAnother }) {
  if (!result) {
    return null;
  }

  const { success, pipeline, artifact, errors, warnings } = result;

  return (
    <div className="space-y-4">
      {/* Success banner */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="flex-shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Pipeline Generated Successfully
              </p>
              <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">
                {pipeline
                  ? `${pipeline.pipelineName || 'Pipeline'} with ${pipeline.stageCount || 0} stages and ${pipeline.policyRuleCount || 0} policy rules.`
                  : 'Pipeline has been generated.'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" size="sm" icon={ExternalLink} onClick={onViewPipelines}>
              View Pipelines
            </Button>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onGenerateAnother}>
              Generate Another
            </Button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {!success && errors && errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">
              Pipeline Generation Failed
            </p>
          </div>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={`error-${index}`} className="text-xs text-red-700 dark:text-red-300">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
            </p>
          </div>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={`warning-${index}`} className="text-xs text-amber-700 dark:text-amber-300">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pipeline details */}
      {success && pipeline && (
        <Card variant="outlined" title="Pipeline Details" icon={GitBranch}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Pipeline Name</p>
              <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
                {pipeline.pipelineName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Platform</p>
              <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
                {PLATFORM_OPTIONS.find((p) => p.value === pipeline.platform)?.label || pipeline.platform || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Stages</p>
              <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
                {pipeline.stageCount || 0} stages
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Policy Rules</p>
              <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
                {pipeline.policyRuleCount || 0} rules
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Version</p>
              <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
                {pipeline.version || '1.0.0'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Security Tools</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {Array.isArray(pipeline.securityTools) && pipeline.securityTools.length > 0 ? (
                  pipeline.securityTools.map((tool) => (
                    <Badge key={tool} variant="danger" size="sm">
                      {tool}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-surface-500 dark:text-surface-400">None</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Artifact viewer */}
      {success && artifact && (
        <ArtifactViewer
          artifact={artifact}
          format={
            pipeline
              ? pipeline.platform === CICD_PLATFORMS.JENKINS
                ? 'Jenkinsfile'
                : pipeline.platform === CICD_PLATFORMS.OPENSHIFT
                  ? 'tekton-yaml'
                  : pipeline.platform === CICD_PLATFORMS.GITOPS
                    ? 'argocd-yaml'
                    : pipeline.platform === CICD_PLATFORMS.GITHUB_ACTIONS
                      ? 'github-actions-yaml'
                      : pipeline.platform === CICD_PLATFORMS.GITLAB_CI
                        ? 'gitlab-ci-yaml'
                        : 'text'
              : 'text'
          }
          pipelineName={pipeline ? pipeline.pipelineName : 'pipeline'}
        />
      )}
    </div>
  );
}

GenerationResult.propTypes = {
  result: PropTypes.shape({
    success: PropTypes.bool,
    pipeline: PropTypes.object,
    artifact: PropTypes.string,
    errors: PropTypes.arrayOf(PropTypes.string),
    warnings: PropTypes.arrayOf(PropTypes.string),
  }),
  onViewPipelines: PropTypes.func.isRequired,
  onGenerateAnother: PropTypes.func.isRequired,
};

/**
 * Existing pipeline info banner.
 */
function ExistingPipelineBanner({ pipeline, onRegenerate }) {
  if (!pipeline) {
    return null;
  }

  return (
    <div className="rounded-lg border border-horizon-200 bg-horizon-50 p-4 dark:border-horizon-800 dark:bg-horizon-900/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-horizon-800 dark:text-horizon-200">
            Existing Pipeline Found
          </p>
          <p className="mt-0.5 text-xs text-horizon-600 dark:text-horizon-400">
            {pipeline.pipelineName || pipeline.name || 'Pipeline'} — Version{' '}
            {pipeline.version || '1.0.0'}
            {pipeline.platform && ` · ${PLATFORM_OPTIONS.find((p) => p.value === pipeline.platform)?.label || pipeline.platform}`}
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRegenerate}>
          Regenerate
        </Button>
      </div>
    </div>
  );
}

ExistingPipelineBanner.propTypes = {
  pipeline: PropTypes.object,
  onRegenerate: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Pipeline generation component for the Horizon DevSecOps Portal.
 * Allows users to select an onboarded application, configure pipeline stages,
 * choose a CI/CD platform, set policy-as-code rules, preview the generated
 * pipeline YAML/JSON, and trigger generation.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultApplicationId] - Pre-selected application ID.
 * @param {string} [props.defaultPlatform='jenkins'] - Default CI/CD platform.
 * @param {Function} [props.onGenerated] - Callback when pipeline is generated.
 *   Receives `{ pipelineId, applicationId, artifact }`.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function PipelineGenerator({
  defaultApplicationId,
  defaultPlatform = CICD_PLATFORMS.JENKINS,
  onGenerated,
  className,
}) {
  const { currentUser, hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [selectedAppId, setSelectedAppId] = useState(defaultApplicationId || null);
  const [selectedPlatform, setSelectedPlatform] = useState(defaultPlatform);
  const [pipelineConfig, setPipelineConfig] = useState({
    includeSecurityStages: true,
    includeQEStages: true,
    includeObservabilityHooks: true,
    includeApprovalGates: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationResult, setGenerationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('configure');

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const applications = useMemo(() => {
    const result = getApplications({ sortBy: 'name', sortOrder: 'asc' });
    return result.data || [];
  }, []);

  const selectedApplication = useMemo(() => {
    if (!selectedAppId) {
      return null;
    }
    return getApplicationById(selectedAppId) || null;
  }, [selectedAppId]);

  const existingPipeline = useMemo(() => {
    if (!selectedAppId) {
      return null;
    }
    return getPipelineByApplicationId(selectedAppId) || null;
  }, [selectedAppId]);

  const criticalityTier = selectedApplication
    ? selectedApplication.criticalityTier
    : CRITICALITY_TIERS.BUSINESS_OPERATIONAL;

  // -------------------------------------------------------------------------
  // Pipeline preview
  // -------------------------------------------------------------------------

  const pipelinePreview = useMemo(() => {
    if (!selectedAppId || !selectedPlatform) {
      return null;
    }

    const excludeStages = [];
    if (!pipelineConfig.includeSecurityStages) {
      excludeStages.push('sast', 'sca', 'dast', 'container-scan');
    }
    if (!pipelineConfig.includeQEStages) {
      excludeStages.push('qe-automation');
    }
    if (!pipelineConfig.includeObservabilityHooks) {
      excludeStages.push('observability-hooks');
    }
    if (!pipelineConfig.includeApprovalGates) {
      excludeStages.push('uat-sign-off');
    }

    return getGoldenPipeline({
      platform: selectedPlatform,
      criticalityTier,
      includeOptionalStages: pipelineConfig.includeQEStages,
      excludeStages,
    });
  }, [selectedAppId, selectedPlatform, pipelineConfig, criticalityTier]);

  const pipelineSummary = useMemo(() => {
    if (!selectedPlatform) {
      return null;
    }
    return getGoldenPipelineSummary({
      platform: selectedPlatform,
      criticalityTier,
    });
  }, [selectedPlatform, criticalityTier]);

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------

  const tabs = useMemo(() => {
    const tabList = [
      { id: 'configure', label: 'Configure', icon: Settings },
      { id: 'preview', label: 'Preview', icon: Eye, disabled: !selectedAppId },
      { id: 'result', label: 'Result', icon: CheckCircle2, disabled: !generationResult },
    ];
    return tabList;
  }, [selectedAppId, generationResult]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleApplicationChange = useCallback((value) => {
    setSelectedAppId(value || null);
    setGenerationResult(null);
  }, []);

  const handlePlatformChange = useCallback((value) => {
    setSelectedPlatform(value || CICD_PLATFORMS.JENKINS);
    setGenerationResult(null);
  }, []);

  const handleConfigChange = useCallback((newConfig) => {
    setPipelineConfig(newConfig);
    setGenerationResult(null);
  }, []);

  const handleGenerate = useCallback(() => {
    if (!selectedAppId) {
      toast.error('Please select an application first.');
      return;
    }

    if (!selectedPlatform) {
      toast.error('Please select a CI/CD platform.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationResult(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) {
          return prev;
        }
        return prev + Math.random() * 20;
      });
    }, 200);

    // Simulate generation delay for UX
    const timer = setTimeout(() => {
      clearInterval(progressInterval);
      setGenerationProgress(100);

      const result = generatePipeline(selectedAppId, {
        platform: selectedPlatform,
        includeSecurityStages: pipelineConfig.includeSecurityStages,
        includeQEStages: pipelineConfig.includeQEStages,
        includeObservabilityHooks: pipelineConfig.includeObservabilityHooks,
        includeApprovalGates: pipelineConfig.includeApprovalGates,
        userId: currentUser ? currentUser.id : null,
      });

      setGenerationResult(result);
      setIsGenerating(false);
      setGenerationProgress(0);

      if (result.success) {
        toast.success('Pipeline generated successfully!', {
          title: 'Pipeline Generated',
        });
        setActiveTab('result');

        if (typeof onGenerated === 'function') {
          onGenerated({
            pipelineId: result.pipeline ? result.pipeline.id : null,
            applicationId: selectedAppId,
            artifact: result.artifact,
          });
        }
      } else {
        toast.error(
          result.errors && result.errors.length > 0
            ? result.errors[0]
            : 'Failed to generate pipeline.',
          { title: 'Generation Failed' },
        );
      }
    }, 1200);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [selectedAppId, selectedPlatform, pipelineConfig, currentUser, toast, onGenerated]);

  const handleViewPipelines = useCallback(() => {
    navigate('/pipelines');
  }, [navigate]);

  const handleGenerateAnother = useCallback(() => {
    setGenerationResult(null);
    setActiveTab('configure');
  }, []);

  const handleRegenerate = useCallback(() => {
    setGenerationResult(null);
    handleGenerate();
  }, [handleGenerate]);

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  const canGeneratePipelines = hasPermission('manage_pipelines');

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Generate Golden Pipeline
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Generate a standardized CI/CD pipeline with embedded security scanning, quality
          engineering, and observability stages for your application.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
        size="md"
      />

      {/* Tab Content */}
      <div className="mt-6">
        {/* Configure Tab */}
        {activeTab === 'configure' && (
          <div className="space-y-6">
            {/* Application Selection */}
            <Card variant="default" title="Application" icon={Settings}>
              <div className="space-y-4">
                <ApplicationSelector
                  applications={applications}
                  selectedAppId={selectedAppId}
                  onChange={handleApplicationChange}
                  disabled={isGenerating}
                />

                {selectedApplication && (
                  <ApplicationInfoCard application={selectedApplication} />
                )}

                {existingPipeline && (
                  <ExistingPipelineBanner
                    pipeline={existingPipeline}
                    onRegenerate={handleRegenerate}
                  />
                )}
              </div>
            </Card>

            {/* Platform & Configuration */}
            {selectedAppId && (
              <Card variant="default" title="Pipeline Configuration" icon={Wrench}>
                <div className="space-y-6">
                  <PlatformSelector
                    value={selectedPlatform}
                    onChange={handlePlatformChange}
                    disabled={isGenerating}
                  />

                  <PipelineConfigToggles
                    config={pipelineConfig}
                    onChange={handleConfigChange}
                    disabled={isGenerating}
                  />
                </div>
              </Card>
            )}

            {/* Summary Stats */}
            {selectedAppId && pipelineSummary && (
              <PipelineSummaryStats summary={pipelineSummary} />
            )}

            {/* Generate Button */}
            {selectedAppId && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-surface-400 dark:text-surface-500">
                  Pipeline will be generated for{' '}
                  <span className="font-medium text-surface-700 dark:text-surface-300">
                    {selectedApplication ? selectedApplication.name : 'selected application'}
                  </span>{' '}
                  using{' '}
                  <span className="font-medium text-surface-700 dark:text-surface-300">
                    {PLATFORM_OPTIONS.find((p) => p.value === selectedPlatform)?.label || selectedPlatform}
                  </span>
                </p>
                <Button
                  variant="primary"
                  size="md"
                  icon={isGenerating ? undefined : Play}
                  loading={isGenerating}
                  onClick={handleGenerate}
                  disabled={isGenerating || !canGeneratePipelines}
                >
                  {isGenerating ? 'Generating...' : 'Generate Pipeline'}
                </Button>
              </div>
            )}

            {/* Generation Progress */}
            {isGenerating && (
              <div className="rounded-lg border border-horizon-200 bg-horizon-50 p-4 dark:border-horizon-800 dark:bg-horizon-900/20">
                <div className="flex items-center gap-3">
                  <Loader2 size={20} className="animate-spin text-horizon-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-horizon-800 dark:text-horizon-200">
                      Generating pipeline...
                    </p>
                    <p className="mt-0.5 text-xs text-horizon-600 dark:text-horizon-400">
                      Building stages, applying policy rules, and generating artifact.
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-horizon-600 dark:text-horizon-400">
                    <span>Progress</span>
                    <span>{Math.round(generationProgress)}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-horizon-200 dark:bg-horizon-800">
                    <div
                      className="h-full rounded-full bg-horizon-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, generationProgress))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* No permission warning */}
            {!canGeneratePipelines && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    You do not have permission to generate pipelines. Contact an administrator.
                  </p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!selectedAppId && (
              <EmptyState
                icon={GitBranch}
                title="Select an application"
                description="Choose an onboarded application above to configure and generate a Golden Pipeline."
                size="md"
                bordered
              />
            )}
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            {pipelinePreview ? (
              <>
                {/* Pipeline info */}
                <Card variant="outlined">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
                        {pipelinePreview.name}
                      </h3>
                      <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                        {pipelinePreview.description}
                      </p>
                    </div>
                    <Badge variant="horizon" size="sm">
                      v{pipelinePreview.version}
                    </Badge>
                  </div>
                  {pipelinePreview.platform && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Platform
                      </p>
                      <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
                        {pipelinePreview.platform.name || 'N/A'}
                      </p>
                      <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                        {pipelinePreview.platform.description || ''}
                      </p>
                    </div>
                  )}
                </Card>

                {/* Summary stats */}
                {pipelineSummary && <PipelineSummaryStats summary={pipelineSummary} />}

                {/* Stages preview */}
                <StagesPreview
                  stages={pipelinePreview.stages}
                  criticalityTier={criticalityTier}
                />

                {/* Policy rules */}
                <PolicyRulesPreview stages={pipelinePreview.stages} />

                {/* Generate from preview */}
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('configure')}
                  >
                    Back to Configure
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    icon={isGenerating ? undefined : Play}
                    loading={isGenerating}
                    onClick={handleGenerate}
                    disabled={isGenerating || !canGeneratePipelines}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Pipeline'}
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={GitBranch}
                title="No preview available"
                description="Select an application and configure the pipeline to see a preview."
                size="md"
                bordered
                actionLabel="Go to Configure"
                onAction={() => setActiveTab('configure')}
              />
            )}
          </div>
        )}

        {/* Result Tab */}
        {activeTab === 'result' && (
          <div className="space-y-6">
            {generationResult ? (
              <GenerationResult
                result={generationResult}
                onViewPipelines={handleViewPipelines}
                onGenerateAnother={handleGenerateAnother}
              />
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No generation result"
                description="Generate a pipeline to see the result here."
                size="md"
                bordered
                actionLabel="Go to Configure"
                onAction={() => setActiveTab('configure')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

PipelineGenerator.propTypes = {
  defaultApplicationId: PropTypes.string,
  defaultPlatform: PropTypes.string,
  onGenerated: PropTypes.func,
  className: PropTypes.string,
};