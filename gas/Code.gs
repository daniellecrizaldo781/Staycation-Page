/* =========================================================================
 *  SOLACE STAY — Google Apps Script Web App (backend)
 *  BEST PRACTICE: open the booking Sheet -> Extensions -> Apps Script,
 *  paste this code there (it becomes BOUND to the sheet), then
 *  Deploy -> New deployment -> Web app -> Execute as: Me -> Who has access: Anyone.
 *  Binding means the script uses the live sheet directly (no fragile ID lookup).
 * ========================================================================= */

var SHEET_ID   = "1bV9TZDYtN3zYZCH3mI4QAYDj8SXXg0YVn_ljEEw9mw"; // fallback only
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

/* ----------------------------- Diagnostics ----------------------------- */
function runDiagnostics() {
  var d = {};
  try {
    var bs = SpreadsheetApp.getActiveSpreadsheet();
    d.boundSheet = bs ? ("OK — " + bs.getName()) : "null (script not bound to a sheet)";
  } catch (e) { d.boundSheet = "ERR — " + e.message; }
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    d.sheetById = "OK — " + ss.getName();
  } catch (e) { d.sheetById = "ERR — " + e.message; }
  try { DriveApp.getFolderById(FOLDER_ID); d.receiptFolder = "OK"; }
  catch (e) { d.receiptFolder = "ERR — " + e.message; }
  try { DriveApp.getFolderById(PHOTO_FOLDER_ID); d.photoFolder = "OK"; }
  catch (e) { d.photoFolder = "ERR — " + e.message; }
  return { result: "success", diagnostics: d };
}

/* ----------------------------- Availability ----------------------------- */
function computeAvailability() {
  var sheet = getSheet();
  var rows = sheet.getDataRange().getValues();
  var avail = {};
  for (var i = 1; i < rows.length; i++) {
    var status = (rows[i][13] || "").toString().trim().toLowerCase();
    var ci = rows[i][5];
    var co = rows[i][6];
    if (!ci || !co) continue;
    var kind = (status === "confirmed" || status === "completed") ? "booked"
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

/* ----------------------------- Booking ----------------------------- */
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
    "Pending Review",
    receiptName,
    receiptLink,
    "Pending",
    ""
  ];
  sheet.appendRow(row);

  return { result: "success", bookingId: p.bookingId, receiptLink: receiptLink };
}

/* ----------------------------- Photos ----------------------------- */
function getPhotoUrls() {
  var folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  var files = folder.getFiles();
  var out = [];
  while (files.hasNext()) {
    var f = files.next();
    out.push("https://drive.google.com/uc?export=view&id=" + f.getId());
  }
  return { result: "success", images: out };
}

/* ----------------------------- Helpers ----------------------------- */
function getSheet() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss) { ss = SpreadsheetApp.openById(SHEET_ID); }
  var sheet = ss.getSheets()[0];
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
