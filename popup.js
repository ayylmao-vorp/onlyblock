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

            if (tab && (tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
                // Get status from content script
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' })
                this.isEnabled = response.isEnabled
                this.blockedProfiles = response.blockedProfiles || []
            } else {
                // Get status from storage
                const result = await chrome.storage.sync.get(['isEnabled', 'blockedProfiles'])
                this.isEnabled = result.isEnabled !== undefined ? result.isEnabled : true
                this.blockedProfiles = result.blockedProfiles || []
            }
        } catch (error) {
            console.error('Error loading status:', error)
            // Fallback to storage
            const result = await chrome.storage.sync.get(['isEnabled', 'blockedProfiles'])
            this.isEnabled = result.isEnabled !== undefined ? result.isEnabled : true
            this.blockedProfiles = result.blockedProfiles || []
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

        profileList.innerHTML = this.blockedProfiles.map(username => `
      <div class="profile-item">
        <span class="profile-username">@${username}</span>
        <button class="unblock-btn" data-username="${username}">Unblock</button>
      </div>
    `).join('')

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

            if (tab && (tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
                // Send to content script
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleEnabled',
                    enabled: this.isEnabled
                })
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

            if (tab && (tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
                // Send to content script
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'unblockProfile',
                    username: username
                })
            }
        } catch (error) {
            console.error('Error unblocking profile:', error)
        }

        // Remove from local list
        this.blockedProfiles = this.blockedProfiles.filter(u => u !== username)

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