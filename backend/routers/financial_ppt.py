"""
Financial PPT Generator router.
POST /api/financial-ppt/generate  — run pipeline
GET  /api/financial-ppt/download  — download generated .pptx
"""

import os
import subprocess
import sys
import time
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter()

PIPELINE_DIR = Path(os.environ.get("PIPELINE_003_DIR", r"D:\HMC work\003-financial-ppt-generator"))
SAMPLE_DATA_DIR = Path(__file__).parent.parent / "sample_data"
SAMPLE_PPTX = SAMPLE_DATA_DIR / "financial_board_sample.pptx"
OUTPUT_DIR   = Path(tempfile.gettempdir()) / "automation-hub" / "financial-ppt"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

_last_output: dict = {}


class GenerateRequest(BaseModel):
    month: str = "May 2026"
    use_mock: bool = True
    no_openai: bool = True


@router.post("/generate")
def generate(req: GenerateRequest):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    month_safe = req.month.replace(" ", "_")
    output_pptx = OUTPUT_DIR / f"board_{month_safe}.pptx"

    if req.use_mock and not (PIPELINE_DIR / "pipeline.py").exists():
        return _sample_generate(req, output_pptx, time.time())

    cmd = [
        sys.executable, str(PIPELINE_DIR / "pipeline.py"),
        "--month", req.month,
        "--output", str(output_pptx),
    ]
    if req.use_mock:
        cmd.append("--mock")
    if req.no_openai:
        cmd.append("--no-openai")

    t_start = time.time()
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(PIPELINE_DIR),
    )
    elapsed = round(time.time() - t_start, 1)

    if result.returncode != 0:
        raise HTTPException(500, f"Pipeline error:\n{result.stderr or result.stdout}")

    if not output_pptx.exists():
        raise HTTPException(500, "Pipeline ran but no .pptx was created")

    file_size_kb = round(output_pptx.stat().st_size / 1024, 1)
    _last_output["pptx"] = str(output_pptx)

    # Build a representative slide list (fixed for Welspun board deck)
    slides = [
        {"title": "Executive Summary",          "type": "summary"},
        {"title": "Revenue & Order Book",        "type": "chart"},
        {"title": "EBITDA & Margin Analysis",    "type": "chart"},
        {"title": "Working Capital Overview",    "type": "table"},
        {"title": "Key Risks & Mitigants",       "type": "text"},
        {"title": "Month-End Balance Sheet KPIs","type": "kpi"},
    ]

    return {
        "slides":          slides,
        "file_size_kb":    file_size_kb,
        "generated_at":    req.month,
        "elapsed_sec":     elapsed,
        "download_url":    "/api/financial-ppt/download",
    }


def _sample_generate(req: GenerateRequest, output_pptx: Path, t_start: float):
    if not SAMPLE_PPTX.exists():
        raise HTTPException(404, "Sample financial presentation not found")

    shutil.copyfile(SAMPLE_PPTX, output_pptx)
    _last_output["pptx"] = str(output_pptx)

    slides = [
        {"title": "Executive Summary", "type": "summary"},
        {"title": "Revenue & Order Book", "type": "chart"},
        {"title": "EBITDA & Margin Analysis", "type": "chart"},
        {"title": "Working Capital Overview", "type": "table"},
        {"title": "Key Risks & Mitigants", "type": "text"},
        {"title": "Month-End Balance Sheet KPIs", "type": "kpi"},
    ]

    return {
        "slides": slides,
        "file_size_kb": round(output_pptx.stat().st_size / 1024, 1),
        "generated_at": req.month,
        "elapsed_sec": round(time.time() - t_start, 1),
        "download_url": "/api/financial-ppt/download",
    }


@router.get("/download")
def download():
    if not _last_output.get("pptx") and not list(OUTPUT_DIR.glob("*.pptx")) and SAMPLE_PPTX.exists():
        return FileResponse(
            str(SAMPLE_PPTX),
            filename=SAMPLE_PPTX.name,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )

    if not _last_output.get("pptx"):
        # Try to find any .pptx in output dir
        pptx_files = list(OUTPUT_DIR.glob("*.pptx"))
        if not pptx_files:
            raise HTTPException(404, "No presentation found — generate one first")
        pptx_path = sorted(pptx_files, key=lambda x: x.stat().st_mtime)[-1]
    else:
        pptx_path = Path(_last_output["pptx"])
        if not pptx_path.exists():
            raise HTTPException(404, "Generated file not found on disk")

    return FileResponse(
        str(pptx_path),
        filename=pptx_path.name,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )
