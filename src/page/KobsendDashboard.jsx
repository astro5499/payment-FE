import React, { useState } from "react";
import axios from "axios";
import CryptoJS from "crypto-js";

const PRIVATE_KEY = "Ad0igK7hkPaAHj7cIfNXgODh85EKS9w7";
const BASE_URL = "http://186.1.198.147:8282/channel";

// Signature cho request-cashin
function generateSignature(privateKey, requestId, from, to, amount, content, timestamp) {
  const accessKey = privateKey + requestId;
  const message = `{accessKey=${accessKey}$requestId=${requestId}$fromAccountNumber=${from}$toAccountNumber=${to}$amount=${amount.toFixed(2)}$content=${content}$timestamp=${timestamp}}`;
  return CryptoJS.HmacSHA256(message, privateKey).toString();
}

// Signature cho confirm-cashin đúng chuẩn C#
function generateSignatureConfirm(privateKey, requestId, txId, verifyCode, isConfirm) {
  const accessKey = privateKey + requestId;
  const message = `{accessKey=${accessKey}$requestId=${requestId}$txId=${txId}$verifyCode=1111$isConfirm=${isConfirm}}`;
  return CryptoJS.HmacSHA256(message, privateKey).toString(); // dùng privateKey làm key
}

export default function KobsendDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [apiResult, setApiResult] = useState(null);

  const initTransactions = () => {
    const mockTxns = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      requestUser: `User${i + 1}`,
      txId: null,
      date: new Date().toLocaleString(),
      fromAccountNumber: "50940825044",
      toAccountNumber: "50940000911",
      system: "Natcash",
      amount: parseFloat((Math.random() * 100).toFixed(2)),
      fee: 0,
      discount: 0,
      commission: 0,
      totalAmount: 0,
      status: "pending",
    }));
    setTransactions(mockTxns);
  };

  const handlePayment = async (txn) => {
    const requestId = crypto.randomUUID();
    const timestamp = Date.now();
    const signature = generateSignature(
      PRIVATE_KEY,
      requestId,
      txn.fromAccountNumber,
      txn.toAccountNumber,
      txn.amount,
      "transfer",
      timestamp
    );

    try {
      const resp = await axios.post(`${BASE_URL}/request-cashin`, {
        requestId,
        fromAccountNumber: txn.fromAccountNumber,
        toAccountNumber: txn.toAccountNumber,
        amount: txn.amount,
        content: "transfer",
        timestamp,
        signature,
      });

      if (resp.data.resultCode === "200" && resp.data.result) {
        const result = resp.data.result;

        setTransactions((prev) =>
          prev.map((t) =>
            t.id === txn.id
              ? {
                  ...t,
                  txId: result.txId,
                  status: "waiting_confirm",
                  fee: parseFloat(result.fee),
                  discount: parseFloat(result.discount),
                  commission: parseFloat(result.commission),
                  totalAmount: parseFloat(result.totalAmount),
                }
              : t
          )
        );
        setSelectedTxn({ ...txn, requestId, txId: result.txId });
        setApiResult(result);
        setShowPopup(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTxn || !apiResult) return;
    const verifyCode = "dyDrvTWQ1ZeQzxL8gP8ClKMajv+Prr/IMkOj1sAzHFz0pPPrTEUQ/7V2l45MDzfwHFJovYr5fS4Jf+pbgoEb5IsJwHk8fmzPu3hYTwThBEnB21rA73xlvSDkRObcfCOIyHl0YZrltpA43GoA6Mb8x/WErUiowKRVf71vYGxzxNpwU+mYZwmglkOhq2HxxlhtDH3stAScOK9lbGKDptt30nq+jrbMkNp+YehnNvIQICjs13gYiiOwm+k10iQBqsn8JchGYhyYM279SCcs7taYnxhIOd9HYRpOb+YRGtk7Stp2scs3U/X9NtbMBO2l9tGLYDfVj/FGF//dGvitnpcskQ==";
    const signature = generateSignatureConfirm(
      PRIVATE_KEY,
      selectedTxn.requestId,
      selectedTxn.txId,
      verifyCode,
      "1"
    );

    try {
      const resp = await axios.post(`${BASE_URL}/confirm-cashin`, {
        requestId: selectedTxn.requestId,
        txId: selectedTxn.txId,
        verifyCode,
        isConfirm: "1",
        signature,
        fromAccountNumber: selectedTxn.fromAccountNumber,
      });

      if (resp.data.resultCode === "200") {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === selectedTxn.id
              ? { ...t, status: "success", transactionId: resp.data.result?.transactionId }
              : t
          )
        );
        setSelectedTxn(null);
        setShowPopup(false);
        setApiResult(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = () => {
    setShowPopup(false);
    setSelectedTxn(null);
    setApiResult(null);
  };

  const statusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs">Pending</span>;
      case "waiting_confirm":
        return <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs">Waiting Confirm</span>;
      case "success":
        return <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs">Success</span>;
      default:
        return null;
    }
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
        <main className="flex-1 flex items-center justify-center p-4 min-h-screen">
        </main>

        {/* FOOTER */}
        <footer className="bg-orange-500 text-white p-4 text-center text-sm">
          © {new Date().getFullYear()} P2P Haiti Solution — Cổng thanh toán an toàn
        </footer>
      </div>
  );
}
