# Solace Stay — Boutique Staycation Booking Site

A premium, minimalist staycation booking website (HTML/CSS/JS) with a secure
Google Apps Script backend that stores bookings in Google Sheets and receipts
in Google Drive. No Google credentials are ever exposed in the frontend.

---

## 1. Project layout

```
Staycation-Page/
├── index.html                 # all sections (home, space, gallery, dates, book, contact)
├── assets/
│   ├── css/styles.css         # premium neutral design, fully responsive
│   ├── js/config.js           # ✏️ EDIT YOUR DETAILS HERE
│   ├── js/app.js              # gallery, calendar, booking, upload, submit
│   └── img/
│       ├── gcash-qr-placeholder.svg   # swap for your real GCash QR
│       └── gallery/           # drop your property photos here (names in config.js)
├── gas/Code.gs                # Google Apps Script Web App (backend)
└── README.md
```

---

## 2. Edit your details — `assets/js/config.js`

Everything you'll change lives in the `CONFIG` object:

| Setting | What to put |
| --- | --- |
| `staycationName` | "Solace Stay" |
| `location` | your city / area |
| `reservationFee` | fee **per night** in ₱ (e.g. `1500`) |
| `gcashName` | your GCash account name |
| `gcashNumber` | your GCash number |
| `gcashQrCode` | path to your QR image (replace the placeholder SVG) |
| `googleAppsScriptUrl` | the Web App URL (Step 4) — leave as `YOUR_...` to run in demo mode |
| `photoFolderId` | Google Drive photo folder ID |
| `galleryImages` | file names of your photos in `assets/img/gallery/` |
| `amenities` | editable feature cards |
| `demoAvailability` | optional hard-coded booked/pending dates before going live |

> The `spreadsheetId` and `receiptFolderId` are also listed for reference but
> are only used server-side in `Code.gs`.

---

## 3. Add your photos

Two options (the site auto-detects which to use):

**Option A — local images (simplest, works offline):**
1. Put your photos in `assets/img/gallery/` named exactly as listed in
   `CONFIG.galleryImages` (e.g. `hero.jpg`, `living.jpg`, …).
2. That's it — the gallery, hero, and strips read them locally.

**Option B — Google Drive folder (matches the requirement):**
1. Share the Drive photo folder **"Anyone with the link can view"**.
2. Deploy the Apps Script (Step 4) and set `CONFIG.googleAppsScriptUrl`.
3. The backend's `getPhotoUrls()` returns direct, usable image URLs for every
   file in `CONFIG.photoFolderId`, overriding the local list.

---

## 4. Deploy the backend (Google Apps Script)

1. Open your booking Google Sheet
   (`1bV9TZDYtN3zYZCH3mI4QAYDj8SXXg0YVn_ljEEw9mw`).
2. **Extensions → Apps Script**, paste the contents of `gas/Code.gs`.
3. Edit `SHEET_ID`, `FOLDER_ID`, `PHOTO_FOLDER_ID` at the top of `Code.gs`
   (they're already filled in with your IDs).
4. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the Web App URL and paste it into `CONFIG.googleAppsScriptUrl` in
   `config.js`.
6. The sheet's first row becomes the header row automatically on first use.

The sheet will store one row per booking:

`Booking ID · Timestamp · Name · Phone · Email · Check-in · Check-out ·
Nights · Fee · Payment Method · Payment Status · Receipt File Name ·
Receipt Drive Link · Booking Status · Notes`

### How availability works
The site calls `?action=availability`. `Code.gs` reads every booking and marks
each date between check-in and check-out:
- **Booking Status = Confirmed/Completed** → 🔴 BOOKED
- **Booking Status = Pending/Cancelled** → 🟡 PENDING
- no booking → 🟢 AVAILABLE

Booked dates can't be selected. To block dates, just add a booking row (or set
`demoAvailability` in `config.js`).

### Receipts
On submit, the receipt file is uploaded to the Drive receipt folder
(`1A_i2JPbsx5AIMyfI2ixaLnQnnHL1QI7-`) and its link is saved to the sheet
(column M, clickable).

---

## 5. Run it locally

Because the backend is a Web App (not `file://`), you can just open
`index.html` directly, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Until `googleAppsScriptUrl` is set, the site runs in **demo mode**: bookings
are generated with a real Booking ID and a confirmation screen, but nothing is
written to Sheets/Drive. Connect the Web App to make it live.

---

## 6. Security notes

- ✅ No service-account JSON, API keys, or OAuth secrets live in the frontend.
- ✅ All writes happen server-side in Apps Script (your account context).
- ✅ Receipts go to Drive via the backend, never through the browser with creds.
- ⚠️ Do **not** commit a real Web App URL that exposes PII — the URL itself is
  safe to share (it's an unauthenticated endpoint you control), but treat the
  connected Sheet/Drive as public-write. Use the sheet's sharing controls.

---

## 7. Deploy to GitHub Pages

```bash
git add -A
git commit -m "Solace Stay booking site"
git push origin main
```
Enable Pages on the repo (root, main branch) to get a public URL.
