'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ClipboardList, X, AlertCircle } from 'lucide-react';
import { analyzeImageWithGemini } from '@/lib/gemini';
import { analyzeImage, type ScanResult } from '@/lib/roboflow';
import ResultCard from './ResultCard';

// ── Animation variants ──────────────────────────────────────────────────────
const dropzoneVariants = {
    idle: { scale: 1, borderColor: 'rgba(148,163,184,0.2)' },
    hover: { scale: 1.02, borderColor: 'rgba(245,158,11,0.6)' },
    active: { scale: 0.98, borderColor: 'rgba(14,165,233,0.6)' },
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
};

// ── Types ───────────────────────────────────────────────────────────────────
type Stage = 'idle' | 'preview' | 'scanning' | 'result' | 'error';

interface Props {
    onBack?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ScannerUpload({ onBack }: Props) {

    const [stage, setStage] = useState<Stage>('idle');
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const fileRef = useRef<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── File handling ──────────────────────────────────────────────────────
    const processFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file (JPG, PNG, WEBP).');
            setStage('error');
            return;
        }
        const url = URL.createObjectURL(file);
        fileRef.current = file;
        setPreview(url);
        setFileName(file.name);
        setStage('preview');
        setResult(null);
        setError(null);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    // ── Scan ───────────────────────────────────────────────────────────────
    const runScan = async () => {
        if (!fileRef.current) return;
        setStage('scanning');
        try {
            // Primary: Gemini AI
            const scanResult = await analyzeImageWithGemini(fileRef.current);
            setResult(scanResult);
            setStage('result');
        } catch (err: unknown) {
            console.warn("Primary AI (Gemini) failed, attempting fallback to Roboflow...", err);
            try {
                // Secondary: Roboflow Fallback
                const fallbackResult = await analyzeImage(fileRef.current);
                setResult({ ...fallbackResult, isFallback: true });
                setStage('result');
            } catch (fallbackErr: unknown) {
                const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Both Primary and Fallback AI models failed. Please check your connection.';
                setError(msg);
                setStage('error');
            }
        }
    };

    // ── Reset ──────────────────────────────────────────────────────────────
    const reset = () => {
        setStage('idle');
        setPreview(null);
        setResult(null);
        setError(null);
        setFileName('');
        fileRef.current = null;
        if (inputRef.current) inputRef.current.value = '';
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <section className="relative px-6 pb-24 max-w-4xl mx-auto">
            {onBack && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm"
                >
                    <X size={16} />
                    Exit Scanner
                </motion.button>
            )}
            <AnimatePresence mode="wait">

                {/* ── IDLE / DROPZONE ─────────────────────────────────── */}
                {stage === 'idle' && (
                    <motion.div
                        key="dropzone"
                        variants={dropzoneVariants}
                        animate={isDragging ? 'hover' : 'idle'}
                        initial="idle"
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.2 }}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onClick={() => inputRef.current?.click()}
                        className="relative cursor-pointer rounded-3xl border-2 border-dashed"
                        style={{ borderColor: isDragging ? 'rgba(245,158,11,0.6)' : 'rgba(148,163,184,0.2)' }}
                    >
                        {/* Glass bg */}
                        <div className="glass rounded-3xl p-12 md:p-20 text-center transition-colors duration-300"
                            style={{ background: isDragging ? 'rgba(245,158,11,0.05)' : undefined }}>

                            {/* Icon cluster */}
                            <motion.div
                                animate={isDragging ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="flex justify-center mb-6"
                            >
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center"
                                        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                        <Activity className="text-amber-400" size={36} />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30
                                  flex items-center justify-center">
                                        <ClipboardList className="text-teal-400" size={14} />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div variants={contentVariants} initial="hidden" animate="visible">
                                <motion.h2 variants={itemVariants}
                                    className="font-display text-3xl text-white mb-3">
                                    {isDragging ? 'Release to Scan' : 'Clinical Diagnostic Scanner'}
                                </motion.h2>
                                <motion.p variants={itemVariants} className="text-slate-400 mb-2">
                                    Upload patient leg imagery for automated vascular mapping
                                </motion.p>
                                <motion.p variants={itemVariants} className="text-slate-600 text-sm">
                                    Analyzes tortuosity, CEAP class, and anatomical localization
                                </motion.p>


                                <motion.div variants={itemVariants} className="mt-8 flex flex-wrap justify-center gap-3">
                                    {['Clear lighting', 'Full leg visible', 'No filters'].map(tip => (
                                        <span key={tip}
                                            className="px-3 py-1.5 text-xs rounded-full text-amber-400"
                                            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                            ✓ {tip}
                                        </span>
                                    ))}
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Hidden file input */}
                        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
                    </motion.div>
                )}

                {/* ── PREVIEW ─────────────────────────────────────────── */}
                {stage === 'preview' && preview && (
                    <motion.div key="preview"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="glass rounded-3xl overflow-hidden"
                    >
                        <div className="p-4 flex items-center justify-between border-b border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <span className="text-slate-300 text-sm truncate max-w-xs">{fileName}</span>
                            </div>
                            <button onClick={reset} className="p-2 rounded-full hover:bg-slate-700/50 transition-colors">
                                <X className="text-slate-400" size={16} />
                            </button>
                        </div>

                        <div className="relative">
                            <img src={preview} alt="Uploaded leg" className="w-full max-h-[420px] object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent" />
                        </div>

                        <div className="p-6 flex flex-col sm:flex-row gap-3">
                            <button onClick={reset}
                                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-all font-medium">
                                Choose Different Image
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={runScan}
                                className="flex-1 py-3 rounded-xl font-semibold text-navy-mid transition-all"
                                style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)', color: '#0B1120' }}
                            >
                                Analyze Image →
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {/* ── SCANNING ────────────────────────────────────────── */}
                {stage === 'scanning' && preview && (
                    <motion.div key="scanning"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="glass rounded-3xl overflow-hidden"
                    >
                        <div className="relative">
                            <img src={preview} alt="Scanning" className="w-full max-h-[420px] object-cover opacity-70" />

                            {/* Scan beam */}
                            <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute left-0 right-0 h-1 scan-line"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, #F59E0B, #FCD34D, #F59E0B, transparent)',
                                        boxShadow: '0 0 20px 4px rgba(245,158,11,0.4)'
                                    }} />
                            </div>

                            {/* Corner markers */}
                            {[['top-3 left-3', 'border-t border-l'], ['top-3 right-3', 'border-t border-r'],
                            ['bottom-3 left-3', 'border-b border-l'], ['bottom-3 right-3', 'border-b border-r']].map(([pos, borders], i) => (
                                <div key={i} className={`absolute ${pos} w-6 h-6 ${borders} border-amber-400/80`} />
                            ))}

                            {/* Overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center"
                                style={{ background: 'rgba(11,17,32,0.5)' }}>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    className="w-14 h-14 rounded-full border-2 border-transparent border-t-amber-400 mb-4"
                                />
                                <p className="text-amber-400 font-semibold text-lg">AI Multimodal Diagnosis…</p>
                                <p className="text-slate-500 text-sm mt-1">Powered by Advanced Clinical AI</p>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="p-4">
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: '0%' }}
                                    animate={{ width: '90%' }}
                                    transition={{ duration: 2.5, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #F59E0B, #FCD34D)' }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── RESULT ──────────────────────────────────────────── */}
                {stage === 'result' && result && preview && (
                    <motion.div key="result"
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <ResultCard result={result} preview={preview} onReset={reset} />
                    </motion.div>
                )}

                {/* ── ERROR ───────────────────────────────────────────── */}
                {stage === 'error' && (
                    <motion.div key="error"
                        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                        className="glass rounded-3xl p-10 text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30
                            flex items-center justify-center mx-auto mb-5">
                            <AlertCircle className="text-red-400" size={28} />
                        </div>
                        <h3 className="text-white font-display text-2xl mb-2">Analysis Failed</h3>
                        <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">{error}</p>
                        <button onClick={reset}
                            className="px-8 py-3 rounded-xl font-semibold transition-all"
                            style={{
                                background: 'rgba(245,158,11,0.15)', color: '#F59E0B',
                                border: '1px solid rgba(245,158,11,0.3)'
                            }}>
                            Try Again
                        </button>
                    </motion.div>
                )}

            </AnimatePresence>
        </section>
    );
}