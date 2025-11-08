import React, {useCallback, useEffect, useState} from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import {Client} from "@stomp/stompjs";
import {QRCodeSVG} from "qrcode.react";
import {motion} from "framer-motion";
import {API_BASE_URL, STATUS} from "../constant/Constant";
import {API_PARTNERS_EXPIRED, API_PAYMENT_DETAIL} from "../constant/Api";
import PaymentStatus from "./component/PaymentStatus";
import {useNavigate, useSearchParams} from "react-router-dom";


export default function PaymentPage() {

    const [searchParams] = useSearchParams();
    const [paymentId, setPaymentId] = useState(null);
    const [transCode, setTransCode] = useState(null);
    const [dataQRCode, setDataQRCode] = useState({
        type: null,
        code: null,
        consumerQrCode: null,
        consumerType: null
    });
    const [status, setStatus] = useState(STATUS.INIT);
    const [amount, setAmount] = useState(100);
    const [expiredTime, setExpiredTime] = useState(300);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const connectWebSocket = (paymentId) => {
        console.log(paymentId);
        const socket = new SockJS("http://localhost:8282/ws");
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                client.subscribe(`/topic/payment-status-${paymentId}`, (message) => {
                    console.log("message: ", message);
                    setStatus(message.body);
                });
            },
            onStompError: (frame) => {
                console.error("Broker reported error:", frame.headers["message"]);
                console.error("Additional details:", frame.body);
            },
        });
        client.activate();
    };

    useEffect(() => {
        const paymentId = searchParams.get('paymentId');
        setPaymentId(paymentId);
        const fetchStatus = async () => {
            try {
                // Nếu có paymentId -> call API
                const res = await axios.get(`${API_BASE_URL}/${API_PAYMENT_DETAIL(paymentId)}`);
                console.log("API Response:", res);
                if (res?.data) {
                    if (res.data.status === 'EXPIRED') {
                        navigate(`/payment-result?paymentId=${res?.data?.paymentId}`);
                        return;
                    }
                    const remainingTime = getRemainingSeconds(res?.data?.createdAt, res?.data?.expiredTime);
                    if (remainingTime === 0){
                        callApiUpdateExpired().then(() => setStatus(STATUS.EXPIRED));
                        setTimeout(() => {
                            navigate(`/payment-result?paymentId=${paymentId}`);
                        }, 2000);
                        return
                    }

                    setPaymentId(res?.data?.paymentId)
                    setTransCode(res?.data?.transCode)
                    setStatus(STATUS.INIT);
                    setAmount(res?.data?.amount);
                    setExpiredTime(remainingTime);
                    setDataQRCode(JSON.parse(res?.data?.qrCode));
                    connectWebSocket(res.data.paymentId);
                }
            } catch (error) {
                console.error("Error fetching status:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus().then(r => {
        });
    }, [paymentId, searchParams]);


    function getRemainingSeconds(dateCreate, expireSeconds) {
        const createdTime = new Date(dateCreate);
        const expireTime = new Date(createdTime.getTime() + expireSeconds * 1000);
        const now = new Date();

        const diffMs = expireTime - now;
        const diffSec = Math.floor(diffMs / 1000);

        return diffSec > 0 ? diffSec : 0;
    }

    const callApiUpdateExpired = useCallback(async () => {
        try {
            // setLoading(true);
            const resEXPIRED = await axios.patch(`${API_BASE_URL}/${API_PARTNERS_EXPIRED(paymentId)}`);
            console.log('resEXPIRED', resEXPIRED);
        } catch (error) {
            console.error("Init payment failed", error);
        } finally {
            setLoading(false);
        }
    }, [paymentId]);

    useEffect(() => {
        if (status === STATUS.SUCCESS) {
            setTimeout(() => {
                navigate(`/payment-result?paymentId=${paymentId}`);
            }, 2000);
        }

        if (status === STATUS.EXPIRED) {
            callApiUpdateExpired().then(() => setStatus(STATUS.FAILED));
            setTimeout(() => {
                navigate(`/payment-result?paymentId=${paymentId}`);
            }, 2000);
        }

    }, [status, callApiUpdateExpired, paymentId, navigate]);

    // 🧭 Khi nhận status mới từ PaymentStatus (ví dụ: hết thời gian)
    const handleStatusChange = (newStatus) => {
        console.log("Trạng thái mới từ PaymentStatus:", newStatus);
        setStatus(newStatus);
    };

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
                <motion.div
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    transition={{duration: 0.5}}
                    className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 w-full max-w-2xl"
                >
                    <h2 className="text-center text-2xl font-bold text-orange-600 mb-6">
                        Nạp tiền vào ví Natcash
                    </h2>

                    {loading && (
                        <div className="flex flex-col items-center">
                            <motion.div
                                animate={{rotate: 360}}
                                transition={{repeat: Infinity, duration: 1}}
                                className="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full"
                            ></motion.div>
                            <p className="mt-4 text-orange-600 font-medium">
                                Đang lấy thông tin thanh toán, vui lòng chờ...
                            </p>
                        </div>
                    )}

                    {paymentId && !loading && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <div className="text-lg font-semibold text-orange-600 mb-2">
                                        Hướng dẫn chuyển khoản
                                    </div>
                                    <div className="bg-orange-50 rounded-lg p-4 space-y-2 mb-4">
                                        <div>
                                            <b>Ngân hàng:</b>{" "}
                                            <span className="text-gray-800">{dataQRCode.code}</span>
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
                                            <span className="text-red-600 font-bold">{transCode}</span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Vui lòng chuyển khoản đúng <b>số tiền</b> và{" "}
                                        <b>nội dung</b> để hệ thống tự động xác nhận.
                                        <br/>
                                        Sau khi chuyển khoản thành công, trạng thái sẽ tự động cập
                                        nhật.
                                    </div>
                                </div>

                                <div className="flex flex-col items-center">
                                    <QRCodeSVG
                                        value={dataQRCode.consumerQrCode}
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
                                    initial={{scale: 0.8}}
                                    animate={{scale: 1}}
                                    transition={{duration: 0.5}}
                                    className={`text-lg font-bold ${
                                        status === "SUCCESS"
                                            ? "text-green-600"
                                            : "text-orange-600"
                                    }`}
                                >
                                    <PaymentStatus status={status} expiredTime={expiredTime}
                                                   onStatusChange={handleStatusChange}/>
                                </motion.div>
                            </div>
                        </>
                    )}
                </motion.div>
            </main>

            {/* FOOTER */}
            <footer className="bg-orange-500 text-white p-4 text-center text-sm">
                © {new Date().getFullYear()} P2P Haiti Solution — Cổng thanh toán an toàn
            </footer>
        </div>
    );
}
