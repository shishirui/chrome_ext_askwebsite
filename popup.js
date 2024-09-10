document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const settingsLink = document.getElementById('settings-link');
    const quickActionsContainer = document.getElementById('quick-actions');

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    function loadQuickActions() {
        chrome.storage.sync.get('quickActions', (data) => {
            const quickActions = data.quickActions || [
                { label: 'Features', message: 'Please introduce the main features of this website.' },
                { label: 'Founded', message: 'When was this website founded?' },
                { label: 'Developer', message: 'Who developed this website?' },
                { label: 'Similar Sites', message: 'What are some similar websites to this one?' }
            ];
            
            quickActionsContainer.innerHTML = '';
            quickActions.forEach(action => {
                const button = document.createElement('button');
                button.className = 'quick-action-btn';
                button.textContent = action.label;
                button.addEventListener('click', () => {
                    userInput.value = action.message;
                    sendMessage();
                });
                quickActionsContainer.appendChild(button);
            });
        });
    }

    loadQuickActions();

    function scrollToBottom() {
        const chatContainer = document.getElementById('chat-container');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message) {
            try {
                const apiKeySet = await checkApiKey();
                if (!apiKeySet) {
                    addMessage('error', 'API key not set. Please go to the settings page to set your OpenAI API key.');
                    return;
                }

                addMessage('user', message);
                userInput.value = '';
                scrollToBottom();

                await streamChatGPT(message);
            } catch (error) {
                addMessage('error', 'An error occurred. Please try again.');
                console.error('Error:', error);
            }
            scrollToBottom();
        }
    }

    function checkApiKey() {
        return new Promise((resolve) => {
            chrome.storage.sync.get('openaiApiKey', (data) => {
                resolve(!!data.openaiApiKey);
            });
        });
    }

    function addMessage(sender, content) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.textContent = content;
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    async function getCurrentTabInfo() {
        return new Promise((resolve) => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                const tab = tabs[0];
                resolve({
                    title: tab.title,
                    url: tab.url
                });
            });
        });
    }

    async function streamChatGPT(message) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(['openaiApiKey', 'selectedModel', 'selectedLanguage'], async (data) => {
                if (!data.openaiApiKey) {
                    reject(new Error('API key not set. Please set your OpenAI API key in the extension options.'));
                    return;
                }

                const model = data.selectedModel || 'gpt-3.5-turbo';
                const language = data.selectedLanguage || 'en';

                try {
                    const tabInfo = await getCurrentTabInfo();
                    const domain = new URL(tabInfo.url).hostname;
                    const systemMessage = `You are a helpful assistant. The user is currently on the website "${tabInfo.title}" with domain ${domain}. Please provide information and answers based on this context. When asked about similar websites, suggest alternatives that offer similar services or content. Respond in ${getLanguageName(language)}.`;

                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${data.openaiApiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                { role: 'system', content: systemMessage },
                                { role: 'user', content: message }
                            ],
                            stream: true
                        })
                    });

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder('utf-8');
                    let messageElement = null;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');
                        const parsedLines = lines
                            .map(line => line.replace(/^data: /, '').trim())
                            .filter(line => line !== '' && line !== '[DONE]')
                            .map(line => JSON.parse(line));

                        for (const parsedLine of parsedLines) {
                            const { choices } = parsedLine;
                            const { delta } = choices[0];
                            const { content } = delta;
                            if (content) {
                                if (!messageElement) {
                                    messageElement = document.createElement('div');
                                    messageElement.classList.add('message', 'assistant');
                                    chatMessages.appendChild(messageElement);
                                }
                                messageElement.textContent += content;
                                scrollToBottom();
                            }
                        }
                    }

                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    function getLanguageName(code) {
        const languages = {
            'en': 'English',
            'zh': 'Chinese',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ja': 'Japanese'
        };
        return languages[code] || 'English';
    }

    async function sendWelcomeMessage() {
        const apiKeySet = await checkApiKey();
        const tabInfo = await getCurrentTabInfo();
        const domain = new URL(tabInfo.url).hostname;
        let welcomeMessage;
        if (apiKeySet) {
            welcomeMessage = `Welcome to Site AI Assistant! I'm here to help you with any questions about the current website: "${tabInfo.title}" (${domain}). What would you like to know?`;
        } else {
            welcomeMessage = `Welcome to Site AI Assistant! Before we start, please go to the settings page to set your OpenAI API key.`;
        }
        addMessage('assistant', welcomeMessage);
    }

    sendWelcomeMessage();
});