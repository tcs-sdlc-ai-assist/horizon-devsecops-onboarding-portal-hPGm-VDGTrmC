/**
 * Reusable metric display card component for Horizon DevSecOps Portal
 * Displays a single KPI with title, value, unit, trend arrow (up/down),
 * trend percentage, sparkline chart (Recharts), and comparison period.
 * Used across all dashboard views.
 * @module components/dashboard/MetricCard
 */

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each metric card variant.
 * @type {Object<string, { iconBg: string, iconText: string }>}
 */
const VARIANT_STYLES = {
  default: {
    iconBg: 'bg-horizon-50 dark:bg-horizon-900/30',
    iconText: 'text-horizon-600 dark:text-horizon-400',
  },
  success: {
    iconBg: 'bg-green-50 dark:bg-green-900/30',
    iconText: 'text-green-600 dark:text-green-400',
  },
  warning: {
    iconBg: 'bg-amber-50 dark:bg-amber-900/30',
    iconText: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    iconBg: 'bg-red-50 dark:bg-red-900/30',
    iconText: 'text-red-600 dark:text-red-400',
  },
  info: {
    iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    iconText: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    iconBg: 'bg-purple-50 dark:bg-purple-900/30',
    iconText: 'text-purple-600 dark:text-purple-400',
  },
  cyan: {
    iconBg: 'bg-cyan-50 dark:bg-cyan-900/30',
    iconText: 'text-cyan-600 dark:text-cyan-400',
  },
  indigo: {
    iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
    iconText: 'text-indigo-600 dark:text-indigo-400',
  },
};

// ---------------------------------------------------------------------------
// Sparkline Colors
// ---------------------------------------------------------------------------

/**
 * Sparkline stroke and fill colors based on trend direction.
 * @type {Object<string, { stroke: string, fill: string }>}
 */
const SPARKLINE_COLORS = {
  up: { stroke: '#10b981', fill: '#10b981' },
  down: { stroke: '#ef4444', fill: '#ef4444' },
  neutral: { stroke: '#64748b', fill: '#64748b' },
};

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each metric card size.
 * @type {Object<string, { container: string, value: string, title: string, unit: string, trend: string, iconWrapper: string, iconSize: number, sparklineHeight: number }>}
 */
const SIZE_CONFIG = {
  sm: {
    container: 'p-4',
    value: 'text-xl',
    title: 'text-xs',
    unit: 'text-xs',
    trend: 'text-2xs',
    iconWrapper: 'h-8 w-8',
    iconSize: 16,
    sparklineHeight: 32,
  },
  md: {
    container: 'p-5',
    value: 'text-2xl',
    title: 'text-xs',
    unit: 'text-sm',
    trend: 'text-xs',
    iconWrapper: 'h-10 w-10',
    iconSize: 20,
    sparklineHeight: 40,
  },
  lg: {
    container: 'p-6',
    value: 'text-3xl',
    title: 'text-sm',
    unit: 'text-sm',
    trend: 'text-xs',
    iconWrapper: 'h-12 w-12',
    iconSize: 24,
    sparklineHeight: 48,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the trend direction from a numeric value.
 * @param {number|null|undefined} trendValue
 * @returns {'up'|'down'|'neutral'}
 */
const resolveTrendDirection = (trendValue) => {
  if (trendValue === null || trendValue === undefined || typeof trendValue !== 'number' || Number.isNaN(trendValue)) {
    return 'neutral';
  }
  if (trendValue > 0) {
    return 'up';
  }
  if (trendValue < 0) {
    return 'down';
  }
  return 'neutral';
};

/**
 * Format a trend percentage value for display.
 * @param {number|null|undefined} value
 * @returns {string}
 */
const formatTrendPercentage = (value) => {
  if (value === null || value === undefined || typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }
  const abs = Math.abs(value);
  const formatted = abs.toFixed(1);
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${prefix}${formatted}%`;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Trend indicator showing direction arrow and percentage.
 */
function TrendIndicator({ trendValue, trendLabel, trendDirection: directionOverride, invertTrend, size }) {
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  const direction = directionOverride || resolveTrendDirection(trendValue);

  // Determine if the trend is positive or negative for coloring.
  // invertTrend flips the color logic (e.g. for error rate, lower is better).
  const isPositive = invertTrend
    ? direction === 'down'
    : direction === 'up';

  const isNegative = invertTrend
    ? direction === 'up'
    : direction === 'down';

  const colorClass = isPositive
    ? 'text-green-600 dark:text-green-400'
    : isNegative
      ? 'text-red-600 dark:text-red-400'
      : 'text-surface-400 dark:text-surface-500';

  const TrendIcon = direction === 'up'
    ? TrendingUp
    : direction === 'down'
      ? TrendingDown
      : Minus;

  const trendIconSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;

  const displayValue = trendValue !== null && trendValue !== undefined && typeof trendValue === 'number' && !Number.isNaN(trendValue)
    ? formatTrendPercentage(trendValue)
    : null;

  if (!displayValue && !trendLabel) {
    return null;
  }

  return (
    <div className={clsx('flex items-center gap-1', sizeConfig.trend, colorClass)}>
      <TrendIcon size={trendIconSize} className="flex-shrink-0" />
      {displayValue && (
        <span className="font-medium">{displayValue}</span>
      )}
      {trendLabel && (
        <span className="text-surface-400 dark:text-surface-500">{trendLabel}</span>
      )}
    </div>
  );
}

TrendIndicator.propTypes = {
  trendValue: PropTypes.number,
  trendLabel: PropTypes.string,
  trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
  invertTrend: PropTypes.bool,
  size: PropTypes.string.isRequired,
};

/**
 * Sparkline mini chart using Recharts AreaChart.
 */
function Sparkline({ data, height, trendDirection, invertTrend }) {
  const direction = trendDirection || 'neutral';

  // Determine sparkline color based on trend direction and inversion
  const colorKey = invertTrend
    ? direction === 'down'
      ? 'up'
      : direction === 'up'
        ? 'down'
        : 'neutral'
    : direction;

  const colors = SPARKLINE_COLORS[colorKey] || SPARKLINE_COLORS.neutral;

  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map((point, index) => {
      if (typeof point === 'number') {
        return { index, value: point };
      }
      if (point && typeof point === 'object') {
        return {
          index,
          value: typeof point.value === 'number' ? point.value : typeof point.y === 'number' ? point.y : 0,
          label: point.label || point.period || point.x || undefined,
        };
      }
      return { index, value: 0 };
    });
  }, [data]);

  if (chartData.length < 2) {
    return null;
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparkline-gradient-${colorKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.fill} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors.fill} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '11px',
              padding: '4px 8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : value, '']}
            labelFormatter={(label, payload) => {
              if (payload && payload.length > 0 && payload[0].payload && payload[0].payload.label) {
                return payload[0].payload.label;
              }
              return '';
            }}
            cursor={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={1.5}
            fill={`url(#sparkline-gradient-${colorKey})`}
            dot={false}
            activeDot={{ r: 2, strokeWidth: 0, fill: colors.stroke }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

Sparkline.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.shape({
        value: PropTypes.number,
        y: PropTypes.number,
        label: PropTypes.string,
        period: PropTypes.string,
        x: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    ]),
  ),
  height: PropTypes.number.isRequired,
  trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
  invertTrend: PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable metric display card component for KPI dashboards.
 * Displays a single metric with title, value, unit, trend arrow,
 * trend percentage, sparkline chart, and comparison period.
 *
 * @param {Object} props
 * @param {string} props.title - The metric title/label.
 * @param {string|number} [props.value] - The metric value to display.
 * @param {string} [props.unit] - Unit label displayed after the value (e.g. '%', 'ms', '/mo').
 * @param {import('react').ElementType} [props.icon] - Optional Lucide icon component rendered in the header.
 * @param {'default'|'success'|'warning'|'danger'|'info'|'purple'|'cyan'|'indigo'} [props.variant='default'] - Color variant for the icon area.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Card size.
 * @param {number} [props.trendValue] - Trend percentage value (positive = up, negative = down, 0 = neutral).
 * @param {string} [props.trendLabel] - Short label displayed next to the trend (e.g. 'vs last month').
 * @param {'up'|'down'|'neutral'} [props.trendDirection] - Override the auto-detected trend direction.
 * @param {boolean} [props.invertTrend=false] - When true, a downward trend is colored green (good) and upward is red (bad). Useful for metrics like error rate.
 * @param {Array<number|Object>} [props.sparklineData] - Data points for the sparkline chart. Each entry can be a number or `{ value: number, label?: string }`.
 * @param {string} [props.comparisonPeriod] - Comparison period text (e.g. 'vs last 30 days').
 * @param {string} [props.description] - Optional description text displayed below the value.
 * @param {boolean} [props.loading=false] - When true, shows a skeleton loading state.
 * @param {Function} [props.onClick] - Optional click handler for the card.
 * @param {string} [props.className] - Additional CSS classes to merge onto the outer container.
 * @returns {import('react').ReactElement}
 */
export default function MetricCard({
  title,
  value,
  unit,
  icon,
  variant = 'default',
  size = 'md',
  trendValue,
  trendLabel,
  trendDirection: trendDirectionProp,
  invertTrend = false,
  sparklineData,
  comparisonPeriod,
  description,
  loading = false,
  onClick,
  className,
}) {
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const Icon = icon || null;

  const resolvedDirection = trendDirectionProp || resolveTrendDirection(trendValue);

  const hasSparkline = Array.isArray(sparklineData) && sparklineData.length >= 2;
  const hasTrend = (trendValue !== null && trendValue !== undefined && typeof trendValue === 'number' && !Number.isNaN(trendValue)) || trendLabel;
  const hasComparisonPeriod = comparisonPeriod && typeof comparisonPeriod === 'string' && comparisonPeriod.trim().length > 0;
  const hasDescription = description && typeof description === 'string' && description.trim().length > 0;
  const isClickable = typeof onClick === 'function';

  // Loading skeleton
  if (loading) {
    return (
      <div
        className={clsx(
          'rounded-xl border border-surface-200 bg-white shadow-card dark:border-surface-700 dark:bg-surface-800',
          sizeConfig.container,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            <div className="h-3 w-20 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
            <div className="h-7 w-24 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
            <div className="h-3 w-16 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
          </div>
          <div className={clsx('animate-pulse rounded-lg bg-surface-200 dark:bg-surface-700', sizeConfig.iconWrapper)} />
        </div>
        {hasSparkline && (
          <div className="mt-3">
            <div
              className="w-full animate-pulse rounded bg-surface-200 dark:bg-surface-700"
              style={{ height: sizeConfig.sparklineHeight }}
            />
          </div>
        )}
      </div>
    );
  }

  const displayValue = value !== null && value !== undefined ? value : 'N/A';

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={clsx(
        'rounded-xl border border-surface-200 bg-white shadow-card transition-all duration-200 dark:border-surface-700 dark:bg-surface-800',
        sizeConfig.container,
        isClickable && 'cursor-pointer hover:border-horizon-300 hover:shadow-elevated dark:hover:border-horizon-600',
        className,
      )}
    >
      {/* Header: Icon + Title */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title */}
          <p
            className={clsx(
              'font-medium text-surface-500 dark:text-surface-400',
              sizeConfig.title,
            )}
          >
            {title}
          </p>

          {/* Value + Unit */}
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={clsx(
                'font-semibold text-surface-900 dark:text-surface-100',
                sizeConfig.value,
              )}
            >
              {displayValue}
            </span>
            {unit && (
              <span
                className={clsx(
                  'font-normal text-surface-400 dark:text-surface-500',
                  sizeConfig.unit,
                )}
              >
                {unit}
              </span>
            )}
          </div>

          {/* Trend Indicator */}
          {hasTrend && (
            <div className="mt-1.5">
              <TrendIndicator
                trendValue={trendValue}
                trendLabel={trendLabel}
                trendDirection={resolvedDirection}
                invertTrend={invertTrend}
                size={size}
              />
            </div>
          )}

          {/* Description */}
          {hasDescription && (
            <p className="mt-1 text-2xs text-surface-400 dark:text-surface-500">
              {description}
            </p>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div
            className={clsx(
              'flex flex-shrink-0 items-center justify-center rounded-lg',
              sizeConfig.iconWrapper,
              variantStyle.iconBg,
            )}
          >
            <Icon size={sizeConfig.iconSize} className={variantStyle.iconText} />
          </div>
        )}
      </div>

      {/* Sparkline Chart */}
      {hasSparkline && (
        <div className="mt-3">
          <Sparkline
            data={sparklineData}
            height={sizeConfig.sparklineHeight}
            trendDirection={resolvedDirection}
            invertTrend={invertTrend}
          />
        </div>
      )}

      {/* Comparison Period */}
      {hasComparisonPeriod && (
        <p className="mt-2 text-2xs text-surface-400 dark:text-surface-500">
          {comparisonPeriod}
        </p>
      )}
    </div>
  );
}

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
  icon: PropTypes.elementType,
  variant: PropTypes.oneOf(['default', 'success', 'warning', 'danger', 'info', 'purple', 'cyan', 'indigo']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  trendValue: PropTypes.number,
  trendLabel: PropTypes.string,
  trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
  invertTrend: PropTypes.bool,
  sparklineData: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.shape({
        value: PropTypes.number,
        y: PropTypes.number,
        label: PropTypes.string,
        period: PropTypes.string,
        x: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    ]),
  ),
  comparisonPeriod: PropTypes.string,
  description: PropTypes.string,
  loading: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};