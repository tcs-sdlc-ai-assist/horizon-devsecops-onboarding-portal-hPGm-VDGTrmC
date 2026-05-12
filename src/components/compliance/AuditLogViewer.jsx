/**
 * Audit log viewer component for Horizon DevSecOps Portal
 * Displays all logged actions in a searchable, filterable table.
 * Columns: timestamp, user, role, action, details, artifact reference.
 * Supports filtering by user, action type, date range.
 * Supports export to CSV. Accessible to Admin and Auditor roles only.
 * @module components/compliance/AuditLogViewer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Select from '../common/Select.jsx';
import Table from '../common/Table.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import {
  getAuditLogs,
  getAuditSummary,
  exportAuditLogs,
  AUDIT_ACTIONS,
} from '../../utils/auditLogger.js';
import { MOCK_USERS } from '../../constants/mockData.js';
import { formatDate } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Action type options for the filter dropdown.
 * @type {Array<Object>}
 */
const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'All Actions' },
  ...Object.values(AUDIT_ACTIONS).map((action) => ({
    value: action,
    label: action.replace(/_/g, ' '),
  })),
];

/**
 * User options for the filter dropdown.
 * @type {Array<Object>}
 */
const USER_OPTIONS = [
  { value: '', label: 'All Users' },
  ...MOCK_USERS.map((user) => ({
    value: user.id,
    label: `${user.firstName} ${user.lastName}`,
    description: user.role,
  })),
  { value: 'system', label: 'System', description: 'Automated actions' },
];

/**
 * Map action types to badge variants for visual distinction.
 * @type {Object<string, string>}
 */
const ACTION_VARIANT_MAP = {
  [AUDIT_ACTIONS.USER_LOGIN]: 'info',
  [AUDIT_ACTIONS.USER_LOGOUT]: 'neutral',
  [AUDIT_ACTIONS.USER_ROLE_CHANGE]: 'warning',
  [AUDIT_ACTIONS.APPLICATION_ONBOARD]: 'success',
  [AUDIT_ACTIONS.APPLICATION_UPDATE]: 'info',
  [AUDIT_ACTIONS.APPLICATION_DELETE]: 'danger',
  [AUDIT_ACTIONS.PIPELINE_DEPLOY]: 'success',
  [AUDIT_ACTIONS.PIPELINE_FAILED]: 'danger',
  [AUDIT_ACTIONS.PIPELINE_CONFIG_UPDATE]: 'info',
  [AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE]: 'info',
  [AUDIT_ACTIONS.COMPLIANCE_REVIEW]: 'purple',
  [AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD]: 'purple',
  [AUDIT_ACTIONS.INCIDENT_CREATE]: 'danger',
  [AUDIT_ACTIONS.INCIDENT_UPDATE]: 'warning',
  [AUDIT_ACTIONS.INCIDENT_RESOLVE]: 'success',
  [AUDIT_ACTIONS.REPORT_EXPORT]: 'info',
  [AUDIT_ACTIONS.SCHEDULED_SCAN]: 'neutral',
  [AUDIT_ACTIONS.SETTINGS_UPDATE]: 'warning',
  [AUDIT_ACTIONS.DATA_EXPORT]: 'info',
  [AUDIT_ACTIONS.DATA_IMPORT]: 'info',
};

/**
 * Map action types to icon-friendly category labels.
 * @type {Object<string, string>}
 */
const ACTION_CATEGORY_MAP = {
  [AUDIT_ACTIONS.USER_LOGIN]: 'Authentication',
  [AUDIT_ACTIONS.USER_LOGOUT]: 'Authentication',
  [AUDIT_ACTIONS.USER_ROLE_CHANGE]: 'User Management',
  [AUDIT_ACTIONS.APPLICATION_ONBOARD]: 'Application',
  [AUDIT_ACTIONS.APPLICATION_UPDATE]: 'Application',
  [AUDIT_ACTIONS.APPLICATION_DELETE]: 'Application',
  [AUDIT_ACTIONS.PIPELINE_DEPLOY]: 'Pipeline',
  [AUDIT_ACTIONS.PIPELINE_FAILED]: 'Pipeline',
  [AUDIT_ACTIONS.PIPELINE_CONFIG_UPDATE]: 'Pipeline',
  [AUDIT_ACTIONS.TOOLCHAIN_CONFIG_UPDATE]: 'Toolchain',
  [AUDIT_ACTIONS.COMPLIANCE_REVIEW]: 'Compliance',
  [AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD]: 'Compliance',
  [AUDIT_ACTIONS.INCIDENT_CREATE]: 'Incident',
  [AUDIT_ACTIONS.INCIDENT_UPDATE]: 'Incident',
  [AUDIT_ACTIONS.INCIDENT_RESOLVE]: 'Incident',
  [AUDIT_ACTIONS.REPORT_EXPORT]: 'Report',
  [AUDIT_ACTIONS.SCHEDULED_SCAN]: 'Security',
  [AUDIT_ACTIONS.SETTINGS_UPDATE]: 'Settings',
  [AUDIT_ACTIONS.DATA_EXPORT]: 'Data',
  [AUDIT_ACTIONS.DATA_IMPORT]: 'Data',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a user ID to a display name.
 * @param {string|null} userId
 * @returns {string}
 */
const resolveUserName = (userId) => {
  if (!userId || userId === 'null') {
    return 'System';
  }
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (user) {
    return `${user.firstName} ${user.lastName}`;
  }
  return userId;
};

/**
 * Resolve a user ID to a role.
 * @param {string|null} userId
 * @returns {string}
 */
const resolveUserRole = (userId) => {
  if (!userId || userId === 'null') {
    return 'System';
  }
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (user) {
    return user.role;
  }
  return 'Unknown';
};

/**
 * Format details object into a readable string.
 * @param {Object|string|null} details
 * @returns {string}
 */
const formatDetails = (details) => {
  if (!details) {
    return 'N/A';
  }
  if (typeof details === 'string') {
    return details;
  }
  if (typeof details === 'object') {
    if (details.message && typeof details.message === 'string') {
      return details.message;
    }
    const entries = Object.entries(details)
      .filter(([key]) => key !== 'message')
      .slice(0, 3)
      .map(([key, value]) => {
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const truncated = displayValue.length > 40 ? displayValue.slice(0, 40) + '…' : displayValue;
        return `${key}: ${truncated}`;
      });
    return entries.join(', ') || 'N/A';
  }
  return String(details);
};

// ---------------------------------------------------------------------------
// Table Columns
// ---------------------------------------------------------------------------

const AUDIT_LOG_COLUMNS = [
  {
    id: 'timestamp',
    header: 'Timestamp',
    accessor: 'timestamp',
    sortable: true,
    cell: (value) => (
      <div className="min-w-0">
        <span className="text-xs text-surface-700 dark:text-surface-300">
          {value ? formatDate(value, { format: 'MMM dd, yyyy HH:mm' }) : 'N/A'}
        </span>
        <p className="text-2xs text-surface-400 dark:text-surface-500">
          {value ? formatDate(value, { format: 'relative' }) : ''}
        </p>
      </div>
    ),
  },
  {
    id: 'userId',
    header: 'User',
    accessor: 'userId',
    sortable: true,
    searchable: true,
    cell: (value) => {
      const userName = resolveUserName(value);
      const isSystem = !value || value === 'null';
      return (
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-2xs font-semibold',
              isSystem
                ? 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'
                : 'bg-horizon-100 text-horizon-700 dark:bg-horizon-900/30 dark:text-horizon-300',
            )}
          >
            {isSystem ? 'SYS' : userName.split(' ').map((n) => n.charAt(0)).join('').toUpperCase()}
          </div>
          <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
            {userName}
          </span>
        </div>
      );
    },
  },
  {
    id: 'role',
    header: 'Role',
    accessor: (row) => resolveUserRole(row.userId),
    sortable: true,
    cell: (value) => {
      const roleVariantMap = {
        Admin: 'danger',
        Auditor: 'purple',
        Engineer: 'info',
        Owner: 'success',
        Executive: 'warning',
        System: 'neutral',
        Unknown: 'neutral',
      };
      const variant = roleVariantMap[value] || 'neutral';
      return (
        <Badge variant={variant} size="sm">
          {value || 'N/A'}
        </Badge>
      );
    },
  },
  {
    id: 'action',
    header: 'Action',
    accessor: 'action',
    sortable: true,
    searchable: true,
    cell: (value) => {
      const variant = ACTION_VARIANT_MAP[value] || 'neutral';
      const category = ACTION_CATEGORY_MAP[value] || 'Other';
      return (
        <div className="min-w-0">
          <Badge variant={variant} size="sm">
            {value ? value.replace(/_/g, ' ') : 'N/A'}
          </Badge>
          <p className="mt-0.5 text-2xs text-surface-400 dark:text-surface-500">{category}</p>
        </div>
      );
    },
  },
  {
    id: 'details',
    header: 'Details',
    accessor: 'details',
    sortable: false,
    searchable: true,
    cell: (value) => {
      const formatted = formatDetails(value);
      return (
        <span
          className="line-clamp-2 max-w-[280px] text-xs text-surface-600 dark:text-surface-400"
          title={typeof value === 'object' ? JSON.stringify(value, null, 2) : formatted}
        >
          {formatted}
        </span>
      );
    },
  },
  {
    id: 'artifactRef',
    header: 'Artifact Ref',
    accessor: 'artifactRef',
    sortable: true,
    searchable: true,
    cell: (value) => {
      if (!value) {
        return <span className="text-xs text-surface-400 dark:text-surface-500">—</span>;
      }
      return (
        <span className="truncate font-mono text-xs text-horizon-600 dark:text-horizon-400" title={value}>
          {value}
        </span>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Summary statistics bar for audit logs.
 */
function AuditSummaryBar({ summary, totalEntries }) {
  const topActions = useMemo(() => {
    if (!summary || typeof summary !== 'object') {
      return [];
    }
    return Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [summary]);

  const totalActions = useMemo(() => {
    if (!summary || typeof summary !== 'object') {
      return 0;
    }
    return Object.values(summary).reduce((sum, count) => sum + count, 0);
  }, [summary]);

  const actionTypeCount = useMemo(() => {
    if (!summary || typeof summary !== 'object') {
      return 0;
    }
    return Object.keys(summary).length;
  }, [summary]);

  const stats = [
    {
      label: 'Total Entries',
      value: totalEntries || totalActions,
      icon: Clock,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-900/30',
    },
    {
      label: 'Action Types',
      value: actionTypeCount,
      icon: ShieldCheck,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
    {
      label: 'Unique Users',
      value: MOCK_USERS.length + 1,
      icon: User,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Compliance Actions',
      value:
        (summary && typeof summary === 'object'
          ? (summary[AUDIT_ACTIONS.COMPLIANCE_REVIEW] || 0) +
            (summary[AUDIT_ACTIONS.COMPLIANCE_ARTIFACT_UPLOAD] || 0)
          : 0),
      icon: Shield,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
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

AuditSummaryBar.propTypes = {
  summary: PropTypes.object,
  totalEntries: PropTypes.number,
};

/**
 * Filter bar for the audit log viewer.
 */
function AuditFilterBar({
  searchQuery,
  onSearchChange,
  onSearchClear,
  userFilter,
  onUserFilterChange,
  actionFilter,
  onActionFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onRefresh,
  onExportCSV,
  onExportJSON,
  onClearFilters,
  activeFilterCount,
  isExporting,
}) {
  return (
    <div className="space-y-3">
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
              placeholder="Search audit logs..."
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

          {/* User filter */}
          <div className="w-48">
            <Select
              id="audit-user-filter"
              placeholder="All Users"
              options={USER_OPTIONS}
              value={userFilter}
              onChange={onUserFilterChange}
              size="sm"
              clearable
              searchable={USER_OPTIONS.length > 5}
              searchPlaceholder="Search users..."
            />
          </div>

          {/* Action filter */}
          <div className="w-48">
            <Select
              id="audit-action-filter"
              placeholder="All Actions"
              options={ACTION_TYPE_OPTIONS}
              value={actionFilter}
              onChange={onActionFilterChange}
              size="sm"
              clearable
              searchable={ACTION_TYPE_OPTIONS.length > 5}
              searchPlaceholder="Search actions..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <Button
            variant="secondary"
            size="sm"
            icon={isExporting ? Loader2 : Download}
            onClick={onExportCSV}
            disabled={isExporting}
            className={isExporting ? '[&_svg]:animate-spin' : ''}
          >
            CSV
          </Button>

          {/* Export JSON */}
          <Button
            variant="secondary"
            size="sm"
            icon={isExporting ? Loader2 : FileText}
            onClick={onExportJSON}
            disabled={isExporting}
            className={isExporting ? '[&_svg]:animate-spin' : ''}
          >
            JSON
          </Button>

          {/* Refresh */}
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Date range filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
          <span className="text-xs text-surface-500 dark:text-surface-400">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="rounded-lg border border-surface-300 bg-white px-2.5 py-1 text-xs text-surface-900 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500 dark:text-surface-400">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="rounded-lg border border-surface-300 bg-white px-2.5 py-1 text-xs text-surface-900 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
          />
        </div>

        {/* Active filters indicator */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <Filter size={14} className="text-surface-400 dark:text-surface-500" />
              <span className="text-xs text-surface-500 dark:text-surface-400">
                {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

AuditFilterBar.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  userFilter: PropTypes.string,
  onUserFilterChange: PropTypes.func.isRequired,
  actionFilter: PropTypes.string,
  onActionFilterChange: PropTypes.func.isRequired,
  startDate: PropTypes.string.isRequired,
  onStartDateChange: PropTypes.func.isRequired,
  endDate: PropTypes.string.isRequired,
  onEndDateChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onExportCSV: PropTypes.func.isRequired,
  onExportJSON: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  activeFilterCount: PropTypes.number.isRequired,
  isExporting: PropTypes.bool,
};

/**
 * Action type distribution chart section.
 */
function ActionDistribution({ summary }) {
  if (!summary || typeof summary !== 'object' || Object.keys(summary).length === 0) {
    return null;
  }

  const totalActions = Object.values(summary).reduce((sum, count) => sum + count, 0);

  const sortedActions = Object.entries(summary)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card variant="default" title="Action Distribution" icon={ShieldCheck}>
      <div className="space-y-2">
        {sortedActions.slice(0, 10).map((entry) => {
          const variant = ACTION_VARIANT_MAP[entry.action] || 'neutral';
          const percentage =
            totalActions > 0
              ? parseFloat(((entry.count / totalActions) * 100).toFixed(1))
              : 0;

          return (
            <div
              key={entry.action}
              className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
            >
              <div className="flex items-center gap-2">
                <Badge variant={variant} size="sm">
                  {entry.action.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                  <div
                    className={clsx(
                      'h-full rounded-full',
                      variant === 'success'
                        ? 'bg-green-500'
                        : variant === 'danger'
                          ? 'bg-red-500'
                          : variant === 'warning'
                            ? 'bg-amber-500'
                            : variant === 'info'
                              ? 'bg-blue-500'
                              : variant === 'purple'
                                ? 'bg-purple-500'
                                : 'bg-surface-400',
                    )}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
                <span className="min-w-[3rem] text-right text-xs font-medium text-surface-700 dark:text-surface-300">
                  {entry.count} ({percentage}%)
                </span>
              </div>
            </div>
          );
        })}
        {sortedActions.length > 10 && (
          <p className="text-center text-2xs text-surface-400 dark:text-surface-500">
            … and {sortedActions.length - 10} more action types
          </p>
        )}
      </div>
    </Card>
  );
}

ActionDistribution.propTypes = {
  summary: PropTypes.object,
};

/**
 * Unauthorized access message for non-admin/auditor users.
 */
function UnauthorizedAccess() {
  return (
    <div className="flex min-h-[400px] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-surface-900 dark:text-surface-100">
          Access Denied
        </h2>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
          The Audit Log Viewer is only accessible to users with Admin or Auditor roles.
        </p>
        <a href="/" className="btn-primary inline-flex">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Audit log viewer component displaying all logged actions in a searchable,
 * filterable table. Supports filtering by user, action type, date range.
 * Supports export to CSV and JSON. Accessible to Admin and Auditor roles only.
 *
 * @param {Object} [props]
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {boolean} [props.showDistribution=true] - Whether to show the action distribution chart.
 * @param {number} [props.defaultPageSize=20] - Default number of rows per page.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function AuditLogViewer({
  showSummary = true,
  showDistribution = true,
  defaultPageSize = 20,
  className,
}) {
  const { currentUser, hasRole, hasPermission } = useAuth();
  const toast = useToast();

  // -------------------------------------------------------------------------
  // RBAC Check
  // -------------------------------------------------------------------------

  const canViewAuditLogs = hasPermission('view_audit_logs');

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const auditData = useMemo(() => {
    const filters = {
      sortBy: 'timestamp',
      sortOrder: 'desc',
    };

    if (userFilter) {
      filters.userId = userFilter;
    }

    if (actionFilter) {
      filters.action = actionFilter;
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      filters.search = searchQuery.trim();
    }

    if (startDate) {
      filters.startDate = startDate;
    }

    if (endDate) {
      filters.endDate = endDate;
    }

    const { entries, total } = getAuditLogs(filters);
    return { entries, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, userFilter, actionFilter, startDate, endDate, refreshKey]);

  const auditSummary = useMemo(() => {
    return getAuditSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // -------------------------------------------------------------------------
  // Active filter count
  // -------------------------------------------------------------------------

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim().length > 0) count++;
    if (userFilter) count++;
    if (actionFilter) count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [searchQuery, userFilter, actionFilter, startDate, endDate]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleUserFilterChange = useCallback((value) => {
    setUserFilter(value || '');
  }, []);

  const handleActionFilterChange = useCallback((value) => {
    setActionFilter(value || '');
  }, []);

  const handleStartDateChange = useCallback((value) => {
    setStartDate(value || '');
  }, []);

  const handleEndDateChange = useCallback((value) => {
    setEndDate(value || '');
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    toast.info('Audit log refreshed.');
  }, [toast]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setUserFilter('');
    setActionFilter('');
    setStartDate('');
    setEndDate('');
  }, []);

  const handleExportCSV = useCallback(() => {
    setIsExporting(true);

    const timer = setTimeout(() => {
      const filters = {};
      if (userFilter) {
        filters.userId = userFilter;
      }
      if (actionFilter) {
        filters.action = actionFilter;
      }
      if (searchQuery && searchQuery.trim().length > 0) {
        filters.search = searchQuery.trim();
      }
      if (startDate) {
        filters.startDate = startDate;
      }
      if (endDate) {
        filters.endDate = endDate;
      }

      const result = exportAuditLogs(filters, { format: 'csv' });

      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-log-export-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${result.count} audit log entries as CSV.`);
      } else {
        toast.error('Failed to export audit logs.');
      }

      setIsExporting(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [userFilter, actionFilter, searchQuery, startDate, endDate, toast]);

  const handleExportJSON = useCallback(() => {
    setIsExporting(true);

    const timer = setTimeout(() => {
      const filters = {};
      if (userFilter) {
        filters.userId = userFilter;
      }
      if (actionFilter) {
        filters.action = actionFilter;
      }
      if (searchQuery && searchQuery.trim().length > 0) {
        filters.search = searchQuery.trim();
      }
      if (startDate) {
        filters.startDate = startDate;
      }
      if (endDate) {
        filters.endDate = endDate;
      }

      const result = exportAuditLogs(filters, { format: 'json' });

      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-log-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${result.count} audit log entries as JSON.`);
      } else {
        toast.error('Failed to export audit logs.');
      }

      setIsExporting(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [userFilter, actionFilter, searchQuery, startDate, endDate, toast]);

  // -------------------------------------------------------------------------
  // RBAC Guard
  // -------------------------------------------------------------------------

  if (!canViewAuditLogs) {
    return <UnauthorizedAccess />;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Audit Log Viewer
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          View and search all audit trail entries including user actions, system events,
          compliance reviews, and configuration changes. Export logs for regulatory compliance
          and HIPAA/CMS audit requirements.
        </p>
      </div>

      {/* Summary Bar */}
      {showSummary && (
        <AuditSummaryBar summary={auditSummary} totalEntries={auditData.total} />
      )}

      {/* Filter Bar */}
      <div className={clsx(showSummary && 'mt-6')}>
        <AuditFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchClear={handleSearchClear}
          userFilter={userFilter}
          onUserFilterChange={handleUserFilterChange}
          actionFilter={actionFilter}
          onActionFilterChange={handleActionFilterChange}
          startDate={startDate}
          onStartDateChange={handleStartDateChange}
          endDate={endDate}
          onEndDateChange={handleEndDateChange}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          onClearFilters={handleClearFilters}
          activeFilterCount={activeFilterCount}
          isExporting={isExporting}
        />
      </div>

      {/* Results count */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-surface-500 dark:text-surface-400">
          {auditData.total} {auditData.total === 1 ? 'entry' : 'entries'} found
        </span>
        {activeFilterCount > 0 && (
          <span className="text-xs text-surface-400 dark:text-surface-500">
            (filtered)
          </span>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="mt-4">
        {auditData.entries.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No audit log entries found"
            description={
              activeFilterCount > 0
                ? 'Try adjusting your search or filter criteria.'
                : 'No audit log entries have been recorded yet. Actions will be logged as users interact with the portal.'
            }
            size="md"
            bordered
          />
        ) : (
          <Table
            columns={AUDIT_LOG_COLUMNS}
            data={auditData.entries}
            searchable={false}
            paginated
            pageSize={defaultPageSize}
            density="compact"
            hoverable
            striped={false}
            emptyMessage="No audit log entries found."
            noResultsMessage="No entries match your search."
            defaultSortColumn="timestamp"
            defaultSortOrder="desc"
          />
        )}
      </div>

      {/* Action Distribution */}
      {showDistribution && auditData.entries.length > 0 && (
        <div className="mt-6">
          <ActionDistribution summary={auditSummary} />
        </div>
      )}

      {/* Compliance notice */}
      <div className="mt-6 rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-horizon-500" />
          <div>
            <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
              HIPAA/CMS Compliance Notice
            </p>
            <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
              All audit log entries are immutable and retained for regulatory compliance purposes.
              Entries include timestamps, user identification, action types, and detailed context
              for each operation. Export functionality is available for audit review and evidence
              collection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

AuditLogViewer.propTypes = {
  showSummary: PropTypes.bool,
  showDistribution: PropTypes.bool,
  defaultPageSize: PropTypes.number,
  className: PropTypes.string,
};