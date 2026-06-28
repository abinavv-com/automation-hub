"""
Word → PPT Converter router.
POST /api/word-ppt/convert   — run pipeline on uploaded .docx or mock
GET  /api/word-ppt/download  — download generated .pptx
"""

import json
import os
import subprocess
import sys
import tempfile
import shutil
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

router = APIRouter()

PIPELINE_DIR = Path(os.environ.get("PIPELINE_004_DIR", r"D:\HMC work\004-word-to-ppt-converter"))
MOCK_DOCX    = PIPELINE_DIR / "mock_report.docx"
SAMPLE_DATA_DIR = Path(__file__).parent.parent / "sample_data"
SAMPLE_PPTX = SAMPLE_DATA_DIR / "word_report_sample.pptx"
OUTPUT_DIR   = Path(tempfile.gettempdir()) / "automation-hub" / "word-ppt"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

_last_output: dict = {}


@router.post("/convert")
async def convert(
    file: UploadFile | None = File(default=None),
    use_mock: str = Form(default="false"),
):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Determine input .docx path
    if use_mock.lower() == "true" or (file is None):
        if not MOCK_DOCX.exists():
            return _sample_convert()
        docx_path = MOCK_DOCX
        tmp_file  = None
    else:
        if not (PIPELINE_DIR / "pipeline.py").exists():
            return _sample_convert()
        suffix   = Path(file.filename).suffix if file.filename else ".docx"
        tmp      = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        content  = await file.read()
        tmp.write(content)
        tmp.close()
        docx_path = Path(tmp.name)
        tmp_file  = tmp.name

    try:
        result = subprocess.run(
            [
                sys.executable, str(PIPELINE_DIR / "pipeline.py"),
                "--input",    str(docx_path),
                "--output",   str(OUTPUT_DIR),
                "--no-openai",
            ],
            capture_output=True,
            text=True,
            cwd=str(PIPELINE_DIR),
        )
        if result.returncode != 0:
            raise HTTPException(500, f"Pipeline error:\n{result.stderr or result.stdout}")
    finally:
        if tmp_file and os.path.exists(tmp_file):
            os.unlink(tmp_file)

    # Find generated pptx
    pptx_files = list(OUTPUT_DIR.glob("*.pptx"))
    if not pptx_files:
        raise HTTPException(500, "Pipeline ran but produced no .pptx")

    pptx_path = sorted(pptx_files, key=lambda x: x.stat().st_mtime)[-1]
    file_size_kb = round(pptx_path.stat().st_size / 1024, 1)
    _last_output["pptx"] = str(pptx_path)

    # Try to read summarized JSON to build slide outline
    inter_dir = OUTPUT_DIR / "_intermediate"
    slides = []
    summarized_files = list(inter_dir.glob("*_summarized.json")) if inter_dir.exists() else []
    if summarized_files:
        with open(summarized_files[0], encoding="utf-8") as f:
            data = json.load(f)
        for s in data.get("slides", []):
            slides.append({
                "title":        s.get("title", "Slide"),
                "content_type": s.get("content_type", "text"),
                "bullets":      s.get("bullets", [])[:6],
                "table":        s.get("table"),
            })
    else:
        # Fallback: single placeholder
        slides = [{"title": "Presentation generated", "content_type": "text", "bullets": [], "table": None}]

    return {
        "slides":       slides,
        "file_size_kb": file_size_kb,
        "download_url": "/api/word-ppt/download",
    }


def _sample_convert():
    if not SAMPLE_PPTX.exists():
        raise HTTPException(404, "Sample Word presentation not found")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pptx_path = OUTPUT_DIR / "mock_report_welspun.pptx"
    shutil.copyfile(SAMPLE_PPTX, pptx_path)
    _last_output["pptx"] = str(pptx_path)

    slides = [
        {
            "title": "Executive Summary",
            "content_type": "summary",
            "bullets": [
                "Monthly operations report converted from Word format",
                "Key production, quality, and maintenance highlights prepared for review",
            ],
            "table": None,
        },
        {
            "title": "Production Performance",
            "content_type": "text",
            "bullets": [
                "Pipe production volume and line utilization summarized",
                "Shift-wise observations consolidated into presentation-ready points",
            ],
            "table": None,
        },
        {
            "title": "Action Items",
            "content_type": "table",
            "bullets": [
                "Open operational actions grouped for follow-up",
                "Owners and next steps preserved from the source report",
            ],
            "table": True,
        },
    ]

    return {
        "slides": slides,
        "file_size_kb": round(pptx_path.stat().st_size / 1024, 1),
        "download_url": "/api/word-ppt/download",
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
        pptx_files = list(OUTPUT_DIR.glob("*.pptx"))
        if not pptx_files:
            raise HTTPException(404, "No presentation found — convert a document first")
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
