#!/usr/bin/env python3
"""
Комплексный тест парсера - проверка jewels, flasks и модов
"""

from pob_parser import PoBParser
import xml.etree.ElementTree as ET

# Создаем тестовый XML с jewels и flasks
test_xml = """<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
    <Build level="95" className="Ranger" ascendClassName="Deadeye"/>
    <Items>
        <!-- Обычный предмет -->
        <Item id="1">Rarity: RARE
Doom Loop
Coral Ring
Implicits: 1
+25 to maximum Life
{crafted}+34% to Fire Resistance
+42% to Cold Resistance
+12 to maximum Mana
18% increased Rarity of Items found
</Item>

        <!-- Jewel #1 -->
        <Item id="2">Rarity: RARE
Hypnotic Spark
Crimson Jewel
10% increased maximum Life
15% increased Fire Damage
12% increased Attack Speed
</Item>

        <!-- Jewel #2 -->
        <Item id="3">Rarity: UNIQUE
Watcher's Eye
Prismatic Jewel
Implicits: 0
5% increased maximum Energy Shield
4% increased maximum Life
5% increased maximum Mana
</Item>

        <!-- Flask #1 -->
        <Item id="4">Rarity: MAGIC
Bubbling Divine Life Flask of the Rainbow
Divine Life Flask
Recovers 1920 Life over 3.50 Seconds
+20% to all Elemental Resistances during Effect
</Item>

        <!-- Flask #2 -->
        <Item id="5">Rarity: UNIQUE
Taste of Hate
Sapphire Flask
Lasts 4.00 Seconds
+50% to Cold Resistance
20% of Physical Damage taken as Cold Damage during Effect
Gain 15% of Physical Damage as Extra Cold Damage during Effect
</Item>

        <Slot name="Ring 1" itemId="1"/>
        <Slot name="Jewel 1" itemId="2"/>
        <Slot name="Jewel 2" itemId="3"/>
        <Slot name="Flask 1" itemId="4"/>
        <Slot name="Flask 2" itemId="5"/>
    </Items>
</PathOfBuilding>
"""

# Создаем парсер
parser = PoBParser("")
parser.xml_data = test_xml
parser.root = ET.fromstring(test_xml)

# Получаем все предметы
items = parser.get_items()

print("=" * 80)
print("КОМПЛЕКСНЫЙ ТЕСТ ПАРСЕРА")
print("=" * 80)

print(f"\n{'=' * 80}")
print(f"ЭКИПИРОВКА ({len(items['equipment'])} предметов)")
print(f"{'=' * 80}")
for item in items['equipment']:
    print(f"\n[{item['rarity']}] {item['name']} ({item['base_type']})")
    print(f"  Слот: {item['slot']}")
    if item['prefixes']:
        print(f"  Префиксы ({len(item['prefixes'])}):")
        for mod in item['prefixes']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")
    if item['suffixes']:
        print(f"  Суффиксы ({len(item['suffixes'])}):")
        for mod in item['suffixes']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")
    if item['crafted_mods']:
        print(f"  Крафтовые моды ({len(item['crafted_mods'])}):")
        for mod in item['crafted_mods']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")
    if item['implicits']:
        print(f"  Имплициты ({len(item['implicits'])}):")
        for mod in item['implicits']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")

print(f"\n{'=' * 80}")
print(f"САМОЦВЕТЫ (JEWELS) ({len(items['jewels'])} предметов)")
print(f"{'=' * 80}")
for item in items['jewels']:
    print(f"\n[{item['rarity']}] {item['name']} ({item['base_type']})")
    print(f"  Слот: {item['slot']}")
    if item['explicits']:
        print(f"  Моды ({len(item['explicits'])}):")
        for mod in item['explicits']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")
    if item['prefixes']:
        print(f"  Префиксы ({len(item['prefixes'])}):")
        for mod in item['prefixes']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")
    if item['suffixes']:
        print(f"  Суффиксы ({len(item['suffixes'])}):")
        for mod in item['suffixes']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")

print(f"\n{'=' * 80}")
print(f"ФЛАКОНЫ (FLASKS) ({len(items['flasks'])} предметов)")
print(f"{'=' * 80}")
for item in items['flasks']:
    print(f"\n[{item['rarity']}] {item['name']} ({item['base_type']})")
    print(f"  Слот: {item['slot']}")
    if item['properties']:
        print(f"  Свойства:")
        for key, value in item['properties'].items():
            print(f"    {key}: {value}")
    if item['explicits']:
        print(f"  Моды ({len(item['explicits'])}):")
        for mod in item['explicits']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")
    if item['prefixes']:
        print(f"  Префиксы ({len(item['prefixes'])}):")
        for mod in item['prefixes']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")
    if item['suffixes']:
        print(f"  Суффиксы ({len(item['suffixes'])}):")
        for mod in item['suffixes']:
            text = mod['text'] if isinstance(mod, dict) else mod
            print(f"    - {text}")

print(f"\n{'=' * 80}")
print("ИТОГИ:")
print(f"  Экипировка: {len(items['equipment'])}")
print(f"  Самоцветы: {len(items['jewels'])}")
print(f"  Флаконы: {len(items['flasks'])}")
print(f"  ВСЕГО: {len(items['equipment']) + len(items['jewels']) + len(items['flasks'])}")
print("=" * 80)
