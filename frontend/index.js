document.addEventListener('DOMContentLoaded', function() {
    content = document.getElementById('content');
});

const URL       = `http://localhost:8000/`;
const CLIENT_ID = Date.now();

async function test() {
    const response = await fetch(URL);
    const json = await response.json();

    console.log(json);
}

Promise.all([test]);

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

    return div;
}

async function createSession() {
    const newDiv = createTextArea();

    content.append(newDiv);

    await test();
}
