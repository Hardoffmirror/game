#!/usr/bin/env python3
"""
Юнит-тест системы расчетов на синтетических данных
"""
from calc import ModDB, ModType, ModParser, CalcDefence, CalcOffence


def test_mod_db():
    """Тестирует ModDB"""
    print("=" * 80)
    print("ТЕСТ 1: ModDB - База данных модификаторов")
    print("=" * 80)

    mod_db = ModDB()

    # Добавляем базовую жизнь
    mod_db.add('Life', ModType.BASE, 50, source="Test Item 1")
    mod_db.add('Life', ModType.BASE, 70, source="Test Item 2")

    # Добавляем increased life
    mod_db.add('Life', ModType.INC, 30, source="Test Item 3")  # +30% increased
    mod_db.add('Life', ModType.INC, 20, source="Test Item 4")  # +20% increased

    # Добавляем more life
    mod_db.add('Life', ModType.MORE, 10, source="Test Keystone")  # +10% more

    # Проверяем суммирование
    base_life = mod_db.sum(ModType.BASE, 'Life')
    inc_life = mod_db.sum(ModType.INC, 'Life')

    print(f"\nБазовая жизнь (BASE): {base_life}")
    print(f"Увеличение жизни (INC): {inc_life}%")

    # Расчёт: (50 + 70) * (1 + 50/100) * (1 + 10/100) = 120 * 1.5 * 1.1 = 198
    result = 120 * (1 + inc_life / 100)
    result = mod_db.more(result, 'Life')

    print(f"Итоговая жизнь от модов: {result}")
    print(f"Ожидаем: {120 * 1.5 * 1.1} = 198")

    assert abs(result - 198) < 0.01, f"Ошибка расчёта! {result} != 198"
    print("✓ Тест пройден!")


def test_mod_parser():
    """Тестирует ModParser"""
    print("\n" + "=" * 80)
    print("ТЕСТ 2: ModParser - Парсинг модификаторов")
    print("=" * 80)

    test_mods = [
        "+50 to maximum Life",
        "30% increased maximum Life",
        "+40% to Fire Resistance",
        "Adds 10 to 20 Physical Damage",
        "15% increased Attack Speed",
        "+25% to Critical Strike Multiplier"
    ]

    for mod_text in test_mods:
        parsed = ModParser.parse_mod_line(mod_text)
        print(f"\n'{mod_text}'")
        if parsed:
            for stat_name, mod_type, value, flags in parsed:
                print(f"  → {stat_name}: {mod_type.value} {value} (flags: {flags})")
        else:
            print(f"  → НЕ РАСПОЗНАН")

    print("\n✓ Тест завершён!")


def test_item_parsing():
    """Тестирует парсинг предмета целиком"""
    print("\n" + "=" * 80)
    print("ТЕСТ 3: Парсинг предмета")
    print("=" * 80)

    # Создаём синтетический предмет
    item_data = {
        'name': 'Test Ring',
        'base_type': 'Gold Ring',
        'implicits': [],
        'explicits': [
            {'text': '+50 to maximum Life', 'type': None},
            {'text': '+30% to Fire Resistance', 'type': None},
            {'text': '+25% to Cold Resistance', 'type': None},
        ],
        'prefixes': [],
        'suffixes': [],
        'crafted_mods': [],
        'enchant_mods': [],
        'fractured_mods': []
    }

    mod_db = ModDB()
    ModParser.parse_item_mods(item_data, mod_db, source="Test Ring")

    print(f"\nПредмет: {item_data['name']}")
    print(f"Моды:")
    for exp in item_data['explicits']:
        print(f"  - {exp['text']}")

    print(f"\nРаспознанные модификаторы:")
    mod_db.debug_print(limit=10)

    # Проверяем что жизнь добавилась
    life = mod_db.sum(ModType.BASE, 'Life')
    fire_res = mod_db.sum(ModType.BASE, 'FireResist')
    cold_res = mod_db.sum(ModType.BASE, 'ColdResist')

    print(f"\nСуммарные значения:")
    print(f"  Life: {life}")
    print(f"  Fire Resist: {fire_res}")
    print(f"  Cold Resist: {cold_res}")

    assert life == 50, f"Life должна быть 50, получили {life}"
    assert fire_res == 30, f"Fire Resist должна быть 30, получили {fire_res}"
    assert cold_res == 25, f"Cold Resist должна быть 25, получили {cold_res}"

    print("\n✓ Тест пройден!")


def test_defence_calculations():
    """Тестирует расчёты защиты"""
    print("\n" + "=" * 80)
    print("ТЕСТ 4: Расчёт защитных характеристик")
    print("=" * 80)

    mod_db = ModDB()

    # Добавляем жизнь от предметов
    mod_db.add('Life', ModType.BASE, 60, source="Ring 1")
    mod_db.add('Life', ModType.BASE, 50, source="Ring 2")
    mod_db.add('Life', ModType.INC, 40, source="Passive Tree")  # +40% increased

    # Добавляем сопротивления
    mod_db.add('FireResist', ModType.BASE, 45, source="Ring 1")
    mod_db.add('ColdResist', ModType.BASE, 40, source="Ring 2")
    mod_db.add('LightningResist', ModType.BASE, 35, source="Amulet")

    # Расчёт для уровня 80
    level = 80
    defence = CalcDefence.calculate_all(mod_db, level)

    print(f"\nУровень персонажа: {level}")
    print(f"\nЗащитные характеристики:")
    print(f"  Life: {defence['life']['total']}")
    print(f"    - From Level: {defence['life']['from_level']}")
    print(f"    - From Gear: {defence['life']['from_gear']}")
    print(f"    - Total Base: {defence['life']['base']}")
    print(f"    - Increased: {defence['life']['increased']}%")

    print(f"\n  Resistances:")
    print(f"    Fire:      {defence['resistances']['fire']['total']}%")
    print(f"    Cold:      {defence['resistances']['cold']['total']}%")
    print(f"    Lightning: {defence['resistances']['lightning']['total']}%")
    print(f"    Chaos:     {defence['resistances']['chaos']['total']}%")

    # Проверяем расчёт жизни
    # Base from level = 38 + (80-1) * 12 = 38 + 948 = 986
    # Base from gear = 60 + 50 = 110
    # Total base = 986 + 110 = 1096
    # With 40% increased = 1096 * 1.4 = 1534.4 ≈ 1534
    expected_life = int((38 + (level - 1) * 12 + 110) * 1.4)

    print(f"\nПроверка расчёта жизни:")
    print(f"  Ожидаем: {expected_life}")
    print(f"  Получили: {defence['life']['total']}")

    assert defence['life']['total'] == expected_life, "Ошибка расчёта жизни"
    assert defence['resistances']['fire']['total'] == 45, "Ошибка расчёта Fire Resist"

    print("\n✓ Тест пройден!")


def test_offence_calculations():
    """Тестирует расчёты атаки"""
    print("\n" + "=" * 80)
    print("ТЕСТ 5: Расчёт атакующих характеристик")
    print("=" * 80)

    mod_db = ModDB()

    # Добавляем крит
    mod_db.add('CritChance', ModType.BASE, 1.5, source="Weapon")
    mod_db.add('CritChance', ModType.INC, 200, source="Passive Tree")  # +200% increased

    # Добавляем crit multi
    mod_db.add('CritMultiplier', ModType.BASE, 50, source="Amulet")  # +50%

    # Добавляем attack speed
    mod_db.add('AttackSpeed', ModType.INC, 30, source="Gloves")  # +30% increased

    offence = CalcOffence.calculate_all(mod_db)

    print(f"\nАтакующие характеристики:")
    print(f"  Crit Chance: {offence['crit_chance']['total']}%")
    print(f"    - Base: {offence['crit_chance']['base']}%")
    print(f"    - Increased: {offence['crit_chance']['increased']}%")

    print(f"\n  Crit Multiplier: {offence['crit_multiplier']['total']}%")
    print(f"    - Base: {offence['crit_multiplier']['base']}%")
    print(f"    - Added: {offence['crit_multiplier']['added']}%")

    print(f"\n  Attack Speed: {offence['attack_speed']['total']}")
    print(f"    - Base: {offence['attack_speed']['base']}")
    print(f"    - Increased: {offence['attack_speed']['increased']}%")

    # Проверяем crit chance: (5 + 1.5) * (1 + 200/100) = 6.5 * 3 = 19.5
    expected_crit = (5 + 1.5) * 3
    assert abs(offence['crit_chance']['total'] - expected_crit) < 0.01, "Ошибка расчёта крита"

    # Проверяем crit multi: 150 + 50 = 200
    assert offence['crit_multiplier']['total'] == 200, "Ошибка расчёта crit multi"

    print("\n✓ Тест пройден!")


if __name__ == "__main__":
    print("ЗАПУСК ЮНИТ-ТЕСТОВ СИСТЕМЫ РАСЧЁТОВ\n")

    try:
        test_mod_db()
        test_mod_parser()
        test_item_parsing()
        test_defence_calculations()
        test_offence_calculations()

        print("\n" + "=" * 80)
        print("ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! ✓")
        print("=" * 80)

    except AssertionError as e:
        print(f"\n❌ ТЕСТ ПРОВАЛЕН: {e}")
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
