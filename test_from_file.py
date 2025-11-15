#!/usr/bin/env python3
"""
Тест парсера с кодом билда из файла
Использование:
  1. Сохраните код билда из PoB в файл build_code.txt
  2. Запустите: python test_from_file.py
"""

import sys
from pob_parser import PoBParser

def test_from_file(filename='build_code.txt'):
    """Тестирует парсинг из файла"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            build_code = f.read().strip()
    except FileNotFoundError:
        print(f"❌ Файл '{filename}' не найден!")
        print()
        print("Создайте файл build_code.txt и вставьте туда код билда из Path of Building:")
        print()
        print("1. В Path of Building нажмите 'Import/Export Build'")
        print("2. Нажмите 'Generate'")
        print("3. Скопируйте ВЕСЬ текст (Ctrl+A, затем Ctrl+C)")
        print("4. Создайте файл build_code.txt и вставьте туда код")
        print("5. Запустите этот скрипт снова")
        return

    print("=" * 100)
    print("ТЕСТ ПАРСЕРА PoB BUILD")
    print("=" * 100)
    print(f"\n✓ Файл найден: {filename}")
    print(f"✓ Длина кода: {len(build_code)} символов")

    if len(build_code) < 100:
        print(f"\n⚠ ВНИМАНИЕ: Код слишком короткий ({len(build_code)} символов)!")
        print("   Обычно код билда занимает несколько тысяч символов.")
        print("   Убедитесь, что скопировали ВЕСЬ код из Path of Building.")
        return

    print(f"✓ Длина кода выглядит нормально")
    print(f"✓ Первые символы: {build_code[:50]}...")
    print(f"✓ Последние символы: ...{build_code[-50:]}")

    print("\n" + "-" * 100)
    print("ПАРСИНГ...")
    print("-" * 100)

    parser = PoBParser(build_code)

    try:
        parser.parse()
        print("✓ Билд успешно декодирован и распарсен!")
    except Exception as e:
        print(f"\n❌ ОШИБКА ПАРСИНГА:")
        print(f"   {e}")
        print()
        print("Возможные причины:")
        print("  1. Код билда скопирован не полностью")
        print("  2. При копировании были добавлены переносы строк или пробелы")
        print("  3. Файл сохранен в неправильной кодировке")
        print()
        print("Попробуйте:")
        print("  1. В PoB: Import/Export Build → Generate")
        print("  2. Выделите ВЕСЬ текст (Ctrl+A)")
        print("  3. Скопируйте (Ctrl+C)")
        print("  4. Вставьте в build_code.txt одной строкой без переносов")
        return

    # Получаем данные
    info = parser.get_build_info()
    items = parser.get_items()

    print("\n" + "-" * 100)
    print("ИНФОРМАЦИЯ О БИЛДЕ")
    print("-" * 100)
    print(f"  Класс: {info['className']}")
    print(f"  Подкласс: {info['ascendClassName']}")
    print(f"  Уровень: {info['level']}")

    print("\n" + "-" * 100)
    print("ПРЕДМЕТЫ")
    print("-" * 100)
    print(f"  Экипировка: {len(items['equipment'])}")
    print(f"  Jewels: {len(items['jewels'])}")
    print(f"  Flasks: {len(items['flasks'])}")

    # Детали по jewels
    if items['jewels']:
        print("\n" + "-" * 100)
        print("JEWELS (детали)")
        print("-" * 100)
        for idx, jewel in enumerate(items['jewels'], 1):
            print(f"\n  [{idx}] {jewel['rarity']} - {jewel['name']}")
            print(f"      База: {jewel['base_type']}")
            print(f"      Слот: {jewel['slot']}")
            total_mods = len(jewel['explicits']) + len(jewel['prefixes']) + len(jewel['suffixes'])
            print(f"      Модов: {total_mods}")

    # Детали по flasks
    if items['flasks']:
        print("\n" + "-" * 100)
        print("FLASKS (детали)")
        print("-" * 100)
        for idx, flask in enumerate(items['flasks'], 1):
            print(f"\n  [{idx}] {flask['rarity']} - {flask['name']}")
            print(f"      База: {flask['base_type']}")
            total_mods = len(flask['explicits']) + len(flask['prefixes']) + len(flask['suffixes'])
            print(f"      Модов: {total_mods}")

    print("\n" + "=" * 100)
    print("✓ ТЕСТ ЗАВЕРШЕН УСПЕШНО!")
    print("=" * 100)

if __name__ == '__main__':
    filename = sys.argv[1] if len(sys.argv) > 1 else 'build_code.txt'
    test_from_file(filename)
