import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const AlertResult = ({ code, message, data }) => {
  const getConfig = () => {
    if (code === 200 || code === 'success') {
      return {
        color: 'bg-valid-light/10 dark:bg-valid/10 border-valid-light dark:border-valid text-valid-light dark:text-valid',
        icon: <CheckCircle size={24} />,
        title: 'Succès'
      };
    } else if (code === 400 || code === 'warning') {
      return {
        color: 'bg-warning-light/10 dark:bg-warning/10 border-warning-light dark:border-warning text-warning-light dark:text-warning',
        icon: <AlertTriangle size={24} />,
        title: 'Attention'
      };
    } else {
      return {
        color: 'bg-red-500/10 border-red-500 text-red-500',
        icon: <XCircle size={24} />,
        title: 'Erreur'
      };
    }
  };

  const config = getConfig();

  return (
    <div className={`p-6 rounded-lg border-2 ${config.color} max-w-2xl mx-auto`}>
      <div className="flex items-start gap-4">
        {config.icon}
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">{config.title}</h3>
          <p className="text-sm mb-4">{message}</p>
          {data && (
            <div className="bg-dark/50 p-3 rounded text-xs font-mono">
              {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertResult;