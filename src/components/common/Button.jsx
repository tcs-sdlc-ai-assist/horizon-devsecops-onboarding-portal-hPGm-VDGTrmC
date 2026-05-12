/**
 * Reusable button component for Horizon DevSecOps Portal
 * Supports variants (primary, secondary, danger, ghost), sizes (sm, md, lg),
 * loading state, disabled state, and icon support. Uses Tailwind classes.
 * @module components/common/Button
 */

import { forwardRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each button variant.
 * @type {Object<string, string>}
 */
const VARIANT_CLASSES = {
  primary:
    'bg-brand-primary text-white shadow-sm hover:bg-horizon-700 focus:ring-horizon-500 focus:ring-offset-2',
  secondary:
    'border border-surface-300 bg-white text-surface-700 shadow-sm hover:bg-surface-50 focus:ring-horizon-500 focus:ring-offset-2 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700',
  danger:
    'bg-brand-danger text-white shadow-sm hover:bg-red-600 focus:ring-red-500 focus:ring-offset-2',
  ghost:
    'text-surface-600 hover:bg-surface-100 hover:text-surface-900 focus:ring-horizon-500 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200',
};

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each button size.
 * @type {Object<string, { button: string, text: string, icon: number }>}
 */
const SIZE_CONFIG = {
  sm: {
    button: 'px-3 py-1.5 gap-1.5',
    text: 'text-xs',
    iconSize: 14,
  },
  md: {
    button: 'px-4 py-2 gap-2',
    text: 'text-sm',
    iconSize: 16,
  },
  lg: {
    button: 'px-5 py-2.5 gap-2.5',
    text: 'text-base',
    iconSize: 18,
  },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable button component with multiple variants, sizes, loading state,
 * disabled state, and optional leading/trailing icon support.
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'} [props.variant='primary'] - Visual variant.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Button size.
 * @param {boolean} [props.loading=false] - When true, shows a spinner and disables interaction.
 * @param {boolean} [props.disabled=false] - When true, disables the button.
 * @param {import('react').ElementType} [props.icon] - Lucide icon component rendered before children.
 * @param {import('react').ElementType} [props.iconRight] - Lucide icon component rendered after children.
 * @param {boolean} [props.fullWidth=false] - When true, the button takes full container width.
 * @param {'button'|'submit'|'reset'} [props.type='button'] - HTML button type attribute.
 * @param {import('react').ReactNode} [props.children] - Button label content.
 * @param {string} [props.className] - Additional CSS classes to merge.
 * @param {Function} [props.onClick] - Click handler.
 * @param {Object} [props.rest] - Additional HTML button attributes.
 * @returns {import('react').ReactElement}
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    iconRight,
    fullWidth = false,
    type = 'button',
    children,
    className,
    onClick,
    ...rest
  },
  ref,
) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  const isDisabled = disabled || loading;

  const Icon = icon || null;
  const IconRight = iconRight || null;

  const handleClick = useCallback(
    (e) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      if (typeof onClick === 'function') {
        onClick(e);
      }
    },
    [isDisabled, onClick],
  );

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 active:scale-[0.98]',
        variantClass,
        sizeConfig.button,
        sizeConfig.text,
        fullWidth && 'w-full',
        isDisabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2
          size={sizeConfig.iconSize}
          className="flex-shrink-0 animate-spin"
        />
      ) : Icon ? (
        <Icon size={sizeConfig.iconSize} className="flex-shrink-0" />
      ) : null}

      {children !== null && children !== undefined && (
        <span>{children}</span>
      )}

      {!loading && IconRight && (
        <IconRight size={sizeConfig.iconSize} className="flex-shrink-0" />
      )}
    </button>
  );
});

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.elementType,
  iconRight: PropTypes.elementType,
  fullWidth: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  children: PropTypes.node,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default Button;