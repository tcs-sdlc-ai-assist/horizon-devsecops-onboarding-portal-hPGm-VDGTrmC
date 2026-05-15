/**
 * Reusable tabs component for Horizon DevSecOps Portal
 * Supports controlled and uncontrolled modes, icons in tab labels,
 * disabled tabs, and tab panels with accessible ARIA attributes.
 * @module components/common/Tabs
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each tab size.
 * @type {Object<string, { tab: string, text: string, iconSize: number }>}
 */
const SIZE_CONFIG = {
  sm: {
    tab: 'px-3 py-1.5 gap-1.5',
    text: 'text-xs',
    iconSize: 14,
  },
  md: {
    tab: 'px-4 py-2 gap-2',
    text: 'text-sm',
    iconSize: 16,
  },
  lg: {
    tab: 'px-5 py-2.5 gap-2.5',
    text: 'text-base',
    iconSize: 18,
  },
};

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each tab variant.
 * @type {Object<string, { list: string, tab: function, indicator: string }>}
 */
const VARIANT_CONFIG = {
  underline: {
    list: 'border-b border-surface-200 dark:border-surface-700',
    tab: (isActive, isDisabled) =>
      clsx(
        'relative border-b-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-horizon-500/20',
        isDisabled && 'cursor-not-allowed opacity-40',
        !isDisabled && !isActive && 'border-transparent text-surface-500 hover:border-surface-300 hover:text-surface-700 dark:text-surface-400 dark:hover:border-surface-600 dark:hover:text-surface-200',
        isActive && 'border-horizon-500 text-horizon-700 dark:border-horizon-400 dark:text-horizon-300',
      ),
  },
  pill: {
    list: 'gap-1 rounded-lg bg-surface-100 p-1 dark:bg-surface-900/50',
    tab: (isActive, isDisabled) =>
      clsx(
        'rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-horizon-500/20',
        isDisabled && 'cursor-not-allowed opacity-40',
        !isDisabled && !isActive && 'text-surface-500 hover:bg-surface-200 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200',
        isActive && 'bg-white text-horizon-700 shadow-sm dark:bg-surface-700 dark:text-horizon-300 dark:shadow-black/20',
      ),
  },
  bordered: {
    list: 'gap-1',
    tab: (isActive, isDisabled) =>
      clsx(
        'rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-horizon-500/20',
        isDisabled && 'cursor-not-allowed opacity-40',
        !isDisabled && !isActive && 'border-transparent text-surface-500 hover:border-surface-300 hover:text-surface-700 dark:text-surface-400 dark:hover:border-surface-600 dark:hover:text-surface-200',
        isActive && 'border-horizon-500 bg-horizon-50 text-horizon-700 dark:border-horizon-500 dark:bg-horizon-900/20 dark:text-horizon-300',
      ),
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Individual tab button component.
 */
function TabButton({
  tab,
  index,
  isActive,
  variant,
  size,
  onClick,
  tabsId,
}) {
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const variantConfig = VARIANT_CONFIG[variant] || VARIANT_CONFIG.underline;
  const isDisabled = tab.disabled === true;
  const Icon = tab.icon || null;

  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onClick(tab.id !== undefined && tab.id !== null ? tab.id : index);
    }
  }, [isDisabled, onClick, tab.id, index]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
        e.preventDefault();
        onClick(tab.id !== undefined && tab.id !== null ? tab.id : index);
      }
    },
    [isDisabled, onClick, tab.id, index],
  );

  const tabId = `${tabsId}-tab-${tab.id !== undefined && tab.id !== null ? tab.id : index}`;
  const panelId = `${tabsId}-panel-${tab.id !== undefined && tab.id !== null ? tab.id : index}`;

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      aria-disabled={isDisabled}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'inline-flex items-center font-medium',
        sizeConfig.tab,
        sizeConfig.text,
        variantConfig.tab(isActive, isDisabled),
      )}
    >
      {Icon && (
        <Icon size={sizeConfig.iconSize} className="flex-shrink-0" />
      )}
      {tab.label && <span>{tab.label}</span>}
      {tab.badge !== undefined && tab.badge !== null && (
        <span
          className={clsx(
            'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-2xs font-semibold leading-none',
            isActive
              ? 'bg-horizon-100 text-horizon-700 dark:bg-horizon-900/30 dark:text-horizon-300'
              : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400',
          )}
        >
          {tab.badge}
        </span>
      )}
    </button>
  );
}

TabButton.propTypes = {
  tab: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    disabled: PropTypes.bool,
    badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  index: PropTypes.number.isRequired,
  isActive: PropTypes.bool.isRequired,
  variant: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  tabsId: PropTypes.string.isRequired,
};

/**
 * Tab panel wrapper component.
 */
function TabPanel({ tab, index, isActive, tabsId, children }) {
  const tabId = `${tabsId}-tab-${tab.id !== undefined && tab.id !== null ? tab.id : index}`;
  const panelId = `${tabsId}-panel-${tab.id !== undefined && tab.id !== null ? tab.id : index}`;

  if (!isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      tabIndex={0}
      className="outline-none"
    >
      {children}
    </div>
  );
}

TabPanel.propTypes = {
  tab: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  index: PropTypes.number.isRequired,
  isActive: PropTypes.bool.isRequired,
  tabsId: PropTypes.string.isRequired,
  children: PropTypes.node,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable tabs component with tab list and tab panels.
 * Supports controlled and uncontrolled modes, icons in tab labels,
 * badges, and disabled tabs.
 *
 * **Controlled mode:** Provide both `activeTab` and `onChange` props.
 * **Uncontrolled mode:** Optionally provide `defaultTab`; the component
 * manages its own active tab state internally.
 *
 * @param {Object} props
 * @param {Array<Object>} props.tabs - Array of tab definition objects.
 * @param {string|number} [props.tabs[].id] - Unique tab identifier. Falls back to array index.
 * @param {string} props.tabs[].label - Tab label text.
 * @param {import('react').ElementType} [props.tabs[].icon] - Optional Lucide icon component.
 * @param {boolean} [props.tabs[].disabled=false] - Whether the tab is disabled.
 * @param {string|number} [props.tabs[].badge] - Optional badge value displayed after the label.
 * @param {import('react').ReactNode} [props.tabs[].content] - Tab panel content.
 * @param {string|number} [props.activeTab] - Controlled active tab ID or index.
 * @param {string|number} [props.defaultTab] - Default active tab for uncontrolled mode.
 * @param {Function} [props.onChange] - Callback when the active tab changes. Receives the tab ID or index.
 * @param {'underline'|'pill'|'bordered'} [props.variant='underline'] - Visual variant.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Tab size.
 * @param {boolean} [props.fullWidth=false] - Whether tabs stretch to fill the container width.
 * @param {import('react').ReactNode} [props.children] - Tab panel content rendered via children (alternative to tabs[].content).
 * @param {string} [props.className] - Additional CSS classes for the outer container.
 * @param {string} [props.tabListClassName] - Additional CSS classes for the tab list.
 * @param {string} [props.panelClassName] - Additional CSS classes for the tab panel wrapper.
 * @param {string} [props.id] - HTML id for the tabs container. Auto-generated if omitted.
 * @returns {import('react').ReactElement}
 */
export default function Tabs({
  tabs,
  activeTab: controlledActiveTab,
  defaultTab,
  onChange,
  variant = 'underline',
  size = 'md',
  fullWidth = false,
  children,
  className,
  tabListClassName,
  panelClassName,
  id,
}) {
  // -------------------------------------------------------------------------
  // Resolve controlled vs uncontrolled
  // -------------------------------------------------------------------------

  const isControlled = controlledActiveTab !== undefined && controlledActiveTab !== null;

  const resolveDefaultTab = () => {
    if (defaultTab !== undefined && defaultTab !== null) {
      return defaultTab;
    }
    if (Array.isArray(tabs) && tabs.length > 0) {
      // Find the first non-disabled tab
      const firstEnabled = tabs.findIndex((t) => t.disabled !== true);
      const idx = firstEnabled >= 0 ? firstEnabled : 0;
      const tab = tabs[idx];
      return tab.id !== undefined && tab.id !== null ? tab.id : idx;
    }
    return 0;
  };

  const [internalActiveTab, setInternalActiveTab] = useState(resolveDefaultTab);

  const activeTabValue = isControlled ? controlledActiveTab : internalActiveTab;

  // -------------------------------------------------------------------------
  // Generate a stable ID for ARIA attributes
  // -------------------------------------------------------------------------

  const generatedId = useRef(id || `tabs-${Math.random().toString(36).slice(2, 9)}`);
  const tabsId = id || generatedId.current;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTabClick = useCallback(
    (tabIdOrIndex) => {
      if (!isControlled) {
        setInternalActiveTab(tabIdOrIndex);
      }

      if (typeof onChange === 'function') {
        onChange(tabIdOrIndex);
      }
    },
    [isControlled, onChange],
  );

  // -------------------------------------------------------------------------
  // Keyboard navigation (arrow keys)
  // -------------------------------------------------------------------------

  const tabListRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (!Array.isArray(tabs) || tabs.length === 0) {
        return;
      }

      const { key } = e;

      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
        return;
      }

      e.preventDefault();

      // Find current active index
      let currentIndex = tabs.findIndex((t, idx) => {
        const tabKey = t.id !== undefined && t.id !== null ? t.id : idx;
        return tabKey === activeTabValue;
      });

      if (currentIndex === -1) {
        currentIndex = 0;
      }

      const enabledIndices = tabs
        .map((t, idx) => (t.disabled !== true ? idx : -1))
        .filter((idx) => idx !== -1);

      if (enabledIndices.length === 0) {
        return;
      }

      let nextIndex;

      if (key === 'ArrowRight') {
        const currentPos = enabledIndices.indexOf(currentIndex);
        const nextPos = currentPos >= 0
          ? (currentPos + 1) % enabledIndices.length
          : 0;
        nextIndex = enabledIndices[nextPos];
      } else if (key === 'ArrowLeft') {
        const currentPos = enabledIndices.indexOf(currentIndex);
        const nextPos = currentPos >= 0
          ? (currentPos - 1 + enabledIndices.length) % enabledIndices.length
          : enabledIndices.length - 1;
        nextIndex = enabledIndices[nextPos];
      } else if (key === 'Home') {
        nextIndex = enabledIndices[0];
      } else if (key === 'End') {
        nextIndex = enabledIndices[enabledIndices.length - 1];
      }

      if (nextIndex !== undefined) {
        const nextTab = tabs[nextIndex];
        const nextTabKey = nextTab.id !== undefined && nextTab.id !== null ? nextTab.id : nextIndex;
        handleTabClick(nextTabKey);

        // Focus the tab button
        if (tabListRef.current) {
          const buttons = tabListRef.current.querySelectorAll('[role="tab"]');
          if (buttons[nextIndex]) {
            buttons[nextIndex].focus();
          }
        }
      }
    },
    [tabs, activeTabValue, handleTabClick],
  );

  // -------------------------------------------------------------------------
  // Resolve active tab index for panel rendering
  // -------------------------------------------------------------------------

  const activeIndex = useMemo(() => {
    if (!Array.isArray(tabs) || tabs.length === 0) {
      return -1;
    }

    const idx = tabs.findIndex((t, i) => {
      const tabKey = t.id !== undefined && t.id !== null ? t.id : i;
      return tabKey === activeTabValue;
    });

    return idx >= 0 ? idx : 0;
  }, [tabs, activeTabValue]);

  // -------------------------------------------------------------------------
  // Resolve panel content
  // -------------------------------------------------------------------------

  const panelContent = useMemo(() => {
    if (!Array.isArray(tabs) || tabs.length === 0 || activeIndex < 0) {
      return null;
    }

    // If children is an array, use the child at activeIndex
    if (children !== undefined && children !== null) {
      const childArray = Array.isArray(children) ? children : [children];
      return childArray[activeIndex] !== undefined ? childArray[activeIndex] : null;
    }

    // Otherwise use tab.content
    const activeTabDef = tabs[activeIndex];
    return activeTabDef && activeTabDef.content !== undefined ? activeTabDef.content : null;
  }, [tabs, activeIndex, children]);

  // -------------------------------------------------------------------------
  // Variant config
  // -------------------------------------------------------------------------

  const variantConfig = VARIANT_CONFIG[variant] || VARIANT_CONFIG.underline;

  // -------------------------------------------------------------------------
  // Guard: no tabs
  // -------------------------------------------------------------------------

  if (!Array.isArray(tabs) || tabs.length === 0) {
    return null;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Tab List */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className={clsx(
          'flex',
          variantConfig.list,
          fullWidth && '[&>button]:flex-1 [&>button]:justify-center',
          tabListClassName,
        )}
      >
        {tabs.map((tab, index) => {
          const tabKey = tab.id !== undefined && tab.id !== null ? tab.id : index;
          const isActive = tabKey === activeTabValue || (activeIndex === index && tabKey !== activeTabValue);

          return (
            <TabButton
              key={tabKey}
              tab={tab}
              index={index}
              isActive={activeIndex === index}
              variant={variant}
              size={size}
              onClick={handleTabClick}
              tabsId={tabsId}
            />
          );
        })}
      </div>

      {/* Tab Panel */}
      {panelContent !== null && panelContent !== undefined && (
        <div className={clsx('mt-4', panelClassName)}>
          {tabs.map((tab, index) => (
            <TabPanel
              key={tab.id !== undefined && tab.id !== null ? tab.id : index}
              tab={tab}
              index={index}
              isActive={activeIndex === index}
              tabsId={tabsId}
            >
              {activeIndex === index ? panelContent : null}
            </TabPanel>
          ))}
        </div>
      )}
    </div>
  );
}

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      disabled: PropTypes.bool,
      badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      content: PropTypes.node,
    }),
  ).isRequired,
  activeTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  variant: PropTypes.oneOf(['underline', 'pill', 'bordered']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
  tabListClassName: PropTypes.string,
  panelClassName: PropTypes.string,
  id: PropTypes.string,
};