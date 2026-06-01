/**
 * Top header bar component for Horizon DevSecOps Portal
 * Provides app title, breadcrumb navigation, notification bell with count,
 * user avatar with dropdown (profile, switch role, logout), and global search input.
 * @module components/layout/Header
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Moon,
  Search,
  Sun,
  User,
  UserCog,
  X,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLES, ROLE_LIST, THEMES } from '../../constants/constants.js';
import logo from '../../assets/logo.png';

// ---------------------------------------------------------------------------
// Breadcrumb Helpers
// ---------------------------------------------------------------------------

/**
 * Map route segments to human-readable labels.
 * @type {Object<string, string>}
 */
const ROUTE_LABELS = {
  '': 'Dashboard',
  onboarding: 'Onboarding',
  new: 'Configure Application',
  list: 'Onboarded Apps',
  import: 'Bulk Import',
  pipelines: 'Pipelines',
  runs: 'Pipeline Runs',
  generate: 'Generate Pipeline',
  integrations: 'Integrations',
  catalog: 'Catalog',
  configured: 'Configured',
  observability: 'Observability',
  melt: 'MELT Metrics',
  incidents: 'Incidents',
  events: 'Event Bus',
  compliance: 'Compliance',
  artifacts: 'Artifacts',
  governance: 'Governance',
  audit: 'Audit Logs',
  admin: 'Admin',
  users: 'Users',
  settings: 'Settings',
};

/**
 * Build breadcrumb items from the current pathname.
 * @param {string} pathname
 * @returns {Array<{ label: string, path: string }>}
 */
const buildBreadcrumbs = (pathname) => {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'Dashboard', path: '/' }];

  if (segments.length === 0) {
    return crumbs;
  }

  let currentPath = '';
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    crumbs.push({ label, path: currentPath });
  });

  return crumbs;
};

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
 * Breadcrumb navigation component.
 */
function Breadcrumbs({ items, onNavigate }) {
  if (!items || items.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.path} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                size={14}
                className="flex-shrink-0 text-surface-400 dark:text-surface-500"
              />
            )}
            {isLast ? (
              <span className="font-medium text-surface-900 dark:text-surface-100">
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(item.path)}
                className="text-surface-500 transition-colors duration-200 hover:text-horizon-600 dark:text-surface-400 dark:hover:text-horizon-400"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

Breadcrumbs.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onNavigate: PropTypes.func.isRequired,
};

/**
 * Notification bell with unread count badge.
 */
function NotificationBell({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
      title={count > 0 ? `${count} unread notification${count === 1 ? '' : 's'}` : 'No unread notifications'}
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-brand-danger px-1 text-2xs font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

NotificationBell.propTypes = {
  count: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * Global search input component.
 */
function GlobalSearch({ value, onChange, onClear }) {
  const inputRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClear();
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    },
    [onClear],
  );

  return (
    <div className="relative hidden sm:block">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search size={16} className="text-surface-400 dark:text-surface-500" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="block w-48 rounded-lg border border-surface-300 bg-white py-1.5 pl-9 pr-8 text-sm text-surface-900 placeholder-surface-400 shadow-sm transition-all duration-200 focus:w-64 focus:border-horizon-500 focus:outline-none focus:ring-2 focus:ring-horizon-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500 lg:w-56 lg:focus:w-72"
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

GlobalSearch.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Main Header Component
// ---------------------------------------------------------------------------

/**
 * Top header bar with app title, breadcrumb navigation, notification bell,
 * user avatar with dropdown (profile, switch role, logout), and global search.
 *
 * @returns {import('react').ReactElement}
 */
export default function Header() {
  const { notifications, unreadNotificationCount, theme, setTheme, markAllNotificationsRead } =
    useApp();
  const { currentUser, isAuthenticated, logout, switchRole, availableRoles } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  // -------------------------------------------------------------------------
  // Close menus on outside click
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
        setRoleMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setUserMenuOpen(false);
    setRoleMenuOpen(false);
    setNotificationPanelOpen(false);
  }, [location.pathname]);

  // -------------------------------------------------------------------------
  // Breadcrumbs
  // -------------------------------------------------------------------------

  const breadcrumbs = useMemo(() => {
    return buildBreadcrumbs(location.pathname);
  }, [location.pathname]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate],
  );

  const handleLogout = useCallback(() => {
    setUserMenuOpen(false);
    logout();
    navigate('/');
  }, [logout, navigate]);

  const handleSwitchRole = useCallback(
    (role) => {
      switchRole(role);
      setRoleMenuOpen(false);
      setUserMenuOpen(false);
    },
    [switchRole],
  );

  const handleToggleTheme = useCallback(() => {
    if (theme === THEMES.LIGHT) {
      setTheme(THEMES.DARK);
    } else {
      setTheme(THEMES.LIGHT);
    }
  }, [theme, setTheme]);

  const handleNotificationClick = useCallback(() => {
    setNotificationPanelOpen((prev) => !prev);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    markAllNotificationsRead();
  }, [markAllNotificationsRead]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  // -------------------------------------------------------------------------
  // User display info
  // -------------------------------------------------------------------------

  const userInitials = useMemo(() => {
    if (!currentUser) {
      return '';
    }
    const first = currentUser.firstName ? currentUser.firstName.charAt(0) : '';
    const last = currentUser.lastName ? currentUser.lastName.charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  }, [currentUser]);

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

  // -------------------------------------------------------------------------
  // Unread notifications for panel
  // -------------------------------------------------------------------------

  const recentNotifications = useMemo(() => {
    return notifications.slice(0, 5);
  }, [notifications]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <header className="flex h-[88px] flex-shrink-0 items-center justify-between border-b border-surface-200 bg-white/80 pl-[20px] pr-4 backdrop-blur-md sticky top-0 z-40 dark:border-surface-800 dark:bg-surface-950/80 lg:pr-6">
      {/* Left section: Title + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <div className="flex items-center mr-2 rounded-lg px-2 py-1 transition-all duration-300 dark:bg-white/90 dark:shadow-sm">
          <img 
            src={logo} 
            alt="Horizon Logo" 
            className="h-[72px] w-[204px] object-contain" 
          />
        </div>
        <Breadcrumbs items={breadcrumbs} onNavigate={handleNavigate} />
      </div>

      {/* Right section: Search, Theme, Notifications, User */}
      <div className="flex items-center gap-2">
        {/* Global Search */}
        <GlobalSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={handleSearchClear}
        />

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={handleToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-500 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
          title={theme === THEMES.DARK ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === THEMES.DARK ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notification Bell */}
        {isAuthenticated && (
          <div className="relative" ref={notificationRef}>
            <NotificationBell
              count={unreadNotificationCount}
              onClick={handleNotificationClick}
            />

            {/* Notification Panel */}
            {notificationPanelOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-surface-200 bg-white shadow-elevated dark:border-surface-700 dark:bg-surface-800">
                <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                    Notifications
                  </h3>
                  {unreadNotificationCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {recentNotifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-surface-500 dark:text-surface-400">
                      No notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-100 dark:divide-surface-700">
                      {recentNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={clsx(
                            'px-4 py-3 transition-colors duration-200 hover:bg-surface-50 dark:hover:bg-surface-700/50',
                            !notification.read && 'bg-horizon-50/50 dark:bg-horizon-900/10',
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {!notification.read && (
                              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-horizon-500" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                                {notification.title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-400">
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {recentNotifications.length > 0 && (
                  <div className="border-t border-surface-200 px-4 py-2 dark:border-surface-700">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationPanelOpen(false);
                        navigate('/observability/events');
                      }}
                      className="w-full text-center text-xs font-medium text-horizon-600 transition-colors duration-200 hover:text-horizon-700 dark:text-horizon-400 dark:hover:text-horizon-300"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* User Avatar & Dropdown */}
        {isAuthenticated && currentUser && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-horizon-100 text-xs font-semibold text-horizon-700 dark:bg-horizon-900/30 dark:text-horizon-300">
                {userInitials}
              </div>
              <div className="hidden items-center gap-1 lg:flex">
                <span className="max-w-[120px] truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                  {userDisplayName}
                </span>
                <ChevronDown
                  size={14}
                  className={clsx(
                    'text-surface-400 transition-transform duration-200',
                    userMenuOpen && 'rotate-180',
                  )}
                />
              </div>
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-surface-200 bg-white shadow-elevated dark:border-surface-700 dark:bg-surface-800">
                {/* User Info */}
                <div className="border-b border-surface-200 px-4 py-3 dark:border-surface-700">
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                    {userDisplayName}
                  </p>
                  <p className="truncate text-xs text-surface-500 dark:text-surface-400">
                    {currentUser.email}
                  </p>
                  <span
                    className={clsx(
                      'mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium',
                      roleBadgeClass,
                    )}
                  >
                    {currentUser.role}
                  </span>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  {/* Profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/admin/settings');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-surface-700 transition-colors duration-200 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
                  >
                    <User size={16} className="flex-shrink-0 text-surface-400 dark:text-surface-500" />
                    <span>Profile</span>
                  </button>

                  {/* Switch Role */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setRoleMenuOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-sm text-surface-700 transition-colors duration-200 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
                    >
                      <span className="flex items-center gap-3">
                        <UserCog
                          size={16}
                          className="flex-shrink-0 text-surface-400 dark:text-surface-500"
                        />
                        <span>Switch Role</span>
                      </span>
                      <ChevronRight
                        size={14}
                        className={clsx(
                          'text-surface-400 transition-transform duration-200',
                          roleMenuOpen && 'rotate-90',
                        )}
                      />
                    </button>

                    {/* Role Sub-menu */}
                    {roleMenuOpen && (
                      <div className="border-t border-surface-100 bg-surface-50 py-1 dark:border-surface-700 dark:bg-surface-900/50">
                        {availableRoles.map((role) => {
                          const isCurrentRole = currentUser.role === role;
                          const badgeClass =
                            ROLE_BADGE_CLASSES[role] || 'bg-surface-100 text-surface-700';

                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => handleSwitchRole(role)}
                              disabled={isCurrentRole}
                              className={clsx(
                                'flex w-full items-center justify-between px-8 py-1.5 text-sm transition-colors duration-200',
                                isCurrentRole
                                  ? 'cursor-default text-surface-400 dark:text-surface-500'
                                  : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700',
                              )}
                            >
                              <span>{role}</span>
                              {isCurrentRole && (
                                <span
                                  className={clsx(
                                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-medium',
                                    badgeClass,
                                  )}
                                >
                                  Current
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Logout */}
                <div className="border-t border-surface-200 py-1 dark:border-surface-700">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors duration-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut size={16} className="flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

Header.propTypes = {};