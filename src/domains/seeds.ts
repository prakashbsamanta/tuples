// Deterministic seed-data generators for the missions.
//
// Every mission rebuild replays these scripts, so they MUST be pure functions
// of the seed. `variant: true` generates the hidden validation dataset — same
// schema and statistical shape, different values — used to reject hardcoded
// answers (see lib/validate.ts).

const BASE_SEED = 1337;
const VARIANT_SEED = 7331;

/** mulberry32 — tiny deterministic PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}
function int(r: () => number, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}

/** Chunked multi-row INSERT (SQLite compound limit is 500 rows). */
function inserts(table: string, cols: string[], rows: string[][]): string {
  const out: string[] = [];
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    out.push(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES\n` +
        chunk.map((r) => `(${r.join(', ')})`).join(',\n') +
        ';'
    );
  }
  return out.join('\n');
}

/** Zero-padded date helper: day offset from 2026-01-05 (a Monday). */
function tradingDay(offset: number): string {
  const d = new Date(Date.UTC(2026, 0, 5 + offset));
  return d.toISOString().slice(0, 10);
}

// ── Trading: The Analyst ───────────────────────────────────────────────

const SYMBOLS: Array<[string, string, string, number]> = [
  ['NVAX', 'NovaVax Systems', 'Health', 2014], ['HELX', 'Helix Biotech', 'Health', 2018],
  ['CURE', 'CureWell Labs', 'Health', 2011], ['GENM', 'GenomicaMed', 'Health', 2020],
  ['QBIT', 'QubitWorks', 'Tech', 2016], ['NEUR', 'NeuroGrid AI', 'Tech', 2019],
  ['CLDX', 'CloudDex', 'Tech', 2012], ['VRTX', 'VertexForge', 'Tech', 2015],
  ['DATA', 'DataPlane Inc', 'Tech', 2017], ['OPTI', 'OptiCore', 'Tech', 2021],
  ['SOLR', 'SolarPeak', 'Energy', 2013], ['WIND', 'WindHarbor', 'Energy', 2010],
  ['HYDR', 'HydroCell', 'Energy', 2019], ['FUSN', 'FusionWay', 'Energy', 2022],
  ['GRID', 'GridNova', 'Energy', 2015], ['BANQ', 'Banqora', 'Finance', 2009],
  ['LEND', 'LendBridge', 'Finance', 2016], ['PAYZ', 'PayZenith', 'Finance', 2018],
  ['INSR', 'InsuraTech', 'Finance', 2014], ['CAPM', 'CapMetrics', 'Finance', 2012],
];
const TRADERS = ['ada', 'grace', 'linus', 'edsger', 'barbara', 'donald'];

function tradingSetup(variant: boolean): string {
  const r = rng(variant ? VARIANT_SEED : BASE_SEED);
  const sql: string[] = [];

  sql.push(`
CREATE TABLE assets (
  symbol     TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sector     TEXT NOT NULL,
  ipo_year   INTEGER
);
CREATE TABLE price_ticks (
  tick_id    INTEGER PRIMARY KEY,
  symbol     TEXT NOT NULL REFERENCES assets(symbol),
  day        TEXT NOT NULL,
  hour       INTEGER NOT NULL,
  price      REAL NOT NULL,
  volume     INTEGER NOT NULL
);
CREATE TABLE orders (
  order_id     INTEGER PRIMARY KEY,
  trader       TEXT NOT NULL,
  symbol       TEXT NOT NULL,
  side         TEXT NOT NULL,
  qty          INTEGER NOT NULL,
  limit_price  REAL,
  status       TEXT NOT NULL,
  placed_on    TEXT NOT NULL
);
CREATE TABLE trades (
  trade_id     INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(order_id),
  symbol       TEXT NOT NULL,
  qty          INTEGER NOT NULL,
  price        REAL NOT NULL,
  executed_on  TEXT NOT NULL
);
CREATE TABLE portfolios (
  trader    TEXT NOT NULL,
  symbol    TEXT NOT NULL,
  shares    INTEGER NOT NULL,
  avg_cost  REAL NOT NULL,
  PRIMARY KEY (trader, symbol)
);`);

  sql.push(
    inserts('assets', ['symbol', 'name', 'sector', 'ipo_year'],
      SYMBOLS.map(([s, n, sec, y]) => [q(s), q(n), q(sec), String(y)]))
  );

  // Price ticks: 20 trading days × 20 symbols × 7 hours = 2800 rows.
  // Random walk per symbol so LAG/moving averages/streaks are meaningful.
  const tickRows: string[][] = [];
  let tickId = 1;
  for (const [sym] of SYMBOLS) {
    let price = 20 + r() * 180;
    for (let d = 0; d < 20; d++) {
      const day = tradingDay(d + Math.floor(d / 5) * 2); // skip weekends
      for (let h = 9; h <= 15; h++) {
        price = Math.max(2, price * (1 + (r() - 0.485) * 0.025));
        tickRows.push([
          String(tickId++), q(sym), q(day), String(h),
          price.toFixed(2), String(int(r, 100, 50_000)),
        ]);
      }
    }
  }
  sql.push(inserts('price_ticks', ['tick_id', 'symbol', 'day', 'hour', 'price', 'volume'], tickRows));

  // Orders: ~900, mixed status; market orders have NULL limit_price (the
  // NOT IN + NULL trap depends on these existing).
  const orderRows: string[][] = [];
  const statuses = ['FILLED', 'FILLED', 'FILLED', 'OPEN', 'CANCELLED'];
  const nOrders = variant ? 880 : 900;
  for (let i = 1; i <= nOrders; i++) {
    const sym = pick(r, SYMBOLS)[0];
    const market = r() < 0.18;
    orderRows.push([
      String(i), q(pick(r, TRADERS)), q(sym), q(r() < 0.55 ? 'BUY' : 'SELL'),
      String(int(r, 5, 500) * 5), market ? 'NULL' : (10 + r() * 200).toFixed(2),
      q(pick(r, statuses)), q(tradingDay(int(r, 0, 25))),
    ]);
  }
  sql.push(inserts('orders', ['order_id', 'trader', 'symbol', 'side', 'qty', 'limit_price', 'status', 'placed_on'], orderRows));

  // Trades: one per FILLED order (deterministic from the same row data).
  const tradeRows: string[][] = [];
  let tradeId = 1;
  for (const o of orderRows) {
    if (o[6] === q('FILLED')) {
      tradeRows.push([
        String(tradeId++), o[0], o[2], o[4],
        (8 + r() * 210).toFixed(2), o[7],
      ]);
    }
  }
  sql.push(inserts('trades', ['trade_id', 'order_id', 'symbol', 'qty', 'price', 'executed_on'], tradeRows));

  // Portfolios: each trader holds 4-7 symbols.
  const pfRows: string[][] = [];
  for (const t of TRADERS) {
    const held = new Set<string>();
    const n = int(r, 4, 7);
    while (held.size < n) held.add(pick(r, SYMBOLS)[0]);
    for (const sym of held) {
      pfRows.push([q(t), q(sym), String(int(r, 10, 400) * 5), (10 + r() * 190).toFixed(2)]);
    }
  }
  sql.push(inserts('portfolios', ['trader', 'symbol', 'shares', 'avg_cost'], pfRows));

  return sql.join('\n');
}

// ── Logistics: The Optimizer ───────────────────────────────────────────

const STATIONS: Array<[number, string, string]> = [
  [1, 'Meridian HQ', 'LEO'], [2, 'Aurora Ring', 'LEO'], [3, 'Kepler Yard', 'LEO'],
  [4, 'Tycho Gate', 'Lunar'], [5, 'Mare Base', 'Lunar'], [6, 'Farside Relay', 'Lunar'],
  [7, 'Ares Junction', 'Mars'], [8, 'Olympus Port', 'Mars'], [9, 'Phobos Depot', 'Mars'],
  [10, 'Ceres Hub', 'Belt'], [11, 'Vesta Forge', 'Belt'], [12, 'Pallas Reach', 'Belt'],
  [13, 'Europa Quay', 'Jovian'], [14, 'Ganymede Spur', 'Jovian'],
];
const VESSEL_CLASSES = ['Freighter', 'Tanker', 'Courier', 'Heavy Lifter'];
const CREW_ROLES = ['Captain', 'Pilot', 'Engineer', 'Loadmaster', 'Medic'];
const FIRST = ['Aria', 'Bo', 'Caz', 'Dree', 'Eko', 'Fen', 'Gale', 'Hux', 'Ines', 'Jori',
  'Kael', 'Lumi', 'Mara', 'Nico', 'Orin', 'Pax', 'Quin', 'Rhea', 'Sol', 'Tess'];
const LAST = ['Voss', 'Kade', 'Imani', 'Strand', 'Okafor', 'Lindqvist', 'Tanaka',
  'Reyes', 'Novak', 'Achebe', 'Maren', 'Castor'];
const CERTS = ['EVA', 'REACTOR', 'HAZMAT', 'NAV', 'DOCKING', 'MEDICAL'];
const CARGO_KINDS = ['water ice', 'fusion pellets', 'hull plating', 'rations',
  'medical kits', 'ore concentrate', 'spare drives', 'hydroponics racks', 'volatiles'];

function logisticsSetup(variant: boolean): string {
  const r = rng(variant ? VARIANT_SEED + 1 : BASE_SEED + 1);
  const sql: string[] = [];

  sql.push(`
CREATE TABLE stations (
  station_id  INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  orbit_zone  TEXT NOT NULL
);
CREATE TABLE routes (
  route_id      INTEGER PRIMARY KEY,
  from_station  INTEGER NOT NULL REFERENCES stations(station_id),
  to_station    INTEGER NOT NULL REFERENCES stations(station_id),
  fuel_cost     INTEGER NOT NULL,
  transit_hours INTEGER NOT NULL
);
CREATE TABLE vessels (
  vessel_id      INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  class          TEXT NOT NULL,
  max_cargo_tons INTEGER NOT NULL,
  home_station   INTEGER REFERENCES stations(station_id)
);
CREATE TABLE crew (
  crew_id      INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  vessel_id    INTEGER REFERENCES vessels(vessel_id),
  commander_id INTEGER REFERENCES crew(crew_id)
);
CREATE TABLE crew_certifications (
  crew_id  INTEGER NOT NULL REFERENCES crew(crew_id),
  cert     TEXT NOT NULL,
  PRIMARY KEY (crew_id, cert)
);
CREATE TABLE shipments (
  shipment_id  INTEGER PRIMARY KEY,
  vessel_id    INTEGER NOT NULL REFERENCES vessels(vessel_id),
  origin       INTEGER NOT NULL REFERENCES stations(station_id),
  destination  INTEGER NOT NULL REFERENCES stations(station_id),
  departed_on  TEXT NOT NULL,
  status       TEXT NOT NULL
);
CREATE TABLE cargo (
  cargo_id     INTEGER PRIMARY KEY,
  shipment_id  INTEGER NOT NULL REFERENCES shipments(shipment_id),
  description  TEXT NOT NULL,
  mass_tons    REAL NOT NULL,
  hazardous    INTEGER NOT NULL DEFAULT 0
);`);

  sql.push(inserts('stations', ['station_id', 'name', 'orbit_zone'],
    STATIONS.map(([i, n, z]) => [String(i), q(n), q(z)])));

  // Routes: a directed graph. Hub-and-spoke per zone + sparse inter-zone
  // links. Station 14 (Ganymede Spur) is reachable but has NO outbound route;
  // station 12 is only reachable via 10. This shape powers the recursive-CTE
  // reachability and EXCEPT steps.
  const fixedRoutes: Array<[number, number]> = [
    [1, 2], [2, 1], [1, 3], [3, 1], [2, 3],
    [1, 4], [4, 1], [4, 5], [5, 4], [4, 6], [6, 5],
    [1, 7], [7, 1], [7, 8], [8, 7], [7, 9], [9, 8],
    [7, 10], [10, 7], [10, 11], [11, 10], [10, 12],
    [10, 13], [13, 10], [13, 14],
    [2, 4], [5, 7], [9, 10], [3, 7], [11, 13],
  ];
  sql.push(inserts('routes', ['route_id', 'from_station', 'to_station', 'fuel_cost', 'transit_hours'],
    fixedRoutes.map(([f, t], i) => [String(i + 1), String(f), String(t), String(int(r, 8, 120)), String(int(r, 4, 90))])));

  const nVessels = 18;
  sql.push(inserts('vessels', ['vessel_id', 'name', 'class', 'max_cargo_tons', 'home_station'],
    Array.from({ length: nVessels }, (_, i) => [
      String(i + 1), q(`${pick(r, ['ISV', 'OSV', 'MCRN'])} ${pick(r, LAST)}-${int(r, 10, 99)}`),
      q(pick(r, VESSEL_CLASSES)), String(int(r, 40, 400)),
      // Two vessels are mothballed with no home station (LEFT JOIN material).
      i >= nVessels - 2 ? 'NULL' : String(int(r, 1, 14)),
    ])));

  // Crew: 60. The first 12 are captains (commander_id NULL); everyone else
  // reports to a captain — and some captains report to crew 1 (fleet commander)
  // making a 3-level hierarchy for recursive traversal.
  const crewRows: string[][] = [];
  for (let i = 1; i <= 60; i++) {
    const isCaptain = i <= 12;
    crewRows.push([
      String(i), q(`${pick(r, FIRST)} ${pick(r, LAST)}`),
      q(isCaptain ? 'Captain' : pick(r, CREW_ROLES.slice(1))),
      i <= 54 ? String(int(r, 1, nVessels)) : 'NULL', // 6 crew on leave (NULL vessel)
      isCaptain ? (i === 1 ? 'NULL' : '1') : String(int(r, 2, 12)),
    ]);
  }
  sql.push(inserts('crew', ['crew_id', 'name', 'role', 'vessel_id', 'commander_id'], crewRows));

  const certRows: string[][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 140; i++) {
    const c = int(r, 1, 60);
    const cert = pick(r, CERTS);
    const k = `${c}-${cert}`;
    if (seen.has(k)) continue;
    seen.add(k);
    certRows.push([String(c), q(cert)]);
  }
  sql.push(inserts('crew_certifications', ['crew_id', 'cert'], certRows));

  // Shipments + cargo: enough volume that indexes visibly matter.
  const nShipments = variant ? 780 : 800;
  const shipRows: string[][] = [];
  const shipStatus = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'IN_TRANSIT', 'DELAYED', 'LOST'];
  for (let i = 1; i <= nShipments; i++) {
    const origin = int(r, 1, 14);
    let dest = int(r, 1, 14);
    if (dest === origin) dest = (dest % 14) + 1;
    shipRows.push([
      String(i), String(int(r, 1, nVessels)), String(origin), String(dest),
      q(tradingDay(int(r, 0, 120))), q(pick(r, shipStatus)),
    ]);
  }
  sql.push(inserts('shipments', ['shipment_id', 'vessel_id', 'origin', 'destination', 'departed_on', 'status'], shipRows));

  const cargoRows: string[][] = [];
  let cargoId = 1;
  for (let s = 1; s <= nShipments; s++) {
    const n = int(r, 1, 3);
    for (let j = 0; j < n; j++) {
      cargoRows.push([
        String(cargoId++), String(s), q(pick(r, CARGO_KINDS)),
        (r() * 60 + 0.5).toFixed(1), r() < 0.12 ? '1' : '0',
      ]);
    }
  }
  sql.push(inserts('cargo', ['cargo_id', 'shipment_id', 'description', 'mass_tons', 'hazardous'], cargoRows));

  return sql.join('\n');
}

// ── Clinical: The Builder (bulk imports landing mid-mission) ───────────

const P_FIRST = ['Maya', 'Ahmed', 'Lena', 'Carlos', 'Priya', 'Tomas', 'Aisha', 'Ivan',
  'Sofia', 'Kenji', 'Nadia', 'Pavel', 'Rosa', 'Dmitri', 'Yuki', 'Omar', 'Greta', 'Luis'];
const P_LAST = ['Okonkwo', 'Haddad', 'Berg', 'Reyes', 'Sharma', 'Novak', 'Diallo',
  'Petrov', 'Costa', 'Mori', 'Karim', 'Sokolov', 'Mendes', 'Volkov', 'Sato', 'Farsi'];
const SITES = ['Geneva', 'Boston', 'Mumbai', 'Lagos', 'Osaka'];

/**
 * 300 legacy patients with deliberately dirty data: NULL and ''-empty emails,
 * duplicated emails, whitespace/case-inconsistent names, age outliers, and a
 * handful of exact duplicate people under different ids.
 * Target schema (built by the user in Novice):
 *   patients(patient_id, full_name, age, email, site, enrolled_on)
 */
function clinicalBulkPatients(variant: boolean): string {
  const r = rng(variant ? VARIANT_SEED + 2 : BASE_SEED + 2);
  const rows: string[][] = [];
  const emails: string[] = [];
  // (name, age, site) must be unique among ids 1000+ — the later visits seed
  // references these ids, and the dedupe step must only ever remove the
  // explicit 2000+ duplicates (or FK constraints would break on bulk load).
  const identities = new Set<string>();
  const n = variant ? 290 : 300;
  for (let i = 0; i < n; i++) {
    const id = 1000 + i;
    const fn = pick(r, P_FIRST);
    const ln = pick(r, P_LAST);
    let name = `${fn} ${ln}`;
    const dice = r();
    if (dice < 0.06) name = name.toUpperCase();            // case noise
    else if (dice < 0.12) name = `  ${name}`;              // leading whitespace
    else if (dice < 0.15) name = name.toLowerCase();

    let email: string;
    const ed = r();
    if (ed < 0.07) email = 'NULL';
    else if (ed < 0.1) email = q('');
    else if (ed < 0.18 && emails.length > 0) email = q(pick(r, emails)); // duplicate email
    else {
      const e = `${fn}.${ln}${int(r, 1, 99)}@example.org`.toLowerCase();
      emails.push(e);
      email = q(e);
    }

    let age = r() < 0.03 ? int(r, 130, 190) : int(r, 18, 89); // outliers
    const site = pick(r, SITES);
    while (identities.has(`${name}|${age}|${site}`)) age = int(r, 18, 89);
    identities.add(`${name}|${age}|${site}`);
    rows.push([
      String(id), q(name), String(age), email,
      q(site), q(tradingDay(int(r, 0, 100))),
    ]);
  }
  // Exact duplicate people (same name+age, new ids) — dedupe-step material.
  for (let d = 0; d < (variant ? 7 : 8); d++) {
    const src = rows[int(r, 0, 99)];
    rows.push([String(2000 + d), src[1], src[2], src[3], src[4], src[5]]);
  }
  return inserts('patients', ['patient_id', 'full_name', 'age', 'email', 'site', 'enrolled_on'], rows);
}

/**
 * ~1200 visit rows for the user-built visits table:
 *   visits(visit_id, patient_id, visit_on, systolic, weight_kg, notes)
 */
function clinicalBulkVisits(variant: boolean): string {
  const r = rng(variant ? VARIANT_SEED + 3 : BASE_SEED + 3);
  const rows: string[][] = [];
  const n = variant ? 1150 : 1200;
  // Must stay within the patient ids the bulk-patients seed actually created.
  const maxPatientOffset = (variant ? 290 : 300) - 1;
  for (let i = 1; i <= n; i++) {
    rows.push([
      String(i), String(1000 + int(r, 0, maxPatientOffset)), q(tradingDay(int(r, 0, 110))),
      r() < 0.05 ? 'NULL' : String(int(r, 95, 185)),
      (45 + r() * 75).toFixed(1),
      r() < 0.3 ? q(pick(r, ['stable', 'follow-up needed', 'dose adjusted', 'adverse reaction noted'])) : 'NULL',
    ]);
  }
  return inserts('visits', ['visit_id', 'patient_id', 'visit_on', 'systolic', 'weight_kg', 'notes'], rows);
}

// ── Registry ───────────────────────────────────────────────────────────

export const seedScripts: Record<string, (variant: boolean) => string> = {
  trading_setup: tradingSetup,
  logistics_setup: logisticsSetup,
  clinical_bulk_patients: clinicalBulkPatients,
  clinical_bulk_visits: clinicalBulkVisits,
};
