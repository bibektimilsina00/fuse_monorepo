from sqlalchemy.orm import DeclarativeBase, declared_attr


class TablenameMixin:
    @declared_attr.directive
    @classmethod
    def __tablename__(cls) -> str:
        return cls.__name__.lower()


class Base(DeclarativeBase, TablenameMixin):
    pass
