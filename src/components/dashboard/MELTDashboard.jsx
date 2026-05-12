/**
 * MELT (Metrics, Events, Logs, Traces) observability dashboard component
 * for Horizon DevSecOps Portal. Displays aggregated observability data from
 * Dynatrace, Splunk, and Elastic sources. Shows metric charts, event timeline,
 * log summary, trace overview. Supports per-domain/app filtering and time
 * range selection. Displays data source indicators.
 * @module components/dashboard/MELTDashboard
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Info,
  LayoutDashboard,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  Server,
  Shield,
  X,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Select from '../common/Select.jsx';
import StatusIndicator from '../common/StatusIndicator.jsx';
import Tabs from '../common/Tabs.jsx';
import Table from '../common/Table.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import { getMELTData } from '../../services/DashboardDataService.js';
import { getDomains, getApplications } from '../../services/CatalogService.js';
import { formatDate, formatDuration, formatNumber } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * MELT dashboard tab definitions.
 * @type {Array<Object>}
 */
const MELT_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'metrics', label: 'Metrics', icon: Activity },
  { id: 'events', label: 'Events', icon: Zap },
  { id: 'logs', label: 'Logs', icon: Database },
  { id: 'traces', label: 'Traces', icon: Radio },
];

/**
 * Time range options for the MELT dashboard.
 * @type {Array<Object>}
 */
const TIME_RANGE_OPTIONS = [
  { value: 'last_1_hour', label: 'Last 1 Hour' },
  { value: 'last_6_hours', label: 'Last 6 Hours' },
  { value: 'last_24_hours', label: 'Last 24 Hours' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
];

/**
 * Severity color mapping for charts.
 * @type {Object<string, string>}
 */
const SEVERITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#3b82f6',
  Info: '#6b7280',
};

/**
 * Log level color mapping.
 * @type {Object<string, string>}
 */
const LOG_LEVEL_COLORS = {
  ERROR: '#ef4444',
  WARN: '#f59e0b',
  INFO: '#3b82f6',
  DEBUG: '#6b7280',
};

/**
 * Chart color palette.
 * @type {string[]}
 */
const CHART_COLORS = ['#1b5ef5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

/**
 * Data source metadata.
 * @type {Array<Object>}
 */
const DATA_SOURCES = [
  { id: 'dynatrace', name: 'Dynatrace', type: 'Monitoring', status: 'connected' },
  { id: 'splunk', name: 'Splunk', type: 'Logging', status: 'connected' },
  { id: 'elastic', name: 'Elastic', type: 'Search & Analytics', status: 'connected' },
  { id: 'prometheus', name: 'Prometheus', type: 'Metrics', status: 'connected' },
  { id: 'grafana', name: 'Grafana', type: 'Visualization', status: 'connected' },
];

// ---------------------------------------------------------------------------
// Event Table Columns
// ---------------------------------------------------------------------------

const EVENT_COLUMNS = [
  {
    id: 'timestamp',
    header: 'Timestamp',
    accessor: 'timestamp',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value ? formatDate(value, { format: 'relative' }) : 'N/A'}
      </span>
    ),
  },
  {
    id: 'applicationName',
    header: 'Application',
    accessor: 'applicationName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    accessor: 'type',
    sortable: true,
    cell: (value) => (
      <Badge variant="neutral" size="sm">
        {value || 'N/A'}
      </Badge>
    ),
  },
  {
    id: 'severity',
    header: 'Severity',
    accessor: 'severity',
    sortable: true,
    cell: (value) => {
      const variantMap = {
        Critical: 'danger',
        High: 'danger',
        Medium: 'warning',
        Low: 'info',
        Info: 'neutral',
      };
      return (
        <Badge variant={variantMap[value] || 'neutral'} size="sm" dot>
          {value || 'N/A'}
        </Badge>
      );
    },
  },
  {
    id: 'title',
    header: 'Title',
    accessor: 'title',
    sortable: false,
    searchable: true,
    cell: (value) => (
      <span className="truncate text-xs text-surface-700 dark:text-surface-300" title={value}>
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'source',
    header: 'Source',
    accessor: 'source',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">{value || 'N/A'}</span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Log Table Columns
// ---------------------------------------------------------------------------

const LOG_COLUMNS = [
  {
    id: 'timestamp',
    header: 'Timestamp',
    accessor: 'timestamp',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value ? formatDate(value, { format: 'relative' }) : 'N/A'}
      </span>
    ),
  },
  {
    id: 'applicationName',
    header: 'Application',
    accessor: 'applicationName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'level',
    header: 'Level',
    accessor: 'level',
    sortable: true,
    cell: (value) => {
      const variantMap = {
        ERROR: 'danger',
        WARN: 'warning',
        INFO: 'info',
        DEBUG: 'neutral',
      };
      return (
        <Badge variant={variantMap[value] || 'neutral'} size="sm">
          {value || 'N/A'}
        </Badge>
      );
    },
  },
  {
    id: 'message',
    header: 'Message',
    accessor: 'message',
    sortable: false,
    searchable: true,
    cell: (value) => (
      <span className="truncate text-xs text-surface-700 dark:text-surface-300" title={value}>
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'source',
    header: 'Source',
    accessor: 'source',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">{value || 'N/A'}</span>
    ),
  },
  {
    id: 'traceId',
    header: 'Trace ID',
    accessor: 'traceId',
    sortable: false,
    cell: (value) => (
      <span className="truncate font-mono text-2xs text-surface-400 dark:text-surface-500">
        {value || '—'}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Trace Table Columns
// ---------------------------------------------------------------------------

const TRACE_COLUMNS = [
  {
    id: 'startTime',
    header: 'Start Time',
    accessor: 'startTime',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value ? formatDate(value, { format: 'relative' }) : 'N/A'}
      </span>
    ),
  },
  {
    id: 'applicationName',
    header: 'Application',
    accessor: 'applicationName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'operationName',
    header: 'Operation',
    accessor: 'operationName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="truncate font-mono text-xs text-surface-700 dark:text-surface-300" title={value}>
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'durationMs',
    header: 'Duration',
    accessor: 'durationMs',
    sortable: true,
    align: 'right',
    cell: (value) => (
      <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
        {typeof value === 'number' ? `${formatNumber(value)}ms` : 'N/A'}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    sortable: true,
    cell: (value) => {
      const statusMap = {
        ok: 'success',
        error: 'error',
      };
      return <StatusIndicator status={statusMap[value] || 'info'} label={value || 'N/A'} size="sm" />;
    },
  },
  {
    id: 'spans',
    header: 'Spans',
    accessor: (row) => (Array.isArray(row.spans) ? row.spans.length : 0),
    sortable: true,
    align: 'center',
    cell: (value) => (
      <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
        {typeof value === 'number' ? value : 0}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Summary statistics bar for MELT overview.
 */
function MELTSummaryBar({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800"
          >
            <div className="h-10 w-10 animate-pulse rounded-lg bg-surface-200 dark:bg-surface-700" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-16 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
              <div className="h-3 w-24 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const stats = [
    {
      label: 'Avg CPU',
      value: `${summary.avgCpuUtilization || 0}%`,
      icon: Cpu,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      status: summary.avgCpuUtilization > 80 ? 'warning' : 'success',
    },
    {
      label: 'Avg Memory',
      value: `${summary.avgMemoryUtilization || 0}%`,
      icon: Server,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
      status: summary.avgMemoryUtilization > 85 ? 'warning' : 'success',
    },
    {
      label: 'P95 Response',
      value: `${summary.avgResponseTimeP95Ms || 0}ms`,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      status: summary.avgResponseTimeP95Ms > 500 ? 'warning' : 'success',
    },
    {
      label: 'Error Rate',
      value: `${summary.avgErrorRate || 0}%`,
      icon: AlertCircle,
      color: summary.avgErrorRate > 1 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      bg: summary.avgErrorRate > 1 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30',
      status: summary.avgErrorRate > 1 ? 'error' : 'success',
    },
    {
      label: 'Availability',
      value: `${summary.avgAvailability || 0}%`,
      icon: Shield,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
      status: summary.avgAvailability >= 99.9 ? 'success' : 'warning',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-elevated dark:border-surface-700 dark:bg-surface-800"
          >
            <div
              className={clsx(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                stat.bg,
              )}
            >
              <Icon size={20} className={stat.color} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-semibold text-surface-900 dark:text-surface-100">
                {stat.value}
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-surface-500 dark:text-surface-400">{stat.label}</p>
                <span
                  className={clsx(
                    'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                    stat.status === 'success'
                      ? 'bg-green-500'
                      : stat.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-red-500',
                  )}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

MELTSummaryBar.propTypes = {
  summary: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Data source indicators bar.
 */
function DataSourceIndicators({ sources }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
        Data Sources:
      </span>
      {DATA_SOURCES.map((ds) => {
        const isActive = Array.isArray(sources) && sources.some((s) => s.toLowerCase().includes(ds.id));
        return (
          <div
            key={ds.id}
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium transition-colors duration-200',
              isActive
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500',
            )}
          >
            <span
              className={clsx(
                'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                isActive ? 'bg-green-500 dark:bg-green-400' : 'bg-surface-300 dark:bg-surface-600',
              )}
            />
            {ds.name}
          </div>
        );
      })}
    </div>
  );
}

DataSourceIndicators.propTypes = {
  sources: PropTypes.arrayOf(PropTypes.string),
};

/**
 * MELT filter bar component.
 */
function MELTFilterBar({
  domainFilter,
  onDomainFilterChange,
  domainOptions,
  applicationFilter,
  onApplicationFilterChange,
  applicationOptions,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  isRefreshing,
  lastUpdated,
  onClearFilters,
  activeFilterCount,
}) {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-card dark:border-surface-700 dark:bg-surface-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48">
            <Select
              id="melt-domain-filter"
              placeholder="All Domains"
              options={domainOptions}
              value={domainFilter}
              onChange={onDomainFilterChange}
              size="sm"
              clearable
              searchable={domainOptions.length > 5}
              searchPlaceholder="Search domains..."
            />
          </div>
          <div className="w-52">
            <Select
              id="melt-app-filter"
              placeholder="All Applications"
              options={applicationOptions}
              value={applicationFilter}
              onChange={onApplicationFilterChange}
              size="sm"
              clearable
              searchable={applicationOptions.length > 5}
              searchPlaceholder="Search applications..."
            />
          </div>
          <div className="w-40">
            <Select
              id="melt-time-range"
              placeholder="Time Range"
              options={TIME_RANGE_OPTIONS}
              value={timeRange}
              onChange={onTimeRangeChange}
              size="sm"
            />
          </div>
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
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={isRefreshing ? Loader2 : RefreshCw}
            onClick={onRefresh}
            disabled={isRefreshing}
            className={isRefreshing ? '[&_svg]:animate-spin' : ''}
          >
            Refresh
          </Button>
          {lastUpdated && (
            <span className="flex items-center gap-1 text-2xs text-surface-400 dark:text-surface-500">
              <Clock size={10} />
              {formatDate(lastUpdated, { format: 'relative' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

MELTFilterBar.propTypes = {
  domainFilter: PropTypes.string,
  onDomainFilterChange: PropTypes.func.isRequired,
  domainOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  applicationFilter: PropTypes.string,
  onApplicationFilterChange: PropTypes.func.isRequired,
  applicationOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  timeRange: PropTypes.string.isRequired,
  onTimeRangeChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
  lastUpdated: PropTypes.string,
  onClearFilters: PropTypes.func.isRequired,
  activeFilterCount: PropTypes.number.isRequired,
};

/**
 * Application metrics chart card.
 */
function MetricsChartCard({ metrics }) {
  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No metrics data"
        description="No application metrics are available for the selected filters."
        size="md"
        bordered
      />
    );
  }

  const chartData = metrics.map((m) => ({
    name: m.applicationName || 'N/A',
    cpu: m.metrics?.cpuUtilization || 0,
    memory: m.metrics?.memoryUtilization || 0,
    errorRate: m.metrics?.errorRate || 0,
    p95: m.metrics?.responseTimeP95Ms || 0,
    availability: m.metrics?.availability || 0,
    rps: m.metrics?.requestsPerSecond || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Resource Utilization Chart */}
      <Card variant="default" title="Resource Utilization" icon={Cpu}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="cpu" name="CPU %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="memory" name="Memory %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Response Time & Error Rate Chart */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="default" title="Response Time (P95)" icon={Clock}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  unit="ms"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="p95" name="P95 (ms)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="default" title="Error Rate" icon={AlertCircle}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar
                  dataKey="errorRate"
                  name="Error Rate %"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Availability & Throughput */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="default" title="Availability" icon={Shield}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  domain={[99, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar
                  dataKey="availability"
                  name="Availability %"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="default" title="Requests per Second" icon={Zap}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar
                  dataKey="rps"
                  name="Req/s"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

MetricsChartCard.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.object),
};

/**
 * Application metrics detail list.
 */
function MetricsDetailList({ metrics }) {
  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    return null;
  }

  return (
    <Card variant="default" title="Application Metrics Detail" icon={Server}>
      <div className="space-y-2">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3 dark:bg-surface-900/50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {metric.applicationName || 'N/A'}
              </p>
              <p className="text-2xs text-surface-400 dark:text-surface-500">
                {metric.environment || 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-surface-600 dark:text-surface-300">
              <div className="flex flex-col items-center">
                <span className="font-medium">{metric.metrics?.cpuUtilization || 0}%</span>
                <span className="text-2xs text-surface-400 dark:text-surface-500">CPU</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium">{metric.metrics?.memoryUtilization || 0}%</span>
                <span className="text-2xs text-surface-400 dark:text-surface-500">Mem</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium">{metric.metrics?.responseTimeP95Ms || 0}ms</span>
                <span className="text-2xs text-surface-400 dark:text-surface-500">P95</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium">{metric.metrics?.errorRate || 0}%</span>
                <span className="text-2xs text-surface-400 dark:text-surface-500">Err</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium">{metric.metrics?.requestsPerSecond || 0}</span>
                <span className="text-2xs text-surface-400 dark:text-surface-500">Req/s</span>
              </div>
              <StatusIndicator
                status={metric.metrics?.availability >= 99.9 ? 'active' : 'warning'}
                label={`${metric.metrics?.availability || 0}%`}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

MetricsDetailList.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.object),
};

/**
 * Events severity distribution chart.
 */
function EventsSeverityChart({ events }) {
  const severityData = useMemo(() => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      return [];
    }

    const counts = {};
    events.forEach((e) => {
      const key = e.severity || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: SEVERITY_COLORS[name] || '#6b7280',
    }));
  }, [events]);

  if (severityData.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" title="Events by Severity" icon={AlertTriangle}>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={severityData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {severityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

EventsSeverityChart.propTypes = {
  events: PropTypes.arrayOf(PropTypes.object),
};

/**
 * Log level distribution chart.
 */
function LogLevelChart({ logs }) {
  const levelData = useMemo(() => {
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return [];
    }

    const counts = {};
    logs.forEach((l) => {
      const key = l.level || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: LOG_LEVEL_COLORS[name] || '#6b7280',
    }));
  }, [logs]);

  if (levelData.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" title="Logs by Level" icon={Database}>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={levelData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {levelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

LogLevelChart.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.object),
};

/**
 * Trace span detail viewer.
 */
function TraceSpanViewer({ trace }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (!trace) {
    return null;
  }

  const spans = Array.isArray(trace.spans) ? trace.spans : [];

  return (
    <div className="rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-50 dark:hover:bg-surface-700/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusIndicator
              status={trace.status === 'error' ? 'error' : 'success'}
              size="sm"
              showLabel={false}
            />
            <span className="truncate font-mono text-xs font-medium text-surface-900 dark:text-surface-100">
              {trace.operationName || 'N/A'}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-2xs text-surface-400 dark:text-surface-500">
            <span>{trace.applicationName || 'N/A'}</span>
            <span>{typeof trace.durationMs === 'number' ? `${trace.durationMs}ms` : 'N/A'}</span>
            <span>{spans.length} spans</span>
            <span>{trace.traceId || 'N/A'}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
        ) : (
          <ChevronDown size={16} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
        )}
      </button>

      {expanded && spans.length > 0 && (
        <div className="border-t border-surface-200 px-4 py-3 dark:border-surface-700">
          <div className="space-y-1.5">
            {spans.map((span, idx) => {
              const widthPercent =
                trace.durationMs > 0
                  ? Math.max(5, Math.min(100, (span.durationMs / trace.durationMs) * 100))
                  : 50;

              return (
                <div
                  key={span.spanId || idx}
                  className="flex items-center gap-3 rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
                >
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-200 text-2xs font-semibold text-surface-600 dark:bg-surface-700 dark:text-surface-400">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-mono text-2xs text-surface-700 dark:text-surface-300">
                        {span.operationName || 'N/A'}
                      </span>
                      <div className="flex items-center gap-2">
                        <StatusIndicator
                          status={span.status === 'error' ? 'error' : 'success'}
                          label={span.status || 'ok'}
                          size="sm"
                        />
                        <span className="text-2xs font-medium text-surface-500 dark:text-surface-400">
                          {typeof span.durationMs === 'number' ? `${span.durationMs}ms` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          span.status === 'error' ? 'bg-red-500' : 'bg-horizon-500',
                        )}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

TraceSpanViewer.propTypes = {
  trace: PropTypes.object,
};

/**
 * Overview tab content with summary cards and charts.
 */
function OverviewTabContent({ meltData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading MELT data...
        </span>
      </div>
    );
  }

  if (!meltData || !meltData.summary) {
    return (
      <EmptyState
        icon={Activity}
        title="No MELT data available"
        description="MELT metrics will appear here once data is available from monitoring sources."
        size="md"
        bordered
      />
    );
  }

  const { summary, metrics, events, logs, traces } = meltData;

  return (
    <div className="space-y-6">
      {/* Signal Counts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Metrics',
            value: summary.metricsCount || 0,
            icon: Activity,
            color: 'text-horizon-600 dark:text-horizon-400',
            bg: 'bg-horizon-50 dark:bg-horizon-900/30',
          },
          {
            label: 'Events',
            value: summary.eventsCount || 0,
            icon: Zap,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-900/30',
            extra: summary.criticalEvents > 0 ? `${summary.criticalEvents} critical` : null,
          },
          {
            label: 'Logs',
            value: summary.logsCount || 0,
            icon: Database,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/30',
            extra: summary.errorLogs > 0 ? `${summary.errorLogs} errors` : null,
          },
          {
            label: 'Traces',
            value: summary.tracesCount || 0,
            icon: Radio,
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-50 dark:bg-purple-900/30',
            extra: summary.errorTraces > 0 ? `${summary.errorTraces} errors` : null,
          },
        ].map((stat) => {
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
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-surface-500 dark:text-surface-400">{stat.label}</p>
                  {stat.extra && (
                    <Badge variant="danger" size="sm">
                      {stat.extra}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <EventsSeverityChart events={events} />
        <LogLevelChart logs={logs} />
      </div>

      {/* Application Metrics */}
      <MetricsDetailList metrics={metrics} />

      {/* Recent Events */}
      {Array.isArray(events) && events.length > 0 && (
        <Card variant="default" title="Recent Events" icon={Zap}>
          <div className="space-y-2">
            {events.slice(0, 5).map((event) => {
              const severityVariant =
                event.severity === 'Critical'
                  ? 'danger'
                  : event.severity === 'High'
                    ? 'danger'
                    : event.severity === 'Medium'
                      ? 'warning'
                      : event.severity === 'Low'
                        ? 'info'
                        : 'neutral';

              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={severityVariant} size="sm" dot>
                        {event.severity}
                      </Badge>
                      <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-100">
                        {event.title}
                      </span>
                    </div>
                    <p className="mt-0.5 text-2xs text-surface-400 dark:text-surface-500">
                      {event.applicationName || 'N/A'} · {event.source || 'N/A'}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-2xs text-surface-400 dark:text-surface-500">
                    {event.timestamp
                      ? formatDate(event.timestamp, { format: 'relative' })
                      : 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent Traces */}
      {Array.isArray(traces) && traces.length > 0 && (
        <Card variant="default" title="Recent Traces" icon={Radio}>
          <div className="space-y-2">
            {traces.slice(0, 3).map((trace) => (
              <TraceSpanViewer key={trace.id} trace={trace} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

OverviewTabContent.propTypes = {
  meltData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Metrics tab content with detailed charts.
 */
function MetricsTabContent({ meltData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading metrics...
        </span>
      </div>
    );
  }

  if (!meltData || !meltData.metrics || meltData.metrics.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No metrics data"
        description="Application metrics will appear here once data is available from monitoring sources."
        size="md"
        bordered
      />
    );
  }

  return (
    <div className="space-y-6">
      <MetricsChartCard metrics={meltData.metrics} />
      <MetricsDetailList metrics={meltData.metrics} />
    </div>
  );
}

MetricsTabContent.propTypes = {
  meltData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Events tab content with table and charts.
 */
function EventsTabContent({ meltData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading events...
        </span>
      </div>
    );
  }

  if (!meltData || !meltData.events || meltData.events.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="No events data"
        description="Events will appear here once data is available from monitoring sources."
        size="md"
        bordered
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Severity distribution */}
      <EventsSeverityChart events={meltData.events} />

      {/* Events summary stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
          <span className="text-xl font-semibold text-red-600 dark:text-red-400">
            {meltData.summary?.criticalEvents || 0}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            Critical Events
          </span>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
          <span className="text-xl font-semibold text-amber-600 dark:text-amber-400">
            {meltData.summary?.highEvents || 0}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            High Events
          </span>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
          <span className="text-xl font-semibold text-surface-600 dark:text-surface-300">
            {meltData.summary?.eventsCount || 0}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            Total Events
          </span>
        </div>
      </div>

      {/* Events table */}
      <Table
        columns={EVENT_COLUMNS}
        data={meltData.events}
        searchable
        searchPlaceholder="Search events..."
        paginated
        pageSize={10}
        density="compact"
        hoverable
        striped={false}
        emptyMessage="No events found."
        noResultsMessage="No events match your search."
        defaultSortColumn="timestamp"
        defaultSortOrder="desc"
      />
    </div>
  );
}

EventsTabContent.propTypes = {
  meltData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Logs tab content with table and charts.
 */
function LogsTabContent({ meltData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading logs...
        </span>
      </div>
    );
  }

  if (!meltData || !meltData.logs || meltData.logs.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No log data"
        description="Logs will appear here once data is available from logging sources."
        size="md"
        bordered
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Log level distribution */}
      <LogLevelChart logs={meltData.logs} />

      {/* Log summary stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
          <span className="text-xl font-semibold text-red-600 dark:text-red-400">
            {meltData.summary?.errorLogs || 0}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            Error Logs
          </span>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
          <span className="text-xl font-semibold text-amber-600 dark:text-amber-400">
            {meltData.summary?.warnLogs || 0}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            Warning Logs
          </span>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
          <span className="text-xl font-semibold text-surface-600 dark:text-surface-300">
            {meltData.summary?.logsCount || 0}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            Total Logs
          </span>
        </div>
      </div>

      {/* Logs table */}
      <Table
        columns={LOG_COLUMNS}
        data={meltData.logs}
        searchable
        searchPlaceholder="Search logs..."
        paginated
        pageSize={10}
        density="compact"
        hoverable
        striped={false}
        emptyMessage="No logs found."
        noResultsMessage="No logs match your search."
        defaultSortColumn="timestamp"
        defaultSortOrder="desc"
      />
    </div>
  );
}

LogsTabContent.propTypes = {
  meltData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Traces tab content with table and span viewer.
 */
function TracesTabContent({ meltData, loading }) {
  const [selectedTrace, setSelectedTrace] = useState(null);

  const handleTraceSelect = useCallback((row) => {
    setSelectedTrace(row);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading traces...
        </span>
      </div>
    );
  }

  if (!meltData || !meltData.traces || meltData.traces.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title="No trace data"
        description="Distributed traces will appear here once data is available from tracing sources."
        size="md"
        bordered
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Trace summary stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
          <span className="text-xl font-semibold text-surface-600 dark:text-surface-300">
            {meltData.summary?.tracesCount || 0}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            Total Traces
          </span>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
          <span className="text-xl font-semibold text-red-600 dark:text-red-400">
            {meltData.summary?.errorTraces || 0}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            Error Traces
          </span>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
          <span className="text-xl font-semibold text-green-600 dark:text-green-400">
            {(meltData.traces || []).filter((t) => t.status === 'ok').length}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            Successful Traces
          </span>
        </div>
      </div>

      {/* Traces table */}
      <Table
        columns={TRACE_COLUMNS}
        data={meltData.traces}
        searchable
        searchPlaceholder="Search traces..."
        paginated
        pageSize={10}
        density="compact"
        hoverable
        striped={false}
        onRowClick={handleTraceSelect}
        emptyMessage="No traces found."
        noResultsMessage="No traces match your search."
        defaultSortColumn="startTime"
        defaultSortOrder="desc"
      />

      {/* Selected trace span viewer */}
      {selectedTrace && (
        <Card variant="default" title="Trace Detail" icon={Radio}>
          <TraceSpanViewer trace={selectedTrace} />
        </Card>
      )}

      {/* All traces as span viewers */}
      {!selectedTrace && (
        <Card variant="default" title="Trace Waterfall" icon={Radio}>
          <div className="space-y-2">
            {meltData.traces.map((trace) => (
              <TraceSpanViewer key={trace.id} trace={trace} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

TracesTabContent.propTypes = {
  meltData: PropTypes.object,
  loading: PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * MELT (Metrics, Events, Logs, Traces) observability dashboard component.
 * Displays aggregated observability data from Dynatrace, Splunk, and Elastic
 * sources. Shows metric charts, event timeline, log summary, trace overview.
 * Supports per-domain/app filtering and time range selection.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultTab='overview'] - Default active tab.
 * @param {string} [props.defaultDomain] - Pre-selected domain filter.
 * @param {string} [props.defaultApplication] - Pre-selected application filter.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {boolean} [props.showDataSources=true] - Whether to show data source indicators.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function MELTDashboard({
  defaultTab = 'overview',
  defaultDomain,
  defaultApplication,
  showSummary = true,
  showDataSources = true,
  className,
}) {
  const { currentUser } = useAuth();
  const toast = useToast();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [domainFilter, setDomainFilter] = useState(defaultDomain || '');
  const [applicationFilter, setApplicationFilter] = useState(defaultApplication || '');
  const [timeRange, setTimeRange] = useState('last_24_hours');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meltData, setMeltData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // -------------------------------------------------------------------------
  // Catalog data for filters
  // -------------------------------------------------------------------------

  const allDomains = useMemo(() => {
    return getDomains({ sortBy: 'name', sortOrder: 'asc' });
  }, []);

  const domainOptions = useMemo(() => {
    return [
      { value: '', label: 'All Domains' },
      ...allDomains.map((d) => ({ value: d.name, label: d.name })),
    ];
  }, [allDomains]);

  const allApplications = useMemo(() => {
    const options = { sortBy: 'name', sortOrder: 'asc' };
    if (domainFilter) {
      options.domainName = domainFilter;
    }
    const result = getApplications(options);
    return result.data || [];
  }, [domainFilter]);

  const applicationOptions = useMemo(() => {
    return [
      { value: '', label: 'All Applications' },
      ...allApplications.map((a) => ({
        value: a.name,
        label: a.name,
        description: a.criticalityTier || undefined,
      })),
    ];
  }, [allApplications]);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const fetchData = useCallback(() => {
    setLoading(true);

    try {
      const filters = {};
      if (domainFilter) {
        filters.domain = domainFilter;
      }
      if (applicationFilter) {
        filters.application = applicationFilter;
      }

      const data = getMELTData(filters);
      setMeltData(data);
      setLastUpdated(data.lastUpdated || new Date().toISOString());
    } catch (_err) {
      console.error('MELTDashboard: Failed to fetch MELT data:', _err);
      toast.error('Failed to load MELT data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [domainFilter, applicationFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Tab badges
  // -------------------------------------------------------------------------

  const tabsWithBadges = useMemo(() => {
    return MELT_TABS.map((tab) => {
      let badge;
      if (meltData && meltData.summary) {
        switch (tab.id) {
          case 'metrics':
            badge = meltData.summary.metricsCount || undefined;
            break;
          case 'events':
            badge = meltData.summary.eventsCount || undefined;
            break;
          case 'logs':
            badge = meltData.summary.logsCount || undefined;
            break;
          case 'traces':
            badge = meltData.summary.tracesCount || undefined;
            break;
          default:
            break;
        }
      }
      return { ...tab, badge };
    });
  }, [meltData]);

  // -------------------------------------------------------------------------
  // Active filter count
  // -------------------------------------------------------------------------

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (domainFilter) count++;
    if (applicationFilter) count++;
    return count;
  }, [domainFilter, applicationFilter]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const handleDomainFilterChange = useCallback((value) => {
    setDomainFilter(value || '');
    setApplicationFilter('');
  }, []);

  const handleApplicationFilterChange = useCallback((value) => {
    setApplicationFilter(value || '');
  }, []);

  const handleTimeRangeChange = useCallback((value) => {
    setTimeRange(value || 'last_24_hours');
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
    toast.info('MELT data refreshed.');

    const timer = setTimeout(() => {
      setIsRefreshing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchData, toast]);

  const handleClearFilters = useCallback(() => {
    setDomainFilter('');
    setApplicationFilter('');
  }, []);

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTabContent meltData={meltData} loading={loading} />;
      case 'metrics':
        return <MetricsTabContent meltData={meltData} loading={loading} />;
      case 'events':
        return <EventsTabContent meltData={meltData} loading={loading} />;
      case 'logs':
        return <LogsTabContent meltData={meltData} loading={loading} />;
      case 'traces':
        return <TracesTabContent meltData={meltData} loading={loading} />;
      default:
        return <OverviewTabContent meltData={meltData} loading={loading} />;
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          MELT Dashboard
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Unified observability dashboard aggregating Metrics, Events, Logs, and Traces from
          Dynatrace, Splunk, Elastic, and other monitoring sources.
        </p>
      </div>

      {/* Filter Bar */}
      <MELTFilterBar
        domainFilter={domainFilter}
        onDomainFilterChange={handleDomainFilterChange}
        domainOptions={domainOptions}
        applicationFilter={applicationFilter}
        onApplicationFilterChange={handleApplicationFilterChange}
        applicationOptions={applicationOptions}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || loading}
        lastUpdated={lastUpdated}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Data Source Indicators */}
      {showDataSources && (
        <div className="mt-4">
          <DataSourceIndicators sources={meltData ? meltData.sources : []} />
        </div>
      )}

      {/* Summary Bar */}
      {showSummary && (
        <div className="mt-4">
          <MELTSummaryBar summary={meltData ? meltData.summary : null} loading={loading} />
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6">
        <Tabs
          tabs={tabsWithBadges}
          activeTab={activeTab}
          onChange={handleTabChange}
          variant="underline"
          size="md"
        />
      </div>

      {/* Tab Content */}
      <div className="mt-6">{renderTabContent()}</div>
    </div>
  );
}

MELTDashboard.propTypes = {
  defaultTab: PropTypes.oneOf(['overview', 'metrics', 'events', 'logs', 'traces']),
  defaultDomain: PropTypes.string,
  defaultApplication: PropTypes.string,
  showSummary: PropTypes.bool,
  showDataSources: PropTypes.bool,
  className: PropTypes.string,
};