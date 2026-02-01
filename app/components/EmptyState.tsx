import React from "react";

export default function EmptyState() {
  return (
    <section className="rounded-3xl border border-gray-700/70 bg-[#26303B] p-6 sm:p-10 text-center relative overflow-hidden">
      {/* Ambient animated blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-24 h-56 w-56 rounded-full bg-white/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl animate-pulse" />
      </div>

      {/* Animated icon */}
      {/* Animated icon */}
      <div className="relative mx-auto mb-6 h-28 w-28 sm:h-32 sm:w-32">
        {/* soft glow ring */}
        <div className="absolute inset-0 rounded-full bg-sky-500/10 blur-2xl animate-pulse" />

        {/* floating badge */}
        <div className="absolute inset-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center
                        animate-[float_3.5s_ease-in-out_infinite]">
          <span className="text-5xl sm:text-6xl">🌤️</span>
        </div>
      </div>


      <h2 className="relative text-2xl sm:text-3xl font-bold text-white tracking-tight">
  Find weather in seconds
</h2>
<p className="relative mt-2 text-sm sm:text-base text-[#99ABBD]">
  Search for a city above — or use your current location.
</p>

      {/* Static info */}
      <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-gray-300">🌡️ Real-time temperature</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-gray-300">📅 5-day forecast</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-gray-300">🕘 Recent searches</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-gray-300">📍 Use my location</p>
        </div>
      </div>

      <p className="relative mt-6 text-xs text-gray-400">
        Try: Amman, London, Tokyo
      </p>
    </section>
  );
}
