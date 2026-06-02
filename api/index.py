"""
Vercel serverless entry point.
Adds backend/ to sys.path so backend/main.py can import `from routers import ...`
"""
import sys
import os

_backend = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, _backend)

from main import app  # noqa: E402 — re-exported for Vercel
