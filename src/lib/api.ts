import { hasSupabaseEnv, supabase } from './supabase'
import { RECEPTION_EVENT_DETAILS } from './eventMeta'
import { digitsOnly } from './phone'
import type { EventDetailResponse, MeResponse, RsvpStatus } from '../types'

type InviteRow = Record<string, unknown>

function pickString(row: InviteRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

/** Returns undefined when no candidate numeric key is present on the row. */
function pickOptionalNumber(row: InviteRow, keys: string[]): number | undefined {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue
    const value = row[key]
    if (value === null || value === undefined) continue
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}

function pickBooleanFlag(row: InviteRow, keys: string[]): boolean {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string' && value.trim() !== '') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true' || normalized === '1') return true
      if (normalized === 'false' || normalized === '0') return false
    }
  }
  return false
}

function getAdditionalGuestsAllowedColumnCandidates(eventId: string): string[] {
  if (eventId === 'reception-prashar') {
    return [
      'additionlGuestsAllowedPrashar',
      'additionalGuestsAllowedPrashar',
      'additionl_guests_allowed_prashar',
      'additional_guests_allowed_prashar',
    ]
  }
  if (eventId === 'reception-rahman') {
    return [
      'additionlGuestsAllowedRahman',
      'additionalGuestsAllowedRahman',
      'additionl_guests_allowed_rahman',
      'additional_guests_allowed_rahman',
    ]
  }
  if (eventId === 'mehndi') {
    return [
      'additionalGuestsAllowedMehndi',
      'additional_guests_allowed_mehndi',
    ]
  }
  return []
}

function getAdditionalGuestsConfirmedColumnCandidates(eventId: string): string[] {
  if (eventId === 'reception-prashar') {
    return [
      'additionlGuestsConfirmedPrashar',
      'additionalGuestsConfirmedPrashar',
      'additionl_guests_confirmed_prashar',
      'additional_guests_confirmed_prashar',
    ]
  }
  if (eventId === 'reception-rahman') {
    return [
      'additionlGuestsConfirmedRahman',
      'additionalGuestsConfirmedRahman',
      'additionl_guests_confirmed_rahman',
      'additional_guests_confirmed_rahman',
    ]
  }
  if (eventId === 'mehndi') {
    return [
      'additionalGuestsConfirmedMehndi',
      'additional_guests_confirmed_mehndi',
    ]
  }
  return []
}

function readAdditionalGuestsAllowed(row: InviteRow, eventId: string): number | undefined {
  return pickOptionalNumber(row, getAdditionalGuestsAllowedColumnCandidates(eventId))
}

function readAdditionalGuestsConfirmed(row: InviteRow, eventId: string): number {
  return pickOptionalNumber(row, getAdditionalGuestsConfirmedColumnCandidates(eventId)) ?? 0
}

function readAdditionalGuestsAllowedByEvent(row: InviteRow): Record<string, number> {
  return Object.fromEntries(
    Object.keys(RECEPTION_EVENT_DETAILS).map((eventId) => [
      eventId,
      readAdditionalGuestsAllowed(row, eventId) ?? 0,
    ]),
  )
}

function readAdditionalGuestsConfirmedByEvent(row: InviteRow): Record<string, number> {
  return Object.fromEntries(
    Object.keys(RECEPTION_EVENT_DETAILS).map((eventId) => [
      eventId,
      readAdditionalGuestsConfirmed(row, eventId),
    ]),
  )
}

function getAdditionalGuestsConfirmedColumn(row: InviteRow, eventId: string): string {
  const candidates = getAdditionalGuestsConfirmedColumnCandidates(eventId)
  for (const column of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, column)) return column
  }
  if (candidates.length === 0) {
    throw new Error(`No additional guest column mapping exists for event "${eventId}"`)
  }
  return candidates[0]
}

function readInviteName(row: InviteRow) {
  return {
    firstName: pickString(row, ['firstName', 'first_name']),
    lastName: pickString(row, ['lastName', 'last_name']),
    phone: pickString(row, ['phone', 'phoneNumber', 'phone_number']),
  }
}

function getInviteEventIds(row: InviteRow): string[] {
  const ids: string[] = []
  const prashar = pickBooleanFlag(row, [
    'receptionPrasharInvited',
    'reception_prashar_invited',
  ])
  const rahman = pickBooleanFlag(row, [
    'receptionRahmanInvited',
    'reception_rahman_invited',
  ])
  const mehndi = pickBooleanFlag(row, ['mehndiInvited', 'mehndi_invited'])
  if (mehndi) ids.push('mehndi')
  if (prashar) ids.push('reception-prashar')
  if (rahman) ids.push('reception-rahman')
  return ids
}

function getInviteRsvpColumnCandidates(eventId: string): string[] {
  if (eventId === 'reception-prashar') {
    return ['receptionPrasharRSVP', 'reception_prashar_rsvp']
  }
  if (eventId === 'reception-rahman') {
    return ['receptionRahmanRSVP', 'reception_rahman_rsvp']
  }
  if (eventId === 'mehndi') {
    return ['mehndiRSVP', 'mehndi_rsvp']
  }
  return []
}

function pickFamilyId(row: InviteRow): number | null {
  const n = pickOptionalNumber(row, ['familyID', 'family_id'])
  return n === undefined ? null : n
}

function readRsvp01(row: InviteRow, columnCandidates: string[]): boolean | null {
  for (const key of columnCandidates) {
    const v = row[key]
    if (v === null || v === undefined) continue
    if (typeof v === 'number') return v === 1
    if (typeof v === 'boolean') return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (!Number.isNaN(n)) return n === 1
    }
  }
  return null
}

type InviteIdentity = {
  firstName: string
  lastName: string
  phone: string
}

function createInviteToken(identity: InviteIdentity): string {
  return JSON.stringify(identity)
}

function parseInviteToken(token: string): InviteIdentity {
  let parsed: unknown
  try {
    parsed = JSON.parse(token)
  } catch {
    throw new Error('Invalid saved session')
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as InviteIdentity).firstName !== 'string' ||
    typeof (parsed as InviteIdentity).lastName !== 'string' ||
    typeof (parsed as InviteIdentity).phone !== 'string'
  ) {
    throw new Error('Invalid saved session')
  }
  return parsed as InviteIdentity
}

function identityFromInviteRow(row: InviteRow): InviteIdentity {
  const firstName = pickString(row, ['firstName'])
  const lastName = pickString(row, ['lastName'])
  const phone = pickString(row, ['phone'])
  if (!firstName || !lastName || !phone) {
    throw new Error('Invite row is missing firstName, lastName, or phone')
  }
  return { firstName, lastName, phone }
}

async function loadInviteByToken(sb: ReturnType<typeof getSupabaseClient>, token: string) {
  const identity = parseInviteToken(token)
  const { data, error } = await sb
    .from('invites')
    .select('*')
    .eq('firstName', identity.firstName)
    .eq('lastName', identity.lastName)
    .eq('phone', identity.phone)
    .limit(2)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Invite was not found')
  if (data.length > 1) throw new Error('Saved session matched multiple invites')
  return data[0] as InviteRow
}

async function fetchInvitesByFamilyId(
  sb: ReturnType<typeof getSupabaseClient>,
  familyId: number | null,
): Promise<InviteRow[]> {
  if (familyId == null) return []
  const { data, error } = await sb.from('invites').select('*').eq('familyID', familyId)
  if (error) throw new Error(error.message)
  return (data ?? []) as InviteRow[]
}

function getSupabaseClient() {
  if (!hasSupabaseEnv || !supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env and restart npm run dev.',
    )
  }
  return supabase
}

export async function login(body: { phone: string }): Promise<{ guestId: string }> {
  const phone = digitsOnly(body.phone)
  if (!phone) {
    throw new Error('Missing phone number')
  }
  const sb = getSupabaseClient()

  const { data, error } = await sb.from('invites').select('*')
  if (error) {
    throw new Error(
      `Could not query invites table for sign-in: ${error.message}`,
    )
  }

  const matches = (data ?? []).filter((row) => {
    const invite = row as InviteRow
    const profile = readInviteName(invite)
    return digitsOnly(profile.phone) === phone
  })

  if (matches.length === 0) {
    throw new Error('No invite matches that phone number')
  }
  if (matches.length > 1) {
    throw new Error('More than one invite matches this phone number')
  }

  const identity = identityFromInviteRow(matches[0] as InviteRow)
  return { guestId: createInviteToken(identity) }
}

export async function fetchMe(guestId: string): Promise<MeResponse> {
  const sb = getSupabaseClient()
  const row = await loadInviteByToken(sb, guestId)
  const profile = readInviteName(row)
  const eventIds = getInviteEventIds(row)
  const familyId = pickFamilyId(row)

  const familyRows = await fetchInvitesByFamilyId(sb, familyId)
  const members =
    familyRows.length > 0
      ? familyRows.map((r) => {
          const p = readInviteName(r)
          return {
            id: createInviteToken(identityFromInviteRow(r)),
            firstName: p.firstName,
            lastName: p.lastName,
            additionalGuestsConfirmedByEvent: readAdditionalGuestsConfirmedByEvent(r),
          }
        })
      : [
          {
            id: guestId,
            firstName: profile.firstName,
            lastName: profile.lastName,
            additionalGuestsConfirmedByEvent: readAdditionalGuestsConfirmedByEvent(row),
          },
        ]

  return {
    guest: {
      id: guestId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      familyId,
      eventIds,
      additionalGuestsAllowedByEvent: readAdditionalGuestsAllowedByEvent(row),
      additionalGuestsConfirmedByEvent: readAdditionalGuestsConfirmedByEvent(row),
    },
    familyMembers: members,
  }
}

export async function fetchEvent(
  guestId: string,
  eventId: string,
): Promise<EventDetailResponse> {
  const meta = RECEPTION_EVENT_DETAILS[eventId]
  if (!meta) {
    throw new Error(`Unknown event: ${eventId}`)
  }

  const sb = getSupabaseClient()
  const actorRow = await loadInviteByToken(sb, guestId)
  if (!getInviteEventIds(actorRow).includes(eventId)) {
    throw new Error('Not invited to this event')
  }

  const familyId = pickFamilyId(actorRow)
  const familyRows = await fetchInvitesByFamilyId(sb, familyId)
  const pool = familyRows.length > 0 ? familyRows : [actorRow]
  const rows = pool.filter((r) => getInviteEventIds(r).includes(eventId))
  const rsvpCols = getInviteRsvpColumnCandidates(eventId)

  const rsvps = rows.map((r) => {
    const token = createInviteToken(identityFromInviteRow(r))
    const attending = readRsvp01(r, rsvpCols)
    const status: RsvpStatus =
      attending === true ? 'attending' : attending === false ? 'declined' : 'pending'
    return {
      guestId: token,
      eventId,
      status,
      mealPreference: undefined,
      notes: undefined,
      updatedAt: undefined,
    }
  })

  return {
    event: {
      id: eventId,
      slug: eventId,
      title: meta.title,
      dateIso: meta.dateIso,
      venueName: meta.venueName,
      addressLines: meta.addressLines,
      description: meta.eveningDescription,
    },
    rsvps,
  }
}

export async function submitReceptionRsvps(
  guestIdActing: string,
  eventId: string,
  responses: { guestId: string; attending: boolean }[],
): Promise<{ ok: boolean }> {
  const sb = getSupabaseClient()
  const actorRow = await loadInviteByToken(sb, guestIdActing)
  if (!getInviteEventIds(actorRow).includes(eventId)) {
    throw new Error('Not invited to this event')
  }
  const actorFamily = pickFamilyId(actorRow)
  const columns = getInviteRsvpColumnCandidates(eventId)
  if (columns.length === 0) {
    throw new Error(`No RSVP column mapping exists for event "${eventId}"`)
  }

  for (const { guestId, attending } of responses) {
    const targetRow = await loadInviteByToken(sb, guestId)
    if (pickFamilyId(targetRow) !== actorFamily) {
      throw new Error('Cannot RSVP for someone outside your family group')
    }
    if (!getInviteEventIds(targetRow).includes(eventId)) {
      throw new Error('Guest is not invited to this event')
    }
    const identity = identityFromInviteRow(targetRow)
    const value = attending ? 1 : 0
    let updated = false
    let lastErr: string | null = null
    for (const column of columns) {
      const { error } = await sb
        .from('invites')
        .update({ [column]: value })
        .eq('firstName', identity.firstName)
        .eq('lastName', identity.lastName)
        .eq('phone', identity.phone)
      if (!error) {
        updated = true
        break
      }
      lastErr = error.message
    }
    if (!updated) {
      throw new Error(lastErr ?? 'Could not update RSVP')
    }
  }

  return { ok: true }
}

export async function submitAdditionalGuestsConfirmed(
  guestIdActing: string,
  eventId: string,
  confirmedCount: number,
): Promise<{ ok: boolean; confirmedCount: number; remaining: number }> {
  if (!Number.isInteger(confirmedCount) || confirmedCount < 0) {
    throw new Error('Additional guests must be a whole number')
  }

  const sb = getSupabaseClient()
  const actorRow = await loadInviteByToken(sb, guestIdActing)
  if (!getInviteEventIds(actorRow).includes(eventId)) {
    throw new Error('Not invited to this event')
  }
  const actorFamily = pickFamilyId(actorRow)
  const familyRows = await fetchInvitesByFamilyId(sb, actorFamily)
  const pool = familyRows.length > 0 ? familyRows : [actorRow]
  const additionalGuestsAllowed = readAdditionalGuestsAllowed(actorRow, eventId) ?? 0
  const actorIdentity = identityFromInviteRow(actorRow)

  const confirmedByOtherFamilyMembers = pool.reduce((total, row) => {
    const identity = identityFromInviteRow(row)
    const isActor =
      identity.firstName === actorIdentity.firstName &&
      identity.lastName === actorIdentity.lastName &&
      identity.phone === actorIdentity.phone
    return isActor ? total : total + readAdditionalGuestsConfirmed(row, eventId)
  }, 0)

  const remainingForActor = Math.max(
    0,
    additionalGuestsAllowed - confirmedByOtherFamilyMembers,
  )
  if (confirmedCount > remainingForActor) {
    throw new Error(
      `Only ${remainingForActor} additional ${
        remainingForActor === 1 ? 'guest is' : 'guests are'
      } remaining for your family`,
    )
  }

  const { error } = await sb
    .from('invites')
    .update({ [getAdditionalGuestsConfirmedColumn(actorRow, eventId)]: confirmedCount })
    .eq('firstName', actorIdentity.firstName)
    .eq('lastName', actorIdentity.lastName)
    .eq('phone', actorIdentity.phone)
  if (error) throw new Error(error.message)

  return {
    ok: true,
    confirmedCount,
    remaining: additionalGuestsAllowed - confirmedByOtherFamilyMembers - confirmedCount,
  }
}
