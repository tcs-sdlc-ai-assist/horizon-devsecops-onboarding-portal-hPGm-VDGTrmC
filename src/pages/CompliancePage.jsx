/**
 * Compliance page for Horizon DevSecOps Portal
 * Provides tabs for: Artifact Generator (ComplianceArtifactGenerator) and
 * Audit Log (AuditLogViewer). Provides page-level context for compliance
 * artifact generation and audit trail viewing.
 * @module pages/CompliancePage
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Clock,
  ShieldCheck,
} from 'lucide-react';
import Tabs from '../components/common/Tabs.jsx';
import ComplianceArtifactGenerator from '../components/compliance/ComplianceArtifactGenerator.jsx';
import AuditLogViewer from '../components/compliance/AuditLogViewer.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Compliance page tab definitions.
 * @type {Array<Object>}
 */
const COMPLIANCE_TABS = [
  { id: 'artifacts', label: 'Artifact Generator', icon: ShieldCheck },
  { id: 'audit', label: 'Audit Log', icon: Clock },
];

/**
 * Map URL path segments to tab IDs.
 * @type {Object<string, string>}
 */
const PATH_TO_TAB = {
  '/compliance': 'artifacts',
  '/compliance/artifacts': 'artifacts',
  '/compliance/governance': 'artifacts',
  '/compliance/audit': 'audit',
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Compliance page composing ComplianceArtifactGenerator and AuditLogViewer
 * as tabbed views. Provides page-level context for compliance artifact
 * generation and audit trail viewing.
 *
 * @returns {import('react').ReactElement}
 */
export default function CompliancePage() {
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
    return PATH_TO_TAB[pathname] || 'artifacts';
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

  const canViewAuditLogs = hasPermission('view_audit_logs');
  const canGenerateArtifacts = hasPermission('generate_artifacts') || hasPermission('manage_compliance');

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);

      // Update URL to match the selected tab
      switch (tabId) {
        case 'artifacts':
          navigate('/compliance/artifacts', { replace: true });
          break;
        case 'audit':
          navigate('/compliance/audit', { replace: true });
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
    return COMPLIANCE_TABS.map((tab) => {
      // Disable the Audit Log tab if user lacks permission
      if (tab.id === 'audit' && !canViewAuditLogs) {
        return { ...tab, disabled: true };
      }
      return tab;
    });
  }, [canViewAuditLogs]);

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'artifacts':
        return (
          <ComplianceArtifactGenerator
            defaultTab="generate"
            defaultApplicationId={defaultApplicationId}
            showSummary
          />
        );
      case 'audit':
        return (
          <AuditLogViewer
            showSummary
            showDistribution
            defaultPageSize={20}
          />
        );
      default:
        return (
          <ComplianceArtifactGenerator
            defaultTab="generate"
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
          Compliance
        </h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          {currentUser
            ? `Welcome, ${currentUser.firstName}. `
            : ''}
          Generate audit-ready compliance artifacts including ITM change records, QE evidence
          packages, security scan reports, sign-off packs, and HIPAA/CMS audit documentation.
          View and export the complete audit trail for regulatory compliance.
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

CompliancePage.propTypes = {};