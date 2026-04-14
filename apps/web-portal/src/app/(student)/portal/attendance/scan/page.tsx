"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { ArrowLeft, CheckCircle2, XCircle, Camera, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { io, Socket } from "socket.io-client";
import { getStudentProfileId, readStudentSessionUser } from "@/lib/student-session";

export default function QRScannerPage() {
    const router = useRouter();
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const sessionUser = readStudentSessionUser();
        if (sessionUser) setUser(sessionUser);
    }, []);

    useEffect(() => {
        if (!user || !isScanning) return;

        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
            false
        );

        scanner.render(async (decodedText) => {
            scanner.pause();
            setIsScanning(false);
            
            try {
                const payload = JSON.parse(decodedText);
                if (payload.type !== 'UNETI_ATTENDANCE' || !payload.sessionId || !payload.otp) {
                    throw new Error("Mã QR không hợp lệ của hệ thống.");
                }

                const studentId = getStudentProfileId(user);
                if (!studentId) throw new Error("Vui lòng đăng nhập lại.");

                // Connect to WS and send scan request
                const socket = io("http://localhost:3004");
                
                socket.on('connect', () => {
                    socket.emit('scan_qr', {
                        sessionId: payload.sessionId,
                        otp: payload.otp,
                        studentId
                    });
                });

                socket.on('scan_result', (data: { success: boolean, message: string }) => {
                    setScanResult(data);
                    socket.disconnect();
                });

                // Timeout fallback
                setTimeout(() => {
                    if (socket.connected) {
                        setScanResult({ success: false, message: "Hết thời gian kết nối đến máy chủ." });
                        socket.disconnect();
                    }
                }, 10000);

            } catch (error: any) {
                setScanResult({ success: false, message: error.message || "Không thể nhận diện mã QR" });
            }
        }, (error) => {
            // Ignore scan errors, happens until focus is achieved
        });

        return () => {
             scanner.clear().catch(console.error);
        };
    }, [isScanning, user]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-8 px-4 pb-20">
            <div className="w-full max-w-md flex items-center mb-8">
                <Button variant="ghost" className="h-10 w-10 p-0 rounded-full bg-white shadow-sm" onClick={() => router.back()}>
                    <ArrowLeft size={18} className="text-slate-600" />
                </Button>
                <div className="flex-1 text-center pr-10">
                    <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">Điểm danh mã QR</h1>
                </div>
            </div>

            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center min-h-[500px]">
                {!scanResult ? (
                    <>
                         <div className="flex flex-col items-center mb-6">
                             <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
                                 <Camera size={24} />
                             </div>
                             <h2 className="text-base font-black text-slate-800 uppercase tracking-tight text-center">Đưa mã QR vào khung hình</h2>
                             <p className="text-[11px] font-bold text-slate-400 mt-2 text-center leading-relaxed">Hướng camera thiết bị về phía QR Code do Giảng viên cung cấp trên màn hình.</p>
                         </div>

                         <div className="w-full bg-slate-900 rounded-2xl overflow-hidden relative shadow-inner aspect-square" id="reader">
                         </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 w-full animate-in zoom-in-95 duration-500">
                        {scanResult.success ? (
                            <>
                                <div className="h-24 w-24 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/50">
                                    <CheckCircle2 size={48} strokeWidth={2.5}/>
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight text-center mb-2">Thành công!</h2>
                                <p className="text-sm font-bold text-emerald-600 text-center px-4 mb-8 bg-emerald-50 py-2 rounded-xl border border-emerald-100">{scanResult.message}</p>
                            </>
                        ) : (
                            <>
                                <div className="h-24 w-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-6 shadow-inner ring-8 ring-rose-50/50">
                                    <XCircle size={48} strokeWidth={2.5}/>
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight text-center mb-2">Không hợp lệ</h2>
                                <p className="text-sm font-bold text-rose-600 text-center px-4 mb-8 bg-rose-50 py-2 rounded-xl border border-rose-100">{scanResult.message}</p>
                            </>
                        )}

                        <Button onClick={() => { setScanResult(null); setIsScanning(true); }} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-all shadow-lg shadow-indigo-200">
                            Quét lại mã khác
                        </Button>
                    </div>
                )}
            </div>
            
            <div className="mt-8 flex items-start gap-3 bg-indigo-50 p-4 rounded-2xl max-w-md w-full border border-indigo-100">
                <Info size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                <p className="text-[10px] uppercase font-black text-indigo-800 tracking-wider leading-relaxed">
                    Hệ thống Điểm danh QR tự động đồng bộ kết quả lên hệ thống của Giảng viên ngay lập tức. Tính năng này được bảo vệ bởi mã một lần (OTP).
                </p>
            </div>
        </div>
    );
}
