/**
 * MiniMax Translator - Main Application Logic
 * A lightweight real-time Chinese-English translator
 */

// Configuration
const CONFIG = {
    // MiniMax API Configuration
    // Get your API key from: https://api.minimax.chat/
    API_BASE_URL: 'https://api.minimax.chat/v1/text/translate',
    API_KEY: '', // User needs to add their API key in settings
    
    // Speech Recognition Settings
    SPEECH_LANGUAGES: {
        'zh-en': { source: 'zh-CN', target: 'en' },
        'en-zh': { source: 'en-US', target: 'zh' }
    },
    
    // Auto-translate debounce time (ms)
    TRANSLATE_DEBOUNCE: 500,
    
    // Local storage keys
    STORAGE_KEYS: {
        API_KEY: 'minimax_api_key',
        LANGUAGE_PAIR: 'language_pair',
        AUTO_TRANSLATE: 'auto_translate',
        SPEECH_RATE: 'speech_rate',
        OFFLINE_CACHE: 'offline_cache'
    }
};

// State Management
const state = {
    isListening: false,
    currentLangPair: 'zh-en',
    apiKey: '',
    autoTranslate: true,
    speechRate: 1,
    isOnline: navigator.onLine,
    recognition: null,
    synthesis: window.speechSynthesis,
    debounceTimer: null,
    offlineCache: new Map()
};

// DOM Elements
const elements = {
    sourceText: document.getElementById('sourceText'),
    targetText: document.getElementById('targetText'),
    sourceLangLabel: document.getElementById('sourceLangLabel'),
    targetLangLabel: document.getElementById('targetLangLabel'),
    micBtn: document.getElementById('micBtn'),
    zhEnBtn: document.getElementById('zhEnBtn'),
    enZhBtn: document.getElementById('enZhBtn'),
    speakSource: document.getElementById('speakSource'),
    speakTarget: document.getElementById('speakTarget'),
    clearSource: document.getElementById('clearSource'),
    copyTarget: document.getElementById('copyTarget'),
    connectionStatus: document.getElementById('connectionStatus'),
    offlineBanner: document.getElementById('offlineBanner'),
    installBtn: document.getElementById('installBtn'),
    settingsModal: document.getElementById('settingsModal'),
    openSettings: document.getElementById('openSettings'),
    closeSettings: document.getElementById('closeSettings'),
    apiKeyInput: document.getElementById('apiKey'),
    autoTranslateInput: document.getElementById('autoTranslate'),
    speechRateInput: document.getElementById('speechRate'),
    speechRateValue: document.getElementById('speechRateValue'),
    clearCacheBtn: document.getElementById('clearCache')
};

// Initialize Application
function init() {
    loadSettings();
    setupSpeechRecognition();
    setupEventListeners();
    setupServiceWorker();
    loadOfflineCache();
    checkOnlineStatus();
    setupInstallPrompt();
    updateLanguageLabels();
    
    console.log('MiniMax Translator initialized');
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    try {
        state.apiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY) || '';
        const savedLangPair = localStorage.getItem(CONFIG.STORAGE_KEYS.LANGUAGE_PAIR);
        state.autoTranslate = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTO_TRANSLATE) !== 'false';
        state.speechRate = parseFloat(localStorage.getItem(CONFIG.STORAGE_KEYS.SPEECH_RATE)) || 1;
        
        if (savedLangPair) {
            state.currentLangPair = savedLangPair;
            updateLanguageButtons();
        }
        
        // Update form inputs
        if (elements.apiKeyInput) elements.apiKeyInput.value = state.apiKey;
        if (elements.autoTranslateInput) elements.autoTranslateInput.checked = state.autoTranslate;
        if (elements.speechRateInput) {
            elements.speechRateInput.value = state.speechRate;
            if (elements.speechRateValue) elements.speechRateValue.textContent = state.speechRate + 'x';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, state.apiKey);
        localStorage.setItem(CONFIG.STORAGE_KEYS.LANGUAGE_PAIR, state.currentLangPair);
        localStorage.setItem(CONFIG.STORAGE_KEYS.AUTO_TRANSLATE, state.autoTranslate.toString());
        localStorage.setItem(CONFIG.STORAGE_KEYS.SPEECH_RATE, state.speechRate.toString());
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

/**
 * Setup Web Speech API Recognition
 */
function setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported in this browser');
        elements.micBtn.disabled = true;
        elements.micBtn.title = 'Speech recognition not supported';
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.lang = CONFIG.SPEECH_LANGUAGES[state.currentLangPair].source;
    
    state.recognition.onstart = () => {
        state.isListening = true;
        elements.micBtn.classList.add('listening');
        elements.micBtn.querySelector('svg').innerHTML = `
            <rect x="6" y="2" width="12" height="20" rx="5" fill="currentColor"/>
            <path d="M6 10v4a6 6 0 0012 0v-4" stroke="currentColor" fill="none" stroke-width="2"/>
        `;
    };
    
    state.recognition.onend = () => {
        state.isListening = false;
        elements.micBtn.classList.remove('listening');
        elements.micBtn.querySelector('svg').innerHTML = `
            <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        `;
    };
    
    state.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Track what we've already processed to avoid duplicates
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript === '') continue;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript = transcript;
            }
        }
        
        // Only update if we have new final results
        if (finalTranscript.trim()) {
            // Add new final text to what we already have
            const currentText = elements.sourceText.textContent.trim();
            const newText = currentText + (currentText ? ' ' : '') + finalTranscript.trim();
            elements.sourceText.textContent = newText;
            
            // Translate the NEW text only (not the accumulated text)
            translateText(finalTranscript.trim());
        }
        
        // Update with interim results (shows while speaking)
        if (interimTranscript) {
            const currentText = elements.sourceText.textContent.trim();
            // Don't append interim - replace the last interim or add to end
            if (currentText.endsWith(finalTranscript.trim())) {
                // Replace the end with interim
                elements.sourceText.textContent = currentText + ' ' + interimTranscript;
            }
        }
    };
    
    state.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please enable microphone permissions.');
        } else if (event.error === 'no-speech') {
            // No speech detected, restart listening
            try {
                state.recognition.start();
            } catch (e) {
                console.error('Failed to restart recognition:', e);
            }
        }
        
        state.isListening = false;
        elements.micBtn.classList.remove('listening');
    };
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // Microphone button
    elements.micBtn.addEventListener('click', toggleSpeechRecognition);
    
    // Language toggle buttons
    elements.zhEnBtn.addEventListener('click', () => setLanguagePair('zh-en'));
    elements.enZhBtn.addEventListener('click', () => setLanguagePair('en-zh'));
    
    // Text input events
    elements.sourceText.addEventListener('input', handleTextInput);
    
    // Action buttons
    elements.clearSource.addEventListener('click', () => {
        elements.sourceText.textContent = '';
        elements.targetText.textContent = '';
    });
    
    elements.speakSource.addEventListener('click', speakSourceText);
    elements.speakTarget.addEventListener('click', speakTargetText);
    elements.copyTarget.addEventListener('click', copyTargetText);
    
    // Settings
    elements.openSettings.addEventListener('click', () => elements.settingsModal.classList.add('show'));
    elements.closeSettings.addEventListener('click', () => elements.settingsModal.classList.remove('show'));
    
    // Settings form handlers
    elements.apiKeyInput.addEventListener('change', (e) => {
        state.apiKey = e.target.value;
        saveSettings();
    });
    
    elements.autoTranslateInput.addEventListener('change', (e) => {
        state.autoTranslate = e.target.checked;
        saveSettings();
    });
    
    elements.speechRateInput.addEventListener('input', (e) => {
        state.speechRate = parseFloat(e.target.value);
        elements.speechRateValue.textContent = state.speechRate + 'x';
        saveSettings();
    });
    
    elements.clearCacheBtn.addEventListener('click', clearOfflineCache);
    
    // Close modal on outside click
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            elements.settingsModal.classList.remove('show');
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'Enter') {
                e.preventDefault();
                translateCurrentText();
            }
        }
    });
    
    // Online/Offline events
    window.addEventListener('online', () => {
        state.isOnline = true;
        updateConnectionStatus();
    });
    
    window.addEventListener('offline', () => {
        state.isOnline = false;
        updateConnectionStatus();
    });
}

/**
 * Set language pair for translation
 */
function setLanguagePair(langPair) {
    state.currentLangPair = langPair;
    updateLanguageButtons();
    updateLanguageLabels();
    
    // Update speech recognition language
    if (state.recognition) {
        state.recognition.lang = CONFIG.SPEECH_LANGUAGES[langPair].source;
    }
    
    // Re-translate if there's text
    if (elements.sourceText.textContent.trim()) {
        translateText(elements.sourceText.textContent);
    }
    
    saveSettings();
}

/**
 * Update language toggle buttons
 */
function updateLanguageButtons() {
    elements.zhEnBtn.classList.toggle('active', state.currentLangPair === 'zh-en');
    elements.enZhBtn.classList.toggle('active', state.currentLangPair === 'en-zh');
}

/**
 * Update language labels
 */
function updateLanguageLabels() {
    const langs = CONFIG.SPEECH_LANGUAGES[state.currentLangPair];
    elements.sourceLangLabel.textContent = langs.source === 'zh-CN' ? '中文' : 'English';
    elements.targetLangLabel.textContent = langs.target === 'en' ? 'English' : '中文';
}

/**
 * Toggle speech recognition
 */
function toggleSpeechRecognition() {
    if (!state.recognition) {
        alert('Speech recognition is not supported in your browser');
        return;
    }
    
    if (state.isListening) {
        state.recognition.stop();
    } else {
        try {
            state.recognition.start();
        } catch (error) {
            console.error('Failed to start recognition:', error);
        }
    }
}

/**
 * Handle text input with debounce
 */
function handleTextInput() {
    if (!state.autoTranslate) return;
    
    const text = elements.sourceText.textContent.trim();
    
    // Clear existing debounce timer
    if (state.debounceTimer) {
        clearTimeout(state.debounceTimer);
    }
    
    // Set new debounce timer
    state.debounceTimer = setTimeout(() => {
        if (text) {
            translateText(text);
        }
    }, CONFIG.TRANSLATE_DEBOUNCE);
}

/**
 * Translate text using MiniMax API or offline cache
 */
async function translateText(text) {
    if (!text.trim()) return;
    
    const sourceLang = CONFIG.SPEECH_LANGUAGES[state.currentLangPair].target;
    const targetLang = CONFIG.SPEECH_LANGUAGES[state.currentLangPair].source === 'zh-CN' ? 'zh' : 'en';
    
    // Check offline cache first
    const cacheKey = `${sourceLang}:${targetLang}:${text}`;
    if (state.offlineCache.has(cacheKey)) {
        const cachedTranslation = state.offlineCache.get(cacheKey);
        elements.targetText.textContent = cachedTranslation;
        console.log('Using cached translation');
        return;
    }
    
    // If offline, show message
    if (!state.isOnline) {
        elements.targetText.innerHTML = `<span style="color: #e74c3c;">Offline - translation unavailable</span>`;
        showOfflineIndicator();
        return;
    }
    
    // If no API key, show message
    if (!state.apiKey) {
        console.log('No API key configured');
        elements.targetText.innerHTML = `
            <span style="color: #636e72;">Add your MiniMax API key in settings to enable translation.</span>
            <br><br>
            <a href="https://api.minimax.chat/" target="_blank" style="color: #4a90d9;">Get a free API key →</a>
        `;
        return;
    }
    
    try {
        elements.targetText.classList.add('loading');
        console.log('Translating:', text, 'from', sourceLang, 'to', targetLang);
        
        const response = await fetch(CONFIG.API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                source_lang: sourceLang.toUpperCase(),
                target_lang: targetLang.toUpperCase(),
                text: text
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        // MiniMax API response structure
        let translation = '';
        
        if (data.base_resp && data.base_resp.status_code === 0) {
            // Successful response
            translation = data.text || '';
        } else if (data.base_resp) {
            // Error from MiniMax
            throw new Error(data.base_resp.status_msg || `API error: ${data.base_resp.status_code}`);
        } else if (data.text) {
            // Alternative response format
            translation = data.text;
        } else {
            console.error('Unexpected API response structure:', data);
            throw new Error('Unexpected API response format');
        }
        
        if (translation) {
            elements.targetText.textContent = translation;
            // Cache the translation
            state.offlineCache.set(cacheKey, translation);
            saveOfflineCache();
            console.log('Translation complete:', translation);
        } else {
            throw new Error('Empty translation received');
        }
        
    } catch (error) {
        console.error('Translation error:', error);
        // Fallback to browser translation
        await browserTranslate(text, sourceLang, targetLang);
    } finally {
        elements.targetText.classList.remove('loading');
    }
}

/**
 * Browser-based translation fallback
 * Note: Google Translate API may be blocked in some regions
 */
async function browserTranslate(text, sourceLang, targetLang) {
    // Using a CORS proxy to access Google Translate
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodedText}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Google Translate failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data[0] && Array.isArray(data[0])) {
            const translation = data[0]
                .filter(item => item && item[0])
                .map(item => item[0])
                .join('');
            
            if (translation) {
                elements.targetText.textContent = translation;
                
                // Cache the translation
                const cacheKey = `${sourceLang}:${targetLang}:${text}`;
                state.offlineCache.set(cacheKey, translation);
                saveOfflineCache();
                return;
            }
        }
        
        throw new Error('No translation found in response');
    } catch (error) {
        console.error('Browser translation error:', error);
        
        // Final fallback: show original text with suggestion
        elements.targetText.innerHTML = `
            <span style="color: #636e72;">Translation service unavailable. Check your API key.</span>
            <br><br>
            <span style="color: #b2bec3; font-style: italic;">Original text: ${text}</span>
        `;
    }
}

/**
 * Speak text using browser's text-to-speech
 */
function speakText(text, lang) {
    if (!state.synthesis) {
        console.warn('Speech synthesis not supported');
        return;
    }
    
    // Cancel any ongoing speech
    state.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    utterance.rate = state.speechRate;
    
    state.synthesis.speak(utterance);
}

/**
 * Speak source text
 */
function speakSourceText() {
    const text = elements.sourceText.textContent.trim();
    if (!text) return;
    
    const sourceLang = CONFIG.SPEECH_LANGUAGES[state.currentLangPair].source;
    speakText(text, sourceLang);
}

/**
 * Speak target text
 */
function speakTargetText() {
    const text = elements.targetText.textContent.trim();
    if (!text) return;
    
    const targetLang = CONFIG.SPEECH_LANGUAGES[state.currentLangPair].target;
    speakText(text, targetLang);
}

/**
 * Copy target text to clipboard
 */
async function copyTargetText() {
    const text = elements.targetText.textContent.trim();
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        const originalHTML = elements.copyTarget.innerHTML;
        elements.copyTarget.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
        `;
        
        setTimeout(() => {
            elements.copyTarget.innerHTML = originalHTML;
        }, 1500);
    } catch (error) {
        console.error('Copy failed:', error);
    }
}

/**
 * Translate current text immediately
 */
function translateCurrentText() {
    const text = elements.sourceText.textContent.trim();
    if (text) {
        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
        }
        translateText(text);
    }
}

/**
 * Update online status indicator
 */
function updateConnectionStatus() {
    const statusDot = elements.connectionStatus.querySelector('.status-dot');
    const statusText = elements.connectionStatus.querySelector('.status-text');
    
    statusDot.classList.toggle('online', state.isOnline);
    statusDot.classList.toggle('offline', !state.isOnline);
    statusText.textContent = state.isOnline ? 'Online' : 'Offline';
    
    // Show/hide offline banner
    if (!state.isOnline) {
        showOfflineIndicator();
    } else {
        elements.offlineBanner.classList.remove('show');
    }
}

/**
 * Show offline indicator
 */
function showOfflineIndicator() {
    elements.offlineBanner.classList.add('show');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        elements.offlineBanner.classList.remove('show');
    }, 3000);
}

/**
 * Check initial online status
 */
function checkOnlineStatus() {
    updateConnectionStatus();
}

/**
 * Service Worker Setup
 */
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
}

/**
 * Load offline cache from localStorage
 */
function loadOfflineCache() {
    try {
        const cached = localStorage.getItem(CONFIG.STORAGE_KEYS.OFFLINE_CACHE);
        if (cached) {
            const cacheData = JSON.parse(cached);
            state.offlineCache = new Map(cacheData);
            console.log(`Loaded ${state.offlineCache.size} cached translations`);
        }
    } catch (error) {
        console.error('Error loading offline cache:', error);
    }
}

/**
 * Save offline cache to localStorage
 */
function saveOfflineCache() {
    try {
        // Limit cache size to prevent localStorage overflow
        const maxEntries = 500;
        if (state.offlineCache.size > maxEntries) {
            // Remove oldest entries
            const entries = Array.from(state.offlineCache.entries());
            state.offlineCache = new Map(entries.slice(-maxEntries));
        }
        
        const cacheData = Array.from(state.offlineCache.entries());
        localStorage.setItem(CONFIG.STORAGE_KEYS.OFFLINE_CACHE, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error saving offline cache:', error);
    }
}

/**
 * Clear offline cache
 */
function clearOfflineCache() {
    state.offlineCache.clear();
    localStorage.removeItem(CONFIG.STORAGE_KEYS.OFFLINE_CACHE);
    alert('Offline cache cleared');
}

/**
 * PWA Install Prompt Setup
 */
function setupInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button
        elements.installBtn.style.display = 'block';
        
        elements.installBtn.addEventListener('click', async () => {
            elements.installBtn.style.display = 'none';
            
            if (deferredPrompt) {
                deferredPrompt.prompt();
                
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`Install outcome: ${outcome}`);
                
                deferredPrompt = null;
            }
        });
    });
    
    window.addEventListener('appinstalled', () => {
        console.log('App installed successfully');
        elements.installBtn.style.display = 'none';
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
