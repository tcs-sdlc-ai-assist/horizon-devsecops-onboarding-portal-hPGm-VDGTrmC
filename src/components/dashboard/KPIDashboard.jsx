/**
 * KPI/HSMART dashboard component for Horizon DevSecOps Portal
 * Displays DORA metrics (deployment frequency, lead time, change failure rate,
 * MTTR), QE metrics (test coverage, pass rate, automation %), AI adoption %,
 * cost & FinOps metrics, and governance indicators. Uses Recharts for
 * visualizations. All percentages to 2 decimal places. Supports configurable
 * metrics per domain/app.
 * @module components/dashboard/KPIDashboard
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
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Cpu,
  Filter,
  GitBranch,
  Globe,
  Info,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wrench,
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
  getMTTRMetrics,
  getQEMetrics,
  getAIAdoptionMetrics,
  getCostFinOpsMetrics,
  getGovernanceData,
  getConfigurableMetrics,
  getDashboardConfig,
  saveDashboardConfig,
} from '../../services/DashboardDataService.js';
import { getDomains, getApplications } from '../../services/CatalogService.js';
import { formatDate, formatNumber, formatPercentage } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * KPI dashboard tab definitions.
 * @type {Array<Object>}
 */
const KPI_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'dora', label: 'DORA Metrics', icon: TrendingUp },
  { id: 'qe', label: 'Quality Engineering', icon: Code2 },
  { id: 'ai', label: 'AI Adoption', icon: Cpu },
  { id: 'cost', label: 'Cost & FinOps', icon: BarChart3 },
  { id: 'governance', label: 'Governance', icon: ShieldCheck },
];

/**
 * Time range options for the KPI dashboard.
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
  '#1b5ef5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
];

/**
 * DORA classification colors.
 * @type {Object<string, string>}
 */
const DORA_CLASSIFICATION_COLORS = {
  Elite: '#10b981',
  High: '#3b82f6',
  Medium: '#f59e0b',
  Low: '#ef4444',
};

/**
 * DORA classification badge variants.
 * @type {Object<string, string>}
 */
const DORA_CLASSIFICATION_VARIANTS = {
  Elite: 'success',
  High: 'info',
  Medium: 'warning',
  Low: 'danger',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * KPI filter bar component.
 */
function KPIFilterBar({
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
              id="kpi-domain-filter"
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
              id="kpi-app-filter"
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
          <div className="w-44">
            <Select
              id="kpi-time-range"
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

KPIFilterBar.propTypes = {
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
 * Metric stat card component.
 */
function MetricStatCard({ label, value, unit, icon, color, bg, trend, trendLabel, className: extraClassName }) {
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
          {unit && <span className="ml-0.5 text-sm font-normal text-surface-400 dark:text-surface-500">{unit}</span>}
        </p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
          {trend !== null && trend !== undefined && (
            <span
              className={clsx(
                'flex items-center gap-0.5 text-2xs font-medium',
                trend > 0 ? 'text-green-600 dark:text-green-400' : trend < 0 ? 'text-red-600 dark:text-red-400' : 'text-surface-400',
              )}
            >
              {trend > 0 ? <TrendingUp size={10} /> : trend < 0 ? <TrendingDown size={10} /> : null}
              {trendLabel || ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

MetricStatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
  icon: PropTypes.elementType,
  color: PropTypes.string,
  bg: PropTypes.string,
  trend: PropTypes.number,
  trendLabel: PropTypes.string,
  className: PropTypes.string,
};

/**
 * DORA metrics gauge card.
 */
function DORAGaugeCard({ label, value, unit, classification, description }) {
  const variant = DORA_CLASSIFICATION_VARIANTS[classification] || 'neutral';

  return (
    <div className="flex flex-col items-center rounded-xl border border-surface-200 bg-white p-5 shadow-card dark:border-surface-700 dark:bg-surface-800">
      <span className={clsx('text-2xl font-bold', classification === 'Elite' ? 'text-green-600 dark:text-green-400' : classification === 'High' ? 'text-blue-600 dark:text-blue-400' : classification === 'Medium' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
        {value !== null && value !== undefined ? value : 'N/A'}
        {unit && <span className="ml-0.5 text-sm font-normal text-surface-400 dark:text-surface-500">{unit}</span>}
      </span>
      <span className="mt-1 text-xs font-medium text-surface-700 dark:text-surface-300">
        {label}
      </span>
      {classification && (
        <Badge variant={variant} size="sm" className="mt-2">
          {classification}
        </Badge>
      )}
      {description && (
        <p className="mt-1.5 text-center text-2xs text-surface-400 dark:text-surface-500">
          {description}
        </p>
      )}
    </div>
  );
}

DORAGaugeCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
  classification: PropTypes.string,
  description: PropTypes.string,
};

/**
 * Overview tab content.
 */
function OverviewTabContent({ kpiData, doraMetrics, qeMetrics, aiAdoption, costFinOps, governanceData, loading }) {
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
      {/* Top-level KPI stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricStatCard
          label="Deployment Frequency"
          value={formatNumber(summary.avgDeploymentFrequency, { decimals: 2 })}
          unit="/mo"
          icon={GitBranch}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
        />
        <MetricStatCard
          label="Lead Time"
          value={formatNumber(summary.avgLeadTime, { decimals: 2 })}
          unit="days"
          icon={Clock}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
        />
        <MetricStatCard
          label="Change Failure Rate"
          value={formatPercentage(summary.avgChangeFailureRate)}
          icon={AlertCircle}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-900/30"
        />
        <MetricStatCard
          label="MTTR"
          value={formatNumber(summary.avgMTTR, { decimals: 2 })}
          unit="hrs"
          icon={Zap}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
      </div>

      {/* Second row: QE, Security, Availability, Compliance */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricStatCard
          label="Pipeline Success Rate"
          value={formatPercentage(summary.avgPipelineSuccessRate)}
          icon={CheckCircle2}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
        <MetricStatCard
          label="Code Coverage"
          value={formatPercentage(summary.avgCodeCoverage)}
          icon={Code2}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
        <MetricStatCard
          label="Availability"
          value={formatPercentage(summary.avgAvailability)}
          icon={Globe}
          color="text-cyan-600 dark:text-cyan-400"
          bg="bg-cyan-50 dark:bg-cyan-900/30"
        />
        <MetricStatCard
          label="Compliance Score"
          value={formatPercentage(summary.avgComplianceScore)}
          icon={ShieldCheck}
          color="text-indigo-600 dark:text-indigo-400"
          bg="bg-indigo-50 dark:bg-indigo-900/30"
        />
      </div>

      {/* DORA Level */}
      {doraMetrics && doraMetrics.summary && doraMetrics.summary.overallLevel && (
        <Card variant="default" title="DORA Performance Level" icon={TrendingUp}>
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-surface-500 dark:text-surface-400">Overall Level:</span>
            <Badge
              variant={DORA_CLASSIFICATION_VARIANTS[doraMetrics.summary.overallLevel] || 'neutral'}
              size="lg"
              dot
            >
              {doraMetrics.summary.overallLevel}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DORAGaugeCard
              label="Deployment Frequency"
              value={formatNumber(doraMetrics.summary.avgDeploymentFrequency, { decimals: 2 })}
              unit="/mo"
              classification={doraMetrics.classifications ? doraMetrics.classifications.deploymentFrequency : null}
            />
            <DORAGaugeCard
              label="Lead Time"
              value={formatNumber(doraMetrics.summary.avgLeadTimeForChanges, { decimals: 2 })}
              unit="days"
              classification={doraMetrics.classifications ? doraMetrics.classifications.leadTimeForChanges : null}
            />
            <DORAGaugeCard
              label="Change Failure Rate"
              value={formatPercentage(doraMetrics.summary.avgChangeFailureRate)}
              classification={doraMetrics.classifications ? doraMetrics.classifications.changeFailureRate : null}
            />
            <DORAGaugeCard
              label="MTTR"
              value={formatNumber(doraMetrics.summary.avgMeanTimeToRecovery, { decimals: 2 })}
              unit="hrs"
              classification={doraMetrics.classifications ? doraMetrics.classifications.meanTimeToRecovery : null}
            />
          </div>
        </Card>
      )}

      {/* Quick summary row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Security summary */}
        <Card variant="outlined" title="Security" icon={Shield}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">Security Scan Pass Rate</span>
              <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {formatPercentage(summary.avgSecurityScanPassRate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">Total Vulnerabilities</span>
              <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {summary.totalVulnerabilities || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">Critical Vulnerabilities</span>
              <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                {summary.totalCriticalVulnerabilities || 0}
                {summary.totalCriticalVulnerabilities > 0 && (
                  <Badge variant="danger" size="sm" className="ml-1.5">
                    Action Required
                  </Badge>
                )}
              </span>
            </div>
          </div>
        </Card>

        {/* AI Adoption summary */}
        {aiAdoption && aiAdoption.summary && (
          <Card variant="outlined" title="AI Adoption" icon={Cpu}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500 dark:text-surface-400">Toil Reduction</span>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {formatPercentage(aiAdoption.summary.avgToilReduction)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500 dark:text-surface-400">Pipeline Auto-Generation</span>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {formatPercentage(aiAdoption.summary.pipelineAutoGenerationRate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500 dark:text-surface-400">Avg Onboarding Time</span>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {formatNumber(aiAdoption.summary.avgOnboardingTimeDays, { decimals: 1 })} days
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Cost summary */}
        {costFinOps && costFinOps.summary && (
          <Card variant="outlined" title="Cost & FinOps" icon={BarChart3}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500 dark:text-surface-400">Monthly Cost</span>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  ${formatNumber(costFinOps.summary.totalMonthlyCost)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500 dark:text-surface-400">Optimization Potential</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  ${formatNumber(costFinOps.summary.totalOptimizationPotential)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500 dark:text-surface-400">Cost Efficiency</span>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {formatPercentage(costFinOps.summary.costEfficiencyScore)}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Per-Application KPI Table */}
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
                <div className="flex items-center gap-4 text-xs text-surface-600 dark:text-surface-300">
                  {metric.metrics && (
                    <>
                      <span>Deploy: {formatNumber(metric.metrics.deployment_frequency, { decimals: 0 })}/mo</span>
                      <span>Coverage: {formatPercentage(metric.metrics.code_coverage)}</span>
                      <span>Avail: {formatPercentage(metric.metrics.availability)}</span>
                      <span>CFR: {formatPercentage(metric.metrics.change_failure_rate)}</span>
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

OverviewTabContent.propTypes = {
  kpiData: PropTypes.object,
  doraMetrics: PropTypes.object,
  qeMetrics: PropTypes.object,
  aiAdoption: PropTypes.object,
  costFinOps: PropTypes.object,
  governanceData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * DORA metrics tab content with charts.
 */
function DORATabContent({ doraMetrics, kpiData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading DORA metrics...
        </span>
      </div>
    );
  }

  if (!doraMetrics || !doraMetrics.summary) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No DORA data available"
        description="DORA metrics will appear here once data is available."
        size="md"
        bordered
      />
    );
  }

  const { summary, classifications, metrics, trends } = doraMetrics;

  // Build chart data for per-application DORA metrics
  const appChartData = useMemo(() => {
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return [];
    }
    return metrics.map((m) => ({
      name: m.applicationName || 'N/A',
      deployFreq: m.deploymentFrequency || 0,
      leadTime: m.leadTimeForChanges || 0,
      cfr: m.changeFailureRate || 0,
      mttr: m.meanTimeToRecovery || 0,
    }));
  }, [metrics]);

  // Build trend chart data
  const trendChartData = useMemo(() => {
    if (!trends || !Array.isArray(trends) || trends.length === 0) {
      return [];
    }

    const deployTrend = trends.find((t) => t.metric === 'deployment_frequency');
    if (!deployTrend || !Array.isArray(deployTrend.dataPoints)) {
      return [];
    }

    return deployTrend.dataPoints.map((dp) => ({
      period: dp.period,
      value: dp.value,
    }));
  }, [trends]);

  return (
    <div className="space-y-6">
      {/* DORA Level Banner */}
      <div className="flex items-center justify-center gap-4 rounded-xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800">
        <div className="text-center">
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
            Overall DORA Performance Level
          </p>
          <div className="mt-2">
            <Badge
              variant={DORA_CLASSIFICATION_VARIANTS[summary.overallLevel] || 'neutral'}
              size="lg"
              dot
            >
              {summary.overallLevel || 'N/A'}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-surface-400 dark:text-surface-500">
            Based on {summary.applicationCount || 0} application(s)
          </p>
        </div>
      </div>

      {/* DORA Gauge Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DORAGaugeCard
          label="Deployment Frequency"
          value={formatNumber(summary.avgDeploymentFrequency, { decimals: 2 })}
          unit="/mo"
          classification={classifications ? classifications.deploymentFrequency : null}
          description="How often code is deployed to production"
        />
        <DORAGaugeCard
          label="Lead Time for Changes"
          value={formatNumber(summary.avgLeadTimeForChanges, { decimals: 2 })}
          unit="days"
          classification={classifications ? classifications.leadTimeForChanges : null}
          description="Time from commit to production deployment"
        />
        <DORAGaugeCard
          label="Change Failure Rate"
          value={formatPercentage(summary.avgChangeFailureRate)}
          classification={classifications ? classifications.changeFailureRate : null}
          description="Percentage of deployments causing failures"
        />
        <DORAGaugeCard
          label="Mean Time to Recovery"
          value={formatNumber(summary.avgMeanTimeToRecovery, { decimals: 2 })}
          unit="hrs"
          classification={classifications ? classifications.meanTimeToRecovery : null}
          description="Time to restore service after an incident"
        />
      </div>

      {/* Per-Application DORA Chart */}
      {appChartData.length > 0 && (
        <Card variant="default" title="DORA Metrics by Application" icon={Server}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="deployFreq" name="Deploy Freq (/mo)" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="leadTime" name="Lead Time (days)" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cfr" name="CFR (%)" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="mttr" name="MTTR (hrs)" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Deployment Frequency Trend */}
      {trendChartData.length > 0 && (
        <Card variant="default" title="Deployment Frequency Trend" icon={TrendingUp}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="period"
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
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Deployments/month"
                  stroke={CHART_COLORS[0]}
                  fill={CHART_COLORS[0]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Per-Application DORA Detail */}
      {Array.isArray(metrics) && metrics.length > 0 && (
        <Card variant="default" title="DORA Detail by Application" icon={BarChart3}>
          <div className="space-y-2">
            {metrics.map((m) => (
              <div
                key={m.applicationId || m.applicationName}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3 dark:bg-surface-900/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {m.applicationName || 'N/A'}
                  </p>
                  <p className="text-2xs text-surface-400 dark:text-surface-500">
                    {m.period || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-surface-600 dark:text-surface-300">
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{formatNumber(m.deploymentFrequency, { decimals: 0 })}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">Deploy/mo</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{formatNumber(m.leadTimeForChanges, { decimals: 1 })}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">Lead (d)</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{formatPercentage(m.changeFailureRate)}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">CFR</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{formatNumber(m.meanTimeToRecovery, { decimals: 2 })}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">MTTR (h)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

DORATabContent.propTypes = {
  doraMetrics: PropTypes.object,
  kpiData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * QE metrics tab content.
 */
function QETabContent({ qeMetrics, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading QE metrics...
        </span>
      </div>
    );
  }

  if (!qeMetrics || !qeMetrics.summary) {
    return (
      <EmptyState
        icon={Code2}
        title="No QE data available"
        description="Quality Engineering metrics will appear here once data is available."
        size="md"
        bordered
      />
    );
  }

  const { summary, metrics, pipelineRuns } = qeMetrics;

  // Build chart data for per-application QE metrics
  const qeChartData = useMemo(() => {
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return [];
    }
    return metrics.map((m) => ({
      name: m.applicationName || 'N/A',
      coverage: m.codeCoverage || 0,
      pipelineSuccess: m.pipelineSuccessRate || 0,
      securityPass: m.securityScanPassRate || 0,
    }));
  }, [metrics]);

  // Pipeline run status distribution
  const pipelineStatusData = useMemo(() => {
    if (!pipelineRuns || !Array.isArray(pipelineRuns) || pipelineRuns.length === 0) {
      return [];
    }
    const counts = {};
    pipelineRuns.forEach((r) => {
      const key = r.status || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    const colorMap = {
      Success: '#10b981',
      Failed: '#ef4444',
      Running: '#3b82f6',
      Pending: '#f59e0b',
      Cancelled: '#6b7280',
      Skipped: '#9ca3af',
    };
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: colorMap[name] || '#6b7280',
    }));
  }, [pipelineRuns]);

  return (
    <div className="space-y-6">
      {/* QE Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricStatCard
          label="Avg Code Coverage"
          value={formatPercentage(summary.avgCodeCoverage)}
          icon={Code2}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
        <MetricStatCard
          label="Pipeline Success Rate"
          value={formatPercentage(summary.avgPipelineSuccessRate)}
          icon={CheckCircle2}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
        <MetricStatCard
          label="Security Scan Pass Rate"
          value={formatPercentage(summary.avgSecurityScanPassRate)}
          icon={Shield}
          color="text-red-600 dark:text-red-400"
          bg="bg-red-50 dark:bg-red-900/30"
        />
        <MetricStatCard
          label="Total Vulnerabilities"
          value={formatNumber(summary.totalVulnerabilities)}
          icon={AlertCircle}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-900/30"
        />
      </div>

      {/* Second row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricStatCard
          label="Critical Vulnerabilities"
          value={formatNumber(summary.totalCriticalVulnerabilities)}
          icon={AlertCircle}
          color={summary.totalCriticalVulnerabilities > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
          bg={summary.totalCriticalVulnerabilities > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'}
        />
        <MetricStatCard
          label="Avg Pipeline Duration"
          value={formatNumber(summary.avgPipelineDurationMinutes, { decimals: 0 })}
          unit="min"
          icon={Clock}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
        />
        <MetricStatCard
          label="Total Pipeline Runs"
          value={formatNumber(summary.totalPipelineRuns)}
          icon={GitBranch}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
        />
        <MetricStatCard
          label="Avg Technical Debt"
          value={formatNumber(summary.avgTechnicalDebtHours, { decimals: 0 })}
          unit="hrs"
          icon={Wrench}
          color="text-orange-600 dark:text-orange-400"
          bg="bg-orange-50 dark:bg-orange-900/30"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* QE Metrics by Application */}
        {qeChartData.length > 0 && (
          <Card variant="default" title="QE Metrics by Application" icon={Code2}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qeChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                    domain={[0, 100]}
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
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="coverage" name="Code Coverage %" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pipelineSuccess" name="Pipeline Success %" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="securityPass" name="Security Pass %" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Pipeline Run Status Distribution */}
        {pipelineStatusData.length > 0 && (
          <Card variant="default" title="Pipeline Run Status" icon={GitBranch}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pipelineStatusData.map((entry, index) => (
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
        )}
      </div>

      {/* Per-Application QE Detail */}
      {Array.isArray(metrics) && metrics.length > 0 && (
        <Card variant="default" title="QE Detail by Application" icon={Server}>
          <div className="space-y-2">
            {metrics.map((m) => (
              <div
                key={m.applicationId || m.applicationName}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3 dark:bg-surface-900/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {m.applicationName || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-surface-600 dark:text-surface-300">
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{formatPercentage(m.codeCoverage)}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">Coverage</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{formatPercentage(m.pipelineSuccessRate)}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">Pipeline</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{formatPercentage(m.securityScanPassRate)}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">Security</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{formatNumber(m.vulnerabilityCount)}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">Vulns</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{formatNumber(m.technicalDebtHours, { decimals: 0 })}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">Debt (h)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

QETabContent.propTypes = {
  qeMetrics: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * AI Adoption tab content.
 */
function AIAdoptionTabContent({ aiAdoption, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-horizon-500" />
        <span className="ml-2 text-sm text-surface-500 dark:text-surface-400">
          Loading AI adoption metrics...
        </span>
      </div>
    );
  }

  if (!aiAdoption || !aiAdoption.summary) {
    return (
      <EmptyState
        icon={Cpu}
        title="No AI adoption data available"
        description="AI adoption metrics will appear here once data is available."
        size="md"
        bordered
      />
    );
  }

  const { summary, metrics } = aiAdoption;

  // Build radar chart data
  const radarData = useMemo(() => {
    return [
      { metric: 'Toil Reduction', value: summary.avgToilReduction || 0, fullMark: 100 },
      { metric: 'Pipeline Auto-Gen', value: summary.pipelineAutoGenerationRate || 0, fullMark: 100 },
      { metric: 'AI Remediation', value: summary.aiAssistedRemediationRate || 0, fullMark: 100 },
      { metric: 'Predictive Alerts', value: summary.predictiveAlertAccuracy || 0, fullMark: 100 },
      { metric: 'ChatOps Adoption', value: summary.chatOpsAdoptionRate || 0, fullMark: 100 },
    ];
  }, [summary]);

  // Build per-app chart data
  const appChartData = useMemo(() => {
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return [];
    }
    return metrics.map((m) => ({
      name: m.applicationName || 'N/A',
      toilReduction: m.toilReduction || 0,
      automationScore: m.automationScore || 0,
      onboardingTime: m.onboardingTime || 0,
    }));
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* AI Adoption Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricStatCard
          label="Avg Toil Reduction"
          value={formatPercentage(summary.avgToilReduction)}
          icon={Zap}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
        <MetricStatCard
          label="Pipeline Auto-Generation"
          value={formatPercentage(summary.pipelineAutoGenerationRate)}
          icon={GitBranch}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
        />
        <MetricStatCard
          label="AI-Assisted Remediation"
          value={formatPercentage(summary.aiAssistedRemediationRate)}
          icon={Cpu}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
        <MetricStatCard
          label="Avg Onboarding Time"
          value={formatNumber(summary.avgOnboardingTimeDays, { decimals: 1 })}
          unit="days"
          icon={Clock}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
        />
      </div>

      {/* Second row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricStatCard
          label="Predictive Alert Accuracy"
          value={formatPercentage(summary.predictiveAlertAccuracy)}
          icon={Activity}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-900/30"
        />
        <MetricStatCard
          label="ChatOps Adoption"
          value={formatPercentage(summary.chatOpsAdoptionRate)}
          icon={Settings}
          color="text-teal-600 dark:text-teal-400"
          bg="bg-teal-50 dark:bg-teal-900/30"
        />
        <MetricStatCard
          label="Avg Automation Score"
          value={formatPercentage(summary.avgAutomationScore)}
          icon={Wrench}
          color="text-indigo-600 dark:text-indigo-400"
          bg="bg-indigo-50 dark:bg-indigo-900/30"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Radar Chart */}
        <Card variant="default" title="AI Adoption Radar" icon={Cpu}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                />
                <Radar
                  name="Adoption %"
                  dataKey="value"
                  stroke={CHART_COLORS[4]}
                  fill={CHART_COLORS[4]}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Per-App Automation Score */}
        {appChartData.length > 0 && (
          <Card variant="default" title="Automation Score by Application" icon={Server}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                  <Bar dataKey="toilReduction" name="Toil Reduction %" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="automationScore" name="Automation Score" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

AIAdoptionTabContent.propTypes = {
  aiAdoption: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Cost & FinOps tab content.
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

  const { summary, costByDomain, costByApplication, costTrends } = costFinOps;

  // Build cost trend chart data
  const trendChartData = useMemo(() => {
    if (!costTrends || !Array.isArray(costTrends) || costTrends.length === 0) {
      return [];
    }
    return costTrends.map((t) => ({
      period: t.period,
      total: t.totalCost || 0,
      compute: t.computeCost || 0,
      storage: t.storageCost || 0,
      network: t.networkCost || 0,
    }));
  }, [costTrends]);

  // Build domain cost pie chart data
  const domainPieData = useMemo(() => {
    if (!costByDomain || !Array.isArray(costByDomain) || costByDomain.length === 0) {
      return [];
    }
    return costByDomain.map((d, idx) => ({
      name: d.domainName || 'Unknown',
      value: d.totalCost || 0,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [costByDomain]);

  return (
    <div className="space-y-6">
      {/* Cost Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricStatCard
          label="Monthly Cost"
          value={`$${formatNumber(summary.totalMonthlyCost)}`}
          icon={BarChart3}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
        />
        <MetricStatCard
          label="Annual Cost"
          value={`$${formatNumber(summary.totalAnnualCost)}`}
          icon={BarChart3}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
        />
        <MetricStatCard
          label="Optimization Potential"
          value={`$${formatNumber(summary.totalOptimizationPotential)}`}
          icon={TrendingDown}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
        <MetricStatCard
          label="Cost Efficiency"
          value={formatPercentage(summary.costEfficiencyScore)}
          icon={CheckCircle2}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Cost Trend */}
        {trendChartData.length > 0 && (
          <Card variant="default" title="Cost Trend" icon={TrendingUp}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value) => [`$${formatNumber(value)}`, undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="compute" name="Compute" stackId="1" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="storage" name="Storage" stackId="1" stroke={CHART_COLORS[4]} fill={CHART_COLORS[4]} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="network" name="Network" stackId="1" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Cost by Domain */}
        {domainPieData.length > 0 && (
          <Card variant="default" title="Cost by Domain" icon={Building2}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={domainPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {domainPieData.map((entry, index) => (
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
                    formatter={(value) => [`$${formatNumber(value)}/mo`, undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Cost by Application */}
      {Array.isArray(costByApplication) && costByApplication.length > 0 && (
        <Card variant="default" title="Cost by Application" icon={Server}>
          <div className="space-y-2">
            {costByApplication.map((entry) => (
              <div
                key={entry.applicationId || entry.applicationName}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3 dark:bg-surface-900/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {entry.applicationName || 'N/A'}
                  </p>
                  <p className="text-2xs text-surface-400 dark:text-surface-500">
                    {entry.domainName || 'N/A'} · {entry.criticalityTier || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-surface-600 dark:text-surface-300">
                  <div className="flex flex-col items-center">
                    <span className="font-medium">${formatNumber(entry.monthlyCost)}</span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">Monthly</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      ${formatNumber(entry.optimizationPotential)}
                    </span>
                    <span className="text-2xs text-surface-400 dark:text-surface-500">Savings</span>
                  </div>
                </div>
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

/**
 * Governance tab content.
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
        description="Governance and compliance data will appear here once artifacts are generated."
        size="md"
        bordered
      />
    );
  }

  const { summary, complianceByApplication, complianceByStatus } = governanceData;

  return (
    <div className="space-y-6">
      {/* Governance Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricStatCard
          label="Total Artifacts"
          value={formatNumber(summary.totalArtifacts)}
          icon={ShieldCheck}
          color="text-horizon-600 dark:text-horizon-400"
          bg="bg-horizon-50 dark:bg-horizon-900/30"
        />
        <MetricStatCard
          label="Compliance Rate"
          value={formatPercentage(summary.overallComplianceRate)}
          icon={CheckCircle2}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/30"
        />
        <MetricStatCard
          label="Critical Findings"
          value={formatNumber(summary.criticalFindings)}
          icon={AlertCircle}
          color={summary.criticalFindings > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
          bg={summary.criticalFindings > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'}
        />
        <MetricStatCard
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
                        style={{ width: `${Math.min(100, entry.percentage || 0)}%` }}
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

GovernanceTabContent.propTypes = {
  governanceData: PropTypes.object,
  loading: PropTypes.bool,
};

/**
 * Configurable metrics panel.
 */
function ConfigurableMetricsPanel({ configurableMetrics, onToggleMetric, onSave, isSaving }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (!configurableMetrics || !Array.isArray(configurableMetrics.availableMetrics)) {
    return null;
  }

  const { availableMetrics, configuredMetrics } = configurableMetrics;

  // Group by category
  const grouped = useMemo(() => {
    const map = {};
    availableMetrics.forEach((m) => {
      const cat = m.category || 'Other';
      if (!map[cat]) {
        map[cat] = [];
      }
      map[cat].push(m);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [availableMetrics]);

  const enabledCount = availableMetrics.filter((m) => m.enabled).length;

  return (
    <div className="rounded-xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-50 dark:hover:bg-surface-700/50"
      >
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-horizon-500" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Configurable Metrics
          </h4>
          <Badge variant="horizon" size="sm">
            {enabledCount} / {availableMetrics.length}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-surface-400 dark:text-surface-500" />
        ) : (
          <ChevronDown size={16} className="text-surface-400 dark:text-surface-500" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-surface-200 px-4 py-4 dark:border-surface-700">
          <div className="space-y-4">
            {grouped.map(([category, categoryMetrics]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold text-surface-600 dark:text-surface-400">
                  {category}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryMetrics.map((metric) => (
                    <button
                      key={metric.key}
                      type="button"
                      onClick={() => onToggleMetric(metric.key)}
                      className={clsx(
                        'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-xs transition-all duration-200',
                        metric.enabled
                          ? 'border-horizon-500 bg-horizon-50 text-horizon-700 dark:border-horizon-500 dark:bg-horizon-900/20 dark:text-horizon-300'
                          : 'border-surface-200 bg-white text-surface-600 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:border-surface-600',
                      )}
                    >
                      <div
                        className={clsx(
                          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors duration-200',
                          metric.enabled
                            ? 'border-horizon-500 bg-horizon-500 text-white'
                            : 'border-surface-300 bg-white dark:border-surface-600 dark:bg-surface-800',
                        )}
                      >
                        {metric.enabled && <CheckCircle2 size={10} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{metric.displayName}</span>
                        {metric.currentValue !== null && metric.currentValue !== undefined && (
                          <span className="ml-1 text-2xs text-surface-400 dark:text-surface-500">
                            ({typeof metric.currentValue === 'number' ? formatNumber(metric.currentValue, { decimals: 2 }) : metric.currentValue}{metric.unit ? ` ${metric.unit}` : ''})
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={isSaving ? undefined : CheckCircle2}
              loading={isSaving}
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

ConfigurableMetricsPanel.propTypes = {
  configurableMetrics: PropTypes.object,
  onToggleMetric: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * KPI/HSMART dashboard component displaying DORA metrics, QE metrics,
 * AI adoption %, cost & FinOps metrics, and governance indicators.
 * Uses Recharts for visualizations. All percentages to 2 decimal places.
 * Supports configurable metrics per domain/app.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultTab='overview'] - Default active tab.
 * @param {string} [props.defaultDomain] - Pre-selected domain filter.
 * @param {string} [props.defaultApplication] - Pre-selected application filter.
 * @param {boolean} [props.showConfigurableMetrics=true] - Whether to show the configurable metrics panel.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function KPIDashboard({
  defaultTab = 'overview',
  defaultDomain,
  defaultApplication,
  showConfigurableMetrics = true,
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
  const [timeRange, setTimeRange] = useState('last_6_months');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Data state
  const [kpiData, setKpiData] = useState(null);
  const [doraMetrics, setDoraMetrics] = useState(null);
  const [qeMetrics, setQeMetrics] = useState(null);
  const [aiAdoption, setAiAdoption] = useState(null);
  const [costFinOps, setCostFinOps] = useState(null);
  const [governanceData, setGovernanceData] = useState(null);
  const [configurableMetrics, setConfigurableMetrics] = useState(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

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

      const kpi = getKPIData(filters);
      setKpiData(kpi);

      const dora = getDORAMetrics(filters);
      setDoraMetrics(dora);

      const qe = getQEMetrics(filters);
      setQeMetrics(qe);

      const ai = getAIAdoptionMetrics(filters);
      setAiAdoption(ai);

      const cost = getCostFinOpsMetrics(filters);
      setCostFinOps(cost);

      const governance = getGovernanceData(filters);
      setGovernanceData(governance);

      const configMetrics = getConfigurableMetrics(filters);
      setConfigurableMetrics(configMetrics);

      setLastUpdated(new Date().toISOString());
    } catch (_err) {
      console.error('KPIDashboard: Failed to fetch KPI data:', _err);
      toast.error('Failed to load KPI data. Please try again.');
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
    return KPI_TABS.map((tab) => {
      let badge;
      if (tab.id === 'dora' && doraMetrics && doraMetrics.summary) {
        badge = doraMetrics.summary.applicationCount || undefined;
      } else if (tab.id === 'qe' && qeMetrics && qeMetrics.summary) {
        badge = qeMetrics.summary.applicationCount || undefined;
      } else if (tab.id === 'governance' && governanceData && governanceData.summary) {
        badge = governanceData.summary.totalArtifacts || undefined;
      }
      return { ...tab, badge };
    });
  }, [doraMetrics, qeMetrics, governanceData]);

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
    setTimeRange(value || 'last_6_months');
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
    toast.info('KPI data refreshed.');

    const timer = setTimeout(() => {
      setIsRefreshing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchData, toast]);

  const handleClearFilters = useCallback(() => {
    setDomainFilter('');
    setApplicationFilter('');
  }, []);

  const handleToggleMetric = useCallback((metricKey) => {
    setConfigurableMetrics((prev) => {
      if (!prev || !Array.isArray(prev.availableMetrics)) {
        return prev;
      }

      const updatedMetrics = prev.availableMetrics.map((m) => {
        if (m.key === metricKey) {
          return { ...m, enabled: !m.enabled };
        }
        return m;
      });

      const updatedConfigured = updatedMetrics
        .filter((m) => m.enabled)
        .map((m) => m.key);

      return {
        ...prev,
        availableMetrics: updatedMetrics,
        configuredMetrics: updatedConfigured,
      };
    });
  }, []);

  const handleSaveConfig = useCallback(() => {
    if (!configurableMetrics) {
      return;
    }

    setIsSavingConfig(true);

    const timer = setTimeout(() => {
      const metricsToDisplay = configurableMetrics.availableMetrics
        .filter((m) => m.enabled)
        .map((m) => m.key);

      const configOptions = {};
      if (domainFilter) {
        configOptions.domain = domainFilter;
      }
      if (applicationFilter) {
        configOptions.application = applicationFilter;
      }
      configOptions.userId = currentUser ? currentUser.id : null;

      const result = saveDashboardConfig(
        { metricsToDisplay },
        configOptions,
      );

      setIsSavingConfig(false);

      if (result.success) {
        toast.success('Dashboard configuration saved.');
      } else {
        toast.error(result.error || 'Failed to save configuration.');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [configurableMetrics, domainFilter, applicationFilter, currentUser, toast]);

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTabContent
            kpiData={kpiData}
            doraMetrics={doraMetrics}
            qeMetrics={qeMetrics}
            aiAdoption={aiAdoption}
            costFinOps={costFinOps}
            governanceData={governanceData}
            loading={loading}
          />
        );
      case 'dora':
        return (
          <DORATabContent
            doraMetrics={doraMetrics}
            kpiData={kpiData}
            loading={loading}
          />
        );
      case 'qe':
        return <QETabContent qeMetrics={qeMetrics} loading={loading} />;
      case 'ai':
        return <AIAdoptionTabContent aiAdoption={aiAdoption} loading={loading} />;
      case 'cost':
        return <CostTabContent costFinOps={costFinOps} loading={loading} />;
      case 'governance':
        return <GovernanceTabContent governanceData={governanceData} loading={loading} />;
      default:
        return (
          <OverviewTabContent
            kpiData={kpiData}
            doraMetrics={doraMetrics}
            qeMetrics={qeMetrics}
            aiAdoption={aiAdoption}
            costFinOps={costFinOps}
            governanceData={governanceData}
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
          KPI Dashboard (HSMART)
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Comprehensive KPI dashboard with DORA metrics, Quality Engineering indicators,
          AI adoption tracking, Cost &amp; FinOps analytics, and governance compliance status.
          All percentages displayed to 2 decimal places.
        </p>
      </div>

      {/* Filter Bar */}
      <KPIFilterBar
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

      {/* Configurable Metrics Panel */}
      {showConfigurableMetrics && configurableMetrics && (
        <div className="mt-4">
          <ConfigurableMetricsPanel
            configurableMetrics={configurableMetrics}
            onToggleMetric={handleToggleMetric}
            onSave={handleSaveConfig}
            isSaving={isSavingConfig}
          />
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

KPIDashboard.propTypes = {
  defaultTab: PropTypes.oneOf(['overview', 'dora', 'qe', 'ai', 'cost', 'governance']),
  defaultDomain: PropTypes.string,
  defaultApplication: PropTypes.string,
  showConfigurableMetrics: PropTypes.bool,
  className: PropTypes.string,
};