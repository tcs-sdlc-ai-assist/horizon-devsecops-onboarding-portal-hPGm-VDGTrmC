/**
 * Reusable status indicator component for Horizon DevSecOps Portal
 * Shows a colored dot with a label for various statuses: active, inactive,
 * pending, error, success, warning. Used across onboarding, pipelines,
 * and integrations views.
 * @module components/common/StatusIndicator
 */

import PropTypes from 'prop-types';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Status Variant Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for the dot indicator per status variant.
 * @type {Object<string, string>}
 */
const DOT_CLASSES = {
  active: 'bg-green-500 dark:bg-green-400',
  success: 'bg-green-500 dark:bg-green-400',
  inactive: 'bg-surface-400 dark:bg-surface-500',
  pending: 'bg-amber-500 dark:bg-amber-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  error: 'bg-red-500 dark:bg-red-400',
  info: 'bg-blue-500 dark:bg-blue-400',
  connected: 'bg-green-500 dark:bg-green-400',
  disconnected: 'bg-surface-400 dark:bg-surface-500',
  running: 'bg-blue-500 dark:bg-blue-400',
  failed: 'bg-red-500 dark:bg-red-400',
  cancelled: 'bg-surface-400 dark:bg-surface-500',
  skipped: 'bg-surface-300 dark:bg-surface-600',
};

/**
 * CSS class mappings for the label text per status variant.
 * @type {Object<string, string>}
 */
const LABEL_CLASSES = {
  active: 'text-green-700 dark:text-green-300',
  success: 'text-green-700 dark:text-green-300',
  inactive: 'text-surface-500 dark:text-surface-400',
  pending: 'text-amber-700 dark:text-amber-300',
  warning: 'text-amber-700 dark:text-amber-300',
  error: 'text-red-700 dark:text-red-300',
  info: 'text-blue-700 dark:text-blue-300',
  connected: 'text-green-700 dark:text-green-300',
  disconnected: 'text-surface-500 dark:text-surface-400',
  running: 'text-blue-700 dark:text-blue-300',
  failed: 'text-red-700 dark:text-red-300',
  cancelled: 'text-surface-500 dark:text-surface-400',
  skipped: 'text-surface-500 dark:text-surface-400',
};

/**
 * Default display labels for each status variant.
 * @type {Object<string, string>}
 */
const DEFAULT_LABELS = {
  active: 'Active',
  success: 'Success',
  inactive: 'Inactive',
  pending: 'Pending',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
  connected: 'Connected',
  disconnected: 'Disconnected',
  running: 'Running',
  failed: 'Failed',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
};

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each indicator size.
 * @type {Object<string, { dot: string, text: string, gap: string }>}
 */
const SIZE_CONFIG = {
  sm: {
    dot: 'h-1.5 w-1.5',
    text: 'text-2xs',
    gap: 'gap-1',
  },
  md: {
    dot: 'h-2 w-2',
    text: 'text-xs',
    gap: 'gap-1.5',
  },
  lg: {
    dot: 'h-2.5 w-2.5',
    text: 'text-sm',
    gap: 'gap-2',
  },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable status indicator component that displays a colored dot alongside
 * a text label. Supports multiple status variants and sizes.
 *
 * @param {Object} props
 * @param {'active'|'inactive'|'pending'|'error'|'success'|'warning'|'info'|'connected'|'disconnected'|'running'|'failed'|'cancelled'|'skipped'} [props.status='active'] - Status variant controlling dot color and default label.
 * @param {string} [props.label] - Custom label text. When omitted, the default label for the status is used.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Indicator size.
 * @param {boolean} [props.showLabel=true] - Whether to display the text label alongside the dot.
 * @param {boolean} [props.pulse=false] - Whether to apply a pulse animation to the dot (useful for active/running states).
 * @param {string} [props.className] - Additional CSS classes to merge onto the outer container.
 * @returns {import('react').ReactElement}
 */
export default function StatusIndicator({
  status = 'active',
  label,
  size = 'md',
  showLabel = true,
  pulse = false,
  className,
}) {
  const resolvedStatus = status && typeof status === 'string' ? status.toLowerCase() : 'active';

  const dotClass = DOT_CLASSES[resolvedStatus] || DOT_CLASSES.active;
  const labelClass = LABEL_CLASSES[resolvedStatus] || LABEL_CLASSES.active;
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const displayLabel = label || DEFAULT_LABELS[resolvedStatus] || resolvedStatus;

  const shouldPulse =
    pulse ||
    resolvedStatus === 'running' ||
    resolvedStatus === 'pending';

  return (
    <span
      className={clsx(
        'inline-flex items-center',
        sizeConfig.gap,
        className,
      )}
    >
      <span
        className={clsx(
          'flex-shrink-0 rounded-full',
          sizeConfig.dot,
          dotClass,
          shouldPulse && 'animate-pulse-slow',
        )}
      />
      {showLabel && (
        <span
          className={clsx(
            'font-medium',
            sizeConfig.text,
            labelClass,
          )}
        >
          {displayLabel}
        </span>
      )}
    </span>
  );
}

StatusIndicator.propTypes = {
  status: PropTypes.oneOf([
    'active',
    'inactive',
    'pending',
    'error',
    'success',
    'warning',
    'info',
    'connected',
    'disconnected',
    'running',
    'failed',
    'cancelled',
    'skipped',
  ]),
  label: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showLabel: PropTypes.bool,
  pulse: PropTypes.bool,
  className: PropTypes.string,
};