# Sarath & Anjana — Wedding Invitation Website

Static site (HTML + CSS + JavaScript + GSAP). No build step — upload the folder as-is to Vercel, Netlify, GitHub Pages or any static host.

**Wedding:** Tuesday, 26 January 2027 · Muhurtham 10:30 AM – 12:00 PM
**Venue:** Neelambari Eco Tourism, Arattupuzha, Thrissur, Kerala

---

## Before you publish — 2 things to do

| # | What | Where |
|---|------|-------|
| 1 | **Connect the RSVP form** to your Google Sheet (steps below) | `js/config.js` → `rsvp.endpoint` |
| 2 | **Set your real domain** in the share-preview tags (currently `https://sarath-anjana.vercel.app/`) | `index.html` `<head>` + `js/config.js` → `siteUrl` |

Until step 1 is done, the RSVP form is clearly marked *"awaiting backend configuration"* and its submit button is disabled — it never pretends to accept a response.

The music (`assets/audio/wedding-song.mp3`) is already included.

---

## Folder structure

```
index.html                  page structure (all sections)
css/style.css               all styling
js/config.js                ← EDIT WEDDING DETAILS HERE
js/main.js                  intro video, music, countdown, RSVP, animations
js/vendor/                  GSAP 3.12.5 + ScrollTrigger (local copies, no CDN needed)
assets/
  floral-watercolor-bg.jpg  original site background (kept)
  og-image.jpg              WhatsApp / social preview, 1200×630
  video/opening-video.mp4   intro video (portrait 9:16, optimised for mobile)
  video/opening-poster.jpg  intro poster / fallback image
  art/                      supplied illustrations (couple, henna feet, terracotta artwork)
  couple/                   ← PHOTO PLACEHOLDERS (replace these)
  venue/venue.webp          ← venue photo placeholder
  audio/wedding-song.mp3 background music
google-apps-script/rsvp.gs  RSVP backend for Google Sheets
```

---

## Editing wedding details

Open `js/config.js`. Names, date, muhurtham, venue, map link, family details, countdown time, RSVP endpoint and music settings all live there. Text on the page is filled in from this file automatically.

The countdown uses `countdownTarget: '2027-01-26T10:30:00+05:30'` (India time, Asia/Kolkata) so it is correct for guests in any country.

> **Share-preview tags are the one exception.** WhatsApp/Facebook read the `<meta property="og:…">` tags in `index.html` directly and don't run JavaScript. If you change the title, description or domain, edit the `<head>` of `index.html` too.

---

## Our Moments photo

`assets/couple/our-moments.webp` is shown in the **Our Moments** section, deliberately soft (faded, gently desaturated, ivory wash) so it blends with the page. Tapping it opens the full-brightness photo.
To change it, overwrite the file with the same name. To make it brighter or softer, edit `.moments-photo img` in `css/style.css` (`opacity` and `filter`).

## Colour Code section

The **Colour Code** section (before RSVP) shows the wedding palette as designer swatch cards.
Two other built-in designs are available. Change the class on `<section id="colour-code" …>` in `index.html`:
- `palette--cards` — swatch cards (current)
- `palette--circles` — silk jewel circles
- remove the class — stacked rolled-fabric bars Guests can tap a shade to copy its colour code.
To change a shade, edit its `<li class="swatch" style="--c:#7B3A1E;">` in `index.html`: change the `--c` value, the `data-hex` value and the visible code to the same hex. To add a 10th shade, copy one `<li class="swatch">…</li>` block, then update its number, name and colour.

## Showing the gallery again

The Wedding Gallery section is currently **hidden** (commented out in `index.html`). When the photos are ready:

1. In `index.html`, find `<!-- 06 · WEDDING GALLERY — hidden for now` and delete that line.
2. Find `END WEDDING GALLERY -->` and delete that line.
3. Inside the section, replace every `<!~~` with `<!--` and every `~~>` with `-->` (use Find & Replace).

## Replacing the couple photographs

The gallery uses these files — each currently a clearly labelled placeholder:

| File | Shown as | Frame shape |
|------|----------|-------------|
| `assets/couple/groom.webp` | The Groom | portrait 4:5 |
| `assets/couple/bride.webp` | The Bride | portrait 4:5 |
| `assets/couple/couple-01.webp` | Couple photo 1 | portrait 4:5 |
| `assets/couple/couple-02.webp` | Couple photo 2 | landscape 3:2 |
| `assets/couple/couple-03.webp` | Couple photo 3 | portrait 4:5 |
| `assets/venue/venue.webp` | Venue card (real photo added) | landscape 16:9 |

**To replace:** save your photo with **exactly the same file name** and overwrite the placeholder. That's it — no code changes.

Tips:
- Export around **1200–1600 px on the long side**, WebP or JPG, ideally under 400 KB each.
  (Free converter: [squoosh.app](https://squoosh.app).)
- Photos are cropped to fill their frame automatically, so any size works.
- If a face is cropped awkwardly, adjust the focus point in `index.html` on that photo's `.photo-card__frame`:
  `style="--ratio:4/5;--focus:50% 25%;"` — first value = horizontal, second = vertical (0% = top).
- To use JPG instead of WebP, rename the file to `.jpg` and update both `src="…"` and `data-full="…"` for that photo in `index.html`.
- Tapping a photo opens it full size (lightbox).

---

## Connecting RSVP to Google Sheets

1. Create a new **Google Sheet** (e.g. "Wedding RSVPs").
2. In the sheet: **Extensions → Apps Script**.
3. Delete any sample code, paste the entire contents of `google-apps-script/rsvp.gs`, click **Save**.
4. Click **Deploy → New deployment** → gear icon → **Web app**:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - Click **Deploy** and approve the permission prompts.
5. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/…/exec`).
6. Paste it into `js/config.js`:
   ```js
   rsvp: {
     endpoint: 'https://script.google.com/macros/s/XXXXXXXX/exec',
     maxGuests: 10
   },
   ```
7. Re-upload the site and send a test RSVP. A new **RSVP** tab appears in the sheet with columns:
   Timestamp · Guest Name · Attendance · Number of Guests · Wishes.

The page shows "Thank you … your RSVP has been received" **only** after the script confirms the row was saved. Any failure shows an error and asks the guest to try again.

If you later edit the script, use **Deploy → Manage deployments → Edit → New version** (the URL stays the same).

---

## Music

- File path: `assets/audio/wedding-song.mp3` (change in `js/config.js` → `music.src` if needed).
- Starts **from the beginning (0:00) the moment the visitor taps "Tap to Begin"** and keeps playing through the intro and the whole site. The intro video plays silently, so the two never overlap.
- Fades in over 1 s to a background level of 45 %; the floating ♪ button (bottom-right) mutes/unmutes with a fade.
- The track (~44 s) loops **gently**: fade out → 1.5 s pause → fade back in. Set `loop: false` in `config.js` to play it once.
- Pauses automatically when the visitor switches apps/tabs, resumes when they return.
- Works on Android and iPhone (Web Audio is used for fades because iOS ignores media volume).

Only publish audio you have the right to use.

---

## Opening video

- `assets/video/opening-video.mp4` — mandapam entrance video (8 s, 1.6 MB, H.264, fast-start for mobile). It plays silently because the music starts on Tap to Begin.
- Portrait phones: fills the screen; only the outer edges are trimmed, never the names/date in the centre.
- Tablets/desktops (wider screens): the full 9:16 frame is shown, centred over a blurred backdrop — no stretching.
- Plays once per visit after **Tap to Begin**; **Skip Intro** jumps straight in. It never replays on scroll.

---

## WhatsApp preview

`assets/og-image.jpg` is 1200 × 630 px, built from the supplied terracotta invitation artwork.

After deploying, check it at
[developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug/) (press *Scrape Again* to refresh). WhatsApp caches previews, so a link already shared may keep the old preview for a while — test with the URL plus `?v=2`.

---

## Changing the domain (quick find & replace)

Replace `https://sarath-anjana.vercel.app/` everywhere it appears:

```bash
grep -rl "sarath-anjana.vercel.app" . | xargs sed -i 's#https://sarath-anjana.vercel.app/#https://YOUR-DOMAIN/#g'
```

(Appears in `index.html` → canonical, og:url, og:image, og:image:secure_url, twitter:image — and `js/config.js` → `siteUrl`.)

---

## Testing locally

Open via a local server (some browser features don't work from `file://`):

```bash
cd site-folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

Tested at 360, 390, 430, 768 and 1440 px widths — no horizontal scrolling, no clipped text. Respects the system "Reduce motion" setting.
