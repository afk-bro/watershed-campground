
export interface HelpArticle {
    slug: string;
    title: string;
    summary: string;
    whenToUse: string[];
    steps: string[];
    whatHappensNext: string[];
    tips?: string[];
}

export interface HelpCategory {
    id: string;
    title: string;
    icon: string; // Emoji character for simplicity
    articles: HelpArticle[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
    {
        id: "getting-started",
        title: "Getting Started",
        icon: "🏕️",
        articles: [
            {
                slug: "setting-up-campground",
                title: "Setting up your Campground",
                summary: "Learn the basics of configuring your campground settings, sites, and rules.",
                whenToUse: [
                    "First time setup",
                    "Changing campground name or policies"
                ],
                steps: [
                    "Go to Admin -> Settings",
                    "Update your Campground Name and contact info",
                    "Configure your deposit and cancellation policies",
                    "Click Save"
                ],
                whatHappensNext: [
                    "These settings appear on the public booking page",
                    "Policies are applied to new reservations"
                ]
            }
        ]
    },
    {
        id: "reservations",
        title: "Reservations & Calendar",
        icon: "📅",
        articles: [
            {
                slug: "add-blackout-dates",
                title: "Add Blackout Dates to the Calendar",
                summary: "Block dates so guests cannot book during closures, maintenance, or private use.",
                whenToUse: [
                    "Seasonal closures",
                    "Repairs",
                    "Owner stays",
                    "Special events"
                ],
                steps: [
                    "Go to Admin -> Calendar",
                    "Click and drag across the dates you want to block",
                    "Select 'Blackout Date' from the popup",
                    "Add an optional reason (e.g., 'Maintenance')",
                    "Click Save"
                ],
                whatHappensNext: [
                    "Dates appear with diagonal stripes and a red border",
                    "Guests cannot book these dates",
                    "You can hover over the block to see the reason"
                ],
                tips: [
                    "You can create blackout dates across multiple sites if needed (currently global or single site)",
                    "Blackouts do not trigger emails to guests"
                ]
            },
            {
                slug: "create-manual-reservation",
                title: "Create a Manual Reservation",
                summary: "Book a guest directly without them going through the public site.",
                whenToUse: [
                    "Phone bookings",
                    "Walk-ins",
                    "Friends or family bookings"
                ],
                steps: [
                    "Go to Admin -> Calendar",
                    "Drag to select the dates and campsite",
                    "Click 'New Reservation'",
                    "Fill in the guest details",
                    "Optionally mark as 'Paid (Offline)' to skip Stripe payment",
                    "Click Create Reservation"
                ],
                whatHappensNext: [
                    "The reservation appears on the calendar",
                    "A confirmation email is sent to the guest (unless system email is disabled)"
                ]
            }
        ]
    },
    {
        id: "daily-management",
        title: "Daily Management",
        icon: "📋",
        articles: [
            {
                slug: "managing-reservations-list",
                title: "Managing Reservations & Bulk Actions",
                summary: "Learn how to view details, assign sites, and check-in multiple guests at once.",
                whenToUse: [
                    "Daily check-ins/check-outs",
                    "Assigning campsites to unassigned bookings",
                    "Cancelling multiple reservations"
                ],
                steps: [
                    "**View Details:** Click any row to open the Side Drawer with full reservation info and logs.",
                    "**Inline Assign:** Click the yellow 'Assign' button on a row to pick an available campsite.",
                    "**Bulk Actions:** Select multiple rows using the checkboxes on the left.",
                    "Use the **Floating Bar** at the bottom to Check In, Check Out, Cancel, or Auto-Assign all selected items."
                ],
                whatHappensNext: [
                    "Status updates apply immediately",
                    "Auto-Assign searches for the first valid spot for each guest",
                    "Errors (like conflicts) will leave the failed items selected so you can review them"
                ],
                tips: [
                    "Use the 'Select All' checkbox in the header to select everything on the page",
                    "Auto-Assign is great for handling a batch of 'Any Site' bookings efficiently"
                ]
            }
        ]
    },
    {
        id: "payments",
        title: "Payments & Policies",
        icon: "💳",
        articles: [
            {
                slug: "refunds-cancellations",
                title: "Refunds & Cancellations",
                summary: "How to handle cancelled bookings and return funds.",
                whenToUse: [
                    "Guest requests cancellation",
                    "Weather cancellations"
                ],
                steps: [
                    "Find the reservation in the Admin Panel",
                    "Click to view details",
                    "Change status to 'Cancelled'",
                    "Process the refund via your Stripe Dashboard (currently manual)"
                ],
                whatHappensNext: [
                    "The text becomes crossed out on the calendar",
                    " The site becomes available for others to book"
                ],
                tips: [
                    "Automated refunds directly from the Admin Panel are coming soon"
                ]
            }
        ]
    },
    {
        id: "troubleshooting",
        title: "Troubleshooting",
        icon: "🆘",
        articles: [
            {
                slug: "dates-blocked-unexpectedly",
                title: "Dates are blocked unexpectedly",
                summary: "Why a site might show as unavailable when there is no reservation.",
                whenToUse: [
                    "Guest says they can't book empty dates",
                    "Calendar looks wrong"
                ],
                steps: [
                    "Check for Blackout Dates (diagonal stripes)",
                    "Check for 'Pending' reservations (yellow dots) - these might be expired holds",
                    "Ensure the Campsite is 'Active' in Admin -> Campsites"
                ],
                whatHappensNext: [
                    "If you find an errant blackout, you can delete it",
                    "If a site is inactive, you can reactivate it"
                ]
            }
        ]
    }
];

export function searchHelp(query: string): HelpArticle[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();

    const results: HelpArticle[] = [];

    HELP_CATEGORIES.forEach(cat => {
        cat.articles.forEach(article => {
            if (
                article.title.toLowerCase().includes(lowerQuery) ||
                article.summary.toLowerCase().includes(lowerQuery) ||
                article.slug.includes(lowerQuery)
            ) {
                results.push(article);
            }
        });
    });

    return results;
}

export function getArticleBySlug(slug: string): HelpArticle | undefined {
    for (const cat of HELP_CATEGORIES) {
        const article = cat.articles.find(a => a.slug === slug);
        if (article) return article;
    }
    return undefined;
}
