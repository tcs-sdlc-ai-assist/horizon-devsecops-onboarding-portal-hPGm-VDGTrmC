/**
 * Reusable modal dialog component for Horizon DevSecOps Portal
 * Supports title, content, footer actions, close button, backdrop click
 * to close, keyboard escape support, and multiple sizes (sm, md, lg, xl).
 * @module components/common/Modal
 */

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each modal size.
 * @type {Object<string, string>}
 */
const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Modal header section with title and close button.
 */
function ModalHeader({ title, onClose, showCloseButton }) {
  if (!title && !showCloseButton) {
    return null;
  }

  return (
    <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4 dark:border-surface-700">
      {title && (
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          {title}
        </h2>
      )}
      {showCloseButton && (
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-surface-400 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-300"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

ModalHeader.propTypes = {
  title: PropTypes.node,
  onClose: PropTypes.func.isRequired,
  showCloseButton: PropTypes.bool.isRequired,
};

/**
 * Modal footer section for action buttons.
 */
function ModalFooter({ footer }) {
  if (!footer) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-3 border-t border-surface-200 px-6 py-4 dark:border-surface-700">
      {footer}
    </div>
  );
}

ModalFooter.propTypes = {
  footer: PropTypes.node,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable modal dialog component rendered via a React portal.
 *
 * Features:
 * - Backdrop click to close (configurable)
 * - Keyboard Escape to close (configurable)
 * - Focus trap awareness
 * - Body scroll lock while open
 * - Multiple sizes: sm, md, lg, xl
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is visible.
 * @param {Function} props.onClose - Callback invoked when the modal should close.
 * @param {import('react').ReactNode} [props.title] - Modal title text or node.
 * @param {import('react').ReactNode} [props.children] - Modal body content.
 * @param {import('react').ReactNode} [props.footer] - Footer content (typically action buttons).
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Modal width size.
 * @param {boolean} [props.showCloseButton=true] - Whether to show the close (X) button.
 * @param {boolean} [props.closeOnBackdrop=true] - Whether clicking the backdrop closes the modal.
 * @param {boolean} [props.closeOnEscape=true] - Whether pressing Escape closes the modal.
 * @param {string} [props.className] - Additional CSS classes for the modal panel.
 * @param {boolean} [props.noPadding=false] - When true, removes default padding from the body area.
 * @returns {import('react').ReactElement|null}
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  noPadding = false,
}) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Keyboard Escape handler
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  // ---------------------------------------------------------------------------
  // Body scroll lock
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // ---------------------------------------------------------------------------
  // Focus the panel when opened for accessibility
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  // ---------------------------------------------------------------------------
  // Backdrop click handler
  // ---------------------------------------------------------------------------

  const handleBackdropClick = useCallback(
    (e) => {
      if (closeOnBackdrop && e.target === overlayRef.current) {
        onClose();
      }
    },
    [closeOnBackdrop, onClose],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!open) {
    return null;
  }

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const hasHeader = title || showCloseButton;

  const modalContent = (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={clsx(
          'relative w-full rounded-xl border border-surface-200 bg-white shadow-elevated outline-none transition-all duration-200 dark:border-surface-800 dark:bg-surface-900',
          sizeClass,
          className,
        )}
      >
        {/* Header */}
        {hasHeader && (
          <ModalHeader
            title={title}
            onClose={onClose}
            showCloseButton={showCloseButton}
          />
        )}

        {/* Body */}
        {children !== null && children !== undefined && (
          <div
            className={clsx(
              'overflow-y-auto scrollbar-thin',
              !noPadding && 'px-6 py-4',
              !hasHeader && !noPadding && 'pt-6',
              !footer && !noPadding && 'pb-6',
            )}
            style={{ maxHeight: 'calc(100vh - 12rem)' }}
          >
            {children}
          </div>
        )}

        {/* Footer */}
        <ModalFooter footer={footer} />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  showCloseButton: PropTypes.bool,
  closeOnBackdrop: PropTypes.bool,
  closeOnEscape: PropTypes.bool,
  className: PropTypes.string,
  noPadding: PropTypes.bool,
};