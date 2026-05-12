/**
 * Onboarding page for Horizon DevSecOps Portal
 * Provides tabs for: New Onboarding (OnboardingForm), Catalog Browser
 * (OnboardingCatalog), and Onboarded Applications (OnboardedApplicationsList).
 * Provides page-level context and navigation between onboarding workflows.
 * @module pages/OnboardingPage
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  AppWindow,
  LayoutGrid,
  PackagePlus,
} from 'lucide-react';
import Tabs from '../components/common/Tabs.jsx';
import OnboardingForm from '../components/onboarding/OnboardingForm.jsx';
import OnboardingCatalog from '../components/onboarding/OnboardingCatalog.jsx';
import OnboardedApplicationsList from '../components/onboarding/OnboardedApplicationsList.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../components/common/Toast.jsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Onboarding page tab definitions.
 * @type {Array<Object>}
 */
const ONBOARDING_TABS = [
  { id: 'new', label: 'New Onboarding', icon: PackagePlus },
  { id: 'catalog', label: 'Catalog Browser', icon: LayoutGrid },
  { id: 'list', label: 'Onboarded Applications', icon: AppWindow },
];

/**
 * Map URL path segments to tab IDs.
 * @type {Object<string, string>}
 */
const PATH_TO_TAB = {
  '/onboarding/new': 'new',
  '/onboarding/import': 'new',
  '/onboarding/list': 'list',
  '/onboarding': 'list',
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Onboarding page composing OnboardingForm, OnboardingCatalog, and
 * OnboardedApplicationsList as tabbed views. Provides page-level context
 * and navigation between onboarding workflows.
 *
 * @returns {import('react').ReactElement}
 */
export default function OnboardingPage() {
  const { currentUser, hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // -------------------------------------------------------------------------
  // Resolve initial tab from URL path
  // -------------------------------------------------------------------------

  const initialTab = useMemo(() => {
    const pathname = location.pathname;
    return PATH_TO_TAB[pathname] || 'list';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(initialTab);

  // -------------------------------------------------------------------------
  // Permission checks
  // -------------------------------------------------------------------------

  const canManageApplications = hasPermission('manage_applications');

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);

      // Update URL to match the selected tab
      switch (tabId) {
        case 'new':
          navigate('/onboarding/new', { replace: true });
          break;
        case 'catalog':
          navigate('/onboarding', { replace: true });
          break;
        case 'list':
          navigate('/onboarding/list', { replace: true });
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  const handleOnboardingSuccess = useCallback(
    (result) => {
      toast.success(
        `Application "${result.applicationId}" onboarded successfully.`,
        { title: 'Onboarding Complete' },
      );
      setActiveTab('list');
      navigate('/onboarding/list', { replace: true });
    },
    [toast, navigate],
  );

  const handleOnboardingCancel = useCallback(() => {
    setActiveTab('list');
    navigate('/onboarding/list', { replace: true });
  }, [navigate]);

  const handleApplicationSelect = useCallback(
    (application) => {
      if (application && application.id) {
        // Navigate to the onboarded applications list with the selected app
        // In a full implementation this could navigate to a detail view
        toast.info(`Selected application: ${application.name}`);
      }
    },
    [toast],
  );

  const handleCatalogApplicationSelect = useCallback(
    (application) => {
      if (application && application.id) {
        toast.info(`Viewing application: ${application.name}`);
      }
    },
    [toast],
  );

  // -------------------------------------------------------------------------
  // Tab badges
  // -------------------------------------------------------------------------

  const tabsWithState = useMemo(() => {
    return ONBOARDING_TABS.map((tab) => {
      // Disable the "New Onboarding" tab if user lacks permission
      if (tab.id === 'new' && !canManageApplications) {
        return { ...tab, disabled: true };
      }
      return tab;
    });
  }, [canManageApplications]);

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'new':
        return (
          <OnboardingForm
            onSuccess={handleOnboardingSuccess}
            onCancel={handleOnboardingCancel}
          />
        );
      case 'catalog':
        return (
          <OnboardingCatalog
            onApplicationSelect={handleCatalogApplicationSelect}
            defaultTab="applications"
            defaultViewMode="card"
            showSummary
          />
        );
      case 'list':
        return (
          <OnboardedApplicationsList
            onApplicationSelect={handleApplicationSelect}
            defaultViewMode="table"
            showSummary
          />
        );
      default:
        return (
          <OnboardedApplicationsList
            onApplicationSelect={handleApplicationSelect}
            defaultViewMode="table"
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
          Application Onboarding
        </h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          {currentUser
            ? `Welcome, ${currentUser.firstName}. `
            : ''}
          Onboard new applications, browse the catalog of domains, portfolios, and applications,
          or manage existing onboarded applications and their toolchain configurations.
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

OnboardingPage.propTypes = {};