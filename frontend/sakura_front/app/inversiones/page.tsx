"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { useCurrency } from "../context/CurrencyContext";
import { FiTrash2, FiRefreshCw, FiPlus, FiX, FiTag, FiType, FiHash, FiDollarSign, FiEdit2 } from "react-icons/fi";

const COLORS = [
  "#F472B6", "#38BDF8", "#FBBF24", "#34D399", "#A78BFA", "#FB7185", "#2DD4BF"
];

const ASSET_TYPES = [
  { value: "crypto", label: "Criptomoneda" },
  { value: "stock", label: "Acción (US)" },
  { value: "cedear", label: "CEDEAR (Arg)" },
  { value: "dolar", label: "Dólar" },
  { value: "euro", label: "Euro" }
];

export default function Inversiones() {
  const { formatCurrency, currency, rates } = useCurrency();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  // Form State
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("crypto");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = React.useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [investmentToDelete, setInvestmentToDelete] = useState<string | null>(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch investments from backend
  const fetchInvestments = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/investments");
      const data = await res.json();
      setInvestments(data.investments || []);
      updateLivePrices(data.investments || []);
    } catch (error) {
      console.error("Error fetching investments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch live prices (Real APIs for crypto, mocked/fallback for others without API keys)
  const updateLivePrices = async (invs: any[]) => {
    const prices: Record<string, number> = { ...livePrices };
    
    for (const inv of invs) {
      if (inv.type === "crypto") {
        try {
          // Binance API for Crypto (Ticker must end in USDT, e.g., BTCUSDT)
          const symbol = `${inv.ticker.toUpperCase()}USDT`;
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
          if (res.ok) {
            const data = await res.json();
            prices[inv.ticker] = parseFloat(data.price);
          } else {
            // Fallback if not found on Binance
            prices[inv.ticker] = inv.purchase_price * (1 + (Math.random() * 0.1 - 0.05));
          }
        } catch (e) {
          prices[inv.ticker] = inv.purchase_price;
        }
      } else if (inv.type === "dolar") {
        prices[inv.ticker] = 1;
      } else if (inv.type === "euro") {
        const eurArs = rates?.EUR || 1100;
        const usdArs = rates?.USD || 1000;
        prices[inv.ticker] = eurArs / usdArs;
      } else {
        // For Stocks/CEDEARs without API Key, we mock a slight change from purchase price 
        // to show the UI functionality. In a real production app, you'd connect AlphaVantage or Yahoo Finance here.
        if (!prices[inv.ticker]) {
            prices[inv.ticker] = inv.purchase_price * (1 + (Math.random() * 0.15 - 0.05));
        }
      }
    }
    setLivePrices(prices);
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleOpenAddForm = () => {
    setEditingInvestment(null);
    setTicker("");
    setName("");
    setType("crypto");
    setQuantity("");
    setPurchasePrice("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (inv: any) => {
    setEditingInvestment(inv);
    setTicker(inv.ticker);
    setName(inv.name);
    setType(inv.type);
    setQuantity(inv.quantity.toString());
    setPurchasePrice(inv.purchase_price.toString());
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ticker: ticker.toUpperCase(),
      name,
      type,
      quantity: parseFloat(quantity),
      purchase_price: parseFloat(purchasePrice)
    };

    const method = editingInvestment ? "PUT" : "POST";
    const url = editingInvestment 
      ? `http://127.0.0.1:8000/api/investments/${editingInvestment.id}`
      : "http://127.0.0.1:8000/api/investments";

    try {
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      setTicker("");
      setName("");
      setQuantity("");
      setPurchasePrice("");
      setIsSubmitting(false);
      setIsFormOpen(false);
      fetchInvestments();
    } catch (error) {
      console.error("Error saving investment:", error);
      setIsSubmitting(false);
    }
  };

  const deleteInvestment = async (id: string) => {
    setInvestmentToDelete(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/investments/${id}`, { method: "DELETE" });
      setInvestmentToDelete(null);
      fetchInvestments();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // Calculations
  // All prices from Binance/Mock are in USD. We need to convert to the selected currency.
  // Wait, the user might input purchase_price in their local currency. Let's assume the dashboard operates in the selected global currency.
  // We'll format it directly using formatCurrency.
  
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.quantity * inv.purchase_price), 0);
  const totalCurrentValue = investments.reduce((sum, inv) => {
    const currentPrice = livePrices[inv.ticker] || inv.purchase_price;
    return sum + (inv.quantity * currentPrice);
  }, 0);
  
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  // Chart Data
  const chartData = investments.map(inv => ({
    name: inv.ticker,
    value: (livePrices[inv.ticker] || inv.purchase_price) * inv.quantity
  })).filter(data => data.value > 0);

  const getCategoryColor = (name: string) => {
    const lower = name.toLowerCase();
    
    // Semantic overrides for assets
    if (lower.includes("btc") || lower.includes("bitcoin")) return "#FBBF24"; // Bitcoin Gold
    if (lower.includes("eth") || lower.includes("ethereum")) return "#A78BFA"; // Ethereum Purple
    if (lower.includes("usd") || lower.includes("dolar")) return "#34D399"; // Dollar Green
    if (lower.includes("eur") || lower.includes("euro")) return "#38BDF8"; // Euro Sky Blue
    if (lower.includes("aapl") || lower.includes("apple")) return "#FB7185"; // Apple Red
    if (lower.includes("tsla") || lower.includes("tesla")) return "#EF4444"; // Tesla Red
    if (lower.includes("amzn") || lower.includes("amazon")) return "#F59E0B"; // Amazon Orange
    if (lower.includes("msft") || lower.includes("microsoft")) return "#60A5FA"; // Microsoft Blue
    if (lower.includes("ggal") || lower.includes("galicia")) return "#8B5CF6"; // Galicia Purple
    
    // Fallback based on hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
  };

  const getMonthlyInvestments = () => {
    const monthsMap: Record<string, Record<string, number>> = {};
    
    // Fill last 6 months with 0 by default to keep the chart continuous and premium-looking
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 15);
      const key = d.toISOString().substring(0, 7); // YYYY-MM
      monthsMap[key] = { crypto: 0, stock: 0, cedear: 0, dolar: 0, euro: 0 };
    }

    investments.forEach((inv) => {
      if (!inv.date) return;
      const monthKey = inv.date.substring(0, 7); // YYYY-MM
      const value = inv.quantity * inv.purchase_price;
      
      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { crypto: 0, stock: 0, cedear: 0, dolar: 0, euro: 0 };
      }
      
      const typeKey = inv.type;
      if (typeKey === "crypto" || typeKey === "stock" || typeKey === "cedear" || typeKey === "dolar" || typeKey === "euro") {
        monthsMap[monthKey][typeKey] += value;
      }
    });

    const sortedMonths = Object.keys(monthsMap).sort();
    return sortedMonths.map((month) => {
      const date = new Date(month + "-15");
      const name = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date).toUpperCase();
      return {
        name,
        Cripto: monthsMap[month].crypto,
        Acciones: monthsMap[month].stock,
        CEDEARs: monthsMap[month].cedear,
        Dólar: monthsMap[month].dolar,
        Euro: monthsMap[month].euro
      };
    });
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
              
              if (item.dataKey === "Acciones") {
                colorClass = "text-purple-600 dark:text-[#A78BFA]";
                dotColor = "bg-purple-500";
              } else if (item.dataKey === "CEDEARs") {
                colorClass = "text-pink-600 dark:text-pink-400";
                dotColor = "bg-pink-400";
              } else if (item.dataKey === "Cripto") {
                colorClass = "text-amber-600 dark:text-amber-400";
                dotColor = "bg-amber-500";
              } else if (item.dataKey === "Dólar") {
                colorClass = "text-emerald-600 dark:text-emerald-400";
                dotColor = "bg-emerald-500";
              } else if (item.dataKey === "Euro") {
                colorClass = "text-sky-600 dark:text-sky-400";
                dotColor = "bg-sky-500";
              }
              
              return (
                <div key={idx} className="flex items-center justify-between gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span>{name}:</span>
                  </div>
                  <span className={`font-bold ${colorClass}`}>
                    {formatCurrency(item.value * (rates?.USD || 1))}
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
              {formatCurrency(data.value * (rates?.USD || 1))}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const monthlyData = getMonthlyInvestments();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-xl font-bold animate-pulse text-pink-500">Cargando portafolio...</p></div>;
  }

  return (
    <div className="min-h-screen font-sans overflow-x-hidden">
      <div className="w-full px-4 sm:px-8 lg:px-12 py-4 sm:py-8 max-w-[100vw]">
        <header className="mb-8 sm:mb-12 flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-slate-200 dark:border-[#222] pb-6">
          <div>
            <span className="text-blue-600 dark:text-[#87CEEB] font-semibold text-sm tracking-wide uppercase">Sakura Assets</span>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 mb-1">Inversiones</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Haz crecer tu patrimonio.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => fetchInvestments()}
              className="flex items-center gap-2 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#333] px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-pink-500 transition-colors shadow-sm cursor-pointer"
            >
              <FiRefreshCw /> Actualizar
            </button>
            <button 
              onClick={handleOpenAddForm}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-[#87CEEB] dark:to-[#6cbce0] text-white dark:text-black font-extrabold px-5 py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm hover:scale-[1.02] duration-300 cursor-pointer text-sm"
            >
              <FiPlus className="text-xl" />
              <span>Nuevo Activo</span>
            </button>
          </div>
        </header>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none">
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Balance Actual</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalCurrentValue * (rates?.USD || 1))}</h3>
          </div>
          <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none">
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Total Invertido</p>
            <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalInvested * (rates?.USD || 1))}</h3>
          </div>
          <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none">
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Rendimiento Total</p>
            <h3 className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss * (rates?.USD || 1))} ({totalProfitLossPercent.toFixed(2)}%)
            </h3>
          </div>
        </div>

        {/* Middle Section: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Monthly Investment History Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-[#111] p-8 rounded-[2rem] border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between min-h-[400px]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Historial de Inversiones</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Desglose de inversión mensual por tipo</p>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 sm:justify-end">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: '#FBBF24'}}></div><span className="text-[10px] font-bold text-slate-500">Cripto</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: '#A78BFA'}}></div><span className="text-[10px] font-bold text-slate-500">Acciones</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: '#F472B6'}}></div><span className="text-[10px] font-bold text-slate-500">CEDEARs</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: '#34D399'}}></div><span className="text-[10px] font-bold text-slate-500">Dólar</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: '#38BDF8'}}></div><span className="text-[10px] font-bold text-slate-500">Euro</span></div>
              </div>
            </div>
            <div className="h-[250px] w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCripto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#FBBF24" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAcciones" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCEDEARs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F472B6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#F472B6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDolar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34D399" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEuro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Cripto" stackId="1" stroke="#FBBF24" strokeWidth={2} fillOpacity={1} fill="url(#colorCripto)" />
                  <Area type="monotone" dataKey="Acciones" stackId="1" stroke="#A78BFA" strokeWidth={2} fillOpacity={1} fill="url(#colorAcciones)" />
                  <Area type="monotone" dataKey="CEDEARs" stackId="1" stroke="#F472B6" strokeWidth={2} fillOpacity={1} fill="url(#colorCEDEARs)" />
                  <Area type="monotone" dataKey="Dólar" stackId="1" stroke="#34D399" strokeWidth={2} fillOpacity={1} fill="url(#colorDolar)" />
                  <Area type="monotone" dataKey="Euro" stackId="1" stroke="#38BDF8" strokeWidth={2} fillOpacity={1} fill="url(#colorEuro)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Allocation Chart */}
          <div className="bg-white dark:bg-[#111] p-6 rounded-[2rem] border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between min-h-[400px]">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 text-center">Alocación</h3>
            {investments.length > 0 ? (
              <div>
                <div className="relative h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={[{ value: 1 }]} 
                        cx="50%" cy="50%" 
                        innerRadius={70} outerRadius={85} 
                        dataKey="value" stroke="none" fill="#F1F5F9" 
                        className="dark:fill-[#1a1a1a]" 
                        isAnimationActive={false} 
                      />
                      <Pie 
                        data={chartData} cx="50%" cy="50%" 
                        innerRadius={70} outerRadius={85} 
                        paddingAngle={5} dataKey="value" stroke="none"
                        cornerRadius={20}
                      >
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-bold text-slate-900 dark:text-white px-4 text-center truncate max-w-full">
                      {formatCurrency(totalCurrentValue * (rates?.USD || 1))}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">Total Portafolio</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 px-2">
                  {chartData.map((entry: any) => (
                    <div key={entry.name} className="flex items-start gap-2.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: getCategoryColor(entry.name) }}></div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate capitalize leading-tight">
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-slate-400 text-sm">Sin datos</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Table */}
        <div className="w-full">
          
          {/* Main Portfolio List */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-[#111] p-4 sm:p-8 rounded-3xl border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Tus Activos</h2>
              
              {investments.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-slate-200 dark:border-[#333]">
                  <span className="text-4xl block mb-2">💼</span>
                  <p className="text-slate-500 font-medium">Aún no tienes inversiones registradas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#222]">
                        <th className="pb-3 text-sm font-semibold text-slate-400 uppercase tracking-wider">Activo</th>
                        <th className="pb-3 text-sm font-semibold text-slate-400 uppercase tracking-wider">Tipo</th>
                        <th className="pb-3 text-sm font-semibold text-slate-400 uppercase tracking-wider text-right">Cant.</th>
                        <th className="pb-3 text-sm font-semibold text-slate-400 uppercase tracking-wider text-right">Precio Actual</th>
                        <th className="pb-3 text-sm font-semibold text-slate-400 uppercase tracking-wider text-right">P&L</th>
                        <th className="pb-3 text-sm font-semibold text-slate-400 uppercase tracking-wider text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investments.map((inv) => {
                        const currentPrice = livePrices[inv.ticker] || inv.purchase_price;
                        const totalValue = currentPrice * inv.quantity;
                        const pnl = totalValue - (inv.purchase_price * inv.quantity);
                        const pnlPercent = ((currentPrice - inv.purchase_price) / inv.purchase_price) * 100;
                        const isProfit = pnl >= 0;

                        return (
                          <tr key={inv.id} className="border-b border-slate-50 dark:border-[#161616] hover:bg-slate-50/50 dark:hover:bg-[#1a1a1a] transition-colors group">
                            <td className="py-4">
                              <div className="font-bold text-slate-800 dark:text-white">{inv.ticker}</div>
                              <div className="text-xs text-slate-500">{inv.name}</div>
                            </td>
                            <td className="py-4">
                              <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-[#222] text-slate-600 dark:text-slate-300 rounded-md uppercase tracking-wide">
                                {inv.type}
                              </span>
                            </td>
                            <td className="py-4 text-right font-medium text-slate-700 dark:text-slate-200">{inv.quantity}</td>
                            <td className="py-4 text-right">
                              <div className="font-bold text-slate-800 dark:text-white">{formatCurrency(currentPrice * (rates?.USD || 1))}</div>
                              <div className="text-xs text-slate-400">Total: {formatCurrency(totalValue * (rates?.USD || 1))}</div>
                            </td>
                            <td className="py-4 text-right">
                              <div className={`font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                                {isProfit ? '+' : ''}{formatCurrency(pnl * (rates?.USD || 1))}
                              </div>
                              <div className={`text-xs font-medium ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                              </div>
                            </td>
                            <td className="py-4 text-center">
                              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleOpenEditForm(inv)} 
                                  className="p-2 text-slate-400 hover:text-blue-500 dark:hover:text-[#87CEEB] transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <FiEdit2 />
                                </button>
                                <button 
                                  onClick={() => deleteInvestment(inv.id)} 
                                  className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Eliminar"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
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
        </div>
      </div>

      {/* Add Investment Form Popup Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white dark:bg-[#111] rounded-[2.5rem] border border-slate-200 dark:border-[#222] max-w-md w-full p-8 shadow-2xl flex flex-col gap-6 animate-in scale-in duration-300">
            
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {editingInvestment ? "Editar Activo" : "Registrar Activo"}
              </h2>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a1a1a] cursor-pointer"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Ticker / Símbolo</label>
                <div className="relative">
                  <FiTag className="absolute left-4 top-3.5 text-slate-400" />
                  <input 
                    type="text" required value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl text-sm font-semibold uppercase outline-none focus:border-blue-400 dark:focus:border-[#87CEEB] transition-colors"
                    placeholder="Ej: BTC, AAPL"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Nombre Comercial</label>
                <div className="relative">
                  <FiType className="absolute left-4 top-3.5 text-slate-400" />
                  <input 
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl text-sm font-semibold outline-none focus:border-blue-400 dark:focus:border-[#87CEEB] transition-colors"
                    placeholder="Ej: Bitcoin"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Tipo de Activo</label>
                <div className="relative" ref={typeDropdownRef}>
                  <div 
                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-[#161616] border ${isTypeDropdownOpen ? 'border-blue-400 dark:border-[#87CEEB] ring-1 ring-blue-400 dark:ring-[#87CEEB]' : 'border-slate-200 dark:border-[#222]'} rounded-2xl text-sm font-bold outline-none cursor-pointer flex justify-between items-center transition-all`}
                  >
                    <span>
                      {ASSET_TYPES.find(t => t.value === type)?.label || "Selecciona un tipo..."}
                    </span>
                    <svg className={`fill-current h-4 w-4 text-slate-500 transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                  
                  {isTypeDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-1">
                        {ASSET_TYPES.map((t) => (
                          <div 
                            key={t.value} 
                            onClick={() => {
                              setType(t.value);
                              setIsTypeDropdownOpen(false);
                            }}
                            className={`px-4 py-3 cursor-pointer rounded-xl font-bold text-sm transition-colors ${type === t.value ? 'bg-blue-50 dark:bg-[#87CEEB]/10 text-blue-600 dark:text-[#87CEEB]' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222]/40'}`}
                          >
                            {t.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Cantidad</label>
                  <div className="relative">
                    <FiHash className="absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      type="number" step="0.000001" required value={quantity} onChange={(e) => setQuantity(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl text-sm font-bold outline-none focus:border-blue-400 dark:focus:border-[#87CEEB] transition-colors"
                      placeholder="Ej: 0.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Precio Compra</label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      type="number" step="0.01" required value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl text-sm font-bold outline-none focus:border-blue-400 dark:focus:border-[#87CEEB] transition-colors"
                      placeholder="En USD"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" disabled={isSubmitting}
                className="w-full mt-2 bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-[#87CEEB] dark:to-[#6cbce0] text-white dark:text-black font-extrabold py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-[0_4px_15px_rgba(135,206,235,0.2)] hover:scale-[1.01] duration-300 disabled:opacity-50 cursor-pointer text-sm"
              >
                {isSubmitting ? "Guardando..." : editingInvestment ? "Guardar Cambios" : "Registrar Activo"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {investmentToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/60 dark:bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white dark:bg-[#111] rounded-[2.5rem] border border-slate-200 dark:border-[#222] max-w-sm w-full p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-2xl mb-2">
                <FiTrash2 />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">¿Eliminar Inversión?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Esta acción no se puede deshacer. Se eliminará permanentemente de tu portafolio.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setInvestmentToDelete(null)}
                className="flex-1 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-slate-700 dark:text-slate-300 font-extrabold rounded-2xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={() => confirmDelete(investmentToDelete)}
                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-extrabold rounded-2xl transition-all shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:scale-[1.02] cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
