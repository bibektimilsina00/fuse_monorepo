from cryptography.fernet import Fernet

from apps.api.app.core.config import settings


class AESService:
    def __init__(self, key: str = None):
        self.key = key or settings.ENCRYPTION_KEY
        if not self.key or len(self.key) != 44:
            self.fernet = Fernet(Fernet.generate_key())
        else:
            self.fernet = Fernet(self.key.encode())

    def encrypt(self, data: str) -> str:
        return self.fernet.encrypt(data.encode()).decode()

    def decrypt(self, token: str) -> str:
        return self.fernet.decrypt(token.encode()).decode()


aes_service = AESService()
