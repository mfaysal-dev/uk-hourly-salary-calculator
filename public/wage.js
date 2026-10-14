// UK hourly ↔ salary conversion and National Minimum Wage / National Living Wage check.
// Source: https://www.gov.uk/national-minimum-wage-rates (checked 8 October 2026). Rates change on 1 April each year.

export const NMW_RATES = [
  { from: '2026-04-01', to: '2027-03-31', label: 'April 2026 to March 2027', rates: { '21+': 12.71, '18-20': 10.85, 'u18': 8.00, 'apprentice': 8.00 } },
  { from: '2025-04-01', to: '2026-03-31', label: 'April 2025 to March 2026', rates: { '21+': 12.21, '18-20': 10.00, 'u18': 7.55, 'apprentice': 7.55 } },
  { from: '2024-04-01', to: '2025-03-31', label: 'April 2024 to March 2025', rates: { '21+': 11.44, '18-20': 8.60, 'u18': 6.40, 'apprentice': 6.40 } },
];

export const AGE_GROUPS = {
  '21+': 'Aged 21 and over (National Living Wage)',
  '18-20': 'Aged 18 to 20',
  'u18': 'Under 18 (above school leaving age)',
  'apprentice': 'Apprentice (under 19, or in the first year)',
};

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function ratesFor(dateISO) {
  return NMW_RATES.find((p) => dateISO >= p.from && dateISO <= p.to) || (dateISO > NMW_RATES[0].to ? NMW_RATES[0] : null);
}

export function ageGroup(age, apprentice = false, firstYear = false) {
  if (apprentice && (age < 19 || firstYear)) return 'apprentice';
  if (age >= 21) return '21+';
  if (age >= 18) return '18-20';
  return 'u18';
}

/** Convert any pay figure to every period. hours = paid hours per week, days = working days per week, weeks = paid weeks per year. */
export function convert({ amount, period = 'hour', hours = 37.5, days = 5, weeks = 52 }) {
  amount = Math.max(0, +amount || 0);
  hours = Math.max(0.1, +hours || 37.5); days = Math.max(1, +days || 5); weeks = Math.max(1, Math.min(52.2, +weeks || 52));
  let yearly;
  switch (period) {
    case 'hour': yearly = amount * hours * weeks; break;
    case 'day': yearly = amount * days * weeks; break;
    case 'week': yearly = amount * weeks; break;
    case 'month': yearly = amount * 12; break;
    default: yearly = amount;
  }
  const weekly = yearly / weeks;
  return {
    yearly: r2(yearly), monthly: r2(yearly / 12), weekly: r2(weekly), daily: r2(weekly / days), hourly: r2(weekly / hours),
    hourlyExact: weekly / hours, hoursPerYear: r2(hours * weeks),
  };
}

export function minimumWageCheck({ hourly, age = 25, apprentice = false, firstYear = false, date = '2026-10-08' }) {
  const period = ratesFor(date);
  if (!period) return null;
  const group = ageGroup(age, apprentice, firstYear);
  const minimum = period.rates[group];
  const diff = r2(hourly - minimum);
  return { group, groupLabel: AGE_GROUPS[group], minimum, period, ok: hourly + 1e-9 >= minimum, diff, pctAbove: r2((hourly / minimum - 1) * 100) };
}

/** Yearly pay at the minimum hourly rate for a given number of weekly hours. */
export function minimumAnnual(minimum, hours = 37.5, weeks = 52) {
  return r2(minimum * hours * weeks);
}
