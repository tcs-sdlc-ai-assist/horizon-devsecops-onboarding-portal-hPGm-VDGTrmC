/**
 * Reusable data table component for Horizon DevSecOps Portal
 * Supports sortable columns, pagination, row selection, search/filter,
 * empty state, and loading skeleton. Accepts columns config and data array props.
 * @module components/common/Table
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  Inbox,
} from 'lucide-react';
import { PAGINATION } from '../../constants/constants.js';

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

/**
 * CSS class mappings for each table density.
 * @type {Object<string, { cell: string, header: string }>}
 */
const DENSITY_CLASSES = {
  compact: {
    cell: 'px-3 py-1.5 text-xs',
    header: 'px-3 py-2 text-xs',
  },
  normal: {
    cell: 'px-4 py-3 text-sm',
    header: 'px-4 py-3 text-xs',
  },
  comfortable: {
    cell: 'px-5 py-4 text-sm',
    header: 'px-5 py-3.5 text-xs',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Loading skeleton rows for the table body.
 */
function TableSkeleton({ columns, rows, density }) {
  const densityConfig = DENSITY_CLASSES[density] || DENSITY_CLASSES.normal;

  return (
    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`}>
          {columns.map((col, colIndex) => (
            <td
              key={`skeleton-cell-${rowIndex}-${colIndex}`}
              className={clsx(densityConfig.cell)}
            >
              <div className="h-4 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

TableSkeleton.propTypes = {
  columns: PropTypes.array.isRequired,
  rows: PropTypes.number.isRequired,
  density: PropTypes.string.isRequired,
};

/**
 * Empty state component displayed when the table has no data.
 */
function TableEmptyState({ message, colSpan }) {
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan} className="px-4 py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
              <Inbox size={24} className="text-surface-400 dark:text-surface-500" />
            </div>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
              {message}
            </p>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

TableEmptyState.propTypes = {
  message: PropTypes.string.isRequired,
  colSpan: PropTypes.number.isRequired,
};

/**
 * Search input for the table toolbar.
 */
function TableSearch({ value, onChange, onClear, placeholder }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClear();
      }
    },
    [onClear],
  );

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search size={14} className="text-surface-400 dark:text-surface-500" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-surface-300 bg-white py-1.5 pl-9 pr-8 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500 sm:w-64"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

TableSearch.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

/**
 * Sort indicator icon for column headers.
 */
function SortIcon({ direction }) {
  if (direction === 'asc') {
    return <ArrowUp size={14} className="flex-shrink-0 text-horizon-500" />;
  }
  if (direction === 'desc') {
    return <ArrowDown size={14} className="flex-shrink-0 text-horizon-500" />;
  }
  return <ArrowUpDown size={14} className="flex-shrink-0 text-surface-300 dark:text-surface-600" />;
}

SortIcon.propTypes = {
  direction: PropTypes.oneOf(['asc', 'desc', null]),
};

/**
 * Pagination controls for the table footer.
 */
function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-surface-200 px-4 py-3 dark:border-surface-700 sm:flex-row">
      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="table-page-size"
          className="text-xs text-surface-500 dark:text-surface-400"
        >
          Rows per page:
        </label>
        <select
          id="table-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-md border border-surface-300 bg-white px-2 py-1 text-xs text-surface-700 shadow-sm focus:border-horizon-500 focus:outline-none focus:ring-1 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-xs text-surface-500 dark:text-surface-400">
          {startItem}–{endItem} of {totalItems}
        </span>
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-md text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
          title="First page"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-md text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        {generatePageNumbers(currentPage, totalPages).map((page, idx) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-8 w-8 items-center justify-center text-xs text-surface-400 dark:text-surface-500"
              >
                …
              </span>
            );
          }

          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors duration-200',
                page === currentPage
                  ? 'bg-horizon-50 text-horizon-700 dark:bg-horizon-900/30 dark:text-horizon-300'
                  : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200',
              )}
            >
              {page}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
          title="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

TablePagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number).isRequired,
  onPageChange: PropTypes.func.isRequired,
  onPageSizeChange: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate an array of page numbers with ellipsis for pagination display.
 * @param {number} current - Current page number.
 * @param {number} total - Total number of pages.
 * @returns {Array<number|string>}
 */
const generatePageNumbers = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];

  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }

  return pages;
};

/**
 * Default sort comparator for table data.
 * @param {*} a - First value.
 * @param {*} b - Second value.
 * @param {string} order - 'asc' or 'desc'.
 * @returns {number}
 */
const defaultCompare = (a, b, order) => {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  let comparison = 0;
  if (typeof a === 'string' && typeof b === 'string') {
    comparison = a.localeCompare(b, undefined, { sensitivity: 'base' });
  } else if (typeof a === 'number' && typeof b === 'number') {
    comparison = a - b;
  } else {
    comparison = String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
  }

  return order === 'desc' ? -comparison : comparison;
};

/**
 * Default search matcher — checks if any searchable column value contains the query.
 * @param {Object} row - The data row.
 * @param {Array<Object>} columns - Column definitions.
 * @param {string} query - Search query string.
 * @returns {boolean}
 */
const defaultSearchMatcher = (row, columns, query) => {
  if (!query || query.trim().length === 0) {
    return true;
  }

  const lowerQuery = query.trim().toLowerCase();

  return columns.some((col) => {
    if (col.searchable === false) {
      return false;
    }

    const value = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : null;

    if (value === null || value === undefined) {
      return false;
    }

    return String(value).toLowerCase().includes(lowerQuery);
  });
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable data table component with sortable columns, pagination,
 * row selection, search/filter, empty state, and loading skeleton.
 *
 * @param {Object} props
 * @param {Array<Object>} props.columns - Column configuration array.
 * @param {string} props.columns[].id - Unique column identifier.
 * @param {string} props.columns[].header - Column header text.
 * @param {string|Function} [props.columns[].accessor] - Data accessor key or function.
 * @param {Function} [props.columns[].cell] - Custom cell render function receiving (value, row, rowIndex).
 * @param {boolean} [props.columns[].sortable=true] - Whether the column is sortable.
 * @param {boolean} [props.columns[].searchable=true] - Whether the column is included in search.
 * @param {string} [props.columns[].align='left'] - Text alignment: 'left', 'center', 'right'.
 * @param {string} [props.columns[].width] - Optional CSS width (e.g. '120px', '20%').
 * @param {Function} [props.columns[].sortFn] - Custom sort function (a, b, order) => number.
 * @param {Array<Object>} props.data - Array of data row objects.
 * @param {Function} [props.getRowId] - Function to extract a unique ID from a row. Defaults to row.id or index.
 * @param {boolean} [props.loading=false] - Whether the table is in a loading state.
 * @param {boolean} [props.searchable=true] - Whether to show the search input.
 * @param {string} [props.searchPlaceholder='Search...'] - Placeholder text for the search input.
 * @param {boolean} [props.selectable=false] - Whether rows are selectable via checkboxes.
 * @param {Array<string>} [props.selectedRows=[]] - Array of selected row IDs (controlled).
 * @param {Function} [props.onSelectionChange] - Callback when selection changes. Receives array of selected row IDs.
 * @param {boolean} [props.paginated=true] - Whether to enable pagination.
 * @param {number} [props.pageSize] - Initial page size. Defaults to PAGINATION.DEFAULT_PAGE_SIZE.
 * @param {number[]} [props.pageSizeOptions] - Available page size options.
 * @param {string} [props.defaultSortColumn] - Column ID to sort by initially.
 * @param {string} [props.defaultSortOrder='asc'] - Initial sort order: 'asc' or 'desc'.
 * @param {string} [props.emptyMessage='No data available.'] - Message shown when table is empty.
 * @param {string} [props.noResultsMessage='No results match your search.'] - Message shown when search yields no results.
 * @param {'compact'|'normal'|'comfortable'} [props.density='normal'] - Table row density.
 * @param {boolean} [props.striped=false] - Whether to apply striped row styling.
 * @param {boolean} [props.hoverable=true] - Whether rows have a hover effect.
 * @param {Function} [props.onRowClick] - Callback when a row is clicked. Receives (row, rowIndex).
 * @param {import('react').ReactNode} [props.toolbar] - Additional toolbar content rendered next to search.
 * @param {string} [props.className] - Additional CSS classes for the table container.
 * @returns {import('react').ReactElement}
 */
export default function Table({
  columns,
  data,
  getRowId,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  selectable = false,
  selectedRows: controlledSelectedRows,
  onSelectionChange,
  paginated = true,
  pageSize: initialPageSize,
  pageSizeOptions = PAGINATION.PAGE_SIZE_OPTIONS,
  defaultSortColumn,
  defaultSortOrder = 'asc',
  emptyMessage = 'No data available.',
  noResultsMessage = 'No results match your search.',
  density = 'normal',
  striped = false,
  hoverable = true,
  onRowClick,
  toolbar,
  className,
}) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState(defaultSortColumn || null);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);
  const [currentPage, setCurrentPage] = useState(PAGINATION.DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(
    initialPageSize || PAGINATION.DEFAULT_PAGE_SIZE,
  );
  const [internalSelectedRows, setInternalSelectedRows] = useState([]);

  const selectedRows = controlledSelectedRows !== undefined
    ? controlledSelectedRows
    : internalSelectedRows;

  const setSelectedRows = useCallback(
    (newSelection) => {
      const resolved = typeof newSelection === 'function'
        ? newSelection(selectedRows)
        : newSelection;

      if (controlledSelectedRows !== undefined) {
        if (typeof onSelectionChange === 'function') {
          onSelectionChange(resolved);
        }
      } else {
        setInternalSelectedRows(resolved);
        if (typeof onSelectionChange === 'function') {
          onSelectionChange(resolved);
        }
      }
    },
    [controlledSelectedRows, selectedRows, onSelectionChange],
  );

  // -------------------------------------------------------------------------
  // Row ID resolver
  // -------------------------------------------------------------------------

  const resolveRowId = useCallback(
    (row, index) => {
      if (typeof getRowId === 'function') {
        return String(getRowId(row));
      }
      if (row && row.id !== undefined && row.id !== null) {
        return String(row.id);
      }
      return String(index);
    },
    [getRowId],
  );

  // -------------------------------------------------------------------------
  // Filtered data
  // -------------------------------------------------------------------------

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) {
      return [];
    }

    if (!searchQuery || searchQuery.trim().length === 0) {
      return data;
    }

    return data.filter((row) => defaultSearchMatcher(row, columns, searchQuery));
  }, [data, columns, searchQuery]);

  // -------------------------------------------------------------------------
  // Sorted data
  // -------------------------------------------------------------------------

  const sortedData = useMemo(() => {
    if (!sortColumn) {
      return filteredData;
    }

    const col = columns.find((c) => c.id === sortColumn);
    if (!col) {
      return filteredData;
    }

    const accessor = col.accessor;
    const sortFn = col.sortFn;

    return [...filteredData].sort((rowA, rowB) => {
      const a = typeof accessor === 'function' ? accessor(rowA) : (accessor ? rowA[accessor] : null);
      const b = typeof accessor === 'function' ? accessor(rowB) : (accessor ? rowB[accessor] : null);

      if (typeof sortFn === 'function') {
        return sortFn(a, b, sortOrder);
      }

      return defaultCompare(a, b, sortOrder);
    });
  }, [filteredData, sortColumn, sortOrder, columns]);

  // -------------------------------------------------------------------------
  // Paginated data
  // -------------------------------------------------------------------------

  const totalItems = sortedData.length;
  const totalPages = paginated ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  // Clamp current page
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    if (!paginated) {
      return sortedData;
    }

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, paginated, currentPage, pageSize]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSort = useCallback(
    (columnId) => {
      const col = columns.find((c) => c.id === columnId);
      if (!col || col.sortable === false) {
        return;
      }

      if (sortColumn === columnId) {
        if (sortOrder === 'asc') {
          setSortOrder('desc');
        } else {
          setSortColumn(null);
          setSortOrder('asc');
        }
      } else {
        setSortColumn(columnId);
        setSortOrder('asc');
      }
    },
    [columns, sortColumn, sortOrder],
  );

  const handlePageChange = useCallback(
    (page) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(clamped);
    },
    [totalPages],
  );

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleSelectAll = useCallback(
    (e) => {
      if (e.target.checked) {
        const allIds = paginatedData.map((row, index) => resolveRowId(row, (currentPage - 1) * pageSize + index));
        setSelectedRows((prev) => {
          const prevSet = new Set(prev);
          allIds.forEach((id) => prevSet.add(id));
          return [...prevSet];
        });
      } else {
        const pageIds = new Set(
          paginatedData.map((row, index) => resolveRowId(row, (currentPage - 1) * pageSize + index)),
        );
        setSelectedRows((prev) => prev.filter((id) => !pageIds.has(id)));
      }
    },
    [paginatedData, resolveRowId, setSelectedRows, currentPage, pageSize],
  );

  const handleSelectRow = useCallback(
    (rowId) => {
      setSelectedRows((prev) => {
        if (prev.includes(rowId)) {
          return prev.filter((id) => id !== rowId);
        }
        return [...prev, rowId];
      });
    },
    [setSelectedRows],
  );

  const handleRowClick = useCallback(
    (row, rowIndex, e) => {
      // Don't trigger row click when clicking on checkbox
      if (e.target.type === 'checkbox' || e.target.closest('input[type="checkbox"]')) {
        return;
      }

      if (typeof onRowClick === 'function') {
        onRowClick(row, rowIndex);
      }
    },
    [onRowClick],
  );

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const densityConfig = DENSITY_CLASSES[density] || DENSITY_CLASSES.normal;

  const allPageRowsSelected = useMemo(() => {
    if (paginatedData.length === 0) {
      return false;
    }

    const selectedSet = new Set(selectedRows);
    return paginatedData.every((row, index) =>
      selectedSet.has(resolveRowId(row, (currentPage - 1) * pageSize + index)),
    );
  }, [paginatedData, selectedRows, resolveRowId, currentPage, pageSize]);

  const somePageRowsSelected = useMemo(() => {
    if (paginatedData.length === 0) {
      return false;
    }

    const selectedSet = new Set(selectedRows);
    return paginatedData.some((row, index) =>
      selectedSet.has(resolveRowId(row, (currentPage - 1) * pageSize + index)),
    );
  }, [paginatedData, selectedRows, resolveRowId, currentPage, pageSize]);

  const visibleColumns = useMemo(() => {
    const cols = [];

    if (selectable) {
      cols.push({
        id: '__selection__',
        header: null,
        accessor: null,
        sortable: false,
        searchable: false,
        align: 'center',
        width: '40px',
      });
    }

    if (Array.isArray(columns)) {
      cols.push(...columns);
    }

    return cols;
  }, [columns, selectable]);

  const isSearchActive = searchQuery.trim().length > 0;
  const hasData = Array.isArray(data) && data.length > 0;
  const hasFilteredData = filteredData.length > 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800',
        className,
      )}
    >
      {/* Toolbar */}
      {(searchable || toolbar || (selectable && selectedRows.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-200 px-4 py-3 dark:border-surface-700">
          <div className="flex items-center gap-3">
            {searchable && (
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={handleSearchClear}
                placeholder={searchPlaceholder}
              />
            )}
            {selectable && selectedRows.length > 0 && (
              <span className="text-xs font-medium text-horizon-600 dark:text-horizon-400">
                {selectedRows.length} selected
              </span>
            )}
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-full table-auto">
          {/* Header */}
          <thead className="border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-900/50">
            <tr>
              {visibleColumns.map((col) => {
                const isSelectionCol = col.id === '__selection__';
                const isSortable = !isSelectionCol && col.sortable !== false;
                const isCurrentSort = sortColumn === col.id;
                const currentDirection = isCurrentSort ? sortOrder : null;
                const alignClass =
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                      ? 'text-right'
                      : 'text-left';

                return (
                  <th
                    key={col.id}
                    className={clsx(
                      densityConfig.header,
                      'font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400',
                      alignClass,
                      isSortable && 'cursor-pointer select-none transition-colors duration-200 hover:text-surface-700 dark:hover:text-surface-200',
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={isSortable ? () => handleSort(col.id) : undefined}
                  >
                    {isSelectionCol ? (
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={allPageRowsSelected}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = somePageRowsSelected && !allPageRowsSelected;
                            }
                          }}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded border-surface-300 text-horizon-600 focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600"
                          aria-label="Select all rows"
                        />
                      </div>
                    ) : (
                      <div
                        className={clsx(
                          'flex items-center gap-1.5',
                          col.align === 'center' && 'justify-center',
                          col.align === 'right' && 'justify-end',
                        )}
                      >
                        <span>{col.header}</span>
                        {isSortable && <SortIcon direction={currentDirection} />}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          {loading ? (
            <TableSkeleton
              columns={visibleColumns}
              rows={pageSize}
              density={density}
            />
          ) : !hasData ? (
            <TableEmptyState
              message={emptyMessage}
              colSpan={visibleColumns.length}
            />
          ) : !hasFilteredData ? (
            <TableEmptyState
              message={noResultsMessage}
              colSpan={visibleColumns.length}
            />
          ) : (
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {paginatedData.map((row, rowIndex) => {
                const globalIndex = paginated
                  ? (currentPage - 1) * pageSize + rowIndex
                  : rowIndex;
                const rowId = resolveRowId(row, globalIndex);
                const isSelected = selectedRows.includes(rowId);

                return (
                  <tr
                    key={rowId}
                    onClick={(e) => handleRowClick(row, globalIndex, e)}
                    className={clsx(
                      'transition-colors duration-150',
                      hoverable && 'hover:bg-surface-50 dark:hover:bg-surface-700/50',
                      striped && rowIndex % 2 === 1 && 'bg-surface-50/50 dark:bg-surface-900/20',
                      isSelected && 'bg-horizon-50/50 dark:bg-horizon-900/10',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {visibleColumns.map((col) => {
                      const isSelectionCol = col.id === '__selection__';
                      const alignClass =
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                            ? 'text-right'
                            : 'text-left';

                      if (isSelectionCol) {
                        return (
                          <td
                            key={col.id}
                            className={clsx(densityConfig.cell, 'text-center')}
                            style={col.width ? { width: col.width } : undefined}
                          >
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectRow(rowId)}
                                className="h-4 w-4 rounded border-surface-300 text-horizon-600 focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600"
                                aria-label={`Select row ${rowId}`}
                              />
                            </div>
                          </td>
                        );
                      }

                      const rawValue = col.accessor
                        ? typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : row[col.accessor]
                        : null;

                      const cellContent = typeof col.cell === 'function'
                        ? col.cell(rawValue, row, globalIndex)
                        : rawValue !== null && rawValue !== undefined
                          ? String(rawValue)
                          : '';

                      return (
                        <td
                          key={col.id}
                          className={clsx(
                            densityConfig.cell,
                            alignClass,
                            'text-surface-700 dark:text-surface-300',
                          )}
                          style={col.width ? { width: col.width } : undefined}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination */}
      {paginated && !loading && hasFilteredData && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}

Table.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      accessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
      cell: PropTypes.func,
      sortable: PropTypes.bool,
      searchable: PropTypes.bool,
      align: PropTypes.oneOf(['left', 'center', 'right']),
      width: PropTypes.string,
      sortFn: PropTypes.func,
    }),
  ).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  getRowId: PropTypes.func,
  loading: PropTypes.bool,
  searchable: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  selectable: PropTypes.bool,
  selectedRows: PropTypes.arrayOf(PropTypes.string),
  onSelectionChange: PropTypes.func,
  paginated: PropTypes.bool,
  pageSize: PropTypes.number,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  defaultSortColumn: PropTypes.string,
  defaultSortOrder: PropTypes.oneOf(['asc', 'desc']),
  emptyMessage: PropTypes.string,
  noResultsMessage: PropTypes.string,
  density: PropTypes.oneOf(['compact', 'normal', 'comfortable']),
  striped: PropTypes.bool,
  hoverable: PropTypes.bool,
  onRowClick: PropTypes.func,
  toolbar: PropTypes.node,
  className: PropTypes.string,
};