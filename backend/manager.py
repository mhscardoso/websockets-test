from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.accepted_connections: dict[int, set[WebSocket]] = dict()


    async def connect(self, websocket: WebSocket, stakeholder_id: int):
        await websocket.accept()
        if stakeholder_id not in self.accepted_connections:
            self.accepted_connections[stakeholder_id] = {websocket}
        else:
            self.accepted_connections[stakeholder_id].add(websocket)
    

    def disconnect(self, websocket: WebSocket, stakeholder_id: int):
        self.accepted_connections[stakeholder_id].remove(websocket)
    

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_json(message)

    
    async def broadcast(self, stakeholder_id: int, message: str):
        for connection in self.accepted_connections[stakeholder_id]:
            await connection.send_json(message)
    

    async def broadcast_others(self, stakeholder_id: int, websocket: WebSocket, message: str):
        for connection in self.accepted_connections[stakeholder_id]:
            if websocket != connection:
                await connection.send_json(message)


manager = ConnectionManager()
