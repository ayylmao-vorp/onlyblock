// OnlyBlock Popup Script

class PopupManager {
    constructor() {
        this.isEnabled = false
        this.blockedProfiles = []
        this.init()
    }

    async init() {
        this.bindEvents()
        await this.loadStatus()
        this.updateUI()
    }

    bindEvents() {
        // Toggle button
        document.getElementById('enable-toggle').addEventListener('click', () => {
            this.toggleEnabled()
        })

        // Footer links
        document.getElementById('settings-link').addEventListener('click', (e) => {
            e.preventDefault()
            this.openSettings()
        })

        document.getElementById('help-link').addEventListener('click', (e) => {
            e.preventDefault()
            this.openHelp()
        })
    }

    async loadStatus() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

            if (tab && (tab.url.includes('x.com') || tab.url.includes('twitter.com') || tab.url.includes('file://'))) {
                // Try to get status from content script with timeout
                try {
                    const response = await Promise.race([
                        chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout')), 1000)
                        )
                    ])

                    if (response && response.isEnabled !== undefined) {
                        this.isEnabled = response.isEnabled
                        this.blockedProfiles = response.blockedProfiles || []
                        console.log('Status loaded from content script')
                        return
                    }
                } catch (contentScriptError) {
                    console.log('Content script not available, trying background script:', contentScriptError.message)

                    // Try background script as fallback
                    try {
                        const response = await chrome.runtime.sendMessage({ action: 'getStatus' })
                        if (response && response.isEnabled !== undefined) {
                            this.isEnabled = response.isEnabled
                            this.blockedProfiles = response.blockedProfiles || []
                            console.log('Status loaded from background script')
                            return
                        }
                    } catch (backgroundError) {
                        console.log('Background script not available, using storage fallback:', backgroundError.message)
                    }
                }
            }

            // Fallback to storage
            const result = await chrome.storage.sync.get(['isEnabled', 'blockedProfiles'])
            this.isEnabled = result.isEnabled !== undefined ? result.isEnabled : true
            this.blockedProfiles = result.blockedProfiles || []
            console.log('Status loaded from storage')

        } catch (error) {
            console.error('Error loading status:', error)
            // Final fallback with default values
            this.isEnabled = true
            this.blockedProfiles = []
        }
    }

    updateUI() {
        // Update toggle
        const toggle = document.getElementById('enable-toggle')
        toggle.classList.toggle('active', this.isEnabled)

        // Update stats
        document.getElementById('blocked-count').textContent = this.blockedProfiles.length
        document.getElementById('status-indicator').textContent = this.isEnabled ? 'ON' : 'OFF'

        // Update profile list
        this.updateProfileList()
    }

    updateProfileList() {
        const profileList = document.getElementById('profile-list')

        if (this.blockedProfiles.length === 0) {
            profileList.innerHTML = `
        <div class="empty-state">
          No profiles blocked yet
        </div>
      `
            return
        }

        // Check if blockedProfiles is an array of objects or strings
        const isDetailed = this.blockedProfiles.length > 0 && typeof this.blockedProfiles[0] === 'object'

        if (isDetailed) {
            profileList.innerHTML = this.blockedProfiles.map(profile => `
        <div class="profile-item">
          <div class="profile-info">
            <span class="profile-username">@${profile.username}</span>
            <span class="profile-date">${profile.blockedDate || 'Recently blocked'}</span>
          </div>
          <button class="unblock-btn" data-username="${profile.username}">Unblock</button>
        </div>
      `).join('')
        } else {
            // Fallback for old format
            profileList.innerHTML = this.blockedProfiles.map(username => `
        <div class="profile-item">
          <span class="profile-username">@${username}</span>
          <button class="unblock-btn" data-username="${username}">Unblock</button>
        </div>
      `).join('')
        }

        // Add event listeners to unblock buttons
        profileList.querySelectorAll('.unblock-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.dataset.username
                this.unblockProfile(username)
            })
        })
    }

    async toggleEnabled() {
        this.isEnabled = !this.isEnabled

        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

            if (tab && (tab.url.includes('x.com') || tab.url.includes('twitter.com') || tab.url.includes('file://'))) {
                // Try to send to content script with timeout
                try {
                    await Promise.race([
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'toggleEnabled',
                            enabled: this.isEnabled
                        }),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout')), 1000)
                        )
                    ])
                    console.log('Toggle sent to content script')
                } catch (contentScriptError) {
                    console.log('Content script not available for toggle:', contentScriptError.message)
                }
            }
        } catch (error) {
            console.error('Error toggling enabled:', error)
        }

        // Save to storage
        await chrome.storage.sync.set({ isEnabled: this.isEnabled })

        this.updateUI()
    }

    async unblockProfile(username) {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

            if (tab && (tab.url.includes('x.com') || tab.url.includes('twitter.com') || tab.url.includes('file://'))) {
                // Try to send to content script with timeout
                try {
                    await Promise.race([
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'unblockProfile',
                            username: username
                        }),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout')), 1000)
                        )
                    ])
                    console.log('Unblock sent to content script')
                } catch (contentScriptError) {
                    console.log('Content script not available for unblock:', contentScriptError.message)
                }
            }
        } catch (error) {
            console.error('Error unblocking profile:', error)
        }

        // Remove from local list and storage
        this.blockedProfiles = this.blockedProfiles.filter(p => {
            if (typeof p === 'object') {
                return p.username !== username
            } else {
                return p !== username
            }
        })

        // Update storage
        await chrome.storage.sync.set({ blockedProfiles: this.blockedProfiles })

        this.updateUI()
    }

    openSettings() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('settings.html')
        })
    }

    openHelp() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('help.html')
        })
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager()
}) 