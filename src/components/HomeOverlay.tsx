import React from 'react';
import { motion } from 'framer-motion';
import { Play, Trophy, Wallet } from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

interface HomeOverlayProps {
  onPlay: () => void;
  onShowLeaderboard: () => void;
}

export const HomeOverlay: React.FC<HomeOverlayProps> = ({ onPlay, onShowLeaderboard }) => {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-30">
      {/* Semi-transparent dark wash for background contrast */}
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-[340px] px-8 py-10 rounded-[32px] bg-white/75 border border-white/50 backdrop-blur-xl shadow-premium text-center"
      >
        {/* Glowing Ambient Halo behind logo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-tr from-baseblue/20 to-cyan-300/10 rounded-full blur-3xl -z-10" />

        {/* Logo Icon and Ring */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="relative w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-tr from-baseblue to-cyan-400 flex items-center justify-center shadow-button"
        >
          <div className="w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-baseblue animate-pulse" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="font-sans font-extrabold text-3xl tracking-tight text-slate-800 mb-2">
          Base<span className="bg-gradient-to-r from-baseblue to-cyan-500 bg-clip-text text-transparent">Bounce</span>
        </h1>
        
        {/* Tagline */}
        <p className="font-sans text-xs font-semibold text-slate-400 tracking-wider uppercase mb-8">
          Endless Arcade on Base
        </p>

        {/* Interactive Menu Stack */}
        <div className="flex flex-col gap-3.5">
          {/* Main Play Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPlay}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-sans font-extrabold text-sm tracking-widest uppercase bg-baseblue text-white shadow-button hover:shadow-premium-hover transition-all duration-300"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Game</span>
          </motion.button>

          {/* Wallet Connection / Status Display */}
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-sans font-bold text-xs tracking-wide bg-white/90 border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-300 shadow-sm"
            >
              <Wallet className="w-4 h-4 text-baseblue" />
              <span>Connect Wallet to Submit</span>
            </button>
          ) : (
            <div className="py-3 px-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-center">
              <span className="font-sans font-bold text-[11px] text-baseblue/90 uppercase tracking-widest block mb-0.5">
                Connected Address
              </span>
              <span className="font-sans font-semibold text-xs text-slate-500">
                {address?.slice(0, 8)}...{address?.slice(-6)}
              </span>
            </div>
          )}

          {/* Open Leaderboard */}
          <button
            onClick={onShowLeaderboard}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-sans font-bold text-xs tracking-wide bg-white/90 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-baseblue transition-all duration-300 shadow-sm"
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>
        </div>

        {/* Quick Instructions */}
        <p className="font-sans text-[10px] text-slate-400 mt-8 leading-relaxed px-4">
          Tap or press Spacebar to bounce. Avoid obstacles and survive as speed increases!
        </p>
      </motion.div>
    </div>
  );
};
