import { NextResponse } from "next/server";
import countries from "world-countries";

const GEO_BASE = "https://api.openweathermap.org/geo/1.0/direct";

type CountryNameMap = Record<string, string>;
const countryNameByCca2: CountryNameMap = Object.fromEntries(
  countries.map((c: any) => [c.cca2, c.name?.common ?? c.cca2])
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Number(searchParams.get("limit") ?? 7);

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "WEATHER_API_KEY is not set on the server" },
      { status: 500 }
    );
  }

  try {
    const url = `${GEO_BASE}?q=${encodeURIComponent(q)}&limit=${Math.min(
      Math.max(limit, 1),
      10
    )}&appid=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const details = await res.json().catch(() => null);
      return NextResponse.json(
        { error: "Failed to fetch geocoding results", details },
        { status: res.status }
      );
    }

    const data: any[] = await res.json();

    const results = (Array.isArray(data) ? data : []).map((item) => {
      const name = item?.name ?? "";
      const state = item?.state ?? "";
      const countryCode = item?.country ?? "";
      const countryName = countryNameByCca2[countryCode] ?? countryCode;

      const labelParts = [
        name,
        state ? state : null,
        countryName ? countryName : null,
      ].filter(Boolean);

      return {
        name,
        state,
        countryCode,
        countryName,
        lat: item?.lat,
        lon: item?.lon,
        label: labelParts.join(", "),
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Geocode API error:", err);
    return NextResponse.json(
      { error: "Unexpected error fetching geocoding results" },
      { status: 500 }
    );
  }
}
