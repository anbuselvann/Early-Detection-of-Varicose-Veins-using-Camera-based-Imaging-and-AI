import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { type ScanResult, type Finding, type RiskLevel } from "./roboflow";
import { type BBox, getAnatomicalLocation } from "./anatomy";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const schema: any = {
  description: "Vascular analysis results",
  type: SchemaType.OBJECT,
  properties: {
    riskLevel: {
      type: SchemaType.STRING,
      enum: ["low", "medium", "high"],
      description: "Overall risk level of varicose disease",
    },
    ceapClassification: {
      type: SchemaType.STRING,
      description: "Clinical CEAP classification (e.g., C0 to C6)",
    },
    findings: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: {
            type: SchemaType.STRING,
            enum: ["varicose-vein", "spider-vein", "reticular-vein"],
          },
          box_2d: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER },
            description: "[ymin, xmin, ymax, xmax] normalized to 1000",
          },
          description: { type: SchemaType.STRING },
        },
        required: ["label", "box_2d", "description"],
      },
    },
    doctorReport: {
      type: SchemaType.STRING,
      description: "A comprehensive clinical analysis report explaining the scenario and medical facts.",
    },
    summary: {
      type: SchemaType.STRING,
      description: "A brief clinical summary of the findings.",
    },
  },
  required: ["riskLevel", "ceapClassification", "findings", "doctorReport", "summary"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite-preview",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
  },
  systemInstruction: `You are an elite Vascular Surgeon and Clinical Radiologist. 
Your task is to perform a high-precision vascular mapping of leg imagery. 
DETECT: Varicose veins, spider veins (telangiectasia), and reticular veins.
ANATOMICAL POSITIONING: For each finding, you MUST specify the exact anatomical zone (e.g., Medial Distal Thigh, Lateral Calf, Popliteal Fossa, Anterior Perimalleolar). 
DOCTOR'S REPORT: Provide a comprehensive clinical analysis. Explain the 'Scenario' (how the pathology likely developed) and 'Medical Facts' (the physiological basis of the findings). 
RISK ASSESSMENT: Assess risk levels (low/medium/high) based on venous tortuosity and clinical markers.
Be extremely precise. Do not mention AI or model accuracy. Use professional medical terminology throughout.`,
});

/**
 * Converts Gemini bounding box [ymin, xmin, ymax, xmax] (0-1000)
 * to BBox { x, y, width, height } (center, 0-1)
 */
function convertGeminiBoxToBBox(box: number[]): BBox {
  const [ymin, xmin, ymax, xmax] = box.map((v) => v / 1000);
  const width = xmax - xmin;
  const height = ymax - ymin;
  return {
    x: xmin + width / 2,
    y: ymin + height / 2,
    width,
    height,
  };
}

async function getBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  });
}

export async function analyzeImageWithGemini(file: File): Promise<ScanResult & { doctorReport: string }> {
  const base64Data = await getBase64(file);
  return analyzeBase64WithGemini(base64Data, file.type);
}

export async function analyzeBase64WithGemini(base64Data: string, mimeType: string = "image/jpeg"): Promise<ScanResult & { doctorReport: string }> {
  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    },
    "Perform an advanced vascular diagnostic analysis. Focus on exact anatomical positioning and provide a detailed surgical-grade report including scenario and medical facts.",
  ]);

  const response = JSON.parse(result.response.text());

  const findings: Finding[] = response.findings.map((f: any, i: number) => {
    const bbox = convertGeminiBoxToBBox(f.box_2d);
    const location = getAnatomicalLocation(bbox);
    return {
      id: `ai-det-${i}`,
      label: f.label,
      confidence: 99, // Placeholder since we hide it
      bbox,
      anatomicalLocation: location,
      clinicalDescription: f.description,
      ceapCategory: response.ceapClassification,
    };
  });

  return {
    riskLevel: response.riskLevel as RiskLevel,
    confidence: 99, // We'll hide this in the UI
    findings,
    ceapClassification: response.ceapClassification,
    clinicalSummary: response.summary,
    doctorReport: response.doctorReport,
  };
}
