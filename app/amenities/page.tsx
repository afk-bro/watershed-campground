"use client";

import { useState } from "react";
import Container from "../../components/Container";
import Hero from "../../components/Hero";

type AmenityCardProps = {
  title: string;
  description: string;
  comingSoon?: boolean;
  icon?: string;
};

function AmenityCard({ title, description, comingSoon = false }: AmenityCardProps) {
  return (
    <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-6 hover:border-accent-gold/40 transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden h-full flex flex-col">
      {comingSoon && (
        <div className="absolute top-4 right-4 bg-accent-gold/20 text-accent-gold text-xs font-medium px-3 py-1 rounded-full border border-accent-gold/30">
          Coming Soon
        </div>
      )}
      <h3 className="font-heading text-2xl text-accent-gold-dark mb-3 pr-24">
        {title}
      </h3>
      <p className="text-accent-beige/85 text-sm leading-relaxed flex-1">
        {description}
      </p>
    </div>
  );
}

export default function AmenitiesPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Contact form submitted:", formData);
    alert("Thank you! We'll get back to you soon.");
    setFormData({ firstName: "", lastName: "", email: "", message: "" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <main>
      <Hero
        title="Amenities"
        subtitle="Everything you need for a comfortable stay"
        imageSrc="/gallery/banner.avif"
        align="center"
      />

      <div className="py-16">
        <Container size="xl">
          {/* Amenities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            <AmenityCard
              title="Tent & Car Camping"
              description="Situated in a treed area, well shaded, but still bright."
            />
            <AmenityCard
              title="RV Camping"
              description="30 amp fully serviced sites make RV camping a breeze."
            />
            <AmenityCard
              title="Fishing Boat Rentals"
              description="Stay tuned for more details."
              comingSoon
            />
            <AmenityCard
              title="Sauna & Cold Plunge"
              description="Need a dopamine hit? Take a dip in the cold water and then soothe away your problems in the sauna."
              comingSoon
            />
            <AmenityCard
              title="Library Nook"
              description="Grab a book and head to the beach or find a cozy space and turn a few pages."
            />
            <AmenityCard
              title="Convenience Shop"
              description="Looking for ice cream or batteries? We can help! Check out a variety of convenience and food items at our shop."
              comingSoon
            />
            <AmenityCard
              title="Flush Toilets"
              description="Clean, modern restroom facilities for your comfort and convenience."
            />
            <AmenityCard
              title="Beach Access"
              description="Direct access to the beautiful Kootenay Lake shoreline for swimming, sunbathing, and relaxing."
            />
            <AmenityCard
              title="Fishing"
              description="Cast your line from the shore or bring your boat to catch trout and other local fish."
            />
          </div>

          {/* Questions Section */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-b from-brand-forest/40 to-brand-forest/60 border border-accent-gold/25 rounded-xl shadow-2xl p-6 sm:p-8 md:p-10">
              <div className="text-center mb-8">
                <h2 className="font-heading text-3xl sm:text-4xl text-accent-gold-dark mb-2">
                  Questions?
                </h2>
                <p className="text-accent-beige/70 text-sm">
                  We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
                </p>
              </div>

              {/* Contact Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl shadow-lg border-2 border-transparent hover:border-accent-gold-dark focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:ring-offset-2 focus:ring-offset-brand-forest"
                >
                  Send Message
                </button>
              </form>

              {/* Social Media Links */}
              <div className="mt-8 pt-8 border-t border-accent-gold/20">
                <p className="text-center text-sm text-accent-beige/70 mb-4">Or connect with us on social media</p>
                <div className="flex justify-center gap-4">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-brand-forest/60 border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/10 hover:border-accent-gold/50 transition-all"
                    aria-label="Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-brand-forest/60 border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/10 hover:border-accent-gold/50 transition-all"
                    aria-label="Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-brand-forest/60 border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/10 hover:border-accent-gold/50 transition-all"
                    aria-label="LinkedIn"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-brand-forest/60 border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/10 hover:border-accent-gold/50 transition-all"
                    aria-label="Instagram"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </main>
  );
}
