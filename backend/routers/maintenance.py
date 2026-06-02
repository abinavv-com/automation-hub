"""
Maintenance Dashboard router.
GET /api/maintenance/data  — returns KPIs + rows from processed_logs.csv + kpi_summary.json
"""

import csv
import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_DIR     = Path(os.environ.get("PIPELINE_002_DIR", r"D:\HMC work\002-maintenance-dashboard"))
CSV_FILE     = DATA_DIR / "processed_logs.csv"
KPI_FILE     = DATA_DIR / "kpi_summary.json"


@router.get("/data")
def get_data():
    if not CSV_FILE.exists():
        raise HTTPException(404, "processed_logs.csv not found")
    if not KPI_FILE.exists():
        raise HTTPException(404, "kpi_summary.json not found")

    # Read KPIs
    with open(KPI_FILE, encoding="utf-8") as f:
        kpis = json.load(f)

    # Read rows
    rows = []
    machines_set = set()
    with open(CSV_FILE, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
            if row.get("machine"):
                machines_set.add(row["machine"])

    machines = sorted(machines_set)

    return {
        "kpis": kpis,
        "rows": rows,
        "machines": machines,
    }
