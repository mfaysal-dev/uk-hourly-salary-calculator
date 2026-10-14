import { convert, minimumWageCheck, NMW_RATES, AGE_GROUPS, minimumAnnual } from './wage.js';
import { $, $$, bindActions, setParams } from './ui.js';

const gbp = (n, dp = 2) => '£' + (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const gbp0 = (n) => '£' + (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const parseMoney = (v) => Math.max(0, Math.min(10000000, Number(String(v).replace(/[^0-9.]/g, '')) || 0));
const PER = { hour: 'an hour', day: 'a day', week: 'a week', month: 'a month', year: 'a year' };
const DATES = ['2026-10-08', '2025-10-01', '2024-10-01'];
const state = { pay: 12.71, period: 'hour', hours: 37.5, days: 5, weeks: 52, age: 25, appr: false, first: false, date: DATES[0] };
const el = { pay: $('#pay'), period: $('#period'), hours: $('#hours'), days: $('#days'), weeks: $('#weeks'), age: $('#age'), date: $('#date'), appr: $('#appr'), first: $('#first') };
let last = null;
const clamp = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Number.isFinite(+v) && v !== '' ? +v : d));

function readParams() {
  const q = new URLSearchParams(location.search);
  if (q.has('pay')) state.pay = parseMoney(q.get('pay'));
  if (PER[q.get('per')]) state.period = q.get('per');
  if (q.has('h')) state.hours = clamp(q.get('h'), 1, 100, 37.5);
  if (q.has('d')) state.days = clamp(q.get('d'), 1, 7, 5);
  if (q.has('w')) state.weeks = clamp(q.get('w'), 1, 52.2, 52);
  if (q.has('age')) state.age = clamp(parseInt(q.get('age'), 10), 13, 100, 25);
  state.appr = q.get('appr') === '1'; state.first = q.get('first') === '1';
  if (DATES.includes(q.get('date'))) state.date = q.get('date');
}
function writeParams() {
  setParams({ pay: state.pay, per: state.period !== 'hour' && state.period, h: state.hours !== 37.5 && state.hours, d: state.days !== 5 && state.days,
    w: state.weeks !== 52 && state.weeks, age: state.age, appr: state.appr, first: state.appr && state.first, date: state.date !== DATES[0] && state.date });
}
function syncInputs() {
  el.pay.value = state.pay.toLocaleString('en-GB', { maximumFractionDigits: 2 }); el.period.value = state.period;
  el.hours.value = state.hours; el.days.value = state.days; el.weeks.value = state.weeks; el.age.value = state.age; el.date.value = state.date;
  el.appr.checked = state.appr; el.first.checked = state.first; $('#firstWrap').hidden = !state.appr;
}

function update() {
  const c = convert({ amount: state.pay, period: state.period, hours: state.hours, days: state.days, weeks: state.weeks });
  const fromHourly = state.period === 'hour' || state.period === 'day';
  $('#bigLabel').textContent = fromHourly ? 'Yearly salary' : 'Hourly rate';
  $('#total').textContent = fromHourly ? gbp0(c.yearly) : gbp(c.hourlyExact);
  $('#summary').textContent = `${gbp0(state.pay)} ${PER[state.period]}, ${state.hours} hours a week over ${state.days} days, ${state.weeks} paid weeks a year.`;
  const rows = [['hour', 'Hour', c.hourlyExact], ['day', 'Day', c.daily], ['week', 'Week', c.weekly], ['month', 'Month', c.monthly], ['year', 'Year', c.yearly]];
  $('#rows').innerHTML = rows.map(([k, l, v]) => `<tr${k === state.period ? ' class="from"' : ''}><td class="k">${l}</td><td class="r">${gbp(v)}</td></tr>`).join('');
  $('#hoursYear').textContent = `${c.hoursPerYear.toLocaleString('en-GB')} paid hours a year. Before tax and National Insurance.`;
  $('#takehome').href = `https://take-home-pay-calculator-uk.vercel.app/?s=${c.yearly}`;

  const m = minimumWageCheck({ hourly: c.hourlyExact, age: state.age, apprentice: state.appr, firstYear: state.first, date: state.date });
  last = { c, m };
  const mw = $('#mw');
  if (m) {
    mw.className = 'note mw ' + (m.ok ? 'ok' : 'warn');
    mw.innerHTML = m.ok
      ? `<span class="ico" aria-hidden="true">✅</span><span>${gbp(c.hourlyExact)} an hour is <b>at or above</b> the minimum of <b>${gbp(m.minimum)}</b> for ${m.groupLabel.charAt(0).toLowerCase() + m.groupLabel.slice(1)} (${m.period.label})${m.diff > 0 ? `, by ${gbp(m.diff)} (${m.pctAbove}%)` : ''}.</span>`
      : `<span class="ico" aria-hidden="true">⚠️</span><span>${gbp(c.hourlyExact)} an hour is <b>${gbp(-m.diff)} below</b> the minimum of <b>${gbp(m.minimum)}</b> for ${m.groupLabel.charAt(0).toLowerCase() + m.groupLabel.slice(1)} (${m.period.label}). At your hours that’s about ${gbp(-m.diff * state.hours * state.weeks)} a year short. <a href="https://www.gov.uk/am-i-getting-minimum-wage" rel="noopener">Check on GOV.UK</a> or contact Acas.</span>`;
  }

  // rates table
  $('#nmwRows').innerHTML = Object.keys(AGE_GROUPS).map((g) => `<tr${m && g === m.group ? ' style="font-weight:800"' : ''}><td>${AGE_GROUPS[g]}</td>${NMW_RATES.map((p) => `<td class="r">${gbp(p.rates[g])}</td>`).join('')}</tr>`).join('');

  // bars against current-period minimums
  const p = (m && m.period) || NMW_RATES[0];
  const items = [['You', c.hourlyExact, true], ...Object.entries(p.rates).filter(([g]) => g !== 'apprentice').map(([g, v]) => [g === '21+' ? 'NLW 21+' : g === '18-20' ? 'Age 18–20' : 'Under 18 / apprentice', v, false])];
  const max = Math.max(...items.map((i) => i[1]), 1);
  $('#bars').innerHTML = items.map(([l, v, you]) => `<div class="barrow${you ? ' current' : ''}"><span class="label">${l}</span><span class="track"><span class="fill" style="width:${(v / max * 100).toFixed(1)}%;${you ? '' : 'background:#94a3b8'}"></span></span><b>${gbp(v)}</b></div>`).join('');
  $('#ftHint').textContent = m ? `At your ${state.hours} hours a week, the minimum for your age group comes to ${gbp0(minimumAnnual(m.minimum, state.hours, state.weeks))} a year (${p.label}).` : '';
  writeParams();
}

function resultText() {
  const { c, m } = last;
  return [`Pay converter (${gbp0(state.pay)} ${PER[state.period]}, ${state.hours} hrs/week)`,
    `Hourly: ${gbp(c.hourlyExact)}`, `Daily: ${gbp(c.daily)}`, `Weekly: ${gbp(c.weekly)}`, `Monthly: ${gbp(c.monthly)}`, `Yearly: ${gbp(c.yearly)}`,
    m ? `Minimum wage (${m.groupLabel}, ${m.period.label}): ${gbp(m.minimum)} – ${m.ok ? 'OK' : 'BELOW minimum'}` : '', location.href].filter(Boolean).join('\n');
}

el.pay.addEventListener('input', () => { state.pay = parseMoney(el.pay.value); update(); });
el.pay.addEventListener('blur', () => { el.pay.value = state.pay.toLocaleString('en-GB', { maximumFractionDigits: 2 }); });
el.period.addEventListener('change', () => {
  const c = convert({ amount: state.pay, period: state.period, hours: state.hours, days: state.days, weeks: state.weeks });
  state.period = el.period.value;
  state.pay = { hour: +c.hourlyExact.toFixed(2), day: c.daily, week: c.weekly, month: c.monthly, year: c.yearly }[state.period];
  syncInputs(); update();
});
for (const [k, lo, hi, d] of [['hours', 1, 100, 37.5], ['days', 1, 7, 5], ['weeks', 1, 52.2, 52]]) el[k].addEventListener('input', () => { state[k] = clamp(el[k].value, lo, hi, d); update(); });
el.age.addEventListener('input', () => { state.age = clamp(parseInt(el.age.value, 10), 13, 100, 25); update(); });
el.date.addEventListener('change', () => { state.date = el.date.value; update(); });
el.appr.addEventListener('change', () => { state.appr = el.appr.checked; $('#firstWrap').hidden = !state.appr; update(); });
el.first.addEventListener('change', () => { state.first = el.first.checked; update(); });
$$('[data-pay]').forEach((b) => b.addEventListener('click', () => { state.pay = +b.dataset.pay; state.period = b.dataset.per; syncInputs(); update(); }));
bindActions({ result: resultText });

readParams(); syncInputs(); update();
