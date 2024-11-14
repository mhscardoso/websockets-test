from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from database import (
    session,
    recover_sessions,

    insert_client,
    remove_client,

    insert_section,
    lock_session,
    unlock_session,
)
from manager import manager

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Sections(BaseModel):
    id_time: str
    client_lock: str | None
    content: str | None


@app.get('/')
def index():
    return {'message': 'Hello'}


@app.get('/sections/', response_model=list[Sections])
async def get_sections(db: session):
    result = await recover_sessions(db)

    return result

## STATUS
# ADD_SESSION:
#   ClientID, SectionID
#
# LOCK_SESSION:
#   
#
# SESSION_LOCKED
#
# SESSION_ADDED:
#   ClientID, SessionID
#



@app.websocket('/ws/{client_id}/')
async def ws_route(db: session, websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    await insert_client(db, client_id)

    await manager.broadcast("""{\"ClientID\": \"%s\", \"STATUS\": \"IN\"}""" % client_id)

    try:
        while True:
            data = await websocket.receive_json()

            if data['STATUS'] == 'ADD_SESSION':
                await insert_section(db, client_id, data['SectionID'])
                await manager.broadcast_others(websocket, """{\"ClientID\": \"%s\", \"STATUS\": \"SESSION_ADDED\", \"SectionID\": \"%s\"}""" % (client_id, data['SectionID']))
            
            if data['STATUS'] == 'LOCK_SESSION':
                await lock_session(db, client_id, data['NewFocus'], data['OldFocus'])
                await manager.broadcast_others(websocket, """{\"ClientID\": \"%s\", \"STATUS\": \"SESSION_LOCKED\", \"SectionID\": \"%s\", \"Avaiable\": \"%s\"}""" % (client_id, data['NewFocus'], data['NewFocus']))

            if data['STATUS'] == 'SESSION_ADDED':
                pass

            if data['STATUS'] == 'CLEAR':
                await unlock_session(db, data['SectionID'])
                await manager.broadcast_others(websocket, """{\"STATUS\": \"AVAIABLE\", \"Avaiable\": \"%s\"}""" % data['OldFocus'])

            if data['STATUS'] == 'WRITING':
                pass

            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await remove_client(db, client_id)
        section_id = await unlock_session(db, client_id)

        await manager.broadcast_others(websocket, """{\"STATUS\": \"AVAIABLE\", \"Avaiable\": \"%s\",}""" % section_id)

        await manager.broadcast("""{\"ClientID\": \"%s\", \"STATUS\": \"OUT\"}""" % client_id)

