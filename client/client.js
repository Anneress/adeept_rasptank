const ws = new WebSocket('ws://localhost:8000');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
    const messagesDiv = document.getElementById('messages');
    const message = document.createElement('div');
    message.textContent = `Server: ${event.data}`;
    messagesDiv.appendChild(message);
};

ws.onclose = () => {
    console.log('Disconnected from WebSocket server');
};

function sendMessage() {
    const input = document.getElementById('messageInput');
    ws.send(input.value);
    const messagesDiv = document.getElementById('messages');
    const message = document.createElement('div');
    message.textContent = `You: ${input.value}`;
    messagesDiv.appendChild(message);
    input.value = '';
}