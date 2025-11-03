import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PaymentPage from "./page/PaymentPage";
import KobsendDashboard from "./page/KobsendDashboard";
import PaymentSuccess from "./page/KobsendDashboard";
import PaymentResult from "./page/PaymentResult";

function App() {
  return (
    <Router>
      <Routes>
          <Route path="/payment" element={<PaymentPage />} />
        <Route path="/" element={<KobsendDashboard />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payment-result" element={<PaymentResult />} />
      </Routes>
    </Router>
  );
}

export default App;
