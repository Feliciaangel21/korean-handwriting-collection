from fastapi import APIRouter

from app.db import acquire_connection
from app.models import LatestSubmission, StatsResponse

router = APIRouter(tags=["stats"])


@router.get("/api/stats", response_model=StatsResponse)
async def stats() -> StatsResponse:
    async with acquire_connection() as conn:
        total_participants = await conn.fetchval("select count(*) from writers")
        total_samples = await conn.fetchval("select count(*) from samples")
        rows = await conn.fetch(
            """
            select w.anonymous_code, s.sentence_number, s.writing_style, s.created_at
            from samples s
            join writers w on w.id = s.writer_id
            order by s.created_at desc
            limit 10
            """
        )

    latest = [
        LatestSubmission(
            writer_anonymous_code=row["anonymous_code"],
            sentence_number=row["sentence_number"],
            writing_style=row["writing_style"],
            created_at=row["created_at"].isoformat(),
        )
        for row in rows
    ]

    return StatsResponse(
        total_participants=total_participants,
        total_samples=total_samples,
        latest_submissions=latest,
    )
