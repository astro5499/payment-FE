import React, {useEffect, useState} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import axios from "axios";
import {API_BASE_URL, STATUS} from "../constant/Constant";
import '../resouces/PaymentStatusPage.css';

export default function PaymentResult() {
    const {paymentId} = useParams();
    const [searchParams] = useSearchParams(); // lấy query param nếu có ?status=SUCCESS
    const [status, setStatus] = useState(null);
    const navigate = useNavigate();

    const getStatusConfig = () => {
        switch (status) {
            case STATUS.INIT:
                return {
                    icon: (
                        <svg
                            className="mx-auto h-16 w-16 text-blue-500 animate-pulse"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    ),
                    title: 'Đang khởi tạo thanh toán...',
                    description: 'Vui lòng chờ trong giây lát.',
                    bgColor: 'bg-blue-50',
                    buttonText: null,
                    showButton: false
                };

            case STATUS.SUCCESS:
                return {
                    icon: (
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
                    ),
                    title: 'Thanh toán thành công!',
                    description: 'Cảm ơn quý khách đã sử dụng dịch vụ. Chúng tôi sẽ chuyển hướng bạn ngay.',
                    bgColor: 'bg-green-50',
                    buttonText: 'Tiếp tục',
                    buttonClass: 'bg-green-500 hover:bg-green-600 focus:ring-green-500',
                    showButton: false
                };

            case STATUS.FAILED:
                return {
                    icon: (
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
                    ),
                    title: 'Thanh toán thất bại!',
                    description: 'Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.',
                    bgColor: 'bg-red-50',
                    buttonText: 'Thử lại',
                    buttonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
                    showButton: false
                };

            case STATUS.PENDING:
                return {
                    icon: (
                        <div className="mx-auto h-16 w-16 relative">
                            <svg
                                className="animate-spin h-16 w-16 text-yellow-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                        </div>
                    ),
                    title: 'Đang xử lý thanh toán...',
                    description: 'Giao dịch của bạn đang được xử lý. Vui lòng không tắt trang này.',
                    bgColor: 'bg-yellow-50',
                    buttonText: null,
                    showButton: false
                };

            case STATUS.EXPIRED:
                return {
                    icon: (
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
                    ),
                    title: 'Phiên thanh toán đã hết hạn',
                    description: 'Thời gian thanh toán đã kết thúc. Vui lòng tạo giao dịch mới.',
                    bgColor: 'bg-gray-50',
                    buttonText: 'Tạo giao dịch mới',
                    buttonClass: 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-500',
                    showButton: false
                };

            default:
                return {
                    icon: null,
                    title: '',
                    description: '',
                    bgColor: 'bg-white',
                    buttonText: null,
                    showButton: false
                };
        }
    };

    const config = getStatusConfig();

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const paymentId = searchParams.get("paymentId")
                if (paymentId) {
                    // Nếu có paymentId -> call API
                    const response = await axios.get(`${API_BASE_URL}/payment/${paymentId}`);
                    console.log("API Response:", response.data);
                    setStatus(response.data.status);
                } else {
                    setStatus(STATUS.PENDING);
                }
            } catch (error) {
                console.error("Error fetching status:", error);
                setStatus(STATUS.FAILED);
            }
        };

        fetchStatus().then(r => {});
    }, [paymentId, searchParams]);


    function onContinue() {
        navigate('/orders', {
            state: {
                message: 'Thanh toán thành công',
                paymentId: paymentId
            }
        });
    }

    function onRetry() {
        navigate('/payment', {
            state: {
                paymentId: paymentId,
                retry: true
            }
        });
    }

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
                <div
                    className={`payment-status-card ${config.bgColor} bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full`}
                >
                    <div className="animate-fadeIn">
                        {config.icon}
                    </div>

                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 animate-slideDown">
                        {config.title}
                    </h2>

                    <p className="mt-2 text-lg text-gray-600 animate-slideUp">
                        {config.description}
                    </p>

                    {config.showButton && (
                        <button
                            onClick={status === 'FAILED' || status === 'EXPIRED' ? onRetry : onContinue}
                            className={`payment-status-button mt-8 px-6 py-3 ${config.buttonClass} text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 animate-fadeIn`}
                        >
                            {config.buttonText}
                        </button>
                    )}
                </div>
            </main>

            {/* FOOTER */}
            <footer className="bg-orange-500 text-white p-4 text-center text-sm">
                © {new Date().getFullYear()} P2P Haiti Solution — Cổng thanh toán an toàn
            </footer>
        </div>
    );
}
