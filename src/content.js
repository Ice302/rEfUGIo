// Everything a visitor reads lives in content.json. Edit it with the admin panel: run
// `npm run dev` and open /admin.html. README.md, under "Add your work", lists every field.
//
// Image paths start inside public/: 'work/poster.jpg' is the file public/work/poster.jpg.
// Entries flagged as samples (sample set to true) are labelled as such on the page.
//
// `text` holds changes to wording that is written into a section's layout rather than kept
// in a list here. It is keyed by section and by the original words, and src/text.js applies it.
import data from './content.json';

export const { site, sections, units, graphics, wheelCards, sleeves, wagons, sheets, photos, sites, lobby, rooms, reel, modelCredits, text } = data;
export default data;
