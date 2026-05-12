/**
 * Toolchain selection component for Horizon DevSecOps Portal
 * Organized by category (Source Control, CI/CD, Build, Container, Security,
 * Observability, QE, ITSM, etc.). Each category shows available tools as
 * selectable cards with icons and descriptions. Supports multi-select within
 * categories. Shows selected toolchain summary.
 * @module components/onboarding/ToolchainSelector
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Check,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Settings,
  Package,
  Container,
  Shield,
  Activity,
  FileText,
  Ticket,
  MessageSquare,
  TestTube2,
  Database,
  Cpu,
  Radio,
  Globe,
  Wrench,
  X,
  Info,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import {
  TOOLCHAIN_CATALOG,
  EXTENDED_CATEGORIES,
  getCatalogByCategory,
  getAllCategories,
} from '../../constants/toolchainData.js';
import { TOOLCHAIN_CATEGORIES } from '../../constants/constants.js';

// ---------------------------------------------------------------------------
// Category Icon Mapping
// ---------------------------------------------------------------------------

/**
 * Map category names to Lucide icon components.
 * @type {Object<string, import('react').ElementType>}
 */
const CATEGORY_ICONS = {
  [TOOLCHAIN_CATEGORIES.SOURCE_CONTROL]: GitBranch,
  [TOOLCHAIN_CATEGORIES.CI_CD]: Settings,
  [TOOLCHAIN_CATEGORIES.ARTIFACT_MANAGEMENT]: Package,
  [TOOLCHAIN_CATEGORIES.CONTAINERIZATION]: Container,
  [TOOLCHAIN_CATEGORIES.SECURITY_SCANNING]: Shield,
  [TOOLCHAIN_CATEGORIES.MONITORING]: Activity,
  [TOOLCHAIN_CATEGORIES.LOGGING]: FileText,
  [TOOLCHAIN_CATEGORIES.ITSM]: Ticket,
  [TOOLCHAIN_CATEGORIES.COLLABORATION]: MessageSquare,
  [TOOLCHAIN_CATEGORIES.TESTING]: TestTube2,
  Build: Wrench,
  'API Management': Globe,
  Messaging: Radio,
  Database: Database,
  'Data Platform': Cpu,
  'QE Tools': TestTube2,
};

// ---------------------------------------------------------------------------
// Category Color Mapping
// ---------------------------------------------------------------------------

/**
 * Map category names to color classes for visual distinction.
 * @type {Object<string, { bg: string, border: string, text: string, selectedBg: string, selectedBorder: string }>}
 */
const CATEGORY_COLORS = {
  [TOOLCHAIN_CATEGORIES.SOURCE_CONTROL]: {
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
    selectedBg: 'bg-blue-100 dark:bg-blue-900/30',
    selectedBorder: 'border-blue-500 dark:border-blue-500',
  },
  [TOOLCHAIN_CATEGORIES.CI_CD]: {
    bg: 'bg-purple-50 dark:bg-purple-900/10',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-600 dark:text-purple-400',
    selectedBg: 'bg-purple-100 dark:bg-purple-900/30',
    selectedBorder: 'border-purple-500 dark:border-purple-500',
  },
  [TOOLCHAIN_CATEGORIES.ARTIFACT_MANAGEMENT]: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-600 dark:text-amber-400',
    selectedBg: 'bg-amber-100 dark:bg-amber-900/30',
    selectedBorder: 'border-amber-500 dark:border-amber-500',
  },
  [TOOLCHAIN_CATEGORIES.CONTAINERIZATION]: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/10',
    border: 'border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-600 dark:text-cyan-400',
    selectedBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    selectedBorder: 'border-cyan-500 dark:border-cyan-500',
  },
  [TOOLCHAIN_CATEGORIES.SECURITY_SCANNING]: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400',
    selectedBg: 'bg-red-100 dark:bg-red-900/30',
    selectedBorder: 'border-red-500 dark:border-red-500',
  },
  [TOOLCHAIN_CATEGORIES.MONITORING]: {
    bg: 'bg-green-50 dark:bg-green-900/10',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-600 dark:text-green-400',
    selectedBg: 'bg-green-100 dark:bg-green-900/30',
    selectedBorder: 'border-green-500 dark:border-green-500',
  },
  [TOOLCHAIN_CATEGORIES.LOGGING]: {
    bg: 'bg-orange-50 dark:bg-orange-900/10',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-600 dark:text-orange-400',
    selectedBg: 'bg-orange-100 dark:bg-orange-900/30',
    selectedBorder: 'border-orange-500 dark:border-orange-500',
  },
  [TOOLCHAIN_CATEGORIES.ITSM]: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/10',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-600 dark:text-indigo-400',
    selectedBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    selectedBorder: 'border-indigo-500 dark:border-indigo-500',
  },
  [TOOLCHAIN_CATEGORIES.COLLABORATION]: {
    bg: 'bg-teal-50 dark:bg-teal-900/10',
    border: 'border-teal-200 dark:border-teal-800',
    text: 'text-teal-600 dark:text-teal-400',
    selectedBg: 'bg-teal-100 dark:bg-teal-900/30',
    selectedBorder: 'border-teal-500 dark:border-teal-500',
  },
  [TOOLCHAIN_CATEGORIES.TESTING]: {
    bg: 'bg-pink-50 dark:bg-pink-900/10',
    border: 'border-pink-200 dark:border-pink-800',
    text: 'text-pink-600 dark:text-pink-400',
    selectedBg: 'bg-pink-100 dark:bg-pink-900/30',
    selectedBorder: 'border-pink-500 dark:border-pink-500',
  },
};

/**
 * Default color scheme for categories not explicitly mapped.
 * @type {Object}
 */
const DEFAULT_CATEGORY_COLOR = {
  bg: 'bg-surface-50 dark:bg-surface-900/10',
  border: 'border-surface-200 dark:border-surface-700',
  text: 'text-surface-600 dark:text-surface-400',
  selectedBg: 'bg-horizon-50 dark:bg-horizon-900/30',
  selectedBorder: 'border-horizon-500 dark:border-horizon-500',
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Get color classes for a category.
 * @param {string} category
 * @returns {Object}
 */
const getCategoryColor = (category) => {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
};

/**
 * Get icon component for a category.
 * @param {string} category
 * @returns {import('react').ElementType}
 */
const getCategoryIcon = (category) => {
  return CATEGORY_ICONS[category] || Wrench;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Individual tool card component.
 */
function ToolCard({ tool, isSelected, onToggle, colors, disabled }) {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onToggle(tool.id, tool.category);
    }
  }, [tool.id, tool.category, onToggle, disabled]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        onToggle(tool.id, tool.category);
      }
    },
    [tool.id, tool.category, onToggle, disabled],
  );

  return (
    <div
      role="checkbox"
      tabIndex={0}
      aria-checked={isSelected}
      aria-label={`Select ${tool.name}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'group relative flex cursor-pointer flex-col rounded-lg border-2 p-4 transition-all duration-200',
        disabled && 'pointer-events-none opacity-50',
        isSelected
          ? clsx(colors.selectedBg, colors.selectedBorder, 'ring-1 ring-opacity-30')
          : clsx(
              'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600',
            ),
      )}
    >
      {/* Selection indicator */}
      <div
        className={clsx(
          'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200',
          isSelected
            ? 'border-horizon-500 bg-horizon-500 text-white'
            : 'border-surface-300 bg-white dark:border-surface-600 dark:bg-surface-800',
        )}
      >
        {isSelected && <Check size={12} />}
      </div>

      {/* Tool name */}
      <h4 className="pr-6 text-sm font-semibold text-surface-900 dark:text-surface-100">
        {tool.name}
      </h4>

      {/* Tool description */}
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
        {tool.description}
      </p>
    </div>
  );
}

ToolCard.propTypes = {
  tool: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  colors: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
};

/**
 * Category section component with collapsible tool list.
 */
function CategorySection({
  category,
  tools,
  selectedToolIds,
  onToggleTool,
  isExpanded,
  onToggleExpand,
  disabled,
}) {
  const Icon = getCategoryIcon(category);
  const colors = getCategoryColor(category);

  const selectedCount = useMemo(() => {
    return tools.filter((t) => selectedToolIds.has(t.id)).length;
  }, [tools, selectedToolIds]);

  const handleToggleExpand = useCallback(() => {
    onToggleExpand(category);
  }, [category, onToggleExpand]);

  return (
    <div className="rounded-xl border border-surface-200 bg-white transition-shadow duration-200 dark:border-surface-700 dark:bg-surface-800">
      {/* Category header */}
      <button
        type="button"
        onClick={handleToggleExpand}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors duration-200 hover:bg-surface-50 dark:hover:bg-surface-700/50"
      >
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              colors.bg,
            )}
          >
            <Icon size={18} className={colors.text} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {category}
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {tools.length} {tools.length === 1 ? 'tool' : 'tools'} available
              {selectedCount > 0 && (
                <span className="ml-1.5 font-medium text-horizon-600 dark:text-horizon-400">
                  · {selectedCount} selected
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Badge variant="horizon" size="sm">
              {selectedCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp size={18} className="text-surface-400 dark:text-surface-500" />
          ) : (
            <ChevronDown size={18} className="text-surface-400 dark:text-surface-500" />
          )}
        </div>
      </button>

      {/* Tools grid */}
      {isExpanded && (
        <div className="border-t border-surface-200 px-5 py-4 dark:border-surface-700">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isSelected={selectedToolIds.has(tool.id)}
                onToggle={onToggleTool}
                colors={colors}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

CategorySection.propTypes = {
  category: PropTypes.string.isRequired,
  tools: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      description: PropTypes.string,
    }),
  ).isRequired,
  selectedToolIds: PropTypes.instanceOf(Set).isRequired,
  onToggleTool: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

/**
 * Selected toolchain summary panel.
 */
function ToolchainSummary({ selections, onRemove, disabled }) {
  if (!selections || selections.length === 0) {
    return null;
  }

  // Group selections by category
  const grouped = useMemo(() => {
    const map = {};
    selections.forEach((sel) => {
      const cat = sel.category || 'Other';
      if (!map[cat]) {
        map[cat] = [];
      }
      map[cat].push(sel);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [selections]);

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
      <div className="mb-3 flex items-center gap-2">
        <Info size={16} className="text-horizon-500" />
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          Selected Toolchain Summary
        </h4>
        <Badge variant="horizon" size="sm">
          {selections.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {grouped.map(([category, tools]) => {
          const colors = getCategoryColor(category);
          const Icon = getCategoryIcon(category);

          return (
            <div key={category}>
              <div className="mb-1.5 flex items-center gap-2">
                <Icon size={14} className={colors.text} />
                <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
                  {category}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tools.map((tool) => (
                  <span
                    key={tool.toolId}
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                      colors.selectedBg,
                      colors.text,
                    )}
                  >
                    {tool.toolName}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => onRemove(tool.toolId, tool.category)}
                        className="ml-0.5 flex-shrink-0 rounded-full p-0.5 transition-colors duration-150 hover:bg-surface-200 dark:hover:bg-surface-700"
                        aria-label={`Remove ${tool.toolName}`}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

ToolchainSummary.propTypes = {
  selections: PropTypes.arrayOf(
    PropTypes.shape({
      toolId: PropTypes.string.isRequired,
      toolName: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      configured: PropTypes.bool,
    }),
  ).isRequired,
  onRemove: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Toolchain selection component organized by category.
 * Each category shows available tools as selectable cards with descriptions.
 * Supports multi-select within categories and shows a selected toolchain summary.
 *
 * @param {Object} props
 * @param {Array<Object>} [props.value=[]] - Controlled selected toolchain array.
 *   Each entry: `{ category: string, tool: string, configured?: boolean }`.
 * @param {Function} [props.onChange] - Callback when selections change.
 *   Receives the updated array of `{ category, tool, configured }` objects.
 * @param {string[]} [props.categories] - Specific categories to display. When omitted, all categories are shown.
 * @param {boolean} [props.showSummary=true] - Whether to display the selected toolchain summary panel.
 * @param {boolean} [props.disabled=false] - Whether all selections are disabled.
 * @param {boolean} [props.expandAll=false] - Whether all categories start expanded.
 * @param {string} [props.error] - Error message to display below the selector.
 * @param {string} [props.hint] - Hint text displayed below the selector.
 * @param {string} [props.label] - Label text displayed above the selector.
 * @param {boolean} [props.required=false] - Whether the field is required.
 * @param {string} [props.className] - Additional CSS classes for the outer container.
 * @returns {import('react').ReactElement}
 */
export default function ToolchainSelector({
  value = [],
  onChange,
  categories: filterCategories,
  showSummary = true,
  disabled = false,
  expandAll = false,
  error,
  hint,
  label,
  required = false,
  className,
}) {
  // -------------------------------------------------------------------------
  // Catalog data
  // -------------------------------------------------------------------------

  const catalogByCategory = useMemo(() => {
    return getCatalogByCategory();
  }, []);

  const allCategories = useMemo(() => {
    const cats = getAllCategories();
    if (Array.isArray(filterCategories) && filterCategories.length > 0) {
      return cats.filter((cat) => filterCategories.includes(cat));
    }
    return cats;
  }, [filterCategories]);

  // -------------------------------------------------------------------------
  // Expanded state
  // -------------------------------------------------------------------------

  const [expandedCategories, setExpandedCategories] = useState(() => {
    if (expandAll) {
      return new Set(allCategories);
    }
    // Auto-expand categories that have selections
    const expanded = new Set();
    if (Array.isArray(value) && value.length > 0) {
      value.forEach((sel) => {
        if (sel && sel.category) {
          expanded.add(sel.category);
        }
      });
    }
    // Also expand the first category by default if nothing is selected
    if (expanded.size === 0 && allCategories.length > 0) {
      expanded.add(allCategories[0]);
    }
    return expanded;
  });

  // -------------------------------------------------------------------------
  // Selected tool IDs as a Set for fast lookup
  // -------------------------------------------------------------------------

  const selectedToolIds = useMemo(() => {
    const ids = new Set();
    if (Array.isArray(value)) {
      value.forEach((sel) => {
        if (sel && typeof sel === 'object') {
          // Support both { tool: 'toolName' } and { toolId: 'toolId' } formats
          // The catalog uses 'id' as the tool identifier
          // We need to find the tool by name or id
          const toolId = sel.toolId || sel.id;
          if (toolId) {
            ids.add(toolId);
          } else if (sel.tool && typeof sel.tool === 'string') {
            // Find the tool in the catalog by name
            const found = TOOLCHAIN_CATALOG.find(
              (t) => t.name === sel.tool || t.id === sel.tool,
            );
            if (found) {
              ids.add(found.id);
            }
          }
        }
      });
    }
    return ids;
  }, [value]);

  // -------------------------------------------------------------------------
  // Build selections array for summary
  // -------------------------------------------------------------------------

  const selectionsForSummary = useMemo(() => {
    const result = [];
    if (Array.isArray(value)) {
      value.forEach((sel) => {
        if (!sel || typeof sel !== 'object') {
          return;
        }
        const toolId = sel.toolId || sel.id;
        let catalogTool = null;

        if (toolId) {
          catalogTool = TOOLCHAIN_CATALOG.find((t) => t.id === toolId);
        } else if (sel.tool && typeof sel.tool === 'string') {
          catalogTool = TOOLCHAIN_CATALOG.find(
            (t) => t.name === sel.tool || t.id === sel.tool,
          );
        }

        if (catalogTool) {
          result.push({
            toolId: catalogTool.id,
            toolName: catalogTool.name,
            category: catalogTool.category,
            configured: sel.configured !== false,
          });
        } else {
          // Fallback for tools not in catalog
          result.push({
            toolId: toolId || sel.tool || 'unknown',
            toolName: sel.tool || sel.toolName || 'Unknown Tool',
            category: sel.category || 'Other',
            configured: sel.configured !== false,
          });
        }
      });
    }
    return result;
  }, [value]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleToggleExpand = useCallback((category) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleToggleTool = useCallback(
    (toolId, category) => {
      if (disabled) {
        return;
      }

      const catalogTool = TOOLCHAIN_CATALOG.find((t) => t.id === toolId);
      if (!catalogTool) {
        return;
      }

      const currentSelections = Array.isArray(value) ? [...value] : [];

      // Check if tool is already selected
      const existingIndex = currentSelections.findIndex((sel) => {
        if (!sel || typeof sel !== 'object') {
          return false;
        }
        const selToolId = sel.toolId || sel.id;
        if (selToolId === toolId) {
          return true;
        }
        if (sel.tool && (sel.tool === catalogTool.name || sel.tool === catalogTool.id)) {
          return true;
        }
        return false;
      });

      let newSelections;

      if (existingIndex >= 0) {
        // Remove the tool
        newSelections = [
          ...currentSelections.slice(0, existingIndex),
          ...currentSelections.slice(existingIndex + 1),
        ];
      } else {
        // Add the tool
        newSelections = [
          ...currentSelections,
          {
            category: catalogTool.category,
            tool: catalogTool.name,
            toolId: catalogTool.id,
            configured: true,
          },
        ];
      }

      if (typeof onChange === 'function') {
        onChange(newSelections);
      }
    },
    [value, onChange, disabled],
  );

  const handleRemoveTool = useCallback(
    (toolId, _category) => {
      handleToggleTool(toolId, _category);
    },
    [handleToggleTool],
  );

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const hasError = error && typeof error === 'string' && error.trim().length > 0;
  const totalSelected = selectedToolIds.size;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Label */}
      {label && (
        <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {/* Header info */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-surface-500 dark:text-surface-400">
          Select tools for each category to build your application toolchain.
        </p>
        {totalSelected > 0 && (
          <Badge variant="horizon" size="sm">
            {totalSelected} {totalSelected === 1 ? 'tool' : 'tools'} selected
          </Badge>
        )}
      </div>

      {/* Category sections */}
      <div className="space-y-3">
        {allCategories.map((category) => {
          const tools = catalogByCategory[category] || [];
          if (tools.length === 0) {
            return null;
          }

          return (
            <CategorySection
              key={category}
              category={category}
              tools={tools}
              selectedToolIds={selectedToolIds}
              onToggleTool={handleToggleTool}
              isExpanded={expandedCategories.has(category)}
              onToggleExpand={handleToggleExpand}
              disabled={disabled}
            />
          );
        })}
      </div>

      {/* Selected toolchain summary */}
      {showSummary && selectionsForSummary.length > 0 && (
        <div className="mt-4">
          <ToolchainSummary
            selections={selectionsForSummary}
            onRemove={handleRemoveTool}
            disabled={disabled}
          />
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Hint text */}
      {!hasError && hint && typeof hint === 'string' && hint.trim().length > 0 && (
        <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">{hint}</p>
      )}
    </div>
  );
}

ToolchainSelector.propTypes = {
  value: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string,
      tool: PropTypes.string,
      toolId: PropTypes.string,
      id: PropTypes.string,
      toolName: PropTypes.string,
      configured: PropTypes.bool,
    }),
  ),
  onChange: PropTypes.func,
  categories: PropTypes.arrayOf(PropTypes.string),
  showSummary: PropTypes.bool,
  disabled: PropTypes.bool,
  expandAll: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  label: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
};