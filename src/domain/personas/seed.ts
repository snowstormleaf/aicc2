import type { PersonaProfile } from "@/lib/llm-client";

export const personas: Record<string, PersonaProfile> = {
  'fleet-manager': {
    id: 'fleet-manager',
    name: 'Fleet Manager',
    attributes: {
      role: 'Corporate Fleet Manager',
      company_size: 'Large Enterprise',
      responsibility: 'Managing 50-500 vehicles',
      decision_authority: 'High'
    },
    demographics: {
      age: '35-50 years old',
      income: '$80,000-$120,000',
      family: 'Married with children',
      location: 'Urban/Suburban'
    },
    motivations: [
      'Minimize total cost of ownership',
      'Maximize fleet uptime and reliability',
      'Improve driver safety and satisfaction',
      'Meet corporate sustainability goals',
      'Simplify maintenance and operations'
    ],
    painPoints: [
      'Unexpected maintenance costs',
      'Vehicle downtime affecting operations',
      'Driver complaints about comfort/features',
      'Fuel costs and environmental compliance',
      'Complex vendor management'
    ],
    buyingBehavior: [
      'Focuses on ROI and business case',
      'Values proven reliability over cutting-edge features',
      'Considers long-term operational costs',
      'Requires detailed specifications and warranties',
      'Negotiates volume discounts and service packages'
    ]
  },

  'small-business-owner': {
    id: 'small-business-owner',
    name: 'Small Business Owner',
    attributes: {
      role: 'Owner/Operator',
      company_size: '1-25 employees',
      responsibility: 'All business decisions',
      decision_authority: 'Complete'
    },
    demographics: {
      age: '30-55 years old',
      income: '$50,000-$150,000',
      family: 'Mixed family situations',
      location: 'Small town/Suburban'
    },
    motivations: [
      'Maximize value for money spent',
      'Support business growth and efficiency',
      'Maintain professional image',
      'Ensure reliable daily operations',
      'Build long-term business assets'
    ],
    painPoints: [
      'Limited budget for vehicle expenses',
      'Cannot afford unexpected repairs',
      'Need vehicles that work for business and personal use',
      'Difficulty accessing financing options',
      'Limited time for vehicle research and shopping'
    ],
    buyingBehavior: [
      'Highly price-sensitive',
      'Values versatility and multi-purpose use',
      'Prefers simple, reliable solutions',
      'Researches extensively before purchasing',
      'Considers resale value important'
    ]
  },

  'individual-buyer': {
    id: 'individual-buyer',
    name: 'Individual Buyer',
    attributes: {
      role: 'Personal Vehicle Owner',
      company_size: 'N/A',
      responsibility: 'Personal/Family transportation',
      decision_authority: 'Personal/Household'
    },
    demographics: {
      age: '25-65 years old',
      income: '$40,000-$100,000',
      family: 'Various family structures',
      location: 'Mixed urban/suburban/rural'
    },
    motivations: [
      'Meet family transportation needs',
      'Express personal style and preferences',
      'Ensure safety and comfort',
      'Get good value for investment',
      'Enjoy driving experience'
    ],
    painPoints: [
      'Balancing wants vs. budget constraints',
      'Uncertainty about long-term reliability',
      'Complexity of financing and insurance',
      'Rapidly changing technology',
      'Maintenance and repair costs'
    ],
    buyingBehavior: [
      'Emotional and rational decision factors',
      'Values brand reputation and reviews',
      'Considers appearance and features important',
      'Influenced by family/friends opinions',
      'May prioritize monthly payment over total cost'
    ]
  }
};
