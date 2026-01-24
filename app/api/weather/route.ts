import { NextResponse } from "next/server";

const API_BASE = "https://api.openweathermap.org/data/2.5/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!city && (!lat || !lon)) {
    return NextResponse.json(
      { error: "Either city query parameter or lat/lon coordinates are required" },
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
      // Use coordinates
      url = `${API_BASE}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    } else {
      // Use city name
      url = `${API_BASE}?q=${encodeURIComponent(
        city!
      )}&appid=${apiKey}&units=metric`;
    }

    const res = await fetch(url);

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

    // Pick only what we need
    const mapped = {
      city: data.name,
      country: data.sys?.country ?? "",
      temp: data.main?.temp ?? null,
      feelsLike: data.main?.feels_like ?? null,
      humidity: data.main?.humidity ?? null,
      windSpeed: data.wind?.speed ?? null,
      description: data.weather?.[0]?.description ?? "",
      icon: data.weather?.[0]?.icon ?? "",
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
