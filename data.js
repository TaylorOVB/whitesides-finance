// pages/api/data.js
// Single endpoint — returns everything the app needs in one call.
// Reads from your Google Sheet using a service account.

import { google } from 'googleapis';

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

async function readSheet(range) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range,
  });
  return res.data.values || [];
}

function parseMoney(val) {
  if (!val) return 0;
  return parseFloat(val.toString().replace(/[$,%\s]/g, '')) || 0;
}

function isCurrentMonth(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  } catch { return false; }
}

// ── CONFIG ──────────────────────────────────────────────────
async function getConfig() {
  const rows = await readSheet('CONFIG!A1:C76');
  const get = (label) => {
    const row = rows.find(r => r[0] && r[0].toString().trim() === label);
    return row ? parseMoney(row[1]) : 0;
  };
  return {
    ovbMonthlyDraw:    get('OVB — Taylor draw (monthly)'),
    totalIncomeTarget: get('TOTAL INCOME TARGET'),
    tithing:           get('Tithing (starting amount)'),
    totalFixed:        get('TOTAL FIXED'),
    totalDebtMins:     get('TOTAL DEBT MINIMUMS'),
    foodGroceries:     get('Food / Groceries'),
    fuel:              get('Fuel'),
    diningOut:         get('Dining Out'),
    coffeedrinks:      get('Coffee / Drinks'),
    kidsFamilyMisc:    get('Kids / Family Misc'),
    householdPersonal: get('Household / Personal'),
    subscriptions:     get('Subscriptions'),
    sinkingFund:       get('Sinking Fund'),
    totalVariable:     get('TOTAL VARIABLE'),
    disneyContrib:     get('Disney Trip'),
    hawaiiContrib:     get('Hawaii Trip'),
    homeContrib:       get('Home Down Payment'),
    totalGoals:        get('TOTAL GOALS'),
    totalObligations:  get('Total Monthly Obligations'),
    netSurplus:        get('NET SURPLUS / (DEFICIT)'),
    rent:              get('Rent'),
    rockyMtnPower:     get('Rocky Mountain Power'),
    enbridgeGas:       get('Enbridge Gas'),
    stateFarm:         get('State Farm (auto + home + HBML)'),
    nwMutual:          get('NW Mutual'),
    tmobile:           get('T-Mobile'),
  };
}

// ── INCOME ──────────────────────────────────────────────────
async function getIncome() {
  const rows = await readSheet('INCOME!A2:G1000');
  const entries = rows
    .filter(r => r[0] && r[3])
    .map(r => ({
      date: r[0], source: r[1] || '', desc: r[2] || '',
      amount: parseMoney(r[3]), category: r[4] || '',
    }));

  const mtd = entries.filter(r => isCurrentMonth(r.date));
  const sum = (arr, cat) => arr.filter(r => r.category === cat).reduce((s, r) => s + r.amount, 0);

  return {
    mtd: {
      ovb:   sum(mtd, 'OVB Owner Draw'),
      hbml:  sum(mtd, 'HBML — Mandie Draw'),
      tmw:   sum(mtd, 'TMW Commission (65%)'),
      total: mtd.reduce((s, r) => s + r.amount, 0),
    },
  };
}

// ── BUDGET VS ACTUAL ────────────────────────────────────────
async function getBudget(config) {
  const rows = await readSheet('HH_TRANSACTIONS!A2:G5000');
  const mtd = rows
    .filter(r => r[0] && r[3] && isCurrentMonth(r[0]))
    .map(r => ({
      date: r[0], account: r[1] || '', desc: r[2] || '',
      amount: parseMoney(r[3]), category: r[4] || '', flag: r[5] || '', notes: r[6] || '',
    }));

  const sum = (cat) => mtd.filter(r => r.category === cat).reduce((s, r) => s + r.amount, 0);

  const buckets = [
    { label: 'Food / Groceries',     budget: config.foodGroceries,     actual: sum('Food / Groceries'),     icon: '🛒' },
    { label: 'Dining Out',           budget: config.diningOut,          actual: sum('Dining Out'),           icon: '🍔' },
    { label: 'Coffee / Drinks',      budget: config.coffeedrinks,       actual: sum('Coffee / Drinks'),      icon: '☕' },
    { label: 'Fuel',                 budget: config.fuel,               actual: sum('Fuel'),                 icon: '⛽' },
    { label: 'Subscriptions',        budget: config.subscriptions,      actual: sum('Subscriptions'),        icon: '📱' },
    { label: 'Household / Personal', budget: config.householdPersonal,  actual: sum('Household / Personal'), icon: '🏠' },
    { label: 'Kids / Family Misc',   budget: config.kidsFamilyMisc,     actual: sum('Kids / Family Misc'),   icon: '👨‍👩‍👦' },
    { label: 'Sinking Fund',         budget: config.sinkingFund,        actual: sum('Sinking Fund'),         icon: '🚗' },
    { label: 'Rent',                 budget: config.rent,               actual: sum('Rent'),                 icon: '🏡' },
    { label: 'Utilities',            budget: config.rockyMtnPower + config.enbridgeGas,
                                     actual: sum('Rocky Mountain Power') + sum('Enbridge Gas'),              icon: '💡' },
    { label: 'Phone',                budget: config.tmobile,            actual: sum('T-Mobile'),             icon: '📞' },
    { label: 'Insurance',            budget: config.stateFarm,          actual: sum('State Farm'),           icon: '🛡️' },
    { label: 'NW Mutual',            budget: config.nwMutual,           actual: sum('NW Mutual'),            icon: '📋' },
    { label: 'Tithing',              budget: config.tithing,            actual: sum('Tithing / Charity'),    icon: '🙏' },
  ].map(b => ({
    ...b,
    remaining: b.budget - b.actual,
    pct: b.budget > 0 ? Math.round((b.actual / b.budget) * 100) : 0,
    status: b.budget === 0 ? 'OK'
          : b.actual / b.budget > 1    ? 'OVER'
          : b.actual / b.budget > 0.85 ? 'WATCH'
          : 'OK',
  }));

  const flagged = mtd
    .filter(r => r.flag && r.flag.includes('🚩'))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 15);

  return { buckets, flagged, totalSpent: mtd.reduce((s, r) => s + r.amount, 0) };
}

// ── DEBTS ───────────────────────────────────────────────────
async function getDebts() {
  const rows = await readSheet('DEBTS_GOALS!A3:H20');
  return rows
    .filter(r => r[0] && r[1] && r[1] !== 'TOTALS' && !isNaN(parseInt(r[0])))
    .map(r => ({
      num: parseInt(r[0]),
      name: r[1] || '',
      owner: r[2] || '',
      balance: parseMoney(r[3]),
      rate: parseMoney(r[4]),
      min: parseMoney(r[5]),
      status: r[6] || 'Active',
      notes: r[7] || '',
    }))
    .filter(d => d.status === 'Active' && d.balance > 0)
    .sort((a, b) => a.balance - b.balance);
}

// ── GOALS ───────────────────────────────────────────────────
async function getGoals(config) {
  return [
    { name: 'Disney Trip',       target: 3500,  saved: 0, contrib: config.disneyContrib, emoji: '🏰', color: '#378ADD' },
    { name: 'Hawaii Trip',       target: 6000,  saved: 0, contrib: config.hawaiiContrib, emoji: '🌺', color: '#639922' },
    { name: 'Home Down Payment', target: 80000, saved: 0, contrib: config.homeContrib,   emoji: '🏡', color: '#C7AA8B', locked: true },
  ].map(g => ({
    ...g,
    pct: g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0,
    months: g.contrib > 0 ? Math.ceil((g.target - g.saved) / g.contrib) : 0,
  }));
}

// ── MAIN HANDLER ────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const config = await getConfig();
    const [income, budget, debts, goals] = await Promise.all([
      getIncome(),
      getBudget(config),
      getDebts(),
      getGoals(config),
    ]);
    res.status(200).json({ config, income, budget, debts, goals });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
