"use client";

import React, { useState } from "react";

type WeatherData = {
  city: string;
  country: string;
  temp: number | null;
  feelsLike: number | null;
  humidity: number | null;
  windSpeed: number | null;
  description: string;
  icon: string;
};

type ForecastDay = {
  date: string;
  dayName: string;
  high: number | null;
  low: number | null;
  condition: string;
  icon: string;
};
// Use custom icons for clear / clouds / rain, and fall back to OpenWeather icons for others
const getTableIconSrc = (iconCode?: string | null, condition?: string | null) => {
  const code = iconCode ?? "";
  const desc = (condition ?? "").toLowerCase();

  // Our three custom icons:
  if (desc.includes("rain") || desc.includes("shower")) {
    return "/weather-icons/rainy.png";
  }

  if (desc.includes("cloud")) {
    return "/weather-icons/partly-cloudy.png";
  }

  if (desc.includes("clear") || desc.includes("sun")) {
    return "/weather-icons/sunny.png";
  }

  // For everything else (snow, fog, storm, etc), use OpenWeather's own icon
  if (code) {
    return `https://openweathermap.org/img/wn/${code}.png`;
  }

  // No icon at all
  return null;
};


export default function Home() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState<"C" | "F">("C");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!city.trim()) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError("");
    setWeather(null);
    setForecast([]);

    try {
      // 1) current weather
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.details?.cod === "404" || data?.details?.message === "city not found") {
          setError("City not found. Check spelling and try again.");
        } else {
          setError("Could not fetch weather data. Please try again.");
        }
        return;
      }

      const weatherData: WeatherData = await res.json();
      setWeather(weatherData);

      // 2) 5-day forecast
      const forecastRes = await fetch(
        `/api/forecast?city=${encodeURIComponent(city)}`
      );

      if (forecastRes.ok) {
        const forecastData: ForecastDay[] = await forecastRes.json();
        setForecast(forecastData);
      } else {
        setForecast([]);
      }
    } catch (err) {
      console.error(err);
      setError("Unexpected error fetching weather.");
    } finally {
      setLoading(false);
    }
  };

  const displayCity =
    weather?.city && weather?.country
      ? `${weather.city}, ${weather.country}`
      : city || "Amman,Jordan";

  const displayDescription =
    weather?.description || "Mostly clear with a high of 75°F";

  const displayTemp =
    weather?.temp !== null && weather?.temp !== undefined
      ? unit === "C"
        ? `${Math.round(weather.temp)}°C`
        : `${Math.round((weather.temp * 9) / 5 + 32)}°F`
      : "–";

  const displayFeelsLike =
    weather?.feelsLike !== null && weather?.feelsLike !== undefined
      ? unit === "C"
        ? `${Math.round(weather.feelsLike)}°C`
        : `${Math.round((weather.feelsLike * 9) / 5 + 32)}°F`
      : "–";

  const displayHumidity =
    weather?.humidity !== null && weather?.humidity !== undefined
      ? `${weather.humidity}%`
      : "–";

  const displayWind =
    weather?.windSpeed !== null && weather?.windSpeed !== undefined
      ? `${weather.windSpeed} m/s`
      : "–";

  return (
    <main className="min-h-screen bg-[#0F1417] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-3xl border border-gray-800 bg-gray-900/50 px-8 py-8 shadow-lg space-y-8">
        {/* Top title */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-medium text-white">
            <img
              src="/Headerlogo.png"
              alt="Weather App Logo"
              className="w-5 h-5"
            />
            <span className="header-title">
              Weather App
            </span>

          </div>
          <div className="flex items-center gap-3">
            {/* temperature icon */}
            <span className="text-gray-400">
              <img
                src="/icon.png"
                alt="Temperature Icon"
                className="w-7 h-7"
              />
            </span>

            {/* toggle pill */}
            <div className="flex rounded-full bg-gray-800 p-1">
              <button
                type="button"
                onClick={() => setUnit("C")}
                className={`px-3 py-1 rounded-full text-xs font-medium ${unit === "C" ? "bg-sky-500 text-white" : "text-gray-400"
                  }`}
              >
                °C
              </button>
              <button
                type="button"
                onClick={() => setUnit("F")}
                className={`px-3 py-1 rounded-full text-xs font-medium ${unit === "F" ? "bg-sky-500 text-white" : "text-gray-400"
                  }`}
              >
                °F
              </button>
            </div>
          </div>

        </header>
        <hr style={{ border: '1px solid #3e3d3d' }}></hr>
        {/* Search bar */}
        <section>
          <div>
            <form onSubmit={handleSearch}>
              <div className="relative">
                {/* search icon on the left */}
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    className="w-5 h-5 text-gray-500"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
                    />
                  </svg>
                </span>

                {/* input */}
                <input
                  type="text"
                  placeholder="Search for a city"
                  className="search-input w-full rounded-full border border-gray-700 bg-[#26303B] pl-11 pr-28 py-3 text-base text-white placeholder-gray-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />

                {/* button inside the same pill, on the right */}
                <button
                  type="submit"
                  className="mr-[-14px] absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 backdrop-blur px-9 py-3 text-base font-semibold text-white shadow hover:bg-white/20 active:scale-[.98] transition disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Search"}
                </button>


              </div>
            </form>
            {error && (
              <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

          </div>
        </section>

        {/* Current weather section */}
        <section className="flex flex-col items-center text-center gap-6">
          <div className="space-y-2">
            <h1 className="city-title text-white">
              {displayCity}
            </h1>
          </div>

          <div className="flex items-center gap-5">
            <span className="text-6xl">
              {weather?.icon === "01d" || weather?.icon === "01n"
                ? "☀️"
                : weather?.icon?.includes("02")
                  ? "⛅️"
                  : weather?.icon?.includes("03") ||
                    weather?.icon?.includes("04")
                    ? "☁️"
                    : weather?.icon?.includes("09") ||
                      weather?.icon?.includes("10")
                      ? "🌧️"
                      : weather?.icon?.includes("11")
                        ? "⛈️"
                        : weather?.icon?.includes("13")
                          ? "❄️"
                          : weather?.icon?.includes("50")
                            ? "🌫️"
                            : "☀️"}
            </span>
            <div className="flex flex-col items-start">
              <p className="text-4xl font-semibold text-white">
                {displayTemp}
              </p>
              <p className="city-description text-white">
                {displayDescription}
              </p>
            </div>
          </div>
        </section>

        {/* Small info cards */}
        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-700/70 bg-[#26303B] p-6 text-left">
            <p className="typography-medium2 text-gray-300">
              Humidity
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">
              {displayHumidity}
            </p>
            <p className="mt-2 text-xs text-gray-400">Cloud</p>
          </div>

          <div className="rounded-3xl border border-gray-700/70 bg-[#26303B] p-6 text-left">
            <p className="typography-medium2 text-gray-300">
              Wind
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">
              {displayWind}
            </p>
            <p className="mt-2 text-xs text-gray-400">Wind</p>
          </div>

          <div className="rounded-3xl border border-gray-700/70 bg-[#26303B] p-6 text-left">
            <p className="typography-medium2 text-gray-300">
              Feels like
            </p>
            <p className="mt-3 text-4xl font-semibold text-white">
              {displayFeelsLike}
            </p>
            <p className="mt-2 text-xs text-gray-400">Thermometer</p>
          </div>
        </section>

        {/* 5-Day Forecast */}
        <section className="mt-12">
          <h2 className="typography-medium text-gray-300">
            5-Day Forecast
          </h2>

          <div className="rounded-2xl border border-gray-700/60 bg-[#0F1417] overflow-hidden">
            <table className="min-w-full text-base border-collapse">
              <thead className="typography-medium">
                <tr className="border-b border-gray-700 bg-[#1C2129]">
                  <th className="py-4 pl-6 pr-4 text-left font-medium text-white">
                    Day
                  </th>
                  <th className="px-4 py-4 text-left font-medium text-white">
                    High / Low
                  </th>
                  <th className="py-4 pr-6 pl-4 text-left font-medium text-white">
                    Condition
                  </th>
                  <th >

                  </th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((item, index) => (
                  <tr
                    key={item.date}
                    className={
                      index !== forecast.length - 1 ? "border-b border-gray-700" : ""
                    }
                  >
                    {/* Day */}
                    <td className="typography-medium">
                      {item.dayName}
                    </td>

                    {/* Temp (using high only, converted to C/F) */}
                    <td className="typography-medium">
                      {item.high !== null
                        ? unit === "C"
                          ? `${Math.round(item.high)}°C`
                          : `${Math.round((item.high * 9) / 5 + 32)}°F`
                        : "–"}
                    </td>

                    {/* Condition text */}
                    <td className="typography-medium">
                      <span className="text-gray-300 capitalize">
                        {item.condition || "—"}
                      </span>
                    </td>

                    <td className="py-4 pr-6 pl-4 text-center">
                      {(() => {
                        const iconSrc = getTableIconSrc(item.icon, item.condition);

                        if (!iconSrc) {
                          return <span className="text-gray-500">—</span>;
                        }

                        return (
                          <img
                            src={iconSrc}
                            alt={item.condition || "weather icon"}
                            className="inline-block h-10 w-10"
                          />
                        );
                      })()}
                    </td>



                  </tr>
                ))}
                {forecast.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 pl-6 pr-6 text-sm text-gray-500"
                    >
                      Search for a city to see the 5-day forecast.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-m text-gray-400">
            &copy; 2026 Weather App. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
