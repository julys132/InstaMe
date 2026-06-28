import type { InstaMeStyleCategory, InstaMeStylePreset } from "@shared/instame-style-presets";

type StyleAudience = InstaMeStyleCategory | "any";

export type StyleVibeCategory = {
  id: string;
  label: string;
  shortLabel: string;
  tagline: string;
  icon: string;
  accent: string;
  gradient: [string, string, string];
  audience?: StyleAudience;
  keywords: string[];
};

export type PhotoPackPreset = {
  id: string;
  label: string;
  count: 4 | 6 | 9;
  vibeId: string;
  icon: string;
  accent: string;
  gradient: [string, string, string];
  subtitle: string;
  example: string;
  /** Short label for each image in the pack, in order (e.g. "Closeup portrait") */
  shots: string[];
  /** What users concretely receive — shown in the planner as a summary line */
  deliverable: string;
  /** Local reference images shown on the card (static require) */
  previewImages?: ReturnType<typeof require>[];
};

export const CUSTOM_PHOTO_PACK_ID = "custom_pack";

export const STYLE_VIBE_CATEGORIES: StyleVibeCategory[] = [
  {
    id: "all",
    label: "All Looks",
    shortLabel: "All",
    tagline: "The full Chicoo wall, from clean selfies to cinematic editorials.",
    icon: "apps-outline",
    accent: "#FFFFFF",
    gradient: ["rgba(255,255,255,0.14)", "rgba(255,79,125,0.10)", "rgba(0,229,204,0.10)"],
    audience: "any",
    keywords: [],
  },
  {
    id: "signature_editorial",
    label: "Signature Muse",
    shortLabel: "Muse",
    tagline: "Polished closeups, studio light, magazine-style energy.",
    icon: "aperture-outline",
    accent: "#FFD6EA",
    gradient: ["rgba(255,214,234,0.24)", "rgba(96,45,76,0.16)", "rgba(0,0,0,0.84)"],
    keywords: ["editorial", "studio", "portrait", "closeup", "close up", "cinematic", "fashion", "lacquer", "collage", "minimalist"],
  },
  {
    id: "flash_night",
    label: "Flash Night",
    shortLabel: "Flash",
    tagline: "After-dark flash, Y2K grain, paparazzi glow.",
    icon: "flash-outline",
    accent: "#7EF3FF",
    gradient: ["rgba(126,243,255,0.22)", "rgba(46,76,88,0.18)", "rgba(0,0,0,0.86)"],
    keywords: ["flash", "night", "corridor", "noir", "dark", "analog", "bmw", "fur", "glove", "black outfit", "embankment", "bridge"],
  },
  {
    id: "old_money_luxe",
    label: "Old Money Luxe",
    shortLabel: "Luxe",
    tagline: "Quiet luxury, polished neutrals, hotel and city elegance.",
    icon: "diamond-outline",
    accent: "#F4D7A1",
    gradient: ["rgba(244,215,161,0.24)", "rgba(72,58,34,0.18)", "rgba(0,0,0,0.86)"],
    keywords: ["luxury", "hotel", "mercedes", "jewelry", "suit", "blazer", "wine", "roof", "elegant", "mediterranean", "polished", "chic", "balcony", "convertible", "escalator", "mall"],
  },
  {
    id: "clean_glow",
    label: "Clean Glow",
    shortLabel: "Glow",
    tagline: "Bright skin, soft light, polished everyday beauty.",
    icon: "sunny-outline",
    accent: "#F8FFB8",
    gradient: ["rgba(248,255,184,0.22)", "rgba(118,145,107,0.14)", "rgba(0,0,0,0.86)"],
    keywords: ["soft", "dreamy", "natural", "bright", "white", "pastel", "clean", "smiling", "sunglasses", "long hair closeup", "natural glam"],
  },
  {
    id: "cafe_lifestyle",
    label: "Cafe Lifestyle",
    shortLabel: "Cafe",
    tagline: "Coffee, breakfast, terrace light, effortless social posts.",
    icon: "cafe-outline",
    accent: "#FFC6A7",
    gradient: ["rgba(255,198,167,0.22)", "rgba(104,59,40,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["coffee", "cafe", "breakfast", "table", "terrace", "stone ledge", "popcorn", "cinema", "outdoor cafe"],
  },
  {
    id: "street_luxe",
    label: "Street Luxe",
    shortLabel: "Street",
    tagline: "Urban movement, denim, leather, confident sidewalk frames.",
    icon: "walk-outline",
    accent: "#B4C7FF",
    gradient: ["rgba(180,199,255,0.22)", "rgba(46,54,93,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["street", "crosswalk", "sidewalk", "denim", "leather", "urban", "steps", "bench", "walk", "wide pants", "architecture", "wall", "crouching", "monochromatic"],
  },
  {
    id: "mirror_selfies",
    label: "Mirror Selfies",
    shortLabel: "Mirror",
    tagline: "Creator-style mirror frames, store fitting rooms, quick outfit energy.",
    icon: "scan-outline",
    accent: "#C9B8FF",
    gradient: ["rgba(201,184,255,0.22)", "rgba(68,48,108,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["mirror", "selfie", "bathroom", "overhead", "taking selfie", "room mirror", "store"],
  },
  {
    id: "travel_escape",
    label: "Travel Escape",
    shortLabel: "Travel",
    tagline: "Airport, cliffs, balconies, scooters and city-break frames.",
    icon: "airplane-outline",
    accent: "#AEEAD6",
    gradient: ["rgba(174,234,214,0.22)", "rgba(36,86,72,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["airport", "mountain", "cliff", "rocks", "scooter", "balcony", "mediterranean", "convertible", "outdoor", "park", "sky", "magnolia", "sakura", "terrace", "doorway"],
  },
  {
    id: "car_luxe",
    label: "Car Luxe",
    shortLabel: "Car",
    tagline: "Dashboard glow, luxury rides, night-drive portraits.",
    icon: "car-sport-outline",
    accent: "#9DE8FF",
    gradient: ["rgba(157,232,255,0.22)", "rgba(28,66,81,0.18)", "rgba(0,0,0,0.86)"],
    keywords: ["car", "bmw", "mercedes", "convertible", "drive", "ride"],
  },
  {
    id: "soft_romantic",
    label: "Soft Romantic",
    shortLabel: "Romance",
    tagline: "Flowers, blush tones, soft gestures and romantic closeups.",
    icon: "flower-outline",
    accent: "#FFC1D7",
    gradient: ["rgba(255,193,215,0.24)", "rgba(108,46,66,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["rose", "roses", "tulip", "tulips", "flower", "ranunculus", "lavender", "lilac", "hibiscus", "sakura", "magnolia", "kiss", "pink", "milk bath", "foam bath"],
  },
  {
    id: "cozy_home",
    label: "Cozy Home",
    shortLabel: "Cozy",
    tagline: "Bedroom, sofa, soft indoor frames, intimate but polished.",
    icon: "bed-outline",
    accent: "#FFE0B8",
    gradient: ["rgba(255,224,184,0.22)", "rgba(86,59,41,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["bed", "sofa", "room", "floor", "chair", "curlers", "lying", "cozy", "bathroom", "bath"],
  },
  {
    id: "event_glam",
    label: "Event Glam",
    shortLabel: "Glam",
    tagline: "Party shine, red dresses, jewelry, makeup and evening polish.",
    icon: "sparkles-outline",
    accent: "#FF9BC5",
    gradient: ["rgba(255,155,197,0.24)", "rgba(116,38,78,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["glam", "red dress", "cinema", "popcorn", "wine", "black elegant", "jewelry", "makeup", "dress", "luxurious"],
  },
  {
    id: "life_moments",
    label: "Life Moments",
    shortLabel: "Moments",
    tagline: "Warm personal frames for family, flowers and memory-like posts.",
    icon: "heart-outline",
    accent: "#FFD1A6",
    gradient: ["rgba(255,209,166,0.22)", "rgba(114,69,37,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["mom", "kids", "son", "dog", "horse", "flower", "lilacs", "hibiscus"],
  },
  {
    id: "couple_shoots",
    label: "Couple Shoots",
    shortLabel: "Couples",
    tagline: "Two-person frames built for matching drops and shared posts.",
    icon: "people-outline",
    accent: "#FFB3E6",
    gradient: ["rgba(255,179,230,0.22)", "rgba(86,42,94,0.16)", "rgba(0,0,0,0.86)"],
    audience: "couple",
    keywords: ["couple", "fitting room", "mixed style"],
  },
  {
    id: "men_editorial",
    label: "Men Editorial",
    shortLabel: "Men",
    tagline: "Moody street, clean portraits and confident masculine frames.",
    icon: "man-outline",
    accent: "#D7F3FF",
    gradient: ["rgba(215,243,255,0.22)", "rgba(48,74,88,0.16)", "rgba(0,0,0,0.86)"],
    audience: "men",
    keywords: ["men", "hoodie", "tee", "overcoat", "turtleneck", "buzz", "urban", "street", "architecture", "newspaper"],
  },
];

export const PHOTO_PACK_PRESETS: PhotoPackPreset[] = [
  {
    id: CUSTOM_PHOTO_PACK_ID,
    label: "Custom Pack",
    count: 6,
    vibeId: "all",
    icon: "create-outline",
    accent: "#86F4FF",
    gradient: ["rgba(134,244,255,0.24)", "rgba(255,79,125,0.14)", "rgba(0,0,0,0.88)"],
    subtitle: "Build a pack from your own style words.",
    example: "",
    shots: [
      "Custom hero portrait",
      "Signature detail",
      "Mood portrait",
      "Texture still-life",
      "Style moment",
      "Custom grid hero",
    ],
    deliverable: "6 vertical AI photos - your custom aesthetic - same preview and extraction flow",
  },
  {
    id: "Dark Academia",
    label: "Dark Academia",
    count: 6,
    vibeId: "signature_editorial",
    icon: "book-outline",
    accent: "#C2A46E",
    gradient: ["rgba(80,55,30,0.82)", "rgba(50,30,18,0.90)", "rgba(10,8,5,0.97)"],
    subtitle: "Moody libraries, candlelight, scholarly vintage energy.",
    example: "",
    shots: [
      "Moody library portrait",
      "Candlelit editorial",
      "Vintage study closeup",
      "Dark corridor frame",
      "Book prop composition",
      "Hero dramatic portrait",
    ],
    deliverable: "6 vertical AI photos • deep brown & burgundy palette • one cohesive dark academia story",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/dark-academia-1.png"),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/dark-academia-2.png"),
    ],
  },
  {
    id: "Desert Oasis Luxury",
    label: "Desert Oasis Luxury",
    count: 6,
    vibeId: "travel_escape",
    icon: "sunny-outline",
    accent: "#E2A96B",
    gradient: ["rgba(180,110,55,0.72)", "rgba(130,75,30,0.88)", "rgba(20,12,6,0.96)"],
    subtitle: "Terracotta, sunlit pools, warm arid luxury.",
    example: "",
    shots: [
      "Desert resort wide shot",
      "Poolside editorial",
      "Clay wall portrait",
      "Sunset silhouette",
      "Rattan & linen detail",
      "Golden hour hero",
    ],
    deliverable: "6 vertical AI photos • terracotta & sandy gold palette • warm desert luxury carousel",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/desert-oasis-1.png"),
    ],
  },
  {
    id: "Luxury European Lifestyle",
    label: "Luxury European Lifestyle",
    count: 6,
    vibeId: "old_money_luxe",
    icon: "wine-outline",
    accent: "#D4B896",
    gradient: ["rgba(160,130,90,0.62)", "rgba(90,70,45,0.86)", "rgba(8,7,5,0.96)"],
    subtitle: "Parisian streets, Italian piazzas, champagne lifestyle.",
    example: "",
    shots: [
      "Parisian boulevard",
      "Café terrasse moment",
      "Boutique entrance frame",
      "Cobblestone portrait",
      "Ornate balcony scene",
      "Fashion week hero",
    ],
    deliverable: "6 vertical AI photos • champagne & cobblestone tones • European lifestyle carousel",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/luxury-european-1.png"),
    ],
  },
  {
    id: "Minimalist Scandinavian Wellness",
    label: "Minimalist Scandinavian Wellness",
    count: 6,
    vibeId: "clean_glow",
    icon: "leaf-outline",
    accent: "#A8BBA8",
    gradient: ["rgba(140,160,140,0.44)", "rgba(80,100,80,0.72)", "rgba(10,14,10,0.96)"],
    subtitle: "Clean whites, birch wood, hygge and Nordic calm.",
    example: "",
    shots: [
      "White interior portrait",
      "Birch wood moment",
      "Window light closeup",
      "Clean outfit editorial",
      "Indoor plant detail",
      "Nordic calm hero",
    ],
    deliverable: "6 vertical AI photos • crisp white & sage palette • minimalist wellness grid",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/scandi-wellness-1.png"),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/scandi-wellness-2.png"),
    ],
  },
  {
    id: "Old Money Luxury",
    label: "Old Money Luxury",
    count: 9,
    vibeId: "old_money_luxe",
    icon: "diamond-outline",
    accent: "#C8B89A",
    gradient: ["rgba(150,130,100,0.58)", "rgba(80,65,40,0.86)", "rgba(8,7,5,0.96)"],
    subtitle: "Quiet luxury, tailored elegance, understated wealth.",
    example: "",
    shots: [
      "Heritage manor portrait",
      "Equestrian reference",
      "Tailored silhouette",
      "Private club interior",
      "Cashmere detail closeup",
      "Grand entrance frame",
      "Monogram accessory",
      "Classic European street",
      "Quiet luxury hero",
    ],
    deliverable: "9 vertical AI photos • muted beige & ivory palette • complete old money 3×3 grid reset",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/old-money-1.png"),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/old-money-2.png"),
    ],
  },
  {
    id: "Amalfi Coast Vibe",
    label: "Amalfi Coast Vibe",
    count: 6,
    vibeId: "travel_escape",
    icon: "boat-outline",
    accent: "#6BBDE2",
    gradient: ["rgba(60,130,180,0.62)", "rgba(30,80,120,0.86)", "rgba(5,10,18,0.97)"],
    subtitle: "Clifftops, lemon groves, azure water and Italian summer light.",
    example: "",
    shots: [
      "Cliffside terrace portrait",
      "Lemon grove detail",
      "Coastal village alley",
      "Boat deck on turquoise bay",
      "Whitewash wall with bougainvillea",
      "Golden hour seaside hero",
    ],
    deliverable: "6 vertical AI photos • azure & terracotta palette • one cohesive Amalfi summer story",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/amalfi-1.png"),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/amalfi-2.png"),
    ],
  },
  {
    id: "French Riviera Vintage Summer",
    label: "French Riviera Vintage Summer",
    count: 6,
    vibeId: "travel_escape",
    icon: "umbrella-outline",
    accent: "#F5C97A",
    gradient: ["rgba(190,155,80,0.60)", "rgba(100,80,30,0.86)", "rgba(8,7,4,0.97)"],
    subtitle: "Saint-Tropez harbor, vintage yachts and 60s Riviera glamour.",
    example: "",
    shots: [
      "Saint-Tropez harbor stroll",
      "Vintage yacht deck moment",
      "Retro straw hat & sunglasses",
      "Marinière stripe editorial",
      "Pastel parasol beach scene",
      "Riviera promenade hero",
    ],
    deliverable: "6 vertical AI photos • sandy gold & navy palette • vintage French Riviera carousel",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/french-riviera-1.png"),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/french-riviera-2.png"),
    ],
  },
  {
    id: "Private Jet & Executive",
    label: "Private Jet & Executive",
    count: 6,
    vibeId: "car_luxe",
    icon: "airplane-outline",
    accent: "#D4C9A8",
    gradient: ["rgba(70,65,55,0.72)", "rgba(35,32,24,0.90)", "rgba(5,5,3,0.97)"],
    subtitle: "Jet interiors, runways, executive power dressing at altitude.",
    example: "",
    shots: [
      "Jet interior leather seat",
      "Aircraft window golden hour",
      "Runway tarmac boarding",
      "Executive tailored portrait",
      "Aviation lounge moment",
      "City skyline from altitude",
    ],
    deliverable: "6 vertical AI photos • charcoal & champagne palette • executive aviation editorial",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/private-jet-1.png"),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/private-jet-2.png"),
    ],
  },
  {
    id: "Monaco Night Drive",
    label: "Monaco Night Drive",
    count: 6,
    vibeId: "car_luxe",
    icon: "car-sport-outline",
    accent: "#8FE6FF",
    gradient: ["rgba(36,54,82,0.70)", "rgba(8,12,22,0.92)", "rgba(0,0,0,0.98)"],
    subtitle: "Marina lights, luxury cars, evening flash energy.",
    example: "",
    shots: [
      "Marina car arrival",
      "Chrome detail closeup",
      "Casino entrance portrait",
      "Leather interior detail",
      "Harbor night walk",
      "Flash evening hero",
    ],
    deliverable: "6 vertical AI photos - black, navy & champagne palette - Monaco night-drive editorial",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/monaco-night-drive-1.png"),
    ],
  },
  {
    id: "Paris Hotel Morning",
    label: "Paris Hotel Morning",
    count: 6,
    vibeId: "old_money_luxe",
    icon: "business-outline",
    accent: "#E7D6BE",
    gradient: ["rgba(222,204,176,0.58)", "rgba(120,100,78,0.78)", "rgba(16,12,9,0.96)"],
    subtitle: "Balcony coffee, tailored lounge styling, soft hotel daylight.",
    example: "",
    shots: [
      "Paris balcony coffee",
      "Room service still-life",
      "Window light portrait",
      "Marble vanity detail",
      "Hotel corridor look",
      "Morning city hero",
    ],
    deliverable: "6 vertical AI photos - ivory, beige & muted gold palette - Paris hotel morning story",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/paris-hotel-morning-1.png"),
    ],
  },
  {
    id: "Milan Street Editorial",
    label: "Milan Street Editorial",
    count: 6,
    vibeId: "street_luxe",
    icon: "walk-outline",
    accent: "#C9D3E8",
    gradient: ["rgba(80,86,98,0.66)", "rgba(38,39,45,0.90)", "rgba(5,5,8,0.98)"],
    subtitle: "Tailored city movement, boutique facades, fashion-week polish.",
    example: "",
    shots: [
      "Tailored crosswalk frame",
      "Leather handbag detail",
      "Boutique facade portrait",
      "Stone street texture",
      "Cafe corner look",
      "Fashion week hero",
    ],
    deliverable: "6 vertical AI photos - charcoal, cream & espresso palette - Milan street editorial carousel",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/milan-street-editorial-1.png"),
    ],
  },
  {
    id: "Ski Chalet Luxe",
    label: "Ski Chalet Luxe",
    count: 6,
    vibeId: "cozy_home",
    icon: "snow-outline",
    accent: "#F1D8B8",
    gradient: ["rgba(112,86,62,0.64)", "rgba(40,30,24,0.90)", "rgba(7,6,5,0.98)"],
    subtitle: "Alpine warmth, cashmere textures, fireplace apres-ski mood.",
    example: "",
    shots: [
      "Alpine window portrait",
      "Cashmere knit detail",
      "Fireplace lounge frame",
      "Snow view still-life",
      "Apres-ski outfit",
      "Chalet evening hero",
    ],
    deliverable: "6 vertical AI photos - cream, pine & chocolate palette - ski chalet luxury story",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/ski-chalet-luxe-1.png"),
    ],
  },
  {
    id: "Gallery Date Muse",
    label: "Gallery Date Muse",
    count: 6,
    vibeId: "signature_editorial",
    icon: "color-palette-outline",
    accent: "#DAD7CE",
    gradient: ["rgba(150,148,140,0.50)", "rgba(62,62,60,0.82)", "rgba(7,7,7,0.98)"],
    subtitle: "Modern museum light, sculptural poses, cultured minimalist style.",
    example: "",
    shots: [
      "Gallery entrance portrait",
      "Sculpture detail",
      "Marble floor frame",
      "Framed artwork still-life",
      "Minimal dress portrait",
      "Museum date hero",
    ],
    deliverable: "6 vertical AI photos - white, stone & black palette - gallery date editorial",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/gallery-date-muse-1.png"),
    ],
  },
  {
    id: "Champagne Brunch Club",
    label: "Champagne Brunch Club",
    count: 6,
    vibeId: "cafe_lifestyle",
    icon: "restaurant-outline",
    accent: "#FFD2BA",
    gradient: ["rgba(255,198,170,0.52)", "rgba(130,78,58,0.78)", "rgba(17,10,8,0.96)"],
    subtitle: "Terrace brunch, glassware, flowers, polished daytime glow.",
    example: "",
    shots: [
      "Terrace brunch portrait",
      "Champagne glass detail",
      "Flower table still-life",
      "Linen outfit moment",
      "Pastry plate closeup",
      "Sunlit social hero",
    ],
    deliverable: "6 vertical AI photos - blush, champagne & ivory palette - polished brunch carousel",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/champagne-brunch-club-1.png"),
    ],
  },
  {
    id: "Balletcore Soft Glam",
    label: "Balletcore Soft Glam",
    count: 6,
    vibeId: "soft_romantic",
    icon: "sparkles-outline",
    accent: "#F2C9D8",
    gradient: ["rgba(230,175,196,0.54)", "rgba(116,74,90,0.78)", "rgba(18,9,14,0.96)"],
    subtitle: "Satin ribbons, pearl details, soft studio femininity.",
    example: "",
    shots: [
      "Soft studio portrait",
      "Satin ribbon detail",
      "Pearl accessory closeup",
      "Wrap cardigan look",
      "Ballet flat still-life",
      "Delicate glam hero",
    ],
    deliverable: "6 vertical AI photos - dusty rose, pearl & champagne palette - balletcore soft glam story",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/balletcore-soft-glam-1.png"),
    ],
  },
  {
    id: "Rooftop Golden Hour",
    label: "Rooftop Golden Hour",
    count: 6,
    vibeId: "event_glam",
    icon: "sunny-outline",
    accent: "#FFC46F",
    gradient: ["rgba(230,152,74,0.58)", "rgba(106,60,35,0.82)", "rgba(12,7,5,0.96)"],
    subtitle: "Skyline light, sunset polish, elevated evening energy.",
    example: "",
    shots: [
      "Rooftop skyline portrait",
      "Cocktail glass detail",
      "Sunset dress movement",
      "City railing texture",
      "Wind-swept closeup",
      "Golden hour hero",
    ],
    deliverable: "6 vertical AI photos - amber, cream & black palette - rooftop golden-hour editorial",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/rooftop-golden-hour-1.png"),
    ],
  },
  {
    id: "Bridal Weekend Glow",
    label: "Bridal Weekend Glow",
    count: 6,
    vibeId: "event_glam",
    icon: "heart-outline",
    accent: "#F7DDE8",
    gradient: ["rgba(245,222,232,0.54)", "rgba(140,98,114,0.78)", "rgba(18,9,13,0.96)"],
    subtitle: "Pearls, white tailoring, champagne prep, celebration details.",
    example: "",
    shots: [
      "White tailored portrait",
      "Pearl earring detail",
      "Champagne toast still-life",
      "Bouquet closeup",
      "Hotel mirror moment",
      "Celebration weekend hero",
    ],
    deliverable: "6 vertical AI photos - white, pearl & blush palette - bridal weekend glow carousel",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/bridal-weekend-glow-1.png"),
    ],
  },
  {
    id: "CEO Airport Uniform",
    label: "CEO Airport Uniform",
    count: 6,
    vibeId: "car_luxe",
    icon: "airplane-outline",
    accent: "#D7CAB9",
    gradient: ["rgba(108,96,82,0.64)", "rgba(40,36,34,0.90)", "rgba(5,5,5,0.98)"],
    subtitle: "Airport lounge tailoring, carry-on details, executive travel calm.",
    example: "",
    shots: [
      "Airport lounge portrait",
      "Carry-on detail",
      "Structured blazer look",
      "Espresso cup still-life",
      "Boarding gate walk",
      "Executive travel hero",
    ],
    deliverable: "6 vertical AI photos - black, camel & brushed steel palette - CEO airport uniform story",
    previewImages: [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../assets/images/aesthetics/ceo-airport-uniform-1.png"),
    ],
  },
  {
    id: "couple_drop_four",
    label: "Couple Drop 4",
    count: 4,
    vibeId: "couple_shoots",
    icon: "people-outline",
    accent: "#FFB3E6",
    gradient: ["rgba(255,179,230,0.24)", "rgba(126,243,255,0.10)", "rgba(0,0,0,0.86)"],
    subtitle: "Four matching frames for a shared post or carousel.",
    example: "Close pose, walking frame, candid laugh, cinematic final.",
    shots: [
      "Close romantic pose",
      "Walking together frame",
      "Candid laugh moment",
      "Cinematic wide final",
    ],
    deliverable: "4 vertical AI photos • couple aesthetic • 4 matching frames to post together or separately",
  },
  {
    id: "luxe_grid_nine",
    label: "Luxe Grid 9",
    count: 9,
    vibeId: "old_money_luxe",
    icon: "grid-outline",
    accent: "#F4D7A1",
    gradient: ["rgba(244,215,161,0.26)", "rgba(72,58,34,0.18)", "rgba(0,0,0,0.86)"],
    subtitle: "Nine-image grid reset — one cohesive luxury aesthetic.",
    example: "Editorial portrait, mirror selfie, café, jewelry, street, hotel, over-shoulder, flash, hero wide.",
    shots: [
      "Editorial hero portrait",
      "Mirror selfie",
      "Café or lounge scene",
      "Jewelry macro",
      "Street outfit shot",
      "Hotel / resort frame",
      "Over-shoulder walk",
      "Flash night closeup",
      "Wide cinematic final",
    ],
    deliverable: "9 vertical AI photos • luxury palette • complete 3×3 grid reset in one drop",
  },
];

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ");
}

function getPresetSearchText(preset: InstaMeStylePreset): string {
  return normalizeSearchText(
    [
      preset.id,
      preset.label,
      preset.subtitle,
      preset.promptHint,
      preset.cover,
      preset.representativeImage,
      ...(preset.examples || []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getPresetAudience(preset: InstaMeStylePreset): InstaMeStyleCategory {
  const text = getPresetSearchText(preset);

  if ((preset.category || "").toLowerCase() === "men" || preset.id.startsWith("men_")) {
    return "men";
  }

  if ((preset.category || "").toLowerCase() === "couple" || preset.id.startsWith("couple") || text.includes("couple ")) {
    return "couple";
  }

  return "women";
}

function audienceMatches(preset: InstaMeStylePreset, audience: StyleAudience | undefined): boolean {
  if (!audience || audience === "any") {
    return true;
  }

  return getPresetAudience(preset) === audience;
}

export function matchStyleVibe(preset: InstaMeStylePreset, vibeId: string): boolean {
  const vibe = STYLE_VIBE_CATEGORIES.find((item) => item.id === vibeId) || STYLE_VIBE_CATEGORIES[0];

  if (vibe.id === "all") {
    return true;
  }

  // Catalog presets carry an explicit, curated category. Prefer it over the
  // legacy keyword matching so every style lives in exactly one clear vibe.
  if (preset.vibeId) {
    return preset.vibeId === vibe.id;
  }

  const audience = vibe.audience || "women";
  if (!audienceMatches(preset, audience)) {
    return false;
  }

  const text = getPresetSearchText(preset);
  return vibe.keywords.some((keyword) => text.includes(normalizeSearchText(keyword)));
}

export function getStyleVibeById(vibeId: string | null | undefined): StyleVibeCategory {
  return STYLE_VIBE_CATEGORIES.find((vibe) => vibe.id === vibeId) || STYLE_VIBE_CATEGORIES[0];
}

export function getPrimaryStyleVibeId(preset: InstaMeStylePreset): string {
  if (preset.vibeId && STYLE_VIBE_CATEGORIES.some((vibe) => vibe.id === preset.vibeId)) {
    return preset.vibeId;
  }

  const match = STYLE_VIBE_CATEGORIES.find((vibe) => vibe.id !== "all" && matchStyleVibe(preset, vibe.id));
  return match?.id || "all";
}

export function matchStylePresetSearch(preset: InstaMeStylePreset, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) {
    return true;
  }

  const text = getPresetSearchText(preset);
  return normalizedQuery
    .split(/\s+/)
    .every((token) => text.includes(token));
}

export function getStylePresetPreviewImages(preset: InstaMeStylePreset | null | undefined): string[] {
  if (!preset) {
    return [];
  }

  const seen = new Set<string>();
  return [preset.cover, preset.representativeImage, ...(preset.examples || [])]
    .flatMap((value) => (typeof value === "string" ? [value.trim()] : []))
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
}

export function getPhotoPackPreviewImages(
  pack: PhotoPackPreset,
  presets: InstaMeStylePreset[],
  limit = 4,
): string[] {
  const seen = new Set<string>();
  const images: string[] = [];

  for (const preset of presets) {
    if (!matchStyleVibe(preset, pack.vibeId)) {
      continue;
    }

    for (const image of getStylePresetPreviewImages(preset)) {
      if (!seen.has(image)) {
        seen.add(image);
        images.push(image);
      }

      if (images.length >= limit) {
        return images;
      }
    }
  }

  return images;
}
