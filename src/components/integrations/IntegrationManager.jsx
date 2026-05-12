/**
 * Integration management component for Horizon DevSecOps Portal
 * Browse available external systems (Postgres, MongoDB, Elastic, Splunk,
 * Dynatrace, etc.), configure connection parameters, test connectivity,
 * save integrations per application. Shows integration status and health.
 * Supports add/remove/edit integrations.
 * @module components/integrations/IntegrationManager
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Database,
  ExternalLink,
  Filter,
  Globe,
  Info,
  LayoutGrid,
  List,
  Loader2,
  MessageSquare,
  Plug,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Ticket,
  Trash2,
  Wrench,
  X,
  Cpu,
  FileText,
  Package,
  GitBranch,
  Eye,
  EyeOff,
  Power,
  PowerOff,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Modal from '../common/Modal.jsx';
import Select from '../common/Select.jsx';
import StatusIndicator from '../common/StatusIndicator.jsx';
import Tabs from '../common/Tabs.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import {
  getAvailableIntegrations,
  getAvailableIntegrationById,
  getIntegrationTypes,
  getIntegrations,
  getIntegrationSummary,
  testIntegration,
  saveIntegration,
  updateIntegration,
  removeIntegration,
  validateIntegrationConfig,
  INTEGRATION_STATUSES,
  INTEGRATION_TYPES,
} from '../../services/IntegrationService.js';
import { getApplications, getApplicationById } from '../../services/CatalogService.js';
import { formatDate } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIEW_MODES = Object.freeze({
  CARD: 'card',
  TABLE: 'table',
});

const INTEGRATION_TABS = [
  { id: 'catalog', label: 'Available Integrations', icon: Plug },
  { id: 'configured', label: 'Configured', icon: Settings },
];

/**
 * Map integration type to icon component.
 * @type {Object<string, import('react').ElementType>}
 */
const TYPE_ICONS = {
  [INTEGRATION_TYPES.MONITORING]: Activity,
  [INTEGRATION_TYPES.LOGGING]: FileText,
  [INTEGRATION_TYPES.DATABASE]: Database,
  [INTEGRATION_TYPES.MESSAGING]: Radio,
  [INTEGRATION_TYPES.SECURITY_SCANNING]: Shield,
  [INTEGRATION_TYPES.ITSM]: Ticket,
  [INTEGRATION_TYPES.COLLABORATION]: MessageSquare,
  [INTEGRATION_TYPES.CI_CD]: Settings,
  [INTEGRATION_TYPES.ARTIFACT_MANAGEMENT]: Package,
  [INTEGRATION_TYPES.CONTAINERIZATION]: Server,
  [INTEGRATION_TYPES.SOURCE_CONTROL]: GitBranch,
  [INTEGRATION_TYPES.API_MANAGEMENT]: Globe,
  [INTEGRATION_TYPES.DATA_PLATFORM]: Cpu,
  [INTEGRATION_TYPES.QE_TOOLS]: Wrench,
};

/**
 * Map integration type to color classes.
 * @type {Object<string, { bg: string, text: string, badge: string }>}
 */
const TYPE_COLORS = {
  [INTEGRATION_TYPES.MONITORING]: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    badge: 'success',
  },
  [INTEGRATION_TYPES.LOGGING]: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'warning',
  },
  [INTEGRATION_TYPES.DATABASE]: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'info',
  },
  [INTEGRATION_TYPES.MESSAGING]: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'purple',
  },
  [INTEGRATION_TYPES.SECURITY_SCANNING]: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    badge: 'danger',
  },
  [INTEGRATION_TYPES.ITSM]: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    badge: 'info',
  },
  [INTEGRATION_TYPES.COLLABORATION]: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-600 dark:text-teal-400',
    badge: 'info',
  },
  [INTEGRATION_TYPES.CI_CD]: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'purple',
  },
  [INTEGRATION_TYPES.ARTIFACT_MANAGEMENT]: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'warning',
  },
  [INTEGRATION_TYPES.CONTAINERIZATION]: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    badge: 'info',
  },
  [INTEGRATION_TYPES.SOURCE_CONTROL]: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'info',
  },
  [INTEGRATION_TYPES.API_MANAGEMENT]: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    badge: 'success',
  },
  [INTEGRATION_TYPES.DATA_PLATFORM]: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    badge: 'info',
  },
  [INTEGRATION_TYPES.QE_TOOLS]: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    text: 'text-pink-600 dark:text-pink-400',
    badge: 'purple',
  },
};

const DEFAULT_TYPE_COLOR = {
  bg: 'bg-surface-50 dark:bg-surface-900/20',
  text: 'text-surface-600 dark:text-surface-400',
  badge: 'neutral',
};

/**
 * Map integration status to StatusIndicator status.
 * @type {Object<string, string>}
 */
const STATUS_MAP = {
  [INTEGRATION_STATUSES.CONNECTED]: 'connected',
  [INTEGRATION_STATUSES.DISCONNECTED]: 'disconnected',
  [INTEGRATION_STATUSES.ERROR]: 'error',
  [INTEGRATION_STATUSES.PENDING]: 'pending',
  [INTEGRATION_STATUSES.NOT_CONFIGURED]: 'inactive',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getTypeIcon = (type) => TYPE_ICONS[type] || Plug;
const getTypeColor = (type) => TYPE_COLORS[type] || DEFAULT_TYPE_COLOR;

const formatTypeLabel = (type) => {
  if (!type || typeof type !== 'string') {
    return 'Unknown';
  }
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Summary statistics bar.
 */
function IntegrationSummaryBar({ summary }) {
  if (!summary) {
    return null;
  }

  const stats = [
    {
      label: 'Available',
      value: getAvailableIntegrations().length,
      icon: Plug,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-900/30',
    },
    {
      label: 'Configured',
      value: summary.totalIntegrations || 0,
      icon: Settings,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Applications',
      value: summary.totalApplications || 0,
      icon: Server,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Types',
      value: summary.byType ? summary.byType.length : 0,
      icon: Wrench,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
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

IntegrationSummaryBar.propTypes = {
  summary: PropTypes.shape({
    totalIntegrations: PropTypes.number,
    totalApplications: PropTypes.number,
    byType: PropTypes.array,
    byStatus: PropTypes.array,
    byApplication: PropTypes.array,
    recentTests: PropTypes.array,
  }),
};

/**
 * Available integration catalog card.
 */
function CatalogCard({ integration, onConfigure }) {
  const typeColor = getTypeColor(integration.type);
  const TypeIcon = getTypeIcon(integration.type);

  const handleConfigure = useCallback(() => {
    if (typeof onConfigure === 'function') {
      onConfigure(integration);
    }
  }, [integration, onConfigure]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && typeof onConfigure === 'function') {
        e.preventDefault();
        onConfigure(integration);
      }
    },
    [integration, onConfigure],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleConfigure}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition-all duration-200 hover:border-horizon-300 hover:shadow-elevated dark:border-surface-700 dark:bg-surface-800 dark:hover:border-horizon-600"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
              typeColor.bg,
            )}
          >
            <TypeIcon size={20} className={typeColor.text} />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
              {integration.name}
            </h4>
            <Badge variant={typeColor.badge} size="sm">
              {formatTypeLabel(integration.type)}
            </Badge>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="flex-shrink-0 text-surface-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-surface-400 dark:text-surface-600"
        />
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
        {integration.description}
      </p>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-surface-100 pt-3 dark:border-surface-700">
        <span className="text-2xs text-surface-400 dark:text-surface-500">
          {integration.configSchema
            ? `${Object.keys(integration.configSchema).length} config fields`
            : 'No config required'}
        </span>
        {integration.documentationUrl && (
          <span className="flex items-center gap-1 text-2xs font-medium text-horizon-600 dark:text-horizon-400">
            <ExternalLink size={10} />
            Docs
          </span>
        )}
      </div>
    </div>
  );
}

CatalogCard.propTypes = {
  integration: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    description: PropTypes.string,
    configSchema: PropTypes.object,
    documentationUrl: PropTypes.string,
  }).isRequired,
  onConfigure: PropTypes.func,
};

/**
 * Configured integration card.
 */
function ConfiguredIntegrationCard({
  integration,
  onEdit,
  onTest,
  onRemove,
  onToggle,
  isTesting,
}) {
  const typeColor = getTypeColor(integration.type);
  const TypeIcon = getTypeIcon(integration.type);
  const resolvedStatus = STATUS_MAP[integration.status] || 'inactive';

  const handleEdit = useCallback(
    (e) => {
      e.stopPropagation();
      if (typeof onEdit === 'function') {
        onEdit(integration);
      }
    },
    [integration, onEdit],
  );

  const handleTest = useCallback(
    (e) => {
      e.stopPropagation();
      if (typeof onTest === 'function') {
        onTest(integration);
      }
    },
    [integration, onTest],
  );

  const handleRemove = useCallback(
    (e) => {
      e.stopPropagation();
      if (typeof onRemove === 'function') {
        onRemove(integration);
      }
    },
    [integration, onRemove],
  );

  const handleToggle = useCallback(
    (e) => {
      e.stopPropagation();
      if (typeof onToggle === 'function') {
        onToggle(integration);
      }
    },
    [integration, onToggle],
  );

  return (
    <div className="flex flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-elevated dark:border-surface-700 dark:bg-surface-800">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
              typeColor.bg,
            )}
          >
            <TypeIcon size={20} className={typeColor.text} />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
              {integration.toolName || integration.toolId}
            </h4>
            <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
              {integration.applicationName || 'N/A'}
            </p>
          </div>
        </div>
        <StatusIndicator status={resolvedStatus} size="sm" />
      </div>

      {/* Metadata */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
          <Badge variant={typeColor.badge} size="sm">
            {formatTypeLabel(integration.type)}
          </Badge>
        </div>
        {integration.updatedAt && (
          <div className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
            <Info size={12} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
            <span>Updated {formatDate(integration.updatedAt, { format: 'relative' })}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-100 pt-3 dark:border-surface-700">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggle}
            className={clsx(
              'flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium transition-colors duration-200',
              integration.enabled
                ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                : 'text-surface-400 hover:bg-surface-100 dark:text-surface-500 dark:hover:bg-surface-700',
            )}
            title={integration.enabled ? 'Disable integration' : 'Enable integration'}
          >
            {integration.enabled ? <Power size={12} /> : <PowerOff size={12} />}
            {integration.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium text-horizon-600 transition-colors duration-200 hover:bg-horizon-50 disabled:opacity-50 dark:text-horizon-400 dark:hover:bg-horizon-900/20"
            title="Test connectivity"
          >
            {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
            Test
          </button>
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            title="Edit configuration"
          >
            <Settings size={12} />
            Edit
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium text-red-500 transition-colors duration-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            title="Remove integration"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

ConfiguredIntegrationCard.propTypes = {
  integration: PropTypes.shape({
    id: PropTypes.string,
    applicationId: PropTypes.string,
    applicationName: PropTypes.string,
    toolId: PropTypes.string,
    toolName: PropTypes.string,
    type: PropTypes.string,
    config: PropTypes.object,
    enabled: PropTypes.bool,
    status: PropTypes.string,
    updatedAt: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func,
  onTest: PropTypes.func,
  onRemove: PropTypes.func,
  onToggle: PropTypes.func,
  isTesting: PropTypes.bool,
};

/**
 * Configuration form for an integration.
 */
function IntegrationConfigForm({
  catalogEntry,
  existingConfig,
  onSave,
  onTest,
  onCancel,
  isSaving,
  isTesting,
  testResult,
  selectedAppId,
  onAppChange,
  applications,
  errors,
}) {
  const [config, setConfig] = useState(() => {
    if (existingConfig && typeof existingConfig === 'object') {
      return { ...existingConfig };
    }
    // Build default config from schema
    const defaults = {};
    if (catalogEntry && catalogEntry.configSchema) {
      for (const [key, schemaDef] of Object.entries(catalogEntry.configSchema)) {
        if (schemaDef.defaultValue !== undefined) {
          defaults[key] = schemaDef.defaultValue;
        } else {
          defaults[key] = schemaDef.type === 'boolean' ? false : '';
        }
      }
    }
    return defaults;
  });

  const [showPasswords, setShowPasswords] = useState({});

  const handleFieldChange = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleTogglePassword = useCallback((key) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(() => {
    if (typeof onSave === 'function') {
      onSave(config);
    }
  }, [config, onSave]);

  const handleTest = useCallback(() => {
    if (typeof onTest === 'function') {
      onTest(config);
    }
  }, [config, onTest]);

  if (!catalogEntry) {
    return null;
  }

  const schema = catalogEntry.configSchema || {};
  const schemaEntries = Object.entries(schema);

  const appOptions = useMemo(() => {
    return applications.map((app) => ({
      value: app.id,
      label: app.name,
      description: `${app.domainName || 'N/A'} · ${app.criticalityTier || 'N/A'}`,
    }));
  }, [applications]);

  const typeColor = getTypeColor(catalogEntry.type);
  const TypeIcon = getTypeIcon(catalogEntry.type);

  return (
    <div className="space-y-6">
      {/* Integration info header */}
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg',
            typeColor.bg,
          )}
        >
          <TypeIcon size={24} className={typeColor.text} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            {catalogEntry.name}
          </h3>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            {catalogEntry.description}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant={typeColor.badge} size="sm">
              {formatTypeLabel(catalogEntry.type)}
            </Badge>
            {catalogEntry.documentationUrl && (
              <a
                href={catalogEntry.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-2xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
              >
                <ExternalLink size={10} />
                Documentation
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Application selector */}
      <Select
        id="integration-app-selector"
        label="Application"
        placeholder="Select an application..."
        options={appOptions}
        value={selectedAppId}
        onChange={onAppChange}
        searchable={appOptions.length > 5}
        searchPlaceholder="Search applications..."
        clearable
        required
        size="md"
        fullWidth
        emptyMessage="No applications available."
        noResultsMessage="No applications match your search."
        hint="Select the application this integration belongs to."
      />

      {/* Config fields */}
      {schemaEntries.length > 0 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
            Connection Configuration
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {schemaEntries.map(([key, schemaDef]) => {
              const fieldValue = config[key] !== undefined ? config[key] : '';
              const isPassword = schemaDef.type === 'password';
              const isBoolean = schemaDef.type === 'boolean';
              const isNumber = schemaDef.type === 'number';
              const fieldLabel = schemaDef.label || key;
              const isRequired = schemaDef.required === true;
              const showPw = showPasswords[key] === true;

              if (isBoolean) {
                return (
                  <div key={key} className="flex items-center gap-3 sm:col-span-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleFieldChange(key, !fieldValue)
                      }
                      className={clsx(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors duration-200',
                        fieldValue
                          ? 'border-horizon-500 bg-horizon-500 text-white'
                          : 'border-surface-300 bg-white dark:border-surface-600 dark:bg-surface-800',
                      )}
                    >
                      {fieldValue && <CheckCircle2 size={12} />}
                    </button>
                    <span className="text-sm text-surface-700 dark:text-surface-300">
                      {fieldLabel}
                    </span>
                  </div>
                );
              }

              return (
                <div key={key}>
                  <label
                    htmlFor={`config-${key}`}
                    className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
                  >
                    {fieldLabel}
                    {isRequired && <span className="ml-0.5 text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      id={`config-${key}`}
                      type={isPassword && !showPw ? 'password' : isNumber ? 'number' : 'text'}
                      value={fieldValue}
                      onChange={(e) =>
                        handleFieldChange(
                          key,
                          isNumber ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value,
                        )
                      }
                      placeholder={schemaDef.placeholder || ''}
                      className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 pr-9 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
                    />
                    {isPassword && (
                      <button
                        type="button"
                        onClick={() => handleTogglePassword(key)}
                        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300"
                      >
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Validation errors */}
      {Array.isArray(errors) && errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
            </p>
          </div>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={`err-${index}`} className="text-xs text-red-700 dark:text-red-300">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div
          className={clsx(
            'rounded-lg border p-4',
            testResult.success
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
          )}
        >
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle2 size={16} className="flex-shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            )}
            <p
              className={clsx(
                'text-sm font-medium',
                testResult.success
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200',
              )}
            >
              {testResult.success ? 'Connection Successful' : 'Connection Failed'}
            </p>
          </div>
          {testResult.message && (
            <p
              className={clsx(
                'mt-1 text-xs',
                testResult.success
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300',
              )}
            >
              {testResult.message}
            </p>
          )}
          {testResult.responseTimeMs !== undefined && (
            <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
              Response time: {testResult.responseTimeMs}ms
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 border-t border-surface-200 pt-4 dark:border-surface-700">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving || isTesting}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={isTesting ? undefined : Activity}
            loading={isTesting}
            onClick={handleTest}
            disabled={isSaving || !selectedAppId}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={isSaving ? undefined : CheckCircle2}
            loading={isSaving}
            onClick={handleSave}
            disabled={isTesting || !selectedAppId}
          >
            {isSaving ? 'Saving...' : 'Save Integration'}
          </Button>
        </div>
      </div>
    </div>
  );
}

IntegrationConfigForm.propTypes = {
  catalogEntry: PropTypes.object,
  existingConfig: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onTest: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
  isTesting: PropTypes.bool,
  testResult: PropTypes.object,
  selectedAppId: PropTypes.string,
  onAppChange: PropTypes.func.isRequired,
  applications: PropTypes.arrayOf(PropTypes.object).isRequired,
  errors: PropTypes.arrayOf(PropTypes.string),
};

/**
 * Catalog filter bar.
 */
function CatalogFilters({
  searchQuery,
  onSearchChange,
  onSearchClear,
  typeFilter,
  onTypeFilterChange,
  typeOptions,
  viewMode,
  onViewModeChange,
  onRefresh,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={14} className="text-surface-400 dark:text-surface-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search integrations..."
            className="block w-48 rounded-lg border border-surface-300 bg-white py-1.5 pl-9 pr-8 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-all duration-200 focus:w-64 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500 sm:w-56 sm:focus:w-72"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={onSearchClear}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="w-48">
          <Select
            id="integration-type-filter"
            placeholder="All Types"
            options={typeOptions}
            value={typeFilter}
            onChange={onTypeFilterChange}
            size="sm"
            clearable
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh */}
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRefresh}>
          Refresh
        </Button>

        {/* View mode toggle */}
        <div className="flex items-center rounded-lg border border-surface-300 bg-white dark:border-surface-600 dark:bg-surface-800">
          <button
            type="button"
            onClick={() => onViewModeChange(VIEW_MODES.CARD)}
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-l-lg transition-colors duration-200',
              viewMode === VIEW_MODES.CARD
                ? 'bg-horizon-50 text-horizon-600 dark:bg-horizon-900/30 dark:text-horizon-400'
                : 'text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300',
            )}
            title="Card view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange(VIEW_MODES.TABLE)}
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors duration-200',
              viewMode === VIEW_MODES.TABLE
                ? 'bg-horizon-50 text-horizon-600 dark:bg-horizon-900/30 dark:text-horizon-400'
                : 'text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300',
            )}
            title="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

CatalogFilters.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  typeFilter: PropTypes.string,
  onTypeFilterChange: PropTypes.func.isRequired,
  typeOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  viewMode: PropTypes.string.isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

/**
 * Configured integrations filter bar.
 */
function ConfiguredFilters({
  searchQuery,
  onSearchChange,
  onSearchClear,
  typeFilter,
  onTypeFilterChange,
  typeOptions,
  appFilter,
  onAppFilterChange,
  appOptions,
  onRefresh,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={14} className="text-surface-400 dark:text-surface-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search configured..."
            className="block w-48 rounded-lg border border-surface-300 bg-white py-1.5 pl-9 pr-8 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-all duration-200 focus:w-64 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500 sm:w-56 sm:focus:w-72"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={onSearchClear}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="w-44">
          <Select
            id="configured-type-filter"
            placeholder="All Types"
            options={typeOptions}
            value={typeFilter}
            onChange={onTypeFilterChange}
            size="sm"
            clearable
          />
        </div>

        {/* Application filter */}
        <div className="w-48">
          <Select
            id="configured-app-filter"
            placeholder="All Applications"
            options={appOptions}
            value={appFilter}
            onChange={onAppFilterChange}
            size="sm"
            clearable
            searchable={appOptions.length > 5}
            searchPlaceholder="Search apps..."
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    </div>
  );
}

ConfiguredFilters.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  typeFilter: PropTypes.string,
  onTypeFilterChange: PropTypes.func.isRequired,
  typeOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  appFilter: PropTypes.string,
  onAppFilterChange: PropTypes.func.isRequired,
  appOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

/**
 * Remove confirmation modal.
 */
function RemoveConfirmModal({ open, integration, onConfirm, onCancel, isRemoving }) {
  if (!integration) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Remove Integration"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isRemoving}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={isRemoving ? undefined : Trash2}
            loading={isRemoving}
            onClick={onConfirm}
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-surface-700 dark:text-surface-300">
          Are you sure you want to remove the{' '}
          <span className="font-semibold">{integration.toolName || integration.toolId}</span>{' '}
          integration from{' '}
          <span className="font-semibold">{integration.applicationName || 'this application'}</span>?
        </p>
        <p className="text-xs text-surface-500 dark:text-surface-400">
          This action cannot be undone. The integration configuration will be permanently deleted.
        </p>
      </div>
    </Modal>
  );
}

RemoveConfirmModal.propTypes = {
  open: PropTypes.bool.isRequired,
  integration: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isRemoving: PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Integration management component for browsing available external systems,
 * configuring connection parameters, testing connectivity, and saving
 * integrations per application. Shows integration status and health.
 * Supports add/remove/edit integrations.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultTab='catalog'] - Default active tab.
 * @param {string} [props.defaultApplicationId] - Pre-selected application ID.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function IntegrationManager({
  defaultTab = 'catalog',
  defaultApplicationId,
  showSummary = true,
  className,
}) {
  const { currentUser, hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [refreshKey, setRefreshKey] = useState(0);

  // Catalog state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState('');
  const [catalogViewMode, setCatalogViewMode] = useState(VIEW_MODES.CARD);

  // Configured state
  const [configuredSearch, setConfiguredSearch] = useState('');
  const [configuredTypeFilter, setConfiguredTypeFilter] = useState('');
  const [configuredAppFilter, setConfiguredAppFilter] = useState('');

  // Config modal state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedCatalogEntry, setSelectedCatalogEntry] = useState(null);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [configAppId, setConfigAppId] = useState(defaultApplicationId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [configErrors, setConfigErrors] = useState([]);

  // Remove modal state
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [integrationToRemove, setIntegrationToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Testing state for configured cards
  const [testingIntegrationId, setTestingIntegrationId] = useState(null);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const integrationSummary = useMemo(() => {
    return getIntegrationSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const applications = useMemo(() => {
    const result = getApplications({ sortBy: 'name', sortOrder: 'asc' });
    return result.data || [];
  }, []);

  const integrationTypes = useMemo(() => {
    return getIntegrationTypes();
  }, []);

  const typeFilterOptions = useMemo(() => {
    return [
      { value: '', label: 'All Types' },
      ...integrationTypes.map((t) => ({ value: t.type, label: t.label })),
    ];
  }, [integrationTypes]);

  const appFilterOptions = useMemo(() => {
    return [
      { value: '', label: 'All Applications' },
      ...applications.map((app) => ({ value: app.id, label: app.name })),
    ];
  }, [applications]);

  // Catalog data
  const catalogIntegrations = useMemo(() => {
    return getAvailableIntegrations({
      type: catalogTypeFilter || undefined,
      search: catalogSearch || undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogSearch, catalogTypeFilter, refreshKey]);

  // Configured integrations
  const configuredIntegrations = useMemo(() => {
    return getIntegrations(configuredAppFilter || undefined, {
      type: configuredTypeFilter || undefined,
      search: configuredSearch || undefined,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuredSearch, configuredTypeFilter, configuredAppFilter, refreshKey]);

  // Tab badges
  const tabsWithBadges = useMemo(() => {
    return INTEGRATION_TABS.map((tab) => {
      let badge;
      if (tab.id === 'catalog') {
        badge = catalogIntegrations.length;
      } else if (tab.id === 'configured') {
        badge = configuredIntegrations.length;
      }
      return { ...tab, badge };
    });
  }, [catalogIntegrations.length, configuredIntegrations.length]);

  // -------------------------------------------------------------------------
  // Handlers — Tab
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Catalog
  // -------------------------------------------------------------------------

  const handleCatalogSearchChange = useCallback((value) => {
    setCatalogSearch(value);
  }, []);

  const handleCatalogSearchClear = useCallback(() => {
    setCatalogSearch('');
  }, []);

  const handleCatalogTypeFilterChange = useCallback((value) => {
    setCatalogTypeFilter(value || '');
  }, []);

  const handleCatalogViewModeChange = useCallback((mode) => {
    setCatalogViewMode(mode);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Configured
  // -------------------------------------------------------------------------

  const handleConfiguredSearchChange = useCallback((value) => {
    setConfiguredSearch(value);
  }, []);

  const handleConfiguredSearchClear = useCallback(() => {
    setConfiguredSearch('');
  }, []);

  const handleConfiguredTypeFilterChange = useCallback((value) => {
    setConfiguredTypeFilter(value || '');
  }, []);

  const handleConfiguredAppFilterChange = useCallback((value) => {
    setConfiguredAppFilter(value || '');
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Refresh
  // -------------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    toast.info('Integration data refreshed.');
  }, [toast]);

  // -------------------------------------------------------------------------
  // Handlers — Configure (Add/Edit)
  // -------------------------------------------------------------------------

  const handleOpenConfigure = useCallback(
    (catalogEntry) => {
      const entry = getAvailableIntegrationById(catalogEntry.id);
      setSelectedCatalogEntry(entry || catalogEntry);
      setEditingIntegration(null);
      setConfigAppId(defaultApplicationId || null);
      setTestResult(null);
      setConfigErrors([]);
      setConfigModalOpen(true);
    },
    [defaultApplicationId],
  );

  const handleEditIntegration = useCallback(
    (integration) => {
      const entry = getAvailableIntegrationById(integration.toolId);
      setSelectedCatalogEntry(entry || null);
      setEditingIntegration(integration);
      setConfigAppId(integration.applicationId || null);
      setTestResult(null);
      setConfigErrors([]);
      setConfigModalOpen(true);
    },
    [],
  );

  const handleConfigAppChange = useCallback((value) => {
    setConfigAppId(value || null);
  }, []);

  const handleCloseConfigModal = useCallback(() => {
    setConfigModalOpen(false);
    setSelectedCatalogEntry(null);
    setEditingIntegration(null);
    setTestResult(null);
    setConfigErrors([]);
  }, []);

  const handleTestFromForm = useCallback(
    async (config) => {
      if (!selectedCatalogEntry) {
        return;
      }

      setIsTesting(true);
      setTestResult(null);
      setConfigErrors([]);

      try {
        const result = await testIntegration(selectedCatalogEntry.id, config, {
          userId: currentUser ? currentUser.id : null,
          applicationId: configAppId || null,
        });

        setTestResult(result.result);

        if (result.success) {
          toast.success(`Successfully connected to ${selectedCatalogEntry.name}.`);
        } else {
          toast.error(result.error || `Failed to connect to ${selectedCatalogEntry.name}.`);
        }
      } catch (_err) {
        setTestResult({
          success: false,
          message: 'Unexpected error during connection test.',
          timestamp: new Date().toISOString(),
        });
        toast.error('Unexpected error during connection test.');
      } finally {
        setIsTesting(false);
      }
    },
    [selectedCatalogEntry, configAppId, currentUser, toast],
  );

  const handleSaveFromForm = useCallback(
    (config) => {
      if (!selectedCatalogEntry) {
        return;
      }

      if (!configAppId) {
        setConfigErrors(['Please select an application.']);
        return;
      }

      // Validate config
      const validationErrors = validateIntegrationConfig(selectedCatalogEntry.id, config);
      if (validationErrors.length > 0) {
        setConfigErrors(validationErrors);
        return;
      }

      setIsSaving(true);
      setConfigErrors([]);

      // Simulate brief delay for UX
      const timer = setTimeout(() => {
        if (editingIntegration) {
          // Update existing
          const result = updateIntegration(
            editingIntegration.applicationId,
            editingIntegration.toolId,
            { config, enabled: editingIntegration.enabled !== false },
            { userId: currentUser ? currentUser.id : null },
          );

          setIsSaving(false);

          if (result.success) {
            toast.success(`${selectedCatalogEntry.name} integration updated successfully.`);
            handleCloseConfigModal();
            setRefreshKey((prev) => prev + 1);
          } else {
            setConfigErrors([result.error || 'Failed to update integration.']);
            toast.error(result.error || 'Failed to update integration.');
          }
        } else {
          // Save new
          const result = saveIntegration(
            configAppId,
            [
              {
                toolId: selectedCatalogEntry.id,
                config,
                enabled: true,
              },
            ],
            { userId: currentUser ? currentUser.id : null },
          );

          setIsSaving(false);

          if (result.success && result.saved > 0) {
            toast.success(`${selectedCatalogEntry.name} integration saved successfully.`);
            handleCloseConfigModal();
            setRefreshKey((prev) => prev + 1);
            setActiveTab('configured');
          } else {
            const errorMsg =
              result.errors && result.errors.length > 0
                ? result.errors.join(' ')
                : 'Failed to save integration.';
            setConfigErrors(result.errors || [errorMsg]);
            toast.error(errorMsg);
          }
        }
      }, 400);

      return () => clearTimeout(timer);
    },
    [selectedCatalogEntry, configAppId, editingIntegration, currentUser, toast, handleCloseConfigModal],
  );

  // -------------------------------------------------------------------------
  // Handlers — Test from configured card
  // -------------------------------------------------------------------------

  const handleTestConfigured = useCallback(
    async (integration) => {
      if (!integration || !integration.toolId) {
        return;
      }

      setTestingIntegrationId(integration.id);

      try {
        const result = await testIntegration(integration.toolId, integration.config || {}, {
          userId: currentUser ? currentUser.id : null,
          applicationId: integration.applicationId || null,
        });

        if (result.success) {
          toast.success(`${integration.toolName || integration.toolId} connection successful.`);
          // Update status
          updateIntegration(
            integration.applicationId,
            integration.toolId,
            { status: INTEGRATION_STATUSES.CONNECTED },
            { userId: currentUser ? currentUser.id : null },
          );
        } else {
          toast.error(result.error || `${integration.toolName || integration.toolId} connection failed.`);
          updateIntegration(
            integration.applicationId,
            integration.toolId,
            { status: INTEGRATION_STATUSES.ERROR },
            { userId: currentUser ? currentUser.id : null },
          );
        }

        setRefreshKey((prev) => prev + 1);
      } catch (_err) {
        toast.error('Unexpected error during connection test.');
      } finally {
        setTestingIntegrationId(null);
      }
    },
    [currentUser, toast],
  );

  // -------------------------------------------------------------------------
  // Handlers — Toggle enabled
  // -------------------------------------------------------------------------

  const handleToggleIntegration = useCallback(
    (integration) => {
      if (!integration) {
        return;
      }

      const newEnabled = !integration.enabled;
      const result = updateIntegration(
        integration.applicationId,
        integration.toolId,
        { enabled: newEnabled },
        { userId: currentUser ? currentUser.id : null },
      );

      if (result.success) {
        toast.info(
          `${integration.toolName || integration.toolId} ${newEnabled ? 'enabled' : 'disabled'}.`,
        );
        setRefreshKey((prev) => prev + 1);
      } else {
        toast.error(result.error || 'Failed to update integration.');
      }
    },
    [currentUser, toast],
  );

  // -------------------------------------------------------------------------
  // Handlers — Remove
  // -------------------------------------------------------------------------

  const handleOpenRemoveModal = useCallback((integration) => {
    setIntegrationToRemove(integration);
    setRemoveModalOpen(true);
  }, []);

  const handleCloseRemoveModal = useCallback(() => {
    setRemoveModalOpen(false);
    setIntegrationToRemove(null);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (!integrationToRemove) {
      return;
    }

    setIsRemoving(true);

    const timer = setTimeout(() => {
      const result = removeIntegration(
        integrationToRemove.applicationId,
        integrationToRemove.toolId,
        { userId: currentUser ? currentUser.id : null },
      );

      setIsRemoving(false);

      if (result.success) {
        toast.success(
          `${integrationToRemove.toolName || integrationToRemove.toolId} integration removed.`,
        );
        handleCloseRemoveModal();
        setRefreshKey((prev) => prev + 1);
      } else {
        toast.error(result.error || 'Failed to remove integration.');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [integrationToRemove, currentUser, toast, handleCloseRemoveModal]);

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  const canManageIntegrations = hasPermission('manage_toolchain');

  // -------------------------------------------------------------------------
  // Active filter counts
  // -------------------------------------------------------------------------

  const catalogFilterCount = useMemo(() => {
    let count = 0;
    if (catalogSearch.trim().length > 0) count++;
    if (catalogTypeFilter) count++;
    return count;
  }, [catalogSearch, catalogTypeFilter]);

  const configuredFilterCount = useMemo(() => {
    let count = 0;
    if (configuredSearch.trim().length > 0) count++;
    if (configuredTypeFilter) count++;
    if (configuredAppFilter) count++;
    return count;
  }, [configuredSearch, configuredTypeFilter, configuredAppFilter]);

  const handleClearCatalogFilters = useCallback(() => {
    setCatalogSearch('');
    setCatalogTypeFilter('');
  }, []);

  const handleClearConfiguredFilters = useCallback(() => {
    setConfiguredSearch('');
    setConfiguredTypeFilter('');
    setConfiguredAppFilter('');
  }, []);

  // -------------------------------------------------------------------------
  // Render — Catalog Tab
  // -------------------------------------------------------------------------

  const renderCatalogContent = () => {
    if (catalogIntegrations.length === 0) {
      return (
        <EmptyState
          icon={Plug}
          title="No integrations found"
          description={
            catalogFilterCount > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'No integrations are available in the catalog.'
          }
          size="md"
          bordered
        />
      );
    }

    if (catalogViewMode === VIEW_MODES.TABLE) {
      return (
        <div className="space-y-2">
          {catalogIntegrations.map((integration) => {
            const typeColor = getTypeColor(integration.type);
            const TypeIcon = getTypeIcon(integration.type);

            return (
              <div
                key={integration.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenConfigure(integration)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenConfigure(integration);
                  }
                }}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-surface-200 bg-white px-4 py-3 transition-all duration-200 hover:border-horizon-300 hover:shadow-card dark:border-surface-700 dark:bg-surface-800 dark:hover:border-horizon-600"
              >
                <div
                  className={clsx(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                    typeColor.bg,
                  )}
                >
                  <TypeIcon size={18} className={typeColor.text} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {integration.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-400">
                    {integration.description}
                  </p>
                </div>
                <Badge variant={typeColor.badge} size="sm">
                  {formatTypeLabel(integration.type)}
                </Badge>
                <ChevronRight
                  size={16}
                  className="flex-shrink-0 text-surface-300 dark:text-surface-600"
                />
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalogIntegrations.map((integration) => (
          <CatalogCard
            key={integration.id}
            integration={integration}
            onConfigure={handleOpenConfigure}
          />
        ))}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render — Configured Tab
  // -------------------------------------------------------------------------

  const renderConfiguredContent = () => {
    if (configuredIntegrations.length === 0) {
      return (
        <EmptyState
          icon={Settings}
          title="No configured integrations"
          description={
            configuredFilterCount > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'No integrations have been configured yet. Browse the catalog to add integrations.'
          }
          actionLabel={canManageIntegrations ? 'Browse Catalog' : undefined}
          onAction={
            canManageIntegrations
              ? () => setActiveTab('catalog')
              : undefined
          }
          actionIcon={Plug}
          size="md"
          bordered
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {configuredIntegrations.map((integration) => (
          <ConfiguredIntegrationCard
            key={integration.id}
            integration={integration}
            onEdit={canManageIntegrations ? handleEditIntegration : undefined}
            onTest={handleTestConfigured}
            onRemove={canManageIntegrations ? handleOpenRemoveModal : undefined}
            onToggle={canManageIntegrations ? handleToggleIntegration : undefined}
            isTesting={testingIntegrationId === integration.id}
          />
        ))}
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
          Integration Manager
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Browse available external system integrations, configure connection parameters, test
          connectivity, and manage integrations per application.
        </p>
      </div>

      {/* Summary Bar */}
      {showSummary && <IntegrationSummaryBar summary={integrationSummary} />}

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
      <div className="mt-4">
        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <CatalogFilters
              searchQuery={catalogSearch}
              onSearchChange={handleCatalogSearchChange}
              onSearchClear={handleCatalogSearchClear}
              typeFilter={catalogTypeFilter}
              onTypeFilterChange={handleCatalogTypeFilterChange}
              typeOptions={typeFilterOptions}
              viewMode={catalogViewMode}
              onViewModeChange={handleCatalogViewModeChange}
              onRefresh={handleRefresh}
            />

            {/* Active filters indicator */}
            {catalogFilterCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Filter size={14} className="text-surface-400 dark:text-surface-500" />
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    {catalogFilterCount} {catalogFilterCount === 1 ? 'filter' : 'filters'} active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearCatalogFilters}
                  className="text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
                >
                  Clear all
                </button>
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  · {catalogIntegrations.length}{' '}
                  {catalogIntegrations.length === 1 ? 'result' : 'results'}
                </span>
              </div>
            )}

            {renderCatalogContent()}
          </div>
        )}

        {/* Configured Tab */}
        {activeTab === 'configured' && (
          <div className="space-y-4">
            <ConfiguredFilters
              searchQuery={configuredSearch}
              onSearchChange={handleConfiguredSearchChange}
              onSearchClear={handleConfiguredSearchClear}
              typeFilter={configuredTypeFilter}
              onTypeFilterChange={handleConfiguredTypeFilterChange}
              typeOptions={typeFilterOptions}
              appFilter={configuredAppFilter}
              onAppFilterChange={handleConfiguredAppFilterChange}
              appOptions={appFilterOptions}
              onRefresh={handleRefresh}
            />

            {/* Active filters indicator */}
            {configuredFilterCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Filter size={14} className="text-surface-400 dark:text-surface-500" />
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    {configuredFilterCount}{' '}
                    {configuredFilterCount === 1 ? 'filter' : 'filters'} active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearConfiguredFilters}
                  className="text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
                >
                  Clear all
                </button>
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  · {configuredIntegrations.length}{' '}
                  {configuredIntegrations.length === 1 ? 'result' : 'results'}
                </span>
              </div>
            )}

            {renderConfiguredContent()}
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      <Modal
        open={configModalOpen}
        onClose={handleCloseConfigModal}
        title={
          editingIntegration
            ? `Edit ${selectedCatalogEntry ? selectedCatalogEntry.name : 'Integration'}`
            : `Configure ${selectedCatalogEntry ? selectedCatalogEntry.name : 'Integration'}`
        }
        size="lg"
      >
        <IntegrationConfigForm
          catalogEntry={selectedCatalogEntry}
          existingConfig={editingIntegration ? editingIntegration.config : null}
          onSave={handleSaveFromForm}
          onTest={handleTestFromForm}
          onCancel={handleCloseConfigModal}
          isSaving={isSaving}
          isTesting={isTesting}
          testResult={testResult}
          selectedAppId={configAppId}
          onAppChange={handleConfigAppChange}
          applications={applications}
          errors={configErrors}
        />
      </Modal>

      {/* Remove Confirmation Modal */}
      <RemoveConfirmModal
        open={removeModalOpen}
        integration={integrationToRemove}
        onConfirm={handleConfirmRemove}
        onCancel={handleCloseRemoveModal}
        isRemoving={isRemoving}
      />
    </div>
  );
}

IntegrationManager.propTypes = {
  defaultTab: PropTypes.oneOf(['catalog', 'configured']),
  defaultApplicationId: PropTypes.string,
  showSummary: PropTypes.bool,
  className: PropTypes.string,
};