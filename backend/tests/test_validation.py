import pytest

from app.models import BoundingBox, SampleUpload, StrokePoint
from app.validation import SampleValidationError, looks_multi_row, occupies_full_height, validate_sample


def make_point(x: float, y: float, stroke_id: int = 0, event: str = "move") -> StrokePoint:
    return StrokePoint(
        x=x,
        y=y,
        timestamp=0,
        relative_time=0,
        pressure=0.5,
        tiltX=0,
        tiltY=0,
        twist=0,
        pointerType="pen",
        stroke_id=stroke_id,
        event=event,
    )


def make_sample(strokes: list[list[StrokePoint]], **overrides) -> SampleUpload:
    all_points = [p for stroke in strokes for p in stroke]
    xs = [p.x for p in all_points] or [0]
    ys = [p.y for p in all_points] or [0]
    defaults = dict(
        sentence_number=1,
        writing_style="neat",
        strokes=strokes,
        canvas_width=1400,
        canvas_height=160,
        stroke_count=len(strokes),
        point_count=len(all_points),
        duration_ms=1000,
        bounding_box=BoundingBox(minX=min(xs), minY=min(ys), maxX=max(xs), maxY=max(ys)),
        png_base64="",
    )
    defaults.update(overrides)
    return SampleUpload(**defaults)


def test_validate_sample_rejects_empty_canvas():
    sample = make_sample([], stroke_count=0, point_count=0)
    with pytest.raises(SampleValidationError, match="empty"):
        validate_sample(sample)


def test_validate_sample_rejects_too_few_points():
    stroke = [make_point(10, 10, event="down"), make_point(11, 11, event="up")]
    sample = make_sample([stroke], point_count=2)
    with pytest.raises(SampleValidationError, match="Too few points"):
        validate_sample(sample)


def test_validate_sample_rejects_out_of_bounds_point():
    stroke = [make_point(x, 50) for x in [10, 20, 30, 40, 2000]]
    sample = make_sample([stroke], point_count=5)
    with pytest.raises(SampleValidationError, match="outside canvas bounds"):
        validate_sample(sample)


def test_validate_sample_accepts_valid_stroke():
    stroke = [make_point(x, 50) for x in [10, 20, 30, 40, 50, 60]]
    sample = make_sample([stroke], point_count=6)
    validate_sample(sample)  # should not raise


def test_occupies_full_height_flags_tall_bounding_box():
    stroke = [make_point(10, 5), make_point(20, 155)]
    sample = make_sample([stroke], point_count=2, canvas_height=160)
    assert occupies_full_height(sample) is True


def test_occupies_full_height_ignores_short_bounding_box():
    stroke = [make_point(10, 70), make_point(20, 90)]
    sample = make_sample([stroke], point_count=2, canvas_height=160)
    assert occupies_full_height(sample) is False


def test_looks_multi_row_detects_two_bands():
    top_row = [make_point(x, 20, stroke_id=0) for x in range(10, 100, 10)]
    bottom_row = [make_point(x, 140, stroke_id=1) for x in range(10, 100, 10)]
    sample = make_sample([top_row, bottom_row], point_count=18, canvas_height=160)
    assert looks_multi_row(sample) is True


def test_looks_multi_row_ignores_single_row():
    row_a = [make_point(x, 75, stroke_id=0) for x in range(10, 100, 10)]
    row_b = [make_point(x, 85, stroke_id=1) for x in range(10, 100, 10)]
    sample = make_sample([row_a, row_b], point_count=18, canvas_height=160)
    assert looks_multi_row(sample) is False
