from typing import Literal

from pydantic import BaseModel, Field

KoreanBackground = Literal["native", "heritage", "learner", "other"]
LearningDuration = Literal[
    "lt_3_months", "3_6_months", "6_12_months", "1_2_years", "2_3_years", "3_5_years", "gt_5_years"
]
Proficiency = Literal["beginner", "intermediate", "advanced", "native"]
WritingStyle = Literal["neat", "regular"]
SentenceNumber = Literal[1, 2, 3]
PointerEventType = Literal["down", "move", "up"]


class StrokePoint(BaseModel):
    x: float
    y: float
    timestamp: float
    relative_time: float
    pressure: float
    tiltX: float
    tiltY: float
    twist: float
    pointerType: str
    stroke_id: int
    event: PointerEventType


class BoundingBox(BaseModel):
    minX: float
    minY: float
    maxX: float
    maxY: float


class WriterInfo(BaseModel):
    anonymous_code: str = Field(min_length=1, max_length=64)
    korean_background: KoreanBackground
    learning_duration: LearningDuration | None = None
    proficiency: Proficiency
    consent: bool


class SampleUpload(BaseModel):
    sentence_number: SentenceNumber
    writing_style: WritingStyle
    strokes: list[list[StrokePoint]]
    canvas_width: int
    canvas_height: int
    stroke_count: int
    point_count: int
    duration_ms: int
    bounding_box: BoundingBox
    png_base64: str


class UploadRequest(BaseModel):
    writer: WriterInfo
    samples: list[SampleUpload] = Field(min_length=6, max_length=6)


class SampleUploadResult(BaseModel):
    sentence_number: SentenceNumber
    writing_style: WritingStyle
    sample_id: str | None = None
    error: str | None = None


class UploadResponse(BaseModel):
    success: bool
    writer_id: str | None = None
    results: list[SampleUploadResult] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: Literal["ok"]


class LatestSubmission(BaseModel):
    writer_anonymous_code: str
    sentence_number: int
    writing_style: WritingStyle
    created_at: str


class StatsResponse(BaseModel):
    total_participants: int
    total_samples: int
    latest_submissions: list[LatestSubmission]


class AdminLoginRequest(BaseModel):
    password: str


class AdminWriter(BaseModel):
    id: str
    anonymous_code: str
    korean_background: KoreanBackground
    learning_duration: LearningDuration | None
    proficiency: Proficiency
    consent: bool
    created_at: str
    sample_count: int


class AdminSample(BaseModel):
    id: str
    writer_id: str
    writer_anonymous_code: str
    sentence_number: int
    writing_style: WritingStyle
    png_path: str
    canvas_width: int
    canvas_height: int
    stroke_count: int
    point_count: int
    duration_ms: int
    bounding_box: BoundingBox
    created_at: str
