// Google Analytics 4 configuration
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Check if analytics should be enabled
export const isAnalyticsEnabled = () => {
    return (
        typeof window !== "undefined" &&
        GA_MEASUREMENT_ID &&
        process.env.NODE_ENV === "production"
    );
};

// Initialize Google Analytics
export const initGA = () => {
    if (!isAnalyticsEnabled()) return;

    // Load gtag.js script
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
        window.dataLayer.push(args);
    }
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID, {
        page_path: window.location.pathname,
    });
};

// Track page views
export const trackPageView = (url: string) => {
    if (!isAnalyticsEnabled()) return;

    window.gtag("config", GA_MEASUREMENT_ID!, {
        page_path: url,
    });
};

// Track custom events
export const trackEvent = ({
    action,
    category,
    label,
    value,
}: {
    action: string;
    category: string;
    label?: string;
    value?: number;
}) => {
    if (!isAnalyticsEnabled()) return;

    window.gtag("event", action, {
        event_category: category,
        event_label: label,
        value: value,
    });
};

// Extend Window interface for TypeScript
declare global {
    interface Window {
        dataLayer: unknown[];
        gtag: (...args: unknown[]) => void;
    }
}
