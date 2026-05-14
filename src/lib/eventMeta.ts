/** Labels for reception routes shown in navigation after sign-in. */
export const RECEPTION_EVENT_LABELS: Record<string, string> = {
  'reception-prashar': 'Reception',
  'reception-rahman': 'Valima',
}

export type ReceptionEventDetails = {
  title: string
  /** ISO string for sorting / formatting (local wall time assumed). */
  dateIso: string
  /** Same clock semantics as `dateIso`; end of event for calendar export. */
  endDateIso: string
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
      'Festive formal – think vibrant colors and bold patterns. Saris, lehengas, kurtas, sherwanis, indo-western looks, suits, and gowns are all welcome. We’ll be celebrating with plenty of dancing, so choose attire and shoes that let you move comfortably the whole night.',
    eveningDescription:
      'Join us as we begin with a lively baraat promptly at 4:30 PM, followed by the wedding ceremony. The evening will continue with cocktail / mocktail hour and performances. The night will conclude with dinner, speeches, and an open dance floor!',
    landingLeftImage: '/images/coloredPhotoStrip.jpeg',
  },
  'reception-rahman': {
    title: 'Valima',
    dateIso: '2026-08-09T18:00:00',
    endDateIso: '2026-08-09T23:00:00',
    startTimeLabel: '6:00 PM',
    venueName: 'Canyon View Event Center',
    hostedByLine: 'Hosted by the Rahman Family',
    addressLines: ['680 Bollinger Canyon Way', 'San Ramon, California 94582'],
    attire:
      'Formal – women are encouraged to wear traditional desi attire, though western formal wear is  welcomed. Men may wear suits, or dress shirts with slacks.',
    eveningDescription:
      'With gratitude and joy, we invite you to celebrate the newly married couple! Please join us for an evening of togetherness, dinner, and celebration with family and friends.',
    landingLeftImage: '/images/blackAndWhitePhotoStrip.jpeg',
  },
}
