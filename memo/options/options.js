document.addEventListener('DOMContentLoaded', () => {
    // Load existing key
    chrome.storage.local.get('openrouter_api_key', (data) => {
        const input = document.getElementById('openrouter_key');
        if (data.openrouter_api_key) {
            input.value = data.openrouter_api_key;
        }
    });

    // Save button handler
    document.getElementById('save').addEventListener('click', () => {
        const key = document.getElementById('openrouter_key').value.trim();
        const status = document.getElementById('status');

        if (!key) {
            status.textContent = 'Please enter an API key';
            status.className = 'status error';
            return;
        }

        if (!key.startsWith('sk-or-')) {
            status.textContent = 'Invalid API key format. Should start with sk-or-';
            status.className = 'status error';
            return;
        }

        // Save to storage
        chrome.storage.local.set({ openrouter_api_key: key }, () => {
            status.textContent = 'Settings saved successfully!';
            status.className = 'status success';

            // Clear success message after 2 seconds
            setTimeout(() => {
                status.className = 'status';
            }, 2000);
        });
    });
});