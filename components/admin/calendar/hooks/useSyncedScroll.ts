import { useRef, useEffect, RefObject } from 'react';

export function useSyncedScroll(masterRef: RefObject<HTMLElement | null>) {
    const slaveRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef<boolean>(false);
    // Track RAF IDs to cancel on cleanup, preventing stale callback execution
    const rafIdRef = useRef<number | null>(null);

    useEffect(() => {
        const master = masterRef.current;
        const slave = slaveRef.current;

        if (!master || !slave) return;

        const handleMasterScroll = () => {
            if (isScrolling.current) return;
            isScrolling.current = true;
            slave.scrollLeft = master.scrollLeft;
            // Cancel any pending RAF before scheduling new one
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
            rafIdRef.current = window.requestAnimationFrame(() => {
                isScrolling.current = false;
                rafIdRef.current = null;
            });
        };

        const handleSlaveScroll = () => {
            if (isScrolling.current) return;
            isScrolling.current = true;
            master.scrollLeft = slave.scrollLeft;
            // Cancel any pending RAF before scheduling new one
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
            rafIdRef.current = window.requestAnimationFrame(() => {
                isScrolling.current = false;
                rafIdRef.current = null;
            });
        };

        master.addEventListener('scroll', handleMasterScroll, { passive: true });
        slave.addEventListener('scroll', handleSlaveScroll, { passive: true });

        return () => {
            master.removeEventListener('scroll', handleMasterScroll);
            slave.removeEventListener('scroll', handleSlaveScroll);
            // Cancel pending RAF on cleanup to prevent stale callback
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            isScrolling.current = false;
        };
    }, [masterRef]); // Re-run if ref object changes (unlikely)

    return { slaveRef };
}
