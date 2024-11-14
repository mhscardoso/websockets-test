let content;
let t;

document.addEventListener('DOMContentLoaded', function(event) {
    content = document.getElementById('content');
    t = document.getElementById('t');
    t.textContent = `Client: ${CLIENT_ID}`;
})

let pageSections = [];
let focusedDiv   = null;
let URL_BASE     = `http://localhost:8000/`;
let CLIENT_ID    = `${Date.now()}`;
let WS_URL       = `ws://localhost:8000/ws/${CLIENT_ID}/`;
let websocket    = new WebSocket(WS_URL);


async function test() {
    const response = await fetch(URL_BASE);
    const json = await response.json();

    console.log(json);
}


async function getSavedSections() {
    const response = await fetch(`${URL_BASE}sections/`);
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

    textArea.onfocus = function(event) {
        let d = pageSections.find((section) => section['id_time'] === div.id);
        if (d['client_lock'] !== null) return;

        if (div.id !== focusedDiv) {
            websocket.send(JSON.stringify({
                'STATUS': 'LOCK_SESSION',
                'ClientID': CLIENT_ID,
                'OldFocus': focusedDiv,
                'NewFocus': div.id,
            }));
        }
    };

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

    textArea.onfocus = function(event) {
        let d = pageSections.find((section) => section['id_time'] === div.id);
        if (d['client_lock'] !== null) return;

        if (div.id !== focusedDiv) {
            websocket.send(JSON.stringify({
                'STATUS': 'LOCK_SESSION',
                'ClientID': CLIENT_ID,
                'OldFocus': focusedDiv,
                'NewFocus': div.id,
            }));
        }
    };

    content.append(div);
}


async function createSession() {
    const newDiv = createTextArea();
    content.append(newDiv);

    websocket.send(JSON.stringify({
        'STATUS': 'ADD_SESSION',
        'ClientID': CLIENT_ID,
        'SectionID': newDiv.id,
    }));
}


websocket.addEventListener('message', function(event) {
    const data = JSON.parse(event.data);

    if (data.STATUS == 'SESSION_ADDED') {
        const sectionID = data.SectionID;
        insertArea(sectionID, '');
        pageSections.push({
            "id_time": sectionID,
            "client_lock": data.ClientID,
            "content": null,
        });
    }

    if (data.STATUS === 'SESSION_LOCKED') {
        console.log(pageSections);
        let dIndex = pageSections.findIndex((section) => section['id_time'] === data.SectionID);
        pageSections[dIndex]['client_lock'] = data['ClientID'];

        let oIndex = pageSections.findIndex((section) => section['id_time'] === data.Avaiable);
        pageSections[oIndex]['client_lock'] = null;
    }

    if (data.STATUS === 'AVAIABLE') {
        let oIndex = pageSections.findIndex((section) => section['id_time'] === data.Avaiable);
        pageSections[oIndex]['client_lock'] = null;
    }
});


websocket.addEventListener('close', function(event) {
    websocket.send(JSON.stringify({
        'STATUS': 'CLEAR',
        'SectionID': focusedDiv,
    }));
});


async function main() {
    let initialContext = await getSavedSections();
    console.log(initialContext);

    await initialContext.forEach(session => {
        insertArea(session.id_time, session.content);
        pageSections.push({
            "id_time": session.id_time,
            "client_lock": session.client_lock,
            "content": session.content,
        });
    });
}


main();
