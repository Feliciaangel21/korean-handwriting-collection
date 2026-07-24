import base64
import binascii
import json

from fastapi import APIRouter, HTTPException

from app.db import acquire_connection
from app.models import SampleUploadResult, UploadRequest, UploadResponse
from app.supabase_client import remove_pngs, upload_png
from app.validation import SampleValidationError, validate_sample

router = APIRouter(tags=["upload"])


def _png_path(writer_id: str, sentence_number: int, writing_style: str) -> str:
    return f"{writer_id}/sentence{sentence_number}_{writing_style}.png"


def _decode_png(png_base64: str) -> bytes:
    payload = png_base64.split(",", 1)[-1] if png_base64.startswith("data:") else png_base64
    try:
        return base64.b64decode(payload, validate=True)
    except binascii.Error as exc:
        raise SampleValidationError("PNG payload is not valid base64.") from exc


@router.post("/api/upload", response_model=UploadResponse)
async def upload(request: UploadRequest) -> UploadResponse:
    if not request.writer.consent:
        raise HTTPException(status_code=400, detail="Consent is required before upload.")

    # Validate every sample before touching storage or the database, so a bad
    # sample never leaves partial state behind.
    try:
        for sample in request.samples:
            validate_sample(sample)
    except SampleValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc

    async with acquire_connection() as conn:
        writer_row = await conn.fetchrow(
            """
            insert into writers (anonymous_code, korean_background, learning_duration, proficiency, consent)
            values ($1, $2, $3, $4, $5)
            on conflict (anonymous_code) do update set
                korean_background = excluded.korean_background,
                learning_duration = excluded.learning_duration,
                proficiency = excluded.proficiency,
                consent = excluded.consent
            returning id
            """,
            request.writer.anonymous_code,
            request.writer.korean_background,
            request.writer.learning_duration,
            request.writer.proficiency,
            request.writer.consent,
        )
    writer_id = str(writer_row["id"])

    uploaded_paths: list[str] = []
    results: list[SampleUploadResult] = []

    try:
        for sample in request.samples:
            path = _png_path(writer_id, sample.sentence_number, sample.writing_style)
            png_bytes = _decode_png(sample.png_base64)
            upload_png(path, png_bytes)
            uploaded_paths.append(path)
    except Exception as exc:
        remove_pngs(uploaded_paths)
        raise HTTPException(status_code=502, detail=f"PNG upload failed: {exc}") from exc

    try:
        async with acquire_connection() as conn:
            async with conn.transaction():
                for sample, path in zip(request.samples, uploaded_paths):
                    row = await conn.fetchrow(
                        """
                        insert into samples (
                            writer_id, sentence_number, writing_style, stroke_json, png_path,
                            canvas_width, canvas_height, stroke_count, point_count,
                            duration_ms, bounding_box
                        )
                        values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11::jsonb)
                        on conflict (writer_id, sentence_number, writing_style) do update set
                            stroke_json = excluded.stroke_json,
                            png_path = excluded.png_path,
                            canvas_width = excluded.canvas_width,
                            canvas_height = excluded.canvas_height,
                            stroke_count = excluded.stroke_count,
                            point_count = excluded.point_count,
                            duration_ms = excluded.duration_ms,
                            bounding_box = excluded.bounding_box
                        returning id
                        """,
                        writer_id,
                        sample.sentence_number,
                        sample.writing_style,
                        json.dumps([[p.model_dump() for p in stroke] for stroke in sample.strokes]),
                        path,
                        sample.canvas_width,
                        sample.canvas_height,
                        sample.stroke_count,
                        sample.point_count,
                        sample.duration_ms,
                        json.dumps(sample.bounding_box.model_dump()),
                    )
                    results.append(
                        SampleUploadResult(
                            sentence_number=sample.sentence_number,
                            writing_style=sample.writing_style,
                            sample_id=str(row["id"]),
                        )
                    )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {exc}") from exc

    return UploadResponse(success=True, writer_id=writer_id, results=results)
