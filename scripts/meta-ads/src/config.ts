export const CAMPAIGN = {
  name: 'IL_PayrollCheck_Leads_2025',
  objective: 'OUTCOME_LEADS',
  specialAdCategories: [] as string[],
  status: 'PAUSED' as const,
  dailyBudgetAgorot: 5000, // ₪50 = 5000 agorot
  currency: 'ILS',
};

export interface AdSetConfig {
  name: string;
  targeting: {
    geo_locations: { countries: string[] };
    age_min: number;
    age_max: number;
    locales: number[];
    flexible_spec?: Array<{ interests: Array<{ id: string; name: string }> }>;
  };
  /** Terms to search for interest IDs (resolved at runtime). */
  interestSearchTerms?: string[];
}

export const AD_SETS: AdSetConfig[] = [
  {
    name: 'IL_PC_Broad-2055',
    targeting: {
      geo_locations: { countries: ['IL'] },
      age_min: 20,
      age_max: 55,
      locales: [45], // Hebrew
    },
    // No detailed targeting — fully broad
    // No publisher_platforms — Advantage+ placements
  },
  {
    name: 'IL_PC_Interest-Employees',
    targeting: {
      geo_locations: { countries: ['IL'] },
      age_min: 20,
      age_max: 55,
      locales: [45],
      flexible_spec: [{ interests: [] }], // Populated by interest search
    },
    interestSearchTerms: [
      'salary',
      'workers rights',
      'labor law',
      'Histadrut',
      'payroll',
    ],
  },
];

export const API_VERSION = 'v21.0';
export const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;
