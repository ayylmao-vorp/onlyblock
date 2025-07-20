// OnlyBlock Content Script
// Detects and blocks X.com profiles with OnlyFans links

console.log('OnlyBlock: Content script loaded on', window.location.href)

class OnlyBlock {
    constructor() {
        this.blockedProfiles = new Set()
        this.isEnabled = true
        console.log('OnlyBlock: Content script initialized')
        this.init()
    }

    async init() {
        console.log('OnlyBlock: Starting initialization')
        await this.loadSettings()
        console.log('OnlyBlock: Settings loaded, enabled:', this.isEnabled)
        this.startObserving()
        this.scanCurrentPage()
        console.log('OnlyBlock: Initialization complete')

        // Test the extension after a short delay
        setTimeout(() => {
            this.testExtension()
        }, 2000)
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['isEnabled', 'blockedProfiles', 'blockPhrases'])
            this.isEnabled = result.isEnabled !== undefined ? result.isEnabled : true
            this.blockedProfiles = new Set(result.blockedProfiles || [])
            this.blockPhrases = result.blockPhrases !== undefined ? result.blockPhrases : true
        } catch (error) {
            console.error('OnlyBlock: Error loading settings:', error)
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                isEnabled: this.isEnabled,
                blockedProfiles: Array.from(this.blockedProfiles),
                blockPhrases: this.blockPhrases
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
        if (!this.isEnabled) {
            console.log('OnlyBlock: Scanning disabled')
            return
        }
        console.log('OnlyBlock: Scanning current page')
        this.scanElement(document.body)

        // Also do a comprehensive text scan
        this.scanAllText()
    }

    scanAllText() {
        // Walk through all text nodes and check for OnlyFans links
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        )

        let textNode
        while (textNode = walker.nextNode()) {
            const text = textNode.textContent
            if (text && this.containsOnlyFansLink(text)) {
                console.log('OnlyBlock: Found OnlyFans link in text:', text)

                // Find the closest profile container
                let element = textNode.parentElement
                while (element && element !== document.body) {
                    if (element.matches('article, [data-testid*="User"], [data-testid*="tweet"]')) {
                        this.checkProfile(element)
                        break
                    }
                    element = element.parentElement
                }
            }
        }
    }

    scanElement(element) {
        // Look for profile elements with more comprehensive selectors
        const profileSelectors = [
            '[data-testid="UserCell"]',
            '[data-testid="User-Name"]',
            '[data-testid="UserName"]',
            'article[data-testid="tweet"]', // Tweets can contain profile info
            '[role="article"]', // Generic article elements
            'div[data-testid="cellInnerDiv"]' // Cell containers
        ]

        const profileElements = element.querySelectorAll ?
            element.querySelectorAll(profileSelectors.join(', ')) :
            []

        console.log('OnlyBlock: Found', profileElements.length, 'profile elements')

        profileElements.forEach((profileElement) => {
            this.checkProfile(profileElement)
        })

        // Also scan the element itself if it's a profile
        if (element.matches && element.matches(profileSelectors.join(', '))) {
            this.checkProfile(element)
        }

        // Look for tweet/post elements
        const tweetSelectors = [
            '[data-testid="tweet"]',
            '[data-testid="Tweet"]',
            'article[data-testid="tweet"]',
            '[role="article"]'
        ]

        const tweetElements = element.querySelectorAll ?
            element.querySelectorAll(tweetSelectors.join(', ')) :
            []

        console.log('OnlyBlock: Found', tweetElements.length, 'tweet elements')

        tweetElements.forEach((tweetElement) => {
            this.checkTweet(tweetElement)
        })

        // Also scan the element itself if it's a tweet
        if (element.matches && element.matches(tweetSelectors.join(', '))) {
            this.checkTweet(tweetElement)
        }
    }

    checkProfile(profileElement) {
        if (!this.isEnabled) return

        // Find the profile container
        const profileContainer = this.findProfileContainer(profileElement)
        if (!profileContainer) return

        console.log('OnlyBlock: Checking profile element:', profileContainer)

        // Get username - try multiple selectors
        const usernameSelectors = [
            '[data-testid="User-Name"] a',
            '[data-testid="UserName"] a',
            'a[href*="/status/"]', // Links in tweets
            'a[href*="twitter.com"]',
            'a[href*="x.com"]'
        ]

        let usernameElement = null
        for (const selector of usernameSelectors) {
            usernameElement = profileContainer.querySelector(selector)
            if (usernameElement) {
                console.log('OnlyBlock: Found username element with selector:', selector)
                break
            }
        }

        if (!usernameElement) {
            console.log('OnlyBlock: No username element found')
            return
        }

        const username = this.extractUsername(usernameElement.href)
        if (!username) {
            console.log('OnlyBlock: Could not extract username from:', usernameElement.href)
            return
        }

        console.log('OnlyBlock: Checking profile for username:', username)

        // Check if already blocked
        if (this.blockedProfiles.has(username)) {
            console.log('OnlyBlock: Profile already blocked:', username)
            this.hideProfile(profileContainer)
            return
        }

        // Check bio for OnlyFans links - try multiple selectors
        const bioSelectors = [
            '[data-testid="UserDescription"]',
            '[data-testid="UserBio"]',
            '[data-testid="tweetText"]', // Tweet text might contain bio info
            'div[data-testid="tweetText"]'
        ]

        let bioElement = null
        for (const selector of bioSelectors) {
            bioElement = profileContainer.querySelector(selector)
            if (bioElement) {
                console.log('OnlyBlock: Found bio element with selector:', selector)
                break
            }
        }

        if (!bioElement) {
            console.log('OnlyBlock: No bio element found')
            return
        }

        console.log('OnlyBlock: Bio text content:', bioElement.textContent)

        if (this.containsOnlyFansLink(bioElement.textContent)) {
            console.log('OnlyBlock: Found OnlyFans link in profile:', username, bioElement.textContent)
            this.blockProfile(username, profileContainer)
        } else {
            console.log('OnlyBlock: No OnlyFans link found in bio')
        }
    }

    checkTweet(tweetElement) {
        if (!this.isEnabled || !this.blockPhrases) return

        // Get tweet text content
        const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"], [data-testid="TweetText"]')
        if (!tweetTextElement) return

        const tweetText = tweetTextElement.textContent
        if (!tweetText) return

        // Check for blocked phrases in tweet content
        if (this.containsBlockedPhrase(tweetText)) {
            this.blockTweet(tweetElement)
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
        console.log('OnlyBlock: Extracting username from:', href)

        // Try multiple patterns for different URL formats
        const patterns = [
            /twitter\.com\/([^\/\?]+)/,
            /x\.com\/([^\/\?]+)/,
            /\/([^\/\?]+)$/ // Just get the last part of the URL
        ]

        for (const pattern of patterns) {
            const match = href.match(pattern)
            if (match) {
                console.log('OnlyBlock: Extracted username:', match[1])
                return match[1]
            }
        }

        console.log('OnlyBlock: Could not extract username from URL')
        return null
    }

    containsOnlyFansLink(text) {
        if (!text) return false

        const onlyFansPatterns = [
            /onlyfans\.com/i,
            /onlyfans\.co/i,
            /of\.ly/i,
            /fans\.ly/i,
            /linktr\.ee.*onlyfans/i,
            /bio\.link.*onlyfans/i,
            /onlyfans/i, // Just the word "onlyfans"
            /fansly/i, // Fansly alternative
            /myfreeof/i, // "my free of" phrase
            /free\s*of/i // "free of" phrase
        ]

        const hasMatch = onlyFansPatterns.some(pattern => pattern.test(text))
        if (hasMatch) {
            console.log('OnlyBlock: Detected OnlyFans link in text:', text)
        }
        return hasMatch
    }

    containsBlockedPhrase(text) {
        if (!text) return false

        const blockedPhrases = [
            /my free of/i,
            // Add more phrases here as needed
        ]

        return blockedPhrases.some(phrase => phrase.test(text))
    }

    async blockProfile(username, profileElement) {
        console.log('OnlyBlock: Blocking profile:', username)

        this.blockedProfiles.add(username)

        // Create detailed profile info
        const profileInfo = {
            username: username,
            blockedDate: new Date().toLocaleDateString(),
            reason: 'OnlyFans link detected'
        }

        // Get existing blocked profiles
        const result = await chrome.storage.sync.get(['blockedProfiles'])
        const blockedProfiles = result.blockedProfiles || []

        // Add new profile if not already blocked
        if (!blockedProfiles.find(p => p.username === username)) {
            blockedProfiles.push(profileInfo)
            await chrome.storage.sync.set({ blockedProfiles })
            console.log('OnlyBlock: Added profile to blocked list')
        }

        await this.saveSettings()
        this.hideProfile(profileElement)

        // Show notification
        this.showBlockNotification(username)

        console.log('OnlyBlock: Profile blocked successfully:', username)
    }

    hideProfile(profileElement) {
        console.log('OnlyBlock: Hiding profile element:', profileElement)

        if (profileElement && !profileElement.classList.contains('onlyblock-hidden')) {
            profileElement.classList.add('onlyblock-hidden')
            profileElement.style.display = 'none'
            console.log('OnlyBlock: Profile hidden successfully')
        } else {
            console.log('OnlyBlock: Profile already hidden or invalid element')
        }
    }

    blockTweet(tweetElement) {
        if (tweetElement && !tweetElement.classList.contains('onlyblock-hidden')) {
            tweetElement.classList.add('onlyblock-hidden')
            tweetElement.style.display = 'none'

            // Show notification for blocked tweet
            this.showBlockNotification('tweet', 'Blocked phrase detected')
        }
    }

    showBlockNotification(username, reason = 'OnlyFans link detected') {
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

        if (username === 'tweet') {
            notification.textContent = `OnlyBlock: Blocked tweet (${reason})`
        } else {
            notification.textContent = `OnlyBlock: Blocked @${username} (${reason})`
        }

        document.body.appendChild(notification)

        setTimeout(() => {
            notification.remove()
        }, 3000)
    }

    testExtension() {
        console.log('OnlyBlock: Testing extension functionality')

        // Test if we can find any elements
        const allElements = document.querySelectorAll('*')
        console.log('OnlyBlock: Total elements on page:', allElements.length)

        // Test if we can find any text containing "onlyfans"
        const allText = document.body.textContent || ''
        if (allText.toLowerCase().includes('onlyfans')) {
            console.log('OnlyBlock: Found "onlyfans" text on page')
        } else {
            console.log('OnlyBlock: No "onlyfans" text found on page')
        }

        // Test if we can access chrome.storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
            console.log('OnlyBlock: Chrome storage API available')
        } else {
            console.log('OnlyBlock: Chrome storage API not available')
        }
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

        // Remove from detailed blocked profiles list
        const result = await chrome.storage.sync.get(['blockedProfiles'])
        const blockedProfiles = result.blockedProfiles || []
        const updatedProfiles = blockedProfiles.filter(p => p.username !== username)
        await chrome.storage.sync.set({ blockedProfiles: updatedProfiles })

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

    handleSettingChange(setting, value) {
        console.log('Setting changed:', setting, value)

        switch (setting) {
            case 'isEnabled':
                this.isEnabled = value
                if (value) {
                    this.scanCurrentPage()
                } else {
                    // Show all hidden profiles
                    document.querySelectorAll('.onlyblock-hidden').forEach(el => {
                        el.classList.remove('onlyblock-hidden')
                        el.style.display = ''
                    })
                }
                break

            case 'blockPhrases':
                this.blockPhrases = value
                if (value) {
                    this.scanCurrentPage()
                }
                break

            default:
                // For other settings, just update the local value
                this[setting] = value
        }
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

        case 'settingChanged':
            onlyBlock.handleSettingChange(request.setting, request.value)
            sendResponse({ success: true })
            break

        default:
            sendResponse({ error: 'Unknown action' })
    }

    return true // Keep message channel open for async response
}) 