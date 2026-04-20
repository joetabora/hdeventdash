"use client";

import { useEffect, useRef, useCallback, useId } from "react";
import { X } from "lucide-react";

/** Initial focus targets this region so we never focus the header close control. */
const MODAL_BODY_SELECTOR = "[data-modal-body]";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  // Only depend on `isOpen`. `onClose` must not be a dependency — parents often pass a
  // new function each render; re-running this effect would steal focus from inputs
  // (e.g. first focusable is the close button in the header).
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const body = panel.querySelector<HTMLElement>(MODAL_BODY_SELECTOR);
      const scope = body ?? panel;
      const first = scope.querySelector<HTMLElement>(FOCUSABLE);
      if (first) first.focus();
    });

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", trapFocus);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, [isOpen, trapFocus]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${sizeClasses[size]} bg-harley-dark md:rounded-xl border-t md:border border-harley-gray-lighter/30 shadow-[var(--shadow-elevated)] max-h-[92vh] md:max-h-[90vh] flex flex-col rounded-t-2xl`}
      >
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-harley-gray shrink-0">
          <h2 id={titleId} className="text-lg font-semibold text-harley-text">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 text-harley-text-muted hover:text-harley-text transition-colors rounded-lg hover:bg-harley-gray-light/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div
          data-modal-body
          className="overflow-y-auto p-5 md:p-6 overscroll-contain"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
