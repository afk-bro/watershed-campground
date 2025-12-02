"use client";

import { useState } from "react";
import Container from "../../components/Container";
import Hero from "../../components/Hero";

export default function ReservationPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    postalCode: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    rvLength: "",
    rvYear: "",
    adults: "",
    children: "",
    campingUnit: "",
    hearAbout: "",
    contactMethod: "",
    comments: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic would go here
    console.log("Form submitted:", formData);
    alert("Thank you! Your reservation request has been submitted. We'll contact you soon to confirm.");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <main>
      <Hero
        title="Make a Reservation"
        subtitle="Start planning your lakeside getaway"
        imageSrc="/gallery/banner.avif"
        align="center"
      />

      <div className="py-16">
        <Container>
          {/* Important Notice */}
          <div className="max-w-3xl mx-auto mb-12 bg-accent-gold/10 border border-accent-gold/30 rounded-lg p-6 text-center">
            <p className="text-accent-beige/90 text-base leading-relaxed mb-2">
              <span className="font-medium text-accent-gold-dark">Please note:</span> This form is a reservation request only.
            </p>
            <p className="text-accent-beige/80 text-sm leading-relaxed">
              Once this information is received, we will confirm your reservation via phone or email.
              If you simply have questions, give us a shout!
            </p>
          </div>

          {/* Reservation Form */}
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-b from-brand-forest/40 to-brand-forest/60 border border-accent-gold/25 rounded-xl shadow-2xl p-6 sm:p-10 space-y-12">
              {/* Personal Information */}
              <section className="space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="font-heading text-2xl sm:text-3xl text-accent-gold-dark mb-2">
                    Personal Information
                  </h3>
                  <div className="w-20 h-px bg-gradient-to-r from-accent-gold/50 to-transparent mx-auto sm:mx-0"></div>
                </div>

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

                  <div className="sm:col-span-2">
                    <label htmlFor="address1" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      id="address1"
                      name="address1"
                      value={formData.address1}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="address2" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Address Line 2 <span className="text-accent-beige/40 text-xs font-normal ml-1">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="address2"
                      name="address2"
                      value={formData.address2}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Postal Code/Zipcode
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>
                </div>
              </section>

              {/* Reservation Details */}
              <section className="space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="font-heading text-2xl sm:text-3xl text-accent-gold-dark mb-2">
                    Reservation Details
                  </h3>
                  <div className="w-20 h-px bg-gradient-to-r from-accent-gold/50 to-transparent mx-auto sm:mx-0"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="checkIn" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Check In Date <span className="text-accent-gold-muted">*</span>
                    </label>
                    <input
                      type="date"
                      id="checkIn"
                      name="checkIn"
                      value={formData.checkIn}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="checkOut" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Check Out Date <span className="text-accent-gold-muted">*</span>
                    </label>
                    <input
                      type="date"
                      id="checkOut"
                      name="checkOut"
                      value={formData.checkOut}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="rvLength" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Actual RV Length <span className="text-accent-gold-muted">*</span>
                    </label>
                    <p className="text-xs text-accent-beige/50 mb-2.5 ml-0.5 italic">Misquoting could result in a void reservation</p>
                    <input
                      type="text"
                      id="rvLength"
                      name="rvLength"
                      value={formData.rvLength}
                      onChange={handleChange}
                      placeholder="e.g., 25 ft"
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="rvYear" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Year of RV
                    </label>
                    <p className="text-xs text-accent-beige/50 mb-2.5 ml-0.5 italic">N/A if using tent</p>
                    <input
                      type="text"
                      id="rvYear"
                      name="rvYear"
                      value={formData.rvYear}
                      onChange={handleChange}
                      placeholder="e.g., 2020 or N/A"
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="adults" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Adults <span className="text-accent-beige/50 text-xs font-normal ml-1">(18+ years)</span>
                    </label>
                    <input
                      type="number"
                      id="adults"
                      name="adults"
                      value={formData.adults}
                      onChange={handleChange}
                      min="0"
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="children" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Children <span className="text-accent-beige/50 text-xs font-normal ml-1">(Under 18)</span>
                    </label>
                    <input
                      type="number"
                      id="children"
                      name="children"
                      value={formData.children}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>
                </div>
              </section>

              {/* Camping Unit Type */}
              <section className="space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="font-heading text-2xl sm:text-3xl text-accent-gold-dark mb-2">
                    Camping Unit <span className="text-accent-gold-muted">*</span>
                  </h3>
                  <div className="w-20 h-px bg-gradient-to-r from-accent-gold/50 to-transparent mx-auto sm:mx-0"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["Pull Trailer", "5th Wheel", "Camper Van", "Tent Trailer", "Motorhome", "Tent", "Other"].map((unit) => (
                    <label key={unit} className="flex items-center gap-3 p-4 bg-brand-forest/40 border border-accent-gold/25 rounded-lg cursor-pointer hover:bg-brand-forest/60 hover:border-accent-gold/40 transition-all h-full">
                      <input
                        type="radio"
                        name="campingUnit"
                        value={unit}
                        checked={formData.campingUnit === unit}
                        onChange={handleChange}
                        required
                        className="w-4 h-4 text-accent-gold bg-brand-forest border-accent-gold/30 focus:ring-accent-gold/50 focus:ring-2"
                      />
                      <span className="text-accent-beige/90 text-sm font-medium">{unit}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Additional Information */}
              <section className="space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="font-heading text-2xl sm:text-3xl text-accent-gold-dark mb-2">
                    Additional Information
                  </h3>
                  <div className="w-20 h-px bg-gradient-to-r from-accent-gold/50 to-transparent mx-auto sm:mx-0"></div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label htmlFor="hearAbout" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      How did you hear about us?
                    </label>
                    <select
                      id="hearAbout"
                      name="hearAbout"
                      value={formData.hearAbout}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    >
                      <option value="">Select an option</option>
                      <option value="Google Search">Google Search</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Friend/Family">Friend/Family</option>
                      <option value="Camping Website">Camping Website</option>
                      <option value="Driving By">Driving By</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="contactMethod" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Preferred method of contact?
                    </label>
                    <select
                      id="contactMethod"
                      name="contactMethod"
                      value={formData.contactMethod}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    >
                      <option value="">Select an option</option>
                      <option value="Phone">Phone</option>
                      <option value="Email">Email</option>
                      <option value="Either">Either</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Contact Information */}
              <section className="space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="font-heading text-2xl sm:text-3xl text-accent-gold-dark mb-2">
                    Contact Information
                  </h3>
                  <div className="w-20 h-px bg-gradient-to-r from-accent-gold/50 to-transparent mx-auto sm:mx-0"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
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
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-base text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="comments" className="block text-sm font-medium text-accent-beige/95 mb-2.5">
                      Comments/Questions
                    </label>
                    <textarea
                      id="comments"
                      name="comments"
                      value={formData.comments}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Any special requests or questions?"
                      className="w-full px-4 py-3 bg-brand-forest/60 border border-accent-gold/30 rounded-lg text-accent-beige placeholder:text-accent-beige/30 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:border-accent-gold/50 transition-all resize-none"
                    />
                  </div>
                </div>
              </section>

              {/* Submit Button */}
              <section className="pt-6 space-y-4">
                <p className="text-center text-sm text-accent-beige/70 leading-relaxed">
                  Your reservation request will be reviewed and confirmed by email or phone within 24 hours.
                </p>
                <button
                  type="submit"
                  className="w-full bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl shadow-lg border-2 border-transparent hover:border-accent-gold-dark focus:outline-none focus:ring-2 focus:ring-accent-gold/50 focus:ring-offset-2 focus:ring-offset-brand-forest"
                >
                  Submit Reservation Request
                </button>
              </section>
            </div>
          </form>
        </Container>
      </div>
    </main>
  );
}
