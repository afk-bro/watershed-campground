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

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
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
              {subtitle && (
                <p
                  className="mt-2 text-[17px] sm:text-[21px] text-accent-beige leading-relaxed font-medium tracking-[0.5px]"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.75), 0 4px 8px rgba(0,0,0,0.45)' }}
                >
                  {subtitle}
                </p>
              )}
              {cta && <div className="mt-8"><CTAButton label={cta.label} href={cta.href} /></div>}
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}
