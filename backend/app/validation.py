"""Server-side re-validation of handwriting samples.

Mirrors the client-side checks in frontend/src/lib/validation.ts. The client
is the primary gate (it has the fast feedback loop), but the server must not
trust it: a malformed or bypassed client could otherwise poison the dataset.
"""

from app.config import get_settings
from app.models import SampleUpload

MULTI_ROW_GAP_RATIO = 0.35  # fraction of canvas height treated as a "row gap"


class SampleValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def validate_sample(sample: SampleUpload) -> None:
    settings = get_settings()

    if sample.stroke_count <= 0 or not sample.strokes:
        raise SampleValidationError("Canvas is empty — no strokes recorded.")

    if sample.point_count < settings.min_points_per_sample:
        raise SampleValidationError(
            f"Too few points recorded ({sample.point_count} < {settings.min_points_per_sample})."
        )

    for stroke in sample.strokes:
        for point in stroke:
            if not (0 <= point.x <= sample.canvas_width) or not (0 <= point.y <= sample.canvas_height):
                raise SampleValidationError("Stroke point falls outside canvas bounds.")

    bbox = sample.bounding_box
    if bbox.maxX < bbox.minX or bbox.maxY < bbox.minY:
        raise SampleValidationError("Invalid bounding box for recorded strokes.")


def occupies_full_height(sample: SampleUpload) -> bool:
    bbox = sample.bounding_box
    height_used = bbox.maxY - bbox.minY
    return height_used >= sample.canvas_height * 0.85


def looks_multi_row(sample: SampleUpload) -> bool:
    """Heuristic: cluster stroke vertical centers; flag if they split into
    two or more bands separated by a gap wider than MULTI_ROW_GAP_RATIO of
    the canvas height, which suggests writing wrapped onto a second line."""
    if len(sample.strokes) < 2:
        return False

    centers = sorted(
        sum(p.y for p in stroke) / len(stroke) for stroke in sample.strokes if stroke
    )
    if len(centers) < 2:
        return False

    gap_threshold = sample.canvas_height * MULTI_ROW_GAP_RATIO
    return any(b - a > gap_threshold for a, b in zip(centers, centers[1:]))
