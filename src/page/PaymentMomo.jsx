// src/pages/Payment.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

/**
 * Payment page
 * - Giữ nguyên logic API & WebSocket của bạn
 * - Giao diện theo phong cách MoMo (màu hồng), logo Natcash
 * - Countdown, QR + hiệu ứng scan (vệt sáng sau), màn hình success với redirect
 *
 * Required packages:
 * npm i axios sockjs-client @stomp/stompjs qrcode.react framer-motion react-router-dom
 *
 * Tailwind CSS recommended for styles (mình dùng class tailwind). Nếu không dùng Tailwind,
 * bạn có thể chuyển class sang CSS thuần.
 */

const API_BASE = "http://localhost:8282"; // đổi theo backend của bạn
const WS_URL = `${API_BASE}/ws`; // đổi nếu cần wss://...

export default function Payment() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("paymentId");

  // trạng thái dữ liệu
  const [status, setStatus] = useState("INIT"); // INIT | SUCCESS | ... (theo BE)
  const [amount, setAmount] = useState(null);
  const [transContent, setTransContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null); // timestamp ms
  const [errorMsg, setErrorMsg] = useState(null);
  const clientRef = useRef(null);
  const redirectTimeoutRef = useRef(null);

  // countdown derived from expiresAt
  const [timeLeft, setTimeLeft] = useState({ min: 0, sec: 0 });

  // Connect websocket (STOMP over SockJS)
  const connectWebSocket = (orderId) => {
    if (!orderId) return;
    try {
      const socket = new SockJS(WS_URL);
      const client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        onConnect: () => {
          // subscribe to the topic for order
          client.subscribe(`/topic/payment-status-${orderId}`, (message) => {
            const statusMessage = message.body;
            setStatus(statusMessage);
            console.log("Received WS message:", statusMessage);

            if (statusMessage === "SUCCESS") {
              setShowSuccess(true);
              // optional: redirect after 2s
              redirectTimeoutRef.current = setTimeout(() => {
                // If backend returns a returnUrl, we will use it (see below), otherwise fallback:
                window.location.href = "/"; // đổi theo nhu cầu
              }, 2000);
            }
          });
        },
        onStompError: (frame) => {
          console.error("Broker reported error:", frame.headers?.message, frame.body);
        },
      });
      client.activate();
      clientRef.current = client;
    } catch (e) {
      console.error("WS connect error", e);
    }
  };

  // fetch payment info from backend
  useEffect(() => {
    let mounted = true;

    const verifyTx = async () => {
      if (!orderId) {
        setLoading(false);
        setStatus("INVALID_REQUEST");
        return;
      }
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/payment/${orderId}`);
        if (!mounted) return;

        // expected fields: amount, status, orderId (transContent), qrCode, expiresAt (optional), returnUrl (optional)
        setAmount(res.data.amount ?? null);
        setStatus(res.data.status ?? "INIT");
        setTransContent(res.data.orderId ?? orderId);
        setQrCode(res.data.qrCode ?? null);

        // handle expiration timestamp (server should provide absolute timestamp in ms or ISO)
        if (res.data.expiresAt) {
          // support ISO or numeric ms
          const t = typeof res.data.expiresAt === "number"
            ? res.data.expiresAt
            : Date.parse(res.data.expiresAt);
          if (!isNaN(t)) setExpiresAt(t);
        }

        // if BE returns a returnUrl, store it in ref for redirect
        clientReturnUrl.current = res.data.returnUrl ?? null;

        // connect WS subscription
        connectWebSocket(orderId);
      } catch (err) {
        console.error("Verify failed", err);
        setStatus("NOT_FOUND");
        setErrorMsg(err?.response?.data ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    verifyTx();

    return () => { mounted = false; };
  }, [orderId]);

  // store returnUrl
  const clientReturnUrl = useRef(null);

  // handle immediate status updates (e.g. if status from API is SUCCESS already)
  useEffect(() => {
    if (status === "SUCCESS") {
      setShowSuccess(true);
      redirectTimeoutRef.current = setTimeout(() => {
        window.location.href = clientReturnUrl.current ?? "/";
      }, 2000);
    }
  }, [status]);

  // countdown timer ticking
  useEffect(() => {
    if (!expiresAt) {
      // no expiration provided: no countdown
      setTimeLeft({ min: 0, sec: 0 });
      return;
    }

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, expiresAt - now);
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ min, sec });
      if (diff <= 0) {
        // expired
        setStatus("EXPIRED");
        // optionally disconnect ws
        if (clientRef.current) {
          try { clientRef.current.deactivate(); } catch (e) {}
          clientRef.current = null;
        }
      }
    };

    tick();
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  // cleanup websocket & timeouts on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        try { clientRef.current.deactivate(); } catch (e) {}
        clientRef.current = null;
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // helper for formatted amount (assume number)
  const fmtAmount = (a) => {
    if (a == null) return "";
    try {
      return Number(a).toLocaleString();
    } catch (e) {
      return a;
    }
  };

  // UI
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 to-pink-100">
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

      {/* MAIN */}
      <main className="flex-1 flex items-center justify-center p-6">
        {loading ? (
          <div className="flex flex-col items-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-16 h-16 border-4 border-pink-300 border-t-transparent rounded-full"
            />
            <p className="mt-4 text-pink-600 font-medium">Đang tải thông tin giao dịch...</p>
          </div>
        ) : showSuccess ? (
          // Success screen
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-20 h-20 border-4 border-green-400 border-t-transparent rounded-full flex items-center justify-center mb-4"
            />
            <div className="text-3xl font-bold text-green-600 mb-2">✅ Thanh toán thành công!</div>
            <div className="text-center text-gray-700 mb-4">Cảm ơn bạn đã sử dụng Natcash. Hệ thống sẽ chuyển hướng sau ít giây.</div>
            <div className="text-xs text-gray-400">Nếu không chuyển hướng, <a href={clientReturnUrl.current ?? "/"} className="text-pink-600 underline">click vào đây</a>.</div>
          </motion.div>
        ) : status === "INVALID_REQUEST" || status === "NOT_FOUND" ? (
          <div className="bg-white p-6 rounded-lg shadow text-red-600 font-bold">
            Giao dịch không hợp lệ hoặc không tồn tại
            {errorMsg && <div className="mt-2 text-sm text-gray-600">{errorMsg}</div>}
          </div>
        ) : (
          // Main payment panel (MoMo-like layout)
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden w-full max-w-4xl grid grid-cols-1 md:grid-cols-2"
          >
            {/* Left: order info */}
            <div className="p-8 bg-white">
              <div className="text-pink-600 font-semibold text-lg mb-4">Cổng thanh toán</div>

              <div className="space-y-4 text-gray-700">
                <div>
                  <div className="text-sm font-medium mb-1">Nhà cung cấp</div>
                  <div className="flex items-center gap-3">
                    <div className="font-medium">Natcash</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Mã đơn hàng</div>
                  <div className="font-mono text-gray-800">{orderId}</div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Mô tả</div>
                  <div className="text-gray-800">{transContent ?? orderId}</div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Số tiền</div>
                  <div className="text-2xl font-bold text-gray-900">{fmtAmount(amount)} VND</div>
                </div>

                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Đơn hàng sẽ hết hạn sau:</div>
                  <div className="flex items-center gap-3">
                    <div className="bg-pink-50 border border-pink-100 text-pink-600 font-semibold rounded-md px-3 py-2 text-center">
                      <div className="text-lg">{String(timeLeft.min).padStart(2, "0")}</div>
                      <div className="text-xs font-normal text-gray-500">Phút</div>
                    </div>
                    <div className="bg-pink-50 border border-pink-100 text-pink-600 font-semibold rounded-md px-3 py-2 text-center">
                      <div className="text-lg">{String(timeLeft.sec).padStart(2, "0")}</div>
                      <div className="text-xs font-normal text-gray-500">Giây</div>
                    </div>
                  </div>
                  {status === "EXPIRED" && (
                    <div className="mt-3 text-sm text-red-600 font-medium">Đơn hàng đã hết hạn</div>
                  )}
                </div>

                <div className="mt-6 text-sm text-gray-600">
                  Vui lòng mở ứng dụng ngân hàng/Momo để quét mã QR và thực hiện thanh toán. Hệ thống sẽ tự động cập nhật trạng thái.
                </div>
              </div>
            </div>

            {/* Right: QR + scan effect */}
            <div className="relative p-8 bg-gradient-to-b from-pink-600 to-pink-500 text-white flex flex-col items-center justify-center">
              <h3 className="text-white text-xl font-semibold mb-4">Quét mã QR để thanh toán</h3>

              {/* QR box */}
              <div className="relative w-64 h-64 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
                {/* QR code (use qrCode from backend if provided, else placeholder) */}
                {qrCode ? (
                  <QRCodeSVG value={qrCode} size={220} bgColor="#fff" fgColor="#d82b8d" level="H" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-sm text-gray-400">
                    QR không có sẵn
                  </div>
                )}

                {/* scan beam: a bright thin strip with trailing gradient */}
                <motion.div
                  className="absolute left-0 w-full h-1 pointer-events-none"
                  initial={{ y: -260 }}
                  animate={{ y: [ -260, 260, -260 ] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* beam + tail */}
                  <div style={{ height: "100%" }} className="w-full relative">
                    {/* tail - gradient that trails behind beam */}
                   <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "-140px",
                        height: "400px",
                        background: "linear-gradient(to bottom, rgba(216,43,141,0.0), rgba(216,43,141,0.18), rgba(216,43,141,0.0))",
                        transformOrigin: "center",
                        pointerEvents: "none",
                      }}
                    />
                    {/* bright beam line */}
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            height: "2px",
                            background: "linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.95), rgba(255,255,255,0.0))",
                            filter: "drop-shadow(0 4px 12px rgba(228, 23, 139, 0.35))",
                            opacity: 0.9,
                          }}
                        />
                  </div>
                </motion.div>
              </div>

              <div className="mt-4 text-center text-white/90">
                <div className="text-sm">Mở App MoMo hoặc ứng dụng hỗ trợ QR để quét</div>
                <div className="text-xs mt-1">Gặp lỗi? <button
  onClick={() => alert("Hiển thị hướng dẫn ở đây")}
  className="underline text-pink-600 bg-transparent p-0 m-0 border-0 cursor-pointer"
>
  Xem hướng dẫn
</button></div>
              </div>

              {/* small status */}
              <div className="mt-6 text-white/90">
                <div className="text-sm font-medium">
                  {status === "INIT" && "Đang chờ thanh toán..."}
                  {status !== "INIT" && status !== "EXPIRED" && status !== "SUCCESS" && status}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white/80 p-4 text-center text-sm">
        © {new Date().getFullYear()} Natcash — Cổng thanh toán an toàn
      </footer>

      {/* Inline styles for better beam blur if Tailwind absent */}
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
