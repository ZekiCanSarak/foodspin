'use strict';

/* ── Data ─────────────────────────────────────────────── */
const COUNTRIES = [
    { name: 'American',   flag: '🇺🇸' },
    { name: 'British',    flag: '🇬🇧' },
    { name: 'Canadian',   flag: '🇨🇦' },
    { name: 'Chinese',    flag: '🇨🇳' },
    { name: 'Croatian',   flag: '🇭🇷' },
    { name: 'Dutch',      flag: '🇳🇱' },
    { name: 'Egyptian',   flag: '🇪🇬' },
    { name: 'Filipino',   flag: '🇵🇭' },
    { name: 'French',     flag: '🇫🇷' },
    { name: 'Greek',      flag: '🇬🇷' },
    { name: 'Indian',     flag: '🇮🇳' },
    { name: 'Irish',      flag: '🇮🇪' },
    { name: 'Italian',    flag: '🇮🇹' },
    { name: 'Jamaican',   flag: '🇯🇲' },
    { name: 'Japanese',   flag: '🇯🇵' },
    { name: 'Kenyan',     flag: '🇰🇪' },
    { name: 'Malaysian',  flag: '🇲🇾' },
    { name: 'Mexican',    flag: '🇲🇽' },
    { name: 'Moroccan',   flag: '🇲🇦' },
    { name: 'Polish',     flag: '🇵🇱' },
    { name: 'Portuguese', flag: '🇵🇹' },
    { name: 'Russian',    flag: '🇷🇺' },
    { name: 'Spanish',    flag: '🇪🇸' },
    { name: 'Thai',       flag: '🇹🇭' },
    { name: 'Tunisian',   flag: '🇹🇳' },
    { name: 'Turkish',    flag: '🇹🇷' },
    { name: 'Vietnamese', flag: '🇻🇳' },
];

const ITEM_H  = 80;  // px — must match CSS .reel-item height
const REPEATS = 40;  // strip repetitions — keeps strip long enough

/* ── Lights ───────────────────────────────────────────── */
const LIGHT_COLORS = ['#ff4444', '#44dd44', '#4488ff', '#ffcc00', '#ff44ff', '#44ffff'];
const lightsBar = document.getElementById('lightsBar');

for (let i = 0; i < 36; i++) {
    const d = document.createElement('div');
    d.className = 'dot';
    d.style.background = LIGHT_COLORS[i % LIGHT_COLORS.length];
    d.style.animationDelay = `${(i * 0.07).toFixed(2)}s`;
    lightsBar.appendChild(d);
}

/* ── Reel class ───────────────────────────────────────── */
class Reel {
    constructor(rowEl) {
        this.rowH   = COUNTRIES.length * ITEM_H;
        this.offset = (REPEATS / 2) * this.rowH; // start mid-strip

        const wrap = document.createElement('div');
        wrap.className = 'reel-wrapper';

        this.win = document.createElement('div');
        this.win.className = 'reel-window';

        this.strip = document.createElement('div');
        this.strip.className = 'reel-strip';

        for (let r = 0; r < REPEATS; r++) {
            for (const c of COUNTRIES) {
                const item = document.createElement('div');
                item.className = 'reel-item';
                item.innerHTML =
                    `<span class="fi">${c.flag}</span>` +
                    `<span class="fn">${c.name}</span>`;
                this.strip.appendChild(item);
            }
        }

        this.win.appendChild(this.strip);
        wrap.appendChild(this.win);
        rowEl.appendChild(wrap);
        this._draw();
    }

    _draw() {
        this.strip.style.transform = `translateY(-${this.offset}px)`;
    }

    spin(targetIdx, duration, delay) {
        return new Promise(resolve => {
            setTimeout(() => {
                const start      = this.offset;
                const extraSpins = 5 + Math.floor(Math.random() * 4);
                const target     = start + extraSpins * this.rowH + targetIdx * ITEM_H - ITEM_H;
                const t0         = performance.now();

                const tick = (now) => {
                    const p = Math.min((now - t0) / duration, 1);
                    const e = 1 - Math.pow(1 - p, 4); // ease-out quartic

                    this.offset = start + (target - start) * e;
                    this._draw();

                    // blur proportional to instantaneous speed
                    const speed = (target - start) * (1 - p) / duration * 16;
                    this.strip.style.filter = `blur(${Math.min(speed * 0.04, 5)}px)`;

                    if (p < 1) {
                        requestAnimationFrame(tick);
                    } else {
                        this.offset = target;
                        this._draw();
                        this.strip.style.filter = '';

                        // Normalize offset so the strip never runs out after many spins
                        const base = ((this.offset % this.rowH) + this.rowH) % this.rowH;
                        this.offset = base + (REPEATS / 4) * this.rowH;
                        this._draw();

                        resolve();
                    }
                };

                requestAnimationFrame(tick);
            }, delay);
        });
    }
}

/* ── Build three reels ────────────────────────────────── */
const reelsRow = document.getElementById('reelsRow');
const reels = [
    new Reel(reelsRow),
    new Reel(reelsRow),
    new Reel(reelsRow),
];

/* ── Spin handler ─────────────────────────────────────── */
const spinBtn    = document.getElementById('spinBtn');
const statusText = document.getElementById('statusText');
const resultCard = document.getElementById('resultCard');
const machine    = document.getElementById('machine');
let busy = false;

spinBtn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    spinBtn.disabled = true;
    resultCard.classList.remove('show');
    statusText.className = 'status-text';
    statusText.textContent = 'Spinning…';

    const idx = Math.floor(Math.random() * COUNTRIES.length);

    // stagger: left stops first, right last
    await Promise.all([
        reels[0].spin(idx, 2200, 0),
        reels[1].spin(idx, 2900, 150),
        reels[2].spin(idx, 3600, 300),
    ]);

    // Derive country from the reel's actual position — guarantees recipe matches display.
    // Middle slot starts ITEM_H pixels into the window, so add ITEM_H to the offset.
    const midStripPos = reels[0].offset + ITEM_H;
    const rawIdx      = Math.round(midStripPos / ITEM_H);
    const chosenIdx   = ((rawIdx % COUNTRIES.length) + COUNTRIES.length) % COUNTRIES.length;
    const chosen      = COUNTRIES[chosenIdx];

    // win flash
    machine.classList.remove('won');
    void machine.offsetWidth; // force reflow to restart animation
    machine.classList.add('won');

    statusText.className = 'status-text win';
    statusText.textContent = `${chosen.flag}  ${chosen.name} cuisine!`;

    await loadMeal(chosen);
    busy = false;
    spinBtn.disabled = false;
});

/* ── API helpers ──────────────────────────────────────── */
async function loadMeal(country) {
    resultCard.innerHTML = `
        <div class="loader">
            <div class="spin-ring"></div>
            <p>Finding a delicious ${country.name} dish…</p>
        </div>`;
    resultCard.classList.add('show');

    try {
        const listRes  = await fetch(
            `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(country.name)}`
        );
        const listJson = await listRes.json();
        if (!listJson.meals?.length) throw new Error('No meals found for this cuisine.');

        const pick = listJson.meals[Math.floor(Math.random() * listJson.meals.length)];

        const detailRes  = await fetch(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${pick.idMeal}`
        );
        const detailJson = await detailRes.json();
        renderMeal(detailJson.meals[0], country);
    } catch (e) {
        resultCard.innerHTML = `
            <div class="err">
                ⚠️ Couldn't load a meal — try spinning again.
                <small>${e.message}</small>
            </div>`;
    }
}

function parseSteps(raw) {
    // try newline split first
    let steps = raw.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 5);
    if (steps.length >= 2) return steps;

    // fall back: split on sentence boundaries
    steps = raw
        .replace(/([.!?])\s+/g, '$1\n')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 5);
    return steps.length ? steps : [raw.trim()];
}

function renderMeal(m, country) {
    // collect non-empty ingredient pairs
    const ings = [];
    for (let i = 1; i <= 20; i++) {
        const ing  = (m[`strIngredient${i}`] || '').trim();
        const meas = (m[`strMeasure${i}`]    || '').trim();
        if (ing) ings.push({ ing, meas });
    }

    const steps = parseSteps(m.strInstructions || '');

    resultCard.innerHTML = `
        <div class="hero">
            <img src="${m.strMealThumb}" alt="${m.strMeal}" loading="lazy">
            <div class="hero-overlay">
                <span class="badge">${country.flag} ${country.name} Cuisine</span>
                <h2 class="dish-name">${m.strMeal}</h2>
            </div>
        </div>
        <div class="meal-body">
            <div class="meal-grid">
                <div>
                    <p class="sec-label">Ingredients</p>
                    <ul class="ing-list">
                        ${ings.map(({ ing, meas }) =>
                            `<li>${meas ? `<span class="meas">${meas}</span> ` : ''}<span>${ing}</span></li>`
                        ).join('')}
                    </ul>
                </div>
                <div>
                    <p class="sec-label">How to Cook</p>
                    <ol class="steps">
                        ${steps.map(s => `<li>${s}</li>`).join('')}
                    </ol>
                    ${m.strYoutube
                        ? `<a class="yt-link" href="${m.strYoutube}" target="_blank" rel="noopener noreferrer">
                               ▶ Watch on YouTube
                           </a>`
                        : ''}
                </div>
            </div>
        </div>`;

    resultCard.classList.add('show');
}
