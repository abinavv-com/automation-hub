# Welspun Automation Hub — Start Guide

## Prerequisites

### Python (backend)
```bash
cd "D:\HMC work\automation-hub\backend"
pip install -r requirements.txt
```

### Node.js (frontend)
```bash
cd "D:\HMC work\automation-hub\frontend"
npm install
```

---

## Start Both Servers

Open **two terminal windows**:

### Terminal 1 — Backend (FastAPI on port 8000)
```bash
cd "D:\HMC work\automation-hub\backend"
uvicorn main:app --port 8000 --reload
```
Or equivalently:
```bash
python main.py
```

### Terminal 2 — Frontend (Vite on port 5173)
```bash
cd "D:\HMC work\automation-hub\frontend"
npm run dev
```

Then open: **http://localhost:5173**

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/sap-pdf/extract` | Extract tables from SAP PDF |
| GET | `/api/sap-pdf/download/{json\|csv}` | Download extracted output |
| GET | `/api/maintenance/data` | Maintenance KPIs + rows |
| POST | `/api/financial-ppt/generate` | Generate financial PPT |
| GET | `/api/financial-ppt/download` | Download generated .pptx |
| POST | `/api/word-ppt/convert` | Convert .docx to .pptx |
| GET | `/api/word-ppt/download` | Download converted .pptx |

---

## Pipeline Source Directories

| Initiative | Source |
|-----------|--------|
| SAP PDF Extractor | `D:\HMC work\001-sap-pdf-extraction\` |
| Maintenance Dashboard | `D:\HMC work\002-maintenance-dashboard\` |
| Financial PPT Generator | `D:\HMC work\003-financial-ppt-generator\` |
| Word → PPT Converter | `D:\HMC work\004-word-to-ppt-converter\` |

---

## Output Files

All generated files are stored in:
```
D:\HMC work\automation-hub\backend\output\
├── sap-pdf\
├── financial-ppt\
└── word-ppt\
```
