from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from apps.api.app.core.security import create_access_token

router = APIRouter()

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Simplified login for foundation
    if form_data.username == "admin" and form_data.password == "admin":
        return {"access_token": create_access_token("admin"), "token_type": "bearer"}
    raise HTTPException(status_code=400, detail="Incorrect username or password")
