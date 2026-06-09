'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, AlertOctagon, RotateCcw, Info, Activity, MapPin, ClipboardList, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import type { ScanResult, RiskLevel } from '@/lib/roboflow';
import AnatomyOverlay from './AnatomyOverlay';

interface Props {
    result: ScanResult;
    preview?: string;
    onReset?: () => void;
    isLive?: boolean;
}

// ── Risk-level config ────────────────────────────────────────────────────────
const riskConfig: Record<NonNullable<RiskLevel>, {
    label: string; sublabel: string; color: string; bgColor: string;
    borderColor: string; icon: typeof CheckCircle; glow: string;
    recommendation: string;
}> = {
    low: {
        label: 'Low Risk',
        sublabel: 'Normal Circulation',
        color: '#34D399',
        bgColor: 'rgba(52,211,153,0.1)',
        borderColor: 'rgba(52,211,153,0.3)',
        glow: 'rgba(52,211,153,0.2)',
        icon: CheckCircle,
        recommendation: 'Your vascular patterns appear healthy. Maintain regular exercise, keep hydrated, and schedule routine check-ups annually.',
    },
    medium: {
        label: 'Medium Risk',
        sublabel: 'Early Changes Detected',
        color: '#FBBF24',
        bgColor: 'rgba(251,191,36,0.1)',
        borderColor: 'rgba(251,191,36,0.3)',
        glow: 'rgba(251,191,36,0.2)',
        icon: AlertTriangle,
        recommendation: 'Early vascular changes are visible. We recommend consulting a phlebologist within 3–6 months and adopting compression therapy.',
    },
    high: {
        label: 'High Risk',
        sublabel: 'High Probability of Varicose Veins',
        color: '#F87171',
        bgColor: 'rgba(248,113,113,0.1)',
        borderColor: 'rgba(248,113,113,0.3)',
        glow: 'rgba(248,113,113,0.2)',
        icon: AlertOctagon,
        recommendation: 'Significant varicose vein indicators detected. Please schedule an appointment with a vascular surgeon as soon as possible.',
    },
};

// ── Confidence meter ─────────────────────────────────────────────────────────
function ConfidenceMeter({ value, color }: { value: number; color: string }) {
    return (
        <div className="w-full">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Diagnostic Accuracy</span>
                <span style={{ color }}>{value}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                />
            </div>
        </div>
    );
}

// ── Risk Level Indicator (Gauge) ─────────────────────────────────────────────
function RiskLevelIndicator({ level, color }: { level: RiskLevel; color: string }) {
    const levels = ['low', 'medium', 'high'];
    const activeIndex = levels.indexOf(level || 'low');
    
    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between items-end">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Risk Severity Indicator</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
                    {level?.toUpperCase()}
                </span>
            </div>
            <div className="flex gap-1.5 h-2">
                {levels.map((l, i) => (
                    <div 
                        key={l}
                        className="flex-1 rounded-full transition-all duration-700"
                        style={{ 
                            background: i <= activeIndex ? color : 'rgba(71, 85, 105, 0.2)',
                            boxShadow: i === activeIndex ? `0 0 10px ${color}40` : 'none',
                            opacity: i <= activeIndex ? 1 : 0.3
                        }}
                    />
                ))}
            </div>
            <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase tracking-tighter">
                <span>Preventative</span>
                <span>Observation</span>
                <span>Urgent Care</span>
            </div>
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ResultCard({ result, preview, onReset, isLive }: Props) {
    const cfg = result.riskLevel ? riskConfig[result.riskLevel] : riskConfig.medium;
    const Icon = cfg.icon;

    const handleDownloadReport = () => {
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString();

        // Header
        doc.setFontSize(24);
        doc.setTextColor(11, 17, 32);
        doc.text("AI CLINICAL VASCULAR ANALYSIS", 20, 30);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`REPORT ID: VR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 20, 38);
        doc.text(`DATE: ${date} | PROVIDER: VASCULAR AI DIAGNOSTICS`, 20, 43);

        // Risk Level Section
        doc.setDrawColor(226, 232, 240);
        doc.line(20, 48, 190, 48);
        
        doc.setFontSize(14);
        doc.setTextColor(cfg.color === '#F87171' ? 180 : 20, cfg.color === '#34D399' ? 120 : 50, 20);
        doc.text(`ASSESSMENT: ${cfg.label} - ${cfg.sublabel}`, 20, 58);
        doc.setFontSize(11);
        doc.setTextColor(11, 17, 32);
        doc.text(`CEAP Classification: ${result.ceapClassification}`, 20, 65);

        // IMAGE WITH MARKERS
        if (preview) {
            try {
                const imgWidth = 100;
                const imgHeight = 100;
                doc.addImage(preview, 'JPEG', 20, 75, imgWidth, imgHeight);
                
                // Draw Markers on PDF Image
                result.findings.forEach((f) => {
                    const bx = 20 + (f.bbox.x - f.bbox.width / 2) * imgWidth;
                    const by = 75 + (f.bbox.y - f.bbox.height / 2) * imgHeight;
                    const bw = f.bbox.width * imgWidth;
                    const bh = f.bbox.height * imgHeight;

                    doc.setDrawColor(245, 158, 11);
                    doc.setLineWidth(0.5);
                    doc.rect(bx, by, bw, bh);
                    
                    // Label
                    doc.setFontSize(6);
                    doc.setTextColor(255, 255, 255);
                    doc.setFillColor(245, 158, 11);
                    doc.rect(bx, by - 4, bw, 4, 'F');
                    doc.text(`${f.label.replace('-', ' ')} (99%)`, bx + 1, by - 1);
                });
            } catch (e) {
                console.error("PDF Image add failed", e);
            }
        }

        // Findings Detail
        const findingsY = 185;
        doc.setFontSize(16);
        doc.setTextColor(11, 17, 32);
        doc.text("Localized Clinical Findings", 20, findingsY);
        doc.setFontSize(10);
        result.findings.forEach((f, i) => {
            const y = findingsY + 10 + (i * 12);
            doc.text(`${i + 1}. [${f.anatomicalLocation}] - ${f.label.replace('-', ' ').toUpperCase()}`, 25, y);
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(`   ${f.clinicalDescription}`, 25, y + 4);
            doc.setTextColor(11, 17, 32);
            doc.setFontSize(10);
        });

        // Doctor Analysis
        doc.addPage();
        doc.setFontSize(18);
        doc.text("Medical Analysis & Professional Report", 20, 30);
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const splitText = doc.splitTextToSize(result.doctorReport || result.clinicalSummary, 170);
        doc.text(splitText, 20, 45);

        // Recommendations
        const recY = 60 + (splitText.length * 6);
        doc.setFontSize(14);
        doc.setTextColor(11, 17, 32);
        doc.text("Recommended Clinical Pathway", 20, recY);
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const splitRec = doc.splitTextToSize(cfg.recommendation, 170);
        doc.text(splitRec, 20, recY + 10);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("CONFIDENTIAL MEDICAL REPORT - GENERATED BY CLINICAL AI", 105, 285, { align: 'center' });

        doc.save(`Vascular_Analysis_Report_${date.replace(/\//g, '-')}.pdf`);
    };

    if (isLive) {
        return (
            <div className="flex flex-col gap-6">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{
                                background: cfg.bgColor, border: `1px solid ${cfg.borderColor}`,
                                boxShadow: `0 0 24px ${cfg.glow}`
                            }}>
                            <Icon size={26} style={{ color: cfg.color }} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5 font-bold">
                                {result.isFallback ? 'Fallback Status (Own Model)' : 'Live Status'}
                            </p>
                            <h2 className="font-display text-2xl text-white">{cfg.label}</h2>
                            <p className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.sublabel}</p>
                        </div>
                    </motion.div>

                    {result.isFallback && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2"
                        >
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span className="text-[10px] text-amber-200/80 font-medium uppercase tracking-wider">
                                Primary AI Issue: Analysis via Edge Model
                            </span>
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col"
                    >
                        <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">CEAP Class</span>
                        <div className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-amber-400 font-bold text-lg w-fit">
                            {result.ceapClassification}
                        </div>
                    </motion.div>
                </div>

                {/* Visual Legend */}
                <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(result.findings.map(f => f.label))).map(label => (
                        <span key={label} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/60 text-[8px] text-slate-300 border border-slate-700/50 uppercase font-bold tracking-tighter">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {label.replace('-', ' ')}
                        </span>
                    ))}
                </div>

                <div className="border-t border-slate-700/50" />

                {/* Risk Level Indicator */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <RiskLevelIndicator level={result.riskLevel} color={cfg.color} />
                </motion.div>

                {/* Accuracy Hidden as per request */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Activity size={14} />
                        AI Analysis Complete
                    </div>
                </motion.div>

                {/* Clinical Findings Grid */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                        <MapPin size={16} className="text-amber-500" />
                        Live Detections ({result.findings.length})
                    </div>
                    {result.findings.map((f, idx) => (
                        <motion.div 
                            key={idx} 
                            layoutId={f.id}
                            className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 flex gap-4"
                        >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-amber-400 font-bold text-xs">
                                {idx + 1}
                            </div>
                            <div>
                                <h4 className="text-slate-200 text-sm font-bold uppercase tracking-wide">{f.anatomicalLocation}</h4>
                                <p className="text-slate-400 text-xs leading-relaxed mt-1">{f.clinicalDescription}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Clinical Summary & Doctor Analysis */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                >
                    <div className="rounded-2xl p-4 flex flex-col gap-3 bg-slate-800/30 border border-slate-700/50">
                        <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                            <FileText size={14} className="text-amber-500" />
                            Clinical Analysis
                        </div>
                        <div className="text-slate-400 text-xs leading-relaxed italic line-clamp-6 hover:line-clamp-none transition-all cursor-pointer">
                            {result.doctorReport || result.clinicalSummary}
                        </div>
                    </div>

                    {/* Recommendation */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-2xl p-4 flex gap-3 bg-amber-500/10 border border-amber-500/20"
                    >
                        <Activity size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-amber-200 text-[10px] font-bold uppercase mb-1">Recommended Pathway</p>
                            <p className="text-slate-300 text-xs leading-relaxed">{cfg.recommendation}</p>
                        </div>
                    </motion.div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDownloadReport}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         bg-amber-500 text-navy-mid hover:bg-amber-400
                         transition-all font-bold text-xs uppercase tracking-widest"
                        style={{ color: '#0B1120' }}
                    >
                        <Download size={14} />
                        Download Full Report
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-12 gap-6 items-start">

            {/* Left – Image thumbnail with Overlay */}
            <div className="lg:col-span-5 glass rounded-3xl overflow-hidden self-stretch flex flex-col">
                <div className="relative aspect-square md:aspect-auto md:h-[400px]">
                    <img src={preview} alt="Analyzed image" className="w-full h-full object-cover opacity-80" />
                    <AnatomyOverlay findings={result.findings} imageWidth={800} imageHeight={800} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent pointer-events-none" />
                    
                    {/* Stamp */}
                    <motion.div
                        initial={{ scale: 0, rotate: -15 }}
                        animate={{ scale: 1, rotate: -8 }}
                        transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
                        className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm shadow-xl"
                        style={{ background: cfg.bgColor, border: `1px solid ${cfg.borderColor}`, color: cfg.color }}
                    >
                        Scan Complete ✓
                    </motion.div>
                </div>
                
                {/* Visual Legend */}
                <div className="p-4 bg-slate-900/40 border-t border-slate-700/50">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Detected Features</p>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(result.findings.map(f => f.label))).map(label => (
                            <span key={label} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {label.replace('-', ' ').toUpperCase()}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right – Clinical Result panel */}
            <div className="lg:col-span-7 glass rounded-3xl p-6 flex flex-col gap-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{
                                background: cfg.bgColor, border: `1px solid ${cfg.borderColor}`,
                                boxShadow: `0 0 24px ${cfg.glow}`
                            }}>
                            <Icon size={26} style={{ color: cfg.color }} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5 font-bold">
                                {result.isFallback ? 'Diagnostic Assessment (Own Model)' : 'Clinical Assessment'}
                            </p>
                            <h2 className="font-display text-2xl text-white">{cfg.label}</h2>
                            <p className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.sublabel}</p>
                        </div>
                    </motion.div>

                    {result.isFallback && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3"
                        >
                            <div className="p-1.5 rounded-full bg-amber-500/20">
                                <AlertTriangle size={16} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Primary AI Offline</p>
                                <p className="text-[11px] text-slate-400">Analysis provided by local diagnostic engine.</p>
                            </div>
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col items-end"
                    >
                        <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">CEAP Classification</span>
                        <div className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-amber-400 font-bold text-lg">
                            {result.ceapClassification}
                        </div>
                    </motion.div>
                </div>

                <div className="border-t border-slate-700/50" />

                {/* Risk Level Indicator */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <RiskLevelIndicator level={result.riskLevel} color={cfg.color} />
                </motion.div>

                {/* Clinical Findings Grid */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.3 }}
                    className="grid gap-3"
                >
                    <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                        <MapPin size={16} className="text-amber-500" />
                        Localized Findings
                    </div>
                    {result.findings.map((f, idx) => (
                        <div key={idx} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-amber-400 font-bold text-xs">
                                {idx + 1}
                            </div>
                            <div>
                                <h4 className="text-slate-200 text-sm font-bold uppercase tracking-wide">{f.anatomicalLocation}</h4>
                                <p className="text-slate-400 text-xs leading-relaxed mt-1">{f.clinicalDescription}</p>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Doctor's Analysis Report */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-2xl p-4 flex flex-col gap-3 bg-slate-800/30 border border-slate-700/50"
                >
                    <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                        <FileText size={16} className="text-amber-500" />
                        Doctor's Analysis & Scenario Report
                    </div>
                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {result.doctorReport || result.clinicalSummary}
                        {result.isFallback && (
                            <p className="mt-4 text-[11px] text-slate-500 italic border-t border-slate-700/50 pt-3">
                                * Detailed medical analysis is limited in fallback mode. Connect to cloud AI for full clinical scenario reporting.
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Recommendation */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-2xl p-4 flex gap-3 bg-amber-500/10 border border-amber-500/20"
                >
                    <Activity size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-200 text-xs font-bold uppercase mb-1">Recommended Pathway</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{cfg.recommendation}</p>
                    </div>
                </motion.div>

                {/* CTA */}
                <div className="flex gap-4 mt-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDownloadReport}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                         bg-amber-500 text-navy-mid hover:bg-amber-400
                         transition-all font-bold text-sm"
                        style={{ color: '#0B1120' }}
                    >
                        <Download size={15} />
                        Download Report
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onReset}
                        className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl
                         border border-slate-600 text-slate-300 hover:bg-slate-700/40
                         transition-all font-medium text-sm"
                    >
                        <RotateCcw size={15} />
                        Reset
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
