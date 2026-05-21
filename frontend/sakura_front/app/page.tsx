"use client";

import React, { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { useCurrency } from "./context/CurrencyContext";
import { useNotifications } from "./context/NotificationContext";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";

const getEmoji = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes("comida") || lower.includes("cena") || lower.includes("super") || lower.includes("mc") || lower.includes("arroz")) return "🍔";
  if (lower.includes("transporte") || lower.includes("bus") || lower.includes("taxi") || lower.includes("colectivo")) return "🚌";
  if (lower.includes("servicios") || lower.includes("luz") || lower.includes("internet")) return "⚡";
  if (lower.includes("salida") || lower.includes("cine") || lower.includes("joda")) return "🍿";
  if (lower.includes("ropa") || lower.includes("zapatillas") || lower.includes("buzo")) return "👟";
  if (lower.includes("farmacia") || lower.includes("medicamento")) return "💊";
  return "💸";
};

const COLORS = [
  "#F472B6", // Deep Pink
  "#38BDF8", // Light Blue
  "#FBBF24", // Amber
  "#34D399", // Emerald
  "#A78BFA", // Purple
  "#FB7185", // Rose
  "#2DD4BF", // Teal
  "#F43F5E", // Rose Red
];

const DEFAULT_KEYWORDS = [
  "cafe", "café", "kiosco", "uber", "cabify", "didi", "caramelo", "snack", 
  "netflix", "spotify", "starbucks", "helado", "gaseosa", "coca", "pepsi", 
  "alfajor", "panaderia", "factura", "burger", "mc", "fast food", "vending"
];

export default function Home() {
  const { formatCurrency, rates } = useCurrency();
  const { refreshNotifications } = useNotifications();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Year navigation and comparative view state for Balance History
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [chartView, setChartView] = useState<"balance" | "details" | "investments" | "debts" | "hormiga">("balance");
  const [investments, setInvestments] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));

  // Tabs and Global Data
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [globalWallet, setGlobalWallet] = useState<any>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");

  // Custom Dropdown States
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setIsCatDropdownOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Edit Modal State
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");
  
  // Success and Delete Modal State
  const [successMessage, setSuccessMessage] = useState("");
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/report?month=${currentMonth}`);
      const data = await res.json();
      setWallet(data);
      
      const globalRes = await fetch(`http://127.0.0.1:8000/api/report`);
      setGlobalWallet(await globalRes.json());
      
      const invRes = await fetch(`http://127.0.0.1:8000/api/investments`);
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvestments(invData.investments || []);
      }
      
      const debtsRes = await fetch(`http://127.0.0.1:8000/api/debts`);
      if (debtsRes.ok) {
        setDebts(await debtsRes.json());
      }
      
      refreshNotifications();

      if (!categoryName && data.subcategories?.length > 0) {
        setCategoryName(data.subcategories[0].name);
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://127.0.0.1:8000/api/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, type: newCatType }),
      });
      if (res.ok) {
        setIsCategoryModalOpen(false);
        setNewCatName("");
        setCategoryName(newCatName);
        await fetchData();
      } else {
        const errData = await res.json();
        alert(errData.detail);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const handlePrevMonth = () => {
    const date = new Date(currentMonth + "-01T12:00:00");
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const date = new Date(currentMonth + "-01T12:00:00");
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const formatMonthYear = (yyyyMM: string) => {
    const [year, month] = yyyyMM.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 15);
    return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date);
  };

  // Smart Auto-categorization
  useEffect(() => {
    if (!description) return;
    const lowerDesc = description.toLowerCase();
    const existingCategories = wallet?.subcategories?.map((c: any) => c.name) || [];
    
    const keywordMap: Record<string, string[]> = {
      'Comida': ['mcdonalds', 'pizza', 'burger', 'comida', 'cena', 'almuerzo', 'super', 'mc', 'arroz', 'carne', 'kiosco'],
      'Transporte': ['uber', 'taxi', 'bus', 'colectivo', 'tren', 'subte', 'transporte', 'nafta', 'estacionamiento'],
      'Servicios': ['luz', 'agua', 'internet', 'gas', 'telefono', 'servicios', 'expensas', 'alquiler'],
      'Salidas': ['cine', 'joda', 'bar', 'salida', 'boliche', 'cerveza', 'tragos', 'teatro'],
      'Ropa': ['ropa', 'zapatillas', 'buzo', 'remera', 'pantalon', 'zapatos', 'campera'],
      'Salud': ['farmacia', 'medicamento', 'medico', 'salud', 'pastillas', 'obra social']
    };

    let matchedCategory = "";
    for (const [cat, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(kw => lowerDesc.includes(kw))) {
        matchedCategory = cat;
        break;
      }
    }

    if (matchedCategory) {
      const exists = existingCategories.find((c: string) => c.toLowerCase() === matchedCategory.toLowerCase());
      if (exists) {
         setCategoryName(exists);
      }
    }
  }, [description, wallet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !categoryName) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description,
          category_name: categoryName,
          date: transactionDate
        }),
      });

      if (res.ok) {
        setAmount("");
        setDescription("");
        await fetchData();
        setSuccessMessage(`¡${activeTab === 'expense' ? 'Gasto' : 'Ingreso'} creado con éxito!`);
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail}`);
      }
    } catch (err) {
      console.error("Error enviando transacción:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/transaction/${transactionToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setTransactionToDelete(null);
        await fetchData();
        setSuccessMessage("Registro eliminado con éxito.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (t: any) => {
    setEditingTransaction(t);
    setEditAmount(t.amount.toString());
    setEditDesc(t.description);
    setEditDate(t.date);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/transaction/${editingTransaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          description: editDesc,
          date: editDate
        }),
      });

      if (res.ok) {
        setEditingTransaction(null);
        await fetchData();
        setSuccessMessage("Registro actualizado correctamente.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = wallet?.subcategories?.filter((c: any) => c.type === "expense").map((cat: any) => {
    const catTotal = cat.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
    return { name: cat.name, value: catTotal };
  }).filter((data: any) => data.value > 0) || [];

  const totalGlobal = chartData.reduce((sum: number, item: any) => sum + item.value, 0);

  // Area Chart Data Computation
  const getMonthlyData = () => {
    const monthsMap: Record<string, { income: number; expense: number; investments: number; debts: number; hormiga: number }> = {};
    
    // Initialize all 12 months of selectedYear with 0
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
      monthsMap[monthStr] = { income: 0, expense: 0, investments: 0, debts: 0, hormiga: 0 };
    }
    
    // Read Gastos Hormiga configuration from localStorage
    const savedMax = typeof window !== "undefined" ? localStorage.getItem("hormiga_max_amount_ars") : null;
    const savedKeywords = typeof window !== "undefined" ? localStorage.getItem("hormiga_keywords") : null;
    const savedExcludes = typeof window !== "undefined" ? localStorage.getItem("hormiga_excluded_ids") : null;
    const savedIncludes = typeof window !== "undefined" ? localStorage.getItem("hormiga_included_ids") : null;

    const maxAmountARS = savedMax ? Number(savedMax) : 8000;
    const keywords: string[] = savedKeywords ? JSON.parse(savedKeywords) : DEFAULT_KEYWORDS;
    const excludedIds: string[] = savedExcludes ? JSON.parse(savedExcludes) : [];
    const includedIds: string[] = savedIncludes ? JSON.parse(savedIncludes) : [];
    
    if (globalWallet) {
      const traverse = (cat: any) => {
        cat.transactions?.forEach((t: any) => {
          const month = t.date.slice(0, 7); // YYYY-MM
          const yr = t.date.slice(0, 4);
          if (yr === String(selectedYear)) {
            if (!monthsMap[month]) {
              monthsMap[month] = { income: 0, expense: 0, investments: 0, debts: 0, hormiga: 0 };
            }
            if (cat.type === "income") {
              monthsMap[month].income += t.amount;
            } else {
              monthsMap[month].expense += t.amount;
              
              // Classify as Gasto Hormiga
              let isHormiga = false;
              if (includedIds.includes(t.id)) {
                isHormiga = true;
              } else if (!excludedIds.includes(t.id)) {
                const desc = (t.description || "").toLowerCase();
                const matchesKeyword = keywords.some((kw) => desc.includes(kw.toLowerCase()));
                const isBelowThreshold = t.amount <= maxAmountARS;
                const catNameLower = (cat.name || "").toLowerCase();
                const isMicroExpenseCategory =
                  catNameLower.includes("comida") ||
                  catNameLower.includes("salidas") ||
                  catNameLower.includes("transporte") ||
                  catNameLower.includes("servicios");

                isHormiga = matchesKeyword || (isBelowThreshold && isMicroExpenseCategory);
              }
              
              if (isHormiga) {
                monthsMap[month].hormiga += t.amount;
              }
            }
          }
        });
        cat.subcategories?.forEach(traverse);
      };
      traverse(globalWallet);
    }

    // Add investments data
    if (Array.isArray(investments)) {
      investments.forEach((inv) => {
        if (inv.date) {
          const month = inv.date.slice(0, 7); // YYYY-MM
          const yr = inv.date.slice(0, 4);
          if (yr === String(selectedYear)) {
            if (!monthsMap[month]) {
              monthsMap[month] = { income: 0, expense: 0, investments: 0, debts: 0, hormiga: 0 };
            }
            monthsMap[month].investments += inv.quantity * inv.purchase_price;
          }
        }
      });
    }

    // Add debts data
    if (Array.isArray(debts)) {
      debts.forEach((debt) => {
        const dateStr = debt.due_date || debt.date || new Date().toISOString().substring(0, 10);
        const month = dateStr.slice(0, 7); // YYYY-MM
        const yr = dateStr.slice(0, 4);
        if (yr === String(selectedYear)) {
          if (!monthsMap[month]) {
            monthsMap[month] = { income: 0, expense: 0, investments: 0, debts: 0, hormiga: 0 };
          }
          // Convert debt to ARS base for chart
          const rate = rates[debt.currency as "ARS" | "USD" | "EUR"] || 1;
          monthsMap[month].debts += debt.amount * rate;
        }
      });
    }
    
    return Object.keys(monthsMap).sort().map(month => {
      const date = new Date(month + "-15");
      return {
        name: new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(date).toUpperCase().replace('.', ''),
        Income: monthsMap[month].income,
        Expenses: monthsMap[month].expense,
        Balance: monthsMap[month].income - monthsMap[month].expense,
        Investments: monthsMap[month].investments,
        Debts: monthsMap[month].debts,
        Hormiga: monthsMap[month].hormiga
      };
    });
  };

  const chartDataArea = getMonthlyData();
  const currentTotalBalance = chartDataArea.reduce((sum, d) => sum + d.Balance, 0);
  const currentTotalIncome = chartDataArea.reduce((sum, d) => sum + d.Income, 0);
  const currentTotalExpenses = chartDataArea.reduce((sum, d) => sum + d.Expenses, 0);
  const currentTotalInvested = chartDataArea.reduce((sum, d) => sum + d.Investments, 0);
  const currentTotalDebts = chartDataArea.reduce((sum, d) => sum + d.Debts, 0);
  const currentTotalHormiga = chartDataArea.reduce((sum, d) => sum + d.Hormiga, 0);

  const getCategoryColor = (categoryName: string) => {
    const lower = categoryName.toLowerCase();
    
    // Semantic Colors based on name
    if (lower.includes("comida") || lower.includes("super") || lower.includes("restaurante") || lower.includes("alimento")) return "#FB7185"; // Coral/Rose
    if (lower.includes("transporte") || lower.includes("auto") || lower.includes("nafta") || lower.includes("viaje")) return "#38BDF8"; // Sky Blue
    if (lower.includes("servicios") || lower.includes("hogar") || lower.includes("luz") || lower.includes("internet") || lower.includes("alquiler")) return "#FBBF24"; // Amber/Gold
    if (lower.includes("salida") || lower.includes("entretenimiento") || lower.includes("cine") || lower.includes("joda")) return "#A78BFA"; // Lavender/Purple
    if (lower.includes("ropa") || lower.includes("shopping") || lower.includes("compras") || lower.includes("belleza")) return "#F472B6"; // Deep Pink
    if (lower.includes("salud") || lower.includes("farmacia") || lower.includes("gimnasio") || lower.includes("medico")) return "#34D399"; // Emerald/Mint
    if (lower.includes("ahorro") || lower.includes("inversion")) return "#066A85"; // Deep Teal
    
    // Fallback: Deterministic color based on name hash
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.15)] min-w-[200px] transition-all">
          <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">{label}</p>
          <div className="flex flex-col gap-2">
            {payload.map((item: any, idx: number) => {
              let name = item.name;
              let colorClass = "text-slate-800 dark:text-slate-100";
              let dotColor = "bg-slate-400";
              
              if (item.dataKey === "Balance") {
                name = "Ahorro Neto";
                colorClass = "text-[#066A85] dark:text-[#87CEEB]";
                dotColor = "bg-[#066A85] dark:bg-[#87CEEB]";
              } else if (item.dataKey === "Income") {
                name = "Ingresos";
                colorClass = "text-emerald-600 dark:text-emerald-400";
                dotColor = "bg-emerald-500";
              } else if (item.dataKey === "Expenses") {
                name = "Gastos";
                colorClass = "text-rose-600 dark:text-rose-400";
                dotColor = "bg-rose-500";
              } else if (item.dataKey === "Investments") {
                name = "Inversiones";
                colorClass = "text-purple-600 dark:text-[#A78BFA]";
                dotColor = "bg-[#A78BFA]";
              } else if (item.dataKey === "Debts") {
                name = "Deudas";
                colorClass = "text-amber-600 dark:text-amber-400";
                dotColor = "bg-amber-500";
              } else if (item.dataKey === "Hormiga") {
                name = "Gastos Hormiga";
                colorClass = "text-[#8B4513] dark:text-[#A0522D]";
                dotColor = "bg-[#8B4513]";
              }
              
              return (
                <div key={idx} className="flex items-center justify-between gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span>{name}:</span>
                  </div>
                  <span className={`font-bold ${colorClass}`}>
                    {formatCurrency(item.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const color = getCategoryColor(data.name);
      return (
        <div className="bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.15)] min-w-[180px] transition-all">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">{data.name}:</span>
            <span className="font-extrabold" style={{ color: color }}>
              {formatCurrency(data.value)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen font-sans overflow-x-hidden">
      <div className="w-full px-4 sm:px-8 lg:px-12 py-4 sm:py-8 max-w-[100vw]">
        <header className="mb-8 sm:mb-12 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 border-b border-slate-200 dark:border-[#222] pb-6">
          <div>
            <p className="text-blue-600 dark:text-[#87CEEB] text-lg font-medium">Bienvenido a tu ecosistema financiero</p>
            <div className="mt-4 flex items-center gap-4 bg-white/40 dark:bg-black/20 w-max px-4 py-2 rounded-full border border-slate-200 dark:border-white/5">
              <button onClick={handlePrevMonth} className="text-slate-500 dark:text-slate-400 hover:text-pink-500 dark:hover:text-[#FFB7C5] transition-colors p-1 text-xl">◀</button>
              <span className="font-semibold text-slate-800 dark:text-white capitalize min-w-[140px] text-center tracking-wide">{formatMonthYear(currentMonth)}</span>
              <button onClick={handleNextMonth} className="text-slate-500 dark:text-slate-400 hover:text-pink-500 dark:hover:text-[#FFB7C5] transition-colors p-1 text-xl">▶</button>
            </div>
          </div>
          
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl px-8 py-5 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,183,197,0.05)] flex items-center gap-5 transition-all hover:scale-[1.02] duration-300">
            <div className="bg-pink-100 dark:bg-pink-500/20 p-3 rounded-2xl">
              <span className="text-3xl block">💰</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total {activeTab === 'expense' ? 'Gastado' : 'Ingresado'}</p>
              <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                {formatCurrency(totalGlobal)}
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-400 dark:border-[#FFB7C5]"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 pb-10">
            
            {/* Top Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white dark:bg-[#111] p-8 rounded-[2rem] border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between min-h-[450px]">
                <div className="flex flex-col gap-6 mb-8 w-full">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight animate-fade-in">
                        {chartView === "balance" && "Historial Consolidado"}
                        {chartView === "details" && "Comparativa Anual"}
                        {chartView === "investments" && "Inversión Anual"}
                        {chartView === "debts" && "Historial de Deudas"}
                        {chartView === "hormiga" && "Fugas Hormiga"}
                      </h3>
                      <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        {chartView === "balance" && "Ahorro Neto + Activos/Pasivos"}
                        {chartView === "details" && "Ingresos vs Gastos"}
                        {chartView === "investments" && "Fondo de Inversión"}
                        {chartView === "debts" && "Historial de Pasivos"}
                        {chartView === "hormiga" && "Consumo Hormiga"}
                      </p>
                    </div>

                    {/* Summary Metric Display */}
                    <div className="text-left sm:text-right whitespace-nowrap min-w-max">
                      {chartView === "balance" && (
                        <div>
                          <p className="text-3xl font-extrabold text-[#066A85] dark:text-[#87CEEB] tracking-tight whitespace-nowrap">{formatCurrency(currentTotalBalance)}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Ahorro Neto Anual</p>
                        </div>
                      )}
                      {chartView === "details" && (
                        <div className="flex gap-6 justify-start sm:justify-end">
                          <div className="text-left sm:text-right">
                            <p className="text-xl font-bold text-green-500 tracking-tight whitespace-nowrap">{formatCurrency(currentTotalIncome)}</p>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Total Ingresos</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-xl font-bold text-red-500 tracking-tight whitespace-nowrap">{formatCurrency(currentTotalExpenses)}</p>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Total Gastos</p>
                          </div>
                        </div>
                      )}
                      {chartView === "investments" && (
                        <div>
                          <p className="text-3xl font-extrabold text-purple-500 dark:text-[#A78BFA] tracking-tight whitespace-nowrap">{formatCurrency(currentTotalInvested)}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Total Invertido</p>
                        </div>
                      )}
                      {chartView === "debts" && (
                        <div>
                          <p className="text-3xl font-extrabold text-amber-500 dark:text-amber-400 tracking-tight whitespace-nowrap">{formatCurrency(currentTotalDebts)}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Deuda Anual</p>
                        </div>
                      )}
                      {chartView === "hormiga" && (
                        <div>
                          <p className="text-3xl font-extrabold text-rose-500 tracking-tight whitespace-nowrap">{formatCurrency(currentTotalHormiga)}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Gastos Hormiga Anual</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Switcher & Year Selector Controls Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
                    {/* View selector tabs */}
                    <div className="flex bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-xl border border-slate-200 dark:border-[#333] flex-wrap gap-0.5">
                      <button 
                        onClick={() => setChartView("balance")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartView === "balance" ? 'bg-white dark:bg-[#2a2a2a] text-[#066A85] dark:text-[#87CEEB] shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                      >
                        Balance
                      </button>
                      <button 
                        onClick={() => setChartView("details")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartView === "details" ? 'bg-white dark:bg-[#2a2a2a] text-pink-500 dark:text-[#FFB7C5] shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                      >
                        Métricas
                      </button>
                      <button 
                        onClick={() => setChartView("investments")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartView === "investments" ? 'bg-white dark:bg-[#2a2a2a] text-purple-500 dark:text-[#FFB7C5] shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                      >
                        Inversiones
                      </button>
                      <button 
                        onClick={() => setChartView("debts")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartView === "debts" ? 'bg-white dark:bg-[#2a2a2a] text-amber-500 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                      >
                        Deudas
                      </button>
                      <button 
                        onClick={() => setChartView("hormiga")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${chartView === "hormiga" ? 'bg-white dark:bg-[#2a2a2a] text-rose-500 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                      >
                        Gastos Hormiga
                      </button>
                    </div>

                    {/* Year Selector */}
                    <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-[#1a1a1a] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#333]">
                      <button 
                        type="button"
                        onClick={() => setSelectedYear(prev => prev - 1)}
                        className="text-slate-500 hover:text-pink-500 dark:hover:text-[#FFB7C5] transition-colors font-bold text-xs cursor-pointer p-0.5"
                      >
                        ◀
                      </button>
                      <span className="font-extrabold text-xs text-slate-800 dark:text-white min-w-[32px] text-center">
                        {selectedYear}
                      </span>
                      <button 
                        type="button"
                        onClick={() => setSelectedYear(prev => prev + 1)}
                        className="text-slate-500 hover:text-pink-500 dark:hover:text-[#FFB7C5] transition-colors font-bold text-xs cursor-pointer p-0.5"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-[250px] w-full mt-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartDataArea} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#066A85" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#066A85" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34D399" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorInvestments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDebts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorHormiga" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B4513" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8B4513" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 11}} tickLine={false} axisLine={false} dy={10} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      {chartView === "balance" && (
                        <>
                          <Area type="monotone" dataKey="Balance" name="Balance" stroke="#066A85" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                          <Area type="monotone" dataKey="Income" name="Ingresos" stroke="#34D399" strokeWidth={2} fillOpacity={0.15} fill="url(#colorIncome)" />
                          <Area type="monotone" dataKey="Expenses" name="Gastos" stroke="#F43F5E" strokeWidth={2} fillOpacity={0.15} fill="url(#colorExpenses)" />
                          <Area type="monotone" dataKey="Investments" name="Inversiones" stroke="#A78BFA" strokeWidth={2} fillOpacity={0.15} fill="url(#colorInvestments)" />
                          <Area type="monotone" dataKey="Debts" name="Deudas" stroke="#F59E0B" strokeWidth={2} fillOpacity={0.15} fill="url(#colorDebts)" />
                          <Area type="monotone" dataKey="Hormiga" name="Gastos Hormiga" stroke="#8B4513" strokeWidth={2} fillOpacity={0.15} fill="url(#colorHormiga)" />
                        </>
                      )}
                      {chartView === "details" && (
                        <>
                          <Area type="monotone" dataKey="Income" name="Ingresos" stroke="#34D399" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                          <Area type="monotone" dataKey="Expenses" name="Gastos" stroke="#F43F5E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpenses)" />
                        </>
                      )}
                      {chartView === "investments" && (
                        <Area type="monotone" dataKey="Investments" name="Inversiones" stroke="#A78BFA" strokeWidth={3} fillOpacity={1} fill="url(#colorInvestments)" />
                      )}
                      {chartView === "debts" && (
                        <Area type="monotone" dataKey="Debts" name="Deudas" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorDebts)" />
                      )}
                      {chartView === "hormiga" && (
                        <Area type="monotone" dataKey="Hormiga" name="Gastos Hormiga" stroke="#8B4513" strokeWidth={3} fillOpacity={1} fill="url(#colorHormiga)" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense Breakdown Pie Chart */}
              <div className="bg-white dark:bg-[#111] p-8 rounded-[2rem] border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none flex flex-col min-h-[450px]">
                <div className="mb-10 text-center sm:text-left">
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">Gastos</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Desglose de Gastos</p>
                </div>
                {chartData.length === 0 ? (
                  <div className="flex-1 w-full flex justify-center items-center bg-slate-50 dark:bg-[#161616] rounded-2xl border border-dashed border-slate-200 dark:border-[#333]">
                    <p className="text-slate-400 dark:text-gray-500 text-sm font-medium">Agregá gastos para ver el gráfico</p>
                  </div>
                ) : (
                  <div className="flex-1 w-full flex flex-col">
                    <div className="relative h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          {/* Empty Track Background */}
                          <Pie 
                            data={[{ value: 1 }]} 
                            cx="50%" cy="50%" 
                            innerRadius={85} outerRadius={100} 
                            dataKey="value" stroke="none" fill="#F1F5F9" 
                            className="dark:fill-[#1a1a1a]" 
                            isAnimationActive={false} 
                          />
                          <Pie 
                            data={chartData} cx="50%" cy="50%" 
                            innerRadius={85} outerRadius={100} 
                            paddingAngle={5} dataKey="value" stroke="none"
                            cornerRadius={40}
                          >
                            {chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} className="hover:opacity-90 transition-opacity duration-300" />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalGlobal)}</span>
                        <span className="text-xs text-slate-500 font-medium mt-1">Total Mensual</span>
                      </div>
                    </div>
                    
                    <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 px-4">
                      {chartData.map((entry: any, index: number) => (
                        <div key={entry.name} className="flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: getCategoryColor(entry.name) }}></div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize leading-tight">
                            {entry.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: List and Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-8">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Transacciones Recientes</h2>
              
              {wallet?.subcategories?.length === 0 && (
                 <p className="text-slate-500">No hay categorías creadas aún.</p>
              )}

              {wallet?.subcategories?.map((cat: any) => {
                const catTotal = cat.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
                
                return (
                  <div key={cat.name} className="group bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none hover:border-pink-200 dark:hover:border-[#FFB7C5]/50 transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6 pb-4 border-b border-slate-100 dark:border-[#222]">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white capitalize tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(cat.name) }}></span>
                        {cat.name}
                      </h3>
                      <div className="bg-slate-50 dark:bg-[#1a1a1a] px-4 py-1.5 rounded-full border border-slate-100 dark:border-[#333] w-max">
                        <span className="text-slate-600 dark:text-slate-300 text-sm font-medium font-mono whitespace-nowrap">Total: {formatCurrency(catTotal)}</span>
                      </div>
                    </div>
                    
                    {cat.transactions?.length === 0 ? (
                      <p className="text-slate-500 dark:text-gray-600 italic text-sm">Sin gastos en esta categoría.</p>
                    ) : (
                      <ul className="space-y-3">
                        {cat.transactions?.map((t: any, i: number) => (
                          <li key={i} className="flex justify-between items-center bg-slate-50/50 dark:bg-[#161616] border border-slate-100 dark:border-[#1f1f1f] p-3 sm:p-4 rounded-2xl hover:bg-white dark:hover:bg-[#1c1c1c] hover:shadow-sm transition-all duration-300 group/item gap-2 sm:gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div className="bg-white dark:bg-[#222] shadow-[0_2px_10px_rgb(0,0,0,0.02)] dark:shadow-none p-2 sm:p-3 rounded-xl text-xl sm:text-2xl group-hover/item:scale-110 transition-transform duration-300 shrink-0">
                                {getEmoji(t.description + " " + cat.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center relative group-hover/item:pr-[90px] transition-all duration-300 shrink-0">
                              <span className="text-pink-500 dark:text-[#FFB7C5] font-bold text-base sm:text-lg tracking-wide bg-pink-50 dark:bg-[#FFB7C5]/10 px-2 sm:px-3 py-1 rounded-lg relative z-0 whitespace-nowrap">
                                {formatCurrency(t.amount)}
                              </span>
                              <div className="absolute right-0 flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity translate-x-4 group-hover/item:translate-x-0 z-10 pointer-events-none group-hover/item:pointer-events-auto">
                                <button type="button" onClick={() => openEditModal(t)} className="p-2 text-slate-400 hover:text-blue-500 bg-white dark:bg-[#222] rounded-lg shadow-md border border-slate-200 dark:border-[#333] transition-colors cursor-pointer"><FiEdit2 /></button>
                                <button type="button" onClick={() => setTransactionToDelete(t.id)} className="p-2 text-slate-400 hover:text-red-500 bg-white dark:bg-[#222] rounded-lg shadow-md border border-slate-200 dark:border-[#333] transition-colors cursor-pointer"><FiTrash2 /></button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-8 w-full max-w-full">
              <div className="bg-white dark:bg-[#111] p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none flex flex-col gap-5 w-full">
                <div className="flex bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-xl mb-4">
                  <button 
                    onClick={() => setActiveTab('expense')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'expense' ? 'bg-white dark:bg-[#222] text-pink-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    🔴 Gastos
                  </button>
                  <button 
                    onClick={() => setActiveTab('income')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'income' ? 'bg-white dark:bg-[#222] text-[#87CEEB] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    🟢 Ingresos
                  </button>
                </div>
                
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  Añadir Nuevo {activeTab === 'expense' ? 'Gasto' : 'Ingreso'}
                </h2>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Monto ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-pink-400 dark:focus:border-[#FFB7C5] focus:ring-1 focus:ring-pink-400 dark:focus:ring-[#FFB7C5] transition-all font-bold"
                        placeholder="Ej: 2500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Fecha</label>
                      <input 
                        type="date" 
                        required
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-pink-400 dark:focus:border-[#FFB7C5] focus:ring-1 focus:ring-pink-400 dark:focus:ring-[#FFB7C5] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Descripción</label>
                    <input 
                      type="text" 
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-pink-400 dark:focus:border-[#FFB7C5] focus:ring-1 focus:ring-pink-400 dark:focus:ring-[#FFB7C5] transition-all"
                      placeholder={activeTab === 'expense' ? "Ej: Cena con amigos" : "Ej: Salario de Mayo"}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Categoría</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1" ref={catDropdownRef}>
                        <div 
                          onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                          className={`w-full bg-slate-50 dark:bg-[#1a1a1a] border ${isCatDropdownOpen ? 'border-pink-400 dark:border-[#FFB7C5] ring-1 ring-pink-400 dark:ring-[#FFB7C5]' : 'border-slate-200 dark:border-[#333]'} rounded-xl p-3 text-slate-900 dark:text-white transition-all font-medium cursor-pointer flex justify-between items-center`}
                        >
                          <span className={categoryName ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                            {categoryName || "Selecciona una categoría..."}
                          </span>
                          <svg className={`fill-current h-4 w-4 text-slate-500 transition-transform duration-300 ${isCatDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                        
                        {isCatDropdownOpen && (
                          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="max-h-60 overflow-y-auto p-1">
                              {wallet?.subcategories?.filter((c: any) => c.type === activeTab).map((cat: any) => (
                                <div 
                                  key={cat.name} 
                                  onClick={() => {
                                    setCategoryName(cat.name);
                                    setIsCatDropdownOpen(false);
                                  }}
                                  className={`px-4 py-3 cursor-pointer rounded-lg font-medium transition-colors ${categoryName === cat.name ? (activeTab === 'expense' ? 'bg-pink-50 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5]' : 'bg-blue-50 dark:bg-[#87CEEB]/10 text-blue-600 dark:text-[#87CEEB]') : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222]'}`}
                                >
                                  {cat.name}
                                </div>
                              ))}
                              {wallet?.subcategories?.filter((c: any) => c.type === activeTab).length === 0 && (
                                <div className="px-4 py-3 text-slate-500 text-sm text-center">No hay categorías. Crea una nueva.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setNewCatType(activeTab); setIsCategoryModalOpen(true); }}
                        className="bg-slate-200 dark:bg-[#222] text-slate-700 dark:text-white px-4 sm:px-5 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-[#333] transition-colors whitespace-nowrap shadow-sm cursor-pointer shrink-0"
                      >
                        + Nueva
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`mt-4 w-full text-white dark:text-black font-bold py-3 sm:py-4 rounded-2xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${activeTab === 'expense' ? 'bg-pink-500 dark:bg-[#FFB7C5] hover:bg-pink-600 dark:hover:bg-[#ffa0b4] hover:shadow-[0_8px_20px_rgb(236,72,153,0.3)] dark:hover:shadow-[0_8px_20px_rgb(255,183,197,0.3)]' : 'bg-[#87CEEB] hover:bg-[#6cbce0] hover:shadow-[0_8px_20px_rgb(135,206,235,0.3)]'}`}
                  >
                    {isSubmitting ? "Guardando..." : `+ Crear ${activeTab === 'expense' ? 'Gasto' : 'Ingreso'}`}
                  </button>
                </form>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingTransaction(null)}>
          <div className="bg-white dark:bg-[#111] p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#222]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editar Gasto</h3>
              <button onClick={() => setEditingTransaction(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl"><FiX /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Monto</label>
                <input type="number" step="0.01" required value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-3 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Descripción</label>
                <input type="text" required value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-3 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Fecha</label>
                <input type="date" required value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-3 text-slate-900 dark:text-white" />
              </div>
              <button type="submit" className="mt-4 w-full bg-pink-500 dark:bg-[#FFB7C5] text-white dark:text-black font-bold py-4 rounded-2xl hover:bg-pink-600 dark:hover:bg-[#ffa0b4] transition-all">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="bg-white dark:bg-[#111] p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#222]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nueva Categoría</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl"><FiX /></button>
            </div>
            
            <form onSubmit={handleCreateCategory} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Nombre</label>
                <input type="text" required value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-[#87CEEB]" placeholder="Ej: Supermercado" />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Tipo</label>
                <div className="relative" ref={typeDropdownRef}>
                  <div 
                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                    className={`w-full bg-slate-50 dark:bg-[#1a1a1a] border ${isTypeDropdownOpen ? 'border-blue-400 dark:border-[#87CEEB] ring-1 ring-blue-400 dark:ring-[#87CEEB]' : 'border-slate-200 dark:border-[#333]'} rounded-xl p-3 text-slate-900 dark:text-white transition-all font-medium cursor-pointer flex justify-between items-center`}
                  >
                    <span>{newCatType === 'expense' ? '🔴 Gasto' : '🟢 Ingreso'}</span>
                    <svg className={`fill-current h-4 w-4 text-slate-500 transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                  
                  {isTypeDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-1">
                        <div 
                          onClick={() => { setNewCatType('expense'); setIsTypeDropdownOpen(false); }}
                          className={`px-4 py-3 cursor-pointer rounded-lg font-medium transition-colors ${newCatType === 'expense' ? 'bg-pink-50 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5]' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222]'}`}
                        >
                          🔴 Gasto
                        </div>
                        <div 
                          onClick={() => { setNewCatType('income'); setIsTypeDropdownOpen(false); }}
                          className={`px-4 py-3 cursor-pointer rounded-lg font-medium transition-colors ${newCatType === 'income' ? 'bg-blue-50 dark:bg-[#87CEEB]/10 text-blue-600 dark:text-[#87CEEB]' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222]'}`}
                        >
                          🟢 Ingreso
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <button type="submit" className="mt-4 w-full bg-blue-500 dark:bg-[#87CEEB] text-white dark:text-black font-bold py-4 rounded-2xl hover:bg-blue-600 dark:hover:bg-[#6cbce0] transition-all">Crear Categoría</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setTransactionToDelete(null)}>
          <div className="bg-white dark:bg-[#111] p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#222] flex flex-col items-center text-center animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm">
              🗑️
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Eliminar Registro</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">¿Estás seguro que deseas eliminar este registro? Esta acción no se puede deshacer.</p>
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setTransactionToDelete(null)} 
                className="flex-1 bg-slate-100 dark:bg-[#222] text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-[#333] transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 bg-red-500 dark:bg-red-500 text-white font-bold py-3.5 rounded-xl hover:bg-red-600 dark:hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setSuccessMessage("")}>
          <div className="bg-white dark:bg-[#111] p-8 rounded-[2rem] w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#222] flex flex-col items-center text-center animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm">
              ✨
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">¡Excelente!</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage("")} 
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-black font-bold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg shadow-slate-900/20 dark:shadow-white/10"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}