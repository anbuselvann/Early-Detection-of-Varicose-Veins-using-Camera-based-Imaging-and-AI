/**
 * Anatomical mapping utility for varicose vein locations.
 * Translates bounding box coordinates into clinical terminology.
 */

export interface BBox {
    x: number;      // Center X (normalized 0-1)
    y: number;      // Center Y (normalized 0-1)
    width: number;  // Width (normalized 0-1)
    height: number; // Height (normalized 0-1)
}

export function getAnatomicalLocation(bbox: BBox): string {
    const { x, y } = bbox;

    let vertical = '';
    let horizontal = '';

    // Vertical zones
    if (y < 0.25) vertical = 'Proximal Thigh';
    else if (y < 0.45) vertical = 'Distal Thigh';
    else if (y < 0.55) vertical = 'Knee / Popliteal region';
    else if (y < 0.85) vertical = 'Calf';
    else vertical = 'Ankle / Perimalleolar region';

    // Horizontal zones (Assuming standard medial/lateral views for a single leg)
    // Note: This is a simplification. In practice, left/right leg orientation matters.
    if (x < 0.45) horizontal = 'Medial';
    else if (x > 0.55) horizontal = 'Lateral';
    else horizontal = 'Central';

    return `${horizontal} ${vertical}`.trim();
}

export function getClinicalDescription(label: string, location: string): string {
    const descMap: Record<string, string> = {
        'varicose-vein': `Tortuous, dilated subcutaneous segment visible in the ${location}.`,
        'spider-vein': `Telangiectatic clusters (C1) presenting in the ${location}.`,
        'reticular-vein': `Dermal reticular veins (1-3mm) identified in the ${location}.`,
    };

    return descMap[label] || `Vascular irregularity detected in the ${location}.`;
}

export function getCEAPCategory(label: string): string {
    const ceapMap: Record<string, string> = {
        'varicose-vein': 'C2',
        'spider-vein': 'C1',
        'reticular-vein': 'C1',
    };
    return ceapMap[label] || 'C0/C1';
}
