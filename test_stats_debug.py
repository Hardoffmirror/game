"""
Скрипт для диагностики статистики персонажа в PoB билде
"""
import json
from pob_parser import PoBParser

# Читаем билд из файла
with open('build_code.txt', 'r') as f:
    build_code = f.read().strip()

# Парсим билд
parser = PoBParser(build_code)
parser.parse()

print("=" * 80)
print("ДИАГНОСТИКА СТРУКТУРЫ XML БИЛДА")
print("=" * 80)

# Проверяем структуру XML
root = parser.root

# 1. Проверяем Build элемент
build_elem = root.find('Build')
if build_elem is not None:
    print("\n[BUILD ЭЛЕМЕНТ]")
    print(f"Всего атрибутов: {len(build_elem.attrib)}")
    print("\nВсе атрибуты Build:")
    for key, value in build_elem.attrib.items():
        print(f"  {key}: {value}")

    print("\nДочерние элементы Build:")
    for child in build_elem:
        print(f"  - {child.tag} (атрибутов: {len(child.attrib)})")

# 2. Проверяем PlayerStat
player_stat = root.find('.//PlayerStat')
if player_stat is not None:
    print("\n[PLAYERSTAT ЭЛЕМЕНТ НАЙДЕН]")
    print(f"Всего атрибутов: {len(player_stat.attrib)}")
    if len(player_stat.attrib) > 0:
        print("\nПримеры атрибутов PlayerStat (первые 20):")
        for i, (key, value) in enumerate(list(player_stat.attrib.items())[:20]):
            print(f"  {key}: {value}")
else:
    print("\n[PLAYERSTAT НЕ НАЙДЕН]")

# 3. Проверяем Calcs
calcs = root.find('.//Calcs')
if calcs is not None:
    print("\n[CALCS ЭЛЕМЕНТ НАЙДЕН]")
    print(f"Всего атрибутов: {len(calcs.attrib)}")
    if len(calcs.attrib) > 0:
        print("\nПримеры атрибутов Calcs (первые 20):")
        for i, (key, value) in enumerate(list(calcs.attrib.items())[:20]):
            print(f"  {key}: {value}")
else:
    print("\n[CALCS НЕ НАЙДЕН]")

# 4. Поиск всех элементов с интересующими нас атрибутами
print("\n" + "=" * 80)
print("ПОИСК ЭЛЕМЕНТОВ СО СТАТИСТИКОЙ")
print("=" * 80)

stats_keywords = ['life', 'mana', 'es', 'energyshield', 'dps', 'resist', 'crit']

found_elements = []
for elem in root.iter():
    for attr_name in elem.attrib.keys():
        attr_lower = attr_name.lower()
        if any(kw in attr_lower for kw in stats_keywords):
            found_elements.append((elem.tag, attr_name, elem.get(attr_name)))

if found_elements:
    print(f"\nНайдено {len(found_elements)} атрибутов со статистикой:")
    for tag, attr, value in found_elements[:30]:  # Показываем первые 30
        print(f"  [{tag}] {attr} = {value}")
else:
    print("\nНи одного атрибута со статистикой не найдено!")

# 5. Теперь парсим с отладкой
print("\n" + "=" * 80)
print("ЗАПУСК ПАРСИНГА СТАТИСТИКИ")
print("=" * 80)

stats = parser.get_character_stats()

print("\n" + "=" * 80)
print("РЕЗУЛЬТАТ")
print("=" * 80)
print(json.dumps(stats, indent=2, ensure_ascii=False))
