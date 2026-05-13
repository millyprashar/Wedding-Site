import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  PutCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb'
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'
import { createHmac, timingSafeEqual } from 'node:crypto'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const sm = new SecretsManagerClient({})

let cachedJwtSecret: string | null = null

async function getJwtSecret(): Promise<string> {
  if (cachedJwtSecret) return cachedJwtSecret
  const arn = process.env.JWT_SECRET_ARN
  if (!arn) throw new Error('JWT_SECRET_ARN missing')
  const out = await sm.send(new GetSecretValueCommand({ SecretId: arn }))
  const s = out.SecretString
  if (!s) throw new Error('JWT secret empty')
  try {
    const parsed = JSON.parse(s) as { jwt?: string }
    cachedJwtSecret = parsed.jwt ?? s
  } catch {
    cachedJwtSecret = s
  }
  return cachedJwtSecret
}

function json(
  statusCode: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  }
}

function b64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url')
}

async function signJwt(
  payload: Record<string, unknown>,
): Promise<string> {
  const secret = await getJwtSecret()
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' })
  const body = b64urlJson(payload)
  const sig = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url')
  return `${header}.${body}.${sig}`
}

async function verifyJwt(
  token: string,
): Promise<{ sub: string; familyId: string; eventIds: string[] } | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  if (!h || !p || !s) return null
  const secret = await getJwtSecret()
  const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest()
  let sigBuf: Buffer
  try {
    sigBuf = Buffer.from(s, 'base64url')
  } catch {
    return null
  }
  if (sigBuf.length !== expected.length || !timingSafeEqual(sigBuf, expected)) {
    return null
  }
  let payload: { sub?: string; familyId?: string; eventIds?: string[]; exp?: number }
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.familyId !== 'string' ||
    !Array.isArray(payload.eventIds) ||
    typeof payload.exp !== 'number'
  ) {
    return null
  }
  if (payload.exp * 1000 < Date.now()) return null
  return {
    sub: payload.sub,
    familyId: payload.familyId,
    eventIds: payload.eventIds as string[],
  }
}

function parseAuth(header: string | undefined): string | null {
  if (!header?.toLowerCase().startsWith('bearer ')) return null
  return header.slice(7).trim() || null
}

const TABLE = process.env.TABLE_NAME ?? ''

/** Must match `gsi1pk` on guest PROFILE items (lowercase first + # + lowercase last). */
function guestNameKey(firstName: string, lastName: string): string {
  const norm = (s: string) => s.trim().toLowerCase()
  return `${norm(firstName)}#${norm(lastName)}`
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, body: '' }
  }

  const method = event.requestContext.http.method
  const path = event.rawPath.replace(/\/$/, '') || '/'

  try {
    if (method === 'POST' && path === '/auth/login') {
      const body = event.body
        ? (JSON.parse(event.body) as Record<string, unknown>)
        : {}
      const firstName = String(body.firstName ?? '').trim()
      const lastName = String(body.lastName ?? '').trim()
      if (!firstName || !lastName) {
        return json(400, { message: 'Missing first or last name' })
      }

      const nameKey = guestNameKey(firstName, lastName)

      const q = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'gsi1pk = :k',
          ExpressionAttributeValues: { ':k': nameKey },
          Limit: 10,
        }),
      )

      const items = q.Items ?? []
      if (items.length > 1) {
        return json(409, {
          message:
            'More than one guest matches this name. Ask the hosts to fix the guest list.',
        })
      }

      const match = items[0]
      if (!match || !match.pk || !match.sk) {
        return json(401, { message: 'Name not found on the guest list' })
      }

      const guestId = String(match.pk).replace(/^GUEST#/, '')
      const familyId = String(match.familyId ?? '')
      const eventIds = (match.eventIds as string[] | undefined) ?? []

      if (!familyId) {
        return json(500, { message: 'Guest record incomplete' })
      }

      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
      const token = await signJwt({
        sub: guestId,
        familyId,
        eventIds,
        exp,
      })

      return json(200, { token })
    }

    const token = parseAuth(event.headers.authorization ?? event.headers.Authorization)
    if (!token) {
      return json(401, { message: 'Unauthorized' })
    }

    const claims = await verifyJwt(token)
    if (!claims) {
      return json(401, { message: 'Invalid or expired session' })
    }

    if (method === 'GET' && path === '/me') {
      const guestRes = await ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { pk: `GUEST#${claims.sub}`, sk: 'PROFILE' },
        }),
      )
      const g = guestRes.Item
      if (!g) return json(404, { message: 'Guest not found' })

      const fq = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI2',
          KeyConditionExpression: 'gsi2pk = :f',
          ExpressionAttributeValues: { ':f': `FAMILY#${claims.familyId}` },
        }),
      )

      const familyMembers = (fq.Items ?? []).map((it) => ({
        id: String(it.pk ?? '').replace(/^GUEST#/, ''),
        firstName: String(it.firstName ?? ''),
        lastName: String(it.lastName ?? ''),
      }))

      return json(200, {
        guest: {
          id: claims.sub,
          firstName: g.firstName,
          lastName: g.lastName,
          familyId: claims.familyId,
          eventIds: claims.eventIds,
        },
        familyMembers,
      })
    }

    const eventMatch = /^\/events\/([^/]+)$/.exec(path)
    if (method === 'GET' && eventMatch) {
      const eventId = eventMatch[1]
      if (!claims.eventIds.includes(eventId)) {
        return json(403, { message: 'Not invited to this event' })
      }

      const evRes = await ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { pk: `EVENT#${eventId}`, sk: 'META' },
        }),
      )
      if (!evRes.Item) return json(404, { message: 'Event not found' })

      const e = evRes.Item

      const fam = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI2',
          KeyConditionExpression: 'gsi2pk = :f',
          ExpressionAttributeValues: {
            ':f': `FAMILY#${claims.familyId}`,
          },
        }),
      )

      const guestIds = (fam.Items ?? [])
        .map((it) => String(it.pk ?? '').replace(/^GUEST#/, ''))
        .filter(Boolean)

      const rsvpKeys = guestIds.map((gid) => ({
        pk: `RSVP#${eventId}`,
        sk: `GUEST#${gid}`,
      }))

      const rsvps: Record<string, unknown>[] = []
      if (rsvpKeys.length > 0) {
        const chunks: (typeof rsvpKeys)[] = []
        for (let i = 0; i < rsvpKeys.length; i += 100) {
          chunks.push(rsvpKeys.slice(i, i + 100))
        }
        for (const chunk of chunks) {
          const bg = await ddb.send(
            new BatchGetCommand({
              RequestItems: {
                [TABLE]: { Keys: chunk },
              },
            }),
          )
          const got = bg.Responses?.[TABLE] ?? []
          for (const r of got) {
            rsvps.push({
              guestId: String(r.guestId ?? '').replace(/^GUEST#/, ''),
              eventId,
              status: r.status ?? 'pending',
              mealPreference: r.mealPreference,
              notes: r.notes,
              updatedAt: r.updatedAt,
            })
          }
        }
      }

      return json(200, {
        event: {
          id: eventId,
          slug: eventId,
          title: e.title,
          dateIso: e.dateIso,
          venueName: e.venueName,
          addressLines: e.addressLines ?? [],
          description: e.description ?? '',
        },
        rsvps,
      })
    }

    const rsvpMatch = /^\/events\/([^/]+)\/rsvp$/.exec(path)
    if (method === 'POST' && rsvpMatch) {
      const eventId = rsvpMatch[1]
      if (!claims.eventIds.includes(eventId)) {
        return json(403, { message: 'Not invited to this event' })
      }

      const body = event.body
        ? (JSON.parse(event.body) as Record<string, unknown>)
        : {}
      const targetGuestId = String(body.guestId ?? '')
      const status = String(body.status ?? '')
      const allowedStatus = new Set([
        'pending',
        'attending',
        'declined',
        'tentative',
      ])
      if (!targetGuestId || !allowedStatus.has(status)) {
        return json(400, { message: 'Invalid RSVP payload' })
      }

      const fq = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI2',
          KeyConditionExpression: 'gsi2pk = :f',
          ExpressionAttributeValues: { ':f': `FAMILY#${claims.familyId}` },
        }),
      )

      const allowedIds = new Set(
        (fq.Items ?? []).map((it) =>
          String(it.pk ?? '').replace(/^GUEST#/, ''),
        ),
      )

      if (!allowedIds.has(targetGuestId)) {
        return json(403, { message: 'Cannot RSVP for this guest' })
      }

      const mealPreference =
        typeof body.mealPreference === 'string'
          ? body.mealPreference.trim()
          : undefined
      const notes =
        typeof body.notes === 'string' ? body.notes.trim() : undefined

      await ddb.send(
        new PutCommand({
          TableName: TABLE,
          Item: {
            pk: `RSVP#${eventId}`,
            sk: `GUEST#${targetGuestId}`,
            guestId: `GUEST#${targetGuestId}`,
            eventId,
            status,
            mealPreference: mealPreference || undefined,
            notes: notes || undefined,
            updatedAt: new Date().toISOString(),
          },
        }),
      )

      return json(200, { ok: true })
    }

    return json(404, { message: 'Not found' })
  } catch (err) {
    console.error(err)
    return json(500, { message: 'Server error' })
  }
}
