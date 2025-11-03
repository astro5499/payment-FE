import React, {useEffect, useState} from "react";
import {STATUS} from "../../constant/Constant";

export default function PaymentStatus({status,expiredTime, onStatusChange}) {
    // const [timeLeft, setTimeLeft] = useState(2 * 60);
    // mock
    const [timeLeft, setTimeLeft] = useState(expiredTime);

    useEffect(() => {
        let timer;

        if (status === STATUS.INIT && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        }

        if (timeLeft === 0 && status === STATUS.INIT) {
            onStatusChange(STATUS.EXPIRED);
        }

        return () => clearInterval(timer);
    }, [status, timeLeft, onStatusChange]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const renderMessage = () => {
        if (status === STATUS.SUCCESS) {
            return "✅ Thanh toán thành công! Cảm ơn bạn.";
        } else if (status === STATUS.INIT) {
            return (
                <>
                    🕒 Đang chờ thanh toán, thời gian còn lại của bạn là{" "}
                    <span style={{color: "red"}}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
                </>
            );
        } else if (status === STATUS.FAILED) {
            return "❌ Thanh toán thất bại. Vui lòng thử lại.";
        } else if (status === STATUS.EXPIRED) {
            return "⏰ Hết thời gian thanh toán!";
        } else {
            return status;
        }
    };

    return (
        <div style={{textAlign: "center", fontFamily: "Nunito", marginTop: "40px"}}>
            <h3>{renderMessage()}</h3>
        </div>
    );
}
