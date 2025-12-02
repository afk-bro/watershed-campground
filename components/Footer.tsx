import Image from "next/image";
import Link from "next/link";
import Container from "./Container";
import { navLinks } from "../lib/navLinks";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[#051c15] border-t border-accent-gold/30 relative">
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/10 via-black/5 to-transparent pointer-events-none" />

      <Container size="xl">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 pt-16 pb-10 relative z-10">
          {/* Column 1: Brand, Description & Social */}
          <div className="lg:col-span-4 flex flex-col gap-5 lg:pr-12">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-accent-gold/40 shadow-md shadow-black/20 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0E4A39' }}>
                <Image
                  src="/gallery/nav-logo.png"
                  alt="Watershed Logo"
                  width={56}
                  height={56}
                  className="object-contain w-full h-full"
                  style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(35%) saturate(450%) hue-rotate(5deg) brightness(100%)' }}
                />
              </div>
              <h3 className="font-heading text-[24px] text-accent-gold-dark tracking-wide">
                The Watershed
              </h3>
            </div>
            <p className="text-accent-beige/95 text-[15px] leading-loose">
              Lakeside camping on Kootenay Lake. A family-owned campground since 1993.
            </p>

            {/* Social Icons */}
            <div className="mt-4">
              <h4 className="font-heading text-base text-accent-gold/90 mb-3 tracking-wide">Follow Us</h4>
              <div className="flex gap-4">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-forest/40 border border-accent-gold/20 text-accent-gold/70 hover:bg-accent-gold/10 hover:border-accent-gold/40 hover:text-accent-gold hover:scale-[1.02] hover:shadow-[0_0_10px_rgba(200,167,90,0.3)] transition-all duration-300"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-forest/40 border border-accent-gold/20 text-accent-gold/70 hover:bg-accent-gold/10 hover:border-accent-gold/40 hover:text-accent-gold hover:scale-[1.02] hover:shadow-[0_0_10px_rgba(200,167,90,0.3)] transition-all duration-300"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links - Two Columns */}
          <div className="lg:col-span-4 lg:px-12 lg:border-l lg:border-accent-gold/20">
            <h4 className="font-heading text-base text-accent-gold/90 mb-4 tracking-wide text-center">Quick Links</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 justify-items-center">
              <Link href="/" className="text-accent-beige/90 text-sm hover:text-accent-gold transition-colors text-center tracking-wide">Home</Link>
              <Link href="/rates" className="text-accent-beige/90 text-sm hover:text-accent-gold transition-colors text-center tracking-wide">Rates</Link>
              <Link href="/make-a-reservation" className="text-accent-beige/90 text-sm hover:text-accent-gold transition-colors text-center tracking-wide">Make a Reservation</Link>
              <Link href="/amenities" className="text-accent-beige/90 text-sm hover:text-accent-gold transition-colors text-center tracking-wide">Amenities</Link>
              <Link href="/gallery" className="text-accent-beige/90 text-sm hover:text-accent-gold transition-colors text-center tracking-wide">Gallery</Link>
              <Link href="/things-to-do" className="text-accent-beige/90 text-sm hover:text-accent-gold transition-colors text-center tracking-wide">Things to Do</Link>
              <Link href="/contact" className="text-accent-beige/90 text-sm hover:text-accent-gold transition-colors text-center tracking-wide">Contact</Link>
            </div>
          </div>

          {/* Column 3: Contact Info */}
          <div className="lg:col-span-4 lg:pl-12 lg:border-l lg:border-accent-gold/20">
            <h4 className="font-heading text-base text-accent-gold/90 mb-4 tracking-wide">Contact</h4>
            <div className="space-y-6 text-sm text-accent-beige/90">
              {/* Phone */}
              <div className="flex items-center gap-3.5">
                <svg className="w-3.5 h-3.5 text-accent-gold/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+12508786101" className="hover:text-accent-gold transition-colors">
                  250-878-6101
                </a>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3.5">
                <svg className="w-3.5 h-3.5 text-accent-gold/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:info@thewatershedcampground.com" className="hover:text-accent-gold transition-colors break-all">
                  info@thewatershedcampground.com
                </a>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3.5">
                <svg className="w-3.5 h-3.5 text-accent-gold/60 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <address className="not-italic leading-relaxed">
                  7042 Lee Road<br />
                  Balfour, BC V1L 6R9
                </address>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Legal */}
        <div className="border-t border-accent-gold/25 pt-11 pb-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[14px] text-accent-beige/75 tracking-wide">
            <p>&copy; {currentYear} The Watershed Campground. All rights reserved.</p>
            <nav className="flex items-center gap-4">
              <Link href="/contact" className="hover:text-accent-gold transition-colors duration-200">
                Privacy Policy
              </Link>
              <span className="text-accent-gold/20">·</span>
              <Link href="/rates" className="hover:text-accent-gold transition-colors duration-200">
                Terms & Conditions
              </Link>
            </nav>
          </div>
        </div>
      </Container>
    </footer>
  );
}
