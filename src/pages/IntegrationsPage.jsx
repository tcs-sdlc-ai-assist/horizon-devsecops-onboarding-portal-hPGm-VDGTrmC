/**
 * Integrations page for Horizon DevSecOps Portal
 * Provides tabs for: Integration Manager (IntegrationManager) and
 * Event Catalog (EventCatalog). Provides page-level context for managing
 * external system integrations and Kafka events.
 * @module pages/IntegrationsPage
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Plug,
  Radio,
} from 'lucide-react';
import Tabs from '../components/common/Tabs.jsx';
import IntegrationManager from '../components/integrations/IntegrationManager.jsx';
import EventCatalog from '../components/integrations/EventCatalog.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Integrations page tab definitions.
 * @type {Array<Object>}
 */
const INTEGRATIONS_TABS = [
  { id: 'manager', label: 'Integration Manager', icon: Plug },
  { id: 'events', label: 'Event Catalog', icon: Radio },
];

/**
 * Map URL path segments to tab IDs.
 * @type {Object<string, string>}
 */
const PATH_TO_TAB = {
  '/integrations': 'manager',
  '/integrations/catalog': 'manager',
  '/integrations/configured': 'manager',
  '/integrations/events': 'events',
  '/observability/events': 'events',
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Integrations page composing IntegrationManager and EventCatalog as tabbed
 * views. Provides page-level context for managing external system integrations
 * and Kafka event topics.
 *
 * @returns {import('react').ReactElement}
 */
export default function IntegrationsPage() {
  const { currentUser, hasPermission } = useAuth();
  const { selectedApplication } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // -------------------------------------------------------------------------
  // Resolve initial tab from URL path
  // -------------------------------------------------------------------------

  const initialTab = useMemo(() => {
    const pathname = location.pathname;
    return PATH_TO_TAB[pathname] || 'manager';
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
  // Resolve application context
  // -------------------------------------------------------------------------

  const defaultApplicationId = useMemo(() => {
    if (!selectedApplication) {
      return undefined;
    }
    if (typeof selectedApplication === 'object' && selectedApplication !== null) {
      return selectedApplication.id || undefined;
    }
    return typeof selectedApplication === 'string' ? selectedApplication : undefined;
  }, [selectedApplication]);

  // -------------------------------------------------------------------------
  // Permission checks
  // -------------------------------------------------------------------------

  const canManageIntegrations = hasPermission('manage_toolchain');

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);

      // Update URL to match the selected tab
      switch (tabId) {
        case 'manager':
          navigate('/integrations/catalog', { replace: true });
          break;
        case 'events':
          navigate('/integrations', { replace: true });
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
    return INTEGRATIONS_TABS.map((tab) => {
      // Disable the Integration Manager tab if user lacks permission
      // (they can still view in read-only mode, so we don't disable it)
      return tab;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    // Determine sub-tab for IntegrationManager based on URL
    const integrationSubTab = location.pathname === '/integrations/configured' ? 'configured' : 'catalog';

    switch (activeTab) {
      case 'manager':
        return (
          <IntegrationManager
            key={integrationSubTab}
            defaultTab={integrationSubTab}
            defaultApplicationId={defaultApplicationId}
            showSummary
          />
        );
      case 'events':
        return (
          <EventCatalog
            defaultTab="catalog"
            showSummary
          />
        );
      default:
        return (
          <IntegrationManager
            defaultTab="catalog"
            defaultApplicationId={defaultApplicationId}
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
          Integrations
        </h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          {currentUser
            ? `Welcome, ${currentUser.firstName}. `
            : ''}
          Browse and configure external system integrations, test connectivity, and manage
          Kafka event topics for pipeline execution, incident remediation, and SLO breach
          rollback scenarios.
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

IntegrationsPage.propTypes = {};