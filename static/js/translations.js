// Система локализации для PoE предметов
const translations = {
    // Базовые типы предметов (примеры, можно расширить)
    baseTypes: {
        // Оружие
        'Vaal Rapier': 'Вальский рапир',
        'Siege Axe': 'Осадный топор',
        'Ornate Sword': 'Изысканный меч',
        'Judgement Staff': 'Посох правосудия',
        'Imperial Bow': 'Имперский лук',

        // Броня
        'Assassin\'s Garb': 'Наряд убийцы',
        'Vaal Regalia': 'Вальская мантия',
        'Astral Plate': 'Астральная пластина',
        'Dragonscale Boots': 'Ботинки из драконьей чешуи',
        'Sorcerer Boots': 'Ботинки чародея',
        'Titan Greaves': 'Поножи титана',
        'Murder Mitts': 'Рукавицы убийцы',
        'Spiked Gloves': 'Шипастые перчатки',
        'Fingerless Silk Gloves': 'Шёлковые перчатки без пальцев',
        'Hubris Circlet': 'Венец высокомерия',
        'Royal Burgonet': 'Королевский бургиньот',
        'Lion Pelt': 'Львиная шкура',

        // Украшения
        'Onyx Amulet': 'Ониксовый амулет',
        'Marble Amulet': 'Мраморный амулет',
        'Citrine Amulet': 'Цитриновый амулет',
        'Vermillion Ring': 'Киноварное кольцо',
        'Steel Ring': 'Стальное кольцо',
        'Opal Ring': 'Опаловое кольцо',
        'Two-Stone Ring': 'Кольцо из двух камней',
        'Leather Belt': 'Кожаный пояс',
        'Stygian Vise': 'Стигийский пояс',
        'Crystal Belt': 'Кристальный пояс',

        // Щиты
        'Titanium Spirit Shield': 'Титановый щит духа',
        'Archon Kite Shield': 'Архонтский каплевидный щит',
        'Crusader Buckler': 'Баклер крестоносца'
    },

    // Уникальные предметы (примеры)
    uniqueItems: {
        'Tabula Rasa': 'Табула Раса',
        'Shavronne\'s Wrappings': 'Покровы Шаврон',
        'Headhunter': 'Охотник за головами',
        'Mageblood': 'Кровь мага',
        'Ashes of the Stars': 'Прах звёзд',
        'Forbidden Shako': 'Запретное шако',
        'Prism Guardian': 'Призматический страж',
        'Crown of Eyes': 'Корона очей'
    },

    // Моды (префиксы/суффиксы)
    mods: {
        // Жизнь
        'to maximum Life': 'к максимуму здоровья',
        'increased maximum Life': 'к максимуму здоровья',
        'to maximum Mana': 'к максимуму маны',
        'increased maximum Mana': 'к максимуму маны',

        // Сопротивления
        'to Fire Resistance': 'к сопротивлению огню',
        'to Cold Resistance': 'к сопротивлению холоду',
        'to Lightning Resistance': 'к сопротивлению молнии',
        'to Chaos Resistance': 'к сопротивлению хаосу',
        'to all Elemental Resistances': 'ко всем стихийным сопротивлениям',

        // Атрибуты
        'to Strength': 'к силе',
        'to Dexterity': 'к ловкости',
        'to Intelligence': 'к интеллекту',
        'to all Attributes': 'ко всем атрибутам',

        // Урон
        'increased Physical Damage': 'физического урона',
        'increased Spell Damage': 'урона заклинаниями',
        'increased Attack Speed': 'скорости атаки',
        'increased Cast Speed': 'скорости сотворения',
        'to Critical Strike Chance': 'к шансу критического удара',
        'to Critical Strike Multiplier': 'к множителю критического удара',

        // Другое
        'increased Movement Speed': 'к скорости передвижения',
        'increased Rarity of Items found': 'к редкости найденных предметов',
        'reduced Attribute Requirements': 'к требованиям атрибутов'
    }
};

// Функция для получения перевода
function getTranslation(text, category = 'baseTypes') {
    if (!text) return text;

    // Проверяем в указанной категории
    if (translations[category] && translations[category][text]) {
        return translations[category][text];
    }

    // Проверяем во всех категориях
    for (const cat in translations) {
        if (translations[cat][text]) {
            return translations[cat][text];
        }
    }

    // Если перевода нет, возвращаем оригинал
    return text;
}

// Функция для перевода модов (частичное совпадение)
function translateMod(modText) {
    if (!modText) return modText;

    let translated = modText;

    // Ищем частичные совпадения в модах
    for (const [eng, rus] of Object.entries(translations.mods)) {
        if (modText.includes(eng)) {
            translated = translated.replace(eng, rus);
        }
    }

    return translated;
}

// Экспортируем функции
window.getTranslation = getTranslation;
window.translateMod = translateMod;
window.translations = translations;
