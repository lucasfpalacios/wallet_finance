"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { 
  FiPlus, 
  FiTrash2, 
  FiEdit2, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiClock, 
  FiDollarSign,
  FiUser,
  FiFileText,
  FiCalendar,
  FiX
} from "react-icons/fi";

interface Debt {
  id: string;
  amount: number;
  currency: string;
  creditor: string;
  description: string;
  due_date: string | null;
  status: "pending" | "paid";
}

export default function DeudasPage() {
  const { currency, rates, formatCurrency } = useCurrency();
  
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "paid">("pending");

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [creditor, setCreditor] = useState("");
  const [amount, setAmount] = useState("");
  const [debtCurrency, setDebtCurrency] = useState("ARS");
  const [description, setDescription] = useState("");
  const [debtDate, setDebtDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Currency Dropdown States
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  // Modal feedback
  const [successMessage, setSuccessMessage] = useState("");

  // Cast icons to prevent Next.js strict typings warnings
  const PlusIcon = FiPlus as any;
  const TrashIcon = FiTrash2 as any;
  const EditIcon = FiEdit2 as any;
  const CheckIcon = FiCheckCircle as any;
  const AlertIcon = FiAlertCircle as any;
  const ClockIcon = FiClock as any;
  const UserIcon = FiUser as any;
  const DocIcon = FiFileText as any;
  const CalendarIcon = FiCalendar as any;
  const XIcon = FiX as any;

  useEffect(() => {
    fetchDebts();
  }, []);

  // Click outside to close currency dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDebts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/debts`);
      if (res.ok) {
        setDebts(await res.json());
      }
    } catch (err) {
      console.error("Error al cargar deudas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddForm = () => {
    setEditingDebt(null);
    setCreditor("");
    setAmount("");
    setDebtCurrency(currency); // Default to active global currency
    setDescription("");
    setDebtDate("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (debt: Debt) => {
    setEditingDebt(debt);
    setCreditor(debt.creditor);
    setAmount(debt.amount.toString());
    setDebtCurrency(debt.currency);
    setDescription(debt.description);
    setDebtDate(debt.due_date || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!creditor.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const body = {
        creditor,
        amount: parsedAmount,
        currency: debtCurrency,
        description,
        due_date: debtDate || new Date().toISOString().split('T')[0],
        status: editingDebt ? editingDebt.status : "pending"
      };

      const url = editingDebt 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/debts/${editingDebt.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/debts`;

      const method = editingDebt ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        await fetchDebts();
        setIsFormOpen(false);
        setSuccessMessage(editingDebt ? "Deuda modificada con éxito." : "Deuda agregada con éxito.");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error al guardar deuda:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta deuda?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/debts/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchDebts();
      }
    } catch (err) {
      console.error("Error al eliminar deuda:", err);
    }
  };

  const handleToggleStatus = async (debt: Debt) => {
    try {
      const nextStatus = debt.status === "pending" ? "paid" : "pending";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/debts/${debt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        await fetchDebts();
        setSuccessMessage(nextStatus === "paid" ? "¡Deuda saldada!" : "Deuda marcada como pendiente.");
        setTimeout(() => setSuccessMessage(""), 2500);
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    }
  };

  // Conversions & Calculations in ARS base
  const debtsComputed = useMemo(() => {
    return debts.map(d => {
      // Calculate ARS value
      const rate = rates[d.currency as "ARS" | "USD" | "EUR"] || 1;
      const amountARS = d.amount * rate;
      return {
        ...d,
        amountARS
      };
    });
  }, [debts, rates]);

  // Totals in ARS
  const totalPendingARS = useMemo(() => {
    return debtsComputed
      .filter(d => d.status === "pending")
      .reduce((sum, d) => sum + d.amountARS, 0);
  }, [debtsComputed]);

  const totalPaidARS = useMemo(() => {
    return debtsComputed
      .filter(d => d.status === "paid")
      .reduce((sum, d) => sum + d.amountARS, 0);
  }, [debtsComputed]);

  // Settlement percentage
  const settlementPercentage = useMemo(() => {
    const total = totalPendingARS + totalPaidARS;
    if (total === 0) return 0;
    return (totalPaidARS / total) * 100;
  }, [totalPendingARS, totalPaidARS]);

  // Filtered lists
  const pendingDebts = useMemo(() => {
    return debtsComputed.filter(d => d.status === "pending");
  }, [debtsComputed]);

  const paidDebts = useMemo(() => {
    return debtsComputed.filter(d => d.status === "paid");
  }, [debtsComputed]);

  // Grouped debts
  const groupedPendingDebts = useMemo(() => {
    const grouped = pendingDebts.reduce((acc, debt) => {
      const key = debt.creditor.trim().toLowerCase();
      if (!acc[key]) {
        acc[key] = { creditor: debt.creditor, totalARS: 0, debts: [] };
      }
      acc[key].totalARS += debt.amountARS;
      acc[key].debts.push(debt);
      return acc;
    }, {} as Record<string, { creditor: string; totalARS: number; debts: typeof pendingDebts }>);
    return Object.values(grouped).sort((a, b) => b.totalARS - a.totalARS);
  }, [pendingDebts]);

  const groupedPaidDebts = useMemo(() => {
    const grouped = paidDebts.reduce((acc, debt) => {
      const key = debt.creditor.trim().toLowerCase();
      if (!acc[key]) {
        acc[key] = { creditor: debt.creditor, totalARS: 0, debts: [] };
      }
      acc[key].totalARS += debt.amountARS;
      acc[key].debts.push(debt);
      return acc;
    }, {} as Record<string, { creditor: string; totalARS: number; debts: typeof paidDebts }>);
    return Object.values(grouped).sort((a, b) => b.totalARS - a.totalARS);
  }, [paidDebts]);

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-slate-200 py-8 px-4 sm:px-8 max-w-[100vw] overflow-x-hidden">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-[#222] pb-6">
          <div>
            <span className="text-pink-500 dark:text-[#FFB7C5] font-semibold text-sm tracking-wide uppercase">Sakura Liabilities</span>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">Registro de Deudas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Administra tus préstamos, saldos pendientes y compromisos financieros.</p>
          </div>
          <button 
            onClick={handleOpenAddForm}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 dark:from-[#FFB7C5] dark:to-[#ffa0b3] text-white dark:text-black font-extrabold px-5 py-3 rounded-2xl hover:opacity-90 transition-all shadow-[0_4px_15px_rgba(244,63,94,0.2)] hover:scale-[1.02] duration-300 cursor-pointer"
          >
            <PlusIcon className="text-xl" />
            <span>Nueva Deuda</span>
          </button>
        </header>

        {/* Success Alert popup */}
        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckIcon className="text-xl shrink-0" />
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Pending */}
          <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center gap-5">
            <div className="bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-2xl text-2xl shrink-0">
              💵
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Pendiente</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {formatCurrency(totalPendingARS)}
              </p>
            </div>
          </div>

          {/* Card 2: Settled */}
          <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center gap-5">
            <div className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl text-2xl shrink-0">
              ✅
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Liquidado</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {formatCurrency(totalPaidARS)}
              </p>
            </div>
          </div>

          {/* Card 3: Settlement percentage */}
          <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-200 dark:border-[#222] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Progreso de Pago</span>
              <span className="text-sm font-extrabold text-pink-500 dark:text-[#FFB7C5]">{settlementPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-[#1a1a1a] h-3 rounded-full overflow-hidden border border-slate-200/50 dark:border-[#222]">
              <div 
                className="bg-gradient-to-r from-pink-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${settlementPercentage}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
              {pendingDebts.length} pendientes | {paidDebts.length} pagadas
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-[#222] pb-1">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("pending")}
              className={`pb-3 font-extrabold text-sm relative transition-all duration-300 cursor-pointer ${
                activeTab === "pending"
                  ? "text-pink-500 dark:text-[#FFB7C5]"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Pendientes
              {activeTab === "pending" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 dark:bg-[#FFB7C5] rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("paid")}
              className={`pb-3 font-extrabold text-sm relative transition-all duration-300 cursor-pointer ${
                activeTab === "paid"
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Saldadas
              {activeTab === "paid" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"></span>
              )}
            </button>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {activeTab === "pending" ? pendingDebts.length : paidDebts.length} registros
          </span>
        </div>

        {/* List Section */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-400 dark:border-[#FFB7C5]"></div>
          </div>
        ) : (
          <div>
            {(activeTab === "pending" ? groupedPendingDebts : groupedPaidDebts).length === 0 ? (
              <div className="text-center py-24 bg-white dark:bg-[#111] rounded-[2rem] border border-slate-200 dark:border-[#222] border-dashed">
                <span className="text-4xl block mb-3">🌸</span>
                <p className="text-slate-400 dark:text-slate-500 text-sm font-semibold">
                  {activeTab === "pending" 
                    ? "¡Felicidades! No tienes deudas pendientes."
                    : "No hay registros de deudas saldadas."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(activeTab === "pending" ? groupedPendingDebts : groupedPaidDebts).map((group) => {
                  
                  return (
                    <div 
                      key={group.creditor}
                      className={`bg-white dark:bg-[#111] rounded-3xl border p-6 flex flex-col gap-6 transition-all duration-300 shadow-[0_4px_18px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.03)] border-slate-200 dark:border-[#222]`}
                    >
                      {/* Group Header */}
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-[#222]/50">
                        <div className="flex gap-4 items-center">
                          <div className={`p-3 rounded-2xl shrink-0 text-xl flex items-center justify-center h-12 w-12 ${
                            activeTab === "paid" 
                              ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                              : "bg-pink-100 dark:bg-pink-500/10 text-pink-500 dark:text-[#FFB7C5]"
                          }`}>
                            <UserIcon />
                          </div>
                          <h3 className="font-extrabold text-xl text-slate-900 dark:text-white leading-tight">
                            {group.creditor}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Total {activeTab === "pending" ? "Pendiente" : "Liquidado"}
                          </span>
                          <p className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                            {formatCurrency(group.totalARS)}
                          </p>
                        </div>
                      </div>

                      {/* Individual Debts */}
                      <div className="flex flex-col gap-4">
                        {group.debts.map(debt => {
                          return (
                            <div key={debt.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-[#222]/50">
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  {debt.description ? (
                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-normal">
                                      {debt.description}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-slate-400 dark:text-slate-500 italic leading-normal">
                                      Sin descripción
                                    </p>
                                  )}
                                  
                                  {/* Date Indicators */}
                                  {debt.due_date && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <CalendarIcon className="text-slate-400 text-[10px] shrink-0" />
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        Fecha: {debt.due_date}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Amount */}
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-extrabold text-slate-950 dark:text-white tracking-tight">
                                    {new Intl.NumberFormat(debt.currency === "ARS" ? "es-AR" : "en-US", {
                                      style: "currency",
                                      currency: debt.currency,
                                      minimumFractionDigits: debt.currency === "ARS" ? 0 : 2
                                    }).format(debt.amount)}
                                  </p>
                                  {/* Equivalent converted amount if global currency is different */}
                                  {currency !== debt.currency && (
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase">
                                      ≈ {formatCurrency(debt.amountARS)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Card Actions */}
                              <div className="flex justify-between items-center border-t border-slate-200 dark:border-[#2b2b2b] pt-3 mt-1">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleOpenEditForm(debt)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 dark:hover:text-[#FFB7C5] transition-all cursor-pointer"
                                    title="Editar Deuda"
                                  >
                                    <EditIcon size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(debt.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                                    title="Eliminar Deuda"
                                  >
                                    <TrashIcon size={14} />
                                  </button>
                                </div>

                                {/* Complete / Undo payment */}
                                <button
                                  onClick={() => handleToggleStatus(debt)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer border ${
                                    debt.status === "paid"
                                      ? "bg-slate-100 dark:bg-[#222] border-slate-200 dark:border-[#333] text-slate-500 hover:text-pink-500"
                                      : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 border-emerald-200/40 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                                  }`}
                                >
                                  {debt.status === "paid" ? (
                                    <>
                                      <ClockIcon size={12} />
                                      <span>Pendiente</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckIcon size={12} />
                                      <span>Pagada</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add / Edit Debt Popup Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white dark:bg-[#111] rounded-[2.5rem] border border-slate-200 dark:border-[#222] max-w-md w-full p-8 shadow-2xl flex flex-col gap-6 animate-in scale-in duration-300">
            
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {editingDebt ? "Editar Registro" : "Registrar Deuda"}
              </h2>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a1a1a] cursor-pointer"
              >
                <XIcon className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* Creditor */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">¿A quién le debes?</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    placeholder="Ej. Juan, Banco Galicia, etc."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl text-sm font-semibold outline-none focus:border-pink-400 dark:focus:border-[#FFB7C5] transition-colors"
                  />
                </div>
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto</label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl text-sm font-bold outline-none focus:border-pink-400 dark:focus:border-[#FFB7C5] transition-colors text-right"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Moneda</label>
                  <div className="relative" ref={currencyDropdownRef}>
                    <div 
                      onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-[#161616] border ${isCurrencyDropdownOpen ? 'border-pink-400 dark:border-[#FFB7C5] ring-1 ring-pink-400 dark:ring-[#FFB7C5]' : 'border-slate-200 dark:border-[#222]'} rounded-2xl text-sm font-bold outline-none cursor-pointer flex justify-between items-center transition-all`}
                    >
                      <span>
                        {debtCurrency === "ARS" ? "ARS ($)" : debtCurrency === "USD" ? "USD (U$D)" : "EUR (€)"}
                      </span>
                      <svg className={`fill-current h-4 w-4 text-slate-500 transition-transform duration-300 ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                    
                    {isCurrencyDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-1">
                          {[
                            { value: "ARS", label: "ARS ($)" },
                            { value: "USD", label: "USD (U$D)" },
                            { value: "EUR", label: "EUR (€)" }
                          ].map((option) => (
                            <div 
                              key={option.value} 
                              onClick={() => {
                                setDebtCurrency(option.value);
                                setIsCurrencyDropdownOpen(false);
                              }}
                              className={`px-4 py-3 cursor-pointer rounded-xl font-bold text-sm transition-colors ${debtCurrency === option.value ? 'bg-pink-50 dark:bg-[#FFB7C5]/10 text-pink-600 dark:text-[#FFB7C5]' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222]/40'}`}
                            >
                              {option.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalles / Descripción</label>
                <div className="relative">
                  <DocIcon className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej. Cuota 3 de préstamo de coche"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl text-sm font-semibold outline-none focus:border-pink-400 dark:focus:border-[#FFB7C5] transition-colors"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha de la Deuda (Opcional)</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={debtDate}
                    onChange={(e) => setDebtDate(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#222] rounded-2xl text-sm font-semibold outline-none focus:border-pink-400 dark:focus:border-[#FFB7C5] transition-colors cursor-pointer"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-gradient-to-r from-pink-500 to-rose-500 dark:from-[#FFB7C5] dark:to-[#ffa0b3] text-white dark:text-black font-extrabold py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-[0_4px_15px_rgba(244,63,94,0.2)] hover:scale-[1.01] duration-300 disabled:opacity-50 cursor-pointer text-sm"
              >
                {isSubmitting ? "Guardando..." : editingDebt ? "Guardar Cambios" : "Agregar Registro"}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
