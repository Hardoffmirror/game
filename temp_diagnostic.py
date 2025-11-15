from pob_parser import PoBParser
import sys

p = PoBParser(open('build_code.txt').read())
p.parse()

items = p.root.find('Items')
active_set = items.get('activeItemSet', '1')
print('ActiveItemSet:', active_set)

# Показываем все слоты
print('\n=== ВСЕ СЛОТЫ ===')
all_slots = items.findall('.//Slot')
print(f'Всего слотов: {len(all_slots)}\n')

# Группируем слоты по типам
main_slots = []
jewel_slots = []
abyssal_slots = []
other_slots = []

for s in all_slots:
    name = s.get('name', '')
    item_id = s.get('itemId', '0')

    if 'Jewel' in name:
        jewel_slots.append((name, item_id))
    elif 'Abyssal' in name:
        abyssal_slots.append((name, item_id))
    elif name in ['Weapon 1', 'Weapon 2', 'Helmet', 'Body Armour', 'Gloves', 'Boots', 'Amulet', 'Ring 1', 'Ring 2', 'Belt', 'Weapon 1 Swap', 'Weapon 2 Swap']:
        main_slots.append((name, item_id))
    else:
        other_slots.append((name, item_id))

print('ОСНОВНЫЕ ПРЕДМЕТЫ:')
for name, item_id in main_slots:
    print(f"  {name:30s} -> itemId={item_id}")

print('\nДРАГОЦЕННЫЕ КАМНИ (JEWELS):')
for name, item_id in jewel_slots:
    marker = ' ✓' if item_id != '0' else ''
    print(f"  {name:30s} -> itemId={item_id}{marker}")

print('\nАБИССАЛЬНЫЕ СОКЕТЫ:')
for name, item_id in abyssal_slots:
    marker = ' ✓' if item_id != '0' else ''
    print(f"  {name:30s} -> itemId={item_id}{marker}")

if other_slots:
    print('\nДРУГИЕ СЛОТЫ:')
    for name, item_id in other_slots:
        print(f"  {name:30s} -> itemId={item_id}")

# Показываем все Items с их ID
print('\n=== ВСЕ ПРЕДМЕТЫ (Items) ===')
all_items = items.findall('.//Item')
print(f'Всего предметов: {len(all_items)}\n')

for item in all_items:
    item_id = item.get('id', 'NO_ID')
    # Получаем первые несколько строк текста для идентификации
    item_text = item.text if item.text else ''
    first_line = item_text.split('\n')[0] if item_text else '(пусто)'
    print(f"  Item id={item_id:3s} -> {first_line[:60]}")
