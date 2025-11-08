import React from "react";
import '../resouces/PaymentStatusPage.css';

export default function PageNotFound() {


    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 to-orange-100">

            {/* HEADER */}
            <header className="bg-orange-500 text-white p-4 shadow-md">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="text-2xl font-bold">P2P Haiti Solution</div>
                    <div className="text-sm opacity-90">Cổng Thanh Toán An Toàn</div>
                </div>
            </header>
            <main className="flex-1 flex items-center justify-center p-4 min-h-screen">
            </main>

            {/* FOOTER */}
            <footer className="bg-orange-500 text-white p-4 text-center text-sm">
                © {new Date().getFullYear()} P2P Haiti Solution — Cổng thanh toán an toàn
            </footer>
        </div>
    );
}
