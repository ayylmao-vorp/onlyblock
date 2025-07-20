# OnlyBlock Installation Guide

## Chrome/Edge/Brave Installation

### Step 1: Download the Extension
1. Download or clone this repository to your computer
2. Extract the files if downloaded as a ZIP

### Step 2: Load the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the extension folder (the folder containing `manifest.json`)
5. The extension should load successfully

### Troubleshooting Chrome Issues

**Error: "Cannot install extension because it uses an unsupported manifest version"**

**Solution 1: Clear Browser Cache**
1. Close Chrome completely
2. Clear Chrome cache: `chrome://settings/clearBrowserData`
3. Restart Chrome and try loading again

**Solution 2: Check Manifest File**
1. Make sure you're using `manifest.json` (not `manifest-firefox.json`)
2. Verify the manifest starts with `"manifest_version": 3`

**Solution 3: Alternative Loading Method**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Navigate to the extension folder
5. Select the folder (not individual files)

### Step 3: Verify Installation
1. Look for the OnlyBlock icon in your browser toolbar
2. Click the icon to open the popup
3. Visit x.com to test the extension

## Firefox Installation

### Step 1: Download the Extension
1. Download or clone this repository to your computer
2. Extract the files if downloaded as a ZIP

### Step 2: Load the Extension
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select `manifest-firefox.json` (not `manifest.json`)
5. The extension should load successfully

### Troubleshooting Firefox Issues

**Error: "background.service_worker is currently disabled"**
- Solution: Use `manifest-firefox.json` which uses background scripts instead of service workers
- Firefox uses manifest v3 with background scripts, Chrome uses service workers

**Extension Not Loading**
- Make sure you're selecting the correct manifest file
- Try refreshing the debugging page

## Common Issues

### Extension Not Appearing
1. Check if the extension is enabled in the extensions page
2. Look for the icon in the toolbar (you may need to customize the toolbar)
3. Try refreshing the page

### Extension Not Working
1. Make sure you're on x.com or twitter.com
2. Check that the extension is enabled in the popup
3. Try refreshing the page

### Manifest Errors
1. Both browsers use manifest v3 but with different background implementations
2. Chrome: `manifest.json` (uses service workers)
3. Firefox: `manifest-firefox.json` (uses background scripts)
4. Ensure you're using Firefox version 109.0 or higher

## File Structure
```
onlyblock/
├── manifest.json          # Chrome/Edge/Brave (v3 + service workers)
├── manifest-firefox.json  # Firefox (v3 + background scripts)
├── content.js            # Main content script
├── background.js         # Background script (works with both)
├── popup.html           # Extension popup
├── popup.js             # Popup functionality
├── settings.html        # Settings page
├── welcome.html         # Welcome page
├── help.html            # Help documentation
├── create-icons.html    # Icon generator
└── README.md           # Main documentation
```

## Support

If you continue to have issues:
1. Check the browser console for error messages
2. Try a different browser
3. Make sure all files are present in the extension folder
4. Verify the manifest file is valid JSON 