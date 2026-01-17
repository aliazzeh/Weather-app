import { NextResponse } from "next/server";

const API_BASE = "https://api.openweathermap.org/data/2.5/forecast";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");

  if (!city) {
    return NextResponse.json(
      { error: "City query parameter is required, e.g. ?city=Amman" },
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
    const url = `${API_BASE}?q=${encodeURIComponent(
      city
    )}&appid=${apiKey}&units=metric`;

    const res = await fetch(url);

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return NextResponse.json(
        {
          error: "Failed to fetch forecast from OpenWeatherMap",
          details: errorData,
        },
        { status: res.status }
      );
    }

    const data: any = await res.json();

    const list: any[] = Array.isArray(data.list) ? data.list : [];

    // Group by date (YYYY-MM-DD) and pick one entry per day (prefer around midday)
    const byDate = new Map<string, any>();

    for (const item of list) {
      const dtTxt: string | undefined = item.dt_txt;
      if (!dtTxt) continue;

      const [dateStr, timeStr] = dtTxt.split(" ");
      if (!dateStr) continue;

      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, item);
      } else {
        const existing = byDate.get(dateStr);
        const isMidday = timeStr === "12:00:00";
        const existingMidday =
          typeof existing.dt_txt === "string" &&
          existing.dt_txt.split(" ")[1] === "12:00:00";

        if (isMidday && !existingMidday) {
          byDate.set(dateStr, item);
        }
      }
    }

    // Take first 5 days
    const entries = Array.from(byDate.entries()).slice(0, 5);

    const result = entries.map(([dateStr, item]) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

      return {
        date: dateStr,
        dayName,
        high: item.main?.temp_max ?? null,
        low: item.main?.temp_min ?? null,
        condition: item.weather?.[0]?.description ?? "",
        icon: item.weather?.[0]?.icon ?? "",
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Forecast API error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching forecast" },
      { status: 500 }
    );
  }
}
