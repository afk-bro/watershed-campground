import Container from "../../components/Container";
import TaskHero from "../../components/TaskHero";

export default function RatesPage() {
  return (
    <main>
      <TaskHero
        title="Rates"
        subtitle="Flexible options for every camping style"
      />

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />

      <div className="py-12">
        <Container size="xl">
          {/* Introduction */}
          <div className="max-w-4xl mx-auto mb-16 text-center">
            <p className="text-accent-beige/90 text-base sm:text-lg leading-relaxed mb-6">
              Welcome to the ultimate camping destination! Whether you&apos;re seeking nightly, weekly, or monthly accommodations,
              we&apos;ve got you covered. Our space is perfect for road warriors and those looking to settle in comfortably.
            </p>
            <p className="text-accent-beige/90 text-base sm:text-lg leading-relaxed">
              Our space offers <span className="text-accent-gold-muted font-medium">20 sites</span>, a mix of full hook up,
              power only, and basic no service sites. Our sites are flat and spacious and come with a fire pit and picnic table.
              Each campsite will have access to the lake for <span className="text-accent-gold-muted">fishing</span>, <span className="text-accent-gold-muted">swimming</span> and
              simply enjoying the fresh water. RV, campervan, camper, or tent, we have a spot for you!
            </p>
          </div>

          {/* Important Information */}
          <div className="max-w-4xl mx-auto mb-16 bg-brand-forest/80 border border-accent-gold/20 rounded-lg p-6 sm:p-8">
            <h3 className="font-heading text-2xl text-accent-gold-dark mb-6 text-center">
              What You Should Know Before You Reserve
            </h3>
            <ul className="space-y-4 text-accent-beige/90 text-sm sm:text-base leading-relaxed">
              <li className="flex gap-3">
                <span className="text-accent-gold/70 flex-shrink-0">•</span>
                <span>Our tent sites are walk-in only. Vehicles are parked very close by but not parked at your campsite.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent-gold/70 flex-shrink-0">•</span>
                <span>We are a family of 4 plus grandma and grandpa who live on site. We are still actively working on and developing our campground, so you will need to bring in your own drinking water.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent-gold/70 flex-shrink-0">•</span>
                <span><span className="font-medium text-accent-gold-muted">Max trailer length is 27 ft.</span> We are unable to accommodate longer units at this time. All full hook up sites are back-in only, not pull-through. If at any point you are uncomfortable with the back-in process we can assist with guidance - please just ask us!</span>
              </li>
            </ul>
          </div>

          {/* Pricing Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Low Season */}
            <div className="bg-brand-forest/60 border border-accent-gold/20 rounded-lg p-8 hover:border-accent-gold/30 transition-colors">
              <div className="text-center mb-8">
                <h3 className="font-heading text-3xl text-accent-gold-dark mb-2">Low Season</h3>
                <p className="text-accent-beige/70 text-sm tracking-wide">Oct 1 - Apr 30</p>
              </div>

              <div className="space-y-6">
                {/* RV Sites */}
                <div className="border-b border-accent-gold/10 pb-6">
                  <h4 className="font-heading text-xl text-accent-gold/90 mb-4">RV Sites</h4>
                  <div className="space-y-2 text-accent-beige/85">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Daily <span className="text-xs text-accent-beige/60">(full hookups)</span></span>
                      <span className="font-medium text-accent-gold-muted text-lg">$55</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Weekly</span>
                      <span className="font-medium text-accent-gold-muted text-lg">$330</span>
                    </div>
                  </div>
                </div>

                {/* Car Camping */}
                <div className="border-b border-accent-gold/10 pb-6">
                  <h4 className="font-heading text-xl text-accent-gold/90 mb-4">Car Camping</h4>
                  <div className="space-y-2 text-accent-beige/85">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Daily <span className="text-xs text-accent-beige/60">(power & water)</span></span>
                      <span className="font-medium text-accent-gold-muted text-lg">$49</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Weekly</span>
                      <span className="font-medium text-accent-gold-muted text-lg">$294</span>
                    </div>
                  </div>
                </div>

                {/* Tent Sites */}
                <div>
                  <h4 className="font-heading text-xl text-accent-gold/90 mb-4">Tent Sites</h4>
                  <div className="space-y-2 text-accent-beige/85">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Daily</span>
                      <span className="font-medium text-accent-gold-muted text-lg">$39</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Weekly</span>
                      <span className="font-medium text-accent-gold-muted text-lg">$234</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* High Season */}
            <div className="bg-brand-forest/60 border-2 border-accent-gold/30 rounded-lg p-8 hover:border-accent-gold/40 transition-colors relative overflow-hidden">
              {/* Popular badge */}
              <div className="absolute top-4 right-4 bg-accent-gold/20 text-accent-gold text-xs font-medium px-3 py-1 rounded-full border border-accent-gold/30">
                Peak Season
              </div>

              <div className="text-center mb-8">
                <h3 className="font-heading text-3xl text-accent-gold-dark mb-2">High Season</h3>
                <p className="text-accent-beige/70 text-sm tracking-wide">May 1 - Sept 30</p>
              </div>

              <div className="space-y-6">
                {/* RV Sites */}
                <div className="border-b border-accent-gold/10 pb-6">
                  <h4 className="font-heading text-xl text-accent-gold/90 mb-4">RV Sites</h4>
                  <div className="space-y-2 text-accent-beige/85">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Daily <span className="text-xs text-accent-beige/60">(full hookups)</span></span>
                      <span className="font-medium text-accent-gold-muted text-lg">$65</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Weekly</span>
                      <span className="font-medium text-accent-gold-muted text-lg">$390</span>
                    </div>
                  </div>
                </div>

                {/* Car Camping */}
                <div className="border-b border-accent-gold/10 pb-6">
                  <h4 className="font-heading text-xl text-accent-gold/90 mb-4">Car Camping</h4>
                  <div className="space-y-2 text-accent-beige/85">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Daily <span className="text-xs text-accent-beige/60">(power & water)</span></span>
                      <span className="font-medium text-accent-gold-muted text-lg">$59</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Weekly</span>
                      <span className="font-medium text-accent-gold-muted text-lg">$354</span>
                    </div>
                  </div>
                </div>

                {/* Tent Sites */}
                <div>
                  <h4 className="font-heading text-xl text-accent-gold/90 mb-4">Tent Sites</h4>
                  <div className="space-y-2 text-accent-beige/85">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Daily</span>
                      <span className="font-medium text-accent-gold-muted text-lg">$49</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm">Weekly</span>
                      <span className="font-medium text-accent-gold-muted text-lg">$294</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </main>
  );
}
