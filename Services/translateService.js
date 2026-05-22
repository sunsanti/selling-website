/**
 * Google Cloud Translation API Service
 * Requires a Google Cloud Translation API key.
 * Free tier: 500,000 characters/month
 *
 * Setup:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a project or select existing
 * 3. Enable "Cloud Translation API"
 * 4. Go to Credentials > Create Credentials > API Key
 * 5. Add your API key to config.env or config/database.js
 */

const https = require('https');

// API key - set this in environment variable or config
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';

/**
 * Translate text using Google Cloud Translation API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (e.g. 'en', 'vi', 'zh', 'ja', 'ko')
 * @param {string} sourceLang - Source language code (optional, auto-detect if not provided)
 * @returns {Promise<{success: boolean, translated: string, original: string}>}
 */
async function translateText(text, targetLang, sourceLang = 'auto') {
    if (!text || text.trim().length === 0) {
        return { success: true, translated: '', original: text };
    }

    if (!API_KEY) {
        return {
            success: false,
            translated: '',
            original: text,
            error: 'Google Translate API key not configured. Please set GOOGLE_TRANSLATE_API_KEY in environment variables.'
        };
    }

    const langMap = {
        'en': 'en',
        'english': 'en',
        'vi': 'vi',
        'vietnamese': 'vi',
        'zh': 'zh-CN',
        'chinese': 'zh-CN',
        'ja': 'ja',
        'japanese': 'ja',
        'ko': 'ko',
        'korean': 'ko',
        'fr': 'fr',
        'french': 'fr',
        'de': 'de',
        'german': 'de',
        'es': 'es',
        'spanish': 'es',
        'th': 'th',
        'thai': 'th'
    };

    const target = langMap[targetLang.toLowerCase()] || targetLang;
    const source = sourceLang === 'auto' ? 'auto' : (langMap[sourceLang.toLowerCase()] || sourceLang);

    const postData = JSON.stringify({
        q: text,
        source: source,
        target: target,
        format: 'text'
    });

    const options = {
        hostname: 'translation.googleapis.com',
        path: `/language/translate/v2?key=${API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);

                    if (result.data && result.data.translations && result.data.translations.length > 0) {
                        resolve({
                            success: true,
                            translated: result.data.translations[0].translatedText,
                            original: text,
                            detectedSource: result.data.translations[0].detectedSourceLanguage || source
                        });
                    } else if (result.error) {
                        resolve({
                            success: false,
                            translated: '',
                            original: text,
                            error: result.error.message || 'Translation API error'
                        });
                    } else {
                        resolve({
                            success: false,
                            translated: '',
                            original: text,
                            error: 'Unexpected API response'
                        });
                    }
                } catch (e) {
                    resolve({
                        success: false,
                        translated: '',
                        original: text,
                        error: 'Failed to parse API response: ' + e.message
                    });
                }
            });
        });

        req.on('error', (e) => {
            resolve({
                success: false,
                translated: '',
                original: text,
                error: 'Network error: ' + e.message
            });
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Batch translate multiple texts
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (optional)
 * @returns {Promise<Array>}
 */
async function translateBatch(texts, targetLang, sourceLang = 'auto') {
    const results = [];

    for (const text of texts) {
        const result = await translateText(text, targetLang, sourceLang);
        results.push(result);

        // Small delay to avoid hitting rate limits
        await new Promise(r => setTimeout(r, 50));
    }

    return results;
}

/**
 * Detect language of text
 * @param {string} text - Text to detect
 * @returns {Promise<{success: boolean, language: string, confidence: number}>}
 */
async function detectLanguage(text) {
    if (!text || text.trim().length === 0) {
        return { success: false, language: '', confidence: 0 };
    }

    if (!API_KEY) {
        return { success: false, language: '', confidence: 0, error: 'API key not configured' };
    }

    const postData = JSON.stringify({ q: text });

    const options = {
        hostname: 'translation.googleapis.com',
        path: `/language/translate/v2/detect?key=${API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => { data += chunk; });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.data && result.data.detections && result.data.detections.length > 0) {
                        const detection = result.data.detections[0][0];
                        resolve({
                            success: true,
                            language: detection.language,
                            confidence: detection.confidence
                        });
                    } else {
                        resolve({ success: false, language: '', confidence: 0 });
                    }
                } catch (e) {
                    resolve({ success: false, language: '', confidence: 0 });
                }
            });
        });

        req.on('error', () => {
            resolve({ success: false, language: '', confidence: 0 });
        });

        req.write(postData);
        req.end();
    });
}

module.exports = {
    translateText,
    translateBatch,
    detectLanguage
};
