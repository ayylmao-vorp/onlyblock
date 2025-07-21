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

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action)

    switch (request.action) {
        case 'getTabInfo':
            sendResponse({
                url: sender.tab?.url,
                title: sender.tab?.title
            })
            break

        case 'getStatus':
            // Provide fallback status when content script is not available
            chrome.storage.sync.get(['isEnabled', 'blockedProfiles'], (result) => {
                sendResponse({
                    isEnabled: result.isEnabled !== undefined ? result.isEnabled : true,
                    blockedProfiles: result.blockedProfiles || []
                })
            })
            return true // Keep message channel open for async response

        case 'toggleEnabled':
            // Handle toggle when content script is not available
            chrome.storage.sync.set({ isEnabled: request.enabled }, () => {
                sendResponse({ success: true })
            })
            return true

        case 'unblockProfile':
            // Handle unblock when content script is not available
            chrome.storage.sync.get(['blockedProfiles'], (result) => {
                const blockedProfiles = result.blockedProfiles || []
                const updatedProfiles = blockedProfiles.filter(p => {
                    if (typeof p === 'object') {
                        return p.username !== request.username
                    } else {
                        return p !== request.username
                    }
                })
                chrome.storage.sync.set({ blockedProfiles: updatedProfiles }, () => {
                    sendResponse({ success: true })
                })
            })
            return true

        default:
            console.log('Unknown message action:', request.action)
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