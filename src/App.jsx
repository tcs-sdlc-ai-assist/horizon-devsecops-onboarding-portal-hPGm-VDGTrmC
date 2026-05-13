/**
 * Root application component for Horizon DevSecOps Portal
 * Wraps the app with AuthProvider, AppProvider, ToastProvider, and RouterProvider.
 * Initializes localStorage with mock data on first load.
 * Sets up global error boundary.
 * @module App
 */

import { Component, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { AppProvider } from './contexts/AppContext.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import { initializeStorage } from './utils/localStorage.js';
import router from './router.jsx';
import logo from './assets/logo.png';

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

/**
 * Global error boundary component that catches unhandled errors in the
 * React component tree and displays a fallback UI instead of crashing
 * the entire application.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-12 dark:bg-surface-950">
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex justify-center">
              <img src={logo} alt="Horizon Logo" className="h-[72px] w-[204px] object-contain" />
            </div>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <span className="text-3xl font-bold text-red-600 dark:text-red-400">!</span>
            </div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-surface-900 dark:text-surface-100">
              Something went wrong
            </h1>
            <p className="mb-2 text-sm text-surface-500 dark:text-surface-400">
              An unexpected error occurred in the application.
            </p>
            {this.state.error && (
              <p className="mb-6 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {this.state.error.message || 'Unknown error'}
              </p>
            )}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="btn-secondary"
              >
                Go to Dashboard
              </button>
            </div>
            <div className="mt-10">
              <p className="text-xs text-surface-400 dark:text-surface-500">
                Horizon DevSecOps Portal
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

// ---------------------------------------------------------------------------
// App Initializer
// ---------------------------------------------------------------------------

/**
 * Component that initializes localStorage with mock data on first load.
 * Renders children after initialization.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @returns {import('react').ReactElement}
 */
function AppInitializer({ children }) {
  useEffect(() => {
    initializeStorage();
  }, []);

  return children;
}

AppInitializer.propTypes = {
  children: PropTypes.node.isRequired,
};

// ---------------------------------------------------------------------------
// Root App Component
// ---------------------------------------------------------------------------

/**
 * Root application component that composes all providers and the router.
 *
 * Provider order (outermost → innermost):
 * 1. ErrorBoundary — catches unhandled React errors
 * 2. AppInitializer — seeds localStorage with mock data
 * 3. AuthProvider — authentication state and RBAC
 * 4. AppProvider — global application state (theme, sidebar, selections)
 * 5. ToastProvider — toast notification system
 * 6. RouterProvider — React Router v6 browser router
 *
 * @returns {import('react').ReactElement}
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AppInitializer>
        <AuthProvider>
          <AppProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </AppProvider>
        </AuthProvider>
      </AppInitializer>
    </ErrorBoundary>
  );
}

App.propTypes = {};