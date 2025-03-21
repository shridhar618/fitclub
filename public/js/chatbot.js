document.getElementById('theme-toggle').addEventListener('click', function () {
    document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme');

    // Toggle icon between sun (☀️) and moon (🌙)
    this.textContent = document.body.classList.contains('dark-theme') ? '🌙' : '☀️';
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

    // Show loading indicator
    const loadingMessage = appendMessage('bot', '⏳ Thinking...');

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        
        // Remove loading message
        loadingMessage.remove();

        appendMessage('bot', data.reply);
    } catch (error) {
        console.error("Error:", error);
        
        // Remove loading message
        loadingMessage.remove();

        appendMessage('bot', '❌ Oops! Something went wrong.');
    }
}

function appendMessage(sender, text) {
    const chatbox = document.getElementById('chatbox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.textContent = text;
    chatbox.appendChild(messageDiv);

    // Smooth auto-scroll
    chatbox.scrollTo({ top: chatbox.scrollHeight, behavior: 'smooth' });

    return messageDiv; // Return message element for removing later
}
