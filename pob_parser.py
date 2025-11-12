"""
PoB Build Parser
Декодирует и парсит билды из Path of Building
"""

import base64
import zlib
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional
from urllib.parse import quote


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
            # Декодируем base64
            decoded = base64.urlsafe_b64decode(self.build_code)
            # Распаковываем zlib
            decompressed = zlib.decompress(decoded)
            # Конвертируем в строку
            xml_string = decompressed.decode('utf-8')
            return xml_string
        except Exception as e:
            raise ValueError(f"Ошибка декодирования билда: {e}")

    def parse(self) -> None:
        """Парсит XML данные билда"""
        self.xml_data = self.decode_build()
        self.root = ET.fromstring(self.xml_data)

    def get_items(self) -> List[Dict]:
        """
        Извлекает все предметы из билда

        Returns:
            Список словарей с информацией о предметах
        """
        if self.root is None:
            raise ValueError("Билд не был распарсен. Вызовите parse() сначала.")

        items = []

        # Ищем секцию Items
        items_section = self.root.find('Items')
        if items_section is None:
            return items

        # Перебираем все слоты с предметами
        for slot in items_section.findall('Slot'):
            slot_name = slot.get('name', 'Unknown')
            item_id = slot.get('itemId')

            if item_id:
                # Находим сам предмет по ID
                item_element = items_section.find(f"./Item[@id='{item_id}']")
                if item_element is not None:
                    item_data = self._parse_item(item_element, slot_name)
                    items.append(item_data)

        # Также проверяем предметы в ItemSet
        for item_set in items_section.findall('ItemSet'):
            for slot in item_set.findall('Slot'):
                slot_name = slot.get('name', 'Unknown')
                item_id = slot.get('itemId')

                if item_id:
                    item_element = items_section.find(f"./Item[@id='{item_id}']")
                    if item_element is not None:
                        item_data = self._parse_item(item_element, slot_name)
                        # Избегаем дубликатов
                        if item_data not in items:
                            items.append(item_data)

        return items

    def _parse_item(self, item_element: ET.Element, slot_name: str) -> Dict:
        """
        Парсит отдельный предмет

        Args:
            item_element: XML элемент предмета
            slot_name: Название слота

        Returns:
            Словарь с данными предмета
        """
        # Получаем текст предмета (содержит все моды)
        item_text = item_element.text or ""

        # Разбиваем на строки
        lines = [line.strip() for line in item_text.split('\n') if line.strip()]

        # Первая строка обычно содержит редкость
        rarity = ""
        name = "Unknown Item"
        base_type = ""
        mods = []
        sockets = ""
        corrupted = False

        if lines:
            # Ищем редкость (Rarity: ...)
            if lines[0].startswith('Rarity:'):
                rarity = lines[0].replace('Rarity:', '').strip()
                lines = lines[1:]

            # Следующая строка - название предмета
            if lines:
                name = lines[0]
                lines = lines[1:]

            # Если есть еще строка и она не содержит "---", это базовый тип
            if lines and not lines[0].startswith('---'):
                base_type = lines[0]
                lines = lines[1:]

            # Парсим моды по секциям
            mods = self._parse_mods_sections(lines)

            # Проверяем на Corrupted
            for mod in mods:
                if mod.get('text', '').lower() in ['corrupted', 'осквернено']:
                    corrupted = True
                    break

            # Ищем сокеты
            for line in lines:
                if line.startswith('Sockets:'):
                    sockets = line.replace('Sockets:', '').strip()
                    break

        # Формируем URL для картинки
        icon_url = self._get_item_icon_url(name, base_type, slot_name)

        return {
            'slot': slot_name,
            'rarity': rarity,
            'name': name,
            'base_type': base_type,
            'mods': mods,
            'sockets': sockets,
            'corrupted': corrupted,
            'raw_text': item_text,
            'icon_url': icon_url,
            'gems': []  # Список гемов будет заполнен позже
        }

    def _parse_mods_sections(self, lines: List[str]) -> List[Dict]:
        """
        Парсит моды предмета по секциям

        Args:
            lines: Список строк из текста предмета

        Returns:
            Список модов с их типами
        """
        mods = []
        current_section_type = 'unknown'
        section_index = 0

        for line in lines:
            if line.startswith('---'):
                section_index += 1
                continue

            if line.startswith('Sockets:') or line.startswith('Item Level:') or \
               line.startswith('Requirements:') or line.startswith('LevelReq:') or \
               line.startswith('Implicits:'):
                continue

            # Определяем тип мода
            mod_type = self._determine_mod_type(line, section_index)

            if mod_type != 'skip':
                mods.append({
                    'text': line,
                    'type': mod_type,
                    'section': section_index
                })

        return mods

    def _determine_mod_type(self, line: str, section_index: int) -> str:
        """
        Определяет тип мода

        Args:
            line: Текст мода
            section_index: Индекс секции в которой находится мод

        Returns:
            Тип мода: implicit, explicit_prefix, explicit_suffix, crafted,
                     corrupted, enchant, fractured, synthesised, veiled
        """
        line_lower = line.lower()

        # Пропускаем служебные строки
        if any(skip in line_lower for skip in ['requirements:', 'item level:', 'sockets:', 'levelreq:']):
            return 'skip'

        # Corrupted
        if line_lower in ['corrupted', 'осквернено']:
            return 'corrupted_flag'

        # Implicit моды (обычно в первой секции)
        if '(implicit)' in line_lower or '(неявное)' in line_lower:
            return 'implicit'

        # Enchant моды
        if '(enchant)' in line_lower or 'enchanted' in line_lower or '(зачаровано)' in line_lower:
            return 'enchant'

        # Crafted моды
        if '(crafted)' in line_lower or '(создано)' in line_lower:
            return 'crafted'

        # Fractured моды
        if '(fractured)' in line_lower or '(расколото)' in line_lower:
            return 'fractured'

        # Synthesised моды
        if '(synthesised)' in line_lower or '(синтезировано)' in line_lower:
            return 'synthesised'

        # Veiled моды
        if '(veiled)' in line_lower or '(завуалировано)' in line_lower or 'veiled' in line_lower:
            return 'veiled'

        # Corrupted implicit (после коррапта)
        if section_index == 0:
            return 'implicit'

        # Explicit моды - определяем префикс или суффикс по содержанию
        # В PoE префиксы обычно дают: life, mana, armour, energy shield, damage, added damage
        # Суффиксы обычно дают: resistances, attributes, accuracy, critical strike

        prefix_keywords = [
            'life', 'mana', 'armour', 'armor', 'energy shield', 'evasion',
            'physical damage', 'adds', 'increased damage', 'elemental damage',
            'to maximum life', 'to maximum mana', 'to maximum energy shield',
            'increased physical', 'increased spell', 'increased attack',
            'socketed gems', 'reflects', 'thorns', 'regenerate'
        ]

        suffix_keywords = [
            'resistance', 'to all attributes', 'to strength', 'to dexterity', 'to intelligence',
            'accuracy', 'critical strike', 'increased rarity', 'reduced attribute requirements',
            'cannot be frozen', 'stun and block recovery', 'to all elemental resistances',
            'movement speed', 'attack speed', 'cast speed', 'flask'
        ]

        # Проверяем ключевые слова
        for keyword in prefix_keywords:
            if keyword in line_lower:
                return 'explicit_prefix'

        for keyword in suffix_keywords:
            if keyword in line_lower:
                return 'explicit_suffix'

        # По умолчанию считаем explicit модом (не разделяя)
        return 'explicit'

    def _get_item_icon_url(self, name: str, base_type: str, slot_name: str) -> str:
        """
        Получает URL иконки предмета

        Args:
            name: Название предмета
            base_type: Базовый тип предмета
            slot_name: Название слота

        Returns:
            URL иконки предмета
        """
        # Используем базовый тип, если он есть, иначе название
        item_for_icon = base_type if base_type else name

        # Убираем артикли и лишние слова
        item_for_icon = item_for_icon.replace("Superior ", "")

        # Специальные случаи для известных уникальных предметов
        unique_items_mapping = {
            "Tabula Rasa": "TabulaRasa",
            "Abyssus": "Abyssus",
            "Starkonja's Head": "StarkonjasHead",
            "The Vertex": "TheVertex",
            "Devouring Diadem": "DevouringDiadem",
        }

        if name in unique_items_mapping:
            item_name_clean = unique_items_mapping[name]
        else:
            # Очищаем название для URL
            item_name_clean = item_for_icon.replace("'", "").replace('"', '').replace(' ', '')

        # Пробуем несколько источников иконок
        # 1. pobb.in assets
        icon_urls = [
            f"https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQXJtb3Vycy/{{item_name_clean}}IiwicyI6MC4yNSwidiI6MX1d/a8c5f4e5e3/{item_name_clean}.png",
            f"https://assets.pobb.in/1/{item_name_clean}.webp",
            f"https://web.poecdn.com/image/Art/2DItems/{self._get_item_category(slot_name)}/{item_name_clean}.png"
        ]

        # Возвращаем первый URL (в реальности можно сделать проверку доступности)
        return icon_urls[0]

    def _get_item_category(self, slot_name: str) -> str:
        """Определяет категорию предмета для URL иконки"""
        slot_lower = slot_name.lower()

        if 'weapon' in slot_lower:
            return 'Weapons'
        elif 'helm' in slot_lower or 'head' in slot_lower:
            return 'Armours/Helmets'
        elif 'body' in slot_lower or 'chest' in slot_lower:
            return 'Armours/BodyArmours'
        elif 'gloves' in slot_lower:
            return 'Armours/Gloves'
        elif 'boots' in slot_lower:
            return 'Armours/Boots'
        elif 'shield' in slot_lower:
            return 'Armours/Shields'
        elif 'ring' in slot_lower:
            return 'Rings'
        elif 'amulet' in slot_lower:
            return 'Amulets'
        elif 'belt' in slot_lower:
            return 'Belts'
        elif 'flask' in slot_lower:
            return 'Flasks'
        elif 'jewel' in slot_lower:
            return 'Jewels'
        else:
            return 'Armours'

    def get_build_info(self) -> Dict:
        """
        Получает общую информацию о билде

        Returns:
            Словарь с информацией о билде
        """
        if self.root is None:
            raise ValueError("Билд не был распарсен. Вызовите parse() сначала.")

        build_elem = self.root.find('Build')
        info = {
            'level': build_elem.get('level', 'Unknown') if build_elem is not None else 'Unknown',
            'className': build_elem.get('className', 'Unknown') if build_elem is not None else 'Unknown',
            'ascendClassName': build_elem.get('ascendClassName', 'None') if build_elem is not None else 'None',
        }

        return info

    def _determine_gem_attribute(self, gem_name: str) -> str:
        """
        Определяет атрибут гема по его названию

        Args:
            gem_name: Название гема (в нижнем регистре)

        Returns:
            Атрибут гема: 'str', 'dex', 'int', 'support', или 'white' (awakened/exceptional)
        """
        # Awakened гемы (белые)
        if 'awakened' in gem_name or 'exceptional' in gem_name:
            return 'white'

        # Список support гемов (всегда бирюзовые)
        if 'support' in gem_name:
            return 'support'

        # Strength (красные) гемы
        str_gems = [
            'earthquake', 'molten strike', 'ground slam', 'heavy strike', 'cleave',
            'infernal blow', 'dominating blow', 'shield charge', 'vigilant strike',
            'ancestral warchief', 'ancestral protector', 'sunder', 'tectonic slam',
            'consecrated path', 'immortal call', 'enduring cry', 'rallying cry',
            'anger', 'determination', 'vitality', 'purity of fire', 'ancestral cry',
            'seismic cry', 'infernal cry', 'flame link', 'armor', 'war', 'physical',
            'boneshatter', 'earthshatter', 'rage', 'berserk', 'general', 'blood',
            'perforate', 'shield crush', 'smite', 'reap', 'corrupting fever', 'exsanguinate',
            'leap slam', 'static strike', 'sweep', 'glacial hammer', 'dual strike',
            'vaal earthquake', 'vaal molten strike', 'vaal ground slam', 'vaal immortal call',
            'melee', 'slam', 'warcry', 'shockwave', 'call to arms', 'molten shell',
            'steelskin', 'flesh and stone', 'pride', 'dread banner', 'war banner'
        ]

        # Dexterity (зеленые) гемы
        dex_gems = [
            'split arrow', 'ice shot', 'burning arrow', 'lightning arrow', 'rain of arrows',
            'tornado shot', 'barrage', 'blast rain', 'caustic arrow', 'toxic rain',
            'scourge arrow', 'elemental hit', 'spectral throw', 'venom gyre', 'cobra lash',
            'blade flurry', 'blade vortex', 'ethereal knives', 'frost blades', 'wild strike',
            'double strike', 'dual strike', 'flicker strike', 'reave', 'lacerate',
            'cyclone', 'whirling blades', 'riposte', 'puncture', 'frenzy', 'vigilant strike',
            'blink arrow', 'mirror arrow', 'bear trap', 'fire trap', 'explosive trap',
            'grace', 'haste', 'purity of ice', 'clarity', 'precision', 'sniper',
            'artillery ballista', 'siege ballista', 'shrapnel ballista', 'ensnaring arrow',
            'ballista', 'projectile', 'arrow', 'trap', 'mine', 'poison', 'venom',
            'spectral shield throw', 'spectral helix', 'pestilent strike', 'viper strike',
            'plague bearer', 'withering step', 'phase run', 'smoke mine', 'sabotage',
            'lightning strike', 'elemental strike', 'dash', 'flame dash', 'blood rage',
            'stealth', 'evasion', 'charged', 'poacher', 'thief', 'agony', 'pathfinder'
        ]

        # Intelligence (синие) гемы
        int_gems = [
            'arc', 'ball lightning', 'discharge', 'divine ire', 'fireball', 'firestorm',
            'flame surge', 'flameblast', 'freeze pulse', 'frostbolt', 'glacial cascade',
            'ice nova', 'ice spear', 'incinerate', 'lightning tendrils', 'lightning warp',
            'orb of storms', 'power siphon', 'shock nova', 'spark', 'storm', 'brand',
            'cold snap', 'frost bomb', 'frostblink', 'creeping frost', 'wintertide',
            'armageddon', 'blazing salvo', 'crackling lance', 'forbidden rite', 'hydrosphere',
            'kinetic', 'magma orb', 'penance brand', 'purifying flame', 'soulrend',
            'vortex', 'wave of conviction', 'winter orb', 'voltaxic burst', 'sigil',
            'raise zombie', 'raise spectre', 'summon skeleton', 'summon raging spirit',
            'animate guardian', 'desecrate', 'flesh offering', 'bone offering', 'convocation',
            'clarity', 'discipline', 'wrath', 'zealotry', 'malevolence', 'conductivity',
            'elemental weakness', 'enfeeble', 'flammability', 'frostbite', 'temporal chains',
            'vulnerability', 'curse', 'hex', 'mark', 'bane', 'essence drain', 'contagion',
            'dark pact', 'blight', 'siphoning', 'energy', 'mana', 'minion', 'summon',
            'volatile dead', 'cremation', 'bodyswap', 'unearth', 'detonate dead', 'offering',
            'srs', 'absolution', 'eye of winter', 'storm call', 'herald of ice', 'herald of thunder',
            'portal', 'frost shield', 'arcane', 'elemental focus', 'spell', 'cast',
            'lightning', 'cold', 'fire', 'chaos', 'necromancer', 'occultist', 'elementalist'
        ]

        # Проверяем вхождение ключевых слов
        for gem in str_gems:
            if gem in gem_name:
                return 'str'

        for gem in dex_gems:
            if gem in gem_name:
                return 'dex'

        for gem in int_gems:
            if gem in gem_name:
                return 'int'

        # По умолчанию возвращаем int (синий)
        return 'int'

    def get_skills(self) -> List[Dict]:
        """
        Извлекает все скиллы и гемы из билда

        Returns:
            Список словарей с информацией о скиллах
        """
        if self.root is None:
            raise ValueError("Билд не был распарсен. Вызовите parse() сначала.")

        skills = []
        skills_section = self.root.find('Skills')

        if skills_section is None:
            return skills

        # Перебираем все группы скиллов
        for skill_set in skills_section.findall('SkillSet'):
            for skill in skill_set.findall('Skill'):
                skill_data = {
                    'label': skill.get('label', 'Unnamed'),
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

                    # Определяем атрибут гема
                    name = gem.get('nameSpec', '').lower()
                    gem_data['attribute'] = self._determine_gem_attribute(name)

                    skill_data['gems'].append(gem_data)

                skills.append(skill_data)

        return skills

    def get_tree(self) -> Dict:
        """
        Извлекает информацию о пассивном дереве

        Returns:
            Словарь с данными о пассивном дереве
        """
        if self.root is None:
            raise ValueError("Билд не был распарсен. Вызовите parse() сначала.")

        tree_section = self.root.find('Tree')

        if tree_section is None:
            return {'nodes': [], 'specs': []}

        tree_data = {
            'activeSpec': tree_section.get('activeSpec', '1'),
            'specs': []
        }

        # Извлекаем спецификации дерева
        for spec in tree_section.findall('Spec'):
            spec_data = {
                'treeVersion': spec.get('treeVersion', ''),
                'classId': spec.get('classId', ''),
                'ascendClassId': spec.get('ascendClassId', ''),
                'nodes': spec.get('nodes', '').split(',') if spec.get('nodes') else []
            }
            tree_data['specs'].append(spec_data)

        return tree_data

    def get_config(self) -> Dict:
        """
        Извлекает конфигурацию билда

        Returns:
            Словарь с настройками конфигурации
        """
        if self.root is None:
            raise ValueError("Билд не был распарсен. Вызовите parse() сначала.")

        config_section = self.root.find('Config')

        if config_section is None:
            return {}

        config = {}
        for input_elem in config_section.findall('Input'):
            name = input_elem.get('name', '')
            value = input_elem.get('string') or input_elem.get('number') or input_elem.get('boolean', '')
            if name:
                config[name] = value

        return config

    def get_notes(self) -> str:
        """
        Извлекает заметки билда

        Returns:
            Текст заметок
        """
        if self.root is None:
            raise ValueError("Билд не был распарсен. Вызовите parse() сначала.")

        notes_elem = self.root.find('Notes')
        return notes_elem.text if notes_elem is not None and notes_elem.text else ""

    def get_all_data(self) -> Dict:
        """
        Извлекает все данные из билда

        Returns:
            Словарь со всеми данными билда
        """
        items = self.get_items()
        skills = self.get_skills()

        # Связываем гемы с предметами
        items_with_gems = self._attach_gems_to_items(items, skills)

        return {
            'build_info': self.get_build_info(),
            'items': items_with_gems,
            'skills': skills,
            'tree': self.get_tree(),
            'config': self.get_config(),
            'notes': self.get_notes()
        }

    def _attach_gems_to_items(self, items: List[Dict], skills: List[Dict]) -> List[Dict]:
        """
        Связывает гемы с предметами по слотам

        Args:
            items: Список предметов
            skills: Список скиллов с гемами

        Returns:
            Список предметов с прикрепленными гемами
        """
        # Создаем словарь предметов по слотам для быстрого доступа
        items_by_slot = {}
        for item in items:
            slot = item['slot']
            items_by_slot[slot] = item

        # Проходим по всем скиллам и прикрепляем гемы к соответствующим предметам
        for skill in skills:
            slot = skill.get('slot', '')

            # Если у скилла есть слот и такой предмет существует
            if slot and slot in items_by_slot:
                item = items_by_slot[slot]

                # Добавляем гемы к предмету
                if 'gems' not in item:
                    item['gems'] = []

                # Добавляем информацию о группе гемов
                gem_group = {
                    'label': skill.get('label', 'Камни'),
                    'enabled': skill.get('enabled', 'true'),
                    'gems': skill.get('gems', [])
                }

                item['gems'].append(gem_group)

        return items
