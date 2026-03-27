import { useState, useEffect } from "react";
import { LOGO_LIGHT_BG } from "@/lib/constants";

interface DashboardLoadingScreenProps {
  isLoading: boolean;
}

export function DashboardLoadingScreen({ isLoading }: DashboardLoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!isLoading && visible) {
      setFadeOut(true);
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <img
        src={LOGO_LIGHT_BG}
        alt="Tailor Partners"
        className="w-48 animate-pulse"
      />
      <p className="mt-6 text-sm font-medium" style={{ color: "#6B7280" }}>
        Carregando seus dados...
      </p>
      <div className="mt-4 w-48 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#E5E7EB" }}>
        <div
          className="h-full rounded-full animate-[loading_1.5s_ease-in-out_infinite]"
          style={{ backgroundColor: "#1B2A3D", width: "60%" }}
        />
      </div>
    </div>
  );
}
