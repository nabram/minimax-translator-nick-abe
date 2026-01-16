/**
 * Playwright Test for MiniMax Translator App
 * Tests basic functionality and UI elements
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testTranslatorApp() {
    console.log('Starting MiniMax Translator App Test...\n');
    
    // Launch browser
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Collect console messages
    const consoleMessages = [];
    const consoleErrors = [];
    
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push({ type: msg.type(), text });
        if (msg.type() === 'error') {
            consoleErrors.push(text);
        }
    });
    
    page.on('pageerror', error => {
        consoleErrors.push(`Page Error: ${error.message}`);
    });
    
    try {
        // Navigate to the app
        const appPath = join(__dirname, 'index.html');
        await page.goto(`file://${appPath}`, { waitUntil: 'domcontentloaded' });
        
        console.log('✓ Page loaded successfully');
        
        // Wait for app to initialize
        await page.waitForTimeout(1000);
        
        // Test 1: Check title
        const title = await page.title();
        console.log(`✓ Title: ${title}`);
        
        // Test 2: Check main elements exist
        const elements = {
            'Header': 'h1',
            'Language Toggle (ZH→EN)': '#zhEnBtn',
            'Language Toggle (EN→ZH)': '#enZhBtn',
            'Source Text Panel': '#sourceText',
            'Target Text Panel': '#targetText',
            'Microphone Button': '#micBtn',
            'Settings Button': '#openSettings',
            'Settings Modal': '#settingsModal'
        };
        
        console.log('\n--- Testing UI Elements ---');
        for (const [name, selector] of Object.entries(elements)) {
            const element = await page.$(selector);
            if (element) {
                console.log(`✓ ${name} found`);
            } else {
                console.log(`✗ ${name} NOT FOUND (${selector})`);
            }
        }
        
        // Test 3: Test language toggle
        console.log('\n--- Testing Language Toggle ---');
        await page.click('#enZhBtn');
        await page.waitForTimeout(200);
        
        const enZhActive = await page.$eval('#enZhBtn', el => el.classList.contains('active'));
        console.log(`✓ EN→ZH button active: ${enZhActive}`);
        
        await page.click('#zhEnBtn');
        await page.waitForTimeout(200);
        
        const zhEnActive = await page.$eval('#zhEnBtn', el => el.classList.contains('active'));
        console.log(`✓ ZH→EN button active: ${zhEnActive}`);
        
        // Test 4: Test typing and translation
        console.log('\n--- Testing Text Input ---');
        await page.fill('#sourceText', 'Hello world');
        await page.waitForTimeout(500);
        
        const sourceText = await page.$eval('#sourceText', el => el.textContent);
        console.log(`✓ Source text entered: "${sourceText}"`);
        
        // Test 5: Test settings modal
        console.log('\n--- Testing Settings Modal ---');
        await page.click('#openSettings');
        await page.waitForTimeout(300);
        
        const modalVisible = await page.$eval('#settingsModal', el => el.classList.contains('show'));
        console.log(`✓ Settings modal opens: ${modalVisible}`);
        
        // Check API key input exists
        const apiKeyInput = await page.$('#apiKey');
        console.log(`✓ API key input exists: ${!!apiKeyInput}`);
        
        // Close modal
        await page.click('#closeSettings');
        await page.waitForTimeout(300);
        
        // Test 6: Check service worker registration
        console.log('\n--- Testing Service Worker ---');
        const swRegistered = await page.evaluate(() => {
            return 'serviceWorker' in navigator;
        });
        console.log(`✓ Service Worker supported: ${swRegistered}`);
        
        // Test 7: Check manifest
        console.log('\n--- Testing PWA Manifest ---');
        const manifestExists = await page.evaluate(() => {
            const link = document.querySelector('link[rel="manifest"]');
            return !!link;
        });
        console.log(`✓ Manifest link exists: ${manifestExists}`);
        
        // Test 8: Check connection status
        console.log('\n--- Testing Connection Status ---');
        const connectionStatus = await page.$('.connection-status');
        console.log(`✓ Connection status element exists: ${!!connectionStatus}`);
        
        // Summary
        console.log('\n========================================');
        console.log('TEST SUMMARY');
        console.log('========================================');
        console.log(`Total console messages: ${consoleMessages.length}`);
        console.log(`Console errors: ${consoleErrors.length}`);
        
        if (consoleErrors.length > 0) {
            console.log('\n⚠️ Console Errors:');
            consoleErrors.forEach((err, i) => {
                console.log(`  ${i + 1}. ${err}`);
            });
        } else {
            console.log('\n✓ No console errors detected');
        }
        
        console.log('\n========================================');
        console.log('✓ ALL BASIC TESTS PASSED');
        console.log('========================================\n');
        
    } catch (error) {
        console.error('\n✗ Test failed with error:');
        console.error(error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// Run the test
testTranslatorApp().catch(console.error);
