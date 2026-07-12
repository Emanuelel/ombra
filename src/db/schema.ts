import {
  pgTable,
  serial,
  text,
  doublePrecision,
  integer,
  timestamp,
  jsonb,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core'

/**
 * `users` is owned/populated by the auth layer (Auth.js or Better Auth adapter).
 * The remaining tables are the game's own state. See README for setup.
 */
export const users = pgTable('users', {
  id: text('id').primaryKey(), // auth subject id
  email: text('email').unique(),
  googleSub: text('google_sub').unique(), // Google's stable subject id (null for handle-only users)
  name: text('name'),
  image: text('image'), // e.g. Google profile picture URL
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const profiles = pgTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull().unique(), // the @handle (stored lowercase)
  avatarUrl: text('avatar_url'),
  homeBarri: text('home_barri'),
  pointsTotal: integer('points_total').default(0).notNull(),
  lang: text('lang'), // preferred UI language ('es' | 'ca' | 'en'); null => 'es'. Used to localize server-sent push.
})

// Opaque server-side sessions (revocable - logout deletes the row).
export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Saved favourites - a terrace or a barri, pinned to the top of the user's boards.
export const favorites = pgTable(
  'favorites',
  {
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    kind: text('kind').notNull(), // 'terrace' | 'barri'
    ref: text('ref').notNull(), // terrace id or barri name
    label: text('label').notNull(), // display name
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.kind, t.ref] }) }),
)

// Web-push subscriptions (one per browser/device) for crown-steal notifications.
export const pushSubscriptions = pgTable('push_subscriptions', {
  endpoint: text('endpoint').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const terraces = pgTable('terraces', {
  id: text('id').primaryKey(), // OSM id, e.g. "node/123"
  name: text('name').notNull(),
  amenity: text('amenity').notNull(),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  barri: text('barri'),
})

export const checkIns = pgTable(
  'check_ins',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    terraceId: text('terrace_id')
      .references(() => terraces.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    sunAltitude: doublePrecision('sun_altitude').notNull(),
    shadeStatus: text('shade_status').notNull(),
    points: integer('points').notNull(),
    lat: doublePrecision('lat').notNull(),
    lon: doublePrecision('lon').notNull(),
  },
  (t) => ({
    // Powers the rolling-window leaderboard: WHERE terrace_id=? AND created_at > now()-7d
    byTerraceTime: index('ci_terrace_time').on(t.terraceId, t.createdAt),
    byUserTime: index('ci_user_time').on(t.userId, t.createdAt),
  }),
)

export const follows = pgTable(
  'follows',
  {
    followerId: text('follower_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    followingId: text('following_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.followerId, t.followingId] }) }),
)

export const kudos = pgTable(
  'kudos',
  {
    id: serial('id').primaryKey(),
    fromUser: text('from_user')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    checkInId: integer('check_in_id')
      .references(() => checkIns.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => ({ uniq: uniqueIndex('kudos_from_checkin').on(t.fromUser, t.checkInId) }),
)

export const badges = pgTable('badges', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
})

export const userBadges = pgTable(
  'user_badges',
  {
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    badgeKey: text('badge_key')
      .references(() => badges.key, { onDelete: 'cascade' })
      .notNull(),
    earnedAt: timestamp('earned_at').defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.badgeKey] }) }),
)

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'crown_stolen' | 'kudos' | 'badge'
  payload: jsonb('payload').notNull(),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Cache of the current crown holder per scope, for fast reads + steal detection. */
export const currentCrowns = pgTable(
  'current_crowns',
  {
    scope: text('scope').notNull(), // 'terrace' | 'barri'
    scopeId: text('scope_id').notNull(),
    holderUserId: text('holder_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    since: timestamp('since').defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.scope, t.scopeId] }) }),
)
