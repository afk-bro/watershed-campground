"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Container from "./Container";
import CTAButton from "./CTAButton";

type Props = {
  title: string;
  subtitle?: string;
  imageSrc: string;
  cta?: { label: string; href: string };
  align?: "left" | "center";
};

export default function Hero({ title, subtitle, imageSrc, cta, align = "center" }: Props) {
  const textAlign = align === "center" ? "items-center text-center" : "items-start text-left";
  const [scrollY, setScrollY] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

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
                <div className="mt-2 mb-1 h-[2px] w-20 sm:w-24 bg-gradient-to-r from-accent-gold/60 via-accent-gold/50 to-transparent" />
              {subtitle && (
                <p
                    className="mt-1 mb-6 text-[17px] sm:text-[21px] text-accent-beige leading-relaxed font-medium tracking-[0.5px]"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.75), 0 4px 8px rgba(0,0,0,0.45)' }}
                >
                  {subtitle}
                </p>
              )}
                {cta && <div className="mt-10"><CTAButton label={cta.label} href={cta.href} /></div>}
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
