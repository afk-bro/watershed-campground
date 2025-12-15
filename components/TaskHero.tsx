"use client";

import Container from "./Container";

type Props = {
  title: string;
  subtitle?: string;
  currentStep?: number;
  totalSteps?: number;
  stepLabels?: string[];
};

export default function TaskHero({
  title,
  subtitle,
  currentStep,
  totalSteps,
  stepLabels
}: Props) {
  return (
    <section className="relative w-full overflow-hidden" style={{ height: '32vh', minHeight: '240px' }}>
      {/* Organic gradient background - forest to deeper forest with gold warmth */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(165deg,
              #083a2c 0%,
              #06251c 45%,
              #042018 100%
            )
          `
        }}
      />

      {/* Subtle noise texture for organic feel */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay'
        }}
      />

      {/* Radial accent for depth */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 30% 40%, rgba(200, 167, 90, 0.15) 0%, transparent 70%)'
        }}
      />

      <div className="absolute inset-0 flex items-center">
        <Container>
          <div className="flex flex-col justify-center h-full">
            {/* Progress indicator - visible immediately */}
            {currentStep && totalSteps && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className="flex items-center">
                      <div
                        className={`
                          h-1.5 rounded-full transition-all duration-500
                          ${i < currentStep
                            ? 'w-12 bg-accent-gold'
                            : i === currentStep - 1
                            ? 'w-16 bg-accent-gold shadow-[0_0_8px_rgba(200,167,90,0.6)]'
                            : 'w-12 bg-accent-gold/20'
                          }
                        `}
                      />
                      {i < totalSteps - 1 && (
                        <div className="w-2 h-[1px] bg-accent-gold/20" />
                      )}
                    </div>
                  ))}
                </div>
                {stepLabels && stepLabels[currentStep - 1] && (
                  <p className="text-xs font-medium text-accent-gold/80 tracking-wide uppercase">
                    Step {currentStep} of {totalSteps}: {stepLabels[currentStep - 1]}
                  </p>
                )}
              </div>
            )}

            {/* Compact, focused title */}
            <h1
              className="font-heading text-3xl sm:text-4xl md:text-5xl text-accent-gold leading-tight tracking-wide max-w-2xl"
              style={{
                textShadow: '0 2px 12px rgba(0,0,0,0.4)'
              }}
            >
              {title}
            </h1>

            {/* Subtle accent line */}
            <div className="mt-3 h-[1.5px] w-16 bg-gradient-to-r from-accent-gold/70 via-accent-gold/40 to-transparent rounded-full" />

            {subtitle && (
              <p
                className="mt-3 text-base sm:text-lg text-accent-beige/90 leading-relaxed max-w-xl font-light tracking-wide"
                style={{
                  textShadow: '0 1px 8px rgba(0,0,0,0.3)'
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </Container>
      </div>

      {/* Soft bottom fade into page content */}
      <div
        className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, var(--color-brand-forest) 100%)'
        }}
      />
    </section>
  );
}
