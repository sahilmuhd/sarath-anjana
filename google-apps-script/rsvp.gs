/**
 * RSVP backend for the Sarath Kumar & Anjana Anil wedding website.
 *
 * Setup (about 5 minutes) — full steps in README.md:
 *  1. Create a Google Sheet.
 *  2. Extensions → Apps Script → paste this whole file → Save.
 *  3. Deploy → New deployment → type "Web app"
 *       Execute as:      Me
 *       Who has access:  Anyone
 *  4. Copy the Web app URL (ends in /exec) into js/config.js → rsvp.endpoint
 *
 * The website only shows "RSVP received" when this script replies
 * {"result":"success"} — i.e. after the row is actually written.
 */

var SHEET_NAME = 'RSVP';
var HEADERS = ['Timestamp', 'Guest Name', 'Attendance', 'Number of Guests', 'Wishes'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var p = (e && e.parameter) || {};

    var name = String(p.name || '').trim().slice(0, 120);
    var attendance = p.attendance === 'accept' ? 'Joyfully Accept'
                   : p.attendance === 'decline' ? 'Regretfully Decline' : '';
    if (!name || !attendance) {
      return json_({ result: 'error', message: 'Name and attendance are required.' });
    }

    var guests = 0;
    if (attendance === 'Joyfully Accept') {
      guests = parseInt(p.guests, 10);
      if (!(guests >= 1 && guests <= 20)) guests = 1;
    }
    var wishes = String(p.wishes || '').trim().slice(0, 1000);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), safe_(name), attendance, guests, safe_(wishes)]);

    return json_({ result: 'success' });
  } catch (err) {
    return json_({ result: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/* Lets you open the /exec URL in a browser to confirm it is live. */
function doGet() {
  return json_({ result: 'ok', message: 'RSVP endpoint is running.' });
}

/* Stop spreadsheet formula injection (values starting with = + - @). */
function safe_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
