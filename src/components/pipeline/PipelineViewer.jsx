/**
 * Pipeline visualization component for Horizon DevSecOps Portal
 * Shows generated pipeline stages as a visual flow diagram. Each stage
 * shows tool, status, policy rules. Supports expand/collapse for stage
 * details. Shows Pipeline-as-Code (YAML) and Policy-as-Code views.
 * @module components/pipeline/PipelineViewer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
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
  TestTube2,
  Wrench,
  X,
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
  getPipelines,
  getPipelineById,
  getPipelineByApplicationId,
  getPipelineArtifact,
  getPipelineRuns,
  getPipelinesSummary,
  getGoldenPipeline,
  getGoldenPipelineSummary,
} from '../../services/PipelineService.js';
import { getApplications, getApplicationById } from '../../services/CatalogService.js';
import {
  CRITICALITY_TIERS,
  PIPELINE_STATUSES,
} from '../../constants/constants.js';
import {
  CICD_PLATFORMS,
  STAGE_TYPES,
  POLICY_ENFORCEMENT,
} from '../../utils/pipelineTemplates.js';
import { formatDate, formatDuration } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_LABELS = {
  [CICD_PLATFORMS.JENKINS]: 'Jenkins Declarative Pipeline',
  [CICD_PLATFORMS.OPENSHIFT]: 'OpenShift Pipeline (Tekton)',
  [CICD_PLATFORMS.GITOPS]: 'GitOps (ArgoCD)',
  [CICD_PLATFORMS.GITHUB_ACTIONS]: 'GitHub Actions',
  [CICD_PLATFORMS.GITLAB_CI]: 'GitLab CI',
};

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
  [STAGE_TYPES.SOURCE]: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    activeBorder: 'border-blue-500 dark:border-blue-500',
  },
  [STAGE_TYPES.BUILD]: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    activeBorder: 'border-amber-500 dark:border-amber-500',
  },
  [STAGE_TYPES.TEST]: {
    text: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-800',
    activeBorder: 'border-pink-500 dark:border-pink-500',
  },
  [STAGE_TYPES.SECURITY]: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    activeBorder: 'border-red-500 dark:border-red-500',
  },
  [STAGE_TYPES.ARTIFACT]: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    activeBorder: 'border-purple-500 dark:border-purple-500',
  },
  [STAGE_TYPES.DEPLOY]: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    activeBorder: 'border-green-500 dark:border-green-500',
  },
  [STAGE_TYPES.APPROVAL]: {
    text: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    activeBorder: 'border-indigo-500 dark:border-indigo-500',
  },
  [STAGE_TYPES.OBSERVABILITY]: {
    text: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-200 dark:border-cyan-800',
    activeBorder: 'border-cyan-500 dark:border-cyan-500',
  },
  [STAGE_TYPES.VALIDATION]: {
    text: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800',
    activeBorder: 'border-teal-500 dark:border-teal-500',
  },
};

const DEFAULT_STAGE_COLOR = {
  text: 'text-surface-600 dark:text-surface-400',
  bg: 'bg-surface-50 dark:bg-surface-900/20',
  border: 'border-surface-200 dark:border-surface-700',
  activeBorder: 'border-surface-500 dark:border-surface-500',
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
// Helpers
// ---------------------------------------------------------------------------

const getStageColor = (type) => STAGE_TYPE_COLORS[type] || DEFAULT_STAGE_COLOR;
const getStageIcon = (type) => STAGE_TYPE_ICONS[type] || Settings;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Pipeline summary statistics bar.
 */
function PipelineSummaryBar({ pipeline }) {
  if (!pipeline) {
    return null;
  }

  const stageCount = pipeline.stageCount || (Array.isArray(pipeline.stages) ? pipeline.stages.length : 0);
  const policyCount = pipeline.policyRuleCount || 0;

  const securityStages = Array.isArray(pipeline.stages)
    ? pipeline.stages.filter((s) => s.type === STAGE_TYPES.SECURITY).length
    : 0;

  const approvalGates = Array.isArray(pipeline.stages)
    ? pipeline.stages.filter((s) => s.type === STAGE_TYPES.APPROVAL).length
    : 0;

  const blockingRules = Array.isArray(pipeline.stages)
    ? pipeline.stages.reduce((sum, s) => {
        if (!Array.isArray(s.policyRules)) return sum;
        return sum + s.policyRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.BLOCK).length;
      }, 0)
    : 0;

  const warningRules = Array.isArray(pipeline.stages)
    ? pipeline.stages.reduce((sum, s) => {
        if (!Array.isArray(s.policyRules)) return sum;
        return sum + s.policyRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.WARN).length;
      }, 0)
    : 0;

  const stats = [
    { label: 'Total Stages', value: stageCount, color: 'text-horizon-600 dark:text-horizon-400' },
    { label: 'Security Stages', value: securityStages, color: 'text-red-600 dark:text-red-400' },
    { label: 'Approval Gates', value: approvalGates, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Policy Rules', value: policyCount, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Blocking Rules', value: blockingRules, color: 'text-red-600 dark:text-red-400' },
    { label: 'Warning Rules', value: warningRules, color: 'text-amber-600 dark:text-amber-400' },
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

PipelineSummaryBar.propTypes = {
  pipeline: PropTypes.object,
};

/**
 * Pipeline metadata header card.
 */
function PipelineMetadataCard({ pipeline }) {
  if (!pipeline) {
    return null;
  }

  const critVariant = CRITICALITY_VARIANT_MAP[pipeline.criticalityTier] || 'neutral';

  return (
    <Card variant="outlined">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-horizon-50 dark:bg-horizon-900/30">
              <GitBranch size={20} className="text-horizon-600 dark:text-horizon-400" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-surface-900 dark:text-surface-100">
                {pipeline.pipelineName || pipeline.name || 'Pipeline'}
              </h3>
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                {pipeline.applicationName || 'N/A'}
                {pipeline.version && (
                  <span className="ml-2 font-medium text-surface-600 dark:text-surface-300">
                    v{pipeline.version}
                  </span>
                )}
              </p>
            </div>
          </div>
          {pipeline.description && (
            <p className="mt-3 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
              {pipeline.description}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <Badge variant={critVariant} size="sm" dot>
            {pipeline.criticalityTier || 'N/A'}
          </Badge>
          {pipeline.platform && (
            <Badge variant="neutral" size="sm">
              {PLATFORM_LABELS[pipeline.platform] || pipeline.platform}
            </Badge>
          )}
          {pipeline.status && (
            <Badge
              variant={pipeline.status === 'generated' ? 'success' : 'info'}
              size="sm"
            >
              {pipeline.status.charAt(0).toUpperCase() + pipeline.status.slice(1)}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-surface-200 pt-4 text-xs text-surface-500 dark:border-surface-700 dark:text-surface-400 sm:grid-cols-3">
        <div>
          <span className="font-medium text-surface-600 dark:text-surface-300">Source Control:</span>{' '}
          {pipeline.sourceControl || 'N/A'}
        </div>
        <div>
          <span className="font-medium text-surface-600 dark:text-surface-300">CI/CD Tool:</span>{' '}
          {pipeline.cicdTool || 'N/A'}
        </div>
        <div>
          <span className="font-medium text-surface-600 dark:text-surface-300">Container Platform:</span>{' '}
          {pipeline.containerPlatform || 'N/A'}
        </div>
        <div>
          <span className="font-medium text-surface-600 dark:text-surface-300">Monitoring:</span>{' '}
          {pipeline.monitoringTool || 'N/A'}
        </div>
        <div>
          <span className="font-medium text-surface-600 dark:text-surface-300">Logging:</span>{' '}
          {pipeline.loggingTool || 'N/A'}
        </div>
        <div>
          <span className="font-medium text-surface-600 dark:text-surface-300">Generated:</span>{' '}
          {pipeline.generatedAt ? formatDate(pipeline.generatedAt, { format: 'relative' }) : 'N/A'}
        </div>
      </div>

      {Array.isArray(pipeline.securityTools) && pipeline.securityTools.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
            Security Tools:
          </span>
          {pipeline.securityTools.map((tool) => (
            <Badge key={tool} variant="danger" size="sm">
              {tool}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

PipelineMetadataCard.propTypes = {
  pipeline: PropTypes.object,
};

/**
 * Individual pipeline stage card in the flow diagram.
 */
function StageCard({ stage, index, isExpanded, onToggle, totalStages }) {
  const color = getStageColor(stage.type);
  const Icon = getStageIcon(stage.type);
  const hasPolicyRules = Array.isArray(stage.policyRules) && stage.policyRules.length > 0;
  const hasTools = Array.isArray(stage.tools) && stage.tools.length > 0;
  const hasConfig = stage.config && typeof stage.config === 'object' && Object.keys(stage.config).length > 0;

  const blockingCount = hasPolicyRules
    ? stage.policyRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.BLOCK).length
    : 0;
  const warningCount = hasPolicyRules
    ? stage.policyRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.WARN).length
    : 0;

  const handleToggle = useCallback(() => {
    onToggle(stage.id || index);
  }, [stage.id, index, onToggle]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle(stage.id || index);
      }
    },
    [stage.id, index, onToggle],
  );

  return (
    <div className="flex items-start gap-3">
      {/* Connector line and order number */}
      <div className="flex flex-col items-center">
        <div
          className={clsx(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
            color.bg,
            isExpanded ? color.activeBorder : color.border,
            color.text,
          )}
        >
          {stage.order || index + 1}
        </div>
        {index < totalStages - 1 && (
          <div className="h-full w-0.5 min-h-[1rem] bg-surface-200 dark:bg-surface-700" />
        )}
      </div>

      {/* Stage card */}
      <div
        className={clsx(
          'mb-3 flex-1 rounded-xl border-2 transition-all duration-200',
          isExpanded ? clsx(color.activeBorder, color.bg) : 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800',
        )}
      >
        {/* Stage header */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className="flex cursor-pointer items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                color.bg,
              )}
            >
              <Icon size={16} className={color.text} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                {stage.name}
              </h4>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
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
                {stage.timeoutMinutes && (
                  <span className="text-2xs text-surface-400 dark:text-surface-500">
                    Timeout: {stage.timeoutMinutes}m
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {blockingCount > 0 && (
              <Badge variant="danger" size="sm">
                {blockingCount} block
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" size="sm">
                {warningCount} warn
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp size={16} className="text-surface-400 dark:text-surface-500" />
            ) : (
              <ChevronDown size={16} className="text-surface-400 dark:text-surface-500" />
            )}
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-surface-200 px-4 py-4 dark:border-surface-700">
            {/* Description */}
            {stage.description && (
              <p className="mb-3 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
                {stage.description}
              </p>
            )}

            {/* Tools */}
            {hasTools && (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-medium text-surface-600 dark:text-surface-300">
                  Tools
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {stage.tools.map((tool) => (
                    <Badge key={tool} variant="info" size="sm">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration */}
            {hasConfig && (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-medium text-surface-600 dark:text-surface-300">
                  Configuration
                </p>
                <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-900/50">
                  <div className="grid gap-1.5 text-2xs sm:grid-cols-2">
                    {Object.entries(stage.config).map(([key, value]) => {
                      if (typeof value === 'object' && value !== null) {
                        return null;
                      }
                      return (
                        <div key={key} className="flex items-center gap-1">
                          <span className="font-medium text-surface-500 dark:text-surface-400">
                            {key}:
                          </span>
                          <span className="text-surface-700 dark:text-surface-300">
                            {String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Policy Rules */}
            {hasPolicyRules && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-surface-600 dark:text-surface-300">
                  Policy-as-Code Rules ({stage.policyRules.length})
                </p>
                <div className="space-y-2">
                  {stage.policyRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-start gap-2 rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
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
                          <span className="ml-1.5 text-2xs font-normal text-surface-400 dark:text-surface-500">
                            {rule.id}
                          </span>
                        </p>
                        <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
                          {rule.description}
                        </p>
                        {rule.condition && (
                          <p className="mt-0.5 font-mono text-2xs text-surface-400 dark:text-surface-500">
                            {rule.condition}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

StageCard.propTypes = {
  stage: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  totalStages: PropTypes.number.isRequired,
};

/**
 * Pipeline flow diagram showing all stages.
 */
function PipelineFlowDiagram({ stages, criticalityTier }) {
  const normalizedStages = useMemo(() => {
    if (!stages || !Array.isArray(stages)) return [];
    return stages.map((stage, index) => {
      if (typeof stage === 'string') {
        let type = 'default';
        const nameLower = stage.toLowerCase();
        if (nameLower.includes('scan') || nameLower.includes('sast') || nameLower.includes('dast') || nameLower.includes('sca') || nameLower.includes('security')) {
          type = STAGE_TYPES.SECURITY;
        } else if (nameLower.includes('test') || nameLower.includes('qe')) {
          type = STAGE_TYPES.TEST;
        } else if (nameLower.includes('deploy')) {
          type = STAGE_TYPES.DEPLOY;
        } else if (nameLower.includes('build')) {
          type = STAGE_TYPES.BUILD;
        } else if (nameLower.includes('source') || nameLower.includes('checkout')) {
          type = STAGE_TYPES.SOURCE;
        } else if (nameLower.includes('artifact') || nameLower.includes('publish')) {
          type = STAGE_TYPES.ARTIFACT;
        } else if (nameLower.includes('approv') || nameLower.includes('sign-off')) {
          type = STAGE_TYPES.APPROVAL;
        } else if (nameLower.includes('validat')) {
          type = STAGE_TYPES.VALIDATION;
        }

        return {
          id: `stage-${index}`,
          name: stage,
          type,
          order: index + 1,
        };
      }
      return stage;
    });
  }, [stages]);

  const [expandedStages, setExpandedStages] = useState(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const handleToggleStage = useCallback((stageId) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedStages(new Set());
      setAllExpanded(false);
    } else {
      const allIds = new Set(normalizedStages.map((s, i) => s.id || i));
      setExpandedStages(allIds);
      setAllExpanded(true);
    }
  }, [allExpanded, normalizedStages]);

  if (!normalizedStages || normalizedStages.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No pipeline stages"
        description="This pipeline has no stages defined."
        size="md"
        bordered
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-horizon-500" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Pipeline Stages ({normalizedStages.length})
          </h4>
          {criticalityTier && (
            <Badge variant={CRITICALITY_VARIANT_MAP[criticalityTier] || 'neutral'} size="sm" dot>
              {criticalityTier}
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleAll}
          className="flex items-center gap-1.5 text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
        >
          {allExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      <div className="space-y-0">
        {normalizedStages.map((stage, index) => (
          <StageCard
            key={stage.id || index}
            stage={stage}
            index={index}
            isExpanded={expandedStages.has(stage.id || index)}
            onToggle={handleToggleStage}
            totalStages={normalizedStages.length}
          />
        ))}
      </div>
    </div>
  );
}

PipelineFlowDiagram.propTypes = {
  stages: PropTypes.arrayOf(PropTypes.object),
  criticalityTier: PropTypes.string,
};

/**
 * Policy-as-Code consolidated view.
 */
function PolicyAsCodeView({ stages, criticalityTier }) {
  const [filterEnforcement, setFilterEnforcement] = useState('');
  const [filterStageType, setFilterStageType] = useState('');

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
            stageId: stage.id,
            stageOrder: stage.order,
          });
        });
      }
    });
    return rules;
  }, [stages]);

  const filteredRules = useMemo(() => {
    let result = [...allRules];
    if (filterEnforcement) {
      result = result.filter((r) => r.enforcement === filterEnforcement);
    }
    if (filterStageType) {
      result = result.filter((r) => r.stageType === filterStageType);
    }
    return result;
  }, [allRules, filterEnforcement, filterStageType]);

  const enforcementOptions = [
    { value: '', label: 'All Enforcement' },
    { value: POLICY_ENFORCEMENT.BLOCK, label: 'Block' },
    { value: POLICY_ENFORCEMENT.WARN, label: 'Warn' },
    { value: POLICY_ENFORCEMENT.INFO, label: 'Info' },
  ];

  const stageTypeOptions = useMemo(() => {
    const types = new Set(allRules.map((r) => r.stageType));
    return [
      { value: '', label: 'All Stage Types' },
      ...[...types].sort().map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
    ];
  }, [allRules]);

  const blockingCount = allRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.BLOCK).length;
  const warningCount = allRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.WARN).length;
  const infoCount = allRules.filter((r) => r.enforcement === POLICY_ENFORCEMENT.INFO).length;

  if (allRules.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No policy rules"
        description="This pipeline has no policy-as-code rules defined."
        size="md"
        bordered
      />
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-horizon-500" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Policy-as-Code Rules ({allRules.length})
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="danger" size="sm">
            {blockingCount} blocking
          </Badge>
          <Badge variant="warning" size="sm">
            {warningCount} warning
          </Badge>
          {infoCount > 0 && (
            <Badge variant="info" size="sm">
              {infoCount} info
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-40">
          <Select
            id="policy-enforcement-filter"
            placeholder="All Enforcement"
            options={enforcementOptions}
            value={filterEnforcement}
            onChange={(val) => setFilterEnforcement(val || '')}
            size="sm"
            clearable
          />
        </div>
        <div className="w-40">
          <Select
            id="policy-stage-type-filter"
            placeholder="All Stage Types"
            options={stageTypeOptions}
            value={filterStageType}
            onChange={(val) => setFilterStageType(val || '')}
            size="sm"
            clearable
          />
        </div>
        <span className="text-xs text-surface-400 dark:text-surface-500">
          {filteredRules.length} of {allRules.length} rules
        </span>
      </div>

      {/* Rules list */}
      <div className="space-y-2">
        {filteredRules.map((rule) => {
          const stageColor = getStageColor(rule.stageType);
          const StageIcon = getStageIcon(rule.stageType);

          return (
            <div
              key={`${rule.stageId}-${rule.id}`}
              className="flex items-start gap-3 rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800"
            >
              <Badge
                variant={ENFORCEMENT_VARIANT_MAP[rule.enforcement] || 'neutral'}
                size="sm"
                className="mt-0.5 flex-shrink-0"
              >
                {rule.enforcement}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                    {rule.name}
                  </p>
                  <span className="text-2xs text-surface-400 dark:text-surface-500">
                    {rule.id}
                  </span>
                </div>
                <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
                  {rule.description}
                </p>
                {rule.condition && (
                  <p className="mt-1 rounded bg-surface-50 px-2 py-1 font-mono text-2xs text-surface-600 dark:bg-surface-900/50 dark:text-surface-300">
                    {rule.condition}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <StageIcon size={10} className={stageColor.text} />
                    <span className="text-2xs text-surface-400 dark:text-surface-500">
                      {rule.stageName}
                    </span>
                  </div>
                  {Array.isArray(rule.appliesTo) && rule.appliesTo.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rule.appliesTo.map((tier) => (
                        <Badge
                          key={tier}
                          variant={CRITICALITY_VARIANT_MAP[tier] || 'neutral'}
                          size="sm"
                        >
                          {tier}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

PolicyAsCodeView.propTypes = {
  stages: PropTypes.arrayOf(PropTypes.object),
  criticalityTier: PropTypes.string,
};

/**
 * Pipeline-as-Code artifact viewer.
 */
function PipelineAsCodeView({ pipelineId, pipeline }) {
  const [artifact, setArtifact] = useState(null);
  const [format, setFormat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pipelineId) {
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate brief delay for UX
    const timer = setTimeout(() => {
      const result = getPipelineArtifact(pipelineId);
      if (result.success) {
        setArtifact(result.artifact);
        setFormat(result.format);
      } else {
        // If no artifact from service, use pipeline.artifact directly
        if (pipeline && pipeline.artifact) {
          setArtifact(pipeline.artifact);
          setFormat(pipeline.platform === CICD_PLATFORMS.JENKINS ? 'Jenkinsfile' : 'yaml');
        } else {
          setError(result.error || 'No pipeline artifact available.');
        }
      }
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [pipelineId, pipeline]);

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

    const pipelineName = pipeline ? (pipeline.pipelineName || pipeline.name || 'pipeline') : 'pipeline';
    const fileName = extensionMap[format] || `${pipelineName.toLowerCase().replace(/[\s/]+/g, '-')}.txt`;
    const blob = new Blob([artifact], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [artifact, format, pipeline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading pipeline artifact...
        </span>
      </div>
    );
  }

  if (error && !artifact) {
    return (
      <EmptyState
        icon={Code2}
        title="No pipeline artifact"
        description={error}
        size="md"
        bordered
      />
    );
  }

  if (!artifact) {
    return (
      <EmptyState
        icon={Code2}
        title="No pipeline artifact"
        description="Generate a pipeline to view the Pipeline-as-Code artifact."
        size="md"
        bordered
      />
    );
  }

  return (
    <div className="rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-horizon-500" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Pipeline-as-Code
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
        <div className="max-h-[32rem] overflow-auto scrollbar-thin">
          <pre className="m-0 rounded-none border-0 bg-surface-900 p-4 text-xs leading-relaxed text-surface-100">
            <code>{artifact}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

PipelineAsCodeView.propTypes = {
  pipelineId: PropTypes.string,
  pipeline: PropTypes.object,
};

/**
 * Recent pipeline runs table.
 */
function RecentPipelineRuns({ applicationName }) {
  const runs = useMemo(() => {
    const { data } = getPipelineRuns({
      applicationName,
      sortBy: 'startedAt',
      sortOrder: 'desc',
      limit: 5,
    });
    return data;
  }, [applicationName]);

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={Play}
        title="No pipeline runs"
        description="No pipeline runs found for this application."
        size="sm"
        bordered
      />
    );
  }

  const statusVariantMap = {
    [PIPELINE_STATUSES.SUCCESS]: 'success',
    [PIPELINE_STATUSES.FAILED]: 'danger',
    [PIPELINE_STATUSES.RUNNING]: 'info',
    [PIPELINE_STATUSES.PENDING]: 'warning',
    [PIPELINE_STATUSES.CANCELLED]: 'neutral',
    [PIPELINE_STATUSES.SKIPPED]: 'neutral',
  };

  return (
    <div className="rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-center gap-2 border-b border-surface-200 px-4 py-3 dark:border-surface-700">
        <Play size={16} className="text-horizon-500" />
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          Recent Pipeline Runs
        </h4>
      </div>
      <div className="divide-y divide-surface-100 dark:divide-surface-700">
        {runs.map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between px-4 py-3 transition-colors duration-150 hover:bg-surface-50 dark:hover:bg-surface-700/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  #{run.buildNumber || 'N/A'}
                </span>
                <Badge
                  variant={statusVariantMap[run.status] || 'neutral'}
                  size="sm"
                  dot
                >
                  {run.status}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-2xs text-surface-500 dark:text-surface-400">
                <span>{run.triggeredBy || 'N/A'}</span>
                <span>{run.branch || 'N/A'}</span>
                {run.durationSeconds && (
                  <span>{formatDuration(run.durationSeconds, { compact: true })}</span>
                )}
              </div>
            </div>
            <span className="flex-shrink-0 text-2xs text-surface-400 dark:text-surface-500">
              {run.startedAt ? formatDate(run.startedAt, { format: 'relative' }) : 'N/A'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

RecentPipelineRuns.propTypes = {
  applicationName: PropTypes.string,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Pipeline visualization component showing generated pipeline stages as a
 * visual flow diagram. Each stage shows tool, status, policy rules. Supports
 * expand/collapse for stage details. Shows Pipeline-as-Code (YAML) and
 * Policy-as-Code views.
 *
 * @param {Object} [props]
 * @param {string} [props.pipelineId] - Specific pipeline ID to display.
 * @param {string} [props.applicationId] - Application ID to look up pipeline for.
 * @param {Object} [props.pipeline] - Direct pipeline object to display (overrides ID lookups).
 * @param {boolean} [props.showMetadata=true] - Whether to show the pipeline metadata card.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {boolean} [props.showRuns=true] - Whether to show recent pipeline runs.
 * @param {boolean} [props.showSelector=true] - Whether to show the pipeline selector.
 * @param {string} [props.defaultTab='flow'] - Default active tab.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function PipelineViewer({
  pipelineId: propPipelineId,
  applicationId: propApplicationId,
  pipeline: propPipeline,
  showMetadata = true,
  showSummary = true,
  showRuns = true,
  showSelector = true,
  defaultTab = 'flow',
  className,
}) {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [selectedPipelineId, setSelectedPipelineId] = useState(propPipelineId || null);
  const [activeTab, setActiveTab] = useState(defaultTab);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const allPipelines = useMemo(() => {
    const { data } = getPipelines({ sortBy: 'updatedAt', sortOrder: 'desc' });
    return data;
  }, []);

  const pipelineOptions = useMemo(() => {
    return allPipelines.map((p) => ({
      value: p.id,
      label: p.pipelineName || p.name || p.id,
      description: `${p.applicationName || 'N/A'} · ${PLATFORM_LABELS[p.platform] || p.platform || 'N/A'}`,
    }));
  }, [allPipelines]);

  // Resolve the pipeline to display
  const resolvedPipeline = useMemo(() => {
    // Direct pipeline prop takes priority
    if (propPipeline && typeof propPipeline === 'object' && propPipeline.stages) {
      return propPipeline;
    }

    // Try selected pipeline ID
    if (selectedPipelineId) {
      const found = getPipelineById(selectedPipelineId);
      if (found) {
        return found;
      }
    }

    // Try prop pipeline ID
    if (propPipelineId) {
      const found = getPipelineById(propPipelineId);
      if (found) {
        return found;
      }
    }

    // Try application ID
    if (propApplicationId) {
      const found = getPipelineByApplicationId(propApplicationId);
      if (found) {
        return found;
      }
    }

    return null;
  }, [propPipeline, selectedPipelineId, propPipelineId, propApplicationId]);

  // Set selected pipeline ID when resolved
  useEffect(() => {
    if (resolvedPipeline && resolvedPipeline.id && !selectedPipelineId) {
      setSelectedPipelineId(resolvedPipeline.id);
    }
  }, [resolvedPipeline, selectedPipelineId]);

  // If no pipeline resolved but we have pipelines, try the first one
  useEffect(() => {
    if (!resolvedPipeline && !selectedPipelineId && allPipelines.length > 0) {
      setSelectedPipelineId(allPipelines[0].id);
    }
  }, [resolvedPipeline, selectedPipelineId, allPipelines]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const stages = useMemo(() => {
    if (!resolvedPipeline) {
      return [];
    }
    return Array.isArray(resolvedPipeline.stages) ? resolvedPipeline.stages : [];
  }, [resolvedPipeline]);

  const criticalityTier = resolvedPipeline
    ? resolvedPipeline.criticalityTier
    : null;

  const applicationName = resolvedPipeline
    ? resolvedPipeline.applicationName
    : null;

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------

  const tabs = useMemo(() => {
    const policyRuleCount = stages.reduce((sum, s) => {
      return sum + (Array.isArray(s.policyRules) ? s.policyRules.length : 0);
    }, 0);

    return [
      { id: 'flow', label: 'Flow Diagram', icon: GitBranch, badge: stages.length || undefined },
      { id: 'policy', label: 'Policy-as-Code', icon: ShieldCheck, badge: policyRuleCount || undefined },
      { id: 'code', label: 'Pipeline-as-Code', icon: Code2 },
      ...(showRuns && applicationName
        ? [{ id: 'runs', label: 'Recent Runs', icon: Play }]
        : []),
    ];
  }, [stages, showRuns, applicationName]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handlePipelineChange = useCallback((value) => {
    setSelectedPipelineId(value || null);
  }, []);

  const handleGeneratePipeline = useCallback(() => {
    navigate('/pipelines/generate');
  }, [navigate]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Pipeline Viewer
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Visualize pipeline stages, policy-as-code rules, and generated pipeline artifacts.
        </p>
      </div>

      {/* Pipeline Selector */}
      {showSelector && (
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Select
              id="pipeline-viewer-selector"
              label="Select Pipeline"
              placeholder="Choose a pipeline to view..."
              options={pipelineOptions}
              value={selectedPipelineId}
              onChange={handlePipelineChange}
              searchable={pipelineOptions.length > 5}
              searchPlaceholder="Search pipelines..."
              clearable
              size="md"
              fullWidth
              emptyMessage="No pipelines available. Generate a pipeline first."
              noResultsMessage="No pipelines match your search."
            />
          </div>
          {hasPermission('manage_pipelines') && (
            <Button
              variant="primary"
              size="sm"
              icon={Play}
              onClick={handleGeneratePipeline}
            >
              Generate Pipeline
            </Button>
          )}
        </div>
      )}

      {/* No pipeline selected */}
      {!resolvedPipeline && (
        <EmptyState
          icon={GitBranch}
          title="No pipeline selected"
          description={
            allPipelines.length > 0
              ? 'Select a pipeline from the dropdown above to view its details.'
              : 'No pipelines have been generated yet. Generate a Golden Pipeline to get started.'
          }
          actionLabel={hasPermission('manage_pipelines') ? 'Generate Pipeline' : undefined}
          onAction={hasPermission('manage_pipelines') ? handleGeneratePipeline : undefined}
          actionIcon={Play}
          size="lg"
          bordered
        />
      )}

      {/* Pipeline content */}
      {resolvedPipeline && (
        <div className="space-y-6">
          {/* Metadata Card */}
          {showMetadata && <PipelineMetadataCard pipeline={resolvedPipeline} />}

          {/* Summary Bar */}
          {showSummary && <PipelineSummaryBar pipeline={resolvedPipeline} />}

          {/* Tabs */}
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
            size="md"
          />

          {/* Tab Content */}
          <div className="mt-2">
            {/* Flow Diagram Tab */}
            {activeTab === 'flow' && (
              <PipelineFlowDiagram
                stages={stages}
                criticalityTier={criticalityTier}
              />
            )}

            {/* Policy-as-Code Tab */}
            {activeTab === 'policy' && (
              <PolicyAsCodeView
                stages={stages}
                criticalityTier={criticalityTier}
              />
            )}

            {/* Pipeline-as-Code Tab */}
            {activeTab === 'code' && (
              <PipelineAsCodeView
                pipelineId={resolvedPipeline.id}
                pipeline={resolvedPipeline}
              />
            )}

            {/* Recent Runs Tab */}
            {activeTab === 'runs' && applicationName && (
              <RecentPipelineRuns applicationName={applicationName} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

PipelineViewer.propTypes = {
  pipelineId: PropTypes.string,
  applicationId: PropTypes.string,
  pipeline: PropTypes.object,
  showMetadata: PropTypes.bool,
  showSummary: PropTypes.bool,
  showRuns: PropTypes.bool,
  showSelector: PropTypes.bool,
  defaultTab: PropTypes.oneOf(['flow', 'policy', 'code', 'runs']),
  className: PropTypes.string,
};