#!/usr/bin/env python3
"""
Диагностика проблем с парсингом jewels
"""

from pob_parser import PoBParser
import xml.etree.ElementTree as ET

def diagnose_jewels(build_code):
    """Детальная диагностика jewels"""
    parser = PoBParser(build_code)

    try:
        parser.parse()
    except Exception as e:
        print(f"Ошибка парсинга: {e}")
        return

    print("=" * 100)
    print("ДИАГНОСТИКА JEWELS")
    print("=" * 100)

    items_section = parser.root.find('Items')
    if items_section is None:
        print("⚠ Секция Items не найдена!")
        return

    # 1. Найти все слоты
    print("\n1. ПОИСК СЛОТОВ")
    print("-" * 100)

    all_slots = []

    # Слоты из основной секции
    for slot in items_section.findall('Slot'):
        all_slots.append(('main', slot))

    # Слоты из ItemSet
    for item_set in items_section.findall('ItemSet'):
        set_id = item_set.get('id', 'unknown')
        useSecondWeaponSet = item_set.get('useSecondWeaponSet', '0')
        print(f"  ItemSet найден: id={set_id}, useSecondWeaponSet={useSecondWeaponSet}")
        for slot in item_set.findall('Slot'):
            all_slots.append((f'ItemSet[id={set_id}]', slot))

    print(f"\nВсего найдено слотов: {len(all_slots)}")

    # 2. Найти слоты с Jewels
    print("\n2. ФИЛЬТРАЦИЯ СЛОТОВ JEWELS")
    print("-" * 100)

    jewel_slots = []
    for source, slot in all_slots:
        slot_name = slot.get('name', 'Unknown')
        item_id = slot.get('itemId')

        if 'jewel' in slot_name.lower():
            jewel_slots.append((source, slot, slot_name, item_id))
            print(f"  ✓ [{source}] Слот: {slot_name:20} | ItemID: {item_id or 'НЕТ'}")

    print(f"\nНайдено слотов с 'jewel': {len(jewel_slots)}")

    if not jewel_slots:
        print("\n⚠ НЕ НАЙДЕНО СЛОТОВ С 'JEWEL' В НАЗВАНИИ!")
        print("\nПолный список всех слотов:")
        for source, slot in all_slots:
            slot_name = slot.get('name', 'Unknown')
            item_id = slot.get('itemId')
            print(f"  [{source}] Слот: {slot_name:20} | ItemID: {item_id or 'НЕТ'}")
        return

    # 3. Найти предметы для каждого jewel слота
    print("\n3. ПОИСК ПРЕДМЕТОВ ДЛЯ JEWEL СЛОТОВ")
    print("-" * 100)

    for idx, (source, slot, slot_name, item_id) in enumerate(jewel_slots, 1):
        print(f"\n[{idx}] Слот: {slot_name} (из {source})")
        print(f"    ItemID: {item_id or 'ОТСУТСТВУЕТ'}")

        if not item_id:
            print("    ⚠ ПРОБЛЕМА: Нет ItemID - слот пустой!")
            continue

        # Ищем предмет в основной секции Items
        item_element = items_section.find(f"./Item[@id='{item_id}']")

        if item_element is not None:
            print(f"    ✓ Найден в основной секции Items")
        else:
            print(f"    ✗ НЕ найден в основной секции Items")

            # Ищем в ItemSet
            found_in_set = False
            for item_set in items_section.findall('ItemSet'):
                set_id = item_set.get('id', 'unknown')

                # Пробуем разные варианты поиска
                item_element = item_set.find(f"./Item[@id='{item_id}']")
                if item_element is None:
                    item_element = item_set.find(f".//Item[@id='{item_id}']")

                if item_element is not None:
                    print(f"    ✓ Найден в ItemSet[id={set_id}]")
                    found_in_set = True
                    break

            if not found_in_set:
                print(f"    ✗ НЕ найден ни в одном ItemSet")

                # Показываем все доступные Item id в секции
                print(f"\n    Доступные Item ID в основной секции:")
                for item in items_section.findall('./Item'):
                    print(f"      - {item.get('id')}")

                print(f"\n    Доступные Item ID в ItemSet:")
                for item_set in items_section.findall('ItemSet'):
                    set_id = item_set.get('id', 'unknown')
                    for item in item_set.findall('.//Item'):
                        print(f"      - {item.get('id')} (в ItemSet[id={set_id}])")

                continue

        # Показываем содержимое предмета
        if item_element is not None:
            item_text = item_element.text or ""
            lines = [line.strip() for line in item_text.split('\n') if line.strip()]

            print(f"    Строк текста: {len(lines)}")
            print(f"    Первые строки:")
            for line in lines[:10]:
                print(f"      {line}")

            if len(lines) > 10:
                print(f"      ... (всего {len(lines)} строк)")

    # 4. Тестируем парсинг через get_items()
    print("\n4. РЕЗУЛЬТАТ ПАРСИНГА ЧЕРЕЗ get_items()")
    print("-" * 100)

    items = parser.get_items()
    jewels_parsed = items['jewels']

    print(f"\nКоличество распарсенных jewels: {len(jewels_parsed)}")

    if jewels_parsed:
        for idx, jewel in enumerate(jewels_parsed, 1):
            print(f"\n[{idx}] {jewel['rarity']} - {jewel['name']}")
            print(f"    База: {jewel['base_type']}")
            print(f"    Слот: {jewel['slot']}")

            total_mods = (len(jewel['implicits']) + len(jewel['explicits']) +
                         len(jewel['prefixes']) + len(jewel['suffixes']))
            print(f"    Модов: {total_mods}")

            if jewel['explicits']:
                print(f"    Explicit моды:")
                for mod in jewel['explicits']:
                    print(f"      - {mod['text']}")
    else:
        print("\n⚠ JEWELS НЕ РАСПАРСИЛИСЬ!")

    print("\n" + "=" * 100)

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

    diagnose_jewels(build_code)
