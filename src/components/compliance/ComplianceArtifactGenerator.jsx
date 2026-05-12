/**
 * Compliance artifact generation UI component for Horizon DevSecOps Portal
 * Select artifact type (change record, QE evidence, security scan report,
 * sign-off pack, audit documentation), select application/pipeline context,
 * configure artifact parameters, generate and preview artifact, download
 * as PDF/JSON. Shows generation history and status.
 * @module components/compliance/ComplianceArtifactGenerator
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  ClipboardCheck,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  GitBranch,
  Info,
  LayoutGrid,
  List,
  Loader2,
  Package,
  Play,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Ticket,
  Trash2,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Modal from '../common/Modal.jsx';
import Select from '../common/Select.jsx';
import StatusIndicator from '../common/StatusIndicator.jsx';
import Table from '../common/Table.jsx';
import Tabs from '../common/Tabs.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import {
  generateArtifact,
  generateChangeRecord,
  generateQEEvidence,
  generateSecurityScanReport,
  generateSignOffPack,
  generateAuditDocumentation,
  getArtifacts,
  getArtifactById,
  getArtifactSummary,
  updateArtifactStatus,
  deleteArtifact,
  downloadArtifact,
  exportArtifacts,
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_LIST,
} from '../../services/ComplianceArtifactService.js';
import { getApplications, getApplicationById } from '../../services/CatalogService.js';
import { getDomains } from '../../services/CatalogService.js';
import { getPipelineByApplicationId } from '../../services/PipelineService.js';
import {
  COMPLIANCE_STATUSES,
  COMPLIANCE_STATUS_LIST,
  COMPLIANCE_ARTIFACT_TYPES,
  ENVIRONMENTS,
  ENVIRONMENT_LIST,
  CRITICALITY_TIERS,
  SEVERITY_LEVELS,
} from '../../constants/constants.js';
import { formatDate, formatNumber } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GENERATOR_TABS = [
  { id: 'generate', label: 'Generate Artifact', icon: ShieldCheck },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'summary', label: 'Summary', icon: BarChart3 },
];

/**
 * Artifact type options for the generator form.
 * @type {Array<Object>}
 */
const ARTIFACT_TYPE_OPTIONS = [
  {
    value: 'change_record',
    label: 'ITM Change Record',
    description: 'ServiceNow change record for deployment',
    icon: Ticket,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    value: 'qe_evidence',
    label: 'QE Evidence Package',
    description: 'Quality Engineering test results and coverage',
    icon: ClipboardCheck,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    value: 'security_scan',
    label: 'Security Scan Report',
    description: 'SAST/DAST/SCA/Container scan results',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
  {
    value: 'sign_off_pack',
    label: 'Sign-Off Pack',
    description: 'Comprehensive deployment sign-off package',
    icon: CheckCircle2,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    value: 'audit_documentation',
    label: 'Audit Documentation',
    description: 'HIPAA/CMS audit-ready documentation',
    icon: FileText,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
];

const SCAN_TYPE_OPTIONS = [
  { value: 'consolidated', label: 'Consolidated (All Scans)' },
  { value: 'sast', label: 'SAST (Static Analysis)' },
  { value: 'dast', label: 'DAST (Dynamic Analysis)' },
  { value: 'sca', label: 'SCA (Software Composition)' },
  { value: 'container', label: 'Container Scan' },
];

const CHANGE_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard Change' },
  { value: 'normal', label: 'Normal Change' },
  { value: 'emergency', label: 'Emergency Change' },
];

const AUDIT_TYPE_OPTIONS = [
  { value: 'comprehensive', label: 'Comprehensive Audit' },
  { value: 'security', label: 'Security Audit' },
  { value: 'operational', label: 'Operational Audit' },
  { value: 'compliance', label: 'Compliance Audit' },
];

const ENVIRONMENT_OPTIONS = ENVIRONMENT_LIST.map((env) => ({
  value: env,
  label: env,
}));

const STATUS_VARIANT_MAP = {
  [COMPLIANCE_STATUSES.COMPLIANT]: 'success',
  [COMPLIANCE_STATUSES.NON_COMPLIANT]: 'danger',
  [COMPLIANCE_STATUSES.PARTIAL]: 'warning',
  [COMPLIANCE_STATUSES.PENDING_REVIEW]: 'info',
  [COMPLIANCE_STATUSES.NOT_APPLICABLE]: 'neutral',
};

// ---------------------------------------------------------------------------
// History Table Columns
// ---------------------------------------------------------------------------

const HISTORY_COLUMNS = [
  {
    id: 'generatedAt',
    header: 'Generated',
    accessor: 'generatedAt',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value ? formatDate(value, { format: 'relative' }) : 'N/A'}
      </span>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    accessor: 'type',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <Badge variant="neutral" size="sm">
        {value || 'N/A'}
      </Badge>
    ),
  },
  {
    id: 'applicationName',
    header: 'Application',
    accessor: 'applicationName',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
        {value || 'General'}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    sortable: true,
    cell: (value) => {
      const variant = STATUS_VARIANT_MAP[value] || 'neutral';
      return (
        <Badge variant={variant} size="sm" dot>
          {value || 'N/A'}
        </Badge>
      );
    },
  },
  {
    id: 'generatedBy',
    header: 'Generated By',
    accessor: 'generatedBy',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value || 'System'}
      </span>
    ),
  },
  {
    id: 'tool',
    header: 'Tool',
    accessor: 'tool',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'name',
    header: 'Name',
    accessor: 'name',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="truncate text-xs text-surface-700 dark:text-surface-300" title={value}>
        {value || 'N/A'}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Summary statistics bar.
 */
function ArtifactSummaryBar({ summary }) {
  if (!summary) {
    return null;
  }

  const stats = [
    {
      label: 'Total Artifacts',
      value: summary.totalArtifacts || 0,
      icon: ShieldCheck,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-900/30',
    },
    {
      label: 'Compliance Rate',
      value: `${summary.complianceRate || 0}%`,
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Critical Findings',
      value: summary.criticalFindings || 0,
      icon: AlertCircle,
      color: summary.criticalFindings > 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-green-600 dark:text-green-400',
      bg: summary.criticalFindings > 0
        ? 'bg-red-50 dark:bg-red-900/30'
        : 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'High Findings',
      value: summary.highFindings || 0,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
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

ArtifactSummaryBar.propTypes = {
  summary: PropTypes.shape({
    totalArtifacts: PropTypes.number,
    complianceRate: PropTypes.number,
    criticalFindings: PropTypes.number,
    highFindings: PropTypes.number,
    byType: PropTypes.array,
    byStatus: PropTypes.array,
    byApplication: PropTypes.array,
    recentArtifacts: PropTypes.array,
  }),
};

/**
 * Artifact type selector card.
 */
function ArtifactTypeCard({ option, isSelected, onSelect, disabled }) {
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

ArtifactTypeCard.propTypes = {
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
 * Change record configuration form.
 */
function ChangeRecordConfig({ config, onChange, disabled }) {
  const handleFieldChange = useCallback(
    (field, value) => {
      onChange({ ...config, [field]: value });
    },
    [config, onChange],
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
        Change Record Configuration
      </h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="change-type"
          label="Change Type"
          placeholder="Select change type..."
          options={CHANGE_TYPE_OPTIONS}
          value={config.changeType || 'standard'}
          onChange={(val) => handleFieldChange('changeType', val)}
          size="sm"
          disabled={disabled}
        />
        <Select
          id="change-environment"
          label="Target Environment"
          placeholder="Select environment..."
          options={ENVIRONMENT_OPTIONS}
          value={config.environment || ENVIRONMENTS.PROD}
          onChange={(val) => handleFieldChange('environment', val)}
          size="sm"
          disabled={disabled}
        />
        <div>
          <label
            htmlFor="change-version"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Version
          </label>
          <input
            id="change-version"
            type="text"
            value={config.version || ''}
            onChange={(e) => handleFieldChange('version', e.target.value)}
            placeholder="e.g. 2.15.0"
            disabled={disabled}
            className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
        <div>
          <label
            htmlFor="change-assignment-group"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Assignment Group
          </label>
          <input
            id="change-assignment-group"
            type="text"
            value={config.assignmentGroup || ''}
            onChange={(e) => handleFieldChange('assignmentGroup', e.target.value)}
            placeholder="e.g. Platform Engineering"
            disabled={disabled}
            className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="change-reason"
          className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          Change Reason
        </label>
        <textarea
          id="change-reason"
          value={config.changeReason || ''}
          onChange={(e) => handleFieldChange('changeReason', e.target.value)}
          placeholder="Describe the reason for this change..."
          rows={3}
          disabled={disabled}
          className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
        />
      </div>
    </div>
  );
}

ChangeRecordConfig.propTypes = {
  config: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Security scan report configuration form.
 */
function SecurityScanConfig({ config, onChange, disabled }) {
  const handleFieldChange = useCallback(
    (field, value) => {
      onChange({ ...config, [field]: value });
    },
    [config, onChange],
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
        Security Scan Configuration
      </h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="scan-type"
          label="Scan Type"
          placeholder="Select scan type..."
          options={SCAN_TYPE_OPTIONS}
          value={config.scanType || 'consolidated'}
          onChange={(val) => handleFieldChange('scanType', val)}
          size="sm"
          disabled={disabled}
        />
        <div>
          <label
            htmlFor="scan-tool"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Scanning Tool
          </label>
          <input
            id="scan-tool"
            type="text"
            value={config.tool || ''}
            onChange={(e) => handleFieldChange('tool', e.target.value)}
            placeholder="e.g. Checkmarx, SonarQube"
            disabled={disabled}
            className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
        <div>
          <label
            htmlFor="scan-version"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Application Version
          </label>
          <input
            id="scan-version"
            type="text"
            value={config.version || ''}
            onChange={(e) => handleFieldChange('version', e.target.value)}
            placeholder="e.g. 2.15.0"
            disabled={disabled}
            className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
          Findings (Optional Override)
        </label>
        <div className="grid grid-cols-5 gap-2">
          {['critical', 'high', 'medium', 'low', 'info'].map((severity) => (
            <div key={severity}>
              <label
                htmlFor={`finding-${severity}`}
                className="mb-1 block text-2xs font-medium capitalize text-surface-500 dark:text-surface-400"
              >
                {severity}
              </label>
              <input
                id={`finding-${severity}`}
                type="number"
                min="0"
                value={
                  config.findings && config.findings[severity] !== undefined
                    ? config.findings[severity]
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  handleFieldChange('findings', {
                    ...(config.findings || {}),
                    [severity]: val,
                  });
                }}
                placeholder="0"
                disabled={disabled}
                className="block w-full rounded-lg border border-surface-300 bg-white px-2 py-1.5 text-center text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

SecurityScanConfig.propTypes = {
  config: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Sign-off pack configuration form.
 */
function SignOffPackConfig({ config, onChange, disabled }) {
  const handleFieldChange = useCallback(
    (field, value) => {
      onChange({ ...config, [field]: value });
    },
    [config, onChange],
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
        Sign-Off Pack Configuration
      </h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="signoff-environment"
          label="Target Environment"
          placeholder="Select environment..."
          options={ENVIRONMENT_OPTIONS}
          value={config.environment || ENVIRONMENTS.PROD}
          onChange={(val) => handleFieldChange('environment', val)}
          size="sm"
          disabled={disabled}
        />
        <div>
          <label
            htmlFor="signoff-version"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Version
          </label>
          <input
            id="signoff-version"
            type="text"
            value={config.version || ''}
            onChange={(e) => handleFieldChange('version', e.target.value)}
            placeholder="e.g. 2.15.0"
            disabled={disabled}
            className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
        <div>
          <label
            htmlFor="signoff-approver"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Approved By
          </label>
          <input
            id="signoff-approver"
            type="text"
            value={config.approvedBy || ''}
            onChange={(e) => handleFieldChange('approvedBy', e.target.value)}
            placeholder="e.g. Application Owner"
            disabled={disabled}
            className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="signoff-notes"
          className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          Notes
        </label>
        <textarea
          id="signoff-notes"
          value={config.notes || ''}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          placeholder="Additional notes for the sign-off pack..."
          rows={2}
          disabled={disabled}
          className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
        />
      </div>
    </div>
  );
}

SignOffPackConfig.propTypes = {
  config: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * Audit documentation configuration form.
 */
function AuditDocConfig({ config, onChange, domainOptions, disabled }) {
  const handleFieldChange = useCallback(
    (field, value) => {
      onChange({ ...config, [field]: value });
    },
    [config, onChange],
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
        Audit Documentation Configuration
      </h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="audit-type"
          label="Audit Type"
          placeholder="Select audit type..."
          options={AUDIT_TYPE_OPTIONS}
          value={config.auditType || 'comprehensive'}
          onChange={(val) => handleFieldChange('auditType', val)}
          size="sm"
          disabled={disabled}
        />
        <Select
          id="audit-domain"
          label="Domain Scope"
          placeholder="All Domains"
          options={domainOptions}
          value={config.domain || ''}
          onChange={(val) => handleFieldChange('domain', val || '')}
          size="sm"
          clearable
          disabled={disabled}
        />
        <div>
          <label
            htmlFor="audit-period"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Audit Period
          </label>
          <input
            id="audit-period"
            type="text"
            value={config.period || ''}
            onChange={(e) => handleFieldChange('period', e.target.value)}
            placeholder="e.g. 2024-Q4"
            disabled={disabled}
            className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
        <div>
          <label
            htmlFor="audit-prepared-by"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Prepared By
          </label>
          <input
            id="audit-prepared-by"
            type="text"
            value={config.preparedBy || ''}
            onChange={(e) => handleFieldChange('preparedBy', e.target.value)}
            placeholder="e.g. Compliance Team"
            disabled={disabled}
            className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
      </div>
    </div>
  );
}

AuditDocConfig.propTypes = {
  config: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  domainOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  disabled: PropTypes.bool,
};

/**
 * Artifact preview component.
 */
function ArtifactPreview({ artifact, onDownload, onClose }) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const toggleVisible = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  const handleCopy = useCallback(() => {
    if (!artifact || !artifact.content) {
      return;
    }
    try {
      navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    } catch (_err) {
      const textarea = document.createElement('textarea');
      textarea.value = artifact.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [artifact]);

  if (!artifact) {
    return null;
  }

  const statusVariant = STATUS_VARIANT_MAP[artifact.status] || 'neutral';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            {artifact.name || 'Artifact'}
          </h3>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            {artifact.description || ''}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant} size="sm" dot>
              {artifact.status || 'N/A'}
            </Badge>
            <Badge variant="neutral" size="sm">
              {artifact.type || 'N/A'}
            </Badge>
            <span className="text-2xs text-surface-400 dark:text-surface-500">
              {artifact.generatedAt
                ? formatDate(artifact.generatedAt, { format: 'relative' })
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-900/50">
          <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">Application</p>
          <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
            {artifact.applicationName || 'General'}
          </p>
        </div>
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-900/50">
          <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">Generated By</p>
          <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
            {artifact.generatedBy || 'System'}
          </p>
        </div>
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-900/50">
          <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">Tool</p>
          <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
            {artifact.tool || 'Horizon Portal'}
          </p>
        </div>
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-900/50">
          <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">Artifact ID</p>
          <p className="mt-0.5 truncate font-mono text-xs text-surface-900 dark:text-surface-100">
            {artifact.id || 'N/A'}
          </p>
        </div>
      </div>

      {/* Findings */}
      {artifact.findings && typeof artifact.findings === 'object' && (
        <div>
          <p className="mb-2 text-sm font-semibold text-surface-900 dark:text-surface-100">
            Findings Summary
          </p>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(artifact.findings).map(([severity, count]) => {
              const severityColors = {
                critical: 'text-red-600 dark:text-red-400',
                high: 'text-orange-600 dark:text-orange-400',
                medium: 'text-amber-600 dark:text-amber-400',
                low: 'text-blue-600 dark:text-blue-400',
                info: 'text-surface-500 dark:text-surface-400',
              };
              return (
                <div
                  key={severity}
                  className="flex flex-col items-center rounded-lg border border-surface-200 bg-white p-2 dark:border-surface-700 dark:bg-surface-800"
                >
                  <span className={clsx('text-lg font-semibold', severityColors[severity] || 'text-surface-600')}>
                    {count}
                  </span>
                  <span className="text-2xs capitalize text-surface-500 dark:text-surface-400">
                    {severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content preview */}
      {artifact.content && (
        <div className="rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
          <div className="flex items-center justify-between border-b border-surface-200 px-4 py-2.5 dark:border-surface-700">
            <div className="flex items-center gap-2">
              <Code2 size={14} className="text-horizon-500" />
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                Document Content
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-medium text-surface-500 transition-colors duration-200 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
              >
                {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={toggleVisible}
                className="flex items-center gap-1 text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
              >
                {visible ? <EyeOff size={12} /> : <Eye size={12} />}
                {visible ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {visible && (
            <div className="max-h-64 overflow-auto scrollbar-thin">
              <pre className="m-0 rounded-none border-0 bg-surface-900 p-4 text-xs leading-relaxed text-surface-100">
                <code>{artifact.content}</code>
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 border-t border-surface-200 pt-4 dark:border-surface-700">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={() => onDownload(artifact.id, 'text')}
          >
            Download Text
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={() => onDownload(artifact.id, 'json')}
          >
            Download JSON
          </Button>
        </div>
      </div>
    </div>
  );
}

ArtifactPreview.propTypes = {
  artifact: PropTypes.object,
  onDownload: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * Generation result display.
 */
function GenerationResult({ result, onPreview, onGenerateAnother }) {
  if (!result) {
    return null;
  }

  return (
    <div className="space-y-4">
      {result.success && result.artifact && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="flex-shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Artifact Generated Successfully
              </p>
              <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">
                {result.artifact.name || result.artifact.type || 'Artifact'} has been generated.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" size="sm" icon={Eye} onClick={() => onPreview(result.artifact)}>
              Preview Artifact
            </Button>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onGenerateAnother}>
              Generate Another
            </Button>
          </div>
        </div>
      )}

      {!result.success && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                Artifact Generation Failed
              </p>
              <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">
                {result.error || 'An unexpected error occurred.'}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onGenerateAnother}>
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

GenerationResult.propTypes = {
  result: PropTypes.object,
  onPreview: PropTypes.func.isRequired,
  onGenerateAnother: PropTypes.func.isRequired,
};

/**
 * Summary charts section.
 */
function SummarySection({ summary }) {
  if (!summary) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No artifact data"
        description="Generate compliance artifacts to see summary data."
        size="md"
        bordered
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* By Type */}
      {Array.isArray(summary.byType) && summary.byType.length > 0 && (
        <Card variant="default" title="Artifacts by Type" icon={ShieldCheck}>
          <div className="space-y-2">
            {summary.byType.map((entry) => {
              const percentage =
                summary.totalArtifacts > 0
                  ? ((entry.count / summary.totalArtifacts) * 100).toFixed(1)
                  : 0;

              return (
                <div
                  key={entry.type}
                  className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
                >
                  <span className="truncate text-xs text-surface-700 dark:text-surface-300">
                    {entry.type}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                      <div
                        className="h-full rounded-full bg-horizon-500"
                        style={{ width: `${Math.min(100, Number(percentage))}%` }}
                      />
                    </div>
                    <span className="min-w-[3rem] text-right text-xs font-medium text-surface-700 dark:text-surface-300">
                      {entry.count} ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* By Status */}
      {Array.isArray(summary.byStatus) && summary.byStatus.length > 0 && (
        <Card variant="default" title="Artifacts by Status" icon={Shield}>
          <div className="space-y-2">
            {summary.byStatus.map((entry) => {
              const variant = STATUS_VARIANT_MAP[entry.status] || 'neutral';
              const percentage =
                summary.totalArtifacts > 0
                  ? ((entry.count / summary.totalArtifacts) * 100).toFixed(1)
                  : 0;

              return (
                <div
                  key={entry.status}
                  className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
                >
                  <Badge variant={variant} size="sm" dot>
                    {entry.status}
                  </Badge>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          variant === 'success'
                            ? 'bg-green-500'
                            : variant === 'danger'
                              ? 'bg-red-500'
                              : variant === 'warning'
                                ? 'bg-amber-500'
                                : variant === 'info'
                                  ? 'bg-blue-500'
                                  : 'bg-surface-400',
                        )}
                        style={{ width: `${Math.min(100, Number(percentage))}%` }}
                      />
                    </div>
                    <span className="min-w-[3rem] text-right text-xs font-medium text-surface-700 dark:text-surface-300">
                      {entry.count} ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* By Application */}
      {Array.isArray(summary.byApplication) && summary.byApplication.length > 0 && (
        <Card variant="default" title="Artifacts by Application" icon={Server}>
          <div className="space-y-2">
            {summary.byApplication.map((entry) => (
              <div
                key={entry.applicationName}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
                  {entry.applicationName}
                </span>
                <Badge variant="horizon" size="sm">
                  {entry.count}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Artifacts */}
      {Array.isArray(summary.recentArtifacts) && summary.recentArtifacts.length > 0 && (
        <Card variant="default" title="Recent Artifacts" icon={Clock}>
          <div className="space-y-2">
            {summary.recentArtifacts.slice(0, 5).map((artifact) => {
              const variant = STATUS_VARIANT_MAP[artifact.status] || 'neutral';
              return (
                <div
                  key={artifact.id}
                  className="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={variant} size="sm">
                        {artifact.status}
                      </Badge>
                      <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-100">
                        {artifact.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-2xs text-surface-400 dark:text-surface-500">
                      {artifact.applicationName || 'General'} · {artifact.generatedBy || 'System'}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-2xs text-surface-400 dark:text-surface-500">
                    {artifact.generatedAt
                      ? formatDate(artifact.generatedAt, { format: 'relative' })
                      : 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

SummarySection.propTypes = {
  summary: PropTypes.object,
};

/**
 * History filter bar.
 */
function HistoryFilterBar({
  searchQuery,
  onSearchChange,
  onSearchClear,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  appFilter,
  onAppFilterChange,
  appOptions,
  onRefresh,
  onExport,
}) {
  const typeOptions = useMemo(() => {
    return [
      { value: '', label: 'All Types' },
      ...ARTIFACT_TYPE_LIST.map((t) => ({ value: t, label: t })),
    ];
  }, []);

  const statusOptions = useMemo(() => {
    return [
      { value: '', label: 'All Statuses' },
      ...COMPLIANCE_STATUS_LIST.map((s) => ({ value: s, label: s })),
    ];
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={14} className="text-surface-400 dark:text-surface-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search artifacts..."
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
        <div className="w-44">
          <Select
            id="history-type-filter"
            placeholder="All Types"
            options={typeOptions}
            value={typeFilter}
            onChange={onTypeFilterChange}
            size="sm"
            clearable
          />
        </div>
        <div className="w-40">
          <Select
            id="history-status-filter"
            placeholder="All Statuses"
            options={statusOptions}
            value={statusFilter}
            onChange={onStatusFilterChange}
            size="sm"
            clearable
          />
        </div>
        <div className="w-48">
          <Select
            id="history-app-filter"
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
        <Button variant="secondary" size="sm" icon={Download} onClick={onExport}>
          Export
        </Button>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    </div>
  );
}

HistoryFilterBar.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  typeFilter: PropTypes.string,
  onTypeFilterChange: PropTypes.func.isRequired,
  statusFilter: PropTypes.string,
  onStatusFilterChange: PropTypes.func.isRequired,
  appFilter: PropTypes.string,
  onAppFilterChange: PropTypes.func.isRequired,
  appOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onRefresh: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Compliance artifact generation UI component.
 * Select artifact type (change record, QE evidence, security scan report,
 * sign-off pack, audit documentation), select application/pipeline context,
 * configure artifact parameters, generate and preview artifact, download
 * as PDF/JSON. Shows generation history and status.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultTab='generate'] - Default active tab.
 * @param {string} [props.defaultApplicationId] - Pre-selected application ID.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function ComplianceArtifactGenerator({
  defaultTab = 'generate',
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

  // Generator state
  const [selectedArtifactType, setSelectedArtifactType] = useState(null);
  const [selectedAppId, setSelectedAppId] = useState(defaultApplicationId || null);
  const [artifactConfig, setArtifactConfig] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewArtifact, setPreviewArtifact] = useState(null);

  // History state
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');
  const [historyAppFilter, setHistoryAppFilter] = useState('');

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const applications = useMemo(() => {
    const result = getApplications({ sortBy: 'name', sortOrder: 'asc' });
    return result.data || [];
  }, []);

  const applicationOptions = useMemo(() => {
    return [
      { value: '', label: 'All Applications' },
      ...applications.map((app) => ({
        value: app.id,
        label: app.name,
        description: `${app.domainName || 'N/A'} · ${app.criticalityTier || 'N/A'}`,
      })),
    ];
  }, [applications]);

  const generatorAppOptions = useMemo(() => {
    return applications.map((app) => ({
      value: app.id,
      label: app.name,
      description: `${app.domainName || 'N/A'} · ${app.criticalityTier || 'N/A'}`,
    }));
  }, [applications]);

  const allDomains = useMemo(() => {
    return getDomains({ sortBy: 'name', sortOrder: 'asc' });
  }, []);

  const domainOptions = useMemo(() => {
    return [
      { value: '', label: 'All Domains' },
      ...allDomains.map((d) => ({ value: d.name, label: d.name })),
    ];
  }, [allDomains]);

  const selectedApplication = useMemo(() => {
    if (!selectedAppId) {
      return null;
    }
    return getApplicationById(selectedAppId) || null;
  }, [selectedAppId]);

  const artifactSummary = useMemo(() => {
    return getArtifactSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const historyData = useMemo(() => {
    const filters = {
      search: historySearch || undefined,
      type: historyTypeFilter || undefined,
      status: historyStatusFilter || undefined,
      applicationId: historyAppFilter || undefined,
      sortBy: 'generatedAt',
      sortOrder: 'desc',
    };
    const { data, total } = getArtifacts(filters);
    return { data, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historySearch, historyTypeFilter, historyStatusFilter, historyAppFilter, refreshKey]);

  // Tab badges
  const tabsWithBadges = useMemo(() => {
    return GENERATOR_TABS.map((tab) => {
      let badge;
      if (tab.id === 'history') {
        badge = historyData.total || undefined;
      } else if (tab.id === 'summary') {
        badge = artifactSummary ? artifactSummary.totalArtifacts : undefined;
      }
      return { ...tab, badge };
    });
  }, [historyData.total, artifactSummary]);

  // -------------------------------------------------------------------------
  // Handlers — Tab
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Generator
  // -------------------------------------------------------------------------

  const handleArtifactTypeSelect = useCallback((type) => {
    setSelectedArtifactType(type);
    setArtifactConfig({});
    setGenerationResult(null);
  }, []);

  const handleAppChange = useCallback((value) => {
    setSelectedAppId(value || null);
    setGenerationResult(null);
  }, []);

  const handleConfigChange = useCallback((newConfig) => {
    setArtifactConfig(newConfig);
  }, []);

  const handleGenerate = useCallback(() => {
    if (!selectedArtifactType) {
      toast.error('Please select an artifact type.');
      return;
    }

    const requiresApp = ['change_record', 'qe_evidence', 'security_scan', 'sign_off_pack'].includes(
      selectedArtifactType,
    );

    if (requiresApp && !selectedAppId) {
      toast.error('Please select an application for this artifact type.');
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);

    const timer = setTimeout(() => {
      let result;

      try {
        switch (selectedArtifactType) {
          case 'change_record':
            result = generateChangeRecord({
              applicationId: selectedAppId,
              applicationName: selectedApplication ? selectedApplication.name : undefined,
              changeType: artifactConfig.changeType || 'standard',
              changeReason: artifactConfig.changeReason || undefined,
              environment: artifactConfig.environment || ENVIRONMENTS.PROD,
              version: artifactConfig.version || '1.0.0',
              assignmentGroup: artifactConfig.assignmentGroup || 'Platform Engineering',
              requestedBy: currentUser
                ? `${currentUser.firstName} ${currentUser.lastName}`
                : 'System',
              userId: currentUser ? currentUser.id : null,
            });
            break;

          case 'qe_evidence':
            result = generateQEEvidence({
              applicationId: selectedAppId,
              applicationName: selectedApplication ? selectedApplication.name : undefined,
              userId: currentUser ? currentUser.id : null,
            });
            break;

          case 'security_scan':
            result = generateSecurityScanReport({
              applicationId: selectedAppId,
              applicationName: selectedApplication ? selectedApplication.name : undefined,
              scanType: artifactConfig.scanType || 'consolidated',
              tool: artifactConfig.tool || 'Multiple',
              version: artifactConfig.version || '1.0.0',
              findings: artifactConfig.findings || undefined,
              userId: currentUser ? currentUser.id : null,
            });
            break;

          case 'sign_off_pack':
            result = generateSignOffPack(selectedAppId, {
              environment: artifactConfig.environment || ENVIRONMENTS.PROD,
              version: artifactConfig.version || '1.0.0',
              approvedBy: artifactConfig.approvedBy || 'Application Owner',
              notes: artifactConfig.notes || '',
              userId: currentUser ? currentUser.id : null,
            });
            break;

          case 'audit_documentation':
            result = generateAuditDocumentation({
              domain: artifactConfig.domain || undefined,
              applicationId: selectedAppId || undefined,
              period: artifactConfig.period || undefined,
              auditType: artifactConfig.auditType || 'comprehensive',
              preparedBy: artifactConfig.preparedBy || 'Compliance Team',
              userId: currentUser ? currentUser.id : null,
            });
            break;

          default:
            result = generateArtifact(selectedArtifactType, {
              applicationId: selectedAppId || undefined,
              applicationName: selectedApplication ? selectedApplication.name : undefined,
              userId: currentUser ? currentUser.id : null,
            });
            break;
        }
      } catch (_err) {
        result = { success: false, artifact: null, error: 'Unexpected error during generation.' };
      }

      setIsGenerating(false);
      setGenerationResult(result);
      setRefreshKey((prev) => prev + 1);

      if (result && result.success) {
        toast.success('Compliance artifact generated successfully!', {
          title: 'Artifact Generated',
        });
      } else {
        toast.error(
          result && result.error ? result.error : 'Failed to generate artifact.',
          { title: 'Generation Failed' },
        );
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    selectedArtifactType,
    selectedAppId,
    selectedApplication,
    artifactConfig,
    currentUser,
    toast,
  ]);

  const handleGenerateAnother = useCallback(() => {
    setGenerationResult(null);
    setArtifactConfig({});
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Preview
  // -------------------------------------------------------------------------

  const handlePreview = useCallback((artifact) => {
    setPreviewArtifact(artifact);
    setPreviewModalOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewModalOpen(false);
    setPreviewArtifact(null);
  }, []);

  const handleHistoryRowClick = useCallback(
    (row) => {
      const artifact = getArtifactById(row.id);
      if (artifact) {
        handlePreview(artifact);
      }
    },
    [handlePreview],
  );

  // -------------------------------------------------------------------------
  // Handlers — Download
  // -------------------------------------------------------------------------

  const handleDownload = useCallback(
    (artifactId, format) => {
      const result = downloadArtifact(artifactId, {
        format: format || 'text',
        userId: currentUser ? currentUser.id : null,
      });

      if (result.success && result.content) {
        const blob = new Blob([result.content], { type: result.mimeType || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.fileName || 'artifact.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Artifact downloaded successfully.');
      } else {
        toast.error(result.error || 'Failed to download artifact.');
      }
    },
    [currentUser, toast],
  );

  // -------------------------------------------------------------------------
  // Handlers — History
  // -------------------------------------------------------------------------

  const handleHistorySearchChange = useCallback((value) => {
    setHistorySearch(value);
  }, []);

  const handleHistorySearchClear = useCallback(() => {
    setHistorySearch('');
  }, []);

  const handleHistoryTypeFilterChange = useCallback((value) => {
    setHistoryTypeFilter(value || '');
  }, []);

  const handleHistoryStatusFilterChange = useCallback((value) => {
    setHistoryStatusFilter(value || '');
  }, []);

  const handleHistoryAppFilterChange = useCallback((value) => {
    setHistoryAppFilter(value || '');
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Refresh & Export
  // -------------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    toast.info('Artifact data refreshed.');
  }, [toast]);

  const handleExport = useCallback(() => {
    const result = exportArtifacts(
      {
        applicationId: historyAppFilter || undefined,
        type: historyTypeFilter || undefined,
        status: historyStatusFilter || undefined,
        search: historySearch || undefined,
      },
      {
        includeContent: false,
        userId: currentUser ? currentUser.id : null,
      },
    );

    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-artifacts-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.count} artifacts.`);
    } else {
      toast.error('Failed to export artifacts.');
    }
  }, [historyAppFilter, historyTypeFilter, historyStatusFilter, historySearch, currentUser, toast]);

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  const canGenerateArtifacts = hasPermission('generate_artifacts') || hasPermission('manage_compliance');

  // -------------------------------------------------------------------------
  // Render — Generate Tab
  // -------------------------------------------------------------------------

  const renderGenerateContent = () => {
    return (
      <div className="space-y-6">
        {/* Generation Result */}
        {generationResult && (
          <GenerationResult
            result={generationResult}
            onPreview={handlePreview}
            onGenerateAnother={handleGenerateAnother}
          />
        )}

        {/* Step 1: Select Artifact Type */}
        <Card variant="default" title="1. Select Artifact Type" icon={ShieldCheck}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ARTIFACT_TYPE_OPTIONS.map((option) => (
              <ArtifactTypeCard
                key={option.value}
                option={option}
                isSelected={selectedArtifactType === option.value}
                onSelect={handleArtifactTypeSelect}
                disabled={isGenerating}
              />
            ))}
          </div>
        </Card>

        {/* Step 2: Select Application */}
        {selectedArtifactType && (
          <Card variant="default" title="2. Select Application" icon={Server}>
            <div className="space-y-4">
              <Select
                id="artifact-app-selector"
                label="Application"
                placeholder={
                  selectedArtifactType === 'audit_documentation'
                    ? 'Optional - leave empty for all applications'
                    : 'Select an application...'
                }
                options={generatorAppOptions}
                value={selectedAppId}
                onChange={handleAppChange}
                searchable={generatorAppOptions.length > 5}
                searchPlaceholder="Search applications..."
                clearable
                required={selectedArtifactType !== 'audit_documentation'}
                disabled={isGenerating}
                size="md"
                fullWidth
                hint={
                  selectedArtifactType === 'audit_documentation'
                    ? 'Leave empty to generate documentation for all applications.'
                    : 'Select the application this artifact is for.'
                }
              />

              {selectedApplication && (
                <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                        {selectedApplication.name}
                      </h4>
                      {selectedApplication.shortCode && (
                        <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
                          {selectedApplication.shortCode}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        selectedApplication.criticalityTier === CRITICALITY_TIERS.BUSINESS_CRITICAL
                          ? 'danger'
                          : selectedApplication.criticalityTier === CRITICALITY_TIERS.MISSION_CRITICAL
                            ? 'warning'
                            : 'info'
                      }
                      size="sm"
                      dot
                    >
                      {selectedApplication.criticalityTier || 'N/A'}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-surface-500 dark:text-surface-400">
                    <span>{selectedApplication.domainName || 'N/A'}</span>
                    <span>·</span>
                    <span>{selectedApplication.portfolioName || 'N/A'}</span>
                    {selectedApplication.ownerName && (
                      <>
                        <span>·</span>
                        <span>{selectedApplication.ownerName}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 3: Configure Parameters */}
        {selectedArtifactType && (
          <Card variant="default" title="3. Configure Parameters" icon={Settings}>
            {selectedArtifactType === 'change_record' && (
              <ChangeRecordConfig
                config={artifactConfig}
                onChange={handleConfigChange}
                disabled={isGenerating}
              />
            )}

            {selectedArtifactType === 'qe_evidence' && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  QE Evidence Configuration
                </h4>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  QE evidence will be automatically generated from the application&apos;s pipeline
                  data, test results, and code coverage metrics. No additional configuration is
                  required.
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-horizon-50 p-3 dark:bg-horizon-900/20">
                  <Info size={16} className="flex-shrink-0 text-horizon-600 dark:text-horizon-400" />
                  <p className="text-xs text-horizon-700 dark:text-horizon-300">
                    Data will be sourced from KPI metrics, pipeline runs, and security scan results.
                  </p>
                </div>
              </div>
            )}

            {selectedArtifactType === 'security_scan' && (
              <SecurityScanConfig
                config={artifactConfig}
                onChange={handleConfigChange}
                disabled={isGenerating}
              />
            )}

            {selectedArtifactType === 'sign_off_pack' && (
              <SignOffPackConfig
                config={artifactConfig}
                onChange={handleConfigChange}
                disabled={isGenerating}
              />
            )}

            {selectedArtifactType === 'audit_documentation' && (
              <AuditDocConfig
                config={artifactConfig}
                onChange={handleConfigChange}
                domainOptions={domainOptions}
                disabled={isGenerating}
              />
            )}
          </Card>
        )}

        {/* Step 4: Generate */}
        {selectedArtifactType && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-400 dark:text-surface-500">
              {selectedApplication
                ? `Generating ${ARTIFACT_TYPE_OPTIONS.find((o) => o.value === selectedArtifactType)?.label || 'artifact'} for ${selectedApplication.name}`
                : `Generating ${ARTIFACT_TYPE_OPTIONS.find((o) => o.value === selectedArtifactType)?.label || 'artifact'}`}
            </p>
            <Button
              variant="primary"
              size="md"
              icon={isGenerating ? undefined : Play}
              loading={isGenerating}
              onClick={handleGenerate}
              disabled={isGenerating || !canGenerateArtifacts}
            >
              {isGenerating ? 'Generating...' : 'Generate Artifact'}
            </Button>
          </div>
        )}

        {/* No permission warning */}
        {!canGenerateArtifacts && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You do not have permission to generate compliance artifacts. Contact an administrator.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedArtifactType && (
          <EmptyState
            icon={ShieldCheck}
            title="Select an artifact type"
            description="Choose a compliance artifact type above to configure and generate."
            size="md"
            bordered
          />
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render — History Tab
  // -------------------------------------------------------------------------

  const renderHistoryContent = () => {
    return (
      <div className="space-y-4">
        <HistoryFilterBar
          searchQuery={historySearch}
          onSearchChange={handleHistorySearchChange}
          onSearchClear={handleHistorySearchClear}
          typeFilter={historyTypeFilter}
          onTypeFilterChange={handleHistoryTypeFilterChange}
          statusFilter={historyStatusFilter}
          onStatusFilterChange={handleHistoryStatusFilterChange}
          appFilter={historyAppFilter}
          onAppFilterChange={handleHistoryAppFilterChange}
          appOptions={applicationOptions}
          onRefresh={handleRefresh}
          onExport={handleExport}
        />

        {historyData.data.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No artifacts found"
            description={
              historySearch || historyTypeFilter || historyStatusFilter || historyAppFilter
                ? 'Try adjusting your search or filter criteria.'
                : 'No compliance artifacts have been generated yet. Use the Generate tab to create artifacts.'
            }
            actionLabel="Generate Artifact"
            onAction={() => setActiveTab('generate')}
            actionIcon={ShieldCheck}
            size="md"
            bordered
          />
        ) : (
          <Table
            columns={HISTORY_COLUMNS}
            data={historyData.data}
            searchable={false}
            paginated
            pageSize={20}
            density="compact"
            hoverable
            striped={false}
            onRowClick={handleHistoryRowClick}
            emptyMessage="No artifacts found."
            noResultsMessage="No artifacts match your search."
            defaultSortColumn="generatedAt"
            defaultSortOrder="desc"
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
          Compliance Artifact Generator
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Generate audit-ready compliance artifacts including ITM change records, QE evidence
          packages, security scan reports, sign-off packs, and HIPAA/CMS audit documentation.
        </p>
      </div>

      {/* Summary Bar */}
      {showSummary && <ArtifactSummaryBar summary={artifactSummary} />}

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
        {activeTab === 'generate' && renderGenerateContent()}
        {activeTab === 'history' && renderHistoryContent()}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={handleRefresh}>
                Refresh
              </Button>
            </div>
            <SummarySection summary={artifactSummary} />
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        open={previewModalOpen}
        onClose={handleClosePreview}
        title={previewArtifact ? previewArtifact.name || 'Artifact Preview' : 'Artifact Preview'}
        size="lg"
      >
        <ArtifactPreview
          artifact={previewArtifact}
          onDownload={handleDownload}
          onClose={handleClosePreview}
        />
      </Modal>
    </div>
  );
}

ComplianceArtifactGenerator.propTypes = {
  defaultTab: PropTypes.oneOf(['generate', 'history', 'summary']),
  defaultApplicationId: PropTypes.string,
  showSummary: PropTypes.bool,
  className: PropTypes.string,
};