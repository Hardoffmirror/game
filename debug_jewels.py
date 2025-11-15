#!/usr/bin/env python3
"""
Диагностика проблем с джевелами
"""

from pob_parser import PoBParser
import xml.etree.ElementTree as ET

def debug_jewels(build_code):
    """Детальная диагностика джевелов"""
    parser = PoBParser(build_code)

    try:
        parser.parse()
    except Exception as e:
        print(f"Ошибка парсинга: {e}")
        return

    print("=" * 100)
    print("ДИАГНОСТИКА ДЖЕВЕЛОВ")
    print("=" * 100)

    items_section = parser.root.find('Items')
    if items_section is None:
        print("⚠ Секция Items не найдена!")
        return

    # Собираем все слоты
    all_slots = []

    # Слоты из основной секции
    for slot in items_section.findall('Slot'):
        all_slots.append(('main', slot))

    # Слоты из ItemSet
    for item_set in items_section.findall('ItemSet'):
        set_id = item_set.get('id', 'unknown')
        for slot in item_set.findall('Slot'):
            all_slots.append((f'set:{set_id}', slot))

    print(f"\nНайдено слотов: {len(all_slots)}")
    print("\nАНАЛИЗ ВСЕХ СЛОТОВ:")
    print("-" * 100)

    jewel_slots = []
    flask_slots = []
    other_slots = []

    for source, slot in all_slots:
        slot_name = slot.get('name', 'Unknown')
        item_id = slot.get('itemId')

        slot_info = f"{source:15} | Слот: {slot_name:20} | ItemID: {item_id or 'НЕТ'}"

        slot_lower = slot_name.lower()

        if 'jewel' in slot_lower:
            jewel_slots.append((source, slot, slot_name, item_id))
            print(f"[JEWEL]  {slot_info}")
        elif 'flask' in slot_lower:
            flask_slots.append((source, slot, slot_name, item_id))
            print(f"[FLASK]  {slot_info}")
        else:
            other_slots.append((source, slot, slot_name, item_id))
            print(f"[OTHER]  {slot_info}")

    print(f"\n{'-' * 100}")
    print(f"Найдено слотов с джевелами: {len(jewel_slots)}")
    print(f"Найдено слотов с флаконами: {len(flask_slots)}")
    print(f"Остальных слотов: {len(other_slots)}")

    # Проверяем предметы в слотах джевелов
    if jewel_slots:
        print(f"\n{'=' * 100}")
        print("ДЕТАЛЬНЫЙ АНАЛИЗ ДЖЕВЕЛОВ:")
        print(f"{'=' * 100}")

        for idx, (source, slot, slot_name, item_id) in enumerate(jewel_slots, 1):
            print(f"\n[{idx}] Слот: {slot_name} (из {source})")
            print(f"    Item ID: {item_id or 'ОТСУТСТВУЕТ'}")

            if not item_id:
                print("    ⚠ ПРОБЛЕМА: Нет ItemID - предмет не будет обработан!")
                continue

            # Ищем предмет
            item_element = items_section.find(f"./Item[@id='{item_id}']")
            if item_element is None:
                print(f"    ⚠ ПРОБЛЕМА: Предмет с ID '{item_id}' не найден в секции Items!")

                # Пробуем найти в ItemSet
                for item_set in items_section.findall('ItemSet'):
                    item_element = item_set.find(f"./Item[@id='{item_id}']")
                    if item_element is not None:
                        print(f"    ✓ Найден в ItemSet (id={item_set.get('id')})")
                        break

            if item_element is not None:
                item_text = item_element.text or ""
                lines = [line.strip() for line in item_text.split('\n') if line.strip()]

                print(f"    ✓ Предмет найден! Строк: {len(lines)}")
                print(f"    Первые строки:")
                for line in lines[:5]:
                    print(f"      - {line}")

                if len(lines) > 5:
                    print(f"      ... (всего {len(lines)} строк)")
    else:
        print("\n⚠ НЕ НАЙДЕНО НИ ОДНОГО СЛОТА С ДЖЕВЕЛАМИ!")
        print("   Проверьте, что в PoB билде есть слоты типа 'Jewel 1', 'Jewel 2' и т.д.")

    # Также проверим, есть ли предметы с типом Jewel
    print(f"\n{'=' * 100}")
    print("ПОИСК ПРЕДМЕТОВ С ТИПОМ 'JEWEL' В ТЕКСТЕ:")
    print(f"{'=' * 100}")

    all_items = items_section.findall('.//Item')
    print(f"\nВсего Item элементов в XML: {len(all_items)}")

    jewel_items = []
    for item in all_items:
        item_id = item.get('id')
        item_text = item.text or ""

        if 'jewel' in item_text.lower():
            jewel_items.append((item_id, item_text))

    print(f"Предметов, содержащих 'jewel' в тексте: {len(jewel_items)}")

    if jewel_items:
        print("\nПримеры найденных предметов:")
        for item_id, item_text in jewel_items[:3]:
            lines = [line.strip() for line in item_text.split('\n') if line.strip()]
            print(f"\n  Item ID: {item_id}")
            for line in lines[:5]:
                print(f"    {line}")

if __name__ == '__main__':
    import sys

    print("Вставьте код билда из Path of Building:")
    print("(После вставки нажмите Enter, затем Ctrl+D)")
    print()

    lines = []
    try:
        for line in sys.stdin:
            lines.append(line.rstrip())
    except KeyboardInterrupt:
        print("\nОтменено")
        sys.exit(0)

    build_code = ''.join(lines).strip()

    if not build_code:
        print("Ошибка: Не предоставлен код билда")
        sys.exit(1)

    debug_jewels(build_code)
