/**
 * Multi-step onboarding form component for Horizon DevSecOps Portal
 * Step 1 - Domain/Portfolio/Application metadata
 * Step 2 - Toolchain selection
 * Step 3 - Configuration (environment, criticality, owners)
 * Step 4 - Review & Submit
 * Validates each step, shows progress indicator, supports save draft.
 * On submit, calls OnboardingService and logs to audit trail.
 * @module components/onboarding/OnboardingForm
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Building2,
  Wrench,
  Settings,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Plus,
  Trash2,
  Tag,
  Server,
  Shield,
  User,
  Mail,
  Globe,
  Code2,
  GitBranch,
} from 'lucide-react';
import DomainSelector from './DomainSelector.jsx';
import ToolchainSelector from './ToolchainSelector.jsx';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import Select from '../common/Select.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../common/Toast.jsx';
import { submitOnboarding, validateOnboarding } from '../../services/OnboardingService.js';
import {
  CRITICALITY_TIER_LIST,
  ENVIRONMENT_LIST,
  DOMAIN_LIST,
  PORTFOLIO_LIST,
} from '../../constants/constants.js';
import { getStorageItem, setStorageItem, removeStorageItem } from '../../utils/localStorage.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRAFT_STORAGE_KEY = 'onboarding_draft';

const STEPS = [
  { id: 'domain', label: 'Application Info', icon: Building2 },
  { id: 'toolchain', label: 'Toolchain', icon: Wrench },
  { id: 'config', label: 'Configuration', icon: Settings },
  { id: 'review', label: 'Review & Submit', icon: ClipboardCheck },
];

const INITIAL_FORM_DATA = {
  name: '',
  shortCode: '',
  description: '',
  domainName: '',
  portfolioName: '',
  criticalityTier: '',
  ownerName: '',
  ownerEmail: '',
  environments: [],
  techStack: [],
  tags: [],
  repoUrl: '',
  toolchainSelections: [],
  integrations: [],
  qeTools: [],
  configurableMetrics: [],
};

// ---------------------------------------------------------------------------
// Criticality Options
// ---------------------------------------------------------------------------

const CRITICALITY_OPTIONS = CRITICALITY_TIER_LIST.map((tier) => ({
  value: tier,
  label: tier,
}));

const ENVIRONMENT_OPTIONS = ENVIRONMENT_LIST.map((env) => ({
  value: env,
  label: env,
}));

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Step progress indicator.
 */
function StepIndicator({ steps, currentStep, completedSteps }) {
  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep;
          const isCompleted = completedSteps.has(index);
          const isPast = index < currentStep;
          const Icon = step.icon;

          return (
            <li key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200',
                    isCurrent &&
                      'border-horizon-500 bg-horizon-50 text-horizon-600 dark:border-horizon-400 dark:bg-horizon-900/30 dark:text-horizon-400',
                    isCompleted &&
                      'border-green-500 bg-green-50 text-green-600 dark:border-green-400 dark:bg-green-900/30 dark:text-green-400',
                    !isCurrent &&
                      !isCompleted &&
                      'border-surface-300 bg-white text-surface-400 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-500',
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Icon size={20} />
                  )}
                </div>
                <span
                  className={clsx(
                    'text-xs font-medium',
                    isCurrent && 'text-horizon-700 dark:text-horizon-300',
                    isCompleted && 'text-green-700 dark:text-green-300',
                    !isCurrent &&
                      !isCompleted &&
                      'text-surface-500 dark:text-surface-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    'mx-2 mt-[-1.5rem] h-0.5 flex-1',
                    isPast || isCompleted
                      ? 'bg-green-400 dark:bg-green-500'
                      : 'bg-surface-200 dark:bg-surface-700',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

StepIndicator.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
    }),
  ).isRequired,
  currentStep: PropTypes.number.isRequired,
  completedSteps: PropTypes.instanceOf(Set).isRequired,
};

/**
 * Tag input component for tech stack and tags.
 */
function TagInput({ label, value, onChange, placeholder, icon, hint }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const Icon = icon || Tag;

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) {
      return;
    }
    if (Array.isArray(value) && value.includes(trimmed)) {
      setInputValue('');
      return;
    }
    const newValues = Array.isArray(value) ? [...value, trimmed] : [trimmed];
    onChange(newValues);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputValue, value, onChange]);

  const handleRemove = useCallback(
    (item) => {
      const newValues = Array.isArray(value) ? value.filter((v) => v !== item) : [];
      onChange(newValues);
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon size={16} className="text-surface-400 dark:text-surface-500" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type and press Enter'}
            className="block w-full rounded-lg border border-surface-300 bg-white py-2 pl-9 pr-3 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
        <Button variant="secondary" size="sm" icon={Plus} onClick={handleAdd}>
          Add
        </Button>
      </div>
      {Array.isArray(value) && value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-horizon-50 px-2.5 py-1 text-xs font-medium text-horizon-700 dark:bg-horizon-900/30 dark:text-horizon-300"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="flex-shrink-0 rounded-full p-0.5 transition-colors duration-150 hover:bg-horizon-200 dark:hover:bg-horizon-800"
                aria-label={`Remove ${item}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      {hint && (
        <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">{hint}</p>
      )}
    </div>
  );
}

TagInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  icon: PropTypes.elementType,
  hint: PropTypes.string,
};

/**
 * Step 1: Application Info
 */
function Step1ApplicationInfo({ formData, onChange, errors }) {
  const handleDomainChange = useCallback(
    (selection) => {
      onChange({
        domainName: selection.domainName || '',
        portfolioName: selection.portfolioName || '',
      });
    },
    [onChange],
  );

  const handleFieldChange = useCallback(
    (field, value) => {
      onChange({ [field]: value });
    },
    [onChange],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Application Information
        </h3>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Provide basic information about the application being onboarded.
        </p>
      </div>

      {/* Name and Short Code */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="app-name"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Application Name <span className="text-red-500">*</span>
          </label>
          <input
            id="app-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="e.g. Member Portal"
            className={clsx(
              'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500',
              errors.name
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700'
                : 'border-surface-300 focus:border-horizon-500 focus:ring-horizon-500/20 dark:border-surface-600',
            )}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="app-short-code"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Short Code <span className="text-red-500">*</span>
          </label>
          <input
            id="app-short-code"
            type="text"
            value={formData.shortCode}
            onChange={(e) => handleFieldChange('shortCode', e.target.value.toUpperCase())}
            placeholder="e.g. MBRP"
            maxLength={10}
            className={clsx(
              'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500',
              errors.shortCode
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700'
                : 'border-surface-300 focus:border-horizon-500 focus:ring-horizon-500/20 dark:border-surface-600',
            )}
          />
          {errors.shortCode && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.shortCode}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="app-description"
          className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="app-description"
          value={formData.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="Brief description of the application..."
          rows={3}
          maxLength={500}
          className={clsx(
            'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500',
            errors.description
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700'
              : 'border-surface-300 focus:border-horizon-500 focus:ring-horizon-500/20 dark:border-surface-600',
          )}
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.description ? (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.description}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-surface-400 dark:text-surface-500">
            {formData.description.length}/500
          </span>
        </div>
      </div>

      {/* Domain / Portfolio */}
      <div>
        <DomainSelector
          showApplicationSelector={false}
          showMetadata={false}
          required
          domainLabel="Domain"
          portfolioLabel="Portfolio"
          domainError={errors.domainName}
          portfolioError={errors.portfolioName}
          onChange={handleDomainChange}
        />
      </div>

      {/* Repository URL */}
      <div>
        <label
          htmlFor="app-repo-url"
          className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          Repository URL
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <GitBranch size={16} className="text-surface-400 dark:text-surface-500" />
          </div>
          <input
            id="app-repo-url"
            type="url"
            value={formData.repoUrl}
            onChange={(e) => handleFieldChange('repoUrl', e.target.value)}
            placeholder="https://github.com/org/repo"
            className="block w-full rounded-lg border border-surface-300 bg-white py-2 pl-9 pr-3 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
      </div>
    </div>
  );
}

Step1ApplicationInfo.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
};

/**
 * Step 2: Toolchain Selection
 */
function Step2Toolchain({ formData, onChange }) {
  const handleToolchainChange = useCallback(
    (selections) => {
      onChange({ toolchainSelections: selections });
    },
    [onChange],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Toolchain Selection
        </h3>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Select the tools for your application&apos;s DevSecOps toolchain. You can modify these
          later.
        </p>
      </div>

      <ToolchainSelector
        value={formData.toolchainSelections}
        onChange={handleToolchainChange}
        showSummary
        expandAll={false}
        hint="Select at least one tool per critical category for best results."
      />
    </div>
  );
}

Step2Toolchain.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * Step 3: Configuration
 */
function Step3Configuration({ formData, onChange, errors }) {
  const handleFieldChange = useCallback(
    (field, value) => {
      onChange({ [field]: value });
    },
    [onChange],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Configuration
        </h3>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Configure environments, criticality tier, and ownership details.
        </p>
      </div>

      {/* Criticality Tier */}
      <Select
        id="criticality-tier"
        label="Criticality Tier"
        placeholder="Select criticality tier..."
        options={CRITICALITY_OPTIONS}
        value={formData.criticalityTier}
        onChange={(val) => handleFieldChange('criticalityTier', val)}
        required
        error={errors.criticalityTier}
        hint="Determines security scanning requirements and approval gates."
      />

      {/* Environments */}
      <Select
        id="environments"
        label="Environments"
        placeholder="Select environments..."
        options={ENVIRONMENT_OPTIONS}
        value={formData.environments}
        onChange={(val) => handleFieldChange('environments', val)}
        multiple
        required
        error={errors.environments}
        hint="Select all environments where this application will be deployed."
      />

      {/* Owner Name and Email */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="owner-name"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Owner Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <User size={16} className="text-surface-400 dark:text-surface-500" />
            </div>
            <input
              id="owner-name"
              type="text"
              value={formData.ownerName}
              onChange={(e) => handleFieldChange('ownerName', e.target.value)}
              placeholder="e.g. John Doe"
              className={clsx(
                'block w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500',
                errors.ownerName
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700'
                  : 'border-surface-300 focus:border-horizon-500 focus:ring-horizon-500/20 dark:border-surface-600',
              )}
            />
          </div>
          {errors.ownerName && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.ownerName}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="owner-email"
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            Owner Email
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail size={16} className="text-surface-400 dark:text-surface-500" />
            </div>
            <input
              id="owner-email"
              type="email"
              value={formData.ownerEmail}
              onChange={(e) => handleFieldChange('ownerEmail', e.target.value)}
              placeholder="e.g. john.doe@example.com"
              className={clsx(
                'block w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500',
                errors.ownerEmail
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700'
                  : 'border-surface-300 focus:border-horizon-500 focus:ring-horizon-500/20 dark:border-surface-600',
              )}
            />
          </div>
          {errors.ownerEmail && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.ownerEmail}</p>
          )}
        </div>
      </div>

      {/* Tech Stack */}
      <TagInput
        label="Technology Stack"
        value={formData.techStack}
        onChange={(val) => handleFieldChange('techStack', val)}
        placeholder="e.g. React, Node.js, PostgreSQL"
        icon={Code2}
        hint="Add technologies used by this application."
      />

      {/* Tags */}
      <TagInput
        label="Tags"
        value={formData.tags}
        onChange={(val) => handleFieldChange('tags', val)}
        placeholder="e.g. customer-facing, pci-compliant"
        icon={Tag}
        hint="Add tags for categorization and search."
      />
    </div>
  );
}

Step3Configuration.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
};

/**
 * Review row for Step 4.
 */
function ReviewRow({ icon, label, children }) {
  const Icon = icon || Info;

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800">
        <Icon size={16} className="text-surface-500 dark:text-surface-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{label}</p>
        <div className="mt-0.5 text-sm text-surface-900 dark:text-surface-100">{children}</div>
      </div>
    </div>
  );
}

ReviewRow.propTypes = {
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * Criticality variant mapping for badges.
 */
const CRITICALITY_BADGE_VARIANT = {
  'Business-critical': 'danger',
  'Mission-critical': 'warning',
  'Business Operational': 'info',
  'Admin Services': 'neutral',
};

/**
 * Step 4: Review & Submit
 */
function Step4Review({ formData, warnings }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Review & Submit
        </h3>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          Review the onboarding details before submitting.
        </p>
      </div>

      {/* Warnings */}
      {Array.isArray(warnings) && warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
            </p>
          </div>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={`warning-${index}`} className="text-xs text-amber-700 dark:text-amber-300">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Application Info */}
      <Card variant="outlined" title="Application Information" icon={Building2}>
        <div className="divide-y divide-surface-100 dark:divide-surface-700">
          <ReviewRow icon={Building2} label="Application Name">
            <span className="font-medium">{formData.name || 'N/A'}</span>
            {formData.shortCode && (
              <span className="ml-2 text-xs text-surface-400">({formData.shortCode})</span>
            )}
          </ReviewRow>
          <ReviewRow icon={Info} label="Description">
            <span className="text-xs leading-relaxed text-surface-600 dark:text-surface-400">
              {formData.description || 'N/A'}
            </span>
          </ReviewRow>
          <ReviewRow icon={Building2} label="Domain / Portfolio">
            <span>{formData.domainName || 'N/A'}</span>
            {formData.portfolioName && (
              <>
                <span className="mx-1 text-surface-400">→</span>
                <span>{formData.portfolioName}</span>
              </>
            )}
          </ReviewRow>
          {formData.repoUrl && (
            <ReviewRow icon={GitBranch} label="Repository URL">
              <span className="text-xs text-horizon-600 dark:text-horizon-400">
                {formData.repoUrl}
              </span>
            </ReviewRow>
          )}
        </div>
      </Card>

      {/* Configuration */}
      <Card variant="outlined" title="Configuration" icon={Settings}>
        <div className="divide-y divide-surface-100 dark:divide-surface-700">
          <ReviewRow icon={Shield} label="Criticality Tier">
            {formData.criticalityTier ? (
              <Badge
                variant={CRITICALITY_BADGE_VARIANT[formData.criticalityTier] || 'neutral'}
                size="sm"
                dot
              >
                {formData.criticalityTier}
              </Badge>
            ) : (
              'N/A'
            )}
          </ReviewRow>
          <ReviewRow icon={Server} label="Environments">
            {Array.isArray(formData.environments) && formData.environments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {formData.environments.map((env) => (
                  <Badge key={env} variant="neutral" size="sm">
                    {env}
                  </Badge>
                ))}
              </div>
            ) : (
              'N/A'
            )}
          </ReviewRow>
          <ReviewRow icon={User} label="Owner">
            <span>{formData.ownerName || 'N/A'}</span>
            {formData.ownerEmail && (
              <span className="ml-2 text-xs text-surface-400">({formData.ownerEmail})</span>
            )}
          </ReviewRow>
          {Array.isArray(formData.techStack) && formData.techStack.length > 0 && (
            <ReviewRow icon={Code2} label="Tech Stack">
              <div className="flex flex-wrap gap-1.5">
                {formData.techStack.map((tech) => (
                  <Badge key={tech} variant="info" size="sm">
                    {tech}
                  </Badge>
                ))}
              </div>
            </ReviewRow>
          )}
          {Array.isArray(formData.tags) && formData.tags.length > 0 && (
            <ReviewRow icon={Tag} label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="purple" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </ReviewRow>
          )}
        </div>
      </Card>

      {/* Toolchain Summary */}
      <Card variant="outlined" title="Toolchain" icon={Wrench}>
        {Array.isArray(formData.toolchainSelections) &&
        formData.toolchainSelections.length > 0 ? (
          <div className="space-y-2">
            {(() => {
              const grouped = {};
              formData.toolchainSelections.forEach((sel) => {
                const cat = sel.category || 'Other';
                if (!grouped[cat]) {
                  grouped[cat] = [];
                }
                grouped[cat].push(sel);
              });
              return Object.entries(grouped)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([category, tools]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-surface-500 dark:text-surface-400">
                      {category}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {tools.map((tool) => (
                        <Badge
                          key={tool.toolId || tool.tool || tool.id}
                          variant="horizon"
                          size="sm"
                        >
                          {tool.tool || tool.toolName || tool.name || 'Unknown'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ));
            })()}
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {formData.toolchainSelections.length}{' '}
              {formData.toolchainSelections.length === 1 ? 'tool' : 'tools'} selected
            </p>
          </div>
        ) : (
          <p className="text-sm text-surface-500 dark:text-surface-400">
            No toolchain selections made. You can configure these later.
          </p>
        )}
      </Card>
    </div>
  );
}

Step4Review.propTypes = {
  formData: PropTypes.object.isRequired,
  warnings: PropTypes.arrayOf(PropTypes.string),
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Multi-step onboarding form component.
 *
 * @param {Object} [props]
 * @param {Function} [props.onSuccess] - Callback when onboarding is submitted successfully.
 *   Receives `{ onboardingId, applicationId }`.
 * @param {Function} [props.onCancel] - Callback when the user cancels the form.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {import('react').ReactElement}
 */
export default function OnboardingForm({ onSuccess, onCancel, className }) {
  const { currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(() => {
    const draft = getStorageItem(DRAFT_STORAGE_KEY, null);
    if (draft && typeof draft === 'object' && draft.name !== undefined) {
      return { ...INITIAL_FORM_DATA, ...draft };
    }
    return { ...INITIAL_FORM_DATA };
  });
  const [stepErrors, setStepErrors] = useState({});
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [draftSaved, setDraftSaved] = useState(false);

  // -------------------------------------------------------------------------
  // Form data update handler
  // -------------------------------------------------------------------------

  const handleFormChange = useCallback((updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setDraftSaved(false);
  }, []);

  // -------------------------------------------------------------------------
  // Step validation
  // -------------------------------------------------------------------------

  const validateStep = useCallback(
    (step) => {
      const errors = {};

      if (step === 0) {
        // Step 1: Application Info
        if (!formData.name || formData.name.trim().length === 0) {
          errors.name = 'Application name is required.';
        } else if (formData.name.trim().length < 2) {
          errors.name = 'Application name must be at least 2 characters.';
        } else if (formData.name.trim().length > 100) {
          errors.name = 'Application name must not exceed 100 characters.';
        }

        if (!formData.shortCode || formData.shortCode.trim().length === 0) {
          errors.shortCode = 'Short code is required.';
        } else if (formData.shortCode.trim().length < 2 || formData.shortCode.trim().length > 10) {
          errors.shortCode = 'Short code must be between 2 and 10 characters.';
        } else if (!/^[A-Za-z0-9]+$/.test(formData.shortCode.trim())) {
          errors.shortCode = 'Short code must contain only alphanumeric characters.';
        }

        if (!formData.description || formData.description.trim().length === 0) {
          errors.description = 'Description is required.';
        } else if (formData.description.trim().length > 500) {
          errors.description = 'Description must not exceed 500 characters.';
        }

        if (!formData.domainName || formData.domainName.trim().length === 0) {
          errors.domainName = 'Domain is required.';
        }

        if (!formData.portfolioName || formData.portfolioName.trim().length === 0) {
          errors.portfolioName = 'Portfolio is required.';
        }
      }

      if (step === 2) {
        // Step 3: Configuration
        if (!formData.criticalityTier || formData.criticalityTier.trim().length === 0) {
          errors.criticalityTier = 'Criticality tier is required.';
        }

        if (!Array.isArray(formData.environments) || formData.environments.length === 0) {
          errors.environments = 'At least one environment must be selected.';
        }

        if (!formData.ownerName || formData.ownerName.trim().length === 0) {
          errors.ownerName = 'Owner name is required.';
        }

        if (
          formData.ownerEmail &&
          typeof formData.ownerEmail === 'string' &&
          formData.ownerEmail.trim().length > 0
        ) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData.ownerEmail.trim())) {
            errors.ownerEmail = 'Must be a valid email address.';
          }
        }
      }

      return errors;
    },
    [formData],
  );

  // -------------------------------------------------------------------------
  // Navigation handlers
  // -------------------------------------------------------------------------

  const handleNext = useCallback(() => {
    const errors = validateStep(currentStep);
    setStepErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(currentStep);
      return next;
    });

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setSubmitError(null);
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setStepErrors({});
      setSubmitError(null);
    }
  }, [currentStep]);

  // -------------------------------------------------------------------------
  // Validate all before review
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (currentStep === STEPS.length - 1) {
      const validation = validateOnboarding(formData);
      setWarnings(validation.warnings || []);
    }
  }, [currentStep, formData]);

  // -------------------------------------------------------------------------
  // Save draft
  // -------------------------------------------------------------------------

  const handleSaveDraft = useCallback(() => {
    setStorageItem(DRAFT_STORAGE_KEY, formData);
    setDraftSaved(true);
    toast.success('Draft saved successfully.');

    const timer = setTimeout(() => {
      setDraftSaved(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [formData, toast]);

  // -------------------------------------------------------------------------
  // Clear draft
  // -------------------------------------------------------------------------

  const clearDraft = useCallback(() => {
    removeStorageItem(DRAFT_STORAGE_KEY);
  }, []);

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSubmit = useCallback(() => {
    // Validate all steps
    const step0Errors = validateStep(0);
    const step2Errors = validateStep(2);
    const allErrors = { ...step0Errors, ...step2Errors };

    if (Object.keys(allErrors).length > 0) {
      setSubmitError('Please fix all validation errors before submitting.');
      // Go to the first step with errors
      if (Object.keys(step0Errors).length > 0) {
        setCurrentStep(0);
        setStepErrors(step0Errors);
      } else if (Object.keys(step2Errors).length > 0) {
        setCurrentStep(2);
        setStepErrors(step2Errors);
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // Simulate a brief delay for UX feedback
    const timer = setTimeout(() => {
      const result = submitOnboarding({
        ...formData,
        userId: currentUser ? currentUser.id : null,
      });

      setIsSubmitting(false);

      if (result.success) {
        clearDraft();
        toast.success('Application onboarded successfully!', {
          title: 'Onboarding Complete',
        });

        if (typeof onSuccess === 'function') {
          onSuccess({
            onboardingId: result.onboardingId,
            applicationId: result.applicationId,
          });
        } else {
          navigate('/onboarding/list');
        }
      } else {
        const errorMsg =
          result.errors && result.errors.length > 0
            ? result.errors.join(' ')
            : 'Failed to submit onboarding. Please try again.';
        setSubmitError(errorMsg);
        toast.error(errorMsg, { title: 'Onboarding Failed' });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData, currentUser, validateStep, clearDraft, toast, onSuccess, navigate]);

  // -------------------------------------------------------------------------
  // Cancel
  // -------------------------------------------------------------------------

  const handleCancel = useCallback(() => {
    if (typeof onCancel === 'function') {
      onCancel();
    } else {
      navigate('/onboarding/list');
    }
  }, [onCancel, navigate]);

  // -------------------------------------------------------------------------
  // Check if draft exists
  // -------------------------------------------------------------------------

  const hasDraft = useMemo(() => {
    const draft = getStorageItem(DRAFT_STORAGE_KEY, null);
    return draft !== null && typeof draft === 'object' && draft.name !== undefined;
  }, []);

  // -------------------------------------------------------------------------
  // Render current step content
  // -------------------------------------------------------------------------

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Step1ApplicationInfo
            formData={formData}
            onChange={handleFormChange}
            errors={stepErrors}
          />
        );
      case 1:
        return <Step2Toolchain formData={formData} onChange={handleFormChange} />;
      case 2:
        return (
          <Step3Configuration
            formData={formData}
            onChange={handleFormChange}
            errors={stepErrors}
          />
        );
      case 3:
        return <Step4Review formData={formData} warnings={warnings} />;
      default:
        return null;
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={clsx('w-full', className)}>
      {/* Step Indicator */}
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {/* Submit Error */}
      {submitError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-xl border border-surface-200 bg-white p-6 shadow-card dark:border-surface-700 dark:bg-surface-800">
        {renderStepContent()}
      </div>

      {/* Navigation Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Save}
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            {draftSaved ? 'Saved!' : 'Save Draft'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronLeft}
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="sm"
              iconRight={ChevronRight}
              onClick={handleNext}
              disabled={isSubmitting}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={isSubmitting ? undefined : Send}
              loading={isSubmitting}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Onboarding'}
            </Button>
          )}
        </div>
      </div>

      {/* Step counter */}
      <div className="mt-3 text-center">
        <p className="text-xs text-surface-400 dark:text-surface-500">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}

OnboardingForm.propTypes = {
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
  className: PropTypes.string,
};