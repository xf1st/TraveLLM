import { NextRequest, NextResponse } from "next/server";
import { checkIpRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const searchCityLocales = async (term: string) => {
  try {
    const encoded = encodeURIComponent(term);
    const [resRu, resEn] = await Promise.all([
      fetch(`https://autocomplete.travelpayouts.com/places2?term=${encoded}&locale=ru&types[]=city`),
      fetch(`https://autocomplete.travelpayouts.com/places2?term=${encoded}&locale=en&types[]=city`)
    ]);
    if (!resRu.ok || !resEn.ok) return { dataRu: null, dataEn: null };
    return { dataRu: await resRu.json(), dataEn: await resEn.json() };
  } catch {
    return { dataRu: null, dataEn: null };
  }
};

export async function GET(request: NextRequest) {
  // IP rate limit: 30 req/min — each request can fan out to 7 TravelPayouts calls
  const rl = await checkIpRateLimit(request, "iata", 30)
  if (!rl.allowed) return rateLimitResponse(rl)

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();

  if (!city) {
    return NextResponse.json({ error: "City parameter is required" }, { status: 400 });
  }

  if (city.length > 150) {
    return NextResponse.json({ error: "City name too long" }, { status: 400 });
  }

  try {
    let { dataRu, dataEn } = await searchCityLocales(city);

    // Fallback 1: Extract city after "в" / "in", e.g. "Отель в Дубае" → "Дубае"
    if (!dataRu || dataRu.length === 0) {
      const inMatch = city.match(/(?:в|in)\s+([А-Яа-яA-Za-z\-]+)/i);
      if (inMatch?.[1]) {
        const fb = await searchCityLocales(inMatch[1]);
        if (fb.dataRu && fb.dataRu.length > 0) {
          dataRu = fb.dataRu;
          dataEn = fb.dataEn;
        }
      }
    }

    // Fallback 2: Comma-separated e.g. "The Marmara Pera, Istanbul" → try each part RTL
    if ((!dataRu || dataRu.length === 0) && city.includes(",")) {
      const parts = city.split(",").map(p => p.trim()).filter(p => p.length > 0);
      for (let i = parts.length - 1; i >= 0; i--) {
        const fb = await searchCityLocales(parts[i]);
        if (fb.dataRu && fb.dataRu.length > 0) {
          dataRu = fb.dataRu;
          dataEn = fb.dataEn;
          break;
        }
      }
    }

    // Fallback 3: Last word of multi-word string
    if (!dataRu || dataRu.length === 0) {
      const words = city.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 1) {
        const fb = await searchCityLocales(words[words.length - 1]);
        if (fb.dataRu && fb.dataRu.length > 0) {
          dataRu = fb.dataRu;
          dataEn = fb.dataEn;
        }
      }
    }

    if (dataRu && dataRu.length > 0) {
      const enCity = dataEn?.find((c: any) => c.code === dataRu[0].code) || dataEn?.[0] || {};
      return NextResponse.json({
        iata: dataRu[0].code,
        name: dataRu[0].name,
        nameEn: enCity.name || dataRu[0].name,
        country: dataRu[0].country_name
      });
    }

    return NextResponse.json({ error: "City not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
