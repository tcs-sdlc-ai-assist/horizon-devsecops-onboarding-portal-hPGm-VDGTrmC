/**
 * 404 Not Found page for Horizon DevSecOps Portal
 * Displays Horizon branding, a friendly error message, and a link
 * back to the dashboard.
 * @module pages/NotFoundPage
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button.jsx';

/**
 * 404 Not Found page component with Horizon branding, descriptive message,
 * and navigation back to the dashboard.
 *
 * @returns {import('react').ReactElement}
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  const handleGoHome = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-12 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-md text-center">
        {/* Horizon Logo */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-horizon-600 shadow-soft">
          <span className="text-xl font-bold text-white">H</span>
        </div>

        {/* 404 Indicator */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
          <span className="text-4xl font-bold text-surface-400 dark:text-surface-500">404</span>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-surface-900 dark:text-surface-100">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="mb-2 text-sm text-surface-500 dark:text-surface-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <p className="mb-8 text-xs text-surface-400 dark:text-surface-500">
          Please check the URL or navigate back to the dashboard.
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="primary"
            size="md"
            icon={Home}
            onClick={handleGoHome}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={ArrowLeft}
            onClick={handleGoBack}
          >
            Go Back
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-10">
          <p className="text-xs text-surface-400 dark:text-surface-500">
            Horizon DevSecOps Portal
          </p>
        </div>
      </div>
    </div>
  );
}

NotFoundPage.propTypes = {};