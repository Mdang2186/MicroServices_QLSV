"use client";

import { useEffect, useState } from "react";
import { Bell, User } from "lucide-react";

export default function AdminTopbar() {
    const [email, setEmail] = useState("");

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setEmail(user.email);
            } catch (e) { }
        }
    }, []);

    return (
        <header className="flex h-16 w-full items-center justify-between border-b bg-white px-6 shadow-sm">
            {/* Breadcrumb Placeholder or Title */}
            <div>
                <h2 className="text-lg font-semibold text-gray-700">Management Center</h2>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
                <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                    <Bell className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 border-l pl-4">
                    <div className="flex flex-col text-right">
                        <span className="text-sm font-medium text-gray-900">Admin</span>
                        <span className="text-xs text-gray-500">{email}</span>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-admin-primary text-white">
                        <User className="h-5 w-5" />
                    </div>
                </div>
            </div>
        </header>
    );
}
