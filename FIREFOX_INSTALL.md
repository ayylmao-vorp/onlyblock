# Firefox Installation Guide

## Installing OnlyBlock on Firefox

### Method 1: Temporary Installation (Recommended for Testing)

1. **Download the Extension**
   - Download or clone this repository to your computer
   - Extract the files if downloaded as a ZIP

2. **Open Firefox Debugging**
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox" in the sidebar

3. **Load the Extension**
   - Click "Load Temporary Add-on"
   - Navigate to the extension folder
   - Select `manifest.json`
   - Click "Open"

4. **Verify Installation**
   - The OnlyBlock icon should appear in your browser toolbar
   - You should see a welcome page when first installed

### Method 2: Permanent Installation

1. **Package the Extension**
   - Create a ZIP file containing all extension files
   - Make sure to include `manifest-firefox.json` as `manifest.json` in the ZIP

2. **Install from File**
   - Open Firefox and navigate to `about:addons`
   - Click the gear icon and select "Install Add-on From File"
   - Select your packaged extension file

### Troubleshooting

**Error: "background.service_worker is currently disabled"**
- Solution: The manifest has been updated to be compatible with Firefox
- Make sure you're using the latest version of the extension

**Extension Not Working**
- Make sure you're using the Firefox-specific manifest
- Check that you're on x.com or twitter.com
- Try refreshing the page after installation

**Icon Not Appearing**
- Check the browser toolbar for the OnlyBlock icon
- You may need to customize the toolbar to see the icon

### Firefox-Specific Notes

- The extension now uses manifest v2 format for better Firefox compatibility
- The extension works the same way as in Chrome
- All features are available: profile blocking, phrase blocking, settings
- Data is stored locally in Firefox's extension storage

### Support

If you encounter issues:
1. Check the main README.md for general troubleshooting
2. Make sure you're using the correct manifest file
3. Try the temporary installation method first 