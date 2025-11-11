"""
Item Formatter
Форматирует вывод предметов из PoB для удобного копирования
"""

from typing import Dict, List


class ItemFormatter:
    """Форматирует информацию о предметах"""

    # Цветовая схема для терминала (ANSI коды)
    COLORS = {
        'NORMAL': '\033[0m',      # Белый
        'MAGIC': '\033[94m',       # Синий
        'RARE': '\033[93m',        # Желтый
        'UNIQUE': '\033[38;5;208m', # Оранжевый
        'CURRENCY': '\033[38;5;214m',
        'GEM': '\033[96m',         # Голубой
        'RESET': '\033[0m',
        'BOLD': '\033[1m',
        'DIM': '\033[2m',
        'GREEN': '\033[92m',
    }

    @staticmethod
    def get_rarity_color(rarity: str) -> str:
        """Возвращает цвет для редкости предмета"""
        rarity_upper = rarity.upper()
        if 'UNIQUE' in rarity_upper:
            return ItemFormatter.COLORS['UNIQUE']
        elif 'RARE' in rarity_upper:
            return ItemFormatter.COLORS['RARE']
        elif 'MAGIC' in rarity_upper:
            return ItemFormatter.COLORS['MAGIC']
        elif 'CURRENCY' in rarity_upper:
            return ItemFormatter.COLORS['CURRENCY']
        elif 'GEM' in rarity_upper:
            return ItemFormatter.COLORS['GEM']
        else:
            return ItemFormatter.COLORS['NORMAL']

    @staticmethod
    def format_item(item: Dict, show_raw: bool = False) -> str:
        """
        Форматирует один предмет для вывода

        Args:
            item: Словарь с данными предмета
            show_raw: Показывать ли сырой текст предмета

        Returns:
            Отформатированная строка
        """
        output = []

        # Разделитель
        output.append("=" * 80)

        # Слот
        slot = item.get('slot', 'Unknown')
        output.append(f"{ItemFormatter.COLORS['BOLD']}СЛОТ: {slot}{ItemFormatter.COLORS['RESET']}")

        # Редкость и название
        rarity = item.get('rarity', 'Normal')
        name = item.get('name', 'Unknown Item')
        base_type = item.get('base_type', '')

        color = ItemFormatter.get_rarity_color(rarity)

        output.append(f"\n{ItemFormatter.COLORS['DIM']}Редкость: {rarity}{ItemFormatter.COLORS['RESET']}")
        output.append(f"{color}{ItemFormatter.COLORS['BOLD']}{name}{ItemFormatter.COLORS['RESET']}")

        if base_type:
            output.append(f"{ItemFormatter.COLORS['DIM']}{base_type}{ItemFormatter.COLORS['RESET']}")

        # Моды и характеристики
        mods = item.get('mods', [])
        if mods:
            output.append(f"\n{ItemFormatter.COLORS['GREEN']}Характеристики:{ItemFormatter.COLORS['RESET']}")
            for mod in mods:
                if mod.strip():
                    # Пропускаем некоторые служебные строки
                    if not any(skip in mod for skip in ['Implicits:', 'Sockets:', 'LevelReq:']):
                        output.append(f"  • {mod}")

        # Сырой текст (опционально)
        if show_raw:
            output.append(f"\n{ItemFormatter.COLORS['DIM']}--- Сырой текст ---{ItemFormatter.COLORS['RESET']}")
            output.append(item.get('raw_text', ''))

        return '\n'.join(output)

    @staticmethod
    def format_items_list(items: List[Dict], show_raw: bool = False) -> str:
        """
        Форматирует список всех предметов

        Args:
            items: Список предметов
            show_raw: Показывать ли сырой текст

        Returns:
            Отформатированная строка со всеми предметами
        """
        if not items:
            return "Предметы не найдены в билде."

        output = []
        output.append(f"\n{ItemFormatter.COLORS['BOLD']}Найдено предметов: {len(items)}{ItemFormatter.COLORS['RESET']}\n")

        for item in items:
            output.append(ItemFormatter.format_item(item, show_raw))
            output.append("")  # Пустая строка между предметами

        return '\n'.join(output)

    @staticmethod
    def format_build_info(info: Dict) -> str:
        """
        Форматирует общую информацию о билде

        Args:
            info: Словарь с информацией о билде

        Returns:
            Отформатированная строка
        """
        output = []
        output.append("=" * 80)
        output.append(f"{ItemFormatter.COLORS['BOLD']}ИНФОРМАЦИЯ О БИЛДЕ{ItemFormatter.COLORS['RESET']}")
        output.append("=" * 80)
        output.append(f"Класс: {ItemFormatter.COLORS['GREEN']}{info.get('className', 'Unknown')}{ItemFormatter.COLORS['RESET']}")
        output.append(f"Подкласс: {ItemFormatter.COLORS['GREEN']}{info.get('ascendClassName', 'None')}{ItemFormatter.COLORS['RESET']}")
        output.append(f"Уровень: {ItemFormatter.COLORS['GREEN']}{info.get('level', 'Unknown')}{ItemFormatter.COLORS['RESET']}")
        output.append("=" * 80)

        return '\n'.join(output)

    @staticmethod
    def format_simple_list(items: List[Dict]) -> str:
        """
        Простой список предметов для быстрого копирования

        Args:
            items: Список предметов

        Returns:
            Простой список названий
        """
        output = []
        output.append(f"\n{ItemFormatter.COLORS['BOLD']}СПИСОК ПРЕДМЕТОВ (для копирования):{ItemFormatter.COLORS['RESET']}\n")

        for item in items:
            slot = item.get('slot', 'Unknown')
            name = item.get('name', 'Unknown Item')
            output.append(f"{slot}: {name}")

        return '\n'.join(output)
