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
    maxHeight?: string;
    loading?: boolean;
}

export default function DataTable<T extends { id: string | number }>({
    data,
    columns,
    searchKey,
    searchPlaceholder = "Tìm kiếm...",
    actions,
    toolbar,
    onRowClick,
    pageSize = 10,
    maxHeight = "calc(100vh - 300px)",
    loading = false
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col relative z-0 h-full overflow-hidden">
            {/* Compact Toolbar */}
            <div className="px-4 py-3 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-uneti-blue transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border-transparent rounded-xl text-[12px] font-bold focus:ring-1 focus:ring-uneti-blue/20 focus:bg-white transition-all outline-none text-slate-700"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <button
                            id="column-toggle-button"
                            onClick={() => setIsColumnPanelOpen(!isColumnPanelOpen)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-all text-[10px] font-black uppercase tracking-widest border border-slate-200 shadow-sm"
                        >
                            <Settings2 size={14} />
                            Cột
                        </button>

                        {isColumnPanelOpen && typeof document !== 'undefined' && (
                            require('react-dom').createPortal(
                                <>
                                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsColumnPanelOpen(false)}></div>
                                    <div 
                                        className="fixed w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-slate-100 z-[9999] p-4 animate-in fade-in slide-in-from-top-2 duration-200"
                                        style={{
                                            top: (document.getElementById('column-toggle-button')?.getBoundingClientRect().bottom || 0) + 8,
                                            left: (document.getElementById('column-toggle-button')?.getBoundingClientRect().right || 0) - 256,
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-4 px-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hiển thị cột</p>
                                            <button 
                                                onClick={() => setVisibleColumns(columns.map(c => c.accessorKey as string))}
                                                className="text-[9px] font-black text-uneti-blue uppercase tracking-wider hover:underline"
                                            >
                                                Mặc định
                                            </button>
                                        </div>
                                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            {columns.map((col) => (
                                                <button
                                                    key={col.accessorKey as string}
                                                    onClick={() => toggleColumn(col.accessorKey as string)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all ${visibleColumns.includes(col.accessorKey as string) ? 'bg-uneti-blue/5 text-uneti-blue' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {col.header}
                                                    {visibleColumns.includes(col.accessorKey as string) && (
                                                        <div className="bg-uneti-blue rounded-lg p-0.5">
                                                            <Check size={10} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>,
                                document.body
                            )
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {toolbar}
                    <div className="h-6 w-px bg-slate-100 mx-1 hidden sm:block"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {filteredData.length} Bản ghi
                    </span>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto custom-scrollbar" style={{ maxHeight: "100%" }}>
                <table className="w-full border-collapse min-w-full relative">
                    <thead className="sticky top-0 z-20 bg-white shadow-sm ring-1 ring-slate-100">
                        <tr>
                            {columns.filter(c => visibleColumns.includes(c.accessorKey as string)).map((col) => (
                                <th key={col.accessorKey as string} className="py-2.5 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                    {col.header}
                                </th>
                            ))}
                            {actions && (
                                <th className="py-2.5 px-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                    Thao tác
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-2 border-uneti-blue/20 border-t-uneti-blue rounded-full animate-spin"></div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedData.length > 0 ? paginatedData.map((item) => (
                            <tr 
                                key={item.id} 
                                onClick={() => onRowClick?.(item)}
                                className={`hover:bg-slate-50/50 transition-colors group ${onRowClick ? 'cursor-pointer' : ''}`}
                            >
                                {columns.filter(c => visibleColumns.includes(c.accessorKey as string)).map((col) => (
                                    <td key={col.accessorKey as string} className="py-2 px-4 text-[12px] font-bold text-slate-600 whitespace-nowrap border-b border-transparent">
                                        {col.cell ? col.cell(item) : (item as any)[col.accessorKey]}
                                    </td>
                                ))}
                                {actions && (
                                    <td className="py-2 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        {actions(item)}
                                    </td>
                                )}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-300">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                            <Search size={24} />
                                        </div>
                                        <p className="text-[12px] font-bold text-slate-400 tracking-tight">Không có dữ liệu</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Optimized Arrow Pagination */}
            {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Trang <span className="text-uneti-blue font-black">{currentPage}</span> / {totalPages}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                            className="p-2 text-slate-400 hover:text-uneti-blue hover:bg-uneti-blue/5 rounded-lg disabled:opacity-30 transition-all border border-transparent"
                            title="Trang đầu"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/></svg>
                        </button>
                        
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all border border-slate-100"
                        >
                            Trước
                        </button>

                        <div className="w-px h-4 bg-slate-100 mx-1"></div>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all border border-slate-100"
                        >
                            Sau
                        </button>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="p-2 text-slate-400 hover:text-uneti-blue hover:bg-uneti-blue/5 rounded-lg disabled:opacity-30 transition-all border border-transparent"
                            title="Trang cuối"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 17 5-5-5-5M6 17l5-5-5-5"/></svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
