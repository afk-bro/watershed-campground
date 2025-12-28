import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CalendarInteractionProvider, useCalendarInteraction, type CalendarInteractionContextValue } from '@/components/admin/calendar/CalendarInteractionContext';

describe('CalendarInteractionContext', () => {
  describe('Contract Tests', () => {
    it('throws error when useCalendarInteraction is used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      const TestComponent = () => {
        useCalendarInteraction();
        return null;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useCalendarInteraction must be used within CalendarInteractionProvider');

      console.error = originalError;
    });

    it('provides context value to children', () => {
      const mockValue: CalendarInteractionContextValue = {
        // Calendar config
        days: [new Date('2025-01-01')],
        monthStart: new Date('2025-01-01'),
        monthEnd: new Date('2025-01-31'),
        totalDays: 31,
        // Creation state
        isCreating: false,
        selectionCampsiteId: null,
        selectionStart: null,
        selectionEnd: null,
        // Drag state
        isDragging: false,
        dragPreview: null,
        draggedItemId: null,
        resizeStateItemId: null,
        // UI state
        showAvailability: false,
        validationError: null,
        // Handlers
        onCellPointerDown: () => {},
        onCellPointerEnter: () => {},
        onReservationClick: () => {},
        onBlackoutClick: () => {},
        onDragStart: () => {},
        onResizeStart: () => {},
        getGhost: () => null,
      };

      const TestComponent = ({ onValue }: { onValue: (val: CalendarInteractionContextValue) => void }) => {
        const ctx = useCalendarInteraction();
        onValue(ctx);
        return null;
      };

      let receivedValue: CalendarInteractionContextValue | undefined;

      render(
        <CalendarInteractionProvider value={mockValue}>
          <TestComponent onValue={(val) => { receivedValue = val; }} />
        </CalendarInteractionProvider>
      );

      expect(receivedValue).toEqual(mockValue);
    });

    it('provides stable handler references when memoized', () => {
      const onCellPointerDown: CalendarInteractionContextValue['onCellPointerDown'] = () => {};
      const getGhost: CalendarInteractionContextValue['getGhost'] = () => null;

      const mockValue: CalendarInteractionContextValue = {
        days: [new Date()],
        monthStart: new Date(),
        monthEnd: new Date(),
        totalDays: 31,
        isCreating: false,
        selectionCampsiteId: null,
        selectionStart: null,
        selectionEnd: null,
        isDragging: false,
        dragPreview: null,
        draggedItemId: null,
        resizeStateItemId: null,
        showAvailability: false,
        validationError: null,
        onCellPointerDown,
        onCellPointerEnter: () => {},
        onReservationClick: () => {},
        onBlackoutClick: () => {},
        onDragStart: () => {},
        onResizeStart: () => {},
        getGhost,
      };

      const handlers: Array<{
        onCellPointerDown: CalendarInteractionContextValue['onCellPointerDown'];
        getGhost: CalendarInteractionContextValue['getGhost'];
      }> = [];

      const TestComponent = () => {
        const ctx = useCalendarInteraction();
        handlers.push({
          onCellPointerDown: ctx.onCellPointerDown,
          getGhost: ctx.getGhost,
        });
        return null;
      };

      const { rerender } = render(
        <CalendarInteractionProvider value={mockValue}>
          <TestComponent />
        </CalendarInteractionProvider>
      );

      // Trigger a re-render with the same value object
      rerender(
        <CalendarInteractionProvider value={mockValue}>
          <TestComponent />
        </CalendarInteractionProvider>
      );

      // Handlers should be the same reference across renders
      expect(handlers[0].onCellPointerDown).toBe(handlers[1].onCellPointerDown);
      expect(handlers[0].getGhost).toBe(handlers[1].getGhost);
    });

    it('updates state when interaction state changes', () => {
      const initialValue: CalendarInteractionContextValue = {
        days: [new Date()],
        monthStart: new Date(),
        monthEnd: new Date(),
        totalDays: 31,
        isCreating: false,
        selectionCampsiteId: null,
        selectionStart: null,
        selectionEnd: null,
        isDragging: false,
        dragPreview: null,
        draggedItemId: null,
        resizeStateItemId: null,
        showAvailability: false,
        validationError: null,
        onCellPointerDown: () => {},
        onCellPointerEnter: () => {},
        onReservationClick: () => {},
        onBlackoutClick: () => {},
        onDragStart: () => {},
        onResizeStart: () => {},
        getGhost: () => null,
      };

      const updatedValue: CalendarInteractionContextValue = {
        ...initialValue,
        isCreating: true,
        selectionCampsiteId: 'campsite-1',
      };

      const snapshots: Array<{ isCreating: boolean; selectionCampsiteId: string | null }> = [];

      const TestComponent = () => {
        const ctx = useCalendarInteraction();
        snapshots.push({
          isCreating: ctx.isCreating,
          selectionCampsiteId: ctx.selectionCampsiteId ?? null,
        });
        return null;
      };

      const { rerender } = render(
        <CalendarInteractionProvider value={initialValue}>
          <TestComponent />
        </CalendarInteractionProvider>
      );

      expect(snapshots[0].isCreating).toBe(false);
      expect(snapshots[0].selectionCampsiteId).toBe(null);

      rerender(
        <CalendarInteractionProvider value={updatedValue}>
          <TestComponent />
        </CalendarInteractionProvider>
      );

      expect(snapshots[1].isCreating).toBe(true);
      expect(snapshots[1].selectionCampsiteId).toBe('campsite-1');
    });
  });

  describe('Architectural Boundaries', () => {
    it('context only contains ephemeral UI state and handlers', () => {
      const mockValue: CalendarInteractionContextValue = {
        days: [],
        monthStart: new Date(),
        monthEnd: new Date(),
        totalDays: 0,
        isCreating: false,
        selectionCampsiteId: null,
        selectionStart: null,
        selectionEnd: null,
        isDragging: false,
        dragPreview: null,
        draggedItemId: null,
        resizeStateItemId: null,
        showAvailability: false,
        validationError: null,
        onCellPointerDown: () => {},
        onCellPointerEnter: () => {},
        onReservationClick: () => {},
        onBlackoutClick: () => {},
        onDragStart: () => {},
        onResizeStart: () => {},
        getGhost: () => null,
      };

      let receivedContext: CalendarInteractionContextValue | undefined;

      const TestComponent = ({ onValue }: { onValue: (val: CalendarInteractionContextValue) => void }) => {
        const ctx = useCalendarInteraction();
        onValue(ctx);
        return null;
      };

      render(
        <CalendarInteractionProvider value={mockValue}>
          <TestComponent onValue={(val) => { receivedContext = val; }} />
        </CalendarInteractionProvider>
      );

      // Verify no data fetching or persistence methods
      expect(receivedContext).not.toHaveProperty('fetchReservations');
      expect(receivedContext).not.toHaveProperty('saveReservation');
      expect(receivedContext).not.toHaveProperty('updateReservation');
      expect(receivedContext).not.toHaveProperty('deleteReservation');

      // Verify no global app state
      expect(receivedContext).not.toHaveProperty('filters');
      expect(receivedContext).not.toHaveProperty('searchQuery');
      expect(receivedContext).not.toHaveProperty('urlParams');
    });
  });
});
