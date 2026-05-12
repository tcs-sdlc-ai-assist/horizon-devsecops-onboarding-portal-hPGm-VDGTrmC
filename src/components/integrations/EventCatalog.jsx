/**
 * Event catalog component for Horizon DevSecOps Portal
 * Displays available Kafka event topics, schemas, and recent events.
 * Shows event types (pipeline execution, incident remediation, SLO breach
 * rollback), event schema details, and event log with timestamps.
 * Supports publishing test events.
 * @module components/integrations/EventCatalog
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Filter,
  GitBranch,
  Globe,
  Info,
  LayoutGrid,
  List,
  Loader2,
  MessageSquare,
  Play,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Ticket,
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
import Tabs from '../common/Tabs.jsx';
import Table from '../common/Table.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import {
  publish,
  getEventLog,
  getEventCatalog,
  getEventCategories,
  getEventLogSummary,
  getSubscriptionInfo,
  acknowledgeEvent,
  clearEventLog,
  EVENT_TOPICS,
  EVENT_SEVERITIES,
  EVENT_SEVERITY_LIST,
} from '../../services/EventBusService.js';
import { formatDate } from '../../utils/formatters.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIEW_MODES = Object.freeze({
  CARD: 'card',
  TABLE: 'table',
});

const CATALOG_TABS = [
  { id: 'catalog', label: 'Event Catalog', icon: Radio },
  { id: 'log', label: 'Event Log', icon: Clock },
  { id: 'summary', label: 'Summary', icon: Activity },
];

/**
 * Map event category to icon component.
 * @type {Object<string, import('react').ElementType>}
 */
const CATEGORY_ICONS = {
  pipeline: GitBranch,
  deployment: Server,
  incident: AlertTriangle,
  slo: ShieldCheck,
  security: Shield,
  compliance: ShieldCheck,
  application: Settings,
  toolchain: Settings,
  metrics: Activity,
  alert: AlertCircle,
  audit: Info,
};

/**
 * Map event category to color classes.
 * @type {Object<string, { bg: string, text: string, badge: string }>}
 */
const CATEGORY_COLORS = {
  pipeline: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'purple',
  },
  deployment: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    badge: 'success',
  },
  incident: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    badge: 'danger',
  },
  slo: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'warning',
  },
  security: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    badge: 'danger',
  },
  compliance: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    badge: 'info',
  },
  application: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'info',
  },
  toolchain: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-600 dark:text-teal-400',
    badge: 'info',
  },
  metrics: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    badge: 'info',
  },
  alert: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'warning',
  },
  audit: {
    bg: 'bg-surface-50 dark:bg-surface-900/20',
    text: 'text-surface-600 dark:text-surface-400',
    badge: 'neutral',
  },
};

const DEFAULT_CATEGORY_COLOR = {
  bg: 'bg-surface-50 dark:bg-surface-900/20',
  text: 'text-surface-600 dark:text-surface-400',
  badge: 'neutral',
};

/**
 * Map severity to badge variant.
 * @type {Object<string, string>}
 */
const SEVERITY_VARIANT_MAP = {
  [EVENT_SEVERITIES.CRITICAL]: 'danger',
  [EVENT_SEVERITIES.HIGH]: 'danger',
  [EVENT_SEVERITIES.MEDIUM]: 'warning',
  [EVENT_SEVERITIES.LOW]: 'info',
  [EVENT_SEVERITIES.INFO]: 'neutral',
};

/**
 * Sample test event payloads for each topic.
 * @type {Object<string, Object>}
 */
const SAMPLE_PAYLOADS = {
  [EVENT_TOPICS.PIPELINE_EXECUTION]: {
    pipelineId: 'PIPE-TEST-001',
    applicationId: 'APP-0001',
    applicationName: 'Member Portal',
    trigger: 'manual',
    branch: 'main',
    commitSha: 'abc123def456',
  },
  [EVENT_TOPICS.PIPELINE_FAILURE]: {
    pipelineId: 'PIPE-TEST-001',
    applicationName: 'Member Portal',
    buildNumber: 999,
    failedStage: 'SAST',
    errorMessage: 'Critical vulnerabilities detected in authentication module',
  },
  [EVENT_TOPICS.PIPELINE_SUCCESS]: {
    pipelineId: 'PIPE-TEST-001',
    applicationName: 'Member Portal',
    buildNumber: 999,
    durationSeconds: 1620,
    environment: 'Prod',
  },
  [EVENT_TOPICS.DEPLOYMENT_SUCCESS]: {
    applicationName: 'Member Portal',
    environment: 'Prod',
    version: '2.15.0',
    durationSeconds: 120,
  },
  [EVENT_TOPICS.DEPLOYMENT_FAILURE]: {
    applicationName: 'Member Portal',
    environment: 'Prod',
    version: '2.15.0',
    errorMessage: 'Health check failed after deployment',
  },
  [EVENT_TOPICS.INCIDENT_CREATED]: {
    incidentId: 'INC-TEST-001',
    applicationName: 'Member Portal',
    title: 'Test incident - elevated error rate',
    severity: 'High',
    assignee: 'sarah.chen',
  },
  [EVENT_TOPICS.INCIDENT_REMEDIATION]: {
    incidentId: 'INC-TEST-001',
    applicationName: 'Member Portal',
    remediationType: 'auto-scale',
    remediationAction: 'Scale up replicas from 3 to 5',
    automated: true,
  },
  [EVENT_TOPICS.SLO_BREACH]: {
    applicationName: 'API Gateway',
    sloName: 'Availability SLO',
    sloTarget: 99.99,
    currentValue: 99.85,
    environment: 'Prod',
  },
  [EVENT_TOPICS.SLO_BREACH_ROLLBACK]: {
    applicationName: 'API Gateway',
    sloName: 'Availability SLO',
    environment: 'Prod',
    fromVersion: '5.3.0',
    toVersion: '5.2.0',
    breachDetails: { metric: 'availability', target: 99.99, current: 99.85 },
  },
  [EVENT_TOPICS.SECURITY_VULNERABILITY_FOUND]: {
    applicationName: 'Member Portal',
    vulnerabilityId: 'CVE-2024-TEST',
    severity: 'Critical',
    description: 'Test critical vulnerability in authentication module',
    source: 'Checkmarx',
  },
  [EVENT_TOPICS.COMPLIANCE_VIOLATION]: {
    applicationName: 'Care Radius',
    violationType: 'Missing security scan',
    description: 'SAST scan not completed within required timeframe',
    regulation: 'HIPAA',
  },
  [EVENT_TOPICS.APPLICATION_ONBOARDED]: {
    applicationId: 'APP-TEST-001',
    applicationName: 'Test Application',
    domainName: 'Digital Experience',
    portfolioName: 'Customer Portal',
    criticalityTier: 'Business Operational',
  },
  [EVENT_TOPICS.METRICS_THRESHOLD_BREACH]: {
    applicationName: 'Member Portal',
    metricName: 'response_time_p95',
    threshold: 500,
    currentValue: 750,
    environment: 'Prod',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getCategoryIcon = (category) => CATEGORY_ICONS[category] || Radio;
const getCategoryColor = (category) => CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;

const formatTopicLabel = (topic) => {
  if (!topic || typeof topic !== 'string') {
    return 'Unknown';
  }
  return topic
    .replace(/\./g, ' → ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// ---------------------------------------------------------------------------
// Event Log Table Columns
// ---------------------------------------------------------------------------

const EVENT_LOG_COLUMNS = [
  {
    id: 'timestamp',
    header: 'Timestamp',
    accessor: 'timestamp',
    sortable: true,
    cell: (value) => (
      <span className="text-xs text-surface-500 dark:text-surface-400">
        {value ? formatDate(value, { format: 'relative' }) : 'N/A'}
      </span>
    ),
  },
  {
    id: 'topic',
    header: 'Topic',
    accessor: 'topic',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-100">
        {value || 'N/A'}
      </span>
    ),
  },
  {
    id: 'severity',
    header: 'Severity',
    accessor: 'severity',
    sortable: true,
    cell: (value) => {
      const variant = SEVERITY_VARIANT_MAP[value] || 'neutral';
      return (
        <Badge variant={variant} size="sm">
          {value || 'N/A'}
        </Badge>
      );
    },
  },
  {
    id: 'source',
    header: 'Source',
    accessor: 'source',
    sortable: true,
    searchable: true,
    cell: (value) => (
      <span className="text-xs text-surface-700 dark:text-surface-300">{value || 'N/A'}</span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    sortable: true,
    cell: (value) => {
      const statusMap = {
        published: 'pending',
        delivered: 'active',
        processed: 'success',
        failed: 'error',
        acknowledged: 'success',
      };
      const resolvedStatus = statusMap[value] || 'info';
      return <StatusIndicator status={resolvedStatus} label={value || 'N/A'} size="sm" />;
    },
  },
  {
    id: 'deliveredTo',
    header: 'Delivered',
    accessor: 'deliveredTo',
    sortable: true,
    align: 'center',
    cell: (value) => (
      <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
        {typeof value === 'number' ? value : 0}
      </span>
    ),
  },
  {
    id: 'correlationId',
    header: 'Correlation ID',
    accessor: 'correlationId',
    sortable: false,
    searchable: true,
    cell: (value) => (
      <span className="truncate font-mono text-2xs text-surface-400 dark:text-surface-500">
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
function EventSummaryBar({ summary, subscriptionInfo }) {
  const stats = [
    {
      label: 'Event Types',
      value: getEventCatalog().length,
      icon: Radio,
      color: 'text-horizon-600 dark:text-horizon-400',
      bg: 'bg-horizon-50 dark:bg-horizon-900/30',
    },
    {
      label: 'Total Events',
      value: summary ? summary.totalEvents : 0,
      icon: Zap,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Categories',
      value: getEventCategories().length,
      icon: LayoutGrid,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
    {
      label: 'Active Subscriptions',
      value: subscriptionInfo ? subscriptionInfo.totalHandlers : 0,
      icon: MessageSquare,
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

EventSummaryBar.propTypes = {
  summary: PropTypes.shape({
    totalEvents: PropTypes.number,
    byTopic: PropTypes.array,
    bySeverity: PropTypes.array,
    byCategory: PropTypes.array,
    byStatus: PropTypes.array,
    recentEvents: PropTypes.array,
  }),
  subscriptionInfo: PropTypes.shape({
    totalTopics: PropTypes.number,
    totalHandlers: PropTypes.number,
    topics: PropTypes.array,
  }),
};

/**
 * Event catalog card component.
 */
function EventCatalogCard({ event, onPublishTest, onViewSchema }) {
  const categoryColor = getCategoryColor(event.category);
  const CategoryIcon = getCategoryIcon(event.category);
  const severityVariant = SEVERITY_VARIANT_MAP[event.severity] || 'neutral';

  const handlePublish = useCallback(
    (e) => {
      e.stopPropagation();
      if (typeof onPublishTest === 'function') {
        onPublishTest(event);
      }
    },
    [event, onPublishTest],
  );

  const handleViewSchema = useCallback(
    (e) => {
      e.stopPropagation();
      if (typeof onViewSchema === 'function') {
        onViewSchema(event);
      }
    },
    [event, onViewSchema],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && typeof onViewSchema === 'function') {
        e.preventDefault();
        onViewSchema(event);
      }
    },
    [event, onViewSchema],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleViewSchema}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col rounded-xl border border-surface-200 bg-white p-5 shadow-card transition-all duration-200 hover:border-horizon-300 hover:shadow-elevated dark:border-surface-700 dark:bg-surface-800 dark:hover:border-horizon-600"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
              categoryColor.bg,
            )}
          >
            <CategoryIcon size={20} className={categoryColor.text} />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
              {event.name}
            </h4>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge variant={categoryColor.badge} size="sm">
                {event.category}
              </Badge>
              <Badge variant={severityVariant} size="sm">
                {event.severity}
              </Badge>
            </div>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="flex-shrink-0 text-surface-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-surface-400 dark:text-surface-600"
        />
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
        {event.description}
      </p>

      {/* Topic */}
      <div className="mt-3 flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500">
        <Radio size={12} className="flex-shrink-0" />
        <span className="truncate font-mono text-2xs">{event.topic}</span>
      </div>

      {/* Downstream actions count */}
      {Array.isArray(event.downstreamActions) && event.downstreamActions.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500">
          <ArrowRight size={12} className="flex-shrink-0" />
          <span>
            {event.downstreamActions.length}{' '}
            {event.downstreamActions.length === 1 ? 'downstream action' : 'downstream actions'}
          </span>
        </div>
      )}

      {/* Schema fields count */}
      {event.payloadSchema && typeof event.payloadSchema === 'object' && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500">
          <Code2 size={12} className="flex-shrink-0" />
          <span>{Object.keys(event.payloadSchema).length} payload fields</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-surface-100 pt-3 dark:border-surface-700">
        <button
          type="button"
          onClick={handleViewSchema}
          className="flex items-center gap-1 text-2xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
        >
          <Eye size={10} />
          Schema
        </button>
        <button
          type="button"
          onClick={handlePublish}
          className="flex items-center gap-1 text-2xs font-medium text-green-600 transition-colors duration-200 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
        >
          <Send size={10} />
          Publish Test
        </button>
      </div>
    </div>
  );
}

EventCatalogCard.propTypes = {
  event: PropTypes.shape({
    topic: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    severity: PropTypes.string,
    category: PropTypes.string,
    payloadSchema: PropTypes.object,
    downstreamActions: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onPublishTest: PropTypes.func,
  onViewSchema: PropTypes.func,
};

/**
 * Event schema detail modal content.
 */
function EventSchemaDetail({ event }) {
  const [showPayload, setShowPayload] = useState(true);

  const togglePayload = useCallback(() => {
    setShowPayload((prev) => !prev);
  }, []);

  if (!event) {
    return null;
  }

  const categoryColor = getCategoryColor(event.category);
  const CategoryIcon = getCategoryIcon(event.category);
  const severityVariant = SEVERITY_VARIANT_MAP[event.severity] || 'neutral';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg',
            categoryColor.bg,
          )}
        >
          <CategoryIcon size={24} className={categoryColor.text} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            {event.name}
          </h3>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            {event.description}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant={categoryColor.badge} size="sm">
              {event.category}
            </Badge>
            <Badge variant={severityVariant} size="sm">
              {event.severity}
            </Badge>
          </div>
        </div>
      </div>

      {/* Topic */}
      <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Topic</p>
        <p className="mt-0.5 font-mono text-sm text-surface-900 dark:text-surface-100">
          {event.topic}
        </p>
      </div>

      {/* Payload Schema */}
      {event.payloadSchema && typeof event.payloadSchema === 'object' && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 size={14} className="text-horizon-500" />
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Payload Schema
              </p>
            </div>
            <button
              type="button"
              onClick={togglePayload}
              className="flex items-center gap-1 text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
            >
              {showPayload ? <EyeOff size={12} /> : <Eye size={12} />}
              {showPayload ? 'Hide' : 'Show'}
            </button>
          </div>
          {showPayload && (
            <div className="rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
              <div className="divide-y divide-surface-100 dark:divide-surface-700">
                {Object.entries(event.payloadSchema).map(([key, type]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="font-mono text-xs font-medium text-surface-900 dark:text-surface-100">
                      {key}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Downstream Actions */}
      {Array.isArray(event.downstreamActions) && event.downstreamActions.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ArrowRight size={14} className="text-horizon-500" />
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Downstream Actions ({event.downstreamActions.length})
            </p>
          </div>
          <div className="space-y-1.5">
            {event.downstreamActions.map((action, index) => (
              <div
                key={`action-${index}`}
                className="flex items-center gap-2 rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-200 text-2xs font-semibold text-surface-600 dark:bg-surface-700 dark:text-surface-400">
                  {index + 1}
                </span>
                <span className="text-xs text-surface-700 dark:text-surface-300">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample Payload */}
      {SAMPLE_PAYLOADS[event.topic] && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Code2 size={14} className="text-horizon-500" />
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Sample Payload
            </p>
          </div>
          <div className="max-h-48 overflow-auto rounded-lg scrollbar-thin">
            <pre className="m-0 rounded-lg border-0 bg-surface-900 p-4 text-xs leading-relaxed text-surface-100">
              <code>{JSON.stringify(SAMPLE_PAYLOADS[event.topic], null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

EventSchemaDetail.propTypes = {
  event: PropTypes.object,
};

/**
 * Publish test event modal content.
 */
function PublishTestEventForm({
  event,
  onPublish,
  onCancel,
  isPublishing,
  publishResult,
}) {
  const [payload, setPayload] = useState(() => {
    const sample = SAMPLE_PAYLOADS[event ? event.topic : ''];
    return sample ? JSON.stringify(sample, null, 2) : '{}';
  });
  const [payloadError, setPayloadError] = useState(null);

  const handlePayloadChange = useCallback((e) => {
    setPayload(e.target.value);
    setPayloadError(null);
  }, []);

  const handlePublish = useCallback(() => {
    try {
      const parsed = JSON.parse(payload);
      setPayloadError(null);
      if (typeof onPublish === 'function') {
        onPublish(parsed);
      }
    } catch (_err) {
      setPayloadError('Invalid JSON payload. Please check the syntax.');
    }
  }, [payload, onPublish]);

  if (!event) {
    return null;
  }

  const categoryColor = getCategoryColor(event.category);
  const CategoryIcon = getCategoryIcon(event.category);

  return (
    <div className="space-y-4">
      {/* Event info */}
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
            categoryColor.bg,
          )}
        >
          <CategoryIcon size={20} className={categoryColor.text} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            {event.name}
          </h4>
          <p className="mt-0.5 font-mono text-2xs text-surface-400 dark:text-surface-500">
            {event.topic}
          </p>
        </div>
      </div>

      {/* Payload editor */}
      <div>
        <label
          htmlFor="event-payload"
          className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          Event Payload (JSON)
        </label>
        <textarea
          id="event-payload"
          value={payload}
          onChange={handlePayloadChange}
          rows={10}
          className={clsx(
            'block w-full rounded-lg border bg-white px-3 py-2 font-mono text-xs text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500',
            payloadError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700'
              : 'border-surface-300 focus:border-horizon-500 focus:ring-horizon-500/20 dark:border-surface-600',
          )}
        />
        {payloadError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{payloadError}</p>
        )}
      </div>

      {/* Publish result */}
      {publishResult && (
        <div
          className={clsx(
            'rounded-lg border p-3',
            publishResult.success
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
          )}
        >
          <div className="flex items-center gap-2">
            {publishResult.success ? (
              <CheckCircle2 size={16} className="flex-shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            )}
            <p
              className={clsx(
                'text-sm font-medium',
                publishResult.success
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200',
              )}
            >
              {publishResult.success ? 'Event Published Successfully' : 'Failed to Publish Event'}
            </p>
          </div>
          {publishResult.success && publishResult.event && (
            <div className="mt-1.5 space-y-0.5 text-xs text-green-700 dark:text-green-300">
              <p>Event ID: {publishResult.event.id}</p>
              <p>Delivered to: {publishResult.deliveredTo} subscriber(s)</p>
              <p>Correlation ID: {publishResult.event.correlationId}</p>
            </div>
          )}
          {!publishResult.success && publishResult.error && (
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">{publishResult.error}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 border-t border-surface-200 pt-4 dark:border-surface-700">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPublishing}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={isPublishing ? undefined : Send}
          loading={isPublishing}
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? 'Publishing...' : 'Publish Test Event'}
        </Button>
      </div>
    </div>
  );
}

PublishTestEventForm.propTypes = {
  event: PropTypes.object,
  onPublish: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isPublishing: PropTypes.bool,
  publishResult: PropTypes.object,
};

/**
 * Catalog filter bar.
 */
function CatalogFilterBar({
  searchQuery,
  onSearchChange,
  onSearchClear,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
  severityFilter,
  onSeverityFilterChange,
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
            placeholder="Search events..."
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

        {/* Category filter */}
        <div className="w-44">
          <Select
            id="event-category-filter"
            placeholder="All Categories"
            options={categoryOptions}
            value={categoryFilter}
            onChange={onCategoryFilterChange}
            size="sm"
            clearable
          />
        </div>

        {/* Severity filter */}
        <div className="w-36">
          <Select
            id="event-severity-filter"
            placeholder="All Severities"
            options={[
              { value: '', label: 'All Severities' },
              ...EVENT_SEVERITY_LIST.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              })),
            ]}
            value={severityFilter}
            onChange={onSeverityFilterChange}
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

CatalogFilterBar.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  categoryFilter: PropTypes.string,
  onCategoryFilterChange: PropTypes.func.isRequired,
  categoryOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  severityFilter: PropTypes.string,
  onSeverityFilterChange: PropTypes.func.isRequired,
  viewMode: PropTypes.string.isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

/**
 * Event log filter bar.
 */
function EventLogFilterBar({
  searchQuery,
  onSearchChange,
  onSearchClear,
  topicFilter,
  onTopicFilterChange,
  topicOptions,
  severityFilter,
  onSeverityFilterChange,
  onRefresh,
  onClearLog,
  hasPermission,
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
            placeholder="Search event log..."
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

        {/* Topic filter */}
        <div className="w-52">
          <Select
            id="log-topic-filter"
            placeholder="All Topics"
            options={topicOptions}
            value={topicFilter}
            onChange={onTopicFilterChange}
            size="sm"
            clearable
            searchable={topicOptions.length > 5}
            searchPlaceholder="Search topics..."
          />
        </div>

        {/* Severity filter */}
        <div className="w-36">
          <Select
            id="log-severity-filter"
            placeholder="All Severities"
            options={[
              { value: '', label: 'All Severities' },
              ...EVENT_SEVERITY_LIST.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              })),
            ]}
            value={severityFilter}
            onChange={onSeverityFilterChange}
            size="sm"
            clearable
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasPermission && (
          <Button variant="danger" size="sm" onClick={onClearLog}>
            Clear Log
          </Button>
        )}
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    </div>
  );
}

EventLogFilterBar.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  topicFilter: PropTypes.string,
  onTopicFilterChange: PropTypes.func.isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  severityFilter: PropTypes.string,
  onSeverityFilterChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onClearLog: PropTypes.func.isRequired,
  hasPermission: PropTypes.bool.isRequired,
};

/**
 * Summary charts section.
 */
function SummarySection({ summary }) {
  if (!summary) {
    return (
      <EmptyState
        icon={Activity}
        title="No event data"
        description="No events have been published yet. Publish a test event to see summary data."
        size="md"
        bordered
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* By Severity */}
      {Array.isArray(summary.bySeverity) && summary.bySeverity.length > 0 && (
        <Card variant="default" title="Events by Severity" icon={AlertCircle}>
          <div className="space-y-2">
            {summary.bySeverity.map((entry) => {
              const variant = SEVERITY_VARIANT_MAP[entry.severity] || 'neutral';
              const percentage =
                summary.totalEvents > 0
                  ? ((entry.count / summary.totalEvents) * 100).toFixed(1)
                  : 0;

              return (
                <div
                  key={entry.severity}
                  className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={variant} size="sm">
                      {entry.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          variant === 'danger'
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

      {/* By Category */}
      {Array.isArray(summary.byCategory) && summary.byCategory.length > 0 && (
        <Card variant="default" title="Events by Category" icon={LayoutGrid}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.byCategory.map((entry) => {
              const color = getCategoryColor(entry.category);
              const Icon = getCategoryIcon(entry.category);

              return (
                <div
                  key={entry.category}
                  className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800"
                >
                  <div
                    className={clsx(
                      'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                      color.bg,
                    )}
                  >
                    <Icon size={18} className={color.text} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                      {entry.count}
                    </p>
                    <p className="text-2xs text-surface-500 dark:text-surface-400">
                      {entry.category}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* By Topic */}
      {Array.isArray(summary.byTopic) && summary.byTopic.length > 0 && (
        <Card variant="default" title="Events by Topic" icon={Radio}>
          <div className="max-h-64 space-y-1.5 overflow-y-auto scrollbar-thin">
            {summary.byTopic.map((entry) => (
              <div
                key={entry.topic}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <span className="truncate font-mono text-xs text-surface-700 dark:text-surface-300">
                  {entry.topic}
                </span>
                <Badge variant="horizon" size="sm">
                  {entry.count}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Events */}
      {Array.isArray(summary.recentEvents) && summary.recentEvents.length > 0 && (
        <Card variant="default" title="Recent Events" icon={Clock}>
          <div className="space-y-2">
            {summary.recentEvents.map((event) => {
              const severityVariant = SEVERITY_VARIANT_MAP[event.severity] || 'neutral';

              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-700 dark:bg-surface-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={severityVariant} size="sm">
                        {event.severity}
                      </Badge>
                      <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-100">
                        {event.topic}
                      </span>
                    </div>
                    <p className="mt-0.5 text-2xs text-surface-400 dark:text-surface-500">
                      Source: {event.source || 'N/A'} · ID: {event.id}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-2xs text-surface-400 dark:text-surface-500">
                    {event.timestamp
                      ? formatDate(event.timestamp, { format: 'relative' })
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
 * Event detail modal for viewing a single event from the log.
 */
function EventDetailView({ event, onAcknowledge, isAcknowledging }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!event) {
      return;
    }
    try {
      navigator.clipboard.writeText(JSON.stringify(event, null, 2));
      setCopied(true);
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    } catch (_err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(event, null, 2);
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
  }, [event]);

  if (!event) {
    return null;
  }

  const severityVariant = SEVERITY_VARIANT_MAP[event.severity] || 'neutral';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-surface-400 dark:text-surface-500">{event.id}</p>
          <p className="mt-0.5 text-sm font-semibold text-surface-900 dark:text-surface-100">
            {event.topic}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={severityVariant} size="sm">
              {event.severity}
            </Badge>
            <Badge variant="neutral" size="sm">
              {event.status}
            </Badge>
            <span className="text-2xs text-surface-400 dark:text-surface-500">
              {event.timestamp
                ? formatDate(event.timestamp, { format: 'relative' })
                : 'N/A'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            title="Copy event JSON"
          >
            {copied ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : (
              <Copy size={14} />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-900/50">
          <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">Source</p>
          <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
            {event.source || 'N/A'}
          </p>
        </div>
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-900/50">
          <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">
            Correlation ID
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-surface-900 dark:text-surface-100">
            {event.correlationId || 'N/A'}
          </p>
        </div>
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-900/50">
          <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">
            Delivered To
          </p>
          <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
            {typeof event.deliveredTo === 'number' ? event.deliveredTo : 0} subscriber(s)
          </p>
        </div>
        <div className="rounded-lg bg-surface-50 p-3 dark:bg-surface-900/50">
          <p className="text-2xs font-medium text-surface-500 dark:text-surface-400">User ID</p>
          <p className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">
            {event.userId || 'System'}
          </p>
        </div>
      </div>

      {/* Payload */}
      {event.payload && typeof event.payload === 'object' && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-surface-900 dark:text-surface-100">
            Payload
          </p>
          <div className="max-h-48 overflow-auto rounded-lg scrollbar-thin">
            <pre className="m-0 rounded-lg border-0 bg-surface-900 p-4 text-xs leading-relaxed text-surface-100">
              <code>{JSON.stringify(event.payload, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Metadata */}
      {event.metadata && typeof event.metadata === 'object' && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-surface-900 dark:text-surface-100">
            Metadata
          </p>
          <div className="max-h-32 overflow-auto rounded-lg scrollbar-thin">
            <pre className="m-0 rounded-lg border-0 bg-surface-900 p-4 text-xs leading-relaxed text-surface-100">
              <code>{JSON.stringify(event.metadata, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Processed By */}
      {Array.isArray(event.processedBy) && event.processedBy.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-surface-900 dark:text-surface-100">
            Processed By
          </p>
          <div className="space-y-1.5">
            {event.processedBy.map((processor, idx) => (
              <div
                key={`proc-${idx}`}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-900/50"
              >
                <span className="text-xs text-surface-700 dark:text-surface-300">
                  {processor.processor || 'N/A'}
                </span>
                <span className="text-2xs text-surface-400 dark:text-surface-500">
                  {processor.acknowledgedAt
                    ? formatDate(processor.acknowledgedAt, { format: 'relative' })
                    : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acknowledge button */}
      {event.status !== 'acknowledged' && (
        <div className="flex items-center justify-end border-t border-surface-200 pt-3 dark:border-surface-700">
          <Button
            variant="secondary"
            size="sm"
            icon={isAcknowledging ? undefined : CheckCircle2}
            loading={isAcknowledging}
            onClick={onAcknowledge}
            disabled={isAcknowledging}
          >
            {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
          </Button>
        </div>
      )}
    </div>
  );
}

EventDetailView.propTypes = {
  event: PropTypes.object,
  onAcknowledge: PropTypes.func.isRequired,
  isAcknowledging: PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Event catalog component displaying available Kafka event topics, schemas,
 * and recent events. Shows event types (pipeline execution, incident
 * remediation, SLO breach rollback), event schema details, and event log
 * with timestamps. Supports publishing test events.
 *
 * @param {Object} [props]
 * @param {string} [props.defaultTab='catalog'] - Default active tab.
 * @param {boolean} [props.showSummary=true] - Whether to show the summary statistics bar.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function EventCatalog({
  defaultTab = 'catalog',
  showSummary = true,
  className,
}) {
  const { currentUser, hasPermission } = useAuth();
  const toast = useToast();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [refreshKey, setRefreshKey] = useState(0);

  // Catalog state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('');
  const [catalogSeverityFilter, setCatalogSeverityFilter] = useState('');
  const [catalogViewMode, setCatalogViewMode] = useState(VIEW_MODES.CARD);

  // Event log state
  const [logSearch, setLogSearch] = useState('');
  const [logTopicFilter, setLogTopicFilter] = useState('');
  const [logSeverityFilter, setLogSeverityFilter] = useState('');

  // Schema modal state
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [selectedCatalogEvent, setSelectedCatalogEvent] = useState(null);

  // Publish modal state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishEvent, setPublishEvent] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Event detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLogEvent, setSelectedLogEvent] = useState(null);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const eventCategories = useMemo(() => {
    return getEventCategories();
  }, []);

  const categoryFilterOptions = useMemo(() => {
    return [
      { value: '', label: 'All Categories' },
      ...eventCategories.map((c) => ({
        value: c,
        label: c.charAt(0).toUpperCase() + c.slice(1),
      })),
    ];
  }, [eventCategories]);

  const catalogEvents = useMemo(() => {
    return getEventCatalog({
      category: catalogCategoryFilter || undefined,
      severity: catalogSeverityFilter || undefined,
      search: catalogSearch || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogSearch, catalogCategoryFilter, catalogSeverityFilter, refreshKey]);

  const eventLogData = useMemo(() => {
    const { entries, total } = getEventLog({
      topic: logTopicFilter || undefined,
      severity: logSeverityFilter || undefined,
      search: logSearch || undefined,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: 200,
    });
    return { entries, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logSearch, logTopicFilter, logSeverityFilter, refreshKey]);

  const eventLogSummary = useMemo(() => {
    return getEventLogSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const subscriptionInfo = useMemo(() => {
    return getSubscriptionInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const topicFilterOptions = useMemo(() => {
    const catalog = getEventCatalog();
    return [
      { value: '', label: 'All Topics' },
      ...catalog.map((e) => ({
        value: e.topic,
        label: e.name,
      })),
    ];
  }, []);

  // Tab badges
  const tabsWithBadges = useMemo(() => {
    return CATALOG_TABS.map((tab) => {
      let badge;
      if (tab.id === 'catalog') {
        badge = catalogEvents.length;
      } else if (tab.id === 'log') {
        badge = eventLogData.total;
      } else if (tab.id === 'summary') {
        badge = eventLogSummary ? eventLogSummary.totalEvents : 0;
      }
      return { ...tab, badge };
    });
  }, [catalogEvents.length, eventLogData.total, eventLogSummary]);

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

  const handleCatalogCategoryFilterChange = useCallback((value) => {
    setCatalogCategoryFilter(value || '');
  }, []);

  const handleCatalogSeverityFilterChange = useCallback((value) => {
    setCatalogSeverityFilter(value || '');
  }, []);

  const handleCatalogViewModeChange = useCallback((mode) => {
    setCatalogViewMode(mode);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Event Log
  // -------------------------------------------------------------------------

  const handleLogSearchChange = useCallback((value) => {
    setLogSearch(value);
  }, []);

  const handleLogSearchClear = useCallback(() => {
    setLogSearch('');
  }, []);

  const handleLogTopicFilterChange = useCallback((value) => {
    setLogTopicFilter(value || '');
  }, []);

  const handleLogSeverityFilterChange = useCallback((value) => {
    setLogSeverityFilter(value || '');
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Refresh
  // -------------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    toast.info('Event data refreshed.');
  }, [toast]);

  // -------------------------------------------------------------------------
  // Handlers — Schema Modal
  // -------------------------------------------------------------------------

  const handleViewSchema = useCallback((event) => {
    setSelectedCatalogEvent(event);
    setSchemaModalOpen(true);
  }, []);

  const handleCloseSchemaModal = useCallback(() => {
    setSchemaModalOpen(false);
    setSelectedCatalogEvent(null);
  }, []);

  // -------------------------------------------------------------------------
  // Handlers — Publish Modal
  // -------------------------------------------------------------------------

  const handleOpenPublishModal = useCallback((event) => {
    setPublishEvent(event);
    setPublishResult(null);
    setPublishModalOpen(true);
  }, []);

  const handleClosePublishModal = useCallback(() => {
    setPublishModalOpen(false);
    setPublishEvent(null);
    setPublishResult(null);
  }, []);

  const handlePublishTestEvent = useCallback(
    (payload) => {
      if (!publishEvent) {
        return;
      }

      setIsPublishing(true);
      setPublishResult(null);

      const timer = setTimeout(() => {
        const result = publish(publishEvent.topic, payload, {
          source: 'horizon-portal-test',
          userId: currentUser ? currentUser.id : null,
          metadata: {
            testEvent: true,
            publishedFrom: 'EventCatalog',
          },
        });

        setIsPublishing(false);
        setPublishResult(result);

        if (result.success) {
          toast.success(`Test event published to "${publishEvent.topic}".`);
          setRefreshKey((prev) => prev + 1);
        } else {
          toast.error(result.error || 'Failed to publish test event.');
        }
      }, 400);

      return () => clearTimeout(timer);
    },
    [publishEvent, currentUser, toast],
  );

  // -------------------------------------------------------------------------
  // Handlers — Event Detail Modal
  // -------------------------------------------------------------------------

  const handleViewEventDetail = useCallback((row) => {
    setSelectedLogEvent(row);
    setDetailModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedLogEvent(null);
  }, []);

  const handleAcknowledgeEvent = useCallback(() => {
    if (!selectedLogEvent) {
      return;
    }

    setIsAcknowledging(true);

    const timer = setTimeout(() => {
      const result = acknowledgeEvent(selectedLogEvent.id, {
        processedBy: 'manual',
        userId: currentUser ? currentUser.id : null,
      });

      setIsAcknowledging(false);

      if (result.success) {
        toast.success('Event acknowledged.');
        setRefreshKey((prev) => prev + 1);
        handleCloseDetailModal();
      } else {
        toast.error(result.error || 'Failed to acknowledge event.');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedLogEvent, currentUser, toast, handleCloseDetailModal]);

  // -------------------------------------------------------------------------
  // Handlers — Clear Log
  // -------------------------------------------------------------------------

  const handleClearLog = useCallback(() => {
    const result = clearEventLog(currentUser ? currentUser.id : null);
    if (result.success) {
      toast.success('Event log cleared.');
      setRefreshKey((prev) => prev + 1);
    } else {
      toast.error('Failed to clear event log.');
    }
  }, [currentUser, toast]);

  // -------------------------------------------------------------------------
  // Permission check
  // -------------------------------------------------------------------------

  const canManageEvents = hasPermission('manage_settings');

  // -------------------------------------------------------------------------
  // Active filter counts
  // -------------------------------------------------------------------------

  const catalogFilterCount = useMemo(() => {
    let count = 0;
    if (catalogSearch.trim().length > 0) count++;
    if (catalogCategoryFilter) count++;
    if (catalogSeverityFilter) count++;
    return count;
  }, [catalogSearch, catalogCategoryFilter, catalogSeverityFilter]);

  const logFilterCount = useMemo(() => {
    let count = 0;
    if (logSearch.trim().length > 0) count++;
    if (logTopicFilter) count++;
    if (logSeverityFilter) count++;
    return count;
  }, [logSearch, logTopicFilter, logSeverityFilter]);

  const handleClearCatalogFilters = useCallback(() => {
    setCatalogSearch('');
    setCatalogCategoryFilter('');
    setCatalogSeverityFilter('');
  }, []);

  const handleClearLogFilters = useCallback(() => {
    setLogSearch('');
    setLogTopicFilter('');
    setLogSeverityFilter('');
  }, []);

  // -------------------------------------------------------------------------
  // Render — Catalog Tab
  // -------------------------------------------------------------------------

  const renderCatalogContent = () => {
    if (catalogEvents.length === 0) {
      return (
        <EmptyState
          icon={Radio}
          title="No event types found"
          description={
            catalogFilterCount > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'No event types are available in the catalog.'
          }
          size="md"
          bordered
        />
      );
    }

    if (catalogViewMode === VIEW_MODES.TABLE) {
      return (
        <div className="space-y-2">
          {catalogEvents.map((event) => {
            const categoryColor = getCategoryColor(event.category);
            const CategoryIcon = getCategoryIcon(event.category);
            const severityVariant = SEVERITY_VARIANT_MAP[event.severity] || 'neutral';

            return (
              <div
                key={event.topic}
                role="button"
                tabIndex={0}
                onClick={() => handleViewSchema(event)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleViewSchema(event);
                  }
                }}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-surface-200 bg-white px-4 py-3 transition-all duration-200 hover:border-horizon-300 hover:shadow-card dark:border-surface-700 dark:bg-surface-800 dark:hover:border-horizon-600"
              >
                <div
                  className={clsx(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                    categoryColor.bg,
                  )}
                >
                  <CategoryIcon size={18} className={categoryColor.text} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {event.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-2xs text-surface-400 dark:text-surface-500">
                    {event.topic}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={categoryColor.badge} size="sm">
                    {event.category}
                  </Badge>
                  <Badge variant={severityVariant} size="sm">
                    {event.severity}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPublishModal(event);
                  }}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium text-green-600 transition-colors duration-200 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                  title="Publish test event"
                >
                  <Send size={12} />
                  Test
                </button>
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
        {catalogEvents.map((event) => (
          <EventCatalogCard
            key={event.topic}
            event={event}
            onPublishTest={handleOpenPublishModal}
            onViewSchema={handleViewSchema}
          />
        ))}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render — Event Log Tab
  // -------------------------------------------------------------------------

  const renderEventLogContent = () => {
    if (eventLogData.entries.length === 0) {
      return (
        <EmptyState
          icon={Clock}
          title="No events in log"
          description={
            logFilterCount > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'No events have been published yet. Use the catalog to publish test events.'
          }
          actionLabel="Browse Catalog"
          onAction={() => setActiveTab('catalog')}
          actionIcon={Radio}
          size="md"
          bordered
        />
      );
    }

    return (
      <Table
        columns={EVENT_LOG_COLUMNS}
        data={eventLogData.entries}
        searchable={false}
        paginated
        pageSize={20}
        density="compact"
        hoverable
        striped={false}
        onRowClick={handleViewEventDetail}
        emptyMessage="No events found."
        noResultsMessage="No events match your search."
        defaultSortColumn="timestamp"
        defaultSortOrder="desc"
      />
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
          Event Catalog
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Browse available Kafka event topics, view event schemas, monitor the event log, and
          publish test events for pipeline execution, incident remediation, and SLO breach
          rollback scenarios.
        </p>
      </div>

      {/* Summary Bar */}
      {showSummary && (
        <EventSummaryBar summary={eventLogSummary} subscriptionInfo={subscriptionInfo} />
      )}

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
            <CatalogFilterBar
              searchQuery={catalogSearch}
              onSearchChange={handleCatalogSearchChange}
              onSearchClear={handleCatalogSearchClear}
              categoryFilter={catalogCategoryFilter}
              onCategoryFilterChange={handleCatalogCategoryFilterChange}
              categoryOptions={categoryFilterOptions}
              severityFilter={catalogSeverityFilter}
              onSeverityFilterChange={handleCatalogSeverityFilterChange}
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
                  · {catalogEvents.length}{' '}
                  {catalogEvents.length === 1 ? 'result' : 'results'}
                </span>
              </div>
            )}

            {renderCatalogContent()}
          </div>
        )}

        {/* Event Log Tab */}
        {activeTab === 'log' && (
          <div className="space-y-4">
            <EventLogFilterBar
              searchQuery={logSearch}
              onSearchChange={handleLogSearchChange}
              onSearchClear={handleLogSearchClear}
              topicFilter={logTopicFilter}
              onTopicFilterChange={handleLogTopicFilterChange}
              topicOptions={topicFilterOptions}
              severityFilter={logSeverityFilter}
              onSeverityFilterChange={handleLogSeverityFilterChange}
              onRefresh={handleRefresh}
              onClearLog={handleClearLog}
              hasPermission={canManageEvents}
            />

            {/* Active filters indicator */}
            {logFilterCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Filter size={14} className="text-surface-400 dark:text-surface-500" />
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    {logFilterCount} {logFilterCount === 1 ? 'filter' : 'filters'} active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearLogFilters}
                  className="text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
                >
                  Clear all
                </button>
                <span className="text-xs text-surface-400 dark:text-surface-500">
                  · {eventLogData.total}{' '}
                  {eventLogData.total === 1 ? 'event' : 'events'}
                </span>
              </div>
            )}

            {renderEventLogContent()}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={handleRefresh}>
                Refresh
              </Button>
            </div>
            <SummarySection summary={eventLogSummary} />
          </div>
        )}
      </div>

      {/* Schema Detail Modal */}
      <Modal
        open={schemaModalOpen}
        onClose={handleCloseSchemaModal}
        title={selectedCatalogEvent ? selectedCatalogEvent.name : 'Event Schema'}
        size="lg"
      >
        <EventSchemaDetail event={selectedCatalogEvent} />
      </Modal>

      {/* Publish Test Event Modal */}
      <Modal
        open={publishModalOpen}
        onClose={handleClosePublishModal}
        title={
          publishEvent
            ? `Publish Test Event: ${publishEvent.name}`
            : 'Publish Test Event'
        }
        size="lg"
      >
        <PublishTestEventForm
          event={publishEvent}
          onPublish={handlePublishTestEvent}
          onCancel={handleClosePublishModal}
          isPublishing={isPublishing}
          publishResult={publishResult}
        />
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
        title="Event Details"
        size="lg"
      >
        <EventDetailView
          event={selectedLogEvent}
          onAcknowledge={handleAcknowledgeEvent}
          isAcknowledging={isAcknowledging}
        />
      </Modal>
    </div>
  );
}

EventCatalog.propTypes = {
  defaultTab: PropTypes.oneOf(['catalog', 'log', 'summary']),
  showSummary: PropTypes.bool,
  className: PropTypes.string,
};