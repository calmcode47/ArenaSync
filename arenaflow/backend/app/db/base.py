from app.db.session import Base
from app.models.alert import Alert
from app.models.crowd_snapshot import CrowdSnapshot
from app.models.queue_entry import QueueEntry

# Import all models here for Alembic to discover
from app.models.user import User
from app.models.venue import Venue
from app.models.virtual_queue import VirtualQueueEntry
from app.models.zone import Zone
