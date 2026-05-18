from dataclasses import asdict, dataclass
from typing import Literal


Urgency = Literal["Mild", "Moderate", "Urgent", "Emergency"]


@dataclass(frozen=True)
class Location:
    latitude: float
    longitude: float


@dataclass(frozen=True)
class TriageRequest:
    symptoms: str
    issueDetails: str
    duration: str
    severity: int
    age: int
    medicalHistory: str = ""
    location: Location | None = None

    @classmethod
    def from_payload(cls, payload: dict) -> "TriageRequest":
        symptoms = clean_string(payload.get("symptoms"), "symptoms", 3, 1500)
        issue_details = clean_string(payload.get("issueDetails"), "issueDetails", 3, 2500)
        duration = clean_string(payload.get("duration"), "duration", 1, 120)
        severity = clean_int(payload.get("severity"), "severity", 1, 10)
        age = clean_int(payload.get("age"), "age", 0, 120)
        medical_history = clean_string(payload.get("medicalHistory", ""), "medicalHistory", 0, 1500)
        location_payload = payload.get("location")
        location = None

        if isinstance(location_payload, dict):
            try:
                location = Location(
                    latitude=float(location_payload.get("latitude")),
                    longitude=float(location_payload.get("longitude")),
                )
            except (TypeError, ValueError):
                raise ValueError("location must contain numeric latitude and longitude") from None

        return cls(
            symptoms=symptoms,
            issueDetails=issue_details,
            duration=duration,
            severity=severity,
            age=age,
            medicalHistory=medical_history,
            location=location,
        )


@dataclass(frozen=True)
class TriageResponse:
    possibleIssues: list[str]
    urgency: Urgency
    redFlags: list[str]
    explanation: str
    suggestions: list[str]
    followUpQuestions: list[str]
    recommendedSpecialist: str
    specialistReason: str
    needsMedicalAttention: bool
    shouldCallEmergency: bool
    searchQuery: str
    disclaimer: str

    def to_dict(self) -> dict:
        return asdict(self)


def clean_string(value: object, field: str, minimum: int, maximum: int) -> str:
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")

    cleaned = value.strip()
    if len(cleaned) < minimum or len(cleaned) > maximum:
        raise ValueError(f"{field} must be between {minimum} and {maximum} characters")
    return cleaned


def clean_int(value: object, field: str, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a number") from None

    if parsed < minimum or parsed > maximum:
        raise ValueError(f"{field} must be between {minimum} and {maximum}")
    return parsed
