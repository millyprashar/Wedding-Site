export type RsvpStatus = 'pending' | 'attending' | 'declined' | 'tentative'

export type AdditionalGuestsByEvent = Record<string, number>

export interface EventInfo {
  id: string
  slug: string
  title: string
  dateIso: string
  venueName: string
  addressLines: string[]
  description: string
}

export interface GuestProfile {
  id: string
  firstName: string
  lastName: string
  familyId: number | null
  eventIds: string[]
  /** Max extra guests allowed across this family invite, keyed by event id. */
  additionalGuestsAllowedByEvent: AdditionalGuestsByEvent
  /** Extra guests confirmed by this logged-in guest, keyed by event id. */
  additionalGuestsConfirmedByEvent: AdditionalGuestsByEvent
}

export interface FamilyMember {
  id: string
  firstName: string
  lastName: string
  additionalGuestsConfirmedByEvent: AdditionalGuestsByEvent
}

export interface RsvpRecord {
  guestId: string
  eventId: string
  status: RsvpStatus
  mealPreference?: string
  notes?: string
  updatedAt?: string
}

export interface MeResponse {
  guest: GuestProfile
  familyMembers: FamilyMember[]
}

export interface EventDetailResponse {
  event: EventInfo
  rsvps: RsvpRecord[]
}
