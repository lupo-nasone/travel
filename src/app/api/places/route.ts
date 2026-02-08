import { NextResponse } from "next/server";

interface PlacesRequest {
  lat: number;
  lng: number;
  radius: number; // in km
  mode: "tourist" | "biker";
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function POST(request: Request) {
  try {
    const body: PlacesRequest = await request.json();
    const { lat, lng, radius, mode } = body;
    const radiusMeters = radius * 1000;

    let query: string;

    if (mode === "tourist") {
      // Search for: historic villages, castles, museums, lakes, churches, viewpoints
      query = `
        [out:json][timeout:15];
        (
          node["historic"="castle"](around:${radiusMeters},${lat},${lng});
          way["historic"="castle"](around:${radiusMeters},${lat},${lng});
          node["tourism"="museum"](around:${radiusMeters},${lat},${lng});
          node["tourism"="viewpoint"](around:${radiusMeters},${lat},${lng});
          node["natural"="lake"]["name"](around:${radiusMeters},${lat},${lng});
          way["natural"="water"]["water"="lake"]["name"](around:${radiusMeters},${lat},${lng});
          node["historic"="monument"](around:${radiusMeters},${lat},${lng});
          node["tourism"="attraction"]["name"](around:${radiusMeters},${lat},${lng});
          node["place"="village"]["historic"](around:${radiusMeters},${lat},${lng});
          way["historic"="archaeological_site"](around:${radiusMeters},${lat},${lng});
        );
        out center 80;
      `;
    } else {
      // Biker: mountain passes, viewpoints, peaks
      query = `
        [out:json][timeout:15];
        (
          node["mountain_pass"="yes"](around:${radiusMeters},${lat},${lng});
          node["natural"="saddle"](around:${radiusMeters},${lat},${lng});
          node["tourism"="viewpoint"]["ele"](around:${radiusMeters},${lat},${lng});
          node["natural"="peak"]["name"]["ele"](around:${radiusMeters},${lat},${lng});
        );
        out center 80;
      `;
    }

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return NextResponse.json({ places: [] });
    }

    const data = await response.json();
    const elements: OverpassElement[] = data.elements || [];

    // Transform into our Destination format
    const places = elements
      .filter((el) => {
        // Must have a name and coordinates
        const hasName = el.tags?.name;
        const hasCoords = el.lat || el.center?.lat;
        return hasName && hasCoords;
      })
      .map((el) => {
        const elLat = el.lat || el.center?.lat || 0;
        const elLng = el.lon || el.center?.lon || 0;
        const tags = el.tags || {};

        const type = inferType(tags, mode);
        const description = buildDescription(tags, type);
        const altitude = tags.ele ? parseInt(tags.ele) : undefined;
        const wikiUrl = tags.wikipedia
          ? `https://it.wikipedia.org/wiki/${tags.wikipedia.replace(/^it:/, "")}`
          : tags.wikidata
            ? `https://www.wikidata.org/wiki/${tags.wikidata}`
            : `https://www.openstreetmap.org/${el.type}/${el.id}`;

        return {
          id: `osm-${el.id}`,
          name: tags.name!,
          region: tags["addr:state"] || tags["addr:province"] || "",
          lat: elLat,
          lng: elLng,
          type,
          tags: buildTags(tags, mode),
          description,
          whyGo: buildWhyGo(tags, type),
          image: buildImageUrl(tags),
          wikiUrl,
          altitude,
          roadQuality: mode === "biker" ? 3 : undefined,
          curvinessRating: mode === "biker" ? (altitude && altitude > 1500 ? 4 : 3) : undefined,
        };
      });

    return NextResponse.json({ places });
  } catch (error) {
    console.error("Overpass API error:", error);
    return NextResponse.json({ places: [] });
  }
}

function inferType(tags: Record<string, string>, mode: string): string {
  if (mode === "biker") {
    if (tags.mountain_pass === "yes" || tags.natural === "saddle") return "passo";
    if (tags.natural === "peak") return "vetta";
    return "panorama";
  }
  if (tags.historic === "castle") return "castello";
  if (tags.tourism === "museum") return "museo";
  if (tags.natural === "lake" || tags.water === "lake") return "lago";
  if (tags.tourism === "viewpoint") return "panorama";
  if (tags.historic === "monument") return "monumento";
  if (tags.historic === "archaeological_site") return "sito archeologico";
  if (tags.place === "village") return "borgo";
  return "attrazione";
}

function buildTags(tags: Record<string, string>, mode: string): string[] {
  const result: string[] = [];
  if (tags.historic) result.push("storico");
  if (tags.tourism === "museum") result.push("museo");
  if (tags.natural === "lake" || tags.water === "lake") result.push("lago");
  if (tags.tourism === "viewpoint") result.push("panorama");
  if (tags.mountain_pass === "yes") result.push("passo");
  if (tags.natural === "peak") result.push("vetta");
  if (mode === "biker") result.push("moto");
  else result.push("cultura");
  return result;
}

function buildDescription(tags: Record<string, string>, type: string): string {
  const name = tags.name || "Luogo da scoprire";
  const parts: string[] = [];

  if (tags.description) return tags.description;

  switch (type) {
    case "castello":
      parts.push(`${name}, un castello storico`);
      if (tags.historic?.includes("castle")) parts.push("ricco di storia e fascino");
      break;
    case "museo":
      parts.push(`${name}, un museo`);
      if (tags.subject) parts.push(`dedicato a ${tags.subject}`);
      break;
    case "lago":
      parts.push(`${name}, uno specchio d'acqua naturale`);
      parts.push("perfetto per una giornata immersi nella natura");
      break;
    case "passo":
      parts.push(`${name}`);
      if (tags.ele) parts.push(`a ${tags.ele}m di altitudine`);
      parts.push("— un passo di montagna da percorrere in moto");
      break;
    case "vetta":
      parts.push(`${name}`);
      if (tags.ele) parts.push(`(${tags.ele}m)`);
      parts.push("— una vetta con panorami mozzafiato");
      break;
    default:
      parts.push(`${name}, un luogo interessante da visitare nella zona`);
  }

  return parts.join(" ");
}

function buildWhyGo(tags: Record<string, string>, type: string): string {
  switch (type) {
    case "castello": return "Un castello storico tutto da esplorare, tra torri e mura antiche.";
    case "museo": return `Un museo${tags.subject ? ` dedicato a ${tags.subject}` : ""} che merita una visita.`;
    case "lago": return "Un lago dove rilassarsi e godersi la natura.";
    case "passo": return tags.ele ? `Un passo a ${tags.ele}m: curve e panorami imperdibili.` : "Un passo di montagna con curve entusiasmanti.";
    case "vetta": return tags.ele ? `Una vetta a ${tags.ele}m con vista spettacolare.` : "Un punto panoramico mozzafiato.";
    case "panorama": return "Un punto panoramico con vista spettacolare sulla zona.";
    case "monumento": return "Un monumento storico che racconta il passato del territorio.";
    case "borgo": return "Un borgo antico con atmosfera autentica e fuori dal tempo.";
    case "sito archeologico": return "Un sito archeologico che svela le radici del territorio.";
    default: return "Un luogo affascinante che vale la deviazione.";
  }
}

function buildImageUrl(tags: Record<string, string>): string {
  // Use Wikimedia commons image if available
  if (tags.image) return tags.image;
  if (tags.wikimedia_commons) {
    const file = tags.wikimedia_commons.replace("File:", "").replace(/ /g, "_");
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`;
  }
  // Fallback placeholder based on type
  const placeholders = [
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    "https://images.unsplash.com/photo-1502786129293-79981df4e689?w=800&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  ];
  return placeholders[Math.floor(Math.random() * placeholders.length)];
}
