/**
 * Toast notification component and context provider for Horizon DevSecOps Portal
 * Provides success, error, warning, info messages with auto-dismiss,
 * configurable duration, and stacking support.
 * @module components/common/Toast
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default auto-dismiss duration in milliseconds.
 * @type {number}
 */
const DEFAULT_DURATION_MS = 5000;

/**
 * Maximum number of toasts visible at once.
 * @type {number}
 */
const MAX_VISIBLE_TOASTS = 5;

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each toast variant.
 * @type {Object<string, { container: string, icon: import('react').ElementType, iconClass: string }>}
 */
const VARIANT_CONFIG = {
  success: {
    container:
      'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
    icon: CheckCircle2,
    iconClass: 'text-green-600 dark:text-green-400',
    titleClass: 'text-green-800 dark:text-green-200',
    messageClass: 'text-green-700 dark:text-green-300',
  },
  error: {
    container:
      'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    icon: AlertCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    titleClass: 'text-red-800 dark:text-red-200',
    messageClass: 'text-red-700 dark:text-red-300',
  },
  warning: {
    container:
      'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
    icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
    titleClass: 'text-amber-800 dark:text-amber-200',
    messageClass: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    container:
      'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    icon: Info,
    iconClass: 'text-blue-600 dark:text-blue-400',
    titleClass: 'text-blue-800 dark:text-blue-200',
    messageClass: 'text-blue-700 dark:text-blue-300',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Individual toast notification item.
 */
function ToastItem({ toast, onDismiss }) {
  const variant = VARIANT_CONFIG[toast.variant] || VARIANT_CONFIG.info;
  const Icon = variant.icon;

  const handleDismiss = useCallback(() => {
    onDismiss(toast.id);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={clsx(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-elevated transition-all duration-300 animate-slide-up',
        variant.container,
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">
        <Icon size={20} className={variant.iconClass} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {toast.title && (
          <p className={clsx('text-sm font-semibold', variant.titleClass)}>
            {toast.title}
          </p>
        )}
        {toast.message && (
          <p
            className={clsx(
              'text-sm',
              variant.messageClass,
              toast.title && 'mt-0.5',
            )}
          >
            {toast.message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        className={clsx(
          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
          'text-surface-400 hover:bg-surface-200/50 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-700/50 dark:hover:text-surface-300',
        )}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

ToastItem.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.string.isRequired,
    variant: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
    title: PropTypes.string,
    message: PropTypes.string,
    duration: PropTypes.number,
  }).isRequired,
  onDismiss: PropTypes.func.isRequired,
};

/**
 * Toast container that renders all active toasts via a portal.
 */
function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) {
    return null;
  }

  const content = (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-end justify-start gap-3 p-4 sm:p-6"
    >
      <div className="flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

ToastContainer.propTypes = {
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      variant: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
      title: PropTypes.string,
      message: PropTypes.string,
      duration: PropTypes.number,
    }),
  ).isRequired,
  onDismiss: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * ToastProvider wraps the application and provides toast notification
 * capabilities via the useToast hook.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @returns {import('react').ReactElement}
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  /**
   * Remove a toast by its ID and clear its auto-dismiss timer.
   * @param {string} toastId
   */
  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));

    const timer = timersRef.current.get(toastId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toastId);
    }
  }, []);

  /**
   * Add a new toast notification.
   *
   * @param {Object} options
   * @param {'success'|'error'|'warning'|'info'} [options.variant='info'] - Toast variant.
   * @param {string} [options.title] - Toast title text.
   * @param {string} [options.message] - Toast message text.
   * @param {number} [options.duration] - Auto-dismiss duration in milliseconds. Set to 0 to disable auto-dismiss.
   * @returns {string} The toast ID.
   */
  const addToast = useCallback(
    (options = {}) => {
      const {
        variant = 'info',
        title = '',
        message = '',
        duration,
      } = options;

      const resolvedVariant =
        variant && VARIANT_CONFIG[variant] ? variant : 'info';

      const resolvedDuration =
        typeof duration === 'number' ? duration : DEFAULT_DURATION_MS;

      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const toast = {
        id,
        variant: resolvedVariant,
        title: typeof title === 'string' ? title : '',
        message: typeof message === 'string' ? message : '',
        duration: resolvedDuration,
      };

      setToasts((prev) => {
        const next = [...prev, toast];
        // Trim to max visible toasts, removing oldest first
        if (next.length > MAX_VISIBLE_TOASTS) {
          const removed = next.splice(0, next.length - MAX_VISIBLE_TOASTS);
          // Clear timers for removed toasts
          removed.forEach((r) => {
            const timer = timersRef.current.get(r.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(r.id);
            }
          });
        }
        return next;
      });

      // Set up auto-dismiss timer
      if (resolvedDuration > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, resolvedDuration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  /**
   * Show a success toast.
   * @param {string} message - Toast message.
   * @param {Object} [options] - Additional options.
   * @returns {string} The toast ID.
   */
  const success = useCallback(
    (message, options = {}) => {
      return addToast({ ...options, variant: 'success', message });
    },
    [addToast],
  );

  /**
   * Show an error toast.
   * @param {string} message - Toast message.
   * @param {Object} [options] - Additional options.
   * @returns {string} The toast ID.
   */
  const error = useCallback(
    (message, options = {}) => {
      return addToast({ ...options, variant: 'error', message });
    },
    [addToast],
  );

  /**
   * Show a warning toast.
   * @param {string} message - Toast message.
   * @param {Object} [options] - Additional options.
   * @returns {string} The toast ID.
   */
  const warning = useCallback(
    (message, options = {}) => {
      return addToast({ ...options, variant: 'warning', message });
    },
    [addToast],
  );

  /**
   * Show an info toast.
   * @param {string} message - Toast message.
   * @param {Object} [options] - Additional options.
   * @returns {string} The toast ID.
   */
  const info = useCallback(
    (message, options = {}) => {
      return addToast({ ...options, variant: 'info', message });
    },
    [addToast],
  );

  /**
   * Dismiss all active toasts.
   */
  const dismissAll = useCallback(() => {
    setToasts([]);
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const contextValue = useMemo(
    () => ({
      toasts,
      addToast,
      dismissToast,
      dismissAll,
      success,
      error,
      warning,
      info,
    }),
    [toasts, addToast, dismissToast, dismissAll, success, error, warning, info],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Custom hook to consume the ToastContext.
 * Must be used within a ToastProvider.
 *
 * @returns {{
 *   toasts: Array<Object>,
 *   addToast: function,
 *   dismissToast: function,
 *   dismissAll: function,
 *   success: function,
 *   error: function,
 *   warning: function,
 *   info: function,
 * }}
 */
export const useToast = () => {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error('useToast must be used within a ToastProvider.');
  }

  return context;
};

// ---------------------------------------------------------------------------
// Default Export
// ---------------------------------------------------------------------------

export default ToastProvider;