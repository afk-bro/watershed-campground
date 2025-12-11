import Link from "next/link";
import Container from "../components/Container";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center py-20">
      <Container size="md">
        <div className="text-center space-y-8">
          {/* 404 Number */}
          <div className="relative">
            <h1 className="font-heading text-[120px] sm:text-[180px] md:text-[220px] text-accent-gold/20 leading-none select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-accent-gold text-2xl sm:text-3xl font-heading tracking-wide">
                Page Not Found
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-4 max-w-md mx-auto">
            <p className="text-accent-beige/90 text-lg leading-relaxed">
              Looks like you&apos;ve wandered off the trail. The page you&apos;re looking for doesn&apos;t exist.
            </p>
            <p className="text-accent-beige/70 text-base">
              Let&apos;s get you back to familiar territory.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/"
              className="inline-flex items-center bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-3 px-8 rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              ← Back to Home
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center border-2 border-accent-gold/40 hover:border-accent-gold text-accent-gold font-medium py-3 px-8 rounded-lg transition-all duration-300 hover:bg-accent-gold/10"
            >
              Contact Us
            </Link>
          </div>

          {/* Quick Links */}
          <div className="pt-8 border-t border-accent-gold/20 max-w-md mx-auto">
            <p className="text-accent-beige/60 text-sm mb-4">Popular pages:</p>
            <div className="flex flex-wrap gap-3 justify-center text-sm">
              <Link href="/rates" className="text-accent-gold/80 hover:text-accent-gold transition-colors">
                Rates
              </Link>
              <span className="text-accent-gold/20">•</span>
              <Link href="/gallery" className="text-accent-gold/80 hover:text-accent-gold transition-colors">
                Gallery
              </Link>
              <span className="text-accent-gold/20">•</span>
              <Link href="/amenities" className="text-accent-gold/80 hover:text-accent-gold transition-colors">
                Amenities
              </Link>
              <span className="text-accent-gold/20">•</span>
              <Link href="/make-a-reservation" className="text-accent-gold/80 hover:text-accent-gold transition-colors">
                Reservations
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
