/**
 * Throttling utilities specifically for high-frequency pointer/mouse events
 * in the calendar system.
 */

export type ThrottledFn = ((...args: any[]) => void) & { cancel: () => void };

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per every 'wait' milliseconds.
 */
export function throttle(fn: (...args: any[]) => void, wait: number): ThrottledFn {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: any[] | null = null;

    const throttled = (...args: any[]) => {
        lastArgs = args;

        if (!timeout) {
            timeout = setTimeout(() => {
                if (lastArgs) {
                    fn(...lastArgs);
                }
                timeout = null;
                lastArgs = null;
            }, wait);
        }
    };

    throttled.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = null;
        lastArgs = null;
    };

    return throttled as ThrottledFn;
}
