/**
 * Dashboard shell/container component for Horizon DevSecOps Portal
 * Provides the layout for all dashboard views with domain/app selector,
 * tab navigation for different dashboard types (MELT, KPI, Governance),
 * auto-refresh toggle, and time range selector. Wraps child dashboard components.
 * @module components/dashboard/DashboardShell
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  Clock,
  Filter,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Select from '../common/Select.jsx';
import StatusIndicator from '../common/StatusIndicator.jsx';
import Tabs from '../common/Tabs.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useApp } from '../../contexts/AppContext.jsx';
import { useToast } from '../common/Toast.jsx';
import useDashboardData from '../../hooks/useDashboardData.js';
import {
  getDomains,
  getApplications,
} from '../../services/CatalogService.js';
import { formatDate } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Dashboard tab definitions.
 * @type {Array<Object>}
 */
const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'melt', label: 'MELT Metrics', icon: Activity },
  { id: 'kpi', label: 'KPI / DORA', icon: TrendingUp },
  { id: 'governance', label: 'Governance', icon: ShieldCheck },
  { id: 'cost', label: 'Cost & FinOps', icon: BarChart3 },
];

/**
 * Time range options for the dashboard.
 * @type {Array<Object>}
 */
const TIME_RANGE_OPTIONS = [
  { value: 'last_1_hour', label: 'Last 1 Hour' },
  { value: 'last_6_hours', label: 'Last 6 Hours' },
  { value: 'last_24_hours', label: 'Last 24 Hours' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
];

/**
 * Auto-refresh interval options.
 * @type {Array<Object>}
 */
const REFRESH_INTERVAL_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 30000, label: '30 seconds' },
  { value: 60000, label: '1 minute' },
  { value: 300000, label: '5 minutes' },
  { value: 600000, label: '10 minutes' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Domain and application filter bar.
 */
function DashboardFilterBar({
  domainFilter,
  onDomainFilterChange,
  domainOptions,
  applicationFilter,
  onApplicationFilterChange,
  applicationOptions,
  timeRange,
  onTimeRangeChange,
  autoRefreshInterval,
  onAutoRefreshIntervalChange,
  onRefresh,
  isRefreshing,
  lastUpdated,
  onClearFilters,
  activeFilterCount,
}) {
  return (
    <div className="relative z-20 overflow-visible rounded-xl border border-surface-200 bg-white/80 p-4 shadow-card backdrop-blur-md dark:border-surface-800 dark:bg-surface-950/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Domain filter */}
          <div className="w-52">
            <Select
              id="dashboard-domain-filter"
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

          {/* Application filter */}
          <div className="w-56">
            <Select
              id="dashboard-app-filter"
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

          {/* Time range */}
          <div className="w-44">
            <Select
              id="dashboard-time-range"
              placeholder="Time Range"
              options={TIME_RANGE_OPTIONS}
              value={timeRange}
              onChange={onTimeRangeChange}
              size="sm"
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
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Right: Refresh controls */}
        <div className="flex items-center gap-3">
          {/* Auto-refresh selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500 dark:text-surface-400">Auto-refresh:</span>
            <div className="w-32">
              <Select
                id="dashboard-auto-refresh"
                placeholder="Off"
                options={REFRESH_INTERVAL_OPTIONS.map((opt) => ({
                  value: String(opt.value),
                  label: opt.label,
                }))}
                value={String(autoRefreshInterval)}
                onChange={(val) => onAutoRefreshIntervalChange(Number(val) || 0)}
                size="sm"
              />
            </div>
          </div>

          {/* Manual refresh */}
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

          {/* Last updated */}
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

DashboardFilterBar.propTypes = {
  domainFilter: PropTypes.string,
  onDomainFilterChange: PropTypes.func.isRequired,
  domainOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  applicationFilter: PropTypes.string,
  onApplicationFilterChange: PropTypes.func.isRequired,
  applicationOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  timeRange: PropTypes.string.isRequired,
  onTimeRangeChange: PropTypes.func.isRequired,
  autoRefreshInterval: PropTypes.number.isRequired,
  onAutoRefreshIntervalChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
  lastUpdated: PropTypes.string,
  onClearFilters: PropTypes.func.isRequired,
  activeFilterCount: PropTypes.number.isRequired,
};

/**
 * Overview summary cards displayed at the top of the dashboard.
 */
function OverviewSummaryCards({ dashboardSummary, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white/50 p-4 backdrop-blur-sm dark:border-surface-800 dark:bg-surface-900/50"
          >
            <div className="h-10 w-10 animate-pulse rounded-lg bg-surface-200 dark:bg-surface-800" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-16 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
              <div className="h-3 w-24 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const overview = dashboardSummary ? dashboardSummary.overview : null;
  const dora = dashboardSummary ? dashboardSummary.dora : null;
  const qe = dashboardSummary ? dashboardSummary.qe : null;
  const governance = dashboardSummary ? dashboardSummary.governance : null;

  const stats = [
    {
      label: 'Applications',
      value: overview ? overview.totalApplications : 0,
      icon: Server,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-500/10',
    },
    {
      label: 'Pipeline Success',
      value: overview ? `${overview.pipelineSuccessRate || 0}%` : 'N/A',
      icon: Zap,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-500/10',
      status: overview && overview.pipelineSuccessRate >= 90 ? 'success' : 'warning',
    },
    {
      label: 'Active Incidents',
      value: overview ? overview.activeIncidents : 0,
      icon: Activity,
      color: overview && overview.criticalIncidents > 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-blue-600 dark:text-blue-400',
      bg: overview && overview.criticalIncidents > 0
        ? 'bg-red-50 dark:bg-red-500/10'
        : 'bg-blue-50 dark:bg-blue-500/10',
      extra: overview && overview.criticalIncidents > 0
        ? `${overview.criticalIncidents} critical`
        : null,
    },
    {
      label: 'Compliance Score',
      value: overview ? `${overview.overallComplianceScore || 0}%` : 'N/A',
      icon: Shield,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      status: overview && overview.overallComplianceScore >= 90 ? 'success' : 'warning',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white/50 p-4 shadow-card transition-all duration-300 hover:shadow-elevated dark:border-surface-800 dark:bg-surface-900/50 dark:backdrop-blur-sm dark:hover:bg-surface-900"
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
  );
}

OverviewSummaryCards.propTypes = {
  dashboardSummary: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * DORA metrics summary row.
 */
function DORAMetricsSummary({ doraMetrics, loading }) {
  if (loading || !doraMetrics) {
    return null;
  }

  const classificationColors = {
    Elite: 'success',
    High: 'info',
    Medium: 'warning',
    Low: 'danger',
  };

  const metrics = [
    {
      label: 'Deployment Frequency',
      value: doraMetrics.avgDeploymentFrequency !== undefined
        ? `${doraMetrics.avgDeploymentFrequency}/mo`
        : 'N/A',
      classification: doraMetrics.classifications
        ? doraMetrics.classifications.deploymentFrequency
        : null,
    },
    {
      label: 'Lead Time',
      value: doraMetrics.avgLeadTimeForChanges !== undefined
        ? `${doraMetrics.avgLeadTimeForChanges} days`
        : 'N/A',
      classification: doraMetrics.classifications
        ? doraMetrics.classifications.leadTimeForChanges
        : null,
    },
    {
      label: 'Change Failure Rate',
      value: doraMetrics.avgChangeFailureRate !== undefined
        ? `${doraMetrics.avgChangeFailureRate}%`
        : 'N/A',
      classification: doraMetrics.classifications
        ? doraMetrics.classifications.changeFailureRate
        : null,
    },
    {
      label: 'MTTR',
      value: doraMetrics.avgMeanTimeToRecovery !== undefined
        ? `${doraMetrics.avgMeanTimeToRecovery}h`
        : 'N/A',
      classification: doraMetrics.classifications
        ? doraMetrics.classifications.meanTimeToRecovery
        : null,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800"
        >
          <span className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            {metric.value}
          </span>
          <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
            {metric.label}
          </span>
          {metric.classification && (
            <Badge
              variant={classificationColors[metric.classification] || 'neutral'}
              size="sm"
              className="mt-1"
            >
              {metric.classification}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

DORAMetricsSummary.propTypes = {
  doraMetrics: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Overview tab content with summary cards and DORA metrics.
 */
function OverviewTabContent({ dashboardSummary, doraMetrics, loading }) {
  return (
    <div className="space-y-6">
      <OverviewSummaryCards dashboardSummary={dashboardSummary} loading={loading} />

      {/* DORA Metrics */}
      <Card variant="default" title="DORA Metrics" icon={TrendingUp}>
        <DORAMetricsSummary
          doraMetrics={doraMetrics ? doraMetrics.summary : null}
          loading={loading}
        />
        {doraMetrics && doraMetrics.summary && doraMetrics.summary.overallLevel && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xs text-surface-500 dark:text-surface-400">
              Overall DORA Level:
            </span>
            <Badge
              variant={
                doraMetrics.summary.overallLevel === 'Elite'
                  ? 'success'
                  : doraMetrics.summary.overallLevel === 'High'
                    ? 'info'
                    : doraMetrics.summary.overallLevel === 'Medium'
                      ? 'warning'
                      : 'danger'
              }
              size="md"
              dot
            >
              {doraMetrics.summary.overallLevel}
            </Badge>
          </div>
        )}
      </Card>

      {/* Quick Stats Row */}
      {dashboardSummary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* QE Summary */}
          {dashboardSummary.qe && (
            <Card variant="outlined" title="Quality Engineering" icon={Activity}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Code Coverage
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.qe.avgCodeCoverage || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Pipeline Success
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.qe.avgPipelineSuccessRate || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Security Scan Pass
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.qe.avgSecurityScanPassRate || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Vulnerabilities
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.qe.totalVulnerabilities || 0}
                    {dashboardSummary.qe.totalCriticalVulnerabilities > 0 && (
                      <span className="ml-1 text-xs text-red-500">
                        ({dashboardSummary.qe.totalCriticalVulnerabilities} critical)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Governance Summary */}
          {dashboardSummary.governance && (
            <Card variant="outlined" title="Governance" icon={ShieldCheck}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Compliance Rate
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.governance.overallComplianceRate || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Total Artifacts
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.governance.totalArtifacts || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Critical Findings
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.governance.criticalFindings || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Audit Readiness
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.governance.auditReadinessScore || 0}%
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* MTTR Summary */}
          {dashboardSummary.mttr && (
            <Card variant="outlined" title="Incident Management" icon={Zap}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Total Incidents
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.mttr.totalIncidents || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Open
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.mttr.openIncidents || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Avg MTTR
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.mttr.avgMttrHours || 0}h
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Critical
                  </span>
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {dashboardSummary.mttr.criticalIncidents || 0}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

OverviewTabContent.propTypes = {
  dashboardSummary: PropTypes.object,
  doraMetrics: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * MELT tab content placeholder.
 */
function MELTTabContent({ meltData, loading }) {
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

  const { summary } = meltData;

  return (
    <div className="space-y-6">
      {/* MELT Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Avg CPU', value: `${summary.avgCpuUtilization || 0}%`, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Avg Memory', value: `${summary.avgMemoryUtilization || 0}%`, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Avg P95 Response', value: `${summary.avgResponseTimeP95Ms || 0}ms`, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Avg Error Rate', value: `${summary.avgErrorRate || 0}%`, color: 'text-red-600 dark:text-red-400' },
          { label: 'Avg Availability', value: `${summary.avgAvailability || 0}%`, color: 'text-green-600 dark:text-green-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800"
          >
            <span className={clsx('text-xl font-semibold', stat.color)}>{stat.value}</span>
            <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Events & Logs Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="outlined" title="Events" icon={Zap}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">Total Events</span>
              <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {summary.eventsCount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">Critical</span>
              <Badge variant="danger" size="sm">{summary.criticalEvents || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">High</span>
              <Badge variant="warning" size="sm">{summary.highEvents || 0}</Badge>
            </div>
          </div>
        </Card>

        <Card variant="outlined" title="Logs" icon={Activity}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">Total Logs</span>
              <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {summary.logsCount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">Errors</span>
              <Badge variant="danger" size="sm">{summary.errorLogs || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">Warnings</span>
              <Badge variant="warning" size="sm">{summary.warnLogs || 0}</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Metrics per Application */}
      {Array.isArray(meltData.metrics) && meltData.metrics.length > 0 && (
        <Card variant="default" title="Application Metrics" icon={Server}>
          <div className="space-y-2">
            {meltData.metrics.map((metric) => (
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
                  <span>CPU: {metric.metrics?.cpuUtilization || 0}%</span>
                  <span>Mem: {metric.metrics?.memoryUtilization || 0}%</span>
                  <span>P95: {metric.metrics?.responseTimeP95Ms || 0}ms</span>
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
      )}
    </div>
  );
}

MELTTabContent.propTypes = {
  meltData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * KPI tab content placeholder.
 */
function KPITabContent({ kpiData, doraMetrics, qeMetrics, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading KPI data...
        </span>
      </div>
    );
  }

  if (!kpiData || !kpiData.summary) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No KPI data available"
        description="KPI and DORA metrics will appear here once data is available."
        size="md"
        bordered
      />
    );
  }

  const { summary } = kpiData;

  return (
    <div className="space-y-6">
      {/* DORA Metrics */}
      {doraMetrics && (
        <Card variant="default" title="DORA Metrics" icon={TrendingUp}>
          <DORAMetricsSummary
            doraMetrics={doraMetrics.summary}
            loading={false}
          />
        </Card>
      )}

      {/* KPI Summary */}
      <Card variant="default" title="KPI Summary" icon={BarChart3}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Avg Deployment Frequency', value: `${summary.avgDeploymentFrequency || 0}/mo` },
            { label: 'Avg Lead Time', value: `${summary.avgLeadTime || 0} days` },
            { label: 'Avg Change Failure Rate', value: `${summary.avgChangeFailureRate || 0}%` },
            { label: 'Avg MTTR', value: `${summary.avgMTTR || 0}h` },
            { label: 'Avg Pipeline Success', value: `${summary.avgPipelineSuccessRate || 0}%` },
            { label: 'Avg Code Coverage', value: `${summary.avgCodeCoverage || 0}%` },
            { label: 'Avg Availability', value: `${summary.avgAvailability || 0}%` },
            { label: 'Avg Compliance Score', value: `${summary.avgComplianceScore || 0}%` },
            { label: 'Total Vulnerabilities', value: summary.totalVulnerabilities || 0 },
            { label: 'Avg Response Time P95', value: `${summary.avgResponseTimeP95 || 0}ms` },
            { label: 'Avg Toil Reduction', value: `${summary.avgToilReduction || 0}%` },
            { label: 'Avg Onboarding Time', value: `${summary.avgOnboardingTime || 0} days` },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
            >
              <span className="text-xs text-surface-500 dark:text-surface-400">{item.label}</span>
              <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Per-Application KPI */}
      {Array.isArray(kpiData.metrics) && kpiData.metrics.length > 0 && (
        <Card variant="default" title="KPI by Application" icon={Server}>
          <div className="space-y-2">
            {kpiData.metrics.map((metric) => (
              <div
                key={metric.id || metric.applicationId}
                className="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {metric.applicationName || 'N/A'}
                  </p>
                  <p className="text-2xs text-surface-400 dark:text-surface-500">
                    {metric.period || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-surface-600 dark:text-surface-300">
                  {metric.metrics && (
                    <>
                      <span>Deploy: {metric.metrics.deployment_frequency || 0}/mo</span>
                      <span>Coverage: {metric.metrics.code_coverage || 0}%</span>
                      <span>Avail: {metric.metrics.availability || 0}%</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

KPITabContent.propTypes = {
  kpiData: PropTypes.object,
  doraMetrics: PropTypes.object,
  qeMetrics: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Governance tab content placeholder.
 */
function GovernanceTabContent({ governanceData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading governance data...
        </span>
      </div>
    );
  }

  if (!governanceData || !governanceData.summary) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No governance data available"
        description="Compliance and governance data will appear here once artifacts are generated."
        size="md"
        bordered
      />
    );
  }

  const { summary, complianceByApplication, complianceByStatus } = governanceData;

  return (
    <div className="space-y-6">
      {/* Governance Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Artifacts', value: summary.totalArtifacts || 0, color: 'text-horizon-600 dark:text-horizon-400' },
          { label: 'Compliance Rate', value: `${summary.overallComplianceRate || 0}%`, color: 'text-green-600 dark:text-green-400' },
          { label: 'Critical Findings', value: summary.criticalFindings || 0, color: 'text-red-600 dark:text-red-400' },
          { label: 'Audit Readiness', value: `${summary.auditReadinessScore || 0}%`, color: 'text-purple-600 dark:text-purple-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800"
          >
            <span className={clsx('text-xl font-semibold', stat.color)}>{stat.value}</span>
            <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Compliance by Status */}
      {Array.isArray(complianceByStatus) && complianceByStatus.length > 0 && (
        <Card variant="default" title="Compliance by Status" icon={Shield}>
          <div className="space-y-2">
            {complianceByStatus.map((entry) => {
              const statusVariant =
                entry.status === 'Compliant'
                  ? 'success'
                  : entry.status === 'Non-Compliant'
                    ? 'danger'
                    : entry.status === 'Partial'
                      ? 'warning'
                      : entry.status === 'Pending Review'
                        ? 'info'
                        : 'neutral';

              return (
                <div
                  key={entry.status}
                  className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
                >
                  <Badge variant={statusVariant} size="sm" dot>
                    {entry.status}
                  </Badge>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          statusVariant === 'success'
                            ? 'bg-green-500'
                            : statusVariant === 'danger'
                              ? 'bg-red-500'
                              : statusVariant === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-blue-500',
                        )}
                        style={{ width: `${Math.min(100, entry.percentage || 0)}%` }}
                      />
                    </div>
                    <span className="min-w-[3rem] text-right text-xs font-medium text-surface-700 dark:text-surface-300">
                      {entry.count} ({entry.percentage || 0}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Compliance by Application */}
      {Array.isArray(complianceByApplication) && complianceByApplication.length > 0 && (
        <Card variant="default" title="Compliance by Application" icon={Server}>
          <div className="space-y-2">
            {complianceByApplication.map((entry) => (
              <div
                key={entry.applicationName}
                className="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {entry.applicationName}
                  </p>
                  <p className="text-2xs text-surface-400 dark:text-surface-500">
                    {entry.totalArtifacts} artifacts
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      entry.complianceRate >= 90
                        ? 'success'
                        : entry.complianceRate >= 70
                          ? 'warning'
                          : 'danger'
                    }
                    size="sm"
                  >
                    {entry.complianceRate}%
                  </Badge>
                  {entry.findings && entry.findings.critical > 0 && (
                    <Badge variant="danger" size="sm">
                      {entry.findings.critical} critical
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

GovernanceTabContent.propTypes = {
  governanceData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Cost & FinOps tab content placeholder.
 */
function CostTabContent({ costFinOps, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading cost data...
        </span>
      </div>
    );
  }

  if (!costFinOps || !costFinOps.summary) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No cost data available"
        description="Cost and FinOps data will appear here once data is available."
        size="md"
        bordered
      />
    );
  }

  const { summary, costByDomain, costByApplication } = costFinOps;

  return (
    <div className="space-y-6">
      {/* Cost Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Monthly Cost', value: `$${(summary.totalMonthlyCost || 0).toLocaleString()}`, color: 'text-horizon-600 dark:text-horizon-400' },
          { label: 'Annual Cost', value: `$${(summary.totalAnnualCost || 0).toLocaleString()}`, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Optimization Potential', value: `$${(summary.totalOptimizationPotential || 0).toLocaleString()}`, color: 'text-green-600 dark:text-green-400' },
          { label: 'Cost Efficiency', value: `${summary.costEfficiencyScore || 0}%`, color: 'text-purple-600 dark:text-purple-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800"
          >
            <span className={clsx('text-xl font-semibold', stat.color)}>{stat.value}</span>
            <span className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Cost by Domain */}
      {Array.isArray(costByDomain) && costByDomain.length > 0 && (
        <Card variant="default" title="Cost by Domain" icon={Building2}>
          <div className="space-y-2">
            {costByDomain.map((entry) => (
              <div
                key={entry.domainName}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {entry.domainName}
                  </span>
                  <span className="ml-2 text-2xs text-surface-400 dark:text-surface-500">
                    {entry.applicationCount} apps
                  </span>
                </div>
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  ${(entry.totalCost || 0).toLocaleString()}/mo
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

CostTabContent.propTypes = {
  costFinOps: PropTypes.object,
  loading: PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Dashboard shell/container component providing the layout for all dashboard views.
 * Includes domain/app selector at top, tab navigation for different dashboard types
 * (MELT, KPI, Governance), auto-refresh toggle, and time range selector.
 * Wraps child dashboard components.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultTab='overview'] - Default active tab.
 * @param {string} [props.defaultDomain] - Pre-selected domain filter.
 * @param {string} [props.defaultApplication] - Pre-selected application filter.
 * @param {boolean} [props.showSummaryCards=true] - Whether to show summary cards.
 * @param {import('react').ReactNode} [props.children] - Optional child content to render in the active tab.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function DashboardShell({
  defaultTab = 'overview',
  defaultDomain,
  defaultApplication,
  showSummaryCards = true,
  children,
  className,
}) {
  const { currentUser } = useAuth();
  const { selectedDomain, selectedApplication } = useApp();
  const toast = useToast();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [domainFilter, setDomainFilter] = useState(
    defaultDomain || (selectedDomain && typeof selectedDomain === 'object' ? selectedDomain.name : selectedDomain) || '',
  );
  const [applicationFilter, setApplicationFilter] = useState(
    defaultApplication || (selectedApplication && typeof selectedApplication === 'object' ? selectedApplication.name : selectedApplication) || '',
  );
  const [timeRange, setTimeRange] = useState('last_7_days');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // -------------------------------------------------------------------------
  // Data loading via custom hook
  // -------------------------------------------------------------------------

  const {
    meltData,
    kpiData,
    doraMetrics,
    mttrMetrics,
    qeMetrics,
    aiAdoption,
    costFinOps,
    governanceData,
    dashboardSummary,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useDashboardData(domainFilter || null, applicationFilter || null, {
    autoRefresh: autoRefreshInterval > 0,
    refreshIntervalMs: autoRefreshInterval > 0 ? autoRefreshInterval : undefined,
  });

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
  // Tab badges
  // -------------------------------------------------------------------------

  const tabsWithBadges = useMemo(() => {
    return DASHBOARD_TABS.map((tab) => {
      let badge;
      if (tab.id === 'melt' && meltData && meltData.summary) {
        badge = meltData.summary.metricsCount || undefined;
      } else if (tab.id === 'kpi' && kpiData && kpiData.summary) {
        badge = kpiData.summary.applicationCount || undefined;
      } else if (tab.id === 'governance' && governanceData && governanceData.summary) {
        badge = governanceData.summary.totalArtifacts || undefined;
      }
      return { ...tab, badge };
    });
  }, [meltData, kpiData, governanceData]);

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
    setTimeRange(value || 'last_7_days');
  }, []);

  const handleAutoRefreshIntervalChange = useCallback((value) => {
    setAutoRefreshInterval(typeof value === 'number' ? value : 0);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refresh();
    toast.info('Dashboard data refreshed.');

    const timer = setTimeout(() => {
      setIsRefreshing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [refresh, toast]);

  const handleClearFilters = useCallback(() => {
    setDomainFilter('');
    setApplicationFilter('');
  }, []);

  // -------------------------------------------------------------------------
  // Error display
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error, toast]);

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    // If children are provided, render them instead of default content
    if (children !== null && children !== undefined) {
      return children;
    }

    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTabContent
            dashboardSummary={dashboardSummary}
            doraMetrics={doraMetrics}
            loading={loading}
          />
        );
      case 'melt':
        return <MELTTabContent meltData={meltData} loading={loading} />;
      case 'kpi':
        return (
          <KPITabContent
            kpiData={kpiData}
            doraMetrics={doraMetrics}
            qeMetrics={qeMetrics}
            loading={loading}
          />
        );
      case 'governance':
        return <GovernanceTabContent governanceData={governanceData} loading={loading} />;
      case 'cost':
        return <CostTabContent costFinOps={costFinOps} loading={loading} />;
      default:
        return (
          <OverviewTabContent
            dashboardSummary={dashboardSummary}
            doraMetrics={doraMetrics}
            loading={loading}
          />
        );
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
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Unified observability dashboard with MELT metrics, KPI/DORA performance indicators,
          governance compliance, and cost analytics.
        </p>
      </div>

      {/* Filter Bar */}
      <DashboardFilterBar
        domainFilter={domainFilter}
        onDomainFilterChange={handleDomainFilterChange}
        domainOptions={domainOptions}
        applicationFilter={applicationFilter}
        onApplicationFilterChange={handleApplicationFilterChange}
        applicationOptions={applicationOptions}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        autoRefreshInterval={autoRefreshInterval}
        onAutoRefreshIntervalChange={handleAutoRefreshIntervalChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || loading}
        lastUpdated={lastUpdated}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
      />

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

      {/* Auto-refresh indicator */}
      {autoRefreshInterval > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse-slow rounded-full bg-green-500" />
          <span className="text-2xs text-surface-400 dark:text-surface-500">
            Auto-refreshing every{' '}
            {REFRESH_INTERVAL_OPTIONS.find((o) => o.value === autoRefreshInterval)?.label || 'N/A'}
          </span>
        </div>
      )}
    </div>
  );
}

DashboardShell.propTypes = {
  defaultTab: PropTypes.oneOf(['overview', 'melt', 'kpi', 'governance', 'cost']),
  defaultDomain: PropTypes.string,
  defaultApplication: PropTypes.string,
  showSummaryCards: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};