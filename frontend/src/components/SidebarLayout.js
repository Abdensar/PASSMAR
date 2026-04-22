import React from 'react';
import { LogOut, User, Clock, Wifi, WifiOff } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import logo from '../tools/Logo_1.png';

const SidebarLayout = ({ role, agentName, children, onLogout, blockchainConnected = true, navigationItems, onNavigate }) => {
  const getRoleColor = () => {
    switch (role) {
      case 'DOUANE': return 'bg-gold-light dark:bg-gold text-dark dark:text-dark';
      case 'POLICE': return 'bg-blockchain-light dark:bg-blockchain text-white';
      case 'ADMIN': return 'bg-primary-light dark:bg-primary text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#FDF6E3] dark:bg-surface-dark text-text-light dark:text-text border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-lg">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <img src={logo} alt="PASSMAR" className="h-12 w-auto mx-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.map((item, index) => (
              <li key={index}>
                <button
                  onClick={() => onNavigate && onNavigate(item.key)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-[#FAE19E]/40 hover:bg-[#FAE19E] dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors text-left text-text-light dark:text-text"
                >
                  <span className="text-muted-light dark:text-muted">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Role Badge */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium ${getRoleColor()}`}>
            {role}
          </div>
        </div>

        {/* Agent Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <User size={16} className="text-muted-light dark:text-muted" />
            <span className="text-sm text-text-light dark:text-text">{agentName}</span>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-[#FDF6E3] dark:bg-surface-dark text-text-light dark:text-text border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-text-light dark:text-text">PASSMAR - {role}</h1>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="flex items-center gap-2">
                {blockchainConnected ? (
                  <>
                    <Wifi size={16} className="text-green-400" />
                    <span className="text-sm text-green-400">Blockchain: Connectée</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={16} className="text-red-400" />
                    <span className="text-sm text-red-400">Blockchain: Déconnectée</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-light dark:text-muted">
                <Clock size={16} />
                <span>{new Date().toLocaleString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto bg-[#E8D5B7] dark:bg-background-dark">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;