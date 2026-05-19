"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiPieChart, FiTrendingUp } from "react-icons/fi";
import { useCurrency } from "../../app/context/CurrencyContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { currency, setCurrency } = useCurrency();

  // Cast icons
  const PieIcon = FiPieChart as any;
  const TrendingIcon = FiTrendingUp as any;

  return (
    <aside className="w-64 h-screen sticky top-0 left-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-r border-slate-200 dark:border-[#2a2a2a] p-6 flex flex-col justify-between hidden lg:flex">
      <div>
        <div className="flex items-center gap-2 mb-10 pl-2">
          <span className="text-3xl">🌸</span>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
            Finanzas<span className="text-pink-500 dark:text-[#FFB7C5]">Sakura</span>
          </h1>
        </div>

        <nav className="space-y-2">
          <Link href="/">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer ${pathname === "/" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1a1a1a]"}`}>
              <PieIcon className="text-xl" />
              <span>Dashboard</span>
            </div>
          </Link>
          <Link href="/inversiones">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer ${pathname === "/inversiones" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1a1a1a]"}`}>
              <TrendingIcon className="text-xl" />
              <span>Inversiones</span>
            </div>
          </Link>
        </nav>
      </div>

      {/* Currency Switcher */}
      <div className="bg-slate-50 dark:bg-[#111] rounded-2xl p-4 border border-slate-200 dark:border-[#222]">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Moneda Principal</p>
        <div className="flex bg-slate-200 dark:bg-[#000] rounded-xl p-1 relative">
          {(["ARS", "USD", "EUR"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 z-10 cursor-pointer ${currency === c ? "bg-white dark:bg-[#222] text-pink-500 dark:text-[#FFB7C5] shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
