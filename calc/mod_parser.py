"""
ModParser - Парсер модификаторов
Конвертирует текстовые описания модов в структурированные данные
"""
import re
from typing import List, Tuple, Optional, Dict
from calc.mod_db import ModDB, ModType, ModFlag


class ModParser:
    """Парсер модификаторов из текстовых описаний"""

    # Паттерны для извлечения значений и определения типа мода
    # Формат: (pattern, mod_type, multiplier, value_group_index)
    PATTERNS = [
        # Percentage modifiers - INC/RED
        (r'^(\d+)%\s+increased\s+(.+)', ModType.INC, 1.0, 0),
        (r'^(\d+)%\s+reduced\s+(.+)', ModType.INC, -1.0, 0),

        # More/Less modifiers - MORE
        (r'^(\d+)%\s+more\s+(.+)', ModType.MORE, 1.0, 0),
        (r'^(\d+)%\s+less\s+(.+)', ModType.MORE, -1.0, 0),

        # Flat additions - BASE (with + sign)
        (r'^\+(\d+)\s+to\s+(.+)', ModType.BASE, 1.0, 0),
        (r'^\+(\d+)\s+(.+)', ModType.BASE, 1.0, 0),

        # Flat values without sign
        (r'^(\d+)\s+to\s+(.+)', ModType.BASE, 1.0, 0),

        # Regeneration - BASE
        (r'^([0-9.]+)\s+(.+)\s+regenerated per second', ModType.BASE, 1.0, 0),

        # Resistance modifiers
        (r'^\+?(\d+)%\s+to\s+(.+)\s+resistance', ModType.BASE, 1.0, 0),
    ]

    # Mapping от текстового описания к каноническому имени стата
    STAT_NAMES = {
        # Attributes
        'strength': 'Str',
        'dexterity': 'Dex',
        'intelligence': 'Int',
        'all attributes': 'Attr',

        # Life
        'maximum life': 'Life',
        'max life': 'Life',
        'life': 'Life',

        # Energy Shield
        'maximum energy shield': 'EnergyShield',
        'max energy shield': 'EnergyShield',
        'energy shield': 'EnergyShield',

        # Mana
        'maximum mana': 'Mana',
        'max mana': 'Mana',
        'mana': 'Mana',

        # Resistances
        'fire resistance': 'FireResist',
        'cold resistance': 'ColdResist',
        'lightning resistance': 'LightningResist',
        'chaos resistance': 'ChaosResist',
        'all elemental resistances': 'ElementalResist',
        'elemental resistances': 'ElementalResist',
        'all resistances': 'AllResist',

        # Defence
        'armour': 'Armour',
        'evasion rating': 'Evasion',
        'evasion': 'Evasion',

        # Damage
        'physical damage': 'PhysicalDamage',
        'fire damage': 'FireDamage',
        'cold damage': 'ColdDamage',
        'lightning damage': 'LightningDamage',
        'chaos damage': 'ChaosDamage',
        'elemental damage': 'ElementalDamage',
        'spell damage': 'SpellDamage',

        # Speed
        'attack speed': 'AttackSpeed',
        'cast speed': 'CastSpeed',
        'movement speed': 'MovementSpeed',

        # Crit
        'critical strike chance': 'CritChance',
        'global critical strike chance': 'CritChance',
        'critical strike multiplier': 'CritMultiplier',

        # Accuracy
        'accuracy rating': 'Accuracy',
        'accuracy': 'Accuracy',
    }

    # Флаги для различных типов модов
    STAT_FLAGS = {
        'PhysicalDamage': ModFlag.PHYSICAL,
        'FireDamage': ModFlag.FIRE,
        'ColdDamage': ModFlag.COLD,
        'LightningDamage': ModFlag.LIGHTNING,
        'ChaosDamage': ModFlag.CHAOS,
        'Armour': ModFlag.ARMOUR,
        'Evasion': ModFlag.EVASION,
        'EnergyShield': ModFlag.ENERGY_SHIELD,
    }

    @classmethod
    def parse_mod_line(cls, line: str, source: str = "") -> List[Tuple[str, ModType, float, int]]:
        """
        Парсит одну строку мода

        Args:
            line: Текст мода (например, "+50 to maximum Life")
            source: Источник мода (для отладки)

        Returns:
            Список кортежей (stat_name, mod_type, value, flags)
        """
        line = line.strip()
        line_lower = line.lower()

        # Убираем теги из Path of Building
        line_clean = re.sub(r'\{[^}]+\}', '', line).strip()
        line_clean_lower = line_clean.lower()

        results = []

        # Пытаемся сопоставить с паттернами
        for pattern, mod_type, multiplier, value_idx in cls.PATTERNS:
            match = re.match(pattern, line_clean_lower, re.IGNORECASE)
            if match:
                # Извлекаем значение из указанной группы
                groups = match.groups()
                value_str = groups[value_idx]

                # Находим описание стата (последняя группа)
                stat_text = groups[-1].strip()

                try:
                    value = float(value_str) * multiplier
                except (ValueError, TypeError):
                    continue

                # Преобразуем описание в каноническое имя
                stat_names = cls._map_stat_name(stat_text)

                for stat_name in stat_names:
                    flags = cls.STAT_FLAGS.get(stat_name, 0)
                    results.append((stat_name, mod_type, value, flags))

                break  # Нашли совпадение, выходим

        return results

    @classmethod
    def _map_stat_name(cls, text: str) -> List[str]:
        """
        Преобразует текстовое описание стата в канонические имена

        Args:
            text: Текстовое описание (например, "maximum life")

        Returns:
            Список канонических имён статов
        """
        text_lower = text.lower().strip()

        # Прямое совпадение
        if text_lower in cls.STAT_NAMES:
            stat_name = cls.STAT_NAMES[text_lower]

            # Обрабатываем особые случаи
            if stat_name == 'ElementalResist':
                # Elemental Resist применяется ко всем элементальным сопротивлениям
                return ['FireResist', 'ColdResist', 'LightningResist']
            elif stat_name == 'AllResist':
                # All Resistances включает и chaos
                return ['FireResist', 'ColdResist', 'LightningResist', 'ChaosResist']
            elif stat_name == 'Attr':
                # All Attributes
                return ['Str', 'Dex', 'Int']
            else:
                return [stat_name]

        # Специальная обработка resistance (когда паттерн выделил только "fire" вместо "fire resistance")
        if text_lower in ['fire', 'cold', 'lightning', 'chaos']:
            return [text_lower.capitalize() + 'Resist']

        # Частичное совпадение (ищем ключевые слова)
        for key, stat_name in cls.STAT_NAMES.items():
            if key in text_lower:
                if stat_name == 'ElementalResist':
                    return ['FireResist', 'ColdResist', 'LightningResist']
                elif stat_name == 'AllResist':
                    return ['FireResist', 'ColdResist', 'LightningResist', 'ChaosResist']
                elif stat_name == 'Attr':
                    return ['Str', 'Dex', 'Int']
                else:
                    return [stat_name]

        # Не нашли - возвращаем как есть
        return [text_lower]

    @classmethod
    def parse_item_mods(cls, item_data: Dict, mod_db: ModDB, source: str = "Item") -> None:
        """
        Парсит все моды предмета и добавляет их в ModDB

        Args:
            item_data: Данные предмета из парсера
            mod_db: База данных модификаторов
            source: Источник (для отладки)
        """
        # Создаём уникальный источник для каждого предмета
        item_source = f"{source}: {item_data.get('name', 'Unknown')}"

        # Парсим все типы модов
        all_mods = []
        all_mods.extend(item_data.get('implicits', []))
        all_mods.extend(item_data.get('explicits', []))
        all_mods.extend(item_data.get('prefixes', []))
        all_mods.extend(item_data.get('suffixes', []))
        all_mods.extend(item_data.get('crafted_mods', []))
        all_mods.extend(item_data.get('enchant_mods', []))
        all_mods.extend(item_data.get('fractured_mods', []))

        # Парсим каждый мод
        for mod_info in all_mods:
            mod_text = mod_info.get('text', '')
            if not mod_text:
                continue

            # Парсим строку мода
            parsed = cls.parse_mod_line(mod_text, item_source)

            # Добавляем в ModDB
            for stat_name, mod_type, value, flags in parsed:
                mod_db.add(
                    name=stat_name,
                    mod_type=mod_type,
                    value=value,
                    flags=flags,
                    source=item_source
                )

    @classmethod
    def parse_items(cls, items: List[Dict], mod_db: ModDB) -> None:
        """
        Парсит список предметов

        Args:
            items: Список предметов
            mod_db: База данных модификаторов
        """
        for item in items:
            cls.parse_item_mods(item, mod_db, source="Equipment")
