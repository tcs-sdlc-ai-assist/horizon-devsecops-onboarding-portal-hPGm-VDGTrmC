/**
 * Application state context for Horizon DevSecOps Portal
 * Provides global application state including domain/portfolio/application
 * selection, notifications, sidebar state, and theme management.
 * @module contexts/AppContext
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import PropTypes from 'prop-types';
import { LOCAL_STORAGE_KEYS, THEMES, THEME_LIST } from '../constants/constants.js';
import { MOCK_NOTIFICATIONS, MOCK_DOMAINS, MOCK_PORTFOLIOS, MOCK_APPLICATIONS } from '../constants/mockData.js';
import { getStorageItem, setStorageItem } from '../utils/localStorage.js';

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

const ACTION_TYPES = Object.freeze({
  SET_SELECTED_DOMAIN: 'SET_SELECTED_DOMAIN',
  SET_SELECTED_PORTFOLIO: 'SET_SELECTED_PORTFOLIO',
  SET_SELECTED_APPLICATION: 'SET_SELECTED_APPLICATION',
  CLEAR_SELECTIONS: 'CLEAR_SELECTIONS',
  SET_SIDEBAR_COLLAPSED: 'SET_SIDEBAR_COLLAPSED',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_THEME: 'SET_THEME',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
  MARK_ALL_NOTIFICATIONS_READ: 'MARK_ALL_NOTIFICATIONS_READ',
  DISMISS_NOTIFICATION: 'DISMISS_NOTIFICATION',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
});

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

/**
 * Build the initial state from localStorage or defaults.
 * @returns {Object}
 */
const getInitialState = () => {
  const storedDomain = getStorageItem(LOCAL_STORAGE_KEYS.SELECTED_DOMAIN, null);
  const storedPortfolio = getStorageItem(LOCAL_STORAGE_KEYS.SELECTED_PORTFOLIO, null);
  const storedApplication = getStorageItem(LOCAL_STORAGE_KEYS.SELECTED_APPLICATION, null);
  const storedSidebarCollapsed = getStorageItem(LOCAL_STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  const storedTheme = getStorageItem(LOCAL_STORAGE_KEYS.THEME, THEMES.LIGHT);
  const dismissedNotifications = getStorageItem(LOCAL_STORAGE_KEYS.NOTIFICATION_DISMISSED, []);

  // Filter out dismissed notifications from mock data
  const notifications = MOCK_NOTIFICATIONS.map((n) => ({
    ...n,
    dismissed: Array.isArray(dismissedNotifications) && dismissedNotifications.includes(n.id),
  })).filter((n) => !n.dismissed);

  return {
    selectedDomain: storedDomain,
    selectedPortfolio: storedPortfolio,
    selectedApplication: storedApplication,
    sidebarCollapsed: storedSidebarCollapsed === true,
    theme: THEME_LIST.includes(storedTheme) ? storedTheme : THEMES.LIGHT,
    notifications,
    domains: MOCK_DOMAINS,
    portfolios: MOCK_PORTFOLIOS,
    applications: MOCK_APPLICATIONS,
  };
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Application state reducer.
 * @param {Object} state
 * @param {Object} action
 * @returns {Object}
 */
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_SELECTED_DOMAIN:
      return {
        ...state,
        selectedDomain: action.payload,
        selectedPortfolio: null,
        selectedApplication: null,
      };

    case ACTION_TYPES.SET_SELECTED_PORTFOLIO:
      return {
        ...state,
        selectedPortfolio: action.payload,
        selectedApplication: null,
      };

    case ACTION_TYPES.SET_SELECTED_APPLICATION:
      return {
        ...state,
        selectedApplication: action.payload,
      };

    case ACTION_TYPES.CLEAR_SELECTIONS:
      return {
        ...state,
        selectedDomain: null,
        selectedPortfolio: null,
        selectedApplication: null,
      };

    case ACTION_TYPES.SET_SIDEBAR_COLLAPSED:
      return {
        ...state,
        sidebarCollapsed: action.payload === true,
      };

    case ACTION_TYPES.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      };

    case ACTION_TYPES.SET_THEME:
      return {
        ...state,
        theme: THEME_LIST.includes(action.payload) ? action.payload : state.theme,
      };

    case ACTION_TYPES.SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: Array.isArray(action.payload) ? action.payload : state.notifications,
      };

    case ACTION_TYPES.MARK_NOTIFICATION_READ: {
      const notificationId = action.payload;
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n,
        ),
      };
    }

    case ACTION_TYPES.MARK_ALL_NOTIFICATIONS_READ:
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      };

    case ACTION_TYPES.DISMISS_NOTIFICATION: {
      const dismissId = action.payload;
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== dismissId),
      };
    }

    case ACTION_TYPES.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };

    default:
      return state;
  }
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AppContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * AppProvider wraps the application and provides global state for
 * domain/portfolio/application selection, notifications, sidebar,
 * and theme management.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @returns {import('react').ReactElement}
 */
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

  // -------------------------------------------------------------------------
  // Persist selections to localStorage
  // -------------------------------------------------------------------------

  useEffect(() => {
    setStorageItem(LOCAL_STORAGE_KEYS.SELECTED_DOMAIN, state.selectedDomain);
  }, [state.selectedDomain]);

  useEffect(() => {
    setStorageItem(LOCAL_STORAGE_KEYS.SELECTED_PORTFOLIO, state.selectedPortfolio);
  }, [state.selectedPortfolio]);

  useEffect(() => {
    setStorageItem(LOCAL_STORAGE_KEYS.SELECTED_APPLICATION, state.selectedApplication);
  }, [state.selectedApplication]);

  useEffect(() => {
    setStorageItem(LOCAL_STORAGE_KEYS.SIDEBAR_COLLAPSED, state.sidebarCollapsed);
  }, [state.sidebarCollapsed]);

  // -------------------------------------------------------------------------
  // Theme management — apply dark class to document
  // -------------------------------------------------------------------------

  useEffect(() => {
    setStorageItem(LOCAL_STORAGE_KEYS.THEME, state.theme);

    const root = document.documentElement;

    if (state.theme === THEMES.DARK) {
      root.classList.add('dark');
    } else if (state.theme === THEMES.LIGHT) {
      root.classList.remove('dark');
    } else if (state.theme === THEMES.SYSTEM) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [state.theme]);

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (state.theme !== THEMES.SYSTEM) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [state.theme]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Set the selected domain. Clears portfolio and application selections.
   * @param {Object|null} domain - The domain object or null to clear.
   */
  const setSelectedDomain = useCallback((domain) => {
    dispatch({ type: ACTION_TYPES.SET_SELECTED_DOMAIN, payload: domain });
  }, []);

  /**
   * Set the selected portfolio. Clears application selection.
   * @param {Object|null} portfolio - The portfolio object or null to clear.
   */
  const setSelectedPortfolio = useCallback((portfolio) => {
    dispatch({ type: ACTION_TYPES.SET_SELECTED_PORTFOLIO, payload: portfolio });
  }, []);

  /**
   * Set the selected application.
   * @param {Object|null} application - The application object or null to clear.
   */
  const setSelectedApplication = useCallback((application) => {
    dispatch({ type: ACTION_TYPES.SET_SELECTED_APPLICATION, payload: application });
  }, []);

  /**
   * Clear all domain/portfolio/application selections.
   */
  const clearSelections = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_SELECTIONS });
  }, []);

  /**
   * Set the sidebar collapsed state.
   * @param {boolean} collapsed
   */
  const setSidebarCollapsed = useCallback((collapsed) => {
    dispatch({ type: ACTION_TYPES.SET_SIDEBAR_COLLAPSED, payload: collapsed });
  }, []);

  /**
   * Toggle the sidebar collapsed state.
   */
  const toggleSidebar = useCallback(() => {
    dispatch({ type: ACTION_TYPES.TOGGLE_SIDEBAR });
  }, []);

  /**
   * Set the application theme.
   * @param {string} theme - One of THEMES values ('light', 'dark', 'system').
   */
  const setTheme = useCallback((theme) => {
    dispatch({ type: ACTION_TYPES.SET_THEME, payload: theme });
  }, []);

  /**
   * Mark a single notification as read.
   * @param {string} notificationId
   */
  const markNotificationRead = useCallback((notificationId) => {
    dispatch({ type: ACTION_TYPES.MARK_NOTIFICATION_READ, payload: notificationId });
  }, []);

  /**
   * Mark all notifications as read.
   */
  const markAllNotificationsRead = useCallback(() => {
    dispatch({ type: ACTION_TYPES.MARK_ALL_NOTIFICATIONS_READ });
  }, []);

  /**
   * Dismiss (remove) a notification.
   * @param {string} notificationId
   */
  const dismissNotification = useCallback((notificationId) => {
    // Persist dismissed notification ID
    const dismissed = getStorageItem(LOCAL_STORAGE_KEYS.NOTIFICATION_DISMISSED, []);
    const updatedDismissed = Array.isArray(dismissed) ? [...dismissed, notificationId] : [notificationId];
    setStorageItem(LOCAL_STORAGE_KEYS.NOTIFICATION_DISMISSED, updatedDismissed);

    dispatch({ type: ACTION_TYPES.DISMISS_NOTIFICATION, payload: notificationId });
  }, []);

  /**
   * Add a new notification.
   * @param {Object} notification - The notification object.
   */
  const addNotification = useCallback((notification) => {
    if (!notification || typeof notification !== 'object') {
      return;
    }

    const newNotification = {
      id: notification.id || `NTF-${Date.now()}`,
      type: notification.type || 'info',
      title: notification.title || '',
      message: notification.message || '',
      severity: notification.severity || 'Info',
      applicationName: notification.applicationName || null,
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false,
      actionUrl: notification.actionUrl || null,
    };

    dispatch({ type: ACTION_TYPES.ADD_NOTIFICATION, payload: newNotification });
  }, []);

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  /**
   * Get portfolios filtered by the selected domain.
   * @type {Array<Object>}
   */
  const filteredPortfolios = useMemo(() => {
    if (!state.selectedDomain) {
      return state.portfolios;
    }

    const domainId = typeof state.selectedDomain === 'object' ? state.selectedDomain.id : state.selectedDomain;
    const domainName = typeof state.selectedDomain === 'object' ? state.selectedDomain.name : null;

    return state.portfolios.filter((p) => p.domainId === domainId || p.domainName === domainName);
  }, [state.selectedDomain, state.portfolios]);

  /**
   * Get applications filtered by the selected domain and/or portfolio.
   * @type {Array<Object>}
   */
  const filteredApplications = useMemo(() => {
    let apps = state.applications;

    if (state.selectedDomain) {
      const domainId = typeof state.selectedDomain === 'object' ? state.selectedDomain.id : state.selectedDomain;
      const domainName = typeof state.selectedDomain === 'object' ? state.selectedDomain.name : null;
      apps = apps.filter((a) => a.domainId === domainId || a.domainName === domainName);
    }

    if (state.selectedPortfolio) {
      const portfolioId = typeof state.selectedPortfolio === 'object' ? state.selectedPortfolio.id : state.selectedPortfolio;
      const portfolioName = typeof state.selectedPortfolio === 'object' ? state.selectedPortfolio.name : null;
      apps = apps.filter((a) => a.portfolioId === portfolioId || a.portfolioName === portfolioName);
    }

    return apps;
  }, [state.selectedDomain, state.selectedPortfolio, state.applications]);

  /**
   * Count of unread notifications.
   * @type {number}
   */
  const unreadNotificationCount = useMemo(() => {
    return state.notifications.filter((n) => !n.read).length;
  }, [state.notifications]);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const contextValue = useMemo(
    () => ({
      // State
      selectedDomain: state.selectedDomain,
      selectedPortfolio: state.selectedPortfolio,
      selectedApplication: state.selectedApplication,
      sidebarCollapsed: state.sidebarCollapsed,
      theme: state.theme,
      notifications: state.notifications,
      domains: state.domains,
      portfolios: state.portfolios,
      applications: state.applications,

      // Derived state
      filteredPortfolios,
      filteredApplications,
      unreadNotificationCount,

      // Actions
      setSelectedDomain,
      setSelectedPortfolio,
      setSelectedApplication,
      clearSelections,
      setSidebarCollapsed,
      toggleSidebar,
      setTheme,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      addNotification,
    }),
    [
      state.selectedDomain,
      state.selectedPortfolio,
      state.selectedApplication,
      state.sidebarCollapsed,
      state.theme,
      state.notifications,
      state.domains,
      state.portfolios,
      state.applications,
      filteredPortfolios,
      filteredApplications,
      unreadNotificationCount,
      setSelectedDomain,
      setSelectedPortfolio,
      setSelectedApplication,
      clearSelections,
      setSidebarCollapsed,
      toggleSidebar,
      setTheme,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      addNotification,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Custom hook to consume the AppContext.
 * Must be used within an AppProvider.
 *
 * @returns {{
 *   selectedDomain: Object|null,
 *   selectedPortfolio: Object|null,
 *   selectedApplication: Object|null,
 *   sidebarCollapsed: boolean,
 *   theme: string,
 *   notifications: Array<Object>,
 *   domains: Array<Object>,
 *   portfolios: Array<Object>,
 *   applications: Array<Object>,
 *   filteredPortfolios: Array<Object>,
 *   filteredApplications: Array<Object>,
 *   unreadNotificationCount: number,
 *   setSelectedDomain: function,
 *   setSelectedPortfolio: function,
 *   setSelectedApplication: function,
 *   clearSelections: function,
 *   setSidebarCollapsed: function,
 *   toggleSidebar: function,
 *   setTheme: function,
 *   markNotificationRead: function,
 *   markAllNotificationsRead: function,
 *   dismissNotification: function,
 *   addNotification: function,
 * }}
 */
export const useApp = () => {
  const context = useContext(AppContext);

  if (context === null) {
    throw new Error('useApp must be used within an AppProvider.');
  }

  return context;
};

export default AppContext;