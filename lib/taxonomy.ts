export type CategoryKey =
  | "small_business"
  | "real_estate"
  | "energy_infra"
  | "funds"
  | "tech_startups"
  | "services";

export type Subcategory = { key: string; label: string };

export const TAXONOMY: Record<
  CategoryKey,
  { label: string; subcategories: Subcategory[] }
> = {
  small_business: {
    label: "Small Businesses",
    subcategories: [
      { key: "hospitality", label: "Hospitality (restaurants, coffee, bars)" },
      { key: "retail", label: "Retail" },
      { key: "automotive", label: "Automotive (repair, tire, detailing)" },
      { key: "home_services", label: "Home & Local Services (HVAC, plumbing, etc.)" },
      { key: "health_wellness", label: "Health & Wellness" },
      { key: "franchise", label: "Franchises" },
      { key: "industrial", label: "Industrial / Light Manufacturing" },
      { key: "ecom", label: "E-commerce / Brands" },
      { key: "other_small_business", label: "Other" },
    ],
  },
  real_estate: {
    label: "Real Estate",
    subcategories: [
      { key: "multifamily", label: "Multifamily" },
      { key: "sfr", label: "Single-family / SFR portfolios" },
      { key: "industrial_re", label: "Industrial" },
      { key: "retail_re", label: "Retail centers" },
      { key: "office", label: "Office" },
      { key: "hospitality_re", label: "Hospitality real estate" },
      { key: "self_storage", label: "Self-storage" },
      { key: "development", label: "Development / Ground-up" },
      { key: "land", label: "Land" },
      { key: "mixed_use", label: "Mixed-use" },
      { key: "other_re", label: "Other" },
    ],
  },
  energy_infra: {
    label: "Energy / Infrastructure",
    subcategories: [
      { key: "gas_station", label: "Gas stations / convenience" },
      { key: "car_wash", label: "Car wash" },
      { key: "ev_charging", label: "EV charging" },
      { key: "logistics", label: "Logistics / warehousing" },
      { key: "utilities", label: "Utilities / grid / power" },
      { key: "other_energy", label: "Other" },
    ],
  },
  funds: {
    label: "Funds",
    subcategories: [
      { key: "private_equity", label: "Private equity" },
      { key: "re_fund", label: "Real estate fund" },
      { key: "credit_fund", label: "Credit / debt fund" },
      { key: "venture", label: "Venture" },
      { key: "search_fund", label: "Search fund" },
      { key: "other_funds", label: "Other" },
    ],
  },
  tech_startups: {
    label: "Tech / Startups",
    subcategories: [
      { key: "saas", label: "SaaS" },
      { key: "ai", label: "AI" },
      { key: "fintech", label: "Fintech" },
      { key: "marketplaces", label: "Marketplaces" },
      { key: "consumer", label: "Consumer apps" },
      { key: "hardware", label: "Hardware" },
      { key: "other_tech", label: "Other" },
    ],
  },
  services: {
    label: "Services (B2B)",
    subcategories: [
      { key: "staffing", label: "Staffing" },
      { key: "agency", label: "Agency / marketing" },
      { key: "managed_it", label: "Managed services / IT" },
      { key: "construction", label: "Construction / trades (commercial)" },
      { key: "other_services", label: "Other" },
    ],
  },
};

const allSubcategories = Object.values(TAXONOMY).flatMap((c) => c.subcategories);

export function categoryLabel(key: string): string {
  return TAXONOMY[key as CategoryKey]?.label ?? key;
}

export function subcategoryLabel(key: string): string {
  return allSubcategories.find((s) => s.key === key)?.label ?? key;
}
