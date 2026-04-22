import React, { useState } from 'react';
import { Copy, Check, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const BlockchainProof = ({ txHash }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      toast.success('Transaction hash copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-blockchain-light/10 dark:bg-blockchain/10 border border-blockchain-light dark:border-blockchain rounded-lg">
      <Shield size={20} className="text-blockchain-light dark:text-blockchain" />
      <div className="flex-1">
        <div className="text-sm font-medium text-blockchain-light dark:text-blockchain">Preuve Blockchain</div>
        <code className="text-xs font-mono text-blockchain-light/80 dark:text-blockchain/80 break-all">
          {txHash}
        </code>
      </div>
      <button
        onClick={copyToClipboard}
        className="p-2 hover:bg-blockchain-light/20 dark:hover:bg-blockchain/20 rounded transition-colors"
        title="Copier le hash de transaction"
      >
        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-blockchain-light dark:text-blockchain" />}
      </button>
    </div>
  );
};

export default BlockchainProof;