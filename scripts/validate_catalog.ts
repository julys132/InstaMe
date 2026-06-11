import * as fs from "fs";

const cat = JSON.parse(fs.readFileSync("assets/instame-style-presets/catalog.json", "utf8"));
let bad = 0;
const issues: string[] = [];
for (const p of cat.presets) {
  if (!Array.isArray(p.examples) || p.examples.length === 0) { issues.push(`${p.id}: examples not array/empty`); bad++; }
  if (!p.vibeId) { issues.push(`${p.id}: missing vibeId`); bad++; }
  if (!p.coverThumb) { issues.push(`${p.id}: missing coverThumb`); bad++; }
  for (const e of p.examples || []) if (!fs.existsSync(e)) { issues.push(`${p.id}: missing file ${e}`); bad++; }
  for (const t of p.examplesThumbs || []) if (!fs.existsSync(t)) { issues.push(`${p.id}: missing thumb ${t}`); bad++; }
  if (p.sourcePortrait && !fs.existsSync(p.sourcePortrait)) { issues.push(`${p.id}: missing portrait`); bad++; }
  const prompt = p.promptVariants?.[0]?.prompt || "";
  if (/\uFFFD|\?{3,}/.test(prompt)) { issues.push(`${p.id}: mojibake prompt`); bad++; }
  if (!prompt && !p.promptFile) { issues.push(`${p.id}: no prompt at all`); bad++; }
}
console.log("Presets:", cat.presets.length, "| Issues:", bad);
issues.slice(0, 40).forEach((i) => console.log("  -", i));
