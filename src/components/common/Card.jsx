/**
 * Reusable card component for Horizon DevSecOps Portal
 * Supports title, subtitle, icon, children content area, and optional
 * footer actions. Provides default, outlined, and elevated variants.
 * @module components/common/Card
 */

import PropTypes from 'prop-types';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each card variant.
 * @type {Object<string, string>}
 */
const VARIANT_CLASSES = {
  default:
    'rounded-xl border border-surface-200 bg-white p-6 shadow-card transition-all duration-300 dark:border-surface-800 dark:bg-surface-900/50 dark:backdrop-blur-sm',
  outlined:
    'rounded-xl border border-surface-300 bg-white p-6 transition-all duration-300 dark:border-surface-700 dark:bg-transparent',
  elevated:
    'rounded-xl border border-surface-200 bg-white p-6 shadow-elevated transition-all duration-300 dark:border-surface-700 dark:bg-surface-800 dark:shadow-2xl dark:shadow-black/20',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Card header section with optional icon, title, subtitle, and header actions.
 */
function CardHeader({ icon, title, subtitle, headerActions }) {
  const Icon = icon || null;
  const hasHeader = title || subtitle || Icon || headerActions;

  if (!hasHeader) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-horizon-50 dark:bg-horizon-900/30">
            <Icon size={20} className="text-horizon-600 dark:text-horizon-400" />
          </div>
        )}
        <div className="min-w-0">
          {title && (
            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {headerActions && (
        <div className="flex flex-shrink-0 items-center gap-2">{headerActions}</div>
      )}
    </div>
  );
}

CardHeader.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  headerActions: PropTypes.node,
};

/**
 * Card footer section for action buttons or supplementary content.
 */
function CardFooter({ footer }) {
  if (!footer) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-surface-200 pt-4 dark:border-surface-700">
      {footer}
    </div>
  );
}

CardFooter.propTypes = {
  footer: PropTypes.node,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable card component used across dashboards, forms, and detail views.
 *
 * @param {Object} props
 * @param {string} [props.variant='default'] - Visual variant: 'default', 'outlined', or 'elevated'.
 * @param {import('react').ElementType} [props.icon] - Lucide icon component rendered in the header.
 * @param {import('react').ReactNode} [props.title] - Card title text or node.
 * @param {import('react').ReactNode} [props.subtitle] - Card subtitle text or node.
 * @param {import('react').ReactNode} [props.headerActions] - Actions rendered on the right side of the header.
 * @param {import('react').ReactNode} [props.footer] - Footer content rendered below a divider.
 * @param {import('react').ReactNode} [props.children] - Main card body content.
 * @param {string} [props.className] - Additional CSS classes to merge.
 * @param {boolean} [props.noPadding=false] - When true, removes default padding from the body area.
 * @returns {import('react').ReactElement}
 */
export default function Card({
  variant = 'default',
  icon,
  title,
  subtitle,
  headerActions,
  footer,
  children,
  className,
  noPadding = false,
}) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.default;
  const hasHeader = title || subtitle || icon || headerActions;

  return (
    <div
      className={clsx(
        variantClass,
        noPadding && '!p-0',
        className,
      )}
      style={
        variant === 'default'
          ? {
              backgroundImage: 'var(--card-gradient, none)',
            }
          : undefined
      }
    >
      {noPadding ? (
        <>
          {hasHeader && (
            <div className="px-6 pt-6">
              <CardHeader
                icon={icon}
                title={title}
                subtitle={subtitle}
                headerActions={headerActions}
              />
            </div>
          )}
          {children !== null && children !== undefined && (
            <div className={clsx(hasHeader && 'mt-4')}>
              {children}
            </div>
          )}
          {footer && (
            <div className="px-6 pb-6">
              <CardFooter footer={footer} />
            </div>
          )}
        </>
      ) : (
        <>
          <CardHeader
            icon={icon}
            title={title}
            subtitle={subtitle}
            headerActions={headerActions}
          />
          {children !== null && children !== undefined && (
            <div className={clsx(hasHeader && 'mt-4')}>
              {children}
            </div>
          )}
          <CardFooter footer={footer} />
        </>
      )}
    </div>
  );
}

Card.propTypes = {
  variant: PropTypes.oneOf(['default', 'outlined', 'elevated']),
  icon: PropTypes.elementType,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  headerActions: PropTypes.node,
  footer: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
  noPadding: PropTypes.bool,
};