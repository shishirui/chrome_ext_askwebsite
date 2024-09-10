document.addEventListener('DOMContentLoaded', () => {
    const quickActionsContainer = document.getElementById('quick-actions-container');
    const addQuickActionButton = document.getElementById('add-quick-action');
    const saveButton = document.getElementById('save-button');
    const statusElement = document.getElementById('status');

    let quickActions = [
        { label: 'Features', message: 'Please introduce the main features of this website.' },
        { label: 'Founded', message: 'When was this website founded?' },
        { label: 'Developer', message: 'Who developed this website?' },
        { label: 'Similar Sites', message: 'What are some similar websites to this one?' }
    ];

    function createQuickActionInput(action, index) {
        const div = document.createElement('div');
        div.className = 'quick-action-item';
        div.innerHTML = `
            <input type="text" class="quick-action-label" value="${action.label}" placeholder="Button Label">
            <input type="text" class="quick-action-message" value="${action.message}" placeholder="Message">
            <button class="remove-quick-action">Remove</button>
        `;
        div.querySelector('.remove-quick-action').addEventListener('click', () => {
            quickActions.splice(index, 1);
            renderQuickActions();
        });
        return div;
    }

    function renderQuickActions() {
        quickActionsContainer.innerHTML = '';
        quickActions.forEach((action, index) => {
            quickActionsContainer.appendChild(createQuickActionInput(action, index));
        });
    }

    addQuickActionButton.addEventListener('click', () => {
        quickActions.push({ label: '', message: '' });
        renderQuickActions();
    });

    // Load saved quick actions
    chrome.storage.sync.get('quickActions', (data) => {
        if (data.quickActions) {
            quickActions = data.quickActions;
        }
        renderQuickActions();
    });

    saveButton.addEventListener('click', () => {
        const quickActionInputs = quickActionsContainer.querySelectorAll('div');
        quickActions = Array.from(quickActionInputs).map(div => ({
            label: div.querySelector('.quick-action-label').value,
            message: div.querySelector('.quick-action-message').value
        }));

        chrome.storage.sync.set({ quickActions: quickActions }, () => {
            statusElement.textContent = 'Quick actions saved successfully!';
            statusElement.style.color = 'hsl(var(--primary))';
            setTimeout(() => {
                statusElement.textContent = '';
            }, 3000);
        });
    });

    renderQuickActions();
});