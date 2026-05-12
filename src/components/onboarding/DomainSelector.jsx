/**
 * Cascading domain selector component for Horizon DevSecOps Portal
 * Three linked dropdowns: selecting a domain filters portfolios,
 * selecting a portfolio filters applications. Displays metadata
 * (criticality tier, environment, business owner, technical owner)
 * for the selected application.
 * @module components/onboarding/DomainSelector
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Building2,
  Briefcase,
  AppWindow,
  ChevronRight,
  Info,
  Shield,
  Server,
  User,
  Tag,
  GitBranch,
  X,
} from 'lucide-react';
import Select from '../common/Select.jsx';
import Badge from '../common/Badge.jsx';
import Card from '../common/Card.jsx';
import {
  getDomains,
  getPortfolios,
  getApplications,
  getApplicationById,
} from '../../services/CatalogService.js';
import { CRITICALITY_TIERS } from '../../constants/constants.js';

// ---------------------------------------------------------------------------
// Criticality Badge Variant Mapping
// ---------------------------------------------------------------------------

/**
 * Map criticality tier to Badge variant.
 * @type {Object<string, string>}
 */
const CRITICALITY_VARIANT_MAP = {
  [CRITICALITY_TIERS.BUSINESS_CRITICAL]: 'danger',
  [CRITICALITY_TIERS.MISSION_CRITICAL]: 'warning',
  [CRITICALITY_TIERS.BUSINESS_OPERATIONAL]: 'info',
  [CRITICALITY_TIERS.ADMIN_SERVICES]: 'neutral',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Metadata row displaying a label and value.
 */
function MetadataRow({ icon, label, children }) {
  const Icon = icon || null;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800">
          <Icon size={16} className="text-surface-500 dark:text-surface-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{label}</p>
        <div className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">{children}</div>
      </div>
    </div>
  );
}

MetadataRow.propTypes = {
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * Application metadata panel displayed when an application is selected.
 */
function ApplicationMetadata({ application }) {
  if (!application) {
    return null;
  }

  const criticalityVariant =
    CRITICALITY_VARIANT_MAP[application.criticalityTier] || 'neutral';

  return (
    <div className="mt-4 rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
      <div className="mb-3 flex items-center gap-2">
        <Info size={16} className="text-horizon-500" />
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          Application Details
        </h4>
      </div>

      <div className="divide-y divide-surface-100 dark:divide-surface-700">
        {/* Name & Short Code */}
        <MetadataRow icon={AppWindow} label="Application">
          <span className="font-medium">{application.name}</span>
          {application.shortCode && (
            <span className="ml-2 text-xs text-surface-400 dark:text-surface-500">
              ({application.shortCode})
            </span>
          )}
        </MetadataRow>

        {/* Description */}
        {application.description && (
          <MetadataRow icon={Info} label="Description">
            <span className="text-xs leading-relaxed text-surface-600 dark:text-surface-400">
              {application.description}
            </span>
          </MetadataRow>
        )}

        {/* Criticality Tier */}
        <MetadataRow icon={Shield} label="Criticality Tier">
          <Badge variant={criticalityVariant} size="sm" dot>
            {application.criticalityTier}
          </Badge>
        </MetadataRow>

        {/* Owner */}
        {application.ownerName && (
          <MetadataRow icon={User} label="Owner">
            {application.ownerName}
          </MetadataRow>
        )}

        {/* Environments */}
        {Array.isArray(application.environments) && application.environments.length > 0 && (
          <MetadataRow icon={Server} label="Environments">
            <div className="flex flex-wrap gap-1.5">
              {application.environments.map((env) => (
                <Badge key={env} variant="neutral" size="sm">
                  {env}
                </Badge>
              ))}
            </div>
          </MetadataRow>
        )}

        {/* Tech Stack */}
        {Array.isArray(application.techStack) && application.techStack.length > 0 && (
          <MetadataRow icon={GitBranch} label="Tech Stack">
            <div className="flex flex-wrap gap-1.5">
              {application.techStack.map((tech) => (
                <Badge key={tech} variant="info" size="sm">
                  {tech}
                </Badge>
              ))}
            </div>
          </MetadataRow>
        )}

        {/* Tags */}
        {Array.isArray(application.tags) && application.tags.length > 0 && (
          <MetadataRow icon={Tag} label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {application.tags.map((tag) => (
                <Badge key={tag} variant="purple" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </MetadataRow>
        )}

        {/* Domain & Portfolio */}
        <MetadataRow icon={Building2} label="Domain / Portfolio">
          <span>{application.domainName || 'N/A'}</span>
          <ChevronRight size={12} className="mx-1 inline text-surface-400" />
          <span>{application.portfolioName || 'N/A'}</span>
        </MetadataRow>
      </div>
    </div>
  );
}

ApplicationMetadata.propTypes = {
  application: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    shortCode: PropTypes.string,
    description: PropTypes.string,
    domainName: PropTypes.string,
    portfolioName: PropTypes.string,
    criticalityTier: PropTypes.string,
    ownerName: PropTypes.string,
    environments: PropTypes.arrayOf(PropTypes.string),
    techStack: PropTypes.arrayOf(PropTypes.string),
    tags: PropTypes.arrayOf(PropTypes.string),
  }),
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Cascading domain/portfolio/application selector component.
 *
 * Three linked dropdowns where:
 * - Selecting a domain filters the available portfolios.
 * - Selecting a portfolio filters the available applications.
 * - Selecting an application displays its metadata.
 *
 * Supports controlled and uncontrolled modes. When `onChange` is provided,
 * the component reports selection changes to the parent.
 *
 * @param {Object} props
 * @param {string|null} [props.selectedDomainId] - Controlled selected domain ID.
 * @param {string|null} [props.selectedPortfolioId] - Controlled selected portfolio ID.
 * @param {string|null} [props.selectedApplicationId] - Controlled selected application ID.
 * @param {Function} [props.onChange] - Callback when any selection changes.
 *   Receives `{ domainId, domainName, portfolioId, portfolioName, applicationId, applicationName, application }`.
 * @param {Function} [props.onApplicationSelect] - Callback when an application is selected.
 *   Receives the full application object or null when cleared.
 * @param {boolean} [props.showMetadata=true] - Whether to display application metadata panel.
 * @param {boolean} [props.showApplicationSelector=true] - Whether to show the application dropdown.
 * @param {boolean} [props.required=false] - Whether the selectors are required fields.
 * @param {boolean} [props.disabled=false] - Whether all selectors are disabled.
 * @param {string} [props.domainLabel='Domain'] - Label for the domain selector.
 * @param {string} [props.portfolioLabel='Portfolio'] - Label for the portfolio selector.
 * @param {string} [props.applicationLabel='Application'] - Label for the application selector.
 * @param {string} [props.domainError] - Error message for the domain selector.
 * @param {string} [props.portfolioError] - Error message for the portfolio selector.
 * @param {string} [props.applicationError] - Error message for the application selector.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Size of the select components.
 * @param {string} [props.className] - Additional CSS classes for the outer container.
 * @returns {import('react').ReactElement}
 */
export default function DomainSelector({
  selectedDomainId: controlledDomainId,
  selectedPortfolioId: controlledPortfolioId,
  selectedApplicationId: controlledAppId,
  onChange,
  onApplicationSelect,
  showMetadata = true,
  showApplicationSelector = true,
  required = false,
  disabled = false,
  domainLabel = 'Domain',
  portfolioLabel = 'Portfolio',
  applicationLabel = 'Application',
  domainError,
  portfolioError,
  applicationError,
  size = 'md',
  className,
}) {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const isControlled =
    controlledDomainId !== undefined ||
    controlledPortfolioId !== undefined ||
    controlledAppId !== undefined;

  const [internalDomainId, setInternalDomainId] = useState(null);
  const [internalPortfolioId, setInternalPortfolioId] = useState(null);
  const [internalAppId, setInternalAppId] = useState(null);

  const domainId = isControlled ? (controlledDomainId || null) : internalDomainId;
  const portfolioId = isControlled ? (controlledPortfolioId || null) : internalPortfolioId;
  const applicationId = isControlled ? (controlledAppId || null) : internalAppId;

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const allDomains = useMemo(() => {
    return getDomains({ sortBy: 'name', sortOrder: 'asc' });
  }, []);

  const allPortfolios = useMemo(() => {
    return getPortfolios({ sortBy: 'name', sortOrder: 'asc' });
  }, []);

  // -------------------------------------------------------------------------
  // Derived options
  // -------------------------------------------------------------------------

  const domainOptions = useMemo(() => {
    return allDomains.map((d) => ({
      value: d.id,
      label: d.name,
      description: d.description
        ? d.description.length > 60
          ? d.description.slice(0, 60) + '…'
          : d.description
        : undefined,
    }));
  }, [allDomains]);

  const filteredPortfolios = useMemo(() => {
    if (!domainId) {
      return allPortfolios;
    }
    return allPortfolios.filter((p) => p.domainId === domainId);
  }, [allPortfolios, domainId]);

  const portfolioOptions = useMemo(() => {
    return filteredPortfolios.map((p) => ({
      value: p.id,
      label: p.name,
      description: p.domainName || undefined,
    }));
  }, [filteredPortfolios]);

  const filteredApplications = useMemo(() => {
    const options = {};

    if (domainId) {
      options.domainId = domainId;
    }
    if (portfolioId) {
      options.portfolioId = portfolioId;
    }

    options.sortBy = 'name';
    options.sortOrder = 'asc';

    const result = getApplications(options);
    return result.data || [];
  }, [domainId, portfolioId]);

  const applicationOptions = useMemo(() => {
    return filteredApplications.map((a) => ({
      value: a.id,
      label: a.name,
      description: a.criticalityTier || undefined,
    }));
  }, [filteredApplications]);

  // -------------------------------------------------------------------------
  // Selected application object
  // -------------------------------------------------------------------------

  const selectedApplication = useMemo(() => {
    if (!applicationId) {
      return null;
    }
    return getApplicationById(applicationId) || null;
  }, [applicationId]);

  // -------------------------------------------------------------------------
  // Resolve names for onChange callback
  // -------------------------------------------------------------------------

  const resolveDomainName = useCallback(
    (id) => {
      if (!id) {
        return null;
      }
      const domain = allDomains.find((d) => d.id === id);
      return domain ? domain.name : null;
    },
    [allDomains],
  );

  const resolvePortfolioName = useCallback(
    (id) => {
      if (!id) {
        return null;
      }
      const portfolio = allPortfolios.find((p) => p.id === id);
      return portfolio ? portfolio.name : null;
    },
    [allPortfolios],
  );

  // -------------------------------------------------------------------------
  // Notify parent of changes
  // -------------------------------------------------------------------------

  const notifyChange = useCallback(
    (newDomainId, newPortfolioId, newAppId) => {
      if (typeof onChange === 'function') {
        const app = newAppId ? getApplicationById(newAppId) : null;
        onChange({
          domainId: newDomainId,
          domainName: resolveDomainName(newDomainId),
          portfolioId: newPortfolioId,
          portfolioName: resolvePortfolioName(newPortfolioId),
          applicationId: newAppId,
          applicationName: app ? app.name : null,
          application: app || null,
        });
      }
    },
    [onChange, resolveDomainName, resolvePortfolioName],
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleDomainChange = useCallback(
    (value) => {
      const newDomainId = value || null;

      if (!isControlled) {
        setInternalDomainId(newDomainId);
        setInternalPortfolioId(null);
        setInternalAppId(null);
      }

      notifyChange(newDomainId, null, null);

      if (typeof onApplicationSelect === 'function') {
        onApplicationSelect(null);
      }
    },
    [isControlled, notifyChange, onApplicationSelect],
  );

  const handlePortfolioChange = useCallback(
    (value) => {
      const newPortfolioId = value || null;

      if (!isControlled) {
        setInternalPortfolioId(newPortfolioId);
        setInternalAppId(null);
      }

      notifyChange(domainId, newPortfolioId, null);

      if (typeof onApplicationSelect === 'function') {
        onApplicationSelect(null);
      }
    },
    [isControlled, domainId, notifyChange, onApplicationSelect],
  );

  const handleApplicationChange = useCallback(
    (value) => {
      const newAppId = value || null;

      if (!isControlled) {
        setInternalAppId(newAppId);
      }

      notifyChange(domainId, portfolioId, newAppId);

      if (typeof onApplicationSelect === 'function') {
        const app = newAppId ? getApplicationById(newAppId) : null;
        onApplicationSelect(app || null);
      }
    },
    [isControlled, domainId, portfolioId, notifyChange, onApplicationSelect],
  );

  // -------------------------------------------------------------------------
  // Auto-select domain when portfolio is set but domain is not
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (portfolioId && !domainId) {
      const portfolio = allPortfolios.find((p) => p.id === portfolioId);
      if (portfolio && portfolio.domainId) {
        if (!isControlled) {
          setInternalDomainId(portfolio.domainId);
        }
      }
    }
  }, [portfolioId, domainId, allPortfolios, isControlled]);

  // -------------------------------------------------------------------------
  // Auto-select domain and portfolio when application is set
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (applicationId && (!domainId || !portfolioId)) {
      const app = getApplicationById(applicationId);
      if (app) {
        if (!isControlled) {
          if (!domainId && app.domainId) {
            setInternalDomainId(app.domainId);
          }
          if (!portfolioId && app.portfolioId) {
            setInternalPortfolioId(app.portfolioId);
          }
        }
      }
    }
  }, [applicationId, domainId, portfolioId, isControlled]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Selector Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Domain Selector */}
        <Select
          id="domain-selector"
          label={domainLabel}
          placeholder="Select domain..."
          options={domainOptions}
          value={domainId}
          onChange={handleDomainChange}
          searchable={domainOptions.length > 5}
          searchPlaceholder="Search domains..."
          clearable
          required={required}
          disabled={disabled}
          error={domainError}
          size={size}
          fullWidth
          emptyMessage="No domains available."
          noResultsMessage="No domains match your search."
        />

        {/* Portfolio Selector */}
        <Select
          id="portfolio-selector"
          label={portfolioLabel}
          placeholder={domainId ? 'Select portfolio...' : 'Select a domain first'}
          options={portfolioOptions}
          value={portfolioId}
          onChange={handlePortfolioChange}
          searchable={portfolioOptions.length > 5}
          searchPlaceholder="Search portfolios..."
          clearable
          required={required}
          disabled={disabled || (!domainId && portfolioOptions.length === 0)}
          error={portfolioError}
          size={size}
          fullWidth
          emptyMessage={
            domainId
              ? 'No portfolios in this domain.'
              : 'Select a domain to see portfolios.'
          }
          noResultsMessage="No portfolios match your search."
        />

        {/* Application Selector */}
        {showApplicationSelector && (
          <Select
            id="application-selector"
            label={applicationLabel}
            placeholder={
              portfolioId
                ? 'Select application...'
                : domainId
                  ? 'Select a portfolio first'
                  : 'Select a domain first'
            }
            options={applicationOptions}
            value={applicationId}
            onChange={handleApplicationChange}
            searchable={applicationOptions.length > 5}
            searchPlaceholder="Search applications..."
            clearable
            required={required}
            disabled={disabled || applicationOptions.length === 0}
            error={applicationError}
            size={size}
            fullWidth
            emptyMessage={
              portfolioId
                ? 'No applications in this portfolio.'
                : domainId
                  ? 'Select a portfolio to see applications.'
                  : 'Select a domain to see applications.'
            }
            noResultsMessage="No applications match your search."
          />
        )}
      </div>

      {/* Selection Breadcrumb */}
      {(domainId || portfolioId || applicationId) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
          {domainId && (
            <span className="inline-flex items-center gap-1">
              <Building2 size={12} className="text-surface-400 dark:text-surface-500" />
              <span className="font-medium text-surface-700 dark:text-surface-300">
                {resolveDomainName(domainId) || 'Domain'}
              </span>
            </span>
          )}
          {portfolioId && (
            <>
              <ChevronRight size={12} className="text-surface-300 dark:text-surface-600" />
              <span className="inline-flex items-center gap-1">
                <Briefcase size={12} className="text-surface-400 dark:text-surface-500" />
                <span className="font-medium text-surface-700 dark:text-surface-300">
                  {resolvePortfolioName(portfolioId) || 'Portfolio'}
                </span>
              </span>
            </>
          )}
          {applicationId && selectedApplication && (
            <>
              <ChevronRight size={12} className="text-surface-300 dark:text-surface-600" />
              <span className="inline-flex items-center gap-1">
                <AppWindow size={12} className="text-surface-400 dark:text-surface-500" />
                <span className="font-medium text-surface-700 dark:text-surface-300">
                  {selectedApplication.name}
                </span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Application Metadata Panel */}
      {showMetadata && selectedApplication && (
        <ApplicationMetadata application={selectedApplication} />
      )}
    </div>
  );
}

DomainSelector.propTypes = {
  selectedDomainId: PropTypes.string,
  selectedPortfolioId: PropTypes.string,
  selectedApplicationId: PropTypes.string,
  onChange: PropTypes.func,
  onApplicationSelect: PropTypes.func,
  showMetadata: PropTypes.bool,
  showApplicationSelector: PropTypes.bool,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  domainLabel: PropTypes.string,
  portfolioLabel: PropTypes.string,
  applicationLabel: PropTypes.string,
  domainError: PropTypes.string,
  portfolioError: PropTypes.string,
  applicationError: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};