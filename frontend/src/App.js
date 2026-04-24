import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import "./App.css";
import { api } from "./services/apiClient";
import { ThemeProvider } from "./ThemeContext";
import LoginPage from "./pages/LoginPage";
import DashboardDouane from "./pages/DashboardDouane";
import PoliceLayout from "./pages/PoliceLayout";
import PolicePassportPage from "./pages/PolicePassportPage";
import PoliceTravelHistoryPage from "./pages/PoliceTravelHistoryPage";
import PanelAdmin from "./pages/PanelAdmin";
import LandingPage from "./pages/LandingPage";

function HomeRedirect({ agent }) {
  if (!agent) return <LandingPage />;
  if (agent.role === "DOUANE") return <Navigate to="/douane" replace />;
  if (agent.role === "POLICE") return <Navigate to="/police" replace />;
  return <Navigate to="/admin" replace />;
}

function AppRoutes() {
  const [agent, setAgent] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.me();
        if (!cancelled) setAgent(data.agent || null);
      } catch {
        if (!cancelled) setAgent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (agent === undefined) {
    return (
      <div className="page narrow">
        <p className="muted">Chargement de la session…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLoggedIn={setAgent} />} />
      <Route
        path="/douane"
        element={
          agent && agent.role === "DOUANE" ? (
            <DashboardDouane agent={agent} onLogout={() => setAgent(null)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/police"
        element={
          agent && agent.role === "POLICE" ? (
            <PoliceLayout agent={agent} onLogout={() => setAgent(null)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<PolicePassportPage />} />
        <Route path="voyages" element={<PoliceTravelHistoryPage />} />
        <Route path="*" element={<Navigate to="/police" replace />} />
      </Route>
      <Route
        path="/admin"
        element={
          agent && agent.role === "ADMIN" ? (
            <PanelAdmin agent={agent} onLogout={() => setAgent(null)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/" element={<HomeRedirect agent={agent} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1A1A2E',
            color: '#fff',
            border: '1px solid #2C7DA0',
          },
        }}
      />
      <AppRoutes />
    </ThemeProvider>
  );
}
