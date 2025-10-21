// src/page/PaymentSuccess.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "https://example.com"; // trang cần redirect
    }, 3000); // redirect sau 3 giây

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-green-300">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">✅ Thanh toán thành công!</h1>
        <p className="text-lg text-gray-700 mb-6">Cảm ơn quý khách đã sử dụng dịch vụ.</p>
        <p className="text-sm text-gray-500">Bạn sẽ được chuyển hướng trong vài giây...</p>
      </div>
    </div>
  );
}
