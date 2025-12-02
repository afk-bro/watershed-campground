import Container from "../../components/Container";
import Hero from "../../components/Hero";

export default function ThingsToDoPage() {
  const outsideActivities = [
    "Ainsworth Hot Springs",
    "Visit the Village of Kaslo",
    "Ride the Kootenay Lake Ferry (it's free!)",
    "Visit Crawford Bay Artisan Shops (take the free ferry)",
    "Visit Pilot Bay Lighthouse",
    "Cody Caves",
    "Kokanee Zipline",
    "Balfour Golf Course",
    "Feed the ducks at Langs!",
    "Check out the Cool Bus at the Balfour Ferry Landing",
    "Shop downtown Nelson",
  ];

  const onsiteActivities = [
    "Fishing",
    "Swimming, floating, kayaking, SUP",
    "Read a book",
    "Paint a rock",
    "Play cards",
    "Feed the ducks",
    "Rockhound",
    "Do a scavenger hunt",
    "Build a beach castle",
  ];

  const comingSoonActivities = [
    "Rent a fishing boat",
    "Have a sauna",
    "Buy an ice cream",
  ];

  const fishermanSlang = [
    { slang: "Hiyamac", translation: "Hi Ya Mac" },
    { slang: "Lobuddy", translation: "Hello Buddy" },
    { slang: "Binearlong?", translation: "Been here long?" },
    { slang: "Cuplours", translation: "Couple of hours" },
    { slang: "Ketchanenny?", translation: "Catching any?" },
    { slang: "Goddafew", translation: "Got a few" },
    { slang: "Kindarethay?", translation: "Kind are they?" },
    { slang: "Cropsangills", translation: "Croppie and Bluegills" },
    { slang: "Enysizetoum?", translation: "Any size to them?" },
    { slang: "Cuplapowns", translation: "Couple of pounds" },
    { slang: "Hittinard?", translation: "Hitting hard?" },
    { slang: "Sordalite", translation: "Sort of light" },
    { slang: "Wahchoozin?", translation: "What are you using?" },
    { slang: "Gobbaworms", translation: "Gob of worms" },
    { slang: "Fishannonboddum?", translation: "Fishing on the bottom?" },
    { slang: "Rydonnaboddum", translation: "Right down on the bottom" },
    { slang: "Igoddago", translation: "I got to go" },
    { slang: "Tubad", translation: "Too bad" },
    { slang: "Seeyaround", translation: "See you around" },
    { slang: "Yeahtakideezy", translation: "Yeah. Take it easy" },
    { slang: "Guluk!", translation: "Good luck!" },
  ];

  return (
    <main>
      <Hero
        title="Things to Do"
        subtitle="Adventure awaits in the Kootenays"
        imageSrc="/gallery/banner.avif"
        align="center"
      />

      <div className="py-16">
        <Container>
          {/* Kootenay Exploring Introduction */}
          <div className="max-w-4xl mx-auto mb-16 text-center">
            <h2 className="font-heading text-3xl sm:text-4xl text-accent-gold-dark mb-6">
              Kootenay Exploring
            </h2>
            <p className="text-accent-beige/90 text-base sm:text-lg leading-relaxed">
              Discover the stunning Kootenays, where adventure awaits at every turn! With pristine, glacier-fed{" "}
              <span className="text-accent-gold-muted font-medium">Kootenay Lake</span>, you'll find some of the best{" "}
              <span className="text-accent-gold-muted">fishing</span>, <span className="text-accent-gold-muted">hiking</span>,{" "}
              <span className="text-accent-gold-muted">golfing</span>, and <span className="text-accent-gold-muted">swimming</span> spots around.
              Experience world-class mountain biking and soak in breathtaking views, all while exploring charming small towns filled with
              vibrant culture and unbeatable vibes. Come and create unforgettable memories in what we like to call{" "}
              <span className="text-accent-gold-muted font-medium italic">outdoor enthusiasts paradise!</span>
            </p>
          </div>

          {/* Activities Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            {/* Things to do Outside the Campsite */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl sm:text-3xl text-accent-gold-dark mb-6 text-center lg:text-left">
                Things to Do Outside the Campsite
              </h3>
              <ul className="space-y-3">
                {outsideActivities.map((activity, index) => (
                  <li key={index} className="flex items-start gap-3 text-accent-beige/90">
                    <span className="text-accent-gold/70 mt-1 flex-shrink-0">•</span>
                    <span className="text-sm sm:text-base leading-relaxed">{activity}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Things to do At the Campsite */}
            <div className="bg-brand-forest/60 border border-accent-gold/25 rounded-xl p-8 hover:border-accent-gold/35 transition-colors">
              <h3 className="font-heading text-2xl sm:text-3xl text-accent-gold-dark mb-6 text-center lg:text-left">
                Things to Do At the Campsite
              </h3>
              <ul className="space-y-3 mb-6">
                {onsiteActivities.map((activity, index) => (
                  <li key={index} className="flex items-start gap-3 text-accent-beige/90">
                    <span className="text-accent-gold/70 mt-1 flex-shrink-0">•</span>
                    <span className="text-sm sm:text-base leading-relaxed">{activity}</span>
                  </li>
                ))}
              </ul>

              {/* Coming Soon */}
              <div className="border-t border-accent-gold/20 pt-6">
                <p className="text-xs text-accent-gold-muted font-medium mb-3 uppercase tracking-wide">Coming Soon</p>
                <ul className="space-y-3">
                  {comingSoonActivities.map((activity, index) => (
                    <li key={index} className="flex items-start gap-3 text-accent-beige/70">
                      <span className="text-accent-gold/50 mt-1 flex-shrink-0">•</span>
                      <span className="text-sm sm:text-base leading-relaxed italic">{activity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Fisherman's Language */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-gradient-to-b from-brand-forest/40 to-brand-forest/60 border border-accent-gold/25 rounded-xl shadow-2xl p-8 sm:p-10">
              <div className="text-center mb-8">
                <h2 className="font-heading text-3xl sm:text-4xl text-accent-gold-dark mb-4">
                  Fisherman's Language
                </h2>
                <p className="text-accent-beige/80 text-sm sm:text-base leading-relaxed max-w-3xl mx-auto">
                  Fisherman's language is a specialized vocabulary and jargon that is used by fishermen to describe certain techniques,
                  equipment, conditions of the weather and types of fish. It is often specific to a certain type of region or fishing style.
                  It can also include non-verbal communication like hand gestures.{" "}
                  <span className="text-accent-gold-muted font-medium">How many can you make out?</span>
                </p>
              </div>

              {/* Slang Translation Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left Column - Slang */}
                <div className="bg-brand-forest/40 border border-accent-gold/20 rounded-lg p-6">
                  <h4 className="font-heading text-xl text-accent-gold/90 mb-4 text-center">The Slang</h4>
                  <ul className="space-y-2">
                    {fishermanSlang.map((item, index) => (
                      <li key={index} className="text-accent-beige/85 text-sm sm:text-base font-mono">
                        {item.slang}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right Column - Translation */}
                <div className="bg-brand-forest/40 border border-accent-gold/20 rounded-lg p-6">
                  <h4 className="font-heading text-xl text-accent-gold/90 mb-4 text-center">The Translation</h4>
                  <ul className="space-y-2">
                    {fishermanSlang.map((item, index) => (
                      <li key={index} className="text-accent-beige/85 text-sm sm:text-base">
                        {item.translation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </main>
  );
}
