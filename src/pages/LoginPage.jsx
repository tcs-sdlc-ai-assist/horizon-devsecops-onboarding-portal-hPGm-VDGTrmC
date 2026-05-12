/**
 * Login page for Horizon DevSecOps Portal prototype mock authentication.
 * Displays Horizon BCBS branding, welcome message, and RoleSelector
 * component for mock user/role selection. In production, would redirect
 * to SSO provider.
 * @module pages/LoginPage
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import RoleSelector from '../components/auth/RoleSelector.jsx';

/**
 * Login page component that renders the RoleSelector for prototype
 * mock authentication. If the user is already authenticated, they
 * can continue to the dashboard or switch roles.
 *
 * In a production environment this page would initiate an SSO redirect
 * to the configured identity provider (VITE_SSO_AUTHORITY).
 *
 * @returns {import('react').ReactElement}
 */
export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If SSO were enabled we would redirect here instead of showing the
  // role selector. For the prototype we always show the mock selector.
  useEffect(() => {
    const ssoEnabled = import.meta.env.VITE_SSO_ENABLED === 'true';

    if (ssoEnabled) {
      const authority = import.meta.env.VITE_SSO_AUTHORITY;
      const clientId = import.meta.env.VITE_SSO_CLIENT_ID;

      if (authority && clientId) {
        // In production: window.location.href = `${authority}/authorize?client_id=${clientId}&...`;
        // For prototype we fall through to the RoleSelector below.
      }
    }
  }, []);

  return <RoleSelector redirectTo="/" />;
}

LoginPage.propTypes = {};