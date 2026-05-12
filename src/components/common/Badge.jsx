/**
 * Reusable badge/tag component for Horizon DevSecOps Portal
 * Supports color variants (success, warning, danger, info, neutral),
 * sizes (sm, md, lg), optional icon, and dot indicator.
 * Used for status indicators, criticality tiers, environment labels.
 * @module components/common/Badge
 */

import PropTypes from 'prop-types';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each badge variant.
 * @type {Object<string, string>}
 */
const VARIANT_CLASSES = {
  success:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  danger:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  neutral:
    'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
  purple:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  horizon:
    'bg-horizon-50 text-horizon-700 dark:bg-horizon-900/30 dark:text-horizon-300',
};

// ---------------------------------------------------------------------------
// Dot Indicator Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for the dot indicator per variant.
 * @type {Object<string, string>}
 */
const DOT_CLASSES = {
  success: 'bg-green-500 dark:bg-green-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  danger: 'bg-red-500 dark:bg-red-400',
  info: 'bg-blue-500 dark:bg-blue-400',
  neutral: 'bg-surface-400 dark:bg-surface-500',
  purple: 'bg-purple-500 dark:bg-purple-400',
  horizon: 'bg-horizon-500 dark:bg-horizon-400',
};

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each badge size.
 * @type {Object<string, { badge: string, text: string, dot: string, iconSize: number }>}
 */
const SIZE_CONFIG = {
  sm: {
    badge: 'px-1.5 py-0.5 gap-1',
    text: 'text-2xs',
    dot: 'h-1.5 w-1.5',
    iconSize: 10,
  },
  md: {
    badge: 'px-2.5 py-0.5 gap-1.5',
    text: 'text-xs',
    dot: 'h-2 w-2',
    iconSize: 12,
  },
  lg: {
    badge: 'px-3 py-1 gap-1.5',
    text: 'text-sm',
    dot: 'h-2.5 w-2.5',
    iconSize: 14,
  },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable badge/tag component for status indicators, criticality tiers,
 * environment labels, and other categorical displays.
 *
 * @param {Object} props
 * @param {'success'|'warning'|'danger'|'info'|'neutral'|'purple'|'horizon'} [props.variant='neutral'] - Color variant.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Badge size.
 * @param {import('react').ElementType} [props.icon] - Optional Lucide icon component rendered before children.
 * @param {boolean} [props.dot=false] - Whether to show a colored dot indicator before the label.
 * @param {boolean} [props.rounded=true] - Whether to use fully rounded (pill) corners.
 * @param {import('react').ReactNode} [props.children] - Badge label content.
 * @param {string} [props.className] - Additional CSS classes to merge.
 * @returns {import('react').ReactElement}
 */
export default function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  dot = false,
  rounded = true,
  children,
  className,
}) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral;
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const dotClass = DOT_CLASSES[variant] || DOT_CLASSES.neutral;

  const Icon = icon || null;

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium',
        variantClass,
        sizeConfig.badge,
        sizeConfig.text,
        rounded ? 'rounded-full' : 'rounded-md',
        className,
      )}
    >
      {dot && (
        <span
          className={clsx(
            'flex-shrink-0 rounded-full',
            sizeConfig.dot,
            dotClass,
          )}
        />
      )}

      {!dot && Icon && (
        <Icon size={sizeConfig.iconSize} className="flex-shrink-0" />
      )}

      {children !== null && children !== undefined && (
        <span>{children}</span>
      )}
    </span>
  );
}

Badge.propTypes = {
  variant: PropTypes.oneOf(['success', 'warning', 'danger', 'info', 'neutral', 'purple', 'horizon']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  icon: PropTypes.elementType,
  dot: PropTypes.bool,
  rounded: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};