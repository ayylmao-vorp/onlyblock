# OnlyBlock

A browser extension that automatically blocks X.com (Twitter) profiles containing OnlyFans links in their bio.

## Features

- 🔍 **Automatic Detection**: Scans profile bios for OnlyFans link patterns
- 🚫 **Instant Blocking**: Hides profiles with detected links immediately
- 🎛️ **Easy Control**: Toggle blocking on/off with a simple switch
- 📊 **Profile Management**: View and unblock profiles from the popup
- 💾 **Persistent Storage**: Saves blocked profiles across browser sessions
- 🔄 **Real-time Updates**: Works with dynamic content loading

## Installation

### Chrome/Edge/Brave
1. Download or clone this repository
2. Open your browser and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The OnlyBlock icon should appear in your browser toolbar

### Firefox
1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on" and select the `manifest.json` file

## How It Works

OnlyBlock uses pattern matching to detect common OnlyFans link formats:

- `onlyfans.com`
- `onlyfans.co`
- `of.ly`
- `fans.ly`
- Linktree pages containing OnlyFans
- Bio.link pages containing OnlyFans

When a profile with these links is detected, it's automatically hidden from view. You can manage blocked profiles through the extension popup.

## Usage

1. **Enable the Extension**: Click the OnlyBlock icon and toggle the switch to "ON"
2. **Browse X.com**: Navigate to any X.com page
3. **Automatic Blocking**: Profiles with OnlyFans links will be hidden automatically
4. **Manage Blocked Profiles**: Use the popup to view and unblock profiles as needed

## Privacy

- All data is stored locally in your browser
- No data is sent to external servers
- Blocked profiles are only stored in your browser's sync storage
- You can clear all data by uninstalling the extension

## File Structure

```
onlyblock/
├── manifest.json          # Extension configuration
├── content.js            # Main content script
├── background.js         # Background service worker
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── welcome.html         # Welcome page (shown on install)
├── help.html            # Help documentation
├── icons/               # Extension icons
└── README.md           # This file
```

## Development

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, Brave)
- Basic knowledge of JavaScript and browser extensions

### Local Development
1. Clone the repository
2. Make your changes
3. Load the extension in developer mode
4. Test on X.com pages

### Key Files
- `content.js`: Contains the main blocking logic
- `popup.js`: Handles the popup interface
- `manifest.json`: Extension configuration and permissions

## Troubleshooting

### Extension Not Working?
- Make sure the extension is enabled in the popup
- Refresh the X.com page
- Check that you're on x.com or twitter.com
- Try disabling and re-enabling the extension

### Profiles Not Being Blocked?
- OnlyBlock only detects profiles currently visible on the page
- Try scrolling to load more content
- Navigate to different pages to see more profiles

### False Positives?
- OnlyBlock uses pattern matching which may occasionally flag legitimate content
- You can always unblock profiles manually through the popup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on X.com
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

If you encounter issues or have suggestions:
1. Check the help page in the extension
2. Review the troubleshooting section above
3. Open an issue on the repository

---

**Note**: This extension is designed to help users manage their X.com experience by filtering unwanted content. It respects user privacy and operates entirely within the browser. 