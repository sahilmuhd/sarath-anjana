/* ============================================================
   WEDDING CONFIGURATION — edit wedding details here.
   ------------------------------------------------------------
   Every piece of text marked with data-cfg="…" in index.html is
   filled in from this object when the page loads, so this file is
   the single source of truth. (index.html carries the same text
   as a no-JavaScript fallback.)

   NOTE: Open Graph / WhatsApp tags in the <head> of index.html
   cannot be set by JavaScript (link-preview crawlers don't run
   scripts). If you change the domain, title or description,
   also update the <head> of index.html — see README.md.
   ============================================================ */
window.WEDDING_CONFIG = {

  siteUrl: 'https://sarath-anjana.vercel.app/',

  couple: {
    groom: { name: 'Sarath Kumar' },
    bride: { name: 'Anjana Anil' }
  },

  wedding: {
    dateLong:  'Tuesday, 26 January 2027',
    dateShort: '26 January 2027',
    dateDots:  '26 · 01 · 2027',
    muhurtham: '10:30 AM – 12:00 PM',
    /* Countdown target — ISO 8601 with the India offset (Asia/Kolkata, UTC+05:30) */
    countdownTarget: '2027-01-26T10:30:00+05:30'
  },

  venue: {
    name:      'Neelambari Eco Tourism',
    placeFull: 'Arattupuzha, Thrissur, Kerala',
    placeShort:'Arattupuzha, Thrissur',
    mapUrl:    'https://share.google/u8Y6ipMD6K1pwBRGW'
  },

  families: {
    groom: {
      relation: 'Son of',
      parents:  ['Sukumaran K. P.', 'Lathika Sukumaran'],
      address:  ['Karanchery House', 'P.O. Nedumpura', 'Cheruthuruthy', 'Thrissur'],
      siblingsLabel: 'Sister',
      siblings: ['Shilpa K. S.']
    },
    bride: {
      relation: 'Daughter of',
      parents:  ['C. K. Anilkumar', 'Shaija Anil'],
      address:  ['Chanassey House', 'P.O. Avinissery', 'Anakkalu', 'Thrissur'],
      siblingsLabel: 'Sisters',
      siblings: ['Anjali Anil', 'Archana Anil']
    }
  },

  rsvp: {
    /* Paste your Google Apps Script Web App URL here (ends in /exec).
       Leave empty ('') and the form is shown as "awaiting setup"
       and will NOT pretend to accept responses. See README.md. */
    endpoint: 'https://script.google.com/macros/s/AKfycbwZWZe8jagJzRYU1l-HrW1WVNbV-LBZkyTxMxzU3MZbM3vdVIJNHHqPtGrwW4kC5A8yug/exec',
    maxGuests: 10
  },

  music: {
    /* Place the supplied track at this path. If the file is missing,
       the music button simply stays hidden. */
    src: 'assets/audio/ReelAudio-13014.mp3',
    volume: 0.45,          // 0–1 background level
    fadeInSeconds: 1,  
    fadeOutSeconds: 1.8,
    loop: true,            // gentle loop: fades out, short pause, fades back in from 0:00
    loopGapSeconds: 1.5
  }
};
