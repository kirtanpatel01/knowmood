import { pgTable, text, timestamp, boolean, uuid, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- Better Auth Schema Tables ---

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Knowmood Application Tables ---

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  username: text("username").notNull(),
  usernameLower: text("username_lower").notNull().unique(),
  currentMood: text("current_mood", { enum: ["happy", "unhappy"] }).notNull().default("happy"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bondRequests = pgTable("bond_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderUserId: text("sender_user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  recipientUserId: text("recipient_user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text("status", { enum: ["pending", "accepted", "declined", "cancelled"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  check("no_self_requests", sql`${table.senderUserId} <> ${table.recipientUserId}`),
  // Database-enforced rule: Only ONE active pending request per sender
  uniqueIndex("one_pending_request_per_sender")
    .on(table.senderUserId)
    .where(sql`${table.status} = 'pending'`),
]);

export const bonds = pgTable("bonds", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAId: text("user_a_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  userBId: text("user_b_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text("status", { enum: ["active", "break_pending", "ended"] }).notNull().default("active"),
  breakRequestedByUserId: text("break_requested_by_user_id").references(() => user.id, { onDelete: 'set null' }),
  breakRequestedAt: timestamp("break_requested_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
}, (table) => [
  check("no_self_bonding", sql`${table.userAId} <> ${table.userBId}`),
  check("canonical_order", sql`${table.userAId} < ${table.userBId}`),
  // Database-enforced rule: Maximum ONE active or break_pending bond per user
  uniqueIndex("one_active_bond_user_a")
    .on(table.userAId)
    .where(sql`${table.status} IN ('active', 'break_pending')`),
  uniqueIndex("one_active_bond_user_b")
    .on(table.userBId)
    .where(sql`${table.status} IN ('active', 'break_pending')`),
]);
