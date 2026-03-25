"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

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

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

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
        className={`w-full ${sizeClasses[size]} bg-harley-dark md:rounded-xl border-t md:border border-harley-gray-lighter/30 shadow-[0_8px_40px_rgba(0,0,0,0.5)] max-h-[92vh] md:max-h-[90vh] flex flex-col rounded-t-2xl`}
      >
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-harley-gray shrink-0">
          <h2 className="text-lg font-semibold text-harley-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-harley-text-muted hover:text-harley-text transition-colors rounded-lg hover:bg-harley-gray-light/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 md:p-6 overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
