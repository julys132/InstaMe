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
  authProvider: (0, import_pg_core.text)("auth_provider").notNull().default("email"),
  providerId: (0, import_pg_core.text)("provider_id"),
  credits: (0, import_pg_core.integer)("credits").notNull().default(3),
  subscriptionPlan: (0, import_pg_core.text)("subscription_plan"),
  subscriptionRenewAt: (0, import_pg_core.timestamp)("subscription_renew_at"),
  stripeCustomerId: (0, import_pg_core.text)("stripe_customer_id"),
  stripeSubscriptionId: (0, import_pg_core.text)("stripe_subscription_id"),
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
var INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS = 2;
var INSTAME_GENERATION_TIERS = [
  {
    id: "high_res",
    label: "High Res",
    subtitle: "Sharper premium export",
    credits: 9,
    provider: "Together",
    model: "FLUX.2 Pro",
    output: "1024 x 1024",
    badge: "Live",
    availability: "live"
  }
];
var INSTAME_EDIT_TIERS = [
  {
    id: "edit",
    label: "Edit",
    subtitle: "Refine your generated result",
    credits: 3,
    provider: "Together",
    model: "Google Flash Image 3.1 Preview",
    output: "1024 x 1024",
    badge: "Live",
    availability: "live"
  }
];
var INSTAME_PORTRAIT_ENHANCE_TIER = {
  id: "portrait_enhance",
  label: "Portrait Enhance",
  subtitle: "Polish your selfie before styling",
  credits: 3,
  provider: "Together",
  model: "Google Flash Image 3.1 Preview",
  output: "1024 x 1024",
  badge: "Live",
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

// server/lib/stripe.ts
var STRIPE_API_BASE = "https://api.stripe.com/v1";
function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
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
var catalogCache = null;
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
  const promptFile = typeof record?.promptFile === "string" ? record.promptFile : void 0;
  const examples = Array.isArray(record?.examples) ? record.examples.filter((entry) => typeof entry === "string") : [];
  const promptVariants = Array.isArray(record?.promptVariants) ? record.promptVariants.map((entry) => normalizePromptVariant(entry)).filter((entry) => Boolean(entry)) : [];
  const promptOnlyAfterFirstUse = record?.promptOnlyAfterFirstUse === true;
  if (!id || !label || !subtitle || !promptHint || !representativeImage || examples.length === 0) {
    return null;
  }
  return {
    id,
    label,
    subtitle,
    promptHint,
    cover,
    representativeImage,
    examples,
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
function getCatalogAssetAbsolutePath(styleId, filename) {
  const slug = styleId.trim();
  const safeFilename = path.basename(filename);
  if (!slug || !safeFilename) return null;
  const absolutePath = path.resolve(
    process.cwd(),
    "assets",
    "instame-style-presets",
    "styles",
    slug,
    safeFilename
  );
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
function resolveOpenAiImageModelAlias(model) {
  const normalized = model.trim().toLowerCase();
  const latestHighFidelityWithVersion = "chatgpt-image-latest-high-fidelity (20251216)";
  if (!normalized) return model;
  if (normalized === "gpt-image-1.5" || normalized === "gpt-image-1" || normalized === "chatgpt-image-latest-high-fidelity" || normalized === "chatgpt image latest high fidelity" || normalized === latestHighFidelityWithVersion) {
    return "chatgpt-image-latest-high-fidelity";
  }
  return model;
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
  const defaultVersion = options.operation === "edit" ? options.mode === "high_res" ? "latest" : "latest-fast" : "latest";
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
  const resolvedModel = resolveOpenAiImageModelAlias(options.model);
  const size = options.size || "1024x1024";
  const quality = options.quality || "auto";
  const inputImages = Array.isArray(options.images) ? options.images : [];
  if (inputImages.length > 0) {
    const files = await Promise.all(
      inputImages.map((image, index) => toOpenAiUpload(image, `instame-edit-${index + 1}`))
    );
    const response2 = await client.images.edit({
      model: resolvedModel,
      prompt: options.prompt,
      image: files,
      size,
      quality
    });
    const base642 = response2.data?.[0]?.b64_json;
    if (!base642) {
      throw new Error("OpenAI image edit returned no image data.");
    }
    return base642;
  }
  const response = await client.images.generate({
    model: resolvedModel,
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
  const payload = {
    model: resolvedModel,
    prompt: options.prompt,
    width: options.width,
    height: options.height,
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
  if (options.aspectRatio && options.aspectRatio !== "auto") {
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
    const message = parsed?.message || parsed?.error || parsed?.error_code || responseText || `Reve API returned status ${response.status}`;
    throw new Error(message);
  }
  const base64 = extractReveImageBase64(parsed);
  if (!base64) {
    throw new Error("Reve image generation returned no image data.");
  }
  return base64;
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
  { id: "pack_5", name: "Starter", credits: 5, priceCents: 299 },
  { id: "pack_15", name: "Style Pack", credits: 15, priceCents: 699, popular: true },
  { id: "pack_30", name: "Fashion Pack", credits: 30, priceCents: 1199 },
  { id: "pack_100", name: "Pro Pack", credits: 100, priceCents: 3499 }
];
var SUBSCRIPTION_PLANS = [
  { id: "sub_basic", name: "Basic", creditsPerMonth: 10, priceCents: 499 },
  { id: "sub_premium", name: "Premium", creditsPerMonth: 30, priceCents: 999, popular: true },
  { id: "sub_unlimited", name: "Unlimited", creditsPerMonth: 999, priceCents: 1999 }
];
var STYLE_COSTS = {
  text: 2,
  image: 5
};
var INSTAME_TRANSFORM_COST = Number.parseInt(
  process.env.INSTAME_TRANSFORM_COST || String(getLiveInstaMeGenerationTier().credits),
  10
);
var DEFAULT_INITIAL_CREDITS = Number.parseInt(process.env.DEFAULT_INITIAL_CREDITS || "3", 10);
var DEFAULT_DEV_CREDIT_GRANT = Number.parseInt(process.env.DEV_CREDIT_GRANT_AMOUNT || "50", 10);
var MAX_DEV_CREDIT_GRANT = 500;
var DEFAULT_ALLOWED_DEV_CREDIT_EMAILS = ["iuliastarcean@gmail.com"];
var GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
var DEFAULT_STYLE_TEXT_MODEL = process.env.STYLE_TEXT_MODEL || "gemini-3-flash-preview";
var DEFAULT_STYLE_IMAGE_MODEL = process.env.STYLE_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
var DEFAULT_OWN_STYLE_ANALYSIS_MODEL = process.env.OWN_STYLE_ANALYSIS_MODEL || "gemini-3.1-pro";
var DEFAULT_TOGETHER_FLASH_IMAGE_MODEL = process.env.STYLE_PREVIEW_TOGETHER_MODEL || "google/flash-image-3.1";
var DEFAULT_TOGETHER_PRO_IMAGE_MODEL = process.env.STYLE_HIGH_RES_TOGETHER_MODEL || "google/gemini-3-pro-image";
var STYLE_IMAGE_SIZE = (process.env.STYLE_IMAGE_SIZE || "512x512").trim() || "512x512";
var INSTAME_PORTRAIT_ENHANCE_MODEL = process.env.INSTAME_PORTRAIT_ENHANCE_MODEL || DEFAULT_TOGETHER_FLASH_IMAGE_MODEL;
var INSTAME_PORTRAIT_ENHANCE_SIZE = (process.env.INSTAME_PORTRAIT_ENHANCE_SIZE || INSTAME_PORTRAIT_ENHANCE_TIER.output).trim() || "1024 x 1024";
var INSTAME_PORTRAIT_ENHANCE_PROMPT_PATH = path2.resolve(
  process.cwd(),
  "assets",
  "instame-style-presets",
  "base-prompt",
  "prompt.txt"
);
var EXPOSE_STYLE_DEBUG_PROMPT = normalizeStringValue(process.env.EXPOSE_STYLE_DEBUG_PROMPT).toLowerCase() === "true";
var MAX_IMAGE_COUNT_BY_MODE = {
  single_item: 10,
  multi_item: 3
};
var MAX_IMAGE_BASE64_LENGTH = 25e5;
var MAX_INSTAME_UPLOADED_IMAGES = 10;
var MAX_INSTAME_ENHANCED_IMAGES = 10;
var MAX_INSTAME_OWN_STYLES = 12;
var MAX_INSTAME_LIBRARY_IMAGES_TOTAL = MAX_INSTAME_UPLOADED_IMAGES + MAX_INSTAME_ENHANCED_IMAGES + MAX_INSTAME_OWN_STYLES;
var MAX_INSTAME_LIBRARY_IMAGE_BYTES = 1e6;
var MAX_INSTAME_LIBRARY_IMAGE_DIMENSION = 1024;
var MAX_INSTAME_LIBRARY_PREVIEW_BASE64_LENGTH = 22e4;
var MAX_INSTAME_OWN_STYLE_PROMPT_LENGTH = 4e3;
var STRIPE_WEBHOOK_TOLERANCE_SEC = 300;
var DEFAULT_IAP_PRODUCT_CREDITS = {
  "com.instame.app.credits.5": 5,
  "com.instame.app.credits.15": 15,
  "com.instame.app.credits.30": 30,
  "com.instame.app.credits.100": 100,
  "com.iulia.muse.credits.5": 5,
  "com.iulia.muse.credits.15": 15,
  "com.iulia.muse.credits.30": 30,
  "com.iulia.muse.credits.100": 100
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
  return 3;
}
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function sanitizeUser(user) {
  const normalizedStyleGender = normalizeStyleGender(user.styleGender);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.authProvider || "email",
    credits: user.credits,
    subscription: user.subscriptionPlan,
    styleGender: normalizedStyleGender || null,
    stylePreferences: Array.isArray(user.stylePreferences) ? user.stylePreferences : [],
    favoriteLooks: Array.isArray(user.favoriteLooks) ? user.favoriteLooks : [],
    notificationsEnabled: user.notificationsEnabled
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
function resolveInstaMeStylePreset(input) {
  const presetId = normalizeStringValue(input);
  const catalogPresets = getInstaMeStylePresetsFromCatalog();
  const catalogDefault = catalogPresets[0];
  if (!presetId) {
    return catalogDefault || INSTAME_STYLE_PRESETS[0] || null;
  }
  return findCatalogStylePresetById(presetId) || findInstaMeStylePresetById(presetId) || catalogDefault || INSTAME_STYLE_PRESETS[0] || null;
}
function normalizeStringValue(input) {
  if (typeof input === "string") return input.trim();
  if (Array.isArray(input)) {
    const first = input.find((entry) => typeof entry === "string");
    return first ? first.trim() : "";
  }
  return "";
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
  return `${origin}/api/instame/style-asset/${encodeURIComponent(assetParts.styleId)}/${encodeURIComponent(
    assetParts.filename
  )}`;
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
  if (generationTierId === "high_res") {
    return { width: 1024, height: 1024, sizeLabel: "1024x1024" };
  }
  return { width: 512, height: 512, sizeLabel: "512x512" };
}
function resolveOpenAiSize(generationTierId) {
  return "1024x1024";
}
var OWN_STYLE_ANALYSIS_PROMPT = [
  "Analyze this image from the perspective of an elite-level professional photographer.",
  "Include exact body posing, facial expression, facial micro-expression, and exactly how the hair falls or is arranged.",
  "Also describe wardrobe, lighting, camera angle, framing, composition, background, mood, color palette, texture, and the overall aesthetic.",
  "Write the result in English as one precise editing instruction paragraph without bullet points or numbering."
].join(" ");
function normalizeStringList(input) {
  if (!Array.isArray(input)) return [];
  return input.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean);
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
    return { base64, mimeType };
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
    const base64 = normalizeStringValue(candidate.base64);
    const previewBase64 = normalizeStringValue(candidate.previewBase64);
    const kind = candidate.kind === "enhanced" ? "enhanced" : candidate.kind === "own_style" ? "own_style" : "uploaded";
    const analyzedPrompt = normalizeStringValue(candidate.analyzedPrompt).slice(0, MAX_INSTAME_OWN_STYLE_PROMPT_LENGTH);
    const imageHash = normalizeStringValue(candidate.imageHash);
    const name = normalizeStringValue(candidate.name) || (kind === "own_style" ? "Own Style" : "Portrait");
    const width = Number(candidate.width);
    const height = Number(candidate.height);
    const fileSizeBytes = Number(candidate.fileSizeBytes);
    const createdAt = normalizeStringValue(candidate.createdAt);
    if (!id || !base64 || !previewBase64) return null;
    if (kind === "own_style" && !analyzedPrompt) return null;
    if (!Number.isFinite(width) || width <= 0) return null;
    if (!Number.isFinite(height) || height <= 0) return null;
    return {
      id,
      name,
      kind,
      mimeType,
      base64: stripDataUriPrefix(base64),
      previewBase64: stripDataUriPrefix(previewBase64),
      width: Math.min(Math.round(width), MAX_INSTAME_LIBRARY_IMAGE_DIMENSION),
      height: Math.min(Math.round(height), MAX_INSTAME_LIBRARY_IMAGE_DIMENSION),
      fileSizeBytes: Number.isFinite(fileSizeBytes) && fileSizeBytes > 0 ? Math.round(fileSizeBytes) : estimateBase64Bytes(base64),
      analyzedPrompt: analyzedPrompt || void 0,
      imageHash: imageHash || void 0,
      createdAt: createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
  }).filter((entry) => Boolean(entry)).slice(0, MAX_INSTAME_LIBRARY_IMAGES_TOTAL);
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
    previewUri: `data:${image.mimeType};base64,${image.previewBase64}`
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
    imageHash: normalizeStringValue(image.imageHash) || void 0
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
    imageHash: computeImageHash(options.stylePayload?.previewBase64 || ""),
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
    imageHash: options.savedOwnStyle.imageHash,
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
  const userPrompt = options.customPrompt ? `User custom direction: ${options.customPrompt}` : "No extra user direction.";
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
    userPrompt,
    `Output one photorealistic image, ${options.sizeLabel || STYLE_IMAGE_SIZE}, with coherent light and color grading.`
  ].join("\n");
}
function buildPromptOnlyPresetTransformPrompt(options) {
  const extraUserDirection = options.customPrompt ? `Extra user direction: ${options.customPrompt}.` : "No extra user direction.";
  return [
    `Use the uploaded face photo as the only visual identity source for the ${options.presetLabel} transformation.`,
    "Preserve the exact facial identity, skin tone, facial structure, and the original hair color of the uploaded subject.",
    "Do not copy another person's facial traits. Keep the same person recognizable.",
    "Use the uploaded photo only as the identity anchor; do not use any external style-reference images for this generation.",
    "Hair guidance: you may adapt styling structure only if the prompt asks for it, but never recolor the subject's hair.",
    "Wardrobe guidance: only make tasteful, realistic outfit changes.",
    options.preserveBackground ? "Keep the original environment recognizable unless the prompt strongly requires a different scene." : "You may adapt the environment to match the prompt more closely.",
    extraUserDirection,
    `Requested output tier: ${options.generationTierId === "high_res" ? "High Res" : "Preview"}.`,
    options.variantPrompt
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
function resolveGenerationTierById(input) {
  const generationTierId = normalizeStringValue(input);
  return INSTAME_GENERATION_TIERS.find((tier) => tier.id === generationTierId) || getLiveInstaMeGenerationTier();
}
function resolveEditTierById(input) {
  const editTierId = normalizeStringValue(input);
  return INSTAME_EDIT_TIERS.find((tier) => tier.id === editTierId) || INSTAME_EDIT_TIERS[0];
}
function resolveGenerationMode(generationTierId) {
  return generationTierId === "high_res" ? "high_res" : "preview";
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
function hasOpenAiImageConfig() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}
function hasTogetherImageConfig() {
  return Boolean(process.env.TOGETHER_API_KEY);
}
function hasReveImageConfig() {
  return Boolean(process.env.REVE_API_KEY);
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
    generationTierId: options.generationMode
  });
  if (selectedModel?.provider === "together") {
    const { width, height } = resolveGenerationResolution(options.generationMode);
    const referenceImageUrl = toRuntimeAssetUrl(options.req, options.uploadedImages[0]);
    const imageBase642 = await generateTogetherImage({
      model: selectedModel.model,
      prompt,
      referenceImages: [referenceImageUrl],
      width,
      height
    });
    return {
      imageBase64: imageBase642,
      model: selectedModel.displayName,
      provider: "Together"
    };
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
  const openAiModel = selectedModel?.model || "chatgpt-image-latest-high-fidelity";
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
async function analyzeOwnStyleReferenceImage(styleImage) {
  const analysisResponse = await generateGeminiContent({
    model: DEFAULT_OWN_STYLE_ANALYSIS_MODEL,
    parts: [{ text: OWN_STYLE_ANALYSIS_PROMPT }, ...toGeminiInlineImageParts([styleImage])],
    responseMimeType: "text/plain",
    maxOutputTokens: 1200,
    temperature: 0.3
  });
  const analysisText = extractGeminiText(analysisResponse).replace(/\s+/g, " ").trim();
  if (!analysisText) {
    throw new Error("Own Style analysis returned no prompt text.");
  }
  return analysisText;
}
function buildOwnStyleTransformPrompt(options) {
  const promptParts = [
    `Edit the image following these instructions: ${options.analyzedStylePrompt}`,
    "Preserve the uploaded subject's identity, facial features, and overall likeness exactly.",
    "Keep the result photorealistic and cohesive.",
    "Use the largest native output resolution available from the model."
  ];
  if (options.preserveBackground) {
    promptParts.push(
      "Keep the original background structure where possible unless the style instructions clearly require a different scene."
    );
  }
  if (options.customPrompt.trim()) {
    promptParts.push(`Additional user notes: ${options.customPrompt.trim()}`);
  }
  return promptParts.join("\n");
}
async function generateOwnStyleImage(options) {
  const imageResponse = await generateGeminiContent({
    model: DEFAULT_STYLE_IMAGE_MODEL,
    parts: [
      {
        text: buildOwnStyleTransformPrompt({
          analyzedStylePrompt: options.analyzedStylePrompt,
          customPrompt: options.customPrompt,
          preserveBackground: options.preserveBackground
        })
      },
      ...toGeminiInlineImageParts(options.uploadedImages)
    ],
    responseModalities: ["IMAGE", "TEXT"],
    maxOutputTokens: 1200
  });
  const imageBase64 = extractGeminiImageBase64(imageResponse);
  if (!imageBase64) {
    throw new Error("Own Style generation failed. No image data returned.");
  }
  return {
    imageBase64,
    model: DEFAULT_STYLE_IMAGE_MODEL,
    provider: "Google"
  };
}
async function generateReferenceGuidedHighResImage(options) {
  const { width, height, sizeLabel } = resolveGenerationResolution("high_res");
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
  const imageBase64 = await generateTogetherImage({
    model: DEFAULT_TOGETHER_FLASH_IMAGE_MODEL,
    prompt,
    referenceImages,
    width: 1024,
    height: 1024
  });
  return {
    imageBase64,
    model: tier.model,
    provider: "Together"
  };
}
async function generateInstaMePortraitEnhance(options) {
  const imageBase64 = await generateTogetherImage({
    model: INSTAME_PORTRAIT_ENHANCE_MODEL,
    prompt: buildPortraitEnhancePrompt(),
    referenceImages: [toRuntimeAssetUrl(options.req, options.photo)],
    width: 1024,
    height: 1024
  });
  return {
    imageBase64,
    model: INSTAME_PORTRAIT_ENHANCE_MODEL,
    provider: "Together"
  };
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
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must have at least 8 characters" });
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
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body ?? {};
      if (!email?.trim() || !newPassword?.trim()) {
        return res.status(400).json({ error: "Email and new password are required" });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must have at least 8 characters" });
      }
      const normalizedEmail = normalizeEmail(email);
      const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.email, normalizedEmail));
      if (!user) {
        return res.status(404).json({ error: "No account found for this email" });
      }
      if (user.authProvider !== "email" || !user.passwordHash) {
        return res.status(400).json({
          error: "This account uses social sign-in. Use Apple or Google sign-in instead."
        });
      }
      const [updated] = await db.update(users).set({
        passwordHash: hashPassword(newPassword),
        updatedAt: /* @__PURE__ */ new Date()
      }).where((0, import_drizzle_orm3.eq)(users.id, user.id)).returning({ id: users.id });
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      await revokeAllSessions(user.id);
      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: toErrorMessage(error, "Password reset failed") });
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
  app2.get("/api/credits", authMiddleware, async (req, res) => {
    try {
      const [user] = await db.select({ credits: users.credits, subscription: users.subscriptionPlan }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
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
      const [updatedUser] = await db.select({ credits: users.credits, subscription: users.subscriptionPlan }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      res.json({
        success: true,
        credits: updatedUser?.credits || 0,
        subscription: updatedUser?.subscription || null
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
      const expectedCredits = APPLE_IAP_PRODUCT_CREDITS[productId];
      if (!expectedCredits) {
        return res.status(400).json({ success: false, error: "Unknown Apple product ID" });
      }
      const verifyReceipt = async (url) => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "receipt-data": receiptData,
            password: process.env.APPLE_SHARED_SECRET || "",
            "exclude-old-transactions": true
          })
        });
        return response.json();
      };
      let appleResult = await verifyReceipt(
        process.env.NODE_ENV === "production" ? "https://buy.itunes.apple.com/verifyReceipt" : "https://sandbox.itunes.apple.com/verifyReceipt"
      );
      if (appleResult?.status === 21007) {
        appleResult = await verifyReceipt("https://sandbox.itunes.apple.com/verifyReceipt");
      } else if (appleResult?.status === 21008) {
        appleResult = await verifyReceipt("https://buy.itunes.apple.com/verifyReceipt");
      }
      if (appleResult?.status !== 0) {
        return res.status(400).json({ success: false, error: "Apple receipt verification failed" });
      }
      const expectedBundleId = normalizeStringValue(
        process.env.APPLE_BUNDLE_ID || process.env.EXPO_PUBLIC_APPLE_BUNDLE_ID
      );
      const receiptBundleId = normalizeStringValue(appleResult?.receipt?.bundle_id);
      if (expectedBundleId && receiptBundleId !== expectedBundleId) {
        return res.status(400).json({ success: false, error: "Apple receipt bundle ID mismatch" });
      }
      const inAppItems = Array.isArray(appleResult?.latest_receipt_info) ? appleResult.latest_receipt_info : Array.isArray(appleResult?.receipt?.in_app) ? appleResult.receipt.in_app : [];
      const matchingTransactions = inAppItems.filter((item) => item?.product_id === productId).sort((a, b) => {
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
          return res.json({ success: true, credits: grantResult.credits });
        }
        if (grantResult.existingOwnerId && grantResult.existingOwnerId !== userId) {
          return res.status(409).json({ success: false, error: "This Apple purchase was already claimed." });
        }
      }
      const [existingUser] = await db.select({ credits: users.credits }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      return res.json({
        success: true,
        credits: existingUser?.credits ?? 0,
        message: "Apple transaction already processed"
      });
    } catch (error) {
      console.error("Apple verify error:", error);
      return res.status(500).json({ success: false, error: "Failed to verify Apple purchase" });
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
    const absolutePath = getCatalogAssetAbsolutePath(styleId, filename);
    if (!absolutePath) {
      return res.status(404).json({ error: "Style asset not found." });
    }
    return res.sendFile(absolutePath);
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
    const resolvedPresets = (catalogPresets.length > 0 ? catalogPresets : INSTAME_STYLE_PRESETS).map((preset) => ({
      ...preset,
      cover: preset.cover ? toCatalogAssetUrl(req, preset.cover) : preset.cover,
      representativeImage: toCatalogAssetUrl(req, preset.representativeImage),
      examples: preset.examples.map((imagePath) => toCatalogAssetUrl(req, imagePath))
    }));
    return res.json({
      presets: resolvedPresets
    });
  });
  app2.get("/api/instame/pricing", authMiddleware, async (_req, res) => {
    return res.json({
      generationTiers: INSTAME_GENERATION_TIERS,
      editTiers: INSTAME_EDIT_TIERS,
      portraitEnhanceTier: INSTAME_PORTRAIT_ENHANCE_TIER,
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
    const ownStylePayload = normalizeOwnStyleSavePayload(body.image);
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
      const analyzedPrompt = await analyzeOwnStyleReferenceImage(normalizedStyleImages[0]);
      const [user] = await db.select({ instameUploadedImages: users.instameUploadedImages }).from(users).where((0, import_drizzle_orm3.eq)(users.id, req.user.id));
      const existingImages = normalizeStoredInstaMeUploadedImages(user?.instameUploadedImages);
      const saveResult = upsertOwnStyleRecord({
        existingImages,
        savedOwnStyle: buildSavedOwnStyleRecord({
          stylePayload: ownStylePayload,
          analyzedPrompt
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
    const imageKind = requestedKind === "enhanced" ? "enhanced" : requestedKind === "uploaded" ? "uploaded" : "";
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
    const kind = normalizeStringValue(input.kind) === "enhanced" ? "enhanced" : "uploaded";
    const mimeType = typeof input.mimeType === "string" && String(input.mimeType).startsWith("image/") ? String(input.mimeType) : "image/jpeg";
    const base64 = stripDataUriPrefix(normalizeStringValue(input.base64));
    const previewBase64 = stripDataUriPrefix(
      normalizeStringValue(input.previewBase64)
    );
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
    const existingKindCount = existingImages.filter((entry) => (entry.kind || "uploaded") === kind).length;
    const kindLimit = kind === "enhanced" ? MAX_INSTAME_ENHANCED_IMAGES : MAX_INSTAME_UPLOADED_IMAGES;
    if (existingKindCount >= kindLimit) {
      return res.status(409).json({
        error: `You can save up to ${kindLimit} ${kind === "enhanced" ? "enhanced portraits" : "uploaded images"}.`
      });
    }
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
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await db.update(users).set({
      instameUploadedImages: [savedImage, ...existingImages],
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
  app2.post("/api/instame/transform", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const body = req.body || {};
    const customPrompt = normalizeStringValue(body.customPrompt);
    const requestedStylePresetId = normalizeStringValue(body.stylePresetId);
    const requestedSavedOwnStyleId = normalizeStringValue(body.savedOwnStyleId);
    const shouldSaveOwnStyle = body.saveOwnStyle !== false;
    const isOwnStyleRequested = requestedStylePresetId === INSTAME_OWN_STYLE_ID;
    const resolvedStylePreset = isOwnStyleRequested ? null : resolveInstaMeStylePreset(body.stylePresetId);
    const stylePresetId = isOwnStyleRequested ? INSTAME_OWN_STYLE_ID : resolvedStylePreset?.id || "";
    const stylePresetLabel = isOwnStyleRequested ? "Own Style" : resolvedStylePreset?.label || "";
    const stylePresetPromptHint = isOwnStyleRequested ? "" : resolvedStylePreset?.promptHint || "";
    const intensity = normalizeTransformIntensity(body.intensity);
    const preserveBackground = body.preserveBackground !== false;
    const generationTier = resolveGenerationTierById(body.generationTierId);
    const generationMode = resolveGenerationMode(generationTier.id);
    const baseTransformCost = Number.isInteger(generationTier.credits) && generationTier.credits > 0 ? generationTier.credits : Number.isInteger(INSTAME_TRANSFORM_COST) && INSTAME_TRANSFORM_COST > 0 ? INSTAME_TRANSFORM_COST : 5;
    const ownStyleFirstUseSurcharge = isOwnStyleRequested && !requestedSavedOwnStyleId ? INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS : 0;
    const transformCost = baseTransformCost + ownStyleFirstUseSurcharge;
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
    try {
      const [userBeforeTransform] = await db.select({
        instameStyleUsage: users.instameStyleUsage,
        instameUploadedImages: users.instameUploadedImages
      }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      const existingImages = normalizeStoredInstaMeUploadedImages(userBeforeTransform?.instameUploadedImages);
      const savedOwnStyles = existingImages.filter(
        (entry) => entry.kind === "own_style" && Boolean(entry.analyzedPrompt)
      );
      const selectedSavedOwnStyle = requestedSavedOwnStyleId ? savedOwnStyles.find((entry) => entry.id === requestedSavedOwnStyleId) || null : null;
      if (requestedSavedOwnStyleId && !selectedSavedOwnStyle) {
        return res.status(404).json({ error: "Saved own style not found." });
      }
      const styleUsageMap = normalizeUsageMap(userBeforeTransform?.instameStyleUsage);
      const priorStyleUseCount = stylePresetId ? styleUsageMap[stylePresetId] || 0 : 0;
      const promptVariant = isOwnStyleRequested ? null : choosePromptVariant(resolvedStylePreset || void 0, priorStyleUseCount);
      const shouldUseOwnStyle = isOwnStyleRequested && (ownStyleImages.length > 0 || Boolean(selectedSavedOwnStyle));
      const shouldUsePromptOnly = !shouldUseOwnStyle && Boolean(stylePresetId) && (resolvedStylePreset?.promptVariants?.length || 0) > 0 && Boolean(promptVariant);
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
      let savedOwnStyleSummary = selectedSavedOwnStyle ? toInstaMeOwnStyleSummary(selectedSavedOwnStyle) : null;
      let analyzedOwnStylePrompt = selectedSavedOwnStyle?.analyzedPrompt || "";
      if (shouldUseOwnStyle && !analyzedOwnStylePrompt) {
        analyzedOwnStylePrompt = await analyzeOwnStyleReferenceImage(ownStyleImages[0]);
      }
      const generationResult = shouldUseOwnStyle ? await generateOwnStyleImage({
        uploadedImages,
        analyzedStylePrompt: analyzedOwnStylePrompt,
        customPrompt,
        preserveBackground
      }) : shouldUsePromptOnly && promptVariant ? await generatePromptOnlyPresetImage({
        req,
        uploadedImages,
        preset: resolvedStylePreset,
        variant: promptVariant,
        styleUsageCount: priorStyleUseCount,
        generationMode,
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
        stylePresetPromptHint
      }) : await generateReferenceGuidedPreviewImage({
        uploadedImages,
        selectedStyleReferences,
        intensity,
        customPrompt,
        preserveBackground,
        stylePresetLabel,
        stylePresetPromptHint
      });
      let nextUsageMap = styleUsageMap;
      let nextStoredImages = existingImages;
      if (shouldUseOwnStyle && !selectedSavedOwnStyle && shouldSaveOwnStyle) {
        const ownStyleSavePayload = normalizeOwnStyleSavePayload(body.stylePhoto);
        if (ownStyleSavePayload && ownStyleSavePayload.previewBase64.length <= MAX_INSTAME_LIBRARY_PREVIEW_BASE64_LENGTH) {
          const savedOwnStyleRecord = buildSavedOwnStyleRecord({
            stylePayload: ownStyleSavePayload,
            analyzedPrompt: analyzedOwnStylePrompt
          });
          const saveResult = upsertOwnStyleRecord({
            existingImages,
            savedOwnStyle: savedOwnStyleRecord
          });
          nextStoredImages = saveResult.nextImages;
          savedOwnStyleSummary = toInstaMeOwnStyleSummary(saveResult.savedOwnStyle);
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
        model: generationResult.model,
        provider: generationResult.provider,
        styleReferenceIds: selectedStyleReferences.map((reference) => reference.id),
        stylePresetId: stylePresetId || null,
        promptOnlyMode: shouldUsePromptOnly || shouldUseOwnStyle,
        generationTierId: generationTier.id,
        savedOwnStyle: savedOwnStyleSummary
      });
    } catch (error) {
      console.error("InstaMe transform error:", error);
      if (creditsConsumed) {
        await refundCredits(userId, transformCost, "instame_old_money_transform_failed");
      }
      const errorMessage = toErrorMessage(error, "Failed to transform image");
      if (errorMessage.startsWith("AI_NOT_CONFIGURED:")) {
        return res.status(503).json({ error: errorMessage.replace("AI_NOT_CONFIGURED: ", "") });
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
        model: enhanceResult.model,
        provider: enhanceResult.provider,
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
      if (errorMessage.startsWith("AI_NOT_CONFIGURED:")) {
        return res.status(503).json({ error: errorMessage.replace("AI_NOT_CONFIGURED: ", "") });
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
        model: editResult.model,
        provider: editResult.provider,
        editTierId: editTier.id
      });
    } catch (error) {
      console.error("InstaMe edit error:", error);
      if (creditsConsumed) {
        await refundCredits(userId, editTier.credits, `instame_edit_${editTier.id}_failed`);
      }
      const errorMessage = toErrorMessage(error, "Failed to edit image");
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
      if (errorMessage.startsWith("AI_NOT_CONFIGURED:")) {
        return res.status(503).json({ error: errorMessage.replace("AI_NOT_CONFIGURED: ", "") });
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
      if (errorMessage.startsWith("AI_NOT_CONFIGURED:")) {
        return res.status(503).json({ error: errorMessage.replace("AI_NOT_CONFIGURED: ", "") });
      }
      res.status(500).json({ error: errorMessage });
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
