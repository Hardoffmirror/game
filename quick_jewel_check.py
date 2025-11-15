#!/usr/bin/env python3
"""
Быстрая проверка jewels в билде
"""

from pob_parser import PoBParser
import sys

def quick_check(build_code):
    parser = PoBParser(build_code)
    parser.parse()

    items_section = parser.root.find('Items')

    # Информация об activeItemSet
    active_set_id = items_section.get('activeItemSet')
    use_second = items_section.get('useSecondWeaponSet', 'false')

    print(f"Active ItemSet: {active_set_id or 'НЕТ'}")
    print(f"useSecondWeaponSet: {use_second}")
    print()

    # Найти все слоты с "Jewel" в названии
    jewel_slots = []

    # Из основной секции
    for slot in items_section.findall('Slot'):
        name = slot.get('name', '')
        if 'jewel' in name.lower():
            jewel_slots.append(('main', slot))

    # Из ItemSet
    for item_set in items_section.findall('ItemSet'):
        set_id = item_set.get('id')
        for slot in item_set.findall('Slot'):
            name = slot.get('name', '')
            if 'jewel' in name.lower():
                jewel_slots.append((f'ItemSet[{set_id}]', slot))

    print(f"Найдено Jewel слотов: {len(jewel_slots)}")
    print()

    for source, slot in jewel_slots[:10]:  # Первые 10
        name = slot.get('name')
        item_id = slot.get('itemId')
        print(f"  {source:20} | {name:25} | itemId: {item_id or 'ПУСТО'}")

    if len(jewel_slots) > 10:
        print(f"  ... и еще {len(jewel_slots) - 10}")

    print()
    print("Результат парсинга через get_items():")
    items = parser.get_items()
    print(f"  Jewels распознано: {len(items['jewels'])}")

    if items['jewels']:
        for j in items['jewels'][:5]:
            print(f"    - {j['name']} (слот: {j['slot']})")

if __name__ == '__main__':
    # Читаем из файла или stdin
    if len(sys.argv) > 1:
        with open(sys.argv[1]) as f:
            build_code = f.read().strip()
    else:
        print("Вставьте код билда (Ctrl+D для завершения):")
        build_code = sys.stdin.read().strip()

    quick_check(build_code)
