/**
 * Reusable empty state component for Horizon DevSecOps Portal
 * Displays an icon, title, description, and optional action button
 * when lists, tables, or views have no data to show.
 * @module components/common/EmptyState
 */

import PropTypes from 'prop-types';
import clsx from 'clsx';
import { Inbox } from 'lucide-react';
import Button from './Button.jsx';

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each empty state size.
 * @type {Object<string, { container: string, iconWrapper: string, iconSize: number, title: string, description: string }>}
 */
const SIZE_CONFIG = {
  sm: {
    container: 'px-4 py-8',
    iconWrapper: 'h-10 w-10',
    iconSize: 20,
    title: 'text-sm',
    description: 'text-xs',
  },
  md: {
    container: 'px-6 py-12',
    iconWrapper: 'h-12 w-12',
    iconSize: 24,
    title: 'text-base',
    description: 'text-sm',
  },
  lg: {
    container: 'px-8 py-16',
    iconWrapper: 'h-16 w-16',
    iconSize: 32,
    title: 'text-lg',
    description: 'text-sm',
  },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable empty state component displayed when lists, tables, or views
 * have no data. Supports a customisable icon, title, description, and
 * an optional call-to-action button.
 *
 * @param {Object} props
 * @param {import('react').ElementType} [props.icon] - Lucide icon component to display. Defaults to Inbox.
 * @param {string} [props.title='No data available'] - Heading text.
 * @param {string} [props.description] - Supporting description text rendered below the title.
 * @param {string} [props.actionLabel] - Label for the optional action button.
 * @param {Function} [props.onAction] - Click handler for the action button.
 * @param {import('react').ElementType} [props.actionIcon] - Optional Lucide icon for the action button.
 * @param {'primary'|'secondary'|'ghost'} [props.actionVariant='primary'] - Button variant for the action.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Overall size of the empty state.
 * @param {boolean} [props.bordered=false] - Whether to render a border around the component.
 * @param {import('react').ReactNode} [props.children] - Optional custom content rendered below the description.
 * @param {string} [props.className] - Additional CSS classes to merge onto the outer container.
 * @returns {import('react').ReactElement}
 */
export default function EmptyState({
  icon,
  title = 'No data available',
  description,
  actionLabel,
  onAction,
  actionIcon,
  actionVariant = 'primary',
  size = 'md',
  bordered = false,
  children,
  className,
}) {
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const Icon = icon || Inbox;

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        sizeConfig.container,
        bordered &&
          'rounded-xl border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900/50',
        className,
      )}
    >
      {/* Icon */}
      <div
        className={clsx(
          'mx-auto mb-4 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-900',
          sizeConfig.iconWrapper,
        )}
      >
        <Icon
          size={sizeConfig.iconSize}
          className="text-surface-400 dark:text-surface-500"
        />
      </div>

      {/* Title */}
      {title && (
        <h3
          className={clsx(
            'font-medium text-surface-900 dark:text-surface-100',
            sizeConfig.title,
          )}
        >
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p
          className={clsx(
            'mx-auto mt-1.5 max-w-sm text-surface-500 dark:text-surface-400',
            sizeConfig.description,
          )}
        >
          {description}
        </p>
      )}

      {/* Custom children */}
      {children !== null && children !== undefined && (
        <div className="mt-4">{children}</div>
      )}

      {/* Action button */}
      {actionLabel && typeof onAction === 'function' && (
        <div className="mt-5">
          <Button
            variant={actionVariant}
            size={size === 'lg' ? 'md' : 'sm'}
            icon={actionIcon}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  actionIcon: PropTypes.elementType,
  actionVariant: PropTypes.oneOf(['primary', 'secondary', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  bordered: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};