from app.core.database import Base, engine



# Import ALL models so SQLAlchemy registers them

from app.models.incident import IncidentEvent

from app.models.audit import AuditLog





Base.metadata.create_all(bind=engine)



print("Tables created successfully!")