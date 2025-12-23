import { useRef, useEffect, RefObject } from 'react';

export function useSyncedScroll(masterRef: RefObject<HTMLElement | null>) {
    const slaveRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef<boolean>(false);

    useEffect(() => {
        const master = masterRef.current;
        const slave = slaveRef.current;

        if (!master || !slave) return;

        const handleMasterScroll = () => {
            if (isScrolling.current) return;
            isScrolling.current = true;
            slave.scrollLeft = master.scrollLeft;
            window.requestAnimationFrame(() => {
                isScrolling.current = false;
            });
        };

        const handleSlaveScroll = () => {
            if (isScrolling.current) return;
            isScrolling.current = true;
            master.scrollLeft = slave.scrollLeft;
            window.requestAnimationFrame(() => {
                isScrolling.current = false;
            });
        };

        master.addEventListener('scroll', handleMasterScroll, { passive: true });
        slave.addEventListener('scroll', handleSlaveScroll, { passive: true });

        return () => {
            master.removeEventListener('scroll', handleMasterScroll);
            slave.removeEventListener('scroll', handleSlaveScroll);
        };
    }, [masterRef]); // Re-run if ref object changes (unlikely)

    return { slaveRef };
}
