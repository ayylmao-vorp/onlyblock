class SettingsManager {
    constructor() {
        console.log('SettingsManager constructor called')
        this.settings = {
            isEnabled: true,
            useTwitterBlock: true,
            showNotifications: true,
            blockOnlyFans: true,
            blockShorteners: true,
            blockAggregators: true,
            blockPhrases: true
        }
        this.blockedProfiles = []
        console.log('SettingsManager initialized with default settings')
        this.init()
    }

    async init() {
        console.log('SettingsManager init started')
        await this.loadSettings()
        console.log('Settings loaded')
        this.bindEvents()
        console.log('Events bound')
        this.updateUI()
        console.log('UI updated')

        // Also try to get current status from content scripts
        await this.refreshFromContentScripts()
        console.log('SettingsManager init completed')
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'isEnabled',
                'useTwitterBlock',
                'showNotifications',
                'blockOnlyFans',
                'blockShorteners',
                'blockAggregators',
                'blockPhrases',
                'blockedProfiles'
            ])

            console.log('Loaded settings:', result)

            this.settings = {
                isEnabled: result.isEnabled !== undefined ? result.isEnabled : true,
                useTwitterBlock: result.useTwitterBlock !== undefined ? result.useTwitterBlock : true,
                showNotifications: result.showNotifications !== undefined ? result.showNotifications : true,
                blockOnlyFans: result.blockOnlyFans !== undefined ? result.blockOnlyFans : true,
                blockShorteners: result.blockShorteners !== undefined ? result.blockShorteners : true,
                blockAggregators: result.blockAggregators !== undefined ? result.blockAggregators : true,
                blockPhrases: result.blockPhrases !== undefined ? result.blockPhrases : true
            }

            this.blockedProfiles = result.blockedProfiles || []

            console.log('Processed settings:', this.settings)
        } catch (error) {
            console.error('Error loading settings:', error)
        }
    }

    bindEvents() {
        console.log('Binding events...')

        // Toggle buttons
        const toggleElements = [
            'enable-toggle',
            'twitter-block-toggle',
            'notification-toggle',
            'onlyfans-toggle',
            'shortener-toggle',
            'aggregator-toggle',
            'phrase-toggle'
        ]

        toggleElements.forEach(id => {
            const element = document.getElementById(id)
            if (element) {
                console.log(`Found toggle element: ${id}`)
                element.addEventListener('click', () => {
                    console.log(`Toggle clicked: ${id}`)
                    this.toggleSetting(id.replace('-toggle', ''))
                })
            } else {
                console.error(`Toggle element not found: ${id}`)
            }
        })

        // Action buttons
        const actionButtons = [
            { id: 'view-blocked-btn', method: 'toggleBlockedProfiles' },
            { id: 'clear-data-btn', method: 'clearAllData' },
            { id: 'help-btn', method: 'openHelp' },
            { id: 'test-page-btn', method: 'openTestPage' },
            { id: 'close-settings-btn', method: () => window.close() }
        ]

        actionButtons.forEach(button => {
            const element = document.getElementById(button.id)
            if (element) {
                console.log(`Found action button: ${button.id}`)
                element.addEventListener('click', () => {
                    console.log(`Action button clicked: ${button.id}`)
                    if (typeof button.method === 'function') {
                        button.method()
                    } else {
                        this[button.method]()
                    }
                })
            } else {
                console.error(`Action button not found: ${button.id}`)
            }
        })

        console.log('Event binding complete')
    }

    updateUI() {
        console.log('Updating UI with settings:', this.settings)

        // Update toggles
        const enableToggle = document.getElementById('enable-toggle')
        const twitterBlockToggle = document.getElementById('twitter-block-toggle')
        const notificationToggle = document.getElementById('notification-toggle')
        const onlyfansToggle = document.getElementById('onlyfans-toggle')
        const shortenerToggle = document.getElementById('shortener-toggle')
        const aggregatorToggle = document.getElementById('aggregator-toggle')
        const phraseToggle = document.getElementById('phrase-toggle')

        enableToggle.classList.toggle('active', this.settings.isEnabled)
        twitterBlockToggle.classList.toggle('active', this.settings.useTwitterBlock)
        notificationToggle.classList.toggle('active', this.settings.showNotifications)
        onlyfansToggle.classList.toggle('active', this.settings.blockOnlyFans)
        shortenerToggle.classList.toggle('active', this.settings.blockShorteners)
        aggregatorToggle.classList.toggle('active', this.settings.blockAggregators)
        phraseToggle.classList.toggle('active', this.settings.blockPhrases)

        console.log('Settings loaded - Twitter block:', this.settings.useTwitterBlock)
    }

    async toggleSetting(setting) {
        console.log(`Toggle setting: ${setting}`)
        this.settings[setting] = !this.settings[setting]

        await this.saveSettings()
        this.updateUI()

        // Notify content scripts of setting change
        await this.notifyContentScripts(setting, this.settings[setting])

        // Special logging for Twitter block setting
        if (setting === 'useTwitterBlock') {
            console.log('Twitter block setting changed to:', this.settings[setting])
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set(this.settings)
            console.log('Settings saved - Twitter block:', this.settings.useTwitterBlock)
        } catch (error) {
            console.error('Error saving settings:', error)
        }
    }

    async notifyContentScripts(setting, value) {
        try {
            const tabs = await chrome.tabs.query({ url: ['*://x.com/*', '*://twitter.com/*'] })
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'settingChanged',
                    setting: setting,
                    value: value
                }).catch(() => {
                    // Ignore errors if content script is not ready
                })
            })
        } catch (error) {
            console.error('Error notifying content scripts:', error)
        }
    }

    async refreshFromContentScripts() {
        try {
            const tabs = await chrome.tabs.query({ url: ['*://x.com/*', '*://twitter.com/*'] })
            if (tabs.length > 0) {
                const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' })
                if (response && response.isEnabled !== undefined) {
                    this.settings.isEnabled = response.isEnabled
                    this.updateUI()
                    console.log('Refreshed from content script:', response)
                }
            }
        } catch (error) {
            console.log('Could not refresh from content script:', error)
        }
    }

    toggleBlockedProfiles() {
        const section = document.getElementById('blocked-profiles-section')
        const button = document.getElementById('view-blocked-btn')

        if (section.style.display === 'none') {
            section.style.display = 'block'
            button.textContent = 'Hide List'
            this.loadBlockedProfiles()
        } else {
            section.style.display = 'none'
            button.textContent = 'View List'
        }
    }

    async loadBlockedProfiles() {
        const profilesList = document.getElementById('profiles-list')

        // Show loading
        profilesList.innerHTML = `
            <div class="loading-profiles">
                <div class="spinner"></div>
                Loading blocked profiles...
            </div>
        `

        try {
            // Get current blocked profiles
            const result = await chrome.storage.sync.get(['blockedProfiles'])
            this.blockedProfiles = result.blockedProfiles || []

            this.renderBlockedProfiles()
        } catch (error) {
            console.error('Error loading blocked profiles:', error)
            profilesList.innerHTML = `
                <div class="error-message">
                    Error loading blocked profiles. Please try again.
                </div>
            `
        }
    }

    renderBlockedProfiles() {
        const profilesList = document.getElementById('profiles-list')

        if (this.blockedProfiles.length === 0) {
            profilesList.innerHTML = `
                <div class="empty-state">
                    No blocked profiles yet.
                </div>
            `
            return
        }

        const profilesHTML = this.blockedProfiles.map(profile => `
            <div class="blocked-profile">
                <div class="profile-info">
                    <div class="username">@${profile.username}</div>
                    <div class="blocked-date">Blocked: ${profile.blockedDate}</div>
                    <div class="reason">Reason: ${profile.reason}</div>
                </div>
                <button class="unblock-btn" data-username="${profile.username}">
                    Unblock
                </button>
            </div>
        `).join('')

        profilesList.innerHTML = profilesHTML

        // Add event listeners to unblock buttons
        profilesList.querySelectorAll('.unblock-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.dataset.username
                this.unblockProfile(username)
            })
        })
    }

    async unblockProfile(username) {
        if (confirm(`Are you sure you want to unblock @${username}?`)) {
            try {
                // Remove from local list
                this.blockedProfiles = this.blockedProfiles.filter(p => p.username !== username)

                // Save to storage
                await chrome.storage.sync.set({
                    blockedProfiles: this.blockedProfiles
                })

                // Notify content scripts
                const tabs = await chrome.tabs.query({ url: ['*://x.com/*', '*://twitter.com/*'] })
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'unblockProfile',
                        username: username
                    }).catch(() => {
                        // Ignore errors if content script is not ready
                    })
                })

                // Re-render the list
                this.renderBlockedProfiles()

                // Show success message
                this.showNotification(`@${username} has been unblocked`)
            } catch (error) {
                console.error('Error unblocking profile:', error)
                alert('Error unblocking profile. Please try again.')
            }
        }
    }

    showNotification(message) {
        // Create a temporary notification
        const notification = document.createElement('div')
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `
        notification.textContent = message

        document.body.appendChild(notification)

        setTimeout(() => {
            notification.remove()
        }, 3000)
    }

    async clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            try {
                await chrome.storage.sync.clear()
                this.settings = {
                    isEnabled: true,
                    showNotifications: true,
                    blockOnlyFans: true,
                    blockShorteners: true,
                    blockAggregators: true,
                    blockPhrases: true
                }
                this.updateUI()
                alert('All data has been cleared successfully.')
            } catch (error) {
                console.error('Error clearing data:', error)
                alert('Error clearing data. Please try again.')
            }
        }
    }

    openHelp() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('help.html')
        })
    }

    openTestPage() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('test-page.html')
        })
    }
}

// Initialize settings
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing SettingsManager...')
    try {
        const settingsManager = new SettingsManager()
        console.log('SettingsManager initialized successfully')
    } catch (error) {
        console.error('Error initializing SettingsManager:', error)
    }
}) 