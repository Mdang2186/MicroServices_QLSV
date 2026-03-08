"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
    // Handle escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEsc);
        }
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative w-full max-w-lg bg-white rounded-[28px] shadow-2xl overflow-hidden border border-slate-100"
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="px-6 py-5 border-t border-slate-50 flex items-center justify-end gap-3 bg-slate-50/30">
                            {footer}
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
