"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useViewportMode, ViewportModeState } from '@/lib/hooks/useViewportMode';

/**
 * Context for sharing viewport mode state across the application
 */
const ViewportModeContext = createContext<ViewportModeState | undefined>(undefined);

/**
 * Provider component that makes viewport mode available to all children
 *
 * Place this high in your component tree (typically in the root layout)
 * so all components can access viewport mode without re-detecting.
 *
 * @example
 * ```tsx
 * <ViewportModeProvider>
 *   <YourApp />
 * </ViewportModeProvider>
 * ```
 */
export function ViewportModeProvider({ children }: { children: ReactNode }) {
  const viewportMode = useViewportMode();

  return (
    <ViewportModeContext.Provider value={viewportMode}>
      {children}
    </ViewportModeContext.Provider>
  );
}

/**
 * Hook to access viewport mode from context
 *
 * Must be used within a ViewportModeProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mode, isPhone, isTouchDevice } = useViewportModeContext();
 *
 *   if (isPhone) {
 *     return <MobileLayout />;
 *   }
 *
 *   return <DesktopLayout />;
 * }
 * ```
 */
export function useViewportModeContext(): ViewportModeState {
  const context = useContext(ViewportModeContext);

  if (context === undefined) {
    throw new Error('useViewportModeContext must be used within a ViewportModeProvider');
  }

  return context;
}
