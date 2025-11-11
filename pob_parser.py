"""
PoB Build Parser
Декодирует и парсит билды из Path of Building
"""

import base64
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

            # Остальные строки - это моды и характеристики
            current_section = []
            for line in lines:
                if line.startswith('---'):
                    if current_section:
                        mods.extend(current_section)
                        current_section = []
                else:
                    current_section.append(line)

            if current_section:
                mods.extend(current_section)

        return {
            'slot': slot_name,
            'rarity': rarity,
            'name': name,
            'base_type': base_type,
            'mods': mods,
            'raw_text': item_text
        }

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
        return {
            'build_info': self.get_build_info(),
            'items': self.get_items(),
            'skills': self.get_skills(),
            'tree': self.get_tree(),
            'config': self.get_config(),
            'notes': self.get_notes()
        }
