"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../components/EmptyState";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useTranslations } from "next-intl";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import { usePathname } from "next/navigation";

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

// ----------------------------
// Animation
// ----------------------------
const pageFade: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(6px)",
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

const softPop: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

// ----------------------------
// Icons
// ----------------------------
const getWeatherIconSrc = (iconCode?: string | null) => {
  const code = (iconCode ?? "").slice(0, 2);

  switch (code) {
    case "01":
      return "/weather-icons/sunny.png";
    case "02":
      return "/weather-icons/partly-cloudy.png";
    case "03":
    case "04":
      return "/weather-icons/partly-cloudy.png";
    case "09":
    case "10":
      return "/weather-icons/rainy.svg";
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

// ----------------------------
// Storage
// ----------------------------
const STORAGE_KEY = "weather-app-recent-searches";
const MAX_RECENT_SEARCHES = 10;

const LAST_QUERY_KEY = "weather-app-last-query";
type LastQuery = { type: "city"; city: string } | { type: "coords"; lat: number; lon: number };

const saveLastQuery = (q: LastQuery) => {
  try {
    localStorage.setItem(LAST_QUERY_KEY, JSON.stringify(q));
  } catch {}
};

const loadLastQuery = (): LastQuery | null => {
  try {
    const raw = localStorage.getItem(LAST_QUERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (parsed?.type === "city" && typeof parsed.city === "string") {
      return { type: "city", city: parsed.city };
    }

    if (parsed?.type === "coords" && typeof parsed.lat === "number" && typeof parsed.lon === "number") {
      return { type: "coords", lat: parsed.lat, lon: parsed.lon };
    }

    return null;
  } catch {
    return null;
  }
};

const LOCATION_PROMPT_KEY = "weather-app-location-prompt-choice";

export default function Home() {
  const reduceMotion = useReducedMotion();

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

  const [restoring, setRestoring] = useState(true);

  const t = useTranslations("weather");
  const tApp = useTranslations("app");

  const pathname = usePathname();
  const locale = pathname.startsWith("/ar") ? "ar" : "en";

  const isRTL = locale === "ar";

  const localizeDayName = (day: string) => {
    const key = day.trim().toLowerCase();

    const map: Record<string, string> = {
      sunday: t("days.sun"),
      monday: t("days.mon"),
      tuesday: t("days.tue"),
      wednesday: t("days.wed"),
      thursday: t("days.thu"),
      friday: t("days.fri"),
      saturday: t("days.sat"),
    };

    return map[key] ?? day;
  };

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

  const saveRecentSearch = (searchTerm: string) => {
    const normalizedTerm = searchTerm.trim();
    if (!normalizedTerm) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== normalizedTerm.toLowerCase());
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

  // ----------------------------
  // Suggestions
  // ----------------------------
  useEffect(() => {
    const q = city.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        suggestAbortRef.current?.abort();
        const controller = new AbortController();
        suggestAbortRef.current = controller;

        setSuggestLoading(true);

        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=7&lang=${locale}`, {
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

    return () => window.clearTimeout(timer);
  }, [city, locale]);

  const handleSuggestionPick = async (s: GeoSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setShowRecentSearches(false);

    suggestAbortRef.current?.abort();

    await fetchByCoordinates(s.lat, s.lon);

    setCity("");
    searchInputRef.current?.blur();
  };

  // ----------------------------
  // Refresh behavior: last search
  // ----------------------------
  const getLastSearch = (): string | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const arr = JSON.parse(stored);
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const lastCity = getLastSearch();
    if (lastCity && lastCity.trim().length > 0) {
      fetchByCity(lastCity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localizeCondition = (cond?: string) => {
    const c = (cond ?? "").toLowerCase();
    if (!c) return "—";

    if (c.includes("clear")) return t("conditions.clear");
    if (c.includes("overcast")) return t("conditions.overcast");
    if (c.includes("scattered")) return t("conditions.scattered");
    if (c.includes("broken")) return t("conditions.broken");
    if (c.includes("cloud")) return t("conditions.cloudy");
    if (c.includes("rain") || c.includes("shower")) return t("conditions.rain");
    if (c.includes("snow")) return t("conditions.snow");
    if (c.includes("mist") || c.includes("fog") || c.includes("haze")) return t("conditions.fog");

    return cond!;
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
  
    const trimmed = cityName.trim();
    if (!trimmed) {
      setError(tApp("errors.enterCity"));
      setLoading(false);
      return;
    }
  
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(trimmed)}&lang=${locale}`);
  
      if (!res.ok) {
        const data = await res.json().catch(() => null);
  
        if (data?.details?.cod === "404" || data?.details?.message === "city not found") {
          setError(tApp("errors.cityNotFound"));
        } else {
          setError(tApp("errors.fetchFailed"));
        }
  
        return;
      }
  
      const weatherData: WeatherData = await res.json();
      setWeather(weatherData);
  
      saveLastQuery({ type: "city", city: trimmed });
      saveRecentSearch(trimmed);
  
      const forecastRes = await fetch(`/api/forecast?city=${encodeURIComponent(trimmed)}`);
      if (forecastRes.ok) {
        const forecastData: ForecastDay[] = await forecastRes.json();
        setForecast(forecastData);
      }
    } catch (err) {
      console.error(err);
      setError(tApp("errors.unexpected"));
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
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&lang=${locale}`);
  
      if (!res.ok) {
        setError(tApp("errors.locationFetchFailed"));
        return;
      }
  
      const weatherData: WeatherData = await res.json();
      setWeather(weatherData);
  
      saveLastQuery({ type: "coords", lat, lon });
  
      if (weatherData.city) {
        saveRecentSearch(weatherData.city);
      }
  
      const forecastRes = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
      if (forecastRes.ok) {
        const forecastData: ForecastDay[] = await forecastRes.json();
        setForecast(forecastData);
      }
    } catch (err) {
      console.error(err);
      setError(tApp("errors.unexpected"));
    } finally {
      setLoading(false);
      setShowRecentSearches(false);
    }
  };
  

  // Restore last query
  useEffect(() => {
    const last = loadLastQuery();

    if (!last) {
      setRestoring(false);
      return;
    }

    (async () => {
      if (last.type === "city") {
        await fetchByCity(last.city);
      } else {
        await fetchByCoordinates(last.lat, last.lon);
      }
      setRestoring(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // Search handlers
  // ----------------------------
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = city.trim();
    if (!trimmed) {
      setError(tApp("errors.enterCity"));
      return;
    }

    await fetchByCity(trimmed);

    setCity("");
    setShowSuggestions(false);
    setShowRecentSearches(false);
    searchInputRef.current?.blur();
  };

  const handleRecentSearchClick = async (searchTerm: string) => {
    setShowRecentSearches(false);
    setShowSuggestions(false);
    setSuggestions([]);

    suggestAbortRef.current?.abort();

    await fetchByCity(searchTerm);
    setCity("");
  };

  // ----------------------------
  // Location prompt logic
  // ----------------------------
  useEffect(() => {
    const last = loadLastQuery();
    if (last) return;

    try {
      const saved = localStorage.getItem(LOCATION_PROMPT_KEY) as "allow" | "deny" | null;

      if (saved === "allow") {
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

      if (saved === "deny") return;

      setShowLocationPrompt(true);
    } catch {
      setShowLocationPrompt(true);
    }
  }, []);

  const handleLocationYes = () => {
    setShowLocationPrompt(false);

    try {
      localStorage.setItem(LOCATION_PROMPT_KEY, "allow");
    } catch {}

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
        } catch {}

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
    } catch {}
  };

  // ----------------------------
  // Display values
  // ----------------------------
  const displayCity =
    weather?.city && weather?.countryName
      ? isRTL
        ? `${weather.countryName}، ${weather.city}`
        : `${weather.city}, ${weather.countryName}`
      : "";

  const displayTemp =
    weather?.temp !== null && weather?.temp !== undefined
      ? unit === "C"
        ? `${Math.round(weather.temp)}°C`
        : `${Math.round((weather.temp * 9) / 5 + 32)}°F`
      : "–";

  const displayFeelsLike =
    weather?.feelsLike !== null && weather?.feelsLike !== undefined
      ? unit === "C"
        ? isRTL
          ? `${Math.round(weather.feelsLike)}°م`
          : `${Math.round(weather.feelsLike)}°C`
        : isRTL
          ? `${Math.round((weather.feelsLike * 9) / 5 + 32)}°ف`
          : `${Math.round((weather.feelsLike * 9) / 5 + 32)}°F`
      : "–";

  const displayHumidity =
    weather?.humidity !== null && weather?.humidity !== undefined ? `${weather.humidity}%` : "–";

  const displayWind =
    weather?.windSpeed !== null && weather?.windSpeed !== undefined
      ? unit === "C"
        ? isRTL
          ? `${Math.round(weather.windSpeed)} كم/س`
          : `${Math.round(weather.windSpeed)} km/h`
        : isRTL
          ? `${Math.round(weather.windSpeed * 2.23694)} ميل/س`
          : `${Math.round(weather.windSpeed * 2.23694)} mph`
      : "–";

  const isInitialView = !restoring && !weather && !loading && !error && !showLocationPrompt;

  const todayHigh = forecast?.[0]?.high;

  const displayHeroDescription = useMemo(() => {
    const highText =
      todayHigh !== null && todayHigh !== undefined
        ? unit === "C"
          ? `${Math.round(todayHigh)}°C`
          : `${Math.round((todayHigh * 9) / 5 + 32)}°F`
        : unit === "C"
          ? "—°C"
          : "—°F";

    const raw = (weather?.description ?? "").trim().toLowerCase();

    let phraseKey = "mostlyClear";
    if (raw.includes("rain") || raw.includes("shower")) phraseKey = "rainy";
    else if (raw.includes("storm") || raw.includes("thunder")) phraseKey = "stormy";
    else if (raw.includes("snow")) phraseKey = "snowy";
    else if (raw.includes("fog") || raw.includes("mist") || raw.includes("haze")) phraseKey = "foggy";
    else if (raw.includes("cloud")) phraseKey = "mostlyCloudy";
    else if (raw.includes("clear")) phraseKey = "mostlyClear";

    return t("hero.template", {
      phrase: t(`hero.phrases.${phraseKey}`),
      high: highText,
    });
  }, [weather?.description, todayHigh, unit, t]);

  // ----------------------------
  // UI  text-(--accent) border-(--border)
  // ----------------------------
  return (
    <main className="min-h-screen bg-(--bg) text-(--text)">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-(--header-bg) backdrop-blur border-b border-(--header-line)">
        <div className="h-12 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/Headerlogo.png" alt={tApp("header.logoAlt")} className="w-4 h-4 header-icon-tint"/>
            <span className="font-grotesk font-bold text-[18px] leading-[23px] tracking-[0px] text-(--header-title)">
              {tApp("title")}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle locale={locale} />
            <ThemeToggle />


            <button
              type="button"
              onClick={() => setUnit((prev) => (prev === "C" ? "F" : "C"))}
              className="cursor-pointer w-[27px] h-[23px] font-grotesk font-bold text-[18px] leading-[23px] tracking-[0px] text-(--header-icon) select-none"
              aria-label="Toggle temperature unit"
            >
              {unit === "C" ? "°C" : "°F"}
            </button>

            <img src="/icon2.png" alt={tApp("header.tempIconAlt")} className="w-[25px] h-[25px] header-icon-tint" />
          </div>
        </div>
      </header>

      {/* Location prompt modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={handleLocationNo} />
          <div className="relative w-full max-w-md rounded-2xl border border-(--modal-border) bg-(--modal-bg) p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-(--modal-text)">{tApp("location.title")}</h3>
            <p className="mt-2 text-sm text-(--modal-muted)">{tApp("location.desc")}</p>

            <div className="mt-5 flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleLocationNo}
                className="rounded-full px-5 py-2 text-sm font-medium text-(--modal-muted) hover:opacity-90 transition"
              >
                {tApp("location.notNow")}
              </button>

              <button
                type="button"
                onClick={handleLocationYes}
                className="rounded-full bg-(--accent) px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                {tApp("location.useLocation")}
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
                <div className="w-full px-4 py-1">
                  <form onSubmit={handleSearch}>
                    <div className="flex h-12 w-full min-w-[160px] rounded-xl bg-(--surface) border border-(--border)">
                      <div className="flex h-12 w-10 min-w-[40px] items-center pl-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.8"
                          stroke="currentColor"
                          className="w-6 h-6 text-(--placeholder)"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
                          />
                        </svg>
                      </div>

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
                        onClick={() => {
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
                        placeholder={tApp("search.placeholder")}
                        className="
                          h-12 w-full bg-transparent
                          py-2 pr-4 pl-2
                          font-grotesk font-normal text-[16px]
                          text-(--text) placeholder:text-(--placeholder) outline-none
                        "
                      />
                    </div>

                    {(showSuggestions || showRecentSearches) && (
                      <div ref={suggestBoxRef} className="relative">
                        <div className="absolute z-50 mt-2 w-full rounded-xl border border-(--border) bg-(--surface) shadow-lg overflow-hidden">
                          <div className="px-4 py-2 border-b border-(--border) flex items-center justify-between">
                            <span className="text-sm font-medium text-(--muted)">
                              {showSuggestions ? tApp("search.suggestions") : tApp("search.recentSearches")}
                            </span>

                            {!showSuggestions && recentSearches.length > 0 && (
                              <button
                                type="button"
                                onClick={handleClearRecentSearches}
                                className="text-xs text-(--muted-2) hover:text-(--text) transition"
                              >
                                {tApp("search.clear")}
                              </button>
                            )}
                          </div>

                          <div className="max-h-72 overflow-y-auto">
                            {showSuggestions && (
                              <>
                                {suggestLoading ? (
                                  <div className="px-4 py-3 text-sm text-(--muted-2)">
                                    {tApp("search.searching")}
                                  </div>
                                ) : suggestions.length > 0 ? (
                                  suggestions.map((s, idx) => (
                                    <button
                                      key={`${s.lat}-${s.lon}-${idx}`}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSuggestionPick(s);
                                      }}
                                      className="w-full px-4 py-3 text-left text-base text-(--text) hover:bg-black/5 dark:hover:bg-white/5 transition"
                                    >
                                      {s.label}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-sm text-(--muted-2)">
                                    {tApp("search.noMatches")}
                                  </div>
                                )}
                              </>
                            )}

                            {showRecentSearches && !showSuggestions && (
                              <>
                                {recentSearches.map((search, index) => (
                                  <button
                                    key={`${search}-${index}`}
                                    type="button"
                                    onClick={() => handleRecentSearchClick(search)}
                                    className="w-full px-4 py-3 text-left text-base text-(--text) hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-3"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth="2"
                                      stroke="currentColor"
                                      className="w-4 h-4 text-(--muted)"
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
              <AnimatePresence mode="wait">
                {isInitialView ? (
                  <motion.div
                    key="empty"
                    initial={reduceMotion ? false : "hidden"}
                    animate="show"
                    exit="exit"
                    variants={pageFade}
                    className="space-y-6 sm:space-y-8"
                  >
                    <EmptyState />
                  </motion.div>
                ) : error ? (
                  <motion.div
                    key="error"
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    variants={pageFade}
                    className="space-y-6 sm:space-y-8"
                  >
                    <div className="rounded-2xl border border-(--error-border) bg-(--error-bg) p-6 text-center text-(--error-text)">
                      {error}
                    </div>
                  </motion.div>
                ) : loading ? (
                  <motion.div
                    key="loading"
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    variants={pageFade}
                    className="space-y-6 sm:space-y-8"
                  >
                    <div className="rounded-2xl border border-(--border) bg-(--surface) p-6 text-center text-(--muted)">
                      {t("loading")}
                    </div>
                  </motion.div>
                ) : weather ? (
                  <motion.div
                    key="weather"
                    initial={reduceMotion ? false : "hidden"}
                    animate="show"
                    exit="exit"
                    variants={stagger}
                    className="space-y-6 sm:space-y-8"
                  >
                    {/* City Title */}
                    <motion.section variants={rise} className="w-full px-4 pt-0 pb-3">
                      <h1
                        className="
                          w-full text-center
                          font-grotesk font-bold
                          text-[24px] sm:text-[32px] leading-[30px] sm:leading-[40px]
                          text-(--text)
                        "
                        dir={isRTL ? "rtl" : "ltr"}
                      >
                        {displayCity}
                      </h1>
                    </motion.section>

                    {/* Description + icon */}
                    <motion.section variants={softPop} className="w-full px-4 pt-2 pb-3">
                      <div
                        className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 ${
                          isRTL ? "sm:flex-row-reverse" : ""
                        }`}
                      >
                        <motion.img
                          src={getWeatherIconSrc(weather?.icon)}
                          alt={
                            weather?.description
                              ? t("a11y.weatherIconWithDesc", { desc: weather.description })
                              : t("a11y.weatherIcon")
                          }
                          className="w-[52px] h-[52px] shrink-0"
                          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                        />

                        <p className="text-center font-grotesk font-normal text-[14px] sm:text-[16px] leading-[22px] sm:leading-[24px] text-(--muted) max-w-[560px]">
                          {displayHeroDescription}
                        </p>
                      </div>
                    </motion.section>

                    {/* Small cards */}
                    <motion.section variants={stagger} className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                      <motion.div
                        variants={rise}
                        whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="rounded-3xl border border-(--border) bg-(--surface) p-4 sm:p-6 text-center lg:text-left"
                      >
                        <p className="font-grotesk font-normal text-[16px] leading-[24px] text-(--muted)">
                          {t("cards.humidity")}
                        </p>
                        <p className="text-2xl sm:text-3xl font-semibold text-(--text)">{displayHumidity}</p>
                        <p className="mt-2 text-xs text-(--muted-2)">{t("cards.cloud")}</p>
                      </motion.div>

                      <motion.div
                        variants={rise}
                        whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="rounded-3xl border border-(--border) bg-(--surface) p-4 sm:p-6 text-center lg:text-left"
                      >
                        <p className="font-grotesk font-normal text-[16px] leading-[24px] text-(--muted)">
                          {t("cards.wind")}
                        </p>
                        <p className="text-2xl sm:text-3xl font-semibold text-(--text)">{displayWind}</p>
                        <p className="mt-2 text-xs text-(--muted-2)">{t("cards.windSub")}</p>
                      </motion.div>

                      <div className="col-span-2 flex justify-center lg:col-span-1">
                        <motion.div
                          variants={rise}
                          whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 260, damping: 18 }}
                          className="
                            w-[calc(50%-0.5rem)]
                            lg:w-full
                            rounded-3xl border border-(--border)
                            bg-(--surface) p-4 sm:p-6
                            text-center lg:text-left
                          "
                        >
                          <p className="font-grotesk font-normal text-[16px] leading-[24px] text-(--muted)">
                            {t("cards.feelsLike")}
                          </p>
                          <p className="text-2xl sm:text-3xl font-semibold text-(--text)">{displayFeelsLike}</p>
                          <p className="mt-2 text-xs text-(--muted-2)">{t("cards.thermometer")}</p>
                        </motion.div>
                      </div>
                    </motion.section>

                    {/* Forecast */}
                    <section className="w-full h-[23px] px-4 pt-5 pb-3">
                      <h2
                        className="
                          w-full
                          font-grotesk font-bold
                          text-[18px] sm:text-[22px] leading-[24px] sm:leading-[28px]
                          tracking-[0px]
                          text-(--text)
                        "
                      >
                        {t("forecast.title")}
                      </h2>
                    </section>

                    <section>
                      <div className="mt-3 rounded-2xl border border-(-table-border) bg-(--table) overflow-hidden">
                        <div className="w-full overflow-x-auto">
                          <table className="min-w-[720px] w-full text-sm sm:text-base border-collapse">
                            <thead className="font-grotesk font-normal text-[16px] leading-[24px]">
                              <tr className="border-b border-(--border) bg-(--table-head)">
                                <th
                                  className={`py-2 sm:py-4 px-4 font-medium text-(--text) ${
                                    isRTL ? "text-right" : "text-left"
                                  }`}
                                >
                                  {t("forecast.day")}
                                </th>
                                <th
                                  className={`py-2 sm:py-4 px-4 font-medium text-(--text) ${
                                    isRTL ? "text-right" : "text-left"
                                  }`}
                                >
                                  {t("forecast.highLow")}
                                </th>
                                <th
                                  className={`py-2 sm:py-4 px-4 font-medium text-(--text) ${
                                    isRTL ? "text-right" : "text-left"
                                  }`}
                                >
                                  {t("forecast.condition")}
                                </th>
                                <th className="py-2 sm:py-4 px-4"></th>
                              </tr>
                            </thead>

                            <tbody>
                              {forecast.map((item, index) => (
                                <tr
                                  key={item.date}
                                  className={`
                                    border-t border-(--table-border)
                                    bg-(--table-row) dark:bg-transparent
                                    ${index === 0 ? "border-t-0" : ""}
                                  `}
                                >
                                  <td
                                    className={`px-4 py-3 sm:py-4 font-grotesk font-normal text-[16px] leading-[24px] text-(--text) ${
                                      isRTL ? "text-right" : "text-left"
                                    }`}
                                  >
                                    {localizeDayName(item.dayName)}
                                  </td>

                                  <td
                                    className={`px-4 py-3 sm:py-4 font-grotesk font-normal text-[16px] leading-[24px] text-(--text) ${
                                      isRTL ? "text-right" : "text-left"
                                    }`}
                                  >
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

                                  <td
                                    className={`px-4 py-3 sm:py-4 font-grotesk font-normal text-[16px] leading-[24px] text-(--text) ${
                                      isRTL ? "text-right" : "text-left"
                                    }`}
                                  >
                                    <span className="capitalize text-(--muted)">
                                      {localizeCondition(item.condition) || "—"}
                                    </span>
                                  </td>

                                  <td className="py-4 pr-6 pl-4 text-center">
                                    {(() => {
                                      const iconSrc = getWeatherIconSrc(item.icon);
                                      if (!iconSrc) return <span className="text-(--muted)">—</span>;
                                      return (
                                        <img
                                          src={iconSrc}
                                          alt={item.condition || t("forecast.weatherIconAlt")}
                                          className="inline-block h-10 w-10"
                                        />
                                      );
                                    })()}
                                  </td>
                                </tr>
                              ))}

                              {forecast.length === 0 && (
                                <tr className="border-t border-(--border)">
                                  <td colSpan={4} className="py-4 pl-6 pr-6 text-sm text-(--muted)">
                                    {t("forecast.noForecast")}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </section>
                  </motion.div>
                ) : (
                  <div className="rounded-2xl border border-(--border) bg-(--surface) p-6 text-center text-(--muted)">
                    {t("loading")}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <footer className="mt-10 text-center">
            <p className="text-m text-(--muted-2)">{tApp("footer", { year: 2026 })}</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
