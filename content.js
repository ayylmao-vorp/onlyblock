// OnlyBlock Content Script
// Detects and blocks X.com profiles with OnlyFans links

class OnlyBlock {
    constructor() {
        this.blockedProfiles = new Set()
        this.isEnabled = true
        this.init()
    }

    async init() {
        await this.loadSettings()
        this.startObserving()
        this.scanCurrentPage()
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['isEnabled', 'blockedProfiles'])
            this.isEnabled = result.isEnabled !== undefined ? result.isEnabled : true
            this.blockedProfiles = new Set(result.blockedProfiles || [])
        } catch (error) {
            console.error('OnlyBlock: Error loading settings:', error)
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                isEnabled: this.isEnabled,
                blockedProfiles: Array.from(this.blockedProfiles)
            })
        } catch (error) {
            console.error('OnlyBlock: Error saving settings:', error)
        }
    }

    startObserving() {
        // Observe DOM changes to handle dynamic content
        const observer = new MutationObserver((mutations) => {
            if (!this.isEnabled) return

            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.scanElement(node)
                    }
                })
            })
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true
        })
    }

    scanCurrentPage() {
        if (!this.isEnabled) return
        this.scanElement(document.body)
    }

    scanElement(element) {
        // Look for profile elements
        const profileElements = element.querySelectorAll ?
            element.querySelectorAll('[data-testid="UserCell"], [data-testid="User-Name"], [data-testid="UserName"]') :
            []

        profileElements.forEach((profileElement) => {
            this.checkProfile(profileElement)
        })

        // Also scan the element itself if it's a profile
        if (element.matches && element.matches('[data-testid="UserCell"], [data-testid="User-Name"], [data-testid="UserName"]')) {
            this.checkProfile(element)
        }
    }

    checkProfile(profileElement) {
        if (!this.isEnabled) return

        // Find the profile container
        const profileContainer = this.findProfileContainer(profileElement)
        if (!profileContainer) return

        // Get username
        const usernameElement = profileContainer.querySelector('[data-testid="User-Name"] a, [data-testid="UserName"] a')
        if (!usernameElement) return

        const username = this.extractUsername(usernameElement.href)
        if (!username) return

        // Check if already blocked
        if (this.blockedProfiles.has(username)) {
            this.hideProfile(profileContainer)
            return
        }

        // Check bio for OnlyFans links
        const bioElement = profileContainer.querySelector('[data-testid="UserDescription"], [data-testid="UserBio"]')
        if (bioElement && this.containsOnlyFansLink(bioElement.textContent)) {
            this.blockProfile(username, profileContainer)
        }
    }

    findProfileContainer(element) {
        // Navigate up to find the profile container
        let container = element
        while (container && !container.matches('[data-testid="UserCell"], [data-testid="tweet"], article')) {
            container = container.parentElement
        }
        return container
    }

    extractUsername(href) {
        if (!href) return null
        const match = href.match(/twitter\.com\/([^\/\?]+)/)
        return match ? match[1] : null
    }

    containsOnlyFansLink(text) {
        if (!text) return false

        const onlyFansPatterns = [
            /onlyfans\.com/i,
            /onlyfans\.co/i,
            /of\.ly/i,
            /fans\.ly/i,
            /linktr\.ee.*onlyfans/i,
            /bio\.link.*onlyfans/i
        ]

        return onlyFansPatterns.some(pattern => pattern.test(text))
    }

    async blockProfile(username, profileElement) {
        this.blockedProfiles.add(username)
        await this.saveSettings()
        this.hideProfile(profileElement)

        // Show notification
        this.showBlockNotification(username)
    }

    hideProfile(profileElement) {
        if (profileElement && !profileElement.classList.contains('onlyblock-hidden')) {
            profileElement.classList.add('onlyblock-hidden')
            profileElement.style.display = 'none'
        }
    }

    showBlockNotification(username) {
        // Create a temporary notification
        const notification = document.createElement('div')
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a1a1a;
      color: #fff;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border-left: 4px solid #ff4444;
    `
        notification.textContent = `OnlyBlock: Blocked @${username} (OnlyFans link detected)`

        document.body.appendChild(notification)

        setTimeout(() => {
            notification.remove()
        }, 3000)
    }

    // Public methods for popup communication
    async toggleEnabled(enabled) {
        this.isEnabled = enabled
        await this.saveSettings()

        if (enabled) {
            this.scanCurrentPage()
        } else {
            // Show all hidden profiles
            document.querySelectorAll('.onlyblock-hidden').forEach(el => {
                el.classList.remove('onlyblock-hidden')
                el.style.display = ''
            })
        }
    }

    async unblockProfile(username) {
        this.blockedProfiles.delete(username)
        await this.saveSettings()

        // Show the profile again
        document.querySelectorAll('.onlyblock-hidden').forEach(el => {
            const usernameElement = el.querySelector('[data-testid="User-Name"] a, [data-testid="UserName"] a')
            if (usernameElement && this.extractUsername(usernameElement.href) === username) {
                el.classList.remove('onlyblock-hidden')
                el.style.display = ''
            }
        })
    }

    getBlockedProfiles() {
        return Array.from(this.blockedProfiles)
    }
}

// Initialize OnlyBlock
const onlyBlock = new OnlyBlock()

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getStatus':
            sendResponse({
                isEnabled: onlyBlock.isEnabled,
                blockedProfiles: onlyBlock.getBlockedProfiles()
            })
            break

        case 'toggleEnabled':
            onlyBlock.toggleEnabled(request.enabled)
            sendResponse({ success: true })
            break

        case 'unblockProfile':
            onlyBlock.unblockProfile(request.username)
            sendResponse({ success: true })
            break

        default:
            sendResponse({ error: 'Unknown action' })
    }

    return true // Keep message channel open for async response
}) 