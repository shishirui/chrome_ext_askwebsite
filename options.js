document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model-select');
    const languageSelect = document.getElementById('language-select');
    const saveButton = document.getElementById('save-button');
    const statusElement = document.getElementById('status');

    // Load saved settings
    chrome.storage.sync.get(['openaiApiKey', 'selectedModel', 'selectedLanguage'], (data) => {
        if (data.openaiApiKey) {
            apiKeyInput.value = data.openaiApiKey;
        }
        if (data.selectedModel) {
            modelSelect.value = data.selectedModel;
        }
        if (data.selectedLanguage) {
            languageSelect.value = data.selectedLanguage;
        }
    });

    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;
        const selectedLanguage = languageSelect.value;

        if (apiKey) {
            chrome.storage.sync.set({ 
                openaiApiKey: apiKey, 
                selectedModel: selectedModel,
                selectedLanguage: selectedLanguage
            }, () => {
                statusElement.textContent = 'Settings saved successfully!';
                statusElement.style.color = 'hsl(var(--primary))';
                setTimeout(() => {
                    statusElement.textContent = '';
                }, 3000);
            });
        } else {
            statusElement.textContent = 'Please enter a valid API key.';
            statusElement.style.color = 'hsl(var(--destructive))';
        }
    });
});
