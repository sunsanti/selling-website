# F03 — Public Render (Replace Hardcoded Sections)

## Feature

Tách 3 section (About, Services, Footer) khỏi HTML hardcode trong [Views/main/index.html](../../../../../Views/main/index.html). Thay bằng 3 fetch async + render-via-textContent (XSS-safe). Sau F03, đổi nội dung trong admin (F02) sẽ phản ánh ngay trên `/main` không cần deploy.

## Scope

**UI-only** (depends on F01) — affected files:

- `Views/main/index.html` — replace 3 hardcoded section blocks with skeleton + stable IDs
- (inline `<script>` block in `index.html`) — add 3 load functions

## Implementation

> **Project constraints applied**: C2 (public endpoint, no auth), C7 (textContent for all user-supplied strings — strictly enforced via single `setText()` helper). E5 image 404 handling via `onerror`. E18 layout shift mitigation: keep skeleton sized roughly to expected content.

### Step 1 — Add `setText()` helper at top of inline `<script>` block

Find existing `<script>` block in [`Views/main/index.html`](../../../../../Views/main/index.html) (around line 460, right before `loadSettings()`):

```js
// Add at the very top of the existing inline <script> block:
function setText(el, value) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.textContent = value == null ? '' : String(value);
}
function setSrc(el, value) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el && value) el.src = value;
}
function hideIfEmpty(el, ...checkValues) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    const anyValue = checkValues.some(v => v && String(v).trim() !== '');
    if (!anyValue) el.style.display = 'none';
}
```

### Step 2 — Replace `<section id="about-us">` body with stable-ID skeleton

Find the existing about-us section (~lines 109–145). Replace **the inner content** (keep `<section>` and `<h1 class="heading">` tags) with:

```html
<section id="about-us" class="about-us">
    <h1 class="heading">About us</h1>

    <div class="content" id="about-content">
        <div class="banner" id="about-banner"></div>
        <div class="small-content">
            <div class="left">
                <div class="text" id="about-paragraph-left"></div>
            </div>
            <div class="right">
                <div class="text" id="about-paragraph-right"></div>
            </div>
        </div>
    </div>
    <div class="info" id="about-stats-info">
        <!-- 4 stat blocks injected by loadAboutSection() -->
    </div>
</section>
```

### Step 3 — Replace `<section id="services">` body

Find the services section (~lines 162–255). Replace **the 3 `.service-item` divs** with single placeholder:

```html
<section id="services" class="services">
    <h1 class="heading">Services</h1>
    <div id="services-list">
        <!-- 3 service items injected by loadServices() -->
    </div>
</section>
```

### Step 4 — Replace `<section id="footer">` body

Find the footer section (~lines 257–337). Replace **inner `.footer-container`** with placeholder:

```html
<section id="footer" class="footer">
    <div class="footer-container" id="footer-container">
        <!-- 2 footer persons injected by loadFooterPersons() -->
    </div>
</section>
```

### Step 5 — Add `loadAboutSection()` to inline `<script>`

Insert after existing `loadSettings()` definition:

```js
async function loadAboutSection() {
    try {
        const res = await fetch('/api/public/about');
        const json = await res.json();
        if (!json.success || !json.data) return;
        const d = json.data;

        setText('about-banner', d.banner);
        setText('about-paragraph-left', d.paragraph_left);
        setText('about-paragraph-right', d.paragraph_right);

        // Hide About-content block entirely if all 3 text fields empty (Q#2)
        hideIfEmpty('about-content', d.banner, d.paragraph_left, d.paragraph_right);

        // Render stats
        const info = document.getElementById('about-stats-info');
        info.innerHTML = '';   // safe: nothing user-supplied in surrounding markup
        (d.stats || []).forEach(s => {
            const block = document.createElement('div');
            block.className = 'block-num';

            const num = document.createElement('div');
            num.className = 'content-num1';
            num.textContent = s.num || '';

            const lbl = document.createElement('div');
            lbl.className = 'detail-content';
            lbl.textContent = s.label || '';

            block.appendChild(num);
            block.appendChild(lbl);
            info.appendChild(block);
        });

        if ((d.stats || []).every(s => !s.num && !s.label)) {
            info.style.display = 'none';
        }
    } catch (e) {
        console.error('loadAboutSection:', e);
        // Silent fail — section stays empty (E4). Better than broken page.
    }
}
```

### Step 6 — Add `loadServices()` to inline `<script>`

```js
async function loadServices() {
    try {
        const res = await fetch('/api/public/services');
        const json = await res.json();
        if (!json.success) return;

        const wrap = document.getElementById('services-list');
        wrap.innerHTML = '';

        (json.data || []).forEach(svc => {
            const item = document.createElement('div');
            item.className = 'service-item';

            // .content side
            const content = document.createElement('div');
            content.className = 'content';
            const box = document.createElement('div');
            box.className = 'box-content';

            const main = document.createElement('div');
            main.className = 'main-content';
            const mainP = document.createElement('p');
            mainP.textContent = svc.title || '';
            main.appendChild(mainP);
            box.appendChild(main);

            const sub = document.createElement('div');
            sub.className = 'sub-content';
            const subP = document.createElement('p');
            subP.textContent = svc.description || '';
            sub.appendChild(subP);
            box.appendChild(sub);

            const btnWrap = document.createElement('div');
            btnWrap.innerHTML = `
                <a onclick="fillInfoPopup()" class="btn-get-in-touch">
                    <span class="btn-text">click here</span>
                    <span class="btn-icon">
                        <span class="dot"></span>
                        <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7 7 17 7 17 17"></polyline>
                        </svg>
                    </span>
                </a>
            `;
            box.appendChild(btnWrap);
            content.appendChild(box);
            item.appendChild(content);

            // .image side
            const imgWrap = document.createElement('div');
            imgWrap.className = 'image';
            const img = document.createElement('img');
            img.alt = '';
            img.onerror = function () { this.style.display = 'none'; };
            if (svc.image_path) img.src = svc.image_path;
            imgWrap.appendChild(img);
            item.appendChild(imgWrap);

            wrap.appendChild(item);
        });
    } catch (e) {
        console.error('loadServices:', e);
    }
}
```

### Step 7 — Add `loadFooterPersons()` to inline `<script>`

```js
async function loadFooterPersons() {
    try {
        const res = await fetch('/api/public/footer-persons');
        const json = await res.json();
        if (!json.success) return;

        const container = document.getElementById('footer-container');
        container.innerHTML = '';

        (json.data || []).forEach(p => {
            const block = document.createElement('div');
            block.className = 'footer-person';

            // Avatar
            const imgWrap = document.createElement('div');
            imgWrap.className = 'img-footer';
            const img = document.createElement('img');
            img.alt = p.name || 'footer person';
            img.onerror = function () { this.style.display = 'none'; };
            if (p.avatar_path) img.src = p.avatar_path;
            imgWrap.appendChild(img);
            block.appendChild(imgWrap);

            const line = document.createElement('div');
            line.className = 'line';
            block.appendChild(line);

            const fc = document.createElement('div');
            fc.className = 'footer-content';

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = p.name || '';
            fc.appendChild(name);

            const detail = document.createElement('div');
            detail.className = 'footer-detail';

            // Email
            if (p.email) {
                const row = document.createElement('div');
                row.className = 'contact-row';
                const ic = document.createElement('i');
                ic.className = 'fa-solid fa-envelope';
                const a = document.createElement('a');
                a.href = `mailto:${p.email}`;
                a.textContent = p.email;
                row.appendChild(ic);
                row.appendChild(a);
                detail.appendChild(row);
            }

            // Phone1
            if (p.phone1) {
                const row = document.createElement('div');
                row.className = 'contact-row';
                const ic = document.createElement('i');
                ic.className = 'fa-solid fa-phone';
                const a = document.createElement('a');
                a.href = `tel:${p.phone1.replace(/\s+/g, '')}`;
                a.textContent = p.phone1;
                row.appendChild(ic);
                row.appendChild(a);
                detail.appendChild(row);
            }

            // Phone2
            if (p.phone2) {
                const row = document.createElement('div');
                row.className = 'contact-row';
                const ic = document.createElement('i');
                ic.className = 'fa-solid fa-phone';
                const a = document.createElement('a');
                a.href = `tel:${p.phone2.replace(/\s+/g, '')}`;
                a.textContent = p.phone2;
                row.appendChild(ic);
                row.appendChild(a);
                detail.appendChild(row);
            }

            // Facebook (E16: only if https://)
            if (p.facebook_url && /^https:\/\//i.test(p.facebook_url)) {
                const row = document.createElement('div');
                row.className = 'contact-row';
                const ic = document.createElement('i');
                ic.className = 'fa-brands fa-facebook';
                const a = document.createElement('a');
                a.href = p.facebook_url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = p.name || 'Facebook';
                row.appendChild(ic);
                row.appendChild(a);
                detail.appendChild(row);
            }

            fc.appendChild(detail);
            block.appendChild(fc);
            container.appendChild(block);
        });
    } catch (e) {
        console.error('loadFooterPersons:', e);
    }
}
```

### Step 8 — Trigger all 3 loaders on page load

Find where `loadSettings()` and `loadProjectsFromDB()` get called (typically at the end of the inline script — they may use `(async function() {…})()` pattern or just inline calls). Add:

```js
loadAboutSection();
loadServices();
loadFooterPersons();
```

These can run in parallel (Promise.all-able if wanted) since they're independent.

### UI Components (summary)

| ID | Type | Source |
|----|------|--------|
| `#about-banner` | `<div>` text | `data.banner` via `textContent` |
| `#about-paragraph-left` | `<div>` text | `data.paragraph_left` via `textContent` |
| `#about-paragraph-right` | `<div>` text | `data.paragraph_right` via `textContent` |
| `#about-stats-info` | container | 4 `.block-num` injected as DOM nodes (no innerHTML for content) |
| `#services-list` | container | 3 `.service-item` injected as DOM nodes |
| `#footer-container` | container | 2 `.footer-person` injected as DOM nodes |

### DB / KV Changes

None (read-only).

## Definition of Done

- [ ] HTML source of `/main` no longer contains the strings "MANY BEAUTIFUL PLACES", "QUANDUONG COMPLEX" (project name still in projects fetch — different feature), "Hoang Long", "Tran Minh Phat" — those are now fetched from DB
- [ ] Visual diff baseline: trang `/main` render identical to before F03 (because seed values match)
- [ ] Network tab shows `GET /api/public/about|services|footer-persons` returning 200 with JSON
- [ ] DevTools console clean — no errors / warnings
- [ ] Search `Views/main/index.html` for `innerHTML\s*=` — all set to empty string `''` only (clear containers). No `innerHTML = <user data>`
- [ ] Mobile + iPad + desktop responsive intact (no new CSS needed)
- [ ] Edit in admin (F02) → reload `/main` → change reflects without server restart
- [ ] Empty banner / empty all-stats → those sub-blocks hidden, not blank space

## Test Checklist

1. **@happy** — end-to-end content change:
   - Login admin → About → change banner to "HELLO WORLD" → Save
   - Open `/main` in another tab → reload → banner shows "HELLO WORLD"

2. **@auth** — public endpoints don't need auth (C2):
   - Open `/main` in incognito (not logged in) → all 3 fetches return 200
   - HTML body renders About / Services / Footer normally

3. **@no-xss** — paste `<script>alert(1)</script>` into banner in admin → Save → open `/main` → text shows as literal `<script>...` in DOM, NO alert popup. Verify in DevTools Elements panel that `#about-banner` content is a text node, not a `<script>` element.

4. **@e5-broken-image** — set Service 1 image_path to a non-existent file `/uploads/nope.jpg` via direct DB edit, reload `/main` → no broken-image icon (img.onerror hides element)

5. **@e16-bad-facebook** — DB has `facebook_url = 'javascript:alert(1)'` (forced via mysql shell) → `/main` renders Person 1 WITHOUT the Facebook row (filter rejects non-https)

6. **@layout-shift** — slow network (DevTools throttle to "Slow 3G") → fetch responses delayed. Sections render in order they arrive. Observed: no layout-collapse + reflow because skeleton has 0 height when empty — visible jump is acceptable given user picked inline preview over staging.

7. **@all-empty-section** — set banner, paragraph_left, paragraph_right all to empty strings in DB → `/main` reload → `#about-content` hidden (display:none), only `<h1>About us</h1>` heading + stats remain (Q#2)

## Files Created

None.

## Files Modified

| File | Change |
|------|--------|
| `Views/main/index.html` | -~150 lines (hardcoded About + 3 Services + 2 Footer person blocks). +~250 lines (skeleton + 3 loader functions + helpers in inline script) |
