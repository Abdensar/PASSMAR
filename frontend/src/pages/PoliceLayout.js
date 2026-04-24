import { Outlet, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { api } from "../services/apiClient";

/**
 * Shell POLICE : barre latérale + zone de contenu (routes enfants).
 */
export default function PoliceLayout({ agent, onLogout }) {
  const navigate = useNavigate();

  const navigationItems = [
    { key: "controle", icon: "🛂", label: "Fiche & contrôle" },
    { key: "voyages", icon: "✈️", label: "Historique des voyages" },
  ];

  function onNavigate(key) {
    if (key === "controle") navigate("/police");
    else if (key === "voyages") navigate("/police/voyages");
  }

  async function doLogout() {
    await api.logout();
    onLogout();
    navigate("/login");
  }

  return (
    <SidebarLayout
      role="POLICE"
      agentName={agent?.identifiant}
      onLogout={doLogout}
      navigationItems={navigationItems}
      onNavigate={onNavigate}
    >
      <Outlet />
    </SidebarLayout>
  );
}
