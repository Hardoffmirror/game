#!/usr/bin/env python3
"""
Тестовый скрипт для проверки новой системы расчетов
"""
from pob_parser import PoBParser
import json


def test_build_calculations():
    """Тестирует расчеты на реальном билде"""
    print("=" * 100)
    print("ТЕСТ СИСТЕМЫ РАСЧЕТОВ СТАТИСТИКИ")
    print("=" * 100)
    print("\nВставьте код билда из Path of Building и нажмите Enter:")

    # Читаем код билда
    build_code = input().strip()

    if not build_code:
        print("Ошибка: Не введен код билда")
        return

    # Парсим
    print("\n" + "=" * 100)
    print("ПАРСИНГ БИЛДА")
    print("=" * 100)

    parser = PoBParser(build_code)
    try:
        parser.parse()
    except Exception as e:
        print(f"Ошибка парсинга: {e}")
        return

    # Получаем информацию о билде
    build_info = parser.get_build_info()
    print(f"\nБилд: {build_info['className']} (Level {build_info['level']})")
    if build_info['ascendClassName'] != 'None':
        print(f"Ascendancy: {build_info['ascendClassName']}")

    # Получаем предметы для проверки
    items = parser.get_items()
    print(f"\nПредметов в билде:")
    print(f"  Equipment: {len(items['equipment'])}")
    print(f"  Jewels: {len(items['jewels'])}")
    print(f"  Flasks: {len(items['flasks'])}")

    # Показываем примеры предметов с модами
    if items['equipment']:
        print(f"\nПример экипировки (первый предмет):")
        first_item = items['equipment'][0]
        print(f"  {first_item['name']} ({first_item['base_type']})")
        if first_item.get('implicits'):
            print(f"  Implicits: {len(first_item['implicits'])}")
            for imp in first_item['implicits'][:3]:
                print(f"    - {imp['text']}")
        if first_item.get('explicits'):
            print(f"  Explicits: {len(first_item['explicits'])}")
            for exp in first_item['explicits'][:3]:
                print(f"    - {exp['text']}")

    # ГЛАВНЫЙ ТЕСТ: Вызываем новую систему расчетов
    print("\n" + "=" * 100)
    print("РАСЧЁТ СТАТИСТИКИ (НОВАЯ СИСТЕМА)")
    print("=" * 100)

    try:
        calculated_stats = parser.calculate_character_stats()

        # Выводим результаты
        print("\n" + "=" * 100)
        print("ФИНАЛЬНЫЕ РЕЗУЛЬТАТЫ")
        print("=" * 100)

        print(f"\n📊 ЗАЩИТА:")
        print(f"  Life:              {calculated_stats['life']:,}")
        print(f"    - From Level:    {calculated_stats['life_details']['from_level']:,}")
        print(f"    - From Gear:     {calculated_stats['life_details']['from_gear']:,}")
        print(f"    - Increased:     {calculated_stats['life_details']['increased']:.1f}%")

        print(f"\n  Energy Shield:     {calculated_stats['energy_shield']:,}")
        if calculated_stats['energy_shield'] > 0:
            print(f"    - Base:          {calculated_stats['es_details']['base']:,}")
            print(f"    - Increased:     {calculated_stats['es_details']['increased']:.1f}%")

        print(f"\n  Mana:              {calculated_stats['mana']:,}")
        print(f"    - From Level:    {calculated_stats['mana_details']['from_level']:,}")
        print(f"    - From Gear:     {calculated_stats['mana_details']['from_gear']:,}")
        print(f"    - Increased:     {calculated_stats['mana_details']['increased']:.1f}%")

        print(f"\n  Armour:            {calculated_stats['armour']:,}")
        print(f"  Evasion:           {calculated_stats['evasion']:,}")

        print(f"\n🛡️  СОПРОТИВЛЕНИЯ:")
        print(f"  Fire:              {calculated_stats['resistances']['fire']:>3}%")
        print(f"  Cold:              {calculated_stats['resistances']['cold']:>3}%")
        print(f"  Lightning:         {calculated_stats['resistances']['lightning']:>3}%")
        print(f"  Chaos:             {calculated_stats['resistances']['chaos']:>3}%")

        print(f"\n⚔️  АТАКА:")
        print(f"  Crit Chance:       {calculated_stats['crit_chance']:>6.2f}%")
        print(f"  Crit Multiplier:   {calculated_stats['crit_multiplier']:>6}%")
        print(f"  Attack Speed:      {calculated_stats['attack_speed']:>6.2f}")
        print(f"  Cast Speed:        {calculated_stats['cast_speed']:>6.2f}")

        print(f"\n💥 МОДИФИКАТОРЫ УРОНА:")
        for dmg_type, data in calculated_stats['damage_modifiers'].items():
            if data['increased'] != 0:
                print(f"  {dmg_type.capitalize():15s} +{data['increased']:.0f}% increased")

        print("\n" + "=" * 100)
        print("ПРИМЕЧАНИЕ:")
        print("Это расчёты ТОЛЬКО на основе предметов.")
        print("Для полной статистики нужно добавить:")
        print("  - Пассивное дерево (passive tree)")
        print("  - Камни умений (skill gems)")
        print("  - Ascendancy")
        print("  - Pantheon")
        print("=" * 100)

    except Exception as e:
        print(f"\nОшибка при расчёте: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_build_calculations()
