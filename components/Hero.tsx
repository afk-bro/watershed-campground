"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import Container from "./Container";
import CTAButton from "./CTAButton";

type Props = {
  title: string | React.ReactNode;
  subtitle?: string;
  imageSrc: string;
  cta?: { label: string; href: string; subtext?: string };
  trustSignals?: string[];
  align?: "left" | "center";
};

export default function Hero({ title, subtitle, imageSrc, cta, trustSignals, align = "center" }: Props) {
  const textAlign = align === "center" ? "items-center text-center" : "items-start text-left";
  const [scrollY, setScrollY] = useState(0);
  
  // Store the MediaQueryList in a ref to avoid recreating it on every render
  const mediaQueryRef = useRef<MediaQueryList | null>(null);

  // Initialize the ref on the client
  useEffect(() => {
    if (typeof window !== "undefined" && !mediaQueryRef.current) {
      mediaQueryRef.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    }
  }, []);

  const prefersReducedMotion = useSyncExternalStore(
    (callback: () => void) => {
      if (!mediaQueryRef.current && typeof window !== "undefined") {
        mediaQueryRef.current = window.matchMedia("(prefers-reduced-motion: reduce)");
      }
      const mediaQuery = mediaQueryRef.current;
      if (mediaQuery) {
        mediaQuery.addEventListener("change", callback);
        return () => mediaQuery.removeEventListener("change", callback);
      }
      return () => {};
    },
    () => {
      if (!mediaQueryRef.current && typeof window !== "undefined") {
        mediaQueryRef.current = window.matchMedia("(prefers-reduced-motion: reduce)");
      }
      return mediaQueryRef.current ? mediaQueryRef.current.matches : false;
    },
    () => false // server snapshot
  );

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prefersReducedMotion]);

  return (
    <section className="relative h-[65vh] min-h-[440px] w-full overflow-hidden">
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: prefersReducedMotion 
            ? "none" 
            : `translateY(${scrollY * 0.2}px) scale(${1 + Math.min(scrollY, 200) / 10000})`,
          transition: 'transform 50ms linear',
        }}
      >
        <Image src={imageSrc} alt="Hero" fill priority className="object-cover" />
      </div>

      {/* Subtle Top Overlay (top → bottom third) for clean contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.18) 15%, rgba(0,0,0,0.08) 25%, rgba(0,0,0,0.00) 33%)',
        }}
      />

      {/* Angled Gradient Overlay (bottom-left → top-right) - stronger text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.45) 25%, rgba(0,0,0,0.20) 50%, rgba(0,0,0,0.00) 75%)',
        }}
      />

      {/* Radial Gradient (main contrast engine) - centered on text */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 45% 30% at 50% 45%, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.12) 70%, rgba(0,0,0,0.00) 100%)',
        }}
      />

      <div className="absolute inset-0 flex">
        <Container>
          <div className={`flex h-full ${textAlign} justify-center`}>
            <div className="relative max-w-xl z-10">
                <h1 className="font-heading text-4xl sm:text-5xl md:text-5xl lg:text-6xl text-accent-gold leading-[0.95] tracking-wide" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.75), 0 4px 8px rgba(0,0,0,0.45)' }}>{title}</h1>
                {/* Premium gold accent line (softened and shortened) */}
                <div className={`mt-1.5 mb-1 h-[1.5px] w-20 sm:w-24 bg-gradient-to-r from-accent-gold/60 via-accent-gold/50 to-transparent ${align === "center" ? "mx-auto" : ""}`} />
              {subtitle && (
                <p
                    className="mt-1 mb-6 text-[17px] sm:text-[21px] text-accent-beige leading-relaxed font-medium tracking-[0.5px]"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.75), 0 4px 8px rgba(0,0,0,0.45)' }}
                >
                  {subtitle}
                </p>
              )}
                {cta && (
                  <div className="mt-10">
                    <CTAButton label={cta.label} href={cta.href} />
                    {cta.subtext && (
                      <p className="mt-3 text-sm text-accent-beige/80 tracking-wide" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                        {cta.subtext}
                      </p>
                    )}
                  </div>
                )}
                {trustSignals && trustSignals.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 justify-center text-accent-beige text-sm">
                    {trustSignals.map((signal, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-accent-gold flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)' }}>{signal}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </Container>
      </div>

      <button
        onClick={() => {
          window.scrollTo({
            top: window.innerHeight * 0.65, // Matches the 65vh height
            behavior: "smooth",
          });
        }}
        className="absolute bottom-3 left-0 right-0 flex justify-center z-20 cursor-pointer hover:text-accent-gold transition-colors duration-300 pb-4 pt-2"
        aria-label="Scroll to content"
      >
        <span className="text-accent-gold/85 text-xl sm:text-2xl select-none animate-bounce-slow">↓</span>
      </button>

      {/* Soft fade at bottom into page background (brand forest) */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 sm:h-28 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.25) 45%, var(--color-brand-forest) 100%)',
        }}
      />
    </section>
  );
}
