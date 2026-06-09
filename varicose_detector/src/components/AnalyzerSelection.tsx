'use client';

import { motion } from 'framer-motion';
import { Camera, Image as ImageIcon, ArrowRight } from 'lucide-react';

interface Props {
    onSelect: (mode: 'image' | 'live') => void;
}

export default function AnalyzerSelection({ onSelect }: Props) {
    const modes = [
        {
            id: 'image' as const,
            title: 'Image Analysis',
            description: 'Upload a clinical photograph for a deep diagnostic scan and CEAP classification.',
            icon: ImageIcon,
            color: 'from-amber-500/20 to-amber-600/5',
            borderColor: 'border-amber-500/30',
            iconColor: 'text-amber-400',
        },
        {
            id: 'live' as const,
            title: 'Live Clinical Stream',
            description: 'Connect to an IP camera (ESP32) for real-time frame-by-frame vascular monitoring.',
            icon: Camera,
            color: 'from-sky-500/20 to-sky-600/5',
            borderColor: 'border-sky-500/30',
            iconColor: 'text-sky-400',
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="grid md:grid-cols-2 gap-8">
                {modes.map((mode, idx) => (
                    <motion.div
                        key={mode.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => onSelect(mode.id)}
                        className={`group relative p-8 rounded-3xl border ${mode.borderColor} bg-gradient-to-br ${mode.color} hover:bg-opacity-20 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40`}
                    >
                        <div className="flex flex-col h-full">
                            <div className={`p-4 rounded-2xl bg-black/40 w-fit mb-6 ${mode.iconColor}`}>
                                <mode.icon size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                                {mode.title}
                                <ArrowRight className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" size={20} />
                            </h3>
                            <p className="text-slate-400 leading-relaxed mb-8">
                                {mode.description}
                            </p>
                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className={`text-sm font-medium ${mode.iconColor}`}>
                                    Select Mode
                                </span>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <ArrowRight size={16} className="text-white" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Decorative glow */}
                        <div className="absolute -inset-2 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-[40px] pointer-events-none" />
                    </motion.div>
                ))}
            </div>
            
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-slate-500 text-sm mt-12"
            >
                Professional diagnostic tool. Choose a mode to begin clinical assessment.
            </motion.p>
        </div>
    );
}
