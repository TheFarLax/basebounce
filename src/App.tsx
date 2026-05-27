import { useState, useEffect, useCallback } from 'react';
import { createConfig, http, WagmiProvider, useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { parseAbiItem } from 'viem';

// Components
import { GameCanvas } from './components/GameCanvas';
import { HomeOverlay } from './components/HomeOverlay';
import { GameOverOverlay } from './components/GameOverOverlay';
import { LeaderboardOverlay } from './components/LeaderboardOverlay';
import { Navbar } from './components/Navbar';

// ABI for BaseBounce Smart Contract
const BASE_BOUNCE_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" }
    ],
    "name": "ScoreSubmitted",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "bestScore",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "score", "type": "uint256" }],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Example Contract Addresses (Base Sepolia deployment or fallback)
const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: '0x14E70899ea499D1124508F8027002d5fF4ceb4B0', // Live Base Mainnet contract
  [baseSepolia.id]: '0x14E70899ea499D1124508F8027002d5fF4ceb4B0', // Use mainnet fallback or custom Sepolia address
};

const DEFAULT_CONTRACT = '0x14E70899ea499D1124508F8027002d5fF4ceb4B0';

// Mock Leaderboard data for premium initial experience when offline or contract is new
const MOCK_LEADERBOARD = [
  { player: '0xbasebouncy.eth', score: 148, isCurrentUser: false },
  { player: '0x3c2d...8921', score: 125, isCurrentUser: false },
  { player: 'bobby.base.eth', score: 98, isCurrentUser: false },
  { player: '0x7e8c...fa12', score: 85, isCurrentUser: false },
  { player: 'orbmaster.base.eth', score: 62, isCurrentUser: false },
  { player: '0x19a2...98de', score: 45, isCurrentUser: false },
];

// Configure Wagmi
const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [injected()],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

function GameAppInner() {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING' | 'GAMEOVER'>('HOME');
  const [score, setScore] = useState<number>(0);
  const [localBest, setLocalBest] = useState<number>(() => {
    const saved = localStorage.getItem('basebounce_best_score');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Modals / Overlays
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>(MOCK_LEADERBOARD);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(false);

  // Wagmi Hooks
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract, data: txHash, error: submitErr, reset: resetTx } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const activeContract = chain ? CONTRACT_ADDRESSES[chain.id] || DEFAULT_CONTRACT : DEFAULT_CONTRACT;

  // Sync / Read high score from local storage
  const handleScoreChange = useCallback((newScore: number) => {
    setScore(newScore);
    if (newScore > localBest) {
      setLocalBest(newScore);
      localStorage.setItem('basebounce_best_score', newScore.toString());
    }
  }, [localBest]);

  // Handle Game Over transition
  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState('GAMEOVER');
    resetTx(); // Reset transaction states for new submissions
  }, [resetTx]);

  const startNewGame = () => {
    setScore(0);
    setGameState('PLAYING');
  };

  // Fetch decentralized leaderboard entries directly from emitted event logs
  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    try {
      if (!publicClient) {
        throw new Error("No Web3 public client available");
      }

      // Query event logs
      const logs = await publicClient.getLogs({
        address: activeContract,
        event: parseAbiItem('event ScoreSubmitted(address indexed player, uint256 score)'),
        fromBlock: 0n, // Start from genesis for local networks/testnets, can optimize with recent blocks
      });

      // Parse and aggregate logs
      const playerBestMap: Record<string, number> = {};

      logs.forEach((log) => {
        const playerAddr = log.args.player;
        const playerScore = Number(log.args.score);

        if (playerAddr) {
          const lowerAddr = playerAddr.toLowerCase();
          if (!playerBestMap[lowerAddr] || playerScore > playerBestMap[lowerAddr]) {
            playerBestMap[lowerAddr] = playerScore;
          }
        }
      });

      // Map to standard layout
      const dbEntries = Object.entries(playerBestMap).map(([player, score]) => ({
        player,
        score,
        isCurrentUser: address ? player.toLowerCase() === address.toLowerCase() : false,
      }));

      // Sort scores descending
      dbEntries.sort((a, b) => b.score - a.score);

      // Merge with mock scores to ensure rich UI if logs are empty (e.g. fresh contract deployment)
      const mergedMap: Record<string, any> = {};
      
      // Load mock items first
      MOCK_LEADERBOARD.forEach(item => {
        mergedMap[item.player.toLowerCase()] = item;
      });

      // Load blockchain items (overwriting mock matching names or adding brand new ones)
      dbEntries.forEach(item => {
        mergedMap[item.player.toLowerCase()] = item;
      });

      const finalEntries = Object.values(mergedMap);
      finalEntries.sort((a, b) => b.score - a.score);

      setLeaderboardEntries(finalEntries.slice(0, 10)); // Top 10
    } catch (e) {
      console.warn("Failed to fetch blockchain events, falling back to mock logs:", e);
      // Fallback: update mock scores with connected wallet highscore if present
      const fallbackList = MOCK_LEADERBOARD.map(item => ({
        ...item,
        isCurrentUser: address ? item.player.toLowerCase() === address.toLowerCase() : false
      }));

      if (address && localBest > 0) {
        const exists = fallbackList.some(item => item.player.toLowerCase() === address.toLowerCase());
        if (!exists) {
          fallbackList.push({
            player: address,
            score: localBest,
            isCurrentUser: true
          });
        } else {
          fallbackList.forEach(item => {
            if (item.player.toLowerCase() === address.toLowerCase() && localBest > item.score) {
              item.score = localBest;
            }
          });
        }
      }
      fallbackList.sort((a, b) => b.score - a.score);
      setLeaderboardEntries(fallbackList.slice(0, 10));
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [publicClient, activeContract, address, localBest]);

  // Handle Score Submission Write transaction
  const submitScoreOnchain = () => {
    if (!address || !isConnected) return;
    resetTx();

    try {
      writeContract({
        address: activeContract,
        abi: BASE_BOUNCE_ABI,
        functionName: 'submitScore',
        args: [BigInt(score)],
      });
    } catch (e) {
      console.error("Write execution failed:", e);
    }
  };

  // Auto trigger leaderboard fetch on load or wallet change
  useEffect(() => {
    fetchLeaderboard();
  }, [address, fetchLeaderboard]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-50 via-blue-50/20 to-slate-50">
      {/* Top Navbar */}
      <Navbar onShowLeaderboard={() => setShowLeaderboard(true)} />

      {/* Main Core Viewport */}
      <main className="relative w-full max-w-[450px] aspect-[9/16] max-h-[85vh] rounded-[32px] border border-white/60 shadow-premium overflow-hidden bg-white/10 backdrop-blur-xs flex items-center justify-center mt-12">
        
        {/* HTML5 Canvas Engine */}
        <GameCanvas
          gameState={gameState}
          onGameOver={handleGameOver}
          onScoreChange={handleScoreChange}
          score={score}
        />

        {/* Real-time score ticker during active gameplay */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="font-sans font-black text-3xl tracking-tight text-slate-800 bg-white/80 border border-white/60 backdrop-blur-md px-6 py-2 rounded-full shadow-premium flex items-center gap-1.5 min-w-[70px] justify-center">
              {score}
            </div>
          </div>
        )}

        {/* Dynamic Overlays Container */}
        <AnimatePresence>
          {gameState === 'HOME' && (
            <HomeOverlay
              onPlay={startNewGame}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}

          {gameState === 'GAMEOVER' && (
            <GameOverOverlay
              score={score}
              bestScore={localBest}
              onRestart={startNewGame}
              onSubmitOnchain={submitScoreOnchain}
              submitting={isTxWaiting}
              txHash={txHash || null}
              submitError={submitErr ? submitErr.message.split('\n')[0] : null}
              submitSuccess={isTxSuccess}
            />
          )}

          {showLeaderboard && (
            <LeaderboardOverlay
              onClose={() => setShowLeaderboard(false)}
              entries={leaderboardEntries}
              isLoading={isLoadingLeaderboard}
              onRefresh={fetchLeaderboard}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <GameAppInner />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
