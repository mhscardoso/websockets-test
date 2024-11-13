from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.accepted_connections: list[WebSocket] = list()


    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.accepted_connections.append(websocket)
    

    def disconnect(self, websocket: WebSocket):
        self.accepted_connections.remove(websocket)
    

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_json(message)

    
    async def broadcast(self, message: str):
        for connection in self.accepted_connections:
            await connection.send_json(message)
    

    async def broadcast_others(self, websocket: WebSocket, message: str):
        for connection in self.accepted_connections:
            if websocket != connection:
                await connection.send_json(message)


manager = ConnectionManager()
