from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Setting
from schemas import SettingUpdate, SettingOut, APIResponse
from dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get("", response_model=APIResponse)
async def get_settings(db: Session = Depends(get_db), _admin: dict = Depends(get_current_admin)):
    settings = db.query(Setting).all()
    data = {s.key: s.value for s in settings}
    return APIResponse(success=True, data=data, message="Settings retrieved")


@router.patch("", response_model=APIResponse)
async def update_setting(
    body: SettingUpdate,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    setting = db.query(Setting).filter(Setting.key == body.key).first()
    if not setting:
        setting = Setting(key=body.key, value=body.value)
        db.add(setting)
    else:
        setting.value = body.value

    db.commit()
    return APIResponse(success=True, message=f"Setting '{body.key}' updated")
