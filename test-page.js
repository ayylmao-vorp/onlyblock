// Test page functionality for OnlyBlock extension

// Update status
function updateStatus(message) {
    document.getElementById('status').textContent = message
}

// Check if extension is loaded
setTimeout(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        updateStatus('Extension detected')
    } else {
        updateStatus('No extension detected')
    }
}, 1000)

// Listen for console messages
const originalLog = console.log
console.log = function (...args) {
    if (args[0] && args[0].includes('OnlyBlock')) {
        updateStatus('OnlyBlock: ' + args.join(' '))
    }
    originalLog.apply(console, args)
}

// Add some additional debugging
document.addEventListener('DOMContentLoaded', () => {
    console.log('Test page loaded')
    updateStatus('Test page ready')

    // Check for test profiles
    const testProfiles = document.querySelectorAll('.tweet')
    console.log(`Found ${testProfiles.length} test profiles`)

    // Log test profile content
    testProfiles.forEach((profile, index) => {
        const bio = profile.querySelector('.bio')
        if (bio) {
            console.log(`Test profile ${index + 1} bio:`, bio.textContent)
        }
    })
}) 