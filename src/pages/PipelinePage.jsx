/**
 * Pipeline page for Horizon DevSecOps Portal
 * Provides tabs for: Generate Pipeline (PipelineGenerator), Pipeline List
 * (PipelineList), Pipeline Viewer (PipelineViewer for selected pipeline).
 * Provides page-level context for pipeline operations.
 * @module pages/PipelinePage
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Eye,
  GitBranch,
  List,
  Play,
} from 'lucide-react';
import Tabs from '../components/common/Tabs.jsx';
import PipelineGenerator from '../components/pipeline/PipelineGenerator.jsx';
import PipelineList from '../components/pipeline/PipelineList.jsx';
import PipelineViewer from '../components/pipeline/PipelineViewer.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import { useToast } from '../components/common/Toast.jsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Pipeline page tab definitions.
 * @type {Array<Object>}
 */
const PIPELINE_TABS = [
  { id: 'list', label: 'Pipeline List', icon: List },
  { id: 'viewer', label: 'Pipeline Viewer', icon: Eye },
  { id: 'generate', label: 'Generate Pipeline', icon: Play },
];

/**
 * Map URL path segments to tab IDs.
 * @type {Object<string, string>}
 */
const PATH_TO_TAB = {
  '/pipelines': 'list',
  '/pipelines/runs': 'viewer',
  '/pipelines/generate': 'generate',
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Pipeline page composing PipelineGenerator, PipelineList, and PipelineViewer
 * as tabbed views. Provides page-level context for pipeline operations.
 *
 * @returns {import('react').ReactElement}
 */
export default function PipelinePage() {
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
    return PATH_TO_TAB[pathname] || 'list';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedPipeline, setSelectedPipeline] = useState(null);

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

  const canManagePipelines = hasPermission('manage_pipelines');

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
  // Handlers
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);

      // Update URL to match the selected tab
      switch (tabId) {
        case 'list':
          navigate('/pipelines', { replace: true });
          break;
        case 'generate':
          navigate('/pipelines/generate', { replace: true });
          break;
        case 'viewer':
          navigate('/pipelines', { replace: true });
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  const handlePipelineSelect = useCallback(
    (pipeline) => {
      if (pipeline && typeof pipeline === 'object') {
        setSelectedPipeline(pipeline);
        setActiveTab('viewer');
        toast.info(`Viewing pipeline: ${pipeline.pipelineName || pipeline.name || 'Pipeline'}`);
      }
    },
    [toast],
  );

  // -------------------------------------------------------------------------
  // Tab badges and state
  // -------------------------------------------------------------------------

  const tabsWithState = useMemo(() => {
    return PIPELINE_TABS.map((tab) => {
      // Disable the "Generate Pipeline" tab if user lacks permission
      if (tab.id === 'generate' && !canManagePipelines) {
        return { ...tab, disabled: true };
      }
      // Show a badge on the viewer tab when a pipeline is selected
      if (tab.id === 'viewer' && selectedPipeline) {
        return { ...tab, badge: '1' };
      }
      return tab;
    });
  }, [canManagePipelines, selectedPipeline]);

  // -------------------------------------------------------------------------
  // Render tab content
  // -------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'list':
        return (
          <PipelineList
            onPipelineSelect={handlePipelineSelect}
            defaultViewMode="table"
            showSummary
          />
        );
      case 'viewer':
        return (
          <PipelineViewer
            pipelineId={selectedPipeline ? selectedPipeline.id : undefined}
            pipeline={selectedPipeline || undefined}
            showMetadata
            showSummary
            showRuns
            showSelector
            defaultTab="flow"
          />
        );
      case 'generate':
        return (
          <PipelineGenerator
            defaultApplicationId={defaultApplicationId}
            defaultPlatform="jenkins"
          />
        );
      default:
        return (
          <PipelineList
            onPipelineSelect={handlePipelineSelect}
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
          Pipelines
        </h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          {currentUser
            ? `Welcome, ${currentUser.firstName}. `
            : ''}
          Generate Golden Pipelines with embedded security scanning, quality engineering, and
          observability stages. View and manage pipeline configurations, policy-as-code rules,
          and pipeline run history.
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

PipelinePage.propTypes = {};