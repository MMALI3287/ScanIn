import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { useDarkMode } from "../DarkModeContext";

export default function AdminLayout({ title, children }) {
  const { dark } = useDarkMode();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className={`min-h-screen flex ${dark ? "bg-gray-950" : "bg-gray-100"}`}>
      <Sidebar />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium ${
            toast.type === "success"
              ? dark
                ? "bg-gray-900 border border-green-500/40 text-green-400"
                : "bg-white border border-green-300 text-green-600"
              : dark
                ? "bg-gray-900 border border-red-500/40 text-red-400"
                : "bg-white border border-red-300 text-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.text}
        </div>
      )}

      <main className="flex-1 p-8 overflow-auto">
        {title && (
          <h1 className={`text-2xl font-bold mb-6 ${dark ? "text-white" : "text-gray-900"}`}>{title}</h1>
        )}
        {typeof children === "function" ? children({ setToast }) : children}
      </main>
    </div>
  );
}
