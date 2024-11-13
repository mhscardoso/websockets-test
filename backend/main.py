from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from sqlalchemy.orm import Session
from sqlalchemy import text, insert
from pydantic import BaseModel
from database import SessionLocal
from manager import manager

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


async def insert_client(db: session, id_time):
    stmt = text("INSERT INTO clients(id_time) VALUES (:id_time);")
    db.execute(stmt, {'id_time': id_time})
    db.commit()


async def remove_client(db: session, id_time: int):
    stmt = text("DELETE FROM clients WHERE id_time = to_char(:id_time, '99999999999999');")
    db.execute(stmt, {'id_time': id_time})
    db.commit()


async def insert_section(db: session, client_id: int, section_id: str):
    stmt1 = text("UPDATE secs SET client_lock = NULL WHERE client_lock = :client_id;")
    db.execute(stmt1, {'client_id': client_id})

    stmt2 = text("INSERT INTO secs(id_time, client_lock) VALUES (:id_time, :client_lock);")
    db.execute(stmt2, {'id_time': section_id, 'client_lock': client_id})


async def lock_session(db: session, client_id: int, section_id: str, old_section_id: str):
    pass



@app.get('/')
def index():
    return {'message': 'Hello'}


@app.get('/sections/', response_model=list[Sections])
def get_sections(db: session):
    stmt = text('SELECT * FROM secs;')
    result = db.execute(stmt).fetchall()

    return result

## STATUS
# ADD_SESSION:
#   ClientID, SectionID
#
# LOCK_SESSION:
#   
#
# SESSION_ADDED:
#   ClientID, SessionID
#



@app.websocket('/ws/{client_id}/')
async def ws_route(db: session, websocket: WebSocket, client_id: int):
    await manager.connect(websocket)
    await insert_client(db, client_id)

    await manager.broadcast({'ClientID': client_id, 'STATUS': 'IN'})

    try:
        while True:
            data = await websocket.receive_json()

            if data['STATUS'] == 'ADD_SESSION':
                insert_section(db, data['ClientID'], data['SectionID'])
                await manager.broadcast_others({'ClientID': client_id, 'STATUS': 'SESSION_ADDED', 'SectionID': data['SectionID']})
            
            if data['STATUS'] == 'LOCK_SESSION':
                pass

            if data['STATUS'] == 'SESSION_ADDED':
                pass

            if data['STATUS'] == 'WRITING':
                pass

            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await remove_client(db, client_id)
        await manager.broadcast({'ClientID': client_id, 'STATUS': 'OUT'})

