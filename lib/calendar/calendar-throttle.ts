/**
 * Throttling utilities specifically for high-frequency pointer/mouse events
 * in the calendar system.
 */

export type ThrottledFn<T extends unknown[]> = ((...args: T) => void) & { cancel: () => void };

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per every 'wait' milliseconds.
 */
export function throttle<T extends unknown[]>(fn: (...args: T) => void, wait: number): ThrottledFn<T> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: T | null = null;

    const throttled = (...args: T) => {
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

    return throttled as ThrottledFn<T>;
}
