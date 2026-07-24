import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse, StreamingResponse

from app.auth import (
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_SECONDS,
    create_session_token,
    require_admin_session,
    verify_admin_password,
)
from app.config import get_settings
from app.db import acquire_connection
from app.models import AdminLoginRequest, AdminSample, AdminWriter
from app.supabase_client import create_signed_url

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login")
async def login(payload: AdminLoginRequest, response: Response) -> dict:
    if not verify_admin_password(payload.password):
        raise HTTPException(status_code=401, detail="Incorrect password")

    settings = get_settings()
    token = create_session_token()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        samesite="none" if settings.is_production else "lax",
        secure=settings.is_production,
        path="/",
    )
    return {"success": True}


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"success": True}


@router.get("/writers", response_model=list[AdminWriter], dependencies=[Depends(require_admin_session)])
async def list_writers() -> list[AdminWriter]:
    async with acquire_connection() as conn:
        rows = await conn.fetch(
            """
            select w.*, count(s.id) as sample_count
            from writers w
            left join samples s on s.writer_id = w.id
            group by w.id
            order by w.created_at desc
            """
        )
    return [
        AdminWriter(
            id=str(row["id"]),
            anonymous_code=row["anonymous_code"],
            korean_background=row["korean_background"],
            learning_duration=row["learning_duration"],
            proficiency=row["proficiency"],
            consent=row["consent"],
            created_at=row["created_at"].isoformat(),
            sample_count=row["sample_count"],
        )
        for row in rows
    ]


@router.get("/samples", response_model=list[AdminSample], dependencies=[Depends(require_admin_session)])
async def list_samples(limit: int = 100) -> list[AdminSample]:
    async with acquire_connection() as conn:
        rows = await conn.fetch(
            """
            select s.*, w.anonymous_code as writer_anonymous_code
            from samples s
            join writers w on w.id = s.writer_id
            order by s.created_at desc
            limit $1
            """,
            limit,
        )
    return [_row_to_admin_sample(row) for row in rows]


@router.get(
    "/samples/{sample_id}/stroke-json",
    dependencies=[Depends(require_admin_session)],
)
async def sample_stroke_json(sample_id: str) -> JSONResponse:
    async with acquire_connection() as conn:
        row = await conn.fetchrow("select stroke_json from samples where id = $1", sample_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    return JSONResponse(content=json.loads(row["stroke_json"]))


@router.get(
    "/samples/{sample_id}/png-url",
    dependencies=[Depends(require_admin_session)],
)
async def sample_png_url(sample_id: str) -> dict:
    async with acquire_connection() as conn:
        row = await conn.fetchrow("select png_path from samples where id = $1", sample_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    return {"url": create_signed_url(row["png_path"])}


@router.get("/export.csv", dependencies=[Depends(require_admin_session)])
async def export_csv() -> StreamingResponse:
    async with acquire_connection() as conn:
        rows = await conn.fetch(
            """
            select w.anonymous_code, w.korean_background, w.learning_duration, w.proficiency,
                   s.sentence_number, s.writing_style, s.png_path, s.canvas_width, s.canvas_height,
                   s.stroke_count, s.point_count, s.duration_ms, s.bounding_box, s.created_at
            from samples s
            join writers w on w.id = s.writer_id
            order by w.anonymous_code, s.sentence_number, s.writing_style
            """
        )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "anonymous_code", "korean_background", "learning_duration", "proficiency",
            "sentence_number", "writing_style", "png_path", "canvas_width", "canvas_height",
            "stroke_count", "point_count", "duration_ms", "bounding_box", "created_at",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row["anonymous_code"], row["korean_background"], row["learning_duration"],
                row["proficiency"], row["sentence_number"], row["writing_style"], row["png_path"],
                row["canvas_width"], row["canvas_height"], row["stroke_count"], row["point_count"],
                row["duration_ms"], row["bounding_box"], row["created_at"].isoformat(),
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=handwriting_dataset.csv"},
    )


@router.get("/export.json", dependencies=[Depends(require_admin_session)])
async def export_json() -> StreamingResponse:
    async with acquire_connection() as conn:
        rows = await conn.fetch(
            """
            select w.anonymous_code, w.korean_background, w.learning_duration, w.proficiency,
                   w.consent, s.sentence_number, s.writing_style, s.stroke_json, s.png_path,
                   s.canvas_width, s.canvas_height, s.stroke_count, s.point_count, s.duration_ms,
                   s.bounding_box, s.created_at
            from samples s
            join writers w on w.id = s.writer_id
            order by w.anonymous_code, s.sentence_number, s.writing_style
            """
        )

    payload = [
        {
            "anonymous_code": row["anonymous_code"],
            "korean_background": row["korean_background"],
            "learning_duration": row["learning_duration"],
            "proficiency": row["proficiency"],
            "consent": row["consent"],
            "sentence_number": row["sentence_number"],
            "writing_style": row["writing_style"],
            "stroke_json": json.loads(row["stroke_json"]),
            "png_path": row["png_path"],
            "canvas_width": row["canvas_width"],
            "canvas_height": row["canvas_height"],
            "stroke_count": row["stroke_count"],
            "point_count": row["point_count"],
            "duration_ms": row["duration_ms"],
            "bounding_box": json.loads(row["bounding_box"]),
            "created_at": row["created_at"].isoformat(),
        }
        for row in rows
    ]

    buffer = io.StringIO(json.dumps(payload, ensure_ascii=False, indent=2))
    return StreamingResponse(
        buffer,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=handwriting_dataset.json"},
    )


def _row_to_admin_sample(row) -> AdminSample:
    return AdminSample(
        id=str(row["id"]),
        writer_id=str(row["writer_id"]),
        writer_anonymous_code=row["writer_anonymous_code"],
        sentence_number=row["sentence_number"],
        writing_style=row["writing_style"],
        png_path=row["png_path"],
        canvas_width=row["canvas_width"],
        canvas_height=row["canvas_height"],
        stroke_count=row["stroke_count"],
        point_count=row["point_count"],
        duration_ms=row["duration_ms"],
        bounding_box=json.loads(row["bounding_box"]),
        created_at=row["created_at"].isoformat(),
    )
