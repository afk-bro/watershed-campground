"use client";

import Container from "@/components/Container";
import Hero from "@/components/Hero";
import { CheckCircle2, Circle, Clock, ArrowRight } from "lucide-react";

export default function RoadmapPage() {
  type Status = "live" | "in_progress" | "next" | "planned";
  type Feature = { name: string; status: Status; note?: string };
  type Tier = { title: string; description: string; features: Feature[] };
  
  interface RoadmapTier extends Tier {
    id: number;
    color: string;
    bg: string;
  }

  const tiers: RoadmapTier[] = [
    {
      id: 1,
      title: "Tier 1 — Core Revenue & Daily Operations (MUST HAVE)",
      description: "Without these, the product isn't viable.",
      color: "border-green-500",
      bg: "bg-green-50",
      features: [
        { name: "Online Booking System", status: "live" },
        { name: "Real-time Availability", status: "live" },
        { name: "Reservation Calendar (Admin)", status: "live" },
        { name: "Manual Reservation Management", status: "live" },
        { name: "Basic Site Management (Capacity, Types)", status: "live" },
        { name: "Payments (Stripe Integration)", status: "next", note: "Critical missing piece" }, 
      ],
    },
    {
      id: 2,
      title: "Tier 2 — Operator Efficiency & Differentiation",
      description: "This is where you start beating competitors.",
      color: "border-yellow-500",
      bg: "bg-yellow-50",
      features: [
        { name: "Drag-and-Drop Reservation Management", status: "planned" },
        { name: "Flexible Pricing Engine (Seasonal/Weekend)", status: "planned" },
        { name: "Add-ons During Booking (Firewood, etc.)", status: "planned" },
        { name: "Guest Notifications on Change", status: "planned" },
        { name: "Group Reservation Management", status: "planned" },
      ],
    },
    {
      id: 3,
      title: "Tier 3 — Financial Control & Long-Term Stays",
      description: "Critical for larger parks & long-term campers.",
      color: "border-blue-500",
      bg: "bg-blue-50",
      features: [
        { name: "Long-Term Camper Invoicing", status: "planned" },
        { name: "Reporting Dashboard (Revenue, Occupancy)", status: "planned" },
        { name: "Exports (QuickBooks & Excel)", status: "planned" },
      ],
    },
    {
      id: 4,
      title: "Tier 4 — Scale, Automation & Growth",
      description: "Not required to launch, but unlocks serious scale.",
      color: "border-purple-500",
      bg: "bg-purple-50",
      features: [
        { name: "Channel Calendar Sync (Airbnb, VRBO)", status: "planned" },
        { name: "Mass Messaging (Text & Email)", status: "planned" },
        { name: "Print Support (Invoices, Check-in Sheets)", status: "planned" },
      ],
    },
    {
      id: 5,
      title: "Tier 5 — Nice-to-Have / Expansion",
      description: "Add after product-market fit.",
      color: "border-red-500",
      bg: "bg-red-50",
      features: [
        { name: "Lock Fees (Specific Site Guarantee)", status: "planned" },
        { name: "Advanced Automated Assignment Rules", status: "planned" },
      ],
    },
  ];

  return (
    <main className="bg-slate-50 min-h-screen">
      <Hero
        title="Product Roadmap"
        subtitle="What's Live & What's Coming Next"
        imageSrc="/gallery/banner.avif"
        align="center"
      />

      <div className="py-16">
        <Container>
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* Intro Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className="text-4xl font-bold text-brand-forest mb-2">Tier 1</div>
                  <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">Current Focus</div>
               </div>
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className="text-4xl font-bold text-accent-gold-dark mb-2">90%</div>
                  <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">Core Viability</div>
               </div>
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">Q1</div>
                  <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">Launch Target</div>
               </div>
            </div>

            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`bg-white rounded-2xl shadow-sm border-l-4 ${tier.color} overflow-hidden`}
              >
                <div className="p-6 md:p-8 border-b border-slate-100">
                  <h2 className="text-2xl font-heading font-bold text-slate-800">
                    {tier.title}
                  </h2>
                  <p className="text-slate-600 mt-2">{tier.description}</p>
                </div>
                
                <div className="p-6 md:p-8 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tier.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-white p-4 rounded-lg border border-slate-200/60 shadow-sm relative group"
                      >
                        {feature.status === "live" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : feature.status === "in_progress" ? (
                           <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 animate-pulse" />
                        ) : feature.status === "next" ? (
                           <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                        )}
                        
                        <div className="flex flex-col">
                            <span className={`text-sm font-medium ${
                                feature.status === 'live' ? 'text-slate-800' : 'text-slate-500'
                            }`}>
                              {feature.name}
                            </span>
                            {feature.note && (
                                <span className="text-xs text-slate-400 mt-0.5">{feature.note}</span>
                            )}
                        </div>
                        
                        {feature.status === "live" && (
                            <span className="ml-auto text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                LIVE
                            </span>
                        )}
                         {feature.status === "in_progress" && (
                            <span className="ml-auto text-xs font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                                WIP
                            </span>
                        )}
                         {feature.status === "next" && (
                            <span className="ml-auto text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                NEXT
                            </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-brand-forest text-accent-beige p-8 rounded-2xl text-center shadow-xl">
                <h3 className="text-2xl font-heading font-bold mb-4">Ready to shape the future?</h3>
                <p className="opacity-90 max-w-2xl mx-auto mb-8">
                    We're building the ultimate campground management system. The "Brutal Focus" killer combo is almost complete.
                </p>
                <a href="/contact" className="inline-flex items-center gap-2 bg-accent-gold text-brand-forest font-bold py-3 px-6 rounded-lg hover:bg-white hover:scale-105 transition-all">
                    Get in Touch <ArrowRight className="w-5 h-5" />
                </a>
            </div>

          </div>
        </Container>
      </div>
    </main>
  );
}
