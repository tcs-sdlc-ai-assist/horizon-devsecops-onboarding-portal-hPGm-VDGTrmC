/**
 * Main application layout wrapper for Horizon DevSecOps Portal
 * Renders Sidebar on the left, Header on top, and main content area
 * with React Router Outlet. Handles responsive layout and sidebar toggle.
 * @module components/layout/MainLayout
 */

import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useApp } from '../../contexts/AppContext.jsx';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

/**
 * Main layout component that wraps all authenticated pages.
 * Provides a sidebar navigation on the left, a top header bar,
 * and a scrollable main content area rendered via React Router's Outlet.
 *
 * @returns {import('react').ReactElement}
 */
export default function MainLayout() {
  const { sidebarCollapsed } = useApp();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <Header />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Page content container */}
        <div
          className={clsx(
            'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          )}
        >
          {/* Page content */}
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-9xl px-4 py-6 lg:px-6 lg:py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

MainLayout.propTypes = {};