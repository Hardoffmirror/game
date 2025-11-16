"""
Скрипт для проверки вашего билда - вставьте код и увидите, есть ли в нём статистика
"""
from pob_parser import PoBParser
import json
import sys

print("=" * 100)
print("ПРОВЕРКА БИЛДА НА НАЛИЧИЕ СТАТИСТИКИ")
print("=" * 100)
print("\nВставьте код билда из Path of Building и нажмите Enter:")

# Читаем код билда
build_code = input().strip()

if not build_code:
    print("Ошибка: Не введен код билда")
    sys.exit(1)

# Парсим
parser = PoBParser(build_code)
try:
    parser.parse()
except Exception as e:
    print(f"Ошибка парсинга: {e}")
    sys.exit(1)

root = parser.root

# Проверяем все элементы, которые могут содержать статистику
print("\n" + "=" * 100)
print("ПОИСК СТАТИСТИКИ В XML")
print("=" * 100)

# 1. Build элемент
build = root.find('Build')
if build is not None:
    print(f"\n[Build] Найдено {len(build.attrib)} атрибутов")

    # Ищем атрибуты связанные со статистикой
    stats_attrs = {}
    for key, value in build.attrib.items():
        key_lower = key.lower()
        if any(kw in key_lower for kw in ['life', 'mana', 'es', 'dps', 'resist', 'damage', 'crit']):
            stats_attrs[key] = value

    if stats_attrs:
        print("\nНайденные атрибуты статистики:")
        for key, value in stats_attrs.items():
            print(f"  {key}: {value}")
    else:
        print("\n⚠ Атрибуты статистики НЕ найдены")

# 2. PlayerStat
player_stat = root.find('.//PlayerStat')
if player_stat is not None:
    print(f"\n[PlayerStat] Найдено {len(player_stat.attrib)} атрибутов")

    # Показываем первые 10
    print("\nПримеры атрибутов:")
    for i, (key, value) in enumerate(list(player_stat.attrib.items())[:10]):
        print(f"  {key}: {value}")
else:
    print("\n[PlayerStat] НЕ найден")

# 3. Calcs
calcs = root.find('.//Calcs')
if calcs is not None:
    print(f"\n[Calcs] Найдено {len(calcs.attrib)} атрибутов")

    # Показываем первые 10
    print("\nПримеры атрибутов:")
    for i, (key, value) in enumerate(list(calcs.attrib.items())[:10]):
        print(f"  {key}: {value}")
else:
    print("\n[Calcs] НЕ найден")

# 4. Ищем ЛЮБЫЕ элементы со статистикой
print("\n" + "=" * 100)
print("ПОИСК ВСЕХ ЭЛЕМЕНТОВ СО СТАТИСТИКОЙ")
print("=" * 100)

stats_keywords = ['life', 'mana', 'es', 'dps', 'resist', 'damage', 'crit']
found = {}

for elem in root.iter():
    for attr_name, attr_value in elem.attrib.items():
        attr_lower = attr_name.lower()
        if any(kw in attr_lower for kw in stats_keywords):
            if elem.tag not in found:
                found[elem.tag] = []
            found[elem.tag].append((attr_name, attr_value))

if found:
    print(f"\nНайдено {len(found)} типов элементов со статистикой:")
    for tag, attrs in found.items():
        print(f"\n  [{tag}] {len(attrs)} атрибутов:")
        for name, value in attrs[:5]:  # Показываем первые 5
            print(f"    {name} = {value}")
else:
    print("\n⚠ СТАТИСТИКА НЕ НАЙДЕНА В XML!")
    print("\nЭто нормально - Path of Building не экспортирует рассчитанную статистику в код билда.")
    print("Статистика рассчитывается динамически в самой программе PoB.")

# Теперь пробуем парсить статистику
print("\n" + "=" * 100)
print("ПОПЫТКА ИЗВЛЕЧЬ СТАТИСТИКУ")
print("=" * 100)

stats = parser.get_character_stats()

print("\nРезультат:")
print(f"  Life: {stats['life']}")
print(f"  ES: {stats['es']}")
print(f"  Mana: {stats['mana']}")
print(f"  DPS: {stats['dps']}")
print(f"  Resistances: {stats['resistances']}")
print(f"  Pantheon: {stats['pantheon']}")

if all(v is None for v in [stats['life'], stats['es'], stats['mana'], stats['dps']]):
    print("\n" + "=" * 100)
    print("ВЫВОД")
    print("=" * 100)
    print("\n⚠ Статистика персонажа НЕ доступна в экспортированном коде билда.")
    print("\nПричина: Path of Building не сохраняет рассчитанную статистику в код билда.")
    print("Код билда содержит только конфигурацию (предметы, древо, камни).")
    print("\nРешение: Статистика должна рассчитываться отдельно на основе предметов и древа.")
