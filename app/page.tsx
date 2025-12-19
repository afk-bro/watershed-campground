import Hero from "../components/Hero";
import OurStory from "../components/OurStory";
import Container from "../components/Container";
import SectionHeader from "../components/SectionHeader";
import Card from "../components/Card";
import CTAButton from "../components/CTAButton";

export default function Home() {
  return (
    <main>
      <Hero
        title="Lakeside Camping"
        subtitle="Peaceful, private, and close to nature"
        imageSrc="/gallery/banner.avif"
        cta={{
          label: "Make a Reservation",
          href: "/make-a-reservation",
          subtext: "Check availability in under 30 seconds"
        }}
      />
      {/* Gold divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />

      {/* Our Story Section */}
      <OurStory />

      {/* Gold divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />

      <div className="py-20">
        <Container size="xl">
          <SectionHeader title="Explore the Campground" subtitle="Quick links to popular sections" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card title="Gallery" content={<CTAButton label="View Photos" href="/gallery" />} />
            <Card title="Rates" content={<CTAButton label="See Pricing" href="/rates" />} />
            <Card title="Amenities" content={<CTAButton label="What’s Included" href="/amenities" />} />
            <Card title="Things to Do" content={<CTAButton label="Nearby Activities" href="/things-to-do" />} />
          </div>
        </Container>
      </div>
    </main>
  );
}
