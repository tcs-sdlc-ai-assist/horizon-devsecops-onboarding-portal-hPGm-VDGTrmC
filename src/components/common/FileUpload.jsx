/**
 * Reusable file upload component for Horizon DevSecOps Portal
 * Supports drag-and-drop zone, file type validation (CSV, Excel),
 * file size limit, progress indicator, preview of parsed data,
 * and error display. Used by admin upload and bulk import features.
 * @module components/common/FileUpload
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { parseCSV, parseExcel } from '../../utils/csvParser.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default maximum file size in bytes (10 MB).
 * @type {number}
 */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Accepted file extensions and their MIME types.
 * @type {Object<string, string[]>}
 */
const FILE_TYPE_MAP = {
  csv: [
    'text/csv',
    'text/plain',
    'application/csv',
    'application/vnd.ms-excel',
  ],
  excel: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
};

/**
 * File extension to display label mapping.
 * @type {Object<string, string>}
 */
const FILE_TYPE_LABELS = {
  csv: 'CSV',
  excel: 'Excel (.xlsx)',
};

// ---------------------------------------------------------------------------
// Size Formatting Helper
// ---------------------------------------------------------------------------

/**
 * Format bytes into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) {
    return '0 Bytes';
  }
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Drop zone area with drag-and-drop visual feedback.
 */
function DropZone({
  isDragging,
  disabled,
  acceptedTypes,
  maxFileSize,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onBrowseClick,
}) {
  const acceptedLabels = useMemo(() => {
    return acceptedTypes.map((type) => FILE_TYPE_LABELS[type] || type).join(', ');
  }, [acceptedTypes]);

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={clsx(
        'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-all duration-200',
        disabled && 'cursor-not-allowed opacity-50',
        isDragging
          ? 'border-horizon-500 bg-horizon-50 dark:border-horizon-400 dark:bg-horizon-900/20'
          : 'border-surface-300 bg-surface-50 hover:border-surface-400 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-900/50 dark:hover:border-surface-600 dark:hover:bg-surface-900',
      )}
    >
      <div
        className={clsx(
          'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-200',
          isDragging
            ? 'bg-horizon-100 dark:bg-horizon-900/30'
            : 'bg-surface-200 dark:bg-surface-700',
        )}
      >
        <Upload
          size={24}
          className={clsx(
            'transition-colors duration-200',
            isDragging
              ? 'text-horizon-600 dark:text-horizon-400'
              : 'text-surface-400 dark:text-surface-500',
          )}
        />
      </div>

      <p className="mb-1 text-sm font-medium text-surface-700 dark:text-surface-300">
        {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
      </p>
      <p className="mb-3 text-xs text-surface-500 dark:text-surface-400">or</p>

      <button
        type="button"
        onClick={onBrowseClick}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-horizon-700 focus:outline-none focus:ring-2 focus:ring-horizon-500 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Upload size={16} />
        Browse Files
      </button>

      <div className="mt-4 flex flex-col items-center gap-1">
        <p className="text-xs text-surface-400 dark:text-surface-500">
          Accepted formats: {acceptedLabels}
        </p>
        <p className="text-xs text-surface-400 dark:text-surface-500">
          Maximum file size: {formatFileSize(maxFileSize)}
        </p>
      </div>
    </div>
  );
}

DropZone.propTypes = {
  isDragging: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  acceptedTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
  maxFileSize: PropTypes.number.isRequired,
  onDragEnter: PropTypes.func.isRequired,
  onDragLeave: PropTypes.func.isRequired,
  onDragOver: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onBrowseClick: PropTypes.func.isRequired,
};

/**
 * Selected file info display with remove action.
 */
function FileInfo({ file, status, onRemove, disabled }) {
  const isCSV = file && file.name && (file.name.endsWith('.csv') || file.name.endsWith('.txt'));
  const Icon = isCSV ? FileText : FileSpreadsheet;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-800 dark:bg-surface-900/50">
      <div
        className={clsx(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
          status === 'error'
            ? 'bg-red-100 dark:bg-red-900/30'
            : status === 'success'
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-horizon-50 dark:bg-horizon-900/30',
        )}
      >
        <Icon
          size={20}
          className={clsx(
            status === 'error'
              ? 'text-red-600 dark:text-red-400'
              : status === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-horizon-600 dark:text-horizon-400',
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
          {file.name}
        </p>
        <p className="text-xs text-surface-500 dark:text-surface-400">
          {formatFileSize(file.size)}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {status === 'success' && (
          <CheckCircle2 size={18} className="text-green-500 dark:text-green-400" />
        )}
        {status === 'error' && (
          <AlertCircle size={18} className="text-red-500 dark:text-red-400" />
        )}
        {status === 'loading' && (
          <Loader2 size={18} className="animate-spin text-horizon-500" />
        )}

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled || status === 'loading'}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-surface-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          title="Remove file"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

FileInfo.propTypes = {
  file: PropTypes.object.isRequired,
  status: PropTypes.oneOf(['idle', 'loading', 'success', 'error']).isRequired,
  onRemove: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

/**
 * Progress bar indicator.
 */
function ProgressBar({ progress }) {
  return (
    <div className="mt-2 w-full">
      <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
        <span>Parsing file…</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
        <div
          className="h-full rounded-full bg-horizon-500 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

ProgressBar.propTypes = {
  progress: PropTypes.number.isRequired,
};

/**
 * Error display list.
 */
function ErrorDisplay({ errors }) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <div className="mb-2 flex items-center gap-2">
        <AlertCircle size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
        </p>
      </div>
      <ul className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
        {errors.slice(0, 20).map((error, index) => (
          <li
            key={`error-${index}`}
            className="text-xs text-red-700 dark:text-red-300"
          >
            • {error}
          </li>
        ))}
        {errors.length > 20 && (
          <li className="text-xs font-medium text-red-700 dark:text-red-300">
            … and {errors.length - 20} more errors
          </li>
        )}
      </ul>
    </div>
  );
}

ErrorDisplay.propTypes = {
  errors: PropTypes.arrayOf(PropTypes.string),
};

/**
 * Data preview table showing first N rows of parsed data.
 */
function DataPreview({ data, maxPreviewRows }) {
  const [visible, setVisible] = useState(true);

  const toggleVisible = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const previewData = data.slice(0, maxPreviewRows);
  const columns = Object.keys(previewData[0] || {});

  if (columns.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900/50">
      <div className="flex items-center justify-between border-b border-surface-200 px-4 py-2.5 dark:border-surface-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-500 dark:text-green-400" />
          <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
            Preview ({data.length} {data.length === 1 ? 'row' : 'rows'} parsed)
          </p>
        </div>
        <button
          type="button"
          onClick={toggleVisible}
          className="flex items-center gap-1.5 text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {visible && (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-full table-auto">
            <thead className="border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-900/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {previewData.map((row, rowIndex) => (
                <tr
                  key={`preview-row-${rowIndex}`}
                  className="transition-colors duration-150 hover:bg-surface-50 dark:hover:bg-surface-700/50"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-surface-400 dark:text-surface-500">
                    {rowIndex + 1}
                  </td>
                  {columns.map((col) => {
                    const value = row[col];
                    const displayValue =
                      value === null || value === undefined
                        ? ''
                        : typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value);

                    return (
                      <td
                        key={`${rowIndex}-${col}`}
                        className="max-w-[200px] truncate whitespace-nowrap px-3 py-2 text-xs text-surface-700 dark:text-surface-300"
                        title={displayValue}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {data.length > maxPreviewRows && (
            <div className="border-t border-surface-200 px-4 py-2 text-center text-xs text-surface-500 dark:border-surface-700 dark:text-surface-400">
              Showing {maxPreviewRows} of {data.length} rows
            </div>
          )}
        </div>
      )}
    </div>
  );
}

DataPreview.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  maxPreviewRows: PropTypes.number.isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Reusable file upload component with drag-and-drop zone, file type
 * validation (CSV, Excel), file size limit, progress indicator,
 * preview of parsed data, and error display.
 *
 * @param {Object} props
 * @param {string} [props.id] - HTML id attribute for the hidden file input.
 * @param {string} [props.label] - Label text displayed above the upload zone.
 * @param {string[]} [props.acceptedTypes=['csv', 'excel']] - Accepted file types: 'csv', 'excel'.
 * @param {number} [props.maxFileSize] - Maximum file size in bytes. Defaults to 10 MB.
 * @param {boolean} [props.showPreview=true] - Whether to show a preview table of parsed data.
 * @param {number} [props.maxPreviewRows=5] - Maximum number of rows to show in the preview.
 * @param {boolean} [props.disabled=false] - Whether the upload is disabled.
 * @param {boolean} [props.required=false] - Whether the field is required.
 * @param {string} [props.error] - External error message to display.
 * @param {string} [props.hint] - Hint text displayed below the upload zone.
 * @param {Function} [props.onFileSelect] - Callback when a file is selected. Receives the File object.
 * @param {Function} [props.onParsed] - Callback when file parsing completes. Receives { success, data, errors, meta }.
 * @param {Function} [props.onRemove] - Callback when the file is removed.
 * @param {Function} [props.onError] - Callback when an error occurs. Receives an array of error strings.
 * @param {boolean} [props.autoParse=true] - Whether to automatically parse the file after selection.
 * @param {string} [props.className] - Additional CSS classes for the outer container.
 * @returns {import('react').ReactElement}
 */
export default function FileUpload({
  id,
  label,
  acceptedTypes = ['csv', 'excel'],
  maxFileSize,
  showPreview = true,
  maxPreviewRows = 5,
  disabled = false,
  required = false,
  error: externalError,
  hint,
  onFileSelect,
  onParsed,
  onRemove,
  onError,
  autoParse = true,
  className,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [parseMeta, setParseMeta] = useState(null);

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const resolvedMaxFileSize = typeof maxFileSize === 'number' && maxFileSize > 0
    ? maxFileSize
    : DEFAULT_MAX_FILE_SIZE;

  // -------------------------------------------------------------------------
  // Build the accept attribute for the file input
  // -------------------------------------------------------------------------

  const acceptAttribute = useMemo(() => {
    const mimeTypes = [];
    const extensions = [];

    if (acceptedTypes.includes('csv')) {
      mimeTypes.push(...FILE_TYPE_MAP.csv);
      extensions.push('.csv');
    }
    if (acceptedTypes.includes('excel')) {
      mimeTypes.push(...FILE_TYPE_MAP.excel);
      extensions.push('.xlsx', '.xls');
    }

    return [...extensions, ...mimeTypes].join(',');
  }, [acceptedTypes]);

  // -------------------------------------------------------------------------
  // File validation
  // -------------------------------------------------------------------------

  const validateFile = useCallback(
    (file) => {
      const errors = [];

      if (!file) {
        return ['No file provided.'];
      }

      // Check file size
      if (file.size === 0) {
        errors.push('File is empty.');
      }

      if (file.size > resolvedMaxFileSize) {
        errors.push(
          `File size (${formatFileSize(file.size)}) exceeds the maximum of ${formatFileSize(resolvedMaxFileSize)}.`,
        );
      }

      // Check file type
      const fileName = file.name || '';
      const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.txt');
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      const csvAccepted = acceptedTypes.includes('csv');
      const excelAccepted = acceptedTypes.includes('excel');

      if (!isCSV && !isExcel) {
        const acceptedLabels = acceptedTypes
          .map((type) => FILE_TYPE_LABELS[type] || type)
          .join(', ');
        errors.push(`Unsupported file type. Accepted formats: ${acceptedLabels}.`);
      } else if (isCSV && !csvAccepted) {
        errors.push('CSV files are not accepted. Please upload an Excel file.');
      } else if (isExcel && !excelAccepted) {
        errors.push('Excel files are not accepted. Please upload a CSV file.');
      }

      return errors;
    },
    [acceptedTypes, resolvedMaxFileSize],
  );

  // -------------------------------------------------------------------------
  // Parse file
  // -------------------------------------------------------------------------

  const parseFile = useCallback(
    async (file) => {
      if (!file) {
        return;
      }

      setStatus('loading');
      setProgress(10);
      setParseErrors([]);
      setParsedData(null);
      setParseMeta(null);

      try {
        // Simulate progress
        setProgress(30);

        const fileName = file.name || '';
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        let result;

        if (isExcel) {
          setProgress(50);
          result = await parseExcel(file);
        } else {
          setProgress(50);
          result = await parseCSV(file);
        }

        setProgress(90);

        if (result.success && result.data && result.data.length > 0) {
          setParsedData(result.data);
          setParseMeta(result.meta || null);
          setParseErrors([]);
          setStatus('success');
          setProgress(100);

          if (typeof onParsed === 'function') {
            onParsed({
              success: true,
              data: result.data,
              errors: [],
              meta: result.meta || {},
            });
          }
        } else {
          const resultErrors = result.errors && result.errors.length > 0
            ? result.errors
            : ['Failed to parse file. Please check the file format and try again.'];

          setParseErrors(resultErrors);
          setStatus('error');
          setProgress(0);

          if (typeof onParsed === 'function') {
            onParsed({
              success: false,
              data: [],
              errors: resultErrors,
              meta: result.meta || {},
            });
          }

          if (typeof onError === 'function') {
            onError(resultErrors);
          }
        }
      } catch (_err) {
        const errorMsg = `Unexpected error parsing file: ${_err.message || 'Unknown error'}`;
        setParseErrors([errorMsg]);
        setStatus('error');
        setProgress(0);

        if (typeof onParsed === 'function') {
          onParsed({
            success: false,
            data: [],
            errors: [errorMsg],
            meta: {},
          });
        }

        if (typeof onError === 'function') {
          onError([errorMsg]);
        }
      }
    },
    [onParsed, onError],
  );

  // -------------------------------------------------------------------------
  // Handle file selection
  // -------------------------------------------------------------------------

  const handleFileSelection = useCallback(
    (file) => {
      if (disabled || !file) {
        return;
      }

      // Validate the file
      const validationErrors = validateFile(file);

      if (validationErrors.length > 0) {
        setSelectedFile(file);
        setParseErrors(validationErrors);
        setStatus('error');
        setParsedData(null);
        setParseMeta(null);
        setProgress(0);

        if (typeof onError === 'function') {
          onError(validationErrors);
        }

        return;
      }

      setSelectedFile(file);
      setParseErrors([]);
      setStatus('idle');
      setParsedData(null);
      setParseMeta(null);
      setProgress(0);

      if (typeof onFileSelect === 'function') {
        onFileSelect(file);
      }

      if (autoParse) {
        parseFile(file);
      }
    },
    [disabled, validateFile, onFileSelect, onError, autoParse, parseFile],
  );

  // -------------------------------------------------------------------------
  // Handle file removal
  // -------------------------------------------------------------------------

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setStatus('idle');
    setProgress(0);
    setParsedData(null);
    setParseErrors([]);
    setParseMeta(null);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (typeof onRemove === 'function') {
      onRemove();
    }
  }, [onRemove]);

  // -------------------------------------------------------------------------
  // Browse button click
  // -------------------------------------------------------------------------

  const handleBrowseClick = useCallback(() => {
    if (disabled) {
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // -------------------------------------------------------------------------
  // File input change handler
  // -------------------------------------------------------------------------

  const handleInputChange = useCallback(
    (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        handleFileSelection(file);
      }
    },
    [handleFileSelection],
  );

  // -------------------------------------------------------------------------
  // Drag and drop handlers
  // -------------------------------------------------------------------------

  const handleDragEnter = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) {
        return;
      }

      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    [],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      setIsDragging(false);

      if (disabled) {
        return;
      }

      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) {
        handleFileSelection(file);
      }
    },
    [disabled, handleFileSelection],
  );

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const hasExternalError =
    externalError && typeof externalError === 'string' && externalError.trim().length > 0;

  const allErrors = useMemo(() => {
    const combined = [...parseErrors];
    if (hasExternalError) {
      combined.unshift(externalError.trim());
    }
    return combined;
  }, [parseErrors, hasExternalError, externalError]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept={acceptAttribute}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        aria-label={label || 'File upload'}
      />

      {/* Drop zone or file info */}
      {!selectedFile ? (
        <DropZone
          isDragging={isDragging}
          disabled={disabled}
          acceptedTypes={acceptedTypes}
          maxFileSize={resolvedMaxFileSize}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onBrowseClick={handleBrowseClick}
        />
      ) : (
        <div>
          <FileInfo
            file={selectedFile}
            status={status}
            onRemove={handleRemove}
            disabled={disabled}
          />

          {/* Progress bar */}
          {status === 'loading' && <ProgressBar progress={progress} />}
        </div>
      )}

      {/* Error display */}
      {allErrors.length > 0 && <ErrorDisplay errors={allErrors} />}

      {/* Data preview */}
      {showPreview && status === 'success' && parsedData && parsedData.length > 0 && (
        <DataPreview data={parsedData} maxPreviewRows={maxPreviewRows} />
      )}

      {/* Hint text */}
      {!hasExternalError && allErrors.length === 0 && hint && typeof hint === 'string' && hint.trim().length > 0 && (
        <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">{hint}</p>
      )}
    </div>
  );
}

FileUpload.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  acceptedTypes: PropTypes.arrayOf(PropTypes.oneOf(['csv', 'excel'])),
  maxFileSize: PropTypes.number,
  showPreview: PropTypes.bool,
  maxPreviewRows: PropTypes.number,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  onFileSelect: PropTypes.func,
  onParsed: PropTypes.func,
  onRemove: PropTypes.func,
  onError: PropTypes.func,
  autoParse: PropTypes.bool,
  className: PropTypes.string,
};