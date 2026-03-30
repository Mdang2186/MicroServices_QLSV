"use client";

import React, { useState, useMemo } from "react";
import {
    Search,
    Filter,
    ChevronDown,
    Settings2,
    Check
} from "lucide-react";

interface Column<T> {
    header: string;
    accessorKey: keyof T | string;
    cell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    searchKey: keyof T | string;
    searchPlaceholder?: string;
    actions?: (item: T) => React.ReactNode;
    toolbar?: React.ReactNode;
    onRowClick?: (item: T) => void;
    pageSize?: number;
}

export default function DataTable<T extends { id: string | number }>({
    data,
    columns,
    searchKey,
    searchPlaceholder = "Tìm kiếm...",
    actions,
    toolbar,
    onRowClick,
    pageSize = 10
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState("");
    const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.accessorKey as string));
    const [isColumnPanelOpen, setIsColumnPanelOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredData = useMemo(() => {
        return data.filter((item: any) => {
            const val = item[searchKey];
            if (!val) return false;
            return val.toString().toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [data, searchKey, searchQuery]);

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage, pageSize]);

    // Reset pagination when search changes
    useMemo(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-uneti-blue transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-uneti-blue/10 focus:bg-white transition-all outline-none text-slate-700"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setIsColumnPanelOpen(!isColumnPanelOpen)}
                            className="flex items-center gap-2 px-4 py-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all text-[11px] font-black uppercase tracking-widest border border-transparent hover:border-slate-200"
                        >
                            <Settings2 size={18} />
                            Cột
                        </button>

                        {isColumnPanelOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">Hiển thị cột</p>
                                <div className="space-y-1">
                                    {columns.map((col) => (
                                        <button
                                            key={col.accessorKey as string}
                                            onClick={() => toggleColumn(col.accessorKey as string)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                        >
                                            {col.header}
                                            {visibleColumns.includes(col.accessorKey as string) && (
                                                <Check size={14} className="text-uneti-blue" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {toolbar}
                    <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block"></div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {filteredData.length} Bản ghi
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse min-w-full">
                    <thead>
                        <tr className="bg-slate-50/50">
                            {columns.filter(c => visibleColumns.includes(c.accessorKey as string)).map((col) => (
                                <th key={col.accessorKey as string} className="py-3 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">
                                    {col.header}
                                </th>
                            ))}
                            {actions && (
                                <th className="py-3 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">
                                    Thao tác
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {paginatedData.length > 0 ? paginatedData.map((item) => (
                            <tr 
                                key={item.id} 
                                onClick={() => onRowClick?.(item)}
                                className={`hover:bg-slate-50 transition-colors group ${onRowClick ? 'cursor-pointer active:bg-slate-100' : ''}`}
                            >
                                {columns.filter(c => visibleColumns.includes(c.accessorKey as string)).map((col) => (
                                    <td key={col.accessorKey as string} className="py-3 px-6 text-[13px] font-medium text-slate-600 whitespace-nowrap">
                                        {col.cell ? col.cell(item) : (item as any)[col.accessorKey]}
                                    </td>
                                ))}
                                {actions && (
                                    <td className="py-3 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        {actions(item)}
                                    </td>
                                )}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                        <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                                            <Search size={32} />
                                        </div>
                                        <p className="text-[13px] font-bold text-slate-400">Không tìm thấy dữ liệu</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
                <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        Trang {currentPage} / {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-slate-100 transition-all border border-transparent"
                        >
                            Trước
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all ${currentPage === i + 1 ? 'bg-uneti-blue text-white shadow-lg shadow-uneti-blue/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-slate-100 transition-all border border-transparent"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
