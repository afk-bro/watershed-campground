"use client";

import Image from "next/image";
import Container from "./Container";
import FadeInSection from "./FadeInSection";

export default function OurStory() {
  return (
    <section className="pt-16 pb-20 bg-brand-forest">
      <Container size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-x-16 gap-y-8 items-start px-4 lg:px-2">
          {/* Left Column - Text Content (60%) */}
          <div className="space-y-10 max-w-4xl">
            {/* Main Header */}
            <FadeInSection>
              <div>
                <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-accent-gold-dark leading-[0.95] tracking-wide mb-4">
                  Our Story
                </h2>
                <div className="w-32 h-px bg-gradient-to-r from-accent-gold/60 to-transparent" />
              </div>
            </FadeInSection>

            {/* A Family Legacy */}
            <FadeInSection delay={50}>
              <div id="family-legacy" className="space-y-5 text-accent-beige/95 text-lg sm:text-xl leading-[1.8]">
              <h3 className="text-accent-gold/80 font-heading text-xl sm:text-2xl mb-3 tracking-wide">A Family Legacy</h3>
              <p>
                Welcome to <span className="text-accent-gold-muted font-medium">The Watershed</span>, a cherished family property that began its journey in <span className="text-accent-gold-muted">1993</span>.
                Originally envisioned by our parents as a vacation rental, life took us in a different
                direction, shifting our focus from business to family. Now, <em className="text-accent-gold-muted not-italic">three decades later</em>, we are
                excited to revive their dream and continue their legacy.
              </p>
              <p>
                With a commitment to transforming this beautiful, once-overgrown land into a <span className="text-accent-gold-muted">meticulously
                landscaped retreat</span>, we invite you to join us in creating lasting memories for you and your
                family, just like us.
              </p>
              </div>
            </FadeInSection>

            {/* A Place to Explore */}
            <FadeInSection delay={100}>
              <div className="space-y-5 text-accent-beige/95 text-lg sm:text-xl leading-[1.8]">
              <h3 className="text-accent-gold/80 font-heading text-xl sm:text-2xl mb-3 tracking-wide">A Place to Explore</h3>
              <p>
                Located in <span className="text-accent-gold-muted font-medium">Balfour, BC</span>, along the shores of <span className="text-accent-gold-muted font-medium">Kootenay Lake</span>, with a beautiful beach, it&apos;s
                the perfect spot for <span className="text-accent-gold-muted">fishing</span>, <span className="text-accent-gold-muted">swimming</span>, and <span className="text-accent-gold-muted">boating</span> adventures. Immerse yourself in nature
                as you encounter a variety of <em className="text-accent-gold-muted not-italic">wildlife</em>, including trout, deer, eagles, beavers, ducks, and
                otters. All great things come to meet at the Watershed!
              </p>
              </div>
            </FadeInSection>

            {/* The Heart of Kootenay Lake */}
            <FadeInSection delay={150}>
              <div className="space-y-5 text-accent-beige/95 text-lg sm:text-xl leading-[1.8]">
              <h3 className="text-accent-gold/80 font-heading text-xl sm:text-2xl mb-3 tracking-wide">The Heart of Kootenay Lake</h3>
              <p>
                <span className="text-accent-gold-muted font-medium">Kootenay Lake</span>, the largest natural lake in southern <span className="text-accent-gold-muted font-medium">British Columbia</span>, is divided into four
                distinct sections: <span className="text-accent-gold-muted">North End, West, Main Lake, and South End</span>. This beautiful body of water
                is an integral part of a <em className="text-accent-gold-muted not-italic">watershed</em> that crosses the international U.S. border, showcasing
                the region&apos;s stunning natural beauty and ecological significance.
              </p>
              <p className="text-accent-gold-muted font-medium text-lg">
                Whether you&apos;re exploring its serene shores or enjoying recreational activities, Kootenay
                Lake offers something for everyone. Come and experience the charm and tranquility of this
                breathtaking destination.
              </p>
              </div>
            </FadeInSection>
          </div>

          {/* Right Column - Image (40%) - Aligned with "A Family Legacy" heading */}
          <FadeInSection delay={200}>
            <div className="relative h-[250px] sm:h-[350px] md:h-[450px] lg:h-[600px] rounded-lg overflow-hidden border border-accent-gold/20 shadow-2xl hover:shadow-[0_25px_50px_-12px_rgba(200,167,90,0.4)] transition-shadow duration-500 will-change-shadow lg:sticky lg:top-24 lg:mt-[140px]">
            <Image
              src="/gallery/landing_page.avif"
              alt="The Watershed Campground on Kootenay Lake"
              fill
              className="object-cover"
              priority
            />
            </div>
          </FadeInSection>
        </div>
      </Container>
    </section>
  );
}
