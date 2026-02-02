"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "./components/EmptyState";

type WeatherData = {
  city: string;
  country: string;
  countryName?: string;
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
type GeoSuggestion = {
  name: string;
  state: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lon: number;
  label: string;
};

// Use custom icons for clear / clouds / rain, and fall back to OpenWeather icons for others
const getWeatherIconSrc = (iconCode?: string | null) => {
  const code = (iconCode ?? "").slice(0, 2); // "04d" -> "04"

  switch (code) {
    case "01":
      return "/weather-icons/sunny.png";

    case "02":
      return "/weather-icons/partly-cloudy.png";

    case "03":
    case "04":
      return "/weather-icons/partly-cloudy.png"; // ✅ المهم

    case "09":
    case "10":
      return "/weather-icons/rainy.svg"; // أو partly-rainy حسب قرارك

    case "11":
      return "/weather-icons/thunder.svg";

    case "13":
      return "/weather-icons/snowy.svg";

    case "50":
      return "/weather-icons/mist.svg";

    default:
      return "/weather-icons/partly-cloudy.png";
  }
};


const STORAGE_KEY = "weather-app-recent-searches";
const MAX_RECENT_SEARCHES = 10;

const LOCATION_PROMPT_KEY = "weather-app-location-prompt-choice";
// values: "allow" | "deny"

export default function Home() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);  
  const suggestBoxRef = useRef<HTMLDivElement>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const isTyping = city.trim().length >= 2;
  const isSelectingRef = useRef(false);

  // ----------------------------
  // Recent searches: load
  // ----------------------------
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

  // Recent searches: save helper
  const saveRecentSearch = (searchTerm: string) => {
    const normalizedTerm = searchTerm.trim();
    if (!normalizedTerm) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== normalizedTerm.toLowerCase()
      );
      const updated = [normalizedTerm, ...filtered].slice(0, MAX_RECENT_SEARCHES);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save recent searches:", err);
      }

      return updated;
    });
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear recent searches:", err);
    }
  };

        // Close dropdowns on outside click
      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as Node;

          if (
            !searchInputRef.current?.contains(target) &&
            !dropdownRef.current?.contains(target) &&
            !suggestBoxRef.current?.contains(target)
          ) {
            setShowRecentSearches(false);
            setShowSuggestions(false);
          }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }, []);

  useEffect(() => {
    const q = city.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
  
    const t = window.setTimeout(async () => {
      try {
        suggestAbortRef.current?.abort();
        const controller = new AbortController();
        suggestAbortRef.current = controller;
  
        setSuggestLoading(true);
  
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=7`, {
          signal: controller.signal,
        });
  
        if (!res.ok) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
  
        const data = await res.json();
        const results: GeoSuggestion[] = Array.isArray(data?.results) ? data.results : [];
  
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
  
    return () => window.clearTimeout(t);
  }, [city]);
  const handleSuggestionPick = async (s: GeoSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setShowRecentSearches(false);
  
    suggestAbortRef.current?.abort();
  
    await fetchByCoordinates(s.lat, s.lon);
  
    setCity("");
  
    // ✅ مهم جدًا: خلي الـ input يطلع من focus
    searchInputRef.current?.blur();
  };
  
  
  
    
  // ----------------------------
  // Fetch helpers
  // ----------------------------
  const resetResults = () => {
    setWeather(null);
    setForecast([]);
  };

  const fetchByCity = async (cityName: string) => {
    setLoading(true);
    setError("");
    resetResults();

    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(cityName)}`);

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

      saveRecentSearch(cityName.trim());

      const forecastRes = await fetch(`/api/forecast?city=${encodeURIComponent(cityName)}`);
      if (forecastRes.ok) {
        const forecastData: ForecastDay[] = await forecastRes.json();
        setForecast(forecastData);
      }
    } catch (err) {
      console.error(err);
      setError("Unexpected error fetching weather.");
    } finally {
      setLoading(false);
      setShowRecentSearches(false);
    }
  };

  const fetchByCoordinates = async (lat: number, lon: number) => {
    setLoading(true);
    setError("");
    resetResults();

    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);

      if (!res.ok) {
        setError("Could not fetch weather data for your location. Please try again.");
        return;
      }

      const weatherData: WeatherData = await res.json();
      setWeather(weatherData);

      if (weatherData.city) {
        // setCity(weatherData.city);
        saveRecentSearch(weatherData.city);
      }

      const forecastRes = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
      if (forecastRes.ok) {
        const forecastData: ForecastDay[] = await forecastRes.json();
        setForecast(forecastData);
      }
    } catch (err) {
      console.error(err);
      setError("Unexpected error fetching weather.");
    } finally {
      setLoading(false);
      setShowRecentSearches(false);
    }
  };

  // ----------------------------
  // Search handlers
  // ----------------------------
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const trimmed = city.trim();
    if (!trimmed) {
      setError("Please enter a city name.");
      return;
    }
  
    await fetchByCity(trimmed);
  
    // ✅ امسح input + سكّر القوائم
    setCity("");
    setShowSuggestions(false);
    setShowRecentSearches(false);
  
    // ✅ blur عشان click واحد يفتح recent بعد البحث
    searchInputRef.current?.blur();
  };
  
  

  const handleRecentSearchClick = async (searchTerm: string) => {
    // سكّر القوائم فورًا
    setShowRecentSearches(false);
    setShowSuggestions(false);
    setSuggestions([]);
  
    // اقطع أي طلب suggest شغّال (لو موجود)
    suggestAbortRef.current?.abort();
  
    // نفّذ البحث مباشرة
    await fetchByCity(searchTerm);
  
    // ✅ فضّي input بعد البحث
    setCity("");
  };
  

  // ----------------------------
  // Location prompt logic
  // ----------------------------
  useEffect(() => {
    // On first mount: decide whether to show prompt / auto-fetch
    try {
      const saved = localStorage.getItem(LOCATION_PROMPT_KEY) as
        | "allow"
        | "deny"
        | null;

      if (saved === "allow") {
        // Auto-try location on subsequent visits
        if (!navigator.geolocation) {
          setError("Geolocation is not supported by your browser. Please search for a city instead.");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => fetchByCoordinates(pos.coords.latitude, pos.coords.longitude),
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setError("Location permission was denied. You can search for a city instead.");
            } else {
              setError("Unable to get your location. Please search for a city instead.");
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        return;
      }

      if (saved === "deny") {
        // Do nothing → user sees EmptyState
        return;
      }

      // No saved choice → show modal
      setShowLocationPrompt(true);
    } catch {
      setShowLocationPrompt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocationYes = () => {
    setShowLocationPrompt(false);

    try {
      localStorage.setItem(LOCATION_PROMPT_KEY, "allow");
    } catch { }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please search for a city instead.");
      return;
    }

    setError("");
    setLoading(true);
    resetResults();

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchByCoordinates(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setLoading(false);

        try {
          localStorage.setItem(LOCATION_PROMPT_KEY, "deny");
        } catch { }

        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission was denied. You can search for a city instead.");
        } else {
          setError("Unable to get your location. Please search for a city instead.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLocationNo = () => {
    setShowLocationPrompt(false);
    try {
      localStorage.setItem(LOCATION_PROMPT_KEY, "deny");
    } catch { }
  };

  // ----------------------------
  // Display values
  // ----------------------------
  const displayCity = weather?.city && weather?.countryName ? `${weather.city}, ${weather.countryName}` : "";
  const displayDescription = weather?.description ?? "";

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
    weather?.humidity !== null && weather?.humidity !== undefined ? `${weather.humidity}%` : "–";

    const displayWind =
    weather?.windSpeed !== null && weather?.windSpeed !== undefined
      ? unit === "C"
        ? `${Math.round(weather.windSpeed)} km/h`
        : `${Math.round(weather.windSpeed * 2.23694)} mph`
      : "–";
  
  

  const isInitialView = !weather && !loading && !error && !showLocationPrompt;
  const displayHeroDescription = useMemo(() => {
    // If we have forecast high, use it (more like Figma)
    const todayHigh = forecast?.[0]?.high;
  
    const highText =
      todayHigh !== null && todayHigh !== undefined
        ? unit === "C"
          ? `${Math.round(todayHigh)}°C`
          : `${Math.round((todayHigh * 9) / 5 + 32)}°F`
        : unit === "C"
        ? "—°C"
        : "—°F";
  
    // Normalize condition text
    const raw = (weather?.description ?? "").trim().toLowerCase();
  
    let phrase = "Mostly clear";
    if (raw.includes("rain") || raw.includes("shower")) phrase = "Rainy";
    else if (raw.includes("storm") || raw.includes("thunder")) phrase = "Stormy";
    else if (raw.includes("snow")) phrase = "Snowy";
    else if (raw.includes("fog") || raw.includes("mist") || raw.includes("haze")) phrase = "Foggy";
    else if (raw.includes("cloud")) phrase = "Mostly cloudy";
    else if (raw.includes("clear")) phrase = "Mostly clear";
  
    return `${phrase} with a high of ${highText}`;
  }, [weather?.description, forecast, unit]);
  
  // ----------------------------
  // UI
  // ----------------------------
  return (
    <main className="min-h-screen bg-[#0F1417] text-white">
      {/* Header full width */}
      <header className="sticky top-0 z-50 w-full bg-[#0F1417]/90 backdrop-blur border-b border-[#E5E8EB33]">
      <div className="h-12 px-4 sm:px-6 flex items-center justify-between">
          {/* Left: icon + title (gap 16px) */}
          <div className="flex items-center gap-4">
            <img
              src="/Headerlogo.png"
              alt="Weather App Logo"
              className="w-4 h-4"
            />
            <span className="font-grotesk font-bold text-[18px] leading-[23px] tracking-[0px] text-white">
              Weather App
            </span>
          </div>

          {/* Right: toggle + icon (gap 16px) */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setUnit((prev) => (prev === "C" ? "F" : "C"))}
              className="w-[27px] h-[23px] font-grotesk font-bold text-[18px] leading-[23px] tracking-[0px] text-white select-none"
              aria-label="Toggle temperature unit"
            >
              {unit === "C" ? "°C" : "°F"}
            </button>

            <img
              src="/icon.png"
              alt="Temperature Icon"
              className="w-[25px] h-[25px]"
            />
          </div>
        </div>
      </header>


      {/* Location prompt modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={handleLocationNo} />

          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#151A20] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Use your current location?</h3>
            <p className="mt-2 text-sm text-gray-300">
              We can show local weather automatically. You can change this later in your browser settings.
            </p>

            <div className="mt-5 flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleLocationNo}
                className="rounded-full px-5 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 transition"
              >
                Not now
              </button>

              <button
                type="button"
                onClick={handleLocationYes}
                className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition"
              >
                Use location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-3">
      <div className="mx-auto w-full max-w-full sm:max-w-5xl flex flex-col">
      <div className="w-full px-0 sm:px-6 py-5">
            <div className="mx-auto w-full max-w-[1440px] space-y-6 sm:space-y-8">


              {/* Search Bar */}
              <section className="w-full">
                {/* Container 1 */}
                <div className="w-full px-4 py-1">
                  {/* Container 2 */}
                  <form onSubmit={handleSearch}>
                    <div className="flex h-12 w-full min-w-[160px] rounded-xl bg-[#26303B]">

                      {/* Icon container */}
                      <div className="flex h-12 w-10 min-w-[40px] items-center pl-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.8"
                          stroke="currentColor"
                          className="w-6 h-6 text-[#99ABBD]"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
                          />
                        </svg>
                      </div>

                      {/* Input */}
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={city}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCity(v);
                        
                          if (v.trim().length >= 2) {
                            setShowSuggestions(true);
                            setShowRecentSearches(false);
                          } else {
                            setShowSuggestions(false);
                            setShowRecentSearches(recentSearches.length > 0);
                          }
                        }}
                        //Optin A  ? ?? ?
                        onClick={() => {
                          // إذا فاضي، افتح recent مباشرة
                          if (city.trim().length === 0 && recentSearches.length > 0) {
                            setShowRecentSearches(true);
                            setShowSuggestions(false);
                          }
                        }}
                        
                        onFocus={() => {
                          if (city.trim().length >= 2) {
                            setShowSuggestions(true);
                            setShowRecentSearches(false);
                          } else {
                            setShowRecentSearches(recentSearches.length > 0);
                            setShowSuggestions(false);
                          }
                        }}
                        
                        placeholder="Search for a city"
                        className="
                      h-12 w-full bg-transparent
                      py-2 pr-4 pl-2
                      font-grotesk font-normal
                      text-[16px] leading-[24px] tracking-[0px]
                      text-white placeholder:text-[#99ABBD]
                      outline-none
                    "
                      />
                    </div>
                    {/* Geo suggestions dropdown */}
                    {/* Suggestions Dropdown */}
                    {(showSuggestions || showRecentSearches) && (
                  <div ref={suggestBoxRef} className="relative">
                    <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-700 bg-[#26303B] shadow-lg overflow-hidden">
                      
                      {/* Header */}
                      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-400">
                          {showSuggestions ? "Suggestions" : "Recent Searches"}
                        </span>

                        {!showSuggestions && recentSearches.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearRecentSearches}
                            className="text-xs text-gray-500 hover:text-gray-300 transition"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Body */}
                      <div className="max-h-72 overflow-y-auto">
                        {/* Suggestions */}
                        {showSuggestions && (
                          <>
                            {suggestLoading ? (
                              <div className="px-4 py-3 text-sm text-[#99ABBD]">Searching…</div>
                            ) : suggestions.length > 0 ? (
                              suggestions.map((s, idx) => (
                                <button
                                  key={`${s.lat}-${s.lon}-${idx}`}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // مهم: يمنع blur ويمنع تغيّر العناصر قبل الالتقاط
                                    handleSuggestionPick(s);
                                  }}
                                  
                                  className="w-full px-4 py-3 text-left text-base text-white hover:bg-gray-800/50 transition"
                                >
                                  {s.label}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-[#99ABBD]">No matches.</div>
                            )}
                          </>
                        )}

                        {/* Recent searches */}
                        {showRecentSearches && !showSuggestions && (
                          <>
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
                                  viewBox="0 0 24 24"
                                  strokeWidth="2"
                                  stroke="currentColor"
                                  className="w-4 h-4 text-gray-400"
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}                    
              </form>
              </div>
              </section>


              {/* Main content */}
              {isInitialView ? (
                <EmptyState />
              ) : error ? (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-200">
                  {error}
                </div>
              ) : loading ? (
                <div className="rounded-2xl border border-gray-700/60 bg-[#26303B] p-6 text-center text-gray-300">
                  Loading weather data...
                </div>
              ) : weather ? (
                <>
                  {/* Current weather section */}
                  {/* City Title */}
                  <section className="w-full px-4 pt-0 pb-3">
                    <h1
                      className="
                          w-full text-center
                          font-grotesk font-bold
                          text-[24px] sm:text-[32px] leading-[30px] sm:leading-[40px]
                          text-white
                        "
                    >
                      {displayCity}
                    </h1>
                  </section>
                  
                  {/* Weather description + icon */}
                  <section className="w-full px-4 pt-2 pb-3">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">

                  <img
                    src={getWeatherIconSrc(weather?.icon)}
                    alt={weather?.description ? `${weather.description} icon` : "Weather icon"}
                    className="w-[52px] h-[52px] shrink-0"
                  />

                  <p className="text-center font-grotesk font-normal text-[14px] sm:text-[16px] leading-[22px] sm:leading-[24px] text-[#99ABBD] max-w-[560px]">

                    {displayHeroDescription}
                  </p>
                </div>
              </section>


              {/* Small info cards */}
              <section className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                <div className="rounded-3xl border border-gray-700/70 bg-[#26303B] p-4 sm:p-6 text-center lg:text-left">
                <p className="font-grotesk font-normal text-[16px] leading-[24px] text-gray-300">Humidity</p>
                  <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-white">{displayHumidity}</p>
                  <p className="mt-2 text-xs text-gray-400">Cloud</p>
                </div>

                <div className="rounded-3xl border border-gray-700/70 bg-[#26303B] p-4 sm:p-6 text-center lg:text-left">
                  <p className="font-grotesk font-normal text-[16px] leading-[24px] text-gray-300">Wind</p>
                  <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-white">{displayWind}</p>
                  <p className="mt-2 text-xs text-gray-400">Wind</p>
                </div>

                <div className="rounded-3xl border border-gray-700/70 bg-[#26303B] p-4 sm:p-6 text-center lg:text-left">
                  <p className="font-grotesk font-normal text-[16px] leading-[24px] text-gray-300">Feels like</p>
                  <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-white">{displayFeelsLike}</p>
                  <p className="mt-2 text-xs text-gray-400">Thermometer</p>
                </div>
              </section>

              {/* 5-Day Forecast */}
             {/* 5-Day Forecast title (Figma) */}
            <section className="w-full h-[23px] px-4 pt-5 pb-3">
              <h2
                className="
                  w-full
                  font-grotesk font-bold
                  text-[18px] sm:text-[22px] leading-[24px] sm:leading-[28px]
                  tracking-[0px]
                  text-white
                "
              >
                5-Day Forecast
              </h2>
            </section>
            <section>

                  <div className="mt-3 rounded-2xl border border-gray-700/60 bg-[#0F1417] overflow-hidden">
              <div className="w-full overflow-x-auto">
                  <table className="min-w-[720px] w-full text-sm sm:text-base border-collapse">
                  <thead className="font-grotesk font-normal text-[16px] leading-[24px]">
                      <tr className="border-b border-gray-700 bg-[#1C2129]">
                        <th className="py-2 sm:py-4 pl-4 sm:pl-6 pr-3 sm:pr-4 text-left font-medium text-white">Day</th>
                        <th className="px-4 py-3 sm:py-4 text-left font-medium text-white">High / Low</th>
                        <th className="py-3 sm:py-4 pr-6 pl-4 text-left font-medium text-white">Condition</th>
                        <th></th>
                      </tr>
                    </thead>

                  <tbody>
                  {forecast.map((item, index) => (
                    <tr
                      key={item.date}
                      className={`border-t border-[#E5E8EB33] ${index === 0 ? "border-t-0" : ""}`}
                    >
                      <td className="pl-6 pr-4 py-3 sm:py-4 font-grotesk font-normal text-[16px] leading-[24px] text-white">
                    {item.dayName}
                      </td>
                      <td className="px-4 py-3 sm:py-4 font-grotesk font-normal text-[16px] leading-[24px] text-[#99ABBD]">
                        {item.high !== null && item.low !== null ? (
                          unit === "C"
                            ? `${Math.round(item.high)}°C / ${Math.round(item.low)}°C`
                            : `${Math.round((item.high * 9) / 5 + 32)}°F / ${Math.round(
                                (item.low * 9) / 5 + 32
                              )}°F`
                        ) : (
                          "–"
                        )}
                      </td>

                      <td className="py-3 sm:py-4 pr-6 pl-4 font-grotesk font-normal text-[16px] leading-[24px]">
                        <span className="capitalize text-[#99ABBD]">{item.condition || "—"}</span>
                      </td>

                      <td className="py-4 pr-6 pl-4 text-center">
                        {(() => {
                          const iconSrc = getWeatherIconSrc(item.icon);
                          if (!iconSrc) return <span className="text-[#99ABBD]">—</span>;
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
                    <tr className="border-t border-[#E5E8EB33]">
                      <td colSpan={4} className="py-4 pl-6 pr-6 text-sm text-[#99ABBD]">
                        No forecast available for this search.
                      </td>
                    </tr>
                  )}
                </tbody>

                  </table>
                </div>
                </div>
              </section>

            </>
            ) : (
            <div className="rounded-2xl border border-gray-700/60 bg-[#26303B] p-6 text-center text-gray-300">
              Loading weather data...
            </div>
          )}
          </div>
        </div>
        {/* Footer */}
        <footer className="mt-10 text-center">
          <p className="text-m text-gray-400">&copy; 2026 Weather App. All rights reserved.</p>
        </footer>
      </div>
    </div>
    </main >
  );
}
