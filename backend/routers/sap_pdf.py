"""
SAP PDF Extraction router.
POST /api/sap-pdf/extract   — run pipeline on uploaded PDF or mock
GET  /api/sap-pdf/download/{format}  — download generated output
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

router = APIRouter()

# Paths — configurable via env var for non-Windows deployments
PIPELINE_DIR = Path(os.environ.get("PIPELINE_001_DIR", r"D:\HMC work\001-sap-pdf-extraction"))
MOCK_PDF     = PIPELINE_DIR / "mock_sap_report.pdf"
OUTPUT_DIR   = Path(__file__).parent.parent / "output" / "sap-pdf"

# In-memory pointer to last-generated output directory
_last_output: dict = {}


@router.post("/extract")
async def extract(
    file: UploadFile | None = File(default=None),
    use_mock: str = Form(default="false"),
    output_format: str = Form(default="both"),
):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # --- Determine input PDF path ---
    if use_mock.lower() == "true" or (file is None):
        if not MOCK_PDF.exists():
            raise HTTPException(404, "Mock PDF not found — check 001-sap-pdf-extraction/")
        pdf_path = MOCK_PDF
        tmp_file = None
    else:
        # Save upload to a temp file
        suffix = Path(file.filename).suffix if file.filename else ".pdf"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        content = await file.read()
        tmp.write(content)
        tmp.close()
        pdf_path = Path(tmp.name)
        tmp_file = tmp.name

    try:
        result = subprocess.run(
            [
                sys.executable, str(PIPELINE_DIR / "pipeline.py"),
                "--input", str(pdf_path),
                "--output-format", output_format,
                "--output-path", str(OUTPUT_DIR),
            ],
            capture_output=True,
            text=True,
            cwd=str(PIPELINE_DIR),
        )
        if result.returncode != 0:
            raise HTTPException(500, f"Pipeline error:\n{result.stderr}")
    finally:
        if tmp_file and os.path.exists(tmp_file):
            os.unlink(tmp_file)

    # Parse the JSON output if it exists
    json_file = OUTPUT_DIR / "normalised.json"
    if not json_file.exists():
        raise HTTPException(500, "Pipeline ran but produced no output JSON")

    with open(json_file, encoding="utf-8") as f:
        data = json.load(f)

    meta = data.get("report_meta", {})
    tables = data.get("tables", [])

    # Build download URLs
    downloads = {}
    if (OUTPUT_DIR / "normalised.json").exists():
        downloads["json"] = "/api/sap-pdf/download/json"
    csv_files = list(OUTPUT_DIR.glob("*.csv"))
    if csv_files:
        downloads["csv"] = "/api/sap-pdf/download/csv"

    _last_output["json_file"] = str(json_file)
    _last_output["csv_files"] = [str(f) for f in csv_files]

    return {
        "meta": {
            "plant":        meta.get("plant", "—"),
            "company_code": meta.get("company_code", "—"),
            "run_date":     meta.get("run_date", "—"),
            "tables_found": len(tables),
        },
        "tables": [
            {
                "name":    t.get("name", f"Table {i+1}"),
                "columns": t.get("columns", []),
                "records": t.get("records", [])[:50],  # cap at 50 rows for response
                "total_rows": len(t.get("records", [])),
            }
            for i, t in enumerate(tables)
        ],
        "downloads": downloads,
    }


@router.get("/download/{fmt}")
def download(fmt: str):
    if fmt == "json":
        f = OUTPUT_DIR / "normalised.json"
        if not f.exists():
            raise HTTPException(404, "No JSON output found — run extraction first")
        return FileResponse(str(f), filename="normalised.json",
                            media_type="application/json")

    elif fmt == "csv":
        csv_files = list(OUTPUT_DIR.glob("*.csv"))
        if not csv_files:
            raise HTTPException(404, "No CSV output found — run extraction first")
        # Zip if multiple, else return single
        if len(csv_files) == 1:
            return FileResponse(str(csv_files[0]), filename=csv_files[0].name,
                                media_type="text/csv")
        # Zip them
        import zipfile, io
        zip_path = OUTPUT_DIR / "tables.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            for cf in csv_files:
                zf.write(cf, cf.name)
        return FileResponse(str(zip_path), filename="tables.zip",
                            media_type="application/zip")

    else:
        raise HTTPException(400, f"Unknown format: {fmt}")
