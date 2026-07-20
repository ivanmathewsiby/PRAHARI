"""initial_schema

Revision ID: eeeced625c9b
Revises: 
Create Date: 2026-07-19 00:29:20.899825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eeeced625c9b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "incident_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("incident_id", sa.String(), nullable=True),
        sa.Column("citizen_name", sa.String(), nullable=True),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("transcript", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("fraud_type", sa.String(), nullable=True),
        sa.Column("risk_level", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("consent_status", sa.String(), nullable=True),
        sa.Column("consent_scope", sa.String(), nullable=True),
        sa.Column("local_only", sa.Boolean(), nullable=True),
        sa.Column("redaction_summary", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("incident_id"),
    )
    op.create_index(op.f("ix_incident_events_id"), "incident_events", ["id"], unique=False)
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("incident_id", sa.String(), nullable=True),
        sa.Column("action", sa.String(), nullable=True),
        sa.Column("rule_hits", sa.JSON(), nullable=True),
        sa.Column("model_version", sa.String(), nullable=True),
        sa.Column("prompt_version", sa.String(), nullable=True),
        sa.Column("score_components", sa.JSON(), nullable=True),
        sa.Column("threshold_version", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)
    op.create_index(op.f("ix_audit_logs_incident_id"), "audit_logs", ["incident_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_audit_logs_incident_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_id"), table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index(op.f("ix_incident_events_id"), table_name="incident_events")
    op.drop_table("incident_events")
