import React, { useState, useEffect } from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";

export default function PaymentPage() {
  const [orderId, setOrderId] = useState(null);
  const [status, setStatus] = useState("INIT");
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const connectWebSocket = (orderId) => {
    const socket = new SockJS("http://localhost:8282/ws");
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        client.subscribe(`/topic/payment-status-${orderId}`, (message) => {
          if (message.body === "SUCCESS") {
            setStatus("SUCCESS");
          } else {
            setStatus(message.body);
          }
        });
      },
      onStompError: (frame) => {
        console.error("Broker reported error:", frame.headers["message"]);
        console.error("Additional details:", frame.body);
      },
    });
    client.activate();
  };

  const initPayment = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8282/api/init-payment", {
        amount: amount,
      });
      setOrderId(res.data.orderId);
      connectWebSocket(res.data.orderId);
    } catch (error) {
      console.error("Init payment failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "SUCCESS") {
      setShowSuccess(true); // bật màn thông báo
      setTimeout(() => {
        window.location.href = "https://example.com"; // redirect sau 2s
      }, 2000);
    }
  }, [status]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 to-orange-100">
      {/* HEADER */}
      <header className="bg-orange-500 text-white p-4 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold">P2P Haiti Solution</div>
          <div className="text-sm opacity-90">Cổng Thanh Toán An Toàn</div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex items-center justify-center p-4">
        {showSuccess ? (
          // Màn thông báo thành công + animation
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mb-4"
            ></motion.div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">
              ✅ Thanh toán thành công!
            </h1>
            <p className="text-gray-700 text-center">
              Cảm ơn quý khách đã sử dụng dịch vụ. Chúng tôi sẽ chuyển hướng
              bạn ngay.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 w-full max-w-2xl"
          >
            <h2 className="text-center text-2xl font-bold text-orange-600 mb-6">
              Nạp tiền vào ví Natcash
            </h2>

            {loading && (
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full"
                ></motion.div>
                <p className="mt-4 text-orange-600 font-medium">
                  Đang tạo đơn, vui lòng chờ...
                </p>
              </div>
            )}

            {!loading && !orderId && (
              <>
                <div className="mb-6">
                  <label className="block text-lg font-medium text-gray-700 mb-2">
                    Nhập số tiền muốn nạp
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-3 text-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <button
                  onClick={initPayment}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-md transition"
                >
                  Tạo đơn nạp tiền
                </button>
              </>
            )}

            {orderId && !loading && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <div className="text-lg font-semibold text-orange-600 mb-2">
                      Hướng dẫn chuyển khoản
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 space-y-2 mb-4">
                      <div>
                        <b>Ngân hàng:</b>{" "}
                        <span className="text-gray-800">Natcash</span>
                      </div>
                      <div>
                        <b>Số tài khoản:</b>{" "}
                        <span className="text-orange-600 font-bold">
                          5040000911
                        </span>
                      </div>
                      <div>
                        <b>Số tiền:</b>{" "}
                        <span className="text-orange-600 font-bold">
                          {amount.toLocaleString()} VND
                        </span>
                      </div>
                      <div>
                        <b>Nội dung chuyển khoản:</b>{" "}
                        <span className="text-red-600 font-bold">{orderId}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Vui lòng chuyển khoản đúng <b>số tiền</b> và{" "}
                      <b>nội dung</b> để hệ thống tự động xác nhận.
                      <br />
                      Sau khi chuyển khoản thành công, trạng thái sẽ tự động cập
                      nhật.
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <QRCodeSVG
                      value={`STK:5040000911\nSố tiền:${amount}\nNội dung:${orderId}`}
                      size={200}
                      bgColor="#fff"
                      fgColor="#f97316"
                      level="H"
                      includeMargin={true}
                    />
                    <div className="text-sm text-gray-500 mt-2 text-center">
                      Quét QR để chuyển khoản
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className={`text-lg font-bold ${
                      status === "SUCCESS"
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {status === "SUCCESS"
                      ? "✅ Thanh toán thành công! Cảm ơn bạn."
                      : status === "INIT"
                      ? "Đang chờ thanh toán..."
                      : status}
                  </motion.div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-orange-500 text-white p-4 text-center text-sm">
        © {new Date().getFullYear()} P2P Haiti Solution — Cổng thanh toán an toàn
      </footer>
    </div>
  );
}
