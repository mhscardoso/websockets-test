from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database import SessionLocal

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

session = Annotated[Session, Depends(get_db)]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Sections(BaseModel):
    id: int
    id_time: str
    client_lock: str
    content: str


@app.get('/')
def index():
    return {'message': 'Hello'}


@app.get('/sections/', response_model=list[Sections])
def get_sections(db: session):
    stmt = text('SELECT * FROM secs;')
    result = db.execute(stmt).fetchall()

    return result


@app.post('/sections/')
def new_section(db: session, id_time: str):
    pass
