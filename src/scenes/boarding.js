// Reference: the chamfered typeface specimen with the boarding pass. The contact form is
// a real ticket: type your name and it prints in the stroke alphabet and in a scannable
// barcode. Tearing the stub opens an email with the details filled in.
import gsap from 'gsap';
import { site, units, modelCredits } from '../content.js';
import { word } from '../vector/glyphs.js';
import { barcodeSVG, easeIO, lerp, seg } from '../vector/lines.js';
import { pathPose } from '../stage/paths.js';

// Takeoff: the plane rotates off the bottom left and climbs out ahead of the gate arrow.
const CLIMB = [[-1.55, -1.3], [-1, -1.02], [-0.55, -0.62], [-0.12, -0.14], [0.3, 0.34], [0.8, 0.82], [1.7, 1.6]];

export function boarding(ctx) {
  const el = document.getElementById('boarding');
  const today = new Date();
  const dateStr = `${today.toLocaleString('en', { month: 'short' }).toUpperCase()}.${String(today.getDate()).padStart(2, '0')}.${today.getFullYear()}`;
  const big = (t, cls = '') => word(t, { w: 1.5, track: 1.9, cls: `big ${cls}` });

  el.innerHTML = `<div class="board-inner">
    <div class="ticket-wrap">
      <form class="ticket" data-form novalidate>
        <div class="ticket__bar"><span>Boarding pass / ${site.name.slice(0, 2)} / Line ${site.year}</span></div>
        <div class="ticket__main">
          <div class="tk-col">
            <p class="tk-l">${site.name} line, flight D-${site.year}</p>
            <p class="tk-l">Departure gate</p>
            <div class="tk-big" data-gate>${big('R12')}</div>
            <p class="tk-l">Board at</p>
            <div class="tk-big">${big('ANY TIME', 'small')}</div>
            <div class="tk-date">${word(dateStr, { w: 1.1, track: 1.6, title: dateStr })}</div>
          </div>
          <div class="tk-col tk-col--mid">
            <p class="tk-l"><b class="chip" data-route>YOU-RFG</b> <span class="tk-no">No.</span></p>
            <p class="tk-micro">1st leg, your brief. Transfer at ${site.name}.</p>
            <label class="tk-field" for="tk-msg">What are we making?</label>
            <textarea id="tk-msg" name="message" rows="3" placeholder="A poster series, a photo story, a new site..."></textarea>
            <p class="tk-l">No smoking</p>
            <div class="tk-zone">
              <div>
                <p class="tk-l">Boarding zone</p>
                <div class="tk-big tk-big--z" data-zone>${big('1')}</div>
              </div>
              <div class="tk-code" data-code-a>${barcodeSVG(`${site.name}-1`)}</div>
            </div>
            <div class="zones" role="radiogroup" aria-label="Choose what you need">
              ${units
                .map(
                  (u, i) => `<label><input type="radio" name="zone" value="${i}" ${i === 0 ? 'checked' : ''}><span>${i + 1} ${u.discipline}</span></label>`,
                )
                .join('')}
            </div>
          </div>
        </div>
        <div class="ticket__stub">
          <p class="tk-l">${site.name} line, flight D-${site.year}</p>
          <div class="tk-row"><div><p class="tk-l">Seat no.</p><div class="tk-big">${big('10C')}</div></div><p class="tk-micro tk-coach">Coach</p></div>
          <label class="tk-field" for="tk-name">Last name, first name</label>
          <input id="tk-name" name="name" autocomplete="name" placeholder="Your name" maxlength="28">
          <div class="tk-code tk-code--wide" data-code-b>${barcodeSVG('PASSENGER')}</div>
          <p class="tk-micro">Your brief &rarr; ${site.name}</p>
          <button class="tear" type="submit">Tear off and send <em>&rarr;</em></button>
          <p class="tk-micro tk-sent" role="status" aria-live="polite">Or write to ${site.email}</p>
          <button class="tk-copy" type="button" data-copy>Copy address</button>
        </div>
      </form>
    </div>
    <footer class="terminal">
      <div class="term-gate">
        <svg class="term-arrow" viewBox="0 0 40 40" aria-hidden="true"><path d="M6 34 33 7M12 7H33V28" fill="none" stroke="currentColor" stroke-width="5.4"/></svg>
        <p class="tk-l">International departure</p>
        <div class="term-gate__big">${word('GATE C-4', { w: 1.5, track: 1.9 })}</div>
      </div>
      <nav class="term-nav" aria-label="All sections">
        <button data-go="departure">Departure</button>
        <button data-go="fleet">Fleet</button>
        <button data-go="road">Graphics</button>
        <button data-go="air">Photography</button>
        <button data-go="wall">Websites</button>
        <button data-go="reel">Reel</button>
      </nav>
      <div class="term-meta mono">
        <p>${site.name}<br>Portfolio ${site.year}</p>
        <p>${site.email}</p>
        <p>Sample projects, images and contact details are placeholders.</p>
        <p class="term-credits">3D models: ${modelCredits.map((m) => `<a href="${m.source}" target="_blank" rel="noopener noreferrer">${m.title}</a> by ${m.author}, <a href="${m.licenseUrl}" target="_blank" rel="noopener noreferrer">${m.license}</a>`).join('; ')}. Simplified and redrawn as line art.</p>
      </div>
    </footer></div>`;

  const form = el.querySelector('[data-form]');
  const nameInput = el.querySelector('#tk-name');
  const msg = el.querySelector('#tk-msg');
  const codeA = el.querySelector('[data-code-a]');
  const codeB = el.querySelector('[data-code-b]');
  const zoneBig = el.querySelector('[data-zone]');
  const gate = el.querySelector('[data-gate]');
  const route = el.querySelector('[data-route]');
  const stub = el.querySelector('.ticket__stub');
  const status = el.querySelector('.tk-sent');

  function refresh() {
    const zone = +form.elements.zone.value;
    zoneBig.innerHTML = big(String(zone + 1));
    gate.innerHTML = big(`${units[zone].key[0].toUpperCase()}1${zone + 2}`);
    codeA.innerHTML = barcodeSVG(`${site.name}-${zone + 1}`);
    const nm = nameInput.value.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    codeB.innerHTML = barcodeSVG(nm || 'PASSENGER');
    route.textContent = `${(nm || 'YOU').slice(0, 3).padEnd(3, 'X')}-RFG`;
  }
  form.addEventListener('input', refresh);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!msg.value.trim()) {
      status.textContent = 'Add a line about your project first.';
      msg.focus();
      return;
    }
    const zone = +form.elements.zone.value;
    const subject = `Boarding pass: ${units[zone].discipline}`;
    const body = `${msg.value}\n\nFrom: ${nameInput.value}`;
    const href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = `Your email app should open. If not, write to ${site.email}`;
    if (!ctx.reduced) {
      gsap.timeline()
        .to(stub, { x: 34, rotation: 4, y: 14, duration: 0.5, ease: 'power3.out', transformOrigin: 'left top' })
        .to(stub, { x: 0, rotation: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, .6)' }, '+=1.1');
    }
    window.location.href = href;
  });

  el.querySelector('[data-copy]').addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(site.email);
      e.target.textContent = 'Copied';
    } catch {
      e.target.textContent = site.email;
    }
    setTimeout(() => (e.target.textContent = 'Copy address'), 2400);
  });

  const inner = el.querySelector('.board-inner');
  const overflow = () => Math.max(0, inner.scrollHeight - innerHeight);
  return {
    id: 'boarding',
    el,
    dur: 80,
    stops: [0, 1],
    wipe: 'arrow',
    wipeSec: 2,
    hud: 'bone',
    overflow,
    pure: true,
    update(p) {
      inner.style.transform = `translate3d(0,${-overflow() * p}px,0)`;
    },
    transit(q, tv) {
      if (q >= 0.5) return;
      const k = easeIO(seg(q, 0.03, 0.47));
      const pose = pathPose(CLIMB, k, innerWidth / innerHeight, { pitch: 0.3, zoom: lerp(2.2, 0.34, k) });
      tv.model = 'plane';
      tv.active = q > 0.03 && k < 1;
      tv.path = pose;
      tv.gear = 1 - seg(k, 0.25, 0.55);
      tv.fxBoost = 30;
      tv.fxClimb = 0.28;
      tv.fxBank = -pose.turn - 0.14;
      tv.contrail = 1;
    },
  };
}
