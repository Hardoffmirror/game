#!/usr/bin/env python3
"""
Тест исправленного парсера для jewels
"""

from pob_parser import PoBParser
import sys

def test_jewels():
    print("=" * 80)
    print("ТЕСТ: Парсинг всех jewels (включая непривязанные к слотам)")
    print("=" * 80)
    print("\nВставьте код билда из Path of Building:")
    print("(Нажмите Ctrl+D после вставки)\n")

    try:
        build_code = sys.stdin.read().strip()
    except KeyboardInterrupt:
        print("\nОтменено.")
        sys.exit(0)

    if not build_code:
        print("Код билда не предоставлен.")
        sys.exit(1)

    # Парсим билд
    parser = PoBParser(build_code)
    parser.parse()

    # Проверяем сколько всего Item элементов
    items_section = parser.root.find('Items')
    all_items = items_section.findall('.//Item')

    print(f"\n{'='*80}")
    print(f"СТАТИСТИКА XML:")
    print(f"{'='*80}")
    print(f"Всего Item элементов в XML: {len(all_items)}")

    # Считаем jewels в XML по тексту
    jewel_count_in_xml = 0
    for item in all_items:
        item_text = item.text or ""
        if 'jewel' in item_text.lower():
            jewel_count_in_xml += 1

    print(f"Из них содержат 'jewel' в тексте: {jewel_count_in_xml}")

    # Проверяем результат парсинга
    items = parser.get_items()

    print(f"\n{'='*80}")
    print(f"РЕЗУЛЬТАТ ПАРСИНГА:")
    print(f"{'='*80}")
    print(f"Equipment: {len(items['equipment'])}")
    print(f"Jewels: {len(items['jewels'])}")
    print(f"Flasks: {len(items['flasks'])}")

    if items['jewels']:
        print(f"\n{'='*80}")
        print(f"НАЙДЕННЫЕ JEWELS:")
        print(f"{'='*80}")
        for idx, jewel in enumerate(items['jewels'], 1):
            print(f"\n{idx}. {jewel['name']}")
            print(f"   Rarity: {jewel['rarity']}")
            print(f"   Base: {jewel['base_type']}")
            print(f"   Slot: {jewel['slot']}")

            # Показываем первые 3 мода
            all_mods = (jewel.get('implicits', []) +
                       jewel.get('explicits', []) +
                       jewel.get('crafted_mods', []))

            if all_mods:
                print(f"   Mods:")
                for mod in all_mods[:3]:
                    print(f"     - {mod['text']}")
                if len(all_mods) > 3:
                    print(f"     ... и еще {len(all_mods) - 3} модов")
    else:
        print("\n⚠️  ВНИМАНИЕ: Jewels не найдены!")

    print(f"\n{'='*80}")

    # Проверка успешности
    if jewel_count_in_xml > 0 and len(items['jewels']) == jewel_count_in_xml:
        print("✓ УСПЕХ: Все jewels распознаны корректно!")
    elif jewel_count_in_xml > 0 and len(items['jewels']) < jewel_count_in_xml:
        print(f"⚠️  ЧАСТИЧНЫЙ УСПЕХ: Распознано {len(items['jewels'])} из {jewel_count_in_xml} jewels")
    elif jewel_count_in_xml > 0 and len(items['jewels']) == 0:
        print("✗ ОШИБКА: Jewels в XML есть, но не распознаны!")
    else:
        print("ℹ️  В этом билде нет jewels")

    print(f"{'='*80}\n")

if __name__ == '__main__':
    test_jewels()
