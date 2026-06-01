/**
 * Main navigation sidebar component for Horizon DevSecOps Portal
 * Provides collapsible navigation with RBAC-based section visibility,
 * current user info display, and role badge.
 * @module components/layout/Sidebar
 */

import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  LayoutDashboard,
  PackagePlus,
  GitBranch,
  Plug,
  Activity,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  LogOut,
  Menu,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLES } from '../../constants/constants.js';

// ---------------------------------------------------------------------------
// Navigation Section Definitions
// ---------------------------------------------------------------------------

/**
 * Navigation sections with RBAC role requirements.
 * Each section can have child items for sub-navigation.
 * @type {Array<Object>}
 */
const NAV_SECTIONS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    allowedRoles: [ROLES.ADMIN, ROLES.AUDITOR, ROLES.ENGINEER, ROLES.OWNER, ROLES.EXECUTIVE],
    children: [],
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    icon: PackagePlus,
    path: '/onboarding',
    allowedRoles: [ROLES.ADMIN, ROLES.ENGINEER, ROLES.OWNER],
    children: [
      { id: 'onboarding-new', label: 'Configure Application', path: '/onboarding/new' },
      { id: 'onboarding-list', label: 'Onboarded Apps', path: '/onboarding/list' },
      // { id: 'onboarding-import', label: 'Bulk Import', path: '/onboarding/import' },
    ],
  },
  {
    id: 'pipelines',
    label: 'Pipelines',
    icon: GitBranch,
    path: '/pipelines',
    allowedRoles: [ROLES.ADMIN, ROLES.ENGINEER, ROLES.OWNER, ROLES.AUDITOR, ROLES.EXECUTIVE],
    children: [
      { id: 'pipelines-overview', label: 'Overview', path: '/pipelines' },
      { id: 'pipelines-runs', label: 'Pipeline Runs', path: '/pipelines/runs' },
      { id: 'pipelines-generate', label: 'Generate Pipeline', path: '/pipelines/generate' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    path: '/integrations',
    allowedRoles: [ROLES.ADMIN, ROLES.ENGINEER, ROLES.OWNER],
    children: [
      { id: 'integrations-catalog', label: 'Catalog', path: '/integrations/catalog' },
      { id: 'integrations-configured', label: 'Configured', path: '/integrations/configured' },
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    icon: Activity,
    path: '/observability',
    allowedRoles: [ROLES.ADMIN, ROLES.ENGINEER, ROLES.OWNER, ROLES.AUDITOR, ROLES.EXECUTIVE],
    children: [
      { id: 'observability-overview', label: 'Overview', path: '/observability' },
      { id: 'observability-melt', label: 'MELT Metrics', path: '/observability/melt' },
      { id: 'observability-incidents', label: 'Incidents', path: '/observability/incidents' },
      { id: 'observability-events', label: 'Event Bus', path: '/observability/events' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: ShieldCheck,
    path: '/compliance',
    allowedRoles: [ROLES.ADMIN, ROLES.AUDITOR, ROLES.OWNER, ROLES.EXECUTIVE],
    children: [
      { id: 'compliance-artifacts', label: 'Artifacts', path: '/compliance/artifacts' },
      { id: 'compliance-governance', label: 'Governance', path: '/compliance/governance' },
      { id: 'compliance-audit', label: 'Audit Logs', path: '/compliance/audit' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Settings,
    path: '/admin',
    allowedRoles: [ROLES.ADMIN],
    children: [
      { id: 'admin-users', label: 'Users', path: '/admin/users' },
      { id: 'admin-settings', label: 'Settings', path: '/admin/settings' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Role Badge Colors
// ---------------------------------------------------------------------------

const ROLE_BADGE_CLASSES = {
  [ROLES.ADMIN]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  [ROLES.AUDITOR]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  [ROLES.ENGINEER]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  [ROLES.OWNER]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [ROLES.EXECUTIVE]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Single navigation item (top-level section).
 */
function NavItem({
  section,
  isActive,
  isExpanded,
  isCollapsed,
  onToggle,
  onNavigate,
}) {
  const Icon = section.icon;
  const hasChildren = section.children && section.children.length > 0;

  const handleClick = useCallback(() => {
    if (hasChildren && !isCollapsed) {
      onToggle(section.id);
    } else {
      onNavigate(section.path);
    }
  }, [hasChildren, isCollapsed, onToggle, onNavigate, section.id, section.path]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isCollapsed ? section.label : undefined}
      className={clsx(
        'group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-horizon-50 text-horizon-700 dark:bg-horizon-500/10 dark:text-horizon-400 dark:ring-1 dark:ring-horizon-500/20'
          : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800/50 dark:hover:text-surface-200',
        isCollapsed ? 'justify-center' : 'justify-between',
      )}
    >
      <span className={clsx('flex items-center', isCollapsed ? '' : 'gap-3')}>
        <Icon
          size={20}
          className={clsx(
            'flex-shrink-0 transition-colors duration-200',
            isActive
              ? 'text-horizon-600 dark:text-horizon-400'
              : 'text-surface-400 group-hover:text-surface-600 dark:text-surface-500 dark:group-hover:text-surface-300',
          )}
        />
        {!isCollapsed && <span>{section.label}</span>}
      </span>
      {!isCollapsed && hasChildren && (
        <span className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp size={16} className="text-surface-400" />
          ) : (
            <ChevronDown size={16} className="text-surface-400" />
          )}
        </span>
      )}
    </button>
  );
}

NavItem.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    path: PropTypes.string.isRequired,
    children: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        path: PropTypes.string.isRequired,
      }),
    ),
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

/**
 * Child navigation items rendered when a section is expanded.
 */
function NavChildren({ children, currentPath, onNavigate }) {
  return (
    <div className="ml-8 mt-1 space-y-0.5">
      {children.map((child) => {
        const isChildActive = currentPath === child.path;

        return (
          <button
            key={child.id}
            type="button"
            onClick={() => onNavigate(child.path)}
            className={clsx(
              'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors duration-200',
              isChildActive
                ? 'bg-horizon-50 font-medium text-horizon-700 dark:bg-horizon-900/20 dark:text-horizon-300'
                : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200',
            )}
          >
            {child.label}
          </button>
        );
      })}
    </div>
  );
}

NavChildren.propTypes = {
  children: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
    }),
  ).isRequired,
  currentPath: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Main Sidebar Component
// ---------------------------------------------------------------------------

/**
 * Main navigation sidebar with collapsible sections, RBAC-based visibility,
 * user info display, and collapsed/expanded state management.
 *
 * @returns {import('react').ReactElement}
 */
export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useApp();
  const { currentUser, isAuthenticated, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [expandedSections, setExpandedSections] = useState(() => {
    // Auto-expand the section matching the current path
    const currentPath = location.pathname;
    const matchingSection = NAV_SECTIONS.find(
      (section) =>
        currentPath === section.path ||
        (section.children &&
          section.children.some((child) => currentPath === child.path)),
    );
    return matchingSection ? new Set([matchingSection.id]) : new Set();
  });

  /**
   * Filter navigation sections based on the current user's role.
   */
  const visibleSections = useMemo(() => {
    if (!isAuthenticated || !currentUser) {
      return [];
    }

    return NAV_SECTIONS.filter((section) => {
      if (!section.allowedRoles || section.allowedRoles.length === 0) {
        return true;
      }
      return section.allowedRoles.includes(currentUser.role);
    });
  }, [isAuthenticated, currentUser]);

  /**
   * Toggle a section's expanded/collapsed state.
   */
  const handleToggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  /**
   * Navigate to a path.
   */
  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate],
  );

  /**
   * Check if a section or any of its children match the current path.
   */
  const isSectionActive = useCallback(
    (section) => {
      const currentPath = location.pathname;

      if (currentPath === section.path) {
        return true;
      }

      if (section.children && section.children.length > 0) {
        return section.children.some((child) => currentPath === child.path);
      }

      // Check if current path starts with section path (for nested routes)
      if (section.path !== '/' && currentPath.startsWith(section.path)) {
        return true;
      }

      return false;
    },
    [location.pathname],
  );

  /**
   * Handle logout action.
   */
  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  /**
   * Get user initials for the avatar.
   */
  const userInitials = useMemo(() => {
    if (!currentUser) {
      return '';
    }
    const first = currentUser.firstName ? currentUser.firstName.charAt(0) : '';
    const last = currentUser.lastName ? currentUser.lastName.charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  }, [currentUser]);

  /**
   * Get the display name for the current user.
   */
  const userDisplayName = useMemo(() => {
    if (!currentUser) {
      return '';
    }
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    return currentUser.username || '';
  }, [currentUser]);

  const roleBadgeClass = currentUser
    ? ROLE_BADGE_CLASSES[currentUser.role] || 'bg-surface-100 text-surface-700'
    : '';

  return (
    <aside
      className={clsx(
        'flex h-full flex-col border-r border-surface-200 bg-white transition-all duration-300 dark:border-surface-800 dark:bg-surface-950',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
        {/* Header */}
      <div
        className={clsx(
          'flex h-12 flex-shrink-0 items-center px-4 pt-2',
          'justify-end'
        )}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div className="space-y-1">
          {visibleSections.map((section) => {
            const active = isSectionActive(section);
            const expanded = expandedSections.has(section.id);
            const hasChildren = section.children && section.children.length > 0;

            return (
              <div key={section.id}>
                <NavItem
                  section={section}
                  isActive={active}
                  isExpanded={expanded}
                  isCollapsed={sidebarCollapsed}
                  onToggle={handleToggleSection}
                  onNavigate={handleNavigate}
                />
                {!sidebarCollapsed && hasChildren && expanded && (
                  <NavChildren
                    children={section.children}
                    currentPath={location.pathname}
                    onNavigate={handleNavigate}
                  />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Info Footer */}
      {isAuthenticated && currentUser && (
        <div
          className={clsx(
            'flex-shrink-0 border-t border-surface-200 p-3 dark:border-surface-700',
            sidebarCollapsed ? 'flex flex-col items-center gap-2' : '',
          )}
        >
          {sidebarCollapsed ? (
            <>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-horizon-100 text-xs font-semibold text-horizon-700 dark:bg-horizon-900/30 dark:text-horizon-300"
                title={`${userDisplayName} (${currentUser.role})`}
              >
                {userInitials}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-horizon-100 text-xs font-semibold text-horizon-700 dark:bg-horizon-900/30 dark:text-horizon-300">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                  {userDisplayName}
                </p>
                <span
                  className={clsx(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium',
                    roleBadgeClass,
                  )}
                >
                  {currentUser.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-surface-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

Sidebar.propTypes = {};