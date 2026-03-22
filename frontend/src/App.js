import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { api } from "./services/apiClient";
import LoginPage from "./pages/LoginPage";
import DashboardDouane from "./pages/DashboardDouane";
import DashboardPolice from "./pages/DashboardPolice";
import PanelAdmin from "./pages/PanelAdmin";

function HomeRedirect({ agent }) {
  if (!agent) return <Navigate to="/login" replace />;
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
            <DashboardPolice agent={agent} onLogout={() => setAgent(null)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
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
  return <AppRoutes />;
}
