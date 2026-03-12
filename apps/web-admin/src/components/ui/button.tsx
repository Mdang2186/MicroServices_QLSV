"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        const variantStyles = {
            default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
            destructive: "bg-rose-500 text-white hover:bg-rose-600",
            outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
            secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
            ghost: "hover:bg-slate-100 text-slate-700",
            link: "text-indigo-600 underline-offset-4 hover:underline",
        };

        const sizeStyles = {
            default: "h-10 px-4 py-2",
            sm: "h-8 rounded-md px-3 text-xs",
            lg: "h-11 rounded-md px-8",
            icon: "h-9 w-9",
        };

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
