"use client";

import React, { useState, useEffect, useRef } from "react";

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


const STORAGE_KEY = "weather-app-recent-searches";
const MAX_RECENT_SEARCHES = 10;

export default function Home() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const searches = JSON.parse(stored);
        setRecentSearches(Array.isArray(searches) ? searches : []);
      }
    } catch (err) {
      console.error("Failed to load recent searches:", err);
    }
  }, []);

  // Save recent search to localStorage
  const saveRecentSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    const normalizedTerm = searchTerm.trim();
    setRecentSearches((prev) => {
      // Remove duplicates and add to beginning
      const filtered = prev.filter((item) => item.toLowerCase() !== normalizedTerm.toLowerCase());
      const updated = [normalizedTerm, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save recent searches:", err);
      }
      
      return updated;
    });
  };

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowRecentSearches(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

      // Save successful search to recent searches
      saveRecentSearch(city.trim());

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
      setShowRecentSearches(false);
    }
  };

  const handleRecentSearchClick = (searchTerm: string) => {
    setCity(searchTerm);
    setShowRecentSearches(false);
    // Trigger search
    const form = searchInputRef.current?.closest("form");
    if (form) {
      form.requestSubmit();
    }
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear recent searches:", err);
    }
  };

  // Fetch weather by coordinates
  const fetchWeatherByCoordinates = async (lat: number, lon: number) => {
    setLoading(true);
    setError("");
    setWeather(null);
    setForecast([]);

    try {
      // 1) current weather
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError("Could not fetch weather data for your location. Please try again.");
        return;
      }

      const weatherData: WeatherData = await res.json();
      setWeather(weatherData);

      // Save successful search to recent searches
      if (weatherData.city) {
        saveRecentSearch(weatherData.city);
        setCity(weatherData.city);
      }

      // 2) 5-day forecast
      const forecastRes = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);

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
      setLocationLoading(false);
      setShowRecentSearches(false);
    }
  };

  // Get user's location and fetch weather
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocationLoading(true);
    setError("");
    setShowRecentSearches(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeatherByCoordinates(latitude, longitude);
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = "Unable to get your location. ";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please allow location access and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please try again.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
            break;
        }
        
        setError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
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
    <main className="min-h-screen bg-[#0F1417] text-white flex items-center justify-center px-3 py-5 sm:px-6 sm:py-8">
  <div className="w-full max-w-[960px] rounded-3xl border border-gray-800 bg-gray-900/50 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 shadow-lg space-y-6 sm:space-y-8">


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
          
              <img
                src="/icon.png"
                alt="Temperature Icon"
                className="w-7 h-7"
              />
            {/* toggle pill */}
            <div className="flex rounded-full bg-gray-800 p-1">
              <button
                type="button"
                onClick={() => setUnit("C")}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${unit === "C" ? "bg-sky-500 text-white" : "text-gray-400"
                  }`}
              >
                °C
              </button>
              <button
                type="button"
                onClick={() => setUnit("F")}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${unit === "F" ? "bg-sky-500 text-white" : "text-gray-400"
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
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for a city"
                  className="search-input w-full rounded-full border border-gray-700 bg-[#26303B] pl-11 pr-28 py-3 text-base text-white placeholder-gray-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onFocus={() => setShowRecentSearches(recentSearches.length > 0)}
                />

                {/* Recent Searches Dropdown */}
                {showRecentSearches && recentSearches.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 mt-2 w-full rounded-2xl border border-gray-700 bg-[#26303B] shadow-lg overflow-hidden"
                  >
                    <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-400">Recent Searches</span>
                      <button
                        type="button"
                        onClick={handleClearRecentSearches}
                        className="text-xs text-gray-500 hover:text-gray-300 transition"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {recentSearches.map((search, index) => (
                        <button
                          key={`${search}-${index}`}
                          type="button"
                          onClick={() => handleRecentSearchClick(search)}
                          className="w-full px-4 py-3 text-left text-base text-white hover:bg-gray-800/50 transition flex items-center gap-3"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            className="w-4 h-4 text-gray-400"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{search}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* button inside the same pill, on the right */}
                <button
                  
                  type="submit"
                  className="mr-[-14px] absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 backdrop-blur px-9 py-3 text-base font-semibold text-white shadow hover:bg-white/20 active:scale-[.98] transition disabled:opacity-60 cursor-pointer"
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

            {/* Use my location button */}
            <div className="mt-4 flex items-center justify-center">
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locationLoading || loading}
                className="flex items-center gap-2 rounded-full border border-gray-700 
             bg-[#26303B] px-6 py-2.5 text-sm font-medium text-white 
             hover:bg-gray-800/50 active:scale-[.98] transition 
             cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {locationLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Getting location...</span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    <span>Use my location</span>
                  </>
                )}
              </button>
            </div>

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
            <span className="text-4xl sm:text-5xl">
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
              <p className="text-3xl sm:text-4xl font-semibold text-white">
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
            <p className="mt-3 text-2xl sm:text-3xl font-semibold text-white">
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
            <table className="min-w-full text-sm sm:text-base border-collapse">
              <thead className="typography-medium">
                <tr className="border-b border-gray-700 bg-[#1C2129]">
                  <th className="py-3 sm:py-4 pl-6 pr-4 text-left font-medium text-white">
                    Day
                  </th>
                  <th className="px-4 py-3 sm:py-4 text-left font-medium text-white">
                    High / Low
                  </th>
                  <th className="py-3 sm:py-4 pr-6 pl-4 text-left font-medium text-white">
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
