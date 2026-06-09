import axios from 'axios';
import { getAnatomicalLocation, getClinicalDescription, getCEAPCategory, type BBox } from './anatomy';

// ─── CONFIGURE YOUR CREDENTIALS HERE ──────────────────────────────────────────
const ROBOFLOW_API_KEY = 'pzB4selwhZCELzXullfu';
const MODEL_ID = 'varicose-disease-dp898'; // Updated to the new model
const VERSION = '1';                       // Updated version number
// ──────────────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | null;

export interface RoboflowPrediction {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
    class_id: number;
    detection_id: string;
}

export interface RoboflowResponse {
    predictions: RoboflowPrediction[];
    image: { width: number; height: number };
}

export interface Finding {
    id: string;
    label: string;
    confidence: number;
    bbox: BBox;
    anatomicalLocation: string;
    clinicalDescription: string;
    ceapCategory: string;
}

export interface ScanResult {
    riskLevel: RiskLevel;
    confidence: number;
    findings: Finding[];
    ceapClassification: string;
    clinicalSummary: string;
    doctorReport?: string;
    isFallback?: boolean;
}

/**
 * Converts a File to a base64 string (without the data URI prefix).
 */
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Maps multiple detections to an overall risk level.
 */
function determineOverallRisk(predictions: RoboflowPrediction[]): { riskLevel: RiskLevel; ceap: string } {
    if (predictions.length === 0) return { riskLevel: 'low', ceap: 'C0' };

    const classes = predictions.map(p => p.class.toLowerCase());
    const hasVaricose = classes.some(c => c.includes('varicose'));

    if (hasVaricose) return { riskLevel: 'high', ceap: 'C2S' };
    return { riskLevel: 'medium', ceap: 'C1S' };
}

/**
 * Sends an image (File or Base64 string) to the Roboflow Detection API.
 */
export async function analyzeImage(input: File | string): Promise<ScanResult> {
    const base64Image = typeof input === 'string' 
        ? input.includes(',') ? input.split(',')[1] : input
        : await fileToBase64(input);

    // Using the standard Detection endpoint which is more robust for object detection
    const url = `https://detect.roboflow.com/${MODEL_ID}/${VERSION}`;

    const response = await axios.post<RoboflowResponse>(
        url,
        base64Image,
        {
            params: { api_key: ROBOFLOW_API_KEY },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
    );

    const { predictions, image } = response.data;
    if (!predictions) throw new Error('No predictions received');

    // 1. Map real detections to Clinical Findings
    const findings: Finding[] = predictions.map((pred, i) => {
        // Roboflow returns coordinates in pixels, we need normalized 0-1 for our UI
        const bbox: BBox = {
            x: pred.x / image.width,
            y: pred.y / image.height,
            width: pred.width / image.width,
            height: pred.height / image.height
        };

        const location = getAnatomicalLocation(bbox);
        const label = pred.class.toLowerCase().replace(' ', '-');

        return {
            id: pred.detection_id || `det-${i}`,
            label: label.includes('varicose') ? 'varicose-vein' : 'spider-vein',
            confidence: Math.round(pred.confidence * 100),
            bbox,
            anatomicalLocation: location,
            clinicalDescription: getClinicalDescription(label, location),
            ceapCategory: getCEAPCategory(label)
        };
    });

    // 2. Aggregate Results
    const { riskLevel, ceap } = determineOverallRisk(predictions);
    const avgConfidence = findings.length > 0 
        ? Math.round(findings.reduce((acc, f) => acc + f.confidence, 0) / findings.length)
        : 0;

    return {
        riskLevel,
        confidence: avgConfidence,
        findings,
        ceapClassification: ceap,
        clinicalSummary: findings.length > 0
            ? `Vascular analysis identifies ${findings.length} detected anomaly/anomalies. Primary involvement noted in the ${findings[0].anatomicalLocation}. Findings are suggestive of ${riskLevel === 'high' ? 'significant' : 'early-stage'} venous insufficiency.`
            : "No significant vascular abnormalities were detected in the provided imagery."
    };
}

