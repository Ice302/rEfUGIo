// What the admin panel shows, and how. Each group is one entry in the left-hand list. Field
// rules match a path through the content, where * stands for any one step.
export const GROUPS = [
  { id: 'site', label: 'Site', note: 'Name, email and the line under the name', path: ['site'], preview: 'departure' },
  { id: 'sections', label: 'Section titles', note: 'Header names and transition title cards', path: ['sections'], preview: 'fleet' },
  { id: 'units', label: 'Fleet sheets', note: 'Road, Air and Sea units, specs and callouts', path: ['units'], preview: 'fleet', title: (u) => `${u.code} ${u.label}` },
  { id: 'graphics', label: 'Graphic design', note: 'Stamps, one per project', path: ['graphics'], preview: 'stamps', images: 'work', title: (g) => g.title },
  { id: 'wheelCards', label: 'Card wheel', note: 'Card designs', path: ['wheelCards'], preview: 'wheel', images: 'work', title: (c) => c.label },
  { id: 'sleeves', label: 'Sleeves', note: 'Printed sleeves', path: ['sleeves'], preview: 'sleeve', title: (s) => s.title.join(' ') },
  { id: 'wagons', label: 'Freight', note: 'Typographic wagons', path: ['wagons'], preview: 'freight', title: (w) => w.big },
  { id: 'sheets', label: 'Planner', note: 'Stationery sheets', path: ['sheets'], preview: 'planner', title: (s) => s.name },
  { id: 'photos', label: 'Photos', note: 'The photography strip', path: ['photos'], preview: 'air', images: 'photos', title: (p) => p.title },
  { id: 'sites', label: 'Websites', note: 'Wall and Harbour browser', path: ['sites'], preview: 'harbor', images: 'sites', title: (s) => s.name },
  { id: 'lobby', label: 'Rooms lobby', note: 'The tiles that open the rooms', path: ['lobby'], preview: 'rooms' },
  { id: 'room-frieren', label: 'Room: Frieren', note: 'Posters, feature and wording', path: ['rooms', 'frieren'], preview: 'rooms/frieren', images: 'posters', room: true },
  { id: 'room-emma', label: 'Room: Emma', note: 'Posters, feature and wording', path: ['rooms', 'emma'], preview: 'rooms/emma', images: 'posters', room: true },
  { id: 'room-mitsuki', label: 'Room: Mitsuki', note: 'Posters, feature and wording', path: ['rooms', 'mitsuki'], preview: 'rooms/mitsuki', images: 'posters', room: true },
  { id: 'reel', label: 'Reel', note: 'Three finalists', path: ['reel'], preview: 'reel', images: 'photos', title: (r) => r.title },
  { id: 'modelCredits', label: 'Model credits', note: 'Required credits for the 3D models', path: ['modelCredits'], preview: 'boarding', title: (m) => m.what },
  { id: 'text', label: 'Page text', note: 'Every other word on the page', special: 'text', preview: 'departure' },
];

export const SELECT = {
  'graphics.*.color': ['racing', 'blue', 'red', 'yellow', 'bone', 'ink'],
  'graphics.*.emblem': ['wings', 'chevrons', 'wave', 'bars', 'aperture', 'route'],
  'wheelCards.*.style': ['black', 'red', 'lime', 'green', 'white', 'blue', 'photo', 'grey'],
  'rooms.*.posters.*.layout': ['portrait', 'type', 'bloom', 'moon', 'split'],
  'units.*.callouts.*.slot': ['tl', 'ml', 'bl', 'tr', 'mr', 'br'],
  'wagons.*.color': ['red', 'ink', 'white'],
  'sheets.*.kind': ['review', 'lines', 'grid', 'check', 'table', 'route', 'month', 'week', 'day', 'memo', 'record'],
  'sections.*.line': ['Start', 'Road', 'Air', 'Sea', 'Rooms', 'Terminal'],
  'sites.*.layout': ['', 'tidewater', 'kilo-fifty', 'altitude'],
  'reel.*.scene': ['stamps', 'wheel', 'sleeve', 'freight', 'margin', 'planner', 'air', 'wall', 'voyage', 'harbor', 'rooms'],
};

// Kept out of the forms: they tie content to code, and changing them breaks things.
export const HIDDEN = ['units.*.key', 'units.*.model', 'units.*.scene', 'units.*.callouts.*.at', 'units.*.callouts.*.part', 'units.*.weight', 'text', 'rooms.*.feature.items.*.id'];

export const IMAGE_KEYS = ['image', 'src'];
export const COLOR_KEYS = ['tone', 'tint', 'ink', 'color', 'colorInk'];

export const LABELS = {
  name: 'Name',
  email: 'Email',
  line: 'Line',
  year: 'Year',
  title: 'Title',
  card: 'Title card in the transition',
  code: 'Code line',
  tone: 'Colour',
  intro: 'Introduction',
  sub: 'Sub-title lines',
  mono: 'Small print',
  foot: 'Footer lines',
  boxes: 'Feature boxes',
  eyebrow: 'Eyebrow',
  body: 'Body',
  table: 'Spec table (spec, value, in the work)',
  callouts: 'Callouts on the model',
  note: 'Note',
  label: 'Label',
  type: 'Type',
  kanji: 'Kanji',
  emblem: 'Drawn emblem (when there is no image)',
  spec: 'Spec lines',
  text: 'Description',
  image: 'Image',
  src: 'Image',
  place: 'Place',
  exif: 'Camera settings',
  focus: 'Crop focus (left% top%)',
  sample: 'Sample (labelled as a sample on the page)',
  kind: 'Kind',
  status: 'Status',
  date: 'Date',
  stack: 'Built with',
  head: 'Harbour headline, three short lines',
  url: 'Live address',
  layout: 'Layout',
  kicker: 'Kicker',
  hint: 'Hint',
  kana: 'Japanese name',
  wall: 'Wall lettering',
  series: 'Series',
  creator: 'Creator',
  alt: 'Image description, for screen readers',
  credit: 'Credit line (keep it: this is third-party art)',
  stages: 'Stage texts, 01 to 03',
  posters: 'Posters',
  feature: 'Room feature',
  items: 'Items',
  discipline: 'Discipline',
  side: 'Side',
  length: 'Length',
  scene: 'Opens section',
  what: 'What',
  author: 'Author',
  source: 'Source address',
  license: 'Licence',
  licenseUrl: 'Licence address',
  color: 'Colour',
  colorInk: 'Ink colour',
  slot: 'Position',
};

export const match = (pattern, path) => {
  const a = pattern.split('.');
  if (a.length !== path.length) return false;
  return a.every((s, i) => s === '*' || s === String(path[i]));
};
export const find = (table, path) => {
  if (Array.isArray(table)) return table.some((p) => match(p, path));
  for (const [k, v] of Object.entries(table)) if (match(k, path)) return v;
  return null;
};
