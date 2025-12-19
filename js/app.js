// 应用主逻辑

let currentQuestion = '';
let currentResult = null;
let tarotData = null;
let emojiData = null;
let cardNameMapping = null;

// ==================== 数据加载 ====================

// 加载塔罗牌数据（只加载中文版，作为基础）
async function loadTarotData() {
    if (tarotData) return tarotData;
    
    try {
        const response = await fetch('data/tarot-cn.json');
        tarotData = await response.json();
        return tarotData;
    } catch (error) {
        console.error('加载塔罗牌数据失败:', error);
        return null;
    }
}

// 加载emoji数据
async function loadEmojiData() {
    if (emojiData) return emojiData;
    
    try {
        const response = await fetch('data/tarot-emoji.json');
        emojiData = await response.json();
        return emojiData;
    } catch (error) {
        console.error('加载emoji数据失败:', error);
        return null;
    }
}

// 加载牌名映射数据
async function loadCardNameMapping() {
    if (cardNameMapping) return cardNameMapping;
    
    try {
        const response = await fetch('data/card-name-mapping.json');
        cardNameMapping = await response.json();
        return cardNameMapping;
    } catch (error) {
        console.error('加载牌名映射数据失败:', error);
        return null;
    }
}

// ==================== 牌名转换（中文 ↔ 英文） ====================

// 将中文牌名转换为英文
function translateCardNameToEn(cardName) {
    if (!cardNameMapping || !cardName) return cardName;
    
    const mapping = cardNameMapping.zh_to_en;
    
    // 大阿尔克那
    if (mapping.major_arcana && mapping.major_arcana[cardName]) {
        return mapping.major_arcana[cardName];
    }
    
    // 数字牌和宫廷牌
    const suits = ['宝剑', '圣杯', '权杖', '星币'];
    for (const suit of suits) {
        if (cardName.startsWith(suit)) {
            const rest = cardName.replace(suit, '');
            const enSuit = mapping.suits[suit];
            
            // 尝试数字
            if (mapping.numbers && mapping.numbers[rest]) {
                const numberEnText = mapping.numbers[rest];
                return `${numberEnText} of ${enSuit}`;
            }
            
            // 尝试宫廷职位
            if (mapping.court_ranks && mapping.court_ranks[rest]) {
                return `${mapping.court_ranks[rest]} of ${enSuit}`;
            }
        }
    }
    
    return cardName;
}

// 将中文方向转换为英文
function translateDirectionToEn(direction) {
    if (!cardNameMapping) return direction;
    return cardNameMapping.zh_to_en.directions[direction] || direction;
}

// 获取显示用的牌名（根据当前语言）
function getDisplayCardName(zhCardName) {
    const currentLang = window.i18n.getLanguage();
    if (currentLang === 'zh') {
        return zhCardName;
    } else {
        return translateCardNameToEn(zhCardName);
    }
}

// 获取显示用的方向（根据当前语言）
function getDisplayDirection(zhDirection) {
    const currentLang = window.i18n.getLanguage();
    if (currentLang === 'zh') {
        return zhDirection;
    } else {
        return translateDirectionToEn(zhDirection);
    }
}

// ==================== Emoji 获取 ====================

// 获取牌面的emoji（基于中文牌名）
function getCardEmoji(zhCardName) {
    if (!emojiData || !zhCardName) return '';
    
    // 大阿尔克那
    if (emojiData.major_arcana && emojiData.major_arcana[zhCardName]) {
        return emojiData.major_arcana[zhCardName];
    }
    
    // 数字牌：匹配"花色+数字"格式
    for (const [suit, emoji] of Object.entries(emojiData.suits || {})) {
        if (zhCardName.startsWith(suit)) {
            const numberPart = zhCardName.replace(suit, '');
            const numberEmoji = emojiData.numbers && emojiData.numbers[numberPart];
            if (numberEmoji) {
                return emoji + numberEmoji;
            }
        }
    }
    
    // 宫廷牌：匹配"花色+职位"格式
    for (const [suit, suitEmoji] of Object.entries(emojiData.suits || {})) {
        if (zhCardName.startsWith(suit)) {
            const rankPart = zhCardName.replace(suit, '');
            const rankEmoji = emojiData.court_ranks && emojiData.court_ranks[rankPart];
            if (rankEmoji) {
                return suitEmoji + rankEmoji;
            }
        }
    }
    
    return '';
}

// 获取方向的emoji（基于中文方向）
function getDirectionEmoji(zhDirection) {
    if (!emojiData) return '';
    return emojiData.directions && emojiData.directions[zhDirection] || '';
}

// ==================== 卡池映射 ====================

// 初始化卡池映射关系
function initPoolMapping() {
    const numberCards = tarotData.number_cards;
    const courtCards = tarotData.court_cards;
    const minorArcana = [...numberCards, ...courtCards];
    const fullDeck = [...tarotData.major_arcana, ...minorArcana];

    const poolNames = {
        'zh': {
            1: window.i18n.t('poolFull'),
            2: window.i18n.t('poolMajor'),
            3: window.i18n.t('poolMinor'),
            4: window.i18n.t('poolCourt'),
            5: window.i18n.t('poolNumber')
        }
    };

    return {
        1: { name: poolNames['zh'][1], cards: fullDeck },
        2: { name: poolNames['zh'][2], cards: tarotData.major_arcana },
        3: { name: poolNames['zh'][3], cards: minorArcana },
        4: { name: poolNames['zh'][4], cards: courtCards },
        5: { name: poolNames['zh'][5], cards: numberCards }
    };
}

// ==================== 抽牌逻辑 ====================

// 从数组中随机选择多个元素（允许重复）
function randomChoices(array, k) {
    const result = [];
    for (let i = 0; i < k; i++) {
        const randomIndex = Math.floor(Math.random() * array.length);
        result.push(array[randomIndex]);
    }
    return result;
}

// 从数组中随机选择多个元素（不允许重复）
function randomSample(array, k) {
    if (k > array.length) {
        k = array.length;
    }
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, k);
}

// 抽牌函数（基于中文数据）
function drawCards(targetPool = 1, allowRepeat = true, cardCountMode = 'default', cardCountValue = null) {
    if (!tarotData) {
        console.error('塔罗牌数据未加载');
        return null;
    }

    const poolMapping = initPoolMapping();
    const selectedPool = poolMapping[targetPool];
    const targetDeck = selectedPool.cards;
    const maxDeckSize = targetDeck.length;

    // 根据牌数模式决定抽牌数量
    let numCards;
    if (cardCountMode === 'fixed') {
        numCards = Math.min(Math.max(1, parseInt(cardCountValue) || 3), maxDeckSize);
    } else if (cardCountMode === 'random-range') {
        const maxValue = Math.min(Math.max(1, parseInt(cardCountValue) || 15), maxDeckSize);
        numCards = Math.floor(Math.random() * (maxValue - 1 + 1)) + 1;
    } else {
        const maxCards = Math.min(maxDeckSize, 15);
        numCards = Math.floor(Math.random() * (maxCards - 3 + 1)) + 3;
    }

    // 根据是否允许重复选择不同的抽牌方法
    let drawnCards;
    if (allowRepeat) {
        drawnCards = randomChoices(targetDeck, numCards);
    } else {
        numCards = Math.min(numCards, maxDeckSize);
        drawnCards = randomSample(targetDeck, numCards);
    }

    // 给每张牌分配方向（使用中文）
    const directions = ["正位", "逆位"];
    const cardWithDirection = drawnCards.map(card => ({
        card: card, // 中文牌名
        direction: directions[Math.floor(Math.random() * directions.length)] // 中文方向
    }));

    return {
        poolName: selectedPool.name,
        allowRepeat: allowRepeat,
        cards: cardWithDirection
    };
}

// ==================== UI更新 ====================

// 更新UI文本
function updateUITexts() {
    // 左侧文本
    document.getElementById('question-label').textContent = window.i18n.t('questionLabel');
    document.getElementById('question-input').placeholder = window.i18n.t('questionPlaceholder');
    document.getElementById('draw-btn').textContent = window.i18n.t('drawButton');
    document.getElementById('answer-title').textContent = window.i18n.t('answerTitle');
    document.getElementById('copy-btn').textContent = window.i18n.t('copyButton');
    
    // 右侧文本
    const titleElement = document.getElementById('web-title-text');
    if (window.i18n.getLanguage() === 'zh') {
        titleElement.innerHTML = 'Nocti🪢cope<br>塔罗占卜';
    } else {
        titleElement.innerHTML = 'Nocti🪢cope<br>Tarot Divination';
    }
    document.getElementById('mode-selection-label').textContent = window.i18n.t('modeSelection');
    const defaultModeLabel = document.getElementById('default-mode-label');
    if (defaultModeLabel) {
        defaultModeLabel.textContent = window.i18n.t('defaultMode');
    }
    document.getElementById('advanced-mode-label').textContent = window.i18n.t('advancedMode');
    document.getElementById('select-pool-label').textContent = window.i18n.t('selectPool');
    document.getElementById('card-repeat-label').textContent = window.i18n.t('cardRepeat');
    document.getElementById('custom-card-count-label').textContent = window.i18n.t('customCardCount');
    
    // 下拉选项文本
    const poolOptions = [
        { value: 1, pool: 'poolFull', count: 78 },
        { value: 2, pool: 'poolMajor', count: 22 },
        { value: 3, pool: 'poolMinor', count: 56 },
        { value: 4, pool: 'poolCourt', count: 16 },
        { value: 5, pool: 'poolNumber', count: 40 }
    ];
    
    const poolSelect = document.getElementById('pool-select');
    poolOptions.forEach((opt, index) => {
        const option = poolSelect.options[index];
        option.textContent = `${window.i18n.t(opt.pool)}  ${opt.count}${window.i18n.getLanguage() === 'zh' ? '张' : ' cards'}`;
    });
    
    const allowRepeatSelect = document.getElementById('allow-repeat-select');
    allowRepeatSelect.options[0].textContent = window.i18n.t('allowRepeat');
    allowRepeatSelect.options[1].textContent = window.i18n.t('notAllowRepeat');
    
    const cardCountModeSelect = document.getElementById('card-count-mode');
    cardCountModeSelect.options[0].textContent = window.i18n.t('defaultRandomCount');
    cardCountModeSelect.options[1].textContent = window.i18n.t('fixedCount');
    cardCountModeSelect.options[2].textContent = window.i18n.t('randomRange');
    
    document.getElementById('card-count-input').placeholder = window.i18n.t('inputCardCount');
}

// 获取最大牌数
function getMaxCardCount() {
    const poolMapping = initPoolMapping();
    const poolSelect = document.getElementById('pool-select');
    const targetPool = parseInt(poolSelect.value);
    const selectedPool = poolMapping[targetPool];
    return selectedPool.cards.length;
}

// 执行抽牌
function performDraw() {
    const defaultMode = document.getElementById('default-mode-radio').checked;
    const advancedMode = document.getElementById('advanced-mode-radio').checked;
    
    let targetPool = 1;
    let allowRepeat = true;
    let cardCountMode = 'default';
    let cardCountValue = null;
    
    if (advancedMode && !defaultMode) {
        const poolSelect = document.getElementById('pool-select');
        const allowRepeatSelect = document.getElementById('allow-repeat-select');
        const cardCountModeSelect = document.getElementById('card-count-mode');
        const cardCountInput = document.getElementById('card-count-input');
        
        targetPool = parseInt(poolSelect.value);
        allowRepeat = allowRepeatSelect.value === 'true';
        cardCountMode = cardCountModeSelect.value;
        cardCountValue = cardCountInput.value;
        
        // 验证牌数输入
        if (cardCountMode === 'fixed' || cardCountMode === 'random-range') {
            const maxCount = getMaxCardCount();
            const inputValue = parseInt(cardCountValue);
            
            if (isNaN(inputValue) || inputValue < 1) {
                alert(window.i18n.t('cardCountMustBeGreaterThanZero'));
                return;
            }
            
            if (inputValue > maxCount) {
                alert(window.i18n.t('cardCountCannotExceedPool', { count: maxCount }));
                return;
            }
        }
    }
    
    // 抽牌
    const result = drawCards(targetPool, allowRepeat, cardCountMode, cardCountValue);
    
    if (!result) {
        alert(window.i18n.t('drawFailed'));
        return;
    }
    
    // 保存问题
    currentQuestion = document.getElementById('question-input').value.trim();
    if (!currentQuestion) {
        alert(window.i18n.t('pleaseEnterQuestion'));
        return;
    }
    
    // 显示结果
    displayResults(result);
}

// 显示抽牌结果
function displayResults(result) {
    const container = document.getElementById('cards-container');
    const answerContainer = document.getElementById('answer-container');
    
    // 保存结果供复制使用
    currentResult = result;
    
    // 显示结果容器
    answerContainer.style.display = 'block';
    
    // 清空之前的结果
    container.innerHTML = '';
    
    // 显示卡池信息
    const poolInfo = document.createElement('div');
    poolInfo.className = 'pool-info';
    const repeatText = result.allowRepeat ? window.i18n.t('allowRepeat') : window.i18n.t('notAllowRepeat');
    poolInfo.textContent = window.i18n.t('copyPoolInfoTemplate', { 
        name: result.poolName, 
        repeat: repeatText 
    });
    container.appendChild(poolInfo);
    
    // 显示每张牌（使用映射转换显示文本）
    result.cards.forEach((item, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        cardElement.style.animationDelay = `${index * 0.1}s`;
        
        // item.card 和 item.direction 都是中文，需要转换为显示文本
        const displayCardName = getDisplayCardName(item.card);
        const displayDirection = getDisplayDirection(item.direction);
        const isReversed = item.direction === '逆位';
        const cardEmoji = getCardEmoji(item.card);
        const directionEmoji = getDirectionEmoji(item.direction);
        
        cardElement.innerHTML = `
            <span class="card-name">${displayCardName}</span>
            <span class="card-direction ${isReversed ? 'reversed' : ''}">${displayDirection}</span>
        `;
        container.appendChild(cardElement);
    });
    
    // 滚动到结果区域顶部
    const answerSection = document.querySelector('.answer-section');
    answerSection.scrollTop = 0;
}

// 复制问题和回答到剪贴板
function copyResults() {
    if (!currentResult || !currentResult.cards || currentResult.cards.length === 0) {
        alert(window.i18n.t('noContentToCopy'));
        return;
    }
    
    let text = window.i18n.t('copyHeader');
    text += window.i18n.t('copyQuestionTemplate', { question: currentQuestion });
    text += '\n';
    text += window.i18n.t('copyAnswer');
    
    // 使用原始中文数据，根据当前语言转换显示
    currentResult.cards.forEach(item => {
        const displayCardName = getDisplayCardName(item.card);
        const displayDirection = getDisplayDirection(item.direction);
        text += `${displayCardName} - ${displayDirection}\n`;
    });
    
    // 复制到剪贴板
    navigator.clipboard.writeText(text).then(() => {
        const copyBtn = document.getElementById('copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = window.i18n.t('copySuccess');
        copyBtn.style.backgroundColor = '#7aa4a0';
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = '';
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert(window.i18n.t('copyFailed'));
    });
}

// 自动调整textarea高度
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// 更新语言按钮文本
function updateLanguageButton() {
    const languageBtn = document.getElementById('language-btn');
    const currentLang = window.i18n.getLanguage();
    languageBtn.textContent = currentLang === 'zh' ? 'EN' : '中文';
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 加载翻译数据
    await window.i18n.loadTranslations();
    
    // 绑定语言按钮
    const languageBtn = document.getElementById('language-btn');
    
    // 初始化语言（从localStorage读取或默认中文）
    const savedLang = localStorage.getItem('tarot-language') || 'zh';
    window.i18n.setLanguage(savedLang);
    updateLanguageButton();
    
    // 加载数据（只加载中文版作为基础）
    await loadTarotData();
    await loadEmojiData();
    await loadCardNameMapping();
    
    // 更新UI文本
    updateUITexts();
    
    // 绑定事件
    const drawBtn = document.getElementById('draw-btn');
    const questionInput = document.querySelector('.question-input');
    const copyBtn = document.getElementById('copy-btn');
    const defaultModeradio = document.getElementById('default-mode-radio');
    const advancedModeradio = document.getElementById('advanced-mode-radio');
    const advancedSettings = document.getElementById('advanced-settings');
    const cardCountModeSelect = document.getElementById('card-count-mode');
    const cardCountInputWrapper = document.getElementById('card-count-input-wrapper');
    const cardCountInput = document.getElementById('card-count-input');
    const poolSelect = document.getElementById('pool-select');
    const allowRepeatSelect = document.getElementById('allow-repeat-select');
    
    // 更新设置框的禁用状态
    function updateSettingsDisabled(disabled) {
        poolSelect.disabled = disabled;
        allowRepeatSelect.disabled = disabled;
        cardCountModeSelect.disabled = disabled;
        cardCountInput.disabled = disabled;
    }
    
    // 初始化：默认全自由模式，显示设置但禁用
    updateSettingsDisabled(true);
    advancedSettings.style.display = 'flex';
    
    // 默认全自由模式切换
    defaultModeradio.addEventListener('change', (e) => {
        if (e.target.checked) {
            advancedModeradio.checked = false;
            updateSettingsDisabled(true);
        }
    });
    
    // 高级模式切换
    advancedModeradio.addEventListener('change', (e) => {
        if (e.target.checked) {
            defaultModeradio.checked = false;
            updateSettingsDisabled(false);
        } else {
            defaultModeradio.checked = true;
            updateSettingsDisabled(true);
        }
    });
    
    // 牌数模式切换
    cardCountModeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'fixed' || e.target.value === 'random-range') {
            cardCountInputWrapper.style.display = 'block';
        } else {
            cardCountInputWrapper.style.display = 'none';
        }
        // 更新最大牌数限制
        const maxCount = getMaxCardCount();
        cardCountInput.setAttribute('max', maxCount);
    });
    
    // 卡池切换时更新最大牌数
    poolSelect.addEventListener('change', () => {
        const maxCount = getMaxCardCount();
        cardCountInput.setAttribute('max', maxCount);
    });
    
    // 牌数输入验证
    cardCountInput.addEventListener('input', (e) => {
        const maxCount = getMaxCardCount();
        const value = parseInt(e.target.value);
        if (value > maxCount) {
            e.target.setCustomValidity(window.i18n.t('cardCountCannotExceed', { count: maxCount }));
        } else if (value < 1) {
            e.target.setCustomValidity(window.i18n.t('cardCountMustBeGreaterThanZeroMsg'));
        } else {
            e.target.setCustomValidity('');
        }
    });
    
    // 语言切换事件
    languageBtn.addEventListener('click', async () => {
        const currentLang = window.i18n.getLanguage();
        const newLang = currentLang === 'zh' ? 'en' : 'zh';
        window.i18n.setLanguage(newLang);
        localStorage.setItem('tarot-language', newLang);
        
        // 更新UI文本
        updateUITexts();
        updateLanguageButton();
        
        // 如果有结果，重新显示（使用新的语言映射）
        if (currentResult) {
            displayResults(currentResult);
        } else {
            document.getElementById('answer-container').style.display = 'none';
        }
    });
    
    // 自动调整textarea高度
    autoResizeTextarea(questionInput);
    questionInput.addEventListener('input', () => {
        autoResizeTextarea(questionInput);
    });
    
    // 抽牌按钮事件
    drawBtn.addEventListener('click', performDraw);
    
    // 回车键抽牌（Ctrl+Enter 或 Cmd+Enter）
    questionInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            performDraw();
        }
    });
    
    // 复制按钮事件
    copyBtn.addEventListener('click', copyResults);
});
