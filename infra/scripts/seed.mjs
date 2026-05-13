/**
 * Sample data for local testing after deploy.
 * Usage: TABLE_NAME=YourTable AWS_REGION=us-east-1 node scripts/seed.mjs
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

const table = process.env.TABLE_NAME
if (!table) {
  console.error('Set TABLE_NAME to the DynamoDB table name (CDK output TableName).')
  process.exit(1)
}

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))

/** Same as Lambda `guestNameKey`: gsi1pk for sign-in lookup. */
function guestNameKey(firstName, lastName) {
  const norm = (s) => s.trim().toLowerCase()
  return `${norm(firstName)}#${norm(lastName)}`
}

const items = [
  {
    pk: 'EVENT#ceremony',
    sk: 'META',
    title: 'Ceremony',
    dateIso: '2026-09-12T16:00:00',
    venueName: 'St. Example Church',
    addressLines: ['123 Faith Lane', 'Springfield'],
    description:
      'Please arrive fifteen minutes early.\n\nFormal attire appreciated.',
  },
  {
    pk: 'EVENT#reception',
    sk: 'META',
    title: 'Reception',
    dateIso: '2026-09-12T18:30:00',
    venueName: 'The Garden House',
    addressLines: ['456 Meadow Road', 'Springfield'],
    description:
      'Dinner and dancing to follow.\n\nLet us know about dietary needs in your RSVP note.',
  },
  {
    pk: 'GUEST#demo-alice',
    sk: 'PROFILE',
    firstName: 'Alice',
    lastName: 'Example',
    gsi1pk: guestNameKey('Alice', 'Example'),
    gsi1sk: 'GUEST#demo-alice',
    familyId: 'family-demo',
    gsi2pk: 'FAMILY#family-demo',
    gsi2sk: 'GUEST#demo-alice',
    eventIds: ['ceremony', 'reception'],
  },
  {
    pk: 'GUEST#demo-bob',
    sk: 'PROFILE',
    firstName: 'Bob',
    lastName: 'Example',
    gsi1pk: guestNameKey('Bob', 'Example'),
    gsi1sk: 'GUEST#demo-bob',
    familyId: 'family-demo',
    gsi2pk: 'FAMILY#family-demo',
    gsi2sk: 'GUEST#demo-bob',
    eventIds: ['reception'],
  },
]

for (const Item of items) {
  await ddb.send(new PutCommand({ TableName: table, Item }))
  console.log('Put', Item.pk, Item.sk)
}

console.log(
  '\nTry signing in as Alice Example (both events) or Bob Example (reception only).',
)
