from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import Session
from sqlalchemy import text, insert
from typing import Annotated
from fastapi import Depends


SQLALCHEMY_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/postgres"


engine = create_engine(
  SQLALCHEMY_DATABASE_URL
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

session = Annotated[Session, Depends(get_db)]


async def recover_sessions(db: session):
    stmt = text('SELECT * FROM secs;')
    result = db.execute(stmt).fetchall()

    return result


async def insert_client(db: session, id_time):
    stmt = text("INSERT INTO clients(id_time) VALUES (:id_time);")
    db.execute(stmt, {'id_time': id_time})
    db.commit()


async def remove_client(db: session, id_time: str):
    stmt = text("DELETE FROM clients WHERE id_time = :id_time;")
    db.execute(stmt, {'id_time': id_time})
    db.commit()


async def insert_section(db: session, client_id: str, section_id: str):
    stmt1 = text("UPDATE secs SET client_lock = NULL WHERE client_lock = :client_id;")
    db.execute(stmt1, {'client_id': client_id})

    stmt2 = text("INSERT INTO secs(id_time, client_lock) VALUES (:id_time, :client_lock);")
    db.execute(stmt2, {'id_time': section_id, 'client_lock': client_id})

    db.commit()


async def lock_session(db: session, client_id: str, section_id: str, old_section_id: str):
    stmt1 = text("UPDATE secs SET client_lock = NULL WHERE id_time = :old_section_id;")
    stmt2 = text("UPDATE secs SET client_lock = :client_id WHERE id_time = :section_id;")

    db.execute(stmt1, {'old_section_id': old_section_id}) if old_section_id != None else None
    db.execute(stmt2, {'client_id': client_id, 'section_id': section_id})

    db.commit()
  

async def unlock_session(db: session, client_id: str):
	stmt = text("UPDATE secs SET client_lock = NULL WHERE client_lock = :client_id RETURNING id_time;")
	section_id = db.execute(stmt, {'client_id': client_id})
	db.commit()
    
	return section_id
