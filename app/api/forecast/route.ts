import { NextResponse } from "next/server";

const API_BASE = "https://api.openweathermap.org/data/2.5/forecast";

type DayBucket = {
  date: string;               // YYYY-MM-DD
  items: any[];               // all 3-hour entries for that date
  high: number | null;        // max of temp_max across day
  low: number | null;         // min of temp_min across day
  pick: any | null;           // representative item (closest to 12:00)
};

function getDateKeyFromDtTxt(dtTxt?: string): string | null {
  if (!dtTxt) return null;
  const [dateStr] = dtTxt.split(" ");
  return dateStr ?? null;
}

function timeToMinutes(timeStr?: string): number {
  // "12:00:00" -> 720
  if (!timeStr) return 0;
  const [hh, mm] = timeStr.split(":").map((n) => Number(n));
  return (hh || 0) * 60 + (mm || 0);
}

function getDayNameFromDateKey(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

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
    const url =
      lat && lon
        ? `${API_BASE}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        : `${API_BASE}?q=${encodeURIComponent(city!)}&appid=${apiKey}&units=metric`;

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

    // 1) Group all entries by date
    const buckets = new Map<string, DayBucket>();

    for (const item of list) {
      const dtTxt: string | undefined = item.dt_txt;
      if (!dtTxt) continue;

      const [dateStr, timeStr] = dtTxt.split(" ");
      if (!dateStr) continue;

      const tempMax = typeof item.main?.temp_max === "number" ? item.main.temp_max : null;
      const tempMin = typeof item.main?.temp_min === "number" ? item.main.temp_min : null;

      if (!buckets.has(dateStr)) {
        buckets.set(dateStr, {
          date: dateStr,
          items: [],
          high: null,
          low: null,
          pick: null,
        });
      }

      const bucket = buckets.get(dateStr)!;
      bucket.items.push(item);

      // Update real daily high/low across ALL 3-hour slots
      if (tempMax !== null) bucket.high = bucket.high === null ? tempMax : Math.max(bucket.high, tempMax);
      if (tempMin !== null) bucket.low = bucket.low === null ? tempMin : Math.min(bucket.low, tempMin);

      // Representative item: closest to 12:00 (midday)
      const minutes = timeToMinutes(timeStr);
      const target = 12 * 60;
      const diff = Math.abs(minutes - target);

      if (!bucket.pick) {
        bucket.pick = item;
      } else {
        const existingTimeStr = (bucket.pick.dt_txt as string | undefined)?.split(" ")[1];
        const existingMinutes = timeToMinutes(existingTimeStr);
        const existingDiff = Math.abs(existingMinutes - target);

        if (diff < existingDiff) {
          bucket.pick = item;
        }
      }
    }

    // 2) Sort days ascending
    const dailyArr = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 3) Exclude TODAY (start from tomorrow)
    const todayKey = new Date().toISOString().slice(0, 10); // server-local UTC key
    const nextDays = dailyArr.filter((d) => d.date !== todayKey).slice(0, 5);

    // 4) Map to your ForecastDay format
    const result = nextDays.map((d) => {
      const pick = d.pick ?? {};
      return {
        date: d.date,
        dayName: getDayNameFromDateKey(d.date),
        high: d.high,
        low: d.low,
        condition: pick.weather?.[0]?.description ?? "",
        icon: pick.weather?.[0]?.icon ?? "",
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
