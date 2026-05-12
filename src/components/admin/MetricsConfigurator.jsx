/**
 * Metrics configuration component for Horizon DevSecOps Portal
 * Allows admins to configure which metrics are displayed per domain/application.
 * Shows available metrics with toggle switches, threshold settings, and display order.
 * Saves configuration to localStorage via DashboardDataService.
 * @module components/admin/MetricsConfigurator
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Cpu,
  Filter,
  GitBranch,
  Globe,
  GripVertical,
  Info,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  Wrench,
  X,
  Zap,
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
  getConfigurableMetrics,
  getDashboardConfig,
  saveDashboardConfig,
} from '../../services/DashboardDataService.js';
import { getDomains, getApplications } from '../../services/CatalogService.js';
import { logAction, AUDIT_ACTIONS } from '../../utils/auditLogger.js';
import { KPI_METRICS } from '../../constants/constants.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIGURATOR_TABS = [
  { id: 'metrics', label: 'Metric Toggles', icon: Activity },
  { id: 'thresholds', label: 'Thresholds', icon: ShieldCheck },
  { id: 'order', label: 'Display Order', icon: LayoutDashboard },
];

/**
 * Map metric keys to icon components.
 * @type {Object<string, import('react').ElementType>}
 */
const METRIC_ICONS = {
  [KPI_METRICS.DEPLOYMENT_FREQUENCY]: GitBranch,
  [KPI_METRICS.LEAD_TIME_FOR_CHANGES]: Clock,
  [KPI_METRICS.CHANGE_FAILURE_RATE]: AlertCircle,
  [KPI_METRICS.MEAN_TIME_TO_RECOVERY]: Zap,
  [KPI_METRICS.PIPELINE_SUCCESS_RATE]: CheckCircle2,
  [KPI_METRICS.PIPELINE_DURATION_AVG]: Clock,
  [KPI_METRICS.CODE_COVERAGE]: Code2,
  [KPI_METRICS.VULNERABILITY_COUNT]: Shield,
  [KPI_METRICS.CRITICAL_VULNERABILITY_COUNT]: AlertCircle,
  [KPI_METRICS.OPEN_INCIDENTS]: AlertCircle,
  [KPI_METRICS.MTTR_INCIDENTS]: Zap,
  [KPI_METRICS.SLA_COMPLIANCE]: ShieldCheck,
  [KPI_METRICS.AVAILABILITY]: Globe,
  [KPI_METRICS.ERROR_RATE]: AlertCircle,
  [KPI_METRICS.RESPONSE_TIME_P95]: Activity,
  [KPI_METRICS.SECURITY_SCAN_PASS_RATE]: Shield,
  [KPI_METRICS.COMPLIANCE_SCORE]: ShieldCheck,
  [KPI_METRICS.TECHNICAL_DEBT_HOURS]: Wrench,
  [KPI_METRICS.TOIL_REDUCTION]: TrendingUp,
  [KPI_METRICS.ONBOARDING_TIME]: Server,
};

/**
 * Map metric category to color classes.
 * @type {Object<string, { bg: string, text: string, badge: string }>}
 */
const CATEGORY_COLORS = {
  DORA: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'info',
  },
  Quality: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'purple',
  },
  Security: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    badge: 'danger',
  },
  Operations: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    badge: 'success',
  },
  Performance: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'warning',
  },
  Governance: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    badge: 'info',
  },
  Efficiency: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-600 dark:text-teal-400',
    badge: 'success',
  },
  Other: {
    bg: 'bg-surface-50 dark:bg-surface-900/20',
    text: 'text-surface-600 dark:text-surface-400',
    badge: 'neutral',
  },
};

const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS.Other;

/**
 * Default threshold values for each metric.
 * @type {Object<string, { warning: number, critical: number, unit: string }>}
 */
const DEFAULT_THRESHOLDS = {
  [KPI_METRICS.DEPLOYMENT_FREQUENCY]: { warning: 4, critical: 1, unit: 'deployments/month' },
  [KPI_METRICS.LEAD_TIME_FOR_CHANGES]: { warning: 7, critical: 14, unit: 'days' },
  [KPI_METRICS.CHANGE_FAILURE_RATE]: { warning: 10, critical: 15, unit: '%' },
  [KPI_METRICS.MEAN_TIME_TO_RECOVERY]: { warning: 4, critical: 24, unit: 'hours' },
  [KPI_METRICS.PIPELINE_SUCCESS_RATE]: { warning: 90, critical: 80, unit: '%' },
  [KPI_METRICS.PIPELINE_DURATION_AVG]: { warning: 45, critical: 60, unit: 'minutes' },
  [KPI_METRICS.CODE_COVERAGE]: { warning: 70, critical: 50, unit: '%' },
  [KPI_METRICS.VULNERABILITY_COUNT]: { warning: 20, critical: 50, unit: 'count' },
  [KPI_METRICS.CRITICAL_VULNERABILITY_COUNT]: { warning: 1, critical: 5, unit: 'count' },
  [KPI_METRICS.OPEN_INCIDENTS]: { warning: 5, critical: 10, unit: 'count' },
  [KPI_METRICS.MTTR_INCIDENTS]: { warning: 4, critical: 24, unit: 'hours' },
  [KPI_METRICS.SLA_COMPLIANCE]: { warning: 98, critical: 95, unit: '%' },
  [KPI_METRICS.AVAILABILITY]: { warning: 99.9, critical: 99.5, unit: '%' },
  [KPI_METRICS.ERROR_RATE]: { warning: 1, critical: 5, unit: '%' },
  [KPI_METRICS.RESPONSE_TIME_P95]: { warning: 500, critical: 1000, unit: 'ms' },
  [KPI_METRICS.SECURITY_SCAN_PASS_RATE]: { warning: 90, critical: 80, unit: '%' },
  [KPI_METRICS.COMPLIANCE_SCORE]: { warning: 85, critical: 70, unit: '%' },
  [KPI_METRICS.TECHNICAL_DEBT_HOURS]: { warning: 80, critical: 160, unit: 'hours' },
  [KPI_METRICS.TOIL_REDUCTION]: { warning: 20, critical: 10, unit: '%' },
  [KPI_METRICS.ONBOARDING_TIME]: { warning: 7, critical: 14, unit: 'days' },
};

const THRESHOLD_STORAGE_KEY = 'metrics_thresholds';
const ORDER_STORAGE_KEY = 'metrics_display_order';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getCategoryColor = (category) => CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
const getMetricIcon = (key) => METRIC_ICONS[key] || Activity;

/**
 * Load thresholds from localStorage.
 * @param {string} scopeKey
 * @returns {Object}
 */
const loadThresholds = (scopeKey) => {
  try {
    const raw = localStorage.getItem(`horizon_${THRESHOLD_STORAGE_KEY}_${scopeKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    }
    return {};
  } catch (_err) {
    return {};
  }
};

/**
 * Save thresholds to localStorage.
 * @param {string} scopeKey
 * @param {Object} thresholds
 */
const saveThresholds = (scopeKey, thresholds) => {
  try {
    localStorage.setItem(`horizon_${THRESHOLD_STORAGE_KEY}_${scopeKey}`, JSON.stringify(thresholds));
  } catch (_err) {
    // Silently fail
  }
};

/**
 * Load display order from localStorage.
 * @param {string} scopeKey
 * @returns {string[]}
 */
const loadDisplayOrder = (scopeKey) => {
  try {
    const raw = localStorage.getItem(`horizon_${ORDER_STORAGE_KEY}_${scopeKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (_err) {
    return [];
  }
};

/**
 * Save display order to localStorage.
 * @param {string} scopeKey
 * @param {string[]} order
 */
const saveDisplayOrder = (scopeKey, order) => {
  try {
    localStorage.setItem(`horizon_${ORDER_STORAGE_KEY}_${scopeKey}`, JSON.stringify(order));
  } catch (_err) {
    // Silently fail
  }
};

/**
 * Build a scope key from domain and application filters.
 * @param {string} domain
 * @param {string} application
 * @returns {string}
 */
const buildScopeKey = (domain, application) => {
  if (application) {
    return `app_${application}`;
  }
  if (domain) {
    return `domain_${domain}`;
  }
  return 'default';
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Scope selector for choosing domain/application context.
 */
function ScopeSelector({
  domainFilter,
  onDomainFilterChange,
  domainOptions,
  applicationFilter,
  onApplicationFilterChange,
  applicationOptions,
  onReset,
}) {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-card dark:border-surface-700 dark:bg-surface-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52">
            <Select
              id="metrics-domain-filter"
              placeholder="All Domains (Default)"
              options={domainOptions}
              value={domainFilter}
              onChange={onDomainFilterChange}
              size="sm"
              clearable
              searchable={domainOptions.length > 5}
              searchPlaceholder="Search domains..."
            />
          </div>
          <div className="w-56">
            <Select
              id="metrics-app-filter"
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
          <div className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
            <Info size={12} className="flex-shrink-0" />
            <span>
              {applicationFilter
                ? 'Configuring for specific application'
                : domainFilter
                  ? 'Configuring for domain'
                  : 'Configuring default (all)'}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onReset}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}

ScopeSelector.propTypes = {
  domainFilter: PropTypes.string,
  onDomainFilterChange: PropTypes.func.isRequired,
  domainOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  applicationFilter: PropTypes.string,
  onApplicationFilterChange: PropTypes.func.isRequired,
  applicationOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onReset: PropTypes.func.isRequired,
};

/**
 * Summary statistics bar.
 */
function ConfigSummaryBar({ metrics, enabledCount, totalCount }) {
  const categoryBreakdown = useMemo(() => {
    if (!metrics || !Array.isArray(metrics)) {
      return [];
    }
    const counts = {};
    metrics.forEach((m) => {
      if (m.enabled) {
        const cat = m.category || 'Other';
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [metrics]);

  const stats = [
    {
      label: 'Total Metrics',
      value: totalCount,
      icon: BarChart3,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-900/30',
    },
    {
      label: 'Enabled',
      value: enabledCount,
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Disabled',
      value: totalCount - enabledCount,
      icon: X,
      color: 'text-surface-500 dark:text-surface-400',
      bg: 'bg-surface-50 dark:bg-surface-900/30',
    },
    {
      label: 'Categories',
      value: categoryBreakdown.length,
      icon: Filter,
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

ConfigSummaryBar.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.object),
  enabledCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
};

/**
 * Individual metric toggle card.
 */
function MetricToggleCard({ metric, onToggle, disabled }) {
  const Icon = getMetricIcon(metric.key);
  const categoryColor = getCategoryColor(metric.category);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      onToggle(metric.key);
    }
  }, [metric.key, onToggle, disabled]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        onToggle(metric.key);
      }
    },
    [metric.key, onToggle, disabled],
  );

  return (
    <div
      role="checkbox"
      tabIndex={0}
      aria-checked={metric.enabled}
      aria-label={`Toggle ${metric.displayName}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={clsx(
        'group flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all duration-200',
        disabled && 'pointer-events-none opacity-50',
        metric.enabled
          ? 'border-horizon-500 bg-horizon-50 ring-1 ring-horizon-500/20 dark:border-horizon-500 dark:bg-horizon-900/20'
          : 'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600',
      )}
    >
      {/* Toggle switch */}
      <div
        className={clsx(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all duration-200',
          metric.enabled
            ? 'border-horizon-500 bg-horizon-500 text-white'
            : 'border-surface-300 bg-white dark:border-surface-600 dark:bg-surface-800',
        )}
      >
        {metric.enabled && <CheckCircle2 size={12} />}
      </div>

      {/* Icon */}
      <div
        className={clsx(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
          categoryColor.bg,
        )}
      >
        <Icon size={16} className={categoryColor.text} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
            {metric.displayName}
          </span>
          <Badge variant={categoryColor.badge} size="sm">
            {metric.category}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-2xs text-surface-400 dark:text-surface-500">
          <span className="font-mono">{metric.key}</span>
          {metric.unit && <span>· {metric.unit}</span>}
          {metric.currentValue !== null && metric.currentValue !== undefined && (
            <span>
              · Current:{' '}
              <span className="font-medium text-surface-600 dark:text-surface-300">
                {typeof metric.currentValue === 'number'
                  ? metric.currentValue.toFixed(2)
                  : metric.currentValue}
                {metric.unit ? ` ${metric.unit}` : ''}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

MetricToggleCard.propTypes = {
  metric: PropTypes.shape({
    key: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    unit: PropTypes.string,
    category: PropTypes.string,
    currentValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    enabled: PropTypes.bool,
  }).isRequired,
  onToggle: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Metric toggles tab content grouped by category.
 */
function MetricTogglesContent({
  metrics,
  onToggle,
  onToggleAll,
  onToggleCategory,
  searchQuery,
  onSearchChange,
  onSearchClear,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
  disabled,
}) {
  // Group metrics by category
  const grouped = useMemo(() => {
    if (!metrics || !Array.isArray(metrics)) {
      return [];
    }
    const map = {};
    metrics.forEach((m) => {
      const cat = m.category || 'Other';
      if (!map[cat]) {
        map[cat] = [];
      }
      map[cat].push(m);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [metrics]);

  // Filter metrics
  const filteredGrouped = useMemo(() => {
    let result = grouped;

    if (categoryFilter) {
      result = result.filter(([cat]) => cat === categoryFilter);
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const query = searchQuery.trim().toLowerCase();
      result = result
        .map(([cat, items]) => {
          const filtered = items.filter(
            (m) =>
              m.displayName.toLowerCase().includes(query) ||
              m.key.toLowerCase().includes(query) ||
              (m.category && m.category.toLowerCase().includes(query)),
          );
          return [cat, filtered];
        })
        .filter(([, items]) => items.length > 0);
    }

    return result;
  }, [grouped, categoryFilter, searchQuery]);

  const totalEnabled = useMemo(() => {
    if (!metrics) {
      return 0;
    }
    return metrics.filter((m) => m.enabled).length;
  }, [metrics]);

  const totalMetrics = metrics ? metrics.length : 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
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
              placeholder="Search metrics..."
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

          {/* Category filter */}
          <div className="w-40">
            <Select
              id="metrics-category-filter"
              placeholder="All Categories"
              options={categoryOptions}
              value={categoryFilter}
              onChange={onCategoryFilterChange}
              size="sm"
              clearable
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500 dark:text-surface-400">
            {totalEnabled} / {totalMetrics} enabled
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleAll(true)}
            disabled={disabled || totalEnabled === totalMetrics}
          >
            Enable All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleAll(false)}
            disabled={disabled || totalEnabled === 0}
          >
            Disable All
          </Button>
        </div>
      </div>

      {/* Grouped metrics */}
      {filteredGrouped.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No metrics found"
          description={
            searchQuery || categoryFilter
              ? 'Try adjusting your search or filter criteria.'
              : 'No configurable metrics are available.'
          }
          size="md"
          bordered
        />
      ) : (
        <div className="space-y-6">
          {filteredGrouped.map(([category, items]) => {
            const categoryColor = getCategoryColor(category);
            const enabledInCategory = items.filter((m) => m.enabled).length;

            return (
              <div key={category}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={categoryColor.badge} size="sm">
                      {category}
                    </Badge>
                    <span className="text-xs text-surface-500 dark:text-surface-400">
                      {enabledInCategory} / {items.length} enabled
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleCategory(category, true)}
                      disabled={disabled || enabledInCategory === items.length}
                      className="text-2xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 disabled:opacity-50 dark:text-horizon-400 dark:hover:text-horizon-300"
                    >
                      Enable all
                    </button>
                    <span className="text-2xs text-surface-300 dark:text-surface-600">|</span>
                    <button
                      type="button"
                      onClick={() => onToggleCategory(category, false)}
                      disabled={disabled || enabledInCategory === 0}
                      className="text-2xs font-medium text-surface-500 transition-colors duration-200 hover:text-surface-700 disabled:opacity-50 dark:text-surface-400 dark:hover:text-surface-200"
                    >
                      Disable all
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((metric) => (
                    <MetricToggleCard
                      key={metric.key}
                      metric={metric}
                      onToggle={onToggle}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

MetricTogglesContent.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.object),
  onToggle: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
  onToggleCategory: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  categoryFilter: PropTypes.string,
  onCategoryFilterChange: PropTypes.func.isRequired,
  categoryOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  disabled: PropTypes.bool,
};

/**
 * Threshold configuration row for a single metric.
 */
function ThresholdRow({ metric, thresholds, onThresholdChange, disabled }) {
  const Icon = getMetricIcon(metric.key);
  const categoryColor = getCategoryColor(metric.category);
  const defaults = DEFAULT_THRESHOLDS[metric.key] || { warning: 0, critical: 0, unit: '' };
  const current = thresholds[metric.key] || {};
  const warningValue = current.warning !== undefined ? current.warning : defaults.warning;
  const criticalValue = current.critical !== undefined ? current.critical : defaults.critical;

  const handleWarningChange = useCallback(
    (e) => {
      const val = e.target.value === '' ? '' : Number(e.target.value);
      onThresholdChange(metric.key, 'warning', val);
    },
    [metric.key, onThresholdChange],
  );

  const handleCriticalChange = useCallback(
    (e) => {
      const val = e.target.value === '' ? '' : Number(e.target.value);
      onThresholdChange(metric.key, 'critical', val);
    },
    [metric.key, onThresholdChange],
  );

  if (!metric.enabled) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800">
      <div
        className={clsx(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
          categoryColor.bg,
        )}
      >
        <Icon size={14} className={categoryColor.text} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {metric.displayName}
        </p>
        <p className="text-2xs text-surface-400 dark:text-surface-500">
          {metric.unit || defaults.unit || ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <label
            htmlFor={`threshold-warning-${metric.key}`}
            className="mb-1 text-2xs font-medium text-amber-600 dark:text-amber-400"
          >
            Warning
          </label>
          <input
            id={`threshold-warning-${metric.key}`}
            type="number"
            value={warningValue}
            onChange={handleWarningChange}
            disabled={disabled}
            className="w-20 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-center text-sm text-surface-900 shadow-sm transition-colors duration-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800 dark:bg-amber-900/20 dark:text-surface-100"
          />
        </div>
        <div className="flex flex-col items-center">
          <label
            htmlFor={`threshold-critical-${metric.key}`}
            className="mb-1 text-2xs font-medium text-red-600 dark:text-red-400"
          >
            Critical
          </label>
          <input
            id={`threshold-critical-${metric.key}`}
            type="number"
            value={criticalValue}
            onChange={handleCriticalChange}
            disabled={disabled}
            className="w-20 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-center text-sm text-surface-900 shadow-sm transition-colors duration-200 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-red-800 dark:bg-red-900/20 dark:text-surface-100"
          />
        </div>
      </div>
    </div>
  );
}

ThresholdRow.propTypes = {
  metric: PropTypes.shape({
    key: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    unit: PropTypes.string,
    category: PropTypes.string,
    enabled: PropTypes.bool,
  }).isRequired,
  thresholds: PropTypes.object.isRequired,
  onThresholdChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Thresholds tab content.
 */
function ThresholdsContent({ metrics, thresholds, onThresholdChange, onResetThresholds, disabled }) {
  const enabledMetrics = useMemo(() => {
    if (!metrics || !Array.isArray(metrics)) {
      return [];
    }
    return metrics.filter((m) => m.enabled);
  }, [metrics]);

  if (enabledMetrics.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No enabled metrics"
        description="Enable metrics in the Metric Toggles tab to configure thresholds."
        size="md"
        bordered
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-horizon-500" />
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Configure warning and critical thresholds for each enabled metric. These thresholds
            determine when alerts are triggered on dashboards.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onResetThresholds} disabled={disabled}>
          Reset Thresholds
        </Button>
      </div>

      <div className="space-y-2">
        {enabledMetrics.map((metric) => (
          <ThresholdRow
            key={metric.key}
            metric={metric}
            thresholds={thresholds}
            onThresholdChange={onThresholdChange}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

ThresholdsContent.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.object),
  thresholds: PropTypes.object.isRequired,
  onThresholdChange: PropTypes.func.isRequired,
  onResetThresholds: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Display order item.
 */
function OrderItem({ metric, index, totalCount, onMoveUp, onMoveDown, disabled }) {
  const Icon = getMetricIcon(metric.key);
  const categoryColor = getCategoryColor(metric.category);

  if (!metric.enabled) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800">
      <div className="flex flex-shrink-0 items-center gap-1">
        <GripVertical size={14} className="text-surface-300 dark:text-surface-600" />
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-100 text-2xs font-semibold text-surface-600 dark:bg-surface-800 dark:text-surface-400">
          {index + 1}
        </span>
      </div>
      <div
        className={clsx(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
          categoryColor.bg,
        )}
      >
        <Icon size={14} className={categoryColor.text} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
          {metric.displayName}
        </p>
        <div className="flex items-center gap-1.5">
          <Badge variant={categoryColor.badge} size="sm">
            {metric.category}
          </Badge>
          {metric.unit && (
            <span className="text-2xs text-surface-400 dark:text-surface-500">{metric.unit}</span>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onMoveUp(metric.key)}
          disabled={disabled || index === 0}
          className="flex h-7 w-7 items-center justify-center rounded-md text-surface-400 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300"
          title="Move up"
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(metric.key)}
          disabled={disabled || index === totalCount - 1}
          className="flex h-7 w-7 items-center justify-center rounded-md text-surface-400 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300"
          title="Move down"
        >
          <ArrowDown size={14} />
        </button>
      </div>
    </div>
  );
}

OrderItem.propTypes = {
  metric: PropTypes.shape({
    key: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    unit: PropTypes.string,
    category: PropTypes.string,
    enabled: PropTypes.bool,
  }).isRequired,
  index: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Display order tab content.
 */
function DisplayOrderContent({ metrics, displayOrder, onMoveUp, onMoveDown, onResetOrder, disabled }) {
  const orderedMetrics = useMemo(() => {
    if (!metrics || !Array.isArray(metrics)) {
      return [];
    }

    const enabledMetrics = metrics.filter((m) => m.enabled);

    if (!displayOrder || displayOrder.length === 0) {
      return enabledMetrics;
    }

    // Sort by display order, with unordered metrics at the end
    const orderMap = new Map();
    displayOrder.forEach((key, idx) => {
      orderMap.set(key, idx);
    });

    return [...enabledMetrics].sort((a, b) => {
      const orderA = orderMap.has(a.key) ? orderMap.get(a.key) : 9999;
      const orderB = orderMap.has(b.key) ? orderMap.get(b.key) : 9999;
      return orderA - orderB;
    });
  }, [metrics, displayOrder]);

  if (orderedMetrics.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="No enabled metrics"
        description="Enable metrics in the Metric Toggles tab to configure display order."
        size="md"
        bordered
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-horizon-500" />
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Arrange the display order of metrics on dashboards. Use the arrow buttons to reorder.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onResetOrder} disabled={disabled}>
          Reset Order
        </Button>
      </div>

      <div className="space-y-2">
        {orderedMetrics.map((metric, index) => (
          <OrderItem
            key={metric.key}
            metric={metric}
            index={index}
            totalCount={orderedMetrics.length}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

DisplayOrderContent.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.object),
  displayOrder: PropTypes.arrayOf(PropTypes.string),
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  onResetOrder: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Metrics configuration component allowing admins to configure which metrics
 * are displayed per domain/application. Shows available metrics with toggle
 * switches, threshold settings, and display order. Saves configuration to
 * localStorage via DashboardDataService.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultDomain] - Pre-selected domain filter.
 * @param {string} [props.defaultApplication] - Pre-selected application filter.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function MetricsConfigurator({
  defaultDomain,
  defaultApplication,
  showSummary = true,
  className,
}) {
  const { currentUser, hasPermission } = useAuth();
  const toast = useToast();

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  const canConfigure = hasPermission('manage_settings');

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState('metrics');
  const [domainFilter, setDomainFilter] = useState(defaultDomain || '');
  const [applicationFilter, setApplicationFilter] = useState(defaultApplication || '');
  const [metrics, setMetrics] = useState(null);
  const [thresholds, setThresholds] = useState({});
  const [displayOrder, setDisplayOrder] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // -------------------------------------------------------------------------
  // Scope key
  // -------------------------------------------------------------------------

  const scopeKey = useMemo(() => {
    return buildScopeKey(domainFilter, applicationFilter);
  }, [domainFilter, applicationFilter]);

  // -------------------------------------------------------------------------
  // Catalog data for filters
  // -------------------------------------------------------------------------

  const allDomains = useMemo(() => {
    return getDomains({ sortBy: 'name', sortOrder: 'asc' });
  }, []);

  const domainOptions = useMemo(() => {
    return [
      { value: '', label: 'All Domains (Default)' },
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

  useEffect(() => {
    const filters = {};
    if (domainFilter) {
      filters.domain = domainFilter;
    }
    if (applicationFilter) {
      filters.application = applicationFilter;
    }

    const configurableData = getConfigurableMetrics(filters);

    if (configurableData && Array.isArray(configurableData.availableMetrics)) {
      setMetrics(configurableData.availableMetrics);
    } else {
      setMetrics([]);
    }

    // Load thresholds
    const savedThresholds = loadThresholds(scopeKey);
    setThresholds(savedThresholds);

    // Load display order
    const savedOrder = loadDisplayOrder(scopeKey);
    setDisplayOrder(savedOrder);

    setHasUnsavedChanges(false);
  }, [domainFilter, applicationFilter, scopeKey, refreshKey]);

  // -------------------------------------------------------------------------
  // Category options
  // -------------------------------------------------------------------------

  const categoryOptions = useMemo(() => {
    if (!metrics || !Array.isArray(metrics)) {
      return [{ value: '', label: 'All Categories' }];
    }
    const categories = new Set(metrics.map((m) => m.category || 'Other'));
    return [
      { value: '', label: 'All Categories' },
      ...[...categories].sort().map((c) => ({ value: c, label: c })),
    ];
  }, [metrics]);

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const enabledCount = useMemo(() => {
    if (!metrics || !Array.isArray(metrics)) {
      return 0;
    }
    return metrics.filter((m) => m.enabled).length;
  }, [metrics]);

  const totalCount = metrics ? metrics.length : 0;

  // Tab badges
  const tabsWithBadges = useMemo(() => {
    const enabledMetrics = metrics ? metrics.filter((m) => m.enabled) : [];
    return CONFIGURATOR_TABS.map((tab) => {
      let badge;
      if (tab.id === 'metrics') {
        badge = `${enabledCount}/${totalCount}`;
      } else if (tab.id === 'thresholds') {
        badge = enabledMetrics.length || undefined;
      } else if (tab.id === 'order') {
        badge = enabledMetrics.length || undefined;
      }
      return { ...tab, badge };
    });
  }, [metrics, enabledCount, totalCount]);

  // -------------------------------------------------------------------------
  // Handlers — Tab
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Scope
  // -------------------------------------------------------------------------

  const handleDomainFilterChange = useCallback((value) => {
    setDomainFilter(value || '');
    setApplicationFilter('');
    setHasUnsavedChanges(false);
  }, []);

  const handleApplicationFilterChange = useCallback((value) => {
    setApplicationFilter(value || '');
    setHasUnsavedChanges(false);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Metric Toggles
  // -------------------------------------------------------------------------

  const handleToggleMetric = useCallback((metricKey) => {
    setMetrics((prev) => {
      if (!prev || !Array.isArray(prev)) {
        return prev;
      }
      return prev.map((m) => {
        if (m.key === metricKey) {
          return { ...m, enabled: !m.enabled };
        }
        return m;
      });
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleToggleAll = useCallback((enabled) => {
    setMetrics((prev) => {
      if (!prev || !Array.isArray(prev)) {
        return prev;
      }
      return prev.map((m) => ({ ...m, enabled }));
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleToggleCategory = useCallback((category, enabled) => {
    setMetrics((prev) => {
      if (!prev || !Array.isArray(prev)) {
        return prev;
      }
      return prev.map((m) => {
        if ((m.category || 'Other') === category) {
          return { ...m, enabled };
        }
        return m;
      });
    });
    setHasUnsavedChanges(true);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Search & Filter
  // -------------------------------------------------------------------------

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleCategoryFilterChange = useCallback((value) => {
    setCategoryFilter(value || '');
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Thresholds
  // -------------------------------------------------------------------------

  const handleThresholdChange = useCallback((metricKey, level, value) => {
    setThresholds((prev) => {
      const updated = { ...prev };
      if (!updated[metricKey]) {
        updated[metricKey] = {};
      }
      updated[metricKey] = { ...updated[metricKey], [level]: value };
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleResetThresholds = useCallback(() => {
    setThresholds({});
    setHasUnsavedChanges(true);
    toast.info('Thresholds reset to defaults.');
  }, [toast]);

  // -------------------------------------------------------------------------
  // Handlers — Display Order
  // -------------------------------------------------------------------------

  const handleMoveUp = useCallback(
    (metricKey) => {
      const enabledMetrics = metrics ? metrics.filter((m) => m.enabled) : [];
      const currentOrder =
        displayOrder.length > 0
          ? [...displayOrder]
          : enabledMetrics.map((m) => m.key);

      const index = currentOrder.indexOf(metricKey);
      if (index <= 0) {
        return;
      }

      const newOrder = [...currentOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setDisplayOrder(newOrder);
      setHasUnsavedChanges(true);
    },
    [metrics, displayOrder],
  );

  const handleMoveDown = useCallback(
    (metricKey) => {
      const enabledMetrics = metrics ? metrics.filter((m) => m.enabled) : [];
      const currentOrder =
        displayOrder.length > 0
          ? [...displayOrder]
          : enabledMetrics.map((m) => m.key);

      const index = currentOrder.indexOf(metricKey);
      if (index === -1 || index >= currentOrder.length - 1) {
        return;
      }

      const newOrder = [...currentOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setDisplayOrder(newOrder);
      setHasUnsavedChanges(true);
    },
    [metrics, displayOrder],
  );

  const handleResetOrder = useCallback(() => {
    setDisplayOrder([]);
    setHasUnsavedChanges(true);
    toast.info('Display order reset to default.');
  }, [toast]);

  // -------------------------------------------------------------------------
  // Handlers — Reset All
  // -------------------------------------------------------------------------

  const handleResetAll = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setThresholds({});
    setDisplayOrder([]);
    setHasUnsavedChanges(false);
    toast.info('Configuration reset to defaults.');
  }, [toast]);

  // -------------------------------------------------------------------------
  // Handlers — Save
  // -------------------------------------------------------------------------

  const handleSave = useCallback(() => {
    if (!metrics || !Array.isArray(metrics)) {
      toast.error('No metrics data to save.');
      return;
    }

    setIsSaving(true);

    const timer = setTimeout(() => {
      // Build metrics to display list
      const metricsToDisplay = metrics.filter((m) => m.enabled).map((m) => m.key);

      // Build config options
      const configOptions = {};
      if (domainFilter) {
        configOptions.domain = domainFilter;
      }
      if (applicationFilter) {
        configOptions.application = applicationFilter;
      }
      configOptions.userId = currentUser ? currentUser.id : null;

      // Save metric toggles via DashboardDataService
      const result = saveDashboardConfig(
        { metricsToDisplay },
        configOptions,
      );

      // Save thresholds to localStorage
      saveThresholds(scopeKey, thresholds);

      // Save display order to localStorage
      const enabledOrder =
        displayOrder.length > 0
          ? displayOrder.filter((key) => metricsToDisplay.includes(key))
          : metricsToDisplay;
      saveDisplayOrder(scopeKey, enabledOrder);

      // Log the action
      logAction(
        currentUser ? currentUser.id : null,
        AUDIT_ACTIONS.SETTINGS_UPDATE,
        {
          action: 'metrics_configuration_save',
          scope: scopeKey,
          domain: domainFilter || 'all',
          application: applicationFilter || 'all',
          enabledMetrics: metricsToDisplay.length,
          totalMetrics: metrics.length,
          thresholdCount: Object.keys(thresholds).length,
          hasCustomOrder: displayOrder.length > 0,
        },
      );

      setIsSaving(false);
      setHasUnsavedChanges(false);

      if (result.success) {
        toast.success(
          `Metrics configuration saved for ${applicationFilter || domainFilter || 'default'} scope.`,
          { title: 'Configuration Saved' },
        );
      } else {
        toast.error(result.error || 'Failed to save configuration.');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [metrics, domainFilter, applicationFilter, currentUser, scopeKey, thresholds, displayOrder, toast]);

  // -------------------------------------------------------------------------
  // Unauthorized access
  // -------------------------------------------------------------------------

  if (!canConfigure) {
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
            The Metrics Configurator is only accessible to users with Admin permissions.
          </p>
          <a href="/" className="btn-primary inline-flex">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Metrics Configurator
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Configure which KPI metrics are displayed on dashboards per domain or application.
          Toggle metrics on/off, set warning and critical thresholds, and arrange display order.
          All configurations are saved locally and applied across the portal.
        </p>
      </div>

      {/* Summary Bar */}
      {showSummary && (
        <ConfigSummaryBar
          metrics={metrics}
          enabledCount={enabledCount}
          totalCount={totalCount}
        />
      )}

      {/* Scope Selector */}
      <div className={clsx(showSummary && 'mt-6')}>
        <ScopeSelector
          domainFilter={domainFilter}
          onDomainFilterChange={handleDomainFilterChange}
          domainOptions={domainOptions}
          applicationFilter={applicationFilter}
          onApplicationFilterChange={handleApplicationFilterChange}
          applicationOptions={applicationOptions}
          onReset={handleResetAll}
        />
      </div>

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
      <div className="mt-6">
        {activeTab === 'metrics' && (
          <MetricTogglesContent
            metrics={metrics}
            onToggle={handleToggleMetric}
            onToggleAll={handleToggleAll}
            onToggleCategory={handleToggleCategory}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onSearchClear={handleSearchClear}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={handleCategoryFilterChange}
            categoryOptions={categoryOptions}
            disabled={isSaving}
          />
        )}

        {activeTab === 'thresholds' && (
          <ThresholdsContent
            metrics={metrics}
            thresholds={thresholds}
            onThresholdChange={handleThresholdChange}
            onResetThresholds={handleResetThresholds}
            disabled={isSaving}
          />
        )}

        {activeTab === 'order' && (
          <DisplayOrderContent
            metrics={metrics}
            displayOrder={displayOrder}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onResetOrder={handleResetOrder}
            disabled={isSaving}
          />
        )}
      </div>

      {/* Save Bar */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-surface-200 bg-white p-4 shadow-card dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <>
              <span className="h-2 w-2 animate-pulse-slow rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="text-green-500 dark:text-green-400" />
              <span className="text-xs text-surface-500 dark:text-surface-400">
                Configuration saved
              </span>
            </>
          )}
          <span className="text-2xs text-surface-400 dark:text-surface-500">
            · Scope: {applicationFilter || domainFilter || 'Default (all)'}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={isSaving ? undefined : Save}
          loading={isSaving}
          onClick={handleSave}
          disabled={isSaving || !hasUnsavedChanges}
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {/* Compliance notice */}
      <div className="mt-6 rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-horizon-500" />
          <div>
            <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
              Metrics Configuration Notice
            </p>
            <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
              Metrics configurations are stored locally in the browser and applied across all
              dashboard views. Changes to metric visibility, thresholds, and display order are
              logged in the audit trail. Per-domain and per-application configurations override
              the default configuration. Ensure metric selections align with organizational
              reporting requirements and HIPAA/CMS compliance standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

MetricsConfigurator.propTypes = {
  defaultDomain: PropTypes.string,
  defaultApplication: PropTypes.string,
  showSummary: PropTypes.bool,
  className: PropTypes.string,
};