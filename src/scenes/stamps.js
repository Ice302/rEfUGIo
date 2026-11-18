// Reference: the perforated race stamp. Every graphic design project is issued as a
// stamp in a horizontal album. Hovering cancels it with a postmark.
import { graphics, site } from '../content.js';
import { lerp } from '../vector/lines.js';

const COLORS = {
  racing: { bg: '#0a4a3f', fg: '#f4f3ee' },
  blue: { bg: '#0a3fdb', fg: '#f4f3ee' },
  red: { bg: '#e5121e', fg: '#f4f3ee' },
  yellow: { bg: '#ffc60a', fg: '#111110' },
  bone: { bg: '#e7e3d7', fg: '#111110' },
  ink: { bg: '#232321', fg: '#f4f3ee' },
};

function perf(W, H, r = 10, step = 34) {
  const nx = Math.round(W / step);
  const ny = Math.round(H / step);
  const gx = W / nx;
  const gy = H / ny;
  let d = 'M0 0';
  for (let i = 0; i < nx; i++) {
    const x = gx * (i + 0.5) - r;
    d += `L${x} 0A${r} ${r} 0 0 0 ${x + 2 * r} 0`;
  }
  d += `L${W} 0`;
  for (let i = 0; i < ny; i++) {
    const y = gy * (i + 0.5) - r;
    d += `L${W} ${y}A${r} ${r} 0 0 0 ${W} ${y + 2 * r}`;
  }
  d += `L${W} ${H}`;
  for (let i = nx - 1; i >= 0; i--) {
    const x = gx * (i + 0.5) + r;
    d += `L${x} ${H}A${r} ${r} 0 0 0 ${x - 2 * r} ${H}`;
  }
  d += `L0 ${H}`;
  for (let i = ny - 1; i >= 0; i--) {
    const y = gy * (i + 0.5) + r;
    d += `L0 ${y}A${r} ${r} 0 0 0 0 ${y - 2 * r}`;
  }
  return `${d}Z`;
}

// Original emblems, drawn from code. Each sits in a 400 x 120 box.
const emblems = {
  wings(c, bg, title) {
    let s = '';
    for (let i = 0; i < 7; i++) {
      const len = 150 - i * 15;
      const y = 26 + i * 9.5;
      const skew = 10 + i * 5;
      s += `<path d="M${200 - 44 - i * 3} ${y}L${200 - 44 - len} ${y}L${200 - 44 - len + 8} ${y + 6.5}L${200 - 44 - i * 3 + skew * 0.2} ${y + 6.5}Z" fill="${c}"/>`;
      s += `<path d="M${200 + 44 + i * 3} ${y}L${200 + 44 + len} ${y}L${200 + 44 + len - 8} ${y + 6.5}L${200 + 44 + i * 3 - skew * 0.2} ${y + 6.5}Z" fill="${c}"/>`;
    }
    s += `<path d="M160 22H240L248 30V74L200 110L152 74V30Z" fill="${bg}" stroke="${c}" stroke-width="2.5"/>`;
    s += `<text x="200" y="56" text-anchor="middle" fill="${c}" font-family="Archivo" font-weight="700" font-size="15" style="font-stretch:75%">${title.toUpperCase().slice(0, 9)}</text>`;
    return s;
  },
  chevrons(c) {
    let s = '';
    for (let i = 0; i < 7; i++) {
      const x = 62 + i * 42;
      s += `<path d="M${x} 16L${x + 36} 60L${x} 104H${x + 18}L${x + 54} 60L${x + 18} 16Z" fill="${c}" opacity="${0.4 + i * 0.1}"/>`;
    }
    return s;
  },
  wave(c) {
    let s = '';
    for (let i = 0; i < 6; i++) {
      let d = '';
      for (let x = 30; x <= 370; x += 6) {
        const y = 28 + i * 13 + Math.sin(x * 0.03 + i * 0.7) * 10;
        d += `${x === 30 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
      }
      s += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${5 - i * 0.6}"/>`;
    }
    return s;
  },
  bars(c) {
    let s = '';
    const hs = [0.34, 0.6, 0.45, 0.82, 0.55, 1, 0.7, 0.4, 0.9, 0.62, 0.3, 0.76, 0.5, 0.94, 0.42, 0.68];
    hs.forEach((h, i) => {
      const bh = h * 96;
      s += `<rect x="${44 + i * 20}" y="${110 - bh}" width="14" height="${bh}" fill="${c}"/>`;
    });
    return s;
  },
  aperture(c) {
    let s = `<circle cx="200" cy="60" r="54" fill="none" stroke="${c}" stroke-width="3"/>`;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const b = a + 1.25;
      s += `<path d="M${200 + Math.cos(a) * 54} ${60 + Math.sin(a) * 54}L${200 + Math.cos(b) * 19} ${60 + Math.sin(b) * 19}" stroke="${c}" stroke-width="3"/>`;
    }
    return s;
  },
  route(c) {
    return `<path d="M34 92H130L164 58H250L284 24H366" fill="none" stroke="${c}" stroke-width="9"/>
      ${[[34, 92], [130, 92], [164, 58], [250, 58], [284, 24], [366, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${c}"/>`).join('')}`;
  },
};

// A drawn stamp, for a project without an image.
function drawn(g, fg, bg) {
  const words = g.title.toUpperCase().split(' ');
  return `
      <text x="44" y="82" fill="${fg}" class="st-title">${words[0]}</text>
      <text x="44" y="118" fill="${fg}" class="st-title">${words.slice(1).join(' ')}</text>
      <text x="44" y="146" fill="${fg}" class="st-micro">${g.type.toUpperCase()}${g.sample ? ' / SAMPLE' : ''}</text>
      <text x="546" y="112" fill="${fg}" class="st-year" text-anchor="end">${g.year}</text>
      <g transform="translate(95 162)">${emblems[g.emblem](fg, bg, g.title)}</g>
      <text x="295" y="340" fill="${fg}" class="st-val" text-anchor="middle">${g.spec[0]}</text>
      <text x="295" y="368" fill="${fg}" class="st-val" text-anchor="middle">${g.spec[1]}</text>
      <text x="548" y="372" fill="${fg}" class="st-kanji" text-anchor="end" lang="ja">${g.kanji}</text>`;
}

// A stamp for real work: the piece itself, whole, with the caption printed underneath.
// The image loads when this section is next up.
function pictured(g, fg) {
  return `
      <image data-href="${g.image}" x="26" y="26" width="538" height="284" preserveAspectRatio="xMidYMid meet"/>
      <text x="44" y="356" fill="${fg}" class="st-title"${g.title.length > 22 ? ' textLength="500" lengthAdjust="spacingAndGlyphs"' : ''}>${g.title.toUpperCase()}</text>
      <text x="44" y="384" fill="${fg}" class="st-micro">${g.type.toUpperCase()}${g.sample ? ' / SAMPLE' : ''}</text>
      <text x="546" y="384" fill="${fg}" class="st-micro" text-anchor="end">${g.year}</text>`;
}

function stamp(g, i) {
  const W = 590;
  const H = 410;
  const { bg, fg } = COLORS[g.color] ?? COLORS.ink;
  return `
  <button class="stamp" data-case-graphic="${i}" data-cursor="Open" aria-label="Open ${g.title}, ${g.type}">
    <svg viewBox="-2 -2 ${W + 4} ${H + 4}" class="stamp__svg" aria-hidden="true">
      <path d="${perf(W, H)}" fill="${bg}"/>
      ${g.image ? pictured(g, fg) : drawn(g, fg, bg)}
      <g class="postmark" transform="translate(150 290)" stroke="${fg}" fill="none" stroke-width="2.4">
        <circle r="62"/><circle r="44"/>
        <text y="-6" text-anchor="middle" fill="${fg}" stroke="none" class="pm-a">${site.name}</text>
        <text y="16" text-anchor="middle" fill="${fg}" stroke="none" class="pm-b">No.0${i + 1}</text>
        ${[0, 1, 2, 3, 4].map((k) => `<path d="M70 ${-24 + k * 12}C100 ${-36 + k * 12} 120 ${-12 + k * 12} 150 ${-24 + k * 12}S200 ${-36 + k * 12} 230 ${-24 + k * 12}"/>`).join('')}
      </g>
    </svg>
    <span class="stamp__cap"><b>No.0${i + 1}</b><span class="mono">${g.title}<br>${g.type}, ${g.year}</span></span>
  </button>`;
}

export function stamps(ctx) {
  const el = document.getElementById('stamps');
  el.innerHTML = `
    <div class="rail">
      <header class="rail-intro">
        <p class="mono">S.04 / Road unit</p>
        <h2>Issued<br>Work</h2>
        <p class="rail-intro__body">Graphic design, issued as a set of stamps. Open any one for the project behind it.</p>
        <p class="mono rail-hint">Keep scrolling &rarr; ${graphics.length} stamps</p>
      </header>
      ${graphics.map(stamp).join('')}
      <div class="rail-end"><p class="mono">End of issue</p><button class="pill" data-go="wheel">Next: Card wheel <em>&rarr;</em></button></div>
    </div>`;

  const rail = el.querySelector('.rail');
  let lastRaw = -1;
  let lastLean = 0;
  let max = 0;
  const measure = () => {
    max = Math.max(0, rail.scrollWidth - innerWidth);
    lastRaw = -1;
  };
  measure();
  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);

  return {
    id: 'stamps',
    el,
    dur: 260,
    stopsAt() {
      const stampsEls = [...el.querySelectorAll('.stamp')];
      return max ? [0, ...stampsEls.map((n) => Math.min(1, Math.max(0, (n.offsetLeft + n.offsetWidth / 2 - innerWidth / 2) / max))), 1].filter((v, i, a) => !i || v - a[i - 1] > 0.02) : [0];
    },
    hold: 0.42,
    wipe: 'perforate',
    wipeLen: 110,
    hud: 'bone',
    enter: measure,
    update(p, raw) {
      if (raw === lastRaw) return;
      lastRaw = raw;
      rail.style.transform = `translate3d(${-lerp(0, max, p)}px,0,0)`;
    },
    // Stamps lean into the direction of travel, harder when you scroll faster.
    tick() {
      const lean = Math.round(Math.max(-5, Math.min(5, ctx.stage.vel * 0.11)) * 10) / 10;
      if (lean !== lastLean) {
        lastLean = lean;
        el.style.setProperty('--lean', `${lean}deg`);
      }
    },
  };
}
