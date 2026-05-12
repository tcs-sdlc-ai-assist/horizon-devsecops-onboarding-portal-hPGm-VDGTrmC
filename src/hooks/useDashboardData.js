/**
 * Custom hook for dashboard data fetching and management
 * Provides aggregated MELT, KPI, DORA, MTTR, QE, AI adoption,
 * and Cost/FinOps data with loading states and auto-refresh.
 * @module hooks/useDashboardData
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getMELTData,
  getKPIData,
  getDORAMetrics,
  getMTTRMetrics,
  getQEMetrics,
  getAIAdoptionMetrics,
  getCostFinOpsMetrics,
  getDashboardSummary,
  getGovernanceData,
  refreshDashboardData,
} from '../services/DashboardDataService.js';

/**
 * Default auto-refresh interval in milliseconds (5 minutes).
 * @type {number}
 */
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Minimum allowed refresh interval in milliseconds (30 seconds).
 * @type {number}
 */
const MIN_REFRESH_INTERVAL_MS = 30 * 1000;

/**
 * Custom hook that fetches and manages all dashboard data sources.
 * Supports filtering by domain and application, automatic refresh,
 * and manual refresh triggers.
 *
 * @param {string|null} [domain=null] - Domain name to filter data by.
 * @param {string|null} [app=null] - Application name or ID to filter data by.
 * @param {Object} [options]
 * @param {boolean} [options.autoRefresh=true] - Whether to enable auto-refresh.
 * @param {number} [options.refreshIntervalMs] - Auto-refresh interval in milliseconds.
 * @param {string} [options.environment] - Environment filter.
 * @returns {{
 *   meltData: Object|null,
 *   kpiData: Object|null,
 *   doraMetrics: Object|null,
 *   mttrMetrics: Object|null,
 *   qeMetrics: Object|null,
 *   aiAdoption: Object|null,
 *   costFinOps: Object|null,
 *   governanceData: Object|null,
 *   dashboardSummary: Object|null,
 *   loading: boolean,
 *   error: string|null,
 *   lastUpdated: string|null,
 *   refresh: function,
 * }}
 */
const useDashboardData = (domain = null, app = null, options = {}) => {
  const {
    autoRefresh = true,
    refreshIntervalMs,
    environment,
  } = options;

  const [meltData, setMeltData] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [doraMetrics, setDoraMetrics] = useState(null);
  const [mttrMetrics, setMttrMetrics] = useState(null);
  const [qeMetrics, setQeMetrics] = useState(null);
  const [aiAdoption, setAiAdoption] = useState(null);
  const [costFinOps, setCostFinOps] = useState(null);
  const [governanceData, setGovernanceData] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Build the filters object from domain and app parameters
  const filters = useMemo(() => {
    const f = {};

    if (domain && typeof domain === 'string' && domain.trim().length > 0) {
      f.domain = domain.trim();
    }

    if (app && typeof app === 'string' && app.trim().length > 0) {
      f.application = app.trim();
    }

    if (environment && typeof environment === 'string' && environment.trim().length > 0) {
      f.environment = environment.trim();
    }

    return f;
  }, [domain, app, environment]);

  /**
   * Fetch all dashboard data sources with the current filters.
   * Updates state for each data source and manages loading/error states.
   */
  const fetchData = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const melt = getMELTData(filters);
      if (mountedRef.current) {
        setMeltData(melt);
      }

      const kpi = getKPIData(filters);
      if (mountedRef.current) {
        setKpiData(kpi);
      }

      const dora = getDORAMetrics(filters);
      if (mountedRef.current) {
        setDoraMetrics(dora);
      }

      const mttr = getMTTRMetrics(filters);
      if (mountedRef.current) {
        setMttrMetrics(mttr);
      }

      const qe = getQEMetrics(filters);
      if (mountedRef.current) {
        setQeMetrics(qe);
      }

      const ai = getAIAdoptionMetrics(filters);
      if (mountedRef.current) {
        setAiAdoption(ai);
      }

      const cost = getCostFinOpsMetrics(filters);
      if (mountedRef.current) {
        setCostFinOps(cost);
      }

      const governance = getGovernanceData(filters);
      if (mountedRef.current) {
        setGovernanceData(governance);
      }

      const summary = getDashboardSummary(filters);
      if (mountedRef.current) {
        setDashboardSummary(summary);
      }

      if (mountedRef.current) {
        setLastUpdated(new Date().toISOString());
        setLoading(false);
      }
    } catch (_err) {
      if (mountedRef.current) {
        console.error('useDashboardData: Failed to fetch dashboard data:', _err);
        setError('Failed to fetch dashboard data. Please try again.');
        setLoading(false);
      }
    }
  }, [filters]);

  /**
   * Manually trigger a data refresh. Optionally accepts new data to merge
   * into the dashboard data service before re-fetching.
   *
   * @param {Object} [newData] - Optional new data to merge before refreshing.
   */
  const refresh = useCallback(
    (newData) => {
      if (!mountedRef.current) {
        return;
      }

      try {
        if (newData && typeof newData === 'object') {
          refreshDashboardData({ newData });
        }
      } catch (_err) {
        console.error('useDashboardData: Failed to merge new data during refresh:', _err);
      }

      fetchData();
    },
    [fetchData],
  );

  // Initial data fetch when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const resolvedInterval =
      typeof refreshIntervalMs === 'number' && refreshIntervalMs >= MIN_REFRESH_INTERVAL_MS
        ? refreshIntervalMs
        : DEFAULT_REFRESH_INTERVAL_MS;

    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        fetchData();
      }
    }, resolvedInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshIntervalMs, fetchData]);

  // Track mounted state for cleanup
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    meltData,
    kpiData,
    doraMetrics,
    mttrMetrics,
    qeMetrics,
    aiAdoption,
    costFinOps,
    governanceData,
    dashboardSummary,
    loading,
    error,
    lastUpdated,
    refresh,
  };
};

export default useDashboardData;