/**
 * Route protection component for Horizon DevSecOps Portal
 * Checks authentication and role-based access before rendering child routes.
 * Redirects to login if not authenticated. Shows unauthorized message if
 * user lacks required role. Accepts requiredRoles prop.
 * @module components/auth/ProtectedRoute
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

/**
 * Unauthorized access fallback component.
 * Displayed when the user is authenticated but lacks the required role.
 *
 * @param {Object} props
 * @param {string} props.currentRole - The user's current role.
 * @param {string[]} props.requiredRoles - The roles that are allowed access.
 * @returns {import('react').ReactElement}
 */
function UnauthorizedMessage({ currentRole, requiredRoles }) {
  return (
    <div className="flex min-h-screen-content items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <ShieldAlert size={32} className="text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-surface-900 dark:text-surface-100">
          Access Denied
        </h2>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
          You do not have permission to access this page.
        </p>
        <p className="mb-6 text-xs text-surface-400 dark:text-surface-500">
          Your current role is{' '}
          <span className="font-medium text-surface-700 dark:text-surface-300">
            {currentRole}
          </span>
          . This page requires one of the following roles:{' '}
          <span className="font-medium text-surface-700 dark:text-surface-300">
            {requiredRoles.join(', ')}
          </span>
          .
        </p>
        <a
          href="/"
          className="btn-primary inline-flex"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

UnauthorizedMessage.propTypes = {
  currentRole: PropTypes.string.isRequired,
  requiredRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

/**
 * Loading fallback component displayed while authentication state is being resolved.
 *
 * @returns {import('react').ReactElement}
 */
function AuthLoading() {
  return (
    <div className="flex min-h-screen-content items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-pulse-slow rounded-full bg-horizon-500" />
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Verifying authentication…
        </p>
      </div>
    </div>
  );
}

/**
 * Route guard component that protects routes based on authentication
 * and role-based access control.
 *
 * - If the user is not authenticated, redirects to the root path (`/`).
 * - If `requiredRoles` is provided and the user's role is not in the list,
 *   renders an unauthorized message.
 * - Otherwise, renders the child route via `<Outlet />` or `children`.
 *
 * @param {Object} props
 * @param {string[]} [props.requiredRoles] - Array of role strings that are
 *   allowed to access the wrapped routes. When omitted or empty, any
 *   authenticated user is granted access.
 * @param {import('react').ReactNode} [props.children] - Optional children to
 *   render instead of `<Outlet />`.
 * @returns {import('react').ReactElement}
 */
export default function ProtectedRoute({ requiredRoles, children }) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Wait for auth state to resolve before making access decisions
  if (isLoading) {
    return <AuthLoading />;
  }

  // Redirect unauthenticated users to the root path, preserving the
  // intended destination so a future login flow can redirect back.
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check role-based access when requiredRoles is specified
  if (
    Array.isArray(requiredRoles) &&
    requiredRoles.length > 0 &&
    !requiredRoles.includes(currentUser.role)
  ) {
    return (
      <UnauthorizedMessage
        currentRole={currentUser.role}
        requiredRoles={requiredRoles}
      />
    );
  }

  // Render children if provided, otherwise render the nested Outlet
  return children ? children : <Outlet />;
}

ProtectedRoute.propTypes = {
  requiredRoles: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node,
};