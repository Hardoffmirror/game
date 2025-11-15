#!/usr/bin/env python3
"""
Тест с реальным билдом - детальная диагностика
"""

from pob_parser import PoBParser
import json

def analyze_build(build_code):
    """Полный анализ билда с детальной диагностикой"""
    parser = PoBParser(build_code)

    try:
        parser.parse()
    except Exception as e:
        print(f"Ошибка парсинга: {e}")
        return

    # Получаем все данные
    all_data = parser.get_all_data()

    print("=" * 100)
    print("ДЕТАЛЬНЫЙ АНАЛИЗ БИЛДА")
    print("=" * 100)

    # Информация о билде
    info = all_data['build_info']
    print(f"\nБилд: {info['className']} - {info['ascendClassName']} (Уровень {info['level']})")

    # Статистика
    equipment_count = len(all_data['equipment'])
    jewels_count = len(all_data['jewels'])
    flasks_count = len(all_data['flasks'])
    gems_count = len(all_data['gems'])

    print(f"\nСтатистика:")
    print(f"  Экипировка: {equipment_count}")
    print(f"  Самоцветы (Jewels): {jewels_count}")
    print(f"  Флаконы (Flasks): {flasks_count}")
    print(f"  Группы камней (Gems): {gems_count}")

    # Детальная диагностика экипировки
    print(f"\n{'=' * 100}")
    print("ЭКИПИРОВКА - ДЕТАЛЬНАЯ ДИАГНОСТИКА")
    print(f"{'=' * 100}")

    for idx, item in enumerate(all_data['equipment'], 1):
        print(f"\n[{idx}] {item['rarity']} - {item['name']}")
        print(f"    База: {item['base_type']}")
        print(f"    Слот: {item['slot']}")

        # Подсчет модов
        total_mods = (len(item['implicits']) + len(item['explicits']) +
                     len(item['prefixes']) + len(item['suffixes']) +
                     len(item['crafted_mods']) + len(item['enchant_mods']))

        print(f"    Всего модов: {total_mods}")

        if item['implicits']:
            print(f"    ✓ Имплициты: {len(item['implicits'])}")
        if item['prefixes']:
            print(f"    ✓ Префиксы: {len(item['prefixes'])}")
            for mod in item['prefixes']:
                text = mod['text'] if isinstance(mod, dict) else mod
                print(f"        [PREFIX] {text}")
        if item['suffixes']:
            print(f"    ✓ Суффиксы: {len(item['suffixes'])}")
            for mod in item['suffixes']:
                text = mod['text'] if isinstance(mod, dict) else mod
                print(f"        [SUFFIX] {text}")
        if item['explicits']:
            print(f"    ⚠ Неклассифицированные моды: {len(item['explicits'])}")
            for mod in item['explicits']:
                text = mod['text'] if isinstance(mod, dict) else mod
                print(f"        [EXPLICIT] {text}")
        if item['crafted_mods']:
            print(f"    ✓ Крафтовые: {len(item['crafted_mods'])}")
        if item['enchant_mods']:
            print(f"    ✓ Зачарования: {len(item['enchant_mods'])}")

    # Детальная диагностика jewels
    print(f"\n{'=' * 100}")
    print("САМОЦВЕТЫ (JEWELS) - ДЕТАЛЬНАЯ ДИАГНОСТИКА")
    print(f"{'=' * 100}")

    if jewels_count == 0:
        print("\n⚠ ПРОБЛЕМА: Не найдено ни одного самоцвета!")
        print("   Возможные причины:")
        print("   - Слоты не содержат 'jewel' в названии")
        print("   - Тип предмета не содержит 'jewel'")
        print("   - Название предмета не содержит 'jewel'")
    else:
        for idx, item in enumerate(all_data['jewels'], 1):
            print(f"\n[{idx}] {item['rarity']} - {item['name']}")
            print(f"    База: {item['base_type']}")
            print(f"    Слот: {item['slot']}")

            total_mods = (len(item['implicits']) + len(item['explicits']) +
                         len(item['prefixes']) + len(item['suffixes']))

            if total_mods == 0:
                print(f"    ⚠ ПРОБЛЕМА: Нет модов!")
            else:
                print(f"    Всего модов: {total_mods}")

                if item['prefixes']:
                    print(f"    ✓ Префиксы: {len(item['prefixes'])}")
                if item['suffixes']:
                    print(f"    ✓ Суффиксы: {len(item['suffixes'])}")
                if item['explicits']:
                    print(f"    ✓ Моды: {len(item['explicits'])}")
                    for mod in item['explicits']:
                        text = mod['text'] if isinstance(mod, dict) else mod
                        print(f"        - {text}")

    # Детальная диагностика флаконов
    print(f"\n{'=' * 100}")
    print("ФЛАКОНЫ (FLASKS) - ДЕТАЛЬНАЯ ДИАГНОСТИКА")
    print(f"{'=' * 100}")

    if flasks_count == 0:
        print("\n⚠ ПРОБЛЕМА: Не найдено ни одного флакона!")
        print("   Возможные причины:")
        print("   - Слоты не содержат 'flask' в названии")
        print("   - Тип предмета не содержит 'flask'")
    else:
        for idx, item in enumerate(all_data['flasks'], 1):
            print(f"\n[{idx}] {item['rarity']} - {item['name']}")
            print(f"    База: {item['base_type']}")
            print(f"    Слот: {item['slot']}")

            total_mods = (len(item['explicits']) + len(item['prefixes']) + len(item['suffixes']))

            if total_mods == 0:
                print(f"    ⚠ ПРОБЛЕМА: Нет модов!")
            else:
                print(f"    Всего модов: {total_mods}")

                if item['prefixes']:
                    print(f"    ✓ Префиксы: {len(item['prefixes'])}")
                if item['suffixes']:
                    print(f"    ✓ Суффиксы: {len(item['suffixes'])}")
                if item['explicits']:
                    print(f"    ✓ Моды: {len(item['explicits'])}")

    # Проблемные моды
    print(f"\n{'=' * 100}")
    print("АНАЛИЗ ПРОБЛЕМНЫХ МОДОВ")
    print(f"{'=' * 100}")

    unclassified_count = 0
    for item in all_data['equipment']:
        unclassified_count += len(item['explicits'])

    if unclassified_count > 0:
        print(f"\n⚠ Найдено {unclassified_count} неклассифицированных модов")
        print("   Эти моды не были определены как префиксы или суффиксы")
    else:
        print("\n✓ Все моды на экипировке классифицированы!")

    print(f"\n{'=' * 100}")
    print("РЕЗЮМЕ")
    print(f"{'=' * 100}")
    print(f"✓ Экипировка: {equipment_count} предметов")
    print(f"{'✓' if jewels_count > 0 else '✗'} Самоцветы: {jewels_count} предметов")
    print(f"{'✓' if flasks_count > 0 else '✗'} Флаконы: {flasks_count} предметов")
    print(f"✓ Группы камней: {gems_count}")
    print(f"{'✓' if unclassified_count == 0 else '⚠'} Неклассифицированных модов: {unclassified_count}")
    print(f"{'=' * 100}")

    # Сохраняем в JSON для детального анализа
    with open('build_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)

    print(f"\nДетальные данные сохранены в: build_analysis.json")

if __name__ == '__main__':
    import sys

    print("=" * 100)
    print("ТЕСТ РЕАЛЬНОГО БИЛДА - ДЕТАЛЬНАЯ ДИАГНОСТИКА")
    print("=" * 100)
    print("\nВставьте код билда из Path of Building:")
    print("(После вставки нажмите Enter, затем Ctrl+D)")
    print()

    # Читаем билд код
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

    analyze_build(build_code)
