import type { PersonaProfile } from "@/lib/llm-client";

export const personas: Record<string, PersonaProfile> = {
  "fleet-manager": {
    id: "fleet-manager",
    name: "Fleet Manager",
    attributes: {
      role: "Corporate Fleet Manager",
      company_size: "Large Enterprise",
      responsibility: "Managing 50-500 vehicles",
      decision_authority: "High",
    },
    demographics: {
      age: "35-50 years old",
      income: "$80,000-$120,000",
      family: "Married with children",
      location: "Urban/Suburban",
    },
    motivations: [
      "Minimize total cost of ownership",
      "Maximize fleet uptime and reliability",
      "Improve driver safety and satisfaction",
      "Meet corporate sustainability goals",
      "Simplify maintenance and operations",
    ],
    painPoints: [
      "Unexpected maintenance costs",
      "Vehicle downtime affecting operations",
      "Driver complaints about comfort/features",
      "Fuel costs and environmental compliance",
      "Complex vendor management",
    ],
    buyingBehavior: [
      "Focuses on ROI and business case",
      "Values proven reliability over cutting-edge features",
      "Considers long-term operational costs",
      "Requires detailed specifications and warranties",
      "Negotiates volume discounts and service packages",
    ],
  },

  "small-business-owner": {
    id: "small-business-owner",
    name: "Small Business Owner",
    attributes: {
      role: "Owner/Operator",
      company_size: "1-25 employees",
      responsibility: "All business decisions",
      decision_authority: "Complete",
    },
    demographics: {
      age: "30-55 years old",
      income: "$50,000-$150,000",
      family: "Mixed family situations",
      location: "Small town/Suburban",
    },
    motivations: [
      "Maximize value for money spent",
      "Support business growth and efficiency",
      "Maintain professional image",
      "Ensure reliable daily operations",
      "Build long-term business assets",
    ],
    painPoints: [
      "Limited budget for vehicle expenses",
      "Cannot afford unexpected repairs",
      "Need vehicles that work for business and personal use",
      "Difficulty accessing financing options",
      "Limited time for vehicle research and shopping",
    ],
    buyingBehavior: [
      "Highly price-sensitive",
      "Values versatility and multi-purpose use",
      "Prefers simple, reliable solutions",
      "Researches extensively before purchasing",
      "Considers resale value important",
    ],
  },

  "individual-buyer": {
    id: "individual-buyer",
    name: "Individual Buyer",
    attributes: {
      role: "Personal Vehicle Owner",
      company_size: "N/A",
      responsibility: "Personal/Family transportation",
      decision_authority: "Personal/Household",
    },
    demographics: {
      age: "25-65 years old",
      income: "$40,000-$100,000",
      family: "Various family structures",
      location: "Mixed urban/suburban/rural",
    },
    motivations: [
      "Meet family transportation needs",
      "Express personal style and preferences",
      "Ensure safety and comfort",
      "Get good value for investment",
      "Enjoy driving experience",
    ],
    painPoints: [
      "Balancing wants vs. budget constraints",
      "Uncertainty about long-term reliability",
      "Complexity of financing and insurance",
      "Rapidly changing technology",
      "Maintenance and repair costs",
    ],
    buyingBehavior: [
      "Emotional and rational decision factors",
      "Values brand reputation and reviews",
      "Considers appearance and features important",
      "Influenced by family/friends opinions",
      "May prioritize monthly payment over total cost",
    ],
  },

  "nissan-young-family-qashqai-owner": {
    id: "nissan-young-family-qashqai-owner",
    name: "Sophie & Marc - Young Family Qashqai Primary-Car Owner",
    attributes: {
      role: "Primary household vehicle buyers",
      company_size: "N/A",
      responsibility: "Select one do-it-all family car",
      decision_authority: "Joint household decision",
    },
    demographics: {
      age: "Early to mid 30s",
      income: "$70,000-$120,000 household",
      family: "Couple with young children",
      location: "Suburban",
    },
    motivations: [
      "Keep children safe in daily driving",
      "Stay within a comfortable monthly payment",
      "Buy one vehicle that covers commute, school, and weekend trips",
      "Choose a modern-looking crossover they are proud to own",
    ],
    painPoints: [
      "Budget pressure from mortgage and childcare",
      "Fear of unexpected maintenance costs",
      "Confusion across crowded compact SUV options",
      "Balancing style, safety, and affordability",
    ],
    buyingBehavior: [
      "Shortlists practical crossovers with strong safety ratings",
      "Compares monthly payment, insurance, and fuel costs",
      "Heavily uses online reviews and owner feedback",
      "Test drives with child-seat and stroller practicality in mind",
    ],
  },

  "nissan-empty-nester-qashqai-owner": {
    id: "nissan-empty-nester-qashqai-owner",
    name: "Elena & Marco - Active Empty-Nester Qashqai Owner",
    attributes: {
      role: "Active empty-nester household buyers",
      company_size: "N/A",
      responsibility: "Replace main daily vehicle with less stress",
      decision_authority: "Joint household decision",
    },
    demographics: {
      age: "Late 50s to mid 60s",
      income: "$90,000-$160,000 household",
      family: "Couple, grown children",
      location: "Suburban / edge-of-city",
    },
    motivations: [
      "Easy ingress and egress for daily comfort",
      "Strong visibility and confidence while driving",
      "ADAS features that reduce fatigue and stress",
      "Predictable total ownership costs",
    ],
    painPoints: [
      "Dislikes overcomplicated infotainment systems",
      "Sensitivity to repair hassle and downtime",
      "Concerns about long-term reliability",
      "Wants comfort without stepping up to oversized SUVs",
    ],
    buyingBehavior: [
      "Prioritizes ergonomic comfort and seating position in test drives",
      "Values dealer reputation and service quality",
      "Prefers intuitive controls over feature overload",
      "Favors proven trims with clear value",
    ],
  },

  "rivian-outdoor-adventurer": {
    id: "rivian-outdoor-adventurer",
    name: "Outdoor Enthusiast / Off-Road Adventurer",
    attributes: {
      role: "Adventure-first premium EV buyer",
      company_size: "N/A",
      responsibility: "Select vehicle for backcountry use",
      decision_authority: "Primary individual decision-maker",
    },
    demographics: {
      age: "Mid 30s",
      income: "$180,000+",
      family: "Single or couple, no children at home",
      location: "Mountain west / outdoors-oriented metros",
    },
    motivations: [
      "Real off-road capability with confidence",
      "Utility for gear-heavy trips and towing",
      "Electric ownership aligned with sustainability values",
      "Brand that signals authentic adventure lifestyle",
    ],
    painPoints: [
      "Will not accept capability compromises for eco messaging",
      "Range anxiety on remote routes",
      "Charging logistics in outdoor destinations",
      "Durability concerns under harsh use",
    ],
    buyingBehavior: [
      "Researches approach angles, clearance, and terrain modes deeply",
      "Follows enthusiast communities and field reviews",
      "Pays premium for proven capability and reliability",
      "Evaluates accessory ecosystem and cargo solutions",
    ],
  },

  "rivian-tech-savvy-urbanite": {
    id: "rivian-tech-savvy-urbanite",
    name: "Tech-Savvy Urbanite / Early Adopter",
    attributes: {
      role: "High-earning urban early adopter",
      company_size: "N/A",
      responsibility: "Choose premium EV as tech-forward lifestyle signal",
      decision_authority: "Primary individual decision-maker",
    },
    demographics: {
      age: "Early 30s",
      income: "$200,000+",
      family: "Single or partnered, no kids",
      location: "Tier-1 urban cores",
    },
    motivations: [
      "Own cutting-edge technology and software experience",
      "Stand out through design and brand status",
      "Drive an EV that looks versatile and aspirational",
      "Enjoy premium connectivity and convenience features",
    ],
    painPoints: [
      "Poor software UX or laggy updates",
      "Inconsistent charging experience in dense cities",
      "Cabin quality mismatches at premium price points",
      "Worries about novelty wearing off",
    ],
    buyingBehavior: [
      "Adopts early and values over-the-air improvements",
      "Prioritizes design, UI polish, and perceived innovation",
      "Influenced by peer network and social visibility",
      "Accepts high pricing if experience feels category-leading",
    ],
  },

  "rivian-environmentally-conscious-family": {
    id: "rivian-environmentally-conscious-family",
    name: "Environmentally Conscious Family",
    attributes: {
      role: "Family EV decision-makers",
      company_size: "N/A",
      responsibility: "Purchase safe, spacious 3-row EV",
      decision_authority: "Joint household decision",
    },
    demographics: {
      age: "Late 30s to mid 40s",
      income: "$130,000-$220,000 household",
      family: "Family with two or more children",
      location: "Suburban",
    },
    motivations: [
      "Reduce household carbon footprint",
      "Prioritize family safety and practicality",
      "Get flexible space for school, sports, and travel",
      "Simplify ownership with home charging and low maintenance",
    ],
    painPoints: [
      "Trip planning complexity for long-distance family drives",
      "Concerns about charging reliability with children on board",
      "Premium EV pricing pressure",
      "Need confidence in long-term battery and resale value",
    ],
    buyingBehavior: [
      "Compares safety data, third-row usability, and cargo volume",
      "Values ownership calculators and real-world range reviews",
      "Prioritizes family convenience features over raw speed",
      "Seeks brand values that align with sustainability goals",
    ],
  },

  "fordpro-dave-artisan-van-owner-operator": {
    id: "fordpro-dave-artisan-van-owner-operator",
    name: "Dave - Artisan Van Owner-Operator",
    attributes: {
      role: "Independent tradesperson",
      company_size: "1-5 employees",
      responsibility: "Run daily operations from van platform",
      decision_authority: "Owner decision-maker",
    },
    demographics: {
      age: "Late 30s to late 40s",
      income: "$70,000-$140,000",
      family: "Partnered, with or without children",
      location: "Suburban / regional town",
    },
    motivations: [
      "Dependable uptime for business continuity",
      "Secure storage for expensive tools",
      "Professional appearance as a mobile business card",
      "Cabin that functions as a mobile office",
    ],
    painPoints: [
      "Vehicle downtime directly hurts income",
      "Tool theft and cargo security risk",
      "High fuel and maintenance costs",
      "Need to balance payload with daily comfort",
    ],
    buyingBehavior: [
      "Calculates cost of downtime and service intervals",
      "Prioritizes reliability and dealer support speed",
      "Invests in upfit solutions for workflow efficiency",
      "Values practical technology over gimmicks",
    ],
  },

  "fordpro-kate-1t-fleet-manager": {
    id: "fordpro-kate-1t-fleet-manager",
    name: "Kate - 1T Fleet Manager",
    attributes: {
      role: "1T commercial fleet manager",
      company_size: "Mid to large enterprise",
      responsibility: "Control uptime, cost, and fleet productivity",
      decision_authority: "High purchasing authority",
    },
    demographics: {
      age: "40-55 years old",
      income: "$95,000-$150,000",
      family: "Married with children",
      location: "Urban / logistics hubs",
    },
    motivations: [
      "Maximize uptime and route productivity",
      "Standardize fleet specs for easier management",
      "Enable quick plug-and-play upfit adaptability",
      "Improve driver compliance and safety outcomes",
    ],
    painPoints: [
      "Downtime and service bottlenecks",
      "Spec complexity across mixed-use fleets",
      "Pressure to reduce operating cost volatility",
      "Need clear telematics and service visibility",
    ],
    buyingBehavior: [
      "Procures on TCO and uptime guarantees",
      "Requires proven service network and parts availability",
      "Prioritizes vehicles with scalable upfit ecosystems",
      "Runs pilot programs before full-rollout decisions",
    ],
  },

  "ford-tourneo-ana-dual-use-owner": {
    id: "ford-tourneo-ana-dual-use-owner",
    name: "Ana - Dual-use Tourneo Owner",
    attributes: {
      role: "Parent and small-business owner",
      company_size: "Self-employed / micro-business",
      responsibility: "One vehicle for family and business needs",
      decision_authority: "Primary household decision-maker",
    },
    demographics: {
      age: "Mid 30s to mid 40s",
      income: "$80,000-$140,000 household",
      family: "Family with children",
      location: "City fringe / suburban",
    },
    motivations: [
      "Versatility between family comfort and business utility",
      "Confident city maneuverability and parking",
      "Stylish vehicle she feels good arriving in",
      "Weekend capability for light adventures",
    ],
    painPoints: [
      "Compromises between family comfort and cargo needs",
      "Urban parking constraints with larger vehicles",
      "Time pressure and low tolerance for complexity",
      "Needs predictable running costs",
    ],
    buyingBehavior: [
      "Values configurable seating and smart storage",
      "Compares practicality features in real-life scenarios",
      "Prefers intuitive tech that works immediately",
      "Balances emotion, style, and rational cost factors",
    ],
  },

  "ford-nugget-noah-camper-owner": {
    id: "ford-nugget-noah-camper-owner",
    name: "Noah - Nugget Camper Owner",
    attributes: {
      role: "Family camper and musician",
      company_size: "N/A",
      responsibility: "Choose long-term travel-ready camper",
      decision_authority: "Household lead decision-maker",
    },
    demographics: {
      age: "Late 30s to early 40s",
      income: "$90,000-$160,000 household",
      family: "Partner with children",
      location: "Suburban / edge-of-city",
    },
    motivations: [
      "Create a home-away-from-home for road trips",
      "Maintain everyday drivability under 2m access limits",
      "Comfortable sleeping, cooking, and storage setup",
      "Reliable long-distance ownership confidence",
    ],
    painPoints: [
      "Camper tradeoffs between compact size and interior comfort",
      "Worries about long-term wear from heavy use",
      "Needs weather-resilient campsite features",
      "High total spend requires confidence in value retention",
    ],
    buyingBehavior: [
      "Compares layout efficiency and sleeping practicality",
      "Evaluates campsite setup speed and convenience",
      "Reads owner forums for reliability and real use feedback",
      "Prefers proven engineering over novelty features",
    ],
  },

  "range-rover-urban-executive-elite": {
    id: "range-rover-urban-executive-elite",
    name: "Urban Executive Elite (EU/US Range Rover)",
    attributes: {
      role: "Affluent executive household buyer",
      company_size: "N/A",
      responsibility: "Select luxury daily family SUV",
      decision_authority: "High personal authority",
    },
    demographics: {
      age: "40-60 years old",
      income: "$300,000+ household",
      family: "Family household",
      location: "Major EU/US metro areas",
    },
    motivations: [
      "Experience premium comfort and refinement daily",
      "Project status and success through vehicle choice",
      "Access top-tier in-car tech and concierge-like convenience",
      "Keep ownership effortless with premium service",
    ],
    painPoints: [
      "Low tolerance for poor aftersales response",
      "Dislikes noisy cabins or dated infotainment UX",
      "Expects flawless fit and finish at all times",
      "Annoyed by reliability disruption to schedule",
    ],
    buyingBehavior: [
      "Shops premium trims with low price sensitivity",
      "Prioritizes brand prestige and design presence",
      "Expects high-touch sales and service experience",
      "Values comfort, technology, and effortless ownership equally",
    ],
  },

  "range-rover-middle-east-desert-adventurer": {
    id: "range-rover-middle-east-desert-adventurer",
    name: "Middle East Elite - Desert Adventurer (Range Rover)",
    attributes: {
      role: "Ultra-high-net-worth luxury adventurer",
      company_size: "N/A",
      responsibility: "Select dual-use luxury and desert-capable SUV",
      decision_authority: "Single final decision-maker",
    },
    demographics: {
      age: "35-55 years old",
      income: "$1M+ household",
      family: "Large affluent household",
      location: "GCC major cities and desert regions",
    },
    motivations: [
      "Combine city luxury with true dune capability",
      "Demand extreme-heat resilience and reliability",
      "Receive VIP treatment and bespoke ownership experiences",
      "Own highly exclusive specifications",
    ],
    painPoints: [
      "Will not tolerate overheating or durability issues in harsh climate",
      "Expects immediate premium service and priority access",
      "Rejects products that feel common or non-exclusive",
      "Needs confidence in off-road performance claims",
    ],
    buyingBehavior: [
      "Buys top specifications with personalization",
      "Values proven desert performance and cooling robustness",
      "Purchases through trusted dealer relationships",
      "Prefers brands that deliver exclusivity and status reinforcement",
    ],
  },

  "range-rover-british-countryside-traditionalist": {
    id: "range-rover-british-countryside-traditionalist",
    name: "British Countryside Traditionalist (Range Rover)",
    attributes: {
      role: "Rural estate lifestyle buyer",
      company_size: "N/A",
      responsibility: "Maintain practical yet luxurious all-terrain mobility",
      decision_authority: "Primary household authority",
    },
    demographics: {
      age: "50-70 years old",
      income: "$180,000-$400,000 household",
      family: "Multi-generational or established family household",
      location: "UK rural / countryside estates",
    },
    motivations: [
      "Tow and traverse mixed terrain confidently",
      "Maintain traditional luxury and heritage values",
      "Build long-term trusted dealer relationships",
      "Balance premium quality with practical utility",
    ],
    painPoints: [
      "Skeptical of over-digitalized interfaces",
      "Needs durability in mud, rain, and poor road conditions",
      "Frustrated by inconsistent dealer follow-through",
      "Wants value discipline despite premium expectations",
    ],
    buyingBehavior: [
      "Loyal to heritage brands with proven capability",
      "Prioritizes towing, traction, and durability credentials",
      "Buys through relationship-driven dealership channels",
      "Expects premium quality but remains value-aware",
    ],
  },

  "mclaren-ahmed-collector-economic-buyer": {
    id: "mclaren-ahmed-collector-economic-buyer",
    name: "Ahmed - Collector / Economic Buyer (McLaren)",
    attributes: {
      role: "UHNWI collector",
      company_size: "N/A",
      responsibility: "Acquire rare, trophy-grade performance cars",
      decision_authority: "Single final decision-maker",
    },
    demographics: {
      age: "40-65 years old",
      income: "$5M+ household",
      family: "Established affluent household",
      location: "Global luxury hubs",
    },
    motivations: [
      "Secure rarity, bespoke details, and limited allocations",
      "Gain early access to halo programs and private events",
      "Strengthen social currency through iconic ownership",
      "Protect long-term collectible value",
    ],
    painPoints: [
      "Dislikes broad-volume models with diluted exclusivity",
      "Expects flawless white-glove treatment",
      "Low tolerance for allocation uncertainty",
      "Wants confidence in long-term desirability",
    ],
    buyingBehavior: [
      "Buys through relationships and invitation-only channels",
      "Prioritizes rarity over transactional value metrics",
      "Invests heavily in bespoke commissions",
      "Maintains diversified collection strategy across marques",
    ],
  },

  "mclaren-claire-lifestyle-influencer": {
    id: "mclaren-claire-lifestyle-influencer",
    name: "Claire - Lifestyle Buyer / Influencer (McLaren)",
    attributes: {
      role: "Luxury lifestyle creator and entrepreneur",
      company_size: "N/A",
      responsibility: "Choose premium daily-usable supercar",
      decision_authority: "Primary individual decision-maker",
    },
    demographics: {
      age: "Late 20s to late 30s",
      income: "$350,000+",
      family: "Single or partnered",
      location: "Urban luxury districts",
    },
    motivations: [
      "Signal taste through refined performance ownership",
      "Prioritize comfort and quality for frequent use",
      "Own design-forward vehicle with elegant presence",
      "Reduce ownership friction through reliable support",
    ],
    painPoints: [
      "Concerned about reliability and daily usability compromises",
      "Rejects harsh ride quality and noisy cabin experience",
      "Needs confidence in premium fit-and-finish",
      "Wants brand reassurance and responsive service",
    ],
    buyingBehavior: [
      "Prefers curated purchase journeys and clear guidance",
      "Selects options balancing elegance and practicality",
      "Values ownership confidence as much as performance stats",
      "Influenced by design reputation and social perception",
    ],
  },

  "mclaren-david-end-user-champion": {
    id: "mclaren-david-end-user-champion",
    name: "David - End User / Champion (McLaren)",
    attributes: {
      role: "Hardcore enthusiast and track-day driver",
      company_size: "N/A",
      responsibility: "Optimize purchase for engineering purity",
      decision_authority: "Primary individual decision-maker",
    },
    demographics: {
      age: "35-55 years old",
      income: "$250,000+",
      family: "Single or family household",
      location: "Performance-car enthusiast markets",
    },
    motivations: [
      "Maximize driving engagement and feedback",
      "Own uncompromised engineering-first product",
      "Participate in enthusiast communities and track events",
      "Access expert technical support and setup advice",
    ],
    painPoints: [
      "Dislikes compromises that dilute handling purity",
      "Frustrated by marketing over substance",
      "Needs confidence in thermal and mechanical endurance",
      "Wants precise, consistent driving dynamics",
    ],
    buyingBehavior: [
      "Studies technical specs in depth before purchase",
      "Benchmarks against peer enthusiast and track feedback",
      "Accepts premium cost for measurable performance gains",
      "Strong advocate when product engineering meets expectations",
    ],
  },
};
