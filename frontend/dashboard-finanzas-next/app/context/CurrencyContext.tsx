"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Currency = "ARS" | "USD" | "EUR";

interface CurrencyContextProps {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatCurrency: (amount: number) => string;
  rates: Record<Currency, number>;
}

const CurrencyContext = createContext<CurrencyContextProps | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [rates, setRates] = useState<Record<Currency, number>>({
    ARS: 1,
    USD: 1000,
    EUR: 1100,
  });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const [usdRes, eurRes] = await Promise.all([
          fetch("https://dolarapi.com/v1/dolares/blue"),
          fetch("https://dolarapi.com/v1/cotizaciones/eur")
        ]);
        
        const usdData = await usdRes.json();
        const eurData = await eurRes.json();
        
        if (usdData?.venta && eurData?.venta) {
          setRates({
            ARS: 1,
            USD: usdData.venta,
            EUR: eurData.venta,
          });
        }
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
      }
    };
    
    fetchRates();
  }, []);

  const formatCurrency = (amount: number) => {
    const converted = amount / rates[currency];
    
    let formatted = new Intl.NumberFormat(currency === "ARS" ? "es-AR" : "en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "ARS" ? 0 : 2,
    }).format(converted);

    if (currency === "USD") {
      formatted = formatted.replace("$", "U$D\u00A0");
    } else if (currency === "ARS") {
      formatted = formatted.replace("$", "$\u00A0");
    }
    
    return formatted;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
