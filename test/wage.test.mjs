import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert, minimumWageCheck, ratesFor, ageGroup, minimumAnnual } from '../public/wage.js';

test('April 2026 rates from GOV.UK: £12.71, £10.85, £8, £8', () => {
  const p = ratesFor('2026-04-01');
  assert.deepEqual(p.rates, { '21+': 12.71, '18-20': 10.85, 'u18': 8, 'apprentice': 8 });
});

test('Rates switch on 1 April', () => {
  assert.equal(ratesFor('2026-03-31').rates['21+'], 12.21);
  assert.equal(ratesFor('2025-04-01').rates['18-20'], 10.00);
  assert.equal(ratesFor('2024-06-01').rates['u18'], 6.40);
});

test('GOV.UK apprentice examples: 21 in first year = £8, after first year = £12.71', () => {
  assert.equal(minimumWageCheck({ hourly: 8, age: 21, apprentice: true, firstYear: true, date: '2026-10-08' }).minimum, 8);
  assert.equal(minimumWageCheck({ hourly: 12.71, age: 21, apprentice: true, firstYear: false, date: '2026-10-08' }).minimum, 12.71);
});

test('Age groups', () => {
  assert.equal(ageGroup(21), '21+');
  assert.equal(ageGroup(20), '18-20');
  assert.equal(ageGroup(17), 'u18');
  assert.equal(ageGroup(18, true), 'apprentice');
  assert.equal(ageGroup(19, true, false), '18-20');
});

test('£12.71 an hour, 37.5 hours, 52 weeks = £24,784.50 a year', () => {
  const c = convert({ amount: 12.71, period: 'hour', hours: 37.5 });
  assert.equal(c.yearly, 24784.5);
  assert.equal(c.monthly, 2065.38);
  assert.equal(c.weekly, 476.63);
  assert.equal(c.daily, 95.33);
});

test('£30,000 a year at 37.5 hours = £15.38 an hour', () => {
  const c = convert({ amount: 30000, period: 'year', hours: 37.5 });
  assert.equal(c.hourly, 15.38);
  assert.equal(c.weekly, 576.92);
});

test('£2,000 a month at 40 hours = £11.54 an hour', () => {
  assert.equal(convert({ amount: 2000, period: 'month', hours: 40 }).hourly, 11.54);
});

test('Day rate × days × weeks', () => {
  assert.equal(convert({ amount: 150, period: 'day', days: 5 }).yearly, 39000);
  assert.equal(convert({ amount: 150, period: 'day', days: 4 }).yearly, 31200);
});

test('Below minimum wage is flagged with the shortfall', () => {
  const r = minimumWageCheck({ hourly: 12.5, age: 30, date: '2026-10-08' });
  assert.equal(r.ok, false);
  assert.equal(r.diff, -0.21);
});

test('Exactly the minimum passes', () => {
  assert.equal(minimumWageCheck({ hourly: 10.85, age: 19, date: '2026-10-08' }).ok, true);
});

test('Full-time salary at the National Living Wage', () => {
  assert.equal(minimumAnnual(12.71, 37.5), 24784.5);
  assert.equal(minimumAnnual(12.71, 40), 26436.8);
});
