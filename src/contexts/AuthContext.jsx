/**
 * Authentication context for Horizon DevSecOps Portal
 * Provides mock authentication with role-based access control,
 * session persistence in localStorage, and audit trail logging.
 * @module contexts/AuthContext
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ROLES, ROLE_LIST, LOCAL_STORAGE_KEYS } from '../constants/constants.js';
import { MOCK_USERS } from '../constants/mockData.js';
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/localStorage.js';
import { logAction, AUDIT_ACTIONS } from '../utils/auditLogger.js';

// ---------------------------------------------------------------------------
// Permission Definitions
// ---------------------------------------------------------------------------

/**
 * Permission map keyed by role. Each role has a set of allowed permissions.
 * @type {Object<string, string[]>}
 */
const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: [
    'view_dashboard',
    'view_applications',
    'manage_applications',
    'view_pipelines',
    'manage_pipelines',
    'view_compliance',
    'manage_compliance',
    'view_incidents',
    'manage_incidents',
    'view_audit_logs',
    'manage_users',
    'manage_settings',
    'export_data',
    'import_data',
    'upload_data',
    'view_metrics',
    'manage_toolchain',
    'generate_artifacts',
  ],
  [ROLES.AUDITOR]: [
    'view_dashboard',
    'view_applications',
    'view_pipelines',
    'view_compliance',
    'manage_compliance',
    'view_incidents',
    'view_audit_logs',
    'export_data',
    'view_metrics',
    'generate_artifacts',
  ],
  [ROLES.ENGINEER]: [
    'view_dashboard',
    'view_applications',
    'manage_applications',
    'view_pipelines',
    'manage_pipelines',
    'view_compliance',
    'view_incidents',
    'manage_incidents',
    'export_data',
    'view_metrics',
    'manage_toolchain',
  ],
  [ROLES.OWNER]: [
    'view_dashboard',
    'view_applications',
    'manage_applications',
    'view_pipelines',
    'manage_pipelines',
    'view_compliance',
    'manage_compliance',
    'view_incidents',
    'manage_incidents',
    'view_audit_logs',
    'export_data',
    'view_metrics',
    'manage_toolchain',
    'generate_artifacts',
  ],
  [ROLES.EXECUTIVE]: [
    'view_dashboard',
    'view_applications',
    'view_pipelines',
    'view_compliance',
    'view_incidents',
    'view_audit_logs',
    'export_data',
    'view_metrics',
  ],
});

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * AuthProvider wraps the application and provides authentication state,
 * login/logout actions, role switching, and permission checks.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @returns {import('react').ReactElement}
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = getStorageItem(LOCAL_STORAGE_KEYS.AUTH_USER, null);
      if (storedUser && storedUser.id && storedUser.role) {
        setCurrentUser(storedUser);
      }
    } catch (_err) {
      console.error('AuthContext: Failed to restore session:', _err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Log in a user. Accepts a user object or a user ID string.
   * For the prototype, defaults to the first mock admin user when
   * called without arguments.
   *
   * @param {Object|string} [userOrId] - User object or user ID.
   * @returns {{ success: boolean, user: Object|null, error: string|null }}
   */
  const login = useCallback((userOrId) => {
    try {
      let user = null;

      if (!userOrId) {
        // Default to first admin user for prototype convenience
        user = MOCK_USERS.find((u) => u.role === ROLES.ADMIN) || MOCK_USERS[0];
      } else if (typeof userOrId === 'string') {
        user = MOCK_USERS.find((u) => u.id === userOrId || u.username === userOrId);
      } else if (typeof userOrId === 'object' && userOrId.id) {
        user = userOrId;
      }

      if (!user) {
        return { success: false, user: null, error: 'User not found.' };
      }

      const sessionUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        avatar: user.avatar || null,
        active: user.active !== false,
        lastLogin: new Date().toISOString(),
      };

      setCurrentUser(sessionUser);
      setStorageItem(LOCAL_STORAGE_KEYS.AUTH_USER, sessionUser);
      setStorageItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, `mock-token-${sessionUser.id}-${Date.now()}`);

      logAction(sessionUser.id, AUDIT_ACTIONS.USER_LOGIN, {
        username: sessionUser.username,
        role: sessionUser.role,
        method: 'mock',
      });

      return { success: true, user: sessionUser, error: null };
    } catch (_err) {
      console.error('AuthContext: Login failed:', _err);
      return { success: false, user: null, error: 'Login failed unexpectedly.' };
    }
  }, []);

  /**
   * Log out the current user. Clears session from state and localStorage.
   */
  const logout = useCallback(() => {
    try {
      if (currentUser) {
        logAction(currentUser.id, AUDIT_ACTIONS.USER_LOGOUT, {
          username: currentUser.username,
          role: currentUser.role,
        });
      }

      setCurrentUser(null);
      removeStorageItem(LOCAL_STORAGE_KEYS.AUTH_USER);
      removeStorageItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    } catch (_err) {
      console.error('AuthContext: Logout failed:', _err);
      setCurrentUser(null);
    }
  }, [currentUser]);

  /**
   * Switch the current user's role. Useful for prototype role-based testing.
   *
   * @param {string} role - One of the ROLES values.
   * @returns {{ success: boolean, error: string|null }}
   */
  const switchRole = useCallback(
    (role) => {
      try {
        if (!role || !ROLE_LIST.includes(role)) {
          return { success: false, error: `Invalid role: "${role}". Must be one of: ${ROLE_LIST.join(', ')}.` };
        }

        if (!currentUser) {
          return { success: false, error: 'No user is currently logged in.' };
        }

        const previousRole = currentUser.role;
        const updatedUser = { ...currentUser, role };

        setCurrentUser(updatedUser);
        setStorageItem(LOCAL_STORAGE_KEYS.AUTH_USER, updatedUser);

        logAction(currentUser.id, AUDIT_ACTIONS.USER_ROLE_CHANGE, {
          username: currentUser.username,
          previousRole,
          newRole: role,
          method: 'prototype_switch',
        });

        return { success: true, error: null };
      } catch (_err) {
        console.error('AuthContext: Role switch failed:', _err);
        return { success: false, error: 'Role switch failed unexpectedly.' };
      }
    },
    [currentUser],
  );

  /**
   * Check whether the current user is authenticated.
   * @type {boolean}
   */
  const isAuthenticated = currentUser !== null && currentUser.active !== false;

  /**
   * Check whether the current user has a specific role.
   *
   * @param {string} role - The role to check.
   * @returns {boolean}
   */
  const hasRole = useCallback(
    (role) => {
      if (!currentUser || !role) {
        return false;
      }
      return currentUser.role === role;
    },
    [currentUser],
  );

  /**
   * Check whether the current user has a specific permission.
   *
   * @param {string} permission - The permission string to check.
   * @returns {boolean}
   */
  const hasPermission = useCallback(
    (permission) => {
      if (!currentUser || !permission) {
        return false;
      }

      const permissions = ROLE_PERMISSIONS[currentUser.role];
      if (!permissions) {
        return false;
      }

      return permissions.includes(permission);
    },
    [currentUser],
  );

  /**
   * Check whether the current user has any of the specified roles.
   *
   * @param {string[]} roles - Array of role strings.
   * @returns {boolean}
   */
  const hasAnyRole = useCallback(
    (roles) => {
      if (!currentUser || !Array.isArray(roles) || roles.length === 0) {
        return false;
      }
      return roles.includes(currentUser.role);
    },
    [currentUser],
  );

  /**
   * Check whether the current user has all of the specified permissions.
   *
   * @param {string[]} permissions - Array of permission strings.
   * @returns {boolean}
   */
  const hasAllPermissions = useCallback(
    (permissions) => {
      if (!currentUser || !Array.isArray(permissions) || permissions.length === 0) {
        return false;
      }

      const userPermissions = ROLE_PERMISSIONS[currentUser.role];
      if (!userPermissions) {
        return false;
      }

      return permissions.every((p) => userPermissions.includes(p));
    },
    [currentUser],
  );

  const contextValue = useMemo(
    () => ({
      currentUser,
      isAuthenticated,
      isLoading,
      login,
      logout,
      switchRole,
      hasRole,
      hasPermission,
      hasAnyRole,
      hasAllPermissions,
      availableRoles: ROLE_LIST,
      rolePermissions: ROLE_PERMISSIONS,
    }),
    [
      currentUser,
      isAuthenticated,
      isLoading,
      login,
      logout,
      switchRole,
      hasRole,
      hasPermission,
      hasAnyRole,
      hasAllPermissions,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Custom hook to consume the AuthContext.
 * Must be used within an AuthProvider.
 *
 * @returns {{
 *   currentUser: Object|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   login: function,
 *   logout: function,
 *   switchRole: function,
 *   hasRole: function,
 *   hasPermission: function,
 *   hasAnyRole: function,
 *   hasAllPermissions: function,
 *   availableRoles: string[],
 *   rolePermissions: Object,
 * }}
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
};

export default AuthContext;