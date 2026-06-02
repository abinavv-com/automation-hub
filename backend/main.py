"""
Welspun Automation Hub — FastAPI backend
Orchestrates 4 AI automation pipelines.

Run: uvicorn main:app --port 8000 --reload
  or: python main.py
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import sap_pdf, maintenance, financial_ppt, word_ppt

app = FastAPI(title="Welspun Automation Hub", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5173",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sap_pdf.router,       prefix="/api/sap-pdf",       tags=["SAP PDF"])
app.include_router(maintenance.router,   prefix="/api/maintenance",   tags=["Maintenance"])
app.include_router(financial_ppt.router, prefix="/api/financial-ppt", tags=["Financial PPT"])
app.include_router(word_ppt.router,      prefix="/api/word-ppt",      tags=["Word PPT"])


@app.get("/api/health")
def health():
    return {"status": "ok", "initiatives": 4}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
