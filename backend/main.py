from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from database import (
    session,
    recover_sessions,

    insert_client,
    remove_client,

    insert_section,
    lock_session,
    unlock_session,

    write,
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
                await manager.broadcast_others(websocket, """{\"ClientID\": \"%s\", \"STATUS\": \"SESSION_ADDED\", \"SectionID\": \"%s\", \"Avaiable\": %s}""" % (client_id, data['SectionID'], f"\"{data['Avaiable']}\"" if data['Avaiable'] is not None else 'null'))
            
            if data['STATUS'] == 'LOCK_SESSION':
                await lock_session(db, client_id, data['NewFocus'], data['OldFocus'])
                await manager.broadcast_others(websocket, """{\"ClientID\": \"%s\", \"STATUS\": \"SESSION_LOCKED\", \"SectionID\": \"%s\", \"Avaiable\": %s}""" % (client_id, data['NewFocus'], f"\"{data['OldFocus']}\"" if data['OldFocus'] is not None else 'null'))

            if data['STATUS'] == 'SESSION_ADDED':
                pass

            if data['STATUS'] == 'CLEAR':
                await unlock_session(db, data['SectionID'])
                await manager.broadcast_others(websocket, """{\"STATUS\": \"AVAIABLE\", \"Avaiable\": \"%s\"}""" % data['OldFocus'])

            if data['STATUS'] == 'WRITING':
                await write(db, client_id, data['SectionID'], data['content'])
            
            if data['STATUS'] == 'SHARE':
                await manager.broadcast_others(websocket, """{\"STATUS\": \"WROTE\", \"SectionID\": \"%s\", \"content\": \"%s\"}""" % (data['SectionID'], data['content']))

            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await remove_client(db, client_id)
        section_id = await unlock_session(db, client_id)

        if section_id != None:
            await manager.broadcast_others(websocket, """{\"STATUS\": \"AVAIABLE\", \"Avaiable\": \"%s\"}""" % section_id)
        else:
            await manager.broadcast_others(websocket, """{\"STATUS\": \"AVAIABLE\", \"Avaiable\": null}""")

        await manager.broadcast("""{\"ClientID\": \"%s\", \"STATUS\": \"OUT\"}""" % client_id)



app.mount('/', StaticFiles(directory='../frontend', html=True), name='frontend')

