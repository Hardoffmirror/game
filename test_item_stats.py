#!/usr/bin/env python3
"""
Тест расчета статистики для отдельных предметов
"""

from pob_parser import PoBParser

# Простой тест: создаем предмет с модами вручную
test_item = {
    'name': 'Test Ring',
    'slot': 'Ring 1',
    'rarity': 'RARE',
    'base_type': 'Gold Ring',
    'implicits': [
        {'text': '+20 to maximum Life'}
    ],
    'explicits': [],
    'prefixes': [
        {'text': '+50 to maximum Life'}
    ],
    'suffixes': [
        {'text': '+45% to Fire Resistance'},
        {'text': '+38% to Cold Resistance'}
    ],
    'crafted_mods': [],
    'enchant_mods': [],
    'fractured_mods': [],
}

# Создаем фейковый парсер для теста
class FakeParser:
    def __init__(self):
        pass

# Копируем метод из PoBParser
parser = PoBParser("dummy")

# Вызываем метод напрямую
stats = parser.calculate_item_stats(test_item)

print("=" * 60)
print("ТЕСТ РАСЧЕТА СТАТИСТИКИ ПРЕДМЕТА")
print("=" * 60)
print(f"\nПредмет: {test_item['name']}")
print(f"Моды:")
print(f"  Implicits: {test_item['implicits']}")
print(f"  Prefixes: {test_item['prefixes']}")
print(f"  Suffixes: {test_item['suffixes']}")
print(f"\nРассчитанная статистика:")
for stat_name, stat_value in stats.items():
    print(f"  {stat_name}: {stat_value}")

print("\n" + "=" * 60)
print("Ожидаемые результаты:")
print("  Life: +70 to Life (20 + 50)")
print("  FireResist: +45% Fire Resistance")
print("  ColdResist: +38% Cold Resistance")
print("=" * 60)
