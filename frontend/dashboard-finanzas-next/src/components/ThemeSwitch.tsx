"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { FiSun, FiMoon } from "react-icons/fi";

export default function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <div
      className="relative w-16 h-8 flex items-center bg-slate-300 dark:bg-[#222] rounded-full p-1 cursor-pointer shadow-inner transition-colors duration-300"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* ☀️ Icono Sol */}
      <span className="text-yellow-500 z-10 ml-0.5 text-lg"><FiSun /></span>
      
      {/* ⚪️ El círculo que se mueve */}
      <div
        className={`absolute bg-white dark:bg-[#FFB7C5] w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
          isDark ? "translate-x-8" : "translate-x-0"
        }`}
      />
      
      {/* 🌙 Icono Luna */}
      <span className="text-slate-400 dark:text-slate-100 z-10 ml-auto mr-0.5 text-lg"><FiMoon /></span>
    </div>
  );
}