// src/pages/Payment.jsx
import React, {useEffect, useRef, useState} from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import {Client} from "@stomp/stompjs";
import {QRCodeSVG} from "qrcode.react";
import {motion} from "framer-motion";
import {useSearchParams} from "react-router-dom";
import {API_PARTNERS_EXPIRED} from "../constant/Api";
import {API_BASE_URL} from "../constant/Constant";
import { useTranslation } from "react-i18next";
import { loadLanguage } from "../i18n/loadLanguage";

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
    const { t } = useTranslation();

    const [searchParams] = useSearchParams();
    const paymentId = searchParams.get("paymentId");

    // trạng thái dữ liệu
    const [status, setStatus] = useState("INIT"); // INIT | SUCCESS | ... (theo BE)
    const [amount, setAmount] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [transContent, setTransContent] = useState(null);
    const [transSuccess, setTransSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [qrCode, setQrCode] = useState(null);
    const [expiredTime, setExpiredTime] = useState(null); // timestamp ms
    const [dateCreated, setDateCreated] = useState(null); // timestamp ms
    const [errorMsg, setErrorMsg] = useState(null);
    const clientRef = useRef(null);
    const redirectTimeoutRef = useRef(null);
    const hasCalledApi = useRef(false);


    // countdown derived from expiredTime
    const [timeLeft, setTimeLeft] = useState({min: 0, sec: 0});

    // Connect websocket (STOMP over SockJS)
    const connectWebSocket = (paymentId) => {
        if (!paymentId) return;
        try {
            const socket = new SockJS(WS_URL);
            const client = new Client({
                webSocketFactory: () => socket,
                reconnectDelay: 5000,
                onConnect: () => {
                    // subscribe to the topic for order
                    client.subscribe(`/topic/payment-status-${paymentId}`, (message) => {
                        const data = JSON.parse(message.body);
                        if (!data) {
                            setStatus("INVALID_REQUEST");
                        } else {
                            const statusMessage = data.status;
                            setStatus(statusMessage);
                            if (statusMessage === "SUCCESS") {
                                setShowSuccess(true);
                                setTransSuccess(true);
                                // optional: redirect after 2s
                                redirectTimeoutRef.current = setTimeout(() => {
                                    window.location.href = data.callbackUrl;
                                }, 3000);
                            }
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
        let mounted = false;

        const verifyTx = async () => {
            if (!paymentId) {
                setLoading(false);
                setStatus("INVALID_REQUEST");
                return;
            }
            if (hasCalledApi.current) return;
            hasCalledApi.current = true;
            try {
                setLoading(true);
                const res = await axios.get(`${API_BASE}/payment/${paymentId}`);
                if (!res) {
                    return;
                } else {
                    await loadLanguage(res.data.language);
                    setLoading(false);
                }

                // expected fields: amount, status, paymentId (transContent), qrCode, expiredTime (optional), returnUrl (optional)
                setAmount(res.data.amount ?? null);
                setOrderId(res.data.orderId ?? null);
                setStatus(res.data.status != null ? res.data.status : "NOT_FOUND");
                setTransContent(res.data.paymentId ?? paymentId);
                setQrCode(res.data.qrCode ?? null);

                // handle expiration timestamp (server should provide absolute timestamp in ms or ISO)
                if (res.data.expiredTime) {
                    // support ISO or numeric ms
                    const t = typeof res.data.expiredTime === "number"
                        ? res.data.expiredTime
                        : Date.parse(res.data.expiredTime);
                    if (!isNaN(t)) {
                        setExpiredTime(t);
                        setDateCreated(res.data.createdAt ?? null)
                    }
                }

                // if BE returns a returnUrl, store it in ref for redirect
                clientReturnUrl.current = res.data.returnUrl ?? null;

                // connect WS subscription
                connectWebSocket(paymentId);
            } catch (err) {
                console.error("Verify failed", err);
                setStatus("NOT_FOUND");
                setErrorMsg(err?.response?.data ?? String(err));
            } finally {
                if (mounted) setLoading(false);
            }
        };

        verifyTx();

        return () => {
            mounted = false;
        };
    }, [paymentId]);

    // store returnUrl
    const clientReturnUrl = useRef(null);

    // handle immediate status updates (e.g. if status from API is SUCCESS already)
    useEffect(() => {
        if (status === "SUCCESS") {
            setShowSuccess(true);
            if (!transSuccess) {
                redirectTimeoutRef.current = setTimeout(() => {
                    window.location.href = clientReturnUrl.current ?? "/";
                }, 2000);
            }
        }
        if (status === "EXPIRED") {
            if (transSuccess) {
                const res = axios.patch(`${API_BASE_URL}/${API_PARTNERS_EXPIRED(paymentId)}`);
            }
        }
    }, [status]);

    function getRemainingSeconds(dateCreate, expireSeconds) {
        const createdTime = new Date(dateCreate);
        const expireTime = new Date(createdTime.getTime() + expireSeconds * 1000);
        const now = new Date();

        const diffMs = expireTime - now;
        const diffSec = Math.floor(diffMs / 1000);

        return diffSec > 0 ? diffSec : 0;
    }

    // countdown timer ticking
    useEffect(() => {
        if (!expiredTime || !dateCreated) {
            // no expiration provided: no countdown
            setTimeLeft({min: 0, sec: 0});
            return;
        }
        const tick = () => {
            const remainingTime = getRemainingSeconds(dateCreated, expiredTime);
            const min = Math.floor(remainingTime / 60);
            const sec = remainingTime % 60;
            setTimeLeft({min, sec});
            if (remainingTime <= 0) {
                // expired
                setStatus("EXPIRED");
                setShowSuccess(false);
                setTransSuccess(true);
                // optionally disconnect ws
                if (clientRef.current) {
                    try {
                        clientRef.current.deactivate();
                    } catch (e) {
                    }
                    clientRef.current = null;
                }
            }
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [expiredTime, dateCreated]);

    // cleanup websocket & timeouts on unmount
    useEffect(() => {
        return () => {
            if (clientRef.current) {
                try {
                    clientRef.current.deactivate();
                } catch (e) {
                }
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
                    <div className="text-sm text-gray-600">Secure Payment Gateway</div>
                </div>
            </header>

            {/* MAIN */}
            <main className="flex-1 flex items-center justify-center p-6">
                {loading ? (
                    <div className="flex flex-col items-center">
                        <motion.div
                            animate={{rotate: 360}}
                            transition={{repeat: Infinity, duration: 1}}
                            className="w-16 h-16 border-4 border-pink-300 border-t-transparent rounded-full"
                        />
                        <p className="mt-4 text-pink-600 font-medium">Loading transaction information...</p>
                    </div>
                ) : showSuccess ? (
                    // Success screen
                    <motion.div
                        initial={{scale: 0.8, opacity: 0}}
                        animate={{scale: 1, opacity: 1}}
                        transition={{duration: 0.4}}
                        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center"
                    >
                        <div className="animate-fadeIn">
                            <svg
                                className="mx-auto h-16 w-16 text-green-500 animate-bounce"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-green-600 mb-2">{t("success.title")}</div>
                        <div className="text-center text-gray-700 mb-4">{t("success.message")}</div>
                        <div className="text-xs text-gray-400">{t("success.redirect")} <a
                            href={clientReturnUrl.current ?? "/"} className="text-pink-600 underline">{t("success.clickHere")}</a>.
                        </div>
                    </motion.div>
                ) : status === "INVALID_REQUEST" || status === "NOT_FOUND" ? (

                    <motion.div
                        initial={{scale: 0.8, opacity: 0}}
                        animate={{scale: 1, opacity: 1}}
                        transition={{duration: 0.4}}
                        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center"
                    >
                        <div className="animate-fadeIn">
                            <svg
                                className="mx-auto h-16 w-16 text-red-500 animate-shake"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-center text-red-600 mb-2">
                            {t("error.invalid")}
                            {errorMsg && <div className="mt-2 text-sm text-gray-600">{errorMsg}</div>}
                        </div>
                    </motion.div>
                ) : status === "EXPIRED" ? (
                    <motion.div
                        initial={{scale: 0.8, opacity: 0}}
                        animate={{scale: 1, opacity: 1}}
                        transition={{duration: 0.4}}
                        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center"
                    >
                        <div className="animate-fadeIn">
                            <svg
                                className="mx-auto h-16 w-16 text-gray-500 animate-pulse"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-center text-gray-500 mb-2">
                            {t("error.expired")}
                            {errorMsg && <div className="mt-2 text-sm text-gray-600">{errorMsg}</div>}
                        </div>
                    </motion.div>
                ) : (
                    // Main payment panel (MoMo-like layout)
                    <motion.div
                        initial={{opacity: 0, y: 10}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.35}}
                        className="bg-white rounded-2xl shadow-lg overflow-hidden w-full max-w-4xl grid grid-cols-1 md:grid-cols-2"
                    >
                        {/* Left: order info */}
                        <div className="p-8 bg-white">
                            <div className="text-pink-600 font-semibold text-lg mb-4">{t("payment.title")}</div>

                            <div className="space-y-4 text-gray-700">
                                <div>
                                    <div className="text-sm font-medium mb-1">{t("payment.provider")}</div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-medium">Natcash</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium mb-1">{t("payment.orderId")}</div>
                                    <div className="font-mono text-gray-800">{orderId}</div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium mb-1">{t("payment.description")}</div>
                                    <div className="text-gray-800">{transContent ?? paymentId}</div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium mb-1">{t("payment.amount")}</div>
                                    <div className="text-2xl font-bold text-gray-900">{fmtAmount(amount)} VND</div>
                                </div>

                                <div className="mt-6">
                                    <div className="text-sm text-gray-600 mb-2">{t("payment.expire.in")}</div>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="bg-pink-50 border border-pink-100 text-pink-600 font-semibold rounded-md px-3 py-2 text-center">
                                            <div className="text-lg">{String(timeLeft.min).padStart(2, "0")}</div>
                                            <div className="text-xs font-normal text-gray-500">{t("payment.minute")}</div>
                                        </div>
                                        <div
                                            className="bg-pink-50 border border-pink-100 text-pink-600 font-semibold rounded-md px-3 py-2 text-center">
                                            <div className="text-lg">{String(timeLeft.sec).padStart(2, "0")}</div>
                                            <div className="text-xs font-normal text-gray-500">{t("payment.second")}</div>
                                        </div>
                                    </div>
                                    {status === "EXPIRED" && (
                                        <div className="mt-3 text-sm text-red-600 font-medium">{t("payment.expired")}</div>
                                    )}
                                </div>

                                <div className="mt-6 text-sm text-gray-600">
                                    {t("payment.scan.instruction")}
                                </div>
                            </div>
                        </div>

                        {/* Right: QR + scan effect */}
                        <div
                            className="relative p-8 bg-gradient-to-b from-pink-600 to-pink-500 text-white flex flex-col items-center justify-center">
                            <h3 className="text-white text-xl font-semibold mb-4">{t("qr.title")}</h3>

                            {/* QR box */}
                            <div
                                className="relative w-64 h-64 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
                                {/* QR code (use qrCode from backend if provided, else placeholder) */}
                                {qrCode ? (
                                    <QRCodeSVG value={qrCode} size={220} bgColor="#fff" fgColor="#d82b8d" level="H"/>
                                ) : (
                                    <div className="w-48 h-48 flex items-center justify-center text-sm text-gray-400">
                                        {t("qr.notAvailable")}
                                    </div>
                                )}

                                {/* scan beam: a bright thin strip with trailing gradient */}
                                <motion.div
                                    className="absolute left-0 w-full h-1 pointer-events-none"
                                    initial={{y: -260}}
                                    animate={{y: [-260, 260, -260]}}
                                    transition={{duration: 4.5, repeat: Infinity, ease: "easeInOut"}}
                                >
                                    {/* beam + tail */}
                                    <div style={{height: "100%"}} className="w-full relative">
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
                                <div className="text-sm">{t("qr.openApp")}</div>
                                <div className="text-xs mt-1">{t("qr.help")}
                                    <button onClick={() => alert("Hiển thị hướng dẫn ở đây")}
                                            className="underline text-pink-600 bg-transparent p-0 m-0 border-0 cursor-pointer"
                                    > {t("qr.guide")}</button>
                                </div>
                            </div>

                            {/* small status */}
                            <div className="mt-6 text-white/90">
                                <div className="text-sm font-medium">
                                    {status === "PENDING" && t("status.waiting")}
                                    {status !== "PENDING" && status !== "EXPIRED" && status !== "SUCCESS" && status}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* FOOTER */}
            <footer className="bg-white/80 p-4 text-center text-sm">
                © {new Date().getFullYear()} Natcash — Secure Payment Gateway
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
