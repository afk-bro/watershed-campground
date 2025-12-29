"use client";

import React, { Component, ReactNode } from "react";
import { logger } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Allow resetting the error boundary without a full page reload */
  resetKeys?: Array<string | number | undefined>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  prevResetKeys?: Array<string | number | undefined>;
}

/**
 * Error Boundary component to catch and handle React errors gracefully.
 *
 * Prevents the entire app from crashing when a component throws an error.
 * Displays a fallback UI and logs the error for debugging.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example With reset support
 * ```tsx
 * <ErrorBoundary resetKeys={[userId, selectedTab]}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, prevResetKeys: props.resetKeys };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    // Reset error state if resetKeys have changed
    if (state.hasError && props.resetKeys) {
      const prevKeys = state.prevResetKeys || [];
      const currentKeys = props.resetKeys;

      if (
        prevKeys.length !== currentKeys.length ||
        prevKeys.some((key, i) => key !== currentKeys[i])
      ) {
        return {
          hasError: false,
          error: null,
          prevResetKeys: currentKeys,
        };
      }
    }

    // Update prevResetKeys when they change but no error
    if (!state.hasError) {
      const prevKeys = state.prevResetKeys || [];
      const currentKeys = props.resetKeys || [];

      if (
        prevKeys.length !== currentKeys.length ||
        prevKeys.some((key, i) => key !== currentKeys[i])
      ) {
        return { prevResetKeys: props.resetKeys };
      }
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error("React Error Boundary caught error", error, {
      componentStack: errorInfo.componentStack,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, prevResetKeys: this.props.resetKeys });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component shown when an error occurs
 */
function DefaultErrorFallback({ error, onReset }: { error: Error | null; onReset?: () => void }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Something went wrong
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-200">
              An error occurred while displaying this content. {onReset ? 'Try again or refresh the page.' : 'Please try refreshing the page.'}
            </p>
            {process.env.NODE_ENV === "development" && error && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-red-600 dark:text-red-300 font-medium">
                  Error details (development only)
                </summary>
                <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/40 rounded overflow-auto text-red-900 dark:text-red-100">
                  {error.message}
                  {"\n\n"}
                  {error.stack}
                </pre>
              </details>
            )}
            <div className="mt-4 flex gap-2">
              {onReset && (
                <button
                  onClick={onReset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact error fallback for smaller sections
 */
export function CompactErrorFallback({ message }: { message?: string }) {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p className="text-sm text-red-700 dark:text-red-200">
        {message || "Failed to load this section"}
      </p>
    </div>
  );
}
