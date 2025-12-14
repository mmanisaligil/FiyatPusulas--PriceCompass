import json
import os
import tempfile
from pathlib import Path
from typing import Any

from fastapi import UploadFile


def secure_delete(path: Path) -> None:
    if not path.exists():
        return
    try:
        length = path.stat().st_size
        with path.open("r+b", buffering=0) as f:
            f.seek(0)
            f.write(b"\x00" * length)
            f.flush()
            os.fsync(f.fileno())
    finally:
        try:
            path.unlink()
        except FileNotFoundError:
            pass


def dummy_ocr(file: UploadFile) -> dict[str, Any]:
    temp_fd, temp_path = tempfile.mkstemp(prefix="receipt_", suffix=".bin")
    path = Path(temp_path)
    try:
        with os.fdopen(temp_fd, "wb") as tmp:
            content = file.file.read()
            tmp.write(content)
        text_lines = content.decode(errors="ignore").splitlines() or ["UNKNOWN"]
        layout = {
            "provider": "dummy",
            "lines": [
                {"text": line.strip(), "bbox": [0, 0, 1, 1], "confidence": 0.9}
                for line in text_lines if line.strip()
            ],
        }
        return layout
    finally:
        secure_delete(path)
