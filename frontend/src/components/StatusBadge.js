import React from 'react';

const statusConfig = {
  ACTIF: { color: 'bg-valid-light dark:bg-valid text-white', icon: '✅' },
  EXPIRE: { color: 'bg-warning-light dark:bg-warning text-white', icon: '⚠️' },
  EXPIRÉ: { color: 'bg-warning-light dark:bg-warning text-white', icon: '⚠️' },
  PERDU: { color: 'bg-amber-700 text-white', icon: '📋' },
  REVOQUE: { color: 'bg-red-600 text-white', icon: '🚨' },
  RÉVOQUÉ: { color: 'bg-red-600 text-white', icon: '🚨' },
  SUSPECT: { color: 'bg-red-800 text-white', icon: '⚠️' },
  INTERDIT: { color: 'bg-red-700 text-white', icon: '🚫' },
  VALIDE: { color: 'bg-valid-light dark:bg-valid text-white', icon: '✅' },
  REMPLACÉ: { color: 'bg-amber-600 text-white', icon: '🔄' },
};

const StatusBadge = ({ statut }) => {
  const config = statusConfig[statut] || { color: 'bg-gray-500 text-white', icon: '❓' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {statut}
    </span>
  );
};

export default StatusBadge;