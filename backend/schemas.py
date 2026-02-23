from datetime import datetime, date
from pydantic import BaseModel


class APIResponse(BaseModel):
    success: bool
    data: object = None
    message: str = ""


# Auth
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    token: str


# Trainees
class TraineeSelfRegister(BaseModel):
    unique_name: str
    frames: list[str]
    email: str | None = None


class TraineeAdminRegister(BaseModel):
    unique_name: str
    images: list[str]


class TraineeOut(BaseModel):
    id: int
    unique_name: str
    email: str | None = None
    registered_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


# Attendance
class AttendanceFrameRequest(BaseModel):
    frame: str


class AttendanceOut(BaseModel):
    id: int
    trainee_id: int
    trainee_name: str = ""
    date: date
    checkin_time: datetime | None = None
    checkout_time: datetime | None = None
    checkin_image: str | None = None
    checkout_image: str | None = None
    status: str

    model_config = {"from_attributes": True}


class AttendancePatch(BaseModel):
    checkin_time: datetime | None = None
    checkout_time: datetime | None = None
    status: str | None = None


# Settings
class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingOut(BaseModel):
    key: str
    value: str

    model_config = {"from_attributes": True}
