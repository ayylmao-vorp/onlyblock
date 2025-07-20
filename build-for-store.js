#!/usr/bin/env node

/**
 * Build script to prepare OnlyBlock extension for store publishing
 * Removes development features like test page functionality
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 Building OnlyBlock for store publishing...')

// Files to process
const filesToProcess = [
    'settings.html',
    'manifest.json',
    'manifest-firefox.json'
]

// Remove test page functionality
function removeTestPageFeatures() {
    console.log('📝 Removing test page features...')

    // Process settings.html
    let settingsContent = fs.readFileSync('settings.html', 'utf8')

    // Remove test page section
    settingsContent = settingsContent.replace(
        /<!-- DEV: Test Page Button \(Remove before publishing\) -->[\s\S]*?<!-- DEV: Test Page Button \(Remove before publishing\) -->/g,
        ''
    )

    // Remove test page button event listener
    settingsContent = settingsContent.replace(
        /document\.getElementById\('test-page-btn'\)\.addEventListener\('click', \(\) => \{\s*this\.openTestPage\(\)\s*\}\);/g,
        ''
    )

    // Remove openTestPage method
    settingsContent = settingsContent.replace(
        /openTestPage\(\) \{\s*chrome\.tabs\.create\(\{\s*url: chrome\.runtime\.getURL\('test-page\.html'\)\s*\}\)\s*\}/g,
        ''
    )

    // Remove test page CSS
    settingsContent = settingsContent.replace(
        /\/\* DEV: Test page section styling \*\/[\s\S]*?#test-page-btn:hover \{[\s\S]*?\}/g,
        ''
    )

    fs.writeFileSync('settings.html', settingsContent)
    console.log('✅ Removed test page features from settings.html')

    // Remove test-page.html from manifests
    const manifestFiles = ['manifest.json', 'manifest-firefox.json']

    manifestFiles.forEach(file => {
        let manifestContent = fs.readFileSync(file, 'utf8')

        // Remove file://* from content script matches (test page)
        manifestContent = manifestContent.replace(
            /"file:\/\*"/g,
            ''
        )

        // Clean up trailing commas
        manifestContent = manifestContent.replace(
            /,\s*]/g,
            ']'
        )

        fs.writeFileSync(file, manifestContent)
        console.log(`✅ Removed test page references from ${file}`)
    })
}

// Remove test page file
function removeTestPageFile() {
    if (fs.existsSync('test-page.html')) {
        fs.unlinkSync('test-page.html')
        console.log('✅ Removed test-page.html')
    }
}

// Remove this build script
function removeBuildScript() {
    if (fs.existsSync('build-for-store.js')) {
        fs.unlinkSync('build-for-store.js')
        console.log('✅ Removed build script')
    }
}

// Main build process
try {
    removeTestPageFeatures()
    removeTestPageFile()
    removeBuildScript()

    console.log('🎉 Build complete! Extension is ready for store publishing.')
    console.log('📦 Files cleaned:')
    console.log('   - Removed test page button from settings')
    console.log('   - Removed test page file')
    console.log('   - Removed test page references from manifests')
    console.log('   - Removed build script')

} catch (error) {
    console.error('❌ Build failed:', error.message)
    process.exit(1)
} 