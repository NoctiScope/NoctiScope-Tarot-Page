// 塔罗牌抽牌逻辑

let tarotData = null;
let emojiData = null;
let cardNameMapping = null;
let currentLang = 'zh';

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

// 根据语言转换牌名（中文 ↔ 英文）
function translateCardName(cardName, targetLang) {
    if (!cardNameMapping || !cardName) return cardName;
    if (targetLang === currentLang) return cardName; // 已经是目标语言，不需要转换
    
    const mapping = targetLang === 'zh' ? cardNameMapping.en_to_zh : cardNameMapping.zh_to_en;
    
    // 先尝试大阿尔克那
    if (mapping.major_arcana && mapping.major_arcana[cardName]) {
        return mapping.major_arcana[cardName];
    }
    
    // 尝试数字牌和宫廷牌（需要解析结构）
    for (const [zhSuit, enSuit] of Object.entries({
        '宝剑': 'Swords',
        '圣杯': 'Cups',
        '权杖': 'Wands',
        '星币': 'Pentacles'
    })) {
        const sourceSuit = currentLang === 'zh' ? zhSuit : enSuit;
        const targetSuit = targetLang === 'zh' ? zhSuit : enSuit;
        
        if (cardName.startsWith(sourceSuit)) {
            const rest = cardName.replace(sourceSuit, '');
            
            // 尝试数字
            if (mapping.numbers && mapping.numbers[rest]) {
                return targetSuit + mapping.numbers[rest];
            }
            
            // 尝试宫廷职位
            if (mapping.court_ranks && mapping.court_ranks[rest]) {
                return targetSuit + mapping.court_ranks[rest];
            }
        }
    }
    
    return cardName; // 如果找不到映射，返回原名称
}

// 获取牌面的emoji（支持中文和英文牌名）
function getCardEmoji(cardName) {
    if (!emojiData || !cardName) return '';
    
    // 先将英文牌名转换为中文（因为emoji映射基于中文）
    let zhCardName = cardName;
    if (currentLang === 'en' && cardNameMapping) {
        zhCardName = translateCardName(cardName, 'zh');
    }
    
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

// 获取方向的emoji（支持中文和英文方向）
function getDirectionEmoji(direction) {
    if (!emojiData) return '';
    
    // 如果方向是英文，先转换为中文
    let zhDirection = direction;
    if (currentLang === 'en' && cardNameMapping && cardNameMapping.en_to_zh) {
        const enToZh = cardNameMapping.en_to_zh.directions;
        if (enToZh && enToZh[direction]) {
            zhDirection = enToZh[direction];
        }
    }
    
    return emojiData.directions && emojiData.directions[zhDirection] || '';
}

// 加载塔罗牌数据
async function loadTarotData(language = 'zh') {
    try {
        currentLang = language;
        const fileName = language === 'zh' ? 'tarot-cn.json' : 'tarot.json';
        const response = await fetch(`data/${fileName}`);
        tarotData = await response.json();
        
        // 处理英文版的数据结构（嵌套对象转为扁平数组）
        if (language === 'en') {
            // number_cards是对象，需要扁平化
            if (typeof tarotData.number_cards === 'object' && !Array.isArray(tarotData.number_cards)) {
                tarotData.number_cards = [
                    ...(tarotData.number_cards.Cups || []),
                    ...(tarotData.number_cards.Pentacles || []),
                    ...(tarotData.number_cards.Swords || []),
                    ...(tarotData.number_cards.Wands || [])
                ];
            }
            // court_cards是对象，需要扁平化
            if (typeof tarotData.court_cards === 'object' && !Array.isArray(tarotData.court_cards)) {
                tarotData.court_cards = [
                    ...(tarotData.court_cards.Cups || []),
                    ...(tarotData.court_cards.Pentacles || []),
                    ...(tarotData.court_cards.Swords || []),
                    ...(tarotData.court_cards.Wands || [])
                ];
            }
        }
        
        return tarotData;
    } catch (error) {
        console.error('加载塔罗牌数据失败:', error);
        return null;
    }
}

// 初始化卡池映射关系
function initPoolMapping() {
    const numberCards = tarotData.number_cards;
    const courtCards = tarotData.court_cards;
    const minorArcana = [...numberCards, ...courtCards];
    const fullDeck = [...tarotData.major_arcana, ...minorArcana];

    // 使用i18n获取卡池名称
    const poolNames = {
        'zh': {
            1: "完整的78张牌池",
            2: "大阿尔克那22张牌池",
            3: "小阿尔克那56张牌池",
            4: "宫廷牌16张牌池",
            5: "数字牌40张牌池"
        },
        'en': {
            1: "Full 78-card Pool",
            2: "Major Arcana 22-card Pool",
            3: "Minor Arcana 56-card Pool",
            4: "Court Cards 16-card Pool",
            5: "Number Cards 40-card Pool"
        }
    };

    return {
        1: { name: poolNames[currentLang][1] || poolNames['zh'][1], cards: fullDeck },
        2: { name: poolNames[currentLang][2] || poolNames['zh'][2], cards: tarotData.major_arcana },
        3: { name: poolNames[currentLang][3] || poolNames['zh'][3], cards: minorArcana },
        4: { name: poolNames[currentLang][4] || poolNames['zh'][4], cards: courtCards },
        5: { name: poolNames[currentLang][5] || poolNames['zh'][5], cards: numberCards }
    };
}

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
        k = array.length; // 如果要求数量大于数组长度，则只取数组长度
    }
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, k);
}

// 抽牌函数
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
        // 固定牌数
        numCards = Math.min(Math.max(1, parseInt(cardCountValue) || 3), maxDeckSize);
    } else if (cardCountMode === 'random-range') {
        // 随机牌数阈值
        const maxValue = Math.min(Math.max(1, parseInt(cardCountValue) || 15), maxDeckSize);
        numCards = Math.floor(Math.random() * (maxValue - 1 + 1)) + 1;
    } else {
        // 默认随机牌数：3-15，但不超过卡池大小
        const maxCards = Math.min(maxDeckSize, 15);
        numCards = Math.floor(Math.random() * (maxCards - 3 + 1)) + 3;
    }

    // 根据是否允许重复选择不同的抽牌方法
    let drawnCards;
    if (allowRepeat) {
        drawnCards = randomChoices(targetDeck, numCards);
    } else {
        // 不允许重复时，不能超过卡池大小
        numCards = Math.min(numCards, maxDeckSize);
        drawnCards = randomSample(targetDeck, numCards);
    }

    // 给每张牌分配方向
    const directions = currentLang === 'zh' ? ["正位", "逆位"] : ["Upright", "Reversed"];
    const cardWithDirection = drawnCards.map(card => ({
        card: card,
        direction: directions[Math.floor(Math.random() * directions.length)]
    }));

    return {
        poolName: selectedPool.name,
        allowRepeat: allowRepeat,
        cards: cardWithDirection
    };
}

// 导出函数供HTML使用
window.tarot = {
    loadTarotData,
    loadEmojiData,
    loadCardNameMapping,
    drawCards,
    initPoolMapping,
    getCardEmoji,
    getDirectionEmoji,
    translateCardName
};
