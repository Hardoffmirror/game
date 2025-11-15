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

            # Находим предмет по ID
            item_element = items_section.find(f"./Item[@id='{item_id}']")
            if item_element is None:
                continue

            # Парсим предмет
            item_data = self._parse_item(item_element, slot_name)

            # Определяем категорию предмета
            item_type = item_data.get('item_type', '')

            if 'Jewel' in item_type:
                # Это Jewel (самоцвет) - в пассивное дерево
                jewels.append(item_data)
            elif 'Flask' in item_type or 'flask' in slot_name.lower():
                # Это фласка
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
        Парсит отдельный предмет (Item)

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
        other_mods = []
        properties = {}
        corrupted = False

        i = 0
        while i < len(lines):
            line = lines[i]

            # Rarity
            if line.startswith('Rarity:'):
                rarity = line.replace('Rarity:', '').strip().upper()
                i += 1
                continue

            # Название предмета (после Rarity)
            if not name or name == "Unknown":
                name = line
                i += 1
                # Следующая строка может быть base type
                if i < len(lines) and not lines[i].startswith('---'):
                    base_type = lines[i]
                    i += 1
                continue

            # Разделители секций
            if line.startswith('---'):
                i += 1
                continue

            # Corrupted
            if line.lower() in ['corrupted', 'осквернено']:
                corrupted = True
                i += 1
                continue

            # Implicits
            if line.startswith('Implicits:'):
                try:
                    implicit_count = int(line.split(':')[1].strip())
                    i += 1
                    # Читаем следующие N строк как имплициты
                    for _ in range(implicit_count):
                        if i < len(lines):
                            implicits.append(lines[i])
                            i += 1
                except:
                    i += 1
                continue

            # Свойства (Item Level, Sockets, Quality, etc.)
            if ':' in line and any(kw in line for kw in [
                'Item Level:', 'Quality:', 'Sockets:', 'LevelReq:',
                'Requirements:', 'Radius:', 'Limited to:', 'Unique ID:'
            ]):
                key, value = line.split(':', 1)
                properties[key.strip()] = value.strip()
                i += 1
                continue

            # Моды с префиксами (crafted, enchant, etc.)
            if line.startswith('{') and '}' in line:
                other_mods.append(line)
                i += 1
                continue

            # Остальное - эксплициты
            if line and not line.startswith('---'):
                explicits.append(line)

            i += 1

        return {
            'slot': slot_name,
            'rarity': rarity,
            'name': name,
            'base_type': base_type,
            'item_type': base_type,  # Для определения Jewel/Flask
            'implicits': implicits,
            'explicits': explicits,
            'other_mods': other_mods,
            'properties': properties,
            'corrupted': corrupted,
            'raw_text': item_text
        }

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
