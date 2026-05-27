"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useCurrency } from "./CurrencyContext";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  date: string;
  read: boolean;
}

interface NotificationContextProps {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (title: string, message: string, type: Notification["type"]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const DEFAULT_KEYWORDS = [
  "cafe", "café", "kiosco", "uber", "cabify", "didi", "caramelo", "snack", 
  "netflix", "spotify", "starbucks", "helado", "gaseosa", "coca", "pepsi", 
  "alfajor", "panaderia", "factura", "burger", "mc", "fast food", "vending"
];

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { currency, rates, formatCurrency } = useCurrency();

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sakura_notifications");
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing notifications:", e);
        }
      }
    }
  }, []);

  // Save to localStorage when notifications change
  const saveNotifications = (updated: Notification[]) => {
    setNotifications(updated);
    localStorage.setItem("sakura_notifications", JSON.stringify(updated));
  };

  const addNotification = (title: string, message: string, type: Notification["type"]) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      date: new Date().toISOString(),
      read: false,
    };
    const updated = [newNotif, ...notifications].slice(0, 50); // Keep last 50
    saveNotifications(updated);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  // Automated checker engine
  const refreshNotifications = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/report`);
      if (!res.ok) return;
      const walletData = await res.json();

      // Read configurations from localStorage
      const savedBudget = localStorage.getItem("hormiga_budget_limit_ars");
      const savedMax = localStorage.getItem("hormiga_max_amount_ars");
      const savedKeywords = localStorage.getItem("hormiga_keywords");
      const savedExcludes = localStorage.getItem("hormiga_excluded_ids");
      const savedIncludes = localStorage.getItem("hormiga_included_ids");

      const budgetLimitARS = savedBudget ? Number(savedBudget) : 50000;
      const maxAmountARS = savedMax ? Number(savedMax) : 8000;
      const keywords: string[] = savedKeywords ? JSON.parse(savedKeywords) : DEFAULT_KEYWORDS;
      const excludedIds: string[] = savedExcludes ? JSON.parse(savedExcludes) : [];
      const includedIds: string[] = savedIncludes ? JSON.parse(savedIncludes) : [];

      // Extract current month expenses
      const currentMonthKey = new Date().toISOString().substring(0, 7); // "YYYY-MM"
      const list: any[] = [];

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

      if (walletData.subcategories) {
        walletData.subcategories.forEach(traverse);
      }

      const currentMonthExpenses = list.filter((t) => t.date.startsWith(currentMonthKey));

      // Calculate total Gastos Hormiga spent
      let totalHormigaSpent = 0;
      currentMonthExpenses.forEach((t) => {
        let isHormiga = false;
        if (includedIds.includes(t.id)) {
          isHormiga = true;
        } else if (!excludedIds.includes(t.id)) {
          const desc = t.description.toLowerCase();
          const matchesKeyword = keywords.some((kw) => desc.includes(kw.toLowerCase()));
          const isBelowThreshold = t.amount <= maxAmountARS;
          const catNameLower = (t.categoryName || "").toLowerCase();
          const isMicroExpenseCategory =
            catNameLower.includes("comida") ||
            catNameLower.includes("salidas") ||
            catNameLower.includes("transporte") ||
            catNameLower.includes("servicios");

          isHormiga = matchesKeyword || (isBelowThreshold && isMicroExpenseCategory);
        }

        if (isHormiga) {
          totalHormigaSpent += t.amount;
        }
      });

      const budgetUsagePercent = budgetLimitARS > 0 ? (totalHormigaSpent / budgetLimitARS) * 100 : 0;

      // Lock/Trigger management keys
      const key85 = `hormiga_notif_85_triggered_${currentMonthKey}`;
      const key100 = `hormiga_notif_100_triggered_${currentMonthKey}`;

      const is85Triggered = localStorage.getItem(key85) === "true";
      const is100Triggered = localStorage.getItem(key100) === "true";

      // Currency conversion variables for formatting (in current selected currency context)
      const currentRate = rates[currency] || 1;
      const formattedSpent = formatCurrency(totalHormigaSpent);
      const formattedLimit = formatCurrency(budgetLimitARS);

      if (budgetUsagePercent >= 100) {
        if (!is100Triggered) {
          addNotification(
            "⚠️ ¡Límite Excedido!",
            `Has gastado ${formattedSpent} superando tu presupuesto mensual de Gastos Hormiga (${formattedLimit}).`,
            "error"
          );
          localStorage.setItem(key100, "true");
          localStorage.setItem(key85, "true"); // Flag both so we don't double notify
        }
      } else if (budgetUsagePercent >= 85) {
        if (!is85Triggered) {
          addNotification(
            "⚠️ Presupuesto al Límite",
            `Tus gastos hormiga acumulados alcanzaron el ${budgetUsagePercent.toFixed(0)}% de tu meta mensual (${formattedSpent} de ${formattedLimit}).`,
            "warning"
          );
          localStorage.setItem(key85, "true");
        }
        localStorage.removeItem(key100);
      } else {
        // Reset both triggers when user is safely below limits (e.g. raised limit or deleted expenses)
        localStorage.removeItem(key85);
        localStorage.removeItem(key100);
      }
    } catch (e) {
      console.error("Error evaluating automatic notifications:", e);
    }
  };

  // Run automatic check on rates update/currency changes or initialization
  useEffect(() => {
    if (rates[currency]) {
      refreshNotifications();
    }
  }, [rates, currency]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
