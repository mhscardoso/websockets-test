document.addEventListener('DOMContentLoaded', function() {
    content = document.getElementById('content');
});


let pageSections = [];
let focusedDiv   = null;
const URL        = `http://localhost:8000/`;
const CLIENT_ID  = Date.now();
const WS_URL     = `ws://localhost:8000/ws/${CLIENT_ID}/`;
const websocket  = new WebSocket(WS_URL);


async function test() {
    const response = await fetch(URL);
    const json = await response.json();

    console.log(json);
}


async function getSavedSections() {
    const response = await fetch(`${URL}sections/`);
    const json = await response.json();

    return json;
}


function createTextArea() {
    let div = document.createElement('div');
    div.id = `id_${Date.now()}`;

    let h3 = document.createElement('h3');
    h3.textContent = `ID: ${div.id}`;

    let textArea = document.createElement('textarea');
    textArea.style.cssText = ` 
            width: 90%;
            height: 150px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 16px;
            resize: vertical;`;

    div.append(h3);
    div.append(textArea);

    div.onfocus(function(event) {
        let d = pageSections.find((section) => section['id_time'] === this.id);
        if (d['client_lock'] !== null) return;

        if (div.id !== focusedDiv) {
            websocket.send(JSON.stringify({
                'STATUS': 'LOCK_SESSION',
                'ClientID': CLIENT_ID,
                'OldFocus': focusedDiv,
                'NewFocus': div.id,
            }));
        }
    });

    return div;
}


function insertArea(id, context) {
    let div = document.createElement('div');
    div.id = id;

    let h3 = document.createElement('h3');
    h3.textContent = `ID: ${div.id}`;;

    let textArea = document.createElement('textarea');
    textArea.style.cssText = ` 
            width: 90%;
            height: 150px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 16px;
            resize: vertical;`;
    
    textArea.textContent = context;

    div.append(h3);
    div.append(textArea);

    div.onfocus(function(event) {
        let d = pageSections.find((section) => section['id_time'] === this.id);
        if (d['client_lock'] !== null) return;

        if (div.id !== focusedDiv) {
            websocket.send(JSON.stringify({
                'STATUS': 'LOCK_SESSION',
                'ClientID': CLIENT_ID,
                'OldFocus': focusedDiv,
                'NewFocus': div.id,
            }));
        }
    });

    context.append(div);
}


async function createSession() {
    const newDiv = createTextArea();
    content.append(newDiv);

    websocket.send()
}


websocket.addEventListener('message', function(event) {
    const data = event.data;

    if (data['STATUS'] === 'SECTION_ADDED') {
        const sectionID = data['SectionID'];
        insertArea(sectionID, '');
    }
});



async function main() {
    let initialContext = await getSavedSections();

    await initialContext.forEach(session => {
        insertArea(session.id_time, session.content);
        pageSections.push({
            "id": session.id,
            "id_time": session.id_time,
            "client_lock": session.client_lock,
            "content": session.content,
        });
    });
}


main();
