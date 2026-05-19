"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { CurrencyProvider } from "./context/CurrencyContext";
import { NotificationProvider } from "./context/NotificationContext";

export function ThemeProvider({ 
  children, 
  ...props 
}: { 
  children: React.ReactNode; 
  [key: string]: any;
}) {
  const Provider = NextThemesProvider as any;
  return (
    <Provider {...props}>
      <CurrencyProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </CurrencyProvider>
    </Provider>
  );
}
