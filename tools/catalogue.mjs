/**
 * VAFY catalogue import.
 *
 *   node tools/catalogue.mjs draft   → data/vafy-classification-draft.csv
 *   node tools/catalogue.mjs seed    → supabase/migrations/0005_vafy_catalogue.sql
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS TWO STEPS AND NOT ONE
 *
 * The Shopify export has no `requires_prescription` field — `product_type` is
 * empty on 755 of 756 rows — and the catalogue contains diazepam, ciprofloxacin,
 * amlodipine, atorvastatin, candesartan and glimepiride. That field is what the
 * app's entire prescription gate keys on, and SRS §3 makes an unclassified
 * product a compliance defect.
 *
 * So `draft` does NOT write a catalogue. It writes a CSV of every product with
 * a PROPOSED classification, the rule that produced it, and a confidence — and
 * an empty `pharmacist_decision` column. `seed` refuses to run until that column
 * is filled in.
 *
 * The rules below are a keyword scan over product titles. They are a labour
 * saver for whoever reviews the list, and nothing more: they do not know
 * Ghanaian scheduling, they cannot read a pack size, and a brand name like
 * "Atacand" or "Robaxin" hides its active ingredient entirely. Treat every row
 * as unverified until a pharmacist has signed it off.
 * ---------------------------------------------------------------------------
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..');

/**
 * Where the six vafy-*.json exports and product-images/ live — the `altruist`
 * folder two levels above the app, alongside "ALTRUIST APP".
 */
const DATA_DIR = path.resolve(APP, '..', '..');

const FILES = {
  'vafy-baby-products.json': 'Baby',
  'vafy-beauty-and-toiletries.json': 'Beauty & Toiletries',
  'vafy-feminine-hygiene-and-care.json': 'Feminine Care',
  'vafy-vitamins-supplements.json': 'Vitamins & Supplements',
  'vafy-others.json': 'Other',
  // The master export. Everything is in here; it carries no category of its own,
  // so a product found ONLY here has no consumer category and is far more likely
  // to be a dispensary medicine.
  'vafy-products.json': null,
};

// ---------------------------------------------------------------------------
// CLASSIFICATION RULES — indicative only, see the header.
// ---------------------------------------------------------------------------

/** Scheduled / controlled. Never dispensable without a prescription. */
const CONTROLLED = [
  'diazepam', 'alprazolam', 'lorazepam', 'clonazepam', 'zolpidem', 'phenobarb',
  'tramadol', 'codeine', 'morphin', 'pethidin', 'fentanyl', 'oxycodone',
];

/** Actives and brands that are prescription-only in ordinary practice. */
const RX = [
  // antibiotics
  'amoxicill', 'amoxiclav', 'augmentin', 'ampicill', 'flucloxacill', 'penicill',
  'ciproflox', 'ciprinol', 'levofloxac', 'ofloxacin', 'norfloxacin', 'azithro',
  'clarithro', 'erythromyc', 'doxycyc', 'tetracyclin', 'metronidaz', 'tinidaz',
  'clindamyc', 'tidact', 'ceftriax', 'cefurox', 'cefixim', 'cephalexin', 'cefaclor',
  'gentamic', 'chloramphenic', 'nitrofurant', 'cotrimoxaz', 'septrin', 'trimethoprim',
  'sulfamethox', 'rifampic', 'isoniazid', 'ethambutol', 'pyrazinamide', 'vermox',
  'mebendaz', 'albendaz',
  // cardiovascular
  'amlodipin', 'amlo denk', 'nifedipin', 'lisinopr', 'enalapril', 'ramipril',
  'losartan', 'valsartan', 'candesart', 'atacand', 'telmisartan', 'atenolol',
  'bisoprol', 'metoprolol', 'carvedilol', 'propranolol', 'hydrochlorothiaz',
  'furosemid', 'spironolact', 'digoxin', 'atorvastat', 'simvastat', 'rosuvastat',
  'clopidogr', 'warfarin', 'heparin', 'enoxapar', 'methyldopa', 'aldomet',
  'hydralazin', 'isosorbid', 'glyceryl trinitr', 'verapamil', 'diltiazem',
  'indapamid', 'clonidin', 'prazosin', 'doxazosin', 'labetalol', 'nimodipin',
  // diabetes
  'metformin', 'glibenclam', 'gliclazid', 'glimepir', 'amaryl', 'sitaglipt',
  'januvia', 'insulin', 'actrapid', 'mixtard', 'lantus',
  // neuro / psych
  'carbamazep', 'valproate', 'phenytoin', 'levetiracet', 'amitriptyl', 'fluoxetin',
  'sertralin', 'escitalopram', 'olanzapin', 'risperidon', 'haloperidol',
  'chlorpromaz', 'somazina', 'citicolin', 'robaxin', 'methocarbam',
  'paroxetin', 'venlafaxin', 'mirtazapin', 'quetiapin', 'aripiprazol', 'lithium',
  'gabapentin', 'pregabalin', 'baclofen', 'tizanidin', 'donepezil',
  // steroids / respiratory
  'prednisol', 'prednison', 'dexamethas', 'hydrocortison', 'betamethason',
  'methylprednis', 'salbutamol', 'ventolin', 'seretide', 'beclometh', 'budesonid',
  'montelukast', 'theophyllin',
  // GI / urology / other
  'omepraz', 'esomepraz', 'pantopraz', 'lansopraz', 'domperidon',
  'ondansetron', 'metoclopramid', 'mesalazin', 'azathioprin', 'tacrolimus',
  'ciclosporin', 'hydroxychloroq', 'sulfasalazin', 'alendronat', 'tamoxifen',
  'oxybutynin', 'solifenacin', 'latanoprost', 'dorzolamid', 'brimonidin',
  'ceftazidim', 'meropenem', 'vancomycin', 'linezolid', 'tobramycin',
  'tamsulosin', 'finasterid', 'sildenafil', 'tadalafil', 'levothyrox', 'carbimazol',
  'methotrexat', 'allopurin', 'colchicin', 'tranexamic', 'misoprostol',
  'aciclovir', 'acyclovir', 'valacyclov', 'fluconaz', 'ketoconaz', 'itraconaz',
  'griseofulv', 'terbinafin', 'meloxicam', 'celecoxib', 'piroxicam',
];

/** Reliably general-sale. */
const OTC = [
  'paracetamol', 'panadol', 'acetaminophen', 'ibuprofen', 'brufen', 'aspirin',
  'cetirizin', 'loratadin', 'chlorphenir', 'piriton', 'antacid', 'maalox',
  'gaviscon', 'simethicone', 'oral rehydration', ' ors', 'vitamin', 'multivitamin',
  'zinc', 'calcium', 'folic acid', 'iron ', 'omega', 'cod liver', 'glucosamine',
  'plaster', 'bandage', 'gauze', 'cotton wool', 'thermometer', 'hand sanit',
  'toothpaste', 'toothbrush', 'shampoo', 'soap', 'lotion', 'diaper', 'wipes',
  'sanitary', 'tampon', 'pads', 'tissue', 'deodorant', 'roll on', 'perfume',
];

/** Dosage form or strength in the title — this looks like a medicine. */
const MEDICINE_SHAPED =
  /\b(TABS?|TABLETS?|CAPS?|CAPSULES?|SYRUP|SUSP|SUSPENSION|INJ|INJECTION|AMP|VIAL|OINT|OINTMENT|PESSAR|SUPP|\d+\s?MG|\d+\s?MCG|\d+\s?IU)\b/i;

function classify(title, categories) {
  const t = title.toLowerCase();
  const hit = (list) => list.find((w) => t.includes(w));

  const controlled = hit(CONTROLLED);
  if (controlled) {
    return { rx: true, confidence: 'high', rule: `controlled substance: ${controlled}` };
  }
  const rx = hit(RX);
  if (rx) return { rx: true, confidence: 'high', rule: `prescription-only active: ${rx}` };

  const otc = hit(OTC);
  const onlyMaster = categories.length === 0;
  const shaped = MEDICINE_SHAPED.test(title);

  if (otc && !shaped) return { rx: false, confidence: 'high', rule: `general-sale: ${otc}` };
  if (otc && shaped) return { rx: false, confidence: 'medium', rule: `general-sale active (${otc}) in a dosage form` };

  // No keyword either way. A medicine-shaped title with no consumer category is
  // a dispensary line until someone says otherwise — fail closed.
  if (shaped && onlyMaster)
    return { rx: true, confidence: 'low', rule: 'REVIEW — dosage form, no consumer category, active not recognised' };
  if (shaped)
    return { rx: true, confidence: 'low', rule: 'REVIEW — dosage form, active not recognised' };
  if (onlyMaster)
    return { rx: false, confidence: 'low', rule: 'REVIEW — no category and no dosage form' };
  return { rx: false, confidence: 'medium', rule: `consumer category: ${categories[0]}` };
}

// ---------------------------------------------------------------------------
// LOAD
// ---------------------------------------------------------------------------
function load() {
  const byHandle = new Map();
  for (const [file, category] of Object.entries(FILES)) {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) throw new Error(`missing export: ${full}`);
    for (const p of JSON.parse(fs.readFileSync(full, 'utf8'))) {
      const entry = byHandle.get(p.handle) ?? { product: p, categories: [] };
      if (category && !entry.categories.includes(category)) entry.categories.push(category);
      byHandle.set(p.handle, entry);
    }
  }
  return byHandle;
}

const images = new Set(
  fs.existsSync(path.join(DATA_DIR, 'product-images'))
    ? fs.readdirSync(path.join(DATA_DIR, 'product-images'))
    : [],
);
const imageFor = (handle) =>
  [...images].find((f) => f.replace(/\.[^.]+$/, '') === handle) ?? '';

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ---------------------------------------------------------------------------
// DRAFT
// ---------------------------------------------------------------------------
function draft() {
  const byHandle = load();
  const rows = [
    [
      'handle', 'title', 'price_ghs', 'in_stock', 'categories', 'image_file',
      'proposed_requires_prescription', 'confidence', 'rule',
      'pharmacist_decision', 'pharmacist_notes',
    ],
  ];

  let counts = { rx: 0, otc: 0, low: 0 };
  for (const [handle, { product, categories }] of [...byHandle].sort((a, b) =>
    a[1].product.title.localeCompare(b[1].product.title),
  )) {
    const v = product.variants?.[0] ?? {};
    const verdict = classify(product.title, categories);
    if (verdict.rx) counts.rx++; else counts.otc++;
    if (verdict.confidence === 'low') counts.low++;
    rows.push([
      handle,
      product.title,
      v.price ?? '',
      v.available ? 'yes' : 'no',
      categories.join(' | '),
      imageFor(handle),
      verdict.rx ? 'YES' : 'NO',
      verdict.confidence,
      verdict.rule,
      '', // pharmacist_decision — YES / NO
      '',
    ]);
  }

  const out = path.join(APP, 'data', 'vafy-classification-draft.csv');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // BOM + CRLF, because a pharmacist opens this in Excel. Excel reads a
  // BOM-less UTF-8 file as the system codepage, which arrives with every em
  // dash and accented brand name mangled — and a review file you cannot read
  // is a review that does not happen.
  fs.writeFileSync(
    out,
    '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'),
    'utf8',
  );

  console.log(`wrote ${out}`);
  console.log(`  ${rows.length - 1} products`);
  console.log(`  proposed Rx: ${counts.rx}   proposed OTC: ${counts.otc}`);
  console.log(`  LOW confidence (must be reviewed): ${counts.low}`);
  console.log('\nNext: a pharmacist fills `pharmacist_decision` (YES/NO) for every');
  console.log('row, then run: node tools/catalogue.mjs seed');
}

// ---------------------------------------------------------------------------
// SEED
// ---------------------------------------------------------------------------
function seed() {
  const csvPath = path.join(APP, 'data', 'vafy-classification-draft.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`No classification file at ${csvPath}. Run "draft" first.`);
    process.exit(1);
  }
  const lines = fs.readFileSync(csvPath, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const iHandle = header.indexOf('handle');
  const iDecision = header.indexOf('pharmacist_decision');

  const decisions = new Map();
  const undecided = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const d = (cells[iDecision] ?? '').trim().toUpperCase();
    if (d !== 'YES' && d !== 'NO') undecided.push(cells[iHandle]);
    else decisions.set(cells[iHandle], d === 'YES');
  }

  if (undecided.length) {
    console.error(
      `Refusing to build a catalogue: ${undecided.length} products have no ` +
        `pharmacist_decision.\n\n` +
        `products.requires_prescription is NOT NULL with no default precisely so\n` +
        `an unclassified medicine cannot reach the app. Fill every row first.\n\n` +
        `First few: ${undecided.slice(0, 5).join(', ')}`,
    );
    process.exit(1);
  }

  const byHandle = load();
  const values = [];
  for (const [handle, { product, categories }] of byHandle) {
    const v = product.variants?.[0] ?? {};
    const price = Number(v.price ?? 0);
    const rx = decisions.get(handle);
    const category = rx
      ? 'Prescription'
      : categories.includes('Vitamins & Supplements')
        ? 'Vitamins'
        : 'OTC';
    values.push(
      `  (${sql(handle)},${sql(product.title)},${sql(product.vendor ?? 'VAFY')},` +
        `${sql(variantPack(product))},${price},${rx},${!!v.available},` +
        `${sql(category)}::product_category,${sql(imageFor(handle))})`,
    );
  }

  const out = path.join(APP, 'supabase', 'migrations', '0005_vafy_catalogue.sql');
  fs.writeFileSync(
    out,
    `-- Generated by tools/catalogue.mjs from the VAFY export.\n` +
      `-- requires_prescription values come from the pharmacist-reviewed\n` +
      `-- data/vafy-classification-draft.csv. Do not hand-edit this file.\n\n` +
      `insert into public.products\n` +
      `  (id, name, brand, pack, price, requires_prescription, in_stock, category, image_file)\n` +
      `values\n${values.join(',\n')}\non conflict (id) do update set\n` +
      `  price = excluded.price,\n  in_stock = excluded.in_stock,\n` +
      `  requires_prescription = excluded.requires_prescription;\n`,
    'utf8',
  );
  console.log(`wrote ${out} (${values.length} products)`);
}

const sql = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`;
const variantPack = (p) => {
  const o = p.variants?.[0]?.option1;
  return o && o !== 'Default Title' ? o : '';
};

function parseCsvLine(line) {
  const out = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// ---------------------------------------------------------------------------
// OTC — the slice that is safe to ship while the pharmacist works
//
// Only products that (a) sit in at least one consumer category, and (b) the
// scan did not flag as prescription-only. Flagged rows stay out even where the
// flag is probably a false positive — a dozen are vitamins caught only for
// having "CAPS 30'S" in the title — because "probably fine" is not a
// classification. They wait in the review pile with everything else.
//
// A pharmacist decision, once present in the CSV, always beats the scan.
//
// One source, two outputs, so the fixture the app renders today and the rows
// the database gets later cannot drift apart.
// ---------------------------------------------------------------------------
const CONSUMER = ['Baby', 'Beauty & Toiletries', 'Feminine Care', 'Vitamins & Supplements', 'Other'];

function readDecisions() {
  const csvPath = path.join(APP, 'data', 'vafy-classification-draft.csv');
  const lines = fs
    .readFileSync(csvPath, 'utf8')
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const iH = header.indexOf('handle');
  const iProposed = header.indexOf('proposed_requires_prescription');
  const iDecision = header.indexOf('pharmacist_decision');
  const map = new Map();
  for (const line of lines.slice(1)) {
    const c = parseCsvLine(line);
    const decided = (c[iDecision] ?? '').trim().toUpperCase();
    map.set(c[iH], {
      proposed: c[iProposed] === 'YES',
      decided: decided === 'YES' ? true : decided === 'NO' ? false : null,
    });
  }
  return map;
}

/** Title-cases a SHOUTED Shopify title without mangling units or pack counts. */
function tidyTitle(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])([a-z']*)/g, (_m, a, b) => a.toUpperCase() + b)
    .replace(/(\d+)\s?(Mg|Ml|Mcg|Iu|Kg|G|L)\b/g, (_m, n, u) => n + u.toLowerCase())
    .replace(/(\d+)'?S\b/g, '$1s')
    .replace(/\bSpf\b/g, 'SPF')
    .replace(/\s+/g, ' ');
}

function otcSet() {
  const byHandle = load();
  const decisions = readDecisions();
  const out = [];
  for (const [handle, { product, categories }] of byHandle) {
    if (!categories.some((c) => CONSUMER.includes(c))) continue;
    const d = decisions.get(handle);
    if (!d) continue;
    if (d.decided ?? d.proposed) continue; // Rx or unreviewed-and-flagged: held back
    const v = product.variants?.[0] ?? {};
    const price = Number(v.price ?? 0);
    if (!(price > 0)) continue; // a zero price is missing data, not a free product
    out.push({
      handle,
      title: tidyTitle(product.title),
      // The shop is not the brand: a Nivea roll-on is not VAFY-branded, and
      // showing the retailer there put the wrong name on 482 products.
      // Empty means 'unknown', and the pack line drops the segment.
      brand: !product.vendor || /VAFY/i.test(product.vendor) ? '' : product.vendor,
      pack: variantPack(product) || 'Each',
      price,
      inStock: !!v.available,
      category: categories.includes('Vitamins & Supplements') ? 'Vitamins' : 'OTC',
      imageUrl: product.images?.[0]?.src ?? '',
    });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

function seedOtc() {
  const items = otcSet();
  const j = (v) => JSON.stringify(v);
  const NL = '\n';

  const fixture = [
    '/**',
    ' * GENERATED — do not edit. Rebuild with: node tools/catalogue.mjs otc',
    ' *',
    ' * The OTC slice of the VAFY catalogue: products in a consumer category that',
    ' * no pharmacist has marked prescription-only and the classification scan did',
    ' * not flag. Everything medicinal is deliberately absent until',
    ' * data/vafy-classification-draft.csv is signed off.',
    ' *',
    ' * Every row is requires_prescription: false. That is the definition of this',
    ' * slice, and it is written literally below rather than derived, so a bug in',
    ' * the generator cannot quietly promote something into the catalogue.',
    ' */',
    "import type { Product } from './catalog';",
    '',
    'export const VAFY_OTC: Product[] = [',
    ...items.map(
      (i) =>
        `  { id: ${j(i.handle)}, name: ${j(i.title)}, brand: ${j(i.brand)}, pack: ${j(i.pack)}, ` +
        `price: ${i.price}, requiresPrescription: false, inStock: ${i.inStock}, ` +
        `category: ${j(i.category)}, form: '', dosage: '', ships: ${j(i.inStock ? 'Today' : 'Out of stock')}, ` +
        `description: '', rating: 0, reviews: 0, pharmacy: PARTNER.name, ` +
        `pharmacyMeta: \`Licensed partner · ${'${PARTNER.locality}'}\`, imageUrl: ${j(i.imageUrl)} },`,
    ),
    '];',
    '',
  ].join(NL);
  fs.writeFileSync(path.join(APP, 'src', 'lib', 'catalog.generated.ts'), fixture, 'utf8');

  const sqlOut = [
    '-- GENERATED by tools/catalogue.mjs otc — do not hand-edit.',
    '-- The OTC slice only. Prescription lines are held back until',
    '-- data/vafy-classification-draft.csv has been pharmacist-reviewed.',
    '',
    'insert into public.products',
    '  (id, name, brand, pack, price, requires_prescription, in_stock, category, image_url)',
    'values',
    items
      .map(
        (i) =>
          `  (${sql(i.handle)},${sql(i.title)},${sql(i.brand)},${sql(i.pack)},${i.price},` +
          `false,${i.inStock},${sql(i.category)}::product_category,${sql(i.imageUrl)})`,
      )
      .join(',' + NL),
    'on conflict (id) do update set',
    '  price = excluded.price,',
    '  in_stock = excluded.in_stock,',
    '  image_url = excluded.image_url;',
    '',
  ].join(NL);
  fs.writeFileSync(path.join(APP, 'supabase', 'migrations', '0004_vafy_otc.sql'), sqlOut, 'utf8');

  const counts = {};
  for (const i of items) counts[i.category] = (counts[i.category] ?? 0) + 1;
  console.log(`OTC slice: ${items.length} products`);
  for (const [c, n] of Object.entries(counts)) console.log(`  ${c}: ${n}`);
  console.log(`  with an image: ${items.filter((i) => i.imageUrl).length}`);
  console.log(`  out of stock: ${items.filter((i) => !i.inStock).length}`);
  console.log('\nwrote src/lib/catalog.generated.ts');
  console.log('wrote supabase/migrations/0004_vafy_otc.sql');
}

const mode = process.argv[2];
if (mode === 'draft') draft();
else if (mode === 'otc') seedOtc();
else if (mode === 'seed') seed();
else {
  console.error('usage: node tools/catalogue.mjs draft|otc|seed');
  process.exit(1);
}
