import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, RefreshCw, User } from 'lucide-react';

interface LeaderboardEntry {
  player: string;
  score: number;
  isCurrentUser: boolean;
}

interface LeaderboardOverlayProps {
  onClose: () => void;
  entries: LeaderboardEntry[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const LeaderboardOverlay: React.FC<LeaderboardOverlayProps> = ({
  onClose,
  entries,
  isLoading,
  onRefresh,
}) => {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 25,
        stiffness: 350,
        staggerChildren: 0.05,
      },
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300 } },
  };

  const formatAddress = (addr: string) => {
    if (addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-40">
      {/* Dark wash backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/25 backdrop-blur-[3px]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative w-full max-w-[340px] h-[80vh] max-h-[500px] flex flex-col rounded-[32px] bg-white/80 border border-white/60 backdrop-blur-xl shadow-premium overflow-hidden"
      >
        {/* Glow Header Effect */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-baseblue/10 to-transparent -z-10" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100/65">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-baseblue fill-baseblue/10" />
            <h3 className="font-sans font-extrabold text-lg text-slate-800">
              Leaderboard
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`p-2 rounded-full hover:bg-slate-100/60 text-slate-400 hover:text-baseblue transition-all duration-300 ${
                isLoading ? 'animate-spin text-baseblue' : ''
              }`}
              title="Refresh scores"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100/60 text-slate-400 hover:text-slate-600 transition-all duration-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Score List Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-7 h-7 text-baseblue animate-spin" />
              <p className="font-sans font-semibold text-xs text-slate-400 tracking-wide">
                Fetching Base events...
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 text-center px-4">
              <Trophy className="w-8 h-8 text-slate-300" />
              <p className="font-sans font-semibold text-xs leading-relaxed">
                No highscores recorded yet. Be the first to secure a spot!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {entries.map((entry, index) => {
                  const rank = index + 1;
                  let rankStyles = 'bg-slate-100 text-slate-500';
                  let cardStyles = 'bg-white/60 border-slate-100/50';

                  if (rank === 1) {
                    rankStyles = 'bg-yellow-100 text-yellow-600 font-extrabold';
                    cardStyles = 'bg-yellow-50/20 border-yellow-200/40 shadow-sm';
                  } else if (rank === 2) {
                    rankStyles = 'bg-slate-200 text-slate-600 font-extrabold';
                    cardStyles = 'bg-slate-100/10 border-slate-200/30';
                  } else if (rank === 3) {
                    rankStyles = 'bg-amber-100 text-amber-700 font-extrabold';
                  }

                  if (entry.isCurrentUser) {
                    cardStyles = 'bg-blue-50/70 border-baseblue/25 shadow-sm ring-1 ring-baseblue/10';
                  }

                  return (
                    <motion.div
                      key={`${entry.player}-${entry.score}`}
                      variants={itemVariants}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 ${cardStyles}`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-sans text-xs font-bold ${rankStyles}`}>
                          {rank}
                        </div>

                        {/* Player name */}
                        <div className="flex items-center gap-1.5">
                          {entry.isCurrentUser && <User className="w-3.5 h-3.5 text-baseblue" />}
                          <span className={`font-sans text-xs tracking-tight ${
                            entry.isCurrentUser ? 'font-bold text-slate-800' : 'font-medium text-slate-600'
                          }`}>
                            {formatAddress(entry.player)}
                          </span>
                          {entry.isCurrentUser && (
                            <span className="font-sans font-bold text-[9px] uppercase tracking-wider text-baseblue bg-blue-100/50 px-1.5 py-0.5 rounded-md">
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Player Score */}
                      <span className={`font-sans text-sm font-black ${
                        entry.isCurrentUser ? 'text-baseblue' : 'text-slate-800'
                      }`}>
                        {entry.score}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer info showing Base Mainnet status */}
        <div className="bg-slate-50/70 px-6 py-4 text-center border-t border-slate-100/50">
          <p className="font-sans font-bold text-[10px] text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Verified via Base Chain Event Logs
          </p>
        </div>
      </motion.div>
    </div>
  );
};
