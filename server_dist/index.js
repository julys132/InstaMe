"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_express = __toESM(require("express"));

// server/routes.ts
var import_node_http = require("node:http");
var fs2 = __toESM(require("node:fs"));
var path2 = __toESM(require("node:path"));
var import_sharp = __toESM(require("sharp"));
var import_node_crypto2 = require("node:crypto");
var import_drizzle_orm3 = require("drizzle-orm");

// server/db.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = require("pg");
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
var connectionString = process.env.DATABASE_URL;
var isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
var pool = new import_pg.Pool({
  connectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});
var db = (0, import_node_postgres.drizzle)(pool);

// shared/schema.ts
var import_drizzle_orm = require("drizzle-orm");
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  email: (0, import_pg_core.text)("email").notNull().unique(),
  name: (0, import_pg_core.text)("name").notNull(),
  passwordHash: (0, import_pg_core.text)("password_hash"),
  passwordResetTokenHash: (0, import_pg_core.text)("password_reset_token_hash"),
  passwordResetTokenExpiresAt: (0, import_pg_core.timestamp)("password_reset_token_expires_at"),
  authProvider: (0, import_pg_core.text)("auth_provider").notNull().default("email"),
  providerId: (0, import_pg_core.text)("provider_id"),
  credits: (0, import_pg_core.integer)("credits").notNull().default(3),
  subscriptionPlan: (0, import_pg_core.text)("subscription_plan"),
  subscriptionRenewAt: (0, import_pg_core.timestamp)("subscription_renew_at"),
  stripeCustomerId: (0, import_pg_core.text)("stripe_customer_id"),
  stripeSubscriptionId: (0, import_pg_core.text)("stripe_subscription_id"),
  appleOriginalTransactionId: (0, import_pg_core.text)("apple_original_transaction_id"),
  styleGender: (0, import_pg_core.text)("style_gender"),
  stylePreferences: (0, import_pg_core.jsonb)("style_preferences").$type().notNull().default(import_drizzle_orm.sql`'[]'::jsonb`),
  favoriteLooks: (0, import_pg_core.jsonb)("favorite_looks").$type().notNull().default(import_drizzle_orm.sql`'[]'::jsonb`),
  instameStyleUsage: (0, import_pg_core.jsonb)("instame_style_usage").$type().notNull().default(import_drizzle_orm.sql`'{}'::jsonb`),
  instameUploadedImages: (0, import_pg_core.jsonb)("instame_uploaded_images").$type().notNull().default(import_drizzle_orm.sql`'[]'::jsonb`),
  notificationsEnabled: (0, import_pg_core.boolean)("notifications_enabled").notNull().default(true),
  createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").notNull().defaultNow()
});
var sessions = (0, import_pg_core.pgTable)("sessions", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  userId: (0, import_pg_core.varchar)("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: (0, import_pg_core.text)("refresh_token_hash").notNull(),
  expiresAt: (0, import_pg_core.timestamp)("expires_at").notNull(),
  revokedAt: (0, import_pg_core.timestamp)("revoked_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow()
});
var instamePacks = (0, import_pg_core.pgTable)("instame_packs", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  userId: (0, import_pg_core.varchar)("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: (0, import_pg_core.text)("title").notNull(),
  aesthetic: (0, import_pg_core.text)("aesthetic"),
  palette: (0, import_pg_core.text)("palette"),
  imageCount: (0, import_pg_core.integer)("image_count").notNull().default(0),
  createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow()
});
var instamePackImages = (0, import_pg_core.pgTable)("instame_pack_images", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  packId: (0, import_pg_core.varchar)("pack_id").notNull().references(() => instamePacks.id, { onDelete: "cascade" }),
  userId: (0, import_pg_core.varchar)("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: (0, import_pg_core.text)("role").notNull().default("image"),
  // "preview" | "image"
  position: (0, import_pg_core.integer)("position").notNull().default(0),
  label: (0, import_pg_core.text)("label"),
  mimeType: (0, import_pg_core.text)("mime_type").notNull().default("image/png"),
  width: (0, import_pg_core.integer)("width").notNull().default(0),
  height: (0, import_pg_core.integer)("height").notNull().default(0),
  // Small thumbnail kept inline for fast gallery rendering (data URI).
  previewBase64: (0, import_pg_core.text)("preview_base64"),
  // When the object bucket is configured, the full image bytes live in S3 (storageKey).
  // Otherwise they are kept inline as base64 so the feature works everywhere.
  storageKey: (0, import_pg_core.text)("storage_key"),
  inlineBase64: (0, import_pg_core.text)("inline_base64"),
  createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow()
});
var creditTransactions = (0, import_pg_core.pgTable)(
  "credit_transactions",
  {
    id: (0, import_pg_core.serial)("id").primaryKey(),
    userId: (0, import_pg_core.varchar)("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: (0, import_pg_core.text)("type").notNull(),
    // purchase | subscription | usage | refund
    amountCredits: (0, import_pg_core.integer)("amount_credits").notNull(),
    amountUsdCents: (0, import_pg_core.integer)("amount_usd_cents"),
    source: (0, import_pg_core.text)("source"),
    // stripe | manual | app
    description: (0, import_pg_core.text)("description"),
    stripeSessionId: (0, import_pg_core.text)("stripe_session_id"),
    stripePaymentIntentId: (0, import_pg_core.text)("stripe_payment_intent_id"),
    createdAt: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow()
  },
  (table) => ({
    stripeSessionIdUnique: (0, import_pg_core.uniqueIndex)("credit_transactions_stripe_session_id_unique").on(
      table.stripeSessionId
    ),
    stripePaymentIntentIdUnique: (0, import_pg_core.uniqueIndex)("credit_transactions_stripe_payment_intent_id_unique").on(
      table.stripePaymentIntentId
    )
  })
);
var conversations = (0, import_pg_core.pgTable)("conversations", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  title: (0, import_pg_core.text)("title").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").default(import_drizzle_orm.sql`CURRENT_TIMESTAMP`).notNull()
});
var messages = (0, import_pg_core.pgTable)("messages", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  conversationId: (0, import_pg_core.integer)("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: (0, import_pg_core.text)("role").notNull(),
  content: (0, import_pg_core.text)("content").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").default(import_drizzle_orm.sql`CURRENT_TIMESTAMP`).notNull()
});
var insertAuthUserSchema = (0, import_drizzle_zod.createInsertSchema)(users).pick({
  email: true,
  name: true,
  passwordHash: true,
  authProvider: true,
  providerId: true
});
var insertConversationSchema = (0, import_drizzle_zod.createInsertSchema)(conversations).omit({
  id: true,
  createdAt: true
});
var insertMessageSchema = (0, import_drizzle_zod.createInsertSchema)(messages).omit({
  id: true,
  createdAt: true
});

// shared/instame-style-presets.ts
var INSTAME_OWN_STYLE_ID = "own_style";
var INSTAME_STYLE_PRESETS = [
  {
    id: "old_money",
    label: "Old Money",
    subtitle: "Timeless tailoring and refined neutrals",
    qualityTier: "premium",
    promptHint: "quiet old-money elegance, tailored silhouettes, premium fabrics, minimal luxury accessories",
    representativeImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop"
    ]
  },
  {
    id: "retro",
    label: "Retro",
    subtitle: "Vintage vibe with film-like warmth",
    qualityTier: "premium",
    promptHint: "retro editorial mood, soft grain feeling, vintage styling cues, analog-inspired color",
    representativeImage: "https://images.unsplash.com/photo-1464863979621-258859e62245?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1464863979621-258859e62245?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=1200&auto=format&fit=crop"
    ]
  },
  {
    id: "glam",
    label: "Glam",
    subtitle: "Polished beauty and statement details",
    qualityTier: "premium",
    promptHint: "high-end glam editorial, sculpted light, clean skin texture, polished luxury finish",
    representativeImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1488716820095-cbe80883c496?q=80&w=1200&auto=format&fit=crop"
    ]
  },
  {
    id: "selfie",
    label: "Selfie",
    subtitle: "Natural face-first premium selfie look",
    qualityTier: "premium",
    promptHint: "clean premium selfie aesthetic, flattering light, natural skin texture, subtle makeup refinement",
    representativeImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521146764736-56c929d59c83?q=80&w=1200&auto=format&fit=crop"
    ]
  },
  {
    id: "in_car_selfie",
    label: "In-Car Selfie",
    subtitle: "Luxury car ambience with elegant light",
    qualityTier: "premium",
    promptHint: "inside premium car selfie look, realistic in-car reflections, elegant contrast, social-ready framing",
    representativeImage: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop"
    ]
  },
  {
    id: "street_luxe",
    label: "Street Luxe",
    subtitle: "Modern city chic with premium edge",
    qualityTier: "premium",
    promptHint: "urban luxury editorial, crisp styling, clean structure, premium street-chic mood",
    representativeImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1495385794356-15371f348c31?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1200&auto=format&fit=crop"
    ]
  }
];
function findInstaMeStylePresetById(id) {
  return INSTAME_STYLE_PRESETS.find((preset) => preset.id === id);
}

// shared/instame-pricing.ts
var INSTAME_QUALITY_TIER_CREDITS = {
  standard: 1,
  premium: 2,
  pro: 4
};
var INSTAME_QUALITY_TIER_RANK = {
  standard: 1,
  premium: 2,
  pro: 3
};
function getInstaMeCreditsForQualityTier(qualityTier) {
  return INSTAME_QUALITY_TIER_CREDITS[qualityTier] || INSTAME_QUALITY_TIER_CREDITS.premium;
}
function getInstaMeQualityTierLabel(qualityTier) {
  if (qualityTier === "standard") return "Fast";
  if (qualityTier === "pro") return "Signature";
  return "Best";
}
function getHigherInstaMeQualityTier(left, right) {
  return INSTAME_QUALITY_TIER_RANK[left] >= INSTAME_QUALITY_TIER_RANK[right] ? left : right;
}
function resolveInstaMeQualityTierForModel(input) {
  const provider = (input.provider || "").trim().toLowerCase();
  const model = (input.model || "").trim().toLowerCase();
  const fingerprint = `${provider}:${model}`;
  if (fingerprint.includes("flux.2-max") || fingerprint.includes("reve-v1.1") || fingerprint.includes("reve")) {
    return "pro";
  }
  if (fingerprint.includes("flux.2-pro") || fingerprint.includes("chatgpt-image-latest-high-fidelity") || fingerprint.includes("gpt-image-1") || fingerprint.includes("gemini-3-pro-image")) {
    return "premium";
  }
  if (fingerprint.includes("flash-image-3.1") || fingerprint.includes("gemini-3.1-flash-image-preview") || fingerprint.includes("qwen-image-2.0")) {
    return "standard";
  }
  return provider === "reve" ? "pro" : provider === "openai" ? "premium" : "premium";
}
function resolveHighestInstaMeQualityTier(models, fallback = "premium") {
  if (!Array.isArray(models) || models.length === 0) return fallback;
  return models.reduce((highest, model) => {
    const nextTier = resolveInstaMeQualityTierForModel(model);
    return getHigherInstaMeQualityTier(highest, nextTier);
  }, fallback);
}
function toPublicInstaMeGenerationTier(tier) {
  return {
    id: tier.id,
    label: tier.label,
    subtitle: tier.subtitle,
    credits: tier.credits,
    qualityTier: tier.qualityTier,
    output: tier.output,
    badge: tier.badge,
    availability: tier.availability
  };
}
function toPublicInstaMeEditTier(tier) {
  return {
    id: tier.id,
    label: tier.label,
    subtitle: tier.subtitle,
    credits: tier.credits,
    qualityTier: tier.qualityTier,
    output: tier.output,
    badge: tier.badge,
    availability: tier.availability
  };
}
function toPublicInstaMePortraitEnhanceTier(tier) {
  return {
    id: tier.id,
    label: tier.label,
    subtitle: tier.subtitle,
    credits: tier.credits,
    qualityTier: tier.qualityTier,
    output: tier.output,
    badge: tier.badge,
    availability: tier.availability
  };
}
var INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS = 1;
var INSTAME_GRID_PIPELINE_RENDER_QUALITY_TIER = "premium";
var INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST = INSTAME_QUALITY_TIER_CREDITS[INSTAME_GRID_PIPELINE_RENDER_QUALITY_TIER];
var INSTAME_GRID_PIPELINE_PLAN_CREDIT_COST = 1;
var INSTAME_GRID_PIPELINE_COMPOSITE_CREDIT_COST = INSTAME_GRID_PIPELINE_PLAN_CREDIT_COST + INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST;
var INSTAME_GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE = INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST;
var INSTAME_GENERATION_TIERS = [
  {
    id: "good",
    label: "Good",
    subtitle: "Fast result at 1K resolution",
    credits: 2,
    qualityTier: "premium",
    provider: "Together",
    model: "FLUX.2 Pro",
    output: "1K resolution",
    badge: "Default",
    availability: "live"
  },
  {
    id: "best",
    label: "Best",
    subtitle: "High-quality result at 2K resolution",
    credits: 4,
    qualityTier: "pro",
    provider: "Together",
    model: "FLUX.2 Pro",
    output: "2K resolution",
    availability: "live"
  },
  {
    id: "excellent",
    label: "Excellent",
    subtitle: "Maximum quality at 4K resolution",
    credits: 6,
    qualityTier: "pro",
    provider: "Together",
    model: "FLUX.2 Pro",
    output: "4K resolution",
    availability: "live"
  }
];
var INSTAME_EDIT_TIERS = [
  {
    id: "edit",
    label: "Fast",
    subtitle: "Quick touch-up pass",
    credits: getInstaMeCreditsForQualityTier("standard"),
    qualityTier: "standard",
    provider: "Together",
    model: "Google Flash Image 3.1 Preview",
    output: "1024 x 1024",
    badge: "Included",
    availability: "live"
  }
];
var INSTAME_PORTRAIT_ENHANCE_TIER = {
  id: "portrait_enhance",
  label: "Fast",
  subtitle: "Portrait cleanup before styling",
  credits: getInstaMeCreditsForQualityTier("standard"),
  qualityTier: "standard",
  provider: "Together",
  model: "Google Flash Image 3.1 Preview",
  output: "1024 x 1024",
  badge: "Included",
  availability: "live"
};
function getLiveInstaMeGenerationTier() {
  return INSTAME_GENERATION_TIERS.find((tier) => tier.availability === "live") || INSTAME_GENERATION_TIERS[0];
}

// server/lib/auth.ts
var import_crypto = require("crypto");
var import_drizzle_orm2 = require("drizzle-orm");
var JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "dev-secret-change-me";
var ACCESS_TOKEN_EXPIRES_SECONDS = 15 * 60;
var REFRESH_TOKEN_EXPIRES_DAYS = 30;
function base64UrlEncode(input) {
  const raw = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return raw.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - normalized.length % 4);
  return Buffer.from(normalized + padding, "base64");
}
function signHs256(unsignedToken) {
  return base64UrlEncode((0, import_crypto.createHmac)("sha256", JWT_SECRET).update(unsignedToken).digest());
}
function generateAccessToken(user) {
  const iat = Math.floor(Date.now() / 1e3);
  const exp = iat + ACCESS_TOKEN_EXPIRES_SECONDS;
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({ ...user, iat, exp }));
  const unsignedToken = `${header}.${payload}`;
  const signature = signHs256(unsignedToken);
  return `${unsignedToken}.${signature}`;
}
function verifyAccessToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("INVALID_TOKEN");
  }
  const [header, payload, signature] = parts;
  const expectedSignature = signHs256(`${header}.${payload}`);
  const actualSignatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (actualSignatureBuffer.length !== expectedSignatureBuffer.length || !(0, import_crypto.timingSafeEqual)(actualSignatureBuffer, expectedSignatureBuffer)) {
    throw new Error("INVALID_TOKEN");
  }
  const parsed = JSON.parse(base64UrlDecode(payload).toString("utf8"));
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1e3)) {
    throw new Error("TOKEN_EXPIRED");
  }
  return parsed;
}
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("[auth] rejected request", {
      path: req.originalUrl || req.url,
      reason: "missing_bearer_token",
      method: req.method
    });
    res.status(401).json({ error: "No token provided" });
    return;
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };
    next();
  } catch (error) {
    if (error.message === "TOKEN_EXPIRED") {
      console.warn("[auth] rejected request", {
        path: req.originalUrl || req.url,
        reason: "token_expired",
        method: req.method
      });
      res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
      return;
    }
    console.warn("[auth] rejected request", {
      path: req.originalUrl || req.url,
      reason: "invalid_token",
      method: req.method
    });
    res.status(401).json({ error: "Invalid token" });
  }
}
function generateRefreshToken() {
  return (0, import_crypto.randomBytes)(64).toString("hex");
}
function hashToken(token) {
  return (0, import_crypto.createHash)("sha256").update(token).digest("hex");
}
async function createSession(userId, refreshToken) {
  const expiresAt = /* @__PURE__ */ new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  await db.insert(sessions).values({
    id: (0, import_crypto.randomUUID)(),
    userId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt
  });
}
async function validateRefreshToken(refreshToken) {
  const [session] = await db.select({ userId: sessions.userId }).from(sessions).where(
    (0, import_drizzle_orm2.and)(
      (0, import_drizzle_orm2.eq)(sessions.refreshTokenHash, hashToken(refreshToken)),
      (0, import_drizzle_orm2.isNull)(sessions.revokedAt),
      (0, import_drizzle_orm2.gt)(sessions.expiresAt, /* @__PURE__ */ new Date())
    )
  );
  return session?.userId ?? null;
}
async function revokeSession(refreshToken) {
  await db.update(sessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.eq)(sessions.refreshTokenHash, hashToken(refreshToken)));
}
async function revokeAllSessions(userId) {
  await db.update(sessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(sessions.userId, userId), (0, import_drizzle_orm2.isNull)(sessions.revokedAt)));
}
function hashPassword(password) {
  const salt = (0, import_crypto.randomBytes)(16).toString("hex");
  const hash = (0, import_crypto.scryptSync)(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidateHashBuffer = Buffer.from((0, import_crypto.scryptSync)(password, salt, 64).toString("hex"), "hex");
  const storedHashBuffer = Buffer.from(hash, "hex");
  if (candidateHashBuffer.length !== storedHashBuffer.length) return false;
  return (0, import_crypto.timingSafeEqual)(candidateHashBuffer, storedHashBuffer);
}

// shared/password-policy.ts
function hasUppercaseCharacter(password) {
  return /[A-Z]/.test(password);
}
function hasLowercaseCharacter(password) {
  return /[a-z]/.test(password);
}
function hasNumberCharacter(password) {
  return /\d/.test(password);
}
function hasSpecialCharacter(password) {
  return /[^A-Za-z0-9]/.test(password);
}
function getPasswordRequirementChecks(password) {
  return [
    {
      id: "length",
      label: "8+ characters",
      passed: password.length >= 8,
      messageFragment: "at least 8 characters"
    },
    {
      id: "uppercase",
      label: "1 uppercase letter",
      passed: hasUppercaseCharacter(password),
      messageFragment: "an uppercase letter"
    },
    {
      id: "lowercase",
      label: "1 lowercase letter",
      passed: hasLowercaseCharacter(password),
      messageFragment: "a lowercase letter"
    },
    {
      id: "number",
      label: "1 number",
      passed: hasNumberCharacter(password),
      messageFragment: "a number"
    },
    {
      id: "special",
      label: "1 special character",
      passed: hasSpecialCharacter(password),
      messageFragment: "a special character"
    }
  ];
}
function formatRequirementList(parts) {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}
function getPasswordValidationMessage(password) {
  const missingParts = getPasswordRequirementChecks(password).filter((requirement) => !requirement.passed).map((requirement) => requirement.messageFragment);
  if (missingParts.length === 0) {
    return null;
  }
  return `Password must include ${formatRequirementList(missingParts)}.`;
}

// server/lib/email.ts
function getEmailApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}
function getEmailFromAddress() {
  return process.env.RESEND_FROM_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || process.env.FROM_EMAIL?.trim() || "";
}
function isTransactionalEmailConfigured() {
  return Boolean(getEmailApiKey() && getEmailFromAddress());
}
async function sendTransactionalEmail(payload) {
  const apiKey = getEmailApiKey();
  const from = getEmailFromAddress();
  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    })
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider error (${response.status}): ${details || "Unknown error"}`);
  }
}

// server/lib/stripe.ts
var STRIPE_API_BASE = "https://api.stripe.com/v1";
function isStripePlaceholderKey(key) {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return true;
  const placeholderPatterns = [
    /^sk_live_or_test_key$/,
    /^sk_live_\*+/,
    /^sk_test_\*+/,
    /your[_-]?stripe[_-]?key/,
    /placeholder/,
    /\*{3,}/
  ];
  return placeholderPatterns.some((pattern) => pattern.test(normalized));
}
function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim() || "";
  if (!key || isStripePlaceholderKey(key)) {
    throw new Error(
      "Stripe web checkout is not configured yet. Set a valid STRIPE_SECRET_KEY in Railway before enabling web payments."
    );
  }
  return key;
}
async function stripeRequest({
  method,
  path: path4,
  body
}) {
  const secretKey = getStripeSecretKey();
  const response = await fetch(`${STRIPE_API_BASE}${path4}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}
    },
    body: body ? body.toString() : void 0
  });
  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "Stripe request failed";
    if (typeof message === "string" && /invalid api key provided/i.test(message)) {
      throw new Error(
        "Stripe web checkout is not configured correctly. Update STRIPE_SECRET_KEY in Railway before using web payments."
      );
    }
    throw new Error(message);
  }
  return data;
}
async function createStripeCheckoutSession(params) {
  const form = new URLSearchParams();
  form.set("mode", params.mode);
  form.set("success_url", params.successUrl);
  form.set("cancel_url", params.cancelUrl);
  form.set("customer_email", params.customerEmail);
  form.set("client_reference_id", params.clientReferenceId);
  form.set("payment_method_types[0]", "card");
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "usd");
  form.set(
    "line_items[0][price_data][product_data][name]",
    params.productName
  );
  form.set(
    "line_items[0][price_data][product_data][description]",
    "Credits for InstaMe"
  );
  form.set(
    "line_items[0][price_data][unit_amount]",
    String(params.unitAmountCents)
  );
  if (params.mode === "subscription") {
    form.set("line_items[0][price_data][recurring][interval]", "month");
  }
  for (const [key, value] of Object.entries(params.metadata)) {
    form.set(`metadata[${key}]`, value);
    if (params.mode === "payment") {
      form.set(`payment_intent_data[metadata][${key}]`, value);
    } else {
      form.set(`subscription_data[metadata][${key}]`, value);
    }
  }
  const result = await stripeRequest({
    method: "POST",
    path: "/checkout/sessions",
    body: form
  });
  return result;
}
async function retrieveStripeCheckoutSession(sessionId) {
  const encoded = encodeURIComponent(sessionId);
  return stripeRequest({
    method: "GET",
    path: `/checkout/sessions/${encoded}`
  });
}
async function createStripeBillingPortalSession(params) {
  const form = new URLSearchParams();
  form.set("customer", params.customerId);
  form.set("return_url", params.returnUrl);
  return stripeRequest({
    method: "POST",
    path: "/billing_portal/sessions",
    body: form
  });
}

// server/lib/instame-style-catalog.ts
var fs = __toESM(require("node:fs"));
var path = __toESM(require("node:path"));
var STYLE_CATALOG_PATH = path.resolve(
  process.cwd(),
  "assets",
  "instame-style-presets",
  "catalog.json"
);
var STYLE_PROMPTS_ROOT = path.resolve(
  process.cwd(),
  "assets",
  "instame-style-presets",
  "styles"
);
var catalogCache = null;
var promptFileTextCache = /* @__PURE__ */ new Map();
function isLikelyCorruptedPrompt(prompt) {
  const normalized = prompt.trim();
  if (!normalized) return true;
  if (normalized.includes("\uFFFD") || normalized.includes("\xEF\xBF\xBD")) return true;
  const questionMarkCount = (normalized.match(/\?/g) || []).length;
  const cyrillicCount = (normalized.match(/[А-Яа-яЁё]/g) || []).length;
  if (questionMarkCount >= 12 && cyrillicCount === 0) {
    return true;
  }
  return questionMarkCount >= 24 && questionMarkCount / Math.max(normalized.length, 1) > 0.08;
}
function readPromptFileText(promptFile) {
  const normalizedPath = (promptFile || "").trim().replace(/\\/g, "/");
  if (!normalizedPath) return null;
  const cached = promptFileTextCache.get(normalizedPath);
  if (cached !== void 0) {
    return cached;
  }
  try {
    const absolutePath = path.resolve(process.cwd(), normalizedPath);
    const relativeToRoot = path.relative(STYLE_PROMPTS_ROOT, absolutePath);
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      promptFileTextCache.set(normalizedPath, null);
      return null;
    }
    if (!fs.existsSync(absolutePath)) {
      promptFileTextCache.set(normalizedPath, null);
      return null;
    }
    const promptText = fs.readFileSync(absolutePath, "utf-8").trim();
    const resolved = promptText || null;
    promptFileTextCache.set(normalizedPath, resolved);
    return resolved;
  } catch {
    promptFileTextCache.set(normalizedPath, null);
    return null;
  }
}
function getObjectRecord(value) {
  return value && typeof value === "object" ? value : null;
}
function normalizeRequestedModel(input) {
  const record = getObjectRecord(input);
  const provider = typeof record?.provider === "string" ? record.provider : "";
  const model = typeof record?.model === "string" ? record.model : "";
  const displayName = typeof record?.displayName === "string" ? record.displayName : "";
  if (!provider || !model || !displayName) return null;
  if (provider !== "openai" && provider !== "together" && provider !== "reve") return null;
  return { provider, model, displayName };
}
function normalizePromptVariant(input) {
  const record = getObjectRecord(input);
  const id = typeof record?.id === "string" ? record.id : "";
  const label = typeof record?.label === "string" ? record.label : "";
  const prompt = typeof record?.prompt === "string" ? record.prompt : "";
  const requestedModelsRaw = Array.isArray(record?.requestedModels) ? record.requestedModels : [];
  const requestedModels = requestedModelsRaw.map((entry) => normalizeRequestedModel(entry)).filter((entry) => Boolean(entry));
  if (!id || !label || !prompt) return null;
  return {
    id,
    label,
    prompt,
    requestedModels
  };
}
function normalizePreset(input) {
  const record = getObjectRecord(input);
  const id = typeof record?.id === "string" ? record.id : "";
  const label = typeof record?.label === "string" ? record.label : "";
  const subtitle = typeof record?.subtitle === "string" ? record.subtitle : "";
  const promptHint = typeof record?.promptHint === "string" ? record.promptHint : "";
  const representativeImage = typeof record?.representativeImage === "string" ? record.representativeImage : "";
  const cover = typeof record?.cover === "string" ? record.cover : void 0;
  const coverThumb = typeof record?.coverThumb === "string" ? record.coverThumb : void 0;
  const sourcePortrait = typeof record?.sourcePortrait === "string" ? record.sourcePortrait : void 0;
  const promptFile = typeof record?.promptFile === "string" ? record.promptFile : void 0;
  const promptFileFallbackText = readPromptFileText(promptFile);
  const examples = Array.isArray(record?.examples) ? record.examples.filter((entry) => typeof entry === "string") : [];
  const examplesThumbs = Array.isArray(record?.examplesThumbs) ? record.examplesThumbs.filter((entry) => typeof entry === "string") : void 0;
  const promptVariants = Array.isArray(record?.promptVariants) ? record.promptVariants.map((entry) => normalizePromptVariant(entry)).filter((entry) => Boolean(entry)).map((entry) => {
    if (!promptFileFallbackText || !isLikelyCorruptedPrompt(entry.prompt)) {
      return entry;
    }
    return {
      ...entry,
      prompt: promptFileFallbackText
    };
  }) : [];
  const promptOnlyAfterFirstUse = record?.promptOnlyAfterFirstUse === true;
  const rawCategory = typeof record?.category === "string" ? record.category : "";
  const category = rawCategory === "men" ? "men" : rawCategory === "couple" ? "couple" : rawCategory === "women" ? "women" : void 0;
  const vibeId = typeof record?.vibeId === "string" && record.vibeId ? record.vibeId : void 0;
  if (!id || !label || !subtitle || !promptHint || !representativeImage || examples.length === 0) {
    return null;
  }
  return {
    id,
    label,
    subtitle,
    category,
    vibeId,
    promptHint,
    cover,
    coverThumb,
    representativeImage,
    sourcePortrait,
    examples,
    examplesThumbs,
    promptFile,
    promptVariants,
    promptOnlyAfterFirstUse
  };
}
function loadInstaMeStyleCatalog() {
  if (catalogCache) return catalogCache;
  if (!fs.existsSync(STYLE_CATALOG_PATH)) return null;
  try {
    const raw = fs.readFileSync(STYLE_CATALOG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const presets = Array.isArray(parsed.presets) ? parsed.presets.map((entry) => normalizePreset(entry)).filter((entry) => Boolean(entry)) : [];
    catalogCache = {
      generatedAt: parsed.generatedAt,
      presetCount: parsed.presetCount,
      presets
    };
    return catalogCache;
  } catch (error) {
    console.error("Failed to load InstaMe style catalog:", error);
    return null;
  }
}
function getInstaMeStylePresetsFromCatalog() {
  return loadInstaMeStyleCatalog()?.presets || [];
}
function findCatalogStylePresetById(id) {
  return getInstaMeStylePresetsFromCatalog().find((preset) => preset.id === id);
}
function getCatalogAssetRelativePath(styleId, filename) {
  const slug = styleId.trim();
  const safeFilename = path.basename(filename);
  if (!slug || !safeFilename) return null;
  return `assets/instame-style-presets/styles/${slug}/${safeFilename}`;
}
function getCatalogAssetAbsolutePath(styleId, filename) {
  const relativePath = getCatalogAssetRelativePath(styleId, filename);
  if (!relativePath) return null;
  const absolutePath = path.resolve(process.cwd(), relativePath);
  const stylesRoot = path.resolve(process.cwd(), "assets", "instame-style-presets", "styles");
  if (!absolutePath.startsWith(stylesRoot)) {
    return null;
  }
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return absolutePath;
}
function getCatalogRelativeAssetParts(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const marker = "assets/instame-style-presets/styles/";
  const index = normalized.indexOf(marker);
  if (index < 0) return null;
  const remainder = normalized.slice(index + marker.length);
  const [styleId, ...rest] = remainder.split("/");
  const filename = rest.join("/");
  if (!styleId || !filename) return null;
  return {
    styleId,
    filename
  };
}
function choosePromptVariant(preset, _usageCount) {
  const variants = preset?.promptVariants || [];
  if (variants.length === 0) return null;
  const preferredVariant = variants.find((variant) => variant.requestedModels.length > 0);
  return preferredVariant || variants[0] || null;
}
function chooseRequestedModel(variant, usageCount) {
  const models = variant?.requestedModels || [];
  if (models.length === 0) return null;
  if (models.length === 1) return models[0] || null;
  const index = Math.abs(usageCount) % models.length;
  return models[index] || models[0] || null;
}

// server/lib/instame-runtime-assets.ts
var import_node_buffer = require("node:buffer");
var import_node_crypto = require("node:crypto");
var runtimeAssetMap = /* @__PURE__ */ new Map();
var MAX_RUNTIME_ASSET_AGE_MS = 1e3 * 60 * 30;
function normalizeMimeType(input) {
  if (typeof input === "string" && input.startsWith("image/")) {
    return input;
  }
  return "image/png";
}
function cleanupRuntimeAssets(now = Date.now()) {
  for (const [token, record] of runtimeAssetMap.entries()) {
    if (now - record.createdAt <= MAX_RUNTIME_ASSET_AGE_MS) continue;
    runtimeAssetMap.delete(token);
  }
}
function createRuntimeAsset(options) {
  cleanupRuntimeAssets();
  const mimeType = normalizeMimeType(options.mimeType);
  const token = (0, import_node_crypto.randomUUID)();
  const buffer = import_node_buffer.Buffer.from(options.base64, "base64");
  const record = {
    token,
    mimeType,
    createdAt: Date.now(),
    buffer
  };
  runtimeAssetMap.set(token, record);
  return record;
}
function getRuntimeAsset(token) {
  cleanupRuntimeAssets();
  return runtimeAssetMap.get(token) || null;
}

// server/lib/instame-image.ts
var import_node_buffer2 = require("node:buffer");
var import_openai = __toESM(require("openai"));
var GOOGLE_TOGETHER_SUPPORTED_SIZES = [
  { width: 768, height: 1376 },
  { width: 1376, height: 768 },
  { width: 1536, height: 2752 },
  { width: 2752, height: 1536 },
  { width: 3072, height: 5504 },
  { width: 5504, height: 3072 },
  { width: 1548, height: 672 },
  { width: 1584, height: 672 },
  { width: 3168, height: 1344 },
  { width: 6336, height: 2688 }
];
function normalizeMimeType2(input) {
  if (typeof input === "string" && input.startsWith("image/")) {
    return input;
  }
  return "image/png";
}
function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI image generation.");
  }
  return new import_openai.default({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || void 0
  });
}
function resolveOpenAiImageRequest(model) {
  const normalized = model.trim().toLowerCase();
  if (!normalized) {
    return { model };
  }
  const aliases = /* @__PURE__ */ new Map([
    // gpt-image-2 family — force high input fidelity so the portrait reference
    // identity (face) is preserved in the pack composite + extracted images.
    ["gpt-image-2", { model: "gpt-image-2", inputFidelity: "high" }],
    ["gpt image 2", { model: "gpt-image-2", inputFidelity: "high" }],
    // The dated gpt-image-2 snapshot rejects the `input_fidelity` parameter
    // (returns 400), so do NOT request it for these model ids.
    ["gpt-image-2-2026-04-21", { model: "gpt-image-2-2026-04-21" }],
    ["gpt image 2 2026 04 21", { model: "gpt-image-2-2026-04-21" }],
    ["gpt-image-1.5", { model: "gpt-image-1.5" }],
    ["gpt image 1.5", { model: "gpt-image-1.5" }],
    ["gpt-image-1", { model: "gpt-image-1" }],
    ["gpt image 1", { model: "gpt-image-1" }],
    ["gpt-image-1-mini", { model: "gpt-image-1-mini" }],
    ["gpt image 1 mini", { model: "gpt-image-1-mini" }],
    ["chatgpt-image-latest", { model: "chatgpt-image-latest" }],
    ["chatgpt image latest", { model: "chatgpt-image-latest" }],
    ["chatgpt-image-latest-high-fidelity", { model: "chatgpt-image-latest", inputFidelity: "high" }],
    ["chatgpt image latest high fidelity", { model: "chatgpt-image-latest", inputFidelity: "high" }],
    ["chatgpt-image-latest-high-fidelity (20251216)", { model: "chatgpt-image-latest", inputFidelity: "high" }],
    ["gpt-image-1.5-high-fidelity", { model: "gpt-image-1.5", inputFidelity: "high" }],
    ["gpt image 1.5 high fidelity", { model: "gpt-image-1.5", inputFidelity: "high" }],
    ["gpt-image-1-high-fidelity", { model: "gpt-image-1", inputFidelity: "high" }],
    ["gpt image 1 high fidelity", { model: "gpt-image-1", inputFidelity: "high" }],
    ["gpt-image-1-mini-high-fidelity", { model: "gpt-image-1-mini", inputFidelity: "high" }],
    ["gpt image 1 mini high fidelity", { model: "gpt-image-1-mini", inputFidelity: "high" }]
  ]);
  return aliases.get(normalized) || { model };
}
function getTogetherApiKey() {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    throw new Error("TOGETHER_API_KEY is required for Together image generation.");
  }
  return apiKey;
}
function getReveApiKey() {
  const apiKey = process.env.REVE_API_KEY;
  if (!apiKey) {
    throw new Error("REVE_API_KEY is required for Reve image generation.");
  }
  return apiKey;
}
function getReveBaseUrl() {
  return process.env.REVE_API_BASE_URL || "https://api.reve.com";
}
function resolveTogetherModelAlias(model) {
  const normalized = model.trim().toLowerCase();
  if (!normalized) return model;
  if (normalized === "gemini-3.1-flash-image-preview" || normalized === "gemini 3.1 flash image preview" || normalized === "gemini-2.5-flash-image" || normalized === "google/flash-image-2.5" || normalized === "google/flash-image-3.1") {
    return normalized === "google/flash-image-2.5" ? "google/flash-image-2.5" : "google/flash-image-3.1";
  }
  if (normalized === "gemini-3-pro-image" || normalized === "gemini 3 pro image" || normalized === "google/gemini-3-pro-image") {
    return "google/gemini-3-pro-image";
  }
  return model;
}
function isGoogleTogetherModel(model) {
  return model.trim().toLowerCase().startsWith("google/");
}
function getImageOrientation(width, height) {
  if (width === height) return "square";
  return height > width ? "portrait" : "landscape";
}
function resolveGoogleTogetherSize(options) {
  const requestedWidth = Math.max(1, Math.round(options.width));
  const requestedHeight = Math.max(1, Math.round(options.height));
  const sourceWidth = Number.isFinite(options.sourceWidth) ? Math.round(options.sourceWidth) : 0;
  const sourceHeight = Number.isFinite(options.sourceHeight) ? Math.round(options.sourceHeight) : 0;
  const preferredOrientation = sourceWidth > 0 && sourceHeight > 0 ? getImageOrientation(sourceWidth, sourceHeight) : getImageOrientation(requestedWidth, requestedHeight);
  const normalizedOrientation = preferredOrientation === "square" ? "portrait" : preferredOrientation;
  const requestedRatio = requestedWidth / requestedHeight;
  const requestedArea = requestedWidth * requestedHeight;
  const candidates = GOOGLE_TOGETHER_SUPPORTED_SIZES.filter((size) => {
    const orientation = getImageOrientation(size.width, size.height);
    return normalizedOrientation === "portrait" ? orientation === "portrait" : orientation === "landscape";
  });
  const pool2 = candidates.length > 0 ? candidates : GOOGLE_TOGETHER_SUPPORTED_SIZES;
  const ranked = pool2.map((size) => {
    const ratio = size.width / size.height;
    return {
      size,
      score: Math.abs(Math.log(ratio / requestedRatio)) + Math.abs(Math.log(size.width * size.height / requestedArea))
    };
  }).sort((left, right) => left.score - right.score);
  return ranked[0]?.size || GOOGLE_TOGETHER_SUPPORTED_SIZES[0];
}
function normalizeReveModelEnvKey(model) {
  return model.trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}
function readFirstEnv(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
function resolveReveVersion(options) {
  const alias = normalizeReveModelEnvKey(options.model);
  const qualityKey = options.mode === "high_res" ? "HIGH_RES" : "PREVIEW";
  const operationKey = options.operation.toUpperCase();
  const defaultVersion = options.operation === "edit" ? "latest" : "latest";
  return readFirstEnv([
    `REVE_${operationKey}_VERSION_${alias}_${qualityKey}`,
    `REVE_${operationKey}_VERSION_${alias}`,
    `REVE_${operationKey}_VERSION_${qualityKey}`,
    `REVE_${operationKey}_VERSION`,
    `REVE_VERSION_${alias}_${qualityKey}`,
    `REVE_VERSION_${alias}`,
    "REVE_VERSION"
  ]) || defaultVersion;
}
function sanitizeBase64Image(input) {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "").trim();
}
function extractReveImageBase64(payload) {
  const directCandidates = [
    payload?.image,
    payload?.b64_json,
    payload?.data?.image,
    payload?.data?.b64_json
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return sanitizeBase64Image(candidate);
    }
  }
  const arrayCandidates = [
    Array.isArray(payload?.data) ? payload.data : [],
    Array.isArray(payload?.images) ? payload.images : []
  ];
  for (const items of arrayCandidates) {
    for (const item of items) {
      if (typeof item?.image === "string" && item.image.trim()) {
        return sanitizeBase64Image(item.image);
      }
      if (typeof item?.b64_json === "string" && item.b64_json.trim()) {
        return sanitizeBase64Image(item.b64_json);
      }
    }
  }
  return null;
}
async function toOpenAiUpload(input, fallbackName) {
  const mimeType = normalizeMimeType2(input.mimeType);
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const filename = input.filename || `${fallbackName}.${extension}`;
  return (0, import_openai.toFile)(import_node_buffer2.Buffer.from(input.base64, "base64"), filename, { type: mimeType });
}
async function generateOpenAiImage(options) {
  const client = getOpenAiClient();
  const resolvedRequest = resolveOpenAiImageRequest(options.model);
  const size = options.size || "1024x1024";
  const quality = options.quality || "auto";
  const inputImages = Array.isArray(options.images) ? options.images : [];
  if (inputImages.length > 0) {
    const files = await Promise.all(
      inputImages.map((image, index) => toOpenAiUpload(image, `instame-edit-${index + 1}`))
    );
    const response2 = await client.images.edit({
      model: resolvedRequest.model,
      prompt: options.prompt,
      image: files,
      size,
      quality,
      // Only send input_fidelity when the resolved model actually supports it;
      // some models (e.g. gpt-image-2-2026-04-21) reject the parameter with a 400.
      ...resolvedRequest.inputFidelity ? { input_fidelity: resolvedRequest.inputFidelity } : {}
    });
    const base642 = response2.data?.[0]?.b64_json;
    if (!base642) {
      throw new Error("OpenAI image edit returned no image data.");
    }
    return base642;
  }
  const response = await client.images.generate({
    model: resolvedRequest.model,
    prompt: options.prompt,
    size,
    quality
  });
  const base64 = response.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error("OpenAI image generation returned no image data.");
  }
  return base64;
}
async function generateTogetherImage(options) {
  const apiKey = getTogetherApiKey();
  const baseUrl = process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1";
  const resolvedModel = resolveTogetherModelAlias(options.model);
  const resolvedSize = isGoogleTogetherModel(resolvedModel) ? resolveGoogleTogetherSize({
    width: options.width,
    height: options.height,
    sourceWidth: options.sourceWidth,
    sourceHeight: options.sourceHeight
  }) : { width: options.width, height: options.height };
  const payload = {
    model: resolvedModel,
    prompt: options.prompt,
    width: resolvedSize.width,
    height: resolvedSize.height,
    response_format: "b64_json",
    output_format: "png"
  };
  if (!resolvedModel.toLowerCase().startsWith("google/")) {
    payload.n = 1;
  }
  if (Array.isArray(options.referenceImages) && options.referenceImages.length > 0) {
    payload.reference_images = options.referenceImages;
  }
  if (typeof options.imageUrl === "string" && options.imageUrl.trim()) {
    payload.image_url = options.imageUrl.trim();
  }
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  const responseText = await response.text();
  let parsed = null;
  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const parsedError = parsed && typeof parsed.error === "object" && parsed.error !== null ? parsed.error : null;
    const remoteMessage = typeof parsedError?.message === "string" ? parsedError.message : typeof parsed?.message === "string" ? parsed.message : "";
    const message = remoteMessage || responseText || `Together API returned status ${response.status}`;
    const payloadKeys = Object.keys(payload).sort().join(", ");
    throw new Error(
      `Together API error (${response.status}) for model ${resolvedModel} with payload keys [${payloadKeys}]: ${message}`
    );
  }
  const data = Array.isArray(parsed?.data) ? parsed.data : [];
  const base64 = data[0]?.b64_json;
  if (!base64) {
    throw new Error(`Together image generation returned no image data for model ${resolvedModel}.`);
  }
  return base64;
}
async function generateReveImage(options) {
  const apiKey = getReveApiKey();
  const baseUrl = getReveBaseUrl();
  const mode = options.mode || "preview";
  const isEdit = Boolean(options.referenceImage);
  const endpoint = isEdit ? "/v1/image/edit" : "/v1/image/create";
  const version = resolveReveVersion({
    model: options.model,
    operation: isEdit ? "edit" : "create",
    mode
  });
  const payload = {
    version
  };
  if (!isEdit && options.aspectRatio && options.aspectRatio !== "auto") {
    payload.aspect_ratio = options.aspectRatio;
  }
  if (typeof options.testTimeScaling === "number" && Number.isFinite(options.testTimeScaling) && options.testTimeScaling >= 1 && options.testTimeScaling <= 15) {
    payload.test_time_scaling = Math.round(options.testTimeScaling);
  }
  if (Array.isArray(options.postprocessing) && options.postprocessing.length > 0) {
    payload.postprocessing = options.postprocessing;
  }
  if (isEdit) {
    payload.edit_instruction = options.prompt;
    payload.reference_image = sanitizeBase64Image(options.referenceImage.base64);
  } else {
    payload.prompt = options.prompt;
  }
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  const responseText = await response.text();
  let parsed = null;
  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const remoteMessage = parsed?.message || parsed?.error || parsed?.error_code || responseText || `Reve API returned status ${response.status}`;
    const payloadKeys = Object.keys(payload).sort().join(", ");
    throw new Error(
      `Reve API error (${response.status}) on ${endpoint} [version=${version}, payload keys: ${payloadKeys}]: ${remoteMessage}`
    );
  }
  const base64 = extractReveImageBase64(parsed);
  if (!base64) {
    throw new Error("Reve image generation returned no image data.");
  }
  return base64;
}

// server/lib/railway-bucket.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var bucketConfigCache;
var bucketClientCache;
function normalizeEnvValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
function parseBooleanEnv(value, fallback) {
  const normalized = normalizeEnvValue(value).toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
function loadBucketConfig() {
  if (bucketConfigCache !== void 0) {
    return bucketConfigCache;
  }
  const bucketName = normalizeEnvValue(process.env.INSTAME_STYLE_ASSETS_BUCKET_NAME || process.env.BUCKET);
  const endpoint = normalizeEnvValue(process.env.INSTAME_STYLE_ASSETS_BUCKET_ENDPOINT || process.env.ENDPOINT);
  const region = normalizeEnvValue(process.env.INSTAME_STYLE_ASSETS_BUCKET_REGION || process.env.REGION || "auto");
  const accessKeyId = normalizeEnvValue(
    process.env.INSTAME_STYLE_ASSETS_BUCKET_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID
  );
  const secretAccessKey = normalizeEnvValue(
    process.env.INSTAME_STYLE_ASSETS_BUCKET_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY
  );
  if (!bucketName || !endpoint || !accessKeyId || !secretAccessKey) {
    bucketConfigCache = null;
    return bucketConfigCache;
  }
  bucketConfigCache = {
    bucketName,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: parseBooleanEnv(process.env.INSTAME_STYLE_ASSETS_BUCKET_FORCE_PATH_STYLE, false)
  };
  return bucketConfigCache;
}
function getBucketClient() {
  if (bucketClientCache !== void 0) {
    return bucketClientCache;
  }
  const config = loadBucketConfig();
  if (!config) {
    bucketClientCache = null;
    return bucketClientCache;
  }
  bucketClientCache = new import_client_s3.S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
  return bucketClientCache;
}
function getBucketName() {
  return loadBucketConfig()?.bucketName || null;
}
function toBucketKey(relativePath) {
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
}
function toMissingObject(error) {
  if (!error || typeof error !== "object") return false;
  const statusCode = typeof error.$metadata?.httpStatusCode === "number" ? Number(error.$metadata?.httpStatusCode) : null;
  const name = typeof error.name === "string" ? error.name : "";
  return statusCode === 404 || name === "NoSuchKey" || name === "NotFound";
}
async function getStyleAssetObject(relativePath) {
  const client = getBucketClient();
  const bucketName = getBucketName();
  if (!client || !bucketName) {
    return null;
  }
  try {
    const response = await client.send(
      new import_client_s3.GetObjectCommand({
        Bucket: bucketName,
        Key: toBucketKey(relativePath)
      })
    );
    const body = response.Body;
    if (!body || typeof body.transformToByteArray !== "function") {
      return null;
    }
    const bytes = await body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: typeof response.ContentType === "string" && response.ContentType.trim() ? response.ContentType : "application/octet-stream",
      cacheControl: typeof response.CacheControl === "string" ? response.CacheControl : void 0
    };
  } catch (error) {
    if (toMissingObject(error)) {
      return null;
    }
    throw error;
  }
}
function isObjectBucketConfigured() {
  return Boolean(getBucketClient() && getBucketName());
}
async function uploadObject(options) {
  const client = getBucketClient();
  const bucketName = getBucketName();
  if (!client || !bucketName) {
    throw new Error("Object bucket is not configured.");
  }
  await client.send(
    new import_client_s3.PutObjectCommand({
      Bucket: bucketName,
      Key: toBucketKey(options.key),
      Body: options.body,
      ContentType: options.contentType,
      CacheControl: options.cacheControl
    })
  );
}
async function getObject(key) {
  const client = getBucketClient();
  const bucketName = getBucketName();
  if (!client || !bucketName) {
    return null;
  }
  try {
    const response = await client.send(
      new import_client_s3.GetObjectCommand({
        Bucket: bucketName,
        Key: toBucketKey(key)
      })
    );
    const body = response.Body;
    if (!body || typeof body.transformToByteArray !== "function") {
      return null;
    }
    const bytes = await body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: typeof response.ContentType === "string" && response.ContentType.trim() ? response.ContentType : "application/octet-stream",
      cacheControl: typeof response.CacheControl === "string" ? response.CacheControl : void 0
    };
  } catch (error) {
    if (toMissingObject(error)) {
      return null;
    }
    throw error;
  }
}
async function deleteObject(key) {
  const client = getBucketClient();
  const bucketName = getBucketName();
  if (!client || !bucketName) {
    return;
  }
  try {
    await client.send(
      new import_client_s3.DeleteObjectCommand({
        Bucket: bucketName,
        Key: toBucketKey(key)
      })
    );
  } catch (error) {
    if (toMissingObject(error)) {
      return;
    }
    throw error;
  }
}

// server/lib/instame-grid-pack.ts
var VIBE_PROMPT_HINTS = {
  signature_editorial: "polished editorial photography, studio-quality light, magazine energy, clean skin, cinematic composition, fashion-forward",
  flash_night: "night flash photography, Y2K grain, after-dark paparazzi energy, high contrast, dark backgrounds",
  old_money_luxe: "quiet luxury, muted beige/grey/black palette, European elegance, cinematic editorial, subtle film grain, premium but natural, rich-girl aesthetic",
  clean_glow: "soft natural light, bright skin tone, airy and clean palette, effortless everyday beauty, fresh glow",
  cafe_lifestyle: "caf\xE9 terrace, warm morning light, latte art, effortless Parisian lifestyle, candid warmth, relaxed aesthetic",
  street_luxe: "urban movement, confident street presence, dynamic composition, denim and leather styling, city backdrop",
  mirror_selfies: "creator mirror frame, fitting room or hotel bathroom, outfit reveal energy, casual luxury, iphone aesthetic",
  travel_escape: "sun-drenched travel content, architectural backgrounds, Mediterranean or European city, golden hour light",
  car_luxe: "luxury car interior or exterior, dashboard glow, cinematic automotive perspective, premium lifestyle",
  soft_romantic: "blush tones, floral details, soft gestures, romantic editorial, warm haze, feminine elegance",
  cozy_home: "intimate interior frames, soft bedroom or sofa setting, polished homebody aesthetic, warm tones",
  event_glam: "party shine, glam evening look, jewelry and dress detail, polished event photography, sparkle",
  life_moments: "warm personal frames, emotional and natural, memory-like quality, candid warmth, storytelling",
  couple_shoots: "synchronized couple energy, shared chemistry, cinematic two-person composition, matching aesthetic",
  men_editorial: "moody urban street portraits, confident masculine framing, editorial menswear, architectural backdrops"
};
var REQUIRED_ELEMENT_LABELS = {
  outfit: "signature outfit clearly visible",
  location: "recognizable location in frame",
  car: "luxury car or ride visible",
  accessories: "jewelry or accessory close-up",
  mirror: "mirror selfie framing",
  detail: "stylish detail crop \u2014 fabric, jewelry, or shoes"
};
var PACK_SHOT_RECIPES = {
  signature_four: [
    {
      shotType: "cover_portrait",
      shotLabel: "Cover Portrait",
      shotDescription: "tight editorial portrait, direct gaze, strong directional light, magazine-front energy"
    },
    {
      shotType: "half_body",
      shotLabel: "Half-Body Editorial",
      shotDescription: "half-body fashion frame, full outfit prominent, confident posture"
    },
    {
      shotType: "seated_lifestyle",
      shotLabel: "Seated Lifestyle",
      shotDescription: "candid seated moment, natural relaxed expression, environment visible behind"
    },
    {
      shotType: "detail_crop",
      shotLabel: "Detail Crop",
      shotDescription: "extreme close-up detail \u2014 jewelry, bag strap, shoes or fabric texture"
    }
  ],
  story_drop_six: [
    {
      shotType: "mirror_flash",
      shotLabel: "Mirror Flash",
      shotDescription: "hotel or home mirror selfie with flash, full outfit reveal, flash reflection visible"
    },
    {
      shotType: "face_closeup",
      shotLabel: "Face Close-Up",
      shotDescription: "editorial face close-up, sharp eyes, dramatic or soft directional light"
    },
    {
      shotType: "walking_shot",
      shotLabel: "Walking Shot",
      shotDescription: "mid-movement walking frame, confident stride, urban or venue backdrop"
    },
    {
      shotType: "blurry_flash",
      shotLabel: "Blurry Flash Moment",
      shotDescription: "intentionally blurry flash candid, night-out or party energy, motion blur"
    },
    {
      shotType: "grainy_portrait",
      shotLabel: "Grainy Portrait",
      shotDescription: "high-grain analog-style portrait, intimate scale, warm or desaturated tone"
    },
    {
      shotType: "hero_final",
      shotLabel: "Hero Final",
      shotDescription: "signature composed hero shot, full look visible, best editorial energy of the set"
    }
  ],
  clean_grid_four: [
    {
      shotType: "beauty_closeup",
      shotLabel: "Beauty Close-Up",
      shotDescription: "face and neck beauty shot, clean skin, natural makeup, soft front light, no shadows"
    },
    {
      shotType: "daylight_selfie",
      shotLabel: "Daylight Selfie",
      shotDescription: "bright natural-light selfie, relaxed authentic expression, outdoor or window light"
    },
    {
      shotType: "calm_seated",
      shotLabel: "Calm Seated",
      shotDescription: "peaceful seated frame in a bright minimal space \u2014 caf\xE9, desk or living room"
    },
    {
      shotType: "soft_portrait",
      shotLabel: "Soft Portrait",
      shotDescription: "full or half-body portrait in soft diffused light, neutral background, clean and minimal"
    }
  ],
  luxe_weekend_six: [
    {
      shotType: "hotel_entrance",
      shotLabel: "Hotel Entrance",
      shotDescription: "luxury hotel lobby or entrance, marble architecture, polished arrival moment"
    },
    {
      shotType: "city_walk",
      shotLabel: "City Walk",
      shotDescription: "elegant European city walk, polished outfit, cobblestone or wide boulevard backdrop"
    },
    {
      shotType: "jewelry_closeup",
      shotLabel: "Jewelry Close-Up",
      shotDescription: "hand or neck close-up focusing on gold jewelry \u2014 watch, ring, or necklace"
    },
    {
      shotType: "terrace_moment",
      shotLabel: "Terrace Moment",
      shotDescription: "luxury terrace or hotel balcony, city or sea view, relaxed elegant posture"
    },
    {
      shotType: "car_frame",
      shotLabel: "Car Frame",
      shotDescription: "luxury car door, window or interior \u2014 Mercedes G-Class, 911 or equivalent"
    },
    {
      shotType: "refined_portrait",
      shotLabel: "Refined Portrait",
      shotDescription: "polished editorial portrait in a quiet luxury setting \u2014 understated power and elegance"
    }
  ],
  city_muse_six: [
    {
      shotType: "crosswalk",
      shotLabel: "Crosswalk",
      shotDescription: "dynamic crosswalk shot, mid-movement, urban energy, confident stride"
    },
    {
      shotType: "wall_portrait",
      shotLabel: "Wall Portrait",
      shotDescription: "posed against textured urban wall, direct gaze, architectural geometric framing"
    },
    {
      shotType: "steps_sit",
      shotLabel: "Steps Sit",
      shotDescription: "sitting or leaning on outdoor steps, layered city depth in background"
    },
    {
      shotType: "street_walk",
      shotLabel: "Street Walk",
      shotDescription: "candid street walk, mid-movement, natural expression, full look visible"
    },
    {
      shotType: "outfit_detail",
      shotLabel: "Outfit Detail",
      shotDescription: "close-up of outfit detail \u2014 jacket collar, belt, boots or bag handle"
    },
    {
      shotType: "hero_confident",
      shotLabel: "Hero Confident",
      shotDescription: "strong full or half-body hero shot, urban backdrop, full look composed confidently"
    }
  ],
  couple_drop_four: [
    {
      shotType: "close_pose",
      shotLabel: "Close Pose",
      shotDescription: "intimate close pose, faces near each other, genuine connection and chemistry"
    },
    {
      shotType: "walking_couple",
      shotLabel: "Walking Frame",
      shotDescription: "walking side by side, hands held or shoulders touching, light and dynamic movement"
    },
    {
      shotType: "candid_laugh",
      shotLabel: "Candid Laugh",
      shotDescription: "genuine candid laughter moment, real emotion, warm and natural light"
    },
    {
      shotType: "cinematic_final",
      shotLabel: "Cinematic Final",
      shotDescription: "wide cinematic two-shot, environment prominent, couple as subjects in the scene"
    }
  ],
  luxe_grid_nine: [
    {
      shotType: "editorial_portrait",
      shotLabel: "Editorial Portrait",
      shotDescription: "cover-quality editorial portrait, strong direct gaze, polished directional light"
    },
    {
      shotType: "mirror_selfie",
      shotLabel: "Mirror Selfie",
      shotDescription: "hotel or home mirror selfie, full outfit visible, clean reflection"
    },
    {
      shotType: "cafe_candid",
      shotLabel: "Caf\xE9 Candid",
      shotDescription: "candid caf\xE9 moment, coffee cup in hand, warm ambient interior light"
    },
    {
      shotType: "jewelry_detail",
      shotLabel: "Jewelry Detail",
      shotDescription: "hand or neck close-up on gold jewelry \u2014 ring, necklace or earring"
    },
    {
      shotType: "street_walk",
      shotLabel: "Street Walk",
      shotDescription: "confident street walking shot, full outfit look, European or urban street backdrop"
    },
    {
      shotType: "hotel_interior",
      shotLabel: "Hotel Interior",
      shotDescription: "luxury hotel interior frame \u2014 lobby corridor, suite bed or ornate staircase"
    },
    {
      shotType: "over_shoulder",
      shotLabel: "Over-Shoulder",
      shotDescription: "over-the-shoulder walking shot, partial face visible, elegant composition"
    },
    {
      shotType: "blurry_flash",
      shotLabel: "Flash Moment",
      shotDescription: "intentionally blurry flash candid, party or night energy, motion blur"
    },
    {
      shotType: "hero_wide",
      shotLabel: "Hero Wide",
      shotDescription: "wide editorial hero shot, full environment visible, signature composed pose"
    }
  ]
};
var FALLBACK_SHOT_RECIPE = PACK_SHOT_RECIPES["signature_four"];
function resolvePackShotRecipe(packId) {
  return PACK_SHOT_RECIPES[packId] ?? FALLBACK_SHOT_RECIPE;
}
function getVibePromptHint(vibeId) {
  return VIBE_PROMPT_HINTS[vibeId] ?? vibeId.replace(/_/g, " ");
}
function assignElementsToShots(shotCount, requiredElementIds) {
  const assignments = Array(shotCount).fill(null);
  let elementIndex = 0;
  for (let shotIndex = 0; shotIndex < shotCount && elementIndex < requiredElementIds.length; shotIndex++) {
    assignments[shotIndex] = requiredElementIds[elementIndex];
    elementIndex++;
  }
  return assignments;
}
function buildGridPackShotPlan(brief) {
  const recipe = resolvePackShotRecipe(brief.packId);
  const elementAssignments = assignElementsToShots(recipe.length, brief.requiredElementIds);
  return recipe.map((template, index) => ({
    ...template,
    index,
    assignedElement: elementAssignments[index]
  }));
}
function buildGridPreviewPrompt(brief) {
  const vibeHint = getVibePromptHint(brief.vibeId);
  const shots = buildGridPackShotPlan(brief);
  const count = shots.length;
  const cols = count <= 4 ? 2 : 3;
  const rows = count <= 4 ? 2 : count <= 6 ? 2 : 3;
  const elementLabels = brief.requiredElementIds.map((id) => REQUIRED_ELEMENT_LABELS[id]);
  const elementsNote = elementLabels.length > 0 ? `Required visual elements distributed across the grid: ${elementLabels.join("; ")}.` : "";
  const shotDescriptions = shots.map((s) => `[${s.index + 1}] ${s.shotLabel}: ${s.shotDescription}`).join(" | ");
  const identityNote = brief.identityMode === "portrait_reference" ? "The same woman appears in every photo with identical facial features, hair color, and general styling throughout the grid." : brief.identityMode === "inspired_muse" ? "A consistent editorial woman muse appears throughout the grid, her style inspired by the brief." : "A fictional editorial muse appears consistently across all photos in the grid.";
  const notesNote = brief.notes.trim() ? `Additional creative direction: ${brief.notes.trim()}.` : "";
  return [
    `Generate a photorealistic Instagram profile page screenshot showing a ${cols}\xD7${rows} photo grid.`,
    `All ${count} photos share one cohesive aesthetic: ${vibeHint}.`,
    `Shot composition across the grid: ${shotDescriptions}.`,
    elementsNote,
    identityNote,
    notesNote,
    `The result looks like a real iPhone Instagram feed screenshot. Photos are naturally shot and edited with a consistent color palette. All ${count} photo tiles are tiled in a ${cols}-column grid filling the entire image \u2014 no UI chrome, no text, just the photo grid. Premium, authentic, ready-to-post quality.`
  ].filter(Boolean).join(" ");
}
function buildGridShotRenderPrompt(options) {
  const { shot, brief, totalShots, hasPortraitReference } = options;
  const vibeHint = getVibePromptHint(brief.vibeId);
  const elementNote = shot.assignedElement ? ` This specific photo must clearly show: ${REQUIRED_ELEMENT_LABELS[shot.assignedElement]}.` : "";
  const identityInstruction = hasPortraitReference ? " Preserve the exact facial features, hair color, and hair style from the provided reference portrait." : brief.identityMode === "inspired_muse" ? " The subject is a consistent editorial woman whose look is inspired by the brief direction." : " The subject is a stylish editorial woman whose appearance is consistent with the pack aesthetic.";
  const notesNote = brief.notes.trim() && shot.index === 0 ? ` Additional creative direction: ${brief.notes.trim()}.` : "";
  return [
    `Instagram portrait photo. Shot ${shot.index + 1} of ${totalShots} in a ${brief.vibeLabel} pack.`,
    `Shot type: ${shot.shotLabel}. ${shot.shotDescription}.`,
    `Visual aesthetic: ${vibeHint}.`,
    elementNote,
    identityInstruction,
    notesNote,
    "Tall vertical Instagram portrait format, as close to a 9:16 ratio as possible, filling the entire frame edge-to-edge with NO letterboxing, bars, or borders. Photorealistic, natural iPhone or editorial photography. No AI artifacts. Premium but authentic feed image. Ready to post on Instagram."
  ].filter(Boolean).join(" ");
}
var GRID_PREVIEW_CREDIT_COST = INSTAME_GRID_PIPELINE_COMPOSITE_CREDIT_COST;
var GRID_RENDER_CREDIT_COST_PER_IMAGE = INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST;

// server/lib/instame-grid-pipeline.ts
var PIPELINE_AESTHETIC_VOCABULARY = {
  "Dark Academia": [
    "antique library shelves",
    "vintage leather armchairs",
    "candle glow",
    "dark wood paneling",
    "scholarly architecture",
    "moody editorial",
    "aged paper texture",
    "burgundy velvet"
  ],
  "Desert Oasis Luxury": [
    "desert resort",
    "clay and adobe walls",
    "palm tree shadows",
    "rattan and wicker",
    "infinity pool",
    "warm arid luxury",
    "sand dune backdrop",
    "Moroccan tilework"
  ],
  "Luxury European Lifestyle": [
    "Parisian boulevard",
    "Italian piazza",
    "luxury boutique fa\xE7ade",
    "caf\xE9 terrasse",
    "cobblestone street",
    "European architecture",
    "fashion week energy",
    "ornate balcony"
  ],
  "Minimalist Scandinavian Wellness": [
    "clean white minimalist interior",
    "natural birch wood",
    "hygge atmosphere",
    "wellness retreat",
    "organic linen textures",
    "Nordic simplicity",
    "stone and concrete",
    "indoor plants"
  ],
  "Old Money Luxury": [
    "quiet luxury",
    "heritage architectural details",
    "tailored silhouettes",
    "classic European manor",
    "equestrian references",
    "understated wealth",
    "cashmere and silk",
    "private members club"
  ],
  "Amalfi Coast Vibe": [
    "Amalfi cliffside terraces",
    "lemon groves and citrus detail",
    "azure Mediterranean water",
    "whitewashed walls with bougainvillea",
    "ceramic tile patterns",
    "boat deck on turquoise bay",
    "Italian coastal village alleys",
    "sun-soaked summer editorial"
  ],
  "French Riviera Vintage Summer": [
    "Saint-Tropez harbor",
    "vintage yacht deck",
    "retro straw hat and sunglasses",
    "marini\xE8re stripe detail",
    "golden sandy beach",
    "pastel parasol shade",
    "French Riviera promenade",
    "60s summer film grain"
  ],
  "Private Jet & Executive": [
    "private jet interior leather seat",
    "aircraft window golden hour",
    "runway tarmac boarding",
    "executive tailored power dressing",
    "luxury aviation lounge",
    "monogram luggage detail",
    "sleek jet staircase",
    "city skyline from altitude"
  ]
};
function getAestheticVocabularyLine(aesthetic) {
  const vocab = PIPELINE_AESTHETIC_VOCABULARY[aesthetic];
  if (!vocab || vocab.length === 0) return "";
  return `Aesthetic visual vocabulary (use these in imagePrompt fields): ${vocab.join(", ")}.`;
}
var HAIRSTYLE_BANK = [
  "sleek low bun",
  "high bouncy ponytail",
  "loose beach waves",
  "silk scarf wrap",
  "straight blowout",
  "messy textured updo",
  "half-up half-down",
  "braided crown",
  "slicked-back wet look",
  "voluminous old-money blowout"
];
var ANGLE_BANK = ["front-facing", "side profile", "from behind", "over-the-shoulder", "overhead tilt", "three-quarter turn"];
var OBJECT_SUBJECT_CATEGORIES = [
  "a signature fashion accessory (handbag, watch, sunglasses, or fine jewelry)",
  "a food or drink moment (coffee, cocktail, pastry, or fresh fruit)",
  "an architectural detail (doorway, column, staircase, window, or railing)",
  "an interior surface texture (marble, linen, wood grain, ceramic, or velvet)",
  "an outdoor / nature element (foliage, water, stone, sand, or flowers)",
  "a wardrobe flat-lay (folded garments, shoes, or layered fabrics)",
  "a lifestyle still-life (books, stationery, perfume, candle, or keys)"
];
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffleWith(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function buildMasterGridSystemPrompt(inputs) {
  const { imageCount, aesthetic, palette, lightType, extraNotes, hasPortraitReference, seed } = inputs;
  const positionMap = buildPositionMap(imageCount, seed);
  const positionInstructions = positionMap.map(
    ({ position, type }) => `  - Position ${position}: ${type} \u2014 ${POSITION_TYPE_RULES[type]}`
  ).join("\n");
  const hairstyleList = HAIRSTYLE_BANK.join(", ");
  const angleList = ANGLE_BANK.join(", ");
  const rng = mulberry32((seed ?? 0) >>> 0 || 1);
  const fullVocab = PIPELINE_AESTHETIC_VOCABULARY[aesthetic] ?? [];
  const shuffledVocab = seed !== void 0 ? shuffleWith(fullVocab, rng) : fullVocab;
  const shuffledHair = seed !== void 0 ? shuffleWith(HAIRSTYLE_BANK, rng) : HAIRSTYLE_BANK;
  const shuffledAngles = seed !== void 0 ? shuffleWith(ANGLE_BANK, rng) : ANGLE_BANK;
  const shuffledCategories = seed !== void 0 ? shuffleWith(OBJECT_SUBJECT_CATEGORIES, rng) : OBJECT_SUBJECT_CATEGORIES;
  const vocabSubset = fullVocab.length > 0 ? shuffledVocab.slice(
    0,
    Math.min(shuffledVocab.length, Math.max(4, Math.ceil(shuffledVocab.length * 0.6)))
  ) : [];
  const vocabularyLine = vocabSubset.length > 0 ? `Aesthetic visual vocabulary (use these in imagePrompt fields, favor variety): ${vocabSubset.join(", ")}.` : getAestheticVocabularyLine(aesthetic);
  let modelIdx = 0;
  let objectIdx = 0;
  const assignmentLines = positionMap.map(({ position, type }) => {
    if (type === "SIMPLE") {
      const category = shuffledCategories.length > 0 ? shuffledCategories[objectIdx % shuffledCategories.length] : "a distinct hero object";
      objectIdx++;
      return `  - Position ${position} (OBJECT, no model): hero subject category = ${category}. Must be a DISTINCT object from every other cell.`;
    }
    const hairstyle = shuffledHair[modelIdx % shuffledHair.length];
    const angle = shuffledAngles[modelIdx % shuffledAngles.length];
    const sceneAnchor = shuffledVocab.length > 0 ? shuffledVocab[modelIdx % shuffledVocab.length] : "";
    modelIdx++;
    const sceneTxt = sceneAnchor ? ` Scene anchor: ${sceneAnchor}.` : "";
    return `  - Position ${position} (${type}, model present): hairstyle = ${hairstyle}; camera angle = ${angle}.${sceneTxt}`;
  }).join("\n");
  const variationDirective = seed !== void 0 ? `
Variation seed: ${seed}. Use it to make bold, non-obvious creative choices and avoid the single most clich\xE9d interpretation of this aesthetic. Follow the PER-POSITION ASSIGNMENTS section below EXACTLY.` : "";
  const assignmentSection = seed !== void 0 ? `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
PER-POSITION ASSIGNMENTS (MANDATORY \u2014 use EXACTLY)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Use exactly the hairstyle, camera angle, scene anchor and object category assigned to each position below. Do NOT swap them between positions and do NOT reuse one across two positions.
${assignmentLines}
` : "";
  const portraitInstruction = hasPortraitReference ? "A portrait reference image of the model WILL be passed to GPT Image 2 alongside each prompt. Each imagePrompt MUST include the instruction: 'Preserve the model's face and identity exactly from the provided reference image.' IDENTITY IS LOCKED, EVERYTHING ELSE VARIES: keep the SAME face/identity across all shots, but every position with the model must show a DISTINCT outfit, pose, and expression. Never reuse the same wardrobe piece, pose, or facial expression twice, and never repeat the same look from a different angle." : "No portrait reference is available. Each imagePrompt should describe the model generically in a way that is consistent across all shots (same apparent age, skin tone, body type), while still giving every shot a distinct outfit, pose, and expression.";
  return `You are an expert Instagram content strategist and AI photo director.
Your ONLY task is to generate a structured JSON shot plan for a ${imageCount}-image Instagram grid.
You must output VALID JSON and NOTHING else \u2014 no markdown, no explanation, no code fences.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
GRID PARAMETERS
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Aesthetic: ${aesthetic}
Color palette: ${palette}
Light type: ${lightType}
Image count: ${imageCount}
${vocabularyLine ? vocabularyLine + "\n" : ""}Extra notes from user: ${extraNotes || "none"}${variationDirective}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
COLOR PALETTE (DOMINANT \u2014 overrides scene-natural colors)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
The color palette "${palette}" is the SINGLE SOURCE OF TRUTH for color in every shot.
- It OVERRIDES the colors normally associated with the aesthetic, the scenes, the wardrobe, and the props. If the aesthetic or a scene would normally be warm/beige/terracotta but the palette is cool/dark, the final colors MUST follow the palette, NOT the scene's expected colors.
- Weave the exact palette colors into EVERY single imagePrompt field: name the palette colors explicitly in the wardrobe, set dressing, props, lighting tint, and color grade of each shot.
- Wardrobe, walls, objects, and ambient light must all read in these palette tones. Do NOT default to the aesthetic's typical color scheme.
- End every imagePrompt with an explicit color-grade instruction, e.g. "Color grade strictly to the palette: ${palette}."

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
CONTRAST MATRIX (MANDATORY \u2014 do not deviate)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
You MUST assign the correct type to every position:
${positionInstructions}

Position type rules:
- COMPLEX: medium or full-body frame with action, movement, or location rich in detail.
- SIMPLE: minimalist flat-lay, accessory macro, geometric shadow, or texture detail \u2014 NO model required. Compose with ONE single hero subject and GENEROUS negative space around it; keep it clean, airy, uncluttered and breathable \u2014 never busy, never crowded, never multiple objects competing for attention.
- MEDIUM: elegant portrait or mirror selfie \u2014 tight on face/shoulders, calm and refined.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
DIVERSITY RULES (MANDATORY)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Every position where the model appears MUST have:
  1. A different hairstyle (choose from: ${hairstyleList})
  2. A different camera angle (choose from: ${angleList})
  3. A different location or scene context

NO two adjacent positions may share the same hairstyle OR the same angle.

SUBJECT VARIETY (MANDATORY): every position must depict a DISTINCT subject/object/location. Never show the same object, prop, garment, or place twice \u2014 not even from a different distance, crop, or angle. Spread SIMPLE/object positions across different subject categories (e.g. accessory, food/drink, architecture detail, interior texture, outdoor element, wardrobe flat-lay) so the grid tells a varied story instead of repeating one motif.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
TONAL CONTRAST & VISUAL RHYTHM (MANDATORY)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
The finished grid must NOT be tonally flat \u2014 a grid where every cell is equally bright (or equally dark) looks amateur. Staying STRICTLY inside the palette "${palette}", deliberately alternate the tonal value of the cells:
- Some cells must lean to the DARKER / moodier / low-key end of the palette (deep shadow, dramatic light, rich dark tones).
- Other cells must lean to the LIGHTER / airier / high-key end (bright, soft, luminous).
- Neighbouring cells (side by side AND stacked) must differ in overall brightness so the grid reads as a light-and-dark rhythm, not one uniform tone.
In EVERY imagePrompt, explicitly state whether that shot is "bright and airy" or "dark and moody" and name the lighter or darker palette colors accordingly. This varies brightness and mood ONLY \u2014 never the color family.
${assignmentSection}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
PORTRAIT REFERENCE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${portraitInstruction}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
OUTPUT FORMAT (strict \u2014 output ONLY this JSON, no extra text)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
{
  "imageCount": ${imageCount},
  "aesthetic": "${aesthetic}",
  "palette": "${palette}",
  "lightType": "${lightType}",
  "shots": [
    {
      "position": 1,
      "type": "COMPLEX" | "SIMPLE" | "MEDIUM",
      "label": "<short human-readable scene label>",
      "hairstyle": "<hairstyle or null if no model in frame>",
      "angle": "<camera angle or null if no model in frame>",
      "imagePrompt": "<complete, self-contained prompt for GPT Image 2 \u2014 include aesthetic, palette, light, scene, hairstyle, angle, and any portrait-reference instruction>"
    }
    // ... one entry per position, total ${imageCount} entries
  ]
}`;
}
function buildContinuityGridSystemPrompt(context, newImageCount, hasPortraitReference, extraNotes = "", seed) {
  const positionMap = buildPositionMap(newImageCount, seed);
  const positionInstructions = positionMap.map(({ position, type }) => `  - Position ${position}: ${type}`).join("\n");
  const vocabularyLine = getAestheticVocabularyLine(context.aesthetic);
  const usedScenesList = context.usedScenes.length > 0 ? context.usedScenes.join(", ") : "none";
  const usedHairstylesList = context.usedHairstyles.length > 0 ? context.usedHairstyles.join(", ") : "none";
  const usedAnglesList = Array.isArray(context.usedAngles) && context.usedAngles.length > 0 ? context.usedAngles.join(", ") : "none";
  const rng = mulberry32((seed ?? 0) >>> 0 || 1);
  const usedHairSet = new Set(context.usedHairstyles);
  const usedAngleSet = new Set(context.usedAngles);
  const freshHairBank = HAIRSTYLE_BANK.filter((h) => !usedHairSet.has(h));
  const freshAngleBank = ANGLE_BANK.filter((a) => !usedAngleSet.has(a));
  const hairPool = freshHairBank.length > 0 ? freshHairBank : HAIRSTYLE_BANK;
  const anglePool = freshAngleBank.length > 0 ? freshAngleBank : ANGLE_BANK;
  const shuffledHair = seed !== void 0 ? shuffleWith(hairPool, rng) : hairPool;
  const shuffledAngles = seed !== void 0 ? shuffleWith(anglePool, rng) : anglePool;
  const shuffledCategories = seed !== void 0 ? shuffleWith(OBJECT_SUBJECT_CATEGORIES, rng) : OBJECT_SUBJECT_CATEGORIES;
  let modelIdx = 0;
  let objectIdx = 0;
  const assignmentLines = positionMap.map(({ position, type }) => {
    if (type === "SIMPLE") {
      const category = shuffledCategories.length > 0 ? shuffledCategories[objectIdx % shuffledCategories.length] : "a distinct hero object";
      objectIdx++;
      return `  - Position ${position} (OBJECT, no model): hero subject category = ${category}. Must be DISTINCT from every cell in this pack so far.`;
    }
    const hairstyle = shuffledHair[modelIdx % shuffledHair.length];
    const angle = shuffledAngles[modelIdx % shuffledAngles.length];
    modelIdx++;
    return `  - Position ${position} (${type}, model present): hairstyle = ${hairstyle}; camera angle = ${angle}.`;
  }).join("\n");
  const assignmentSection = seed !== void 0 ? `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
PER-POSITION ASSIGNMENTS (MANDATORY \u2014 use EXACTLY)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Use exactly the hairstyle, camera angle and object category assigned to each position below. They are already chosen to avoid everything used in earlier images of this pack.
${assignmentLines}
` : "";
  const portraitInstruction = hasPortraitReference ? "Portrait reference IS available. Include in each imagePrompt: 'Preserve the model's face and identity exactly from the provided reference image.' IDENTITY IS LOCKED, EVERYTHING ELSE VARIES: keep the SAME face/identity, but every new shot must show a DIFFERENT outfit, pose, expression, and styling than any previous image. Do NOT reuse a wardrobe piece, pose, or facial expression already used in earlier images of this pack. Never repeat the same look from a new angle \u2014 change the actual outfit and pose." : "No portrait reference. Describe the model generically but consistently across all shots (same apparent age, skin tone, body type), while still varying outfit, pose, and expression in every shot.";
  return `You are an expert Instagram content strategist and AI photo director.
You are continuing an existing Instagram grid. Your ONLY task is to generate a JSON shot plan for ${newImageCount} NEW images that extend the grid seamlessly.
Output VALID JSON and NOTHING else.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
EXISTING GRID CONTEXT (maintain coherence)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
Aesthetic: ${context.aesthetic}
Color palette: ${context.palette}
Light type: ${context.lightType}
${vocabularyLine ? vocabularyLine + "\n" : ""}Already-used scenes (AVOID repeating these): ${usedScenesList}
Already-used hairstyles (AVOID repeating these): ${usedHairstylesList}
Already-used camera angles (AVOID repeating these): ${usedAnglesList}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
NEW GRID PARAMETERS
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
New image count: ${newImageCount}
Extra notes: ${extraNotes || "none"}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
CONTRAST MATRIX (MANDATORY)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${positionInstructions}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
CONTINUITY RULES (MANDATORY)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
1. Keep IDENTICAL: palette (${context.palette}), light type (${context.lightType}), aesthetic mood.
2. Use FRESH scenes \u2014 none of the already-used scenes above.
3. Use FRESH hairstyles \u2014 none of the already-used hairstyles above. Choose from: ${HAIRSTYLE_BANK.join(", ")}.
4. Use FRESH camera angles \u2014 none of the already-used angles above. Choose from: ${ANGLE_BANK.join(", ")}.
5. SIMPLE positions must be pure minimalist object/texture shots \u2014 no model. Compose ONE single hero subject with generous negative space around it: clean, airy, uncluttered, breathable \u2014 never busy or crowded.
6. NO RE-SHOOTING SUBJECTS (CRITICAL): treat the already-used scenes above as subjects/objects/props/locations that are now OFF-LIMITS. Do NOT re-depict any of them from a different distance, crop, zoom, or angle. Example: if a previous image already featured a wristwatch, this extension must NOT contain ANY watch \u2014 not closer, not farther, not from another angle. Pick entirely different objects and locations.
7. EXPAND THE STORY: each new image must ADD a genuinely new narrative beat to the pack (new prop category, new wardrobe piece, new setting, new lifestyle moment, new texture). Across the whole extension, vary the subject categories (e.g. accessories, food/drink, architecture, interior detail, outdoor scene, wardrobe flat-lay) so the grid feels like the next chapter \u2014 never a re-run of the same motifs in new framing.
${assignmentSection}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
PORTRAIT REFERENCE
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
${portraitInstruction}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
OUTPUT FORMAT (output ONLY this JSON)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
{
  "imageCount": ${newImageCount},
  "aesthetic": "${context.aesthetic}",
  "palette": "${context.palette}",
  "lightType": "${context.lightType}",
  "shots": [
    {
      "position": 1,
      "type": "COMPLEX" | "SIMPLE" | "MEDIUM",
      "label": "<scene label>",
      "hairstyle": "<hairstyle or null>",
      "angle": "<angle or null>",
      "imagePrompt": "<complete GPT Image 2 prompt>"
    }
  ]
}`;
}
var POSITION_TYPE_RULES = {
  COMPLEX: "medium or full-body frame, action, movement, rich location details",
  SIMPLE: "minimalist flat-lay / accessory macro / geometric shadow / texture \u2014 no model. ONE single hero subject only, surrounded by GENEROUS empty negative space; clean, airy, uncluttered, calm and breathable \u2014 never busy or crowded",
  MEDIUM: "elegant tight portrait or mirror selfie \u2014 face/shoulders, calm composition"
};
function buildPositionMap(count, seed) {
  if (seed === void 0) {
    const result2 = [];
    for (let i = 1; i <= count; i++) {
      let type;
      if (i % 2 === 0) {
        type = "SIMPLE";
      } else if (i === 3 || i === 7 || i === 11) {
        type = "MEDIUM";
      } else {
        type = "COMPLEX";
      }
      result2.push({ position: i, type });
    }
    return result2;
  }
  const rng = mulberry32(seed >>> 0 || 1);
  const modelPositions = [];
  for (let i = 1; i <= count; i++) {
    if (i % 2 === 1) modelPositions.push(i);
  }
  const mediumCount = [3, 7, 11].filter((p) => p <= count).length;
  const mediumSet = new Set(shuffleWith(modelPositions, rng).slice(0, mediumCount));
  const result = [];
  for (let i = 1; i <= count; i++) {
    let type;
    if (i % 2 === 0) {
      type = "SIMPLE";
    } else if (mediumSet.has(i)) {
      type = "MEDIUM";
    } else {
      type = "COMPLEX";
    }
    result.push({ position: i, type });
  }
  return result;
}
function positionTypeFor(position) {
  if (position % 2 === 0) return "SIMPLE";
  if (position === 3 || position === 7 || position === 11) return "MEDIUM";
  return "COMPLEX";
}
async function callGeminiFlashText(options) {
  const requestedModel = options.model || "gemini-3-flash-preview";
  const normalizedModel = requestedModel.startsWith("models/") ? requestedModel.slice("models/".length) : requestedModel;
  const modelName = normalizedModel === "gemini-2.0-flash" || normalizedModel === "gemini-2.0-flash-exp" ? "gemini-3-flash-preview" : normalizedModel;
  const url = `${options.geminiApiBaseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: options.systemPrompt }]
      }
    ],
    generationConfig: {
      // Higher temperature + nucleus sampling so plans for the same aesthetic/
      // palette diverge more between requests (more creative scene variety).
      temperature: 0.95,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: "application/json"
    }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": options.geminiApiKey
    },
    body: JSON.stringify(payload)
  });
  const rawText = await response.text();
  if (!response.ok) {
    let remoteMessage = "";
    try {
      const parsed = JSON.parse(rawText);
      const err = parsed.error;
      remoteMessage = (typeof err?.message === "string" ? err.message : "") || rawText;
    } catch {
      remoteMessage = rawText;
    }
    throw new Error(`Gemini Flash error (${response.status}): ${remoteMessage}`);
  }
  try {
    const parsed = JSON.parse(rawText);
    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    for (const candidate of candidates) {
      const c = candidate;
      const content = c.content;
      const parts = Array.isArray(content?.parts) ? content.parts : [];
      for (const part of parts) {
        const p = part;
        if (typeof p.text === "string" && p.text.trim().length > 0) {
          return p.text.trim();
        }
      }
    }
  } catch {
  }
  throw new Error("Gemini Flash returned no usable text.");
}
function parseGridPlan(rawJson, expectedCount, seed) {
  let parsed;
  try {
    const clean = rawJson.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("Grid plan parsing failed: Gemini did not return valid JSON.");
  }
  const root = parsed;
  if (!Array.isArray(root.shots) || root.shots.length === 0) {
    throw new Error("Grid plan parsing failed: 'shots' array is missing or empty.");
  }
  if (root.shots.length !== expectedCount) {
    throw new Error(
      `Grid plan parsing failed: expected ${expectedCount} shots, got ${root.shots.length}.`
    );
  }
  const typeByPosition = new Map(
    buildPositionMap(expectedCount, seed).map(({ position, type }) => [position, type])
  );
  const shots = root.shots.map((s, idx) => {
    const shot = s;
    const position = typeof shot.position === "number" ? shot.position : idx + 1;
    const type = typeByPosition.get(position) ?? positionTypeFor(position);
    const label = typeof shot.label === "string" ? shot.label : `Shot ${position}`;
    const hairstyle = type === "SIMPLE" ? null : typeof shot.hairstyle === "string" ? shot.hairstyle : null;
    const angle = type === "SIMPLE" ? null : typeof shot.angle === "string" ? shot.angle : null;
    const imagePrompt = typeof shot.imagePrompt === "string" ? shot.imagePrompt : "";
    if (!imagePrompt) {
      throw new Error(`Grid plan parsing failed: shot ${position} is missing imagePrompt.`);
    }
    return { position, type, label, hairstyle, angle, imagePrompt };
  });
  return {
    imageCount: expectedCount,
    aesthetic: typeof root.aesthetic === "string" ? root.aesthetic : "",
    palette: typeof root.palette === "string" ? root.palette : "",
    lightType: typeof root.lightType === "string" ? root.lightType : "",
    shots
  };
}
function extractContinuityContext(plan) {
  const usedScenes = [];
  const usedHairstyles = [];
  const usedAngles = [];
  for (const shot of plan.shots) {
    if (shot.label) usedScenes.push(shot.label);
    if (shot.hairstyle) usedHairstyles.push(shot.hairstyle);
    if (shot.angle) usedAngles.push(shot.angle);
  }
  return {
    aesthetic: plan.aesthetic,
    palette: plan.palette,
    lightType: plan.lightType,
    usedScenes: [...new Set(usedScenes)],
    usedHairstyles: [...new Set(usedHairstyles)],
    usedAngles: [...new Set(usedAngles)]
  };
}
var GRID_PIPELINE_PLAN_CREDIT_COST = INSTAME_GRID_PIPELINE_PLAN_CREDIT_COST;
var GRID_PIPELINE_RENDER_CREDIT_COST_PER_IMAGE = INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST;
var GRID_PIPELINE_COMPOSITE_CREDIT_COST = INSTAME_GRID_PIPELINE_COMPOSITE_CREDIT_COST;
var GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE = INSTAME_GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE;
var GRID_COLS = 3;
function buildCompositeGridPrompt(plan, hasPortraitReference) {
  const totalRows = Math.ceil(plan.imageCount / GRID_COLS);
  const shotLines = plan.shots.map((shot) => {
    const row = Math.ceil(shot.position / GRID_COLS);
    const col = (shot.position - 1) % GRID_COLS + 1;
    const cellKind = shot.type === "SIMPLE" ? "OBJECT-ONLY (NO person, NO model \u2014 flat-lay / accessory / texture detail)" : shot.type === "MEDIUM" ? "PORTRAIT (model present \u2014 tight on face/shoulders)" : "PORTRAIT (model present \u2014 full or medium body, action/location)";
    const detail = [
      cellKind,
      shot.label,
      shot.hairstyle ? `hairstyle: ${shot.hairstyle}` : null,
      shot.angle ? `camera angle: ${shot.angle}` : null
    ].filter(Boolean).join(" \u2014 ");
    return `  Position ${shot.position} (row ${row}, col ${col}): ${detail}`;
  }).join("\n");
  const modelPositions = plan.shots.filter((s) => s.type !== "SIMPLE").map((s) => s.position);
  const objectPositions = plan.shots.filter((s) => s.type === "SIMPLE").map((s) => s.position);
  const portraitNote = hasPortraitReference ? "The female model with consistent identity (same face) appears ONLY in the PORTRAIT cells listed below." : "A stylish female model with consistent appearance (same face) appears ONLY in the PORTRAIT cells listed below.";
  return `Create a photorealistic Instagram profile grid preview image showing exactly ${plan.imageCount} coordinated editorial photos arranged in a ${GRID_COLS}-column \xD7 ${totalRows}-row grid, exactly as they appear on an Instagram profile page.

GRID STRUCTURE: ${plan.imageCount} equal cells in ${totalRows} row${totalRows > 1 ? "s" : ""} of ${GRID_COLS} columns. Cells are separated by a thin white 1px divider (like Instagram). The grid fills the entire canvas.

AESTHETIC: ${plan.aesthetic}
COLOR PALETTE: ${plan.palette}
LIGHT TYPE: ${plan.lightType}

COLOR PALETTE IS DOMINANT: every cell \u2014 wardrobe, walls, props, set dressing, ambient light, and overall color grade \u2014 MUST be rendered strictly in the palette "${plan.palette}". This palette OVERRIDES the colors normally associated with the aesthetic or the scenes. If a scene would normally be warm/beige/terracotta but the palette is cool or dark, render it in the palette colors instead. Do NOT fall back to the aesthetic's typical colors.

CELL CONTENTS (left to right, top to bottom \u2014 numbering is exact):
${shotLines}

CELL-TYPE PLACEMENT (MANDATORY \u2014 do NOT deviate):
- PORTRAIT cells (model visible) are ONLY positions: ${modelPositions.join(", ") || "none"}.
- OBJECT-ONLY cells (absolutely NO person, NO face, NO body part) are ONLY positions: ${objectPositions.join(", ") || "none"}.
- The model must NEVER appear in an OBJECT-ONLY cell. Object-only cells show a single hero object/texture with generous negative space \u2014 no human anywhere.
- Do NOT place portrait cells next to each other when an object cell is specified between them \u2014 follow the exact placement above so portraits and objects alternate as listed.

OUTFIT & WARDROBE VARIETY (MANDATORY):
- Every PORTRAIT cell must show the model in a COMPLETELY DIFFERENT outfit \u2014 different garment type, cut, and color story in each one.
- NEVER reuse the same black blazer (or any single garment) across multiple cells. If one cell is a black blazer, the others must be e.g. a knit, a dress, a coat, a blouse, tailored trousers with a different top, etc.
- Also vary pose, expression, and framing in every portrait cell. Never repeat the same look from a different angle.

TONAL CONTRAST & VISUAL RHYTHM (MANDATORY \u2014 this is what makes the grid look professional):
- Do NOT render every cell at the same brightness. A monotone grid where all cells are equally light (or equally dark) looks flat and amateur.
- Within the SAME palette "${plan.palette}", deliberately alternate the tonal value of neighbouring cells: some cells lean to the DARKER / moodier / low-key end of the palette (deep shadow, dramatic light, rich dark tones) and others to the LIGHTER / airier / high-key end (bright, soft, luminous).
- No two side-by-side or stacked cells should share the same overall brightness \u2014 create a checkerboard-like rhythm of light and dark across the grid.
- Mix close-up high-detail cells with open negative-space cells, and bright daylight moments with shadowy dramatic ones.
- This tonal variation must stay strictly inside the palette \u2014 change brightness and mood, NOT the color family.

RULES:
- All cells share the SAME palette and overall color grade, but their TONAL VALUE (brightness/darkness) MUST deliberately vary from cell to cell per the TONAL CONTRAST section above \u2014 do not flatten them to one identical brightness
- Each cell is clearly distinct but visually harmonious with all others
- VISUAL BALANCE (IMPORTANT): keep object/flat-lay (OBJECT-ONLY) cells minimalist and airy \u2014 ONE hero subject with generous negative space, never cluttered. Alternate busy and calm cells so the overall grid feels balanced and breathable, not crowded
- ${portraitNote}
- No extra borders or margins outside the grid \u2014 the grid fills the entire image
- Render photos only: no text, captions, labels, numbers, UI chrome, stickers, logos, watermarks, signs, or readable words anywhere in the image
- Professional editorial photography quality, photorealistic`;
}
function buildExtractionPrompt(params) {
  const { position, imageCount, shot, hasPortrait, aesthetic, palette, lightType, preCropped } = params;
  const totalRows = Math.ceil(imageCount / GRID_COLS);
  const row = Math.ceil(position / GRID_COLS);
  const col = (position - 1) % GRID_COLS + 1;
  const rowLabel = row === 1 ? "top" : row === totalRows ? "bottom" : "center";
  const colLabel = col === 1 ? "left" : col === GRID_COLS ? "right" : "center";
  const corner = rowLabel === "center" && colLabel === "center" ? "center of the grid" : `${rowLabel}-${colLabel} of the grid`;
  const typeDesc = shot.type === "SIMPLE" ? "Flat-lay / object detail \u2014 no person in frame. ONE single hero subject with generous empty negative space around it; minimalist, clean, airy, uncluttered and breathable \u2014 never busy or crowded" : shot.type === "MEDIUM" ? "Tight portrait \u2014 face and shoulders, calm and refined" : "Full or medium body \u2014 action, movement, or rich location";
  const brief = shot.imagePrompt && shot.imagePrompt.trim().length > 0 ? shot.imagePrompt.trim() : `Scene: ${shot.label}.${shot.hairstyle ? ` Hairstyle: ${shot.hairstyle}.` : ""}${shot.angle ? ` Camera angle: ${shot.angle}.` : ""}`;
  const portraitInstruction = hasPortrait ? `
CRITICAL IDENTITY RULE: The facial features, face shape, skin tone, and complete identity of any person in this image MUST belong 100% to the individual shown in the provided reference portrait, exactly as they already appear in the reference cell. Never alter their identity.` : "";
  const openingLine = preCropped ? `Upscale and enhance the provided photo into a single full-resolution editorial image. This is an ENHANCEMENT task, NOT a re-generation: the provided image is the exact picture the user already approved.` : `Upscale and enhance cell ${position} of ${imageCount} from the Instagram grid preview (first image provided) into a single full-resolution editorial photo. This is an ENHANCEMENT task, NOT a re-generation: the reference cell is the exact picture the user already approved.`;
  const referenceLine = preCropped ? `REFERENCE: the provided image IS the photo to enhance \u2014 it already shows ONLY this single cell. Treat every pixel of it as the SOURCE OF TRUTH and keep the entire frame; do NOT crop, zoom, re-frame, or cut anything out.` : `REFERENCE CELL: position ${position}, counting left to right, top to bottom \u2014 row ${row}, column ${col} (${corner}). Crop to this cell and treat its pixels as the SOURCE OF TRUTH.`;
  return `${openingLine}

${referenceLine}

WHAT TO PRESERVE EXACTLY (do NOT change any of these):
- The exact same composition, framing, camera angle, and crop
- The exact same outfit / wardrobe \u2014 every garment, color, cut, fabric, and accessory stays identical (do not add, remove, swap, or restyle clothing)
- The exact same background, location, set dressing, props, and every object in frame
- The exact same pose, body position, hands, and facial expression
- The exact same colors, palette, tonal range, and lighting direction
- For object/flat-lay cells: the exact same hero subject and layout

WHAT TO IMPROVE (this is the ONLY thing you may change):
- Increase resolution and sharpness; add realistic fine detail and texture (skin, fabric weave, material surfaces, edges)
- Remove the blur, softness, and compression artifacts of the small preview cell
- Do NOT introduce new elements, new scenery, or any creative reinterpretation

CONTEXT (describes the approved cell \u2014 use only to understand what you are enhancing, never to override what is visible):
${brief}

SHOT TYPE: ${typeDesc}

OUTPUT REQUIREMENTS:
- Output ONLY this single standalone photo \u2014 no grid lines, no other cells, no borders
- The result must look like the SAME photo as the reference cell, just at much higher resolution and clarity
- Keep the ${aesthetic} aesthetic, palette (${palette}), and ${lightType} lighting consistent with the reference cell \u2014 do not re-grade or shift colors
- Ultra-detailed, photorealistic, shot with a professional 8K camera
- Tall vertical portrait format, as close to a 9:16 ratio as possible: the subject and scene must fill the entire frame edge-to-edge with NO letterboxing, NO black or white bars, and NO borders${portraitInstruction}`;
}

// server/routes.ts
function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI_NOT_CONFIGURED: Set GEMINI_API_KEY (or GOOGLE_API_KEY) to use Gemini styling features."
    );
  }
  return apiKey;
}
var OWN_STYLE_ANALYSIS_VERSIONS = {
  reference_locked: 1,
  creative_prompt: 4
};
function firstHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
function toErrorMessage(error, fallback) {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
    if (Array.isArray(message)) {
      const firstString = message.find((entry) => typeof entry === "string");
      if (firstString && firstString.trim().length > 0) {
        return firstString;
      }
    }
  }
  return fallback;
}
var TEMPORARY_IMAGE_SERVICE_MESSAGE = "We're receiving an unusually high number of image requests right now. Please try again in about 30 minutes.";
function toUserFacingTemporaryImageServiceMessage(errorMessage) {
  const normalized = normalizeStringValue(errorMessage).toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("ai_not_configured:")) {
    return TEMPORARY_IMAGE_SERVICE_MESSAGE;
  }
  const providerCapacityPatterns = [
    /insufficient credits?/i,
    /insufficient balance/i,
    /credit balance/i,
    /quota/i,
    /billing/i,
    /payment required/i,
    /resource exhausted/i,
    /rate limit/i,
    /too many requests/i,
    /temporarily unavailable/i,
    /overloaded/i,
    /capacity/i
  ];
  return providerCapacityPatterns.some((pattern) => pattern.test(normalized)) ? TEMPORARY_IMAGE_SERVICE_MESSAGE : null;
}
function shouldFallbackTogetherToGemini(error) {
  const normalized = normalizeStringValue(toErrorMessage(error, "")).toLowerCase();
  if (!normalized) return false;
  const fallbackPatterns = [
    /together api error/i,
    /\(402\)/i,
    /\(408\)/i,
    /\(409\)/i,
    /\(429\)/i,
    /\(5\d\d\)/i,
    /insufficient credits?/i,
    /insufficient balance/i,
    /credit balance/i,
    /billing/i,
    /payment required/i,
    /quota/i,
    /rate limit/i,
    /temporarily unavailable/i,
    /overloaded/i,
    /timeout/i,
    /service unavailable/i
  ];
  return fallbackPatterns.some((pattern) => pattern.test(normalized));
}
function isGeminiNoImageDataError(error) {
  const normalized = normalizeStringValue(toErrorMessage(error, "")).toLowerCase();
  return normalized.includes("gemini image generation returned no image data");
}
function getEnvValues(keys) {
  const values = [];
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    raw.split(",").map((value) => value.trim()).filter(Boolean).forEach((value) => values.push(value));
  }
  return values;
}
function base64UrlDecode2(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = normalized.length % 4 === 0 ? 0 : 4 - normalized.length % 4;
  return Buffer.from(normalized + "=".repeat(padLength), "base64");
}
function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = JSON.parse(base64UrlDecode2(headerPart).toString("utf8"));
  const payload = JSON.parse(base64UrlDecode2(payloadPart).toString("utf8"));
  return {
    signedPart: `${headerPart}.${payloadPart}`,
    signature: base64UrlDecode2(signaturePart),
    header,
    payload
  };
}
var appleKeysCache = null;
var APPLE_KEYS_TTL_MS = 60 * 60 * 1e3;
var appleNotificationRootCertCache = null;
var APPLE_NOTIFICATION_ROOT_CERT_TTL_MS = 24 * 60 * 60 * 1e3;
async function getAppleSigningKeys() {
  if (appleKeysCache && Date.now() - appleKeysCache.fetchedAt < APPLE_KEYS_TTL_MS) {
    return appleKeysCache.keys;
  }
  const response = await fetch("https://appleid.apple.com/auth/keys");
  if (!response.ok) {
    throw new Error("Could not load Apple signing keys");
  }
  const data = await response.json();
  const keys = Array.isArray(data.keys) ? data.keys : [];
  if (keys.length === 0) {
    throw new Error("Apple signing keys are unavailable");
  }
  appleKeysCache = { keys, fetchedAt: Date.now() };
  return keys;
}
function getAppleNotificationRootCertUrl() {
  return normalizeStringValue(process.env.APPLE_SERVER_NOTIFICATION_ROOT_CERT_URL) || "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer";
}
async function getTrustedAppleNotificationRootCertificate() {
  if (appleNotificationRootCertCache && Date.now() - appleNotificationRootCertCache.fetchedAt < APPLE_NOTIFICATION_ROOT_CERT_TTL_MS) {
    return appleNotificationRootCertCache.cert;
  }
  const response = await fetch(getAppleNotificationRootCertUrl());
  if (!response.ok) {
    throw new Error("Could not load Apple notification root certificate");
  }
  const cert = new import_node_crypto2.X509Certificate(Buffer.from(await response.arrayBuffer()));
  appleNotificationRootCertCache = { cert, fetchedAt: Date.now() };
  return cert;
}
function assertCertificateIsValidNow(cert, label) {
  const now = Date.now();
  const validFrom = Date.parse(cert.validFrom);
  const validTo = Date.parse(cert.validTo);
  if (!Number.isFinite(validFrom) || !Number.isFinite(validTo) || now < validFrom || now > validTo) {
    throw new Error(`${label} certificate is outside its validity window`);
  }
}
async function verifyAppleServerSignedPayload(signedPayload) {
  const parsed = parseJwt(signedPayload);
  const x5c = Array.isArray(parsed.header.x5c) ? parsed.header.x5c : [];
  if (parsed.header.alg !== "ES256" || x5c.length === 0) {
    throw new Error("Apple signed payload header is invalid");
  }
  const certificateChain = x5c.map((entry, index) => {
    if (typeof entry !== "string" || !entry.trim()) {
      throw new Error(`Apple certificate ${index + 1} is invalid`);
    }
    return new import_node_crypto2.X509Certificate(Buffer.from(entry, "base64"));
  });
  certificateChain.forEach((cert, index) => {
    assertCertificateIsValidNow(cert, `Apple chain ${index + 1}`);
  });
  const trustedRoot = await getTrustedAppleNotificationRootCertificate();
  assertCertificateIsValidNow(trustedRoot, "Trusted Apple root");
  for (let index = 0; index < certificateChain.length - 1; index += 1) {
    if (!certificateChain[index].verify(certificateChain[index + 1].publicKey)) {
      throw new Error("Apple notification certificate chain is invalid");
    }
  }
  if (!certificateChain[certificateChain.length - 1].verify(trustedRoot.publicKey)) {
    throw new Error("Apple notification root trust validation failed");
  }
  const verifier = (0, import_node_crypto2.createVerify)("SHA256");
  verifier.update(parsed.signedPart);
  verifier.end();
  if (!verifier.verify(
    { key: certificateChain[0].publicKey, dsaEncoding: "ieee-p1363" },
    parsed.signature
  )) {
    throw new Error("Apple notification signature is invalid");
  }
  return parsed.payload;
}
function decodeAppleSignedSubPayload(input) {
  const signedPayload = normalizeStringValue(input);
  if (!signedPayload) return null;
  try {
    return parseJwt(signedPayload).payload;
  } catch {
    return null;
  }
}
function getAppleAudienceSet() {
  return new Set(
    getEnvValues([
      "APPLE_BUNDLE_ID",
      "APPLE_SERVICE_ID",
      "APPLE_CLIENT_ID",
      "EXPO_PUBLIC_APPLE_CLIENT_ID"
    ])
  );
}
function getGoogleAudienceSet() {
  return new Set(
    getEnvValues([
      "GOOGLE_CLIENT_ID",
      "GOOGLE_WEB_CLIENT_ID",
      "GOOGLE_IOS_CLIENT_ID",
      "GOOGLE_ANDROID_CLIENT_ID",
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
      "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
      "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID"
    ])
  );
}
async function verifyGoogleIdToken(idToken) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!response.ok) {
    throw new Error("Invalid Google identity token");
  }
  const data = await response.json();
  const sub = typeof data.sub === "string" ? data.sub : "";
  const email = typeof data.email === "string" ? data.email : "";
  const iss = typeof data.iss === "string" ? data.iss : "";
  const aud = typeof data.aud === "string" ? data.aud : "";
  const exp = Number(data.exp || 0);
  const emailVerified = data.email_verified === true || data.email_verified === "true";
  const name = typeof data.name === "string" ? data.name : void 0;
  if (!sub || !email) {
    throw new Error("Google token is missing subject or email");
  }
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
    throw new Error("Google token issuer is invalid");
  }
  if (!Number.isFinite(exp) || exp * 1e3 < Date.now()) {
    throw new Error("Google token is expired");
  }
  if (!emailVerified) {
    throw new Error("Google email is not verified");
  }
  const allowedAudiences = getGoogleAudienceSet();
  if (allowedAudiences.size > 0 && !allowedAudiences.has(aud)) {
    throw new Error("Google token audience mismatch");
  }
  return { sub, email, name };
}
async function verifyAppleIdentityToken(identityToken) {
  const { signedPart, signature, header, payload } = parseJwt(identityToken);
  const kid = typeof header.kid === "string" ? header.kid : "";
  const alg = typeof header.alg === "string" ? header.alg : "";
  if (!kid || alg !== "RS256") {
    throw new Error("Apple token header is invalid");
  }
  const keys = await getAppleSigningKeys();
  const key = keys.find((entry) => entry.kid === kid && entry.kty === "RSA");
  if (!key) {
    throw new Error("Apple signing key not found");
  }
  const publicKey = (0, import_node_crypto2.createPublicKey)({
    key: {
      kty: key.kty,
      kid: key.kid,
      use: key.use,
      alg: key.alg,
      n: key.n,
      e: key.e
    },
    format: "jwk"
  });
  const verifier = (0, import_node_crypto2.createVerify)("RSA-SHA256");
  verifier.update(signedPart);
  verifier.end();
  const signatureIsValid = verifier.verify(publicKey, signature);
  if (!signatureIsValid) {
    throw new Error("Apple token signature is invalid");
  }
  const iss = typeof payload.iss === "string" ? payload.iss : "";
  const aud = typeof payload.aud === "string" ? payload.aud : "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const exp = Number(payload.exp || 0);
  const email = typeof payload.email === "string" ? payload.email : void 0;
  if (iss !== "https://appleid.apple.com") {
    throw new Error("Apple token issuer is invalid");
  }
  if (!sub) {
    throw new Error("Apple token is missing subject");
  }
  if (!Number.isFinite(exp) || exp * 1e3 < Date.now()) {
    throw new Error("Apple token is expired");
  }
  const allowedAudiences = getAppleAudienceSet();
  if (allowedAudiences.size > 0 && !allowedAudiences.has(aud)) {
    throw new Error("Apple token audience mismatch");
  }
  return { sub, email };
}
var CREDIT_PACKAGES = [
  { id: "pack_5", name: "Quick Start - 10 Credits", credits: 10, priceCents: 299 },
  { id: "pack_15", name: "Creator Pack - 30 Credits", credits: 30, priceCents: 799, popular: true },
  { id: "pack_30", name: "Studio Pack - 60 Credits", credits: 60, priceCents: 1499 },
  { id: "pack_100", name: "Best Value - 200 Credits", credits: 200, priceCents: 4499 }
];
var SUBSCRIPTION_PLANS = [
  { id: "sub_basic", name: "Lite", creditsPerMonth: 20, priceCents: 499 },
  { id: "sub_premium", name: "Plus", creditsPerMonth: 50, priceCents: 999, popular: true },
  { id: "sub_unlimited", name: "Studio", creditsPerMonth: 100, priceCents: 1999 }
];
var DEFAULT_APPLE_SUBSCRIPTION_PRODUCT_TO_PLAN = {
  "com.instame.app.sub.lite.monthly": "sub_basic",
  "com.instame.app.sub.plus.monthly": "sub_premium",
  "com.instame.app.sub.studio.monthly": "sub_unlimited"
};
function getSubscriptionPlanById(planId) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}
var STYLE_COSTS = {
  text: 2,
  image: 5
};
var INSTAME_TRANSFORM_COST = Number.parseInt(
  process.env.INSTAME_TRANSFORM_COST || String(getLiveInstaMeGenerationTier().credits),
  10
);
var DEFAULT_INITIAL_CREDITS = Number.parseInt(process.env.DEFAULT_INITIAL_CREDITS || "6", 10);
var DEFAULT_DEV_CREDIT_GRANT = Number.parseInt(process.env.DEV_CREDIT_GRANT_AMOUNT || "50", 10);
var MAX_DEV_CREDIT_GRANT = 500;
var DEFAULT_ALLOWED_DEV_CREDIT_EMAILS = ["iuliastarcean@gmail.com"];
var GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
var DEFAULT_STYLE_TEXT_MODEL = process.env.STYLE_TEXT_MODEL || "gemini-3-flash-preview";
var DEFAULT_STYLE_IMAGE_MODEL = process.env.STYLE_IMAGE_MODEL || "gemini-3-pro-image-preview";
var DEFAULT_OWN_STYLE_IMAGE_MODEL = process.env.OWN_STYLE_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
var INSTAME_PRIMARY_GEMINI_IMAGE_MODEL = process.env.INSTAME_PRIMARY_GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
var GEMINI_PRO_IMAGE_MODEL = process.env.INSTAME_GEMINI_PRO_IMAGE_MODEL || "gemini-3-pro-image-preview";
var DEFAULT_STYLE_IMAGE_FALLBACK_MODEL = process.env.STYLE_IMAGE_FALLBACK_MODEL || DEFAULT_OWN_STYLE_IMAGE_MODEL;
var DEFAULT_OWN_STYLE_ANALYSIS_MODEL = process.env.OWN_STYLE_ANALYSIS_MODEL || DEFAULT_STYLE_TEXT_MODEL;
var DEFAULT_CREATIVE_OWN_STYLE_ANALYSIS_MODEL = process.env.CREATIVE_OWN_STYLE_ANALYSIS_MODEL || "gemini-3.1-pro";
var INSTAME_DEBUG_TRACE_ENABLED = ["1", "true", "yes", "on"].includes(
  normalizeStringValue(process.env.INSTAME_DEBUG_TRACE).toLowerCase()
);
var DEFAULT_TOGETHER_FLASH_IMAGE_MODEL = process.env.STYLE_PREVIEW_TOGETHER_MODEL || "google/flash-image-3.1";
var DEFAULT_TOGETHER_PRO_IMAGE_MODEL = process.env.STYLE_HIGH_RES_TOGETHER_MODEL || "google/gemini-3-pro-image";
var STYLE_IMAGE_SIZE = (process.env.STYLE_IMAGE_SIZE || "512x512").trim() || "512x512";
var INSTAME_PORTRAIT_ENHANCE_MODEL = process.env.INSTAME_PORTRAIT_ENHANCE_MODEL || DEFAULT_TOGETHER_FLASH_IMAGE_MODEL;
var INSTAME_PORTRAIT_ENHANCE_SIZE = (process.env.INSTAME_PORTRAIT_ENHANCE_SIZE || INSTAME_PORTRAIT_ENHANCE_TIER.output).trim() || "1024 x 1024";
var GRID_PIPELINE_ALLOWED_IMAGE_COUNTS = /* @__PURE__ */ new Set([4, 6, 9, 12]);
var GRID_PIPELINE_RENDER_OPENAI_MODEL = process.env.INSTAME_GRID_PIPELINE_RENDER_MODEL || "gpt-image-2-2026-04-21";
var GRID_PIPELINE_RENDER_OPENAI_QUALITY = "medium";
var GRID_PIPELINE_PREVIEW_PROVIDER = (process.env.INSTAME_GRID_PIPELINE_PREVIEW_PROVIDER || "openai").trim().toLowerCase();
var GRID_PIPELINE_PREVIEW_REVE_MODEL = process.env.INSTAME_GRID_PIPELINE_PREVIEW_REVE_MODEL || "reve-2.0";
var GRID_PIPELINE_EXTRACT_PROVIDER = (process.env.INSTAME_GRID_PIPELINE_EXTRACT_PROVIDER || "openai").trim().toLowerCase();
var GRID_PIPELINE_EXTRACT_REVE_MODEL = process.env.INSTAME_GRID_PIPELINE_EXTRACT_REVE_MODEL || "reve-2.0";
var GRID_PIPELINE_EXTRACT_OPENAI_MODEL = process.env.INSTAME_GRID_PIPELINE_EXTRACT_MODEL || "gpt-image-2";
var INSTAME_PORTRAIT_ENHANCE_PROMPT_PATH = path2.resolve(
  process.cwd(),
  "assets",
  "instame-style-presets",
  "base-prompt",
  "prompt.txt"
);
var EXPOSE_STYLE_DEBUG_PROMPT = normalizeStringValue(process.env.EXPOSE_STYLE_DEBUG_PROMPT).toLowerCase() === "true";
function isGridPipelineImageCount(value) {
  return typeof value === "number" && GRID_PIPELINE_ALLOWED_IMAGE_COUNTS.has(value);
}
var MAX_IMAGE_COUNT_BY_MODE = {
  single_item: 10,
  multi_item: 3
};
var MAX_IMAGE_BASE64_LENGTH = 25e5;
var MAX_INSTAME_UPLOADED_IMAGES = 10;
var MAX_INSTAME_ENHANCED_IMAGES = 10;
var MAX_INSTAME_OWN_STYLES = 12;
var MAX_INSTAME_GENERATION_HISTORY_IMAGES = 20;
var MAX_INSTAME_LIBRARY_IMAGES_TOTAL = MAX_INSTAME_UPLOADED_IMAGES + MAX_INSTAME_ENHANCED_IMAGES + MAX_INSTAME_OWN_STYLES + MAX_INSTAME_GENERATION_HISTORY_IMAGES;
var MAX_INSTAME_LIBRARY_IMAGE_BYTES = 1e6;
var MAX_INSTAME_LIBRARY_IMAGE_DIMENSION = 1024;
var MAX_INSTAME_LIBRARY_PREVIEW_BASE64_LENGTH = 22e4;
var MAX_INSTAME_OWN_STYLE_PROMPT_LENGTH = 8e3;
var MAX_INSTAME_SAVED_PACKS = 30;
var MAX_INSTAME_PACK_IMAGES = 16;
var MAX_INSTAME_PACK_IMAGE_BASE64_LENGTH = 6e6;
var STRIPE_WEBHOOK_TOLERANCE_SEC = 300;
var INSTAME_HIGH_RES_OUTPUT_DIMENSION = 1024;
var DEFAULT_IAP_PRODUCT_CREDITS = {
  "com.instame.app.credits.quickstart10": 10,
  "com.instame.app.credits.creator30": 30,
  "com.instame.app.credits.studio60": 60,
  "com.instame.app.credits.bestvalue200": 200,
  "com.iulia.muse.credits.quickstart10": 10,
  "com.iulia.muse.credits.creator30": 30,
  "com.iulia.muse.credits.studio60": 60,
  "com.iulia.muse.credits.bestvalue200": 200
};
function parseProductCreditsMap(raw) {
  if (!raw || !raw.trim()) return {};
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed);
    return entries.reduce((acc, [productId, creditsRaw]) => {
      const credits = Number(creditsRaw);
      if (productId.trim() && Number.isFinite(credits) && credits > 0) {
        acc[productId.trim()] = Math.floor(credits);
      }
      return acc;
    }, {});
  } catch {
    return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean).reduce((acc, entry) => {
      const [productIdRaw, creditsRaw] = entry.split(":").map((part) => part.trim());
      const credits = Number(creditsRaw);
      if (productIdRaw && Number.isFinite(credits) && credits > 0) {
        acc[productIdRaw] = Math.floor(credits);
      }
      return acc;
    }, {});
  }
}
function parseProductMap(raw) {
  if (!raw || !raw.trim()) return {};
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce((acc, [key, value]) => {
      if (typeof key === "string" && typeof value === "string" && key.trim() && value.trim()) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});
  } catch {
    return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean).reduce((acc, entry) => {
      const [keyRaw, valueRaw] = entry.split(":").map((part) => part.trim());
      if (keyRaw && valueRaw) {
        acc[keyRaw] = valueRaw;
      }
      return acc;
    }, {});
  }
}
var SHARED_IAP_PRODUCT_CREDITS = parseProductCreditsMap(process.env.IAP_PRODUCT_CREDITS);
var APPLE_IAP_PRODUCT_CREDITS = {
  ...DEFAULT_IAP_PRODUCT_CREDITS,
  ...SHARED_IAP_PRODUCT_CREDITS,
  ...parseProductCreditsMap(process.env.APPLE_IAP_PRODUCT_CREDITS)
};
var GOOGLE_IAP_PRODUCT_CREDITS = {
  ...DEFAULT_IAP_PRODUCT_CREDITS,
  ...SHARED_IAP_PRODUCT_CREDITS,
  ...parseProductCreditsMap(process.env.GOOGLE_IAP_PRODUCT_CREDITS)
};
var APPLE_IAP_SUBSCRIPTION_PRODUCTS = {
  ...DEFAULT_APPLE_SUBSCRIPTION_PRODUCT_TO_PLAN,
  ...parseProductMap(process.env.IAP_SUBSCRIPTION_PRODUCT_MAP),
  ...parseProductMap(process.env.APPLE_IAP_SUBSCRIPTION_PRODUCT_MAP)
};
var STYLE_REFERENCE_LIBRARY_PATH = path2.resolve(
  process.cwd(),
  "assets",
  "style-references",
  "library.json"
);
var MAX_INSTAME_STYLE_REFERENCES = Number.parseInt(
  process.env.INSTAME_STYLE_REFERENCE_LIMIT || "2",
  10
);
var INTENSITY_TAG_PRIORITIES = {
  soft: ["soft_contrast", "understated", "delicate", "minimal_luxury", "quiet_luxury"],
  editorial: ["balanced_contrast", "modern_editorial", "quiet_luxury", "polished"],
  dramatic: ["dramatic_contrast", "cinematic", "statement", "editorial_night", "noir_luxe"]
};
var styleReferenceLibraryCache = null;
var styleReferenceImageCache = /* @__PURE__ */ new Map();
function normalizeSearchToken(input) {
  return input.toLowerCase().replace(/[_-]+/g, " ").trim();
}
function tokenizePromptTerms(input) {
  return input.toLowerCase().replace(/[_-]+/g, " ").split(/[^a-z0-9]+/).map((term) => term.trim()).filter((term) => term.length >= 3);
}
function loadStyleReferenceLibrary() {
  if (styleReferenceLibraryCache) {
    return styleReferenceLibraryCache;
  }
  if (!fs2.existsSync(STYLE_REFERENCE_LIBRARY_PATH)) {
    return null;
  }
  try {
    const raw = fs2.readFileSync(STYLE_REFERENCE_LIBRARY_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.references) || parsed.references.length === 0) {
      return null;
    }
    styleReferenceLibraryCache = {
      generatedAt: parsed.generatedAt,
      referenceCount: parsed.referenceCount,
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      references: parsed.references
    };
    return styleReferenceLibraryCache;
  } catch (error) {
    console.error("Failed to load style reference library:", error);
    return null;
  }
}
function getMimeTypeFromFilename(filePath) {
  const extension = path2.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}
function loadStyleReferenceImage(reference) {
  const cached = styleReferenceImageCache.get(reference.id);
  if (cached) return cached;
  const absolutePath = path2.resolve(process.cwd(), reference.file);
  if (!fs2.existsSync(absolutePath)) {
    return null;
  }
  try {
    const base64 = fs2.readFileSync(absolutePath).toString("base64");
    if (!base64) return null;
    const image = {
      base64,
      mimeType: getMimeTypeFromFilename(reference.file)
    };
    styleReferenceImageCache.set(reference.id, image);
    return image;
  } catch (error) {
    console.error(`Failed to read style reference image ${reference.id}:`, error);
    return null;
  }
}
function scoreStyleReference(reference, intensity, customPrompt) {
  const reasons = [];
  let score = 1;
  const intensityTags = INTENSITY_TAG_PRIORITIES[intensity];
  const allTags = [
    ...reference.styleTags,
    ...reference.vibeTags,
    ...reference.aestheticTags,
    ...reference.promptHints
  ].map(normalizeSearchToken);
  for (const priorityTag of intensityTags) {
    const normalizedPriority = normalizeSearchToken(priorityTag);
    if (allTags.some((tag) => tag.includes(normalizedPriority))) {
      score += 6;
      reasons.push(`intensity:${priorityTag}`);
    }
  }
  const customTokens = tokenizePromptTerms(customPrompt);
  for (const token of customTokens) {
    if (allTags.some((tag) => tag.includes(token))) {
      score += 3;
      reasons.push(`prompt:${token}`);
    }
  }
  if (reference.styleTags.includes("old_money")) {
    score += 2;
  }
  if (reference.styleTags.includes("luxury_editorial")) {
    score += 2;
  }
  return {
    score,
    matchReasons: Array.from(new Set(reasons))
  };
}
function selectStyleReferencesForTransform(options) {
  const library = loadStyleReferenceLibrary();
  if (!library || library.references.length === 0) {
    return [];
  }
  const withScores = library.references.map((reference) => {
    const { score, matchReasons } = scoreStyleReference(
      reference,
      options.intensity,
      options.customPrompt
    );
    return { ...reference, score, matchReasons };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
  const limit = Number.isInteger(MAX_INSTAME_STYLE_REFERENCES) && MAX_INSTAME_STYLE_REFERENCES > 0 ? Math.min(MAX_INSTAME_STYLE_REFERENCES, 4) : 2;
  const selected = [];
  for (const candidate of withScores) {
    if (selected.length >= limit) break;
    if (!loadStyleReferenceImage(candidate)) continue;
    selected.push(candidate);
  }
  return selected;
}
function toStyleReferenceImageParts(selectedReferences) {
  const parts = [];
  for (const reference of selectedReferences) {
    const image = loadStyleReferenceImage(reference);
    if (!image) continue;
    parts.push({
      inlineData: {
        mimeType: image.mimeType || "image/jpeg",
        data: image.base64
      }
    });
  }
  return parts;
}
function buildStyleReferenceContext(selectedReferences) {
  if (selectedReferences.length === 0) {
    return ["No internal style-board references available for this request."];
  }
  return selectedReferences.map((reference, index) => {
    const styleLine = reference.styleTags.slice(0, 4).join(", ");
    const vibeLine = reference.vibeTags.slice(0, 3).join(", ");
    const aestheticLine = reference.aestheticTags.slice(0, 3).join(", ");
    const hints = reference.promptHints.slice(0, 2).join(" | ");
    const paletteValues = Array.isArray(reference.metrics?.dominantPalette) ? reference.metrics.dominantPalette : [];
    const palette = paletteValues.length > 0 ? paletteValues.slice(0, 3).join(", ") : "not specified";
    return `Style reference ${index + 1} (${reference.id}): styles=${styleLine}; vibe=${vibeLine}; aesthetic=${aestheticLine}; palette=${palette}; hints=${hints}.`;
  });
}
function getInitialCredits() {
  if (Number.isInteger(DEFAULT_INITIAL_CREDITS) && DEFAULT_INITIAL_CREDITS > 0) {
    return DEFAULT_INITIAL_CREDITS;
  }
  return 6;
}
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function sanitizeUser(user) {
  const normalizedStyleGender = normalizeStyleGender(user.styleGender);
  const subscriptionState = serializeSubscriptionState(user);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.authProvider || "email",
    credits: user.credits,
    ...subscriptionState,
    styleGender: normalizedStyleGender || null,
    stylePreferences: Array.isArray(user.stylePreferences) ? user.stylePreferences : [],
    favoriteLooks: Array.isArray(user.favoriteLooks) ? user.favoriteLooks : [],
    notificationsEnabled: user.notificationsEnabled
  };
}
function resolveSubscriptionProvider(input) {
  if (!normalizeStringValue(input.subscriptionPlan)) {
    return null;
  }
  return normalizeStringValue(input.stripeSubscriptionId) ? "stripe" : "apple";
}
function serializeSubscriptionState(input) {
  return {
    subscription: normalizeStringValue(input.subscriptionPlan) || null,
    subscriptionProvider: resolveSubscriptionProvider(input),
    subscriptionRenewAt: input.subscriptionRenewAt ? input.subscriptionRenewAt.toISOString() : null
  };
}
function normalizeOutputMode(input) {
  return input === "text" ? "text" : "image";
}
function normalizeStyleGender(input) {
  const value = normalizeStringValue(input).toLowerCase();
  if (value === "female" || value === "male" || value === "non_binary") {
    return value;
  }
  return "";
}
function normalizeImageInputMode(input) {
  return input === "multi_item" ? "multi_item" : "single_item";
}
function normalizeTransformIntensity(input) {
  if (input === "soft" || input === "dramatic") {
    return input;
  }
  return "editorial";
}
function normalizeOwnStyleGenerationMode(input) {
  return input === "creative_prompt" ? "creative_prompt" : "reference_locked";
}
function resolveInstaMeStylePreset(input) {
  const presetId = normalizeStringValue(input);
  if (!presetId) {
    return getInstaMeStylePresetsFromCatalog()[0] || INSTAME_STYLE_PRESETS[0] || null;
  }
  return findCatalogStylePresetById(presetId) || findInstaMeStylePresetById(presetId) || null;
}
function normalizeStringValue(input) {
  if (typeof input === "string") return input.trim();
  if (Array.isArray(input)) {
    const first = input.find((entry) => typeof entry === "string");
    return first ? first.trim() : "";
  }
  return "";
}
var GRID_PROMPT_TERM_REPLACEMENTS = [
  // Nudity / body
  [/\bnudity\b/gi, "fully covered styling"],
  [/\bnude tones?\b/gi, "skin-tone neutrals"],
  [/\bnude\b/gi, "skin-tone beige"],
  [/\btopless\b/gi, "covered styling"],
  [/\bcleavage\b/gi, "deep neckline"],
  [/\bbikini\b/gi, "swimwear"],
  [/\bunderwear\b/gi, "styled set"],
  [/\blingerie\b/gi, "tailored fashion set"],
  [/\bboudoir\b/gi, "private-suite editorial"],
  [/\bnaked\b/gi, "styled"],
  [/\bbare skin\b/gi, "tonal skin"],
  [/\bbare\b/gi, "minimal"],
  // Sexual / erotic
  [/\bsexual\b/gi, "fashion editorial"],
  [/\bsex\b/gi, "fashion editorial"],
  [/\bsexy\b/gi, "glamorous"],
  [/\bseductive\b/gi, "refined"],
  [/\berotic\b/gi, "artistic"],
  [/\bsensual\b/gi, "elegant"],
  [/\balluring\b/gi, "captivating"],
  [/\bintimate\b/gi, "close editorial"],
  [/\bpassionate\b/gi, "emotional"],
  [/\bflirty\b/gi, "playful"],
  // Content policy misc
  [/\bnsfw\b/gi, "fashion-safe"],
  [/\bprovocative\b/gi, "confident"],
  [/\bexplicit\b/gi, "detailed"],
  [/\brevealing\b/gi, "fashion-forward"],
  [/\brisqué\b/gi, "bold editorial"]
];
function buildModerationSafeFallbackExtractionPrompt(params) {
  const { position, imageCount, type, aesthetic, palette, lightType, hasPortrait } = params;
  const GRID_COLS2 = 3;
  const totalRows = Math.ceil(imageCount / GRID_COLS2);
  const row = Math.ceil(position / GRID_COLS2);
  const col = (position - 1) % GRID_COLS2 + 1;
  const typeDesc = type === "SIMPLE" ? "minimalist flat-lay or object detail \u2014 no person in frame" : type === "MEDIUM" ? "tight portrait, face and shoulders, calm and refined" : "full or medium body in a styled fashion scene";
  const portraitInstruction = hasPortrait ? "\nCRITICAL IDENTITY RULE: Preserve the face and identity of the person in the provided reference portrait exactly." : "";
  return `Extract and recreate at full standalone resolution the single photo at position ${position} of ${imageCount} in the Instagram grid preview (first image provided).

EXACT POSITION: row ${row}, column ${col} (counting left to right, top to bottom).

SHOT TYPE: ${typeDesc}

OUTPUT REQUIREMENTS:
- Output ONLY this single standalone photo \u2014 no grid lines, no other cells, no borders
- 100% faithful to the composition, colors, lighting, and background of that exact cell
- ${aesthetic} aesthetic, palette (${palette}), ${lightType} lighting
- Ultra-detailed photorealistic portrait, shot with a professional camera
- Vertical portrait format (4:5 ratio)${portraitInstruction}`;
}
function sanitizeGridPromptText(input) {
  if (!input) return "";
  let sanitized = input;
  for (const [pattern, replacement] of GRID_PROMPT_TERM_REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function parseAppleMilliseconds(input) {
  const value = normalizeStringValue(input);
  if (!value) return 0;
  const numericValue = Number.parseInt(value, 10);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }
  const parsedDate = Date.parse(value);
  return Number.isFinite(parsedDate) ? parsedDate : 0;
}
function parseAppleBooleanFlag(input) {
  const value = normalizeStringValue(input).toLowerCase();
  if (!value) return null;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}
function normalizeUsageMap(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return Object.entries(input).reduce(
    (accumulator, [key, value]) => {
      const amount = Number(value);
      if (key.trim() && Number.isFinite(amount) && amount >= 0) {
        accumulator[key.trim()] = Math.floor(amount);
      }
      return accumulator;
    },
    {}
  );
}
function getRequestOrigin(req) {
  const forwardedProto = normalizeStringValue(firstHeaderValue(req.headers["x-forwarded-proto"]));
  const forwardedHost = normalizeStringValue(firstHeaderValue(req.headers["x-forwarded-host"]));
  const host = forwardedHost || normalizeStringValue(req.get("host"));
  const protocol = forwardedProto || req.protocol || "https";
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (!host) {
    return "";
  }
  return `${protocol}://${host}`;
}
function toCatalogAssetUrl(req, relativePath) {
  const assetParts = getCatalogRelativeAssetParts(relativePath);
  if (!assetParts) {
    return relativePath;
  }
  const origin = getRequestOrigin(req);
  if (!origin) {
    return relativePath;
  }
  const catalogVersion = normalizeStringValue(loadInstaMeStyleCatalog()?.generatedAt);
  const versionSuffix = catalogVersion ? `?v=${encodeURIComponent(catalogVersion)}` : "";
  return `${origin}/api/instame/style-asset/${encodeURIComponent(assetParts.styleId)}/${encodeURIComponent(
    assetParts.filename
  )}${versionSuffix}`;
}
function toRuntimeAssetUrl(req, image) {
  const runtimeAsset = createRuntimeAsset({
    base64: image.base64,
    mimeType: image.mimeType
  });
  const origin = getRequestOrigin(req);
  if (!origin) {
    throw new Error("PUBLIC_APP_URL is required for Together image operations on private images.");
  }
  return `${origin}/api/instame/runtime-image/${encodeURIComponent(runtimeAsset.token)}`;
}
function resolveGenerationResolution(generationTierId) {
  if (generationTierId === "excellent") {
    return { width: 3072, height: 3072, sizeLabel: "3072x3072" };
  }
  if (generationTierId === "best") {
    return { width: 1536, height: 1536, sizeLabel: "1536x1536" };
  }
  return { width: INSTAME_HIGH_RES_OUTPUT_DIMENSION, height: INSTAME_HIGH_RES_OUTPUT_DIMENSION, sizeLabel: `${INSTAME_HIGH_RES_OUTPUT_DIMENSION}x${INSTAME_HIGH_RES_OUTPUT_DIMENSION}` };
}
function resolveOpenAiSize(generationTierId) {
  return "1024x1024";
}
function resolveGeminiImageGenerationForTier(generationTierId) {
  if (generationTierId === "excellent") {
    return { model: GEMINI_PRO_IMAGE_MODEL, imageSize: "4K" };
  }
  if (generationTierId === "best") {
    return { model: GEMINI_PRO_IMAGE_MODEL, imageSize: "2K" };
  }
  return { model: INSTAME_PRIMARY_GEMINI_IMAGE_MODEL, imageSize: "1K" };
}
var OWN_STYLE_ANALYSIS_PROMPT = [
  "Analyze this style-reference image in English from the perspective of an elite-level professional photographer and fashion art director.",
  "Be extremely concrete and observational.",
  "Include the exact body pose, shoulder line, torso angle, hand placement, head angle, eye direction, facial expression, facial micro-expression, and exactly how the hair falls or is arranged.",
  "Also describe wardrobe, lighting pattern, camera angle, lens feeling, framing, composition, background treatment, mood, color palette, texture, and the overall aesthetic.",
  "Write a rich, detailed English analysis that can be reused as style direction for a separate image generation step.",
  "Do not ask questions. Do not mention limitations. Return only the analysis."
].join(" ");
var CREATIVE_OWN_STYLE_ANALYSIS_PROMPT = [
  "Analyze this style-reference image in English as an elite fashion photographer and art director.",
  "Be extremely concrete and exhaustive.",
  "Describe exactly the body pose, shoulder and torso angles, hand placement, leg placement, head tilt, eye direction, facial expression, facial micro-expression, and hair arrangement (exclude hair color).",
  "Also describe wardrobe pieces and materials, lighting setup, camera angle, lens feeling, framing, subject-to-camera distance, composition geometry, background elements, mood, color palette, texture, and finish.",
  "Create a Color Lock section that lists the dominant visual elements and their exact colors or hues (for example: bouquet flowers, clothing pieces, accessories, props, and key background accents).",
  "These locked colors are mandatory for generation unless the user explicitly requests a color change.",
  "Write it as precise visual direction so the style can be replicated 1:1 without omissions or reinterpretations.",
  "Return only the analysis."
].join(" ");
function normalizeStringList(input) {
  if (!Array.isArray(input)) return [];
  return input.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean);
}
function getInstaMeDebugTraceEmails() {
  const configured = normalizeStringList(
    (process.env.INSTAME_DEBUG_TRACE_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
  );
  return Array.from(
    new Set(
      [...DEFAULT_ALLOWED_DEV_CREDIT_EMAILS, ...configured].map((value) => value.trim().toLowerCase()).filter(Boolean)
    )
  );
}
function createInstaMeDebugTraceContext(req, route, ownStyleMode) {
  if (!INSTAME_DEBUG_TRACE_ENABLED) {
    return null;
  }
  const email = normalizeStringValue(req.user?.email).toLowerCase();
  if (!email) {
    return null;
  }
  const allowedEmails = getInstaMeDebugTraceEmails();
  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
    return null;
  }
  return {
    requestId: (0, import_node_crypto2.randomUUID)(),
    route,
    userId: req.user?.id || "",
    email,
    ownStyleMode
  };
}
function logInstaMeDebugTrace(context, stage, details) {
  if (!context) {
    return;
  }
  console.info(
    "[instame-debug]",
    JSON.stringify({
      requestId: context.requestId,
      route: context.route,
      userId: context.userId,
      email: context.email,
      ownStyleMode: context.ownStyleMode || null,
      stage,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...details || {}
    })
  );
}
function getOwnStyleTracePrefix(context) {
  if (!context?.ownStyleMode) {
    return "own_style.unknown";
  }
  return `own_style.${context.ownStyleMode}`;
}
function extractGeminiUsageMetrics(responseJson) {
  const root = getObjectRecord2(responseJson);
  const usage = getObjectRecord2(root?.usageMetadata);
  if (!usage) return null;
  const toOptionalNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  };
  const metrics = {
    promptTokenCount: toOptionalNumber(usage.promptTokenCount),
    candidatesTokenCount: toOptionalNumber(usage.candidatesTokenCount),
    totalTokenCount: toOptionalNumber(usage.totalTokenCount),
    thoughtsTokenCount: toOptionalNumber(usage.thoughtsTokenCount),
    cachedContentTokenCount: toOptionalNumber(usage.cachedContentTokenCount)
  };
  return Object.values(metrics).some((value) => typeof value === "number") ? metrics : null;
}
function isDevCreditGrantEnabled() {
  const override = normalizeStringValue(process.env.ENABLE_DEV_CREDIT_GRANTS).toLowerCase();
  if (override === "1" || override === "true" || override === "yes") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}
function getAllowedDevCreditGrantEmails() {
  const configured = normalizeStringList(
    (process.env.DEV_CREDIT_GRANT_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
  );
  return Array.from(
    new Set(
      [...DEFAULT_ALLOWED_DEV_CREDIT_EMAILS, ...configured].map((value) => value.trim().toLowerCase()).filter(Boolean)
    )
  );
}
function isDevCreditGrantAllowedForEmail(email) {
  const normalizedEmail = normalizeStringValue(email).toLowerCase();
  if (!normalizedEmail) return false;
  return getAllowedDevCreditGrantEmails().includes(normalizedEmail);
}
function resolveDevCreditGrantAmount(input) {
  const requestedAmount = Number(input);
  if (Number.isInteger(requestedAmount) && requestedAmount > 0) {
    return Math.min(requestedAmount, MAX_DEV_CREDIT_GRANT);
  }
  if (Number.isInteger(DEFAULT_DEV_CREDIT_GRANT) && DEFAULT_DEV_CREDIT_GRANT > 0) {
    return Math.min(DEFAULT_DEV_CREDIT_GRANT, MAX_DEV_CREDIT_GRANT);
  }
  return 50;
}
function normalizeRequestedItems(input) {
  if (!Array.isArray(input)) return [];
  return input.filter((entry) => Boolean(entry) && typeof entry === "object").map((entry) => {
    const name = normalizeStringValue(entry.name);
    const category = normalizeStringValue(entry.category);
    const color = normalizeStringValue(entry.color);
    const description = normalizeStringValue(entry.description);
    if (!name && !category && !color && !description) return null;
    return {
      name: name || "Unspecified item",
      category: category || "unspecified category",
      color: color || "unspecified color",
      description: description || void 0
    };
  }).filter((entry) => Boolean(entry));
}
function normalizeUploadedImages(input, imageInputMode) {
  if (!Array.isArray(input)) return [];
  const maxAllowed = MAX_IMAGE_COUNT_BY_MODE[imageInputMode];
  const sanitized = input.map((entry) => {
    if (typeof entry === "string") {
      const base642 = entry.trim();
      if (!base642) return null;
      return { base64: base642, mimeType: "image/jpeg" };
    }
    if (!entry || typeof entry !== "object") return null;
    const maybeEntry = entry;
    const base64 = typeof maybeEntry.base64 === "string" ? maybeEntry.base64.trim() : "";
    if (!base64) return null;
    const mimeType = typeof maybeEntry.mimeType === "string" && maybeEntry.mimeType.startsWith("image/") ? maybeEntry.mimeType : "image/jpeg";
    const width = Number(maybeEntry.width);
    const height = Number(maybeEntry.height);
    return {
      base64,
      mimeType,
      width: Number.isFinite(width) && width > 0 ? Math.round(width) : void 0,
      height: Number.isFinite(height) && height > 0 ? Math.round(height) : void 0
    };
  }).filter((value) => Boolean(value));
  if (sanitized.length > maxAllowed) {
    throw new Error(`You can upload up to ${maxAllowed} image(s) for this image mode.`);
  }
  const withinSizeLimit = sanitized.filter((image) => image.base64.length <= MAX_IMAGE_BASE64_LENGTH);
  const skippedCount = sanitized.length - withinSizeLimit.length;
  if (skippedCount > 0 && process.env.NODE_ENV !== "production") {
    console.warn(`Skipped ${skippedCount} oversized uploaded image(s)`);
  }
  return withinSizeLimit;
}
function stripDataUriPrefix(base64OrDataUri) {
  const commaIndex = base64OrDataUri.indexOf(",");
  return commaIndex >= 0 ? base64OrDataUri.slice(commaIndex + 1) : base64OrDataUri;
}
function estimateBase64Bytes(base64) {
  const sanitized = stripDataUriPrefix(base64).replace(/\s+/g, "");
  if (!sanitized) return 0;
  const padding = sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0;
  return Math.floor(sanitized.length * 3 / 4) - padding;
}
function normalizeStoredInstaMeUploadedImages(input) {
  if (!Array.isArray(input)) return [];
  return input.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const candidate = entry;
    const id = normalizeStringValue(candidate.id);
    const mimeType = typeof candidate.mimeType === "string" && candidate.mimeType.startsWith("image/") ? candidate.mimeType : "image/jpeg";
    const base64 = stripDataUriPrefix(normalizeStringValue(candidate.base64)).replace(/\s+/g, "");
    const previewBase64 = stripDataUriPrefix(
      normalizeStringValue(candidate.previewBase64) || base64
    ).replace(/\s+/g, "");
    const kind = candidate.kind === "enhanced" ? "enhanced" : candidate.kind === "own_style" ? "own_style" : candidate.kind === "generation" ? "generation" : "uploaded";
    const analyzedPromptRaw = normalizeStringValue(candidate.analyzedPrompt).slice(0, MAX_INSTAME_OWN_STYLE_PROMPT_LENGTH);
    const analyzedPrompt = kind === "own_style" ? analyzedPromptRaw || buildOwnStyleFallbackAnalysisPrompt() : analyzedPromptRaw;
    const analysisMode = candidate.analysisMode === "creative_prompt" || candidate.analysisMode === "reference_locked" ? candidate.analysisMode : void 0;
    const analysisVersion = Number(candidate.analysisVersion);
    const imageHash = normalizeStringValue(candidate.imageHash);
    const firstUseSurchargeChargedRaw = candidate.firstUseSurchargeCharged;
    const name = normalizeStringValue(candidate.name) || (kind === "own_style" ? "Own Style" : "Portrait");
    const width = Number(candidate.width);
    const height = Number(candidate.height);
    const fileSizeBytes = Number(candidate.fileSizeBytes);
    const createdAt = normalizeStringValue(candidate.createdAt);
    const firstUseSurchargeCharged = kind === "own_style" ? typeof firstUseSurchargeChargedRaw === "boolean" ? firstUseSurchargeChargedRaw : true : void 0;
    const styleLabel = normalizeStringValue(candidate.styleLabel).slice(0, 120);
    const stylePresetId = normalizeStringValue(candidate.stylePresetId).slice(0, 80);
    const ownStyleId = normalizeStringValue(candidate.ownStyleId).slice(0, 80);
    const artStyleId = normalizeStringValue(candidate.artStyleId).slice(0, 80);
    const customPrompt = normalizeStringValue(candidate.customPrompt).slice(0, 2e3);
    const creditsChargedRaw = Number(candidate.creditsCharged);
    const generationSource = normalizeStringValue(candidate.generationSource).slice(0, 40);
    if (!id || !base64 || !previewBase64) return null;
    if (!Number.isFinite(width) || width <= 0) return null;
    if (!Number.isFinite(height) || height <= 0) return null;
    return {
      id,
      name,
      kind,
      mimeType,
      base64,
      previewBase64,
      width: Math.min(Math.round(width), MAX_INSTAME_LIBRARY_IMAGE_DIMENSION),
      height: Math.min(Math.round(height), MAX_INSTAME_LIBRARY_IMAGE_DIMENSION),
      fileSizeBytes: Number.isFinite(fileSizeBytes) && fileSizeBytes > 0 ? Math.round(fileSizeBytes) : estimateBase64Bytes(base64),
      analyzedPrompt: analyzedPrompt || void 0,
      analysisMode,
      analysisVersion: Number.isInteger(analysisVersion) && analysisVersion > 0 ? analysisVersion : void 0,
      imageHash: imageHash || void 0,
      firstUseSurchargeCharged,
      styleLabel: kind === "generation" && styleLabel ? styleLabel : void 0,
      stylePresetId: kind === "generation" && stylePresetId ? stylePresetId : void 0,
      ownStyleId: kind === "generation" && ownStyleId ? ownStyleId : void 0,
      artStyleId: kind === "generation" && artStyleId ? artStyleId : void 0,
      customPrompt: kind === "generation" && customPrompt ? customPrompt : void 0,
      creditsCharged: kind === "generation" && Number.isFinite(creditsChargedRaw) && creditsChargedRaw > 0 ? Math.round(creditsChargedRaw) : void 0,
      generationSource: kind === "generation" && generationSource ? generationSource : void 0,
      createdAt: createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
  }).filter((entry) => Boolean(entry)).slice(0, MAX_INSTAME_LIBRARY_IMAGES_TOTAL);
}
function toInstaMePackThumbUri(image) {
  if (!image) return null;
  const data = (image.previewBase64 || image.inlineBase64 || "").trim();
  if (!data) return null;
  const mimeType = image.mimeType && image.mimeType.startsWith("image/") ? image.mimeType : "image/png";
  return `data:${mimeType};base64,${data}`;
}
async function resolveInstaMePackImageBytes(userId, packId, imageId) {
  const [image] = await db.select().from(instamePackImages).where(
    (0, import_drizzle_orm3.and)(
      (0, import_drizzle_orm3.eq)(instamePackImages.id, imageId),
      (0, import_drizzle_orm3.eq)(instamePackImages.packId, packId),
      (0, import_drizzle_orm3.eq)(instamePackImages.userId, userId)
    )
  );
  if (!image) {
    return null;
  }
  let buffer = null;
  let contentType = image.mimeType || "image/png";
  if (image.storageKey) {
    const object = await getObject(image.storageKey);
    if (object) {
      buffer = object.body;
      contentType = object.contentType || contentType;
    }
  }
  if (!buffer && image.inlineBase64) {
    buffer = Buffer.from(image.inlineBase64, "base64");
  }
  if (!buffer && image.previewBase64) {
    buffer = Buffer.from(image.previewBase64, "base64");
  }
  if (!buffer) {
    return null;
  }
  return { buffer, contentType };
}
async function deleteInstaMePacks(userId, packIds) {
  if (packIds.length === 0) return;
  const images = await db.select({ storageKey: instamePackImages.storageKey }).from(instamePackImages).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(instamePackImages.userId, userId), (0, import_drizzle_orm3.inArray)(instamePackImages.packId, packIds)));
  for (const image of images) {
    if (image.storageKey) {
      try {
        await deleteObject(image.storageKey);
      } catch (error) {
        console.error("[instame-packs] failed to delete bucket object:", error);
      }
    }
  }
  await db.delete(instamePacks).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(instamePacks.userId, userId), (0, import_drizzle_orm3.inArray)(instamePacks.id, packIds)));
}
function toInstaMeUploadedImageSummary(image) {
  return {
    id: image.id,
    name: image.name,
    kind: image.kind || "uploaded",
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    fileSizeBytes: image.fileSizeBytes,
    createdAt: image.createdAt,
    previewUri: `data:${image.mimeType};base64,${image.previewBase64}`,
    styleLabel: image.styleLabel,
    stylePresetId: image.stylePresetId,
    ownStyleId: image.ownStyleId,
    artStyleId: image.artStyleId,
    customPrompt: image.customPrompt,
    creditsCharged: image.creditsCharged,
    generationSource: image.generationSource
  };
}
function toInstaMeOwnStyleSummary(image) {
  const promptPreview = normalizeStringValue(image.analyzedPrompt).replace(/\s+/g, " ").trim().slice(0, 180);
  return {
    id: image.id,
    name: image.name || "Own Style",
    mimeType: image.mimeType,
    createdAt: image.createdAt,
    previewUri: `data:${image.mimeType};base64,${image.previewBase64}`,
    promptPreview,
    imageHash: normalizeStringValue(image.imageHash) || void 0,
    firstUseSurchargePending: image.firstUseSurchargeCharged === false
  };
}
function computeImageHash(base64) {
  const normalized = stripDataUriPrefix(base64).replace(/\s+/g, "");
  if (!normalized) return "";
  return (0, import_node_crypto2.createHash)("sha256").update(normalized).digest("hex");
}
function normalizeOwnStyleSavePayload(input) {
  if (!input || typeof input !== "object") return null;
  const candidate = input;
  const previewBase64 = stripDataUriPrefix(
    normalizeStringValue(candidate.previewBase64) || normalizeStringValue(candidate.base64)
  );
  const mimeType = typeof candidate.mimeType === "string" && String(candidate.mimeType).startsWith("image/") ? String(candidate.mimeType) : "image/jpeg";
  const width = Number(candidate.width);
  const height = Number(candidate.height);
  const fileSizeBytes = Number(candidate.fileSizeBytes);
  if (!previewBase64) return null;
  if (!Number.isFinite(width) || width <= 0) return null;
  if (!Number.isFinite(height) || height <= 0) return null;
  return {
    name: normalizeStringValue(candidate.name) || "Own Style",
    mimeType,
    previewBase64,
    width: Math.min(Math.round(width), MAX_INSTAME_LIBRARY_IMAGE_DIMENSION),
    height: Math.min(Math.round(height), MAX_INSTAME_LIBRARY_IMAGE_DIMENSION),
    fileSizeBytes: Number.isFinite(fileSizeBytes) && fileSizeBytes > 0 ? Math.round(fileSizeBytes) : estimateBase64Bytes(previewBase64)
  };
}
function buildSavedOwnStyleRecord(options) {
  return {
    id: (0, import_node_crypto2.randomUUID)(),
    name: options.stylePayload?.name || "Own Style",
    kind: "own_style",
    mimeType: options.stylePayload?.mimeType || "image/jpeg",
    base64: options.stylePayload?.previewBase64 || "",
    previewBase64: options.stylePayload?.previewBase64 || "",
    width: options.stylePayload?.width || 1,
    height: options.stylePayload?.height || 1,
    fileSizeBytes: options.stylePayload?.fileSizeBytes || 0,
    analyzedPrompt: options.analyzedPrompt.slice(0, MAX_INSTAME_OWN_STYLE_PROMPT_LENGTH),
    analysisMode: options.ownStyleMode,
    analysisVersion: OWN_STYLE_ANALYSIS_VERSIONS[options.ownStyleMode],
    imageHash: computeImageHash(options.stylePayload?.previewBase64 || ""),
    firstUseSurchargeCharged: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function upsertOwnStyleRecord(options) {
  const duplicate = options.existingImages.find(
    (entry) => entry.kind === "own_style" && (normalizeStringValue(entry.imageHash) ? normalizeStringValue(entry.imageHash) === normalizeStringValue(options.savedOwnStyle.imageHash) : entry.previewBase64 === options.savedOwnStyle.previewBase64)
  );
  const nextOwnStyle = duplicate ? {
    ...duplicate,
    name: options.savedOwnStyle.name,
    mimeType: options.savedOwnStyle.mimeType,
    previewBase64: options.savedOwnStyle.previewBase64,
    base64: options.savedOwnStyle.base64,
    width: options.savedOwnStyle.width,
    height: options.savedOwnStyle.height,
    fileSizeBytes: options.savedOwnStyle.fileSizeBytes,
    analyzedPrompt: options.savedOwnStyle.analyzedPrompt,
    analysisMode: options.savedOwnStyle.analysisMode,
    analysisVersion: options.savedOwnStyle.analysisVersion,
    imageHash: options.savedOwnStyle.imageHash,
    firstUseSurchargeCharged: typeof duplicate.firstUseSurchargeCharged === "boolean" ? duplicate.firstUseSurchargeCharged : options.savedOwnStyle.firstUseSurchargeCharged,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  } : options.savedOwnStyle;
  const nonOwnStyleImages = options.existingImages.filter((entry) => entry.kind !== "own_style");
  const previousOwnStyles = options.existingImages.filter(
    (entry) => entry.kind === "own_style" && entry.id !== nextOwnStyle.id
  );
  const nextOwnStyles = [nextOwnStyle, ...previousOwnStyles].slice(0, MAX_INSTAME_OWN_STYLES);
  return {
    savedOwnStyle: nextOwnStyle,
    nextImages: [...nextOwnStyles, ...nonOwnStyleImages].slice(0, MAX_INSTAME_LIBRARY_IMAGES_TOTAL)
  };
}
function markOwnStyleFirstUseSurchargeCharged(images, styleId) {
  let updatedRecord = null;
  let changed = false;
  const nextImages = images.map((entry) => {
    if (entry.kind !== "own_style" || entry.id !== styleId) {
      return entry;
    }
    if (entry.firstUseSurchargeCharged === true) {
      updatedRecord = entry;
      return entry;
    }
    changed = true;
    const nextEntry = {
      ...entry,
      firstUseSurchargeCharged: true
    };
    updatedRecord = nextEntry;
    return nextEntry;
  });
  return {
    images: changed ? nextImages : images,
    updated: updatedRecord
  };
}
function sanitizeStylingResponse(raw) {
  const fallback = {
    lookName: "Curated Signature Look",
    description: "A polished outfit with strong proportions, coordinated tones, and a clean finish.",
    tips: [
      "Use contrast in texture to add depth.",
      "Keep accessories intentional and minimal.",
      "Balance structure with one softer piece."
    ],
    imagePrompt: "High-fashion editorial photo of a model in a cohesive outfit, soft focus, clean studio background, full body, realistic fabrics.",
    usedPieces: []
  };
  if (!raw || typeof raw !== "object") return fallback;
  const parsed = raw;
  const lookName = normalizeStringValue(parsed.lookName) || fallback.lookName;
  const description = normalizeStringValue(parsed.description) || fallback.description;
  const imagePrompt = normalizeStringValue(parsed.imagePrompt) || fallback.imagePrompt;
  const tips = normalizeStringList(parsed.tips).slice(0, 4);
  const usedPieces = normalizeStringList(parsed.usedPieces);
  return {
    lookName,
    description,
    imagePrompt,
    tips: tips.length > 0 ? tips : fallback.tips,
    usedPieces
  };
}
function tryParseJsonObject(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const maybeJson = trimmed.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(maybeJson);
      } catch {
        return {};
      }
    }
    return {};
  }
}
function buildStylePrompt(options) {
  const itemLines = options.items.map((item, index) => {
    const descriptionPart = normalizeStringValue(item.description);
    return `${index + 1}. ${item.name} (${item.category}, ${item.color}${descriptionPart ? `, ${descriptionPart}` : ""})`;
  });
  const promptParts = [];
  if (options.hasReferenceImages) {
    promptParts.push(
      "Using the attached image(s), select garments visible in them to create a brand-new outfit from scratch, following the instructions below:"
    );
  }
  promptParts.push(
    "You are Law Roach, a world-class celebrity stylist.",
    "Create one high-impact outfit using at least two clothing pieces whenever possible.",
    "Respond in English only.",
    "Do not include disclaimers, AI references, roleplay intros, or markdown.",
    "Return ONLY valid JSON with this exact schema:",
    `{
  "lookName": "short outfit title",
  "description": "2-4 concise sentences that describe the final styling",
  "tips": ["3 to 4 concise actionable tips"],
  "usedPieces": ["list each selected/required piece used in the look"],
  "imagePrompt": "clean, production-ready prompt for generating one ${STYLE_IMAGE_SIZE} image with soft focus and clean background"
}`,
    "Styling requirements:",
    `- Occasion: ${options.occasion || "Any occasion"}`,
    `- Client gender expression: ${options.gender ? options.gender.replace(/_/g, " ") : "Not specified"}`,
    `- Event details: ${options.event || "No extra event details"}`,
    `- Season: ${options.season || "No specific season"}`,
    `- Aesthetic: ${options.aesthetic || "No specific aesthetic"}`,
    `- Preferred color palette: ${options.colorPalette || "No fixed palette"}`,
    `- Required pieces: ${options.requiredPieces.length > 0 ? options.requiredPieces.join(", ") : "None explicitly required"}`
  );
  if (options.hasReferenceImages) {
    promptParts.push("Reference image rules (MANDATORY):");
    promptParts.push(
      "- Treat uploaded image(s) as the source of truth for the main garments. Select clothing from those images first."
    );
    promptParts.push(
      "- Keep garment identity faithful to reference image(s): same silhouette, cut, fabric feel, pattern, and base colors."
    );
    promptParts.push(
      "- Do not redesign, replace, or remap the primary garments from reference image(s) with different items."
    );
    promptParts.push(
      "- Optional additions are allowed only for missing finishing pieces (for example: belt, shoes, subtle accessories)."
    );
    if (options.imageInputMode === "multi_item") {
      promptParts.push(
        "- Multi-image mode: combine garments across uploaded images into one coherent outfit, preserving each selected garment."
      );
    } else {
      promptParts.push("- Single-image mode: prioritize garments visible in the uploaded image.");
    }
    promptParts.push(
      '- In "usedPieces", list reference-derived garments first; mark optional new additions with "(added)".'
    );
  }
  if (itemLines.length > 0) {
    promptParts.push("Available wardrobe pieces:");
    promptParts.push(itemLines.join("\n"));
  } else {
    promptParts.push("No structured wardrobe list was provided. Infer pieces from text/image inputs.");
  }
  if (options.originalDescription) {
    promptParts.push(`Original outfit description: ${options.originalDescription}`);
  }
  if (options.originalTips && options.originalTips.length > 0) {
    promptParts.push(`Original tips: ${options.originalTips.join(" | ")}`);
  }
  if (options.forceModifyRequest) {
    promptParts.push(`Requested modifications: ${options.forceModifyRequest}`);
  }
  if (options.customPrompt) {
    promptParts.push(`Additional user request: ${options.customPrompt}`);
  }
  if (options.outputMode === "image") {
    promptParts.push(
      `The imagePrompt must be optimized for a single ${STYLE_IMAGE_SIZE} realistic editorial fashion shot with soft focus and a clean background.`
    );
  } else {
    promptParts.push("Prioritize concise and practical styling text output.");
  }
  return promptParts.join("\n");
}
function toGeminiInlineImageParts(uploadedImages) {
  return uploadedImages.map((image) => ({
    inlineData: {
      mimeType: image.mimeType || "image/jpeg",
      data: image.base64
    }
  }));
}
function buildImageGenerationPrompt(options) {
  const basePrefix = `High-fashion editorial portrait, full-body model, soft focus, clean background, 1:1 composition, ${STYLE_IMAGE_SIZE}`;
  const detailLabel = options.isModification ? "Modified outfit details" : "Outfit details";
  const selectedPiecesLine = options.usedPieces.length > 0 ? `Selected pieces: ${options.usedPieces.join(", ")}.` : "Selected pieces: derive them from the reference image(s).";
  if (!options.hasReferenceImages) {
    return `${basePrefix}, ${selectedPiecesLine} ${detailLabel.toLowerCase()}: ${options.imagePrompt}`;
  }
  const leadInstruction = "Using the attached image(s), select garments visible in them to create a brand-new outfit from scratch, following the instructions below:";
  const modeLine = options.imageInputMode === "multi_item" ? "When multiple reference images are provided, use garments from those images without changing their identity." : "Use garments from the single reference image as the primary outfit pieces.";
  return [
    leadInstruction,
    basePrefix,
    "Reference-image constraints (MANDATORY): use uploaded image(s) as the source for primary garments.",
    "Do not remodel or replace core garments; keep silhouette, cut, fabric feel, patterns, and base colors faithful.",
    modeLine,
    selectedPiecesLine,
    "You may add only minimal finishing pieces if absent (belt, shoes, subtle accessories).",
    `${detailLabel}: ${options.imagePrompt}`
  ].join("\n");
}
function buildOldMoneyTransformPrompt(options) {
  const intensityGuide = {
    soft: "subtle upgrade, understated palette, clean tailoring, minimal accessories",
    editorial: "balanced old money luxury, premium textures, polished silhouette, refined styling",
    dramatic: "high-impact old money editorial, cinematic light, statement tailoring, maximal luxury details"
  };
  const backgroundRule = options.preserveBackground ? "Keep the original background recognizable and natural." : "You may refine the background with elegant, neutral old-money ambiance.";
  const hasUserDirection = Boolean(options.customPrompt && options.customPrompt.trim());
  const stylePresetLine = options.stylePresetLabel ? `Selected style preset: ${options.stylePresetLabel}.` : "No explicit style preset selected.";
  const stylePresetHintLine = options.stylePresetPromptHint ? `Preset guidance: ${options.stylePresetPromptHint}.` : "No extra preset guidance.";
  const styleReferenceContext = buildStyleReferenceContext(options.styleReferences);
  const styleReferenceCount = options.styleReferences.length;
  const styleOrderLine = styleReferenceCount > 0 ? `- First ${styleReferenceCount} image(s): style references (pose, hair styling structure, palette, light, vibe, aesthetic).` : "- No additional style-reference images are attached for this request.";
  return [
    "Transform the attached photo into an old money luxury style image.",
    "Image order is mandatory:",
    styleOrderLine,
    "- Last image: target subject to preserve.",
    "Apply pose language, facial expression energy, styling mood, and lighting direction from style references to the target subject.",
    "Keep the target subject identity unchanged: preserve face shape, skin tone, facial details, and hair color from the target subject image.",
    "Hair guidance: transfer only hair structure/coafing from style reference, never copy style-reference hair color.",
    "Clothing guidance: perform only subtle outfit updates; keep changes tasteful and realistic.",
    "Keep identity, face, body shape, age appearance, and pose faithful to the original subject.",
    "Do not create extra people, duplicate limbs, or distorted anatomy.",
    "Preserve realistic skin texture and natural proportions.",
    "Use premium materials and classic old-money fashion cues: cashmere, wool, silk, tailored coats, elegant neutrals.",
    stylePresetLine,
    stylePresetHintLine,
    `Intensity: ${intensityGuide[options.intensity]}.`,
    backgroundRule,
    "Internal style-board descriptors:",
    ...styleReferenceContext,
    `Output one photorealistic image, ${options.sizeLabel || STYLE_IMAGE_SIZE}, with coherent light and color grading.`,
    ...hasUserDirection ? [
      "",
      "IMPORTANT \u2014 The user has requested the following specific changes. These take PRIORITY over the preset styling above. Apply them to the final result even if they contradict parts of the preset:",
      options.customPrompt.trim()
    ] : []
  ].join("\n");
}
function buildPromptOnlyPresetTransformPrompt(options) {
  const hasUserDirection = Boolean(options.customPrompt && options.customPrompt.trim());
  return [
    `Use the uploaded face photo as the only visual identity source for the ${options.presetLabel} transformation.`,
    "Preserve the exact facial identity, skin tone, facial structure, and the original hair color of the uploaded subject.",
    "Do not copy another person's facial traits. Keep the same person recognizable.",
    "Use the uploaded photo only as the identity anchor; do not use any external style-reference images for this generation.",
    "Hair guidance: you may adapt styling structure only if the prompt asks for it, but never recolor the subject's hair.",
    "Wardrobe guidance: only make tasteful, realistic outfit changes.",
    options.preserveBackground ? "Keep the original environment recognizable unless the prompt strongly requires a different scene." : "You may adapt the environment to match the prompt more closely.",
    `Requested output tier: ${options.generationTierId === "high_res" ? "High Res" : "Preview"}.`,
    options.variantPrompt,
    ...hasUserDirection ? [
      "",
      "IMPORTANT \u2014 The user has requested the following specific changes. These take PRIORITY over the preset styling above. Apply them to the final result even if they contradict parts of the preset prompt:",
      options.customPrompt.trim()
    ] : []
  ].join("\n");
}
function buildInstaMeEditPrompt(options) {
  const extraUserDirection = options.customPrompt ? `Original generation notes: ${options.customPrompt}.` : "No original generation notes.";
  return [
    "Edit the provided InstaMe portrait while keeping the same person fully recognizable.",
    "Preserve face shape, skin tone, facial features, hair color, age appearance, and overall identity.",
    "Do not add extra people, text, watermarks, duplicate limbs, or distorted anatomy.",
    "Keep the result photorealistic and premium.",
    extraUserDirection,
    `Requested edit: ${options.editInstruction}`
  ].join("\n");
}
var cachedPortraitEnhancePrompt = "";
function getPortraitEnhancePromptTemplate() {
  if (cachedPortraitEnhancePrompt) {
    return cachedPortraitEnhancePrompt;
  }
  try {
    cachedPortraitEnhancePrompt = fs2.readFileSync(INSTAME_PORTRAIT_ENHANCE_PROMPT_PATH, "utf8").replace(/\u00C2/g, "").trim();
  } catch (error) {
    throw new Error(
      `Portrait enhance prompt file is missing at ${INSTAME_PORTRAIT_ENHANCE_PROMPT_PATH}: ${toErrorMessage(error, "Could not read prompt file")}`
    );
  }
  return cachedPortraitEnhancePrompt;
}
function buildPortraitEnhancePrompt() {
  const basePrompt = getPortraitEnhancePromptTemplate();
  return [
    "Edit the uploaded selfie into a cleaner, more AI-stable portrait base image for future styled generations.",
    "Use only the uploaded selfie as the source image.",
    "Preserve the same person exactly: keep identity, hair color, age appearance, face shape, skin tone, expression, pose, outfit, framing, and background recognizable.",
    "Do not change camera angle, crop, clothing, or background details.",
    "Do not add extra people, text, jewelry, accessories, watermarks, or anatomy distortions.",
    `Output one premium photorealistic portrait at ${INSTAME_PORTRAIT_ENHANCE_SIZE}.`,
    basePrompt
  ].join("\n\n");
}
function getObjectRecord2(value) {
  return value && typeof value === "object" ? value : null;
}
function extractGeminiText(responseJson) {
  const root = getObjectRecord2(responseJson);
  if (!root) return "";
  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  for (const candidate of candidates) {
    const candidateRecord = getObjectRecord2(candidate);
    const content = getObjectRecord2(candidateRecord?.content);
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    for (const part of parts) {
      const partRecord = getObjectRecord2(part);
      const text2 = partRecord?.text;
      if (typeof text2 === "string" && text2.trim().length > 0) {
        return text2;
      }
    }
  }
  return "";
}
function extractGeminiImageBase64(responseJson) {
  const root = getObjectRecord2(responseJson);
  if (!root) return void 0;
  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  for (const candidate of candidates) {
    const candidateRecord = getObjectRecord2(candidate);
    const content = getObjectRecord2(candidateRecord?.content);
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    for (const part of parts) {
      const partRecord = getObjectRecord2(part);
      const inlineData = getObjectRecord2(partRecord?.inlineData);
      const mimeType = inlineData?.mimeType;
      const data = inlineData?.data;
      if (typeof mimeType === "string" && mimeType.startsWith("image/") && typeof data === "string" && data.length > 0) {
        return data;
      }
    }
  }
  return void 0;
}
async function generateGeminiContent(options) {
  const apiKey = getGeminiApiKey();
  const rawModelName = normalizeStringValue(options.model);
  const modelName = rawModelName.startsWith("models/") ? rawModelName.slice("models/".length) : rawModelName;
  if (!modelName) {
    throw new Error("Gemini model name is missing.");
  }
  const url = `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(modelName)}:generateContent`;
  const generationConfig = {};
  if (options.responseMimeType) {
    generationConfig.responseMimeType = options.responseMimeType;
  }
  if (Number.isFinite(options.maxOutputTokens)) {
    generationConfig.maxOutputTokens = options.maxOutputTokens;
  }
  if (typeof options.temperature === "number") {
    generationConfig.temperature = options.temperature;
  }
  if (Array.isArray(options.responseModalities) && options.responseModalities.length > 0) {
    generationConfig.responseModalities = options.responseModalities;
  }
  if (options.imageSize || options.aspectRatio) {
    const imageConfig = {};
    if (options.imageSize) {
      imageConfig.imageSize = options.imageSize;
    }
    if (options.aspectRatio) {
      imageConfig.aspectRatio = options.aspectRatio;
    }
    generationConfig.imageConfig = imageConfig;
  }
  const payload = {
    contents: [
      {
        role: "user",
        parts: options.parts
      }
    ]
  };
  if (Object.keys(generationConfig).length > 0) {
    payload.generationConfig = generationConfig;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(payload)
  });
  const rawText = await response.text();
  let parsed = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const parsedRecord = getObjectRecord2(parsed);
    const errorRecord = getObjectRecord2(parsedRecord?.error);
    const remoteMessage = typeof errorRecord?.message === "string" ? errorRecord.message : typeof parsedRecord?.message === "string" ? parsedRecord.message : "";
    const message = remoteMessage || rawText || `Gemini API returned status ${response.status}`;
    throw new Error(`Gemini API error (${response.status}): ${message}`);
  }
  if (parsed === null) {
    throw new Error("Gemini API returned an unexpected non-JSON response.");
  }
  return parsed;
}
async function generateGeminiImageFromParts(options) {
  const model = normalizeStringValue(options.model) || DEFAULT_STYLE_IMAGE_MODEL;
  const fallbackModel = DEFAULT_STYLE_IMAGE_FALLBACK_MODEL;
  const requestImage = async (requestModel) => {
    const response = await generateGeminiContent({
      model: requestModel,
      parts: options.parts,
      responseModalities: ["IMAGE", "TEXT"],
      maxOutputTokens: options.maxOutputTokens ?? 1200,
      imageSize: options.imageSize,
      aspectRatio: options.aspectRatio
    });
    const imageBase64 = extractGeminiImageBase64(response);
    if (!imageBase64) {
      const responseText = extractGeminiText(response).trim();
      const responseTextHint = responseText ? ` Response text: ${responseText.slice(0, 240)}` : "";
      throw new Error(`Gemini image generation returned no image data.${responseTextHint}`);
    }
    return {
      imageBase64,
      model: requestModel,
      provider: "Google"
    };
  };
  try {
    return await requestImage(model);
  } catch (error) {
    if (!isGeminiNoImageDataError(error) || !fallbackModel || fallbackModel === model) {
      throw error;
    }
    console.warn(
      `Gemini image generation returned no image data with model ${model}. Retrying with ${fallbackModel}.`
    );
    try {
      return await requestImage(fallbackModel);
    } catch (fallbackError) {
      throw new Error(
        `Gemini image generation returned no image data with primary model ${model} and fallback model ${fallbackModel}: ${toErrorMessage(fallbackError, "Gemini fallback request failed")}`
      );
    }
  }
}
function resolveGenerationTierById(input) {
  const generationTierId = normalizeStringValue(input);
  return INSTAME_GENERATION_TIERS.find((tier) => tier.id === generationTierId) || getLiveInstaMeGenerationTier();
}
function resolveEditTierById(input) {
  const editTierId = normalizeStringValue(input);
  return INSTAME_EDIT_TIERS.find((tier) => tier.id === editTierId) || INSTAME_EDIT_TIERS[0];
}
function resolveGenerationMode(generationTierId) {
  if (generationTierId === "good" || generationTierId === "best" || generationTierId === "excellent" || generationTierId === "high_res") {
    return "high_res";
  }
  return "preview";
}
function resolvePromptOnlyFallbackModel(mode) {
  if (mode === "high_res") {
    return {
      provider: "together",
      model: DEFAULT_TOGETHER_PRO_IMAGE_MODEL,
      displayName: "Google Gemini 3 Pro Image"
    };
  }
  return {
    provider: "together",
    model: DEFAULT_TOGETHER_FLASH_IMAGE_MODEL,
    displayName: "Google Flash Image 3.1 Preview"
  };
}
function resolveStylePresetQualityTier(preset) {
  if (!preset) return "premium";
  if (preset.qualityTier) return preset.qualityTier;
  const requestedModels = (preset.promptVariants || []).flatMap((variant) => variant.requestedModels || []);
  return resolveHighestInstaMeQualityTier(requestedModels, "premium");
}
function resolveTransformQualityTier(options) {
  if (options.isOwnStyleRequested) {
    return options.generationMode === "high_res" ? "premium" : "standard";
  }
  const promptOnlyQuality = options.promptVariant?.requestedModels?.length ? resolveHighestInstaMeQualityTier(options.promptVariant.requestedModels, "premium") : null;
  const presetQuality = resolveStylePresetQualityTier(options.resolvedStylePreset);
  const resolvedQuality = promptOnlyQuality ? getHigherInstaMeQualityTier(presetQuality, promptOnlyQuality) : presetQuality;
  if (options.generationMode === "high_res" && resolvedQuality === "standard") {
    return "premium";
  }
  return resolvedQuality;
}
function toPublicStylePreset(req, preset) {
  return {
    id: preset.id,
    label: preset.label,
    subtitle: preset.subtitle,
    qualityTier: resolveStylePresetQualityTier(preset),
    promptHint: preset.promptHint,
    cover: preset.cover ? toCatalogAssetUrl(req, preset.cover) : preset.cover,
    coverThumb: preset.coverThumb ? toCatalogAssetUrl(req, preset.coverThumb) : void 0,
    representativeImage: toCatalogAssetUrl(req, preset.representativeImage),
    sourcePortrait: preset.sourcePortrait ? toCatalogAssetUrl(req, preset.sourcePortrait) : void 0,
    examples: preset.examples.map((imagePath) => toCatalogAssetUrl(req, imagePath)),
    examplesThumbs: preset.examplesThumbs ? preset.examplesThumbs.map((imagePath) => toCatalogAssetUrl(req, imagePath)) : void 0,
    promptOnlyAfterFirstUse: preset.promptOnlyAfterFirstUse,
    category: preset.category,
    vibeId: preset.vibeId
  };
}
function hasOpenAiImageConfig() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}
function hasTogetherImageConfig() {
  return Boolean(process.env.TOGETHER_API_KEY);
}
function shouldFallbackOwnStyleToTogether(error) {
  const message = normalizeStringValue(error instanceof Error ? error.message : String(error || ""));
  if (!message) return false;
  return message.includes("AI_NOT_CONFIGURED") || /gemini_api_key|google_api_key/i.test(message) || /api key not valid/i.test(message) || /invalid api key/i.test(message) || /gemini api error \((400|401|403|404)\)/i.test(message) || /is not found for api version|model .* not found/i.test(message);
}
function isGeminiModelNotFoundError(error) {
  const message = normalizeStringValue(error instanceof Error ? error.message : String(error || ""));
  if (!message) return false;
  return /gemini api error \(404\)/i.test(message) || /is not found for api version|model .* not found/i.test(message);
}
function buildOwnStyleFallbackAnalysisPrompt() {
  return [
    "Use the uploaded style reference as the guide for pose, facial expression, facial micro-expression, hair arrangement, wardrobe, lighting, camera angle, framing, composition, background mood, color palette, texture, and overall aesthetic.",
    "Preserve exact colors for dominant elements such as flowers, clothing, props, and key background accents unless the user asks to recolor them.",
    "Preserve the uploaded subject's identity exactly and transfer only the style direction from the reference image."
  ].join(" ");
}
function shouldRefreshSavedOwnStyleAnalysis(image, ownStyleMode) {
  const expectedVersion = OWN_STYLE_ANALYSIS_VERSIONS[ownStyleMode];
  const storedVersion = Number(image.analysisVersion);
  return image.analysisMode !== ownStyleMode || !Number.isInteger(storedVersion) || storedVersion !== expectedVersion;
}
function toUploadedReferenceImageFromStoredOwnStyle(image) {
  return {
    base64: image.base64 || image.previewBase64,
    mimeType: image.mimeType || "image/jpeg",
    width: image.width,
    height: image.height
  };
}
function hasReveImageConfig() {
  return Boolean(process.env.REVE_API_KEY);
}
async function renderGridCompositePreview(options) {
  if (GRID_PIPELINE_PREVIEW_PROVIDER === "reve" && hasReveImageConfig()) {
    const imageBase642 = await generateReveImage({
      model: GRID_PIPELINE_PREVIEW_REVE_MODEL,
      prompt: options.prompt,
      referenceImage: options.images[0],
      aspectRatio: "2:3",
      mode: "preview"
    });
    return { imageBase64: imageBase642, provider: "Reve", model: GRID_PIPELINE_PREVIEW_REVE_MODEL };
  }
  const imageBase64 = await generateOpenAiImage({
    model: GRID_PIPELINE_RENDER_OPENAI_MODEL,
    prompt: options.prompt,
    images: options.images.length > 0 ? options.images : void 0,
    size: "1024x1536",
    quality: GRID_PIPELINE_RENDER_OPENAI_QUALITY
  });
  return { imageBase64, provider: "OpenAI", model: GRID_PIPELINE_RENDER_OPENAI_MODEL };
}
async function renderGridExtractedShot(options) {
  if (GRID_PIPELINE_EXTRACT_PROVIDER === "reve" && hasReveImageConfig()) {
    return generateReveImage({
      model: GRID_PIPELINE_EXTRACT_REVE_MODEL,
      prompt: options.prompt,
      referenceImage: options.images[0],
      aspectRatio: "2:3",
      mode: "high_res"
    });
  }
  return generateOpenAiImage({
    model: GRID_PIPELINE_EXTRACT_OPENAI_MODEL,
    prompt: options.prompt,
    images: options.images.length > 0 ? options.images : void 0,
    size: "1024x1536",
    quality: GRID_PIPELINE_RENDER_OPENAI_QUALITY
  });
}
async function cropGridCellFromComposite(gridBase64, position, imageCount) {
  const cols = 3;
  const rows = Math.max(1, Math.ceil(imageCount / cols));
  const row = Math.ceil(position / cols);
  const col = (position - 1) % cols + 1;
  const buffer = Buffer.from(gridBase64, "base64");
  const meta = await (0, import_sharp.default)(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("Could not read composite grid dimensions for cell crop.");
  }
  const cellWidth = Math.floor(width / cols);
  const cellHeight = Math.floor(height / rows);
  if (cellWidth <= 0 || cellHeight <= 0) {
    throw new Error("Computed an invalid grid cell size for cell crop.");
  }
  const left = Math.min(Math.max((col - 1) * cellWidth, 0), width - cellWidth);
  const top = Math.min(Math.max((row - 1) * cellHeight, 0), height - cellHeight);
  const cropped = await (0, import_sharp.default)(buffer).extract({ left, top, width: cellWidth, height: cellHeight }).png().toBuffer();
  return cropped.toString("base64");
}
function resolveAvailablePromptOnlyModel(requestedModel, mode) {
  if (!requestedModel) {
    return hasTogetherImageConfig() ? resolvePromptOnlyFallbackModel(mode) : null;
  }
  if (requestedModel.provider === "openai") {
    if (hasOpenAiImageConfig()) return requestedModel;
    if (hasTogetherImageConfig()) return resolvePromptOnlyFallbackModel(mode);
    return requestedModel;
  }
  if (requestedModel.provider === "reve") {
    if (hasReveImageConfig()) return requestedModel;
    if (hasTogetherImageConfig()) return resolvePromptOnlyFallbackModel(mode);
    return requestedModel;
  }
  if (requestedModel.provider === "together") {
    if (hasTogetherImageConfig()) return requestedModel;
    return requestedModel;
  }
  return requestedModel;
}
async function generatePromptOnlyPresetImage(options) {
  const selectedModel = resolveAvailablePromptOnlyModel(
    chooseRequestedModel(options.variant, options.styleUsageCount),
    options.generationMode
  ) || resolvePromptOnlyFallbackModel(options.generationMode);
  const prompt = buildPromptOnlyPresetTransformPrompt({
    presetLabel: options.preset.label,
    variantPrompt: options.variant.prompt,
    customPrompt: options.customPrompt,
    preserveBackground: options.preserveBackground,
    generationTierId: options.generationTierId
  });
  if (selectedModel?.provider === "together") {
    const geminiParts = [
      { text: prompt },
      ...toGeminiInlineImageParts(options.uploadedImages)
    ];
    const geminiMaxTokens = options.generationMode === "high_res" ? 1200 : 900;
    const { model: geminiImageModel, imageSize: geminiImageSize } = resolveGeminiImageGenerationForTier(options.generationTierId);
    try {
      return await generateGeminiImageFromParts({
        model: geminiImageModel,
        parts: geminiParts,
        maxOutputTokens: geminiMaxTokens,
        imageSize: geminiImageSize,
        aspectRatio: "1:1"
      });
    } catch (error) {
      if (!hasTogetherImageConfig()) {
        throw error;
      }
      console.warn("Prompt-only preset generation fell back from Gemini to Together:", error);
      try {
        const { width, height } = resolveGenerationResolution(options.generationTierId);
        const referenceImageUrl = toRuntimeAssetUrl(options.req, options.uploadedImages[0]);
        const imageBase642 = await generateTogetherImage({
          model: selectedModel.model,
          prompt,
          referenceImages: [referenceImageUrl],
          width,
          height,
          sourceWidth: options.uploadedImages[0]?.width,
          sourceHeight: options.uploadedImages[0]?.height
        });
        return {
          imageBase64: imageBase642,
          model: selectedModel.displayName,
          provider: "Together"
        };
      } catch (fallbackError) {
        console.error("Prompt-only preset generation Together fallback failed:", fallbackError);
        throw new Error(
          `Prompt-only preset generation failed: ${toErrorMessage(error, "Gemini request failed")}. Together fallback failed: ${toErrorMessage(fallbackError, "Together request failed")}.`
        );
      }
    }
  }
  if (selectedModel?.provider === "reve") {
    const imageBase642 = await generateReveImage({
      model: selectedModel.model,
      prompt,
      referenceImage: options.uploadedImages[0],
      aspectRatio: "1:1",
      mode: options.generationMode
    });
    return {
      imageBase64: imageBase642,
      model: selectedModel.displayName,
      provider: "Reve"
    };
  }
  const openAiModel = selectedModel?.model || "chatgpt-image-latest";
  const imageBase64 = await generateOpenAiImage({
    model: openAiModel,
    prompt,
    images: options.uploadedImages,
    size: resolveOpenAiSize(options.generationMode),
    quality: options.generationMode === "high_res" ? "high" : "low"
  });
  return {
    imageBase64,
    model: selectedModel?.displayName || openAiModel,
    provider: "OpenAI"
  };
}
async function analyzeOwnStyleReferenceImage(styleImage, options) {
  const isCreativePromptMode = options?.ownStyleMode === "creative_prompt";
  const analysisPrompt = isCreativePromptMode ? CREATIVE_OWN_STYLE_ANALYSIS_PROMPT : OWN_STYLE_ANALYSIS_PROMPT;
  const primaryModel = isCreativePromptMode ? DEFAULT_CREATIVE_OWN_STYLE_ANALYSIS_MODEL : DEFAULT_OWN_STYLE_ANALYSIS_MODEL;
  const fallbackModels = Array.from(
    new Set(
      [DEFAULT_OWN_STYLE_ANALYSIS_MODEL, DEFAULT_STYLE_TEXT_MODEL].filter(
        (model) => Boolean(model) && model !== primaryModel
      )
    )
  );
  const runAnalysis = async (model) => {
    const tracePrefix = options?.traceLabel || getOwnStyleTracePrefix(options?.debugTraceContext);
    logInstaMeDebugTrace(options?.debugTraceContext, `${tracePrefix}.analysis.request`, {
      provider: "Google",
      model,
      prompt: analysisPrompt,
      styleImageMimeType: styleImage.mimeType || "image/jpeg",
      styleImageWidth: styleImage.width || null,
      styleImageHeight: styleImage.height || null,
      styleImageFileSizeBytes: styleImage.fileSizeBytes || null
    });
    const analysisResponse = await generateGeminiContent({
      model,
      parts: [{ text: analysisPrompt }, ...toGeminiInlineImageParts([styleImage])],
      responseMimeType: "text/plain",
      maxOutputTokens: isCreativePromptMode ? 4e3 : 1200,
      temperature: 0.3
    });
    const rawAnalysisText = extractGeminiText(analysisResponse);
    const analysisText = isCreativePromptMode ? rawAnalysisText.trim() : rawAnalysisText.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!analysisText) {
      throw new Error("Own Style analysis returned no prompt text.");
    }
    logInstaMeDebugTrace(options?.debugTraceContext, `${tracePrefix}.analysis.response`, {
      provider: "Google",
      model,
      prompt: analysisPrompt,
      responseText: analysisText,
      usage: extractGeminiUsageMetrics(analysisResponse)
    });
    return analysisText;
  };
  try {
    return await runAnalysis(primaryModel);
  } catch (error) {
    if (isGeminiModelNotFoundError(error)) {
      for (const fallbackModel of fallbackModels) {
        try {
          console.warn(
            `Own Style analysis model ${primaryModel} was not found. Retrying with ${fallbackModel}.`
          );
          return await runAnalysis(fallbackModel);
        } catch (retryError) {
          error = retryError;
        }
      }
    }
    if (options?.allowStaticFallback && hasTogetherImageConfig() && shouldFallbackOwnStyleToTogether(error)) {
      console.warn("Own Style analysis falling back to Together-compatible prompt:", error);
      return buildOwnStyleFallbackAnalysisPrompt();
    }
    if (shouldFallbackOwnStyleToTogether(error)) {
      throw new Error("AI_NOT_CONFIGURED: Own Style analysis is temporarily unavailable. Please try again later.");
    }
    throw error;
  }
}
function buildOwnStyleTransformPrompt(options) {
  const promptParts = [
    "Recreate the style direction from the style reference image with strict fidelity.",
    "Keep the uploaded subject's identity exactly: face structure, skin tone, age appearance, and natural hair color must stay recognizable.",
    "Transfer the style-reference composition faithfully: body pose, camera angle, subject-to-camera relationship, framing, wardrobe, lighting, background structure, and fine details.",
    "Color fidelity is mandatory: preserve exact colors of dominant style elements, including flowers, clothing, accessories, props, and key background accents.",
    "Do not neutralize, desaturate, or replace these key colors (example: pink flowers must not become white) unless the additional user request explicitly asks for recoloring.",
    options.preserveBackground ? "Preserve the background composition and scene layout from the style direction; do not invent a different scene." : "Minor background reinterpretation is allowed only if needed, but keep the same camera angle, framing, and composition.",
    "Style direction to execute:",
    options.analyzedStylePrompt.trim()
  ];
  const extraPrompt = options.customPrompt.trim();
  if (extraPrompt) {
    promptParts.push(`Additional user request: ${extraPrompt}`);
  }
  return promptParts.join("\n");
}
function buildOwnStyleReferenceLockedPrompt(options) {
  const promptParts = [
    "Replace the face and head of the person in the style reference image with the face and head from the uploaded base photo.",
    "This is a face swap: the final output must look exactly like the style reference image but with the base photo person's face, skin tone, and facial features.",
    "Keep the hair styling and coiffure from the style reference image, but preserve the base photo person's natural hair color and hair length.",
    "Do not add bangs or fringe unless they already exist in the base photo.",
    "Keep everything else from the style reference image exactly as-is: clothing, pose, body, lighting, framing, background, and overall composition.",
    "The result must be photorealistic and seamless."
  ];
  if (options.customPrompt.trim()) {
    promptParts.push(`Apply these changes to the result: ${options.customPrompt.trim()}`);
  }
  return promptParts.join("\n");
}
function buildOwnStyleCreativeTogetherFallbackPrompt(options) {
  const promptParts = [
    "Edit the uploaded portrait to match the following style direction exactly.",
    "Preserve the subject's face, identity, skin tone, and natural hair color from the uploaded portrait.",
    "Transfer the style-reference composition faithfully: pose, camera angle, framing, wardrobe, lighting, background structure, and fine details.",
    "Color fidelity is mandatory: keep exact dominant element colors from the style direction, including flowers, clothing, accessories, props, and key background accents.",
    "Do not neutralize or swap these key colors unless the additional user request explicitly asks for recoloring.",
    options.preserveBackground ? "Preserve the background composition and scene layout from the style direction." : "Minor background reinterpretation is allowed only if needed, while keeping the same camera relationship and framing.",
    options.analyzedStylePrompt
  ];
  if (options.customPrompt.trim()) {
    promptParts.push(`Additional user request: ${options.customPrompt.trim()}`);
  }
  return promptParts.join("\n");
}
function buildOwnStyleTogetherFallbackPrompt(options) {
  const promptParts = [
    "Replace the face and head of the person in the style reference image with the face and head from the uploaded user portrait.",
    "This is a face swap: the output must look exactly like the style reference but with the user's face, skin tone, and facial features.",
    "Keep the hair styling from the style reference, but preserve the user's natural hair color and hair length.",
    "Do not add bangs or fringe unless they exist in the user portrait.",
    "Keep everything else from the style reference exactly as-is: clothing, pose, body, lighting, framing, background, and composition.",
    "The result must be photorealistic and seamless."
  ];
  if (options.customPrompt.trim()) {
    promptParts.push(`Apply these changes to the result: ${options.customPrompt.trim()}`);
  }
  return promptParts.join("\n");
}
async function generateOwnStyleImage(options) {
  const tracePrefix = getOwnStyleTracePrefix(options.debugTraceContext);
  if (options.generationMode === "high_res" && hasTogetherImageConfig()) {
    try {
      const { width, height } = resolveGenerationResolution(options.generationTierId);
      const userImageUrl = toRuntimeAssetUrl(options.req, options.uploadedImages[0]);
      const styleReferenceUrl = toRuntimeAssetUrl(options.req, options.styleReferenceImage);
      const prompt = options.ownStyleMode === "reference_locked" ? buildOwnStyleTogetherFallbackPrompt({
        customPrompt: options.customPrompt,
        preserveBackground: options.preserveBackground
      }) : buildOwnStyleCreativeTogetherFallbackPrompt({
        analyzedStylePrompt: options.analyzedStylePrompt,
        customPrompt: options.customPrompt,
        preserveBackground: options.preserveBackground
      });
      logInstaMeDebugTrace(options.debugTraceContext, `${tracePrefix}.generation.high_res_request`, {
        provider: "Together",
        model: DEFAULT_TOGETHER_PRO_IMAGE_MODEL,
        prompt,
        generationMode: options.generationMode,
        width,
        height,
        uploadedImageCount: options.uploadedImages.length,
        includesStyleReferenceImage: true
      });
      const imageBase64 = await generateTogetherImage({
        model: DEFAULT_TOGETHER_PRO_IMAGE_MODEL,
        prompt,
        referenceImages: [userImageUrl, styleReferenceUrl],
        width,
        height,
        sourceWidth: options.uploadedImages[0]?.width,
        sourceHeight: options.uploadedImages[0]?.height
      });
      logInstaMeDebugTrace(options.debugTraceContext, `${tracePrefix}.generation.high_res_response`, {
        provider: "Together",
        model: DEFAULT_TOGETHER_PRO_IMAGE_MODEL,
        prompt,
        imageReturned: Boolean(imageBase64)
      });
      return {
        imageBase64,
        model: DEFAULT_TOGETHER_PRO_IMAGE_MODEL,
        provider: "Together"
      };
    } catch (highResError) {
      console.warn("Own Style high_res Together generation failed, falling back to Gemini:", highResError);
    }
  }
  try {
    const prompt = options.ownStyleMode === "reference_locked" ? buildOwnStyleReferenceLockedPrompt({
      customPrompt: options.customPrompt,
      preserveBackground: options.preserveBackground
    }) : buildOwnStyleTransformPrompt({
      analyzedStylePrompt: options.analyzedStylePrompt,
      customPrompt: options.customPrompt,
      preserveBackground: options.preserveBackground
    });
    const parts = options.ownStyleMode === "reference_locked" ? [
      { text: prompt },
      { text: "User base photo to transform. This person must remain the final subject:" },
      ...toGeminiInlineImageParts(options.uploadedImages),
      { text: "Style reference image. Use it for styling direction such as pose, lighting, and mood, but never copy its hair color, bangs, haircut, or identity into the output:" },
      ...toGeminiInlineImageParts([options.styleReferenceImage])
    ] : [
      { text: prompt },
      { text: "Identity source image (MANDATORY): preserve this person's identity in the final image." },
      ...toGeminiInlineImageParts(options.uploadedImages),
      {
        text: "Style direction image (STYLE ONLY): transfer pose, expression, hair arrangement, wardrobe, lighting, camera angle, framing, composition, background details, and mood. Keep dominant element colors exact (for example pink bouquet flowers must stay pink), and never copy identity from this image."
      },
      ...toGeminiInlineImageParts([options.styleReferenceImage])
    ];
    logInstaMeDebugTrace(options.debugTraceContext, `${tracePrefix}.generation.request`, {
      provider: "Google",
      model: DEFAULT_STYLE_IMAGE_MODEL,
      prompt,
      generationMode: options.generationMode,
      preserveBackground: options.preserveBackground,
      uploadedImageCount: options.uploadedImages.length,
      includesStyleReferenceImage: true
    });
    const imageResponse = await generateGeminiContent({
      model: DEFAULT_STYLE_IMAGE_MODEL,
      parts,
      responseModalities: ["IMAGE", "TEXT"],
      maxOutputTokens: 1200
    });
    const imageBase64 = extractGeminiImageBase64(imageResponse);
    if (!imageBase64) {
      throw new Error("Own Style generation failed. No image data returned.");
    }
    logInstaMeDebugTrace(options.debugTraceContext, `${tracePrefix}.generation.response`, {
      provider: "Google",
      model: DEFAULT_STYLE_IMAGE_MODEL,
      prompt,
      usage: extractGeminiUsageMetrics(imageResponse),
      responseText: extractGeminiText(imageResponse) || null,
      imageReturned: Boolean(imageBase64)
    });
    return {
      imageBase64,
      model: DEFAULT_STYLE_IMAGE_MODEL,
      provider: "Google"
    };
  } catch (error) {
    if (!hasTogetherImageConfig() || !shouldFallbackOwnStyleToTogether(error)) {
      throw error;
    }
    console.warn("Own Style generation falling back to Together:", error);
    const { width, height } = resolveGenerationResolution(options.generationTierId);
    const userImageUrl = toRuntimeAssetUrl(options.req, options.uploadedImages[0]);
    const styleReferenceUrl = toRuntimeAssetUrl(options.req, options.styleReferenceImage);
    const prompt = options.ownStyleMode === "reference_locked" ? buildOwnStyleTogetherFallbackPrompt({
      customPrompt: options.customPrompt,
      preserveBackground: options.preserveBackground
    }) : buildOwnStyleCreativeTogetherFallbackPrompt({
      analyzedStylePrompt: options.analyzedStylePrompt,
      customPrompt: options.customPrompt,
      preserveBackground: options.preserveBackground
    });
    logInstaMeDebugTrace(options.debugTraceContext, `${tracePrefix}.generation.fallback_request`, {
      provider: "Together",
      model: options.generationMode === "high_res" ? DEFAULT_TOGETHER_PRO_IMAGE_MODEL : DEFAULT_TOGETHER_FLASH_IMAGE_MODEL,
      prompt,
      generationMode: options.generationMode,
      uploadedImageCount: options.uploadedImages.length,
      includesStyleReferenceImage: true,
      tokenUsage: "unavailable_from_provider_helper"
    });
    const imageBase64 = await generateTogetherImage({
      model: options.generationMode === "high_res" ? DEFAULT_TOGETHER_PRO_IMAGE_MODEL : DEFAULT_TOGETHER_FLASH_IMAGE_MODEL,
      prompt,
      referenceImages: [userImageUrl, styleReferenceUrl],
      width,
      height,
      sourceWidth: options.uploadedImages[0]?.width,
      sourceHeight: options.uploadedImages[0]?.height
    });
    logInstaMeDebugTrace(options.debugTraceContext, `${tracePrefix}.generation.fallback_response`, {
      provider: "Together",
      model: options.generationMode === "high_res" ? DEFAULT_TOGETHER_PRO_IMAGE_MODEL : DEFAULT_TOGETHER_FLASH_IMAGE_MODEL,
      prompt,
      imageReturned: Boolean(imageBase64),
      tokenUsage: "unavailable_from_provider_helper"
    });
    return {
      imageBase64,
      model: options.generationMode === "high_res" ? DEFAULT_TOGETHER_PRO_IMAGE_MODEL : DEFAULT_TOGETHER_FLASH_IMAGE_MODEL,
      provider: "Together"
    };
  }
}
async function generateReferenceGuidedHighResImage(options) {
  const { width, height, sizeLabel } = resolveGenerationResolution(options.generationTierId);
  const referenceImageUrls = options.selectedStyleReferences.map((reference) => loadStyleReferenceImage(reference)).filter((image) => Boolean(image)).map((image) => toRuntimeAssetUrl(options.req, image));
  const userImageUrl = toRuntimeAssetUrl(options.req, options.uploadedImages[0]);
  const prompt = buildOldMoneyTransformPrompt({
    intensity: options.intensity,
    customPrompt: options.customPrompt,
    preserveBackground: options.preserveBackground,
    styleReferences: options.selectedStyleReferences,
    stylePresetLabel: options.stylePresetLabel,
    stylePresetPromptHint: options.stylePresetPromptHint,
    sizeLabel
  });
  try {
    const imageBase64 = await generateTogetherImage({
      model: "black-forest-labs/FLUX.2-pro",
      prompt,
      referenceImages: [...referenceImageUrls, userImageUrl],
      width,
      height
    });
    return {
      imageBase64,
      model: "FLUX.2 Pro",
      provider: "Together"
    };
  } catch (error) {
    if (!shouldFallbackTogetherToGemini(error)) {
      throw error;
    }
    console.warn("Reference-guided high-res generation fell back from Together to Gemini:", error);
    return generateGeminiImageFromParts({
      model: DEFAULT_STYLE_IMAGE_MODEL,
      parts: [
        { text: prompt },
        ...toStyleReferenceImageParts(options.selectedStyleReferences),
        ...toGeminiInlineImageParts(options.uploadedImages)
      ],
      maxOutputTokens: 1200
    });
  }
}
async function generateReferenceGuidedPreviewImage(options) {
  const imageResponse = await generateGeminiContent({
    model: DEFAULT_STYLE_IMAGE_MODEL,
    parts: [
      {
        text: buildOldMoneyTransformPrompt({
          intensity: options.intensity,
          customPrompt: options.customPrompt,
          preserveBackground: options.preserveBackground,
          styleReferences: options.selectedStyleReferences,
          stylePresetLabel: options.stylePresetLabel,
          stylePresetPromptHint: options.stylePresetPromptHint,
          sizeLabel: "512x512"
        })
      },
      ...toStyleReferenceImageParts(options.selectedStyleReferences),
      ...toGeminiInlineImageParts(options.uploadedImages)
    ],
    responseModalities: ["IMAGE", "TEXT"],
    maxOutputTokens: 800
  });
  const imageBase64 = extractGeminiImageBase64(imageResponse);
  if (!imageBase64) {
    throw new Error("Image generation failed. No image data returned.");
  }
  return {
    imageBase64,
    model: DEFAULT_STYLE_IMAGE_MODEL,
    provider: "Google"
  };
}
async function generateInstaMeEditImage(options) {
  const tier = resolveEditTierById(options.editTierId);
  const prompt = buildInstaMeEditPrompt({
    editInstruction: options.editInstruction,
    customPrompt: options.customPrompt
  });
  const referenceImages = [
    toRuntimeAssetUrl(options.req, options.currentImage),
    options.originalPhoto ? toRuntimeAssetUrl(options.req, options.originalPhoto) : null
  ].filter((image) => Boolean(image));
  try {
    const imageBase64 = await generateTogetherImage({
      model: DEFAULT_TOGETHER_FLASH_IMAGE_MODEL,
      prompt,
      referenceImages,
      width: 1024,
      height: 1024,
      sourceWidth: options.originalPhoto?.width || options.currentImage.width,
      sourceHeight: options.originalPhoto?.height || options.currentImage.height
    });
    return {
      imageBase64,
      model: tier.model,
      provider: "Together"
    };
  } catch (error) {
    if (!shouldFallbackTogetherToGemini(error)) {
      throw error;
    }
    console.warn("InstaMe edit fell back from Together to Gemini:", error);
    const parts = [
      { text: prompt },
      {
        text: "Primary generated portrait to edit. Keep this person and composition consistent unless the user explicitly requested a change:"
      },
      ...toGeminiInlineImageParts([options.currentImage]),
      ...options.originalPhoto ? [
        { text: "Original base portrait for identity anchoring:" },
        ...toGeminiInlineImageParts([options.originalPhoto])
      ] : []
    ];
    return generateGeminiImageFromParts({
      model: DEFAULT_STYLE_IMAGE_MODEL,
      parts,
      maxOutputTokens: 1e3
    });
  }
}
async function generateInstaMePortraitEnhance(options) {
  const prompt = buildPortraitEnhancePrompt();
  try {
    const imageBase64 = await generateTogetherImage({
      model: INSTAME_PORTRAIT_ENHANCE_MODEL,
      prompt,
      referenceImages: [toRuntimeAssetUrl(options.req, options.photo)],
      width: 1024,
      height: 1024,
      sourceWidth: options.photo.width,
      sourceHeight: options.photo.height
    });
    return {
      imageBase64,
      model: INSTAME_PORTRAIT_ENHANCE_MODEL,
      provider: "Together"
    };
  } catch (error) {
    if (!shouldFallbackTogetherToGemini(error)) {
      throw error;
    }
    console.warn("Portrait enhance fell back from Together to Gemini:", error);
    return generateGeminiImageFromParts({
      model: DEFAULT_STYLE_IMAGE_MODEL,
      parts: [{ text: prompt }, ...toGeminiInlineImageParts([options.photo])],
      maxOutputTokens: 1e3
    });
  }
}
async function createStylingPlan({
  prompt,
  uploadedImages
}) {
  const parts = [
    { text: prompt },
    ...toGeminiInlineImageParts(uploadedImages)
  ];
  let rawContent = "{}";
  try {
    const response = await generateGeminiContent({
      model: DEFAULT_STYLE_TEXT_MODEL,
      parts,
      responseMimeType: "application/json",
      maxOutputTokens: 1200,
      temperature: 0.4
    });
    rawContent = extractGeminiText(response) || "{}";
  } catch (jsonModeError) {
    const errorMessage = toErrorMessage(jsonModeError, "").toLowerCase();
    const shouldFallback = errorMessage.includes("responsemimetype") || errorMessage.includes("json schema") || errorMessage.includes("response mime");
    if (!shouldFallback) {
      throw jsonModeError;
    }
    const fallbackResponse = await generateGeminiContent({
      model: DEFAULT_STYLE_TEXT_MODEL,
      parts,
      maxOutputTokens: 1200,
      temperature: 0.4
    });
    rawContent = extractGeminiText(fallbackResponse) || "{}";
    if (process.env.NODE_ENV !== "production") {
      console.warn("Gemini JSON mode unsupported, fallback used:", jsonModeError);
    }
  }
  return sanitizeStylingResponse(tryParseJsonObject(rawContent));
}
async function consumeCredits(userId, amount, feature) {
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error("Invalid credit amount");
  }
  const [user] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
  if (!user || user.credits < amount) {
    return false;
  }
  const nextCredits = user.credits - amount;
  await db.update(users).set({ credits: nextCredits, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(users.id, userId));
  await db.insert(creditTransactions).values({
    userId,
    type: "usage",
    amountCredits: -amount,
    source: "app",
    description: feature
  });
  return true;
}
async function refundCredits(userId, amount, reason) {
  if (!Number.isInteger(amount) || amount < 1) return;
  const [user] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
  if (!user) return;
  await db.update(users).set({ credits: user.credits + amount, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(users.id, userId));
  await db.insert(creditTransactions).values({
    userId,
    type: "refund",
    amountCredits: amount,
    source: "app",
    description: reason
  });
}
function getDefaultBaseUrl(req) {
  const publicWebUrl = process.env.PUBLIC_WEB_URL;
  if (publicWebUrl) return publicWebUrl.replace(/\/+$/, "");
  const proto = firstHeaderValue(req.headers["x-forwarded-proto"]) || req.protocol || "https";
  const host = firstHeaderValue(req.headers["x-forwarded-host"]) || req.get("host") || "localhost:5000";
  return `${proto}://${host}`.replace(/\/+$/, "");
}
var PASSWORD_RESET_TOKEN_TTL_MS = 1e3 * 60 * 60;
function buildPasswordResetUrl(req, email, token) {
  const resetUrl = new URL("/reset-password", getDefaultBaseUrl(req));
  resetUrl.searchParams.set("email", email);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}
function buildPasswordResetEmailHtml(name, resetUrl) {
  return `
    <div style="font-family:Arial,sans-serif;background:#0b0b10;color:#f3f2f5;padding:32px;line-height:1.6;">
      <div style="max-width:560px;margin:0 auto;background:#11131a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;">
        <p style="margin:0 0 12px;color:#ff8fae;letter-spacing:2px;text-transform:uppercase;font-size:12px;">Chicoo Security</p>
        <h1 style="margin:0 0 16px;font-size:28px;color:#ffffff;">Reset your password</h1>
        <p style="margin:0 0 18px;">Hi ${name || "there"},</p>
        <p style="margin:0 0 18px;">We received a request to reset the password for your Chicoo account. Use the button below to choose a new password. This link expires in 1 hour.</p>
        <p style="margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#ff4f7d;color:#000000;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;">Reset password</a>
        </p>
        <p style="margin:0 0 10px;color:#b2a9b0;">If the button does not open, paste this link into your browser:</p>
        <p style="margin:0;word-break:break-word;color:#ffffff;">${resetUrl}</p>
        <p style="margin:24px 0 0;color:#8f8690;font-size:13px;">If you did not request this, you can ignore this email.</p>
      </div>
    </div>
  `;
}
function buildPasswordResetEmailText(name, resetUrl) {
  return [
    `Hi ${name || "there"},`,
    "",
    "We received a request to reset the password for your Chicoo account.",
    "Use the link below to choose a new password. This link expires in 1 hour.",
    "",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email."
  ].join("\n");
}
function isMatchingHashedToken(candidateToken, storedTokenHash) {
  if (!storedTokenHash) return false;
  const candidateHash = hashToken(candidateToken);
  const candidateBuffer = Buffer.from(candidateHash);
  const storedBuffer = Buffer.from(storedTokenHash);
  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }
  return (0, import_node_crypto2.timingSafeEqual)(candidateBuffer, storedBuffer);
}
function getAllowedCheckoutOrigins(req) {
  const origins = /* @__PURE__ */ new Set();
  const candidates = [
    process.env.PUBLIC_WEB_URL,
    process.env.PUBLIC_APP_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}` : "",
    getDefaultBaseUrl(req)
  ];
  for (const entry of candidates) {
    const value = normalizeStringValue(entry);
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      if (value.startsWith("http://") || value.startsWith("https://")) {
        origins.add(value.replace(/\/+$/, ""));
      }
    }
  }
  if (process.env.CORS_ORIGINS) {
    for (const entry of process.env.CORS_ORIGINS.split(",")) {
      const value = normalizeStringValue(entry);
      if (!value) continue;
      try {
        origins.add(new URL(value).origin);
      } catch {
        if (value.startsWith("http://") || value.startsWith("https://")) {
          origins.add(value.replace(/\/+$/, ""));
        }
      }
    }
  }
  return origins;
}
function isAllowedCheckoutRedirectUrl(req, candidateUrl) {
  try {
    const parsed = new URL(candidateUrl);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:") {
      const allowedOrigins = getAllowedCheckoutOrigins(req);
      if (allowedOrigins.has(parsed.origin)) return true;
      const isLocalDevOrigin = process.env.NODE_ENV !== "production" && (parsed.origin.startsWith("http://localhost:") || parsed.origin.startsWith("http://127.0.0.1:"));
      return isLocalDevOrigin;
    }
    const allowedSchemes = /* @__PURE__ */ new Set(["instame", "exp", "exps"]);
    return allowedSchemes.has(protocol.replace(/:$/, ""));
  } catch {
    return false;
  }
}
function sanitizeCheckoutRedirectUrl(req, candidateUrl, fallbackUrl) {
  return candidateUrl && isAllowedCheckoutRedirectUrl(req, candidateUrl) ? candidateUrl : fallbackUrl;
}
function sanitizePortalReturnUrl(req, candidateUrl, fallbackUrl) {
  const safeUrl = sanitizeCheckoutRedirectUrl(req, candidateUrl, fallbackUrl);
  return isNativeCheckoutRedirect(safeUrl) ? fallbackUrl : safeUrl;
}
function isNativeCheckoutRedirect(url) {
  try {
    const protocol = new URL(url).protocol.toLowerCase();
    return protocol !== "http:" && protocol !== "https:";
  } catch {
    return false;
  }
}
function getRawBodyText(req) {
  const rawBody = req.rawBody;
  if (Buffer.isBuffer(rawBody)) return rawBody.toString("utf8");
  if (typeof rawBody === "string") return rawBody;
  if (rawBody instanceof Uint8Array) return Buffer.from(rawBody).toString("utf8");
  return JSON.stringify(req.body ?? {});
}
function parseStripeSignatureHeader(headerValue) {
  const entries = headerValue.split(",").map((entry) => entry.trim()).filter(Boolean);
  let timestamp2 = "";
  const signatures = [];
  for (const entry of entries) {
    const [key, value] = entry.split("=");
    if (!key || !value) continue;
    if (key === "t") timestamp2 = value;
    if (key === "v1") signatures.push(value);
  }
  if (!timestamp2 || signatures.length === 0) return null;
  return { timestamp: timestamp2, signatures };
}
function verifyStripeWebhookSignature(payload, headerValue, secret) {
  const parsed = parseStripeSignatureHeader(headerValue);
  if (!parsed) return false;
  const nowSec = Math.floor(Date.now() / 1e3);
  const timestampSec = Number(parsed.timestamp);
  if (!Number.isFinite(timestampSec)) return false;
  if (Math.abs(nowSec - timestampSec) > STRIPE_WEBHOOK_TOLERANCE_SEC) return false;
  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = (0, import_node_crypto2.createHmac)("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return parsed.signatures.some((candidate) => {
    if (!/^[0-9a-fA-F]+$/.test(candidate) || candidate.length !== expected.length) return false;
    const candidateBuffer = Buffer.from(candidate, "hex");
    if (candidateBuffer.length !== expectedBuffer.length) return false;
    return (0, import_node_crypto2.timingSafeEqual)(candidateBuffer, expectedBuffer);
  });
}
function extractStripeInvoiceMetadata(invoice) {
  const metadataSources = [
    invoice.subscription_details?.metadata,
    invoice.parent?.subscription_details?.metadata,
    invoice.lines?.data?.[0]?.metadata,
    invoice.metadata
  ];
  const merged = {};
  for (const source of metadataSources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === "string" && value.trim().length > 0) {
        merged[key] = value.trim();
      }
    }
  }
  return merged;
}
function getNextMonthRenewalDate() {
  const renewal = /* @__PURE__ */ new Date();
  renewal.setMonth(renewal.getMonth() + 1);
  return renewal;
}
function unixSecondsToDate(input) {
  if (!Number.isFinite(input) || !input || input <= 0) return null;
  return new Date(input * 1e3);
}
async function processPaidStripeSession(session) {
  if (session.payment_status !== "paid") return;
  const metadata = session.metadata ?? {};
  const userId = normalizeStringValue(metadata.userId);
  if (!userId) return;
  const itemType = normalizeStringValue(metadata.itemType);
  const itemId = normalizeStringValue(metadata.itemId);
  const paymentIntentId = normalizeStringValue(session.payment_intent || "") || null;
  const stripeCustomerId = normalizeStringValue(session.customer || "") || null;
  const stripeSubscriptionId = normalizeStringValue(session.subscription || "") || null;
  if (itemType === "subscription") {
    const plan = SUBSCRIPTION_PLANS.find((entry) => entry.id === itemId);
    if (!plan) return;
    await db.transaction(async (tx) => {
      const inserted = await tx.insert(creditTransactions).values({
        userId,
        type: "subscription",
        amountCredits: plan.creditsPerMonth,
        amountUsdCents: plan.priceCents,
        source: "stripe",
        description: `${plan.name} subscription`,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId
      }).onConflictDoNothing().returning({ id: creditTransactions.id });
      if (inserted.length === 0) return;
      await tx.update(users).set({
        credits: import_drizzle_orm3.sql`${users.credits} + ${plan.creditsPerMonth}`,
        subscriptionPlan: plan.id,
        subscriptionRenewAt: getNextMonthRenewalDate(),
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm3.eq)(users.id, userId));
    });
    return;
  }
  const pkg = CREDIT_PACKAGES.find((entry) => entry.id === itemId);
  const creditsFromMetadata = Number.parseInt(metadata.credits || "0", 10);
  const creditsToAdd = pkg?.credits ?? creditsFromMetadata;
  if (!Number.isInteger(creditsToAdd) || creditsToAdd < 1) return;
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(creditTransactions).values({
      userId,
      type: "purchase",
      amountCredits: creditsToAdd,
      amountUsdCents: pkg?.priceCents ?? null,
      source: "stripe",
      description: "Credit package purchase",
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId
    }).onConflictDoNothing().returning({ id: creditTransactions.id });
    if (inserted.length === 0) return;
    await tx.update(users).set({
      credits: import_drizzle_orm3.sql`${users.credits} + ${creditsToAdd}`,
      stripeCustomerId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, userId));
  });
}
async function processPaidStripeInvoice(invoice) {
  const billingReason = normalizeStringValue(invoice.billing_reason).toLowerCase();
  if (billingReason !== "subscription_cycle") return;
  const paymentIntentId = normalizeStringValue(invoice.payment_intent || "");
  if (!paymentIntentId) return;
  const metadata = extractStripeInvoiceMetadata(invoice);
  const userId = normalizeStringValue(metadata.userId);
  if (!userId) return;
  const planId = normalizeStringValue(metadata.itemId || metadata.planId);
  const plan = SUBSCRIPTION_PLANS.find((entry) => entry.id === planId);
  const creditsFromMetadata = Number.parseInt(metadata.credits || "", 10);
  const creditsToAdd = plan?.creditsPerMonth ?? creditsFromMetadata;
  if (!Number.isInteger(creditsToAdd) || creditsToAdd < 1) return;
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(creditTransactions).values({
      userId,
      type: "subscription",
      amountCredits: creditsToAdd,
      amountUsdCents: typeof invoice.amount_paid === "number" && invoice.amount_paid > 0 ? invoice.amount_paid : plan?.priceCents ?? null,
      source: "stripe",
      description: plan ? `${plan.name} subscription renewal` : "Subscription renewal",
      stripeSessionId: invoice.id,
      stripePaymentIntentId: paymentIntentId
    }).onConflictDoNothing().returning({ id: creditTransactions.id });
    if (inserted.length === 0) return;
    const userUpdate = {
      credits: import_drizzle_orm3.sql`${users.credits} + ${creditsToAdd}`,
      subscriptionRenewAt: getNextMonthRenewalDate(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (plan?.id) {
      userUpdate.subscriptionPlan = plan.id;
    }
    await tx.update(users).set(userUpdate).where((0, import_drizzle_orm3.eq)(users.id, userId));
  });
}
async function processStripeCreditReversal(paymentIntentId, reversalType) {
  const markerId = `${reversalType}_${paymentIntentId}`;
  await db.transaction(async (tx) => {
    const originalTransactions = await tx.select().from(creditTransactions).where((0, import_drizzle_orm3.eq)(creditTransactions.stripePaymentIntentId, paymentIntentId));
    const original = originalTransactions.find(
      (entry) => (entry.type === "purchase" || entry.type === "subscription") && entry.amountCredits > 0
    );
    if (!original) return;
    const creditsToDeduct = Math.max(original.amountCredits, 0);
    const shouldClearSubscription = original.type === "subscription";
    const inserted = await tx.insert(creditTransactions).values({
      userId: original.userId,
      type: "refund",
      amountCredits: -creditsToDeduct,
      amountUsdCents: typeof original.amountUsdCents === "number" && original.amountUsdCents > 0 ? -Math.abs(original.amountUsdCents) : null,
      source: "stripe",
      description: reversalType === "refund" ? "Stripe refund" : "Stripe dispute chargeback",
      stripePaymentIntentId: markerId
    }).onConflictDoNothing().returning({ id: creditTransactions.id });
    if (inserted.length === 0) return;
    const userUpdate = {
      credits: import_drizzle_orm3.sql`GREATEST(${users.credits} - ${creditsToDeduct}, 0)`,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (shouldClearSubscription) {
      userUpdate.subscriptionPlan = null;
      userUpdate.subscriptionRenewAt = null;
      userUpdate.stripeSubscriptionId = null;
    }
    await tx.update(users).set(userUpdate).where((0, import_drizzle_orm3.eq)(users.id, original.userId));
  });
}
async function processStripeSubscriptionStateChange(subscription) {
  const metadata = subscription.metadata ?? {};
  const subscriptionId = normalizeStringValue(subscription.id);
  const customerId = normalizeStringValue(subscription.customer || "") || null;
  const userId = normalizeStringValue(metadata.userId);
  const planId = normalizeStringValue(metadata.itemId || metadata.planId);
  const status = normalizeStringValue(subscription.status).toLowerCase();
  const targetUserId = userId || (subscriptionId ? (await db.select({ id: users.id }).from(users).where((0, import_drizzle_orm3.eq)(users.stripeSubscriptionId, subscriptionId)).limit(1))[0]?.id : "");
  if (!targetUserId) return;
  const renewal = unixSecondsToDate(subscription.current_period_end);
  const isActiveStatus = (/* @__PURE__ */ new Set(["active", "trialing", "past_due"])).has(status);
  await db.update(users).set({
    subscriptionPlan: isActiveStatus ? planId || null : null,
    subscriptionRenewAt: isActiveStatus ? renewal : null,
    stripeCustomerId: customerId,
    stripeSubscriptionId: isActiveStatus ? subscriptionId || null : null,
    updatedAt: /* @__PURE__ */ new Date()
  }).where((0, import_drizzle_orm3.eq)(users.id, targetUserId));
}
async function grantVerifiedInAppCredits(params) {
  return db.transaction(async (tx) => {
    const [user] = await tx.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
    if (!user) {
      return { status: "missing_user", credits: 0 };
    }
    const inserted = await tx.insert(creditTransactions).values({
      userId: params.userId,
      type: "purchase",
      amountCredits: params.credits,
      amountUsdCents: null,
      source: "app",
      description: params.description,
      stripePaymentIntentId: params.transactionId
    }).onConflictDoNothing().returning({ id: creditTransactions.id });
    if (inserted.length === 0) {
      const [existingTransaction] = await tx.select({ userId: creditTransactions.userId }).from(creditTransactions).where((0, import_drizzle_orm3.eq)(creditTransactions.stripePaymentIntentId, params.transactionId));
      const [existingUser] = await tx.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
      return {
        status: "duplicate",
        credits: existingUser?.credits ?? user.credits,
        existingOwnerId: existingTransaction?.userId ?? null
      };
    }
    await tx.update(users).set({
      credits: import_drizzle_orm3.sql`${users.credits} + ${params.credits}`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
    const [updatedUser] = await tx.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
    return {
      status: "granted",
      credits: updatedUser?.credits ?? user.credits + params.credits
    };
  });
}
async function grantVerifiedAppleSubscriptionCredits(params) {
  return db.transaction(async (tx) => {
    const [user] = await tx.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
    if (!user) {
      return { status: "missing_user", credits: 0 };
    }
    const inserted = await tx.insert(creditTransactions).values({
      userId: params.userId,
      type: "subscription",
      amountCredits: params.credits,
      amountUsdCents: params.amountUsdCents,
      source: "app",
      description: params.description,
      stripePaymentIntentId: params.transactionId
    }).onConflictDoNothing().returning({ id: creditTransactions.id });
    if (inserted.length === 0) {
      const [existingTransaction] = await tx.select({ userId: creditTransactions.userId }).from(creditTransactions).where((0, import_drizzle_orm3.eq)(creditTransactions.stripePaymentIntentId, params.transactionId));
      const [existingUser] = await tx.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
      return {
        status: "duplicate",
        credits: existingUser?.credits ?? user.credits,
        existingOwnerId: existingTransaction?.userId ?? null
      };
    }
    await tx.update(users).set({
      credits: import_drizzle_orm3.sql`${users.credits} + ${params.credits}`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
    const [updatedUser] = await tx.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
    return {
      status: "granted",
      credits: updatedUser?.credits ?? user.credits + params.credits
    };
  });
}
async function verifyAppleReceiptData(receiptData, receiptEnvironmentHint) {
  const sharedSecret = process.env.APPLE_SHARED_SECRET || "";
  if (!sharedSecret) {
    console.warn("[apple-iap] APPLE_SHARED_SECRET is not set \u2014 receipt verification will fail with status 21003/21004.");
  }
  const verifyReceipt = async (url) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "receipt-data": receiptData,
        password: sharedSecret,
        "exclude-old-transactions": false
      })
    });
    return response.json();
  };
  const isSandboxHint = typeof receiptEnvironmentHint === "string" && receiptEnvironmentHint.toLowerCase() === "sandbox";
  let appleResult;
  if (isSandboxHint) {
    appleResult = await verifyReceipt("https://sandbox.itunes.apple.com/verifyReceipt");
    if (appleResult?.status === 21008) {
      appleResult = await verifyReceipt("https://buy.itunes.apple.com/verifyReceipt");
    }
  } else {
    appleResult = await verifyReceipt("https://buy.itunes.apple.com/verifyReceipt");
    if (appleResult?.status === 21007 || appleResult?.status === 21004 || appleResult?.status === 21002) {
      appleResult = await verifyReceipt("https://sandbox.itunes.apple.com/verifyReceipt");
    } else if (appleResult?.status === 21008) {
      appleResult = await verifyReceipt("https://buy.itunes.apple.com/verifyReceipt");
    }
  }
  if (appleResult?.status !== 0) {
    const appleStatus = appleResult?.status ?? "unknown";
    console.error(`[apple-iap] Receipt verification failed: Apple status ${appleStatus}`, {
      productionStatus: isSandboxHint ? void 0 : appleStatus,
      isSandboxHint,
      sharedSecretSet: Boolean(sharedSecret)
    });
    throw new Error(`Apple receipt verification failed (status: ${appleStatus})`);
  }
  const expectedBundleId = normalizeStringValue(
    process.env.APPLE_BUNDLE_ID || process.env.EXPO_PUBLIC_APPLE_BUNDLE_ID
  );
  const receiptBundleId = normalizeStringValue(appleResult?.receipt?.bundle_id);
  if (expectedBundleId && receiptBundleId !== expectedBundleId) {
    throw new Error("Apple receipt bundle ID mismatch");
  }
  return appleResult;
}
function getAppleReceiptTransactions(appleResult) {
  if (Array.isArray(appleResult?.latest_receipt_info)) {
    return appleResult.latest_receipt_info;
  }
  if (Array.isArray(appleResult?.receipt?.in_app)) {
    return appleResult.receipt.in_app;
  }
  return [];
}
async function getUserCreditsSubscriptionState(userId) {
  const [user] = await db.select({
    credits: users.credits,
    appleOriginalTransactionId: users.appleOriginalTransactionId,
    subscriptionPlan: users.subscriptionPlan,
    subscriptionRenewAt: users.subscriptionRenewAt,
    stripeSubscriptionId: users.stripeSubscriptionId
  }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
  return {
    credits: user?.credits ?? 0,
    ...user ? serializeSubscriptionState(user) : { subscription: null, subscriptionProvider: null, subscriptionRenewAt: null }
  };
}
async function linkAppleOriginalTransactionId(userId, originalTransactionId) {
  const normalizedOriginalTransactionId = normalizeStringValue(originalTransactionId);
  if (!normalizedOriginalTransactionId) return;
  await db.update(users).set({
    appleOriginalTransactionId: normalizedOriginalTransactionId,
    updatedAt: /* @__PURE__ */ new Date()
  }).where((0, import_drizzle_orm3.eq)(users.id, userId));
}
async function applyAppleSubscriptionNotificationUpdate(params) {
  const normalizedOriginalTransactionId = normalizeStringValue(params.originalTransactionId);
  const normalizedProductId = normalizeStringValue(params.productId);
  const normalizedTransactionId = normalizeStringValue(params.transactionId);
  const planId = APPLE_IAP_SUBSCRIPTION_PRODUCTS[normalizedProductId];
  const plan = planId ? getSubscriptionPlanById(planId) : void 0;
  const isActive = Boolean(plan) && params.revocationMs <= 0 && params.expiresMs > Date.now();
  if (normalizedOriginalTransactionId) {
    await linkAppleOriginalTransactionId(params.userId, normalizedOriginalTransactionId);
  }
  if (plan && normalizedTransactionId && params.revocationMs <= 0) {
    await grantVerifiedAppleSubscriptionCredits({
      userId: params.userId,
      transactionId: normalizedTransactionId,
      credits: plan.creditsPerMonth,
      amountUsdCents: plan.priceCents,
      description: `${plan.name} Apple subscription`
    });
  }
  if (isActive && plan) {
    await db.update(users).set({
      appleOriginalTransactionId: normalizedOriginalTransactionId || null,
      subscriptionPlan: plan.id,
      subscriptionRenewAt: new Date(params.expiresMs),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
    return;
  }
  const [currentUser] = await db.select({
    appleOriginalTransactionId: users.appleOriginalTransactionId,
    stripeSubscriptionId: users.stripeSubscriptionId,
    subscriptionPlan: users.subscriptionPlan
  }).from(users).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
  if (currentUser?.subscriptionPlan && resolveSubscriptionProvider(currentUser) === "apple" && (!normalizedOriginalTransactionId || currentUser.appleOriginalTransactionId === normalizedOriginalTransactionId)) {
    await db.update(users).set({
      subscriptionPlan: null,
      subscriptionRenewAt: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
  }
}
async function findUserForAppleNotification(params) {
  const accountToken = normalizeStringValue(params.appAccountToken);
  if (accountToken) {
    const [userById] = await db.select({ id: users.id }).from(users).where((0, import_drizzle_orm3.eq)(users.id, accountToken));
    if (userById) {
      return userById;
    }
  }
  const originalTransactionId = normalizeStringValue(params.originalTransactionId);
  if (!originalTransactionId) {
    return null;
  }
  const [userByOriginalTransaction] = await db.select({ id: users.id }).from(users).where((0, import_drizzle_orm3.eq)(users.appleOriginalTransactionId, originalTransactionId));
  return userByOriginalTransaction || null;
}
async function syncAppleSubscriptionReceiptState(params) {
  const appleResult = await verifyAppleReceiptData(params.receiptData, params.receiptEnvironmentHint);
  const knownSubscriptionProductIds = new Set(Object.keys(APPLE_IAP_SUBSCRIPTION_PRODUCTS));
  const receiptTransactions = getAppleReceiptTransactions(appleResult).filter((transaction) => knownSubscriptionProductIds.has(normalizeStringValue(transaction?.product_id))).filter((transaction) => {
    if (!params.productId) return true;
    return normalizeStringValue(transaction?.product_id) === params.productId;
  }).sort((a, b) => {
    const aMs = Number.parseInt(String(a?.purchase_date_ms || "0"), 10);
    const bMs = Number.parseInt(String(b?.purchase_date_ms || "0"), 10);
    return aMs - bMs;
  });
  if (params.productId && !APPLE_IAP_SUBSCRIPTION_PRODUCTS[params.productId]) {
    throw new Error("Unknown Apple subscription product ID");
  }
  let lastGrantCredits = 0;
  for (const transaction of receiptTransactions) {
    const transactionId = normalizeStringValue(transaction?.transaction_id);
    const originalTransactionId = normalizeStringValue(transaction?.original_transaction_id);
    const receiptProductId = normalizeStringValue(transaction?.product_id);
    const planId = APPLE_IAP_SUBSCRIPTION_PRODUCTS[receiptProductId];
    const plan = planId ? getSubscriptionPlanById(planId) : void 0;
    const cancellationDateMs = Number.parseInt(String(transaction?.cancellation_date_ms || "0"), 10);
    if (!transactionId || !plan || cancellationDateMs > 0) {
      continue;
    }
    if (originalTransactionId) {
      await linkAppleOriginalTransactionId(params.userId, originalTransactionId);
    }
    const grantResult = await grantVerifiedAppleSubscriptionCredits({
      userId: params.userId,
      transactionId,
      credits: plan.creditsPerMonth,
      amountUsdCents: plan.priceCents,
      description: `${plan.name} Apple subscription`
    });
    if (grantResult.status === "missing_user") {
      throw new Error("User not found");
    }
    if (grantResult.status === "duplicate" && grantResult.existingOwnerId && grantResult.existingOwnerId !== params.userId) {
      return { status: "claimed_by_other_user" };
    }
    if (grantResult.status === "granted") {
      lastGrantCredits = grantResult.credits;
    }
  }
  const nowMs = Date.now();
  const activeTransaction = receiptTransactions.filter((transaction) => Number.parseInt(String(transaction?.cancellation_date_ms || "0"), 10) <= 0).sort((a, b) => {
    const aMs = Number.parseInt(String(a?.expires_date_ms || a?.purchase_date_ms || "0"), 10);
    const bMs = Number.parseInt(String(b?.expires_date_ms || b?.purchase_date_ms || "0"), 10);
    return bMs - aMs;
  }).find((transaction) => {
    const expiresMs = Number.parseInt(String(transaction?.expires_date_ms || "0"), 10);
    return expiresMs > nowMs;
  });
  const [currentUser] = await db.select({
    subscriptionPlan: users.subscriptionPlan,
    stripeSubscriptionId: users.stripeSubscriptionId
  }).from(users).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
  if (activeTransaction) {
    const activeProductId = normalizeStringValue(activeTransaction?.product_id);
    const activeOriginalTransactionId = normalizeStringValue(activeTransaction?.original_transaction_id);
    const activePlanId = APPLE_IAP_SUBSCRIPTION_PRODUCTS[activeProductId];
    const activePlan = activePlanId ? getSubscriptionPlanById(activePlanId) : void 0;
    const expiresMs = Number.parseInt(String(activeTransaction?.expires_date_ms || "0"), 10);
    if (activePlan && expiresMs > nowMs) {
      await db.update(users).set({
        appleOriginalTransactionId: activeOriginalTransactionId || null,
        subscriptionPlan: activePlan.id,
        subscriptionRenewAt: new Date(expiresMs),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
    }
  } else if (currentUser?.subscriptionPlan && resolveSubscriptionProvider(currentUser) === "apple") {
    await db.update(users).set({
      subscriptionPlan: null,
      subscriptionRenewAt: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, params.userId));
  }
  return {
    status: "ok",
    credits: lastGrantCredits
  };
}
async function createGoogleJwt(serviceAccount) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1e3);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const headerPart = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${headerPart}.${payloadPart}`;
  const signer = (0, import_node_crypto2.createSign)("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, "base64url");
  return `${signingInput}.${signature}`;
}
async function getGoogleAccessToken(jwt) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  if (!response.ok) {
    throw new Error("Failed to get Google access token");
  }
  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error("Google access token is missing from response");
  }
  return payload.access_token;
}
async function registerRoutes(app2) {
  app2.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "instame-api",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body ?? {};
      if (!name?.trim() || !email?.trim() || !password?.trim()) {
        return res.status(400).json({ error: "Name, email and password are required" });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      const passwordValidationMessage = getPasswordValidationMessage(password);
      if (passwordValidationMessage) {
        return res.status(400).json({ error: passwordValidationMessage });
      }
      const normalizedEmail = normalizeEmail(email);
      const [existing] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.email, normalizedEmail));
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const [newUser] = await db.insert(users).values({
        id: (0, import_node_crypto2.randomUUID)(),
        email: normalizedEmail,
        name: name.trim(),
        passwordHash: hashPassword(password),
        authProvider: "email",
        credits: getInitialCredits()
      }).returning();
      const accessToken = generateAccessToken({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      });
      const refreshToken = generateRefreshToken();
      await createSession(newUser.id, refreshToken);
      res.status(201).json({
        user: sanitizeUser(newUser),
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Registration failed") });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      if (!email?.trim() || !password?.trim()) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.email, normalizeEmail(email)));
      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        name: user.name
      });
      const refreshToken = generateRefreshToken();
      await createSession(user.id, refreshToken);
      res.json({
        user: sanitizeUser(user),
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Login failed") });
    }
  });
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body ?? {};
      if (!email?.trim()) {
        return res.status(400).json({ error: "Email is required" });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      if (!isTransactionalEmailConfigured()) {
        return res.status(503).json({
          error: "Password reset email is not configured yet. Set RESEND_API_KEY and RESEND_FROM_EMAIL."
        });
      }
      const normalizedEmail = normalizeEmail(email);
      const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.email, normalizedEmail));
      if (user && user.authProvider === "email" && user.passwordHash) {
        const resetToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
        await db.update(users).set({
          passwordResetTokenHash: hashToken(resetToken),
          passwordResetTokenExpiresAt: expiresAt,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm3.eq)(users.id, user.id));
        const resetUrl = buildPasswordResetUrl(req, normalizedEmail, resetToken);
        await sendTransactionalEmail({
          to: normalizedEmail,
          subject: "Reset your Chicoo password",
          html: buildPasswordResetEmailHtml(user.name, resetUrl),
          text: buildPasswordResetEmailText(user.name, resetUrl)
        });
      }
      res.json({
        success: true,
        message: "If that email is linked to a Chicoo password account, a reset link has been sent."
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Failed to send password reset email") });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, token, newPassword } = req.body ?? {};
      if (!email?.trim() || !token?.trim() || !newPassword?.trim()) {
        return res.status(400).json({ error: "Email, token and new password are required" });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      const passwordValidationMessage = getPasswordValidationMessage(newPassword);
      if (passwordValidationMessage) {
        return res.status(400).json({ error: passwordValidationMessage });
      }
      const normalizedEmail = normalizeEmail(email);
      const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.email, normalizedEmail));
      if (!user || user.authProvider !== "email" || !user.passwordHash) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }
      const expiresAt = user.passwordResetTokenExpiresAt;
      const tokenIsValid = isMatchingHashedToken(token, user.passwordResetTokenHash);
      const tokenIsExpired = !expiresAt || expiresAt.getTime() < Date.now();
      if (!tokenIsValid || tokenIsExpired) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }
      await db.update(users).set({
        passwordHash: hashPassword(newPassword),
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm3.eq)(users.id, user.id));
      await revokeAllSessions(user.id);
      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Password reset failed") });
    }
  });
  app2.post("/api/auth/change-password", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { currentPassword, newPassword } = req.body ?? {};
      if (!currentPassword?.trim() || !newPassword?.trim()) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }
      const passwordValidationMessage = getPasswordValidationMessage(newPassword);
      if (passwordValidationMessage) {
        return res.status(400).json({ error: passwordValidationMessage });
      }
      const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.authProvider !== "email" || !user.passwordHash) {
        return res.status(400).json({
          error: "This account uses social sign-in. Use Apple or Google sign-in instead."
        });
      }
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      if (verifyPassword(newPassword, user.passwordHash)) {
        return res.status(400).json({ error: "Choose a different password from the current one" });
      }
      await db.update(users).set({
        passwordHash: hashPassword(newPassword),
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm3.eq)(users.id, user.id));
      await revokeAllSessions(user.id);
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        name: user.name
      });
      const refreshToken = generateRefreshToken();
      await createSession(user.id, refreshToken);
      res.json({
        success: true,
        message: "Password updated successfully",
        user: sanitizeUser(user),
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Failed to update password") });
    }
  });
  app2.post("/api/auth/social", async (req, res) => {
    try {
      const { provider, idToken, identityToken, email, name } = req.body ?? {};
      if (!provider || !["apple", "google"].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider" });
      }
      let providerId = "";
      let normalizedEmail = null;
      let resolvedName = typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
      if (provider === "google") {
        if (typeof idToken !== "string" || idToken.length === 0) {
          return res.status(400).json({ error: "Google idToken is required" });
        }
        const googleIdentity = await verifyGoogleIdToken(idToken);
        providerId = googleIdentity.sub;
        normalizedEmail = normalizeEmail(googleIdentity.email);
        if (!resolvedName) {
          resolvedName = googleIdentity.name || normalizedEmail.split("@")[0];
        }
      } else {
        if (typeof identityToken !== "string" || identityToken.length === 0) {
          return res.status(400).json({ error: "Apple identityToken is required" });
        }
        const appleIdentity = await verifyAppleIdentityToken(identityToken);
        providerId = appleIdentity.sub;
        const normalizedRequestEmail = typeof email === "string" && email.trim().length > 0 ? normalizeEmail(email) : null;
        normalizedEmail = appleIdentity.email ? normalizeEmail(appleIdentity.email) : normalizedRequestEmail;
        if (!resolvedName) {
          resolvedName = "Apple User";
        }
      }
      const [existingByProvider] = await db.select().from(users).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(users.authProvider, provider), (0, import_drizzle_orm3.eq)(users.providerId, providerId)));
      let user = existingByProvider;
      if (!user) {
        if (!normalizedEmail) {
          return res.status(400).json({
            error: "No email received from provider. Please sign in again and share your email."
          });
        }
        if (!isValidEmail(normalizedEmail)) {
          return res.status(400).json({ error: "Invalid email address" });
        }
        const [existingByEmail] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.email, normalizedEmail));
        if (existingByEmail && existingByEmail.authProvider === "email") {
          return res.status(400).json({
            error: "This email is already used by an email/password account"
          });
        }
        if (existingByEmail) {
          const [updated] = await db.update(users).set({
            authProvider: provider,
            providerId,
            name: resolvedName || existingByEmail.name,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm3.eq)(users.id, existingByEmail.id)).returning();
          user = updated;
        } else {
          const [created] = await db.insert(users).values({
            id: (0, import_node_crypto2.randomUUID)(),
            email: normalizedEmail,
            name: resolvedName || normalizedEmail.split("@")[0],
            authProvider: provider,
            providerId,
            credits: getInitialCredits()
          }).returning();
          user = created;
        }
      }
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        name: user.name
      });
      const refreshToken = generateRefreshToken();
      await createSession(user.id, refreshToken);
      res.status(201).json({
        user: sanitizeUser(user),
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error("Social login error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Social login failed") });
    }
  });
  app2.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body ?? {};
      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
      }
      const userId = await validateRefreshToken(refreshToken);
      if (!userId) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }
      const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      await revokeSession(refreshToken);
      const nextRefreshToken = generateRefreshToken();
      await createSession(user.id, nextRefreshToken);
      res.json({
        accessToken: generateAccessToken({
          id: user.id,
          email: user.email,
          name: user.name
        }),
        refreshToken: nextRefreshToken
      });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Failed to refresh session") });
    }
  });
  app2.post("/api/auth/logout", authMiddleware, async (req, res) => {
    try {
      const { refreshToken } = req.body ?? {};
      if (refreshToken) {
        await revokeSession(refreshToken);
      } else if (req.user?.id) {
        await revokeAllSessions(req.user.id);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });
  app2.delete("/api/auth/account", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const [deletedUser] = await db.delete(users).where((0, import_drizzle_orm3.eq)(users.id, userId)).returning({ id: users.id });
      if (!deletedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });
  app2.get("/api/profile", authMiddleware, async (req, res) => {
    try {
      const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Failed to load profile" });
    }
  });
  app2.put("/api/profile", authMiddleware, async (req, res) => {
    try {
      const { name, stylePreferences, favoriteLooks, notificationsEnabled, styleGender } = req.body ?? {};
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (typeof name === "string" && name.trim()) {
        updateData.name = name.trim();
      }
      if (Array.isArray(stylePreferences)) {
        updateData.stylePreferences = stylePreferences.filter((x) => typeof x === "string");
      }
      if (Array.isArray(favoriteLooks)) {
        updateData.favoriteLooks = favoriteLooks.filter((x) => typeof x === "string");
      }
      if (typeof notificationsEnabled === "boolean") {
        updateData.notificationsEnabled = notificationsEnabled;
      }
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "styleGender")) {
        const normalizedStyleGender = normalizeStyleGender(styleGender);
        updateData.styleGender = normalizedStyleGender || null;
      }
      const [updatedUser] = await db.update(users).set(updateData).where((0, import_drizzle_orm3.eq)(users.id, req.user.id)).returning();
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  app2.post("/api/stripe/webhook", async (req, res) => {
    try {
      const payloadText = getRawBodyText(req);
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      const signatureHeader = firstHeaderValue(req.headers["stripe-signature"]);
      if (!secret && process.env.NODE_ENV === "production") {
        console.error("STRIPE_WEBHOOK_SECRET is required in production");
        return res.status(500).json({ error: "Stripe webhook is not configured" });
      }
      if (secret) {
        if (!signatureHeader || !verifyStripeWebhookSignature(payloadText, signatureHeader, secret)) {
          return res.status(400).json({ error: "Invalid Stripe webhook signature" });
        }
      }
      const event = req.body && typeof req.body === "object" ? req.body : JSON.parse(payloadText || "{}");
      const eventType = normalizeStringValue(event.type);
      const payload = event.data?.object;
      if (!eventType || !payload || typeof payload !== "object") {
        return res.status(400).json({ error: "Invalid Stripe webhook payload" });
      }
      if (eventType === "checkout.session.completed") {
        await processPaidStripeSession(payload);
      } else if (eventType === "invoice.paid") {
        await processPaidStripeInvoice(payload);
      } else if (eventType === "customer.subscription.updated" || eventType === "customer.subscription.deleted") {
        await processStripeSubscriptionStateChange(payload);
      } else if (eventType === "charge.refunded") {
        const paymentIntentId = normalizeStringValue(payload.payment_intent);
        if (paymentIntentId) {
          await processStripeCreditReversal(paymentIntentId, "refund");
        }
      } else if (eventType === "charge.dispute.created") {
        const paymentIntentId = normalizeStringValue(payload.payment_intent);
        if (paymentIntentId) {
          await processStripeCreditReversal(paymentIntentId, "dispute");
        }
      }
      return res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      return res.status(500).json({ error: "Failed to process Stripe webhook" });
    }
  });
  app2.post("/api/apple/server-notifications", async (req, res) => {
    try {
      const signedPayload = normalizeStringValue(req.body?.signedPayload);
      if (!signedPayload) {
        return res.status(400).json({ error: "Missing signedPayload" });
      }
      const payload = await verifyAppleServerSignedPayload(signedPayload);
      const data = payload.data || {};
      const transactionPayload = decodeAppleSignedSubPayload(data.signedTransactionInfo);
      const renewalPayload = decodeAppleSignedSubPayload(data.signedRenewalInfo);
      const expectedBundleId = normalizeStringValue(
        process.env.APPLE_BUNDLE_ID || process.env.EXPO_PUBLIC_APPLE_BUNDLE_ID
      );
      const bundleId = normalizeStringValue(transactionPayload?.bundleId || data.bundleId);
      if (expectedBundleId && bundleId && bundleId !== expectedBundleId) {
        return res.status(400).json({ error: "Apple notification bundle ID mismatch" });
      }
      const user = await findUserForAppleNotification({
        appAccountToken: transactionPayload?.appAccountToken,
        originalTransactionId: transactionPayload?.originalTransactionId || renewalPayload?.originalTransactionId
      });
      if (!user) {
        return res.status(200).json({ received: true, ignored: true, reason: "user_not_found" });
      }
      const productId = normalizeStringValue(
        transactionPayload?.productId || renewalPayload?.autoRenewProductId || renewalPayload?.productId
      );
      const originalTransactionId = normalizeStringValue(
        transactionPayload?.originalTransactionId || renewalPayload?.originalTransactionId
      );
      const transactionId = normalizeStringValue(transactionPayload?.transactionId) || null;
      const expiresMs = parseAppleMilliseconds(transactionPayload?.expiresDate);
      const revocationMs = parseAppleMilliseconds(transactionPayload?.revocationDate);
      if (productId || originalTransactionId) {
        await applyAppleSubscriptionNotificationUpdate({
          userId: user.id,
          transactionId,
          originalTransactionId: originalTransactionId || null,
          productId: productId || null,
          expiresMs,
          revocationMs
        });
      }
      const autoRenewStatus = parseAppleBooleanFlag(renewalPayload?.autoRenewStatus);
      if (autoRenewStatus === false && expiresMs <= Date.now()) {
        const [currentUser] = await db.select({
          appleOriginalTransactionId: users.appleOriginalTransactionId,
          stripeSubscriptionId: users.stripeSubscriptionId,
          subscriptionPlan: users.subscriptionPlan
        }).from(users).where((0, import_drizzle_orm3.eq)(users.id, user.id));
        if (currentUser?.subscriptionPlan && resolveSubscriptionProvider(currentUser) === "apple" && (!originalTransactionId || currentUser.appleOriginalTransactionId === originalTransactionId)) {
          await db.update(users).set({
            subscriptionPlan: null,
            subscriptionRenewAt: null,
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm3.eq)(users.id, user.id));
        }
      }
      return res.status(200).json({
        received: true,
        notificationType: normalizeStringValue(payload.notificationType),
        subtype: normalizeStringValue(payload.subtype) || null
      });
    } catch (error) {
      console.error("Apple server notification error:", error);
      return res.status(400).json({ error: toErrorMessage(error, "Invalid Apple server notification") });
    }
  });
  app2.get("/api/credits", authMiddleware, async (req, res) => {
    try {
      const [user] = await db.select({
        credits: users.credits,
        subscriptionPlan: users.subscriptionPlan,
        subscriptionRenewAt: users.subscriptionRenewAt,
        stripeSubscriptionId: users.stripeSubscriptionId
      }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        credits: user.credits,
        ...serializeSubscriptionState(user)
      });
    } catch (error) {
      console.error("Get credits error:", error);
      res.status(500).json({ error: "Failed to load credits" });
    }
  });
  app2.post("/api/credits/use", authMiddleware, async (req, res) => {
    try {
      const { feature: rawFeature } = req.body ?? {};
      const feature = normalizeStringValue(rawFeature) || "style_generation";
      const consumed = await consumeCredits(req.user.id, 1, feature);
      if (!consumed) {
        return res.status(402).json({ error: "Not enough credits" });
      }
      const [user] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      res.json({ success: true, credits: user?.credits ?? 0 });
    } catch (error) {
      console.error("Use credit error:", error);
      res.status(500).json({ error: "Failed to use credit" });
    }
  });
  app2.post("/api/credits/dev-grant", authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const grantAmount = resolveDevCreditGrantAmount(req.body?.amount);
      const [user] = await db.select({ credits: users.credits, email: users.email }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const canUseDeveloperGrant = isDevCreditGrantEnabled() || isDevCreditGrantAllowedForEmail(user.email);
      if (!canUseDeveloperGrant) {
        return res.status(403).json({ error: "Developer credit grants are disabled for this account." });
      }
      const nextCredits = user.credits + grantAmount;
      await db.update(users).set({ credits: nextCredits, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(users.id, userId));
      await db.insert(creditTransactions).values({
        userId,
        type: "purchase",
        amountCredits: grantAmount,
        amountUsdCents: 0,
        source: "manual",
        description: "Developer test credit grant"
      });
      return res.json({
        success: true,
        grantedCredits: grantAmount,
        credits: nextCredits
      });
    } catch (error) {
      console.error("Dev grant credits error:", error);
      return res.status(500).json({ error: toErrorMessage(error, "Failed to grant test credits") });
    }
  });
  app2.get("/api/credits/packages", (_req, res) => {
    res.json(
      CREDIT_PACKAGES.map((pkg) => ({
        ...pkg,
        price: pkg.priceCents / 100
      }))
    );
  });
  app2.get("/api/credits/transactions", authMiddleware, async (req, res) => {
    try {
      const rows = await db.select().from(creditTransactions).where((0, import_drizzle_orm3.eq)(creditTransactions.userId, req.user.id)).orderBy((0, import_drizzle_orm3.desc)(creditTransactions.createdAt)).limit(50);
      res.json(rows);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Failed to load transactions" });
    }
  });
  app2.post("/api/credits/billing-portal", authMiddleware, async (req, res) => {
    try {
      const returnUrlInput = normalizeStringValue(req.body?.returnUrl);
      const [user] = await db.select({
        stripeCustomerId: users.stripeCustomerId,
        subscriptionPlan: users.subscriptionPlan
      }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (!user.stripeCustomerId) {
        return res.status(409).json({
          error: "No Stripe billing profile is attached to this account yet."
        });
      }
      const defaultReturnUrl = `${getDefaultBaseUrl(req)}/credits`;
      const returnUrl = sanitizePortalReturnUrl(req, returnUrlInput, defaultReturnUrl);
      const session = await createStripeBillingPortalSession({
        customerId: user.stripeCustomerId,
        returnUrl
      });
      if (!session.url) {
        return res.status(500).json({ error: "Billing portal URL unavailable" });
      }
      return res.json({
        url: session.url,
        hasActiveSubscription: Boolean(user.subscriptionPlan)
      });
    } catch (error) {
      console.error("Billing portal error:", error);
      return res.status(500).json({ error: toErrorMessage(error, "Failed to open billing portal") });
    }
  });
  app2.post("/api/credits/subscription", authMiddleware, async (req, res) => {
    return res.status(410).json({
      error: "Direct subscription activation is disabled. Use /api/credits/checkout to start a paid subscription."
    });
  });
  app2.post("/api/credits/checkout", authMiddleware, async (req, res) => {
    try {
      const {
        itemType: rawItemType,
        itemId: rawItemId,
        successUrl: rawSuccessUrl,
        cancelUrl: rawCancelUrl
      } = req.body ?? {};
      const itemType = normalizeStringValue(rawItemType);
      const itemId = normalizeStringValue(rawItemId);
      const successUrl = normalizeStringValue(rawSuccessUrl);
      const cancelUrl = normalizeStringValue(rawCancelUrl);
      if (!itemType || !itemId) {
        return res.status(400).json({ error: "itemType and itemId are required" });
      }
      const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      if (!user) return res.status(404).json({ error: "User not found" });
      const defaultBaseUrl = getDefaultBaseUrl(req);
      const mode = itemType === "subscription" ? "subscription" : "payment";
      const defaultSuccessUrl = `${defaultBaseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = `${defaultBaseUrl}/credits`;
      const safeSuccessUrl = sanitizeCheckoutRedirectUrl(req, successUrl, defaultSuccessUrl);
      const safeCancelUrl = sanitizeCheckoutRedirectUrl(req, cancelUrl, defaultCancelUrl);
      const nativeCheckoutRedirect = isNativeCheckoutRedirect(safeSuccessUrl) || isNativeCheckoutRedirect(safeCancelUrl);
      if (nativeCheckoutRedirect) {
        return res.status(400).json({
          error: mode === "subscription" ? "Mobile subscriptions are not available in-app yet. Use the web checkout flow." : "Mobile credit purchases must use Apple or Google in-app purchase."
        });
      }
      if (mode === "payment") {
        const pkg = CREDIT_PACKAGES.find((p) => p.id === itemId);
        if (!pkg) return res.status(400).json({ error: "Invalid package" });
        const session2 = await createStripeCheckoutSession({
          mode,
          customerEmail: user.email,
          customerName: user.name,
          productName: `${pkg.credits} Credits`,
          unitAmountCents: pkg.priceCents,
          successUrl: safeSuccessUrl,
          cancelUrl: safeCancelUrl,
          clientReferenceId: user.id,
          metadata: {
            userId: user.id,
            itemType: "package",
            itemId: pkg.id,
            credits: String(pkg.credits)
          }
        });
        return res.json({ url: session2.url, sessionId: session2.id });
      }
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === itemId);
      if (!plan) return res.status(400).json({ error: "Invalid subscription plan" });
      if (user.subscriptionPlan) {
        return res.status(409).json({
          error: "An active subscription is already attached to this account."
        });
      }
      const session = await createStripeCheckoutSession({
        mode: "subscription",
        customerEmail: user.email,
        customerName: user.name,
        productName: `${plan.name} Subscription`,
        unitAmountCents: plan.priceCents,
        successUrl: safeSuccessUrl,
        cancelUrl: safeCancelUrl,
        clientReferenceId: user.id,
        metadata: {
          userId: user.id,
          itemType: "subscription",
          itemId: plan.id,
          credits: String(plan.creditsPerMonth)
        }
      });
      return res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Failed to create checkout session") });
    }
  });
  app2.get("/api/credits/verify-session/:sessionId", authMiddleware, async (req, res) => {
    try {
      const sessionId = normalizeStringValue(req.params.sessionId);
      if (!sessionId) {
        return res.status(400).json({ error: "Missing session id" });
      }
      const session = await retrieveStripeCheckoutSession(sessionId);
      if (session.payment_status !== "paid") {
        return res.json({ success: false, status: session.payment_status || session.status });
      }
      const userId = session.metadata?.userId;
      if (!userId || userId !== req.user.id) {
        return res.status(403).json({ error: "Session does not belong to this user" });
      }
      await processPaidStripeSession(session);
      const state = await getUserCreditsSubscriptionState(req.user.id);
      res.json({
        success: true,
        ...state
      });
    } catch (error) {
      console.error("Verify session error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Failed to verify payment session") });
    }
  });
  app2.post("/api/credits/apple-verify", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const receiptData = normalizeStringValue(req.body?.receiptData);
      const productId = normalizeStringValue(req.body?.productId);
      if (!receiptData || !productId) {
        return res.status(400).json({ success: false, error: "Missing receipt data or product ID" });
      }
      const receiptEnvironmentHint = normalizeStringValue(req.body?.receiptEnvironment);
      const expectedCredits = APPLE_IAP_PRODUCT_CREDITS[productId];
      const subscriptionPlanId = APPLE_IAP_SUBSCRIPTION_PRODUCTS[productId];
      const subscriptionPlan = subscriptionPlanId ? getSubscriptionPlanById(subscriptionPlanId) : void 0;
      if (!expectedCredits && !subscriptionPlan) {
        return res.status(400).json({ success: false, error: "Unknown Apple product ID" });
      }
      if (subscriptionPlan) {
        const syncResult = await syncAppleSubscriptionReceiptState({
          userId,
          receiptData,
          receiptEnvironmentHint,
          productId
        });
        if (syncResult.status === "claimed_by_other_user") {
          return res.status(409).json({ success: false, error: "This Apple subscription is already linked to another account." });
        }
        const state = await getUserCreditsSubscriptionState(userId);
        return res.json({
          success: true,
          ...state
        });
      }
      const appleResult = await verifyAppleReceiptData(receiptData, receiptEnvironmentHint);
      const receiptEnvironment = normalizeStringValue(appleResult?.environment);
      const matchingTransactions = getAppleReceiptTransactions(appleResult).filter((item) => item?.product_id === productId).sort((a, b) => {
        const aMs = Number.parseInt(String(a?.purchase_date_ms || "0"), 10);
        const bMs = Number.parseInt(String(b?.purchase_date_ms || "0"), 10);
        return bMs - aMs;
      });
      if (matchingTransactions.length === 0) {
        return res.status(400).json({ success: false, error: "Product ID mismatch in Apple receipt" });
      }
      for (const transaction of matchingTransactions) {
        const candidateId = normalizeStringValue(transaction?.transaction_id);
        if (!candidateId) continue;
        const grantResult = await grantVerifiedInAppCredits({
          userId,
          transactionId: candidateId,
          credits: expectedCredits,
          description: "Apple in-app credit purchase"
        });
        if (grantResult.status === "missing_user") {
          return res.status(404).json({ success: false, error: "User not found" });
        }
        if (grantResult.status === "granted") {
          return res.json({
            success: true,
            credits: grantResult.credits,
            receiptEnvironment: receiptEnvironment || void 0
          });
        }
        if (grantResult.existingOwnerId && grantResult.existingOwnerId !== userId) {
          return res.status(409).json({ success: false, error: "This Apple purchase was already claimed." });
        }
      }
      const [existingUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      return res.json({
        success: true,
        credits: existingUser?.credits ?? 0,
        message: "Apple transaction already processed",
        receiptEnvironment: receiptEnvironment || void 0
      });
    } catch (error) {
      console.error("Apple verify error:", error);
      return res.status(500).json({ success: false, error: "Failed to verify Apple purchase" });
    }
  });
  app2.post("/api/credits/apple-sync", authMiddleware, async (req, res) => {
    try {
      const receiptData = normalizeStringValue(req.body?.receiptData);
      const receiptEnvironmentHint = normalizeStringValue(req.body?.receiptEnvironment);
      if (!receiptData) {
        return res.status(400).json({ success: false, error: "Missing receipt data" });
      }
      const syncResult = await syncAppleSubscriptionReceiptState({
        userId: req.user.id,
        receiptData,
        receiptEnvironmentHint
      });
      if (syncResult.status === "claimed_by_other_user") {
        return res.status(409).json({ success: false, error: "This Apple subscription is already linked to another account." });
      }
      const state = await getUserCreditsSubscriptionState(req.user.id);
      return res.json({
        success: true,
        ...state
      });
    } catch (error) {
      console.error("Apple subscription sync error:", error);
      return res.status(500).json({ success: false, error: "Failed to sync Apple subscription" });
    }
  });
  app2.post("/api/credits/google-verify", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const purchaseToken = normalizeStringValue(req.body?.purchaseToken);
      const productId = normalizeStringValue(req.body?.productId);
      if (!purchaseToken || !productId) {
        return res.status(400).json({ success: false, error: "Missing purchase token or product ID" });
      }
      const expectedCredits = GOOGLE_IAP_PRODUCT_CREDITS[productId];
      if (!expectedCredits) {
        return res.status(400).json({ success: false, error: "Unknown Google product ID" });
      }
      const [existingTransaction] = await db.select({ userId: creditTransactions.userId }).from(creditTransactions).where((0, import_drizzle_orm3.eq)(creditTransactions.stripePaymentIntentId, purchaseToken));
      if (existingTransaction) {
        if (existingTransaction.userId && existingTransaction.userId !== userId) {
          return res.status(409).json({ success: false, error: "This Google Play purchase was already claimed." });
        }
        const [existingUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
        return res.json({
          success: true,
          credits: existingUser?.credits ?? 0,
          message: "Google transaction already processed"
        });
      }
      const isDev = process.env.NODE_ENV !== "production";
      const allowBypass = isDev && normalizeStringValue(process.env.ALLOW_GOOGLE_IAP_BYPASS).toLowerCase() === "true";
      const serviceAccountJson = normalizeStringValue(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT);
      const useDevBypass = isDev && (allowBypass || !serviceAccountJson);
      if (useDevBypass) {
        const grantResult2 = await grantVerifiedInAppCredits({
          userId,
          transactionId: purchaseToken,
          credits: expectedCredits,
          description: allowBypass ? "Google Play purchase (dev bypass)" : "Google Play purchase (dev fallback: missing service account)"
        });
        if (grantResult2.status === "missing_user") {
          return res.status(404).json({ success: false, error: "User not found" });
        }
        if (grantResult2.status === "duplicate" && grantResult2.existingOwnerId && grantResult2.existingOwnerId !== userId) {
          return res.status(409).json({ success: false, error: "This Google Play purchase was already claimed." });
        }
        return res.json({
          success: true,
          credits: grantResult2.credits,
          bypass: true
        });
      }
      if (!serviceAccountJson) {
        return res.status(500).json({ success: false, error: "Google verification is not configured" });
      }
      const parsedServiceAccount = JSON.parse(serviceAccountJson);
      const serviceAccount = {
        client_email: normalizeStringValue(parsedServiceAccount.client_email),
        private_key: normalizeStringValue(parsedServiceAccount.private_key).replace(/\\n/g, "\n")
      };
      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        return res.status(500).json({ success: false, error: "Google verification credentials are invalid" });
      }
      const packageName = normalizeStringValue(process.env.GOOGLE_PLAY_PACKAGE_NAME) || "com.instame.app";
      const jwt = await createGoogleJwt(serviceAccount);
      const accessToken = await getGoogleAccessToken(jwt);
      const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
        packageName
      )}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
      const verifyResponse = await fetch(verifyUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error("Google verification failed:", errorText);
        return res.status(400).json({ success: false, error: "Google purchase verification failed" });
      }
      const purchaseData = await verifyResponse.json();
      if (purchaseData.purchaseState !== 0) {
        return res.status(400).json({ success: false, error: "Google purchase is not completed" });
      }
      if (purchaseData.acknowledgementState !== 1) {
        const acknowledgeUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
          packageName
        )}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(
          purchaseToken
        )}:acknowledge`;
        await fetch(acknowledgeUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        });
      }
      const grantResult = await grantVerifiedInAppCredits({
        userId,
        transactionId: purchaseToken,
        credits: expectedCredits,
        description: "Google Play credit purchase"
      });
      if (grantResult.status === "missing_user") {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      if (grantResult.status === "duplicate" && grantResult.existingOwnerId && grantResult.existingOwnerId !== userId) {
        return res.status(409).json({ success: false, error: "This Google Play purchase was already claimed." });
      }
      return res.json({ success: true, credits: grantResult.credits });
    } catch (error) {
      console.error("Google verify error:", error);
      return res.status(500).json({ success: false, error: "Failed to verify Google purchase" });
    }
  });
  app2.get("/api/instame/style-library", authMiddleware, async (_req, res) => {
    const library = loadStyleReferenceLibrary();
    if (!library) {
      return res.status(503).json({
        error: "Style reference library is not available on this deployment."
      });
    }
    return res.json({
      generatedAt: library.generatedAt || null,
      referenceCount: library.referenceCount || library.references.length,
      profiles: library.profiles.map((profile) => ({
        id: profile.id,
        title: profile.title,
        description: profile.description,
        referenceCount: profile.referenceIds.length
      }))
    });
  });
  app2.get("/api/instame/style-asset/:styleId/:filename", async (req, res) => {
    const styleId = normalizeStringValue(req.params.styleId);
    const filename = normalizeStringValue(req.params.filename);
    const relativePath = getCatalogAssetRelativePath(styleId, filename);
    const absolutePath = getCatalogAssetAbsolutePath(styleId, filename);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (absolutePath) {
      return res.sendFile(absolutePath);
    }
    if (relativePath) {
      const bucketObject = await getStyleAssetObject(relativePath);
      if (bucketObject) {
        res.setHeader("Content-Type", bucketObject.contentType);
        if (bucketObject.cacheControl) {
          res.setHeader("Cache-Control", bucketObject.cacheControl);
        }
        return res.send(bucketObject.body);
      }
    }
    if (!absolutePath) {
      const cwd = process.cwd();
      const expectedPath = `${cwd}/assets/instame-style-presets/styles/${styleId}/${filename}`;
      console.warn(`[style-asset] 404 styleId=${styleId} filename=${filename} cwd=${cwd} expectedPath=${expectedPath}`);
      return res.status(404).json({ error: "Style asset not found.", debug: { cwd, expectedPath } });
    }
  });
  app2.get("/api/instame/runtime-image/:token", async (req, res) => {
    const token = normalizeStringValue(req.params.token);
    const asset = getRuntimeAsset(token);
    if (!asset) {
      return res.status(404).json({ error: "Runtime image not found." });
    }
    res.setHeader("Content-Type", asset.mimeType);
    res.setHeader("Cache-Control", "private, max-age=1800");
    return res.send(asset.buffer);
  });
  app2.get("/api/instame/style-presets", authMiddleware, async (req, res) => {
    const catalogPresets = getInstaMeStylePresetsFromCatalog();
    const resolvedPresets = (catalogPresets.length > 0 ? catalogPresets : INSTAME_STYLE_PRESETS).map(
      (preset) => toPublicStylePreset(req, preset)
    );
    return res.json({
      presets: resolvedPresets
    });
  });
  app2.get("/api/instame/pricing", authMiddleware, async (_req, res) => {
    return res.json({
      generationTiers: INSTAME_GENERATION_TIERS.map((tier) => toPublicInstaMeGenerationTier(tier)),
      editTiers: INSTAME_EDIT_TIERS.map((tier) => toPublicInstaMeEditTier(tier)),
      portraitEnhanceTier: toPublicInstaMePortraitEnhanceTier(INSTAME_PORTRAIT_ENHANCE_TIER),
      liveGenerationTierId: getLiveInstaMeGenerationTier().id
    });
  });
  app2.get("/api/instame/own-styles", authMiddleware, async (req, res) => {
    const [user] = await db.select({ instameUploadedImages: users.instameUploadedImages }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    const ownStyles = normalizeStoredInstaMeUploadedImages(user?.instameUploadedImages).filter((image) => image.kind === "own_style" && image.analyzedPrompt).slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt)).map((image) => toInstaMeOwnStyleSummary(image));
    return res.json({ ownStyles });
  });
  app2.post("/api/instame/own-styles", authMiddleware, async (req, res) => {
    const body = req.body || {};
    const ownStyleMode = normalizeOwnStyleGenerationMode(body.ownStyleMode);
    const debugTraceContext = createInstaMeDebugTraceContext(req, "/api/instame/own-styles", ownStyleMode);
    const ownStylePayload = normalizeOwnStyleSavePayload(body.image);
    logInstaMeDebugTrace(debugTraceContext, `${getOwnStyleTracePrefix(debugTraceContext)}.save.request`, {
      hasOwnStylePayload: Boolean(ownStylePayload),
      ownStyleMode,
      mimeType: ownStylePayload?.mimeType || null,
      width: ownStylePayload?.width || null,
      height: ownStylePayload?.height || null,
      fileSizeBytes: ownStylePayload?.fileSizeBytes || null
    });
    if (!ownStylePayload) {
      return res.status(400).json({ error: "Valid own style image payload is required." });
    }
    if (ownStylePayload.fileSizeBytes > MAX_INSTAME_LIBRARY_IMAGE_BYTES) {
      return res.status(400).json({ error: "Own Style image must be 1MB or smaller after optimization." });
    }
    if (ownStylePayload.previewBase64.length > MAX_INSTAME_LIBRARY_PREVIEW_BASE64_LENGTH) {
      return res.status(400).json({ error: "Own Style preview image is too large." });
    }
    let normalizedStyleImages = [];
    try {
      normalizedStyleImages = normalizeUploadedImages([{ base64: ownStylePayload.previewBase64, mimeType: ownStylePayload.mimeType }], "single_item");
    } catch (error) {
      return res.status(400).json({ error: toErrorMessage(error, "Invalid own style image payload") });
    }
    try {
      const analyzedPrompt = await analyzeOwnStyleReferenceImage(normalizedStyleImages[0], {
        ownStyleMode,
        debugTraceContext,
        traceLabel: "own_style.save"
      });
      const [user] = await db.select({ instameUploadedImages: users.instameUploadedImages }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      const existingImages = normalizeStoredInstaMeUploadedImages(user?.instameUploadedImages);
      const saveResult = upsertOwnStyleRecord({
        existingImages,
        savedOwnStyle: buildSavedOwnStyleRecord({
          stylePayload: ownStylePayload,
          analyzedPrompt,
          ownStyleMode
        })
      });
      await db.update(users).set({
        instameUploadedImages: saveResult.nextImages,
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      return res.status(201).json({
        ownStyle: toInstaMeOwnStyleSummary(saveResult.savedOwnStyle)
      });
    } catch (error) {
      logInstaMeDebugTrace(debugTraceContext, `${getOwnStyleTracePrefix(debugTraceContext)}.save.error`, {
        error: toErrorMessage(error, "Failed to save Own Style")
      });
      console.error("Save Own Style error:", error);
      return res.status(500).json({ error: toErrorMessage(error, "Failed to save Own Style") });
    }
  });
  app2.patch("/api/instame/own-styles/:styleId", authMiddleware, async (req, res) => {
    const nextName = normalizeStringValue(req.body?.name).slice(0, 48);
    if (!nextName) {
      return res.status(400).json({ error: "Style name is required." });
    }
    const [user] = await db.select({ instameUploadedImages: users.instameUploadedImages }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    const existingImages = normalizeStoredInstaMeUploadedImages(user?.instameUploadedImages);
    const targetOwnStyle = existingImages.find(
      (entry) => entry.kind === "own_style" && entry.id === req.params.styleId
    );
    if (!targetOwnStyle) {
      return res.status(404).json({ error: "Saved own style not found." });
    }
    const nextImages = existingImages.map(
      (entry) => entry.id === targetOwnStyle.id ? { ...entry, name: nextName } : entry
    );
    await db.update(users).set({
      instameUploadedImages: nextImages,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    return res.json({
      ownStyle: toInstaMeOwnStyleSummary({
        ...targetOwnStyle,
        name: nextName
      })
    });
  });
  app2.get("/api/instame/uploaded-images", authMiddleware, async (req, res) => {
    const requestedKind = normalizeStringValue(req.query.kind);
    const imageKind = requestedKind === "enhanced" ? "enhanced" : requestedKind === "uploaded" ? "uploaded" : requestedKind === "generation" ? "generation" : "";
    const [user] = await db.select({ instameUploadedImages: users.instameUploadedImages }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    const images = normalizeStoredInstaMeUploadedImages(user?.instameUploadedImages);
    return res.json({
      images: images.filter((image) => !imageKind || (image.kind || "uploaded") === imageKind).slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt)).map((image) => toInstaMeUploadedImageSummary(image))
    });
  });
  app2.get("/api/instame/uploaded-images/:imageId", authMiddleware, async (req, res) => {
    const [user] = await db.select({ instameUploadedImages: users.instameUploadedImages }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    const images = normalizeStoredInstaMeUploadedImages(user?.instameUploadedImages);
    const image = images.find((entry) => entry.id === req.params.imageId);
    if (!image) {
      return res.status(404).json({ error: "Saved image not found." });
    }
    return res.json({
      image: {
        ...toInstaMeUploadedImageSummary(image),
        base64: image.base64,
        dataUri: `data:${image.mimeType};base64,${image.base64}`
      }
    });
  });
  app2.post("/api/instame/uploaded-images", authMiddleware, async (req, res) => {
    const body = req.body || {};
    const input = body.image && typeof body.image === "object" ? body.image : {};
    const name = normalizeStringValue(input.name) || "Portrait";
    const requestedSaveKind = normalizeStringValue(input.kind);
    const kind = requestedSaveKind === "enhanced" ? "enhanced" : requestedSaveKind === "generation" ? "generation" : "uploaded";
    const mimeType = typeof input.mimeType === "string" && String(input.mimeType).startsWith("image/") ? String(input.mimeType) : "image/jpeg";
    const base64 = stripDataUriPrefix(
      normalizeStringValue(input.base64)
    ).replace(/\s+/g, "");
    const previewBase64 = stripDataUriPrefix(
      normalizeStringValue(input.previewBase64)
    ).replace(/\s+/g, "");
    const width = Number(input.width);
    const height = Number(input.height);
    const fileSizeBytes = Number(input.fileSizeBytes);
    if (!base64 || !previewBase64) {
      return res.status(400).json({ error: "Image payload is required." });
    }
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return res.status(400).json({ error: "Image dimensions are invalid." });
    }
    if (width > MAX_INSTAME_LIBRARY_IMAGE_DIMENSION || height > MAX_INSTAME_LIBRARY_IMAGE_DIMENSION) {
      return res.status(400).json({ error: "Image must be resized to 1024 x 1024 px or smaller." });
    }
    const normalizedFileSize = Number.isFinite(fileSizeBytes) && fileSizeBytes > 0 ? Math.round(fileSizeBytes) : estimateBase64Bytes(base64);
    if (normalizedFileSize > MAX_INSTAME_LIBRARY_IMAGE_BYTES) {
      return res.status(400).json({ error: "Image must be 1MB or smaller after optimization." });
    }
    if (previewBase64.length > MAX_INSTAME_LIBRARY_PREVIEW_BASE64_LENGTH) {
      return res.status(400).json({ error: "Preview image is too large." });
    }
    const [user] = await db.select({ instameUploadedImages: users.instameUploadedImages }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    const existingImages = normalizeStoredInstaMeUploadedImages(user?.instameUploadedImages);
    let retainedImages = existingImages;
    if (kind === "generation") {
      const generationEntries = existingImages.filter((entry) => entry.kind === "generation").sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const evictedIds = new Set(
        generationEntries.slice(MAX_INSTAME_GENERATION_HISTORY_IMAGES - 1).map((entry) => entry.id)
      );
      retainedImages = existingImages.filter((entry) => !evictedIds.has(entry.id));
    } else {
      const existingKindCount = existingImages.filter((entry) => (entry.kind || "uploaded") === kind).length;
      const kindLimit = kind === "enhanced" ? MAX_INSTAME_ENHANCED_IMAGES : MAX_INSTAME_UPLOADED_IMAGES;
      if (existingKindCount >= kindLimit) {
        return res.status(409).json({
          error: `You can save up to ${kindLimit} ${kind === "enhanced" ? "enhanced portraits" : "uploaded images"}.`
        });
      }
    }
    const generationMetadata = kind === "generation" ? {
      styleLabel: normalizeStringValue(input.styleLabel).slice(0, 120) || void 0,
      stylePresetId: normalizeStringValue(input.stylePresetId).slice(0, 80) || void 0,
      ownStyleId: normalizeStringValue(input.ownStyleId).slice(0, 80) || void 0,
      artStyleId: normalizeStringValue(input.artStyleId).slice(0, 80) || void 0,
      customPrompt: normalizeStringValue(input.customPrompt).slice(0, 2e3) || void 0,
      creditsCharged: Number.isFinite(Number(input.creditsCharged)) && Number(input.creditsCharged) > 0 ? Math.round(Number(input.creditsCharged)) : void 0,
      generationSource: normalizeStringValue(input.generationSource).slice(0, 40) || void 0
    } : {};
    const savedImage = {
      id: (0, import_node_crypto2.randomUUID)(),
      name,
      kind,
      mimeType,
      base64,
      previewBase64,
      width: Math.round(width),
      height: Math.round(height),
      fileSizeBytes: normalizedFileSize,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...generationMetadata
    };
    await db.update(users).set({
      instameUploadedImages: [savedImage, ...retainedImages],
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    return res.status(201).json({
      image: toInstaMeUploadedImageSummary(savedImage)
    });
  });
  app2.delete("/api/instame/uploaded-images/:imageId", authMiddleware, async (req, res) => {
    const [user] = await db.select({ instameUploadedImages: users.instameUploadedImages }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    const existingImages = normalizeStoredInstaMeUploadedImages(user?.instameUploadedImages);
    const nextImages = existingImages.filter((entry) => entry.id !== req.params.imageId);
    if (nextImages.length === existingImages.length) {
      return res.status(404).json({ error: "Saved image not found." });
    }
    await db.update(users).set({
      instameUploadedImages: nextImages,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    return res.json({ success: true });
  });
  app2.delete("/api/instame/own-styles/:styleId", authMiddleware, async (req, res) => {
    const [user] = await db.select({ instameUploadedImages: users.instameUploadedImages }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    const existingImages = normalizeStoredInstaMeUploadedImages(user?.instameUploadedImages);
    const nextImages = existingImages.filter(
      (entry) => !(entry.kind === "own_style" && entry.id === req.params.styleId)
    );
    if (nextImages.length === existingImages.length) {
      return res.status(404).json({ error: "Saved own style not found." });
    }
    await db.update(users).set({
      instameUploadedImages: nextImages,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
    return res.json({ success: true });
  });
  app2.get("/api/instame/packs", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const packs = await db.select().from(instamePacks).where((0, import_drizzle_orm3.eq)(instamePacks.userId, userId)).orderBy((0, import_drizzle_orm3.desc)(instamePacks.createdAt));
    if (packs.length === 0) {
      return res.json({ packs: [] });
    }
    const packIds = packs.map((pack) => pack.id);
    const images = await db.select().from(instamePackImages).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(instamePackImages.userId, userId), (0, import_drizzle_orm3.inArray)(instamePackImages.packId, packIds)));
    const previewByPackId = /* @__PURE__ */ new Map();
    const imageCountByPackId = /* @__PURE__ */ new Map();
    for (const image of images) {
      if (image.role === "preview" && !previewByPackId.has(image.packId)) {
        previewByPackId.set(image.packId, image);
      }
      if (image.role !== "preview") {
        imageCountByPackId.set(image.packId, (imageCountByPackId.get(image.packId) || 0) + 1);
      }
    }
    return res.json({
      packs: packs.map((pack) => {
        const preview = previewByPackId.get(pack.id);
        return {
          id: pack.id,
          title: pack.title,
          aesthetic: pack.aesthetic || null,
          palette: pack.palette || null,
          imageCount: imageCountByPackId.get(pack.id) || pack.imageCount,
          createdAt: pack.createdAt instanceof Date ? pack.createdAt.toISOString() : String(pack.createdAt),
          previewUri: toInstaMePackThumbUri(preview)
        };
      })
    });
  });
  app2.get("/api/instame/packs/:packId", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const packId = normalizeStringValue(req.params.packId);
    const [pack] = await db.select().from(instamePacks).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(instamePacks.id, packId), (0, import_drizzle_orm3.eq)(instamePacks.userId, userId)));
    if (!pack) {
      return res.status(404).json({ error: "Saved pack not found." });
    }
    const images = await db.select().from(instamePackImages).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(instamePackImages.packId, packId), (0, import_drizzle_orm3.eq)(instamePackImages.userId, userId))).orderBy(instamePackImages.position);
    const preview = images.find((image) => image.role === "preview") || null;
    const individualImages = images.filter((image) => image.role !== "preview").sort((left, right) => left.position - right.position);
    const origin = getRequestOrigin(req) || "";
    return res.json({
      pack: {
        id: pack.id,
        title: pack.title,
        aesthetic: pack.aesthetic || null,
        palette: pack.palette || null,
        imageCount: individualImages.length,
        createdAt: pack.createdAt instanceof Date ? pack.createdAt.toISOString() : String(pack.createdAt),
        preview: preview ? {
          id: preview.id,
          role: "preview",
          label: preview.label || "Preview",
          mimeType: preview.mimeType,
          width: preview.width,
          height: preview.height,
          previewUri: toInstaMePackThumbUri(preview),
          downloadUri: `${origin}/api/instame/packs/${encodeURIComponent(pack.id)}/images/${encodeURIComponent(preview.id)}/raw`
        } : null,
        images: individualImages.map((image) => ({
          id: image.id,
          role: "image",
          position: image.position,
          label: image.label || `Image ${image.position}`,
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
          previewUri: toInstaMePackThumbUri(image),
          downloadUri: `${origin}/api/instame/packs/${encodeURIComponent(pack.id)}/images/${encodeURIComponent(image.id)}/raw`
        }))
      }
    });
  });
  app2.get("/api/instame/packs/:packId/images/:imageId/raw", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const packId = normalizeStringValue(req.params.packId);
    const imageId = normalizeStringValue(req.params.imageId);
    const resolved = await resolveInstaMePackImageBytes(userId, packId, imageId);
    if (!resolved) {
      return res.status(404).json({ error: "Saved pack image not found." });
    }
    res.setHeader("Content-Type", resolved.contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    return res.send(resolved.buffer);
  });
  app2.get("/api/instame/packs/:packId/images/:imageId", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const packId = normalizeStringValue(req.params.packId);
    const imageId = normalizeStringValue(req.params.imageId);
    const resolved = await resolveInstaMePackImageBytes(userId, packId, imageId);
    if (!resolved) {
      return res.status(404).json({ error: "Saved pack image not found." });
    }
    const base64 = resolved.buffer.toString("base64");
    return res.json({
      image: {
        id: imageId,
        mimeType: resolved.contentType,
        base64,
        dataUri: `data:${resolved.contentType};base64,${base64}`
      }
    });
  });
  app2.post("/api/instame/packs", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const title = normalizeStringValue(body.title).slice(0, 120) || "Photo pack";
    const aesthetic = normalizeStringValue(body.aesthetic).slice(0, 120) || null;
    const palette = normalizeStringValue(body.palette).slice(0, 400) || null;
    const previewInput = body.preview && typeof body.preview === "object" ? body.preview : null;
    const imagesInput = Array.isArray(body.images) ? body.images : [];
    const parsePackImage = (raw, role, fallbackPosition) => {
      if (!raw || typeof raw !== "object") return null;
      const record = raw;
      const base64 = stripDataUriPrefix(normalizeStringValue(record.base64)).replace(/\s+/g, "");
      if (!base64) return null;
      const previewBase64 = stripDataUriPrefix(normalizeStringValue(record.previewBase64)).replace(/\s+/g, "") || base64;
      const mimeType = typeof record.mimeType === "string" && record.mimeType.startsWith("image/") ? record.mimeType : "image/png";
      const positionRaw = Number(record.position);
      const position = Number.isFinite(positionRaw) ? Math.round(positionRaw) : fallbackPosition;
      const widthRaw = Number(record.width);
      const heightRaw = Number(record.height);
      return {
        role,
        position,
        label: normalizeStringValue(record.label).slice(0, 120),
        mimeType,
        width: Number.isFinite(widthRaw) && widthRaw > 0 ? Math.round(widthRaw) : 0,
        height: Number.isFinite(heightRaw) && heightRaw > 0 ? Math.round(heightRaw) : 0,
        previewBase64: previewBase64.slice(0, MAX_INSTAME_LIBRARY_PREVIEW_BASE64_LENGTH),
        base64
      };
    };
    const parsedImages = [];
    const parsedPreview = parsePackImage(previewInput, "preview", 0);
    if (parsedPreview) {
      parsedImages.push(parsedPreview);
    }
    imagesInput.slice(0, MAX_INSTAME_PACK_IMAGES).forEach((raw, index) => {
      const parsed = parsePackImage(raw, "image", index + 1);
      if (parsed) {
        parsedImages.push(parsed);
      }
    });
    const individualCount = parsedImages.filter((image) => image.role === "image").length;
    if (individualCount === 0) {
      return res.status(400).json({ error: "At least one pack image is required." });
    }
    for (const image of parsedImages) {
      if (image.base64.length > MAX_INSTAME_PACK_IMAGE_BASE64_LENGTH) {
        return res.status(400).json({ error: "One of the pack images is too large." });
      }
    }
    const bucketConfigured = isObjectBucketConfigured();
    const [created] = await db.insert(instamePacks).values({
      userId,
      title,
      aesthetic,
      palette,
      imageCount: individualCount
    }).returning();
    if (!created) {
      return res.status(500).json({ error: "Failed to save pack." });
    }
    try {
      const imageRows = [];
      for (let index = 0; index < parsedImages.length; index += 1) {
        const image = parsedImages[index];
        const imageId = (0, import_node_crypto2.randomUUID)();
        let storageKey = null;
        let inlineBase64 = image.base64;
        if (bucketConfigured) {
          const extension = image.mimeType.includes("jpeg") || image.mimeType.includes("jpg") ? "jpg" : "png";
          const key = `user-packs/${userId}/${created.id}/${image.role}-${imageId}.${extension}`;
          try {
            await uploadObject({
              key,
              body: Buffer.from(image.base64, "base64"),
              contentType: image.mimeType,
              cacheControl: "private, max-age=86400"
            });
            storageKey = key;
            inlineBase64 = null;
          } catch (uploadError) {
            console.error("[instame-packs] bucket upload failed, falling back to inline:", uploadError);
          }
        }
        imageRows.push({
          id: imageId,
          packId: created.id,
          userId,
          role: image.role,
          position: image.position,
          label: image.label || null,
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
          previewBase64: image.previewBase64 || null,
          storageKey,
          inlineBase64
        });
      }
      await db.insert(instamePackImages).values(imageRows);
    } catch (error) {
      await db.delete(instamePacks).where((0, import_drizzle_orm3.eq)(instamePacks.id, created.id));
      console.error("[instame-packs] failed to persist pack images:", error);
      return res.status(500).json({ error: "Failed to save pack images." });
    }
    try {
      const allPacks = await db.select({ id: instamePacks.id }).from(instamePacks).where((0, import_drizzle_orm3.eq)(instamePacks.userId, userId)).orderBy((0, import_drizzle_orm3.desc)(instamePacks.createdAt));
      if (allPacks.length > MAX_INSTAME_SAVED_PACKS) {
        const evictIds = allPacks.slice(MAX_INSTAME_SAVED_PACKS).map((pack) => pack.id);
        await deleteInstaMePacks(userId, evictIds);
      }
    } catch (error) {
      console.error("[instame-packs] rolling-window cleanup failed:", error);
    }
    return res.status(201).json({
      pack: {
        id: created.id,
        title,
        aesthetic,
        palette,
        imageCount: individualCount,
        createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : String(created.createdAt)
      }
    });
  });
  app2.delete("/api/instame/packs/:packId", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const packId = normalizeStringValue(req.params.packId);
    const [pack] = await db.select({ id: instamePacks.id }).from(instamePacks).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(instamePacks.id, packId), (0, import_drizzle_orm3.eq)(instamePacks.userId, userId)));
    if (!pack) {
      return res.status(404).json({ error: "Saved pack not found." });
    }
    await deleteInstaMePacks(userId, [packId]);
    return res.json({ success: true });
  });
  app2.post("/api/instame/transform", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const customPrompt = normalizeStringValue(body.customPrompt);
    const requestedStylePresetId = normalizeStringValue(body.stylePresetId);
    const requestedSavedOwnStyleId = normalizeStringValue(body.savedOwnStyleId);
    const shouldSaveOwnStyle = body.saveOwnStyle !== false;
    const ownStyleMode = normalizeOwnStyleGenerationMode(body.ownStyleMode);
    const debugTraceContext = createInstaMeDebugTraceContext(req, "/api/instame/transform", ownStyleMode);
    const isOwnStyleRequested = requestedStylePresetId === INSTAME_OWN_STYLE_ID;
    const resolvedStylePreset = isOwnStyleRequested ? null : resolveInstaMeStylePreset(body.stylePresetId);
    if (!isOwnStyleRequested && requestedStylePresetId && !resolvedStylePreset) {
      return res.status(400).json({ error: "The selected style is no longer available. Please choose another style and try again." });
    }
    const stylePresetId = isOwnStyleRequested ? INSTAME_OWN_STYLE_ID : resolvedStylePreset?.id || "";
    const stylePresetLabel = isOwnStyleRequested ? "Own Style" : resolvedStylePreset?.label || "";
    const stylePresetPromptHint = isOwnStyleRequested ? "" : resolvedStylePreset?.promptHint || "";
    const intensity = normalizeTransformIntensity(body.intensity);
    const preserveBackground = body.preserveBackground !== false;
    const generationTier = resolveGenerationTierById(body.generationTierId);
    const generationMode = resolveGenerationMode(generationTier.id);
    const photoInput = body.photo ? [body.photo] : Array.isArray(body.photos) && body.photos.length > 0 ? [body.photos[0]] : [];
    let uploadedImages = [];
    try {
      uploadedImages = normalizeUploadedImages(photoInput, "single_item");
    } catch (error) {
      return res.status(400).json({ error: toErrorMessage(error, "Invalid image payload") });
    }
    if (uploadedImages.length === 0) {
      return res.status(400).json({ error: "Upload one input image to transform." });
    }
    let ownStyleImages = [];
    if (isOwnStyleRequested) {
      const stylePhotoInput = body.stylePhoto ? [body.stylePhoto] : [];
      try {
        ownStyleImages = normalizeUploadedImages(stylePhotoInput, "single_item");
      } catch (error) {
        return res.status(400).json({ error: toErrorMessage(error, "Invalid own style image payload") });
      }
      if (!requestedSavedOwnStyleId && ownStyleImages.length === 0) {
        return res.status(400).json({ error: "Upload one style reference image for Own Style." });
      }
    }
    let creditsConsumed = false;
    let transformCost = 0;
    try {
      logInstaMeDebugTrace(debugTraceContext, `${getOwnStyleTracePrefix(debugTraceContext)}.transform.request`, {
        requestedStylePresetId,
        requestedSavedOwnStyleId,
        ownStyleMode,
        customPrompt,
        preserveBackground,
        generationTierId: generationTier.id,
        generationMode,
        photoMimeType: uploadedImages[0]?.mimeType || null,
        photoWidth: uploadedImages[0]?.width || null,
        photoHeight: uploadedImages[0]?.height || null
      });
      const [userBeforeTransform] = await db.select({
        instameStyleUsage: users.instameStyleUsage,
        instameUploadedImages: users.instameUploadedImages
      }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      const existingImages = normalizeStoredInstaMeUploadedImages(userBeforeTransform?.instameUploadedImages);
      const savedOwnStyles = existingImages.filter(
        (entry) => entry.kind === "own_style"
      );
      const selectedSavedOwnStyle = requestedSavedOwnStyleId ? savedOwnStyles.find((entry) => entry.id === requestedSavedOwnStyleId) || null : null;
      if (requestedSavedOwnStyleId && !selectedSavedOwnStyle) {
        return res.status(404).json({
          error: "Saved own style not found. It may have been removed or is no longer available. Please select another Own Style or upload a new one."
        });
      }
      const styleUsageMap = normalizeUsageMap(userBeforeTransform?.instameStyleUsage);
      const priorStyleUseCount = stylePresetId ? styleUsageMap[stylePresetId] || 0 : 0;
      const promptVariant = isOwnStyleRequested ? null : choosePromptVariant(resolvedStylePreset || void 0, priorStyleUseCount);
      const shouldUseOwnStyle = isOwnStyleRequested && (ownStyleImages.length > 0 || Boolean(selectedSavedOwnStyle));
      const shouldUsePromptOnly = !shouldUseOwnStyle && Boolean(stylePresetId) && (resolvedStylePreset?.promptVariants?.length || 0) > 0 && Boolean(promptVariant);
      const transformQualityTier = resolveTransformQualityTier({
        generationMode,
        isOwnStyleRequested,
        resolvedStylePreset,
        promptVariant
      });
      const baseTransformCost = generationTier.credits || getInstaMeCreditsForQualityTier(transformQualityTier) || (Number.isInteger(INSTAME_TRANSFORM_COST) && INSTAME_TRANSFORM_COST > 0 ? INSTAME_TRANSFORM_COST : 2);
      const selectedSavedOwnStyleNeedsFirstUseSurcharge = Boolean(
        selectedSavedOwnStyle && selectedSavedOwnStyle.firstUseSurchargeCharged === false
      );
      const ownStyleFirstUseSurcharge = isOwnStyleRequested && (!requestedSavedOwnStyleId || selectedSavedOwnStyleNeedsFirstUseSurcharge) ? INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS : 0;
      transformCost = baseTransformCost + ownStyleFirstUseSurcharge;
      const consumed = await consumeCredits(userId, transformCost, "instame_old_money_transform");
      if (!consumed) {
        return res.status(402).json({
          error: `Not enough credits. This request costs ${transformCost} credits.`,
          requiredCredits: transformCost
        });
      }
      creditsConsumed = true;
      const selectedStyleReferences = shouldUsePromptOnly ? [] : selectStyleReferencesForTransform({
        intensity,
        customPrompt: [customPrompt, stylePresetId, stylePresetLabel, stylePresetPromptHint].filter(Boolean).join(" ")
      });
      let nextUsageMap = styleUsageMap;
      let nextStoredImages = existingImages;
      let refreshedSavedOwnStyle = selectedSavedOwnStyle;
      let ownStyleIdToMarkFirstUseCharged = selectedSavedOwnStyleNeedsFirstUseSurcharge && selectedSavedOwnStyle ? selectedSavedOwnStyle.id : null;
      let savedOwnStyleSummary = refreshedSavedOwnStyle ? toInstaMeOwnStyleSummary(refreshedSavedOwnStyle) : null;
      const activeOwnStyleReferenceImage = refreshedSavedOwnStyle ? toUploadedReferenceImageFromStoredOwnStyle(refreshedSavedOwnStyle) : ownStyleImages[0] || null;
      let analyzedOwnStylePrompt = refreshedSavedOwnStyle?.analyzedPrompt || "";
      const needsAnalysis = ownStyleMode === "creative_prompt";
      const shouldReanalyzeSavedOwnStyle = needsAnalysis && Boolean(
        refreshedSavedOwnStyle && shouldRefreshSavedOwnStyleAnalysis(refreshedSavedOwnStyle, ownStyleMode)
      );
      if (shouldUseOwnStyle && !activeOwnStyleReferenceImage) {
        return res.status(400).json({ error: "Own Style reference image is missing." });
      }
      if (shouldUseOwnStyle && refreshedSavedOwnStyle && shouldReanalyzeSavedOwnStyle) {
        logInstaMeDebugTrace(
          debugTraceContext,
          `${getOwnStyleTracePrefix(debugTraceContext)}.transform.saved_style_reanalysis`,
          {
            savedOwnStyleId: refreshedSavedOwnStyle.id,
            previousAnalysisMode: refreshedSavedOwnStyle.analysisMode || null,
            previousAnalysisVersion: refreshedSavedOwnStyle.analysisVersion || null,
            nextAnalysisMode: ownStyleMode,
            nextAnalysisVersion: OWN_STYLE_ANALYSIS_VERSIONS[ownStyleMode]
          }
        );
      }
      if (shouldUseOwnStyle && needsAnalysis && (!analyzedOwnStylePrompt || shouldReanalyzeSavedOwnStyle)) {
        analyzedOwnStylePrompt = await analyzeOwnStyleReferenceImage(activeOwnStyleReferenceImage, {
          allowStaticFallback: true,
          ownStyleMode,
          debugTraceContext,
          traceLabel: "own_style.transform"
        });
        if (refreshedSavedOwnStyle) {
          refreshedSavedOwnStyle = {
            ...refreshedSavedOwnStyle,
            analyzedPrompt: analyzedOwnStylePrompt,
            analysisMode: ownStyleMode,
            analysisVersion: OWN_STYLE_ANALYSIS_VERSIONS[ownStyleMode]
          };
          nextStoredImages = existingImages.map(
            (entry) => entry.id === refreshedSavedOwnStyle.id ? refreshedSavedOwnStyle : entry
          );
          savedOwnStyleSummary = toInstaMeOwnStyleSummary(refreshedSavedOwnStyle);
        }
      }
      const generationResult = shouldUseOwnStyle ? await generateOwnStyleImage({
        req,
        uploadedImages,
        styleReferenceImage: activeOwnStyleReferenceImage,
        analyzedStylePrompt: analyzedOwnStylePrompt,
        customPrompt,
        preserveBackground,
        generationMode,
        generationTierId: generationTier.id,
        ownStyleMode,
        debugTraceContext
      }) : shouldUsePromptOnly && promptVariant ? await generatePromptOnlyPresetImage({
        req,
        uploadedImages,
        preset: resolvedStylePreset,
        variant: promptVariant,
        styleUsageCount: priorStyleUseCount,
        generationMode,
        generationTierId: generationTier.id,
        preserveBackground,
        customPrompt
      }) : generationMode === "high_res" ? await generateReferenceGuidedHighResImage({
        req,
        uploadedImages,
        selectedStyleReferences,
        intensity,
        customPrompt,
        preserveBackground,
        stylePresetLabel,
        stylePresetPromptHint,
        generationTierId: generationTier.id
      }) : await generateReferenceGuidedPreviewImage({
        uploadedImages,
        selectedStyleReferences,
        intensity,
        customPrompt,
        preserveBackground,
        stylePresetLabel,
        stylePresetPromptHint
      });
      if (shouldUseOwnStyle && !selectedSavedOwnStyle && shouldSaveOwnStyle) {
        const ownStyleSavePayload = normalizeOwnStyleSavePayload(body.stylePhoto);
        if (ownStyleSavePayload && ownStyleSavePayload.previewBase64.length <= MAX_INSTAME_LIBRARY_PREVIEW_BASE64_LENGTH) {
          const analyzedPromptForStorage = normalizeStringValue(analyzedOwnStylePrompt) || buildOwnStyleFallbackAnalysisPrompt();
          const savedOwnStyleRecord = buildSavedOwnStyleRecord({
            stylePayload: ownStyleSavePayload,
            analyzedPrompt: analyzedPromptForStorage,
            ownStyleMode
          });
          const saveResult = upsertOwnStyleRecord({
            existingImages: nextStoredImages,
            savedOwnStyle: savedOwnStyleRecord
          });
          nextStoredImages = saveResult.nextImages;
          savedOwnStyleSummary = toInstaMeOwnStyleSummary(saveResult.savedOwnStyle);
          if (ownStyleFirstUseSurcharge > 0) {
            ownStyleIdToMarkFirstUseCharged = saveResult.savedOwnStyle.id;
          }
        }
      }
      if (ownStyleIdToMarkFirstUseCharged) {
        const marked = markOwnStyleFirstUseSurchargeCharged(nextStoredImages, ownStyleIdToMarkFirstUseCharged);
        nextStoredImages = marked.images;
        if (marked.updated) {
          savedOwnStyleSummary = toInstaMeOwnStyleSummary(marked.updated);
          if (refreshedSavedOwnStyle && refreshedSavedOwnStyle.id === marked.updated.id) {
            refreshedSavedOwnStyle = marked.updated;
          }
        }
      }
      if (stylePresetId && stylePresetId !== INSTAME_OWN_STYLE_ID) {
        nextUsageMap = {
          ...styleUsageMap,
          [stylePresetId]: priorStyleUseCount + 1
        };
      }
      if (nextUsageMap !== styleUsageMap || nextStoredImages !== existingImages) {
        await db.update(users).set({
          instameStyleUsage: nextUsageMap,
          instameUploadedImages: nextStoredImages,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm3.eq)(users.id, userId));
      }
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      return res.json({
        imageBase64: generationResult.imageBase64,
        creditsCharged: transformCost,
        creditsRemaining: updatedUser?.credits ?? 0,
        qualityTier: transformQualityTier,
        qualityLabel: getInstaMeQualityTierLabel(transformQualityTier),
        styleReferenceIds: selectedStyleReferences.map((reference) => reference.id),
        stylePresetId: stylePresetId || null,
        promptOnlyMode: shouldUsePromptOnly || shouldUseOwnStyle && ownStyleMode === "creative_prompt",
        generationTierId: generationTier.id,
        savedOwnStyle: savedOwnStyleSummary
      });
    } catch (error) {
      logInstaMeDebugTrace(debugTraceContext, `${getOwnStyleTracePrefix(debugTraceContext)}.transform.error`, {
        error: toErrorMessage(error, "Failed to transform image"),
        creditsConsumed,
        transformCost
      });
      console.error("InstaMe transform error:", error);
      if (creditsConsumed) {
        await refundCredits(userId, transformCost, "instame_old_money_transform_failed");
      }
      const errorMessage = toErrorMessage(error, "Failed to transform image");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/instame/enhance-portrait", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    let failureStage = "request_received";
    const enhanceCost = Number.isInteger(INSTAME_PORTRAIT_ENHANCE_TIER.credits) && INSTAME_PORTRAIT_ENHANCE_TIER.credits > 0 ? INSTAME_PORTRAIT_ENHANCE_TIER.credits : 3;
    const photoInput = body.photo ? [body.photo] : Array.isArray(body.photos) && body.photos.length > 0 ? [body.photos[0]] : [];
    let uploadedImages = [];
    try {
      failureStage = "normalize_uploaded_images";
      uploadedImages = normalizeUploadedImages(photoInput, "single_item");
    } catch (error) {
      console.error("InstaMe portrait enhance invalid payload:", {
        userId,
        stage: failureStage,
        error: toErrorMessage(error, "Invalid image payload")
      });
      return res.status(400).json({ error: toErrorMessage(error, "Invalid image payload") });
    }
    if (uploadedImages.length === 0) {
      return res.status(400).json({ error: "Upload one portrait image to enhance." });
    }
    let creditsConsumed = false;
    try {
      console.info("InstaMe portrait enhance start", {
        userId,
        stage: failureStage,
        model: INSTAME_PORTRAIT_ENHANCE_MODEL,
        output: INSTAME_PORTRAIT_ENHANCE_SIZE,
        hasPublicAppUrl: Boolean(process.env.PUBLIC_APP_URL),
        hasTogetherApiKey: Boolean(process.env.TOGETHER_API_KEY),
        mimeType: uploadedImages[0]?.mimeType || null,
        width: uploadedImages[0]?.width || null,
        height: uploadedImages[0]?.height || null,
        fileSizeBytes: uploadedImages[0]?.fileSizeBytes || null
      });
      failureStage = "consume_credits";
      const consumed = await consumeCredits(userId, enhanceCost, "instame_portrait_enhance");
      if (!consumed) {
        return res.status(402).json({
          error: `Not enough credits. Portrait Enhance costs ${enhanceCost} credits.`,
          requiredCredits: enhanceCost
        });
      }
      creditsConsumed = true;
      failureStage = "generate_enhanced_portrait";
      const enhanceResult = await generateInstaMePortraitEnhance({
        req,
        photo: uploadedImages[0]
      });
      failureStage = "fetch_updated_credits";
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      console.info("InstaMe portrait enhance success", {
        userId,
        model: enhanceResult.model,
        provider: enhanceResult.provider,
        creditsCharged: enhanceCost,
        creditsRemaining: updatedUser?.credits ?? 0
      });
      return res.json({
        imageBase64: enhanceResult.imageBase64,
        creditsCharged: enhanceCost,
        creditsRemaining: updatedUser?.credits ?? 0,
        qualityTier: INSTAME_PORTRAIT_ENHANCE_TIER.qualityTier,
        qualityLabel: getInstaMeQualityTierLabel(INSTAME_PORTRAIT_ENHANCE_TIER.qualityTier),
        output: INSTAME_PORTRAIT_ENHANCE_SIZE
      });
    } catch (error) {
      console.error("InstaMe portrait enhance error:", {
        userId,
        stage: failureStage,
        model: INSTAME_PORTRAIT_ENHANCE_MODEL,
        output: INSTAME_PORTRAIT_ENHANCE_SIZE,
        hasPublicAppUrl: Boolean(process.env.PUBLIC_APP_URL),
        hasTogetherApiKey: Boolean(process.env.TOGETHER_API_KEY),
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : void 0
      });
      if (creditsConsumed) {
        failureStage = "refund_credits";
        await refundCredits(userId, enhanceCost, "instame_portrait_enhance_failed");
      }
      const errorMessage = toErrorMessage(error, "Failed to enhance portrait");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/instame/edit", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const currentImagePayload = body.currentImage || body.image;
    const originalPhotoPayload = body.originalPhoto || body.photo;
    const editInstruction = normalizeStringValue(body.editInstruction || body.modifyRequest);
    const customPrompt = normalizeStringValue(body.customPrompt);
    const editTier = resolveEditTierById(body.editTierId);
    if (!editInstruction) {
      return res.status(400).json({ error: "Edit instruction is required." });
    }
    let currentImages = [];
    let originalPhotos = [];
    try {
      currentImages = normalizeUploadedImages(currentImagePayload ? [currentImagePayload] : [], "single_item");
      originalPhotos = normalizeUploadedImages(
        originalPhotoPayload ? [originalPhotoPayload] : [],
        "single_item"
      );
    } catch (error) {
      return res.status(400).json({ error: toErrorMessage(error, "Invalid image payload") });
    }
    if (currentImages.length === 0) {
      return res.status(400).json({ error: "A generated image is required before editing." });
    }
    let creditsConsumed = false;
    try {
      const consumed = await consumeCredits(userId, editTier.credits, `instame_edit_${editTier.id}`);
      if (!consumed) {
        return res.status(402).json({
          error: `Not enough credits. This edit costs ${editTier.credits} credits.`,
          requiredCredits: editTier.credits
        });
      }
      creditsConsumed = true;
      const editResult = await generateInstaMeEditImage({
        req,
        currentImage: currentImages[0],
        originalPhoto: originalPhotos[0] || null,
        editTierId: editTier.id,
        editInstruction,
        customPrompt
      });
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      return res.json({
        imageBase64: editResult.imageBase64,
        creditsCharged: editTier.credits,
        creditsRemaining: updatedUser?.credits ?? 0,
        qualityTier: editTier.qualityTier,
        qualityLabel: getInstaMeQualityTierLabel(editTier.qualityTier),
        editTierId: editTier.id
      });
    } catch (error) {
      console.error("InstaMe edit error:", error);
      if (creditsConsumed) {
        await refundCredits(userId, editTier.credits, `instame_edit_${editTier.id}_failed`);
      }
      const errorMessage = toErrorMessage(error, "Failed to edit image");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/style", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const outputMode = normalizeOutputMode(body.outputMode);
    const imageInputMode = normalizeImageInputMode(body.imageInputMode);
    const creditCost = STYLE_COSTS[outputMode];
    const normalizedItems = normalizeRequestedItems(body.items);
    const occasion = normalizeStringValue(body.occasion) || "Any occasion";
    const gender = normalizeStyleGender(body.gender);
    const event = normalizeStringValue(body.event);
    const season = normalizeStringValue(body.season);
    const aesthetic = normalizeStringValue(body.aesthetic);
    const colorPalette = normalizeStringValue(body.colorPalette);
    const customPrompt = normalizeStringValue(body.customPrompt);
    const requiredPieces = normalizeStringList(body.requiredPieces);
    let uploadedImages = [];
    try {
      uploadedImages = normalizeUploadedImages(body.photos, imageInputMode);
    } catch (error) {
      return res.status(400).json({ error: toErrorMessage(error, "Invalid image payload") });
    }
    if (normalizedItems.length === 0 && uploadedImages.length === 0 && !event && !customPrompt && requiredPieces.length === 0) {
      return res.status(400).json({
        error: "Add at least one item, one image, event details, a required piece, or a custom request."
      });
    }
    let creditsConsumed = false;
    try {
      const consumed = await consumeCredits(userId, creditCost, `style_generation_${outputMode}`);
      if (!consumed) {
        return res.status(402).json({
          error: `Not enough credits. This request costs ${creditCost} credits.`,
          requiredCredits: creditCost
        });
      }
      creditsConsumed = true;
      const stylingPlan = await createStylingPlan({
        uploadedImages,
        prompt: buildStylePrompt({
          items: normalizedItems,
          occasion,
          gender,
          event,
          season,
          aesthetic,
          colorPalette,
          customPrompt,
          requiredPieces,
          outputMode,
          hasReferenceImages: uploadedImages.length > 0,
          imageInputMode
        })
      });
      let imageBase64;
      let debugImagePrompt;
      if (outputMode === "image") {
        const imagePrompt = buildImageGenerationPrompt({
          imagePrompt: stylingPlan.imagePrompt,
          usedPieces: stylingPlan.usedPieces,
          hasReferenceImages: uploadedImages.length > 0,
          imageInputMode,
          isModification: false
        });
        debugImagePrompt = imagePrompt;
        const imageParts = [{ text: imagePrompt }, ...toGeminiInlineImageParts(uploadedImages)];
        const imageResponse = await generateGeminiContent({
          model: DEFAULT_STYLE_IMAGE_MODEL,
          parts: imageParts,
          responseModalities: ["IMAGE", "TEXT"],
          maxOutputTokens: 800
        });
        imageBase64 = extractGeminiImageBase64(imageResponse);
        if (!imageBase64) {
          throw new Error("Image generation failed. No image data returned.");
        }
      }
      res.json({
        lookName: stylingPlan.lookName,
        description: stylingPlan.description,
        tips: stylingPlan.tips,
        usedPieces: stylingPlan.usedPieces,
        imageBase64,
        outputMode,
        creditsCharged: creditCost,
        ...EXPOSE_STYLE_DEBUG_PROMPT ? { debugImagePrompt } : {}
      });
    } catch (error) {
      console.error("Styling error:", error);
      if (creditsConsumed) {
        await refundCredits(userId, creditCost, `style_generation_${outputMode}_failed`);
      }
      const errorMessage = toErrorMessage(error, "Failed to generate styling");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/style/modify", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const outputMode = normalizeOutputMode(body.outputMode);
    const imageInputMode = normalizeImageInputMode(body.imageInputMode);
    const creditCost = STYLE_COSTS[outputMode];
    const originalDescription = normalizeStringValue(body.originalDescription);
    const originalTips = normalizeStringList(body.originalTips);
    const modifyRequest = normalizeStringValue(body.modifyRequest);
    const occasion = normalizeStringValue(body.occasion) || "Any occasion";
    const gender = normalizeStyleGender(body.gender);
    const event = normalizeStringValue(body.event);
    const season = normalizeStringValue(body.season);
    const aesthetic = normalizeStringValue(body.aesthetic);
    const colorPalette = normalizeStringValue(body.colorPalette);
    const customPrompt = normalizeStringValue(body.customPrompt);
    const requiredPieces = normalizeStringList(body.requiredPieces);
    if (!modifyRequest) {
      return res.status(400).json({ error: "A modification request is required." });
    }
    const normalizedItems = normalizeRequestedItems(body.items);
    let uploadedImages = [];
    try {
      uploadedImages = normalizeUploadedImages(body.photos, imageInputMode);
    } catch (error) {
      return res.status(400).json({ error: toErrorMessage(error, "Invalid image payload") });
    }
    let creditsConsumed = false;
    try {
      const consumed = await consumeCredits(userId, creditCost, `style_modify_${outputMode}`);
      if (!consumed) {
        return res.status(402).json({
          error: `Not enough credits. This request costs ${creditCost} credits.`,
          requiredCredits: creditCost
        });
      }
      creditsConsumed = true;
      const stylingPlan = await createStylingPlan({
        uploadedImages,
        prompt: buildStylePrompt({
          items: normalizedItems,
          occasion,
          gender,
          event,
          season,
          aesthetic,
          colorPalette,
          customPrompt,
          requiredPieces,
          forceModifyRequest: modifyRequest,
          originalDescription,
          originalTips,
          outputMode,
          hasReferenceImages: uploadedImages.length > 0,
          imageInputMode
        })
      });
      let imageBase64;
      let debugImagePrompt;
      if (outputMode === "image") {
        const imagePrompt = buildImageGenerationPrompt({
          imagePrompt: stylingPlan.imagePrompt,
          usedPieces: stylingPlan.usedPieces,
          hasReferenceImages: uploadedImages.length > 0,
          imageInputMode,
          isModification: true
        });
        debugImagePrompt = imagePrompt;
        const imageParts = [{ text: imagePrompt }, ...toGeminiInlineImageParts(uploadedImages)];
        const imageResponse = await generateGeminiContent({
          model: DEFAULT_STYLE_IMAGE_MODEL,
          parts: imageParts,
          responseModalities: ["IMAGE", "TEXT"],
          maxOutputTokens: 800
        });
        imageBase64 = extractGeminiImageBase64(imageResponse);
        if (!imageBase64) {
          throw new Error("Image generation failed. No image data returned.");
        }
      }
      res.json({
        lookName: stylingPlan.lookName,
        description: stylingPlan.description,
        tips: stylingPlan.tips,
        usedPieces: stylingPlan.usedPieces,
        imageBase64,
        outputMode,
        creditsCharged: creditCost,
        ...EXPOSE_STYLE_DEBUG_PROMPT ? { debugImagePrompt } : {}
      });
    } catch (error) {
      console.error("Modify error:", error);
      if (creditsConsumed) {
        await refundCredits(userId, creditCost, `style_modify_${outputMode}_failed`);
      }
      const errorMessage = toErrorMessage(error, "Failed to modify styling");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/instame/grid-pipeline/plan", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const imageCount = body.imageCount;
    if (!isGridPipelineImageCount(imageCount)) {
      return res.status(400).json({ error: "imageCount must be 4, 6, 9, or 12." });
    }
    const aesthetic = sanitizeGridPromptText(normalizeStringValue(body.aesthetic));
    if (!aesthetic) {
      return res.status(400).json({ error: "aesthetic is required." });
    }
    const palette = sanitizeGridPromptText(normalizeStringValue(body.palette) || "muted neutrals");
    const lightType = sanitizeGridPromptText(normalizeStringValue(body.lightType) || "soft natural light");
    const extraNotes = sanitizeGridPromptText(normalizeStringValue(body.extraNotes) || "");
    const hasPortraitReference = body.hasPortraitReference === true;
    const portrait = typeof body.portrait === "string" && body.portrait.length > 0 ? body.portrait : void 0;
    const inputs = {
      imageCount,
      aesthetic,
      palette,
      lightType,
      extraNotes,
      hasPortraitReference
    };
    await consumeCredits(userId, GRID_PIPELINE_PLAN_CREDIT_COST, "instame_grid_pipeline_plan");
    let planConsumed = true;
    try {
      const apiKey = getGeminiApiKey();
      const systemPrompt = buildMasterGridSystemPrompt(inputs);
      const rawJson = await callGeminiFlashText({
        systemPrompt,
        geminiApiBaseUrl: GEMINI_API_BASE_URL,
        geminiApiKey: apiKey,
        model: DEFAULT_STYLE_TEXT_MODEL
      });
      const plan = parseGridPlan(rawJson, imageCount);
      const continuityContext = extractContinuityContext(plan);
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      planConsumed = false;
      return res.json({
        plan,
        continuityContext,
        creditsCharged: GRID_PIPELINE_PLAN_CREDIT_COST,
        creditsRemaining: updatedUser?.credits ?? 0
      });
    } catch (error) {
      if (planConsumed) {
        await refundCredits(userId, GRID_PIPELINE_PLAN_CREDIT_COST, "instame_grid_pipeline_plan_failed");
      }
      console.error("InstaMe grid-pipeline/plan error:", error);
      const errorMessage = toErrorMessage(error, "Failed to generate grid plan");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/instame/grid-pipeline/render", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const plan = body.plan;
    if (!plan || !Array.isArray(plan.shots) || plan.shots.length === 0) {
      return res.status(400).json({ error: "plan with shots is required." });
    }
    const portrait = typeof body.portrait === "string" && body.portrait.length > 0 ? body.portrait : void 0;
    const totalShots = plan.shots.length;
    const totalCost = totalShots * GRID_PIPELINE_RENDER_CREDIT_COST_PER_IMAGE;
    await consumeCredits(userId, totalCost, "instame_grid_pipeline_render");
    let creditsConsumedCount = totalCost;
    try {
      const results = [];
      let creditsFailed = 0;
      for (const shot of plan.shots) {
        const shotPrompt = typeof shot.imagePrompt === "string" ? shot.imagePrompt : "";
        const safeShotPrompt = sanitizeGridPromptText(shotPrompt);
        if (!safeShotPrompt) {
          creditsFailed += GRID_PIPELINE_RENDER_CREDIT_COST_PER_IMAGE;
          continue;
        }
        try {
          const images = [];
          if (portrait) {
            images.push({ base64: portrait, mimeType: "image/jpeg" });
          }
          const generatedImageBase64 = await generateOpenAiImage({
            model: GRID_PIPELINE_RENDER_OPENAI_MODEL,
            prompt: safeShotPrompt,
            images: images.length > 0 ? images : void 0,
            size: "1024x1536",
            quality: GRID_PIPELINE_RENDER_OPENAI_QUALITY
          });
          results.push({
            position: shot.position,
            label: shot.label,
            type: shot.type,
            imageBase64: generatedImageBase64
          });
        } catch (shotError) {
          console.error(`InstaMe grid-pipeline/render shot ${shot.position} error:`, shotError);
          creditsFailed += GRID_PIPELINE_RENDER_CREDIT_COST_PER_IMAGE;
          await refundCredits(userId, GRID_PIPELINE_RENDER_CREDIT_COST_PER_IMAGE, "instame_grid_pipeline_render_shot_failed");
        }
      }
      creditsConsumedCount = 0;
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      return res.json({
        images: results,
        totalRequested: totalShots,
        totalRendered: results.length,
        creditsCharged: totalCost - creditsFailed,
        creditsRemaining: updatedUser?.credits ?? 0,
        model: GRID_PIPELINE_RENDER_OPENAI_MODEL,
        quality: GRID_PIPELINE_RENDER_OPENAI_QUALITY
      });
    } catch (error) {
      if (creditsConsumedCount > 0) {
        await refundCredits(userId, creditsConsumedCount, "instame_grid_pipeline_render_failed");
      }
      console.error("InstaMe grid-pipeline/render error:", error);
      const errorMessage = toErrorMessage(error, "Failed to render grid images");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/instame/grid-pipeline/extend", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const newImageCount = body.newImageCount;
    if (!isGridPipelineImageCount(newImageCount)) {
      return res.status(400).json({ error: "newImageCount must be 4, 6, 9, or 12." });
    }
    const rawCtx = body.continuityContext;
    if (!rawCtx || !rawCtx.aesthetic) {
      return res.status(400).json({ error: "continuityContext (from previous plan) is required." });
    }
    const ctx = {
      aesthetic: sanitizeGridPromptText(normalizeStringValue(rawCtx.aesthetic)),
      palette: sanitizeGridPromptText(normalizeStringValue(rawCtx.palette)),
      lightType: sanitizeGridPromptText(normalizeStringValue(rawCtx.lightType)),
      usedScenes: Array.isArray(rawCtx.usedScenes) ? rawCtx.usedScenes.map((scene) => sanitizeGridPromptText(normalizeStringValue(scene))).filter(Boolean) : [],
      usedHairstyles: Array.isArray(rawCtx.usedHairstyles) ? rawCtx.usedHairstyles.map((hairstyle) => sanitizeGridPromptText(normalizeStringValue(hairstyle))).filter(Boolean) : [],
      usedAngles: Array.isArray(rawCtx.usedAngles) ? rawCtx.usedAngles.map((angle) => sanitizeGridPromptText(normalizeStringValue(angle))).filter(Boolean) : []
    };
    if (!ctx.aesthetic) {
      return res.status(400).json({ error: "continuityContext.aesthetic is required." });
    }
    const hasPortraitReference = body.hasPortraitReference === true;
    const extraNotes = sanitizeGridPromptText(normalizeStringValue(body.extraNotes) || "");
    await consumeCredits(userId, GRID_PIPELINE_PLAN_CREDIT_COST, "instame_grid_pipeline_extend");
    let planConsumed = true;
    try {
      const apiKey = getGeminiApiKey();
      const systemPrompt = buildContinuityGridSystemPrompt(ctx, newImageCount, hasPortraitReference, extraNotes);
      const rawJson = await callGeminiFlashText({
        systemPrompt,
        geminiApiBaseUrl: GEMINI_API_BASE_URL,
        geminiApiKey: apiKey,
        model: DEFAULT_STYLE_TEXT_MODEL
      });
      const plan = parseGridPlan(rawJson, newImageCount);
      const nextContinuityContext = extractContinuityContext(plan);
      nextContinuityContext.aesthetic = sanitizeGridPromptText(nextContinuityContext.aesthetic);
      nextContinuityContext.palette = sanitizeGridPromptText(nextContinuityContext.palette);
      nextContinuityContext.lightType = sanitizeGridPromptText(nextContinuityContext.lightType);
      nextContinuityContext.usedScenes = [
        ...(/* @__PURE__ */ new Set([...ctx.usedScenes || [], ...nextContinuityContext.usedScenes])).values()
      ].map((scene) => sanitizeGridPromptText(scene)).filter(Boolean);
      nextContinuityContext.usedHairstyles = [
        ...(/* @__PURE__ */ new Set([...ctx.usedHairstyles || [], ...nextContinuityContext.usedHairstyles])).values()
      ].map((hairstyle) => sanitizeGridPromptText(hairstyle)).filter(Boolean);
      nextContinuityContext.usedAngles = [
        ...(/* @__PURE__ */ new Set([...ctx.usedAngles || [], ...nextContinuityContext.usedAngles])).values()
      ].map((angle) => sanitizeGridPromptText(angle)).filter(Boolean);
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      planConsumed = false;
      return res.json({
        plan,
        continuityContext: nextContinuityContext,
        creditsCharged: GRID_PIPELINE_PLAN_CREDIT_COST,
        creditsRemaining: updatedUser?.credits ?? 0
      });
    } catch (error) {
      if (planConsumed) {
        await refundCredits(userId, GRID_PIPELINE_PLAN_CREDIT_COST, "instame_grid_pipeline_extend_failed");
      }
      console.error("InstaMe grid-pipeline/extend error:", error);
      const errorMessage = toErrorMessage(error, "Failed to generate continuity grid plan");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/instame/grid-pipeline/composite-preview", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const imageCount = [4, 6, 9, 12].includes(body.imageCount) ? body.imageCount : 9;
    const aesthetic = sanitizeGridPromptText(normalizeStringValue(body.aesthetic) || "Old Money Luxury");
    const palette = sanitizeGridPromptText(normalizeStringValue(body.palette) || "");
    const lightType = sanitizeGridPromptText(normalizeStringValue(body.lightType) || "");
    const extraNotes = sanitizeGridPromptText(normalizeStringValue(body.extraNotes) || "");
    const hasPortraitReference = body.hasPortraitReference === true;
    const portrait = typeof body.portrait === "string" && body.portrait.length > 0 ? body.portrait : void 0;
    const referenceImages = Array.isArray(body.referenceImages) ? body.referenceImages.slice(0, 3).flatMap((image) => {
      if (!image || typeof image !== "object") return [];
      const candidate = image;
      const base64 = typeof candidate.base64 === "string" ? candidate.base64.trim() : "";
      if (!base64) return [];
      const mimeType = typeof candidate.mimeType === "string" && candidate.mimeType.trim() ? candidate.mimeType.trim() : "image/jpeg";
      return [{ base64, mimeType }];
    }) : [];
    const rawCtx = body.continuityContext;
    const priorContext = rawCtx && typeof rawCtx === "object" && normalizeStringValue(rawCtx.aesthetic) ? {
      aesthetic: sanitizeGridPromptText(normalizeStringValue(rawCtx.aesthetic)),
      palette: sanitizeGridPromptText(normalizeStringValue(rawCtx.palette)),
      lightType: sanitizeGridPromptText(normalizeStringValue(rawCtx.lightType)),
      usedScenes: Array.isArray(rawCtx.usedScenes) ? rawCtx.usedScenes.map((scene) => sanitizeGridPromptText(normalizeStringValue(scene))).filter(Boolean) : [],
      usedHairstyles: Array.isArray(rawCtx.usedHairstyles) ? rawCtx.usedHairstyles.map((hairstyle) => sanitizeGridPromptText(normalizeStringValue(hairstyle))).filter(Boolean) : [],
      usedAngles: Array.isArray(rawCtx.usedAngles) ? rawCtx.usedAngles.map((angle) => sanitizeGridPromptText(normalizeStringValue(angle))).filter(Boolean) : []
    } : null;
    const referenceImageNote = referenceImages.length > 0 ? `Use the attached product/scene reference image${referenceImages.length > 1 ? "s" : ""} as must-include visual material. Keep the items recognizable and naturally integrated across the grid; do not replace the portrait subject with the product references.` : "";
    const mergedExtraNotes = [extraNotes, referenceImageNote].filter(Boolean).join(" ");
    const seed = Math.floor(Math.random() * 1e6) + 1;
    const inputs = {
      imageCount,
      aesthetic,
      palette,
      lightType,
      extraNotes: mergedExtraNotes,
      hasPortraitReference,
      seed
    };
    await consumeCredits(userId, GRID_PIPELINE_COMPOSITE_CREDIT_COST, "instame_grid_pipeline_composite_preview");
    let consumed = true;
    try {
      const geminiApiKey = getGeminiApiKey();
      const geminiApiBaseUrl = process.env.GEMINI_API_BASE_URL || process.env.AI_INTEGRATIONS_GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
      const systemPrompt = priorContext ? buildContinuityGridSystemPrompt(priorContext, imageCount, hasPortraitReference, mergedExtraNotes, seed) : buildMasterGridSystemPrompt(inputs);
      const rawPlan = await callGeminiFlashText({
        systemPrompt,
        geminiApiBaseUrl,
        geminiApiKey,
        model: DEFAULT_STYLE_TEXT_MODEL
      });
      const plan = parseGridPlan(rawPlan, imageCount, seed);
      const planContext = extractContinuityContext(plan);
      const continuityContext = priorContext ? {
        aesthetic: sanitizeGridPromptText(planContext.aesthetic) || priorContext.aesthetic,
        palette: sanitizeGridPromptText(planContext.palette) || priorContext.palette,
        lightType: sanitizeGridPromptText(planContext.lightType) || priorContext.lightType,
        usedScenes: [.../* @__PURE__ */ new Set([...priorContext.usedScenes, ...planContext.usedScenes])].map((scene) => sanitizeGridPromptText(scene)).filter(Boolean),
        usedHairstyles: [.../* @__PURE__ */ new Set([...priorContext.usedHairstyles, ...planContext.usedHairstyles])].map((hairstyle) => sanitizeGridPromptText(hairstyle)).filter(Boolean),
        usedAngles: [.../* @__PURE__ */ new Set([...priorContext.usedAngles, ...planContext.usedAngles])].map((angle) => sanitizeGridPromptText(angle)).filter(Boolean)
      } : planContext;
      const compositePrompt = sanitizeGridPromptText(buildCompositeGridPrompt(plan, hasPortraitReference));
      const compositeImages = [];
      if (portrait) {
        compositeImages.push({ base64: portrait, mimeType: "image/jpeg" });
      }
      compositeImages.push(...referenceImages);
      const { imageBase64: compositeImageBase64 } = await renderGridCompositePreview({
        prompt: compositePrompt,
        images: compositeImages
      });
      consumed = false;
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      return res.json({
        gridImageBase64: compositeImageBase64,
        plan,
        continuityContext,
        imageCount,
        creditsCharged: GRID_PIPELINE_COMPOSITE_CREDIT_COST,
        creditsRemaining: updatedUser?.credits ?? 0
      });
    } catch (error) {
      if (consumed) {
        await refundCredits(userId, GRID_PIPELINE_COMPOSITE_CREDIT_COST, "instame_grid_pipeline_composite_preview_failed");
      }
      console.error("InstaMe grid-pipeline/composite-preview error:", error);
      const errorMessage = toErrorMessage(error, "Failed to generate composite grid preview");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/instame/grid-pipeline/extract-shots", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const gridImageBase64 = normalizeStringValue(body.gridImageBase64);
    if (!gridImageBase64) {
      return res.status(400).json({ error: "gridImageBase64 is required." });
    }
    const plan = body.plan;
    if (!plan || !Array.isArray(plan.shots) || plan.shots.length === 0) {
      return res.status(400).json({ error: "plan with shots is required." });
    }
    const positions = Array.isArray(body.positions) ? body.positions.filter((p) => typeof p === "number") : plan.shots.map((s) => s.position);
    const uniqueSortedPositions = [...new Set(positions)].sort((a, b) => a - b);
    if (uniqueSortedPositions.length === 0) {
      return res.status(400).json({ error: "At least one position must be selected." });
    }
    const portrait = typeof body.portrait === "string" && body.portrait.length > 0 ? body.portrait : void 0;
    const referenceImages = Array.isArray(body.referenceImages) ? body.referenceImages.slice(0, 3).flatMap((image) => {
      if (!image || typeof image !== "object") return [];
      const candidate = image;
      const base64 = typeof candidate.base64 === "string" ? candidate.base64.trim() : "";
      if (!base64) return [];
      const mimeType = typeof candidate.mimeType === "string" && candidate.mimeType.trim() ? candidate.mimeType.trim() : "image/jpeg";
      return [{ base64, mimeType }];
    }) : [];
    const imageCount = plan.shots.length;
    const aesthetic = sanitizeGridPromptText(normalizeStringValue(plan.aesthetic) || "");
    const palette = sanitizeGridPromptText(normalizeStringValue(plan.palette) || "");
    const lightType = sanitizeGridPromptText(normalizeStringValue(plan.lightType) || "");
    const totalCost = uniqueSortedPositions.length * GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE;
    await consumeCredits(userId, totalCost, "instame_grid_pipeline_extract_shots");
    let creditsConsumedCount = totalCost;
    try {
      const results = [];
      let creditsFailed = 0;
      const failedPositions = [];
      const shotsToExtract = plan.shots.filter((shot) => uniqueSortedPositions.includes(shot.position));
      for (const shot of shotsToExtract) {
        const useReveExtraction = GRID_PIPELINE_EXTRACT_PROVIDER === "reve" && hasReveImageConfig();
        let cellImageBase64 = gridImageBase64;
        let preCropped = false;
        if (useReveExtraction) {
          try {
            cellImageBase64 = await cropGridCellFromComposite(gridImageBase64, shot.position, imageCount);
            preCropped = true;
          } catch (cropError) {
            console.warn(
              `InstaMe grid-pipeline/extract-shots position ${shot.position}: cell crop failed, falling back to full grid.`,
              cropError
            );
            cellImageBase64 = gridImageBase64;
            preCropped = false;
          }
        }
        const images = [
          { base64: cellImageBase64, mimeType: "image/png" }
        ];
        if (portrait) {
          images.push({ base64: portrait, mimeType: "image/jpeg" });
        }
        images.push(...referenceImages);
        const safeShot = {
          ...shot,
          label: sanitizeGridPromptText(normalizeStringValue(shot.label)),
          hairstyle: shot.hairstyle ? sanitizeGridPromptText(normalizeStringValue(shot.hairstyle)) : null,
          angle: shot.angle ? sanitizeGridPromptText(normalizeStringValue(shot.angle)) : null,
          imagePrompt: shot.imagePrompt ? sanitizeGridPromptText(normalizeStringValue(shot.imagePrompt)) : void 0
        };
        const referenceImagePromptNote = referenceImages.length > 0 ? ` Attached product/scene reference image${referenceImages.length > 1 ? "s" : ""} must remain recognizable and naturally integrated if visible in this shot.` : "";
        const primaryPrompt = sanitizeGridPromptText(buildExtractionPrompt({
          position: shot.position,
          imageCount,
          shot: safeShot,
          hasPortrait: Boolean(portrait),
          aesthetic,
          palette,
          lightType,
          preCropped
        }) + referenceImagePromptNote);
        let generatedImageBase64 = null;
        let shotFailed = false;
        try {
          generatedImageBase64 = await renderGridExtractedShot({
            prompt: primaryPrompt,
            images
          });
        } catch (primaryError) {
          const isModerationBlock = primaryError instanceof Error && (primaryError.message.includes("moderation_blocked") || primaryError.message.includes("safety") || primaryError.message.includes("safety_violations") || primaryError.message.includes("Your request was rejected")) || primaryError?.code === "moderation_blocked";
          if (isModerationBlock) {
            console.warn(
              `InstaMe grid-pipeline/extract-shots position ${shot.position}: moderation blocked, retrying with safe fallback prompt.`
            );
            try {
              const fallbackPrompt = buildModerationSafeFallbackExtractionPrompt({
                position: shot.position,
                imageCount,
                type: shot.type,
                aesthetic,
                palette,
                lightType,
                hasPortrait: Boolean(portrait)
              });
              generatedImageBase64 = await renderGridExtractedShot({
                prompt: fallbackPrompt,
                images
              });
            } catch (fallbackError) {
              console.error(
                `InstaMe grid-pipeline/extract-shots position ${shot.position} fallback error:`,
                fallbackError
              );
              shotFailed = true;
            }
          } else {
            console.error(
              `InstaMe grid-pipeline/extract-shots position ${shot.position} error:`,
              primaryError
            );
            shotFailed = true;
          }
        }
        if (generatedImageBase64) {
          results.push({
            position: shot.position,
            label: shot.label,
            type: shot.type,
            imageBase64: generatedImageBase64
          });
        } else if (shotFailed) {
          creditsFailed += GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE;
          failedPositions.push(shot.position);
          await refundCredits(
            userId,
            GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE,
            "instame_grid_pipeline_extract_shot_failed"
          );
        }
      }
      creditsConsumedCount = 0;
      if (results.length === 0) {
        return res.status(503).json({
          error: "No images could be extracted from this preview. Credits for failed extractions were refunded. Please regenerate the preview or adjust the brief and try again.",
          failedPositions,
          totalRequested: uniqueSortedPositions.length,
          totalExtracted: 0,
          creditsCharged: 0
        });
      }
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      return res.json({
        images: results,
        totalRequested: uniqueSortedPositions.length,
        totalExtracted: results.length,
        creditsCharged: totalCost - creditsFailed,
        creditsRemaining: updatedUser?.credits ?? 0,
        failedPositions
      });
    } catch (error) {
      if (creditsConsumedCount > 0) {
        await refundCredits(userId, creditsConsumedCount, "instame_grid_pipeline_extract_shots_failed");
      }
      console.error("InstaMe grid-pipeline/extract-shots error:", error);
      const errorMessage = toErrorMessage(error, "Failed to extract grid shots");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/instame/grid-preview", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const packId = normalizeStringValue(body.packId);
    const vibeId = normalizeStringValue(body.vibeId);
    const vibeLabel = sanitizeGridPromptText(normalizeStringValue(body.vibeLabel) || vibeId);
    const packLabel = sanitizeGridPromptText(normalizeStringValue(body.packLabel) || packId);
    const packCount = typeof body.packCount === "number" ? body.packCount : 4;
    const identityMode = ["portrait_reference", "inspired_muse", "fictional_muse"].includes(
      body.identityMode
    ) ? body.identityMode : "fictional_muse";
    const requiredElementIds = Array.isArray(body.requiredElementIds) ? body.requiredElementIds.filter(
      (id) => ["outfit", "location", "car", "accessories", "mirror", "detail"].includes(id)
    ) : [];
    const notes = sanitizeGridPromptText(normalizeStringValue(body.notes));
    if (!packId || !vibeId) {
      return res.status(400).json({ error: "packId and vibeId are required." });
    }
    let portraitInput;
    if (identityMode === "portrait_reference" && body.portrait?.base64) {
      const base64 = normalizeStringValue(body.portrait.base64);
      if (!base64) {
        return res.status(400).json({ error: "portrait.base64 is required when identityMode is portrait_reference." });
      }
      portraitInput = {
        base64,
        mimeType: normalizeStringValue(body.portrait.mimeType) || "image/jpeg"
      };
    }
    const brief = { packId, packLabel, packCount, vibeId, vibeLabel, requiredElementIds, notes, identityMode };
    let creditsConsumed = false;
    try {
      const consumed = await consumeCredits(userId, GRID_PREVIEW_CREDIT_COST, "instame_grid_preview");
      if (!consumed) {
        return res.status(402).json({
          error: `Not enough credits. Grid preview costs ${GRID_PREVIEW_CREDIT_COST} credits.`,
          requiredCredits: GRID_PREVIEW_CREDIT_COST
        });
      }
      creditsConsumed = true;
      const prompt = sanitizeGridPromptText(buildGridPreviewPrompt(brief));
      const images = portraitInput ? [portraitInput] : [];
      const previewBase64 = await generateOpenAiImage({
        model: GRID_PIPELINE_RENDER_OPENAI_MODEL,
        prompt,
        images,
        size: "1024x1536",
        quality: GRID_PIPELINE_RENDER_OPENAI_QUALITY
      });
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      return res.json({
        previewBase64,
        creditsCharged: GRID_PREVIEW_CREDIT_COST,
        creditsRemaining: updatedUser?.credits ?? 0
      });
    } catch (error) {
      console.error("InstaMe grid-preview error:", error);
      if (creditsConsumed) {
        await refundCredits(userId, GRID_PREVIEW_CREDIT_COST, "instame_grid_preview_failed");
      }
      const errorMessage = toErrorMessage(error, "Failed to generate grid preview");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/instame/grid-render", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const packId = normalizeStringValue(body.packId);
    const vibeId = normalizeStringValue(body.vibeId);
    const vibeLabel = sanitizeGridPromptText(normalizeStringValue(body.vibeLabel) || vibeId);
    const packLabel = sanitizeGridPromptText(normalizeStringValue(body.packLabel) || packId);
    const packCount = typeof body.packCount === "number" ? body.packCount : 4;
    const identityMode = ["portrait_reference", "inspired_muse", "fictional_muse"].includes(
      body.identityMode
    ) ? body.identityMode : "fictional_muse";
    const requiredElementIds = Array.isArray(body.requiredElementIds) ? body.requiredElementIds.filter(
      (id) => ["outfit", "location", "car", "accessories", "mirror", "detail"].includes(id)
    ) : [];
    const notes = sanitizeGridPromptText(normalizeStringValue(body.notes));
    if (!packId || !vibeId) {
      return res.status(400).json({ error: "packId and vibeId are required." });
    }
    let portraitInput;
    if (identityMode === "portrait_reference" && body.portrait?.base64) {
      const base64 = normalizeStringValue(body.portrait.base64);
      if (!base64) {
        return res.status(400).json({ error: "portrait.base64 is required when identityMode is portrait_reference." });
      }
      portraitInput = {
        base64,
        mimeType: normalizeStringValue(body.portrait.mimeType) || "image/jpeg"
      };
    } else if (identityMode === "portrait_reference") {
      return res.status(400).json({ error: "A portrait image is required for portrait_reference identity mode." });
    }
    const brief = { packId, packLabel, packCount, vibeId, vibeLabel, requiredElementIds, notes, identityMode };
    const shotPlan = buildGridPackShotPlan(brief);
    const totalShots = shotPlan.length;
    const totalCost = GRID_RENDER_CREDIT_COST_PER_IMAGE * totalShots;
    let creditsConsumedCount = 0;
    try {
      const consumed = await consumeCredits(userId, totalCost, "instame_grid_render");
      if (!consumed) {
        return res.status(402).json({
          error: `Not enough credits. Rendering ${totalShots} images costs ${totalCost} credits.`,
          requiredCredits: totalCost
        });
      }
      creditsConsumedCount = totalCost;
      const renderedImages = [];
      for (const shot of shotPlan) {
        try {
          const prompt = sanitizeGridPromptText(buildGridShotRenderPrompt({
            shot,
            brief,
            totalShots,
            hasPortraitReference: Boolean(portraitInput)
          }));
          const images = portraitInput ? [portraitInput] : [];
          const imageBase64 = await generateOpenAiImage({
            model: GRID_PIPELINE_RENDER_OPENAI_MODEL,
            prompt,
            images,
            size: "1024x1536",
            quality: GRID_PIPELINE_RENDER_OPENAI_QUALITY
          });
          renderedImages.push({ shotIndex: shot.index, shotLabel: shot.shotLabel, imageBase64 });
        } catch (shotError) {
          console.error(`InstaMe grid-render shot ${shot.index} error:`, shotError);
          await refundCredits(userId, GRID_RENDER_CREDIT_COST_PER_IMAGE, `instame_grid_render_shot_${shot.index}_failed`);
          creditsConsumedCount -= GRID_RENDER_CREDIT_COST_PER_IMAGE;
        }
      }
      if (renderedImages.length === 0) {
        return res.status(503).json({ error: "All images failed to generate. Credits have been refunded. Please try again." });
      }
      const [updatedUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      return res.json({
        images: renderedImages,
        totalRequested: totalShots,
        totalRendered: renderedImages.length,
        creditsCharged: creditsConsumedCount,
        creditsRemaining: updatedUser?.credits ?? 0
      });
    } catch (error) {
      console.error("InstaMe grid-render error:", error);
      if (creditsConsumedCount > 0) {
        await refundCredits(userId, creditsConsumedCount, "instame_grid_render_failed");
      }
      const errorMessage = toErrorMessage(error, "Failed to render grid pack");
      const temporaryServiceMessage = toUserFacingTemporaryImageServiceMessage(errorMessage);
      if (temporaryServiceMessage) {
        return res.status(503).json({ error: temporaryServiceMessage });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });
  const httpServer = (0, import_node_http.createServer)(app2);
  return httpServer;
}

// server/index.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var app = (0, import_express.default)();
var log = console.log;
function addOriginCandidate(origins, value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return;
  try {
    const parsed = new URL(trimmed);
    origins.add(parsed.origin);
    return;
  } catch {
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    origins.add(trimmed.replace(/\/+$/, ""));
    return;
  }
  origins.add(`https://${trimmed.replace(/\/+$/, "")}`);
}
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      origins.add(`https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}`);
    }
    addOriginCandidate(origins, process.env.PUBLIC_WEB_URL);
    if (process.env.CORS_ORIGINS) {
      process.env.CORS_ORIGINS.split(",").forEach((entry) => {
        addOriginCandidate(origins, entry);
      });
    }
    const origin = req.header("origin");
    const allowAllOrigins = String(process.env.CORS_ALLOW_ALL || "").toLowerCase() === "true";
    const isLocalhost2 = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (allowAllOrigins || origins.has(origin) || isLocalhost2)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    import_express.default.json({
      limit: "15mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(import_express.default.urlencoded({ extended: false, limit: "15mb" }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path4 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path4.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path3.resolve(process.cwd(), "app.json");
    const appJsonContent = fs3.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path3.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs3.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs3.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const webBuildPath = path3.resolve(process.cwd(), "web-build");
  const webIndexPath = path3.join(webBuildPath, "index.html");
  const hasWebBuild = fs3.existsSync(webIndexPath);
  if (hasWebBuild) {
    app2.use(import_express.default.static(webBuildPath));
    app2.use("/assets", import_express.default.static(path3.resolve(process.cwd(), "assets")));
    app2.get(/.*/, (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      if (req.method !== "GET") return next();
      return res.sendFile(webIndexPath);
    });
    log("Serving Expo web build from /web-build");
    return;
  }
  const templatePath = path3.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs3.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", import_express.default.static(path3.resolve(process.cwd(), "assets")));
  app2.use(import_express.default.static(path3.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
