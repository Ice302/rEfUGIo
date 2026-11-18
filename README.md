# REFUGIO portfolio

Proof of concept: a scroll-driven portfolio for graphic design, photography and websites.

```
npm install
npm run dev      # local preview
npm run build    # static site in dist/, ready for any host
npm run check    # lists every placeholder still in the site before you launch
```

## Admin panel

With `npm run dev` running, open **http://localhost:5173/admin.html** (or whichever port the command prints). It edits everything on the site:

- every list: units and their specs, graphic design, cards, sleeves, freight, planner, photos, websites, the reel and the model credits
- each character room: its wording, its feature, and its posters (upload a poster image, or leave it empty to keep the drawn one)
- section titles and the title cards inside transitions
- **Page text**: every other word on the page. Search for it, or press **Pick text on the page** and click the words in the preview.

Changes stay in the panel until you press **Save changes** (or Cmd/Ctrl+S). Saving writes `src/content.json`, keeps the previous version in `.admin-backups/` (the last 40, restorable from the panel), and the preview reloads. Uploaded images go into `public/work/`, `public/photos/`, `public/sites/`, `public/posters/` or `public/art/`, and are never overwritten.

The panel only exists under `npm run dev`. `npm run build` ships the site alone, and the panel's file API answers only requests from this computer, made by the panel itself.

## Models

Source files live in `models-source/`. They are too heavy for a web page, so `npm run models` turns them into light files in `public/models/`: flattened, reoriented, simplified, with the drawn lines baked in. Settings for each model are at the top of `tools/prepare-models.mjs`, and display settings are in `src/fleet.config.js`.

To change a model, drop the new file in `models-source/`, add or edit its entry in the script, and run the command. Callouts in `src/content.json` point at parts by name (`at: 'center'`) or by position across the model's bounds (`at: [x, y, z]`, each from -1 to 1), so they may need re-aiming.

`npm run models` needs the source files, but the site itself only needs `public/models/`.

### Licences

Each model's licence requires credit, which is shown in the footer of the Boarding section. Keep it there.

- **Race car:** [Porsche Kremer Racing 935 K3 Midpoly](https://sketchfab.com/3d-models/porsche-kremer-racing-935-k3-midpoly-bb289f35c8eb4d898700863212a541eb) by yarzav, CC BY-NC-SA 4.0. **Non-commercial, and changes must be shared under the same licence.** A portfolio used to win paid work may not qualify, so ask the author or replace this model before relying on it commercially. The car and its livery may also involve Porsche's and Kremer's trademarks.
- **Airliner:** [Boeing 787-9](https://sketchfab.com/3d-models/boeing-787-9-b6711e2e698e4e469675c1154a50b7a3) by Nobilis 2, CC BY 4.0.
- **Ocean liner:** [RMS Queen Marry](https://sketchfab.com/3d-models/rms-queen-marry-6da64cfd2b004b80a5ac810b2649e2bd) by Mixmamo.studio, CC BY 4.0.

## Add your work

The easiest way is the admin panel above. Underneath, everything a visitor reads is in `src/content.json`, including your name and email at the top, and you can edit that file by hand too. Image files go in `public/`, and their paths are written from inside it: the file `public/work/poster.jpg` is written `"work/poster.jpg"`. With `npm run dev` running, the page reloads each time you save.

The sample entries carry `"sample": true`, which labels them as samples on the page. Replace them with your own and leave that flag off. `npm run check` lists whatever samples remain.

| Your work | Image files go in | List in `src/content.json` | Where it appears |
|---|---|---|---|
| Graphic design | `public/work/` | `graphics` | Stamps, then full size when opened |
| Card designs | `public/work/` | `wheelCards` | Card wheel |
| Photos | `public/photos/` | `photos` | Photography strip, then full size when opened |
| Websites | `public/sites/` | `sites` | Websites wall (first three) and the Harbour browser (all) |
| Room posters | `public/posters/` | `rooms` > each room > `posters` | The carousel behind each character |

**Graphic design.** The whole piece shows on its stamp, uncropped. `color` is the stamp paper: racing, blue, red, yellow, bone or ink. Titles over 22 characters are squeezed to fit.

```js
{ id: 'night-market', title: 'Night Market', type: 'Poster', year: 2026, color: 'ink', image: 'work/night-market.jpg', text: 'What it was for, and what you did.' },
```

**Card designs.** The image fills the card, so export the card front at about 3:2.

```js
{ label: 'Studio Card', note: 'Business card', image: 'work/studio-card.jpg' },
```

**Photos.** The strip crops each photo to nearly square, and `focus` picks the part that stays, as left and top percentages. The full photo shows when opened. `text` is an optional caption.

```js
{ src: 'photos/harbour-dawn.jpg', title: 'Harbour, Dawn', place: 'Lisbon', exif: '35 mm, f/8, 1/250', focus: '50% 30%', text: 'Optional caption.' },
```

**Websites.** `image` is a screenshot of the top of the page at 16:10, such as 1600 × 1000. `head` is the three-line headline on the Harbour board. Leave out `layout`: that picks one of the made-up sample pages, and without it your screenshot sits in a plain browser frame.

```js
{
  id: 'studio-site',
  name: 'Studio Site',
  kind: 'Architecture studio',
  status: 'Live',
  date: 'Launched March 2026',
  stack: ['Astro', 'GSAP'],
  head: ['THREE', 'SHORT', 'LINES'],
  text: 'What the site does, and what you built.',
  image: 'sites/studio-site.jpg',
  url: 'https://the-real-address.com',
},
```

**Room posters.** Portrait, 2:3, such as 1200 × 1800. A poster with no `image` is drawn from one of five templates (`layout`: portrait, type, bloom, moon or split) in its `tone` colour.

**Image files.** JPEG or WebP, about 2400 px on the long side for photos and designs, and ideally under 600 KB each. Each section's images load just before it is reached, so a long list does not slow the first visit.

Keep the generated `public/photos/ph-01.jpg` to `ph-09.jpg` until the samples that use them are gone: the Reel, Margin and Card wheel samples still point at some of them.

## Pacing

`src/engine.js` holds the pacing. What you see follows the scroll with a speed that eases up and down (`FOLLOW`, `ACCEL`) and never passes a limit: `SCENE_RATE` inside a section, and each scene's `wipeSec`, the shortest time its opening transition can take. `stops` lists where a section lingers; `LEAK` is how much of the scroll still moves the picture there, so it never freezes under a moving finger.

## Character rooms

The rooms are not part of the scroll. The Rooms section holds a button for each, and a room opens over the page: the tile grows to fill the screen, then the room's own transition reveals it. A glass rail on the left switches rooms or goes back. Each room has a poster carousel behind the character, hung its own way (an arc for Frieren, a wire for Emma, a record rack for Mitsuki), and a feature: Frieren's grimoire casts small spells, Emma's switchboard takes calls, and Mitsuki's listening booth plays a short synthesised loop. Links such as `#rooms/emma` open a room directly. Code is in `src/rooms/`.

The room figures in `public/art/` are third-party artwork cut out from your references. Get permission from each artist before this goes public, or replace the images in the admin panel.

## Publishing

`public/_headers` sets security headers on hosts that read that file, such as Netlify and Cloudflare Pages. Other hosts need the same headers in their own settings. Before launch, change `og:image` in `index.html` to a full address on your domain.

Fonts are self-hosted from `src/fonts/` under the SIL Open Font License, so visitors' browsers never contact a font service.

## Moving parts

- `src/stage/retro.js`: the retro shader, and `src/stage/voyage.js`: the ship's dolly shot and sea.
- `src/text.js`: applies the Page text changes from the admin panel.
- `src/stage/lineart.js`: the line-art look, and the exploded view (each part moves away from the largest along the axes it sits on).
- `src/stage/stage.js`: motion for each vehicle (wheels, steering, suspension, banking, fans, swell), fed by scroll speed and the pointer.
- `src/stage/paths.js`: keeps a vehicle on a curve drawn in screen space, with its nose along the direction of travel.
- `src/vector/trails.js`: tyre marks, contrails and wake.
- Scene hooks in `src/engine.js`: `wipeOut`, `wipeIn` and `transit` choreograph each boundary, and `--in` and `--out` let the stylesheet move a section's parts.

Open improvements, with what is finished so far, are listed in `IMPROVEMENTS.md`.

## How it is built

| Section | Scene file | Reference | Wipe that opens it |
| --- | --- | --- | --- |
| Departure (hero) | `scenes/hero.js` | Sliced type specimen | Plotted on at load |
| Manifest + Contents | `scenes/manifest.js` | Serif deck, red block | Panels shutter apart |
| Fleet spec sheets | `scenes/fleet.js` | Industrial product sheet | Skyline, lands on the sidebar |
| Road poster | `scenes/road.js` | Motorsport poster | Racing stripes |
| Stamps (graphics) | `scenes/stamps.js` | Perforated stamp | Perforation holes |
| The Long View (photos) | `scenes/air.js` | Studio reel, crop lines | Crop grid |
| Selected Websites | `scenes/wall.js` | Type wall, tilted pages | Aperture |
| Harbour (site browser) | `scenes/harbor.js` | Floating app card | Horizon |
| Card wheel, Sleeves, Freight, Margin, Planner | `scenes/showrooms.js` | Your showroom references | Pinwheel, Ticket, Train, Strips, Sheets |
| Voyage (the ship) | `scenes/voyage.js`, `stage/voyage.js` | Dolly shot | Tide |
| Rooms (lobby) | `scenes/lobby.js` | Profile tiles | Pixels |
| Frieren, Emma, Mitsuki rooms | `rooms/` (open over the page) | Supplied character art, book shelf, glass rail | Streaks, Hatch, Equalizer |
| Reel | `scenes/reel.js` | VHS sleeve | Barcode |
| Boarding (contact) | `scenes/boarding.js` | Boarding pass specimen | Gate arrow |

`src/engine.js` maps scroll to scenes and wipes, `src/vector/wipes.js` draws the wipes, and `src/stage/` holds the 3D pipeline.
