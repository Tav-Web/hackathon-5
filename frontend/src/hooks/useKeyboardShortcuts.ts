"use client";

import { useEffect, useCallback } from "react";

// Custom events for keyboard shortcuts
export const KEYBOARD_EVENTS = {
  CLOSE_OVERLAY: "keyboard:close-overlay",
  TOGGLE_CHAT: "keyboard:toggle-chat",
  RUN_ANALYSIS: "keyboard:run-analysis",
  TOGGLE_VIEW_MODE: "keyboard:toggle-view-mode",
} as const;

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

/**
 * Hook para gerenciar atalhos de teclado globais
 *
 * Atalhos:
 * - Escape: Fecha overlays (chat, modais)
 * - Ctrl/Cmd + K: Toggle chat IA
 * - Ctrl/Cmd + Enter: Executar análise
 * - Ctrl/Cmd + M: Alternar modo de visualização (mapa/comparação)
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignorar se estiver em um input/textarea
    const target = e.target as HTMLElement;
    const isInputFocused =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;

    // Escape sempre funciona (fecha overlays)
    if (e.key === "Escape") {
      window.dispatchEvent(new CustomEvent(KEYBOARD_EVENTS.CLOSE_OVERLAY));
      return;
    }

    // Outros atalhos não funcionam quando em inputs (exceto Escape)
    if (isInputFocused) return;

    const isMod = e.ctrlKey || e.metaKey;

    // Ctrl/Cmd + K - Toggle chat
    if (isMod && e.key === "k") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(KEYBOARD_EVENTS.TOGGLE_CHAT));
      return;
    }

    // Ctrl/Cmd + Enter - Executar análise
    if (isMod && e.key === "Enter") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(KEYBOARD_EVENTS.RUN_ANALYSIS));
      return;
    }

    // Ctrl/Cmd + M - Toggle view mode
    if (isMod && e.key === "m") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(KEYBOARD_EVENTS.TOGGLE_VIEW_MODE));
      return;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Hook para escutar eventos de atalhos de teclado
 */
export function useKeyboardEvent(
  event: (typeof KEYBOARD_EVENTS)[keyof typeof KEYBOARD_EVENTS],
  callback: () => void
) {
  useEffect(() => {
    const handler = () => callback();
    window.addEventListener(event, handler);
    return () => window.removeEventListener(event, handler);
  }, [event, callback]);
}
