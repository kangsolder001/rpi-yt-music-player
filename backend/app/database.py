from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# SQLite configuration
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Check and perform lightweight SQLite auto-migration
    with engine.connect() as conn:
        try:
            result = conn.exec_driver_sql("PRAGMA table_info(playlist_songs)").fetchall()
            existing_cols = {row[1] for row in result}
            if "is_downloaded" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE playlist_songs ADD COLUMN is_downloaded INTEGER DEFAULT 0")
            if "file_path" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE playlist_songs ADD COLUMN file_path VARCHAR(512)")
            if "download_status" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE playlist_songs ADD COLUMN download_status VARCHAR(32) DEFAULT 'none'")
            conn.commit()
        except Exception as e:
            pass


