#!/usr/bin/env python3
"""
Тест улучшенной эвристики определения префиксов/суффиксов
"""

from pob_parser import PoBParser

# Создаем парсер
parser = PoBParser("")

# Тестовые моды с ожидаемой классификацией
test_mods = [
    # Life моды
    ("+50 to maximum Life", "PREFIX", "Flat life - prefix"),
    ("10% increased maximum Life", "SUFFIX", "% increased life - suffix"),
    ("5% increased maximum Life", "SUFFIX", "% increased life - suffix"),

    # Mana моды
    ("+40 to maximum Mana", "PREFIX", "Flat mana - prefix"),
    ("8% increased maximum Mana", "SUFFIX", "% increased mana - suffix"),

    # ES моды
    ("+30 to maximum Energy Shield", "PREFIX", "Flat ES - prefix"),
    ("12% increased maximum Energy Shield", "SUFFIX", "% increased ES - suffix"),

    # Resistance моды (всегда suffix)
    ("+35% to Fire Resistance", "SUFFIX", "Fire res - suffix"),
    ("+42% to Cold Resistance", "SUFFIX", "Cold res - suffix"),
    ("+18% to Lightning Resistance", "SUFFIX", "Lightning res - suffix"),
    ("+15% to all Elemental Resistances", "SUFFIX", "All res - suffix"),

    # Attribute моды (всегда suffix)
    ("+25 to Strength", "SUFFIX", "Strength - suffix"),
    ("+30 to Dexterity", "SUFFIX", "Dexterity - suffix"),
    ("+28 to Intelligence", "SUFFIX", "Intelligence - suffix"),
    ("+12 to all Attributes", "SUFFIX", "All attributes - suffix"),

    # Speed моды (всегда suffix)
    ("12% increased Attack Speed", "SUFFIX", "Attack speed - suffix"),
    ("8% increased Cast Speed", "SUFFIX", "Cast speed - suffix"),

    # Damage моды
    ("Adds 10-20 Physical Damage", "PREFIX", "Added damage - prefix"),
    ("Adds 5-10 Cold Damage", "PREFIX", "Added cold damage - prefix"),
    ("30% increased Physical Damage", "PREFIX", "Increased phys damage - prefix"),

    # Crit моды (обычно suffix)
    ("25% increased Critical Strike Chance", "SUFFIX", "Crit chance - suffix"),
    ("+30% to Critical Strike Multiplier", "SUFFIX", "Crit multi - suffix"),

    # Accuracy (suffix)
    ("+250 to Accuracy Rating", "SUFFIX", "Accuracy - suffix"),

    # Rarity (suffix)
    ("18% increased Rarity of Items found", "SUFFIX", "Rarity - suffix"),

    # Level of gems (prefix)
    ("+1 to Level of all Fire Skill Gems", "PREFIX", "Gem level - prefix"),

    # Jewel моды
    ("10% increased maximum Life", "SUFFIX", "Jewel % life - suffix"),
    ("15% increased Fire Damage", "SUFFIX", "Jewel fire damage - suffix"),
    ("12% increased Attack Speed", "SUFFIX", "Jewel attack speed - suffix"),
]

print("=" * 100)
print("ТЕСТ УЛУЧШЕННОЙ ЭВРИСТИКИ КЛАССИФИКАЦИИ МОДОВ")
print("=" * 100)

total = len(test_mods)
correct = 0
failed = []

for mod_text, expected, description in test_mods:
    # Определяем тип мода
    is_prefix = parser._is_likely_prefix(mod_text)
    is_suffix = parser._is_likely_suffix(mod_text)

    # Определяем результат
    if is_prefix and not is_suffix:
        result = "PREFIX"
    elif is_suffix and not is_prefix:
        result = "SUFFIX"
    elif not is_prefix and not is_suffix:
        result = "EXPLICIT"
    else:
        result = "CONFLICT"

    # Проверяем
    status = "✓" if result == expected else "✗"
    if result == expected:
        correct += 1
    else:
        failed.append((mod_text, expected, result, description))

    print(f"{status} {description}")
    print(f"   Мод: \"{mod_text}\"")
    print(f"   Ожидается: {expected}, Получено: {result}")
    if result != expected:
        print(f"   ⚠️  ОШИБКА!")
    print()

print("=" * 100)
print("РЕЗУЛЬТАТЫ ТЕСТА")
print("=" * 100)
print(f"Всего тестов: {total}")
print(f"Правильно: {correct}")
print(f"Ошибок: {total - correct}")
print(f"Точность: {correct / total * 100:.1f}%")
print()

if failed:
    print("=" * 100)
    print("НЕУДАЧНЫЕ ТЕСТЫ:")
    print("=" * 100)
    for mod_text, expected, result, description in failed:
        print(f"✗ {description}")
        print(f"   Мод: \"{mod_text}\"")
        print(f"   Ожидалось: {expected}, но получено: {result}")
        print()
else:
    print("✓ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")

print("=" * 100)
