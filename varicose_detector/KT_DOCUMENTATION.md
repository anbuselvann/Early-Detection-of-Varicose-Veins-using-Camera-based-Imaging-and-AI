# Varicose Disease Detector: Technical Knowledge Transfer (Updated May 2026)

## 1. System Architecture Overview
The Varicose Disease Detector is a high-performance clinical diagnostic application utilizing a **Dual AI Failover Architecture**.

*   **Framework**: Next.js 15 (App Router)
*   **AI Strategy**: 
    *   **Primary**: Google Gemini 1.5 Flash (Cloud-based deep multimodal analysis).
    *   **Secondary/Fallback**: Roboflow (Edge-based object detection).
*   **Reporting**: `jsPDF` clinical document generator.
*   **UI/UX**: Framer Motion & Tailwind CSS with a clinical-grade dark aesthetic.

---

## 2. Core Workflows (Updated)

### A. Professional Diagnostic Scanner (Static Image)
**Path**: `ScannerUpload.tsx` -> `gemini.ts` -> `ResultCard.tsx`

1.  **Upload**: High-res patient imagery is uploaded.
2.  **Multimodal Analysis**: Gemini analyzes the image for tortuosity and clinical markers.
3.  **Report Generation**: The system builds a "Scenario Report" explaining the physiological basis of the findings.
4.  **PDF Export**: User can download a structured PDF containing marked-up imagery and surgical recommendations.

### B. Live Clinical Stream with AI Failover
**Path**: `LiveScanner.tsx` -> `lib/gemini.ts` (Primary) -> `lib/roboflow.ts` (Fallback)

1.  **Live Feed**: Hardware (ESP32-CAM) stream is processed in real-time.
2.  **Dual Inference**:
    *   When "Analyze" is clicked, the app attempts a **Gemini** capture.
    *   If the cloud API is slow or offline, it automatically switches to **Roboflow** for instant detection.
3.  **Diagnostic Sidebar**: The sidebar populates instantly with localized findings while the camera feed is "frozen" for evidence review.

---

## 3. Deep Analysis of Updated Sections

### Section 1: PDF Clinical Reporting Engine
Located in `ResultCard.tsx`, the `handleDownloadReport` function is a complex PDF generator that:
- Draws detection boxes directly onto the patient's image within the PDF.
- Categorizes findings into localized zones.
- Appends the "Surgical Scenario" and "Medical Facts" derived from Gemini.
- Formats everything into a print-ready clinical record.

### Section 2: Risk Severity Indicator (Gauge UI)
A specialized UI component that translates the AI's `riskLevel` into a visual gauge:
- **Low**: Preventative care and routine monitoring.
- **Medium**: Observation and potential compression therapy.
- **High**: Urgent care and surgical consultation.

### Section 3: Anatomical Intelligence & Legend
The app now includes a **Visual Legend** that automatically updates based on detected features (Spider Veins, Varicose Veins, etc.). This ensures doctors can quickly identify the "type" of vascular anomaly without reading raw labels.

---

## 4. Technical Fail-Safe Logic
The project now includes an `isFallback` flag in the `ScanResult`. This allows the UI to display a warning: *"Primary AI Offline - Analysis provided by local engine"*. This transparency is critical for clinical environments where accuracy expectations must be managed during network outages.

---

## 5. Summary of Updated Data Workflow
`Hardware Input` -> `Base64 Buffer` -> `Primary AI (Gemini)` -> `(IF FAIL) -> Secondary AI (Roboflow)` -> `Result Sidebar` -> `PDF Generation`
