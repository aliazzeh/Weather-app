"use client";

import React, { useEffect, useState } from "react";
import { getTheme, toggleTheme } from "./ThemeProvider";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isRTL, setIsRTL] = useState(false);

  // sync theme + dir (حتى لو تغيّر بدون rerender)
  useEffect(() => {
    const sync = () => {
      setTheme(getTheme());
      setIsRTL(document.documentElement.dir === "rtl");
    };

    sync();

    // راقب تغيّر dir/class على html
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir", "class"],
    });

    return () => obs.disconnect();
  }, []);

  const onToggle = () => {
    toggleTheme();
    setTheme(getTheme());
  };

  // بدل translate: استخدم left/right (مضمون مع RTL)
  const knobOnDark = theme === "dark";

  // في LTR: dark -> right, light -> left
  // في RTL: dark -> left, light -> right
  const knobLeft =
    (isRTL && knobOnDark) || (!isRTL && !knobOnDark); // الحالات اللي لازم تكون LEFT
  const knobPosClass = knobLeft ? "left-1" : "right-1";

  return (
    <button
      type="button"
      onClick={onToggle}
      className="
        inline-flex items-center gap-2
        rounded-full border border-(--border)
        bg-(--surface) px-3 py-1.5
        select-none
      "
      aria-label="Toggle theme"
    >
      {/* النص ما يتغطى أبداً */}
      <span
        className={`
          min-w-[44px] text-center
          font-grotesk font-bold text-[14px] leading-[20px]
          ${theme === "dark" ? "text-(--muted)" : "text-(--text)"}
        `}
      >
        {theme === "dark" ? "Dark" : "Light"}
      </span>

      {/* السويتش */}
      <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-black/10 dark:bg-white/15">
        <span
          className={`absolute top-1 ${knobPosClass} h-4 w-4 rounded-full bg-(--accent) transition-all`}
        />
      </span>
    </button>
  );
}
