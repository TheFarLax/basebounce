import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, CloudLightning, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

interface GameOverOverlayProps {
  score: number;
  bestScore: number;
  onRestart: () => void;
  onSubmitOnchain: () => void;
  submitting: boolean;
  txHash: string | null;
  submitError: string | null;
  submitSuccess: boolean;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  score,
  bestScore,
  onRestart,
  onSubmitOnchain,
  submitting,
  txHash,
  submitError,
  submitSuccess,
}) => {
  const { isConnected } = useAccount();
  const { connect } = useConnect();

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 z-30">
      {/* Semi-transparent blur wash */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[3px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -15 }}
        className="relative w-full max-w-[340px] px-8 py-9 rounded-[32px] bg-white/80 border border-white/50 backdrop-blur-xl shadow-premium text-center"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-tr from-red-200/10 to-baseblue/10 rounded-full blur-3xl -z-10" />

        {/* Header Title */}
        <h2 className="font-sans font-black text-3xl tracking-tight text-slate-800 mb-6">
          Game Over
        </h2>

        {/* Scoreboard Cards */}
        <div className="grid grid-cols-2 gap-3.5 mb-8">
          <div className="py-4 px-3 rounded-2xl bg-white/70 border border-slate-100 shadow-sm">
            <span className="font-sans font-bold text-[10px] text-slate-400 uppercase tracking-widest block mb-0.5">
              Score
            </span>
            <span className="font-sans font-extrabold text-3xl text-slate-800">
              {score}
            </span>
          </div>

          <div className="py-4 px-3 rounded-2xl bg-blue-50/50 border border-blue-100/50 shadow-sm">
            <span className="font-sans font-bold text-[10px] text-baseblue/70 uppercase tracking-widest block mb-0.5">
              Best
            </span>
            <span className="font-sans font-extrabold text-3xl text-baseblue">
              {bestScore}
            </span>
          </div>
        </div>

        {/* Control Button stack */}
        <div className="flex flex-col gap-3.5">
          {/* Restart Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRestart}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-sans font-extrabold text-sm tracking-widest uppercase bg-baseblue text-white shadow-button hover:shadow-premium-hover transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </motion.button>

          {/* Onchain Submission Module */}
          <div className="border-t border-slate-150/60 pt-4 mt-1 flex flex-col gap-2">
            {!isConnected ? (
              // Connect Wallet First
              <button
                onClick={() => connect({ connector: injected() })}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-sans font-bold text-xs tracking-wide bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-350 transition-all duration-300"
              >
                Connect Wallet to Submit
              </button>
            ) : submitSuccess ? (
              // Transaction Success State
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 animate-fade-in">
                <div className="flex items-center gap-1.5 font-sans font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submitted Onchain!</span>
                </div>
                {txHash && (
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans font-bold text-[9px] uppercase tracking-wider text-emerald-600 hover:underline hover:text-emerald-800"
                  >
                    View Basescan
                  </a>
                )}
              </div>
            ) : submitting ? (
              // Submitting / Loading State
              <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-sans font-bold text-xs bg-slate-50 border border-slate-100 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-baseblue" />
                <span>Confirm in Wallet...</span>
              </div>
            ) : (
              // Submit Score Button
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onSubmitOnchain}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-sans font-bold text-xs tracking-wide bg-gradient-to-r from-baseblue/10 to-cyan-500/10 border border-baseblue/25 hover:border-baseblue/40 text-baseblue hover:from-baseblue hover:to-baseblue-light hover:text-white transition-all duration-300"
              >
                <CloudLightning className="w-4 h-4" />
                <span>Submit Highscore Onchain</span>
              </motion.button>
            )}

            {/* Error alerts */}
            {submitError && (
              <div className="flex items-start gap-1.5 p-3 mt-1 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-sans font-medium text-left leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Submission Reverted:</span> {submitError}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
