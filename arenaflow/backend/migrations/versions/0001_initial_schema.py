"""Initial schema

Revision ID: 0001
Revises: 
Create Date: 2024-04-12 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('admin', 'staff', 'attendee', name='user_role_enum'), nullable=False, server_default='attendee'),
        sa.Column('firebase_uid', sa.String(), nullable=True),
        sa.Column('preferred_language', sa.String(), nullable=False, server_default='en'),
        sa.Column('fcm_token', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. venues table
    op.create_table('venues',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('city', sa.String(), nullable=False),
        sa.Column('country', sa.String(), nullable=False),
        sa.Column('total_capacity', sa.Integer(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('google_place_id', sa.String(), nullable=True),
        sa.Column('config_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. zones table
    op.create_table('zones',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('venue_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('zone_type', sa.Enum('gate', 'concession', 'restroom', 'seating', 'emergency_exit', 'parking', name='zone_type_enum'), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('polygon_coords', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['venue_id'], ['venues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. crowd_snapshots table
    op.create_table('crowd_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('venue_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('current_count', sa.Integer(), nullable=False),
        sa.Column('density_score', sa.Float(), nullable=False),
        sa.Column('congestion_level', sa.Enum('low', 'moderate', 'high', 'critical', name='congestion_level_enum'), nullable=False),
        sa.Column('flow_direction', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['venue_id'], ['venues.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_crowd_snapshots_venue_recorded', 'crowd_snapshots', ['venue_id', 'recorded_at'], unique=False)
    op.create_index('ix_crowd_snapshots_zone_recorded', 'crowd_snapshots', ['zone_id', 'recorded_at'], unique=False)

    # 5. queue_entries table
    op.create_table('queue_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('venue_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('queue_length', sa.Integer(), nullable=False),
        sa.Column('estimated_wait_minutes', sa.Float(), nullable=False),
        sa.Column('actual_wait_minutes', sa.Float(), nullable=True),
        sa.Column('service_rate', sa.Float(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['venue_id'], ['venues.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_queue_entries_zone_recorded', 'queue_entries', ['zone_id', 'recorded_at'], unique=False)

    # 6. alerts table
    op.create_table('alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('venue_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('alert_type', sa.Enum('overcrowding', 'long_queue', 'emergency', 'weather', 'info', 'staff_needed', name='alert_type_enum'), nullable=False),
        sa.Column('severity', sa.Enum('low', 'medium', 'high', 'critical', name='severity_enum'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.String(), nullable=False),
        sa.Column('translated_messages', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('fcm_sent', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['venue_id'], ['venues.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_alerts_is_resolved', 'alerts', ['is_resolved'], unique=False)
    op.create_index('ix_alerts_venue_created', 'alerts', ['venue_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_alerts_venue_created', table_name='alerts')
    op.drop_index('ix_alerts_is_resolved', table_name='alerts')
    op.drop_table('alerts')
    op.execute("DROP TYPE IF EXISTS severity_enum;")
    op.execute("DROP TYPE IF EXISTS alert_type_enum;")

    op.drop_index('ix_queue_entries_zone_recorded', table_name='queue_entries')
    op.drop_table('queue_entries')

    op.drop_index('ix_crowd_snapshots_zone_recorded', table_name='crowd_snapshots')
    op.drop_index('ix_crowd_snapshots_venue_recorded', table_name='crowd_snapshots')
    op.drop_table('crowd_snapshots')
    op.execute("DROP TYPE IF EXISTS congestion_level_enum;")

    op.drop_table('zones')
    op.execute("DROP TYPE IF EXISTS zone_type_enum;")

    op.drop_table('venues')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS user_role_enum;")
