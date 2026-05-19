"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiPieChart, FiTrendingUp, FiAlertTriangle, FiMenu, FiX, FiBell, FiCreditCard } from "react-icons/fi";
import { useCurrency } from "../../app/context/CurrencyContext";
import { useNotifications } from "../../app/context/NotificationContext";
import ThemeSwitch from "./ThemeSwitch";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { currency, setCurrency } = useCurrency();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click outside to close notifications dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowNotifPopover(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Cast icons
  const PieIcon = FiPieChart as any;
  const TrendingIcon = FiTrendingUp as any;
  const AlertIcon = FiAlertTriangle as any;
  const BellIcon = FiBell as any;
  const CreditCardIcon = FiCreditCard as any;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-slate-200 dark:border-[#2a2a2a] px-6 lg:px-12 py-4">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-2xl">🌸</span>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
              Finanzas<span className="text-pink-500 dark:text-[#FFB7C5]">Sakura</span>
            </h1>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-2 lg:gap-6 ml-10 flex-1">
          <Link href="/">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 cursor-pointer ${pathname === "/" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
              <PieIcon className="text-lg" />
              <span>Dashboard</span>
            </div>
          </Link>
          <Link href="/inversiones">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 cursor-pointer ${pathname === "/inversiones" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
              <TrendingIcon className="text-lg" />
              <span>Inversiones</span>
            </div>
          </Link>
          <Link href="/alertas">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 cursor-pointer ${pathname === "/alertas" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
              <AlertIcon className="text-lg" />
              <span>Gastos Hormiga</span>
            </div>
          </Link>
          <Link href="/deudas">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 cursor-pointer ${pathname === "/deudas" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
              <CreditCardIcon className="text-lg" />
              <span>Deudas</span>
            </div>
          </Link>
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-6">
          {/* Notifications Bell */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all hover:bg-slate-100 dark:hover:bg-[#1a1a1a] cursor-pointer flex items-center justify-center"
            >
              <BellIcon className="text-xl" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0a0a0a] animate-pulse"></span>
              )}
            </button>

            {showNotifPopover && (
              <div className="absolute right-0 mt-3 w-80 max-h-[400px] overflow-y-auto bg-white/95 dark:bg-[#111]/95 backdrop-blur-xl border border-slate-200 dark:border-[#2a2a2a] shadow-2xl rounded-2xl p-4 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#222]">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    Notificaciones
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                        {unreadCount}
                      </span>
                    )}
                  </h4>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-[10px] font-extrabold text-pink-500 hover:text-pink-600 dark:text-[#FFB7C5] dark:hover:text-[#ffa0b3]"
                    >
                      Leer todo
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                      No tienes notificaciones
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          n.read
                            ? "bg-slate-50/50 dark:bg-[#1a1a1a]/30 border-slate-100 dark:border-[#222]/40 opacity-70"
                            : "bg-pink-50/20 dark:bg-[#FFB7C5]/5 border-[#FFB7C5]/10 hover:border-[#FFB7C5]/20"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h5 className="font-bold text-xs text-slate-800 dark:text-white leading-tight">
                            {n.title}
                          </h5>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mb-1">
                          {n.message}
                        </p>
                        <span className="text-[8px] text-slate-400 font-semibold">
                          {new Date(n.date).toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <button
                    onClick={() => clearAll()}
                    className="text-center text-[10px] font-bold text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 pt-2 border-t border-slate-100 dark:border-[#222] mt-1 cursor-pointer"
                  >
                    Borrar todas
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex bg-slate-100 dark:bg-[#111] rounded-xl p-1 relative border border-slate-200 dark:border-[#222]">
            {(["ARS", "USD", "EUR"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${currency === c ? "bg-white dark:bg-[#222] text-pink-500 dark:text-[#FFB7C5] shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <ThemeSwitch />
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center gap-4">
          {/* Mobile Bell Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all hover:bg-slate-100 dark:hover:bg-[#1a1a1a] cursor-pointer flex items-center justify-center"
            >
              <BellIcon className="text-xl" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0a0a0a] animate-pulse"></span>
              )}
            </button>
            
            {showNotifPopover && (
              <div className="absolute right-[-60px] mt-3 w-72 max-h-[350px] overflow-y-auto bg-white dark:bg-[#111] border border-slate-200 dark:border-[#2a2a2a] shadow-2xl rounded-2xl p-4 z-50 flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#222]">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    Notificaciones
                  </h4>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-[10px] font-extrabold text-pink-500 hover:text-pink-600 dark:text-[#FFB7C5]"
                    >
                      Leer todo
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                      No tienes notificaciones
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => { markAsRead(n.id); setShowNotifPopover(false); }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          n.read
                            ? "bg-slate-50/50 dark:bg-[#1a1a1a]/30 border-slate-100 dark:border-[#222]/40 opacity-70"
                            : "bg-pink-50/20 dark:bg-[#FFB7C5]/5 border-[#FFB7C5]/10"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h5 className="font-bold text-xs text-slate-800 dark:text-white leading-tight">
                            {n.title}
                          </h5>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mb-1">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={() => clearAll()}
                    className="text-center text-[10px] font-bold text-slate-400 hover:text-red-500 pt-2 border-t border-slate-100 dark:border-[#222]"
                  >
                    Borrar todas
                  </button>
                )}
              </div>
            )}
          </div>

          <ThemeSwitch />
          <button onClick={() => setIsOpen(!isOpen)} className="text-slate-700 dark:text-slate-300 text-2xl">
            {isOpen ? <span className="text-2xl"><FiX /></span> : <span className="text-2xl"><FiMenu /></span>}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-[#2a2a2a] shadow-xl p-6 flex flex-col gap-6 animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-2">
            <Link href="/" onClick={() => setIsOpen(false)}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${pathname === "/" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500"}`}>
                <PieIcon className="text-xl" />
                <span>Dashboard</span>
              </div>
            </Link>
            <Link href="/inversiones" onClick={() => setIsOpen(false)}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${pathname === "/inversiones" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500"}`}>
                <TrendingIcon className="text-xl" />
                <span>Inversiones</span>
              </div>
            </Link>
            <Link href="/alertas" onClick={() => setIsOpen(false)}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${pathname === "/alertas" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500"}`}>
                <AlertIcon className="text-xl" />
                <span>Gastos Hormiga</span>
              </div>
            </Link>
            <Link href="/deudas" onClick={() => setIsOpen(false)}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${pathname === "/deudas" ? "bg-pink-100 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5] font-semibold" : "text-slate-500"}`}>
                <CreditCardIcon className="text-xl" />
                <span>Deudas</span>
              </div>
            </Link>
          </div>
          
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-[#1a1a1a]">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Moneda Principal</p>
            <div className="flex bg-slate-100 dark:bg-[#111] rounded-xl p-1 relative border border-slate-200 dark:border-[#222]">
              {(["ARS", "USD", "EUR"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => { setCurrency(c); setIsOpen(false); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 cursor-pointer ${currency === c ? "bg-white dark:bg-[#222] text-pink-500 dark:text-[#FFB7C5] shadow-sm" : "text-slate-500"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
