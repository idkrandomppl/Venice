const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Store the conversation history
let messages = [
    { role: 'system', content: 'You are a helpful, privacy-respecting AI assistant.' }
];

function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role);
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.textContent = content;
    messageDiv.appendChild(bubble);
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return bubble; // Return the bubble for streaming updates
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Display user message
    addMessage('user', text);
    messages.push({ role: 'user', content: text });

    userInput.value = '';
    userInput.disabled = true;
    sendButton.disabled = true;

    // Create a placeholder for the assistant's response
    const assistantBubble = addMessage('assistant', '');
    let fullResponse = '';

    try {
        // Call YOUR backend proxy, not Venice directly
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messages }), // Let the backend set the model
        });

        if (!response.ok) throw new Error('Network response was not ok');

        // Handle the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Venice returns data in SSE format: "data: {...}\n\n"
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const json = JSON.parse(data);
                        const delta = json.choices[0]?.delta?.content || '';
                        fullResponse += delta;
                        assistantBubble.textContent = fullResponse; // Update the bubble
                        chatWindow.scrollTop = chatWindow.scrollHeight;
                    } catch (e) {
                        console.error('Error parsing stream chunk:', e);
                    }
                }
            }
        }

        // Add the assistant's full response to history
        messages.push({ role: 'assistant', content: fullResponse });

    } catch (error) {
        console.error('Error:', error);
        assistantBubble.textContent = 'Sorry, something went wrong. Please try again.';
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
