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
            const result = await chrome.storage.sync.get(['isEnabled', 'useTwitterBlock', 'blockedProfiles', 'blockPhrases'])

            this.isEnabled = result.isEnabled !== undefined ? result.isEnabled : true
            this.useTwitterBlock = result.useTwitterBlock !== undefined ? result.useTwitterBlock : true
            this.blockedProfiles = new Set(result.blockedProfiles || [])
            this.blockPhrases = result.blockPhrases !== undefined ? result.blockPhrases : true

            console.log('OnlyBlock: Settings loaded - Twitter block:', this.useTwitterBlock)
        } catch (error) {
            console.error('OnlyBlock: Error loading settings:', error)
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                isEnabled: this.isEnabled,
                useTwitterBlock: this.useTwitterBlock,
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

        if (profileElements.length > 0) {
            console.log('OnlyBlock: Found', profileElements.length, 'profile elements')
            profileElements.forEach((profileElement) => {
                this.checkProfile(profileElement)
            })
        }

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

        if (tweetElements.length > 0) {
            console.log('OnlyBlock: Found', tweetElements.length, 'tweet elements')
            tweetElements.forEach((tweetElement) => {
                this.checkTweet(tweetElement)
            })
        }

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
                break
            }
        }

        if (!usernameElement) {
            return
        }

        const username = this.extractUsername(usernameElement.href)
        if (!username) {
            return
        }

        // Check if already blocked
        if (this.blockedProfiles.has(username)) {
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
                break
            }
        }

        if (!bioElement) {
            return
        }

        if (this.containsOnlyFansLink(bioElement.textContent)) {
            console.log('OnlyBlock: Found OnlyFans content in profile:', username)

            // Determine specific reason for blocking
            let reason = 'OnlyFans content detected'
            const bioText = bioElement.textContent.toLowerCase()

            if (bioText.includes('onlyfans.com') || bioText.includes('onlyfans.co')) {
                reason = 'OnlyFans link detected'
            } else if (bioText.includes('fansly')) {
                reason = 'Fansly content detected'
            } else if (bioText.includes('my free of') || bioText.includes('free of')) {
                reason = 'OnlyFans keyword detected'
            } else if (bioText.includes('adult content') || bioText.includes('nsfw')) {
                reason = 'Adult content detected'
            } else if (bioText.includes('escort') || bioText.includes('companion')) {
                reason = 'Escort services detected'
            } else if (bioText.includes('massage') || bioText.includes('therapeutic')) {
                reason = 'Massage services detected'
            } else {
                reason = 'Adult entertainment content detected'
            }

            this.blockProfile(username, profileContainer, reason)
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

        // Try multiple patterns for different URL formats
        const patterns = [
            /twitter\.com\/([^\/\?]+)/,
            /x\.com\/([^\/\?]+)/,
            /\/([^\/\?]+)$/ // Just get the last part of the URL
        ]

        for (const pattern of patterns) {
            const match = href.match(pattern)
            if (match) {
                return match[1]
            }
        }

        return null
    }

    extractUsernameFromUrl(url) {
        if (!url) return null

        // Try multiple patterns for different URL formats
        const patterns = [
            /twitter\.com\/([^\/\?]+)/,
            /x\.com\/([^\/\?]+)/,
            /\/([^\/\?]+)$/ // Just get the last part of the URL
        ]

        for (const pattern of patterns) {
            const match = url.match(pattern)
            if (match) {
                return match[1]
            }
        }

        return null
    }

    containsOnlyFansLink(text) {
        if (!text) return false

        // Link patterns
        const linkPatterns = [
            /onlyfans\.com/i,
            /onlyfans\.co/i,
            /of\.ly/i,
            /fans\.ly/i,
            /linktr\.ee.*onlyfans/i,
            /bio\.link.*onlyfans/i,
            /fansly\.com/i,
            /fansly\.co/i
        ]

        // Keyword patterns (user-specified OnlyFans-related terms)
        const keywordPatterns = [
            /sexy\s*new\s*content/i,
            /come\s*check\s*out\s*all\s*my\s*new\s*photos/i,
            /come\s*check\s*out\s*all\s*my\s*new\s*videos/i,
            /hottest\s*content\s*to\s*offer/i
        ]

        // Check for link patterns
        const hasLinkMatch = linkPatterns.some(pattern => pattern.test(text))
        if (hasLinkMatch) {
            console.log('OnlyBlock: Detected OnlyFans link in text:', text)
            return true
        }

        // Check for keyword patterns
        const hasKeywordMatch = keywordPatterns.some(pattern => pattern.test(text))
        if (hasKeywordMatch) {
            console.log('OnlyBlock: Detected OnlyFans keyword in text:', text)
            return true
        }

        return false
    }

    containsBlockedPhrase(text) {
        if (!text) return false

        const blockedPhrases = [
            /my free of/i,
            // Add more phrases here as needed
        ]

        return blockedPhrases.some(phrase => phrase.test(text))
    }

    async blockProfile(username, profileElement, reason = 'OnlyFans content detected') {
        console.log('OnlyBlock: Blocking profile:', username, 'Reason:', reason)

        this.blockedProfiles.add(username)

        // Create detailed profile info
        const profileInfo = {
            username: username,
            blockedDate: new Date().toLocaleDateString(),
            reason: reason
        }

        // Get existing blocked profiles
        const result = await chrome.storage.sync.get(['blockedProfiles'])
        const blockedProfiles = result.blockedProfiles || []

        // Add new profile if not already blocked
        if (!blockedProfiles.find(p => p.username === username)) {
            blockedProfiles.push(profileInfo)
            await chrome.storage.sync.set({ blockedProfiles })
        }

        await this.saveSettings()
        this.hideProfile(profileElement)

        // Use Twitter's native block if enabled
        if (this.useTwitterBlock) {
            console.log('OnlyBlock: Twitter block enabled, attempting to block:', username)
            await this.twitterBlockUser(username)
        }

        // Show notification
        this.showBlockNotification(username)
    }

    // Helper sleep function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    async twitterBlockUser(username) {
        try {
            console.log('OnlyBlock: Attempting UI block for:', username)
            // 1. Navigate to the user's profile if not already there
            const profileUrl = `https://x.com/${username}`
            if (!window.location.pathname.includes(username)) {
                window.location.href = profileUrl
                console.log('OnlyBlock: Navigating to profile:', profileUrl)
                await this.sleep(2500) // Wait for navigation and DOM to load
            } else {
                console.log('OnlyBlock: Already on profile page')
            }

            // 2. Wait for the profile header to appear
            let attempts = 0
            while (!document.querySelector('header') && attempts < 10) {
                await this.sleep(300)
                attempts++
            }
            if (!document.querySelector('header')) {
                console.log('OnlyBlock: Profile header not found, aborting block')
                return
            }

            // 3. Find and click the 3-dot menu (More actions)
            let moreBtn = document.querySelector('[aria-label="More"]') ||
                document.querySelector('div[aria-label="More"]') ||
                document.querySelector('div[role="button"][aria-label*="More"]')
            if (!moreBtn) {
                // Try to find by SVG (three dots)
                moreBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(el => {
                    return el.innerHTML.includes('svg') && el.getAttribute('aria-label') && el.getAttribute('aria-label').toLowerCase().includes('more')
                })
            }
            if (!moreBtn) {
                console.log('OnlyBlock: Could not find 3-dot menu (More actions) button')
                return
            }
            moreBtn.click()
            console.log('OnlyBlock: Clicked 3-dot menu')

            // 4. Wait for the dropdown menu to appear
            await this.sleep(500)

            // 5. Find and click the "Block" menu item
            let blockBtn = Array.from(document.querySelectorAll('div[role="menuitem"]'))
                .find(el => el.textContent && el.textContent.match(/block/i))
            if (!blockBtn) {
                console.log('OnlyBlock: Could not find Block menu item')
                return
            }
            blockBtn.click()
            console.log('OnlyBlock: Clicked Block menu item')

            // 6. Wait for the confirmation dialog
            await this.sleep(500)

            // 7. Find and click the confirmation "Block" button
            let confirmBtn = Array.from(document.querySelectorAll('div[role="button"], button'))
                .find(el => el.textContent && el.textContent.trim().toLowerCase() === 'block')
            if (!confirmBtn) {
                console.log('OnlyBlock: Could not find confirmation Block button')
                return
            }
            confirmBtn.click()
            console.log('OnlyBlock: User blocked via UI')
        } catch (error) {
            console.error('OnlyBlock: Error blocking user via UI:', error)
        }
    }

    async findAndClickBlockButton(username) {
        try {
            // Look for block button in current page
            const blockButton = this.findBlockButton()

            if (blockButton) {
                console.log('OnlyBlock: Found block button, clicking...')
                blockButton.click()

                // Wait for confirmation dialog
                await this.waitForBlockConfirmation()

                console.log('OnlyBlock: Successfully blocked user on Twitter:', username)
                return
            }

            console.log('OnlyBlock: Block button not found, user may need to manually block:', username)

        } catch (error) {
            console.error('OnlyBlock: Error finding block button:', error)
        }
    }

    findBlockButton() {
        console.log('OnlyBlock: Searching for block button...')

        // Look for block button with various selectors
        const blockSelectors = [
            // Primary selectors
            '[data-testid="block"]',
            'button[data-testid="block"]',
            'div[role="button"][data-testid="block"]',

            // Aria label selectors
            '[aria-label*="block"]',
            '[aria-label*="Block"]',
            'button[aria-label*="block"]',
            'button[aria-label*="Block"]',

            // Menu item selectors
            'div[role="menuitem"][data-testid="block"]',
            'div[role="menuitem"] span[data-testid="block"]',

            // User actions selectors
            '[data-testid="userActions"] [data-testid="block"]',
            '[data-testid="userActions"] button[aria-label*="block"]',
            '[data-testid="userActions"] button[aria-label*="Block"]',

            // More specific selectors
            '[data-testid="userActions"] div[role="menuitem"][data-testid="block"]',
            '[data-testid="userActions"] div[role="menuitem"] span[data-testid="block"]',

            // Generic button selectors that might contain "block"
            'button[data-testid*="block"]',
            'div[role="button"][data-testid*="block"]'
        ]

        console.log('OnlyBlock: Checking', blockSelectors.length, 'block button selectors...')

        for (let i = 0; i < blockSelectors.length; i++) {
            const selector = blockSelectors[i]
            const button = document.querySelector(selector)
            if (button) {
                console.log('OnlyBlock: Found block button with selector:', selector)
                console.log('OnlyBlock: Button text:', button.textContent?.trim())
                console.log('OnlyBlock: Button aria-label:', button.getAttribute('aria-label'))
                return button
            }
        }

        // If no block button found, log all buttons on page for debugging
        console.log('OnlyBlock: No block button found. Available buttons:')
        document.querySelectorAll('button, div[role="button"]').forEach(button => {
            const text = button.textContent?.trim()
            const ariaLabel = button.getAttribute('aria-label')
            const dataTestId = button.getAttribute('data-testid')
            if (text || ariaLabel || dataTestId) {
                console.log('OnlyBlock: - Button:', text || ariaLabel || dataTestId, 'data-testid:', dataTestId)
            }
        })

        return null
    }

    async waitForBlockConfirmation() {
        console.log('OnlyBlock: Waiting for confirmation dialog...')
        // Wait for confirmation dialog and click confirm
        return new Promise((resolve) => {
            let attempts = 0
            const maxAttempts = 50 // 5 seconds max wait

            const checkForConfirmation = () => {
                attempts++

                const confirmSelectors = [
                    // Primary confirmation selectors
                    '[data-testid="confirmationSheetConfirm"]',
                    '[data-testid="confirmationSheetConfirmButton"]',
                    'button[data-testid="confirmationSheetConfirm"]',
                    'button[data-testid="confirmationSheetConfirmButton"]',
                    'div[role="button"][data-testid="confirmationSheetConfirm"]',
                    'div[role="button"][data-testid="confirmationSheetConfirmButton"]',

                    // Generic confirm buttons
                    'button[data-testid*="confirm"]',
                    'button[aria-label*="confirm"]',
                    'button[aria-label*="Confirm"]',
                    'button[aria-label*="confirm"]',

                    // Modal/dialog buttons
                    '[data-testid="confirmationSheet"] button',
                    '[data-testid="confirmationSheet"] div[role="button"]',
                    '[role="dialog"] button',
                    '[role="dialog"] div[role="button"]'
                ]

                for (const selector of confirmSelectors) {
                    const confirmButton = document.querySelector(selector)
                    if (confirmButton) {
                        console.log('OnlyBlock: Found confirmation button with selector:', selector)
                        console.log('OnlyBlock: Confirmation button text:', confirmButton.textContent?.trim())
                        confirmButton.click()
                        console.log('OnlyBlock: Clicked confirmation button')
                        resolve()
                        return
                    }
                }

                if (attempts >= maxAttempts) {
                    console.log('OnlyBlock: Timeout waiting for confirmation dialog')
                    console.log('OnlyBlock: Available buttons on page:')
                    document.querySelectorAll('button, div[role="button"]').forEach(button => {
                        const text = button.textContent?.trim()
                        const ariaLabel = button.getAttribute('aria-label')
                        const dataTestId = button.getAttribute('data-testid')
                        if (text || ariaLabel || dataTestId) {
                            console.log('OnlyBlock: - Button:', text || ariaLabel || dataTestId, 'data-testid:', dataTestId)
                        }
                    })
                    resolve() // Resolve anyway to not hang
                    return
                }

                // Check again after a short delay
                setTimeout(checkForConfirmation, 100)
            }

            checkForConfirmation()
        })
    }

    hideProfile(profileElement) {
        if (profileElement && !profileElement.classList.contains('onlyblock-hidden')) {
            profileElement.classList.add('onlyblock-hidden')
            profileElement.style.display = 'none'
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

        // Unblock on Twitter if enabled
        if (this.useTwitterBlock) {
            await this.twitterUnblockUser(username)
        }

        // Show the profile again
        document.querySelectorAll('.onlyblock-hidden').forEach(el => {
            const usernameElement = el.querySelector('[data-testid="User-Name"] a, [data-testid="UserName"] a')
            if (usernameElement && this.extractUsername(usernameElement.href) === username) {
                el.classList.remove('onlyblock-hidden')
                el.style.display = ''
            }
        })
    }

    async twitterUnblockUser(username) {
        try {
            console.log('OnlyBlock: Attempting to unblock user on Twitter:', username)

            // Find unblock button
            const unblockButton = this.findUnblockButton()

            if (unblockButton) {
                console.log('OnlyBlock: Found unblock button, clicking...')
                unblockButton.click()

                // Wait for confirmation dialog
                await this.waitForUnblockConfirmation()

                console.log('OnlyBlock: Successfully unblocked user on Twitter:', username)
                return
            }

            console.log('OnlyBlock: Unblock button not found, user may need to manually unblock:', username)

        } catch (error) {
            console.error('OnlyBlock: Error unblocking user on Twitter:', error)
        }
    }

    findUnblockButton() {
        // Look for unblock button with various selectors
        const unblockSelectors = [
            '[data-testid="unblock"]',
            '[aria-label*="unblock"]',
            '[aria-label*="Unblock"]',
            'button[data-testid="unblock"]',
            'div[role="button"][data-testid="unblock"]',
            'button[aria-label*="unblock"]',
            'button[aria-label*="Unblock"]'
        ]

        for (const selector of unblockSelectors) {
            const button = document.querySelector(selector)
            if (button) {
                console.log('OnlyBlock: Found unblock button with selector:', selector)
                return button
            }
        }

        return null
    }

    async waitForUnblockConfirmation() {
        // Wait for confirmation dialog and click confirm
        return new Promise((resolve) => {
            const checkForConfirmation = () => {
                const confirmSelectors = [
                    '[data-testid="confirmationSheetConfirm"]',
                    '[data-testid="confirmationSheetConfirmButton"]',
                    'button[data-testid="confirmationSheetConfirm"]',
                    'div[role="button"][data-testid="confirmationSheetConfirm"]'
                ]

                for (const selector of confirmSelectors) {
                    const confirmButton = document.querySelector(selector)
                    if (confirmButton) {
                        console.log('OnlyBlock: Found unblock confirmation button, clicking...')
                        confirmButton.click()
                        resolve()
                        return
                    }
                }

                // Check again after a short delay
                setTimeout(checkForConfirmation, 100)
            }

            checkForConfirmation()
        })
    }

    getBlockedProfiles() {
        return Array.from(this.blockedProfiles)
    }

    handleSettingChange(setting, value) {
        console.log('OnlyBlock: Setting changed:', setting, '=', value)

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

            case 'useTwitterBlock':
                this.useTwitterBlock = value
                console.log('OnlyBlock: Twitter block setting updated to:', value)
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