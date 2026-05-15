/**
 * Mock authentication role selector component for Horizon DevSecOps Portal
 * Displays available roles as cards with descriptions. On selection,
 * sets user context via AuthContext and redirects to dashboard.
 * @module components/auth/RoleSelector
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Shield,
  ShieldCheck,
  Code2,
  UserCog,
  BarChart3,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLES, ROLE_LIST } from '../../constants/constants.js';
import { MOCK_USERS } from '../../constants/mockData.js';
import logo from '../../assets/logo.png';

// ---------------------------------------------------------------------------
// Role Metadata
// ---------------------------------------------------------------------------

/**
 * Metadata for each role including description, icon, and color classes.
 * @type {Object<string, Object>}
 */
const ROLE_METADATA = {
  [ROLES.ADMIN]: {
    label: 'Admin',
    description:
      'Full platform access including user management, settings, and all operational capabilities.',
    icon: Shield,
    colorClasses:
      'border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:hover:border-red-600 dark:hover:bg-red-900/40',
    selectedClasses:
      'border-red-500 bg-red-100 ring-2 ring-red-500/30 dark:border-red-500 dark:bg-red-900/40',
    iconClasses: 'text-red-600 dark:text-red-400',
    badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  [ROLES.AUDITOR]: {
    label: 'Auditor',
    description:
      'Read-only access to compliance artifacts, audit logs, governance data, and security reports.',
    icon: ShieldCheck,
    colorClasses:
      'border-purple-200 bg-purple-50 hover:border-purple-400 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:bg-purple-900/40',
    selectedClasses:
      'border-purple-500 bg-purple-100 ring-2 ring-purple-500/30 dark:border-purple-500 dark:bg-purple-900/40',
    iconClasses: 'text-purple-600 dark:text-purple-400',
    badgeClasses: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  [ROLES.ENGINEER]: {
    label: 'Engineer',
    description:
      'Manage applications, pipelines, toolchains, and integrations. View metrics and incidents.',
    icon: Code2,
    colorClasses:
      'border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:border-blue-600 dark:hover:bg-blue-900/40',
    selectedClasses:
      'border-blue-500 bg-blue-100 ring-2 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-900/40',
    iconClasses: 'text-blue-600 dark:text-blue-400',
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  [ROLES.OWNER]: {
    label: 'Owner',
    description:
      'Application ownership with full lifecycle management, compliance oversight, and approval authority.',
    icon: UserCog,
    colorClasses:
      'border-green-200 bg-green-50 hover:border-green-400 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:hover:border-green-600 dark:hover:bg-green-900/40',
    selectedClasses:
      'border-green-500 bg-green-100 ring-2 ring-green-500/30 dark:border-green-500 dark:bg-green-900/40',
    iconClasses: 'text-green-600 dark:text-green-400',
    badgeClasses: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  [ROLES.EXECUTIVE]: {
    label: 'Executive',
    description:
      'High-level dashboards, KPI metrics, DORA reports, and read-only access to compliance and incidents.',
    icon: BarChart3,
    colorClasses:
      'border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:border-amber-600 dark:hover:bg-amber-900/40',
    selectedClasses:
      'border-amber-500 bg-amber-100 ring-2 ring-amber-500/30 dark:border-amber-500 dark:bg-amber-900/40',
    iconClasses: 'text-amber-600 dark:text-amber-400',
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Individual role card component.
 */
function RoleCard({ role, metadata, isSelected, isLoading, onSelect }) {
  const Icon = metadata.icon;

  const mockUser = useMemo(() => {
    return MOCK_USERS.find((u) => u.role === role);
  }, [role]);

  const handleClick = useCallback(() => {
    if (!isLoading) {
      onSelect(role);
    }
  }, [role, isLoading, onSelect]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
        e.preventDefault();
        onSelect(role);
      }
    },
    [role, isLoading, onSelect],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Select ${metadata.label} role`}
      aria-pressed={isSelected}
      className={clsx(
        'group relative flex cursor-pointer flex-col rounded-xl border-2 p-5 transition-all duration-200',
        isSelected ? metadata.selectedClasses : metadata.colorClasses,
        isLoading && 'pointer-events-none opacity-60',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              isSelected
                ? 'bg-white/80 dark:bg-surface-800/80'
                : 'bg-white dark:bg-surface-800',
            )}
          >
            <Icon size={22} className={metadata.iconClasses} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {metadata.label}
            </h3>
            {mockUser && (
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {mockUser.firstName} {mockUser.lastName}
              </p>
            )}
          </div>
        </div>
        <ChevronRight
          size={18}
          className={clsx(
            'flex-shrink-0 text-surface-300 transition-transform duration-200 dark:text-surface-600',
            isSelected && 'translate-x-0.5 text-surface-500 dark:text-surface-400',
            !isSelected && 'group-hover:translate-x-0.5 group-hover:text-surface-400',
          )}
        />
      </div>

      {/* Description */}
      <p className="mt-3 text-xs leading-relaxed text-surface-600 dark:text-surface-400">
        {metadata.description}
      </p>

      {/* Badge */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={clsx(
            'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium',
            metadata.badgeClasses,
          )}
        >
          {metadata.label}
        </span>
        {mockUser && (
          <span className="text-2xs text-surface-400 dark:text-surface-500">
            {mockUser.department}
          </span>
        )}
      </div>
    </div>
  );
}

RoleCard.propTypes = {
  role: PropTypes.string.isRequired,
  metadata: PropTypes.shape({
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    colorClasses: PropTypes.string.isRequired,
    selectedClasses: PropTypes.string.isRequired,
    iconClasses: PropTypes.string.isRequired,
    badgeClasses: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Mock authentication role selector for the prototype phase.
 * Displays available roles as interactive cards. On selection, logs in
 * the corresponding mock user and redirects to the dashboard.
 *
 * @param {Object} [props]
 * @param {string} [props.redirectTo='/'] - Path to redirect to after login.
 * @returns {import('react').ReactElement}
 */
export default function RoleSelector({ redirectTo = '/' }) {
  const { login, isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle role selection. Finds the matching mock user, logs them in,
   * and navigates to the dashboard.
   */
  const handleSelectRole = useCallback(
    (role) => {
      if (isLoading) {
        return;
      }

      setSelectedRole(role);
      setIsLoading(true);
      setError(null);

      // Find the mock user for this role
      const mockUser = MOCK_USERS.find((u) => u.role === role);

      if (!mockUser) {
        setError(`No mock user found for role "${role}".`);
        setIsLoading(false);
        return;
      }

      // Simulate a brief delay for UX feedback
      const timer = setTimeout(() => {
        const result = login(mockUser);

        if (result.success) {
          navigate(redirectTo, { replace: true });
        } else {
          setError(result.error || 'Login failed. Please try again.');
          setIsLoading(false);
          setSelectedRole(null);
        }
      }, 400);

      return () => clearTimeout(timer);
    },
    [isLoading, login, navigate, redirectTo],
  );

  /**
   * If already authenticated, allow continuing to dashboard.
   */
  const handleContinue = useCallback(() => {
    navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-12 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <div className="rounded-xl px-4 py-2 transition-all duration-300 dark:bg-white/90 dark:shadow-sm">
              <img 
                src={logo} 
                alt="Horizon Logo" 
                className="h-[72px] w-[204px] object-contain" 
              />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900 dark:text-surface-100 mt-2">
            Horizon DevSecOps Portal
          </h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            Select a role to explore the portal. Each role provides a different perspective and set
            of permissions.
          </p>
        </div>

        {/* Already authenticated banner */}
        {isAuthenticated && currentUser && (
          <div className="mb-6 rounded-lg border border-horizon-200 bg-horizon-50 p-4 dark:border-horizon-800 dark:bg-horizon-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-horizon-800 dark:text-horizon-200">
                  Currently signed in as{' '}
                  <span className="font-semibold">
                    {currentUser.firstName} {currentUser.lastName}
                  </span>{' '}
                  ({currentUser.role})
                </p>
                <p className="mt-0.5 text-xs text-horizon-600 dark:text-horizon-400">
                  Select a different role below or continue to the dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={handleContinue}
                className="btn-primary text-xs"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Role cards grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLE_LIST.map((role) => {
            const metadata = ROLE_METADATA[role];

            if (!metadata) {
              return null;
            }

            return (
              <RoleCard
                key={role}
                role={role}
                metadata={metadata}
                isSelected={selectedRole === role}
                isLoading={isLoading}
                onSelect={handleSelectRole}
              />
            );
          })}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-horizon-500" />
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Signing in as {selectedRole}…
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-surface-400 dark:text-surface-500">
            This is a prototype environment using mock authentication.
          </p>
          <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
            All data is stored locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}

RoleSelector.propTypes = {
  redirectTo: PropTypes.string,
};