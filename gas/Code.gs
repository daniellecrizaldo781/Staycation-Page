/* =========================================================================
 *  SOLACE STAY — Google Apps Script Web App (backend)
 *  --------------------------------------------------------------------------
 *  Deploy: Extensions -> Apps Script (inside the booking Google Sheet) ->
 *  Deploy -> New deployment -> type "Web app" ->
 *    Execute as: Me
 *    Who has access: Anyone
 *  Paste the Web App URL into config.js  ->  CONFIG.googleAppsScriptUrl
 *
 *  This script holds ALL secrets server-side. The frontend never sees them.
 *
 *  SHEET STRUCTURE (row 1 headers, exactly these columns):
 *    A Booking ID | B Timestamp | C Name | D Phone | E Email |
 *    F Check-in | G Check-out | H Nights | I Fee | J Payment Method |
 *    K Payment Status | L Receipt File Name | M Receipt Drive Link |
 *    N Booking Status | O Notes
 * ========================================================================= */

var SHEET_ID   = "1bV9TZDYtN3zYZCH3mI4QAYDj8SXXg0YVn_ljEEw9mw"; // booking sheet
var FOLDER_ID  = "1A_i2JPbsx5AIMyfI2ixaLnQnnHL1QI7-";           // receipt folder
var PHOTO_FOLDER_ID = "1rheaEncio4QZrT96OK0hmgj9L01VxI-a";      // photo folder

var HEADERS = ["Booking ID","Timestamp","Name","Phone","Email","Check-in",
               "Check-out","Nights","Fee","Payment Method","Payment Status",
               "Receipt File Name","Receipt Drive Link","Booking Status","Notes"];

/* ----------------------------- Entry point ----------------------------- */
function doGet(e) {
  var action = (e.parameter.action || "").toLowerCase();
  try {
    if (action === "availability") return json(computeAvailability());
    if (action === "photos")      return json(getPhotoUrls());
    return json({ result: "error", message: "Unknown action: " + action });
  } catch (err) {
    return json({ result: "error", message: "Server error." });
  }
}

function doPost(e) {
  try {
    if ((e.parameter.action || "").toLowerCase() === "book") {
      return json(handleBooking(e));
    }
    return json({ result: "error", message: "Unknown action." });
  } catch (err) {
    return json({ result: "error", message: "Server error." });
  }
}

/* ----------------------------- Availability ----------------------------- */
// Reads the bookings sheet and marks every date between check-in (inclusive)
// and check-out (exclusive) as "booked" (Confirmed) or "pending" (Pending).
function computeAvailability() {
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  var avail = {};
  for (var i = 1; i < rows.length; i++) {
    var status = (rows[i][13] || "").toString().trim().toLowerCase(); // Booking Status col N
    var ci = rows[i][5];  // Check-in (F)
    var co = rows[i][6];  // Check-out (G)
    if (!ci || !co) continue;
    var kind = (status === "confirmed" || status === "completed") ? "booked"
             : (status === "pending" || status === "cancelled") ? "pending"
             : null;
    if (!kind) continue;
    var d = new Date(ci);
    var end = new Date(co);
    while (d < end) {
      var key = dateKey(d);
      // booked overrides pending
      if (avail[key] !== "booked") avail[key] = kind;
      d.setDate(d.getDate() + 1);
    }
  }
  return { result: "success", availability: avail };
}

/* ----------------------------- Booking ----------------------------- */
function handleBooking(e) {
  var p = e.parameter;
  // Upload receipt to Drive (if a file blob was posted)
  var receiptLink = "";
  var receiptName = "";
  if (e.files && e.files.receipt) {
    var blob = e.files.receipt;
    receiptName = blob.getName();
    var folder = DriveApp.getFolderById(FOLDER_ID);
    // prefix with booking id so it's easy to find
    var file = folder.createFile(blob);
    file.setName((p.bookingId || "receipt") + "_" + receiptName);
    receiptLink = file.getUrl();
  }

  var sheet = getSheet();
  var row = [
    p.bookingId || "",
    new Date(),
    p.name || "",
    p.phone || "",
    p.email || "",
    p.checkin || "",
    p.checkout || "",
    p.nights || "",
    p.fee || "",
    p.paymentMethod || "GCash",
    "Pending Review",     // Payment Status
    receiptName,
    receiptLink,
    "Pending",            // Booking Status
    ""
  ];
  sheet.appendRow(row);

  return {
    result: "success",
    bookingId: p.bookingId,
    receiptLink: receiptLink
  };
}

/* ----------------------------- Photos ----------------------------- */
// Lists image files in the Google Drive photo folder and returns direct,
// publicly-viewable URLs the frontend can drop into <img src>.
// NOTE: the folder must be shared "Anyone with the link can view".
function getPhotoUrls() {
  var folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  var files = folder.getFiles();
  var out = [];
  while (files.hasNext()) {
    var f = files.next();
    var id = f.getId();
    // thumbnail-sized direct link; swap "=w400" for larger if desired
    out.push("https://drive.google.com/uc?export=view&id=" + id);
  }
  return { result: "success", images: out };
}

/* ----------------------------- Helpers ----------------------------- */
function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheets()[0];
  // ensure headers exist
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function dateKey(d) {
  var z = function (x) { return ("0" + x).slice(-2); };
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
