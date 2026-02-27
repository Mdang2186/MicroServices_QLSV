"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
                    <h1 className="text-2xl font-bold">Something went wrong!</h1>
                    <p className="text-muted-foreground">{error.message}</p>
                    <button
                        onClick={() => reset()}
                        className="rounded bg-black px-4 py-2 text-white hover:bg-black/80"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
