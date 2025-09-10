// Run: npm run gen:favicon
import fs from "fs";
import path from "path";
import sharp from "sharp";
import * as toIco from "to-ico";

function normalizePath(p: string): string {
  // Windows: file:///C:/... => /C:/... (strip first slash)
  return process.platform === "win32" && /^\/\w:\//.test(p) ? p.slice(1) : p;
}

let src = normalizePath(new URL("../public/logo.jpg", import.meta.url).pathname);
const out = normalizePath(new URL("../public/favicon.ico", import.meta.url).pathname);

if (!fs.existsSync(src)) {
  const fb = path.join(process.cwd(), "public", "logo.jpg");
  if (fs.existsSync(fb)) {
    console.log("Using fallback path", fb);
    src = fb;
  }
}

async function run(): Promise<void> {
  if (!fs.existsSync(src)) {
    console.error("Source image not found:", src);
    process.exit(1);
  }

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs: Buffer[] = [];
  for (const size of sizes) {
    const buf = await sharp(src).resize(size, size, { fit: "cover" }).png().toBuffer();
    pngs.push(buf);
  }

  const ico = await (toIco as any)(pngs);
  fs.writeFileSync(out, ico);
  console.log("Wrote", out);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
