import Container from "../../components/Container";
import TaskHero from "../../components/TaskHero";

export default function RulesPage() {
  return (
    <main>
      <TaskHero
        title="Ground Rules & Policy"
        subtitle="Creating a respectful and enjoyable environment for everyone"
      />

      <div className="py-12 -mt-4">
        <Container size="xl">
          {/* Introduction */}
          <div className="max-w-4xl mx-auto mb-16 text-center">
            <p className="text-accent-beige/90 text-base sm:text-lg leading-relaxed">
              Welcome to the Watershed! We pride ourselves on being a family-friendly campground with on-site hosts 
              dedicated to creating a respectful and enjoyable environment for everyone. While we embrace a relaxed 
              and chill atmosphere, we believe in the importance of setting some ground rules to ensure that all guests, 
              hosts, and other neighbors can enjoy their own space.
            </p>
            <p className="text-accent-gold-muted font-medium text-lg mt-6">
              Thank you for being a part of our community!
            </p>
          </div>

          {/* Rules Grid */}
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Pack It In Pack It Out */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl text-accent-gold-dark mb-4">
                Pack It In Pack It Out
              </h3>
              <p className="text-accent-beige/90 text-base leading-relaxed">
                You know the drill, what you come with is what you leave with.
              </p>
            </div>

            {/* Check In/Check Out Times */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl text-accent-gold-dark mb-4">
                Check In/Check Out Times
              </h3>
              <div className="space-y-3 text-accent-beige/90 text-base leading-relaxed">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-medium text-accent-gold-muted">Check in Time:</span>
                  <span>1:00-8:00pm</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-medium text-accent-gold-muted">Check out Time:</span>
                  <span>11:00am</span>
                </div>
                <p className="text-sm text-accent-beige/80 italic mt-4">
                  *If you need check in after 8:00pm please call us to make alternate arrangements*
                </p>
              </div>
            </div>

            {/* Be Respectful of your surroundings */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl text-accent-gold-dark mb-4">
                Be Respectful of Your Surroundings
              </h3>
              <p className="text-accent-beige/90 text-base leading-relaxed">
                We ask that all guests at The Watershed respect their surroundings, the earth, other guests and most 
                importantly the water. Please do not litter or use any type of product in the lake for washing or cleaning.
              </p>
            </div>

            {/* Quiet Hours */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl text-accent-gold-dark mb-4">
                Quiet Hours
              </h3>
              <p className="text-accent-beige/90 text-base leading-relaxed">
                While we can appreciate great tunes and love to hear everyone laughing and having a good time - we do 
                ask that quiet times commence at <span className="font-medium text-accent-gold-muted">11:00pm to 7:00am</span>.
              </p>
            </div>

            {/* Parking */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl text-accent-gold-dark mb-4">
                Parking
              </h3>
              <p className="text-accent-beige/90 text-base leading-relaxed">
                Each site is allotted one parking space for their vehicle. Other arrangements can be made for an 
                additional fee. Please do not park in empty campsites.
              </p>
            </div>

            {/* Visitors */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl text-accent-gold-dark mb-4">
                Visitors
              </h3>
              <p className="text-accent-beige/90 text-base leading-relaxed">
                All unregistered visitors must register with camp hosts. Visitors are just that - visitors. If you 
                intend to have your visitor stay with you at your campsite, there will be an additional fee.
              </p>
            </div>

            {/* Stay In Your Lane */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl text-accent-gold-dark mb-4">
                Stay In Your Lane
              </h3>
              <p className="text-accent-beige/90 text-base leading-relaxed">
                Please stick to the designated paths, roads and no cutting through other sites or onto neighboring properties.
              </p>
            </div>

            {/* Safety First */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl text-accent-gold-dark mb-4">
                Safety First
              </h3>
              <div className="space-y-4 text-accent-beige/90 text-base leading-relaxed">
                <p>
                  If you are camping with children they must be supervised at all times and especially while at the 
                  beach or in the water. We have picnic tables set up to make monitoring a breeze. If you are swimming, 
                  fishing, using a SUP, kayak, or any floatation device in the water, we ask that you please wear a 
                  life jacket and be safe.
                </p>
                <p>
                  Please be mindful of the fire season - we reserve the right to put out any fire should the local 
                  fire bans come into effect or if it is deemed unsafe due to proximity. Propane fire pits are a great 
                  alternative. We ask that you don&apos;t burn any of the brush laying around the campground. Should you 
                  need to purchase fire wood we do have bundles available for <span className="font-medium text-accent-gold-muted">$10.00</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Closing */}
          <div className="max-w-4xl mx-auto mt-16 text-center">
            <h3 className="font-heading text-3xl sm:text-4xl text-accent-gold-dark mb-4">
              Happy Camping!
            </h3>
          </div>
        </Container>
      </div>
    </main>
  );
}
