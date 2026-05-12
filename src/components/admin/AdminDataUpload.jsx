/**
 * Admin data upload component for Horizon DevSecOps Portal
 * Supports uploading catalog data (domains, portfolios, applications),
 * metrics data, and configuration data via CSV/Excel files.
 * Uses FileUpload component, shows parsed data preview in table,
 * validates data against schema, allows admin to confirm or reject upload.
 * Stores uploaded data in localStorage via CatalogService.
 * @module components/admin/AdminDataUpload
 */

import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import FileUpload from '../common/FileUpload.jsx';
import Modal from '../common/Modal.jsx';
import Select from '../common/Select.jsx';
import Table from '../common/Table.jsx';
import Tabs from '../common/Tabs.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import {
  bulkAddApplications,
  updateCatalog,
  getCatalogSummary,
} from '../../services/CatalogService.js';
import { refreshDashboardData } from '../../services/DashboardDataService.js';
import {
  validateParsedData,
  transformToOnboardingData,
  transformToMetricsData,
} from '../../utils/csvParser.js';
import { logAction, AUDIT_ACTIONS } from '../../utils/auditLogger.js';
import { formatDate } from '../../utils/formatters.js';
import {
  CRITICALITY_TIER_LIST,
  DOMAIN_LIST,
  ENVIRONMENT_LIST,
  PORTFOLIO_LIST,
} from '../../constants/constants.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Upload data type options.
 * @type {Array<Object>}
 */
const UPLOAD_TYPE_OPTIONS = [
  {
    value: 'applications',
    label: 'Applications (Catalog)',
    description: 'Bulk import application onboarding data',
    icon: Server,
    color: 'text-horizon-600 dark:text-horizon-400',
    bg: 'bg-horizon-50 dark:bg-horizon-900/20',
  },
  {
    value: 'metrics',
    label: 'KPI Metrics',
    description: 'Import KPI and performance metrics data',
    icon: ShieldCheck,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    value: 'configuration',
    label: 'Configuration Data',
    description: 'Import dashboard and system configuration',
    icon: Database,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
];

/**
 * Application upload required columns.
 * @type {string[]}
 */
const APPLICATION_REQUIRED_COLUMNS = [
  'name',
  'shortCode',
  'description',
  'domainName',
  'portfolioName',
  'criticalityTier',
  'ownerName',
];

/**
 * Application upload schema for validation.
 * @type {Object}
 */
const APPLICATION_SCHEMA = {
  requiredColumns: APPLICATION_REQUIRED_COLUMNS,
  columnTypes: {
    name: 'string',
    shortCode: 'string',
    description: 'string',
    domainName: 'string',
    portfolioName: 'string',
    criticalityTier: 'string',
    ownerName: 'string',
    ownerEmail: 'string',
    environments: 'array',
    techStack: 'array',
    tags: 'array',
    repoUrl: 'string',
  },
  columnValidation: {
    domainName: DOMAIN_LIST,
    criticalityTier: CRITICALITY_TIER_LIST,
  },
  maxRows: 500,
};

/**
 * Metrics upload required columns.
 * @type {string[]}
 */
const METRICS_REQUIRED_COLUMNS = [
  'applicationName',
  'metricName',
  'value',
];

/**
 * Metrics upload schema for validation.
 * @type {Object}
 */
const METRICS_SCHEMA = {
  requiredColumns: METRICS_REQUIRED_COLUMNS,
  columnTypes: {
    applicationName: 'string',
    metricName: 'string',
    value: 'number',
    unit: 'string',
    period: 'string',
    environment: 'string',
  },
  columnValidation: {},
  maxRows: 1000,
};

/**
 * Configuration upload required columns.
 * @type {string[]}
 */
const CONFIGURATION_REQUIRED_COLUMNS = [
  'key',
  'value',
];

/**
 * Configuration upload schema for validation.
 * @type {Object}
 */
const CONFIGURATION_SCHEMA = {
  requiredColumns: CONFIGURATION_REQUIRED_COLUMNS,
  columnTypes: {
    key: 'string',
    value: 'string',
    category: 'string',
    description: 'string',
  },
  columnValidation: {},
  maxRows: 200,
};

const UPLOAD_TABS = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'history', label: 'Upload History', icon: Clock },
];

const UPLOAD_HISTORY_STORAGE_KEY = 'admin_upload_history';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the schema for a given upload type.
 * @param {string} uploadType
 * @returns {Object}
 */
const getSchemaForType = (uploadType) => {
  switch (uploadType) {
    case 'applications':
      return APPLICATION_SCHEMA;
    case 'metrics':
      return METRICS_SCHEMA;
    case 'configuration':
      return CONFIGURATION_SCHEMA;
    default:
      return APPLICATION_SCHEMA;
  }
};

/**
 * Get the required columns for a given upload type.
 * @param {string} uploadType
 * @returns {string[]}
 */
const getRequiredColumnsForType = (uploadType) => {
  switch (uploadType) {
    case 'applications':
      return APPLICATION_REQUIRED_COLUMNS;
    case 'metrics':
      return METRICS_REQUIRED_COLUMNS;
    case 'configuration':
      return CONFIGURATION_REQUIRED_COLUMNS;
    default:
      return APPLICATION_REQUIRED_COLUMNS;
  }
};

/**
 * Load upload history from localStorage.
 * @returns {Array<Object>}
 */
const loadUploadHistory = () => {
  try {
    const raw = localStorage.getItem(`horizon_${UPLOAD_HISTORY_STORAGE_KEY}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (_err) {
    return [];
  }
};

/**
 * Save upload history to localStorage.
 * @param {Array<Object>} history
 */
const saveUploadHistory = (history) => {
  try {
    const trimmed = Array.isArray(history) ? history.slice(0, 100) : [];
    localStorage.setItem(`horizon_${UPLOAD_HISTORY_STORAGE_KEY}`, JSON.stringify(trimmed));
  } catch (_err) {
    // Silently fail if localStorage is full
  }
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Upload type selector card.
 */
function UploadTypeCard({ option, isSelected, onSelect, disabled }) {
  const Icon = option.icon;

  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect(option.value);
    }
  }, [option.value, onSelect, disabled]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        onSelect(option.value);
      }
    },
    [option.value, onSelect, disabled],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'group flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all duration-200',
        disabled && 'pointer-events-none opacity-50',
        isSelected
          ? 'border-horizon-500 bg-horizon-50 ring-1 ring-horizon-500/30 dark:border-horizon-500 dark:bg-horizon-900/20'
          : 'border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600',
      )}
    >
      <div
        className={clsx(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
          option.bg,
        )}
      >
        <Icon size={20} className={option.color} />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          {option.label}
        </h4>
        <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
          {option.description}
        </p>
      </div>
      <div
        className={clsx(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
          isSelected
            ? 'border-horizon-500 bg-horizon-500 text-white'
            : 'border-surface-300 bg-white dark:border-surface-600 dark:bg-surface-800',
        )}
      >
        {isSelected && <CheckCircle2 size={12} />}
      </div>
    </div>
  );
}

UploadTypeCard.propTypes = {
  option: PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    color: PropTypes.string.isRequired,
    bg: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Schema info panel showing required columns and validation rules.
 */
function SchemaInfoPanel({ uploadType }) {
  const schema = getSchemaForType(uploadType);
  const requiredColumns = getRequiredColumnsForType(uploadType);

  const typeLabel = UPLOAD_TYPE_OPTIONS.find((o) => o.value === uploadType)?.label || 'Data';

  return (
    <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
      <div className="flex items-start gap-3">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-horizon-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
            {typeLabel} Upload Requirements
          </p>
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">
                Required Columns:
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {requiredColumns.map((col) => (
                  <Badge key={col} variant="horizon" size="sm">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
            {schema.columnValidation && Object.keys(schema.columnValidation).length > 0 && (
              <div>
                <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">
                  Validation Rules:
                </p>
                <ul className="mt-1 space-y-0.5">
                  {Object.entries(schema.columnValidation).map(([col, values]) => (
                    <li key={col} className="text-2xs text-surface-500 dark:text-surface-400">
                      <span className="font-medium">{col}</span>: {Array.isArray(values) ? values.join(', ') : String(values)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-2xs text-surface-400 dark:text-surface-500">
              Maximum rows: {schema.maxRows} · Accepted formats: CSV, Excel (.xlsx)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

SchemaInfoPanel.propTypes = {
  uploadType: PropTypes.string.isRequired,
};

/**
 * Validation results display.
 */
function ValidationResults({ validation, dataCount }) {
  if (!validation) {
    return null;
  }

  const { valid, errors, warnings } = validation;

  return (
    <div className="space-y-3">
      {/* Status banner */}
      <div
        className={clsx(
          'rounded-lg border p-4',
          valid
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
        )}
      >
        <div className="flex items-center gap-2">
          {valid ? (
            <CheckCircle2 size={20} className="flex-shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0 text-red-600 dark:text-red-400" />
          )}
          <div>
            <p
              className={clsx(
                'text-sm font-semibold',
                valid
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200',
              )}
            >
              {valid ? 'Validation Passed' : 'Validation Failed'}
            </p>
            <p
              className={clsx(
                'mt-0.5 text-xs',
                valid
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300',
              )}
            >
              {valid
                ? `${dataCount} ${dataCount === 1 ? 'row' : 'rows'} ready for import.`
                : `${errors.length} ${errors.length === 1 ? 'error' : 'errors'} found. Please fix and re-upload.`}
            </p>
          </div>
        </div>
      </div>

      {/* Errors */}
      {Array.isArray(errors) && errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
            </p>
          </div>
          <ul className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
            {errors.slice(0, 30).map((error, index) => (
              <li
                key={`error-${index}`}
                className="text-xs text-red-700 dark:text-red-300"
              >
                • {error}
              </li>
            ))}
            {errors.length > 30 && (
              <li className="text-xs font-medium text-red-700 dark:text-red-300">
                … and {errors.length - 30} more errors
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {Array.isArray(warnings) && warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {warnings.length} {warnings.length === 1 ? 'Warning' : 'Warnings'}
            </p>
          </div>
          <ul className="max-h-32 space-y-1 overflow-y-auto scrollbar-thin">
            {warnings.slice(0, 20).map((warning, index) => (
              <li
                key={`warning-${index}`}
                className="text-xs text-amber-700 dark:text-amber-300"
              >
                • {warning}
              </li>
            ))}
            {warnings.length > 20 && (
              <li className="text-xs font-medium text-amber-700 dark:text-amber-300">
                … and {warnings.length - 20} more warnings
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

ValidationResults.propTypes = {
  validation: PropTypes.shape({
    valid: PropTypes.bool,
    errors: PropTypes.arrayOf(PropTypes.string),
    warnings: PropTypes.arrayOf(PropTypes.string),
  }),
  dataCount: PropTypes.number,
};

/**
 * Import result display.
 */
function ImportResult({ result, uploadType, onReset }) {
  if (!result) {
    return null;
  }

  const isSuccess = result.success === true;

  return (
    <div className="space-y-4">
      <div
        className={clsx(
          'rounded-lg border p-4',
          isSuccess
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
        )}
      >
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle2 size={20} className="flex-shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0 text-red-600 dark:text-red-400" />
          )}
          <div>
            <p
              className={clsx(
                'text-sm font-semibold',
                isSuccess
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200',
              )}
            >
              {isSuccess ? 'Import Successful' : 'Import Failed'}
            </p>
            {isSuccess && result.added !== undefined && (
              <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">
                {result.added} {result.added === 1 ? 'record' : 'records'} imported successfully.
              </p>
            )}
            {isSuccess && result.message && (
              <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">
                {result.message}
              </p>
            )}
          </div>
        </div>

        {/* Skipped records */}
        {Array.isArray(result.skipped) && result.skipped.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {result.skipped.length} {result.skipped.length === 1 ? 'record' : 'records'} skipped:
            </p>
            <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto scrollbar-thin">
              {result.skipped.slice(0, 20).map((skip, index) => (
                <li
                  key={`skip-${index}`}
                  className="text-2xs text-amber-600 dark:text-amber-400"
                >
                  • Row {skip.index || skip.row || index + 1}: {skip.reason || skip.name || 'Unknown reason'}
                </li>
              ))}
              {result.skipped.length > 20 && (
                <li className="text-2xs font-medium text-amber-600 dark:text-amber-400">
                  … and {result.skipped.length - 20} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Errors */}
        {Array.isArray(result.errors) && result.errors.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-red-700 dark:text-red-300">
              Errors:
            </p>
            <ul className="mt-1 space-y-1">
              {result.errors.map((error, index) => (
                <li
                  key={`import-error-${index}`}
                  className="text-2xs text-red-600 dark:text-red-400"
                >
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end">
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onReset}>
          Upload Another File
        </Button>
      </div>
    </div>
  );
}

ImportResult.propTypes = {
  result: PropTypes.object,
  uploadType: PropTypes.string,
  onReset: PropTypes.func.isRequired,
};

/**
 * Data preview table for parsed data.
 */
function DataPreviewTable({ data, uploadType }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const columns = useMemo(() => {
    const keys = Object.keys(data[0] || {});
    return keys.slice(0, 10).map((key) => ({
      id: key,
      header: key,
      accessor: key,
      sortable: true,
      searchable: true,
      cell: (value) => {
        if (value === null || value === undefined) {
          return <span className="text-xs text-surface-400 dark:text-surface-500">—</span>;
        }
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const truncated = displayValue.length > 50 ? displayValue.slice(0, 50) + '…' : displayValue;
        return (
          <span
            className="text-xs text-surface-700 dark:text-surface-300"
            title={displayValue}
          >
            {truncated}
          </span>
        );
      },
    }));
  }, [data]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-horizon-500" />
          <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Data Preview ({data.length} {data.length === 1 ? 'row' : 'rows'})
          </p>
        </div>
        {columns.length < Object.keys(data[0] || {}).length && (
          <span className="text-2xs text-surface-400 dark:text-surface-500">
            Showing {columns.length} of {Object.keys(data[0] || {}).length} columns
          </span>
        )}
      </div>
      <Table
        columns={columns}
        data={data.slice(0, 50)}
        searchable={false}
        paginated={data.length > 10}
        pageSize={10}
        density="compact"
        hoverable
        striped={false}
        emptyMessage="No data to preview."
      />
      {data.length > 50 && (
        <p className="mt-2 text-center text-2xs text-surface-400 dark:text-surface-500">
          Showing first 50 of {data.length} rows
        </p>
      )}
    </div>
  );
}

DataPreviewTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  uploadType: PropTypes.string,
};

/**
 * Upload history table columns.
 * @type {Array<Object>}
 */
const HISTORY_COLUMNS = [
  {
    id: 'timestamp',
    header: 'Uploaded',
    accessor: 'timestamp',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value ? formatDate(value, { format: 'relative' }) : 'N/A'}
      </span>
    ),
  },
  {
    id: 'uploadType',
    header: 'Type',
    accessor: 'uploadType',
    sortable: true,
    cell: (value) => {
      const option = UPLOAD_TYPE_OPTIONS.find((o) => o.value === value);
      return (
        <Badge variant="neutral" size="sm">
          {option ? option.label : value || 'N/A'}
        </Badge>
      );
    },
  },
  {
    id: 'fileName',
    header: 'File',
    accessor: 'fileName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-100">
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'rowCount',
    header: 'Rows',
    accessor: 'rowCount',
    sortable: true,
    align: 'center',
    cell: (value) => (
      <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
        {typeof value === 'number' ? value : 0}
      </span>
    ),
  },
  {
    id: 'importedCount',
    header: 'Imported',
    accessor: 'importedCount',
    sortable: true,
    align: 'center',
    cell: (value) => (
      <span className="text-xs font-medium text-green-600 dark:text-green-400">
        {typeof value === 'number' ? value : 0}
      </span>
    ),
  },
  {
    id: 'skippedCount',
    header: 'Skipped',
    accessor: 'skippedCount',
    sortable: true,
    align: 'center',
    cell: (value) => (
      <span
        className={clsx(
          'text-xs font-medium',
          value > 0
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-surface-400 dark:text-surface-500',
        )}
      >
        {typeof value === 'number' ? value : 0}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    sortable: true,
    cell: (value) => {
      const variant = value === 'success' ? 'success' : value === 'partial' ? 'warning' : 'danger';
      const label = value === 'success' ? 'Success' : value === 'partial' ? 'Partial' : 'Failed';
      return (
        <Badge variant={variant} size="sm" dot>
          {label}
        </Badge>
      );
    },
  },
  {
    id: 'uploadedBy',
    header: 'Uploaded By',
    accessor: 'uploadedBy',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value || 'System'}
      </span>
    ),
  },
];

/**
 * Upload history section.
 */
function UploadHistorySection({ refreshKey }) {
  const history = useMemo(() => {
    return loadUploadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (history.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No upload history"
        description="No data uploads have been performed yet. Use the Upload tab to import data."
        size="md"
        bordered
      />
    );
  }

  return (
    <Table
      columns={HISTORY_COLUMNS}
      data={history}
      searchable
      searchPlaceholder="Search upload history..."
      paginated
      pageSize={10}
      density="compact"
      hoverable
      striped={false}
      emptyMessage="No upload history found."
      noResultsMessage="No uploads match your search."
      defaultSortColumn="timestamp"
      defaultSortOrder="desc"
    />
  );
}

UploadHistorySection.propTypes = {
  refreshKey: PropTypes.number,
};

/**
 * Confirm import modal.
 */
function ConfirmImportModal({ open, onConfirm, onCancel, uploadType, rowCount, isImporting }) {
  const typeLabel = UPLOAD_TYPE_OPTIONS.find((o) => o.value === uploadType)?.label || 'Data';

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Confirm Data Import"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={isImporting ? undefined : CheckCircle2}
            loading={isImporting}
            onClick={onConfirm}
          >
            {isImporting ? 'Importing...' : 'Confirm Import'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-surface-700 dark:text-surface-300">
          Are you sure you want to import{' '}
          <span className="font-semibold">{rowCount} {rowCount === 1 ? 'record' : 'records'}</span>{' '}
          of <span className="font-semibold">{typeLabel}</span> data?
        </p>
        <p className="text-xs text-surface-500 dark:text-surface-400">
          This action will add the data to the system. Existing records with the same name or
          short code will be skipped.
        </p>
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-2xs text-amber-700 dark:text-amber-300">
            This action is logged in the audit trail. All imported data will be immediately
            available in the portal.
          </p>
        </div>
      </div>
    </Modal>
  );
}

ConfirmImportModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  uploadType: PropTypes.string,
  rowCount: PropTypes.number,
  isImporting: PropTypes.bool,
};

/**
 * Summary statistics bar.
 */
function UploadSummaryBar({ catalogSummary }) {
  const stats = [
    {
      label: 'Applications',
      value: catalogSummary ? catalogSummary.totalApplications : 0,
      icon: Server,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-900/30',
    },
    {
      label: 'Domains',
      value: catalogSummary ? catalogSummary.totalDomains : 0,
      icon: Database,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
    {
      label: 'Portfolios',
      value: catalogSummary ? catalogSummary.totalPortfolios : 0,
      icon: Shield,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Uploads',
      value: loadUploadHistory().length,
      icon: Upload,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800"
          >
            <div
              className={clsx(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                stat.bg,
              )}
            >
              <Icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-surface-900 dark:text-surface-100">
                {stat.value}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

UploadSummaryBar.propTypes = {
  catalogSummary: PropTypes.object,
};

/**
 * Sample CSV template download helper.
 */
function DownloadTemplateButton({ uploadType }) {
  const handleDownload = useCallback(() => {
    let headers;
    let sampleRow;

    switch (uploadType) {
      case 'applications':
        headers = ['name', 'shortCode', 'description', 'domainName', 'portfolioName', 'criticalityTier', 'ownerName', 'ownerEmail', 'environments', 'techStack', 'tags', 'repoUrl'];
        sampleRow = ['Sample App', 'SAMP', 'A sample application', 'Digital Experience', 'Customer Portal', 'Business Operational', 'John Doe', 'john@example.com', 'Prod,Dev', 'React,Node.js', 'sample,demo', 'https://github.com/org/repo'];
        break;
      case 'metrics':
        headers = ['applicationName', 'metricName', 'value', 'unit', 'period', 'environment'];
        sampleRow = ['Member Portal', 'deployment_frequency', '18', 'deployments/month', '2024-11', 'Prod'];
        break;
      case 'configuration':
        headers = ['key', 'value', 'category', 'description'];
        sampleRow = ['refresh_interval', '300', 'dashboard', 'Dashboard refresh interval in seconds'];
        break;
      default:
        return;
    }

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${uploadType}-template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [uploadType]);

  return (
    <Button variant="ghost" size="sm" icon={Download} onClick={handleDownload}>
      Download Template
    </Button>
  );
}

DownloadTemplateButton.propTypes = {
  uploadType: PropTypes.string.isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Admin data upload component for CSV/Excel interim data.
 * Supports uploading catalog data (domains, portfolios, applications),
 * metrics data, and configuration data. Uses FileUpload component,
 * shows parsed data preview in table, validates data against schema,
 * allows admin to confirm or reject upload. Stores uploaded data in
 * localStorage via CatalogService.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultUploadType='applications'] - Default upload type.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function AdminDataUpload({
  defaultUploadType = 'applications',
  showSummary = true,
  className,
}) {
  const { currentUser, hasPermission } = useAuth();
  const toast = useToast();

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  const canUpload = hasPermission('upload_data') || hasPermission('import_data') || hasPermission('manage_settings');

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState('upload');
  const [uploadType, setUploadType] = useState(defaultUploadType);
  const [parsedData, setParsedData] = useState(null);
  const [parsedMeta, setParsedMeta] = useState(null);
  const [validation, setValidation] = useState(null);
  const [transformedData, setTransformedData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // -------------------------------------------------------------------------
  // Data
  // -------------------------------------------------------------------------

  const catalogSummary = useMemo(() => {
    return getCatalogSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const tabsWithBadges = useMemo(() => {
    const history = loadUploadHistory();
    return UPLOAD_TABS.map((tab) => {
      let badge;
      if (tab.id === 'history') {
        badge = history.length || undefined;
      }
      return { ...tab, badge };
    });
  }, [refreshKey]);

  // -------------------------------------------------------------------------
  // Handlers — Tab
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Upload Type
  // -------------------------------------------------------------------------

  const handleUploadTypeChange = useCallback((type) => {
    setUploadType(type);
    setParsedData(null);
    setParsedMeta(null);
    setValidation(null);
    setTransformedData(null);
    setImportResult(null);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — File Parsed
  // -------------------------------------------------------------------------

  const handleFileParsed = useCallback(
    (result) => {
      if (!result) {
        return;
      }

      setImportResult(null);

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        setParsedData(result.data);
        setParsedMeta(result.meta || null);

        // Validate against schema
        const schema = getSchemaForType(uploadType);
        const validationResult = validateParsedData(result.data, schema);
        setValidation(validationResult);

        // Transform data if validation passes
        if (validationResult.valid) {
          let transformed;
          if (uploadType === 'applications') {
            transformed = transformToOnboardingData(result.data);
          } else if (uploadType === 'metrics') {
            transformed = transformToMetricsData(result.data);
          } else {
            // Configuration data — pass through as-is
            transformed = { success: true, data: result.data, errors: [], skipped: [] };
          }

          if (transformed.success) {
            setTransformedData(transformed.data);
          } else {
            setTransformedData(null);
            setValidation({
              valid: false,
              errors: transformed.errors || ['Failed to transform data.'],
              warnings: validationResult.warnings || [],
            });
          }
        } else {
          setTransformedData(null);
        }
      } else {
        setParsedData(null);
        setParsedMeta(null);
        setValidation({
          valid: false,
          errors: result.errors || ['Failed to parse file.'],
          warnings: [],
        });
        setTransformedData(null);
      }
    },
    [uploadType],
  );

  // -------------------------------------------------------------------------
  // Handlers — File Error
  // -------------------------------------------------------------------------

  const handleFileError = useCallback((errors) => {
    setParsedData(null);
    setParsedMeta(null);
    setValidation({
      valid: false,
      errors: Array.isArray(errors) ? errors : ['File upload error.'],
      warnings: [],
    });
    setTransformedData(null);
    setImportResult(null);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — File Remove
  // -------------------------------------------------------------------------

  const handleFileRemove = useCallback(() => {
    setParsedData(null);
    setParsedMeta(null);
    setValidation(null);
    setTransformedData(null);
    setImportResult(null);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Confirm Import
  // -------------------------------------------------------------------------

  const handleOpenConfirmModal = useCallback(() => {
    if (!transformedData || transformedData.length === 0) {
      toast.error('No valid data to import.');
      return;
    }
    setConfirmModalOpen(true);
  }, [transformedData, toast]);

  const handleCloseConfirmModal = useCallback(() => {
    setConfirmModalOpen(false);
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (!transformedData || transformedData.length === 0) {
      toast.error('No valid data to import.');
      setConfirmModalOpen(false);
      return;
    }

    setIsImporting(true);
    setConfirmModalOpen(false);

    const timer = setTimeout(() => {
      let result;

      try {
        if (uploadType === 'applications') {
          result = bulkAddApplications(
            transformedData,
            currentUser ? currentUser.id : null,
          );
        } else if (uploadType === 'metrics') {
          // Store metrics data via dashboard data service
          const refreshResult = refreshDashboardData({
            newData: {
              kpiMetrics: transformedData,
            },
            userId: currentUser ? currentUser.id : null,
          });

          result = {
            success: refreshResult.success,
            added: transformedData.length,
            skipped: [],
            errors: refreshResult.error ? [refreshResult.error] : [],
            message: `${transformedData.length} metrics records imported.`,
          };
        } else if (uploadType === 'configuration') {
          // Store configuration data
          const configData = {};
          transformedData.forEach((row) => {
            if (row.key && row.value !== undefined) {
              configData[row.key] = row.value;
            }
          });

          const updateResult = updateCatalog({ configurations: [configData] });
          result = {
            success: true,
            added: transformedData.length,
            skipped: [],
            errors: updateResult.error ? [updateResult.error] : [],
            message: `${transformedData.length} configuration entries imported.`,
          };
        } else {
          result = {
            success: false,
            added: 0,
            skipped: [],
            errors: ['Unknown upload type.'],
          };
        }
      } catch (_err) {
        result = {
          success: false,
          added: 0,
          skipped: [],
          errors: ['Unexpected error during import.'],
        };
      }

      setIsImporting(false);
      setImportResult(result);

      // Record in upload history
      const historyEntry = {
        id: `UPL-${Date.now()}`,
        timestamp: new Date().toISOString(),
        uploadType,
        fileName: parsedMeta ? parsedMeta.fileName : 'unknown',
        rowCount: transformedData.length,
        importedCount: result.added || 0,
        skippedCount: Array.isArray(result.skipped) ? result.skipped.length : 0,
        status: result.success
          ? Array.isArray(result.skipped) && result.skipped.length > 0
            ? 'partial'
            : 'success'
          : 'failed',
        uploadedBy: currentUser
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : 'System',
        errors: result.errors || [],
      };

      const history = loadUploadHistory();
      history.unshift(historyEntry);
      saveUploadHistory(history);

      // Log to audit trail
      logAction(
        currentUser ? currentUser.id : null,
        AUDIT_ACTIONS.DATA_IMPORT,
        {
          uploadType,
          fileName: parsedMeta ? parsedMeta.fileName : 'unknown',
          rowCount: transformedData.length,
          importedCount: result.added || 0,
          skippedCount: Array.isArray(result.skipped) ? result.skipped.length : 0,
          status: historyEntry.status,
          action: 'admin_data_upload',
        },
      );

      setRefreshKey((prev) => prev + 1);

      if (result.success) {
        toast.success(
          `Successfully imported ${result.added || 0} ${uploadType} records.`,
          { title: 'Import Complete' },
        );
      } else {
        toast.error(
          result.errors && result.errors.length > 0
            ? result.errors[0]
            : 'Import failed.',
          { title: 'Import Failed' },
        );
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [transformedData, uploadType, currentUser, parsedMeta, toast]);

  // -------------------------------------------------------------------------
  // Handlers — Reset
  // -------------------------------------------------------------------------

  const handleReset = useCallback(() => {
    setParsedData(null);
    setParsedMeta(null);
    setValidation(null);
    setTransformedData(null);
    setImportResult(null);
  }, []);

  // -------------------------------------------------------------------------
  // Unauthorized access
  // -------------------------------------------------------------------------

  if (!canUpload) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-surface-900 dark:text-surface-100">
            Access Denied
          </h2>
          <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
            The Admin Data Upload feature is only accessible to users with Admin permissions.
          </p>
          <a href="/" className="btn-primary inline-flex">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render — Upload Tab
  // -------------------------------------------------------------------------

  const renderUploadContent = () => {
    return (
      <div className="space-y-6">
        {/* Import Result */}
        {importResult && (
          <ImportResult
            result={importResult}
            uploadType={uploadType}
            onReset={handleReset}
          />
        )}

        {/* Step 1: Select Upload Type */}
        {!importResult && (
          <Card variant="default" title="1. Select Data Type" icon={Database}>
            <div className="grid gap-3 sm:grid-cols-3">
              {UPLOAD_TYPE_OPTIONS.map((option) => (
                <UploadTypeCard
                  key={option.value}
                  option={option}
                  isSelected={uploadType === option.value}
                  onSelect={handleUploadTypeChange}
                  disabled={isImporting}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Step 2: Upload File */}
        {!importResult && (
          <Card variant="default" title="2. Upload File" icon={Upload}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SchemaInfoPanel uploadType={uploadType} />
              </div>

              <div className="flex items-center justify-end">
                <DownloadTemplateButton uploadType={uploadType} />
              </div>

              <FileUpload
                id="admin-data-upload"
                label="Upload CSV or Excel File"
                acceptedTypes={['csv', 'excel']}
                maxFileSize={5 * 1024 * 1024}
                showPreview={false}
                maxPreviewRows={5}
                disabled={isImporting}
                required
                autoParse
                onParsed={handleFileParsed}
                onError={handleFileError}
                onRemove={handleFileRemove}
                hint="Upload a CSV or Excel file with the required columns. Maximum file size: 5 MB."
              />
            </div>
          </Card>
        )}

        {/* Step 3: Validation Results */}
        {!importResult && validation && (
          <Card variant="default" title="3. Validation Results" icon={ShieldCheck}>
            <ValidationResults
              validation={validation}
              dataCount={transformedData ? transformedData.length : 0}
            />
          </Card>
        )}

        {/* Step 4: Data Preview */}
        {!importResult && parsedData && parsedData.length > 0 && (
          <Card variant="default" title="4. Data Preview" icon={FileSpreadsheet}>
            <DataPreviewTable data={parsedData} uploadType={uploadType} />
          </Card>
        )}

        {/* Step 5: Confirm Import */}
        {!importResult && validation && validation.valid && transformedData && transformedData.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-400 dark:text-surface-500">
              {transformedData.length} {transformedData.length === 1 ? 'record' : 'records'} ready
              for import as{' '}
              <span className="font-medium text-surface-700 dark:text-surface-300">
                {UPLOAD_TYPE_OPTIONS.find((o) => o.value === uploadType)?.label || uploadType}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Trash2}
                onClick={handleReset}
                disabled={isImporting}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={isImporting ? undefined : CheckCircle2}
                loading={isImporting}
                onClick={handleOpenConfirmModal}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Import Data'}
              </Button>
            </div>
          </div>
        )}

        {/* Empty state when no file uploaded */}
        {!importResult && !parsedData && !validation && (
          <EmptyState
            icon={Upload}
            title="Upload a data file"
            description="Select a data type above and upload a CSV or Excel file to begin the import process."
            size="md"
            bordered
          />
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          Admin Data Upload
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Upload interim data via CSV or Excel files to populate the portal with application
          catalog data, KPI metrics, and system configuration. All uploads are validated,
          previewed, and logged to the audit trail.
        </p>
      </div>

      {/* Summary Bar */}
      {showSummary && <UploadSummaryBar catalogSummary={catalogSummary} />}

      {/* Tabs */}
      <div className={clsx(showSummary && 'mt-6')}>
        <Tabs
          tabs={tabsWithBadges}
          activeTab={activeTab}
          onChange={handleTabChange}
          variant="underline"
          size="md"
        />
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'upload' && renderUploadContent()}
        {activeTab === 'history' && (
          <UploadHistorySection refreshKey={refreshKey} />
        )}
      </div>

      {/* Confirm Import Modal */}
      <ConfirmImportModal
        open={confirmModalOpen}
        onConfirm={handleConfirmImport}
        onCancel={handleCloseConfirmModal}
        uploadType={uploadType}
        rowCount={transformedData ? transformedData.length : 0}
        isImporting={isImporting}
      />

      {/* Compliance notice */}
      <div className="mt-6 rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-horizon-500" />
          <div>
            <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
              Data Upload Compliance Notice
            </p>
            <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
              All data uploads are validated against the expected schema before import. Upload
              actions are recorded in the audit trail with timestamp, user identification, file
              details, and import results. Uploaded data is stored locally in the browser and
              is immediately available across the portal. Ensure all uploaded data complies with
              organizational data governance policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

AdminDataUpload.propTypes = {
  defaultUploadType: PropTypes.oneOf(['applications', 'metrics', 'configuration']),
  showSummary: PropTypes.bool,
  className: PropTypes.string,
};