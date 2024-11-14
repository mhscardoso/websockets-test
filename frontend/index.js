let content;
let t;

document.addEventListener('DOMContentLoaded', function (event) {
    content = document.getElementById('content');
    t = document.getElementById('t');
    t.textContent = `Client: ${CLIENT_ID}`;
})

let pageSections = [];
let focusedDiv = null;
let URL_BASE = `http://localhost:8000/`;
let CLIENT_ID = `${Date.now()}`;
let WS_URL = `ws://localhost:8000/ws/${CLIENT_ID}/`;
let websocket = new WebSocket(WS_URL);
let debounceTimer;


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

    div.append(h3);
    div.append(textArea);

    textArea.addEventListener('focus', function (event) {
        let d = pageSections.find((section) => section['id_time'] === div.id);

        if (d['client_lock'] !== null) {
            event.preventDefault();
            return;
        };

        if (div.id !== focusedDiv) {
            websocket.send(JSON.stringify({
                'STATUS': 'LOCK_SESSION',
                'ClientID': CLIENT_ID,
                'OldFocus': focusedDiv,
                'NewFocus': div.id,
            }));
        }

        focusedDiv = div.id;
    });

    textArea.addEventListener('input', function(event) {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            websocket.send(JSON.stringify({
                'STATUS': 'WRITING',
                'ClientID': CLIENT_ID,
                'SectionID': div.id,
                'content': event.target.value,
            }));
        }, 2000);

        setTimeout(() => {
            websocket.send(JSON.stringify({
                'STATUS': 'SHARE',
                'ClientID': CLIENT_ID,
                'SectionID': div.id,
                'content': event.target.value,
            }));
        }, 100);
    });

    return div;
}


function insertArea(id, context, client_lock) {
    let div = document.createElement('div');
    div.id = id;

    let h3 = document.createElement('h3');
    h3.textContent = `ID: ${div.id}`;;

    let textArea = document.createElement('textarea');
    textArea.textContent = context;

    if (client_lock !== null) {
        textArea.classList.add('bloqueado');
    }

    div.append(h3);
    div.append(textArea);

    textArea.addEventListener('focus', function (event) {
        let d = pageSections.find((section) => section['id_time'] === div.id);

        if (d['client_lock'] !== null) {
            event.preventDefault();
            return;
        };

        if (div.id !== focusedDiv) {
            websocket.send(JSON.stringify({
                'STATUS': 'LOCK_SESSION',
                'ClientID': CLIENT_ID,
                'OldFocus': focusedDiv,
                'NewFocus': div.id,
            }));
        }

        focusedDiv = div.id;
    });

    textArea.addEventListener('input', function(event) {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            websocket.send(JSON.stringify({
                'STATUS': 'WRITING',
                'ClientID': CLIENT_ID,
                'SectionID': div.id,
                'content': event.target.value,
            }));
        }, 2000);

        setTimeout(() => {
            websocket.send(JSON.stringify({
                'STATUS': 'SHARE',
                'ClientID': CLIENT_ID,
                'SectionID': div.id,
                'content': event.target.value,
            }));
        }, 100);
    })

    content.append(div);
}


async function createSession() {
    const newDiv = createTextArea();
    content.append(newDiv);

    pageSections.push({
        "id_time": newDiv.id,
        "client_lock": CLIENT_ID,
        "content": null,
    });

    if (focusedDiv !== null) {
        let d = pageSections.findIndex((section) => section['id_time'] === focusedDiv);
        pageSections[d]['client_lock'] = null;
    }

    websocket.send(JSON.stringify({
        'STATUS': 'ADD_SESSION',
        'ClientID': CLIENT_ID,
        'SectionID': newDiv.id,
        'Avaiable': focusedDiv,
    }));

    focusedDiv = newDiv.id;
}


websocket.addEventListener('message', function (event) {
    console.log(event.data);
    const data = JSON.parse(event.data);

    if (data.STATUS == 'SESSION_ADDED') {
        const sectionID = data.SectionID;
        insertArea(sectionID, '');
        pageSections.push({
            "id_time": sectionID,
            "client_lock": data.ClientID,
            "content": null,
        });

        if (data.Avaiable !== null) {
            let oIndex = pageSections.findIndex((section) => section['id_time'] === data.Avaiable);
            pageSections[oIndex]['client_lock'] = null;

            let unlockedDiv = document.getElementById(data.Avaiable);
            let unlockedTextArea = unlockedDiv.getElementsByTagName('textarea');

            unlockedTextArea.item(0).classList.remove('bloqueado');
        }
    }

    if (data.STATUS === 'SESSION_LOCKED') {
        let dIndex = pageSections.findIndex((section) => section['id_time'] === data.SectionID);
        pageSections[dIndex]['client_lock'] = data['ClientID'];

        let lockedDiv = document.getElementById(data.SectionID);
        let lockedTextArea = lockedDiv.getElementsByTagName('textarea');

        lockedTextArea.item(0).classList.add('bloqueado');

        if (data.Avaiable !== null) {
            let oIndex = pageSections.findIndex((section) => section['id_time'] === data.Avaiable);
            pageSections[oIndex]['client_lock'] = null;

            let unlockedDiv = document.getElementById(data.Avaiable);
            let unlockedTextArea = unlockedDiv.getElementsByTagName('textarea');

            unlockedTextArea.item(0).classList.remove('bloqueado');
        }
    }

    if (data.STATUS === 'AVAIABLE') {
        let oIndex = pageSections.findIndex((section) => section['id_time'] === data.Avaiable);
        pageSections[oIndex]['client_lock'] = null;

        let unlockedDiv = document.getElementById(data.Avaiable);
        let unlockedTextArea = unlockedDiv.getElementsByTagName('textarea');

        unlockedTextArea.item(0).classList.remove('bloqueado');
    }

    if (data.STATUS === 'WROTE') {
        let oIndex = pageSections.findIndex((section) => section['id_time'] === data.SectionID);
        pageSections[oIndex]['content'] = data.content;

        let unlockedDiv = document.getElementById(data.SectionID);
        let unlockedTextArea = unlockedDiv.getElementsByTagName('textarea');

        unlockedTextArea.item(0).value = data.content;
    }
});


websocket.addEventListener('close', function (event) {
    websocket.send(JSON.stringify({
        'STATUS': 'CLEAR',
        'SectionID': focusedDiv,
    }));
});


async function main() {
    let initialContext = await getSavedSections();
    console.log(initialContext);

    await initialContext.forEach(session => {
        insertArea(session.id_time, session.content, session.client_lock);
        pageSections.push({
            "id_time": session.id_time,
            "client_lock": session.client_lock,
            "content": session.content,
        });
    });
}


main();
