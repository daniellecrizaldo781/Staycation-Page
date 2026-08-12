/* =========================================================================
   SOLACE STAY — Frontend application
   Gallery · Calendar · Multi-step booking · GCash receipt upload · Submit
   Talks ONLY to the Google Apps Script Web App (set in CONFIG).
   No Google credentials live in this file.
   ========================================================================= */
(function () {
  "use strict";

  const C = window.CONFIG;
  const fmt = (n) => "₱" + Number(n).toLocaleString("en-PH");
  const dateKey = (d) => {
    const z = (x) => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  };
  const pretty = (key) => {
    if (!key) return "—";
    const [y, m, d] = key.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[parseInt(m, 10) - 1] + " " + parseInt(d, 10) + ", " + y;
  };
  const $ = (id) => document.getElementById(id);

  /* Elegant neutral placeholder shown if a real photo isn't present yet,
     so the layout always looks intentional and premium. */
  const FALLBACK_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='#E7DECF'/><stop offset='1' stop-color='#C9BCA8'/>" +
    "</linearGradient></defs>" +
    "<rect width='800' height='600' fill='url(#g)'/>" +
    "<text x='400' y='300' font-family='Georgia,serif' font-size='36' fill='#8A7559' " +
    "text-anchor='middle' opacity='.45'>Solace Stay</text>" +
    "<text x='400' y='338' font-family='Helvetica,Arial' font-size='13' fill='#8A7559' " +
    "text-anchor='middle' opacity='.4' letter-spacing='4'>YOUR PHOTO</text></svg>";
  const FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent(FALLBACK_SVG);
  function attachFallback(img) {
    img.onerror = function () { this.onerror = null; this.src = FALLBACK; };
  }

  /* ---------------- State ---------------- */
  const state = {
    images: [],
    avail: {},            // "YYYY-MM-DD": "booked"|"pending"
    checkin: null,
    checkout: null,
    calMonth: new Date().getFullYear(),
    calYear: new Date().getMonth(),
    step: 1,
    booking: null
  };

  /* ---------------- Image sources ---------------- */
  function buildImageList() {
    // Prefer assets/img/gallery/ names from CONFIG (you drop real photos there).
    // If the Apps Script exposes a photo endpoint it overrides this.
    return C.galleryImages.map((n) => "assets/img/gallery/" + n);
  }

  async function loadImages() {
    state.images = buildImageList();
    // Try the Apps Script photo endpoint (returns base64-image proxy URLs).
    const url = C.googleAppsScriptUrl;
    if (url && url.indexOf("YOUR_") !== 0) {
      try {
        const r = await fetch(url + "?action=photos&folderId=" + encodeURIComponent(C.photoFolderId));
        const j = await r.json();
        if (j && j.images && j.images.length) {
          // Each entry is a ?action=image&id= URL -> fetch + decode base64.
          state.images = await Promise.all(
            j.images.map(async (u) => {
              try {
                const ir = await fetch(u);
                const ij = await ir.json();
                if (ij && ij.result === "success" && ij.base64) {
                  return "data:" + ij.mime + ";base64," + ij.base64;
                }
              } catch (e) {}
              return u; // leave as-is if decode fails
            })
          );
        }
      } catch (e) { /* keep local fallback */ }
    }
    if (!state.images.length) {
      state.images = ["https://picsum.photos/seed/solace/1200/800"];
    }
    paintImages();
  }

  function paintImages() {
    const imgs = state.images;
    const pick = (i) => imgs[((i % imgs.length) + imgs.length) % imgs.length];
    const hi = $("heroImg"); hi.src = pick(0); attachFallback(hi);
    const ii = $("introImg"); ii.src = pick(1 % imgs.length); attachFallback(ii);
    const gf = $("galleryFeature"); gf.src = pick(2 % imgs.length); attachFallback(gf);

    // strip
    const track = $("stripTrack");
    track.innerHTML = "";
    [...imgs, ...imgs].forEach((src, i) => {
      const im = document.createElement("img");
      im.src = src; im.alt = "Solace Stay"; im.loading = "lazy";
      attachFallback(im);
      track.appendChild(im);
    });

    // gallery grid
    const grid = $("galleryGrid");
    grid.innerHTML = "";
    imgs.forEach((src, i) => {
      const item = document.createElement("div");
      item.className = "gallery__item";
      item.dataset.index = i;
      const im = document.createElement("img");
      im.src = src; im.alt = "Solace Stay " + (i + 1); im.loading = "lazy";
      attachFallback(im);
      item.appendChild(im);
      item.addEventListener("click", () => openLightbox(i));
      grid.appendChild(item);
    });
  }

  /* ---------------- Lightbox ---------------- */
  let lbIndex = 0;
  function openLightbox(i) {
    lbIndex = i;
    const lb = $("lbImg"); lb.src = state.images[i]; attachFallback(lb);
    $("lightbox").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    $("lightbox").hidden = true;
    document.body.style.overflow = "";
  }
  function lbMove(dir) {
    lbIndex = (lbIndex + dir + state.images.length) % state.images.length;
    $("lbImg").src = state.images[lbIndex];
  }
  function bindLightbox() {
    $("lbClose").addEventListener("click", closeLightbox);
    $("lbPrev").addEventListener("click", () => lbMove(-1));
    $("lbNext").addEventListener("click", () => lbMove(1));
    $("lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLightbox(); });
    document.addEventListener("keydown", (e) => {
      if ($("lightbox").hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lbMove(-1);
      if (e.key === "ArrowRight") lbMove(1);
    });
  }

  /* ---------------- Amenities ---------------- */
  function paintAmenities() {
    const wrap = $("amenities");
    wrap.innerHTML = "";
    C.amenities.forEach((a) => {
      const el = document.createElement("div");
      el.className = "amenity reveal";
      el.innerHTML = '<span class="amenity__icon">' + a.icon + '</span>' +
        '<h3 class="amenity__title">' + a.title + '</h3>' +
        '<p class="amenity__desc">' + a.desc + '</p>';
      wrap.appendChild(el);
    });
  }

  /* ---------------- Availability ---------------- */
  async function loadAvailability() {
    const url = C.googleAppsScriptUrl;
    if (url && url.indexOf("YOUR_") !== 0) {
      try {
        const r = await fetch(url + "?action=availability");
        const j = await r.json();
        if (j && j.availability) { state.avail = j.availability; return; }
      } catch (e) { /* fall back to demo */ }
    }
    state.avail = C.demoAvailability || {};
  }

  function statusOf(key, isPast) {
    if (isPast) return "past";
    if (state.avail[key] === "booked") return "booked";
    if (state.avail[key] === "pending") return "pending";
    return "avail";
  }

  function renderCalendar() {
    const y = state.calYear, m = state.calMonth;
    const first = new Date(y, m, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    $("calMonth").textContent = months[m] + " " + y;

    const grid = $("calDays");
    grid.innerHTML = "";
    for (let i = 0; i < startDay; i++) {
      const e = document.createElement("div");
      e.className = "day day--empty";
      grid.appendChild(e);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d);
      const key = dateKey(dt);
      const isPast = dt < today;
      const st = statusOf(key, isPast);
      const cell = document.createElement("div");
      cell.className = "day day--" + st;
      cell.textContent = d;
      if (st === "avail" || st === "pending") {
        cell.addEventListener("click", () => pickDate(key, st));
      }
      // selection styling
      if (key === state.checkin) cell.classList.add("day--selected", "day--checkin");
      if (key === state.checkout) cell.classList.add("day--selected", "day--checkout");
      if (state.checkin && state.checkout && dt > new Date(state.checkin) && dt < new Date(state.checkout)) {
        cell.classList.add("day--inrange");
      }
      grid.appendChild(cell);
    }
  }

  function pickDate(key, st) {
    if (st === "pending") {
      $("calHint").textContent = "This date is currently pending confirmation.";
    } else {
      $("calHint").textContent = "Available — select this date to continue.";
    }
    if (!state.checkin || (state.checkin && state.checkout)) {
      state.checkin = key; state.checkout = null;
    } else if (key <= state.checkin) {
      state.checkin = key; state.checkout = null;
    } else {
      state.checkout = key;
    }
    renderCalendar();
    renderSummary();
  }

  function nightsBetween(a, b) {
    if (!a || !b) return 0;
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }

  function renderSummary() {
    const n = nightsBetween(state.checkin, state.checkout);
    const fee = n * C.reservationFee;
    const sum = $("datesSummary");
    if (state.checkin && state.checkout) {
      sum.hidden = false;
      $("sumCheckin").textContent = pretty(state.checkin);
      $("sumCheckout").textContent = pretty(state.checkout);
      $("sumNights").textContent = n;
      $("sumFee").textContent = fmt(fee);
      syncBookingDates();
    } else {
      sum.hidden = true;
    }
  }

  function syncBookingDates() {
    const n = nightsBetween(state.checkin, state.checkout);
    const fee = n * C.reservationFee;
    $("b1Checkin").textContent = pretty(state.checkin);
    $("b1Checkout").textContent = pretty(state.checkout);
    $("b1Nights").textContent = n;
    $("noDatesNote").style.display = (state.checkin && state.checkout) ? "none" : "block";
  }

  function bindCalendar() {
    $("calPrev").addEventListener("click", () => {
      state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
      renderCalendar();
    });
    $("calNext").addEventListener("click", () => {
      state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
      renderCalendar();
    });
    $("datesContinue").addEventListener("click", () => {
      if (!(state.checkin && state.checkout)) {
        toast("Please select your check-in and check-out dates first.", true);
        return;
      }
      goStep(1);
    });
  }

  /* ---------------- Booking steps ---------------- */
  function goStep(n) {
    state.step = n;
    [1, 2, 3].forEach((i) => {
      $("panel" + i).classList.toggle("is-active", i === n);
      const stepEl = document.querySelector('.step[data-step="' + i + '"]');
      stepEl.classList.toggle("is-active", i === n);
      stepEl.classList.toggle("is-done", i < n);
    });
    if (n === 2) fillReview();
    if (n === 3) fillPayment();
    window.scrollTo({ top: $("book").offsetTop - 70, behavior: "smooth" });
  }

  function fillReview() {
    const f = state.booking || {};
    const n = nightsBetween(state.checkin, state.checkout);
    $("rName").textContent = f.name || "—";
    $("rEmail").textContent = f.email || "—";
    $("rPhone").textContent = f.phone || "—";
    $("rCheckin").textContent = pretty(state.checkin);
    $("rCheckout").textContent = pretty(state.checkout);
    $("rNights").textContent = n;
    $("rFee").textContent = fmt(n * C.reservationFee);
  }

  function fillPayment() {
    const n = nightsBetween(state.checkin, state.checkout);
    $("payFee").textContent = fmt(n * C.reservationFee);
    $("gcashName").textContent = C.gcashName;
    $("gcashNumber").textContent = C.gcashNumber;
    const qr = $("gcashQr"); qr.src = C.gcashQrCode; attachFallback(qr);
  }

  function bindBooking() {
    $("infoForm").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!(state.checkin && state.checkout)) {
        showError("infoError", "Please choose your dates on the Available Dates page first.");
        return;
      }
      const name = $("fullName").value.trim();
      const phone = $("phone").value.trim();
      const email = $("email").value.trim();
      let bad = false;
      [["fullName", name], ["phone", phone], ["email", email]].forEach(([id, val]) => {
        const el = $(id);
        if (!val || (id === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val))) {
          el.classList.add("invalid"); bad = true;
          el.addEventListener("input", () => el.classList.remove("invalid"), { once: true });
        }
      });
      if (bad) { showError("infoError", "Please complete all required fields before continuing."); return; }
      state.booking = { name, phone, email };
      hideError("infoError");
      goStep(2);
    });

    $("backTo1").addEventListener("click", () => goStep(1));
    $("toPayment").addEventListener("click", () => {
      if (!$("confirmInfo").checked) {
        showError("reviewError", "Please confirm your information is correct to continue.");
        return;
      }
      hideError("reviewError");
      goStep(3);
    });
  }

  /* ---------------- Receipt upload ---------------- */
  let receiptFile = null;
  function bindUpload() {
    const dz = $("dropzone");
    const input = $("receipt");
    dz.addEventListener("click", () => input.click());
    input.addEventListener("change", () => handleFile(input.files[0]));

    $("uploadRemove").addEventListener("click", () => {
      receiptFile = null; input.value = "";
      $("uploadFile").hidden = true;
      $("uploadProgress").hidden = true;
      $("uploadBar").style.width = "0%";
    });

    $("submitBooking").addEventListener("click", submitBooking);
  }

  function handleFile(file) {
    if (!file) return;
    const ok = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (ok.indexOf(file.type) === -1) {
      showError("uploadError", "Unsupported file type. Please upload JPG, PNG, WEBP or PDF.");
      return;
    }
    hideError("uploadError");
    receiptFile = file;
    $("uploadFile").hidden = false;
    $("uploadName").textContent = file.name;
    $("uploadStatus").textContent = "Ready to upload";
    const prev = $("uploadPreview");
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => { prev.src = e.target.result; prev.hidden = false; };
      reader.readAsDataURL(file);
    } else { prev.hidden = true; }
  }

  /* ---------------- Submit booking ---------------- */
  async function submitBooking() {
    const errEl = $("uploadError");
    if (!state.booking) { showError("uploadError", "Please complete your information first."); return; }
    if (!receiptFile) { showError("uploadError", "Please upload your GCash payment receipt."); return; }
    hideError("uploadError");

    const n = nightsBetween(state.checkin, state.checkout);
    const fee = n * C.reservationFee;
    const bookingId = generateBookingId();

    const fd = new FormData();
    fd.append("action", "book");
    fd.append("bookingId", bookingId);
    fd.append("name", state.booking.name);
    fd.append("phone", state.booking.phone);
    fd.append("email", state.booking.email);
    fd.append("checkin", state.checkin);
    fd.append("checkout", state.checkout);
    fd.append("nights", n);
    fd.append("fee", fee);
    fd.append("paymentMethod", "GCash");
    fd.append("receipt", receiptFile, receiptFile.name);

    const url = C.googleAppsScriptUrl;
    const btn = $("submitBooking");
    btn.disabled = true; btn.textContent = "SUBMITTING…";
    $("uploadProgress").hidden = false;
    animateProgress(40);

    if (!url || url.indexOf("YOUR_") === 0) {
      // DEMO MODE — no backend connected yet. Show what would be sent.
      animateProgress(100);
      btn.disabled = false; btn.textContent = "SUBMIT RESERVATION";
      showConfirmation({
        bookingId, name: state.booking.name, checkin: state.checkin,
        checkout: state.checkout, fee, demo: true
      });
      return;
    }

    try {
      const res = await fetch(url, { method: "POST", body: fd });
      const data = await res.json();
      if (!data || data.result !== "success") throw new Error("backend");
      animateProgress(100);
      showConfirmation({
        bookingId: data.bookingId || bookingId, name: state.booking.name,
        checkin: state.checkin, checkout: state.checkout, fee, demo: false
      });
    } catch (e) {
      animateProgress(0);
      $("uploadProgress").hidden = true;
      btn.disabled = false; btn.textContent = "SUBMIT RESERVATION";
      showError("uploadError", "We couldn't complete your reservation right now. Please try again in a moment.");
    }
  }

  function generateBookingId() {
    const y = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return "STAY-" + y + "-" + rand;
  }

  function showConfirmation(b) {
    ["hero", "intro", "featured", "space", "gallery", "dates", "book", "contact"].forEach((id) => {
      const el = $(id); if (el) el.style.display = "none";
    });
    $("confirm").hidden = false;
    $("cId").textContent = b.bookingId;
    $("cName").textContent = b.name;
    $("cCheckin").textContent = pretty(b.checkin);
    $("cCheckout").textContent = pretty(b.checkout);
    $("cFee").textContent = fmt(b.fee);
    if (b.demo) {
      $("cId").insertAdjacentHTML("afterend",
        '<p style="font-size:.78rem;color:var(--gold);margin-top:.4rem">Demo mode — connect your Apps Script URL in config.js to save bookings.</p>');
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("backHome").addEventListener("click", () => location.reload());

  /* ---------------- UI helpers ---------------- */
  function showError(id, msg) { const el = $(id); el.textContent = msg; el.hidden = false; }
  function hideError(id) { $(id).hidden = true; }
  function animateProgress(pct) { $("uploadBar").style.width = pct + "%"; }

  let toastTimer;
  function toast(msg, isError) {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (isError ? " toast--error" : "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove("show"); }, 3200);
  }

  /* ---------------- Reveal on scroll ---------------- */
  function bindReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in-view"); obs.unobserve(en.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
  }

  /* ---------------- Nav ---------------- */
  function bindNav() {
    const nav = $("nav");
    window.addEventListener("scroll", () => {
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
    });
    const burger = $("navBurger");
    const links = $("navLinks");
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open);
    });
    links.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        links.classList.remove("is-open");
        burger.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------- Init ---------------- */
  function initStatic() {
    $("heroIntro").textContent = C.introLine;
    $("heroLoc").textContent = C.location;
    $("badgeNights").textContent = "3";
    $("footerLoc").textContent = C.location;
    $("year").textContent = new Date().getFullYear();
    $("cEmail").textContent = C.contactEmail; $("cEmail").href = "mailto:" + C.contactEmail;
    $("cPhone").textContent = C.contactPhone; $("cPhone").href = "tel:" + C.contactPhone.replace(/\s/g, "");
    $("cLoc").textContent = C.location;
    $("cSocial").textContent = C.socialHandle; $("cSocial").href = "#";
    document.title = C.staycationName + " — " + C.tagline;
  }

  async function init() {
    initStatic();
    paintAmenities();
    bindNav();
    bindLightbox();
    bindCalendar();
    bindBooking();
    bindUpload();
    bindReveal();
    await loadImages();
    await loadAvailability();
    // start calendar on current month
    const now = new Date();
    state.calYear = now.getFullYear();
    state.calMonth = now.getMonth();
    renderCalendar();
    syncBookingDates();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
