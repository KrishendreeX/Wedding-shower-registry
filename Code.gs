/**
 * Melisa & Chad · Wedding Shower Registry backend
 *
 * Lives inside a Google Sheet (Extensions > Apps Script).
 * - Remembers which gifts are claimed (so every guest sees the same scratched-off list)
 * - Emails YOU every time a guest claims a gift
 * - Emails the guest a confirmation
 *
 * Full steps are in README.md.
 */

// ====== EDIT THESE ======
const OWNER_EMAIL = "Krystin.kistensamy367@gmail.com"; // where claim notifications are sent
const COUPLE = "Melissa & Chad";
const SEND_GUEST_CONFIRMATION = true;                    // set to false to skip the thank-you email to guests
// ========================

const SHEET_NAME = "Claims";
const HEADERS = ["Time", "Item ID", "Gift", "Category", "Guest name", "Guest email"];

/** Guests' browsers call this to learn which gifts are already claimed. */
function doGet() {
  try {
    return json_({ ok: true, claimed: claimedIds_() });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, message: "Could not load the registry." });
  }
}

/** Guests' browsers call this when they choose a gift. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;

  try {
    lock.waitLock(20000); // stops two guests grabbing the same gift at the same moment
    locked = true;

    const data = JSON.parse(e.postData.contents);

    // Honeypot: real guests never fill this in, bots do.
    if (data.website) return json_({ ok: true });

    const itemId = clean_(data.itemId, 20);
    const item = clean_(data.item, 120);
    const category = clean_(data.category, 120);
    const name = clean_(data.name, 100);
    const email = clean_(data.email, 200);

    if (!/^item\d{1,3}$/.test(itemId) || !item) {
      return json_({ ok: false, message: "That gift could not be found." });
    }
    if (name.length < 2) {
      return json_({ ok: false, message: "Please enter your name." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json_({ ok: false, message: "Please enter a valid email address." });
    }

    if (claimedIds_().indexOf(itemId) !== -1) {
      return json_({ ok: false, error: "taken", message: "Someone just claimed that gift." });
    }

    getSheet_().appendRow([new Date(), itemId, safe_(item), safe_(category), safe_(name), safe_(email)]);

    // Emails are best-effort: the claim is already saved even if one fails.
    if (ownerEmailConfigured_()) {
      try { notifyOwner_(item, category, name, email); } catch (err) { console.error(err); }
    } else {
      console.warn("Claim saved, but OWNER_EMAIL is not configured; owner notification skipped.");
    }
    if (SEND_GUEST_CONFIRMATION) {
      try { confirmToGuest_(item, name, email); } catch (err) { console.error(err); }
    }

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, message: "Something went wrong. Please try again." });
  } finally {
    if (locked) lock.releaseLock();
  }
}

/* ---------- emails ---------- */

function notifyOwner_(item, category, name, email) {
  const count = claimedIds_().length;
  const body =
    name + " is bringing: " + item + "\n" +
    "Category: " + category + "\n\n" +
    "Guest name:  " + name + "\n" +
    "Guest email: " + email + "\n\n" +
    count + " gifts claimed so far.\n" +
    "Full list: " + getSpreadsheet_().getUrl();

  MailApp.sendEmail(OWNER_EMAIL, "Registry: " + name + " is bringing " + item, body, {
    name: COUPLE + " Registry",
    replyTo: email,
  });
}

function confirmToGuest_(item, name, email) {
  const first = name.split(" ")[0];
  const body =
    "Hi " + first + ",\n\n" +
    "Thank you! You've chosen to bring: " + item + ".\n" +
    "We've scratched it off the list so no one doubles up.\n\n" +
    "See you at the Pantry Party on Saturday 21 November at 14h00.\n\n" +
    "With love,\n" + COUPLE;

  MailApp.sendEmail({
    to: email,
    subject: "Thank you! You're bringing " + item + " to " + COUPLE + "'s shower",
    body: body,
    name: COUPLE,
    replyTo: OWNER_EMAIL,
  });
}

/* ---------- helpers ---------- */

function getSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty("SPREADSHEET_ID");
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No spreadsheet is linked. Run authorizeOnce from the bound spreadsheet's Apps Script project.");
  return ss;
}

function claimedIds_() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 2, last - 1, 1).getValues()
    .map(function (row) { return String(row[0]).trim(); })
    .filter(String);
}

// Collapse whitespace/newlines, trim, and cap length.
function clean_(value, max) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}

// Stop spreadsheet formulas from being injected via guest input.
function safe_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function ownerEmailConfigured_() {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(OWNER_EMAIL) &&
    OWNER_EMAIL !== "PUT-YOUR-EMAIL-HERE@example.com";
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this ONCE from the editor (select it, press Run) to grant permissions
 * and send yourself a test email.
 */
function authorizeOnce() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Open Apps Script from the Google Sheet using Extensions > Apps Script, then run authorizeOnce.");
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
  getSheet_();
  if (ownerEmailConfigured_()) {
    MailApp.sendEmail(OWNER_EMAIL, COUPLE + " registry: setup works", "Your registry emails are connected.");
  } else {
    console.warn("Spreadsheet connected. Set OWNER_EMAIL to a real email address to enable notifications.");
  }
}

/** Run this from the editor to log the spreadsheet and Claims tab location. */
function whereAmI() {
  const ss = getSpreadsheet_();
  Logger.log("Spreadsheet: " + ss.getName());
  Logger.log("Link: " + ss.getUrl());
  Logger.log("Claims so far: " + claimedIds_().length);
}