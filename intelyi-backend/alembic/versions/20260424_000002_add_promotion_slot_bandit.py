"""add promotion slot bandit

Revision ID: 20260424_000002
Revises: 20260420_000001
Create Date: 2026-04-24 00:00:02
"""

from alembic import op
import sqlalchemy as sa


revision = "20260424_000002"
down_revision = "20260420_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "promotion_slot_action_stats",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("slot_key", sa.String(length=100), nullable=False),
        sa.Column("page_context", sa.String(length=100), nullable=False),
        sa.Column("context_key", sa.String(length=255), nullable=False),
        sa.Column("action_key", sa.String(length=100), nullable=False),
        sa.Column("impressions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("rewards", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_rewarded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "slot_key",
            "context_key",
            "action_key",
            name="uq_promotion_slot_action_stats_slot_context_action",
        ),
    )
    op.create_index(
        "ix_promotion_slot_action_stats_slot_context",
        "promotion_slot_action_stats",
        ["slot_key", "context_key"],
        unique=False,
    )

    op.create_table(
        "promotion_slot_decisions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("slot_key", sa.String(length=100), nullable=False),
        sa.Column("page_context", sa.String(length=100), nullable=False),
        sa.Column("action_key", sa.String(length=100), nullable=False),
        sa.Column("selection_mode", sa.String(length=50), nullable=False),
        sa.Column("epsilon", sa.Integer(), server_default="20", nullable=False),
        sa.Column("estimated_reward", sa.Integer(), server_default="0", nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=True),
        sa.Column("session_id", sa.String(length=255), nullable=True),
        sa.Column("context_key", sa.String(length=255), nullable=False),
        sa.Column("context_features", sa.JSON(), nullable=False),
        sa.Column("reward_event_type", sa.String(length=100), nullable=True),
        sa.Column("reward_product_id", sa.String(length=36), nullable=True),
        sa.Column("rewarded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_promotion_slot_decisions_slot_created_at",
        "promotion_slot_decisions",
        ["slot_key", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_promotion_slot_decisions_slot_created_at", table_name="promotion_slot_decisions")
    op.drop_table("promotion_slot_decisions")

    op.drop_index("ix_promotion_slot_action_stats_slot_context", table_name="promotion_slot_action_stats")
    op.drop_table("promotion_slot_action_stats")

