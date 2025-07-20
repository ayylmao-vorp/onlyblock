// OnlyBlock Background Script

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings on first install
        chrome.storage.sync.set({
            isEnabled: true,
            blockedProfiles: []
        })

        // Open welcome page
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html')
        })
    }
})

// Handle extension icon click (works with both service workers and background scripts)
if (chrome.action) {
    chrome.action.onClicked.addListener((tab) => {
        // Open popup when icon is clicked
        chrome.action.setPopup({
            popup: 'popup.html'
        })
    })
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTabInfo') {
        sendResponse({
            url: sender.tab?.url,
            title: sender.tab?.title
        })
    }

    return true
})

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        // Notify content scripts of settings changes
        chrome.tabs.query({ url: ['*://x.com/*', '*://twitter.com/*'] }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'settingsChanged',
                    changes: changes
                }).catch(() => {
                    // Ignore errors if content script is not ready
                })
            })
        })
    }
}) 