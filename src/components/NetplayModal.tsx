import React, { useState, useEffect } from 'react';
import { netplay } from '../services/NetplayService';

interface Props {
  onClose: () => void;
}

export const NetplayModal: React.FC<Props> = ({ onClose }) => {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('Desconectado');
  const [role, setRole] = useState<'host' | 'client' | null>(null);

  useEffect(() => {
    netplay.onOfferCreated = (sdp) => {
      setToken(sdp);
      setStatus('Token gerado. Copie e envie para o P2!');
    };
    netplay.onConnected = () => {
      setStatus('Conectado! P2P Ativo.');
      setTimeout(onClose, 2000);
    };
    netplay.onDisconnected = () => {
      setStatus('Desconectado.');
    };
  }, [onClose]);

  const handleHost = () => {
    setRole('host');
    setStatus('Gerando token...');
    netplay.initialize(true);
  };

  const handleClient = () => {
    setRole('client');
    setStatus('Aguardando token do host...');
    netplay.initialize(false);
  };

  const handleConnect = async () => {
    if (!token) return;
    setStatus('Conectando...');
    const answer = await netplay.acceptOffer(token);
    if (answer) {
      setToken(answer);
      setStatus('Token de resposta gerado. Envie de volta para o Host!');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    alert('Token copiado!');
  };

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[120] p-6">
      <div className="bg-zinc-900 border border-cyan-500/50 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
        <h2 className="text-white font-black text-2xl mb-2">Netplay P2P</h2>
        <p className="text-cyan-400 text-sm mb-6 font-mono">Status: {status}</p>

        {!role && (
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleHost} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl">Host (Player 1)</button>
            <button onClick={handleClient} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl">Client (Player 2)</button>
          </div>
        )}

        {role && (
          <div className="space-y-4">
            <textarea
              className="w-full h-32 bg-black/50 border border-white/20 rounded p-3 text-white font-mono text-xs"
              placeholder="Cole o token do seu amigo aqui..."
              value={token}
              onChange={e => setToken(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleCopy} className="flex-1 bg-zinc-700 text-white py-2 rounded font-bold">Copiar Meu Token</button>
              <button onClick={handleConnect} className="flex-1 bg-cyan-500 text-white py-2 rounded font-bold">Conectar</button>
            </div>
          </div>
        )}

        <button onClick={onClose} className="mt-6 w-full text-white/50 hover:text-white font-bold">Fechar</button>
      </div>
    </div>
  );
};
