'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Settings, AlertCircle, Play, Pause, RefreshCw, X, Terminal, Info, ShieldAlert, CheckCircle2, Activity } from 'lucide-react';
import { analyzeImage, type ScanResult } from '@/lib/roboflow';
import { analyzeBase64WithGemini } from '@/lib/gemini';
import ResultCard from './ResultCard';
import AnatomyOverlay from './AnatomyOverlay';

interface Props {
    onBack: () => void;
}

interface LogEntry {
    time: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warn';
}

// Stable clinical sample image from Roboflow's public S3 (known to support CORS)
const SAMPLE_IMAGE_URL = "https://source.roboflow.com/669Onhc8bHR1J20q06cWf69V2k93/5879a6db6d226a03cc83262d4e8c1c5e/original.jpg";

export default function LiveScanner({ onBack }: Props) {
    const [streamUrl, setStreamUrl] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSampleMode, setIsSampleMode] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ fps: 0, latency: 0 });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showLogs, setShowLogs] = useState(false);
    const [isFrozen, setIsFrozen] = useState(false);
    const [frozenImage, setFrozenImage] = useState<string | null>(null);

    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastAnalysisTimeRef = useRef<number>(0);

    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [{ time, message, type }, ...prev].slice(0, 50));
        console.log(`[${time}] ${message}`);
    }, []);

    // Single frame capture and analysis
    const captureAndAnalyze = useCallback(async () => {
        if (!imgRef.current || !canvasRef.current || isAnalyzing) return;

        setIsAnalyzing(true);
        addLog("Capturing frame and initializing analysis...", "info");

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = imgRef.current;

        if (!ctx || (img instanceof HTMLImageElement && img.naturalWidth === 0)) {
            addLog("Still waiting for valid camera frame...", "warn");
            setIsAnalyzing(false);
            return;
        }

        // Optimization for high-res cameras: Cap at 1280px
        const MAX_DIM = 1280;
        let width = img instanceof HTMLImageElement ? img.naturalWidth : (img as any).videoWidth || 800;
        let height = img instanceof HTMLImageElement ? img.naturalHeight : (img as any).videoHeight || 600;

        if (width > MAX_DIM || height > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
            width *= ratio;
            height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        
        try {
            // Draw current frame to canvas
            ctx.drawImage(img, 0, 0, width, height);
            
            // Freeze the view with this frame
            const base64 = canvas.toDataURL('image/jpeg', 0.9);
            setFrozenImage(base64);
            setIsFrozen(true);

            // Run Gemini AI analysis (Primary)
            const startTime = performance.now();
            try {
                const scanResult = await analyzeBase64WithGemini(base64);
                setResult(scanResult);
                addLog(`Primary AI analysis complete in ${Math.round(performance.now() - startTime)}ms`, "success");
            } catch (geminiErr: any) {
                addLog("Primary AI failed, attempting fallback to Edge model...", "warn");
                // Secondary: Roboflow Fallback
                const fallbackResult = await analyzeImage(base64);
                setResult({ ...fallbackResult, isFallback: true });
                addLog(`Fallback Roboflow analysis complete in ${Math.round(performance.now() - startTime)}ms`, "success");
            }
            
            setError(null);
            const endTime = performance.now();
            setStats(prev => ({
                fps: 0, // Manual mode
                latency: Math.round(endTime - startTime)
            }));
        } catch (err: any) {
            if (err.name === 'SecurityError' || err.message.includes('tainted')) {
                const msg = "CORS Security Block: Camera IP is denying access. Add 'Access-Control-Allow-Origin: *' to ESP32 code.";
                setError(msg);
                addLog(msg, "error");
            } else {
                addLog(`Both AI models failed: ${err.message}`, "error");
            }
        } finally {
            setIsAnalyzing(false);
        }
    }, [isAnalyzing, addLog]);

    const nextAnalysis = () => {
        setIsFrozen(false);
        setFrozenImage(null);
        setResult(null);
        setError(null);
        addLog("Resuming live feed for next analysis", "info");
    };

    useEffect(() => {
        if (isConfigured && !isFrozen) {
            addLog(`Live Feed Active (${isSampleMode ? 'Sample Mode' : 'Live Stream'})`, "info");
        }
    }, [isConfigured, isFrozen, isSampleMode, addLog]);

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!streamUrl) return;
        
        // Security Check: Mixed Content
        if (window.location.protocol === 'https:' && streamUrl.startsWith('http:')) {
            addLog("Security Warning: Attempting to load HTTP stream from HTTPS site. This will likely be blocked by your browser.", "warn");
        }

        addLog(`Attempting connection to ${streamUrl}`, "info");
        setIsSampleMode(false);
        setIsConfigured(true);
        setIsAnalyzing(false);
        setIsFrozen(false);
    };

    const startSampleMode = () => {
        addLog("Initializing Sample Test Mode...", "success");
        setStreamUrl(SAMPLE_IMAGE_URL);
        setIsSampleMode(true);
        setIsConfigured(true);
        setIsAnalyzing(false);
        setIsFrozen(false);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-400"
                    >
                        <X size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Camera className={isSampleMode ? "text-amber-400" : "text-sky-400"} size={24} />
                            {isSampleMode ? "Sample Analysis Mode" : "Live Clinical Stream"}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {isSampleMode ? "Testing AI pipeline with clinical sample data" : "Real-time vascular monitoring via IP Camera"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowLogs(!showLogs)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${showLogs ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                    >
                        <Terminal size={16} />
                        <span className="text-sm font-medium">System Logs</span>
                    </button>

                    {isConfigured && (
                        <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500">Latency</span>
                                <span className="text-sky-400 font-mono text-sm">{stats.latency > 0 ? `${stats.latency}ms` : '--'}</span>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500">Status</span>
                                <span className={`flex items-center gap-1.5 text-sm font-medium ${!isFrozen ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${!isFrozen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                    {!isFrozen ? 'LIVE' : 'FROZEN'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showLogs && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-8 overflow-hidden"
                    >
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4 font-mono text-xs max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                            <div className="flex items-center gap-2 text-slate-500 mb-3 border-b border-white/5 pb-2">
                                <Terminal size={12} />
                                <span className="uppercase tracking-widest text-[10px]">Diagnostic Console Output</span>
                            </div>
                            {logs.length === 0 && <p className="text-slate-600">No logs generated yet...</p>}
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1.5 flex gap-3">
                                    <span className="text-slate-600 shrink-0">[{log.time}]</span>
                                    <span className={
                                        log.type === 'error' ? 'text-rose-400' : 
                                        log.type === 'warn' ? 'text-amber-400' :
                                        log.type === 'success' ? 'text-emerald-400' : 
                                        'text-slate-300'
                                    }>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isConfigured ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl mx-auto mt-12 grid md:grid-cols-2 gap-6"
                >
                    {/* Camera Config */}
                    <div className="glass p-8 rounded-3xl border border-sky-500/20 shadow-2xl">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-6">
                            <Settings size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Connect Camera</h3>
                        <p className="text-slate-400 text-sm mb-6">
                            Enter your ESP32-CAM stream URL to begin.
                        </p>

                        <form onSubmit={handleConnect} className="space-y-4">
                            <input 
                                type="text"
                                placeholder="http://192.168.x.x:81/stream"
                                value={streamUrl}
                                onChange={(e) => setStreamUrl(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-mono text-sm"
                            />
                            <button 
                                type="submit"
                                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                            >
                                <Play size={18} />
                                Connect Stream
                            </button>
                        </form>
                    </div>

                    {/* Test Mode */}
                    <div className="glass p-8 rounded-3xl border border-amber-500/20 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3">
                            <div className="px-2 py-0.5 rounded bg-amber-500 text-[10px] font-bold text-navy-mid">TESTING</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
                            <ShieldAlert size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No hardware?</h3>
                        <p className="text-slate-400 text-sm mb-6">
                            Verify the AI analysis engine using our clinical sample feed.
                        </p>
                        <button 
                            onClick={startSampleMode}
                            className="w-full border border-amber-500/30 hover:bg-amber-500/10 text-amber-400 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            Try Sample Feed
                        </button>
                    </div>
                </motion.div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="relative aspect-video rounded-3xl overflow-hidden glass border border-white/10 bg-black group shadow-2xl">
                            {/* The Stream */}
                            {streamUrl && !isFrozen ? (
                                <img 
                                    ref={imgRef}
                                    src={streamUrl} 
                                    alt="Live Stream"
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-cover"
                                    onLoad={() => addLog("Feed source successfully connected", "success")}
                                    onError={(e) => {
                                        let msg = "Failed to load stream. Ensure IP is reachable.";
                                        if (streamUrl.includes('192.168.')) {
                                            msg += " Check if your device and ESP32 are on the same WiFi.";
                                        }
                                        if (window.location.protocol === 'https:' && streamUrl.startsWith('http:')) {
                                            msg = "CRITICAL: Browser blocked 'Mixed Content'. You cannot load an http stream from an https website.";
                                        }
                                        setError(msg);
                                        addLog(msg, "error");
                                    }}
                                />
                            ) : frozenImage ? (
                                <img 
                                    src={frozenImage} 
                                    alt="Frozen Analysis Frame"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 font-mono text-slate-500 text-sm">
                                    INITIALIZING SECURE VIDEO PIPELINE...
                                </div>
                            )}

                            {/* Hidden capture img for reference when frozen (needed if we use a video element later) */}
                            {isFrozen && streamUrl && (
                                <img 
                                    ref={imgRef}
                                    src={streamUrl} 
                                    alt="Live Stream Reference"
                                    crossOrigin="anonymous"
                                    className="hidden"
                                />
                            )}

                            {/* Live Overlay Boxes */}
                            {result && result.findings && (
                                <AnatomyOverlay 
                                    findings={result.findings} 
                                    imageWidth={imgRef.current?.naturalWidth || 800} 
                                    imageHeight={imgRef.current?.naturalHeight || 600} 
                                />
                            )}

                            {/* Center Status Icon / Loading */}
                            {isAnalyzing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-sky-400 animate-spin" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Activity size={24} className="text-sky-400 animate-pulse" />
                                            </div>
                                        </div>
                                        <span className="text-white text-sm font-medium tracking-widest uppercase bg-black/60 px-4 py-1.5 rounded-full border border-white/10">AI Multimodal Analysis ...</span>
                                    </div>
                                </div>
                            )}

                            {!isFrozen && !isAnalyzing && !error && (
                                <div className="absolute top-6 left-6 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Live Stream Active
                                </div>
                            )}

                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex items-end justify-between">
                                <div className="flex gap-3">
                                    {!isFrozen ? (
                                        <button 
                                            onClick={captureAndAnalyze}
                                            disabled={isAnalyzing}
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50"
                                        >
                                            <Camera size={20} />
                                            Freeze & Analyze
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={nextAnalysis}
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            <RefreshCw size={20} />
                                            Next Analysis
                                        </button>
                                    )}
                                    
                                    <button 
                                        onClick={() => {
                                            const oldUrl = streamUrl;
                                            setStreamUrl('');
                                            addLog("Reloading stream source...", "info");
                                            setTimeout(() => setStreamUrl(oldUrl), 10);
                                        }}
                                        className="p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all text-white border border-white/20"
                                        title="Reload Stream"
                                    >
                                        <RefreshCw size={20} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isSampleMode && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                            Sample Mode
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setIsConfigured(false);
                                            setIsAnalyzing(false);
                                            setIsFrozen(false);
                                            addLog("Returning to configuration...", "info");
                                        }}
                                        className="text-white/60 hover:text-white text-xs font-medium uppercase tracking-widest px-4 py-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            </div>

                            {/* Error Overlay */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20">
                                            <AlertCircle className="text-rose-500" size={32} />
                                        </div>
                                        <h4 className="text-white font-bold text-lg mb-2">Connection Issues</h4>
                                        <p className="text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
                                            {error}
                                        </p>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => { setError(null); addLog("Retrying connection...", "info"); }}
                                                className="px-6 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all"
                                            >
                                                Retry Connection
                                            </button>
                                            <button 
                                                onClick={() => { setError(null); setIsConfigured(false); }}
                                                className="px-6 py-2 rounded-xl border border-white/10 text-slate-400 text-sm font-medium hover:text-white transition-all"
                                            >
                                                Back to Settings
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Troubleshooting Tips */}
                        {!isSampleMode && isConfigured && !error && (
                            <div className="glass p-5 rounded-2xl border border-white/5 flex gap-4 items-start">
                                <Info className="text-sky-400 shrink-0 mt-0.5" size={18} />
                                <div className="text-xs text-slate-400 leading-relaxed">
                                    <p className="font-bold text-slate-200 mb-1">Troubleshooting Tips:</p>
                                    <ul className="list-disc ml-4 space-y-1">
                                        <li>Ensure your ESP32-CAM is on the same WiFi network as this device.</li>
                                        <li>Check that you included <code className="text-sky-400/80">Access-Control-Allow-Origin: *</code> in your ESP32 code.</li>
                                        <li>If on local dev, use <code className="text-sky-400/80">http://localhost</code> to avoid mixed-content blocks.</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Report Sidebar */}
                    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar pr-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold tracking-widest uppercase">
                            Diagnostic Report
                        </div>
                        {result ? (
                            <ResultCard result={result} preview={frozenImage || undefined} isLive />
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center glass rounded-3xl border border-white/5 text-center p-8">
                                <RefreshCw className={`text-slate-700 mb-4 ${isAnalyzing ? 'animate-spin' : ''}`} size={32} />
                                <p className="text-slate-500 text-sm italic">
                                    {isAnalyzing ? "Waiting for first analysis frame..." : "Analysis is currently paused."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden capture canvas */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
}
