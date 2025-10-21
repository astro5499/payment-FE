import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//import PaymentPage from "./page/PaymentPage";
import KobsendDashboard from "./page/KobsendDashboard";
import PaymentSuccess from "./page/KobsendDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<KobsendDashboard />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
      </Routes>
    </Router>
  );
}

export default App;