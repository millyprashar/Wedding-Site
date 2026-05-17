/** Labels for reception routes shown in navigation after sign-in. */
export const RECEPTION_EVENT_LABELS: Record<string, string> = {
  'reception-prashar': 'Reception',
  'reception-rahman': 'Valima',
  mehndi: 'Mehndi',
}

export type ReceptionEventDetails = {
  title: string
  /** ISO string for sorting / formatting (local wall time assumed). */
  dateIso: string
  /** Same clock semantics as `dateIso`; end of event for calendar export (omit for no end time). */
  endDateIso?: string
  /** Optional ICS SUMMARY; defaults to “Milly & Tariq — {title}”. */
  calendarSummary?: string
  startTimeLabel: string
  venueName: string
  /** Shown under the details column photo (e.g. “Hosted by …”). */
  hostedByLine: string
  addressLines: string[]
  attire: string
  /** “The evening” body copy. */
  eveningDescription: string
  /** Photo in the event details column (path under `public/`). */
  landingLeftImage: string
}

/** Edit copy here — single source for event pages and `fetchEvent` metadata. */
export const RECEPTION_EVENT_DETAILS: Record<string, ReceptionEventDetails> = {
  'reception-prashar': {
    title: 'Reception',
    dateIso: '2026-08-08T16:30:00',
    endDateIso: '2026-08-08T23:30:00',
    startTimeLabel: '4:30 PM',
    venueName: 'Berkeley Country Club',
    hostedByLine: 'Hosted by The Prashar Family',
    addressLines: ['7901 Cutting Blvd', 'El Cerrito, California 94530'],
    attire:
      'Festive formal – come dressed in your best with vibrant colors, rich textures, and statement patterns. Saris, lehengas, kurtas, sherwanis, and indo-western ensembles are all encouraged. We’ll be celebrating with plenty of dancing, so choose attire and shoes that let you move comfortably the whole night!',
    eveningDescription:
      'Join us as we begin with a lively baraat promptly at 4:30 PM, followed by the wedding ceremony. The evening will continue with cocktail / mocktail hour and performances. The night will conclude with dinner, speeches, and an open dance floor!',
    landingLeftImage: '/images/coloredPhotoStrip.jpeg',
  },
  'reception-rahman': {
    title: 'Valima',
    dateIso: '2026-08-09T18:30:00',
    endDateIso: '2026-08-09T23:00:00',
    startTimeLabel: '6:30 PM',
    venueName: 'Canyon View Event Center',
    hostedByLine: 'Hosted by the Rahman Family',
    addressLines: ['680 Bollinger Canyon Way', 'San Ramon, California 94582'],
    attire:
      'Desi formal for ladies and western suits for men.',
    eveningDescription:
      'Please join our families in celebrating Tariq and Milly\'s marriage! The evening will begin outside with appetizers and mocktails. We will then move inside for photos, speeches, a slideshow, and dinner. We will end the evening with cake cutting and dessert.',
    landingLeftImage: '/images/blackAndWhitePhotoStrip.jpeg',
  },
  mehndi: {
    title: 'Mehndi',
    dateIso: '2026-08-07T19:00:00',
    calendarSummary: "Milly's Mehndi",
    startTimeLabel: '7:00 PM',
    venueName: 'The Prashar Residence',
    hostedByLine: 'Hosted by The Prashar Family',
    addressLines: ['560 Elysian Fields Drive', 'Oakland, California 94605'],
    attire:
      'Colorful festive attire — incorporate shades of orange, pink, and yellow! Mehndi stains are inevitable, so wear something you do not mind getting a little messy!',
    eveningDescription:
      'Join us for an evening of henna, music, and celebration as we kick off the wedding festivities. Food and refreshments will be served throughout the night.',
    landingLeftImage: '/images/mehndi-details.jpg',
  },
}
