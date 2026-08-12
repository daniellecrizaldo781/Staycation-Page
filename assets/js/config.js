/* =========================================================================
 *  SOLACE STAY — CONFIGURATION
 *  Edit everything in this file to make the site your own.
 *  ⚠️ NEVER put private credentials/keys in the frontend.
 *     Only the Google Apps Script *Web App URL* belongs here — that endpoint
 *     holds all secrets server-side.
 * ========================================================================= */
const CONFIG = {
  /* ---------- Property details ---------- */
  staycationName: "Solace Stay",
  tagline: "Your Little Escape Awaits.",
  location: "Tagaytay, Philippines",          // editable
  introLine: "A cozy staycation designed for rest, comfort & unforgettable moments.",

  /* ---------- Pricing (₱ Philippine Peso) ---------- */
  reservationFee: 1500,                       // editable — reservation fee per stay

  /* ---------- GCash payment (edit with YOUR details) ---------- */
  gcashName: "YOUR GCASH ACCOUNT NAME",
  gcashNumber: "YOUR GCASH NUMBER",
  /* Placeholder QR. Replace with a real path once you add your QR image,
     e.g. assets/img/gcash-qr.png  (keep the file in this repo or host it). */
  gcashQrCode: "assets/img/gcash-qr-placeholder.svg",

  /* ---------- Backend / integrations ---------- */
  /* Paste the deployed Google Apps Script Web App URL here (see README).
     Until set, the site runs in DEMO mode with local availability. */
  googleAppsScriptUrl: "YOUR_APPS_SCRIPT_WEB_APP_URL",

  /* These IDs are public (they live in the Web App URL already) but kept here
     for reference / owner-side tooling only. Safe to expose. */
  spreadsheetId: "1bV9TZDYtN3zYZCH3mI4QAYDj8SXXg0YVn_ljEEw9mw",
  receiptFolderId: "1A_i2JPbsx5AIMyfI2ixaLnQnnHL1QI7-",
  photoFolderId: "1rheaEncio4QZrT96OK0hmgj9L01VxI-a",

  /* ---------- Demo availability (used until the Web App is connected) ---------- */
  /* Format: "YYYY-MM-DD": "booked" | "pending"
     Leave empty {} for a fully open calendar. Edit freely. */
  demoAvailability: {
    // "2026-09-12": "booked",
    // "2026-09-13": "booked",
    // "2026-09-20": "pending"
  },

  /* ---------- Contact ---------- */
  contactEmail: "hello@solacestay.com",       // editable
  contactPhone: "+63 9XX XXX XXXX",           // editable
  socialHandle: "@solacestay",                // editable

  /* ---------- Gallery: your photo file names ---------- */
  /* Drop your photos into assets/img/gallery/ using these names.
     If the Apps Script photo endpoint is configured it will override these. */
  galleryImages: [
    "hero.jpg", "living.jpg", "bedroom.jpg", "kitchen.jpg",
    "bathroom.jpg", "view.jpg", "deck.jpg", "corner.jpg",
    "detail.jpg", "night.jpg", "entry.jpg", "plant.jpg"
  ],

  /* ---------- Amenities (editable placeholders) ---------- */
  amenities: [
    { icon: "🛏",  title: "Comfortable Sleeping Area", desc: "Rest well in a calm, cozy sleeping space." },
    { icon: "🛋",  title: "Cozy Living Space",         desc: "Lounge and unwind in a thoughtfully styled living room." },
    { icon: "🍳",  title: "Kitchen / Dining Area",      desc: "Everything you need to cook and share a meal." },
    { icon: "🚿",  title: "Clean & Modern Bathroom",    desc: "Fresh linens and a spotless, modern bath." },
    { icon: "📶",  title: "Wi-Fi",                      desc: "Fast, reliable internet for work or winding down." },
    { icon: "❄️", title: "Air Conditioning",           desc: "Stay cool and comfortable, day and night." },
    { icon: "📺",  title: "Entertainment",              desc: "Smart TV and streaming for cozy nights in." },
    { icon: "🔐", title: "Secure & Comfortable",        desc: "A safe, private space you can truly relax in." }
  ]
};

/* Expose globally for non-module scripts */
window.CONFIG = CONFIG;
