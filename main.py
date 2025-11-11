#!/usr/bin/env python3
"""
PoE Build Converter - Главный скрипт
Конвертирует билды из Path of Building в удобный для чтения формат
"""

import sys
import argparse
from pob_parser import PoBParser
from formatter import ItemFormatter


def main():
    """Главная функция программы"""
    parser = argparse.ArgumentParser(
        description='PoE Build Converter - конвертирует билды Path of Building',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:
  python main.py                    # Интерактивный режим
  python main.py -f build.txt       # Чтение из файла
  python main.py -r                 # Показать сырой текст предметов
  python main.py -s                 # Только список предметов
        """
    )

    parser.add_argument('-f', '--file', type=str, help='Файл с кодом билда')
    parser.add_argument('-r', '--raw', action='store_true', help='Показать сырой текст предметов')
    parser.add_argument('-s', '--simple', action='store_true', help='Простой список предметов')

    args = parser.parse_args()

    # Получаем код билда
    build_code = None

    if args.file:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                build_code = f.read().strip()
        except FileNotFoundError:
            print(f"Ошибка: Файл '{args.file}' не найден.")
            sys.exit(1)
        except Exception as e:
            print(f"Ошибка чтения файла: {e}")
            sys.exit(1)
    else:
        print("=" * 80)
        print("PoE Build Converter")
        print("=" * 80)
        print("\nВставьте код билда из Path of Building:")
        print("(Нажмите Enter два раза после вставки кода)\n")

        lines = []
        while True:
            try:
                line = input()
                if not line:
                    if lines:
                        break
                    else:
                        continue
                lines.append(line)
            except EOFError:
                break
            except KeyboardInterrupt:
                print("\n\nОтменено пользователем.")
                sys.exit(0)

        build_code = ''.join(lines).strip()

    if not build_code:
        print("Ошибка: Код билда не предоставлен.")
        sys.exit(1)

    # Парсим билд
    try:
        print("\nПарсинг билда...")
        pob = PoBParser(build_code)
        pob.parse()

        # Получаем информацию
        build_info = pob.get_build_info()
        items = pob.get_items()

        # Выводим результаты
        print("\n" + ItemFormatter.format_build_info(build_info))

        if args.simple:
            # Простой список
            print(ItemFormatter.format_simple_list(items))
        else:
            # Детальный вывод
            print(ItemFormatter.format_items_list(items, show_raw=args.raw))

        print("\n" + "=" * 80)
        print(f"Обработано успешно! Найдено предметов: {len(items)}")
        print("=" * 80)

    except ValueError as e:
        print(f"\nОшибка: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nНеожиданная ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
