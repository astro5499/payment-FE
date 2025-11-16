import React from "react";
import '../resouces/PaymentStatusPage.css';

export default function PageNotFound() {


    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 to-orange-100">

            {/* HEADER */}
            <header className="bg-white/60 backdrop-blur-md p-4 shadow-sm">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {/* Natcash logo placeholder - replace src with your logo */}
                        <div className="text-lg font-semibold text-pink-600">Natcash</div>
                    </div>
                    <div className="text-sm text-gray-600">Cổng Thanh Toán An Toàn</div>
                </div>
            </header>
            <main className="flex-1 flex items-center justify-center p-4 min-h-screen">
            </main>

            {/* FOOTER */}
            <footer className="bg-white/80 p-4 text-center text-sm">
                © {new Date().getFullYear()} Natcash — Cổng thanh toán an toàn
            </footer>
            <style>{`
        /* Ensure the QR box doesn't shrink on small screens */
        @media (max-width: 640px) {
          .w-64 { width: 14rem; }
          .h-64 { height: 14rem; }
        }
      `}</style>
        </div>
    );
}
