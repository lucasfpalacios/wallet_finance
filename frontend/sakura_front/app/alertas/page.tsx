"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { useNotifications } from "../context/NotificationContext";
import { 
  FiAlertTriangle, 
  FiSettings, 
  FiTrash2, 
  FiPlus, 
  FiX, 
  FiCheckCircle, 
  FiInfo, 
  FiTrendingDown, 
  FiPercent, 
  FiList 
} from "react-icons/fi";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  categoryName?: string;
}

interface Category {
  name: string;
  type: string;
  transactions: Transaction[];
  subcategories: Category[];
}

const DEFAULT_KEYWORDS = [
  "cafe", "café", "kiosco", "uber", "cabify", "didi", "caramelo", "snack", 
  "netflix", "spotify", "starbucks", "helado", "gaseosa", "coca", "pepsi", 
  "alfajor", "panaderia", "factura", "burger", "mc", "fast food", "vending"
];

export default function AlertasPage() {
  const { currency, rates, formatCurrency } = useCurrency();
  const { refreshNotifications } = useNotifications();
  const [wallet, setWallet] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  // Cast icons to avoid Next.js strict typings
  const AlertIcon = FiAlertTriangle as any;
  const SettingsIcon = FiSettings as any;
  const TrashIcon = FiTrash2 as any;
  const PlusIcon = FiPlus as any;
  const XIcon = FiX as any;
  const CheckIcon = FiCheckCircle as any;
  const InfoIcon = FiInfo as any;
  const TrendingIcon = FiTrendingDown as any;
  const ListIcon = FiList as any;

  // Configuration States (loaded from localStorage on client side)
  const [budgetLimitARS, setBudgetLimitARS] = useState<number>(50000);
  const [maxAmountARS, setMaxAmountARS] = useState<number>(8000);
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [includedIds, setIncludedIds] = useState<string[]>([]);

  // Input states for settings forms
  const [inputBudget, setInputBudget] = useState<string>("");
  const [inputMaxAmount, setInputMaxAmount] = useState<string>("");
  const [newKeyword, setNewKeyword] = useState<string>("");
  
  // Tab state for transactions list (Hormigas vs Excluidas vs Todas)
  const [activeListTab, setActiveListTab] = useState<"hormigas" | "todas">("hormigas");

  // Load configurations from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedBudget = localStorage.getItem("hormiga_budget_limit_ars");
      const savedMax = localStorage.getItem("hormiga_max_amount_ars");
      const savedKeywords = localStorage.getItem("hormiga_keywords");
      const savedExcludes = localStorage.getItem("hormiga_excluded_ids");
      const savedIncludes = localStorage.getItem("hormiga_included_ids");

      if (savedBudget) setBudgetLimitARS(Number(savedBudget));
      if (savedMax) setMaxAmountARS(Number(savedMax));
      if (savedKeywords) setKeywords(JSON.parse(savedKeywords));
      if (savedExcludes) setExcludedIds(JSON.parse(savedExcludes));
      if (savedIncludes) setIncludedIds(JSON.parse(savedIncludes));
    }
  }, []);

  useEffect(() => {
    // Fetch transactions from backend
    const fetchWalletData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/report`);
        const data = await res.json();
        setWallet(data);
      } catch (error) {
        console.error("Error fetching transactions for alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, []);

  // Sync inputs when settings load or currency/rates change
  useEffect(() => {
    if (rates[currency]) {
      const currentBudgetConverted = budgetLimitARS / (rates[currency] || 1) * rates[currency];
      const currentMaxConverted = maxAmountARS / (rates[currency] || 1) * rates[currency];

      setInputBudget((budgetLimitARS / rates[currency]).toFixed(0));
      setInputMaxAmount((maxAmountARS / rates[currency]).toFixed(0));
    }
  }, [budgetLimitARS, maxAmountARS, currency, rates]);

  // Recursively extract all expenses
  const allExpenses = useMemo(() => {
    if (!wallet) return [];
    const list: Transaction[] = [];

    const traverse = (cat: any) => {
      if (cat.type === "expense") {
        if (cat.transactions) {
          cat.transactions.forEach((t: any) => {
            list.push({ ...t, categoryName: cat.name });
          });
        }
      }
      if (cat.subcategories) {
        cat.subcategories.forEach(traverse);
      }
    };

    if (wallet.subcategories) {
      wallet.subcategories.forEach(traverse);
    }
    
    // Sort chronologically (newest first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [wallet]);

  // Current month filter YYYY-MM
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  }, []);

  // Filter current month expenses
  const currentMonthExpenses = useMemo(() => {
    return allExpenses.filter(t => t.date.startsWith(currentMonthKey));
  }, [allExpenses, currentMonthKey]);

  // Gastos Hormiga Classifier
  const getClassification = (t: Transaction) => {
    if (includedIds.includes(t.id)) {
      return { isHormiga: true, reason: "Manual" };
    }
    if (excludedIds.includes(t.id)) {
      return { isHormiga: false, reason: "Excluido" };
    }

    const desc = t.description.toLowerCase();
    const matchesKeyword = keywords.some(kw => desc.includes(kw.toLowerCase()));
    
    const isBelowThreshold = t.amount <= maxAmountARS;
    const catNameLower = (t.categoryName || "").toLowerCase();
    
    // Categories that typically contain pocket expenses
    const isMicroExpenseCategory = catNameLower.includes("comida") || 
                                   catNameLower.includes("salidas") || 
                                   catNameLower.includes("transporte") || 
                                   catNameLower.includes("servicios");

    if (matchesKeyword) {
      return { isHormiga: true, reason: "Palabra Clave" };
    }
    if (isBelowThreshold && isMicroExpenseCategory) {
      return { isHormiga: true, reason: "Monto Bajo" };
    }

    return { isHormiga: false, reason: "Ninguno" };
  };

  // Memoized lists of classified expenses
  const classifiedExpenses = useMemo(() => {
    return currentMonthExpenses.map(t => {
      const classification = getClassification(t);
      return {
        ...t,
        isHormiga: classification.isHormiga,
        reason: classification.reason
      };
    });
  }, [currentMonthExpenses, keywords, excludedIds, includedIds, maxAmountARS]);

  const hormigaExpenses = useMemo(() => {
    return classifiedExpenses.filter(t => t.isHormiga);
  }, [classifiedExpenses]);

  // Math Calculations for Hormiga Expenses
  const totalHormigaSpent = useMemo(() => {
    return hormigaExpenses.reduce((sum, t) => sum + t.amount, 0);
  }, [hormigaExpenses]);

  const budgetUsagePercent = useMemo(() => {
    if (budgetLimitARS <= 0) return 0;
    return (totalHormigaSpent / budgetLimitARS) * 100;
  }, [totalHormigaSpent, budgetLimitARS]);

  const averageHormigaSpent = useMemo(() => {
    if (hormigaExpenses.length === 0) return 0;
    return totalHormigaSpent / hormigaExpenses.length;
  }, [hormigaExpenses, totalHormigaSpent]);

  // Projected spending at the end of the month
  const projectedSpent = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    // Get last day of current month
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyAvg = totalHormigaSpent / currentDay;
    return dailyAvg * lastDay;
  }, [totalHormigaSpent]);

  // Save Settings Handlers
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(inputBudget);
    if (!isNaN(parsed) && parsed >= 0) {
      // Input is in current currency, convert to ARS internally
      const convertedARS = parsed * rates[currency];
      setBudgetLimitARS(convertedARS);
      localStorage.setItem("hormiga_budget_limit_ars", String(convertedARS));
      refreshNotifications();
    }
  };

  const handleSaveMaxAmount = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(inputMaxAmount);
    if (!isNaN(parsed) && parsed >= 0) {
      const convertedARS = parsed * rates[currency];
      setMaxAmountARS(convertedARS);
      localStorage.setItem("hormiga_max_amount_ars", String(convertedARS));
      refreshNotifications();
    }
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      const updated = [...keywords, trimmed];
      setKeywords(updated);
      localStorage.setItem("hormiga_keywords", JSON.stringify(updated));
      setNewKeyword("");
      refreshNotifications();
    }
  };

  const handleDeleteKeyword = (kwToDelete: string) => {
    const updated = keywords.filter(kw => kw !== kwToDelete);
    setKeywords(updated);
    localStorage.setItem("hormiga_keywords", JSON.stringify(updated));
    refreshNotifications();
  };

  const handleResetKeywords = () => {
    setKeywords(DEFAULT_KEYWORDS);
    localStorage.setItem("hormiga_keywords", JSON.stringify(DEFAULT_KEYWORDS));
    refreshNotifications();
  };

  // Toggle classification override
  const toggleHormigaStatus = (t: any) => {
    if (t.isHormiga) {
      // Exclude it
      const newExcludes = [...excludedIds, t.id];
      const newIncludes = includedIds.filter(id => id !== t.id);
      setExcludedIds(newExcludes);
      setIncludedIds(newIncludes);
      localStorage.setItem("hormiga_excluded_ids", JSON.stringify(newExcludes));
      localStorage.setItem("hormiga_included_ids", JSON.stringify(newIncludes));
    } else {
      // Include it
      const newIncludes = [...includedIds, t.id];
      const newExcludes = excludedIds.filter(id => id !== t.id);
      setIncludedIds(newIncludes);
      setExcludedIds(newExcludes);
      localStorage.setItem("hormiga_included_ids", JSON.stringify(newIncludes));
      localStorage.setItem("hormiga_excluded_ids", JSON.stringify(newExcludes));
    }
    refreshNotifications();
  };

  // Get Alert Banner Configs
  const alertConfig = useMemo(() => {
    if (budgetUsagePercent >= 100) {
      return {
        color: "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50",
        barColor: "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse",
        title: "¡Presupuesto Superado!",
        desc: "Has excedido el presupuesto límite para tus gastos hormiga este mes. Intenta congelar consumos no esenciales.",
        status: "danger"
      };
    }
    if (budgetUsagePercent >= 85) {
      return {
        color: "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50",
        barColor: "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]",
        title: "Alerta Crítica",
        desc: "Estás a punto de agotar tu presupuesto. Queda muy poco margen para pequeños antojos diarios.",
        status: "warning-high"
      };
    }
    if (budgetUsagePercent >= 60) {
      return {
        color: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
        barColor: "bg-amber-500",
        title: "Advertencia de Fugas",
        desc: "Tus gastos hormiga han superado el 60% de tu meta mensual. Considera moderar los cafecitos y taxis.",
        status: "warning"
      };
    }
    return {
      color: "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50",
      barColor: "bg-green-500",
      title: "Finanzas Bajo Control",
      desc: "¡Excelente! Tus micro-gastos se mantienen estables y dentro de un rango totalmente saludable.",
      status: "safe"
    };
  }, [budgetUsagePercent]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <p className="text-xl font-bold animate-pulse text-pink-500">Cargando alertas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans overflow-x-hidden bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="w-full px-4 sm:px-8 lg:px-12 py-4 sm:py-8 max-w-[100vw]">
        
        {/* Header */}
        <header className="mb-8 sm:mb-12 flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-slate-200 dark:border-[#222] pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-3xl">🐜</span>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Gastos Hormiga</h1>
            </div>
            <p className="text-blue-600 dark:text-[#87CEEB] text-lg font-medium">Controla las fugas silenciosas de tu presupuesto</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-[#222] px-4 py-2.5 rounded-2xl">
            <InfoIcon className="text-pink-500 text-lg shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-tight">
              Detección automática activa
            </span>
          </div>
        </header>

        {/* Top Section: Progress & Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Progress Card (2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-[#111] p-6 sm:p-8 rounded-[2rem] border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">Presupuesto Hormiga</p>
                  <h2 className="text-3xl font-extrabold text-slate-950 dark:text-white">
                    {formatCurrency(totalHormigaSpent)} <span className="text-base font-normal text-slate-400">/ {formatCurrency(budgetLimitARS)}</span>
                  </h2>
                </div>
                <span className={`text-sm font-extrabold px-3 py-1 rounded-full ${budgetUsagePercent >= 100 ? 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-[#222] text-slate-700 dark:text-slate-300'}`}>
                  {budgetUsagePercent.toFixed(1)}% Usado
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-[#222] h-4 rounded-full overflow-hidden mb-6 border border-slate-200/40 dark:border-none">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${alertConfig.barColor}`}
                  style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Alert Message Box */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${alertConfig.color} transition-all duration-300`}>
              <AlertIcon className="text-xl shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm mb-0.5">{alertConfig.title}</h4>
                <p className="text-xs font-medium opacity-90 leading-relaxed">{alertConfig.desc}</p>
              </div>
            </div>
          </div>

          {/* Key Metrics Card (1 col) */}
          <div className="bg-white dark:bg-[#111] p-6 sm:p-8 rounded-[2rem] border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none flex flex-col justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-4">Estadísticas Rápidas</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#1c1c1c] pb-2.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Transacciones</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{hormigaExpenses.length}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#1c1c1c] pb-2.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Gasto Promedio</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(averageHormigaSpent)}</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Proyección Fin de Mes</span>
                  <span className={`text-sm font-bold ${projectedSpent > budgetLimitARS ? 'text-red-500' : 'text-green-500'}`}>
                    {formatCurrency(projectedSpent)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#1a1a1a] p-3 rounded-xl border border-slate-100 dark:border-[#222] flex items-center gap-2 leading-snug">
              <TrendingIcon className="text-pink-500 shrink-0 text-sm" />
              <span>La proyección asume que tu ritmo de micro-compras se mantendrá constante hasta fin de mes.</span>
            </div>
          </div>

        </div>

        {/* Middle Section: Configuration & Table List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Detected Items list (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#111] p-4 sm:p-8 rounded-[2rem] border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none min-h-[480px]">
              
              {/* Table Tabs and Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-100 dark:border-[#222] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Transacciones del Mes</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Revisa y clasifica tus consumos diarios</p>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-[#1a1a1a] rounded-xl p-1 border border-slate-200 dark:border-[#333] max-w-max self-start sm:self-center">
                  <button 
                    onClick={() => setActiveListTab("hormigas")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeListTab === "hormigas" ? 'bg-white dark:bg-[#2a2a2a] text-pink-500 dark:text-[#FFB7C5] shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                  >
                    Gastos Hormiga ({hormigaExpenses.length})
                  </button>
                  <button 
                    onClick={() => setActiveListTab("todas")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeListTab === "todas" ? 'bg-white dark:bg-[#2a2a2a] text-pink-500 dark:text-[#FFB7C5] shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                  >
                    Todos los Gastos ({classifiedExpenses.length})
                  </button>
                </div>
              </div>

              {/* Table Render */}
              {classifiedExpenses.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 dark:bg-[#1a1a1a]/50 rounded-2xl border border-dashed border-slate-200 dark:border-[#333] flex flex-col items-center justify-center">
                  <span className="text-4xl mb-3">💸</span>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Sin transacciones registradas</h4>
                  <p className="text-slate-400 text-xs max-w-xs leading-relaxed">Agrega tus gastos diarios desde el Dashboard principal para activar el análisis.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[550px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#222]">
                        <th className="pb-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha / Detalle</th>
                        <th className="pb-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</th>
                        <th className="pb-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Monto</th>
                        <th className="pb-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Clasificación</th>
                        <th className="pb-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Modificar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeListTab === "hormigas" ? hormigaExpenses : classifiedExpenses).map((t) => {
                        const dateFormatted = new Date(t.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                        
                        return (
                          <tr key={t.id} className="border-b border-slate-50 dark:border-[#151515] hover:bg-slate-50/40 dark:hover:bg-[#161616]/40 transition-colors group">
                            <td className="py-4">
                              <div className="font-bold text-slate-800 dark:text-white text-sm">{t.description}</div>
                              <div className="text-[10px] text-slate-400 font-semibold">{dateFormatted}</div>
                            </td>
                            <td className="py-4">
                              <span className="text-[10px] font-extrabold px-2.5 py-1 bg-slate-100 dark:bg-[#1c1c1c] text-slate-500 dark:text-slate-400 rounded-lg uppercase tracking-wider">
                                {t.categoryName}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <div className="font-extrabold text-slate-900 dark:text-white text-sm">{formatCurrency(t.amount)}</div>
                            </td>
                            <td className="py-4 text-center">
                              {t.isHormiga ? (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  t.reason === "Manual" 
                                    ? "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30" 
                                    : "bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/30"
                                }`}>
                                  🐜 Hormiga ({t.reason})
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 bg-slate-50 dark:bg-[#181818] text-slate-400 dark:text-slate-500 rounded-full">
                                  Estándar
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-center">
                              <button 
                                onClick={() => toggleHormigaStatus(t)}
                                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                                  t.isHormiga 
                                    ? 'bg-white hover:bg-slate-50 dark:bg-[#111] dark:hover:bg-[#222] border-slate-200 dark:border-[#333] text-slate-500 dark:text-slate-400 hover:text-red-500' 
                                    : 'bg-[#FFB7C5]/10 hover:bg-[#FFB7C5]/20 border-[#FFB7C5]/30 text-pink-600 dark:text-[#FFB7C5]'
                                }`}
                              >
                                {t.isHormiga ? "Excluir" : "Marcar Hormiga"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Configuration & Control Panel (1 col) */}
          <div className="space-y-8">
            
            {/* Budgets & Limits Setup */}
            <div className="bg-white dark:bg-[#111] p-6 rounded-[2rem] border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none flex flex-col gap-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-[#222]">
                <SettingsIcon className="text-slate-500 dark:text-slate-400 text-lg" />
                <h3 className="font-bold text-slate-800 dark:text-white">Ajustes de Límite</h3>
              </div>

              {/* Monthly Limit Form */}
              <form onSubmit={handleSaveBudget} className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500">
                  Presupuesto Mensual ({currency})
                </label>
                <div className="flex gap-2">
                  <input 
                    type="number" step="1" required
                    value={inputBudget}
                    onChange={(e) => setInputBudget(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-1 focus:ring-pink-400 transition-all text-sm"
                  />
                  <button 
                    type="submit"
                    className="bg-slate-900 dark:bg-white text-white dark:text-black font-extrabold px-4 py-3 rounded-xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-xs"
                  >
                    Guardar
                  </button>
                </div>
              </form>

              {/* Individual micro expense threshold */}
              <form onSubmit={handleSaveMaxAmount} className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500">
                  Límite por Gasto Hormiga ({currency})
                </label>
                <div className="flex gap-2">
                  <input 
                    type="number" step="1" required
                    value={inputMaxAmount}
                    onChange={(e) => setInputMaxAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-1 focus:ring-pink-400 transition-all text-sm"
                  />
                  <button 
                    type="submit"
                    className="bg-slate-900 dark:bg-white text-white dark:text-black font-extrabold px-4 py-3 rounded-xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-xs"
                  >
                    Guardar
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-snug">
                  Los consumos de categorías clave (ej. comida, salidas) por debajo de este monto calificarán como fugas hormiga automáticamente.
                </p>
              </form>
            </div>

            {/* Keyword tags panel */}
            <div className="bg-white dark:bg-[#111] p-6 rounded-[2rem] border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222] pb-2">
                <div className="flex items-center gap-2">
                  <ListIcon className="text-slate-500 dark:text-slate-400 text-lg" />
                  <h3 className="font-bold text-slate-800 dark:text-white">Palabras Clave</h3>
                </div>
                <button 
                  onClick={handleResetKeywords}
                  className="text-[10px] font-extrabold text-pink-500 hover:text-pink-600 dark:text-[#FFB7C5] dark:hover:text-[#ffa0b3] cursor-pointer"
                >
                  Restaurar
                </button>
              </div>

              {/* Add keyword form */}
              <form onSubmit={handleAddKeyword} className="flex gap-2">
                <input 
                  type="text" required
                  placeholder="Ej. cabify, helado..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-2.5 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-pink-400 transition-all text-xs"
                />
                <button 
                  type="submit"
                  className="bg-pink-500 text-white font-extrabold px-3.5 rounded-xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-sm flex items-center justify-center shrink-0"
                >
                  <PlusIcon />
                </button>
              </form>

              {/* Keywords list tags wrap */}
              <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
                {keywords.map(kw => (
                  <span 
                    key={kw} 
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-slate-50 dark:bg-[#1c1c1c] text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:border-none hover:border-red-200 dark:hover:bg-red-950/20 group"
                  >
                    <span>{kw}</span>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteKeyword(kw)}
                      className="text-slate-400 group-hover:text-red-500 transition-colors"
                    >
                      <XIcon />
                    </button>
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
