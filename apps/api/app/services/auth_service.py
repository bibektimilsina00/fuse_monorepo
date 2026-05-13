from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher, exceptions
from fastapi import HTTPException, status
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.core.config import settings
from apps.api.app.models.user import User
from apps.api.app.repositories.user_repository import UserRepository
from apps.api.app.schemas.auth import UserLogin, UserRegister
from apps.api.app.services.base import BaseService

ph = PasswordHasher()


class AuthService(BaseService):
    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.user_repo = UserRepository(db)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        try:
            return ph.verify(hashed_password, plain_password)
        except exceptions.VerifyMismatchError:
            return False

    def get_password_hash(self, password: str) -> str:
        return ph.hash(password)

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(UTC) + expires_delta
        else:
            expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    async def register(self, user_in: UserRegister) -> User:
        existing_user = await self.user_repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists"
            )

        user = User(email=user_in.email, hashed_password=self.get_password_hash(user_in.password))
        return await self.user_repo.create(user)

    async def authenticate(self, user_login: UserLogin) -> User | None:
        user = await self.user_repo.get_by_email(user_login.email)
        if not user:
            return None
        if not self.verify_password(user_login.password, user.hashed_password):
            return None
        return user
