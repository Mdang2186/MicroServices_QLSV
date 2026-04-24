"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
    id: string | number;
    name: string;
}

interface SearchableSelectProps {
    items: Item[];
    value: string | number;
    onChange: (value: string) => void;
    placeholder: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    className?: string;
}

export default function SearchableSelect({
    items,
    value,
    onChange,
    placeholder,
    searchPlaceholder = "Tìm kiếm...",
    disabled = false,
    className
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedItem = items.find(item => String(item.id) === String(value));

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (id: string | number) => {
        onChange(String(id));
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className={cn("relative min-w-[200px]", className)} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-2 bg-slate-50 border-transparent rounded-xl text-[13px] font-bold text-slate-700 outline-none transition-all hover:bg-slate-100",
                    isOpen && "bg-white ring-2 ring-uneti-blue/10",
                    disabled && "opacity-50 cursor-not-allowed",
                    className
                )}
            >
                <span className={cn("truncate", !selectedItem && "text-slate-400")}>
                    {selectedItem ? selectedItem.name : placeholder}
                </span>
                <ChevronDown className={cn("size-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border-transparent rounded-xl text-[12px] font-bold outline-none focus:bg-white focus:ring-1 focus:ring-uneti-blue/10"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelect(item.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 text-left text-[12px] font-bold rounded-lg transition-colors",
                                        String(item.id) === String(value) 
                                            ? "bg-uneti-blue/5 text-uneti-blue" 
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <span className="truncate">{item.name}</span>
                                    {String(item.id) === String(value) && <Check className="size-3.5" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-slate-400 text-[12px] font-medium italic">
                                Không tìm thấy kết quả
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
