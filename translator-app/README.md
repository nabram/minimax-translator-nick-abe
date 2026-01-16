# MiniMax Translator

A lightweight, real-time Chinese-English translator web app that runs on your phone. Features speech recognition, live translation, and offline capabilities.

## Features

- **Real-time Speech Recognition**: Speak and see text appear instantly
- **Live Translation**: Translate between Chinese and English in real-time
- **Side-by-Side View**: Clean interface showing source and target languages
- **Text-to-Speech**: Hear translations spoken aloud
- **Offline Support**: Caches translations for offline use
- **PWA Installable**: Install as a native app on your phone
- **Cross-Platform**: Works on Android, iOS, and desktop browsers

## Quick Start

### 1. Get Your MiniMax API Key

1. Go to [MiniMax API Platform](https://api.minimax.chat/)
2. Sign up for a free account
3. Create a new project and get your API key
4. Copy the API key (you'll enter it in the app settings)

### 2. Install the App

**Option A - Web Version (Recommended):**
1. Host these files on a web server (GitHub Pages, Netlify, Vercel, etc.)
2. Open the URL in your browser
3. Tap "Add to Home Screen" to install as PWA

**Option B - Local Development:**
```bash
# Clone or download these files
cd translator-app

# Start a local server (using Python)
python -m http.server 8000

# Or using Node.js
npx serve .
```

Then open `http://localhost:8000` in your browser.

### 3. Configure the App

1. Open the app in your browser
2. Tap the settings icon (gear button)
3. Enter your MiniMax API key
4. Adjust settings as needed
5. Close settings

### 4. Start Translating

1. Tap the microphone button to start speaking
2. Or type text in the left panel
3. Translations appear automatically in the right panel
4. Tap the speaker button to hear the translation

## File Structure

```
translator-app/
├── index.html          # Main app interface
├── styles.css          # Styling and responsive design
├── app.js              # Main application logic
├── sw.js               # Service Worker for offline support
├── manifest.json       # PWA manifest
├── generate-icons.html # Tool to generate app icons
├── README.md           # This file
└── icons/              # App icons (generated)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

## Browser Support

| Browser | Speech Recognition | Text-to-Speech | PWA |
|---------|-------------------|----------------|-----|
| Chrome  | ✓ | ✓ | ✓ |
| Safari  | ✓ | ✓ | ✓ |
| Edge    | ✓ | ✓ | ✓ |
| Firefox | Limited | ✓ | ✓ |

**Note**: Speech recognition works best in Chrome and Safari.

## API Configuration

### MiniMax API

The app uses MiniMax Translation API. Get your API key from:
- **Website**: https://api.minimax.chat/
- **Pricing**: Free tier available with rate limits

### API Settings

In the app settings, you can configure:
- **API Key**: Your MiniMax API key
- **Auto-translate**: Enable/disable automatic translation
- **Speech Rate**: Adjust text-to-speech speed

## Offline Mode

The app supports offline functionality:

1. **Translation Cache**: Translations are cached locally
2. **Offline Indicator**: Shows when working offline
3. **Cached Translations**: Previously translated text works offline
4. **Service Worker**: Caches app shell for offline use

To clear the offline cache:
1. Open settings
2. Tap "Clear Offline Cache"

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Enter | Translate immediately |

## Privacy

- All translations are processed through MiniMax APIs
- API keys are stored locally in your browser
- Translation cache is stored locally
- No data is sent to third parties (other than MiniMax)

## Troubleshooting

### Speech Recognition Not Working

1. Check microphone permissions
2. Use Chrome or Safari browser
3. Ensure stable internet connection
4. Speak clearly in the selected language

### Translation Errors

1. Verify API key is correct
2. Check internet connection
3. Clear app cache and try again
4. Check MiniMax API status

### App Won't Install

1. Use HTTPS (required for PWA)
2. Ensure all files are accessible
3. Check browser supports PWA

## Development

### Running Locally

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

### Testing PWA

Use Chrome DevTools:
1. Open DevTools (F12)
2. Go to Application tab
3. Check Service Workers
4. Check Manifest

### Building for Production

1. Minify HTML, CSS, and JS
2. Optimize images
3. Deploy to HTTPS server
4. Test offline functionality

## License

MIT License - Feel free to use and modify.

## Credits

- [MiniMax](https://api.minimax.chat/) for translation APIs
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) for speech recognition
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) for offline support
