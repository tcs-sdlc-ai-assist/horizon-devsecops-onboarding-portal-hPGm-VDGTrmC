/**
 * Catalog browser component for Horizon DevSecOps Portal
 * Displays all available domains, portfolios, and applications in a
 * searchable, filterable grid/list view. Shows metadata (criticality,
 * environment, owners, onboarding status) for each item.
 * Supports card and table view toggle.
 * @module components/onboarding/OnboardingCatalog
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Building2,
  Briefcase,
  AppWindow,
  Search,
  X,
  LayoutGrid,
  List,
  Filter,
  ChevronRight,
  Shield,
  Server,
  User,
  Tag,
  GitBranch,
  Clock,
  RefreshCw,
  Info,
  ExternalLink,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Select from '../common/Select.jsx';
import StatusIndicator from '../common/StatusIndicator.jsx';
import Table from '../common/Table.jsx';
import Tabs from '../common/Tabs.jsx';
import {
  getDomains,
  getPortfolios,
  getApplications,
  getCatalogSummary,
} from '../../services/CatalogService.js';
import {
  CRITICALITY_TIER_LIST,
  ENVIRONMENT_LIST,
  DOMAIN_LIST,
} from '../../constants/constants.js';
import { formatDate } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIEW_MODES = Object.freeze({
  CARD: 'card',
  TABLE: 'table',
});

const CATALOG_TABS = [
  { id: 'applications', label: 'Applications', icon: AppWindow },
  { id: 'domains', label: 'Domains', icon: Building2 },
  { id: 'portfolios', label: 'Portfolios', icon: Briefcase },
];

const CRITICALITY_VARIANT_MAP = {
  'Business-critical': 'danger',
  'Mission-critical': 'warning',
  'Business Operational': 'info',
  'Admin Services': 'neutral',
};

const CRITICALITY_OPTIONS = [
  { value: '', label: 'All Tiers' },
  ...CRITICALITY_TIER_LIST.map((tier) => ({ value: tier, label: tier })),
];

const DOMAIN_OPTIONS = [
  { value: '', label: 'All Domains' },
  ...DOMAIN_LIST.map((d) => ({ value: d, label: d })),
];

const ENVIRONMENT_OPTIONS = [
  { value: '', label: 'All Environments' },
  ...ENVIRONMENT_LIST.map((e) => ({ value: e, label: e })),
];

// ---------------------------------------------------------------------------
// Application Table Columns
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
// Domain Table Columns
// ---------------------------------------------------------------------------

const DOMAIN_COLUMNS = [
  {
    id: 'name',
    header: 'Domain',
    accessor: 'name',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <div className="flex items-center gap-2">
        <Building2 size={16} className="flex-shrink-0 text-horizon-500" />
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">{value}</span>
      </div>
    ),
  },
  {
    id: 'description',
    header: 'Description',
    accessor: 'description',
    sortable: false,
    searchable: true,
    cell: (value) => (
      <span className="line-clamp-2 text-xs text-surface-500 dark:text-surface-400">
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'portfolioCount',
    header: 'Portfolios',
    accessor: 'portfolioCount',
    sortable: true,
    align: 'center',
    cell: (value) => (
      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
        {typeof value === 'number' ? value : 0}
      </span>
    ),
  },
  {
    id: 'applicationCount',
    header: 'Applications',
    accessor: 'applicationCount',
    sortable: true,
    align: 'center',
    cell: (value) => (
      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
        {typeof value === 'number' ? value : 0}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Portfolio Table Columns
// ---------------------------------------------------------------------------

const PORTFOLIO_COLUMNS = [
  {
    id: 'name',
    header: 'Portfolio',
    accessor: 'name',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <div className="flex items-center gap-2">
        <Briefcase size={16} className="flex-shrink-0 text-purple-500" />
        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">{value}</span>
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
    id: 'applicationCount',
    header: 'Applications',
    accessor: 'applicationCount',
    sortable: true,
    align: 'center',
    cell: (value) => (
      <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
        {typeof value === 'number' ? value : 0}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Summary statistics bar displayed above the catalog.
 */
function CatalogSummaryBar({ summary }) {
  if (!summary) {
    return null;
  }

  const stats = [
    {
      label: 'Domains',
      value: summary.totalDomains || 0,
      icon: Building2,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-900/30',
    },
    {
      label: 'Portfolios',
      value: summary.totalPortfolios || 0,
      icon: Briefcase,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
    {
      label: 'Applications',
      value: summary.totalApplications || 0,
      icon: AppWindow,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
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

CatalogSummaryBar.propTypes = {
  summary: PropTypes.shape({
    totalDomains: PropTypes.number,
    totalPortfolios: PropTypes.number,
    totalApplications: PropTypes.number,
  }),
};

/**
 * Application card component for grid view.
 */
function ApplicationCard({ application, onSelect }) {
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
          status={application.status === 'active' ? 'active' : 'inactive'}
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

        {/* Onboarded date */}
        {application.onboardedAt && (
          <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
            <Clock size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
            <span>{formatDate(application.onboardedAt, { format: 'relative' })}</span>
          </div>
        )}
      </div>

      {/* Footer badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-surface-100 pt-3 dark:border-surface-700">
        <Badge variant={criticalityVariant} size="sm" dot>
          {application.criticalityTier || 'N/A'}
        </Badge>
        {Array.isArray(application.environments) && application.environments.length > 0 && (
          <Badge variant="neutral" size="sm">
            {application.environments.length} env{application.environments.length !== 1 ? 's' : ''}
          </Badge>
        )}
        {Array.isArray(application.techStack) && application.techStack.length > 0 && (
          <Badge variant="info" size="sm">
            {application.techStack.length} tech
          </Badge>
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
  }).isRequired,
  onSelect: PropTypes.func,
};

/**
 * Domain card component for grid view.
 */
function DomainCard({ domain }) {
  return (
    <div className="flex flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-elevated dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-horizon-50 dark:bg-horizon-900/30">
          <Building2 size={20} className="text-horizon-600 dark:text-horizon-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
            {domain.name}
          </h4>
          {domain.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
              {domain.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-surface-100 pt-3 dark:border-surface-700">
        <div className="text-center">
          <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            {domain.portfolioCount || 0}
          </p>
          <p className="text-2xs text-surface-500 dark:text-surface-400">Portfolios</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            {domain.applicationCount || 0}
          </p>
          <p className="text-2xs text-surface-500 dark:text-surface-400">Applications</p>
        </div>
      </div>
    </div>
  );
}

DomainCard.propTypes = {
  domain: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    portfolioCount: PropTypes.number,
    applicationCount: PropTypes.number,
  }).isRequired,
};

/**
 * Portfolio card component for grid view.
 */
function PortfolioCard({ portfolio }) {
  return (
    <div className="flex flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-elevated dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
          <Briefcase size={20} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
            {portfolio.name}
          </h4>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            {portfolio.domainName || 'N/A'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-surface-100 pt-3 dark:border-surface-700">
        <div className="text-center">
          <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            {portfolio.applicationCount || 0}
          </p>
          <p className="text-2xs text-surface-500 dark:text-surface-400">Applications</p>
        </div>
      </div>
    </div>
  );
}

PortfolioCard.propTypes = {
  portfolio: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    domainName: PropTypes.string,
    applicationCount: PropTypes.number,
  }).isRequired,
};

/**
 * Filter bar component for the catalog.
 */
function CatalogFilters({
  activeTab,
  searchQuery,
  onSearchChange,
  onSearchClear,
  domainFilter,
  onDomainFilterChange,
  criticalityFilter,
  onCriticalityFilterChange,
  environmentFilter,
  onEnvironmentFilterChange,
  viewMode,
  onViewModeChange,
  onRefresh,
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
            placeholder="Search catalog..."
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

        {/* Domain filter (for applications and portfolios tabs) */}
        {(activeTab === 'applications' || activeTab === 'portfolios') && (
          <div className="w-44">
            <Select
              id="catalog-domain-filter"
              placeholder="All Domains"
              options={DOMAIN_OPTIONS}
              value={domainFilter}
              onChange={onDomainFilterChange}
              size="sm"
              clearable
            />
          </div>
        )}

        {/* Criticality filter (for applications tab) */}
        {activeTab === 'applications' && (
          <div className="w-44">
            <Select
              id="catalog-criticality-filter"
              placeholder="All Tiers"
              options={CRITICALITY_OPTIONS}
              value={criticalityFilter}
              onChange={onCriticalityFilterChange}
              size="sm"
              clearable
            />
          </div>
        )}

        {/* Environment filter (for applications tab) */}
        {activeTab === 'applications' && (
          <div className="w-40">
            <Select
              id="catalog-environment-filter"
              placeholder="All Envs"
              options={ENVIRONMENT_OPTIONS}
              value={environmentFilter}
              onChange={onEnvironmentFilterChange}
              size="sm"
              clearable
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
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

CatalogFilters.propTypes = {
  activeTab: PropTypes.string.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  domainFilter: PropTypes.string,
  onDomainFilterChange: PropTypes.func.isRequired,
  criticalityFilter: PropTypes.string,
  onCriticalityFilterChange: PropTypes.func.isRequired,
  environmentFilter: PropTypes.string,
  onEnvironmentFilterChange: PropTypes.func.isRequired,
  viewMode: PropTypes.string.isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Catalog browser component displaying all available domains, portfolios,
 * and applications in a searchable, filterable grid/list view.
 *
 * @param {Object} [props]
 * @param {Function} [props.onApplicationSelect] - Callback when an application is selected.
 *   Receives the full application object.
 * @param {string} [props.defaultTab='applications'] - Default active tab.
 * @param {string} [props.defaultViewMode='card'] - Default view mode: 'card' or 'table'.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function OnboardingCatalog({
  onApplicationSelect,
  defaultTab = 'applications',
  defaultViewMode = VIEW_MODES.CARD,
  showSummary = true,
  className,
}) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const catalogSummary = useMemo(() => {
    return getCatalogSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const domains = useMemo(() => {
    return getDomains({ search: searchQuery, sortBy: 'name', sortOrder: 'asc' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, refreshKey]);

  const portfolios = useMemo(() => {
    const options = { search: searchQuery, sortBy: 'name', sortOrder: 'asc' };
    if (domainFilter) {
      options.domainName = domainFilter;
    }
    return getPortfolios(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, domainFilter, refreshKey]);

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
    if (environmentFilter) {
      options.environment = environmentFilter;
    }
    const result = getApplications(options);
    return result.data || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, domainFilter, criticalityFilter, environmentFilter, refreshKey]);

  // -------------------------------------------------------------------------
  // Tab badge counts
  // -------------------------------------------------------------------------

  const tabsWithBadges = useMemo(() => {
    return CATALOG_TABS.map((tab) => {
      let badge;
      switch (tab.id) {
        case 'applications':
          badge = applications.length;
          break;
        case 'domains':
          badge = domains.length;
          break;
        case 'portfolios':
          badge = portfolios.length;
          break;
        default:
          badge = undefined;
      }
      return { ...tab, badge };
    });
  }, [applications.length, domains.length, portfolios.length]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
    setDomainFilter('');
    setCriticalityFilter('');
    setEnvironmentFilter('');
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleDomainFilterChange = useCallback((value) => {
    setDomainFilter(value || '');
  }, []);

  const handleCriticalityFilterChange = useCallback((value) => {
    setCriticalityFilter(value || '');
  }, []);

  const handleEnvironmentFilterChange = useCallback((value) => {
    setEnvironmentFilter(value || '');
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleApplicationSelect = useCallback(
    (application) => {
      if (typeof onApplicationSelect === 'function') {
        onApplicationSelect(application);
      }
    },
    [onApplicationSelect],
  );

  // -------------------------------------------------------------------------
  // Render content based on active tab and view mode
  // -------------------------------------------------------------------------

  const renderApplicationsContent = () => {
    if (applications.length === 0) {
      return (
        <EmptyState
          icon={AppWindow}
          title="No applications found"
          description={
            searchQuery || domainFilter || criticalityFilter || environmentFilter
              ? 'Try adjusting your search or filter criteria.'
              : 'No applications have been onboarded yet.'
          }
          size="md"
          bordered
        />
      );
    }

    if (viewMode === VIEW_MODES.TABLE) {
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
          onRowClick={(row) => handleApplicationSelect(row)}
          emptyMessage="No applications found."
          noResultsMessage="No applications match your search."
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
          />
        ))}
      </div>
    );
  };

  const renderDomainsContent = () => {
    if (domains.length === 0) {
      return (
        <EmptyState
          icon={Building2}
          title="No domains found"
          description={
            searchQuery
              ? 'Try adjusting your search criteria.'
              : 'No domains are available.'
          }
          size="md"
          bordered
        />
      );
    }

    if (viewMode === VIEW_MODES.TABLE) {
      return (
        <Table
          columns={DOMAIN_COLUMNS}
          data={domains}
          searchable={false}
          paginated
          pageSize={20}
          density="normal"
          hoverable
          striped={false}
          emptyMessage="No domains found."
          noResultsMessage="No domains match your search."
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((domain) => (
          <DomainCard key={domain.id} domain={domain} />
        ))}
      </div>
    );
  };

  const renderPortfoliosContent = () => {
    if (portfolios.length === 0) {
      return (
        <EmptyState
          icon={Briefcase}
          title="No portfolios found"
          description={
            searchQuery || domainFilter
              ? 'Try adjusting your search or filter criteria.'
              : 'No portfolios are available.'
          }
          size="md"
          bordered
        />
      );
    }

    if (viewMode === VIEW_MODES.TABLE) {
      return (
        <Table
          columns={PORTFOLIO_COLUMNS}
          data={portfolios}
          searchable={false}
          paginated
          pageSize={20}
          density="normal"
          hoverable
          striped={false}
          emptyMessage="No portfolios found."
          noResultsMessage="No portfolios match your search."
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portfolios.map((portfolio) => (
          <PortfolioCard key={portfolio.id} portfolio={portfolio} />
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'applications':
        return renderApplicationsContent();
      case 'domains':
        return renderDomainsContent();
      case 'portfolios':
        return renderPortfoliosContent();
      default:
        return renderApplicationsContent();
    }
  };

  // -------------------------------------------------------------------------
  // Active filter count
  // -------------------------------------------------------------------------

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim().length > 0) count++;
    if (domainFilter) count++;
    if (criticalityFilter) count++;
    if (environmentFilter) count++;
    return count;
  }, [searchQuery, domainFilter, criticalityFilter, environmentFilter]);

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setDomainFilter('');
    setCriticalityFilter('');
    setEnvironmentFilter('');
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Summary Bar */}
      {showSummary && <CatalogSummaryBar summary={catalogSummary} />}

      {/* Tabs */}
      <div className={clsx(showSummary && 'mt-6')}>
        <Tabs
          tabs={tabsWithBadges}
          activeTab={activeTab}
          onChange={handleTabChange}
          variant="underline"
          size="md"
        />
      </div>

      {/* Filters */}
      <div className="mt-4">
        <CatalogFilters
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchClear={handleSearchClear}
          domainFilter={domainFilter}
          onDomainFilterChange={handleDomainFilterChange}
          criticalityFilter={criticalityFilter}
          onCriticalityFilterChange={handleCriticalityFilterChange}
          environmentFilter={environmentFilter}
          onEnvironmentFilterChange={handleEnvironmentFilterChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={handleRefresh}
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
        </div>
      )}

      {/* Content */}
      <div className="mt-4">{renderTabContent()}</div>
    </div>
  );
}

OnboardingCatalog.propTypes = {
  onApplicationSelect: PropTypes.func,
  defaultTab: PropTypes.oneOf(['applications', 'domains', 'portfolios']),
  defaultViewMode: PropTypes.oneOf(['card', 'table']),
  showSummary: PropTypes.bool,
  className: PropTypes.string,
};