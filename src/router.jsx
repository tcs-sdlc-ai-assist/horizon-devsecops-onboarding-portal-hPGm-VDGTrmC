/**
 * Application routing configuration for Horizon DevSecOps Portal
 * Defines all routes with React Router v6, protected routes with RBAC,
 * and layout wrappers.
 * @module router
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import PipelinePage from './pages/PipelinePage.jsx';
import IntegrationsPage from './pages/IntegrationsPage.jsx';
import CompliancePage from './pages/CompliancePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { ROLES } from './constants/constants.js';

/**
 * Application router configuration.
 * @type {import('react-router-dom').Router}
 */
const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Authenticated routes wrapped in MainLayout
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          // Dashboard
          {
            path: '/',
            element: <DashboardPage />,
          },
          {
            path: '/dashboard',
            element: <Navigate to="/" replace />,
          },

          // Onboarding
          {
            path: '/onboarding',
            element: <OnboardingPage />,
          },
          {
            path: '/onboarding/new',
            element: <OnboardingPage />,
          },
          {
            path: '/onboarding/list',
            element: <OnboardingPage />,
          },
          {
            path: '/onboarding/import',
            element: <OnboardingPage />,
          },

          // Pipelines
          {
            path: '/pipelines',
            element: <PipelinePage />,
          },
          {
            path: '/pipelines/runs',
            element: <PipelinePage />,
          },
          {
            path: '/pipelines/generate',
            element: <PipelinePage />,
          },

          // Integrations
          {
            path: '/integrations',
            element: <IntegrationsPage />,
          },
          {
            path: '/integrations/catalog',
            element: <IntegrationsPage />,
          },
          {
            path: '/integrations/configured',
            element: <IntegrationsPage />,
          },

          // Observability (reuses integrations/dashboard pages)
          {
            path: '/observability',
            element: <DashboardPage />,
          },
          {
            path: '/observability/melt',
            element: <DashboardPage />,
          },
          {
            path: '/observability/incidents',
            element: <DashboardPage />,
          },
          {
            path: '/observability/events',
            element: <IntegrationsPage />,
          },

          // Compliance
          {
            path: '/compliance',
            element: <CompliancePage />,
          },
          {
            path: '/compliance/artifacts',
            element: <CompliancePage />,
          },
          {
            path: '/compliance/governance',
            element: <CompliancePage />,
          },
          {
            path: '/compliance/audit',
            element: <CompliancePage />,
          },

          // Admin (restricted to Admin role)
          {
            element: <ProtectedRoute requiredRoles={[ROLES.ADMIN]} />,
            children: [
              {
                path: '/admin',
                element: <AdminPage />,
              },
              {
                path: '/admin/users',
                element: <AdminPage />,
              },
              {
                path: '/admin/settings',
                element: <AdminPage />,
              },
            ],
          },
        ],
      },
    ],
  },

  // 404 catch-all
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;