/**
 * Onboarded applications list component for Horizon DevSecOps Portal
 * Displays all onboarded applications with status, toolchain, pipeline status,
 * and last updated. Supports filtering by domain, portfolio, status, and
 * criticality tier. Links to application detail and pipeline views.
 * @module components/onboarding/OnboardedApplicationsList
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  AppWindow,
  Building2,
  Briefcase,
  ChevronRight,
  Clock,
  Filter,
  GitBranch,
  LayoutGrid,
  List,
  PackagePlus,
  RefreshCw,
  Search,
  Server,
  Shield,
  Tag,
  User,
  Wrench,
  X,
  ExternalLink,
  Download,
  Info,
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
import { getOnboardedApplications, getOnboardingSummary } from '../../services/OnboardingService.js';
import { getApplications } from '../../services/CatalogService.js';
import { getPipelines } from '../../services/PipelineService.js';
import { getToolchainAssignments } from '../../services/CatalogService.js';
import {
  CRITICALITY_TIER_LIST,
  DOMAIN_LIST,
  PORTFOLIO_LIST,
} from '../../constants/constants.js';
import { formatDate } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIEW_MODES = Object.freeze({
  CARD: 'card',
  TABLE: 'table',
});

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

const CRITICALITY_OPTIONS = [
  { value: '', label: 'All Tiers' },
  ...CRITICALITY_TIER_LIST.map((tier) => ({ value: tier, label: tier })),
];

const DOMAIN_OPTIONS = [
  { value: '', label: 'All Domains' },
  ...DOMAIN_LIST.map((d) => ({ value: d, label: d })),
];

const PORTFOLIO_OPTIONS = [
  { value: '', label: 'All Portfolios' },
  ...PORTFOLIO_LIST.map((p) => ({ value: p, label: p })),
];

const CRITICALITY_VARIANT_MAP = {
  'Business-critical': 'danger',
  'Mission-critical': 'warning',
  'Business Operational': 'info',
  'Admin Services': 'neutral',
};

// ---------------------------------------------------------------------------
// Table Columns
// ---------------------------------------------------------------------------

const APPLICATION_COLUMNS = [
  {
    id: 'name',
    header: 'Application',
    accessor: 'name',
    sortable: true,
    searchable: true,
    cell: (value, row) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
          {value}
        </p>
        {row.shortCode && (
          <p className="text-xs text-surface-400 dark:text-surface-500">{row.shortCode}</p>
        )}
      </div>
    ),
  },
  {
    id: 'domainName',
    header: 'Domain',
    accessor: 'domainName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-sm text-surface-700 dark:text-surface-300">{value || 'N/A'}</span>
    ),
  },
  {
    id: 'portfolioName',
    header: 'Portfolio',
    accessor: 'portfolioName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-sm text-surface-700 dark:text-surface-300">{value || 'N/A'}</span>
    ),
  },
  {
    id: 'criticalityTier',
    header: 'Criticality',
    accessor: 'criticalityTier',
    sortable: true,
    searchable: true,
    cell: (value) => {
      const variant = CRITICALITY_VARIANT_MAP[value] || 'neutral';
      return (
        <Badge variant={variant} size="sm" dot>
          {value || 'N/A'}
        </Badge>
      );
    },
  },
  {
    id: 'ownerName',
    header: 'Owner',
    accessor: 'ownerName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-sm text-surface-700 dark:text-surface-300">{value || 'N/A'}</span>
    ),
  },
  {
    id: 'toolchainCount',
    header: 'Toolchain',
    accessor: 'toolchainCount',
    sortable: true,
    align: 'center',
    cell: (value) => (
      <div className="flex items-center justify-center gap-1">
        <Wrench size={12} className="text-surface-400 dark:text-surface-500" />
        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
          {typeof value === 'number' ? value : 0}
        </span>
      </div>
    ),
  },
  {
    id: 'pipelineStatus',
    header: 'Pipeline',
    accessor: 'pipelineStatus',
    sortable: true,
    cell: (value) => {
      if (!value || value === 'none') {
        return (
          <span className="text-xs text-surface-400 dark:text-surface-500">Not configured</span>
        );
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
    id: 'status',
    header: 'Status',
    accessor: 'status',
    sortable: true,
    cell: (value) => {
      const statusMap = {
        active: 'active',
        inactive: 'inactive',
        pending: 'pending',
      };
      const resolvedStatus = statusMap[value] || 'active';
      return <StatusIndicator status={resolvedStatus} size="sm" />;
    },
  },
  {
    id: 'onboardedAt',
    header: 'Onboarded',
    accessor: 'onboardedAt',
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
 * Summary statistics bar displayed above the list.
 */
function SummaryBar({ summary }) {
  if (!summary) {
    return null;
  }

  const stats = [
    {
      label: 'Total Onboarded',
      value: summary.totalOnboarded || 0,
      icon: AppWindow,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-900/30',
    },
    {
      label: 'Active',
      value: summary.byStatus && summary.byStatus.completed ? summary.byStatus.completed : summary.totalOnboarded || 0,
      icon: Shield,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Domains',
      value: summary.byDomain ? summary.byDomain.length : 0,
      icon: Building2,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
    {
      label: 'Criticality Tiers',
      value: summary.byCriticality ? summary.byCriticality.length : 0,
      icon: Tag,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
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

SummaryBar.propTypes = {
  summary: PropTypes.shape({
    totalOnboarded: PropTypes.number,
    byStatus: PropTypes.object,
    byDomain: PropTypes.array,
    byCriticality: PropTypes.array,
  }),
};

/**
 * Filter bar component for the list.
 */
function ListFilters({
  searchQuery,
  onSearchChange,
  onSearchClear,
  domainFilter,
  onDomainFilterChange,
  portfolioFilter,
  onPortfolioFilterChange,
  criticalityFilter,
  onCriticalityFilterChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  onNewApplication,
  hasPermission,
}) {
  return (
    <div className="relative z-20 flex flex-wrap items-center justify-between gap-3">
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
            placeholder="Search applications..."
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

        {/* Domain filter */}
        <div className="w-44">
          <Select
            id="list-domain-filter"
            placeholder="All Domains"
            options={DOMAIN_OPTIONS}
            value={domainFilter}
            onChange={onDomainFilterChange}
            size="sm"
            clearable
          />
        </div>

        {/* Portfolio filter */}
        <div className="w-44">
          <Select
            id="list-portfolio-filter"
            placeholder="All Portfolios"
            options={PORTFOLIO_OPTIONS}
            value={portfolioFilter}
            onChange={onPortfolioFilterChange}
            size="sm"
            clearable
          />
        </div>

        {/* Criticality filter */}
        <div className="w-44">
          <Select
            id="list-criticality-filter"
            placeholder="All Tiers"
            options={CRITICALITY_OPTIONS}
            value={criticalityFilter}
            onChange={onCriticalityFilterChange}
            size="sm"
            clearable
          />
        </div>

        {/* Status filter */}
        <div className="w-36">
          <Select
            id="list-status-filter"
            placeholder="All Statuses"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={onStatusFilterChange}
            size="sm"
            clearable
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* New Application button */}
        {hasPermission && (
          <Button variant="primary" size="sm" icon={PackagePlus} onClick={onNewApplication}>
            New Application
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

ListFilters.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  domainFilter: PropTypes.string,
  onDomainFilterChange: PropTypes.func.isRequired,
  portfolioFilter: PropTypes.string,
  onPortfolioFilterChange: PropTypes.func.isRequired,
  criticalityFilter: PropTypes.string,
  onCriticalityFilterChange: PropTypes.func.isRequired,
  statusFilter: PropTypes.string,
  onStatusFilterChange: PropTypes.func.isRequired,
  viewMode: PropTypes.string.isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onNewApplication: PropTypes.func.isRequired,
  hasPermission: PropTypes.bool.isRequired,
};

/**
 * Application card component for grid view.
 */
function ApplicationCard({ application, onSelect, onViewPipeline }) {
  const criticalityVariant = CRITICALITY_VARIANT_MAP[application.criticalityTier] || 'neutral';

  const handleClick = useCallback(() => {
    if (typeof onSelect === 'function') {
      onSelect(application);
    }
  }, [application, onSelect]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && typeof onSelect === 'function') {
        e.preventDefault();
        onSelect(application);
      }
    },
    [application, onSelect],
  );

  const handleViewPipeline = useCallback(
    (e) => {
      e.stopPropagation();
      if (typeof onViewPipeline === 'function') {
        onViewPipeline(application);
      }
    },
    [application, onViewPipeline],
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
          <h4 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
            {application.name}
          </h4>
          {application.shortCode && (
            <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
              {application.shortCode}
            </p>
          )}
        </div>
        <StatusIndicator
          status={application.status === 'active' ? 'active' : application.status === 'pending' ? 'pending' : 'inactive'}
          size="sm"
          showLabel={false}
        />
      </div>

      {/* Description */}
      {application.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
          {application.description}
        </p>
      )}

      {/* Metadata */}
      <div className="mt-3 space-y-2">
        {/* Domain / Portfolio */}
        <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
          <Building2 size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
          <span className="truncate">{application.domainName || 'N/A'}</span>
          <ChevronRight size={10} className="flex-shrink-0 text-surface-300 dark:text-surface-600" />
          <span className="truncate">{application.portfolioName || 'N/A'}</span>
        </div>

        {/* Owner */}
        {application.ownerName && (
          <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
            <User size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
            <span className="truncate">{application.ownerName}</span>
          </div>
        )}

        {/* Toolchain count */}
        <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
          <Wrench size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
          <span>
            {typeof application.toolchainCount === 'number' ? application.toolchainCount : 0} tools
            configured
          </span>
        </div>

        {/* Pipeline status */}
        <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
          <GitBranch size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
          <span>
            Pipeline:{' '}
            {application.pipelineStatus && application.pipelineStatus !== 'none'
              ? application.pipelineStatus.charAt(0).toUpperCase() + application.pipelineStatus.slice(1)
              : 'Not configured'}
          </span>
        </div>

        {/* Onboarded date */}
        {application.onboardedAt && (
          <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
            <Clock size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
            <span>{formatDate(application.onboardedAt, { format: 'relative' })}</span>
          </div>
        )}
      </div>

      {/* Footer badges */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-surface-100 pt-3 dark:border-surface-700">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={criticalityVariant} size="sm" dot>
            {application.criticalityTier || 'N/A'}
          </Badge>
          {Array.isArray(application.environments) && application.environments.length > 0 && (
            <Badge variant="neutral" size="sm">
              {application.environments.length} env{application.environments.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {application.pipelineStatus && application.pipelineStatus !== 'none' && (
          <button
            type="button"
            onClick={handleViewPipeline}
            className="flex items-center gap-1 text-2xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
          >
            <ExternalLink size={10} />
            Pipeline
          </button>
        )}
      </div>
    </div>
  );
}

ApplicationCard.propTypes = {
  application: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    shortCode: PropTypes.string,
    description: PropTypes.string,
    domainName: PropTypes.string,
    portfolioName: PropTypes.string,
    criticalityTier: PropTypes.string,
    ownerName: PropTypes.string,
    status: PropTypes.string,
    onboardedAt: PropTypes.string,
    environments: PropTypes.arrayOf(PropTypes.string),
    techStack: PropTypes.arrayOf(PropTypes.string),
    tags: PropTypes.arrayOf(PropTypes.string),
    toolchainCount: PropTypes.number,
    pipelineStatus: PropTypes.string,
  }).isRequired,
  onSelect: PropTypes.func,
  onViewPipeline: PropTypes.func,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Onboarded applications list component displaying all onboarded applications
 * with status, toolchain, pipeline status, and last updated. Supports filtering
 * by domain, portfolio, status, and criticality tier.
 *
 * @param {Object} [props]
 * @param {Function} [props.onApplicationSelect] - Callback when an application is selected.
 *   Receives the full application object.
 * @param {string} [props.defaultViewMode='table'] - Default view mode: 'card' or 'table'.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function OnboardedApplicationsList({
  onApplicationSelect,
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
  const [domainFilter, setDomainFilter] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const onboardingSummary = useMemo(() => {
    // Compute summary from the actual catalog applications instead of
    // onboarding records, since the mock applications were never submitted
    // through the onboarding flow and therefore have no onboarding records.
    const catalogResult = getApplications({ sortBy: 'name', sortOrder: 'asc' });
    const allApps = catalogResult.data || [];

    const activeCount = allApps.filter((a) => a.status === 'active').length;

    const domainSet = new Set();
    const critSet = new Set();
    allApps.forEach((a) => {
      if (a.domainName) domainSet.add(a.domainName);
      if (a.criticalityTier) critSet.add(a.criticalityTier);
    });

    return {
      totalOnboarded: allApps.length,
      byStatus: { completed: activeCount },
      byDomain: Array.from(domainSet).map((d) => ({ domain: d, count: 1 })),
      byCriticality: Array.from(critSet).map((t) => ({ tier: t, count: 1 })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const applications = useMemo(() => {
    const options = {
      search: searchQuery,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    if (domainFilter) {
      options.domainName = domainFilter;
    }
    if (criticalityFilter) {
      options.criticalityTier = criticalityFilter;
    }
    if (statusFilter) {
      options.status = statusFilter;
    }

    // Get applications from catalog (includes both mock and onboarded)
    const catalogResult = getApplications(options);
    let apps = catalogResult.data || [];

    // Filter by portfolio
    if (portfolioFilter) {
      apps = apps.filter((a) => a.portfolioName === portfolioFilter);
    }

    // Enrich with toolchain and pipeline data
    const enriched = apps.map((app) => {
      // Get toolchain count
      const toolchainAssignments = getToolchainAssignments({ applicationId: app.id });
      const toolchainCount =
        toolchainAssignments.length > 0 && Array.isArray(toolchainAssignments[0].tools)
          ? toolchainAssignments[0].tools.length
          : 0;

      // Get pipeline status
      const { data: pipelines } = getPipelines({ applicationId: app.id, limit: 1 });
      let pipelineStatus = 'none';
      if (pipelines.length > 0) {
        const pipeline = pipelines[0];
        pipelineStatus = pipeline.status || 'configured';
      }

      return {
        ...app,
        toolchainCount,
        pipelineStatus,
      };
    });

    return enriched;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, domainFilter, portfolioFilter, criticalityFilter, statusFilter, refreshKey]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleDomainFilterChange = useCallback((value) => {
    setDomainFilter(value || '');
  }, []);

  const handlePortfolioFilterChange = useCallback((value) => {
    setPortfolioFilter(value || '');
  }, []);

  const handleCriticalityFilterChange = useCallback((value) => {
    setCriticalityFilter(value || '');
  }, []);

  const handleStatusFilterChange = useCallback((value) => {
    setStatusFilter(value || '');
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    toast.info('Application list refreshed.');
  }, [toast]);

  const handleNewApplication = useCallback(() => {
    navigate('/onboarding/new');
  }, [navigate]);

  const handleApplicationSelect = useCallback(
    (application) => {
      if (typeof onApplicationSelect === 'function') {
        onApplicationSelect(application);
      }
    },
    [onApplicationSelect],
  );

  const handleViewPipeline = useCallback(
    (application) => {
      navigate('/pipelines');
    },
    [navigate],
  );

  const handleRowClick = useCallback(
    (row) => {
      handleApplicationSelect(row);
    },
    [handleApplicationSelect],
  );

  // -------------------------------------------------------------------------
  // Active filter count
  // -------------------------------------------------------------------------

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim().length > 0) count++;
    if (domainFilter) count++;
    if (portfolioFilter) count++;
    if (criticalityFilter) count++;
    if (statusFilter) count++;
    return count;
  }, [searchQuery, domainFilter, portfolioFilter, criticalityFilter, statusFilter]);

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setDomainFilter('');
    setPortfolioFilter('');
    setCriticalityFilter('');
    setStatusFilter('');
  }, []);

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  const canManageApplications = hasPermission('manage_applications');

  // -------------------------------------------------------------------------
  // Render content
  // -------------------------------------------------------------------------

  const renderCardView = () => {
    if (applications.length === 0) {
      return (
        <EmptyState
          icon={AppWindow}
          title="No applications found"
          description={
            activeFilterCount > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'No applications have been onboarded yet. Start by onboarding a new application.'
          }
          actionLabel={canManageApplications ? 'Onboard Application' : undefined}
          onAction={canManageApplications ? handleNewApplication : undefined}
          actionIcon={PackagePlus}
          size="md"
          bordered
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {applications.map((app) => (
          <ApplicationCard
            key={app.id}
            application={app}
            onSelect={handleApplicationSelect}
            onViewPipeline={handleViewPipeline}
          />
        ))}
      </div>
    );
  };

  const renderTableView = () => {
    if (applications.length === 0) {
      return (
        <EmptyState
          icon={AppWindow}
          title="No applications found"
          description={
            activeFilterCount > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'No applications have been onboarded yet. Start by onboarding a new application.'
          }
          actionLabel={canManageApplications ? 'Onboard Application' : undefined}
          onAction={canManageApplications ? handleNewApplication : undefined}
          actionIcon={PackagePlus}
          size="md"
          bordered
        />
      );
    }

    return (
      <Table
        columns={APPLICATION_COLUMNS}
        data={applications}
        searchable={false}
        paginated
        pageSize={20}
        density="normal"
        hoverable
        striped={false}
        onRowClick={handleRowClick}
        emptyMessage="No applications found."
        noResultsMessage="No applications match your search."
        defaultSortColumn="name"
        defaultSortOrder="asc"
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
          Onboarded Applications
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          View and manage all onboarded applications, their toolchain configurations, and pipeline
          statuses.
        </p>
      </div>

      {/* Summary Bar */}
      {showSummary && <SummaryBar summary={onboardingSummary} />}

      {/* Filters */}
      <div className={clsx(showSummary && 'mt-6')}>
        <ListFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchClear={handleSearchClear}
          domainFilter={domainFilter}
          onDomainFilterChange={handleDomainFilterChange}
          portfolioFilter={portfolioFilter}
          onPortfolioFilterChange={handlePortfolioFilterChange}
          criticalityFilter={criticalityFilter}
          onCriticalityFilterChange={handleCriticalityFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={handleRefresh}
          onNewApplication={handleNewApplication}
          hasPermission={canManageApplications}
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
            · {applications.length} {applications.length === 1 ? 'result' : 'results'}
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

OnboardedApplicationsList.propTypes = {
  onApplicationSelect: PropTypes.func,
  defaultViewMode: PropTypes.oneOf(['card', 'table']),
  showSummary: PropTypes.bool,
  className: PropTypes.string,
};