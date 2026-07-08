/**
 * Translation Service — Google Cloud Translation API (with MyMemory fallback)
 *
 * If GOOGLE_TRANSLATE_API_KEY is set → uses Google (500K chars/month free).
 * Otherwise falls back to MyMemory (1000 words/day free, no key needed).
 */

const https = require('https');

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';

// MyMemory free API — no key required, 1000 words/day limit
function translateWithMyMemory(text, targetLang, sourceLang) {
    const from = (sourceLang === 'auto' || !sourceLang) ? 'en' : sourceLang;
    const langPair = encodeURIComponent(`${from}|${targetLang}`);
    const q = encodeURIComponent(text);

    return new Promise((resolve) => {
        const options = {
            hostname: 'api.mymemory.translated.net',
            path: `/get?q=${q}&langpair=${langPair}`,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.responseStatus === 200 && result.responseData && result.responseData.translatedText) {
                        resolve({ success: true, translated: result.responseData.translatedText, original: text });
                    } else {
                        resolve({ success: false, translated: '', original: text, error: result.responseDetails || 'MyMemory translation failed' });
                    }
                } catch (e) {
                    resolve({ success: false, translated: '', original: text, error: 'Failed to parse MyMemory response' });
                }
            });
        });

        req.on('error', (e) => {
            resolve({ success: false, translated: '', original: text, error: 'Network error: ' + e.message });
        });

        req.end();
    });
}

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
        return translateWithMyMemory(text, targetLang, sourceLang);
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
