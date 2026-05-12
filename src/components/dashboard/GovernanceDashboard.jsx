/**
 * Governance dashboard component for Horizon DevSecOps Portal
 * Shows compliance status, onboarding progress, pipeline adoption rates,
 * security scan results summary, audit trail summary, and RBAC coverage.
 * Displays governance KPIs with trend indicators.
 * @module components/dashboard/GovernanceDashboard
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Code2,
  Filter,
  GitBranch,
  Globe,
  Info,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Select from '../common/Select.jsx';
import StatusIndicator from '../common/StatusIndicator.jsx';
import Tabs from '../common/Tabs.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import {
  getKPIData,
  getDORAMetrics,
  getQEMetrics,
  getGovernanceData,
  getDashboardSummary,
  getConfigurableMetrics,
} from '../../services/DashboardDataService.js';
import { getDomains, getApplications, getCatalogSummary } from '../../services/CatalogService.js';
import { getOnboardingSummary } from '../../services/OnboardingService.js';
import { getPipelinesSummary } from '../../services/PipelineService.js';
import { getArtifactSummary } from '../../services/ComplianceArtifactService.js';
import { getAuditLogs, getAuditSummary } from '../../utils/auditLogger.js';
import { formatDate, formatNumber, formatPercentage } from '../../utils/formatters.js';
import { ROLES, ROLE_LIST } from '../../constants/constants.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Governance dashboard tab definitions.
 * @type {Array<Object>}
 */
const GOVERNANCE_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'onboarding', label: 'Onboarding', icon: Server },
  { id: 'pipelines', label: 'Pipeline Adoption', icon: GitBranch },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'audit', label: 'Audit Trail', icon: Clock },
];

/**
 * Time range options.
 * @type {Array<Object>}
 */
const TIME_RANGE_OPTIONS = [
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_12_months', label: 'Last 12 Months' },
];

/**
 * Chart color palette.
 * @type {string[]}
 */
const CHART_COLORS = [
  '#10b981',
  '#ef4444',
  '#f59e0b',
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
];

/**
 * Compliance status colors for pie chart.
 * @type {Object<string, string>}
 */
const COMPLIANCE_STATUS_COLORS = {
  Compliant: '#10b981',
  'Non-Compliant': '#ef4444',
  Partial: '#f59e0b',
  'Pending Review': '#3b82f6',
  'Not Applicable': '#94a3b8',
};

/**
 * RBAC role colors.
 * @type {Object<string, string>}
 */
const ROLE_COLORS = {
  [ROLES.ADMIN]: '#ef4444',
  [ROLES.AUDITOR]: '#8b5cf6',
  [ROLES.ENGINEER]: '#3b82f6',
  [ROLES.OWNER]: '#10b981',
  [ROLES.EXECUTIVE]: '#f59e0b',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Governance KPI stat card with trend indicator.
 */
function GovernanceStatCard({
  label,
  value,
  unit,
  icon,
  color,
  bg,
  trend,
  trendLabel,
  description,
  className: extraClassName,
}) {
  const Icon = icon || Activity;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl border border-surface-200 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-elevated dark:border-surface-700 dark:bg-surface-800',
        extraClassName,
      )}
    >
      <div
        className={clsx(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
          bg || 'bg-horizon-50 dark:bg-horizon-900/30',
        )}
      >
        <Icon size={20} className={color || 'text-horizon-600 dark:text-horizon-400'} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          {value !== null && value !== undefined ? value : 'N/A'}
          {unit && (
            <span className="ml-0.5 text-sm font-normal text-surface-400 dark:text-surface-500">
              {unit}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
          {trend !== null && trend !== undefined && (
            <span
              className={clsx(
                'flex items-center gap-0.5 text-2xs font-medium',
                trend > 0
                  ? 'text-green-600 dark:text-green-400'
                  : trend < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-surface-400',
              )}
            >
              {trend > 0 ? (
                <TrendingUp size={10} />
              ) : trend < 0 ? (
                <TrendingDown size={10} />
              ) : null}
              {trendLabel || ''}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-2xs text-surface-400 dark:text-surface-500">{description}</p>
        )}
      </div>
    </div>
  );
}

GovernanceStatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
  icon: PropTypes.elementType,
  color: PropTypes.string,
  bg: PropTypes.string,
  trend: PropTypes.number,
  trendLabel: PropTypes.string,
  description: PropTypes.string,
  className: PropTypes.string,
};

/**
 * Governance filter bar.
 */
function GovernanceFilterBar({
  domainFilter,
  onDomainFilterChange,
  domainOptions,
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
              id="governance-domain-filter"
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
          <div className="w-44">
            <Select
              id="governance-time-range"
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

GovernanceFilterBar.propTypes = {
  domainFilter: PropTypes.string,
  onDomainFilterChange: PropTypes.func.isRequired,
  domainOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  timeRange: PropTypes.string.isRequired,
  onTimeRangeChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
  lastUpdated: PropTypes.string,
  onClearFilters: PropTypes.func.isRequired,
  activeFilterCount: PropTypes.number.isRequired,
};

/**
 * Overview tab content with top-level governance KPIs.
 */
function OverviewTabContent({
  governanceData,
  kpiData,
  onboardingSummary,
  pipelineSummary,
  artifactSummary,
  auditSummary,
  catalogSummary,
  loading,
}) {
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

  const govSummary = governanceData ? governanceData.summary : null;
  const kpiSummary = kpiData ? kpiData.summary : null;

  const complianceRate = govSummary ? govSummary.overallComplianceRate : 0;
  const auditReadiness = govSummary ? govSummary.auditReadinessScore : 0;
  const criticalFindings = govSummary ? govSummary.criticalFindings : 0;
  const totalArtifacts = govSummary ? govSummary.totalArtifacts : 0;
  const totalOnboarded = onboardingSummary ? onboardingSummary.totalOnboarded : 0;
  const totalApplications = catalogSummary ? catalogSummary.totalApplications : 0;
  const pipelineSuccessRate = pipelineSummary ? pipelineSummary.successRate : 0;
  const totalPipelines = pipelineSummary ? pipelineSummary.totalPipelines : 0;
  const totalAuditEntries = auditSummary
    ? Object.values(auditSummary).reduce((sum, count) => sum + count, 0)
    : 0;

  const onboardingRate =
    totalApplications > 0
      ? parseFloat(((totalOnboarded / totalApplications) * 100).toFixed(1))
      : 0;

  const pipelineAdoptionRate =
    totalApplications > 0
      ? parseFloat(((totalPipelines / totalApplications) * 100).toFixed(1))
      : 0;

  return (
    <div className="space-y-6">
      {/* Top-level KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GovernanceStatCard
          label="Compliance Rate"
          value={formatPercentage(complianceRate)}
          icon={ShieldCheck}
          color={
            complianceRate >= 90
              ? 'text-green-600 dark:text-green-400'
              : complianceRate >= 70
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
          }
          bg={
            complianceRate >= 90
              ? 'bg-green-50 dark:bg-green-900/30'
              : complianceRate >= 70
                ? 'bg-amber-50 dark:bg-amber-900/30'
                : 'bg-red-50 dark:bg-red-900/30'
          }
          trend={complianceRate >= 90 ? 1 : complianceRate >= 70 ? 0 : -1}
          trendLabel={complianceRate >= 90 ? 'On track' : 'Needs attention'}
          description="Overall compliance across all applications"
        />
        <GovernanceStatCard
          label="Audit Readiness"
          value={formatPercentage(auditReadiness)}
          icon={CheckCircle2}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
          trend={auditReadiness >= 85 ? 1 : 0}
          trendLabel={auditReadiness >= 85 ? 'Audit-ready' : 'Improving'}
          description="Readiness score for regulatory audits"
        />
        <GovernanceStatCard
          label="Critical Findings"
          value={formatNumber(criticalFindings)}
          icon={AlertCircle}
          color={
            criticalFindings === 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }
          bg={
            criticalFindings === 0
              ? 'bg-green-50 dark:bg-green-900/30'
              : 'bg-red-50 dark:bg-red-900/30'
          }
          trend={criticalFindings === 0 ? 1 : -1}
          trendLabel={criticalFindings === 0 ? 'Clear' : 'Action required'}
          description="Critical security and compliance findings"
        />
        <GovernanceStatCard
          label="Pipeline Success Rate"
          value={formatPercentage(pipelineSuccessRate)}
          icon={GitBranch}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
          trend={pipelineSuccessRate >= 90 ? 1 : 0}
          trendLabel={pipelineSuccessRate >= 90 ? 'Healthy' : 'Monitor'}
          description="CI/CD pipeline success rate"
        />
      </div>

      {/* Second row: Adoption & Coverage */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GovernanceStatCard
          label="Onboarding Progress"
          value={formatPercentage(onboardingRate)}
          icon={Server}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
          description={`${totalOnboarded} of ${totalApplications} applications`}
        />
        <GovernanceStatCard
          label="Pipeline Adoption"
          value={formatPercentage(pipelineAdoptionRate)}
          icon={Wrench}
          color="text-teal-600 dark:text-teal-400"
          bg="bg-teal-50 dark:bg-teal-900/30"
          description={`${totalPipelines} pipelines configured`}
        />
        <GovernanceStatCard
          label="Compliance Artifacts"
          value={formatNumber(totalArtifacts)}
          icon={Shield}
          color="text-indigo-600 dark:text-indigo-400"
          bg="bg-indigo-50 dark:bg-indigo-900/30"
          description="Total generated artifacts"
        />
        <GovernanceStatCard
          label="Audit Trail Entries"
          value={formatNumber(totalAuditEntries)}
          icon={Clock}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-900/30"
          description="Total audit log entries"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Compliance Status Distribution */}
        {governanceData &&
          Array.isArray(governanceData.complianceByStatus) &&
          governanceData.complianceByStatus.length > 0 && (
            <Card variant="default" title="Compliance Status Distribution" icon={ShieldCheck}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={governanceData.complianceByStatus.map((entry) => ({
                        name: entry.status,
                        value: entry.count,
                        color: COMPLIANCE_STATUS_COLORS[entry.status] || '#94a3b8',
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {governanceData.complianceByStatus.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COMPLIANCE_STATUS_COLORS[entry.status] || '#94a3b8'}
                        />
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
          )}

        {/* RBAC Role Coverage */}
        <Card variant="default" title="RBAC Role Coverage" icon={Users}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ROLE_LIST.map((role) => ({
                  name: role,
                  permissions:
                    role === ROLES.ADMIN
                      ? 18
                      : role === ROLES.OWNER
                        ? 15
                        : role === ROLES.ENGINEER
                          ? 11
                          : role === ROLES.AUDITOR
                            ? 10
                            : 8,
                }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="permissions" name="Permissions" radius={[4, 4, 0, 0]}>
                  {ROLE_LIST.map((role, index) => (
                    <Cell key={`cell-${index}`} fill={ROLE_COLORS[role] || CHART_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Compliance by Application */}
      {governanceData &&
        Array.isArray(governanceData.complianceByApplication) &&
        governanceData.complianceByApplication.length > 0 && (
          <Card variant="default" title="Compliance by Application" icon={Server}>
            <div className="space-y-2">
              {governanceData.complianceByApplication.map((entry) => (
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
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          entry.complianceRate >= 90
                            ? 'bg-green-500'
                            : entry.complianceRate >= 70
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                        )}
                        style={{
                          width: `${Math.min(100, entry.complianceRate || 0)}%`,
                        }}
                      />
                    </div>
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
                      {formatPercentage(entry.complianceRate)}
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

      {/* KPI Summary */}
      {kpiSummary && (
        <Card variant="default" title="Governance KPI Summary" icon={BarChart3}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: 'Avg Code Coverage',
                value: formatPercentage(kpiSummary.avgCodeCoverage),
              },
              {
                label: 'Security Scan Pass Rate',
                value: formatPercentage(kpiSummary.avgSecurityScanPassRate),
              },
              {
                label: 'Avg Compliance Score',
                value: formatPercentage(kpiSummary.avgComplianceScore),
              },
              {
                label: 'Total Vulnerabilities',
                value: formatNumber(kpiSummary.totalVulnerabilities),
              },
              {
                label: 'Critical Vulnerabilities',
                value: formatNumber(kpiSummary.totalCriticalVulnerabilities),
              },
              {
                label: 'Avg Availability',
                value: formatPercentage(kpiSummary.avgAvailability),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <span className="text-xs text-surface-500 dark:text-surface-400">
                  {item.label}
                </span>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

OverviewTabContent.propTypes = {
  governanceData: PropTypes.object,
  kpiData: PropTypes.object,
  onboardingSummary: PropTypes.object,
  pipelineSummary: PropTypes.object,
  artifactSummary: PropTypes.object,
  auditSummary: PropTypes.object,
  catalogSummary: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Compliance tab content.
 */
function ComplianceTabContent({ governanceData, artifactSummary, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading compliance data...
        </span>
      </div>
    );
  }

  if (!governanceData || !governanceData.summary) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No compliance data available"
        description="Compliance data will appear here once artifacts are generated."
        size="md"
        bordered
      />
    );
  }

  const { summary, complianceByStatus, complianceByApplication } = governanceData;

  return (
    <div className="space-y-6">
      {/* Compliance Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GovernanceStatCard
          label="Total Artifacts"
          value={formatNumber(summary.totalArtifacts)}
          icon={ShieldCheck}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
        />
        <GovernanceStatCard
          label="Compliance Rate"
          value={formatPercentage(summary.overallComplianceRate)}
          icon={CheckCircle2}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
        <GovernanceStatCard
          label="Critical Findings"
          value={formatNumber(summary.criticalFindings)}
          icon={AlertCircle}
          color={
            summary.criticalFindings > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-green-600 dark:text-green-400'
          }
          bg={
            summary.criticalFindings > 0
              ? 'bg-red-50 dark:bg-red-900/30'
              : 'bg-green-50 dark:bg-green-900/30'
          }
        />
        <GovernanceStatCard
          label="Audit Readiness"
          value={formatPercentage(summary.auditReadinessScore)}
          icon={Shield}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
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
                        style={{
                          width: `${Math.min(100, entry.percentage || 0)}%`,
                        }}
                      />
                    </div>
                    <span className="min-w-[3rem] text-right text-xs font-medium text-surface-700 dark:text-surface-300">
                      {entry.count} ({formatNumber(entry.percentage, { decimals: 1 })}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Artifact Summary by Type */}
      {artifactSummary &&
        Array.isArray(artifactSummary.byType) &&
        artifactSummary.byType.length > 0 && (
          <Card variant="default" title="Artifacts by Type" icon={ShieldCheck}>
            <div className="space-y-2">
              {artifactSummary.byType.map((entry) => (
                <div
                  key={entry.type}
                  className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
                >
                  <span className="text-xs text-surface-700 dark:text-surface-300">
                    {entry.type}
                  </span>
                  <Badge variant="horizon" size="sm">
                    {entry.count}
                  </Badge>
                </div>
              ))}
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
                    {formatPercentage(entry.complianceRate)}
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

ComplianceTabContent.propTypes = {
  governanceData: PropTypes.object,
  artifactSummary: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Onboarding progress tab content.
 */
function OnboardingTabContent({ onboardingSummary, catalogSummary, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading onboarding data...
        </span>
      </div>
    );
  }

  const totalOnboarded = onboardingSummary ? onboardingSummary.totalOnboarded : 0;
  const totalApplications = catalogSummary ? catalogSummary.totalApplications : 0;
  const onboardingRate =
    totalApplications > 0
      ? parseFloat(((totalOnboarded / totalApplications) * 100).toFixed(1))
      : 0;

  const byDomain =
    onboardingSummary && Array.isArray(onboardingSummary.byDomain)
      ? onboardingSummary.byDomain
      : [];
  const byCriticality =
    onboardingSummary && Array.isArray(onboardingSummary.byCriticality)
      ? onboardingSummary.byCriticality
      : [];

  return (
    <div className="space-y-6">
      {/* Onboarding Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GovernanceStatCard
          label="Total Applications"
          value={formatNumber(totalApplications)}
          icon={Server}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
        />
        <GovernanceStatCard
          label="Onboarded"
          value={formatNumber(totalOnboarded)}
          icon={CheckCircle2}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
        <GovernanceStatCard
          label="Onboarding Rate"
          value={formatPercentage(onboardingRate)}
          icon={Activity}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
          trend={onboardingRate >= 80 ? 1 : 0}
          trendLabel={onboardingRate >= 80 ? 'Good coverage' : 'In progress'}
        />
        <GovernanceStatCard
          label="Domains"
          value={formatNumber(catalogSummary ? catalogSummary.totalDomains : 0)}
          icon={Building2}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Onboarding by Domain */}
        {byDomain.length > 0 && (
          <Card variant="default" title="Onboarding by Domain" icon={Building2}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byDomain}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="domain"
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
                    dataKey="count"
                    name="Applications"
                    fill={CHART_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Onboarding by Criticality */}
        {byCriticality.length > 0 && (
          <Card variant="default" title="Onboarding by Criticality" icon={Shield}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCriticality.map((entry, idx) => ({
                      name: entry.tier,
                      value: entry.count,
                      color: CHART_COLORS[idx % CHART_COLORS.length],
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {byCriticality.map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
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
        )}
      </div>

      {/* Recent Onboardings */}
      {onboardingSummary &&
        Array.isArray(onboardingSummary.recentOnboardings) &&
        onboardingSummary.recentOnboardings.length > 0 && (
          <Card variant="default" title="Recent Onboardings" icon={Clock}>
            <div className="space-y-2">
              {onboardingSummary.recentOnboardings.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3 dark:bg-surface-900/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                      {record.applicationName || 'N/A'}
                    </p>
                    <p className="text-2xs text-surface-400 dark:text-surface-500">
                      {record.domainName || 'N/A'} · {record.criticalityTier || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIndicator
                      status={record.status === 'completed' ? 'success' : 'pending'}
                      label={record.status || 'N/A'}
                      size="sm"
                    />
                    <span className="text-2xs text-surface-400 dark:text-surface-500">
                      {record.submittedAt
                        ? formatDate(record.submittedAt, { format: 'relative' })
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
    </div>
  );
}

OnboardingTabContent.propTypes = {
  onboardingSummary: PropTypes.object,
  catalogSummary: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Pipeline adoption tab content.
 */
function PipelineAdoptionTabContent({ pipelineSummary, catalogSummary, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading pipeline data...
        </span>
      </div>
    );
  }

  if (!pipelineSummary) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No pipeline data available"
        description="Pipeline adoption data will appear here once pipelines are generated."
        size="md"
        bordered
      />
    );
  }

  const totalApplications = catalogSummary ? catalogSummary.totalApplications : 0;
  const adoptionRate =
    totalApplications > 0
      ? parseFloat(
          (((pipelineSummary.totalPipelines || 0) / totalApplications) * 100).toFixed(1),
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Pipeline Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GovernanceStatCard
          label="Total Pipelines"
          value={formatNumber(pipelineSummary.totalPipelines)}
          icon={GitBranch}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
        />
        <GovernanceStatCard
          label="Generated"
          value={formatNumber(pipelineSummary.totalGenerated)}
          icon={Code2}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
        <GovernanceStatCard
          label="Success Rate"
          value={formatPercentage(pipelineSummary.successRate)}
          icon={CheckCircle2}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
          trend={pipelineSummary.successRate >= 90 ? 1 : 0}
          trendLabel={pipelineSummary.successRate >= 90 ? 'Healthy' : 'Monitor'}
        />
        <GovernanceStatCard
          label="Adoption Rate"
          value={formatPercentage(adoptionRate)}
          icon={Wrench}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
          description={`${pipelineSummary.totalPipelines || 0} of ${totalApplications} apps`}
        />
      </div>

      {/* Pipeline Runs by Status */}
      {Array.isArray(pipelineSummary.byStatus) && pipelineSummary.byStatus.length > 0 && (
        <Card variant="default" title="Pipeline Runs by Status" icon={Activity}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pipelineSummary.byStatus.map((entry, idx) => ({
                    name: entry.status,
                    value: entry.count,
                    color:
                      entry.status === 'Success'
                        ? '#10b981'
                        : entry.status === 'Failed'
                          ? '#ef4444'
                          : entry.status === 'Running'
                            ? '#3b82f6'
                            : entry.status === 'Pending'
                              ? '#f59e0b'
                              : '#94a3b8',
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pipelineSummary.byStatus.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={
                        entry.status === 'Success'
                          ? '#10b981'
                          : entry.status === 'Failed'
                            ? '#ef4444'
                            : entry.status === 'Running'
                              ? '#3b82f6'
                              : entry.status === 'Pending'
                                ? '#f59e0b'
                                : '#94a3b8'
                      }
                    />
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
      )}

      {/* By Platform */}
      {Array.isArray(pipelineSummary.byPlatform) && pipelineSummary.byPlatform.length > 0 && (
        <Card variant="default" title="Pipelines by Platform" icon={Wrench}>
          <div className="space-y-2">
            {pipelineSummary.byPlatform.map((entry) => (
              <div
                key={entry.platform}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <span className="text-xs text-surface-700 dark:text-surface-300">
                  {entry.platform}
                </span>
                <Badge variant="horizon" size="sm">
                  {entry.count}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Pipeline Runs */}
      {Array.isArray(pipelineSummary.recentRuns) && pipelineSummary.recentRuns.length > 0 && (
        <Card variant="default" title="Recent Pipeline Runs" icon={Clock}>
          <div className="space-y-2">
            {pipelineSummary.recentRuns.map((run) => {
              const statusVariantMap = {
                Success: 'success',
                Failed: 'error',
                Running: 'running',
                Pending: 'pending',
                Cancelled: 'cancelled',
              };
              return (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3 dark:bg-surface-900/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        #{run.buildNumber || 'N/A'}
                      </span>
                      <StatusIndicator
                        status={statusVariantMap[run.status] || 'info'}
                        label={run.status}
                        size="sm"
                      />
                    </div>
                    <p className="text-2xs text-surface-400 dark:text-surface-500">
                      {run.applicationName || 'N/A'} · {run.triggeredBy || 'N/A'}
                    </p>
                  </div>
                  <span className="text-2xs text-surface-400 dark:text-surface-500">
                    {run.startedAt
                      ? formatDate(run.startedAt, { format: 'relative' })
                      : 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

PipelineAdoptionTabContent.propTypes = {
  pipelineSummary: PropTypes.object,
  catalogSummary: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Security scan results tab content.
 */
function SecurityTabContent({ governanceData, kpiData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading security data...
        </span>
      </div>
    );
  }

  const govSummary = governanceData ? governanceData.summary : null;
  const kpiSummary = kpiData ? kpiData.summary : null;

  return (
    <div className="space-y-6">
      {/* Security Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GovernanceStatCard
          label="Security Scan Pass Rate"
          value={formatPercentage(kpiSummary ? kpiSummary.avgSecurityScanPassRate : 0)}
          icon={Shield}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
          trend={
            kpiSummary && kpiSummary.avgSecurityScanPassRate >= 95 ? 1 : 0
          }
          trendLabel={
            kpiSummary && kpiSummary.avgSecurityScanPassRate >= 95
              ? 'Excellent'
              : 'Improving'
          }
        />
        <GovernanceStatCard
          label="Total Vulnerabilities"
          value={formatNumber(kpiSummary ? kpiSummary.totalVulnerabilities : 0)}
          icon={AlertCircle}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-900/30"
        />
        <GovernanceStatCard
          label="Critical Vulnerabilities"
          value={formatNumber(
            kpiSummary ? kpiSummary.totalCriticalVulnerabilities : 0,
          )}
          icon={AlertCircle}
          color={
            kpiSummary && kpiSummary.totalCriticalVulnerabilities > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-green-600 dark:text-green-400'
          }
          bg={
            kpiSummary && kpiSummary.totalCriticalVulnerabilities > 0
              ? 'bg-red-50 dark:bg-red-900/30'
              : 'bg-green-50 dark:bg-green-900/30'
          }
          trend={
            kpiSummary && kpiSummary.totalCriticalVulnerabilities === 0
              ? 1
              : -1
          }
          trendLabel={
            kpiSummary && kpiSummary.totalCriticalVulnerabilities === 0
              ? 'Clear'
              : 'Action needed'
          }
        />
        <GovernanceStatCard
          label="Compliance Score"
          value={formatPercentage(
            kpiSummary ? kpiSummary.avgComplianceScore : 0,
          )}
          icon={ShieldCheck}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
      </div>

      {/* Security Metrics by Application */}
      {kpiData &&
        Array.isArray(kpiData.metrics) &&
        kpiData.metrics.length > 0 && (
          <Card variant="default" title="Security Metrics by Application" icon={Server}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={kpiData.metrics.map((m) => ({
                    name: m.applicationName || 'N/A',
                    scanPassRate: m.metrics
                      ? m.metrics.security_scan_pass_rate || 0
                      : 0,
                    vulnerabilities: m.metrics
                      ? m.metrics.vulnerability_count || 0
                      : 0,
                    codeCoverage: m.metrics
                      ? m.metrics.code_coverage || 0
                      : 0,
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
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
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="scanPassRate"
                    name="Scan Pass Rate %"
                    fill={CHART_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="codeCoverage"
                    name="Code Coverage %"
                    fill={CHART_COLORS[3]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

      {/* Vulnerability Detail by Application */}
      {kpiData &&
        Array.isArray(kpiData.metrics) &&
        kpiData.metrics.length > 0 && (
          <Card variant="default" title="Vulnerability Summary by Application" icon={AlertCircle}>
            <div className="space-y-2">
              {kpiData.metrics.map((m) => {
                const vulnCount = m.metrics
                  ? m.metrics.vulnerability_count || 0
                  : 0;
                const criticalCount = m.metrics
                  ? m.metrics.critical_vulnerability_count || 0
                  : 0;
                const scanRate = m.metrics
                  ? m.metrics.security_scan_pass_rate || 0
                  : 0;

                return (
                  <div
                    key={m.applicationId || m.applicationName}
                    className="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {m.applicationName || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-surface-600 dark:text-surface-300">
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{formatNumber(vulnCount)}</span>
                        <span className="text-2xs text-surface-400 dark:text-surface-500">
                          Vulns
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span
                          className={clsx(
                            'font-medium',
                            criticalCount > 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400',
                          )}
                        >
                          {formatNumber(criticalCount)}
                        </span>
                        <span className="text-2xs text-surface-400 dark:text-surface-500">
                          Critical
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-medium">
                          {formatPercentage(scanRate)}
                        </span>
                        <span className="text-2xs text-surface-400 dark:text-surface-500">
                          Pass Rate
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
    </div>
  );
}

SecurityTabContent.propTypes = {
  governanceData: PropTypes.object,
  kpiData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Audit trail summary tab content.
 */
function AuditTrailTabContent({ auditSummary, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading audit data...
        </span>
      </div>
    );
  }

  if (!auditSummary || Object.keys(auditSummary).length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No audit data available"
        description="Audit trail entries will appear here as actions are performed in the portal."
        size="md"
        bordered
      />
    );
  }

  const totalEntries = Object.values(auditSummary).reduce(
    (sum, count) => sum + count,
    0,
  );

  const sortedActions = Object.entries(auditSummary)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);

  // Get recent audit logs
  const { entries: recentLogs } = getAuditLogs({
    sortOrder: 'desc',
    limit: 10,
  });

  return (
    <div className="space-y-6">
      {/* Audit Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GovernanceStatCard
          label="Total Audit Entries"
          value={formatNumber(totalEntries)}
          icon={Clock}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
        />
        <GovernanceStatCard
          label="Action Types"
          value={formatNumber(sortedActions.length)}
          icon={Activity}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
        <GovernanceStatCard
          label="Compliance Actions"
          value={formatNumber(
            (auditSummary.COMPLIANCE_REVIEW || 0) +
              (auditSummary.COMPLIANCE_ARTIFACT_UPLOAD || 0),
          )}
          icon={ShieldCheck}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
      </div>

      {/* Audit Actions by Type Chart */}
      {sortedActions.length > 0 && (
        <Card variant="default" title="Audit Actions by Type" icon={BarChart3}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedActions.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  type="category"
                  dataKey="action"
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  width={110}
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
                  dataKey="count"
                  name="Count"
                  fill={CHART_COLORS[3]}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Audit Actions List */}
      <Card variant="default" title="Audit Action Summary" icon={Clock}>
        <div className="space-y-2">
          {sortedActions.map((entry) => {
            const percentage =
              totalEntries > 0
                ? parseFloat(((entry.count / totalEntries) * 100).toFixed(1))
                : 0;

            return (
              <div
                key={entry.action}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <span className="truncate text-xs font-medium text-surface-700 dark:text-surface-300">
                  {entry.action}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                    <div
                      className="h-full rounded-full bg-horizon-500"
                      style={{
                        width: `${Math.min(100, percentage)}%`,
                      }}
                    />
                  </div>
                  <span className="min-w-[3rem] text-right text-xs font-medium text-surface-700 dark:text-surface-300">
                    {entry.count} ({percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Audit Logs */}
      {recentLogs.length > 0 && (
        <Card variant="default" title="Recent Audit Log Entries" icon={Clock}>
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">
                      {log.action}
                    </Badge>
                    {log.userId && (
                      <span className="text-2xs text-surface-400 dark:text-surface-500">
                        by {log.userId}
                      </span>
                    )}
                  </div>
                  {log.details && log.details.message && (
                    <p className="mt-0.5 truncate text-2xs text-surface-500 dark:text-surface-400">
                      {log.details.message}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-2xs text-surface-400 dark:text-surface-500">
                  {log.timestamp
                    ? formatDate(log.timestamp, { format: 'relative' })
                    : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

AuditTrailTabContent.propTypes = {
  auditSummary: PropTypes.object,
  loading: PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Governance dashboard component showing compliance status, onboarding progress,
 * pipeline adoption rates, security scan results summary, audit trail summary,
 * and RBAC coverage. Displays governance KPIs with trend indicators.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultTab='overview'] - Default active tab.
 * @param {string} [props.defaultDomain] - Pre-selected domain filter.
 * @param {boolean} [props.showFilterBar=true] - Whether to show the filter bar.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function GovernanceDashboard({
  defaultTab = 'overview',
  defaultDomain,
  showFilterBar = true,
  className,
}) {
  const { currentUser } = useAuth();
  const toast = useToast();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [domainFilter, setDomainFilter] = useState(defaultDomain || '');
  const [timeRange, setTimeRange] = useState('last_6_months');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Data state
  const [governanceData, setGovernanceData] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [onboardingSummary, setOnboardingSummary] = useState(null);
  const [pipelineSummary, setPipelineSummary] = useState(null);
  const [artifactSummary, setArtifactSummary] = useState(null);
  const [auditSummaryData, setAuditSummaryData] = useState(null);
  const [catalogSummary, setCatalogSummary] = useState(null);

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

      const governance = getGovernanceData(filters);
      setGovernanceData(governance);

      const kpi = getKPIData(filters);
      setKpiData(kpi);

      const onboarding = getOnboardingSummary();
      setOnboardingSummary(onboarding);

      const pipelines = getPipelinesSummary();
      setPipelineSummary(pipelines);

      const artifacts = getArtifactSummary(filters);
      setArtifactSummary(artifacts);

      const audit = getAuditSummary();
      setAuditSummaryData(audit);

      const catalog = getCatalogSummary();
      setCatalogSummary(catalog);

      setLastUpdated(new Date().toISOString());
    } catch (_err) {
      console.error('GovernanceDashboard: Failed to fetch data:', _err);
      toast.error('Failed to load governance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [domainFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Tab badges
  // -------------------------------------------------------------------------

  const tabsWithBadges = useMemo(() => {
    return GOVERNANCE_TABS.map((tab) => {
      let badge;
      if (tab.id === 'compliance' && governanceData && governanceData.summary) {
        badge = governanceData.summary.totalArtifacts || undefined;
      } else if (tab.id === 'onboarding' && onboardingSummary) {
        badge = onboardingSummary.totalOnboarded || undefined;
      } else if (tab.id === 'pipelines' && pipelineSummary) {
        badge = pipelineSummary.totalPipelines || undefined;
      } else if (tab.id === 'audit' && auditSummaryData) {
        const total = Object.values(auditSummaryData).reduce(
          (sum, count) => sum + count,
          0,
        );
        badge = total || undefined;
      }
      return { ...tab, badge };
    });
  }, [governanceData, onboardingSummary, pipelineSummary, auditSummaryData]);

  // -------------------------------------------------------------------------
  // Active filter count
  // -------------------------------------------------------------------------

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (domainFilter) count++;
    return count;
  }, [domainFilter]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const handleDomainFilterChange = useCallback((value) => {
    setDomainFilter(value || '');
  }, []);

  const handleTimeRangeChange = useCallback((value) => {
    setTimeRange(value || 'last_6_months');
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
    toast.info('Governance data refreshed.');

    const timer = setTimeout(() => {
      setIsRefreshing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchData, toast]);

  const handleClearFilters = useCallback(() => {
    setDomainFilter('');
  }, []);

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTabContent
            governanceData={governanceData}
            kpiData={kpiData}
            onboardingSummary={onboardingSummary}
            pipelineSummary={pipelineSummary}
            artifactSummary={artifactSummary}
            auditSummary={auditSummaryData}
            catalogSummary={catalogSummary}
            loading={loading}
          />
        );
      case 'compliance':
        return (
          <ComplianceTabContent
            governanceData={governanceData}
            artifactSummary={artifactSummary}
            loading={loading}
          />
        );
      case 'onboarding':
        return (
          <OnboardingTabContent
            onboardingSummary={onboardingSummary}
            catalogSummary={catalogSummary}
            loading={loading}
          />
        );
      case 'pipelines':
        return (
          <PipelineAdoptionTabContent
            pipelineSummary={pipelineSummary}
            catalogSummary={catalogSummary}
            loading={loading}
          />
        );
      case 'security':
        return (
          <SecurityTabContent
            governanceData={governanceData}
            kpiData={kpiData}
            loading={loading}
          />
        );
      case 'audit':
        return (
          <AuditTrailTabContent
            auditSummary={auditSummaryData}
            loading={loading}
          />
        );
      default:
        return (
          <OverviewTabContent
            governanceData={governanceData}
            kpiData={kpiData}
            onboardingSummary={onboardingSummary}
            pipelineSummary={pipelineSummary}
            artifactSummary={artifactSummary}
            auditSummary={auditSummaryData}
            catalogSummary={catalogSummary}
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
          Governance Dashboard
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Comprehensive governance view showing compliance status, onboarding progress,
          pipeline adoption rates, security scan results, audit trail summary, and RBAC coverage
          across the DevSecOps platform.
        </p>
      </div>

      {/* Filter Bar */}
      {showFilterBar && (
        <GovernanceFilterBar
          domainFilter={domainFilter}
          onDomainFilterChange={handleDomainFilterChange}
          domainOptions={domainOptions}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing || loading}
          lastUpdated={lastUpdated}
          onClearFilters={handleClearFilters}
          activeFilterCount={activeFilterCount}
        />
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

GovernanceDashboard.propTypes = {
  defaultTab: PropTypes.oneOf([
    'overview',
    'compliance',
    'onboarding',
    'pipelines',
    'security',
    'audit',
  ]),
  defaultDomain: PropTypes.string,
  showFilterBar: PropTypes.bool,
  className: PropTypes.string,
};