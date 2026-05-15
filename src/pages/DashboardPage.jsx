/**
 * Main dashboard page for Horizon DevSecOps Portal
 * Composes DashboardShell with MELTDashboard, KPIDashboard, and
 * GovernanceDashboard as tabbed views. Shows overview summary cards
 * at top with key metrics. Entry point after login.
 * @module pages/DashboardPage
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import Tabs from '../components/common/Tabs.jsx';
import DashboardShell from '../components/dashboard/DashboardShell.jsx';
import MELTDashboard from '../components/dashboard/MELTDashboard.jsx';
import KPIDashboard from '../components/dashboard/KPIDashboard.jsx';
import GovernanceDashboard from '../components/dashboard/GovernanceDashboard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import { useLocation } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Top-level dashboard tab definitions.
 * @type {Array<Object>}
 */
const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'melt', label: 'MELT Observability', icon: Activity },
  { id: 'kpi', label: 'KPI / DORA', icon: TrendingUp },
  { id: 'governance', label: 'Governance', icon: ShieldCheck },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Main dashboard page composing DashboardShell with MELTDashboard,
 * KPIDashboard, and GovernanceDashboard as tabbed views. Shows overview
 * summary cards at top with key metrics. Entry point after login.
 *
 * @returns {import('react').ReactElement}
 */
export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { selectedDomain, selectedApplication } = useApp();
  const location = useLocation();

  // Map URL paths to dashboard tabs
  const PATH_TO_TAB = {
    '/': 'overview',
    '/dashboard': 'overview',
    '/observability': 'overview',
    '/observability/melt': 'melt',
    '/observability/incidents': 'melt',
    '/observability/events': 'melt',
  };

  const initialTab = PATH_TO_TAB[location.pathname] || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync activeTab when URL changes externally (e.g. sidebar navigation)
  useEffect(() => {
    const tabFromPath = PATH_TO_TAB[location.pathname];
    if (tabFromPath && tabFromPath !== activeTab) {
      setActiveTab(tabFromPath);
    }
  }, [location.pathname]);

  // -------------------------------------------------------------------------
  // Resolve domain/application filters from global context
  // -------------------------------------------------------------------------

  const domainFilter = useMemo(() => {
    if (!selectedDomain) {
      return undefined;
    }
    if (typeof selectedDomain === 'object' && selectedDomain !== null) {
      return selectedDomain.name || undefined;
    }
    return typeof selectedDomain === 'string' ? selectedDomain : undefined;
  }, [selectedDomain]);

  const applicationFilter = useMemo(() => {
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

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <DashboardShell
            defaultTab="overview"
            defaultDomain={domainFilter}
            defaultApplication={applicationFilter}
            showSummaryCards
          />
        );
      case 'melt':
        return (
          <MELTDashboard
            defaultTab="overview"
            defaultDomain={domainFilter}
            defaultApplication={applicationFilter}
            showSummary
            showDataSources
          />
        );
      case 'kpi':
        return (
          <KPIDashboard
            defaultTab="overview"
            defaultDomain={domainFilter}
            defaultApplication={applicationFilter}
            showConfigurableMetrics
          />
        );
      case 'governance':
        return (
          <GovernanceDashboard
            defaultTab="overview"
            defaultDomain={domainFilter}
            showFilterBar
          />
        );
      default:
        return (
          <DashboardShell
            defaultTab="overview"
            defaultDomain={domainFilter}
            defaultApplication={applicationFilter}
            showSummaryCards
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
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          {currentUser
            ? `Welcome back, ${currentUser.firstName}. `
            : ''}
          Unified DevSecOps dashboard with MELT observability, KPI/DORA performance metrics,
          and governance compliance views.
        </p>
      </div>

      {/* Top-level Tabs */}
      <Tabs
        tabs={DASHBOARD_TABS}
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

DashboardPage.propTypes = {};