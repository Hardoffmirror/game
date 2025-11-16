#!/usr/bin/env python3
"""
Диагностика: проверяем, какие данные о пассивном дереве есть в билде
"""
import sys
from pob_parser import PoBParser


def analyze_tree_data(build_code):
    """Анализирует данные о пассивном дереве в билде"""
    parser = PoBParser(build_code)
    parser.parse()

    print("=" * 60)
    print("АНАЛИЗ ДАННЫХ ПАССИВНОГО ДЕРЕВА")
    print("=" * 60)

    root = parser.root

    # 1. Ищем секцию Tree
    tree_section = root.find('.//Tree')
    if tree_section is not None:
        print("\n✓ Найдена секция Tree")
        print(f"  Атрибуты: {list(tree_section.attrib.keys())[:10]}")

        # Ищем активные ноды
        spec = tree_section.find('Spec')
        if spec is not None:
            print(f"\n✓ Найдена Spec (активное дерево)")
            print(f"  Атрибуты Spec: {list(spec.attrib.keys())}")

            # URL дерева
            tree_url = spec.get('treeVersion', 'Unknown')
            print(f"  Tree version: {tree_url}")

            # Ноды дерева
            nodes = spec.get('nodes', '')
            if nodes:
                node_list = nodes.split(',')
                print(f"  Количество активных нод: {len(node_list)}")
                print(f"  Примеры нод: {node_list[:10]}")

        # Ищем URL или данные нод
        url = tree_section.find('.//URL')
        if url is not None and url.text:
            print(f"\n✓ URL пассивного дерева:\n  {url.text}")
    else:
        print("\n✗ Секция Tree НЕ найдена")

    # 2. Ищем секцию Skills (навыки)
    skills_section = root.find('.//Skills')
    if skills_section is not None:
        print("\n✓ Найдена секция Skills")
        skill_groups = skills_section.findall('Skill')
        print(f"  Количество Skill групп: {len(skill_groups)}")

        if skill_groups:
            first_skill = skill_groups[0]
            print(f"  Атрибуты первого Skill: {dict(first_skill.attrib)}")

            # Гемы в скилле
            gems = first_skill.findall('Gem')
            if gems:
                print(f"  Количество гемов в первом скилле: {len(gems)}")
                first_gem = gems[0]
                print(f"  Первый гем: {dict(first_gem.attrib)}")

    # 3. Проверяем классы и асцендансию
    build_elem = root.find('Build')
    if build_elem is not None:
        class_name = build_elem.get('className', 'Unknown')
        ascend = build_elem.get('ascendClassName', 'None')
        level = build_elem.get('level', 'Unknown')

        print(f"\n✓ Информация о персонаже:")
        print(f"  Класс: {class_name}")
        print(f"  Асцендансия: {ascend}")
        print(f"  Уровень: {level}")

    # 4. Проверяем, есть ли уже посчитанная статистика
    print("\n" + "=" * 60)
    print("ПОИСК ПРЕДРАСЧИТАННОЙ СТАТИСТИКИ")
    print("=" * 60)

    # Ищем PlayerStat в Build
    if build_elem is not None:
        stat_attrs = {}
        for attr_name, attr_value in build_elem.attrib.items():
            if any(keyword in attr_name.lower() for keyword in
                   ['life', 'mana', 'es', 'resist', 'dps', 'damage', 'armour', 'evasion']):
                stat_attrs[attr_name] = attr_value

        if stat_attrs:
            print("\n✓ Найдены атрибуты статистики в Build:")
            for name, value in list(stat_attrs.items())[:20]:
                print(f"  {name}: {value}")
            if len(stat_attrs) > 20:
                print(f"  ... и ещё {len(stat_attrs) - 20} атрибутов")
        else:
            print("\n✗ Статистика в Build НЕ найдена")

    # Ищем в других местах
    for elem in root.iter():
        if 'PlayerStat' in elem.tag or 'Calcs' in elem.tag:
            print(f"\n✓ Найден элемент: {elem.tag}")
            print(f"  Количество атрибутов: {len(elem.attrib)}")
            if len(elem.attrib) > 0:
                sample = dict(list(elem.attrib.items())[:10])
                print(f"  Примеры атрибутов: {sample}")

    print("\n" + "=" * 60)


def main():
    print("Введите код билда из Path of Building:")
    print("(или нажмите Ctrl+C для выхода)\n")

    build_code = input("> ").strip()

    if not build_code:
        print("Код билда не может быть пустым!")
        return 1

    try:
        analyze_tree_data(build_code)
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
