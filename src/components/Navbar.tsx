import React from 'react';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Volume2, VolumeX, Wallet, LogOut, ShieldAlert } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

interface NavbarProps {
  onShowLeaderboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onShowLeaderboard }) => {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  const { isMuted, toggleMute } = useAudio();

  // Format wallet address: 0x1234...5678
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Check if connected chain is Base (Mainnet: 8453 or Sepolia: 84532)
  const isCorrectChain = chain ? (chain.id === 8453 || chain.id === 84532) : false;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/30 shadow-sm">
      {/* Brand logo & symbol */}
      <div className="flex items-center gap-2.5 cursor-pointer select-none">
        <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-baseblue to-cyan-400 flex items-center justify-center shadow-button animate-pulse">
          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-inner" />
        </div>
        <span className="font-sans font-extrabold text-xl tracking-tight bg-gradient-to-r from-baseblue via-baseblue-light to-cyan-500 bg-clip-text text-transparent">
          BaseBounce
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Leaderboard button */}
        <button
          onClick={onShowLeaderboard}
          className="px-3.5 py-1.5 rounded-full font-sans font-semibold text-xs tracking-wide bg-white/80 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-baseblue shadow-sm hover:shadow transition-all duration-300"
        >
          Leaderboard
        </button>

        {/* Audio Mute toggle */}
        <button
          onClick={toggleMute}
          className={`p-2 rounded-full border transition-all duration-300 ${
            isMuted
              ? 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
              : 'bg-blue-50 border-blue-100 text-baseblue hover:bg-blue-100/60 shadow-sm'
          }`}
          title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Web3 status */}
        {isConnected && address ? (
          <div className="flex items-center gap-2">
            {!isCorrectChain && (
              <div 
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-sans font-bold text-[10px] uppercase tracking-wider animate-bounce"
                title="Wrong chain! Please switch to Base Network."
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Wrong Chain</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-full bg-white/95 border border-slate-200 shadow-sm">
              <span className="font-sans font-semibold text-xs text-slate-600">
                {formatAddress(address)}
              </span>
              <button
                onClick={() => disconnect()}
                className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-300"
                title="Disconnect Wallet"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full font-sans font-bold text-xs tracking-wider bg-baseblue hover:bg-baseblue-hover text-white shadow-button hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Connect Wallet</span>
          </button>
        )}
      </div>
    </nav>
  );
};
