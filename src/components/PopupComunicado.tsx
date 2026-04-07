import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const LOGO_URL = "https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/logos/logo-tailor-white.png";

interface PopupData {
  id: string;
  titulo: string;
  mensagem: string;
  cor_fundo: string;
  cor_texto: string;
  botao_label: string;
}

export function PopupComunicado() {
  const { session } = useAuth();
  const location = useLocation();
  const [popups, setPopups] = useState<PopupData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const dismissedThisSession = useRef<Set<string>>(new Set());

  const fetchPopups = useCallback(async () => {
    if (!session) return;
    try {
      const pagina = location.pathname + location.search;
      const { data, error } = await supabase.rpc("rpc_get_popups_ativos", {
        p_pagina: pagina,
      } as any);
      if (error) {
        console.error("Error fetching popups:", error);
        return;
      }
      const filtered = ((data as PopupData[]) || []).filter(
        (p) => !dismissedThisSession.current.has(p.id)
      );
      if (filtered.length > 0) {
        setPopups(filtered);
        setCurrentIndex(0);
        setVisible(true);
        requestAnimationFrame(() => setAnimating(true));
      }
    } catch (err) {
      console.error("Popup fetch error:", err);
    }
  }, [session, location.pathname, location.search]);

  useEffect(() => {
    fetchPopups();
  }, [fetchPopups]);

  const closePopup = () => {
    setAnimating(false);
    setTimeout(() => {
      if (currentIndex < popups.length - 1) {
        setCurrentIndex((i) => i + 1);
        requestAnimationFrame(() => setAnimating(true));
      } else {
        setVisible(false);
        setPopups([]);
      }
    }, 250);
  };

  const handleDismissPermanent = async () => {
    const popup = popups[currentIndex];
    if (!popup) return;
    try {
      await supabase.rpc("rpc_dispensar_popup", { p_popup_id: popup.id } as any);
    } catch {}
    dismissedThisSession.current.add(popup.id);
    closePopup();
  };

  const handleDismissTemporary = () => {
    const popup = popups[currentIndex];
    if (popup) dismissedThisSession.current.add(popup.id);
    closePopup();
  };

  if (!visible || popups.length === 0) return null;

  const popup = popups[currentIndex];
  const bgColor = popup.cor_fundo || "#082537";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{ opacity: animating ? 1 : 0 }}
        onClick={handleDismissTemporary}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[480px] rounded-xl overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          opacity: animating ? 1 : 0,
          transform: animating ? "translateY(0)" : "translateY(20px)",
        }}
      >
        {/* Header with logo */}
        <div className="p-6 flex justify-center" style={{ backgroundColor: "#082537" }}>
          <img
            src={LOGO_URL}
            alt="Tailor Partners"
            className="h-7 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        {/* Content */}
        <div className="bg-white px-6 py-5 text-center">
          <h2 className="font-bold text-lg leading-tight" style={{ color: "#1B2A3D" }}>
            {popup.titulo}
          </h2>
          <p className="text-gray-500 text-sm mt-3 whitespace-pre-line leading-relaxed">
            {popup.mensagem}
          </p>
        </div>

        {/* Divider + Footer */}
        <div className="border-t border-gray-200" />
        <div className="flex items-center justify-between px-6 py-4 bg-white">
          <button
            onClick={handleDismissPermanent}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
          >
            Não mostrar novamente
          </button>
          <Button
            onClick={handleDismissTemporary}
            size="sm"
            className="text-sm font-medium text-white"
            style={{ backgroundColor: "#082537" }}
          >
            Entendido!
          </Button>
        </div>
      </div>
    </div>
  );
}
