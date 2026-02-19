import * as React from "react";
import { personas as seedPersonaProfiles } from "@/data/personas";
import type { CustomerPersona } from "./types";
import { normalizePersona } from "@/domain/personas/usecases";
import { usePersonasStore } from "@/application/personas/store";

// Create seed enrichment
type SeedEnrichment = Pick<
  CustomerPersona,
  | "summary"
  | "traits"
  | "tags"
  | "brand"
  | "goals"
  | "jobsToBeDone"
  | "decisionCriteria"
  | "objections"
  | "channels"
  | "preferredContent"
>;

const seedEnrichment: Record<
  string,
  SeedEnrichment
> = {
  "fleet-manager": {
    summary:
      "Corporate fleet decision-maker focused on total cost of ownership and operational efficiency.",
    traits: ["Cost-conscious", "Data-driven", "Long-term thinking", "Risk-averse"],
    tags: ["B2B", "Fleet", "TCO"],
    brand: "Ford",
    goals: ["Lower downtime", "Improve fleet ROI"],
    jobsToBeDone: ["Standardize vehicles", "Increase uptime"],
    decisionCriteria: ["TCO", "Reliability", "Service network"],
    objections: ["Unclear ROI", "Weak support model"],
    channels: ["Account managers", "Industry forums", "Fleet publications"],
    preferredContent: ["TCO calculators", "Case studies", "Uptime benchmarks"],
  },
  "small-business-owner": {
    summary:
      "Entrepreneur seeking reliable, versatile vehicles that support business growth.",
    traits: ["Value-focused", "Practical", "Growth-oriented", "Multi-functional needs"],
    tags: ["SMB", "Owner", "Versatility"],
    brand: "McLaren",
    goals: ["Protect cash flow", "Grow operations"],
    jobsToBeDone: ["Run daily operations", "Maintain business image"],
    decisionCriteria: ["Monthly affordability", "Reliability", "Versatility"],
    objections: ["High upfront costs", "Unexpected repairs"],
    channels: ["Dealer advisors", "YouTube reviews", "Owner groups"],
    preferredContent: ["Cost breakdowns", "Owner testimonials", "How-to guides"],
  },
  "individual-buyer": {
    summary:
      "Personal vehicle purchaser prioritizing comfort, style, and personal utility.",
    traits: ["Emotion-driven", "Style-conscious", "Comfort-focused", "Tech-aware"],
    tags: ["B2C", "Lifestyle", "Comfort"],
    brand: "Ford",
    goals: ["Feel confident in purchase", "Balance utility and enjoyment"],
    jobsToBeDone: ["Daily commuting", "Family transportation"],
    decisionCriteria: ["Comfort", "Safety", "Value for money"],
    objections: ["Price uncertainty", "Reliability concerns"],
    channels: ["Search", "Social", "Dealer showroom"],
    preferredContent: ["Comparisons", "Video reviews", "Feature explainers"],
  },
  "nissan-young-family-qashqai-owner": {
    summary:
      "Young suburban couple choosing one primary family crossover that is safe, modern, practical, and payment-friendly.",
    traits: ["Family-first", "Budget-aware", "Practical", "Style-conscious"],
    tags: ["Nissan", "Qashqai", "Young family", "Primary car"],
    brand: "Nissan",
    goals: [
      "Keep monthly vehicle costs predictable",
      "Choose a safe crossover for children",
      "Buy one car that handles daily and weekend use",
    ],
    jobsToBeDone: [
      "School and daycare runs",
      "Commute and errands",
      "Weekend family trips with stroller/cargo load",
    ],
    decisionCriteria: [
      "Safety ratings and ADAS value",
      "Monthly payment and ownership cost",
      "Interior practicality and storage flexibility",
      "Modern exterior and cabin design",
    ],
    objections: [
      "Fear of hidden ownership costs",
      "Concern that lower trims feel outdated",
      "Worry that compact SUVs lack family space",
    ],
    channels: ["YouTube reviews", "Comparison sites", "Dealer visits", "Owner forums"],
    preferredContent: ["Payment calculators", "Family practicality demos", "Safety explainers"],
  },
  "nissan-empty-nester-qashqai-owner": {
    summary:
      "Active empty-nester couple prioritizing easy access, comfort, visibility, intuitive technology, and predictable ownership costs.",
    traits: ["Comfort-led", "Risk-aware", "Pragmatic", "Quality-focused"],
    tags: ["Nissan", "Qashqai", "Empty nester", "Comfort"],
    brand: "Nissan",
    goals: [
      "Reduce driving stress and fatigue",
      "Maintain comfort for daily and leisure travel",
      "Avoid ownership surprises",
    ],
    jobsToBeDone: [
      "Daily local mobility",
      "Regional weekend drives",
      "Travel with occasional guests and luggage",
    ],
    decisionCriteria: [
      "Ease of entry and seating comfort",
      "Visibility and confidence aids",
      "Intuitive controls",
      "Service and maintenance predictability",
    ],
    objections: [
      "Overly complex infotainment interfaces",
      "Too many features with unclear real benefit",
      "Unclear long-term reliability evidence",
    ],
    channels: ["Dealer consultation", "Consumer reports", "Owner communities"],
    preferredContent: ["Long-term reliability data", "Comfort-focused test reviews", "Ownership cost guides"],
  },
  "rivian-outdoor-adventurer": {
    summary:
      "Adventure-first premium buyer demanding true off-road utility and sustainability without compromise.",
    traits: ["Capability-driven", "Outdoor-oriented", "Performance-minded", "Values-led"],
    tags: ["Rivian", "Off-road", "Adventure", "Premium EV"],
    brand: "Rivian",
    goals: [
      "Access remote terrain confidently",
      "Carry gear and support multi-day adventures",
      "Own an EV aligned with environmental values",
    ],
    jobsToBeDone: [
      "Weekend and expedition travel",
      "Tow or carry heavy outdoor equipment",
      "Operate in variable weather and terrain",
    ],
    decisionCriteria: [
      "Ground clearance and traction capability",
      "Payload/towing and storage utility",
      "Battery/range behavior under real adventure use",
      "Durability and service support",
    ],
    objections: [
      "Compromised capability in EV packaging",
      "Range loss in harsh conditions",
      "Weak charging reliability near adventure corridors",
    ],
    channels: ["Adventure creators", "Off-road forums", "Specialist press", "Brand events"],
    preferredContent: ["Field tests", "Capability benchmarks", "Accessory ecosystem guides"],
  },
  "rivian-tech-savvy-urbanite": {
    summary:
      "High-earning city early adopter buying for cutting-edge tech, design, and status, with symbolic adventure capability.",
    traits: ["Tech-forward", "Status-aware", "Design-led", "Experience-driven"],
    tags: ["Rivian", "Urban", "Early adopter", "Tech luxury"],
    brand: "Rivian",
    goals: [
      "Own a category-defining premium EV experience",
      "Signal modern taste and innovation leadership",
      "Keep daily driving frictionless through smart tech",
    ],
    jobsToBeDone: [
      "Premium urban commuting",
      "Client/social presence",
      "Occasional weekend escapes",
    ],
    decisionCriteria: [
      "Software UX and OTA quality",
      "Design and interior perception",
      "Connectivity ecosystem",
      "Brand prestige and differentiation",
    ],
    objections: [
      "Buggy software experience",
      "Difficult urban charging routine",
      "Premium pricing without premium polish",
    ],
    channels: ["Tech media", "Social creators", "Peer networks", "Launch events"],
    preferredContent: ["Feature deep-dives", "UX walkthroughs", "Design stories"],
  },
  "rivian-environmentally-conscious-family": {
    summary:
      "Suburban family seeking a safe, spacious, versatile 3-row EV aligned with sustainability and convenience.",
    traits: ["Family-centric", "Sustainability-minded", "Practical", "Safety-focused"],
    tags: ["Rivian", "Family EV", "3-row", "Sustainability"],
    brand: "Rivian",
    goals: [
      "Lower household emissions without losing utility",
      "Keep family safe and comfortable in all conditions",
      "Simplify ownership through home charging routines",
    ],
    jobsToBeDone: [
      "School, sports, and activity logistics",
      "Family road trips",
      "Flexible cargo and seating use cases",
    ],
    decisionCriteria: [
      "Safety performance",
      "Third-row usability and storage",
      "Real-world range and charging convenience",
      "Total ownership economics",
    ],
    objections: [
      "Charging anxiety on long family trips",
      "Premium EV price pressure",
      "Uncertainty on long-term reliability and value retention",
    ],
    channels: ["Parent communities", "Owner testimonials", "Dealer consultations", "Family reviewers"],
    preferredContent: ["Family-use videos", "Trip-planning guides", "Ownership cost explainers"],
  },
  "fordpro-dave-artisan-van-owner-operator": {
    summary:
      "Independent tradesperson needing a dependable, secure, and professional van that works as workhorse and mobile office.",
    traits: ["Hands-on", "Proud owner-operator", "Reliability-first", "Image-aware"],
    tags: ["Ford Pro", "Artisan", "Van", "Owner-operator"],
    brand: "Ford Pro",
    goals: [
      "Protect billable hours through high uptime",
      "Secure expensive tools and materials",
      "Present a premium business image to clients",
    ],
    jobsToBeDone: [
      "Daily service visits",
      "Transport tools and parts efficiently",
      "Handle admin tasks from the vehicle between jobs",
    ],
    decisionCriteria: [
      "Reliability and service response",
      "Cargo security and layout flexibility",
      "Cab comfort and practical technology",
      "Whole-life operating cost",
    ],
    objections: [
      "Downtime risk harming revenue",
      "Weak theft protection",
      "Unclear value from premium options",
    ],
    channels: ["Trade communities", "Dealer fleet specialists", "YouTube van builds"],
    preferredContent: ["Upfit case studies", "Uptime/service guarantees", "Security feature demos"],
  },
  "fordpro-kate-1t-fleet-manager": {
    summary:
      "Fleet manager focused on control, uptime, productivity, and plug-and-play adaptability across diverse 1T operations.",
    traits: ["Operationally rigorous", "Data-led", "Systems thinker", "Risk-managed"],
    tags: ["Ford Pro", "Fleet", "1T", "Productivity"],
    brand: "Ford Pro",
    goals: [
      "Increase utilization and reduce downtime",
      "Standardize fleet where practical",
      "Deploy flexible configurations quickly",
    ],
    jobsToBeDone: [
      "Manage mixed-use fleet requirements",
      "Track maintenance and driver performance",
      "Scale operations without complexity spikes",
    ],
    decisionCriteria: [
      "Service network and parts availability",
      "Telematics and operational visibility",
      "Upfit compatibility and deployment speed",
      "TCO predictability",
    ],
    objections: [
      "Vendor fragmentation",
      "Unproven integrations",
      "Hidden lifecycle costs",
    ],
    channels: ["Fleet associations", "Industry events", "Procurement partners"],
    preferredContent: ["Operational dashboards", "Pilot program results", "ROI case studies"],
  },
  "ford-tourneo-ana-dual-use-owner": {
    summary:
      "Busy mother and small-business owner seeking one versatile vehicle balancing family comfort, city confidence, style, and weekend adventure.",
    traits: ["Multi-role planner", "Efficiency-minded", "Style-aware", "Practical"],
    tags: ["Ford Tourneo", "Dual-use", "Family", "Small business"],
    brand: "Ford",
    goals: [
      "Reduce complexity with one versatile vehicle",
      "Keep family comfortable and safe",
      "Support business mobility without sacrificing style",
    ],
    jobsToBeDone: [
      "Family transportation",
      "Client and business errands",
      "Weekend recreation with flexible storage",
    ],
    decisionCriteria: [
      "Cabin flexibility and comfort",
      "Urban maneuverability",
      "Design and brand feel",
      "Running cost predictability",
    ],
    objections: [
      "Compromise risk between family and business needs",
      "Vehicle may feel too commercial for personal use",
      "Overly complex interfaces",
    ],
    channels: ["Parent networks", "Lifestyle content", "Dealer comparison visits"],
    preferredContent: ["Real-life usage walkthroughs", "Family comfort demos", "Urban driving reviews"],
  },
  "ford-nugget-noah-camper-owner": {
    summary:
      "Family-focused camper and musician prioritizing long-term road-trip comfort, home-away-from-home utility, and practical daily access.",
    traits: ["Experience-driven", "Family-oriented", "Long-term planner", "Creative"],
    tags: ["Ford Nugget", "Camper", "Family travel", "Lifestyle"],
    brand: "Ford",
    goals: [
      "Maximize comfort during multi-day trips",
      "Keep everyday usability with sub-2m access",
      "Invest in durable long-term travel platform",
    ],
    jobsToBeDone: [
      "Road-trip accommodation",
      "Transport family and music gear",
      "Set up quickly at campsites",
    ],
    decisionCriteria: [
      "Interior layout efficiency",
      "Campsite utility features",
      "Daily drivability and parking compatibility",
      "Reliability over long ownership horizon",
    ],
    objections: [
      "Compromise between compact exterior and liveable interior",
      "Long-term maintenance burden",
      "Insufficient storage for mixed family/gear use",
    ],
    channels: ["Camper communities", "YouTube tours", "Owner groups", "Dealer demos"],
    preferredContent: ["Layout tours", "Long-term ownership stories", "Road-trip setup guides"],
  },
  "range-rover-urban-executive-elite": {
    summary:
      "Affluent EU/US professionals using Range Rover as a luxury daily family driver and status symbol with low price sensitivity.",
    traits: ["Prestige-driven", "Convenience-first", "Quality-demanding", "Time-sensitive"],
    tags: ["Range Rover", "Luxury", "Executive", "Status"],
    brand: "Range Rover",
    goals: [
      "Maintain premium everyday comfort",
      "Project success and refined taste",
      "Receive seamless ownership support",
    ],
    jobsToBeDone: [
      "Executive commuting",
      "Family transport in premium comfort",
      "Social and business arrival presence",
    ],
    decisionCriteria: [
      "Cabin quality and ride refinement",
      "Technology experience",
      "Brand prestige",
      "Service responsiveness",
    ],
    objections: [
      "Perceived reliability risk",
      "Outdated technology vs competitors",
      "Inconsistent premium service delivery",
    ],
    channels: ["Private dealer networks", "Luxury publications", "Peer recommendations"],
    preferredContent: ["Concierge ownership programs", "Luxury comparison briefs", "Design showcases"],
  },
  "range-rover-middle-east-desert-adventurer": {
    summary:
      "Ultra-wealthy buyer needing true dual-use luxury and real desert capability, with strong exclusivity and VIP expectations.",
    traits: ["Exclusivity-seeking", "Capability-demanding", "Service-sensitive", "Image-conscious"],
    tags: ["Range Rover", "Middle East", "Desert", "Ultra-luxury"],
    brand: "Range Rover",
    goals: [
      "Own a fully capable desert and city flagship",
      "Secure bespoke and exclusive specification",
      "Receive VIP-level purchase and service treatment",
    ],
    jobsToBeDone: [
      "Luxury city driving",
      "High-confidence dune and desert use",
      "Showcase exclusivity in social circles",
    ],
    decisionCriteria: [
      "Heat resilience and reliability",
      "Off-road capability under real conditions",
      "Customization depth",
      "Priority aftersales support",
    ],
    objections: [
      "Any reliability weakness in extreme heat",
      "Perceived lack of exclusivity",
      "Slow or generic service response",
    ],
    channels: ["Private advisors", "VIP dealer programs", "Regional luxury events"],
    preferredContent: ["Desert performance validation", "Bespoke options catalogs", "VIP ownership benefits"],
  },
  "range-rover-british-countryside-traditionalist": {
    summary:
      "Rural buyer needing towing and off-road practicality blended with luxury heritage, loyal to relationship-led purchasing.",
    traits: ["Heritage-oriented", "Practical luxury", "Loyal", "Value-aware"],
    tags: ["Range Rover", "Countryside", "Heritage", "Towing"],
    brand: "Range Rover",
    goals: [
      "Maintain all-terrain capability for estate/rural life",
      "Retain high comfort and craftsmanship",
      "Work with trusted long-term dealer relationships",
    ],
    jobsToBeDone: [
      "Rural and mixed-surface driving",
      "Towing and practical load use",
      "Family and guest transport in comfort",
    ],
    decisionCriteria: [
      "Towing and off-road competence",
      "Durability in poor weather conditions",
      "Craftsmanship quality",
      "Dealer trust and continuity",
    ],
    objections: [
      "Overly digital user experiences",
      "Weak long-term durability",
      "Poor value versus capability delivered",
    ],
    channels: ["Dealer relationships", "Rural community referrals", "Specialist press"],
    preferredContent: ["Long-term ownership stories", "Towing/off-road tests", "Service package clarity"],
  },
  "mclaren-ahmed-collector-economic-buyer": {
    summary:
      "UHNWI collector prioritizing rarity, bespoke access, and social prestige with minimal price sensitivity.",
    traits: ["Collector mindset", "Exclusivity-led", "Prestige-focused", "Relationship-driven"],
    tags: ["McLaren", "Collector", "UHNWI", "Bespoke"],
    brand: "McLaren",
    goals: [
      "Acquire low-volume and collectible allocations",
      "Maximize exclusivity and social signaling",
      "Access private programs and early launches",
    ],
    jobsToBeDone: [
      "Curate trophy collection",
      "Attend private events and unveilings",
      "Build long-term brand relationship advantages",
    ],
    decisionCriteria: [
      "Rarity and allocation access",
      "Bespoke customization capability",
      "Brand prestige trajectory",
      "White-glove ownership treatment",
    ],
    objections: [
      "High production volumes reducing exclusivity",
      "Limited bespoke flexibility",
      "Inadequate VIP treatment",
    ],
    channels: ["Private client managers", "Collector networks", "Invitation-only events"],
    preferredContent: ["Allocation previews", "Bespoke portfolios", "Collector market insights"],
  },
  "mclaren-claire-lifestyle-influencer": {
    summary:
      "Lifestyle buyer seeking calm sophistication, daily usability, and taste-signaling design with strong reassurance on refinement.",
    traits: ["Taste-led", "Refinement-focused", "Image-conscious", "Usability-aware"],
    tags: ["McLaren", "Lifestyle", "Influencer", "Daily usability"],
    brand: "McLaren",
    goals: [
      "Own a sophisticated and usable premium supercar",
      "Signal elevated taste without excess theatrics",
      "Feel confident in reliability and quality day-to-day",
    ],
    jobsToBeDone: [
      "Daily premium driving",
      "Brand and content storytelling",
      "Comfortable short and medium trips",
    ],
    decisionCriteria: [
      "Cabin comfort and finish quality",
      "Ease of daily operation",
      "Design elegance",
      "Brand reassurance and support",
    ],
    objections: [
      "Fear of unreliable ownership experience",
      "Harsh ride/comfort tradeoffs",
      "Perception of impracticality",
    ],
    channels: ["Luxury lifestyle media", "Creator communities", "Concierge dealer channels"],
    preferredContent: ["Daily usability reviews", "Refinement comparisons", "Ownership reassurance content"],
  },
  "mclaren-david-end-user-champion": {
    summary:
      "Technical enthusiast buying for engineering purity and driving thrill, active in track and community environments.",
    traits: ["Engineering-driven", "Performance-purist", "Technical", "Community-engaged"],
    tags: ["McLaren", "Track", "Enthusiast", "Engineering purity"],
    brand: "McLaren",
    goals: [
      "Maximize driving engagement and precision",
      "Own uncompromised performance engineering",
      "Participate deeply in track and enthusiast communities",
    ],
    jobsToBeDone: [
      "Track-day performance",
      "Technical setup optimization",
      "Community advocacy and comparison benchmarking",
    ],
    decisionCriteria: [
      "Chassis and handling feedback quality",
      "Powertrain response and endurance",
      "Weight and aero efficiency",
      "Engineering transparency",
    ],
    objections: [
      "Feature compromises that dilute performance focus",
      "Brand moves perceived as marketing-led over engineering-led",
      "Inconsistent dynamic behavior under hard use",
    ],
    channels: ["Track communities", "Technical reviewers", "Brand performance events"],
    preferredContent: ["Engineering deep-dives", "Track telemetry comparisons", "Setup and tuning guides"],
  },
};

function buildSeedPersonas(): Record<string, CustomerPersona> {
  const out: Record<string, CustomerPersona> = {};
  Object.values(seedPersonaProfiles).forEach((profile) => {
    const extra = seedEnrichment[profile.id] ?? {};
    out[profile.id] = normalizePersona(
      {
        ...profile,
        ...extra,
        meta: { source: "seed", createdAt: "seed", updatedAt: "seed" },
      },
      "seed"
    );
  });
  return out;
}

/**
 * PersonasProvider - Compatibility wrapper around Zustand store.
 * Initializes the store with seed personas and loads from DB on mount.
 */
export function PersonasProvider({ children }: { children: React.ReactNode }) {
  const seedPersonas = React.useMemo(() => buildSeedPersonas(), []);
  const initializePersonas = usePersonasStore((s) => s.initializePersonas);
  const loadPersonas = usePersonasStore((s) => s.loadPersonas);

  // Initialize with seed personas on first mount
  React.useEffect(() => {
    initializePersonas(seedPersonas);
  }, [seedPersonas, initializePersonas]);

  // Load personas from DB on mount
  React.useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  return <>{children}</>;
}

/**
 * usePersonas - Direct hook to Zustand store.
 * Provides personas state and actions.
 */
export function usePersonas() {
  return usePersonasStore();
}
