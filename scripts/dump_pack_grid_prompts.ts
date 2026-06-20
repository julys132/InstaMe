/**
 * One-off helper: prints the GENERIC master-grid system prompt that is sent to
 * Gemini Flash to plan the preview grid for every Insta pack.
 *
 * Run: npx tsx scripts/dump_pack_grid_prompts.ts
 *
 * The frontend sends, per pack:
 *   aesthetic = pack.id
 *   palette   = matching GRID_PIPELINE_AESTHETICS.defaultPalette (or "" if no match)
 *   lightType = matching GRID_PIPELINE_AESTHETICS.defaultLightType (or "" if no match)
 *   extraNotes = "" (unless the user typed something)
 *   hasPortraitReference = true when a portrait is uploaded
 */

import {
  buildMasterGridSystemPrompt,
  type GridPipelineImageCount,
} from "../server/lib/instame-grid-pipeline";
import { GRID_PIPELINE_AESTHETICS } from "../constants/gridPipelineAesthetics";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Pack id + image count, mirrored from constants/instameStyleTaxonomy.ts (PHOTO_PACK_PRESETS).
// Hardcoded here so we don't import the asset-require()'d preset file in node.
const PACKS: Array<{ id: string; count: GridPipelineImageCount }> = [
  { id: "Dark Academia", count: 6 },
  { id: "Desert Oasis Luxury", count: 6 },
  { id: "Luxury European Lifestyle", count: 6 },
  { id: "Minimalist Scandinavian Wellness", count: 6 },
  { id: "Old Money Luxury", count: 9 },
  { id: "Amalfi Coast Vibe", count: 6 },
  { id: "French Riviera Vintage Summer", count: 6 },
  { id: "Private Jet & Executive", count: 6 },
  { id: "couple_drop_four", count: 4 },
  { id: "luxe_grid_nine", count: 9 },
];

const sections: string[] = [];
// Each real request uses a fresh random seed; we use one fixed sample seed here
// so the dump is reproducible and shows the PER-POSITION ASSIGNMENTS section that
// Gemini actually receives. The assigned hairstyles/angles/scene-anchors/object
// categories (and which model cells are MEDIUM vs COMPLEX) change with the seed.
const SAMPLE_SEED = 123456;

sections.push(
  [
    "################################################################",
    "# NOTE",
    "################################################################",
    "These are the system prompts sent to Gemini Flash, one per pack.",
    `Generated with a fixed sample variation seed (${SAMPLE_SEED}).`,
    "In production each request gets a fresh random seed, so the",
    "'PER-POSITION ASSIGNMENTS' and the COMPLEX/MEDIUM layout differ every time.",
  ].join("\n"),
);

for (const pack of PACKS) {
  const aesthetic = GRID_PIPELINE_AESTHETICS.find((a) => a.id === pack.id);
  const prompt = buildMasterGridSystemPrompt({
    imageCount: pack.count,
    aesthetic: pack.id,
    palette: aesthetic?.defaultPalette || "",
    lightType: aesthetic?.defaultLightType || "",
    extraNotes: "",
    hasPortraitReference: true,
    seed: SAMPLE_SEED,
  });

  sections.push(
    [
      "################################################################",
      `# PACK: ${pack.id}  (${pack.count} images)`,
      "################################################################",
      prompt,
    ].join("\n"),
  );
}

const out = sections.join("\n\n\n\n");
const outPath = resolve(__dirname, "../docs/pack-grid-prompts.txt");
writeFileSync(outPath, out, { encoding: "utf8" });
console.log(`Wrote ${PACKS.length} pack prompts to ${outPath}`);
