"""virtual queue

Revision ID: 0002
Revises: 0001
Create Date: 2024-04-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # create enum
    vqueue_status_enum = postgresql.ENUM('waiting', 'called', 'serving', 'completed', 'abandoned', name='vqueue_status_enum')
    vqueue_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table('virtual_queue_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('venue_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('status', vqueue_status_enum, nullable=False, server_default='waiting'),
        sa.Column('ticket_code', sa.String(length=6), nullable=False),
        sa.Column('estimated_call_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('called_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['venue_id'], ['venues.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['zone_id'], ['zones.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_virtual_queue_entries_ticket_code'), 'virtual_queue_entries', ['ticket_code'], unique=True)
    op.create_index('ix_vqueue_user_status', 'virtual_queue_entries', ['user_id', 'status'], unique=False)
    op.create_index('ix_vqueue_zone_status', 'virtual_queue_entries', ['zone_id', 'status'], unique=False)

def downgrade() -> None:
    op.drop_index('ix_vqueue_zone_status', table_name='virtual_queue_entries')
    op.drop_index('ix_vqueue_user_status', table_name='virtual_queue_entries')
    op.drop_index(op.f('ix_virtual_queue_entries_ticket_code'), table_name='virtual_queue_entries')
    op.drop_table('virtual_queue_entries')
    
    vqueue_status_enum = postgresql.ENUM('waiting', 'called', 'serving', 'completed', 'abandoned', name='vqueue_status_enum')
    vqueue_status_enum.drop(op.get_bind())
