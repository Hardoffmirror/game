#!/usr/bin/env python3
"""
Упрощенный тест диагностики jewels - принимает код билда как аргумент
Использование: python test_jewels_simple.py "ваш_код_билда"
"""

import sys
from pob_parser import PoBParser

def diagnose_jewels(build_code):
    """Детальная диагностика jewels"""
    print("=" * 100)
    print("ДИАГНОСТИКА JEWELS")
    print("=" * 100)
    print(f"\nДлина кода билда: {len(build_code)} символов")

    parser = PoBParser(build_code)

    try:
        parser.parse()
        print("✓ Билд успешно декодирован и распарсен")
    except Exception as e:
        print(f"\n✗ ОШИБКА ПАРСИНГА:")
        print(f"  {e}")
        print(f"\nПроверьте, что код билда скопирован полностью из Path of Building.")
        print(f"Код должен начинаться с букв (например: eNrt...) и быть длинным.")
        return

    print("\n" + "-" * 100)
    print("ПОИСК JEWELS")
    print("-" * 100)

    items = parser.get_items()
    jewels_parsed = items['jewels']

    print(f"\n✓ Найдено jewels: {len(jewels_parsed)}")

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
            if jewel['prefixes']:
                print(f"    Префиксы:")
                for mod in jewel['prefixes']:
                    text = mod['text'] if isinstance(mod, dict) else mod
                    print(f"      - {text}")
            if jewel['suffixes']:
                print(f"    Суффиксы:")
                for mod in jewel['suffixes']:
                    text = mod['text'] if isinstance(mod, dict) else mod
                    print(f"      - {text}")
    else:
        print("\n⚠ JEWELS НЕ НАЙДЕНЫ в билде")

    print("\n" + "=" * 100)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Использование:")
        print(f"  python {sys.argv[0]} \"ваш_код_билда\"")
        print()
        print("Или используйте stdin:")
        print(f"  python {sys.argv[0]}")
        print()

        # Пробуем читать из stdin
        print("Вставьте код билда из Path of Building:")
        print("(После вставки нажмите Enter, затем Ctrl+D на Linux/Mac или Ctrl+Z на Windows)")
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
    else:
        build_code = sys.argv[1].strip()

    diagnose_jewels(build_code)
