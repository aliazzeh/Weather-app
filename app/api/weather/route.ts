import { NextResponse } from "next/server";
import countries from "world-countries";

const API_BASE = "https://api.openweathermap.org/data/2.5/weather";

const countryNameByCca2: Record<string, string> = Object.fromEntries(
  (countries as any[]).map((c) => [c.cca2, c.name?.common ?? c.cca2])
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const city = searchParams.get("city");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const lang = searchParams.get("lang") === "ar" ? "ar" : "en";

  if (!city && (!lat || !lon)) {
    return NextResponse.json(
      { error: "Either city or lat/lon is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "WEATHER_API_KEY is not set on the server" },
      { status: 500 }
    );
  }

  try {
    let url: string;

    if (lat && lon) {
      url = `${API_BASE}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=${lang}`;
    } else {
      url = `${API_BASE}?q=${encodeURIComponent(
        city!
      )}&appid=${apiKey}&units=metric&lang=${lang}`;
    }

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        {
          error: "Failed to fetch weather from OpenWeatherMap",
          details: errorData,
        },
        { status: res.status }
      );
    }

    const data = await res.json();

    // ✅ Localize country name
    const countryCode = data.sys?.country ?? "";
    const dn = new Intl.DisplayNames([lang], { type: "region" });

    const mapped = {
      city: data.name, // OpenWeather يرجّع الاسم حسب lang
      countryCode,
      countryName:
        dn.of(countryCode) ??
        countryNameByCca2[countryCode] ??
        countryCode,

      temp: data.main?.temp ?? null,
      feelsLike: data.main?.feels_like ?? null,
      humidity: data.main?.humidity ?? null,
      windSpeed: data.wind?.speed ?? null,
      description: data.weather?.[0]?.description ?? "",
      icon: data.weather?.[0]?.icon ?? ""
    };

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching weather" },
      { status: 500 }
    );
  }
}
