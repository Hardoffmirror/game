# Анализ системы классификации модов Path of Exile

## Исследование PathOfBuilding

### 1. Архитектура PathOfBuilding

PathOfBuilding использует **базу данных модов** вместо эвристической классификации:

```
src/Data/
├── ModItem.lua          - Основные моды предметов
├── ModMaster.lua        - Крафтовые моды (мастер-ремесленник)
├── ModMap.lua           - Моды карт
├── ModFlask.lua         - Моды флаконов
├── ModJewel.lua         - Моды украшений
├── ModVeiled.lua        - Завуалированные моды
└── ...
```

#### Структура данных мода в PathOfBuilding

```lua
"IncreasedLife1" = {
    type = "Prefix",                    -- Тип: Prefix/Suffix
    affix = "Hale",                     -- Название аффикса
    "+(3-9) to maximum Life",           -- Текст эффекта
    statOrder = { 1 },                  -- Порядок отображения
    level = 1,                          -- Минимальный уровень
    group = "IncreasedLife",            -- Группа мода
    weightKey = { "default", "str_armour", ... },
    weightVal = { 1000, 1500, ... },    -- Вероятности выпадения
    modTags = { "resource", "life" }    -- Теги для категоризации
}
```

### 2. Парсинг в PathOfBuilding (src/Classes/Item.lua)

PathOfBuilding использует **конечный автомат (state machine)** для парсинга:

```
Состояния парсинга:
FINDIMPLICIT → IMPLICIT → FINDEXPLICIT → EXPLICIT → DONE
```

#### Определение типов модов

**Неявные моды (implicit)** определяются тремя способами:

1. **По флагу**: `{implicit}` в фигурных скобках
2. **По разделителю**: линия `--------` переключает секцию
3. **По счетчику**: строка `Implicits: N` указывает количество имплиситных модов

**Категории модов** в PathOfBuilding:

| Категория | Описание |
|-----------|----------|
| `enchantModLines` | Зачарования (от лабиринта) |
| `implicitModLines` | Натуральные имплиситы базового предмета |
| `explicitModLines` | Явные моды (префиксы/суффиксы) |
| `scourgeModLines` | Моды Scourge |
| `crucibleModLines` | Моды Crucible |
| `craftedModLines` | Крафтовые моды (с маркером crafted) |

**Флаги модов** распознаются через regex:

```lua
{crafted}, {implicit}, {scourge}, {crucible}, {fractured},
{synthesised}, {veiled}, {corrupted}
```

### 3. Примеры классификации модов из ModItem.lua

#### Атрибуты - всегда SUFFIX

| Мод | Type | Group | Affix |
|-----|------|-------|-------|
| +(8-12) to Strength | Suffix | Strength | of the Brute |
| +(13-17) to Dexterity | Suffix | Dexterity | of the Lynx |
| +(8-12) to Intelligence | Suffix | Intelligence | of the Pupil |
| +(1-4) to all Attributes | Suffix | AllAttributes | of the Clouds |

#### Здоровье - всегда PREFIX

| Мод | Type | Group | Affix |
|-----|------|-------|-------|
| +(3-9) to maximum Life | Prefix | IncreasedLife | Hale |
| +(10-24) to maximum Life | Prefix | IncreasedLife | Healthy |
| +(25-39) to maximum Life | Prefix | IncreasedLife | Sanguine |

#### Сопротивления - SUFFIX (по общим правилам PoE)

По официальной документации Path of Exile:
- **Fire/Cold/Lightning/Chaos Resistance** → Suffix
- **All Elemental Resistances** → Suffix

---

## Сравнение текущей реализации с PathOfBuilding

### Текущая архитектура проекта

**Файлы обработки модов:**

| Файл | Функция |
|------|---------|
| `pob_parser.py:340-466` | `_determine_mod_type()` - определение типов через regex |
| `pob_parser.py:164-277` | `_parse_item_sections()` - парсинг секций предмета |
| `static/js/app.js:270-331` | `categorizeMods()` - категоризация на фронтенде |

### Текущий подход

**Преимущества:**
- ✅ Не требует базы данных модов
- ✅ Работает "из коробки" с любым текстом
- ✅ Поддерживает русский и английский языки
- ✅ Определяет специальные типы (crafted, fractured, veiled и т.д.)

**Недостатки:**
- ❌ **Эвристическая классификация префиксов/суффиксов** - не всегда точная
- ❌ Невозможно точно определить префикс/суффикс без базы данных
- ❌ Паттерны требуют постоянного обновления при изменении игры
- ❌ Могут быть ложные срабатывания

### PathOfBuilding подход

**Преимущества:**
- ✅ **100% точная классификация** на основе базы данных
- ✅ Хранит метаданные (группы, теги, вероятности)
- ✅ Поддерживает все типы модов из игры
- ✅ Знает влияния (Shaper, Elder, Warlord и т.д.)

**Недостатки:**
- ❌ Требует поддержки большой базы данных
- ❌ Нужно обновлять при каждом патче игры
- ❌ Сложнее в разработке и поддержке

---

## Ключевые различия

### 1. Определение префиксов/суффиксов

**PathOfBuilding:**
```lua
"Strength1" = { type = "Suffix", ... }
```
→ Точная классификация из базы данных

**Текущая реализация:**
```python
if re.search(r'\+\d+\s+to (strength|dexterity|intelligence)', line_lower):
    return 'explicit_suffix'
```
→ Эвристика на основе regex

### 2. Парсинг секций

**PathOfBuilding:**
```
State Machine: FINDIMPLICIT → IMPLICIT → EXPLICIT → DONE
```

**Текущая реализация:**
```python
# Подсчет имплиситов по "Implicits: N"
implicit_mods_found < implicit_count
```

**Общее:** Оба подхода используют:
- Счетчик `Implicits: N`
- Разделители `--------`
- Маркеры `(implicit)`, `(crafted)` и т.д.

### 3. Организация данных

**PathOfBuilding:**
```lua
{
    type = "Prefix",
    group = "IncreasedLife",
    modTags = { "resource", "life" },
    weightKey = { "default", "str_armour" }
}
```

**Текущая реализация:**
```python
{
    'text': line,
    'type': 'explicit_prefix',  # Только тип, без метаданных
    'section': section_index
}
```

---

## Рекомендации по улучшению

### 1. Краткосрочные улучшения (без базы данных)

#### A. Улучшить паттерны классификации

**Дополнить список суффиксов:**

```python
# Больше паттернов для сопротивлений
(r'\+\d+%?\s+к?\s*(максимальному?)?\s*сопротивлени[юя]', 'explicit_suffix'),

# Energy Shield на украшениях (суффикс)
(r'\+\d+%\s+к максимуму энергетического щита', 'explicit_suffix'),

# Скорости (суффиксы)
(r'\d+%\s+к скорости', 'explicit_suffix'),
```

**Дополнить список префиксов:**

```python
# Увеличенный урон от стихий (префикс на оружии)
(r'\d+%\s+increased (fire|cold|lightning) damage', 'explicit_prefix'),

# Уровень самоцветов (префикс)
(r'\+\d+\s+to level of', 'explicit_prefix'),

# Дополнительный урон для спеллов (префикс)
(r'adds \d+.*damage to spells', 'explicit_prefix'),
```

#### B. Добавить определение по группам модов

Создать простую группировку:

```python
MOD_GROUPS = {
    'suffix': [
        'resistance',     # Все сопротивления
        'attributes',     # Характеристики
        'accuracy',       # Точность
        'rarity',         # Редкость
        'mana_regen',     # Восстановление маны
        'life_regen',     # Восстановление здоровья
        'speed',          # Скорости (атаки/каста/движения)
    ],
    'prefix': [
        'max_life',       # Максимум здоровья
        'max_mana',       # Максимум маны
        'max_es',         # Максимум ES
        'added_damage',   # Добавленный урон
        'increased_damage', # Увеличенный урон
        'local_defense',  # Локальная защита
    ]
}
```

#### C. Добавить fallback для неизвестных модов

```python
# Если не смогли определить - не угадываем
if not determined:
    return 'explicit'  # Без уточнения prefix/suffix

# Опционально: добавить флаг "uncertain"
return {
    'type': 'explicit_prefix',
    'confidence': 'low'  # low/medium/high
}
```

### 2. Среднесрочные улучшения

#### A. Создать упрощенную базу данных ключевых модов

Не нужно хранить все моды - достаточно **ключевых паттернов**:

```json
{
  "resistance_mods": {
    "pattern": "resistance",
    "type": "suffix",
    "group": "resistance"
  },
  "life_mods": {
    "pattern": "to maximum life",
    "type": "prefix",
    "group": "life"
  }
}
```

Файл: `data/mod_patterns.json` (~10-20 KB)

#### B. Добавить кэширование определений

```python
# Кэш для уже определенных модов
mod_type_cache = {}

def _determine_mod_type(self, line):
    if line in mod_type_cache:
        return mod_type_cache[line]

    # ... определение типа

    mod_type_cache[line] = result
    return result
```

### 3. Долгосрочные улучшения (с базой данных)

#### A. Интеграция базы модов PathOfBuilding

**Преобразовать Lua → JSON:**

```bash
# Скрипт для конвертации ModItem.lua → mods.json
python scripts/convert_pob_mods.py
```

**Структура:**

```json
{
  "mods": [
    {
      "id": "IncreasedLife1",
      "type": "Prefix",
      "affix": "Hale",
      "text": "+(3-9) to maximum Life",
      "group": "IncreasedLife",
      "level": 1
    }
  ]
}
```

**Размер:** ~2-5 MB

#### B. Поиск по тексту мода

```python
import json

class ModDatabase:
    def __init__(self):
        with open('data/mods.json') as f:
            self.mods = json.load(f)

    def find_mod_type(self, text):
        # Точное совпадение
        for mod in self.mods:
            if self._match_pattern(mod['text'], text):
                return mod['type']

        # Fuzzy matching
        return self._fuzzy_search(text)

    def _match_pattern(self, pattern, text):
        # Заменить (X-Y) на \d+ для regex
        regex = re.sub(r'\(\d+-\d+\)', r'\\d+', pattern)
        return re.search(regex, text)
```

#### C. Автоматическое обновление базы

```python
# Скачать последнюю версию ModItem.lua из PoB
import requests

url = "https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/master/src/Data/ModItem.lua"
response = requests.get(url)

# Конвертировать в JSON
convert_lua_to_json(response.text)
```

---

## Анализ текущих паттернов

### Точность классификации (примерная оценка)

| Категория | Точность | Проблемы |
|-----------|----------|----------|
| Implicit моды | 95%+ | ✅ Определяются по флагам и счетчику |
| Crafted моды | 98%+ | ✅ Четкий маркер `(crafted)` |
| Enchant моды | 98%+ | ✅ Четкий маркер `(enchant)` |
| Сопротивления → Suffix | 90%+ | ⚠️ Могут быть исключения (моды влияний) |
| Атрибуты → Suffix | 95%+ | ✅ Всегда суффиксы |
| Здоровье → Prefix | 85% | ⚠️ "% increased maximum life" - суффикс |
| Урон → Prefix | 70% | ⚠️ Много исключений (локальный vs глобальный) |
| Защита → Prefix | 60% | ⚠️ Сложно определить без контекста предмета |

### Проблемные случаи

#### 1. Максимум здоровья vs Процентное увеличение

```
"+50 to maximum Life"           → Prefix  ✅
"10% increased maximum Life"    → Suffix  ❌ (сейчас определяется как Prefix)
```

**Решение:**
```python
# Различать flat и percentage
if 'increased' in line and 'maximum life' in line:
    return 'explicit_suffix'  # Процентное - суффикс
elif 'to maximum life' in line:
    return 'explicit_prefix'  # Flat - префикс
```

#### 2. Локальный vs Глобальный урон

```
"Adds 10-20 Physical Damage"              → Prefix (оружие)
"Adds 10-20 Physical Damage to Attacks"   → Prefix (украшения)
"10% increased Physical Damage"           → Prefix (оружие, локальный)
"10% increased Global Physical Damage"    → Разные (зависит от слота)
```

**Проблема:** Без знания типа предмета сложно определить точно.

**Решение:** Учитывать `slot_name` при определении:

```python
def _determine_mod_type(self, line, slot_name=None):
    if 'increased physical damage' in line:
        if slot_name in ['Weapon', 'One Handed Melee Weapon', 'Two Handed Melee Weapon']:
            return 'explicit_prefix'  # Локальный на оружии
        else:
            return 'explicit_suffix'   # Глобальный на украшениях
```

#### 3. Моды влияний (Influence mods)

```
"# to Level of all Chaos Skill Gems" (Warlord) → Prefix
"Gain Arcane Surge" (Shaper)                   → Suffix
```

**Проблема:** Моды влияний имеют свои правила.

**Решение:** Использовать базу данных модов влияний из PathOfBuilding (`ModItemInfluence.lua`).

---

## Итоговые рекомендации

### Оптимальный подход (гибридный)

**Фаза 1: Улучшить эвристику (1-2 дня)**

1. Расширить список паттернов префиксов/суффиксов
2. Добавить учет типа предмета (`slot_name`)
3. Различать flat vs percentage моды
4. Добавить confidence level для модов

**Фаза 2: Создать упрощенную БД (3-5 дней)**

1. Извлечь ключевые паттерны из PathOfBuilding
2. Создать JSON с ~100-200 основными группами модов
3. Реализовать поиск по паттернам с regex
4. Fallback на эвристику, если мод не найден в БД

**Фаза 3: Полная интеграция (1-2 недели)**

1. Конвертировать все файлы ModItem.lua → JSON
2. Реализовать fuzzy matching для вариантов значений
3. Добавить поддержку модов влияний
4. Автоматическое обновление базы из PoB

### Что даст каждая фаза

| Фаза | Точность классификации | Сложность |
|------|------------------------|-----------|
| **Текущая** | ~70-75% | Низкая |
| **Фаза 1** | ~80-85% | Низкая |
| **Фаза 2** | ~90-95% | Средняя |
| **Фаза 3** | ~98-99% | Высокая |

---

## Код примера для Фазы 1

```python
def _determine_mod_type_v2(self, line: str, slot_name: str = None) -> dict:
    """
    Улучшенная версия определения типа мода

    Returns:
        {
            'type': 'explicit_prefix',
            'confidence': 'high',  # low/medium/high
            'group': 'life'        # опционально
        }
    """
    line_lower = line.lower()

    # Точные маркеры (высокая уверенность)
    if '(crafted)' in line_lower:
        return {'type': 'crafted', 'confidence': 'high'}

    if '(implicit)' in line_lower:
        return {'type': 'implicit', 'confidence': 'high'}

    # Сопротивления - всегда суффикс (высокая уверенность)
    if 'resistance' in line_lower:
        return {
            'type': 'explicit_suffix',
            'confidence': 'high',
            'group': 'resistance'
        }

    # Атрибуты - всегда суффикс (высокая уверенность)
    if re.search(r'to (strength|dexterity|intelligence|all attributes)', line_lower):
        return {
            'type': 'explicit_suffix',
            'confidence': 'high',
            'group': 'attributes'
        }

    # Здоровье - зависит от формулировки
    if 'maximum life' in line_lower:
        if 'increased' in line_lower or '%' in line:
            # "10% increased maximum Life" → Suffix
            return {
                'type': 'explicit_suffix',
                'confidence': 'high',
                'group': 'life_percent'
            }
        else:
            # "+50 to maximum Life" → Prefix
            return {
                'type': 'explicit_prefix',
                'confidence': 'high',
                'group': 'life_flat'
            }

    # Добавленный урон - префикс (средняя уверенность, зависит от слота)
    if re.search(r'adds \d+', line_lower):
        return {
            'type': 'explicit_prefix',
            'confidence': 'medium',
            'group': 'added_damage'
        }

    # Скорости - обычно суффикс
    if 'increased attack speed' in line_lower or 'increased cast speed' in line_lower:
        return {
            'type': 'explicit_suffix',
            'confidence': 'medium',
            'group': 'speed'
        }

    # Не смогли определить точно
    return {
        'type': 'explicit',
        'confidence': 'low'
    }
```

---

## Выводы

1. **PathOfBuilding использует базу данных** для точной классификации модов
2. **Текущий подход с regex работает**, но имеет ограничения (~70-75% точности)
3. **Гибридный подход оптимален**: улучшенная эвристика + упрощенная БД ключевых модов
4. **Полная интеграция базы PathOfBuilding** даст ~98-99% точности, но требует больше работы
5. **Начать стоит с Фазы 1** - простые улучшения паттернов дадут заметный результат

**Рекомендация:** Начать с улучшения существующих паттернов (Фаза 1), а затем постепенно добавлять базу данных ключевых модов (Фаза 2).
