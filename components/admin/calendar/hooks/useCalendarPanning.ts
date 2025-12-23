import { useRef, useEffect, useCallback, RefObject } from 'react';

interface UseCalendarPanningProps {
    scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function useCalendarPanning({ scrollContainerRef }: UseCalendarPanningProps) {
    // Refs for state
    const isPanning = useRef(false);
    const startX = useRef(0);
    const startScrollLeft = useRef(0);

    // Space+Drag State
    const isSpacePressed = useRef(false);
    const isHovered = useRef(false);

    // Helper to toggle cursor class on container
    const updateCursor = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // If panning, always grabbing
        if (isPanning.current) {
            container.classList.add('cursor-grabbing');
            container.classList.remove('cursor-grab');
            return;
        }

        // If space is held and hovered, show grab
        if (isSpacePressed.current && isHovered.current) {
            container.classList.add('cursor-grab');
            container.classList.remove('cursor-grabbing');
        } else {
            container.classList.remove('cursor-grab', 'cursor-grabbing');
        }
    }, [scrollContainerRef]);

    // 1. Mouse/Keyboard Listeners for Space Mode
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleMouseEnter = () => { isHovered.current = true; updateCursor(); };
        const handleMouseLeave = () => { isHovered.current = false; updateCursor(); };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                // Key logic: Only hijack if hovered
                if (isHovered.current) {
                    e.preventDefault(); // Prevent page scroll
                    if (!isSpacePressed.current) {
                        isSpacePressed.current = true;
                        updateCursor();
                    }
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                isSpacePressed.current = false;
                updateCursor();
            }
        };

        container.addEventListener('mouseenter', handleMouseEnter);
        container.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            container.removeEventListener('mouseenter', handleMouseEnter);
            container.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [scrollContainerRef, updateCursor]);


    // 2. Shared Panning Logic
    const startPan = useCallback((e: React.PointerEvent, target: HTMLElement) => {
        isPanning.current = true;
        startX.current = e.clientX;

        if (scrollContainerRef.current) {
            startScrollLeft.current = scrollContainerRef.current.scrollLeft;
            target.setPointerCapture(e.pointerId);
            updateCursor();
        }
    }, [scrollContainerRef, updateCursor]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isPanning.current || !scrollContainerRef.current) return;

        e.preventDefault();
        const dx = e.clientX - startX.current;
        scrollContainerRef.current.scrollLeft = startScrollLeft.current - dx;
    }, [scrollContainerRef]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (isPanning.current) {
            isPanning.current = false;
            updateCursor();
            try {
                if (e.target instanceof Element) {
                    (e.target as Element).releasePointerCapture(e.pointerId);
                }
            } catch (err) {
                // Ignore capture errors
            }
        }
    }, [updateCursor]);


    // 3. Grid Container Handler (Space + Drag)
    const onContainerPointerDown = useCallback((e: React.PointerEvent) => {
        // Only trigger if Space is pressed AND Left Click
        if (!isSpacePressed.current || e.button !== 0) return;

        const target = e.target as HTMLElement;
        // Allow interacting with scrollbars or inputs even if space is held? 
        // Usually space+drag overrides text selection but maybe not inputs.
        // Let's protect inputs just in case.
        if (target.closest("input,textarea,button,a")) return;

        e.preventDefault();
        e.stopPropagation(); // Stop grid selection/drag logic

        startPan(e, e.currentTarget as HTMLElement);
    }, [startPan]);


    // 4. Header Handler (Always Pan)
    const onHeaderPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest("button,a,input,textarea,[data-no-pan]")) return;

        e.preventDefault();
        e.stopPropagation();

        startPan(e, e.currentTarget as HTMLElement);
    }, [startPan]);


    // 5. Shift + Wheel
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            if (e.shiftKey) {
                e.preventDefault();
                const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
                container.scrollLeft += delta;
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [scrollContainerRef]);

    return {
        headerProps: {
            onPointerDown: onHeaderPointerDown,
            onPointerMove: onPointerMove,
            onPointerUp: onPointerUp,
            onPointerCancel: onPointerUp,
            className: "select-none cursor-grab active:cursor-grabbing" // Default helper for header
        },
        containerProps: {
            onPointerDownCapture: onContainerPointerDown, // Use capture to intercept before cell selection
            onPointerMove: onPointerMove,
            onPointerUp: onPointerUp,
            onPointerCancel: onPointerUp,
        }
    };
}
