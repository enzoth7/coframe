import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { defaultInternationalCsv, defaultUruguayCsv, readSources } from "./db-lib.mjs";

const projectRoot = process.cwd();
const publicLogosDir = path.join(projectRoot, "public", "logos");
const manifestPath = path.join(publicLogosDir, "manifest.json");

const SLUG_OVERRIDES = {
  "warner bros.": "warnerbros",
  "the north face": "thenorthface",
  "levi's": "levis",
  "new balance": "newbalance",
  "coca-cola": "cocacola",
  "red bull": "redbull",
  "mcdonald's": "mcdonalds",
  "mc donalds": "mcdonalds",
  "burger king": "burgerking",
  "nestlé": "nestle",
  "ben & jerry's": "benandjerrys",
  "monster energy": "monsterenergy",
  "mercedes-benz": "mercedes",
  "american express": "americanexpress",
  "booking.com": "bookingdotcom",
  "l'oréal": "loreal",
  "oral-b": "oralb",
  "johnson & johnson": "johnsonandjohnson",
  "latam airlines": "latamairlines",
  "o boticário": "oboticario",
  "ualá": "uala",
  "despegar": "despegar",
};

const BRAND_DIRECT_URLS = {
  despegar: "https://www.despegar.com/favicon.ico",
  notco: "https://notco.com/assets/public/images/icons/favicon/apple-touch-icon-144x144.png",
  quilmes: "https://www.cerveceriaymalteriaquilmes.com/sites/g/files/wnfebl12181/files/logocorporate_0.png",
  havanna: "https://havanna.com.ar/images/favicon.png",
  salus: "https://www.salus.com.uy/assets/img/logo-color.svg",
};

const FALLBACK_GLOBE_SHA = "59bfe9bc385ad69f50793ce4a53397316d7a875a7148a63c16df9b674c6cda64";

function getSlug(name) {
  const norm = name.toLowerCase().trim();
  if (SLUG_OVERRIDES[norm]) return SLUG_OVERRIDES[norm];
  return norm
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed === "N/A") return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function detectImageType(buffer) {
  if (!buffer || buffer.length < 150) return null;
  const sha = crypto.createHash("sha256").update(buffer).digest("hex");
  if (sha === FALLBACK_GLOBE_SHA) return null;

  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }
  const textHead = buffer.slice(0, 1000).toString("utf8").toLowerCase();
  if (textHead.includes("<svg") && (textHead.includes("xmlns") || buffer.toString("utf8").includes("</svg>"))) {
    return "svg";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (buffer.length >= 12 && buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return "ico";
  }
  return null;
}

async function fetchBuffer(url, timeout = 5000) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = detectImageType(buffer);
    if (!ext) return null;
    return { buffer, ext, url };
  } catch {
    return null;
  }
}

async function scrapeWebsite(websiteUrl) {
  try {
    const res = await fetch(websiteUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const linkMatches = [
      ...html.matchAll(
        /<link[^>]+(?:href=["']([^"']+)["'][^>]*rel=["']([^"']*(?:icon|apple-touch-icon)[^"']*)["']|rel=["']([^"']*(?:icon|apple-touch-icon)[^"']*)["'][^>]*href=["']([^"']+)["'])[^>]*>/gi
      ),
    ];

    for (const match of linkMatches) {
      const href = match[1] || match[4];
      if (href) {
        const resolved = new URL(href, websiteUrl).href;
        const result = await fetchBuffer(resolved, 4000);
        if (result) return result;
      }
    }

    const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']*(?:logo|brand|isologo)[^"']*)["'][^>]*>/gi)];
    for (const match of imgMatches) {
      const src = match[1];
      if (src && !src.endsWith(".gif")) {
        const resolved = new URL(src, websiteUrl).href;
        const result = await fetchBuffer(resolved, 4000);
        if (result) return result;
      }
    }
  } catch {}
  return null;
}

async function fetchBrandLogo(brand) {
  const normName = brand.name.toLowerCase().trim();
  const slug = getSlug(brand.name);

  // 1. Direct explicit override
  if (BRAND_DIRECT_URLS[normName]) {
    const direct = await fetchBuffer(BRAND_DIRECT_URLS[normName]);
    if (direct) return direct;
  }

  // 2. Simple Icons
  if (slug) {
    const si = await fetchBuffer(`https://cdn.simpleicons.org/${slug}`);
    if (si) return si;
  }

  // 3. SVGL
  if (slug) {
    const svgl = await fetchBuffer(`https://svgl.app/library/${slug}.svg`);
    if (svgl) return svgl;
  }

  // 4. Website-based strategies
  const website = normalizeUrl(brand.website);
  if (!website) return null;

  let origin = "";
  try {
    origin = new URL(website).origin;
  } catch {
    return null;
  }

  // 4a. Google Favicon S2 (128px)
  const gstatic = await fetchBuffer(
    `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(origin)}&size=128`
  );
  if (gstatic) return gstatic;

  // 4b. Direct /favicon.ico
  const directIco = await fetchBuffer(`${origin}/favicon.ico`, 3500);
  if (directIco) return directIco;

  // 4c. Scrape website HTML
  const scraped = await scrapeWebsite(website);
  if (scraped) return scraped;

  return null;
}

export async function fetchAllLogos() {
  const sources = readSources({
    uruguayCsv: process.env.COFRAME_URUGUAY_CSV || defaultUruguayCsv,
    internationalCsv: process.env.COFRAME_INTERNATIONAL_CSV || defaultInternationalCsv,
  });

  const allBrands = [...sources.international, ...sources.uruguay];
  const brandsWithWeb = allBrands.filter((brand) => Boolean(brand.website && brand.website !== "N/A"));

  fs.mkdirSync(publicLogosDir, { recursive: true });

  console.log(`Buscando logos para ${brandsWithWeb.length} marcas con sitio web (concurrencia: 20)...`);
  const startTime = Date.now();

  const manifest = {};
  const BATCH_SIZE = 20;

  for (let i = 0; i < brandsWithWeb.length; i += BATCH_SIZE) {
    const batch = brandsWithWeb.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (brand) => {
        const logo = await fetchBrandLogo(brand);
        return { brand, logo };
      })
    );

    for (const { brand, logo } of results) {
      if (logo) {
        const brandId = brand.id.toLowerCase();
        const filename = `${brandId}.${logo.ext}`;
        const filePath = path.join(publicLogosDir, filename);
        fs.writeFileSync(filePath, logo.buffer);
        manifest[brandId] = `/logos/${filename}`;
      }
    }
    const processed = Math.min(i + BATCH_SIZE, brandsWithWeb.length);
    process.stdout.write(`Progreso: ${processed}/${brandsWithWeb.length} marcas procesadas...\r`);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const intCount = sources.international.filter((b) => manifest[b.id.toLowerCase()]).length;
  const uyCount = sources.uruguay.filter((b) => manifest[b.id.toLowerCase()]).length;

  console.log(`\nProceso completado en ${duration}s.`);
  console.log(`- Logos internacionales: ${intCount}/${sources.international.length} (${((intCount / sources.international.length) * 100).toFixed(0)}%)`);
  console.log(`- Logos nacionales (con web): ${uyCount}/${sources.uruguay.filter((b) => b.website).length} (${((uyCount / sources.uruguay.filter((b) => b.website).length) * 100).toFixed(0)}%)`);
  console.log(`- Total logos guardados en manifiesto: ${Object.keys(manifest).length}`);
  console.log(`- Manifiesto generado en: ${manifestPath}`);

  return { manifest, total: Object.keys(manifest).length, intCount, uyCount, duration };
}

fetchAllLogos().catch((err) => {
  console.error("Error al obtener logos:", err);
  process.exitCode = 1;
});
