import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type InstaMeUploadedImageRecord = {
  id: string;
  name: string;
  kind?: "uploaded" | "enhanced" | "own_style";
  mimeType: string;
  base64: string;
  previewBase64: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  analyzedPrompt?: string;
  analysisMode?: "reference_locked" | "creative_prompt";
  analysisVersion?: number;
  imageHash?: string;
  firstUseSurchargeCharged?: boolean;
  createdAt: string;
};

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  passwordResetTokenHash: text("password_reset_token_hash"),
  passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at"),
  authProvider: text("auth_provider").notNull().default("email"),
  providerId: text("provider_id"),
  credits: integer("credits").notNull().default(3),
  subscriptionPlan: text("subscription_plan"),
  subscriptionRenewAt: timestamp("subscription_renew_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  appleOriginalTransactionId: text("apple_original_transaction_id"),
  styleGender: text("style_gender"),
  stylePreferences: jsonb("style_preferences").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  favoriteLooks: jsonb("favorite_looks").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  instameStyleUsage: jsonb("instame_style_usage")
    .$type<Record<string, number>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  instameUploadedImages: jsonb("instame_uploaded_images")
    .$type<InstaMeUploadedImageRecord[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // purchase | subscription | usage | refund
    amountCredits: integer("amount_credits").notNull(),
    amountUsdCents: integer("amount_usd_cents"),
    source: text("source"), // stripe | manual | app
    description: text("description"),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    stripeSessionIdUnique: uniqueIndex("credit_transactions_stripe_session_id_unique").on(
      table.stripeSessionId,
    ),
    stripePaymentIntentIdUnique: uniqueIndex("credit_transactions_stripe_payment_intent_id_unique").on(
      table.stripePaymentIntentId,
    ),
  }),
);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAuthUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  passwordHash: true,
  authProvider: true,
  providerId: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertAuthUser = z.infer<typeof insertAuthUserSchema>;
export type AppUser = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
