document.getElementById('theme-toggle').addEventListener('click', function () {
    document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme');
});

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const inputField = document.getElementById('user-input');
    const message = inputField.value.trim();
    
    if (!message) return;

    appendMessage('user', message);
    inputField.value = '';

    const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });

    const data = await response.json();
    appendMessage('bot', data.reply);
}

function appendMessage(sender, text) {
    const chatbox = document.getElementById('chatbox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.textContent = text;
    chatbox.appendChild(messageDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
}
