'use client';

import { motion } from 'framer-motion';
import type { Finding } from '@/lib/roboflow';

interface Props {
    findings: Finding[];
    imageWidth: number;
    imageHeight: number;
}

export default function AnatomyOverlay({ findings, imageWidth: _w, imageHeight: _h }: Props) {
    return (
        <div className="absolute inset-0 pointer-events-none">
            {findings.map((finding) => (
                <motion.div
                    key={finding.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + Math.random() * 0.5 }}
                    style={{
                        position: 'absolute',
                        left: `${(finding.bbox.x - finding.bbox.width / 2) * 100}%`,
                        top: `${(finding.bbox.y - finding.bbox.height / 2) * 100}%`,
                        width: `${finding.bbox.width * 100}%`,
                        height: `${finding.bbox.height * 100}%`,
                        border: '2px solid rgba(245, 158, 11, 0.6)',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '4px',
                        boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)',
                    }}
                >
                    <div className="absolute -top-6 left-0 bg-amber-500 text-[#0B1120] text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap uppercase tracking-tighter">
                        {finding.label.replace('-', ' ')} ({finding.confidence}%)
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
