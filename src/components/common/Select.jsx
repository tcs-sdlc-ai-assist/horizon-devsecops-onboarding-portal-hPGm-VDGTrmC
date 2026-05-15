/**
 * Reusable select dropdown component for Horizon DevSecOps Portal
 * Supports label, placeholder, options, search/filter, multi-select,
 * error state, and disabled state. Used for domain/portfolio/application/
 * toolchain selection throughout the portal.
 * @module components/common/Select
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { Check, ChevronDown, Search, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each select size.
 * @type {Object<string, { trigger: string, text: string, iconSize: number }>}
 */
const SIZE_CONFIG = {
  sm: {
    trigger: 'px-3 py-1.5',
    text: 'text-xs',
    iconSize: 14,
  },
  md: {
    trigger: 'px-3 py-2',
    text: 'text-sm',
    iconSize: 16,
  },
  lg: {
    trigger: 'px-4 py-2.5',
    text: 'text-base',
    iconSize: 18,
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Search input rendered inside the dropdown panel.
 */
function DropdownSearch({ value, onChange, onClear, placeholder }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClear();
      }
      // Prevent the dropdown from closing when typing
      e.stopPropagation();
    },
    [onClear],
  );

  return (
    <div className="relative border-b border-surface-200 px-3 py-2 dark:border-surface-700">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <Search size={14} className="text-surface-400 dark:text-surface-500" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="block w-full bg-transparent py-0.5 pl-6 pr-6 text-sm text-surface-900 placeholder-surface-400 outline-none dark:text-surface-100 dark:placeholder-surface-500"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-3 flex items-center text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

DropdownSearch.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

/**
 * Individual option item rendered inside the dropdown list.
 */
function OptionItem({ option, isSelected, isMulti, onSelect, sizeConfig }) {
  const handleClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(option);
    },
    [option, onSelect],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onSelect(option);
      }
    },
    [option, onSelect],
  );

  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'flex cursor-pointer items-center justify-between px-3 py-2 transition-colors duration-150',
        sizeConfig.text,
        isSelected
          ? 'bg-horizon-50 text-horizon-700 dark:bg-horizon-900/20 dark:text-horizon-300'
          : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700/50',
        option.disabled && 'pointer-events-none opacity-40',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {isMulti && (
          <div
            className={clsx(
              'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors duration-150',
              isSelected
                ? 'border-horizon-500 bg-horizon-500 text-white'
                : 'border-surface-300 bg-white dark:border-surface-600 dark:bg-surface-800',
            )}
          >
            {isSelected && <Check size={12} />}
          </div>
        )}
        <span className="truncate">{option.label}</span>
        {option.description && (
          <span className="ml-1 truncate text-xs text-surface-400 dark:text-surface-500">
            {option.description}
          </span>
        )}
      </div>
      {!isMulti && isSelected && (
        <Check size={14} className="flex-shrink-0 text-horizon-500" />
      )}
    </div>
  );
}

OptionItem.propTypes = {
  option: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
    disabled: PropTypes.bool,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  isMulti: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  sizeConfig: PropTypes.object.isRequired,
};

/**
 * Empty state displayed when no options match the search query.
 */
function EmptyState({ message }) {
  return (
    <div className="px-3 py-6 text-center text-sm text-surface-500 dark:text-surface-400">
      {message}
    </div>
  );
}

EmptyState.propTypes = {
  message: PropTypes.string.isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable select dropdown component with label, placeholder, options,
 * search/filter, multi-select support, error state, and disabled state.
 *
 * @param {Object} props
 * @param {string} [props.id] - HTML id attribute for the trigger element.
 * @param {string} [props.label] - Label text displayed above the select.
 * @param {string} [props.placeholder='Select...'] - Placeholder text when no value is selected.
 * @param {Array<Object>} props.options - Array of option objects.
 * @param {string|number} props.options[].value - Unique option value.
 * @param {string} props.options[].label - Display label for the option.
 * @param {string} [props.options[].description] - Optional description text.
 * @param {boolean} [props.options[].disabled] - Whether the option is disabled.
 * @param {string|number|Array<string|number>|null} [props.value] - Currently selected value(s).
 *   For single select: a single value. For multi-select: an array of values.
 * @param {Function} props.onChange - Callback when selection changes.
 *   For single select: receives the selected value (or null when cleared).
 *   For multi-select: receives an array of selected values.
 * @param {boolean} [props.multiple=false] - Whether to enable multi-select mode.
 * @param {boolean} [props.searchable=false] - Whether to show a search/filter input in the dropdown.
 * @param {string} [props.searchPlaceholder='Search...'] - Placeholder for the search input.
 * @param {boolean} [props.clearable=false] - Whether to show a clear button when a value is selected.
 * @param {boolean} [props.disabled=false] - Whether the select is disabled.
 * @param {boolean} [props.required=false] - Whether the field is required.
 * @param {string} [props.error] - Error message to display below the select.
 * @param {string} [props.hint] - Hint text displayed below the select (hidden when error is present).
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Select size.
 * @param {boolean} [props.fullWidth=true] - Whether the select takes full container width.
 * @param {string} [props.emptyMessage='No options available.'] - Message shown when no options exist.
 * @param {string} [props.noResultsMessage='No results found.'] - Message shown when search yields no results.
 * @param {string} [props.className] - Additional CSS classes for the outer container.
 * @param {number} [props.maxDropdownHeight=240] - Maximum height of the dropdown panel in pixels.
 * @returns {import('react').ReactElement}
 */
export default function Select({
  id,
  label,
  placeholder = 'Select...',
  options,
  value,
  onChange,
  multiple = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  clearable = false,
  disabled = false,
  required = false,
  error,
  hint,
  size = 'md',
  fullWidth = true,
  emptyMessage = 'No options available.',
  noResultsMessage = 'No results found.',
  className,
  maxDropdownHeight = 240,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  // -------------------------------------------------------------------------
  // Resolve selected values into a Set for fast lookup
  // -------------------------------------------------------------------------

  const selectedValues = useMemo(() => {
    if (value === null || value === undefined) {
      return new Set();
    }

    if (multiple && Array.isArray(value)) {
      return new Set(value.map(String));
    }

    return new Set([String(value)]);
  }, [value, multiple]);

  // -------------------------------------------------------------------------
  // Filter options by search query
  // -------------------------------------------------------------------------

  const filteredOptions = useMemo(() => {
    if (!Array.isArray(options)) {
      return [];
    }

    if (!searchQuery || searchQuery.trim().length === 0) {
      return options;
    }

    const lowerQuery = searchQuery.trim().toLowerCase();

    return options.filter((option) => {
      const labelMatch =
        option.label && String(option.label).toLowerCase().includes(lowerQuery);
      const descMatch =
        option.description &&
        String(option.description).toLowerCase().includes(lowerQuery);
      const valueMatch =
        option.value !== null &&
        option.value !== undefined &&
        String(option.value).toLowerCase().includes(lowerQuery);
      return labelMatch || descMatch || valueMatch;
    });
  }, [options, searchQuery]);

  // -------------------------------------------------------------------------
  // Display text for the trigger
  // -------------------------------------------------------------------------

  const displayText = useMemo(() => {
    if (selectedValues.size === 0) {
      return null;
    }

    if (!Array.isArray(options)) {
      return null;
    }

    if (multiple) {
      const selectedOptions = options.filter((opt) =>
        selectedValues.has(String(opt.value)),
      );

      if (selectedOptions.length === 0) {
        return null;
      }

      if (selectedOptions.length === 1) {
        return selectedOptions[0].label;
      }

      return `${selectedOptions.length} selected`;
    }

    const selectedOption = options.find((opt) =>
      selectedValues.has(String(opt.value)),
    );

    return selectedOption ? selectedOption.label : null;
  }, [selectedValues, options, multiple]);

  // -------------------------------------------------------------------------
  // Close dropdown on outside click
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Keyboard handling on the trigger
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleToggle = useCallback(() => {
    if (disabled) {
      return;
    }

    setIsOpen((prev) => {
      if (prev) {
        setSearchQuery('');
      }
      return !prev;
    });
  }, [disabled]);

  const handleTriggerKeyDown = useCallback(
    (e) => {
      if (disabled) {
        return;
      }

      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
    },
    [disabled],
  );

  const handleSelectOption = useCallback(
    (option) => {
      if (option.disabled) {
        return;
      }

      if (multiple) {
        const optionValueStr = String(option.value);
        const currentValues = Array.isArray(value) ? [...value] : [];
        const currentStrValues = currentValues.map(String);

        if (currentStrValues.includes(optionValueStr)) {
          // Remove the value
          const newValues = currentValues.filter(
            (v) => String(v) !== optionValueStr,
          );
          if (typeof onChange === 'function') {
            onChange(newValues);
          }
        } else {
          // Add the value
          const newValues = [...currentValues, option.value];
          if (typeof onChange === 'function') {
            onChange(newValues);
          }
        }
      } else {
        if (typeof onChange === 'function') {
          onChange(option.value);
        }
        setIsOpen(false);
        setSearchQuery('');
      }
    },
    [multiple, value, onChange],
  );

  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (disabled) {
        return;
      }

      if (typeof onChange === 'function') {
        if (multiple) {
          onChange([]);
        } else {
          onChange(null);
        }
      }

      setSearchQuery('');
    },
    [disabled, multiple, onChange],
  );

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const hasValue = selectedValues.size > 0;
  const hasError = error && typeof error === 'string' && error.trim().length > 0;
  const hasOptions = Array.isArray(options) && options.length > 0;
  const hasFilteredOptions = filteredOptions.length > 0;
  const isSearchActive = searchQuery.trim().length > 0;

  // -------------------------------------------------------------------------
  // Selected tags for multi-select
  // -------------------------------------------------------------------------

  const selectedTags = useMemo(() => {
    if (!multiple || !hasValue || !Array.isArray(options)) {
      return [];
    }

    return options.filter((opt) => selectedValues.has(String(opt.value)));
  }, [multiple, hasValue, options, selectedValues]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative',
        isOpen && 'z-30',
        fullWidth && 'w-full',
        className,
      )}
    >
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-red-500">*</span>
          )}
        </label>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
        aria-invalid={hasError}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        className={clsx(
          'relative flex w-full items-center justify-between rounded-lg border bg-white text-left shadow-sm transition-all duration-200 focus:outline-none focus:ring-2',
          sizeConfig.trigger,
          sizeConfig.text,
          disabled && 'cursor-not-allowed opacity-50',
          hasError
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-900/50'
            : isOpen
              ? 'border-horizon-500 ring-2 ring-horizon-500/20 dark:border-horizon-500/50'
              : 'border-surface-300 focus:border-horizon-500 focus:ring-horizon-500/20 dark:border-surface-700',
          'dark:bg-surface-800/50',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {/* Multi-select tags (show up to 3) */}
          {multiple && selectedTags.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {selectedTags.slice(0, 3).map((tag) => (
                <span
                  key={tag.value}
                  className="inline-flex max-w-[120px] items-center gap-1 truncate rounded bg-horizon-50 px-1.5 py-0.5 text-2xs font-medium text-horizon-700 dark:bg-horizon-900/30 dark:text-horizon-400 dark:border dark:border-horizon-800/50"
                >
                  <span className="truncate">{tag.label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOption(tag);
                    }}
                    className="flex-shrink-0 text-horizon-400 hover:text-horizon-600 dark:text-horizon-500 dark:hover:text-horizon-300"
                    aria-label={`Remove ${tag.label}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {selectedTags.length > 3 && (
                <span className="text-2xs font-medium text-surface-500 dark:text-surface-400">
                  +{selectedTags.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <span
              className={clsx(
                'truncate',
                hasValue
                  ? 'text-surface-900 dark:text-surface-100'
                  : 'text-surface-400 dark:text-surface-500',
              )}
            >
              {displayText || placeholder}
            </span>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1 pl-2">
          {/* Clear button */}
          {clearable && hasValue && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClear(e);
                }
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full text-surface-400 transition-colors duration-150 hover:bg-surface-200 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300"
              aria-label="Clear selection"
            >
              <X size={12} />
            </span>
          )}

          {/* Chevron */}
          <ChevronDown
            size={sizeConfig.iconSize}
            className={clsx(
              'text-surface-400 transition-transform duration-200 dark:text-surface-500',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable={multiple}
          className="absolute z-[60] mt-1 w-full overflow-hidden rounded-lg border border-surface-200 bg-white shadow-elevated animate-fade-in dark:border-surface-700 dark:bg-surface-900"
        >
          {/* Search input */}
          {searchable && (
            <DropdownSearch
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={handleSearchClear}
              placeholder={searchPlaceholder}
            />
          )}

          {/* Options list */}
          <div
            className="overflow-y-auto scrollbar-thin"
            style={{ maxHeight: `${maxDropdownHeight}px` }}
          >
            {!hasOptions ? (
              <EmptyState message={emptyMessage} />
            ) : !hasFilteredOptions ? (
              <EmptyState message={noResultsMessage} />
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.has(String(option.value));

                return (
                  <OptionItem
                    key={option.value}
                    option={option}
                    isSelected={isSelected}
                    isMulti={multiple}
                    onSelect={handleSelectOption}
                    sizeConfig={sizeConfig}
                  />
                );
              })
            )}
          </div>

          {/* Multi-select footer */}
          {multiple && hasValue && (
            <div className="flex items-center justify-between border-t border-surface-200 px-3 py-2 dark:border-surface-700">
              <span className="text-xs text-surface-500 dark:text-surface-400">
                {selectedValues.size} selected
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Hint text */}
      {!hasError && hint && typeof hint === 'string' && hint.trim().length > 0 && (
        <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">{hint}</p>
      )}
    </div>
  );
}

Select.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
      disabled: PropTypes.bool,
    }),
  ).isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  ]),
  onChange: PropTypes.func.isRequired,
  multiple: PropTypes.bool,
  searchable: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  clearable: PropTypes.bool,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  emptyMessage: PropTypes.string,
  noResultsMessage: PropTypes.string,
  className: PropTypes.string,
  maxDropdownHeight: PropTypes.number,
};