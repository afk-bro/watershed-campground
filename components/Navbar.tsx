"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { NavLink } from "../lib/navLinks";

type Props = { links: NavLink[] };

export default function Navbar({ links }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Separate regular links from reservation link
  const regularLinks = links.filter(l => l.href !== "/make-a-reservation");
  const reservationLink = links.find(l => l.href === "/make-a-reservation");

  return (
    <header className={`sticky top-0 z-40 backdrop-blur transition-all duration-300 ${
      isScrolled
        ? "bg-navbar-forest/95 shadow-lg border-b border-accent-beige/30"
        : "bg-navbar-forest/80 border-b border-accent-beige/20"
    }`}>
      <nav className="max-w-7xl mx-auto px-8 sm:px-10 lg:px-12 py-5 flex items-center gap-6 flex-nowrap">
        {/* Left: Brand with logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-accent-gold/40 group-hover:ring-accent-gold/60 transition-all shadow-md shadow-black/20 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0E4A39' }}>
            <Image
              src="/gallery/nav-logo.png"
              alt="Watershed Logo"
              width={64}
              height={64}
              className="object-contain w-full h-full"
              style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(35%) saturate(450%) hue-rotate(5deg) brightness(100%)' }}
            />
          </div>
          <span className="font-heading text-xl sm:text-xl md:text-[26px] text-accent-gold whitespace-nowrap">
            <span className="hidden sm:inline">The Watershed Campground</span>
            <span className="sm:hidden">The Watershed</span>
          </span>
        </Link>

        {/* Middle: Navigation Links */}
        <ul className="hidden lg:flex items-center gap-8 flex-nowrap mx-auto">
          {regularLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href} className="flex-shrink-0">
                <Link
                  href={l.href}
                  className={`text-[15px] font-medium tracking-wide transition-all relative group whitespace-nowrap ${
                    active ? "text-accent-gold" : "text-accent-beige/85 hover:text-accent-gold"
                  }`}
                >
                  {l.label}
                  {/* Underline effect */}
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 -bottom-1 w-3/4 h-0.5 bg-accent-gold transition-transform duration-300 origin-center ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right: Reservation Button */}
        {reservationLink && (
          <Link
            href={reservationLink.href}
            className="hidden lg:inline-flex items-center bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-2 px-5 rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap flex-shrink-0 text-[15px]"
          >
            {reservationLink.label}
          </Link>
        )}

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden flex flex-col gap-1.5 w-11 h-11 justify-center items-center ml-auto -mr-2 p-2 rounded hover:bg-accent-gold/10 transition-colors"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-accent-gold transition-all ${
              mobileMenuOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-accent-gold transition-all ${
              mobileMenuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-accent-gold transition-all ${
              mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-navbar-forest border-b border-accent-beige/20">
          <ul className="max-w-7xl mx-auto px-8 py-4 space-y-3">
            {links.map((l) => {
              const active = pathname === l.href;
              const isReservation = l.href === "/make-a-reservation";

              return (
                <li key={l.href} onClick={() => setMobileMenuOpen(false)}>
                  <Link
                    href={l.href}
                    className={`block py-2 px-4 rounded transition-colors text-lg ${
                      isReservation
                        ? "bg-accent-gold text-brand-forest font-bold text-center"
                        : active
                        ? "bg-accent-gold/10 text-accent-gold"
                        : "text-accent-beige/85 hover:bg-accent-gold/5 hover:text-accent-gold"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
