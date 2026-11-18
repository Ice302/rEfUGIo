# REFUGIO: 350 improvements

`[x]` is built and tested. `[ ]` is still open. Parts 1 and 2 are the first 250. Part 3 is the 100 added and built in the latest round.

The open items fall into three groups: things only you can supply (name, work, models), things I could not test from here (Safari, Firefox, real phones, screen readers, a real graphics card), and ideas to build next.

---

## Part 1: Usable and safe (100)

### Accessibility and motion safety
- [x] 1. Follow the system "reduce motion" setting automatically
- [x] 2. Add a visible Motion on/off switch to the header, remembered between visits
- [x] 3. Reduced-motion mode shows all ten sections in normal page flow
- [x] 4. Reduced-motion mode stops vehicle motion, trails and bobbing
- [x] 5. Make a "simple version" skip link the first keyboard stop
- [x] 6. Give every interactive element a visible keyboard focus state
- [x] 7. Keep keyboard focus trapped inside the project viewer while open
- [x] 8. Return focus to the item that opened the viewer
- [x] 9. Close the viewer with Escape, the Close button, or a click outside it
- [x] 10. Add Left and Right arrow keys to step through projects in the viewer
- [x] 11. Add Left and Right arrow keys to hop between sections
- [x] 12. Ignore shortcut keys while typing in the contact form
- [x] 13. Label the viewer with its project title for assistive technology
- [x] 14. Announce form messages through a live status region
- [x] 15. Darken small orange text so it reaches 4.5:1 on paper stocks
- [x] 16. Raise the header's section label opacity for legibility
- [x] 17. Give header controls 44px tap targets on phones
- [x] 18. Keep the Japanese text marked with its language
- [x] 19. Give photos descriptive alt text from content
- [x] 20. Hide decorative canvases and readouts from screen readers
- [x] 21. Keep hidden sections out of the keyboard tab order
- [ ] 22. Test with VoiceOver and NVDA, which I could not run here
- [ ] 23. Run a full contrast audit on every text and background pair
- [ ] 24. Measure every transition against the three-flashes-per-second rule, especially fast scrolling through the barcode
- [ ] 25. Check the palette under colour-blindness simulation
- [ ] 26. Replace placeholder alt text with descriptions of your real photos
- [ ] 27. Add a text transcript or description for any real reel videos
- [ ] 28. Support 200% browser zoom without layout collisions
- [ ] 29. Support forced-colours and high-contrast modes
- [ ] 30. Add captions if sound or video is ever introduced

### Navigation and scrolling
- [x] 31. Finish a transition automatically if scrolling stops partway through
- [x] 32. Let any new scroll input cancel that auto-finish
- [x] 33. Show a progress marker on a ruler for the whole journey
- [x] 34. Show the current section name in the header
- [x] 35. Make menu jumps play one transition instead of racing through every section
- [x] 36. Give each section a shareable address, such as #air
- [x] 37. Update the address without filling the back button with history
- [x] 38. Land correctly on deep links from a fresh load
- [x] 39. Keep the same section after switching motion on or off
- [x] 40. Add a Route button on phones, where the full menu is hidden
- [x] 41. Keep normal keyboard scrolling (Page Down, Space, Home, End) through the smooth scroller
- [x] 42. Ignore small phone viewport resizes from the address bar hiding
- [x] 43. Match the browser's theme colour to the current section on phones
- [ ] 44. Tune the total scroll length (about 30 screens) with real visitors
- [ ] 45. Add a "skip this section" control on the longest scroll sections
- [ ] 46. Add swipe gestures between tapes and stamps on touch screens
- [ ] 47. Offer a back-to-work button after opening a project
- [ ] 48. Test trackpad, mouse wheel and touch momentum on real hardware

### Forms and contact
- [x] 49. Stop an empty message and explain what to add
- [x] 50. Show the email address as text, in case email links fail
- [x] 51. Add a Copy address button with a fallback if the clipboard is refused
- [x] 52. Encode subject and body safely in the email link
- [x] 53. Strip unsafe characters from text printed on the barcode
- [x] 54. Limit name length so it cannot break the ticket layout
- [x] 55. Use proper labels and an autocomplete hint on form fields
- [ ] 56. Replace hello@example.com with your real address
- [ ] 57. Add a real form backend, so people without an email app can reach you
- [ ] 58. Add spam protection when that backend exists
- [ ] 59. Show a clear success or failure state from that backend
- [ ] 60. Add other contact routes such as social links

### Security and privacy
- [x] 61. Self-host every font, so no visitor data goes to a font service
- [x] 62. Confirm by test that the site makes no third-party requests
- [x] 63. Ship a strict Content-Security-Policy header file
- [x] 64. Block clickjacking with frame-ancestors and X-Frame-Options
- [x] 65. Set nosniff, Referrer-Policy and Permissions-Policy headers
- [x] 66. Open external project links with noopener and noreferrer
- [x] 67. Avoid inserting visitor input into the page as HTML
- [x] 68. Use no cookies and no tracking
- [x] 69. Wrap browser storage in safe fallbacks for private modes
- [x] 70. Hide the debug handle from production builds
- [ ] 71. Host over HTTPS, with HSTS, on your real domain
- [ ] 72. Run dependency audits on a schedule and before each release
- [ ] 73. Add a short privacy note, and a consent step if analytics are ever added
- [ ] 74. Check the licence on every 3D model you supply
- [ ] 75. Check any real car, airline or cruise branding on your models before publishing
- [ ] 76. Get permission for any client work or identifiable people in your photographs
- [ ] 77. Strip GPS location data from your real photographs before upload

### Reliability and failure states
- [x] 78. Keep the placeholder if a model file fails to load
- [x] 79. Keep the site working with a clear note if WebGL is unavailable
- [x] 80. Recover if the graphics driver resets during a visit
- [x] 81. Cap the loader's wait, so a stuck font can never block the site
- [x] 82. Skip the long loader for returning visitors in the same session
- [x] 83. Add a no-JavaScript message
- [x] 84. Show a usable layout on phones, tablets and short windows
- [x] 85. Add a print stylesheet
- [x] 86. Add a pre-launch check that lists every remaining placeholder
- [ ] 87. Test on Safari and Firefox, which I could not run here
- [ ] 88. Test on real iPhone and Android devices
- [ ] 89. Add a designed 404 page
- [ ] 90. Add automated visual tests to the project, so future edits cannot silently break a section
- [ ] 91. Add error monitoring after launch

### Performance
- [x] 92. Lower render resolution automatically on struggling devices
- [x] 93. Turn off trails when a device is struggling
- [x] 94. Load photos only when their section is next up
- [x] 95. Decode images off the main thread
- [x] 96. Skip work for sections and vehicles that are not on screen
- [ ] 97. Measure frame rate on real low-end phones and laptops
- [ ] 98. Serve real photos as AVIF or WebP with responsive sizes
- [ ] 99. Split the 3D code from the first load, so the first paint is faster
- [ ] 100. Set a performance budget and run Lighthouse on the live site

---

## Part 2: Getting to full potential (150)

### Car animation
- [x] 101. Spin the wheels from real speed, with visible spokes
- [x] 102. Steer the front wheels
- [x] 103. Add sprung suspension: squat, nose dive and rebound
- [x] 104. Lean the body into corners
- [x] 105. Add a faint idle vibration at low speed
- [x] 106. Tie wheel speed to scroll speed
- [x] 107. Steer with the pointer
- [x] 108. Run road markings beneath the car
- [x] 109. Lay vector tyre marks behind the rear wheels when pushed
- [x] 110. Make the car lead the stripes through their transition
- [x] 111. Make it corner along the poster's stripes and brake onto the plinth
- [x] 112. Launch it off the plinth when leaving the section
- [x] 113. Add a weave as you scroll the hero
- [x] 114. Drop it into the spec sheet with a bounce
- [x] 115. Add a live speed, gear and rev readout
- [ ] 116. Add vector exhaust flames on downshifts
- [ ] 117. Add headlight beams that sweep the panels at night-style moments
- [ ] 118. Open the doors and bonnet on the exploded view, once real model parts exist
- [ ] 119. Add brake discs glowing under hard braking
- [ ] 120. Let visitors repaint the livery with your real graphic design work
- [ ] 121. Show a real track map, with the car's progress as scroll progress

### Plane animation
- [x] 122. Spin the engine fans with speed
- [x] 123. Bank through turns, with roll settling on arrival
- [x] 124. Add turbulence as a gentle random drift
- [x] 125. Pitch with scroll direction: climb going back, dip going forward
- [x] 126. Steer the bank with the pointer
- [x] 127. Stream air lines past it
- [x] 128. Draw dashed contrails from wingtips and engines
- [x] 129. Fly S-turns along the top crop line through the photography section
- [x] 130. Add heading and altitude tapes on the crop lines
- [x] 131. Tilt a horizon bar with the bank
- [x] 132. Add working landing gear that retracts during takeoff
- [x] 133. Rotate off the ground ahead of the gate arrow
- [x] 134. Fly it through the crop grid transition
- [x] 135. Fly it away into the closing aperture until it vanishes
- [x] 136. Add a live Mach, flight level and bank readout
- [ ] 137. Move the flaps and ailerons with the bank
- [ ] 138. Add a cabin view that looks out through a window at your photographs
- [ ] 139. Fly over a real route line between places you have shot
- [ ] 140. Add vector cloud layers that part around the plane
- [ ] 141. Add strobe lights at the wingtips, within flash safety limits

### Ship animation
- [x] 142. Ride a gentle swell that grows when you scroll fast
- [x] 143. Draw wake and bow-wave lines behind it
- [x] 144. Move water lines beneath it
- [x] 145. Arrive riding the tide into the website browser
- [x] 146. Sail away under the barcode scanner
- [ ] 147. Lift decks apart to reveal a project on each level
- [ ] 148. Light up the cabins in sequence as a loading indicator
- [ ] 149. Tie each deck to a page of a real website case study

### Transitions
- [x] 150. Move vehicles above the wipes, so they cross through them
- [x] 151. Plot each section's name in the middle of its transition
- [x] 152. Score the paper with cut lines before the hero panels split
- [x] 153. Tilt the panels and thin the letters as they split
- [x] 154. Add a second colour layer to the skyline, with readouts on each bar
- [x] 155. Retract the skyline row by row, firing off rule lines
- [x] 156. Add pin-stripes and racing chevrons inside the stripes wipe
- [x] 157. Burst perforation holes outward from the car's exit, with overshoot
- [x] 158. Send postal cancellation waves ahead of the holes
- [x] 159. Unfold crop cells in the plane's wake, with marks popping at corners
- [x] 160. Replace the plain iris with seven real aperture blades
- [x] 161. Counter-rotate dashed focus rings over the blades
- [x] 162. Add four speeds of swell, plus foam, to the tide
- [x] 163. Grow the swell with scroll speed
- [x] 164. Slam barcode bars in from both edges, under a scanner beam
- [x] 165. Chase the plane with nested arrows, and open a chamfered window with outlines
- [x] 166. Give every section its own entrance and exit choreography
- [x] 167. Make menu jumps use the full choreography, not just the wipe
- [x] 168. Make the vehicles arrive through the swap in the hero rather than a plain cut
- [x] 169. Assemble and disassemble vehicles behind the scan line on the spec sheet
- [ ] 170. Make transitions play differently going backward
- [ ] 171. Add scroll-speed motion blur to the wipes
- [ ] 172. Let the vehicle chosen in the hero carry through more of the site
- [ ] 173. Add page-to-page transitions if projects get their own full pages
- [ ] 174. Add a one-time director's cut that plays the whole journey automatically
- [ ] 175. Add a shared-element move from a stamp into its project page

### Interaction
- [x] 176. Lean stamps with the direction and speed of scrolling
- [x] 177. Add an Open label to the crosshair over clickable work
- [x] 178. Add previous and next inside the viewer
- [x] 179. Preview each vehicle by hovering the hero bar
- [ ] 180. Let visitors drag to orbit a vehicle on the spec sheet
- [ ] 181. Click a callout to fly the camera to that part
- [ ] 182. Add a drive mode, where the arrow keys steer the car through the portfolio
- [ ] 183. Add a flight mode that steers the plane the same way
- [ ] 184. Add a keyboard shortcuts panel on the ? key
- [ ] 185. Offer a mix-and-match ticket that visitors can download
- [ ] 186. Make the boarding pass downloadable as a real PDF
- [ ] 187. Hide small unlockable details for return visitors
- [ ] 188. Use device tilt on phones, after asking permission, to bank and steer

### Sound
- [ ] 189. Add an optional sound layer, off by default
- [ ] 190. Use engine pitch tied to speed for the car
- [ ] 191. Add a distant jet and cabin chime for the plane
- [ ] 192. Add water and a ship's horn for the sea sections
- [ ] 193. Add print-shop and tape-deck sounds for wipes and tapes
- [ ] 194. Add a clear mute control, and remember the choice

### Visual craft
- [x] 195. Self-host the exact font axes, so width and contrast effects stay reliable
- [x] 196. Add a plotted name loader
- [x] 197. Add a share image for social links
- [x] 198. Replace code-built vehicles with your final models
- [ ] 199. Add a line-to-render scan showing your models' real materials
- [ ] 200. Commission or draw your own original kanji pairing and wordmark
- [ ] 201. Replace the harbour backdrop with a real illustration
- [ ] 202. Design a custom display typeface from the stroke alphabet
- [ ] 203. Add a dark night edition of the whole site
- [ ] 204. Add subtle paper grain and ink misregistration to print sections
- [ ] 205. Animate the hero wordmark on the tab icon

### Content and portfolio depth
- [ ] 206. Add your real name, story and photo
- [ ] 207. Add your real graphic design work as stamps
- [ ] 208. Add your real photographs, with a full series view
- [ ] 209. Add your real websites, with live screens or recordings
- [ ] 210. Give each project a full case study: brief, process, result
- [ ] 211. Add before and after sliders for redesigns
- [ ] 212. Add client quotes, with permission
- [ ] 213. Show results in numbers where you can prove them
- [ ] 214. Add filters by discipline, client type and year
- [ ] 215. Add a downloadable CV or capabilities sheet
- [ ] 216. Add availability and pricing guidance
- [ ] 217. Add a services section with clear next steps
- [ ] 218. Add real film to the VHS sleeves
- [ ] 219. Add a journal for process notes
- [ ] 220. Show awards and press, if any
- [ ] 221. Add a recent work ticker fed by your content

### Search and sharing
- [x] 222. Add a description, Open Graph and social card tags
- [x] 223. Add robots.txt
- [ ] 224. Set the full share image address on your domain
- [ ] 225. Add a sitemap once the domain exists
- [ ] 226. Add structured data for you and your work
- [ ] 227. Give each project its own crawlable page and share image
- [ ] 228. Pre-render text, so search engines see it without running scripts
- [ ] 229. Translate the site, with the kanji as a natural starting point

### Engineering and tooling
- [x] 230. Separate content, model settings and motion, so each can change alone
- [x] 231. Animate wheels and fans automatically from mesh names in your models
- [x] 232. Keep scene hooks small, so new transitions are easy to add
- [ ] 233. Add Draco and Meshopt support for compressed models
- [x] 234. Add a model preparation script that simplifies dense meshes
- [x] 235. Pre-compute model edges at build time, so large models do not stall the page
- [ ] 236. Move a CMS behind the content file, so you can update work without code
- [ ] 237. Convert the code to TypeScript as it grows
- [ ] 238. Add unit tests for the path and wipe maths
- [ ] 239. Add a debug panel for tuning poses and paths live
- [ ] 240. Render vehicles to the off-screen canvas in a worker
- [ ] 241. Move to WebGPU where supported, for heavier models
- [ ] 242. Add continuous deployment with preview links

### Launch and growth
- [ ] 243. Choose a final name and buy the domain
- [ ] 244. Add privacy-friendly visit counts, if you want numbers
- [ ] 245. Track which projects people open, with consent, to order the work
- [ ] 246. Run usability tests with five people from your target clients
- [ ] 247. Submit to design award sites after launch
- [ ] 248. Prepare short vertical clips of the transitions for social posts
- [ ] 249. Publish a behind-the-scenes post on the build
- [ ] 250. Set a monthly routine to refresh work and re-run the checks

---

## Part 3: Added and built in the latest round (100)

### The cruise ship
- [x] 251. Give the ship its own full-screen scene
- [x] 252. Film it with a real dolly move along the hull, stern to bow
- [x] 253. Float it, with heave, pitch and roll all out of step
- [x] 254. Run the sea past it, so it reads as under way
- [x] 255. Draw contour lines on the swell, fading with distance
- [x] 256. Trail a widening V of wake behind the stern
- [x] 257. Add a bow wave and foam along the waterline
- [x] 258. Hide the hull below the waterline with real depth
- [x] 259. Lay a glitter road on the water under the sun
- [x] 260. Set a slit poster sun behind the superstructure
- [x] 261. Add flat bands of cloud
- [x] 262. Add gulls with beating wings
- [x] 263. Roughen the swell when scrolling fast
- [x] 264. Caption the three stages: Stern, Midships, Bow
- [x] 265. Show speed and heading in the telemetry readout

### Retro shaders
- [x] 266. Put a full-screen retro pass over everything WebGL draws
- [x] 267. Add ink misregistration, with red and blue fringes like a press slightly out of register
- [x] 268. Add scanlines to the vehicles
- [x] 269. Tear the picture like a VHS tape when scrolling hard
- [x] 270. Add film grain to the pass
- [x] 271. Add line boil, so drawings shimmer like cel animation
- [x] 272. Replace smooth shading with three printed tones
- [x] 273. Shade vehicles in Ben-Day dots
- [x] 274. Keep engraved hatching on the spec sheets, as a technical drawing
- [x] 275. Add paper flecks where the ink did not quite take
- [x] 276. Dither the ship scene with an ordered Bayer matrix
- [x] 277. Limit the ship scene to a fixed ten-colour print palette
- [x] 278. Add a CRT curve and vignette to the ship scene
- [x] 279. Render the ship scene in deliberately chunky pixels
- [x] 280. Lay grain, scanlines and a vignette over the whole page
- [x] 281. Oversample vehicles, so lines stay smooth through the pass

### Primary palette
- [x] 282. Replace orange with a true primary red everywhere
- [x] 283. Replace mustard with a primary yellow, and brighten the blue
- [x] 284. Fix the colour conversion bug that turned yellow orange and dulled the livery
- [x] 285. Give each unit its own primary: Road red, Air blue, Sea yellow
- [x] 286. Change the Fleet sidebar colour with each unit
- [x] 287. Colour the hero bar's active square by unit
- [x] 288. Cycle photo duotones through red, blue and yellow
- [x] 289. Build the intro skyline from all three primaries
- [x] 290. Colour each tape and its number by its own primary
- [x] 291. Recolour the tide in blues
- [x] 292. Run the three primaries through the loader bar

### Lines that stayed
- [x] 293. Clear a trail the moment its vehicle leaves the screen
- [x] 294. Stop trails freezing on screen on slower machines
- [x] 295. Show the header rule only on the three sections that use it, and retract it during transitions
- [x] 296. Show the progress ruler only while scrolling
- [x] 297. Fade the crosshair when the pointer rests, and hide it during transitions
- [x] 298. Cut the road, air and water lines around vehicles down, and keep them closer in
- [x] 299. Test that the effects canvas is truly empty once a section has settled

### Stage stops
- [x] 300. Hold each scene still around its stages while the scroll keeps moving
- [x] 301. Leave the wheel, trackpad and touch input alone, with no scroll hijacking
- [x] 302. Ease to the nearest stage once scrolling ends
- [x] 303. Cancel that ease on any new input
- [x] 304. Give the hero stops for car, plane and ship
- [x] 305. Stop on each Fleet unit, each photograph and each tape
- [x] 306. Work out the stamp stops from the real layout, at any screen size
- [x] 307. Show the current stage in the header, such as 2/3
- [x] 308. Add Alt with Up or Down to move between stages

### Natural-speed transitions
- [x] 309. Add a playhead, so what you see follows the scroll at a limited speed
- [x] 310. Give every transition a minimum running time
- [x] 311. Allow longer times for the transitions with vehicles in them
- [x] 312. Cap how fast scene content can move, too
- [x] 313. Play one full transition when a flick crosses several sections, instead of a blur
- [x] 314. Land safely if that flick ends inside another transition
- [x] 315. Apply the same limit going backward

### New transitions
- [x] 316. Pinwheel: cards spin up to cover the screen, then fly apart
- [x] 317. Ticket: bands with a scalloped tear pull across
- [x] 318. Train: four rows of wagons roll in from alternating sides
- [x] 319. Strips: tall strips drop from above and below
- [x] 320. Sheets: pastel pages flip down in a cascade
- [x] 321. Pixels: a block mosaic resolves, like a signal being lost
- [x] 322. Horizon: a line crosses, then sky and sea part along it
- [x] 323. Streaks: violet strokes sweep in from both sides
- [x] 324. Hatch: ink lines thicken to black, then cross-hatch back to paper
- [x] 325. Equalizer: lime bars jump until they fill the screen
- [x] 326. Plot a title card inside each of the new transitions

### Character rooms
- [x] 327. Build three rooms in true CSS perspective
- [x] 328. Use the supplied artwork, with backgrounds removed
- [x] 329. Keep the artists' signatures and handles on the art, and credit them on the page
- [x] 330. Dolly the camera in through three stages, with the pointer adding a lean
- [x] 331. Frieren: violet streaks and rising motes, with her hem fading into a dark floor
- [x] 332. Emma: a telephone exchange wall, with patch cords that draw on as you approach
- [x] 333. Mitsuki: a shop of disc racks, a spinning record, a counter and a wall equalizer on the beat
- [x] 334. Plot each name on the back wall in the stroke alphabet
- [x] 335. Give each stage its own plaque text

### Showrooms
- [x] 336. Card wheel: a pinwheel that turns to present each card
- [x] 337. Sleeves: tickets in glossy plastic, with a sheen that follows the pointer
- [x] 338. Freight: stacked wagons rolling past each other, with turning wheels
- [x] 339. Margin: four strips on concrete, with construction lines that draw on
- [x] 340. Planner: twelve sheets that double as how a project runs
- [x] 341. Orbit: a mission poster with a turning satellite and flickering pixels

### Finding your way
- [x] 342. Add a route map of all 20 stops, on coloured lines
- [x] 343. Mark the current stop on the map, and open it with the M key or the Route button
- [x] 344. Skip page writes and all GPU work whenever nothing on screen has changed
- [x] 345. Keep keyboard focus inside the map while it is open
- [x] 346. Add a Rooms link to the header and the contents page
- [x] 347. Open cards from the wheel in the project viewer

### Reliability
- [x] 348. Keep motion-off mode working across all 20 sections
- [x] 349. Load room art and new images only when that section is next up
- [x] 350. Add a pre-launch warning about third-party character art
