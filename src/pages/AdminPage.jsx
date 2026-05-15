/**
 * Admin page for Horizon DevSecOps Portal
 * Provides tabs for: Data Upload (AdminDataUpload) and Metrics Configuration
 * (MetricsConfigurator). Restricted to Admin role. Provides page-level context
 * for admin operations.
 * @module pages/AdminPage
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  AlertCircle,
  BarChart3,
  Settings,
  Upload,
} from 'lucide-react';
import Tabs from '../components/common/Tabs.jsx';
import AdminDataUpload from '../components/admin/AdminDataUpload.jsx';
import MetricsConfigurator from '../components/admin/MetricsConfigurator.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Admin page tab definitions.
 * @type {Array<Object>}
 */
const ADMIN_TABS = [
  { id: 'upload', label: 'Data Upload', icon: Upload },
  { id: 'metrics', label: 'Metrics Configuration', icon: BarChart3 },
];

/**
 * Map URL path segments to tab IDs.
 * @type {Object<string, string>}
 */
const PATH_TO_TAB = {
  '/admin': 'upload',
  '/admin/settings': 'metrics',
  '/admin/users': 'upload',
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Admin page composing AdminDataUpload and MetricsConfigurator as tabbed views.
 * Restricted to Admin role. Provides page-level context for admin operations
 * including data upload, metrics configuration, and system settings.
 *
 * @returns {import('react').ReactElement}
 */
export default function AdminPage() {
  const { currentUser, hasRole, hasPermission } = useAuth();
  const { selectedDomain, selectedApplication } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // -------------------------------------------------------------------------
  // Resolve initial tab from URL path
  // -------------------------------------------------------------------------

  const initialTab = useMemo(() => {
    const pathname = location.pathname;
    return PATH_TO_TAB[pathname] || 'upload';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync activeTab when URL changes externally (e.g. sidebar navigation)
  useEffect(() => {
    const tabFromPath = PATH_TO_TAB[location.pathname];
    if (tabFromPath && tabFromPath !== activeTab) {
      setActiveTab(tabFromPath);
    }
  }, [location.pathname]);

  // -------------------------------------------------------------------------
  // Permission checks
  // -------------------------------------------------------------------------

  const isAdmin = hasRole('Admin');
  const canManageSettings = hasPermission('manage_settings');
  const canUploadData = hasPermission('upload_data') || hasPermission('import_data') || hasPermission('manage_settings');

  // -------------------------------------------------------------------------
  // Resolve domain/application context
  // -------------------------------------------------------------------------

  const defaultDomain = useMemo(() => {
    if (!selectedDomain) {
      return undefined;
    }
    if (typeof selectedDomain === 'object' && selectedDomain !== null) {
      return selectedDomain.name || undefined;
    }
    return typeof selectedDomain === 'string' ? selectedDomain : undefined;
  }, [selectedDomain]);

  const defaultApplication = useMemo(() => {
    if (!selectedApplication) {
      return undefined;
    }
    if (typeof selectedApplication === 'object' && selectedApplication !== null) {
      return selectedApplication.name || undefined;
    }
    return typeof selectedApplication === 'string' ? selectedApplication : undefined;
  }, [selectedApplication]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);

      // Update URL to match the selected tab
      switch (tabId) {
        case 'upload':
          navigate('/admin/settings', { replace: true });
          break;
        case 'metrics':
          navigate('/admin/settings', { replace: true });
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  // -------------------------------------------------------------------------
  // Tab badges and state
  // -------------------------------------------------------------------------

  const tabsWithState = useMemo(() => {
    return ADMIN_TABS.map((tab) => {
      if (tab.id === 'upload' && !canUploadData) {
        return { ...tab, disabled: true };
      }
      if (tab.id === 'metrics' && !canManageSettings) {
        return { ...tab, disabled: true };
      }
      return tab;
    });
  }, [canUploadData, canManageSettings]);

  // -------------------------------------------------------------------------
  // Unauthorized access
  // -------------------------------------------------------------------------

  if (!isAdmin) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-surface-900 dark:text-surface-100">
            Access Denied
          </h2>
          <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
            The Admin page is only accessible to users with the Admin role.
            Your current role is{' '}
            <span className="font-medium text-surface-700 dark:text-surface-300">
              {currentUser ? currentUser.role : 'Unknown'}
            </span>
            .
          </p>
          <a href="/" className="btn-primary inline-flex">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <AdminDataUpload
            defaultUploadType="applications"
            showSummary
          />
        );
      case 'metrics':
        return (
          <MetricsConfigurator
            defaultDomain={defaultDomain}
            defaultApplication={defaultApplication}
            showSummary
          />
        );
      default:
        return (
          <AdminDataUpload
            defaultUploadType="applications"
            showSummary
          />
        );
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-surface-900 dark:text-surface-100">
          Admin
        </h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          {currentUser
            ? `Welcome, ${currentUser.firstName}. `
            : ''}
          Manage portal data uploads, configure KPI metrics visibility and thresholds per
          domain or application, and administer system settings. All admin actions are logged
          to the audit trail for HIPAA/CMS compliance.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabsWithState}
        activeTab={activeTab}
        onChange={handleTabChange}
        variant="pill"
        size="md"
      />

      {/* Tab Content */}
      <div className="mt-6">{renderTabContent()}</div>
    </div>
  );
}

AdminPage.propTypes = {};