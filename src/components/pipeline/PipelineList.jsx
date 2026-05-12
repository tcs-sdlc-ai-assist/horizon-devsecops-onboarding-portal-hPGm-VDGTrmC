/**
 * Pipeline list component for Horizon DevSecOps Portal
 * Displays all generated pipelines with status, application, creation date,
 * stages count. Supports filtering by platform, status, criticality, and
 * application. Links to pipeline detail/viewer and pipeline generator.
 * @module components/pipeline/PipelineList
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  AppWindow,
  Building2,
  ChevronRight,
  Clock,
  Code2,
  Download,
  ExternalLink,
  Eye,
  Filter,
  GitBranch,
  LayoutGrid,
  List,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Tag,
  User,
  Wrench,
  X,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Select from '../common/Select.jsx';
import StatusIndicator from '../common/StatusIndicator.jsx';
import Table from '../common/Table.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import {
  getPipelines,
  getPipelinesSummary,
} from '../../services/PipelineService.js';
import {
  CRITICALITY_TIER_LIST,
  CRITICALITY_TIERS,
} from '../../constants/constants.js';
import { CICD_PLATFORMS } from '../../utils/pipelineTemplates.js';
import { formatDate, formatDuration } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIEW_MODES = Object.freeze({
  CARD: 'card',
  TABLE: 'table',
});

const PLATFORM_LABELS = {
  [CICD_PLATFORMS.JENKINS]: 'Jenkins',
  [CICD_PLATFORMS.OPENSHIFT]: 'OpenShift (Tekton)',
  [CICD_PLATFORMS.GITOPS]: 'GitOps (ArgoCD)',
  [CICD_PLATFORMS.GITHUB_ACTIONS]: 'GitHub Actions',
  [CICD_PLATFORMS.GITLAB_CI]: 'GitLab CI',
};

const PLATFORM_OPTIONS = [
  { value: '', label: 'All Platforms' },
  { value: CICD_PLATFORMS.JENKINS, label: 'Jenkins' },
  { value: CICD_PLATFORMS.OPENSHIFT, label: 'OpenShift (Tekton)' },
  { value: CICD_PLATFORMS.GITOPS, label: 'GitOps (ArgoCD)' },
  { value: CICD_PLATFORMS.GITHUB_ACTIONS, label: 'GitHub Actions' },
  { value: CICD_PLATFORMS.GITLAB_CI, label: 'GitLab CI' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'generated', label: 'Generated' },
  { value: 'active', label: 'Active' },
  { value: 'configured', label: 'Configured' },
];

const CRITICALITY_OPTIONS = [
  { value: '', label: 'All Tiers' },
  ...CRITICALITY_TIER_LIST.map((tier) => ({ value: tier, label: tier })),
];

const CRITICALITY_VARIANT_MAP = {
  [CRITICALITY_TIERS.BUSINESS_CRITICAL]: 'danger',
  [CRITICALITY_TIERS.MISSION_CRITICAL]: 'warning',
  [CRITICALITY_TIERS.BUSINESS_OPERATIONAL]: 'info',
  [CRITICALITY_TIERS.ADMIN_SERVICES]: 'neutral',
};

// ---------------------------------------------------------------------------
// Table Columns
// ---------------------------------------------------------------------------

const PIPELINE_COLUMNS = [
  {
    id: 'pipelineName',
    header: 'Pipeline',
    accessor: (row) => row.pipelineName || row.name || 'N/A',
    sortable: true,
    searchable: true,
    cell: (value, row) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
          {value}
        </p>
        {row.applicationName && (
          <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
            {row.applicationName}
          </p>
        )}
      </div>
    ),
  },
  {
    id: 'applicationName',
    header: 'Application',
    accessor: 'applicationName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-sm text-surface-700 dark:text-surface-300">{value || 'N/A'}</span>
    ),
  },
  {
    id: 'platform',
    header: 'Platform',
    accessor: 'platform',
    sortable: true,
    searchable: true,
    cell: (value) => {
      const label = PLATFORM_LABELS[value] || value || 'N/A';
      return (
        <Badge variant="neutral" size="sm">
          {label}
        </Badge>
      );
    },
  },
  {
    id: 'criticalityTier',
    header: 'Criticality',
    accessor: 'criticalityTier',
    sortable: true,
    searchable: true,
    cell: (value) => {
      if (!value) {
        return <span className="text-xs text-surface-400 dark:text-surface-500">N/A</span>;
      }
      const variant = CRITICALITY_VARIANT_MAP[value] || 'neutral';
      return (
        <Badge variant={variant} size="sm" dot>
          {value}
        </Badge>
      );
    },
  },
  {
    id: 'stageCount',
    header: 'Stages',
    accessor: (row) => {
      if (typeof row.stageCount === 'number') {
        return row.stageCount;
      }
      if (Array.isArray(row.stages)) {
        return row.stages.length;
      }
      return 0;
    },
    sortable: true,
    align: 'center',
    cell: (value) => (
      <div className="flex items-center justify-center gap-1">
        <GitBranch size={12} className="text-surface-400 dark:text-surface-500" />
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
          {typeof value === 'number' ? value : 0}
        </span>
      </div>
    ),
  },
  {
    id: 'policyRuleCount',
    header: 'Policy Rules',
    accessor: (row) => {
      if (typeof row.policyRuleCount === 'number') {
        return row.policyRuleCount;
      }
      if (Array.isArray(row.stages)) {
        return row.stages.reduce((sum, s) => {
          return sum + (Array.isArray(s.policyRules) ? s.policyRules.length : 0);
        }, 0);
      }
      return 0;
    },
    sortable: true,
    align: 'center',
    cell: (value) => (
      <div className="flex items-center justify-center gap-1">
        <ShieldCheck size={12} className="text-surface-400 dark:text-surface-500" />
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
          {typeof value === 'number' ? value : 0}
        </span>
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    sortable: true,
    cell: (value) => {
      if (!value) {
        return <span className="text-xs text-surface-400 dark:text-surface-500">N/A</span>;
      }
      const statusMap = {
        generated: 'success',
        active: 'active',
        configured: 'active',
        pending: 'pending',
        failed: 'error',
      };
      const resolvedStatus = statusMap[value] || 'info';
      const labelMap = {
        generated: 'Generated',
        active: 'Active',
        configured: 'Configured',
        pending: 'Pending',
        failed: 'Failed',
      };
      return <StatusIndicator status={resolvedStatus} label={labelMap[value] || value} size="sm" />;
    },
  },
  {
    id: 'version',
    header: 'Version',
    accessor: 'version',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value ? `v${value}` : 'N/A'}
      </span>
    ),
  },
  {
    id: 'updatedAt',
    header: 'Last Updated',
    accessor: (row) => row.updatedAt || row.createdAt || row.generatedAt || null,
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value ? formatDate(value, { format: 'relative' }) : 'N/A'}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Summary statistics bar displayed above the pipeline list.
 */
function PipelineSummaryBar({ summary }) {
  if (!summary) {
    return null;
  }

  const stats = [
    {
      label: 'Total Pipelines',
      value: summary.totalPipelines || 0,
      icon: GitBranch,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-900/30',
    },
    {
      label: 'Generated',
      value: summary.totalGenerated || 0,
      icon: Code2,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Pipeline Runs',
      value: summary.totalRuns || 0,
      icon: Play,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Success Rate',
      value: `${summary.successRate || 0}%`,
      icon: Shield,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800"
          >
            <div
              className={clsx(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                stat.bg,
              )}
            >
              <Icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-surface-900 dark:text-surface-100">
                {stat.value}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

PipelineSummaryBar.propTypes = {
  summary: PropTypes.shape({
    totalPipelines: PropTypes.number,
    totalGenerated: PropTypes.number,
    totalRuns: PropTypes.number,
    successRate: PropTypes.number,
    averageDurationSeconds: PropTypes.number,
    byPlatform: PropTypes.array,
    byStatus: PropTypes.array,
    recentRuns: PropTypes.array,
  }),
};

/**
 * Filter bar component for the pipeline list.
 */
function PipelineFilters({
  searchQuery,
  onSearchChange,
  onSearchClear,
  platformFilter,
  onPlatformFilterChange,
  statusFilter,
  onStatusFilterChange,
  criticalityFilter,
  onCriticalityFilterChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  onGeneratePipeline,
  hasPermission,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={14} className="text-surface-400 dark:text-surface-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search pipelines..."
            className="block w-48 rounded-lg border border-surface-300 bg-white py-1.5 pl-9 pr-8 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-all duration-200 focus:w-64 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500 sm:w-56 sm:focus:w-72"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={onSearchClear}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Platform filter */}
        <div className="w-44">
          <Select
            id="pipeline-platform-filter"
            placeholder="All Platforms"
            options={PLATFORM_OPTIONS}
            value={platformFilter}
            onChange={onPlatformFilterChange}
            size="sm"
            clearable
          />
        </div>

        {/* Status filter */}
        <div className="w-40">
          <Select
            id="pipeline-status-filter"
            placeholder="All Statuses"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={onStatusFilterChange}
            size="sm"
            clearable
          />
        </div>

        {/* Criticality filter */}
        <div className="w-44">
          <Select
            id="pipeline-criticality-filter"
            placeholder="All Tiers"
            options={CRITICALITY_OPTIONS}
            value={criticalityFilter}
            onChange={onCriticalityFilterChange}
            size="sm"
            clearable
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Generate Pipeline button */}
        {hasPermission && (
          <Button variant="primary" size="sm" icon={Play} onClick={onGeneratePipeline}>
            Generate Pipeline
          </Button>
        )}

        {/* Refresh */}
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRefresh}>
          Refresh
        </Button>

        {/* View mode toggle */}
        <div className="flex items-center rounded-lg border border-surface-300 bg-white dark:border-surface-600 dark:bg-surface-800">
          <button
            type="button"
            onClick={() => onViewModeChange(VIEW_MODES.CARD)}
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-l-lg transition-colors duration-200',
              viewMode === VIEW_MODES.CARD
                ? 'bg-horizon-50 text-horizon-600 dark:bg-horizon-900/30 dark:text-horizon-400'
                : 'text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300',
            )}
            title="Card view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange(VIEW_MODES.TABLE)}
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors duration-200',
              viewMode === VIEW_MODES.TABLE
                ? 'bg-horizon-50 text-horizon-600 dark:bg-horizon-900/30 dark:text-horizon-400'
                : 'text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300',
            )}
            title="Table view"
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

PipelineFilters.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  platformFilter: PropTypes.string,
  onPlatformFilterChange: PropTypes.func.isRequired,
  statusFilter: PropTypes.string,
  onStatusFilterChange: PropTypes.func.isRequired,
  criticalityFilter: PropTypes.string,
  onCriticalityFilterChange: PropTypes.func.isRequired,
  viewMode: PropTypes.string.isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onGeneratePipeline: PropTypes.func.isRequired,
  hasPermission: PropTypes.bool.isRequired,
};

/**
 * Pipeline card component for grid view.
 */
function PipelineCard({ pipeline, onSelect, onViewRuns }) {
  const criticalityVariant = CRITICALITY_VARIANT_MAP[pipeline.criticalityTier] || 'neutral';
  const pipelineName = pipeline.pipelineName || pipeline.name || 'Pipeline';
  const stageCount = typeof pipeline.stageCount === 'number'
    ? pipeline.stageCount
    : Array.isArray(pipeline.stages)
      ? pipeline.stages.length
      : 0;
  const policyRuleCount = typeof pipeline.policyRuleCount === 'number'
    ? pipeline.policyRuleCount
    : Array.isArray(pipeline.stages)
      ? pipeline.stages.reduce((sum, s) => sum + (Array.isArray(s.policyRules) ? s.policyRules.length : 0), 0)
      : 0;
  const lastUpdated = pipeline.updatedAt || pipeline.createdAt || pipeline.generatedAt || null;

  const handleClick = useCallback(() => {
    if (typeof onSelect === 'function') {
      onSelect(pipeline);
    }
  }, [pipeline, onSelect]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && typeof onSelect === 'function') {
        e.preventDefault();
        onSelect(pipeline);
      }
    },
    [pipeline, onSelect],
  );

  const handleViewRuns = useCallback(
    (e) => {
      e.stopPropagation();
      if (typeof onViewRuns === 'function') {
        onViewRuns(pipeline);
      }
    },
    [pipeline, onViewRuns],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition-all duration-200 hover:border-horizon-300 hover:shadow-elevated dark:border-surface-700 dark:bg-surface-800 dark:hover:border-horizon-600"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="flex-shrink-0 text-horizon-500" />
            <h4 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
              {pipelineName}
            </h4>
          </div>
          {pipeline.applicationName && (
            <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
              {pipeline.applicationName}
            </p>
          )}
        </div>
        {pipeline.status && (
          <StatusIndicator
            status={
              pipeline.status === 'generated'
                ? 'success'
                : pipeline.status === 'active' || pipeline.status === 'configured'
                  ? 'active'
                  : pipeline.status === 'failed'
                    ? 'error'
                    : 'pending'
            }
            size="sm"
            showLabel={false}
          />
        )}
      </div>

      {/* Description */}
      {pipeline.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
          {pipeline.description}
        </p>
      )}

      {/* Metadata */}
      <div className="mt-3 space-y-2">
        {/* Platform */}
        {pipeline.platform && (
          <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
            <Settings size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
            <span>{PLATFORM_LABELS[pipeline.platform] || pipeline.platform}</span>
          </div>
        )}

        {/* Source Control & CI/CD */}
        <div className="flex items-center gap-3 text-xs text-surface-500 dark:text-surface-400">
          {pipeline.sourceControl && (
            <span className="flex items-center gap-1">
              <Code2 size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
              <span className="truncate">{pipeline.sourceControl}</span>
            </span>
          )}
          {pipeline.cicdTool && (
            <span className="flex items-center gap-1">
              <Wrench size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
              <span className="truncate">{pipeline.cicdTool}</span>
            </span>
          )}
        </div>

        {/* Stages & Policy Rules */}
        <div className="flex items-center gap-3 text-xs text-surface-500 dark:text-surface-400">
          <span className="flex items-center gap-1">
            <GitBranch size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
            <span>{stageCount} stages</span>
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
            <span>{policyRuleCount} rules</span>
          </span>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
            <Clock size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
            <span>{formatDate(lastUpdated, { format: 'relative' })}</span>
          </div>
        )}
      </div>

      {/* Footer badges */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-surface-100 pt-3 dark:border-surface-700">
        <div className="flex flex-wrap items-center gap-1.5">
          {pipeline.criticalityTier && (
            <Badge variant={criticalityVariant} size="sm" dot>
              {pipeline.criticalityTier}
            </Badge>
          )}
          {pipeline.version && (
            <Badge variant="neutral" size="sm">
              v{pipeline.version}
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleViewRuns}
            className="flex items-center gap-1 text-2xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
          >
            <Play size={10} />
            Runs
          </button>
          <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-1 text-2xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
          >
            <Eye size={10} />
            View
          </button>
        </div>
      </div>

      {/* Security tools */}
      {Array.isArray(pipeline.securityTools) && pipeline.securityTools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {pipeline.securityTools.slice(0, 4).map((tool) => (
            <Badge key={tool} variant="danger" size="sm">
              {tool}
            </Badge>
          ))}
          {pipeline.securityTools.length > 4 && (
            <span className="text-2xs text-surface-400 dark:text-surface-500">
              +{pipeline.securityTools.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

PipelineCard.propTypes = {
  pipeline: PropTypes.shape({
    id: PropTypes.string,
    pipelineName: PropTypes.string,
    name: PropTypes.string,
    applicationName: PropTypes.string,
    applicationId: PropTypes.string,
    description: PropTypes.string,
    platform: PropTypes.string,
    criticalityTier: PropTypes.string,
    sourceControl: PropTypes.string,
    cicdTool: PropTypes.string,
    stageCount: PropTypes.number,
    policyRuleCount: PropTypes.number,
    stages: PropTypes.array,
    securityTools: PropTypes.arrayOf(PropTypes.string),
    status: PropTypes.string,
    version: PropTypes.string,
    updatedAt: PropTypes.string,
    createdAt: PropTypes.string,
    generatedAt: PropTypes.string,
  }).isRequired,
  onSelect: PropTypes.func,
  onViewRuns: PropTypes.func,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Pipeline list component displaying all generated pipelines with status,
 * application, creation date, stages count. Supports filtering by platform,
 * status, and criticality. Links to pipeline detail/viewer and generator.
 *
 * @param {Object} [props]
 * @param {Function} [props.onPipelineSelect] - Callback when a pipeline is selected.
 *   Receives the full pipeline object.
 * @param {string} [props.defaultViewMode='table'] - Default view mode: 'card' or 'table'.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function PipelineList({
  onPipelineSelect,
  defaultViewMode = VIEW_MODES.TABLE,
  showSummary = true,
  className,
}) {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const pipelineSummary = useMemo(() => {
    return getPipelinesSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const pipelines = useMemo(() => {
    const options = {
      search: searchQuery,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    };

    if (platformFilter) {
      options.platform = platformFilter;
    }
    if (statusFilter) {
      options.status = statusFilter;
    }

    const result = getPipelines(options);
    let data = result.data || [];

    // Filter by criticality tier (client-side since getPipelines doesn't support it directly)
    if (criticalityFilter) {
      data = data.filter((p) => p.criticalityTier === criticalityFilter);
    }

    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, platformFilter, statusFilter, criticalityFilter, refreshKey]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handlePlatformFilterChange = useCallback((value) => {
    setPlatformFilter(value || '');
  }, []);

  const handleStatusFilterChange = useCallback((value) => {
    setStatusFilter(value || '');
  }, []);

  const handleCriticalityFilterChange = useCallback((value) => {
    setCriticalityFilter(value || '');
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    toast.info('Pipeline list refreshed.');
  }, [toast]);

  const handleGeneratePipeline = useCallback(() => {
    navigate('/pipelines/generate');
  }, [navigate]);

  const handlePipelineSelect = useCallback(
    (pipeline) => {
      if (typeof onPipelineSelect === 'function') {
        onPipelineSelect(pipeline);
      } else {
        // Navigate to pipeline viewer — the PipelineViewer component handles
        // pipeline selection via its own selector, so we navigate to the
        // pipelines overview page which renders the viewer.
        navigate('/pipelines');
      }
    },
    [onPipelineSelect, navigate],
  );

  const handleViewRuns = useCallback(() => {
    navigate('/pipelines/runs');
  }, [navigate]);

  const handleRowClick = useCallback(
    (row) => {
      handlePipelineSelect(row);
    },
    [handlePipelineSelect],
  );

  // -------------------------------------------------------------------------
  // Active filter count
  // -------------------------------------------------------------------------

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim().length > 0) count++;
    if (platformFilter) count++;
    if (statusFilter) count++;
    if (criticalityFilter) count++;
    return count;
  }, [searchQuery, platformFilter, statusFilter, criticalityFilter]);

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setPlatformFilter('');
    setStatusFilter('');
    setCriticalityFilter('');
  }, []);

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  const canManagePipelines = hasPermission('manage_pipelines');

  // -------------------------------------------------------------------------
  // Render content
  // -------------------------------------------------------------------------

  const renderCardView = () => {
    if (pipelines.length === 0) {
      return (
        <EmptyState
          icon={GitBranch}
          title="No pipelines found"
          description={
            activeFilterCount > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'No pipelines have been generated yet. Generate a Golden Pipeline to get started.'
          }
          actionLabel={canManagePipelines ? 'Generate Pipeline' : undefined}
          onAction={canManagePipelines ? handleGeneratePipeline : undefined}
          actionIcon={Play}
          size="md"
          bordered
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pipelines.map((pipeline) => (
          <PipelineCard
            key={pipeline.id}
            pipeline={pipeline}
            onSelect={handlePipelineSelect}
            onViewRuns={handleViewRuns}
          />
        ))}
      </div>
    );
  };

  const renderTableView = () => {
    if (pipelines.length === 0) {
      return (
        <EmptyState
          icon={GitBranch}
          title="No pipelines found"
          description={
            activeFilterCount > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'No pipelines have been generated yet. Generate a Golden Pipeline to get started.'
          }
          actionLabel={canManagePipelines ? 'Generate Pipeline' : undefined}
          onAction={canManagePipelines ? handleGeneratePipeline : undefined}
          actionIcon={Play}
          size="md"
          bordered
        />
      );
    }

    return (
      <Table
        columns={PIPELINE_COLUMNS}
        data={pipelines}
        searchable={false}
        paginated
        pageSize={20}
        density="normal"
        hoverable
        striped={false}
        onRowClick={handleRowClick}
        emptyMessage="No pipelines found."
        noResultsMessage="No pipelines match your search."
        defaultSortColumn="updatedAt"
        defaultSortOrder="desc"
      />
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Pipelines
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          View and manage all generated Golden Pipelines, their configurations, stages, and
          policy-as-code rules.
        </p>
      </div>

      {/* Summary Bar */}
      {showSummary && <PipelineSummaryBar summary={pipelineSummary} />}

      {/* Filters */}
      <div className={clsx(showSummary && 'mt-6')}>
        <PipelineFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchClear={handleSearchClear}
          platformFilter={platformFilter}
          onPlatformFilterChange={handlePlatformFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          criticalityFilter={criticalityFilter}
          onCriticalityFilterChange={handleCriticalityFilterChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={handleRefresh}
          onGeneratePipeline={handleGeneratePipeline}
          hasPermission={canManagePipelines}
        />
      </div>

      {/* Active filters indicator */}
      {activeFilterCount > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-surface-400 dark:text-surface-500" />
            <span className="text-xs text-surface-500 dark:text-surface-400">
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
          >
            Clear all
          </button>
          <span className="text-xs text-surface-400 dark:text-surface-500">
            · {pipelines.length} {pipelines.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="mt-4">
        {viewMode === VIEW_MODES.CARD ? renderCardView() : renderTableView()}
      </div>
    </div>
  );
}

PipelineList.propTypes = {
  onPipelineSelect: PropTypes.func,
  defaultViewMode: PropTypes.oneOf(['card', 'table']),
  showSummary: PropTypes.bool,
  className: PropTypes.string,
};