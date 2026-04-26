/**
 * Advanced Search Engine
 * - Levenshtein distance: tính similarity giữa 2 chuỗi (fuzzy search)
 * - Normalize: bỏ dấu tiếng Việt, lowercase, loại bỏ ký tự đặc biệt
 * - Tokenize: tách từ khóa thành các token
 * - Relevance scoring: xếp hạng kết quả theo mức độ liên quan
 */

const pool = require('../config/database');

// ===================== CORE UTILITIES =====================

// Bảng loại bỏ dấu tiếng Việt
const VIETNAMESE_MAP = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd',
    'À': 'a', 'Á': 'a', 'Ả': 'a', 'Ã': 'a', 'Ạ': 'a',
    'Ă': 'a', 'Ằ': 'a', 'Ắ': 'a', 'Ẳ': 'a', 'Ẵ': 'a', 'Ặ': 'a',
    'Â': 'a', 'Ầ': 'a', 'Ấ': 'a', 'Ẩ': 'a', 'Ẫ': 'a', 'Ậ': 'a',
    'È': 'e', 'É': 'e', 'Ẻ': 'e', 'Ẽ': 'e', 'Ẹ': 'e',
    'Ê': 'e', 'Ề': 'e', 'Ế': 'e', 'Ể': 'e', 'Ễ': 'e', 'Ệ': 'e',
    'Ì': 'i', 'Í': 'i', 'Ỉ': 'i', 'Ĩ': 'i', 'Ị': 'i',
    'Ò': 'o', 'Ó': 'o', 'Ỏ': 'o', 'Õ': 'o', 'Ọ': 'o',
    'Ô': 'o', 'Ồ': 'o', 'Ố': 'o', 'Ổ': 'o', 'Ỗ': 'o', 'Ộ': 'o',
    'Ơ': 'o', 'Ờ': 'o', 'Ớ': 'o', 'Ở': 'o', 'Ỡ': 'o', 'Ợ': 'o',
    'Ù': 'u', 'Ú': 'u', 'Ủ': 'u', 'Ũ': 'u', 'Ụ': 'u',
    'Ư': 'u', 'Ừ': 'u', 'Ứ': 'u', 'Ử': 'u', 'Ữ': 'u', 'Ự': 'u',
    'Ỳ': 'y', 'Ý': 'y', 'Ỷ': 'y', 'Ỹ': 'y', 'Ỵ': 'y',
    'Đ': 'd'
};

function normalize(text) {
    if (!text) return '';
    return String(text)
        .split('')
        .map(char => VIETNAMESE_MAP[char] || char)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(text) {
    return normalize(text).split(' ').filter(t => t.length > 0);
}

function levenshteinDistance(a, b) {
    if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function similarityScore(a, b) {
    if (!a || !b) return 0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 100;
    const dist = levenshteinDistance(a, b);
    return Math.round((1 - dist / maxLen) * 100);
}

function fuzzyMatch(token, fieldValue, threshold = 50) {
    const normalizedField = normalize(fieldValue);
    const score = similarityScore(token, normalizedField);
    return score >= threshold ? score : 0;
}

function fieldMatchScore(keyword, fieldValue) {
    if (!keyword || !fieldValue) return 0;
    const kw = normalize(keyword);
    const fv = normalize(fieldValue);

    // Exact match
    if (fv === kw) return 100;
    // Starts with
    if (fv.startsWith(kw)) return 90;
    // Ends with
    if (fv.endsWith(kw)) return 80;
    // Contains
    if (fv.includes(kw)) return 70;
    // Fuzzy match
    const fuzzy = fuzzyMatch(kw, fv);
    return fuzzy;
}

function tokenFieldScore(tokens, fieldValue) {
    if (!tokens.length || !fieldValue) return 0;
    let maxScore = 0;
    for (const token of tokens) {
        const score = fieldMatchScore(token, fieldValue);
        if (score > maxScore) maxScore = score;
    }
    return maxScore;
}

function computeRelevance(keyword, project) {
    const tokens = tokenize(keyword);
    const scores = [
        { field: project.name, weight: 30 },
        { field: project.area, weight: 25 },
        { field: project.category, weight: 15 },
        { field: project.style, weight: 10 },
        { field: project.small_content, weight: 10 }
    ];

    let totalScore = 0;
    let totalWeight = 0;

    for (const { field, weight } of scores) {
        if (field) {
            const fieldScore = tokenFieldScore(tokens, field);
            if (fieldScore > 0) {
                totalScore += fieldScore * weight;
                totalWeight += weight;
            }
        }
    }

    // Bonus: exact name match
    const normKw = normalize(keyword);
    if (normalize(project.name).includes(normKw) && normKw.length >= 3) {
        totalScore += 20;
        totalWeight += 5;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

function computeContactRelevance(keyword, contact) {
    const tokens = tokenize(keyword);
    let totalScore = 0;
    let totalWeight = 0;

    // Name: tokenized match with weight 30
    if (contact.name) {
        const nameScore = tokenFieldScore(tokens, contact.name);
        if (nameScore > 0) {
            totalScore += nameScore * 30;
            totalWeight += 30;
        }
    }

    // Phone: digit-only matching with weight 35
    if (contact.phone) {
        const digitsOnly = String(contact.phone).replace(/\D/g, '');
        const kwDigits = keyword.replace(/\D/g, '');
        let phoneScore = 0;
        if (kwDigits) {
            if (digitsOnly === kwDigits) {
                phoneScore = 100;
            } else if (digitsOnly.startsWith(kwDigits) || digitsOnly.endsWith(kwDigits)) {
                phoneScore = 90;
            } else if (digitsOnly.includes(kwDigits)) {
                phoneScore = 100;
            } else {
                phoneScore = fuzzyMatch(kwDigits, digitsOnly);
            }
        }
        if (phoneScore > 0) {
            totalScore += phoneScore * 35;
            totalWeight += 35;
        }
    }

    // Email: tokenized match with weight 25
    if (contact.email) {
        const emailScore = tokenFieldScore(tokens, contact.email);
        if (emailScore > 0) {
            totalScore += emailScore * 25;
            totalWeight += 25;
        }
    }

    // Bonus: exact name match
    const normKw = normalize(keyword);
    if (contact.name && normalize(contact.name).includes(normKw) && normKw.length >= 3) {
        totalScore += 20;
        totalWeight += 5;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

// ===================== PROJECT SEARCH =====================
async function searchProjects(keyword) {
    if (!keyword || keyword.trim().length === 0) {
        const [rows] = await pool.query(
            'SELECT * FROM projects WHERE status = "active" ORDER BY display_order ASC, id DESC'
        );
        return rows;
    }

    const kw = keyword.trim();

    // Lấy tất cả projects
    const [rows] = await pool.query(
        'SELECT * FROM projects ORDER BY display_order ASC, id DESC'
    );

    // Tính relevance score
    const scored = rows.map(project => ({
        ...project,
        relevance: computeRelevance(kw, project)
    }));

    // Lọc: relevance > 0
    const filtered = scored.filter(p => p.relevance > 0);

    // Sắp xếp theo relevance giảm dần
    filtered.sort((a, b) => b.relevance - a.relevance);

    return filtered;
}

// ===================== CONTACT SEARCH =====================
async function searchContacts(keyword) {
    if (!keyword || keyword.trim().length === 0) {
        const [rows] = await pool.query(
            'SELECT * FROM contacts ORDER BY created_at DESC'
        );
        return rows;
    }

    const kw = keyword.trim();

    // Lấy tất cả contacts
    const [rows] = await pool.query(
        'SELECT * FROM contacts ORDER BY created_at DESC'
    );

    // Tính relevance score
    const scored = rows.map(contact => ({
        ...contact,
        relevance: computeContactRelevance(kw, contact)
    }));

    // Lọc: relevance > 0
    const filtered = scored.filter(c => c.relevance > 0);

    // Sắp xếp theo relevance giảm dần
    filtered.sort((a, b) => b.relevance - a.relevance);

    return filtered;
}

module.exports = {
    normalize,
    tokenize,
    levenshteinDistance,
    similarityScore,
    searchProjects,
    searchContacts
};
