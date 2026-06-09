'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HeroSection from '@/components/HeroSection';
import ScannerUpload from '@/components/ScannerUpload';
import LiveScanner from '@/components/LiveScanner';
import AnalyzerSelection from '@/components/AnalyzerSelection';

export default function Home() {
  const [mode, setMode] = useState<'idle' | 'image' | 'live'>('idle');

  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-50 font-sans selection:bg-amber-500/30">
      <HeroSection compact={mode !== 'idle'} />
      
      <div className="relative z-20 pb-20">
        <AnimatePresence mode="wait">
          {mode === 'idle' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="-mt-10"
            >
              <AnalyzerSelection onSelect={setMode} />
            </motion.div>
          )}

          {mode === 'image' && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ScannerUpload onBack={() => setMode('idle')} />
            </motion.div>
          )}

          {mode === 'live' && (
            <motion.div
              key="live"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <LiveScanner onBack={() => setMode('idle')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dynamic footer bg */}
      <div className="fixed bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-sky-500/5 to-transparent pointer-events-none -z-10" />
    </main>
  );
}

