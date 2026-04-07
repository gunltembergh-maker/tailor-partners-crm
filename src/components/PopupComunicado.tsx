import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const DEFAULT_LOGO_URL = "https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/logos/logo-white.png";

interface PopupData {
  id: string;
  titulo: string;
  mensagem: string;
  cor_fundo: string;
  cor_texto: string;
  botao_label: string;
  logo_url: string | null;
  mostrar_nome_hub: boolean;
}

/** Reusable popup card for both live preview and real display */
export function PopupCard({
  titulo,
  mensagem,
  logo_url,
  mostrar_nome_hub,
  onDismissPermanent,
  onDismissTemporary,
  scale,
}: {
  titulo: string;
  mensagem: string;
  logo_url?: string | null;
  mostrar_nome_hub?: boolean;
  onDismissPermanent?: () => void;
  onDismissTemporary?: () => void;
  scale?: number;
}) {
  const logoSrc = logo_url || DEFAULT_LOGO_URL;
  const showName = mostrar_nome_hub ?? true;
  const hasLogo = !!logo_url || logo_url === undefined || logo_url === null;

  return (
    <div
      className="w-full max-w-[480px] rounded-xl overflow-hidden shadow-2xl"
      style={scale ? { transform: `scale(${scale})`, transformOrigin: "top center" } : undefined}
    >
      {/* Header with logo */}
      <div className="p-6 flex flex-col items-center gap-2" style={{ backgroundColor: "#082537" }}>
        {logoSrc && (
          <img
            src={logoSrc}
            alt="Tailor Partners"
            className="h-7 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        {showName && (
          <span className="text-white text-[11px] tracking-[2px] font-medium uppercase">
            Hub Grupo Tailor Partners
          </span>
        )}
      </div>

      {/* Content */}
      <div className="bg-white px-6 py-5 text-center">
        <h2 className="font-bold text-lg leading-tight" style={{ color: "#1B2A3D" }}>
          {titulo || "Título do comunicado"}
        </h2>
        <p className="text-gray-500 text-sm mt-3 whitespace-pre-line leading-relaxed">
          {mensagem || "Mensagem do comunicado..."}
        </p>
      </div>

      {/* Divider + Footer */}
      <div className="border-t border-gray-200" />
      <div className="flex items-center justify-between px-6 py-4 bg-white">
        <button
          onClick={onDismissPermanent}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
          type="button"
        >
          Não mostrar novamente
        </button>
        <Button
          onClick={onDismissTemporary}
          size="sm"
          className="text-sm font-medium text-white"
          style={{ backgroundColor: "#082537" }}
          type="button"
        >
          Entendido!
        </Button>
      </div>
    </div>
  );
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
        className="relative transition-all duration-300"
        style={{
          opacity: animating ? 1 : 0,
          transform: animating ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <PopupCard
          titulo={popup.titulo}
          mensagem={popup.mensagem}
          logo_url={popup.logo_url}
          mostrar_nome_hub={popup.mostrar_nome_hub}
          onDismissPermanent={handleDismissPermanent}
          onDismissTemporary={handleDismissTemporary}
        />
      </div>
    </div>
  );
}
