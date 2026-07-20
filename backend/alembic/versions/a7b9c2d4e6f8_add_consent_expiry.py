"""add consent expiry

Revision ID: a7b9c2d4e6f8
Revises: eeeced625c9b
Create Date: 2026-07-21 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b9c2d4e6f8"
down_revision: Union[str, Sequence[str], None] = "eeeced625c9b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("incident_events", sa.Column("retention_days", sa.Integer(), nullable=True))
    op.add_column("incident_events", sa.Column("expires_at", sa.DateTime(), nullable=True))
    op.create_index(
        "ix_incident_events_expires_at",
        "incident_events",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_incident_events_expires_at", table_name="incident_events")
    op.drop_column("incident_events", "expires_at")
    op.drop_column("incident_events", "retention_days")
