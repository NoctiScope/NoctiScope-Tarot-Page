// 翻译管理器 - 负责多语言支持

let translations = null;
let currentLanguage = 'zh';

// 加载翻译数据
async function loadTranslations() {
    if (translations) return translations;
    
    try {
        const response = await fetch('data/translations.json');
        translations = await response.json();
        return translations;
    } catch (error) {
        console.error('加载翻译数据失败:', error);
        return null;
    }
}

// 翻译函数 - 支持参数替换
function t(key, params = {}) {
    if (!translations || !translations[currentLanguage]) {
        return key;
    }
    
    let text = translations[currentLanguage][key];
    if (!text) {
        // 如果当前语言没有，尝试使用中文作为后备
        text = translations['zh']?.[key] || key;
    }
    
    // 替换参数 {paramName}
    if (typeof text === 'string' && Object.keys(params).length > 0) {
        Object.keys(params).forEach(param => {
            text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
        });
    }
    
    return text;
}

// 设置当前语言
function setLanguage(lang) {
    if (translations && (translations[lang] || lang === 'zh' || lang === 'en')) {
        currentLanguage = lang;
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        return true;
    }
    return false;
}

// 获取当前语言
function getLanguage() {
    return currentLanguage;
}

// 导出供其他文件使用
window.i18n = {
    loadTranslations,
    t,
    setLanguage,
    getLanguage
};
