import re
from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import DeclarativeBase, declared_attr, Mapped, mapped_column


class Base(DeclarativeBase):
    __table_args__ = (
        {
            "extend_existing": True,
        },
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True)

    @declared_attr
    def __tablename__(cls) -> str:
        return re.sub(r'(?<!^)(?=[A-Z])', '_', cls.__name__).lower()

    def __repr__(self):
        """
        模型的預設字串表示。
        """
        return f"<{self.__class__.__name__}(id={self.id}, {vars(self)})>"

    def to_dict(self, include_relationships=False):
        """
        將模型實例轉換為字典格式。
        Args:
            include_relationships (bool): 是否在輸出中包含關聯物件。
        Returns:
            dict: 模型實例的字典表示。
        """
        data = {column.name: getattr(self, column.name)
                for column in self.__table__.columns}
        if include_relationships:
            for rel in self.__mapper__.relationships:
                data[rel.key] = getattr(self, rel.key)
        return data


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), nullable=False)
