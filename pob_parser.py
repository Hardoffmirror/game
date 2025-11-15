"""
PoB Build Parser
Парсит билды из Path of Building с правильным различием Gems vs Jewels
"""

import base64
import re
import zlib
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional


class PoBParser:
    """Парсер для билдов Path of Building"""

    def __init__(self, build_code: str):
        """
        Инициализация парсера

        Args:
            build_code: Закодированный код билда из PoB
        """
        self.build_code = build_code.strip()
        self.xml_data = None
        self.root = None

    def decode_build(self) -> str:
        """
        Декодирует билд код в XML

        Returns:
            XML строка с данными билда
        """
        try:
            decoded = base64.urlsafe_b64decode(self.build_code)
            decompressed = zlib.decompress(decoded)
            xml_string = decompressed.decode('utf-8')
            return xml_string
        except Exception as e:
            raise ValueError(f"Ошибка декодирования билда: {e}")

    def parse(self) -> None:
        """Парсит XML данные билда"""
        self.xml_data = self.decode_build()
        self.root = ET.fromstring(self.xml_data)

    def get_build_info(self) -> Dict:
        """Получает общую информацию о билде"""
        if self.root is None:
            raise ValueError("Билд не был распарсен.")

        build_elem = self.root.find('Build')
        info = {
            'level': build_elem.get('level', 'Unknown') if build_elem is not None else 'Unknown',
            'className': build_elem.get('className', 'Unknown') if build_elem is not None else 'Unknown',
            'ascendClassName': build_elem.get('ascendClassName', 'None') if build_elem is not None else 'None',
        }
        return info

    def get_items(self) -> Dict[str, List[Dict]]:
        """
        Извлекает ВСЕ предметы из билда, разделяя их по категориям

        Returns:
            Словарь с категориями: equipment, jewels, flasks
        """
        if self.root is None:
            raise ValueError("Билд не был распарсен.")

        equipment = []  # Оружие, броня, украшения
        jewels = []     # Самоцветы (Jewels)
        flasks = []     # Фласки

        items_section = self.root.find('Items')
        if items_section is None:
            return {'equipment': equipment, 'jewels': jewels, 'flasks': flasks}

        # Собираем все слоты
        all_slots = []

        # Слоты из основной секции
        for slot in items_section.findall('Slot'):
            all_slots.append(slot)

        # Слоты из ItemSet (если есть несколько сетов)
        for item_set in items_section.findall('ItemSet'):
            for slot in item_set.findall('Slot'):
                all_slots.append(slot)

        # Обрабатываем каждый слот
        processed_item_ids = set()
        for slot in all_slots:
            slot_name = slot.get('name', 'Unknown')
            item_id = slot.get('itemId')

            if not item_id or item_id in processed_item_ids:
                continue

            processed_item_ids.add(item_id)

            # Находим предмет по ID (проверяем как в основной секции, так и в ItemSet)
            item_element = items_section.find(f"./Item[@id='{item_id}']")

            # Если не найден в основной секции, ищем в ItemSet
            if item_element is None:
                for item_set in items_section.findall('ItemSet'):
                    item_element = item_set.find(f".//Item[@id='{item_id}']")
                    if item_element is not None:
                        break

            # Если всё равно не найден, пропускаем
            if item_element is None:
                continue

            # Парсим предмет
            item_data = self._parse_item(item_element, slot_name)

            # Определяем категорию предмета
            item_type = item_data.get('item_type', '').lower()
            slot_lower = slot_name.lower()
            name_lower = item_data.get('name', '').lower()

            # Проверяем jewels (самоцветы) - по типу, слоту или названию
            if ('jewel' in item_type or 'jewel' in slot_lower or 'jewel' in name_lower):
                jewels.append(item_data)
            # Проверяем flasks (флаконы) - по типу, слоту или названию
            elif ('flask' in item_type or 'flask' in slot_lower or 'flask' in name_lower):
                flasks.append(item_data)
            else:
                # Это обычная экипировка
                equipment.append(item_data)

        return {
            'equipment': equipment,
            'jewels': jewels,
            'flasks': flasks
        }

    def _parse_item(self, item_element: ET.Element, slot_name: str) -> Dict:
        """
        Парсит отдельный предмет (Item) с разделением модов на префиксы и суффиксы

        Args:
            item_element: XML элемент предмета
            slot_name: Название слота

        Returns:
            Словарь с данными предмета
        """
        item_text = item_element.text or ""
        lines = [line.strip() for line in item_text.split('\n') if line.strip()]

        # Парсим структуру предмета
        rarity = "NORMAL"
        name = "Unknown"
        base_type = ""
        implicits = []
        explicits = []
        prefixes = []
        suffixes = []
        crafted_mods = []
        enchant_mods = []
        fractured_mods = []
        other_mods = []
        properties = {}
        requirements = {}
        corrupted = False
        mirrored = False

        # Для разбора модов
        current_section = None
        implicit_count = 0
        implicit_read = 0

        i = 0
        while i < len(lines):
            line = lines[i]

            # Rarity
            if line.startswith('Rarity:'):
                rarity = line.replace('Rarity:', '').strip().upper()
                i += 1
                continue

            # Название предмета (после Rarity)
            if rarity != "NORMAL" and (not name or name == "Unknown"):
                name = line
                i += 1
                # Следующая строка может быть base type для rare/magic
                if i < len(lines) and not lines[i].startswith('---') and not lines[i].startswith('Rarity:'):
                    base_type = lines[i]
                    i += 1
                continue

            # Для normal предметов название = base type
            if rarity == "NORMAL" and (not name or name == "Unknown"):
                name = line
                base_type = line
                i += 1
                continue

            # Разделители секций
            if line.startswith('---'):
                current_section = "separator"
                i += 1
                continue

            # Corrupted
            if line.lower() in ['corrupted', 'осквернено']:
                corrupted = True
                i += 1
                continue

            # Mirrored
            if line.lower() in ['mirrored', 'зеркальный']:
                mirrored = True
                i += 1
                continue

            # Implicits
            if line.startswith('Implicits:'):
                try:
                    implicit_count = int(line.split(':')[1].strip())
                    current_section = "implicits"
                    implicit_read = 0
                    i += 1
                except:
                    i += 1
                continue

            # Читаем имплициты
            if current_section == "implicits" and implicit_read < implicit_count:
                # Проверяем на специальные моды
                if '{fractured}' in line.lower():
                    fractured_mods.append(self._parse_mod_line(line))
                else:
                    implicits.append(self._parse_mod_line(line))
                implicit_read += 1
                if implicit_read >= implicit_count:
                    current_section = "explicits"  # Переходим к эксплицитам
                i += 1
                continue

            # Свойства (Physical Damage, Elemental Damage, Critical Strike Chance, etc.)
            if ':' in line and any(kw in line for kw in [
                'Physical Damage:', 'Elemental Damage:', 'Chaos Damage:',
                'Critical Strike Chance:', 'Attacks per Second:', 'Weapon Range:',
                'Armour:', 'Evasion Rating:', 'Energy Shield:', 'Ward:',
                'Block:', 'Quality:', 'Sockets:', 'Item Level:',
                'Unique ID:', 'Radius:', 'Limited to:'
            ]) and not line.startswith('{'):
                key, value = line.split(':', 1)
                properties[key.strip()] = value.strip()
                i += 1
                continue

            # Requirements
            if line.startswith('Requirements:'):
                i += 1
                # Читаем следующие строки как requirements
                while i < len(lines) and not lines[i].startswith('---'):
                    req_line = lines[i]
                    if ':' in req_line:
                        key, value = req_line.split(':', 1)
                        requirements[key.strip()] = value.strip()
                        i += 1
                    else:
                        break
                continue

            # Специальные моды с тегами
            if line.startswith('{'):
                mod_info = self._parse_mod_line(line)

                # Определяем тип мода по тегу
                line_lower = line.lower()
                if '{crafted}' in line_lower or '{custom}' in line_lower:
                    crafted_mods.append(mod_info)
                elif '{enchant}' in line_lower:
                    enchant_mods.append(mod_info)
                elif '{fractured}' in line_lower:
                    fractured_mods.append(mod_info)
                else:
                    # Проверяем на prefix/suffix в тегах
                    if self._is_prefix_from_tags(line):
                        prefixes.append(mod_info)
                    elif self._is_suffix_from_tags(line):
                        suffixes.append(mod_info)
                    else:
                        explicits.append(mod_info)
                i += 1
                continue

            # Остальные строки - это explicit моды (после имплицитов или разделителя)
            # Также обрабатываем строки, которые выглядят как моды, но не были обработаны выше
            if current_section in ["separator", "explicits"]:
                if line and not line.startswith('---'):
                    mod_info = self._parse_mod_line(line)
                    # Пытаемся определить prefix/suffix
                    if self._is_likely_prefix(line):
                        prefixes.append(mod_info)
                    elif self._is_likely_suffix(line):
                        suffixes.append(mod_info)
                    else:
                        explicits.append(mod_info)
                i += 1
                continue

            # Если у нас есть название и база, и строка не пустая и не служебная
            # то это вероятно мод (для предметов без разделителей, например jewels)
            if (name and name != "Unknown" and base_type and
                line and not line.startswith('---') and
                not line.startswith('Rarity:') and
                ':' not in line):  # Это не свойство
                # Переводим в секцию эксплицитов если ещё не перешли
                if current_section is None:
                    current_section = "explicits"

                mod_info = self._parse_mod_line(line)
                # Пытаемся определить prefix/suffix
                if self._is_likely_prefix(line):
                    prefixes.append(mod_info)
                elif self._is_likely_suffix(line):
                    suffixes.append(mod_info)
                else:
                    explicits.append(mod_info)
                i += 1
                continue

            i += 1

        return {
            'slot': slot_name,
            'rarity': rarity,
            'name': name,
            'base_type': base_type,
            'item_type': base_type,
            'implicits': implicits,
            'explicits': explicits,
            'prefixes': prefixes,
            'suffixes': suffixes,
            'crafted_mods': crafted_mods,
            'enchant_mods': enchant_mods,
            'fractured_mods': fractured_mods,
            'other_mods': other_mods,
            'properties': properties,
            'requirements': requirements,
            'corrupted': corrupted,
            'mirrored': mirrored,
            'raw_text': item_text
        }

    def _parse_mod_line(self, line: str) -> Dict:
        """
        Парсит строку мода и извлекает метаданные

        Args:
            line: Строка с модом

        Returns:
            Словарь с информацией о моде
        """
        mod_text = line
        tags = []
        mod_type = None

        # Извлекаем теги
        if '{' in line and '}' in line:
            import re
            tag_matches = re.findall(r'\{([^}]+)\}', line)
            tags = tag_matches

            # Определяем тип мода
            for tag in tags:
                tag_lower = tag.lower()
                if 'crafted' in tag_lower or 'custom' in tag_lower:
                    mod_type = 'crafted'
                elif 'enchant' in tag_lower:
                    mod_type = 'enchant'
                elif 'fractured' in tag_lower:
                    mod_type = 'fractured'
                elif 'prefix' in tag_lower:
                    mod_type = 'prefix'
                elif 'suffix' in tag_lower:
                    mod_type = 'suffix'

            # Убираем теги из текста для отображения
            mod_text = re.sub(r'\{[^}]+\}', '', line).strip()

        return {
            'text': mod_text,
            'raw': line,
            'tags': tags,
            'type': mod_type
        }

    def _is_prefix_from_tags(self, line: str) -> bool:
        """Определяет, является ли мод префиксом по тегам"""
        return '{prefix}' in line.lower() or '{tags:prefix' in line.lower()

    def _is_suffix_from_tags(self, line: str) -> bool:
        """Определяет, является ли мод суффиксом по тегам"""
        return '{suffix}' in line.lower() or '{tags:suffix' in line.lower()

    def _is_likely_prefix(self, line: str) -> bool:
        """
        Улучшенная эвристика для определения префикса
        Префиксы обычно дают: FLAT жизнь/мана/ES, добавленный урон, локальный урон, регены, лич

        ВАЖНО: % increased maximum Life/Mana/ES - это SUFFIX, не PREFIX!
        """
        line_lower = line.lower()

        # ИСКЛЮЧЕНИЯ - это НЕ префиксы (проверяем первыми!)
        # % increased maximum Life/Mana/ES - SUFFIX
        if any(kw in line_lower for kw in [
            '% increased maximum life',
            '% increased maximum mana',
            '% increased maximum energy shield',
            'increased maximum life',
            'increased maximum mana',
            'increased maximum energy shield'
        ]):
            return False

        # Теперь проверяем префиксы
        prefix_keywords = [
            # Жизнь, мана, ES (FLAT, не процентные!)
            'to maximum life', 'to maximum mana', 'to maximum energy shield',
            '+# to maximum life', '+# to maximum mana', '+# to maximum energy shield',
            # Регенерация (обычно префикс)
            'life regenerated per second', 'mana regenerated per second',
            'energy shield recharge', 'regenerate life', 'regenerate mana',
            # Защита (flat бонусы)
            'to armour', 'to evasion', '+# to armour', '+# to evasion',
            'to evasion rating', 'to maximum ward',
            # Урон (добавленный) - ВСЕГДА префикс
            'adds', 'added physical damage', 'added cold damage',
            'added fire damage', 'added lightning damage', 'added chaos damage',
            # Урон к атакам/спеллам
            'to attacks', 'to spells', 'to attack damage', 'to spell damage',
            # Увеличенный урон (локальный на оружии)
            'increased physical damage', 'increased spell damage',
            'increased elemental damage',
            # Лич
            'life leeched', 'mana leeched', 'leech', 'leeched as',
            # Миньоны
            'minions deal', 'minions have', 'minions gain',
            # Качество
            'to quality',
            # Уровень гемов (префикс)
            'to level of', '+# to level',
            # Блок (обычно префикс)
            'chance to block',
            # Площадь действия
            'increased area of effect', 'to area of effect'
        ]
        return any(kw in line_lower for kw in prefix_keywords)

    def _is_likely_suffix(self, line: str) -> bool:
        """
        Улучшенная эвристика для определения суффикса
        Суффиксы обычно дают: сопротивления, атрибуты, криты, скорости, % увеличения жизни/маны/ES
        """
        line_lower = line.lower()
        suffix_keywords = [
            # % increased maximum Life/Mana/ES - СУФФИКС!
            '% increased maximum life', '% increased maximum mana',
            '% increased maximum energy shield',
            'increased maximum life', 'increased maximum mana',
            'increased maximum energy shield',
            # Сопротивления - ВСЕГДА суффикс
            'resistance', 'to cold resistance', 'to fire resistance',
            'to lightning resistance', 'to chaos resistance',
            '+#% to cold resistance', '+#% to fire resistance',
            '+#% to lightning resistance', '+#% to chaos resistance',
            'to all elemental resistances', 'to elemental resistances',
            'all resistances',
            # Атрибуты - ВСЕГДА суффикс
            'to strength', 'to dexterity', 'to intelligence',
            '+# to strength', '+# to dexterity', '+# to intelligence',
            'to all attributes', '+# to all attributes',
            'strength and', 'dexterity and', 'intelligence and',
            # Криты - обычно суффикс
            'increased critical strike chance', 'to critical strike chance',
            'to critical strike multiplier', 'increased global critical strike',
            'critical strike chance', 'critical strike multiplier',
            '+#% to critical strike multiplier',
            # Скорости - ВСЕГДА суффикс
            'increased attack speed', 'increased cast speed',
            'to attack speed', 'to cast speed',
            'attack and cast speed', 'increased movement speed',
            '% increased attack speed', '% increased cast speed',
            # Редкость и количество предметов - суффикс
            'increased rarity', 'rarity of items found',
            'increased item quantity',
            # Реквайрменты - суффикс
            'reduced attribute requirements', 'reduced requirements',
            'no attribute requirements',
            # Стихийный урон (на украшениях - суффикс)
            'increased cold damage', 'increased fire damage',
            'increased lightning damage', 'increased chaos damage',
            '% increased fire damage', '% increased cold damage',
            '% increased lightning damage',
            # Точность - суффикс
            'to accuracy rating', 'increased accuracy',
            '+# to accuracy', '% increased accuracy',
            # Длительность - суффикс
            'increased skill effect duration', 'skill duration',
            'increased duration',
            # Мана - суффиксы
            'reduced mana cost', 'to total mana cost',
            '% reduced mana cost',
            # Регенерация маны (суффикс на украшениях)
            '% increased mana regeneration rate',
            # Заряды
            'chance to gain', 'maximum power charges',
            'maximum frenzy charges', 'maximum endurance charges'
        ]
        return any(kw in line_lower for kw in suffix_keywords)

    def get_gems(self) -> List[Dict]:
        """
        Извлекает все GEMS (камни умений) из билда
        Это ОТДЕЛЬНАЯ сущность от Jewels!

        Returns:
            Список групп гемов с их характеристиками
        """
        if self.root is None:
            raise ValueError("Билд не был распарсен.")

        gem_groups = []
        skills_section = self.root.find('Skills')

        if skills_section is None:
            return gem_groups

        # Перебираем все группы скиллов
        for skill_set in skills_section.findall('SkillSet'):
            for skill in skill_set.findall('Skill'):
                skill_data = {
                    'label': skill.get('label', 'Unnamed Skill'),
                    'enabled': skill.get('enabled', 'true'),
                    'slot': skill.get('slot', ''),
                    'mainActiveSkill': skill.get('mainActiveSkill', ''),
                    'gems': []
                }

                # Извлекаем гемы
                for gem in skill.findall('Gem'):
                    gem_data = {
                        'nameSpec': gem.get('nameSpec', ''),
                        'level': gem.get('level', '1'),
                        'quality': gem.get('quality', '0'),
                        'enabled': gem.get('enabled', 'true'),
                        'skillId': gem.get('skillId', ''),
                    }
                    skill_data['gems'].append(gem_data)

                if skill_data['gems']:
                    gem_groups.append(skill_data)

        return gem_groups

    def get_all_data(self) -> Dict:
        """
        Извлекает ВСЕ данные из билда

        Returns:
            Словарь со всеми данными билда
        """
        items = self.get_items()
        gems = self.get_gems()

        return {
            'build_info': self.get_build_info(),
            'equipment': items['equipment'],
            'jewels': items['jewels'],
            'flasks': items['flasks'],
            'gems': gems
        }
