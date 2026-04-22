import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const HashDisplay = ({ hash, label = 'Hash Blockchain' }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast.success('Hash copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg border border-blockchain-light dark:border-blockchain">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blockchain-light dark:text-blockchain">{label}</span>
        <button
          onClick={copyToClipboard}
          className="p-1 hover:bg-blockchain-light/20 dark:hover:bg-blockchain/20 rounded transition-colors"
          title="Copier le hash"
        >
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-blockchain-light dark:text-blockchain" />}
        </button>
      </div>
      <code className="text-xs font-mono text-blockchain-light dark:text-blockchain break-all bg-surface-light dark:bg-surface p-2 rounded">
        {hash}
      </code>
    </div>
  );
};

export default HashDisplay;