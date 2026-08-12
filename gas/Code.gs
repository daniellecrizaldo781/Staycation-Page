/* =========================================================================
 *  SOLACE STAY — Google Apps Script Web App (backend)
 *  Bound to your "Booking" sheet. Deploy -> Web app ->
 *  Execute as: Me -> Who has access: Anyone.
 *
 *  Booking row layout (matches the owner's sheet, 12 columns A-L):
 *   A Customer Name | B Booking Date | C Name | D Number | E Email
 *   F Date of checkin | G Date of Checkout | H Days of Stay | I Cost
 *   J Payment | K Payment received? | L Booked:
 * ========================================================================= */

var SHEET_ID   = "1bV9TZDYtN3zYZCH3mI4QAYDj8SXXg0YVn_ljEEw9mw"; // fallback only
var FOLDER_ID  = "1A_i2JPbsx5AIMyfI2ixaLnQnnHL1QI7-";           // receipt folder
var PHOTO_FOLDER_ID = "1rheaEncio4QZrT96OK0hmgj9L01VxI-a";      // photo folder

function doGet(e) {
  var action = (e.parameter.action || "").toLowerCase();
  try {
    if (action === "availability") return json(computeAvailability());
    if (action === "photos")      return json(getPhotoUrls());
    if (action === "image")       return streamImage(e.parameter.id);
    if (action === "test")        return json(runDiagnostics());
    return json({ result: "error", message: "Unknown action: " + action });
  } catch (err) {
    return json({ result: "error", message: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    if ((e.parameter.action || "").toLowerCase() === "book") {
      return json(handleBooking(e));
    }
    return json({ result: "error", message: "Unknown action." });
  } catch (err) {
    return json({ result: "error", message: String(err.message || err) });
  }
}

function runDiagnostics() {
  var d = {};
  try {
    var bs = SpreadsheetApp.getActiveSpreadsheet();
    d.boundSheet = bs ? ("OK — " + bs.getName()) : "null (script not bound to a sheet)";
  } catch (e) { d.boundSheet = "ERR — " + e.message; }
  try { DriveApp.getFolderById(FOLDER_ID); d.receiptFolder = "OK"; }
  catch (e) { d.receiptFolder = "ERR — " + e.message; }
  try { DriveApp.getFolderById(PHOTO_FOLDER_ID); d.photoFolder = "OK"; }
  catch (e) { d.photoFolder = "ERR — " + e.message; }
  return { result: "success", diagnostics: d };
}

function computeAvailability() {
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  var avail = {};
  for (var i = 1; i < rows.length; i++) {
    var status = (rows[i][11] || "").toString().trim().toLowerCase(); // col L "Booked:"
    var ci = rows[i][5];  // col F check-in
    var co = rows[i][6];  // col G check-out
    if (!ci || !co) continue;
    var kind = (status === "booked" || status === "confirmed" || status === "completed") ? "booked"
             : (status === "pending" || status === "cancelled") ? "pending"
             : null;
    if (!kind) continue;
    var d = new Date(ci);
    var end = new Date(co);
    while (d < end) {
      var key = dateKey(d);
      if (avail[key] !== "booked") avail[key] = kind;
      d.setDate(d.getDate() + 1);
    }
  }
  return { result: "success", availability: avail };
}

function handleBooking(e) {
  var p = e.parameter;
  var receiptLink = "";
  var receiptName = "";
  if (e.files && e.files.receipt) {
    var blob = e.files.receipt;
    receiptName = blob.getName();
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var file = folder.createFile(blob);
    file.setName((p.bookingId || "receipt") + "_" + receiptName);
    receiptLink = file.getUrl(); // stored in Drive (sheet has no receipt column)
  }

  var sheet = getSheet();
  // Column A is always the Booking ID (auto-filled). Fall back to a generated ID.
  var bookingId = p.bookingId || ("STAY-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000));
  // Only these 12 columns are filled, and only when a customer books.
  var row = [
    bookingId,                    // A Booking ID (auto-filled)
    new Date(),                   // B Booking Date
    p.name || "",                 // C Name
    p.phone || "",                // D Number
    p.email || "",                // E Email
    p.checkin || "",              // F Date of checkin
    p.checkout || "",             // G Date of Checkout
    p.nights || "",               // H Days of Stay
    p.fee || "",                  // I Cost
    p.paymentMethod || "GCash",   // J Payment
    "Pending Review",             // K Payment received?
    "Pending"                     // L Booked:
  ];
  sheet.appendRow(row);

  // Send the customer a confirmation email (best-effort; never blocks the booking).
  try {
    sendConfirmationEmail(bookingId, p);
  } catch (err) {
    // email failure shouldn't fail the booking
  }

  return { result: "success", bookingId: bookingId, receiptLink: receiptLink };
}

function sendConfirmationEmail(bookingId, p) {
  var to = p.email;
  if (!to) return;
  var name = p.name || "Guest";
  var checkin = prettyDate(p.checkin);
  var checkout = prettyDate(p.checkout);
  var nights = p.nights || "—";
  var fee = p.fee || "—";

  var subject = "Your Solace Stay is booked! ✨ Get ready to unwind, " + name + "!";

  var body =
    "Hi " + name + ",\n\n" +
    "Great news — your little escape is officially on the calendar! 🌿 We're so excited to host you at Solace Stay.\n\n" +
    "Here are your reservation details:\n" +
    "----------------------------------------\n" +
    "Booking ID : " + bookingId + "\n" +
    "Check-in   : " + checkin + "\n" +
    "Check-out  : " + checkout + "\n" +
    "Nights     : " + nights + "\n" +
    "Reservation Fee : ₱" + fee + "\n" +
    "----------------------------------------\n\n" +
    "What's next?\n" +
    "1. Settle your reservation fee via GCash (scan the QR in your booking page).\n" +
    "2. Upload your payment receipt — we'll confirm your stay once it's reviewed.\n" +
    "3. Start packing! Cozy mornings, slow evenings, and memories worth keeping are waiting for you. ☕🛏️\n\n" +
    "If you have any questions, just hit reply — we're here to help.\n\n" +
    "See you soon,\n" +
    "The Solace Stay Team\n";

  GmailApp.sendEmail(to, subject, body, { bcc: "daniellecrizaldo781@gmail.com" });
}

function prettyDate(s) {
  if (!s) return "—";
  try {
    var d = new Date(s);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch (e) { return s; }
}

function getPhotoUrls() {
  var scriptUrl = ScriptApp.getService().getUrl();
  var folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  var files = folder.getFiles();
  var out = [];
  while (files.hasNext()) {
    var f = files.next();
    out.push(scriptUrl + "?action=image&id=" + f.getId());
  }
  return { result: "success", images: out };
}

/* Return a Drive image as base64 inside JSON so the browser <img> can render
   it reliably (Google's Apps Script wrapper mangles raw binary Blob responses).
   Frontend builds: data:<mime>;base64,<data> */
function streamImage(id) {
  if (!id) return json({ result: "error", message: "missing id" });
  try {
    var file = DriveApp.getFileById(id);
    var blob = file.getBlob();
    var b64 = Utilities.base64Encode(blob.getBytes());
    return json({ result: "success", mime: blob.getContentType(), base64: b64 });
  } catch (err) {
    return json({ result: "error", message: String(err.message || err) });
  }
}

function getSheet() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss) { ss = SpreadsheetApp.openById(SHEET_ID); }
  return ss.getSheets()[0]; // owner manages the headers
}

function dateKey(d) {
  var z = function (x) { return ("0" + x).slice(-2); };
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
