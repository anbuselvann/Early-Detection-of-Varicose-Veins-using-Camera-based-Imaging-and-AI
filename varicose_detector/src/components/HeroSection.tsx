'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Shield, Zap } from 'lucide-react';

const stats = [
    { icon: Shield, value: '94%', label: 'Detection Accuracy' },
    { icon: Zap, value: '<3s', label: 'Analysis Time' },
    { icon: Activity, value: '3', label: 'Risk Classifications' },
];

interface Props {
    compact?: boolean;
}

export default function HeroSection({ compact }: Props) {
    return (
        <section className={`relative overflow-hidden grid-bg transition-all duration-700 ${compact ? 'pt-8 pb-4 px-6' : 'pt-20 pb-16 px-6'}`}>
            {/* Decorative blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-10"
                style={{ background: 'radial-gradient(ellipse, #F59E0B 0%, transparent 70%)' }} />
            
            <div className="relative z-10 max-w-5xl mx-auto text-center">
                {/* Eyebrow */}
                {!compact && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-medium mb-8"
                    >
                        <span className="w-2 h-2 rounded-full bg-amber-400 pulse-amber inline-block" />
                        AI-Powered Vascular Health Analysis
                    </motion.div>
                )}

                {/* Headline */}
                <motion.h1
                    layout
                    className={`font-display text-white leading-tight ${compact ? 'text-2xl md:text-3xl mb-0' : 'text-5xl md:text-6xl lg:text-7xl mb-6'}`}
                >
                    Detect Varicose Veins{' '}
                    <em className="not-italic text-amber-400">Early.</em>
                    {!compact && <><br /><span className="text-slate-400">Act Before It Escalates.</span></>}
                </motion.h1>

                {/* Sub */}
                <AnimatePresence>
                    {!compact && (
                        <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed overflow-hidden"
                        >
                            Upload imagery or connect a live stream for automated vascular risk 
                            classification and clinical diagnostic mapping.
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* Stats */}
                <AnimatePresence>
                    {!compact && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex flex-wrap justify-center gap-6"
                        >
                            {stats.map(({ icon: Icon, value, label }) => (
                                <div key={label} className="glass rounded-2xl px-6 py-4 flex items-center gap-3">
                                    <Icon className="text-amber-400" size={20} />
                                    <div className="text-left">
                                        <p className="text-white font-semibold text-xl leading-none">{value}</p>
                                        <p className="text-slate-500 text-xs mt-1">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Decorative divider */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        </section>
    );
}