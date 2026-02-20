from datetime import datetime, date
from sqlalchemy import Column, Integer, Text, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Trainee(Base):
    __tablename__ = "trainees"

    id = Column(Integer, primary_key=True, index=True)
    unique_name = Column(Text, unique=True, nullable=False)
    registered_by = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    embeddings = relationship("FaceEmbedding", back_populates="trainee", cascade="all, delete-orphan", lazy="select")
    attendance_records = relationship("Attendance", back_populates="trainee", lazy="select")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    trainee_id = Column(Integer, ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False)
    embedding = Column(Text, nullable=False)
    source = Column(Text, default="camera")
    created_at = Column(DateTime, default=datetime.utcnow)

    trainee = relationship("Trainee", back_populates="embeddings", lazy="select")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    trainee_id = Column(Integer, ForeignKey("trainees.id"), nullable=False)
    date = Column(Date, nullable=False, default=date.today)
    checkin_time = Column(DateTime, nullable=True)
    checkout_time = Column(DateTime, nullable=True)
    status = Column(Text, default="present")

    trainee = relationship("Trainee", back_populates="attendance_records", lazy="select")


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(Text, unique=True, nullable=False)
    value = Column(Text, nullable=False)
