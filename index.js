// pages/index.js
// Complete Whitesides Family Finance app.
// One file. All views. All styles inline.

import { useState, useEffect } from 'react';
import Head from 'next/head';

// ─── Formatters ──────────────────────────────────────────────
const $ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const $$ = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
const MOS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const NOW = new Date();
const MONTH_LABEL = `${MOS[NOW.getMonth()]} ${NOW.getFullYear()}`;

function citiDaysLeft() {
  return Math.max(0, Math.floor((new Date(2026, 11, 26) - new Date()) / 86400000));
}

function payoffDate(totalMonths) {
  if (!totalMonths || totalMonths > 600) return '—';
  const d = new Date();
  d.setMonth(d.getMonth() + Math.round(totalMonths));
  return `${MOS[d.getMonth()]} ${d.getFullYear()}`;
}

function calcSnowball(debts, extraMonthly) {
  if (!debts || !debts.length) return 0;
  let freed = 0, total = 0;
  for (const d of [...debts].sort((a, b) => a.balance - b.balance)) {
    const pmt = d.min + freed + extraMonthly;
    const mo  = pmt > 0 ? Math.ceil(d.balance / pmt) : 999;
    total += mo;
    freed += d.min;
  }
  return total;
}

// ─── Design tokens ───────────────────────────────────────────
const C = {
  bg:       '#141210',
  surface:  '#1E1C1A',
  surface2: '#272421',
  surface3: '#2F2C29',
  border:   'rgba(199,170,139,0.15)',
  border2:  'rgba(199,170,139,0.28)',
  tan:      '#C7AA8B',
  tanLight: '#E8D9C8',
  white:    '#F7F7F7',
  gray:     '#888780',
  red:      '#E24B4A',
  redBg:    'rgba(226,75,74,0.12)',
  amber:    '#EF9F27',
  amberBg:  'rgba(239,159,39,0.12)',
  green:    '#639922',
  greenBg:  'rgba(99,153,34,0.12)',
  blue:     '#378ADD',
  blueBg:   'rgba(55,138,221,0.12)',
};

// ─── Shared UI ───────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.surface2, borderRadius: 12, border: `1px solid ${C.border}`, padding: '16px 20px', ...style }}>
      {children}
    </div>
  );
}

function Metric({ label, value, sub, color }) {
  return (
    <Card>
      <div style={{ fontSize: 11, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 500, color: color || C.white, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.gray, marginTop: 5 }}>{sub}</div>}
    </Card>
  );
}

function Bar({ pct, status, h = 6 }) {
  const color = status === 'OVER' ? C.red : status === 'WATCH' ? C.amber : C.tan;
  return (
    <div style={{ width: '100%', height: h, background: C.surface3, borderRadius: h }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: h, background: color, borderRadius: h, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { OVER: [C.red, C.redBg], WATCH: [C.amber, C.amberBg], OK: [C.green, C.greenBg] };
  const [color, bg] = map[status] || map.OK;
  return <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>{status}</span>;
}

function SectionLabel({ children, style = {} }) {
  return <div style={{ fontSize: 11, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, ...style }}>{children}</div>;
}

function Loading() {
  return (
    <div style={{ display: 'grid', gap: 10, paddingTop: 20 }}>
      {[80, 60, 80, 60, 80].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 10, background: 'rgba(199,170,139,0.06)', animation: 'pulse 1.6s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────
const TABS = [
  { id: 'command', label: 'Command' },
  { id: 'budget',  label: 'Budget'  },
  { id: 'debt',    label: 'Debt'    },
  { id: 'goals',   label: 'Goals'   },
  { id: 'flags',   label: 'Flags'   },
  { id: 'subs',    label: 'Subs'    },
];

function Nav({ view, setView }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(20,18,16,0.96)', backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${C.border}`, height: 54,
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 0,
    }}>
      <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 16, color: C.tan, marginRight: 20, whiteSpace: 'nowrap' }}>
        W & M
      </span>
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            background: view === t.id ? 'rgba(199,170,139,0.14)' : 'transparent',
            border: 'none', padding: '7px 13px', borderRadius: 8,
            color: view === t.id ? C.tan : C.gray, fontSize: 14,
            fontWeight: view === t.id ? 500 : 400, cursor: 'pointer',
            transition: 'all 0.12s', whiteSpace: 'nowrap', fontFamily: 'inherit',
          }}>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── VIEW: COMMAND CENTER ─────────────────────────────────────
function Command({ data }) {
  if (!data) return <Loading />;
  const { config, income, budget, debts } = data;
  const totalDebt  = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin   = debts.reduce((s, d) => s + d.min, 0);
  const extra      = Math.max(0, config.netSurplus);
  const totalMos   = calcSnowball(debts, extra);
  const dfDate     = payoffDate(totalMos);
  const citiDays   = citiDaysLeft();
  const monthSpend = budget.totalSpent || 0;
  const surplus    = (income?.mtd?.total || 0) - monthSpend;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 12, color: C.tan, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{MONTH_LABEL}</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 400, color: C.white }}>Command Center</h1>
      </div>

      {/* Income grid */}
      <div>
        <SectionLabel style={{ marginBottom: 8 }}>Income this month</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
          <Metric label="OVB Draw"  value={$(income.mtd.ovb)}  sub={`target ${$(config.ovbMonthlyDraw)}`} />
          <Metric label="HBML"      value={$(income.mtd.hbml)} sub="Mandie draws" />
          <Metric label="TMW"       value={$(income.mtd.tmw)}  sub="65% post-tax" color={C.green} />
          <Metric label="Total In"  value={$(income.mtd.total)}                   color={C.tan} />
        </div>
      </div>

      {/* Surplus + debt */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{
          background: surplus >= 0 ? C.greenBg : C.redBg,
          border: `1px solid ${surplus >= 0 ? 'rgba(99,153,34,0.3)' : 'rgba(226,75,74,0.3)'}`,
          borderRadius: 12, padding: '18px 20px',
        }}>
          <div style={{ fontSize: 11, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Surplus</div>
          <div style={{ fontSize: 34, fontWeight: 500, color: surplus >= 0 ? C.green : C.red, lineHeight: 1 }}>{$(Math.abs(surplus))}</div>
          <div style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>{surplus >= 0 ? 'snowball fuel' : 'over budget'}</div>
        </div>
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Total Debt</div>
          <div style={{ fontSize: 34, fontWeight: 500, color: C.white, lineHeight: 1 }}>{$(totalDebt)}</div>
          <div style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>free by <span style={{ color: C.tan }}>{dfDate}</span></div>
        </div>
      </div>

      {/* Citi banner */}
      {citiDays < 300 && (
        <div style={{
          background: citiDays < 90 ? C.redBg : C.amberBg,
          border: `1px solid ${citiDays < 90 ? 'rgba(226,75,74,0.3)' : 'rgba(239,159,39,0.3)'}`,
          borderRadius: 10, padding: '13px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: citiDays < 90 ? C.red : C.amber }}>⚠️ Citi 0% expires Dec 26, 2026</div>
            <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>Need ~$450/mo to clear in time</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: citiDays < 90 ? C.red : C.amber }}>{citiDays}d</div>
        </div>
      )}

      {/* Top flags */}
      {budget.flagged && budget.flagged.length > 0 && (
        <div>
          <SectionLabel style={{ marginBottom: 8 }}>{budget.flagged.length} over-budget transactions</SectionLabel>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {budget.flagged.slice(0, 5).map((f, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 16px',
                borderBottom: i < 4 ? `1px solid ${C.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, color: C.white }}>{f.desc.replace(/PENDING - \d+\/\d+ - /, '').slice(0, 38)}</div>
                  <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{f.category} · {f.date}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: C.red }}>{$$(f.amount)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Budget snapshot */}
      <div>
        <SectionLabel style={{ marginBottom: 8 }}>Spending snapshot</SectionLabel>
        <div style={{ display: 'grid', gap: 6 }}>
          {(budget.buckets || []).filter(b => b.actual > 0 || b.budget > 0).slice(0, 7).map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.surface2, borderRadius: 8, padding: '10px 14px',
              border: `1px solid ${b.status === 'OVER' ? 'rgba(226,75,74,0.25)' : C.border}`,
            }}>
              <span style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{b.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: C.white }}>{b.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: b.status === 'OVER' ? C.red : C.white }}>
                    {$(b.actual)} <span style={{ fontSize: 11, color: C.gray, fontWeight: 400 }}>/ {$(b.budget)}</span>
                  </span>
                </div>
                <Bar pct={b.pct} status={b.status} />
              </div>
              <StatusBadge status={b.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── VIEW: BUDGET ────────────────────────────────────────────
function Budget({ data }) {
  if (!data) return <Loading />;
  const { buckets = [] } = data.budget;
  const overCount = buckets.filter(b => b.status === 'OVER').length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, color: C.tan, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{MONTH_LABEL}</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 400, color: C.white }}>Budget Buckets</h1>
      </div>

      {overCount > 0 && (
        <div style={{ background: C.redBg, border: '1px solid rgba(226,75,74,0.3)', borderRadius: 10, padding: '13px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.red }}>{overCount} {overCount === 1 ? 'category' : 'categories'} over budget</div>
          <div style={{ fontSize: 12, color: C.gray, marginTop: 3 }}>{buckets.filter(b => b.status === 'OVER').map(b => b.label).join(' · ')}</div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {buckets.filter(b => b.budget > 0).map((b, i) => (
          <Card key={i} style={{
            border: `1px solid ${b.status === 'OVER' ? 'rgba(226,75,74,0.25)' : b.status === 'WATCH' ? 'rgba(239,159,39,0.2)' : C.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{b.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: C.white }}>{b.label}</span>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <Bar pct={b.pct} status={b.status} h={8} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: C.gray }}>{$(b.actual)} spent</span>
              <span style={{ fontSize: 12, color: b.remaining < 0 ? C.red : C.gray }}>
                {b.remaining < 0 ? `${$(Math.abs(b.remaining))} over` : `${$(b.remaining)} left`} of {$(b.budget)}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── VIEW: DEBT ───────────────────────────────────────────────
function Debt({ data }) {
  const initExtra = data ? Math.max(0, Math.round(data.config.netSurplus)) : 500;
  const [extra, setExtra] = useState(initExtra);

  if (!data) return <Loading />;
  const { debts, config } = data;

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin  = debts.reduce((s, d) => s + d.min, 0);
  const totalMos  = calcSnowball(debts, extra);
  const dfDate    = payoffDate(totalMos);
  const maxBal    = Math.max(...debts.map(d => d.balance));

  // Per-debt payoff simulation
  let freed = 0, cumMo = 0;
  const withPayoff = [...debts].sort((a, b) => a.balance - b.balance).map(d => {
    const pmt = d.min + freed + extra;
    const mo  = pmt > 0 ? Math.ceil(d.balance / pmt) : 999;
    cumMo += mo;
    freed += d.min;
    const pd = new Date();
    pd.setMonth(pd.getMonth() + Math.round(cumMo));
    return { ...d, mo, date: `${MOS[pd.getMonth()]} ${pd.getFullYear()}` };
  });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, color: C.tan, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Snowball Method</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 400, color: C.white }}>Debt Annihilator</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <Metric label="Total Debt"  value={$(totalDebt)}  color={C.red} />
        <Metric label="Minimums/mo" value={$(totalMin)} />
        <Metric label="Extra/mo"    value={$(extra)}      color={C.green} />
        <Metric label="Debt-Free"   value={dfDate}        sub={`${totalMos}mo`} color={C.tan} />
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: C.gray }}>Extra monthly payment</span>
          <span style={{ fontSize: 22, fontWeight: 500, color: C.tan }}>{$(extra)}</span>
        </div>
        <input
          type="range" min={0} max={3000} step={25} value={extra}
          onChange={e => setExtra(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: C.tan, cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: C.gray }}>$0</span>
          <span style={{ fontSize: 11, color: C.gray }}>$3,000</span>
        </div>
        {extra > 0 && (
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: C.green }}>
            At {$(extra)}/mo extra → debt-free <strong>{dfDate}</strong>
          </div>
        )}
      </Card>

      <SectionLabel>The Stack — smallest balance first</SectionLabel>
      <div style={{ display: 'grid', gap: 8 }}>
        {withPayoff.map((d, i) => (
          <Card key={i} style={{ border: `1px solid ${d.rate >= 0.18 ? 'rgba(226,75,74,0.28)' : C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: C.gray, fontWeight: 600, minWidth: 18 }}>#{i+1}</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: C.white }}>{d.name}</span>
                  {d.rate >= 0.18 && <span style={{ fontSize: 10, background: C.redBg, color: C.red, padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>18%+</span>}
                  {d.name.includes('Citi') && <span style={{ fontSize: 10, background: C.amberBg, color: C.amber, padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>DEADLINE</span>}
                </div>
                <div style={{ fontSize: 12, color: C.gray, marginTop: 3, paddingLeft: 26 }}>
                  {d.rate > 0 ? `${(d.rate * 100).toFixed(2)}%` : '0%'} · ${d.min}/mo min · payoff {d.date}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 500, color: C.white }}>{$(d.balance)}</div>
                <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>~{d.mo}mo</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 4, background: C.surface3, borderRadius: 4 }}>
              <div style={{ width: `${Math.round((d.balance / maxBal) * 100)}%`, height: 4, background: d.rate >= 0.18 ? C.red : C.tan, borderRadius: 4 }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── VIEW: GOALS ──────────────────────────────────────────────
function Goals({ data }) {
  if (!data) return <Loading />;
  const { goals } = data;
  const citiDays = citiDaysLeft();

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, color: C.tan, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Your Why</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 400, color: C.white }}>Goals</h1>
      </div>

      {/* Citi deadline */}
      <div style={{
        background: citiDays < 90 ? C.redBg : C.amberBg,
        border: `1px solid ${citiDays < 90 ? 'rgba(226,75,74,0.3)' : 'rgba(239,159,39,0.3)'}`,
        borderRadius: 12, padding: '18px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: citiDays < 90 ? C.red : C.amber }}>⚠️ Citi 0% Deadline</div>
          <div style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>Dec 26, 2026 · $4,948 balance · need $450/mo</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 38, fontWeight: 600, color: citiDays < 90 ? C.red : C.amber, lineHeight: 1 }}>{citiDays}</div>
          <div style={{ fontSize: 11, color: C.gray }}>days</div>
        </div>
      </div>

      {/* Goal cards */}
      {goals.map((g, i) => (
        <div key={i} style={{
          background: C.surface2, borderRadius: 14, padding: '22px 24px',
          border: `1px solid ${C.border}`, opacity: g.locked ? 0.55 : 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 30, marginBottom: 8 }}>{g.emoji}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: C.white }}>{g.name}</div>
              {g.locked && <div style={{ fontSize: 11, color: C.gray, marginTop: 4 }}>Activates after debt is eliminated</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: g.color }}>{$(g.saved)}</div>
              <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>of {$(g.target)}</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 10, background: C.surface3, borderRadius: 10, marginBottom: 10 }}>
            <div style={{ width: `${Math.min(100, g.pct)}%`, height: 10, background: g.color, borderRadius: 10, transition: 'width 0.7s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: C.gray }}>{g.pct}% · {$(g.contrib)}/mo</span>
            <span style={{ fontSize: 13, color: g.color }}>{g.months > 0 ? `${g.months} months to go` : '—'}</span>
          </div>
        </div>
      ))}

      <Card style={{ background: C.surface }}>
        <div style={{ fontSize: 12, color: C.gray, lineHeight: 1.6 }}>
          💡 Update <strong style={{ color: C.tan }}>Saved So Far</strong> (column C) in the DEBTS_GOALS tab of your Google Sheet each month. Months remaining auto-calculates.
        </div>
      </Card>
    </div>
  );
}

// ─── VIEW: FLAGS ──────────────────────────────────────────────
function Flags({ data }) {
  if (!data) return <Loading />;
  const { budget, debts, config } = data;
  const flags = budget.flagged || [];
  const totalFlagged = flags.reduce((s, f) => s + f.amount, 0);
  const extra     = Math.max(0, config.netSurplus);
  const base      = calcSnowball(debts, extra);
  const withSaved = calcSnowball(debts, extra + totalFlagged);
  const moSaved   = Math.max(0, base - withSaved);

  const byCat = Object.entries(
    flags.reduce((acc, f) => { acc[f.category] = (acc[f.category] || 0) + f.amount; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, color: C.tan, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{MONTH_LABEL}</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 400, color: C.white }}>Spending Flags</h1>
      </div>

      {flags.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, color: C.white }}>No flagged transactions this month</div>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 6 }}>Every purchase is within budget.</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: C.redBg, border: '1px solid rgba(226,75,74,0.3)', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Over-Budget Total</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: C.red }}>{$(totalFlagged)}</div>
              <div style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>{flags.length} transactions</div>
            </div>
            <div style={{ background: C.greenBg, border: '1px solid rgba(99,153,34,0.3)', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>If redirected to debt</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: C.green }}>{moSaved} mo</div>
              <div style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>sooner debt-free</div>
            </div>
          </div>

          <div>
            <SectionLabel style={{ marginBottom: 8 }}>By category</SectionLabel>
            <div style={{ display: 'grid', gap: 5 }}>
              {byCat.map(([cat, total], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surface2, borderRadius: 8, padding: '10px 14px', border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.white }}>{cat}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.red }}>{$(total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel style={{ marginBottom: 8 }}>All flagged transactions</SectionLabel>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {flags.map((f, i) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  borderBottom: i < flags.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: 12, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.desc.replace(/PENDING - \d+\/\d+ - /, '').replace(/VISA - \d+\/\d+ /, '')}
                      </div>
                      <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{f.category} · {f.account || f.source} · {f.date}</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: C.red, whiteSpace: 'nowrap' }}>{$$(f.amount)}</span>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ─── VIEW: SUBSCRIPTIONS ──────────────────────────────────────
const DEFAULT_SUBS = [
  { name: 'Disney+',           amount: 20,  keep: false, tag: 'Cancel',   note: 'Still charging — listed as paused' },
  { name: 'Hulu',              amount: 19,  keep: false, tag: 'Cancel',   note: 'Still charging — listed as paused' },
  { name: 'Audible',           amount: 16,  keep: false, tag: 'Cancel',   note: 'Still charging — listed as paused' },
  { name: 'EVO Climbing',      amount: 87,  keep: null,  tag: 'Decide',   note: '2nd gym on top of VASA' },
  { name: 'VASA Gym',          amount: 24,  keep: true,  tag: 'Keep',     note: '' },
  { name: 'Amazon Prime',      amount: 16,  keep: true,  tag: 'Keep',     note: '' },
  { name: 'Apple Music',       amount: 17,  keep: true,  tag: 'Keep',     note: 'Family plan' },
  { name: 'Google One',        amount: 11,  keep: null,  tag: 'Decide',   note: 'Storage' },
  { name: 'Blink Cameras',     amount: 13,  keep: true,  tag: 'Keep',     note: 'Security' },
];

const BIZ_SUBS = [
  { name: 'JobTread',          amount: 216, note: 'OVB — essential' },
  { name: 'QuickBooks',        amount: 41,  note: 'OVB — essential' },
  { name: 'Claude.ai',         amount: 50,  note: 'OVB — API usage varies' },
  { name: 'Google Workspace',  amount: 9,   note: 'OVB' },
  { name: 'OpenAI / ChatGPT',  amount: 9,   note: 'HBML business' },
];

function Subs() {
  const [subs, setSubs] = useState(DEFAULT_SUBS);
  const toggle = (i, val) => setSubs(prev => prev.map((s, idx) => idx === i ? { ...s, keep: val } : s));

  const keepAmt  = subs.filter(s => s.keep === true).reduce((a, s) => a + s.amount, 0);
  const cutAmt   = subs.filter(s => s.keep === false).reduce((a, s) => a + s.amount, 0);
  const unsure   = subs.filter(s => s.keep === null).length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, color: C.tan, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Together</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 400, color: C.white }}>Subscription Audit</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Metric label="Keeping"   value={$(keepAmt)}        sub="per month" />
        <Metric label="Cutting"   value={$(cutAmt)}         sub={`${$(cutAmt * 12)}/yr freed`} color={C.green} />
        <Metric label="Undecided" value={unsure.toString()} sub="need a call" color={C.amber} />
      </div>

      <SectionLabel>Personal subscriptions — decide together</SectionLabel>
      <div style={{ display: 'grid', gap: 6 }}>
        {subs.map((s, i) => (
          <div key={i} style={{
            background: C.surface2, borderRadius: 10, padding: '13px 16px',
            border: `1px solid ${s.keep === false ? 'rgba(99,153,34,0.25)' : s.keep === null ? 'rgba(239,159,39,0.2)' : C.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.white }}>{s.name}</div>
              {s.note && <div style={{ fontSize: 11, color: s.keep === false ? C.gray : C.red, marginTop: 2 }}>{s.note}</div>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.white, minWidth: 55, textAlign: 'right' }}>{$(s.amount)}/mo</div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {[{ label: 'Keep', val: true, color: C.green }, { label: 'Cut', val: false, color: C.red }, { label: '?', val: null, color: C.amber }].map(opt => {
                const active = s.keep === opt.val;
                return (
                  <button key={opt.label} onClick={() => toggle(i, opt.val)} style={{
                    background: active ? opt.color : 'transparent',
                    border: `1px solid ${active ? opt.color : C.border2}`,
                    color: active ? C.black || '#1E1C1A' : C.gray,
                    padding: '5px 9px', borderRadius: 6, fontSize: 12,
                    fontWeight: active ? 700 : 400, cursor: 'pointer',
                    transition: 'all 0.12s', fontFamily: 'inherit',
                  }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {cutAmt > 0 && (
        <div style={{ background: C.greenBg, border: '1px solid rgba(99,153,34,0.3)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.green, marginBottom: 4 }}>
            Cancel {subs.filter(s => s.keep === false).map(s => s.name).join(', ')}
          </div>
          <div style={{ fontSize: 13, color: C.gray }}>
            Saves {$(cutAmt)}/mo · {$(cutAmt * 12)}/yr back into the snowball.
          </div>
        </div>
      )}

      <SectionLabel style={{ marginTop: 4 }}>Business subscriptions (OVB + HBML)</SectionLabel>
      <div style={{ display: 'grid', gap: 5 }}>
        {BIZ_SUBS.map((s, i) => (
          <div key={i} style={{ background: C.surface2, borderRadius: 8, padding: '11px 14px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: C.white }}>{s.name}</div>
              <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{s.note}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.white }}>{$(s.amount)}/mo</span>
              <span style={{ fontSize: 10, background: C.blueBg, color: C.blue, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>BIZ</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('command');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message));
  }, []);

  return (
    <>
      <Head>
        <title>Whitesides Finance</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#141210" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-size: 16px; }
        body { font-family: 'DM Sans', sans-serif; background: ${C.bg}; color: ${C.white}; min-height: 100vh; -webkit-font-smoothing: antialiased; }
        input[type=range] { height: 4px; cursor: pointer; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: rgba(199,170,139,0.2); border-radius: 2px; }
      `}</style>

      <Nav view={view} setView={setView} />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '70px 16px 40px' }}>
        {error && (
          <div style={{ background: C.redBg, border: '1px solid rgba(226,75,74,0.3)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.red, marginBottom: 4 }}>Connection error</div>
            <div style={{ fontSize: 12, color: C.gray }}>{error}</div>
            <div style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>
              Make sure <strong style={{ color: C.tan }}>GOOGLE_SPREADSHEET_ID</strong> and <strong style={{ color: C.tan }}>GOOGLE_SERVICE_ACCOUNT</strong> are set in Vercel environment variables.
            </div>
          </div>
        )}

        {view === 'command' && <Command data={data} />}
        {view === 'budget'  && <Budget  data={data} />}
        {view === 'debt'    && <Debt    data={data} />}
        {view === 'goals'   && <Goals   data={data} />}
        {view === 'flags'   && <Flags   data={data} />}
        {view === 'subs'    && <Subs />}
      </main>
    </>
  );
}
