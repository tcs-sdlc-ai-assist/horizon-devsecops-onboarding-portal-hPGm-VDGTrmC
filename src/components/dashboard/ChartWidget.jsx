/**
 * Reusable chart widget component for Horizon DevSecOps Portal
 * Wraps Recharts to provide a consistent chart interface across dashboards.
 * Supports chart types: line, bar, area, pie, radar.
 * Accepts data, config, title, and size props.
 * Handles responsive sizing and loading states.
 * @module components/dashboard/ChartWidget
 */

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { BarChart3 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Supported chart type identifiers.
 * @readonly
 * @enum {string}
 */
const CHART_TYPES = Object.freeze({
  LINE: 'line',
  BAR: 'bar',
  AREA: 'area',
  PIE: 'pie',
  RADAR: 'radar',
});

/**
 * Default color palette for chart series.
 * @type {string[]}
 */
const DEFAULT_COLORS = [
  '#1b5ef5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
];

/**
 * Size configuration for chart heights.
 * @type {Object<string, number>}
 */
const SIZE_CONFIG = {
  sm: 200,
  md: 300,
  lg: 400,
  xl: 500,
};

/**
 * Default tooltip style.
 * @type {Object}
 */
const DEFAULT_TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

/**
 * Default axis tick style.
 * @type {Object}
 */
const DEFAULT_TICK_STYLE = {
  fontSize: 11,
  fill: '#64748b',
};

/**
 * Default grid stroke color.
 * @type {string}
 */
const DEFAULT_GRID_STROKE = '#e2e8f0';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Loading skeleton for chart widget.
 */
function ChartSkeleton({ height }) {
  return (
    <div
      className="flex w-full items-center justify-center"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-full w-full animate-pulse rounded-lg bg-surface-200 dark:bg-surface-700"
          style={{ height: height - 40, minWidth: 200 }}
        />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
      </div>
    </div>
  );
}

ChartSkeleton.propTypes = {
  height: PropTypes.number.isRequired,
};

/**
 * Render a Line chart.
 */
function LineChartRenderer({ data, config, height, colors }) {
  const {
    xAxisKey = 'name',
    dataKeys = [],
    dataKeyNames = {},
    xAxisLabel,
    yAxisLabel,
    yAxisUnit,
    yAxisDomain,
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    strokeWidth = 2,
    dot = true,
    curveType = 'monotone',
    margin,
  } = config;

  const resolvedMargin = margin || { top: 5, right: 20, left: 0, bottom: 5 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={resolvedMargin}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={DEFAULT_GRID_STROKE} />}
        <XAxis
          dataKey={xAxisKey}
          tick={DEFAULT_TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: DEFAULT_GRID_STROKE }}
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#94a3b8' } } : undefined}
        />
        <YAxis
          tick={DEFAULT_TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: DEFAULT_GRID_STROKE }}
          unit={yAxisUnit || undefined}
          domain={yAxisDomain || undefined}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } } : undefined}
        />
        {showTooltip && (
          <Tooltip contentStyle={DEFAULT_TOOLTIP_STYLE} />
        )}
        {showLegend && <Legend wrapperStyle={{ fontSize: '11px' }} />}
        {dataKeys.map((key, index) => (
          <Line
            key={key}
            type={curveType}
            dataKey={key}
            name={dataKeyNames[key] || key}
            stroke={colors[index % colors.length]}
            strokeWidth={strokeWidth}
            dot={dot}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

LineChartRenderer.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.object.isRequired,
  height: PropTypes.number.isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
};

/**
 * Render a Bar chart.
 */
function BarChartRenderer({ data, config, height, colors }) {
  const {
    xAxisKey = 'name',
    dataKeys = [],
    dataKeyNames = {},
    xAxisLabel,
    yAxisLabel,
    yAxisUnit,
    yAxisDomain,
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    stacked = false,
    barRadius = [4, 4, 0, 0],
    layout = 'horizontal',
    margin,
  } = config;

  const resolvedMargin = margin || { top: 5, right: 20, left: 0, bottom: 5 };
  const isVertical = layout === 'vertical';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={resolvedMargin}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={DEFAULT_GRID_STROKE} />}
        {isVertical ? (
          <>
            <XAxis
              type="number"
              tick={DEFAULT_TICK_STYLE}
              tickLine={false}
              axisLine={{ stroke: DEFAULT_GRID_STROKE }}
              unit={yAxisUnit || undefined}
            />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              tick={DEFAULT_TICK_STYLE}
              tickLine={false}
              axisLine={{ stroke: DEFAULT_GRID_STROKE }}
              width={100}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xAxisKey}
              tick={DEFAULT_TICK_STYLE}
              tickLine={false}
              axisLine={{ stroke: DEFAULT_GRID_STROKE }}
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#94a3b8' } } : undefined}
            />
            <YAxis
              tick={DEFAULT_TICK_STYLE}
              tickLine={false}
              axisLine={{ stroke: DEFAULT_GRID_STROKE }}
              unit={yAxisUnit || undefined}
              domain={yAxisDomain || undefined}
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } } : undefined}
            />
          </>
        )}
        {showTooltip && (
          <Tooltip contentStyle={DEFAULT_TOOLTIP_STYLE} />
        )}
        {showLegend && <Legend wrapperStyle={{ fontSize: '11px' }} />}
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            name={dataKeyNames[key] || key}
            fill={colors[index % colors.length]}
            radius={isVertical ? [0, 4, 4, 0] : barRadius}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

BarChartRenderer.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.object.isRequired,
  height: PropTypes.number.isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
};

/**
 * Render an Area chart.
 */
function AreaChartRenderer({ data, config, height, colors }) {
  const {
    xAxisKey = 'name',
    dataKeys = [],
    dataKeyNames = {},
    xAxisLabel,
    yAxisLabel,
    yAxisUnit,
    yAxisDomain,
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    stacked = false,
    fillOpacity = 0.15,
    strokeWidth = 2,
    curveType = 'monotone',
    margin,
  } = config;

  const resolvedMargin = margin || { top: 5, right: 20, left: 0, bottom: 5 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={resolvedMargin}>
        <defs>
          {dataKeys.map((key, index) => {
            const color = colors[index % colors.length];
            return (
              <linearGradient key={`gradient-${key}`} id={`chart-gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            );
          })}
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={DEFAULT_GRID_STROKE} />}
        <XAxis
          dataKey={xAxisKey}
          tick={DEFAULT_TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: DEFAULT_GRID_STROKE }}
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#94a3b8' } } : undefined}
        />
        <YAxis
          tick={DEFAULT_TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: DEFAULT_GRID_STROKE }}
          unit={yAxisUnit || undefined}
          domain={yAxisDomain || undefined}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } } : undefined}
        />
        {showTooltip && (
          <Tooltip contentStyle={DEFAULT_TOOLTIP_STYLE} />
        )}
        {showLegend && <Legend wrapperStyle={{ fontSize: '11px' }} />}
        {dataKeys.map((key, index) => {
          const color = colors[index % colors.length];
          return (
            <Area
              key={key}
              type={curveType}
              dataKey={key}
              name={dataKeyNames[key] || key}
              stroke={color}
              strokeWidth={strokeWidth}
              fill={`url(#chart-gradient-${key})`}
              fillOpacity={stacked ? 0.6 : fillOpacity}
              stackId={stacked ? 'stack' : undefined}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: color }}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

AreaChartRenderer.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.object.isRequired,
  height: PropTypes.number.isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
};

/**
 * Render a Pie chart.
 */
function PieChartRenderer({ data, config, height, colors }) {
  const {
    dataKey = 'value',
    nameKey = 'name',
    showLegend = true,
    showTooltip = true,
    innerRadius = 0,
    outerRadius,
    paddingAngle = 2,
    labelEnabled = false,
    tooltipFormatter,
  } = config;

  const resolvedOuterRadius = outerRadius || Math.min(height * 0.35, 120);
  const resolvedInnerRadius = innerRadius || (resolvedOuterRadius > 60 ? resolvedOuterRadius * 0.6 : 0);

  // Resolve colors per data entry
  const resolvedColors = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map((entry, index) => {
      if (entry && entry.color) {
        return entry.color;
      }
      return colors[index % colors.length];
    });
  }, [data, colors]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={resolvedInnerRadius}
          outerRadius={resolvedOuterRadius}
          paddingAngle={paddingAngle}
          dataKey={dataKey}
          nameKey={nameKey}
          label={labelEnabled}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={resolvedColors[index] || colors[index % colors.length]} />
          ))}
        </Pie>
        {showTooltip && (
          <Tooltip
            contentStyle={DEFAULT_TOOLTIP_STYLE}
            formatter={typeof tooltipFormatter === 'function' ? tooltipFormatter : undefined}
          />
        )}
        {showLegend && <Legend wrapperStyle={{ fontSize: '11px' }} />}
      </PieChart>
    </ResponsiveContainer>
  );
}

PieChartRenderer.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.object.isRequired,
  height: PropTypes.number.isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
};

/**
 * Render a Radar chart.
 */
function RadarChartRenderer({ data, config, height, colors }) {
  const {
    dataKeys = [],
    dataKeyNames = {},
    angleAxisKey = 'metric',
    radiusDomain,
    showLegend = true,
    showTooltip = true,
    fillOpacity = 0.25,
    strokeWidth = 2,
  } = config;

  // If no dataKeys provided, try to infer a single "value" key
  const resolvedDataKeys = dataKeys.length > 0 ? dataKeys : ['value'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke={DEFAULT_GRID_STROKE} />
        <PolarAngleAxis
          dataKey={angleAxisKey}
          tick={{ fontSize: 10, fill: '#64748b' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={radiusDomain || [0, 'auto']}
          tick={{ fontSize: 9, fill: '#94a3b8' }}
        />
        {showTooltip && (
          <Tooltip contentStyle={DEFAULT_TOOLTIP_STYLE} />
        )}
        {showLegend && resolvedDataKeys.length > 1 && (
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        )}
        {resolvedDataKeys.map((key, index) => {
          const color = colors[index % colors.length];
          return (
            <Radar
              key={key}
              name={dataKeyNames[key] || key}
              dataKey={key}
              stroke={color}
              fill={color}
              fillOpacity={fillOpacity}
              strokeWidth={strokeWidth}
            />
          );
        })}
      </RadarChart>
    </ResponsiveContainer>
  );
}

RadarChartRenderer.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  config: PropTypes.object.isRequired,
  height: PropTypes.number.isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable chart widget component wrapping Recharts.
 * Supports line, bar, area, pie, and radar chart types.
 * Handles responsive sizing, loading states, and empty data states.
 *
 * @param {Object} props
 * @param {'line'|'bar'|'area'|'pie'|'radar'} [props.type='line'] - Chart type to render.
 * @param {Array<Object>} [props.data=[]] - Chart data array. Each entry is an object with keys matching config.dataKeys.
 * @param {Object} [props.config={}] - Chart configuration object.
 * @param {string} [props.config.xAxisKey='name'] - Key for the X axis (category axis) in the data.
 * @param {string[]} [props.config.dataKeys=[]] - Array of data keys to plot as series (for line, bar, area, radar).
 * @param {Object} [props.config.dataKeyNames={}] - Map of data key to display name for legend/tooltip.
 * @param {string} [props.config.dataKey='value'] - Data key for pie chart values.
 * @param {string} [props.config.nameKey='name'] - Name key for pie chart labels.
 * @param {string} [props.config.angleAxisKey='metric'] - Angle axis key for radar charts.
 * @param {string} [props.config.xAxisLabel] - Label for the X axis.
 * @param {string} [props.config.yAxisLabel] - Label for the Y axis.
 * @param {string} [props.config.yAxisUnit] - Unit suffix for Y axis ticks.
 * @param {Array} [props.config.yAxisDomain] - Y axis domain [min, max].
 * @param {Array} [props.config.radiusDomain] - Radar chart radius domain [min, max].
 * @param {boolean} [props.config.showGrid=true] - Whether to show the cartesian grid.
 * @param {boolean} [props.config.showLegend=true] - Whether to show the legend.
 * @param {boolean} [props.config.showTooltip=true] - Whether to show tooltips on hover.
 * @param {boolean} [props.config.stacked=false] - Whether to stack bar/area series.
 * @param {number} [props.config.strokeWidth=2] - Stroke width for line/area charts.
 * @param {number} [props.config.fillOpacity=0.15] - Fill opacity for area/radar charts.
 * @param {boolean} [props.config.dot=true] - Whether to show dots on line charts.
 * @param {string} [props.config.curveType='monotone'] - Curve interpolation type for line/area charts.
 * @param {number} [props.config.innerRadius=0] - Inner radius for pie charts (donut style).
 * @param {number} [props.config.outerRadius] - Outer radius for pie charts.
 * @param {number} [props.config.paddingAngle=2] - Padding angle between pie slices.
 * @param {boolean} [props.config.labelEnabled=false] - Whether to show labels on pie slices.
 * @param {Array<number>} [props.config.barRadius=[4,4,0,0]] - Border radius for bar chart bars.
 * @param {string} [props.config.layout='horizontal'] - Bar chart layout: 'horizontal' or 'vertical'.
 * @param {Object} [props.config.margin] - Chart margin { top, right, bottom, left }.
 * @param {Function} [props.config.tooltipFormatter] - Custom tooltip value formatter for pie charts.
 * @param {string} [props.title] - Chart title displayed in the card header.
 * @param {string} [props.subtitle] - Chart subtitle displayed below the title.
 * @param {import('react').ElementType} [props.icon] - Lucide icon component for the card header.
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Chart height size preset.
 * @param {number} [props.height] - Explicit chart height in pixels (overrides size).
 * @param {string[]} [props.colors] - Custom color palette. Defaults to DEFAULT_COLORS.
 * @param {boolean} [props.loading=false] - Whether to show a loading skeleton.
 * @param {string} [props.emptyTitle='No data available'] - Title for the empty state.
 * @param {string} [props.emptyDescription] - Description for the empty state.
 * @param {'default'|'outlined'|'elevated'} [props.variant='default'] - Card variant.
 * @param {import('react').ReactNode} [props.headerActions] - Actions rendered in the card header.
 * @param {import('react').ReactNode} [props.footer] - Footer content rendered below the chart.
 * @param {string} [props.className] - Additional CSS classes for the outer container.
 * @returns {import('react').ReactElement}
 */
export default function ChartWidget({
  type = CHART_TYPES.LINE,
  data = [],
  config = {},
  title,
  subtitle,
  icon,
  size = 'md',
  height: heightProp,
  colors: colorsProp,
  loading = false,
  emptyTitle = 'No data available',
  emptyDescription,
  variant = 'default',
  headerActions,
  footer,
  className,
}) {
  // Resolve chart height
  const resolvedHeight = useMemo(() => {
    if (typeof heightProp === 'number' && heightProp > 0) {
      return heightProp;
    }
    return SIZE_CONFIG[size] || SIZE_CONFIG.md;
  }, [heightProp, size]);

  // Resolve color palette
  const resolvedColors = useMemo(() => {
    if (Array.isArray(colorsProp) && colorsProp.length > 0) {
      return colorsProp;
    }
    return DEFAULT_COLORS;
  }, [colorsProp]);

  // Determine if data is valid and non-empty
  const hasData = useMemo(() => {
    return Array.isArray(data) && data.length > 0;
  }, [data]);

  // Resolve chart type
  const resolvedType = useMemo(() => {
    const validTypes = Object.values(CHART_TYPES);
    if (type && typeof type === 'string' && validTypes.includes(type.toLowerCase())) {
      return type.toLowerCase();
    }
    return CHART_TYPES.LINE;
  }, [type]);

  // Auto-detect dataKeys from data if not provided in config
  const resolvedConfig = useMemo(() => {
    const cfg = { ...config };

    if (
      resolvedType !== CHART_TYPES.PIE &&
      resolvedType !== CHART_TYPES.RADAR &&
      (!cfg.dataKeys || !Array.isArray(cfg.dataKeys) || cfg.dataKeys.length === 0) &&
      hasData
    ) {
      const xKey = cfg.xAxisKey || 'name';
      const firstRow = data[0];
      const keys = Object.keys(firstRow).filter((k) => {
        if (k === xKey) {
          return false;
        }
        const val = firstRow[k];
        return typeof val === 'number';
      });
      cfg.dataKeys = keys;
    }

    if (
      resolvedType === CHART_TYPES.RADAR &&
      (!cfg.dataKeys || !Array.isArray(cfg.dataKeys) || cfg.dataKeys.length === 0) &&
      hasData
    ) {
      const angleKey = cfg.angleAxisKey || 'metric';
      const firstRow = data[0];
      const keys = Object.keys(firstRow).filter((k) => {
        if (k === angleKey || k === 'fullMark') {
          return false;
        }
        const val = firstRow[k];
        return typeof val === 'number';
      });
      cfg.dataKeys = keys;
    }

    return cfg;
  }, [config, resolvedType, hasData, data]);

  // Render the appropriate chart type
  const renderChart = () => {
    if (loading) {
      return <ChartSkeleton height={resolvedHeight} />;
    }

    if (!hasData) {
      return (
        <EmptyState
          icon={BarChart3}
          title={emptyTitle}
          description={emptyDescription || 'Chart data will appear here once available.'}
          size="sm"
        />
      );
    }

    switch (resolvedType) {
      case CHART_TYPES.LINE:
        return (
          <LineChartRenderer
            data={data}
            config={resolvedConfig}
            height={resolvedHeight}
            colors={resolvedColors}
          />
        );
      case CHART_TYPES.BAR:
        return (
          <BarChartRenderer
            data={data}
            config={resolvedConfig}
            height={resolvedHeight}
            colors={resolvedColors}
          />
        );
      case CHART_TYPES.AREA:
        return (
          <AreaChartRenderer
            data={data}
            config={resolvedConfig}
            height={resolvedHeight}
            colors={resolvedColors}
          />
        );
      case CHART_TYPES.PIE:
        return (
          <PieChartRenderer
            data={data}
            config={resolvedConfig}
            height={resolvedHeight}
            colors={resolvedColors}
          />
        );
      case CHART_TYPES.RADAR:
        return (
          <RadarChartRenderer
            data={data}
            config={resolvedConfig}
            height={resolvedHeight}
            colors={resolvedColors}
          />
        );
      default:
        return (
          <LineChartRenderer
            data={data}
            config={resolvedConfig}
            height={resolvedHeight}
            colors={resolvedColors}
          />
        );
    }
  };

  // When no title is provided, render without a Card wrapper
  if (!title && !subtitle && !icon && !headerActions && !footer) {
    return (
      <div className={clsx('w-full', className)}>
        {renderChart()}
      </div>
    );
  }

  return (
    <Card
      variant={variant}
      icon={icon}
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      footer={footer}
      className={className}
    >
      {renderChart()}
    </Card>
  );
}

ChartWidget.propTypes = {
  type: PropTypes.oneOf(['line', 'bar', 'area', 'pie', 'radar']),
  data: PropTypes.arrayOf(PropTypes.object),
  config: PropTypes.shape({
    xAxisKey: PropTypes.string,
    dataKeys: PropTypes.arrayOf(PropTypes.string),
    dataKeyNames: PropTypes.object,
    dataKey: PropTypes.string,
    nameKey: PropTypes.string,
    angleAxisKey: PropTypes.string,
    xAxisLabel: PropTypes.string,
    yAxisLabel: PropTypes.string,
    yAxisUnit: PropTypes.string,
    yAxisDomain: PropTypes.array,
    radiusDomain: PropTypes.array,
    showGrid: PropTypes.bool,
    showLegend: PropTypes.bool,
    showTooltip: PropTypes.bool,
    stacked: PropTypes.bool,
    strokeWidth: PropTypes.number,
    fillOpacity: PropTypes.number,
    dot: PropTypes.bool,
    curveType: PropTypes.string,
    innerRadius: PropTypes.number,
    outerRadius: PropTypes.number,
    paddingAngle: PropTypes.number,
    labelEnabled: PropTypes.bool,
    barRadius: PropTypes.arrayOf(PropTypes.number),
    layout: PropTypes.oneOf(['horizontal', 'vertical']),
    margin: PropTypes.shape({
      top: PropTypes.number,
      right: PropTypes.number,
      bottom: PropTypes.number,
      left: PropTypes.number,
    }),
    tooltipFormatter: PropTypes.func,
  }),
  title: PropTypes.node,
  subtitle: PropTypes.node,
  icon: PropTypes.elementType,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  height: PropTypes.number,
  colors: PropTypes.arrayOf(PropTypes.string),
  loading: PropTypes.bool,
  emptyTitle: PropTypes.string,
  emptyDescription: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'outlined', 'elevated']),
  headerActions: PropTypes.node,
  footer: PropTypes.node,
  className: PropTypes.string,
};