"""
CalcOffence - Расчёт атакующих характеристик
Упрощённая версия, базовые расчёты

ПРИМЕЧАНИЕ: Полный расчёт DPS в PoE очень сложен и требует:
- Парсинг skill gems и их модификаторов
- Конверсия урона между типами (Physical -> Lightning -> Cold -> Fire -> Chaos)
- Расчёт криткритического урона
- Учёт ailment (poison, bleed, ignite)
- И многое другое

Эта версия предоставляет базовые оценки на основе статов персонажа
"""
from typing import Dict
from calc.mod_db import ModDB, ModType


class CalcOffence:
    """Калькулятор атакующих характеристик"""

    # Базовые значения
    BASE_CRIT_CHANCE = 5.0       # Базовый шанс крита
    BASE_CRIT_MULTI = 150.0      # Базовый множитель крита
    BASE_ATTACK_SPEED = 1.0      # Базовая скорость атаки

    @classmethod
    def calculate_crit_chance(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает шанс критического удара

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с информацией о крите
        """
        # 1. Базовый шанс крита
        base_crit = cls.BASE_CRIT_CHANCE

        # 2. Added crit chance (BASE моды)
        added_crit = mod_db.sum(ModType.BASE, 'CritChance')
        total_base = base_crit + added_crit

        # 3. Increased/Reduced Crit Chance (INC моды)
        inc_crit = mod_db.sum(ModType.INC, 'CritChance')

        # 4. Применяем increased
        crit_after_inc = total_base * (1 + inc_crit / 100)

        # 5. More/Less Crit Chance (MORE моды)
        final_crit = mod_db.more(crit_after_inc, 'CritChance')

        # Капаем на 100%
        final_crit = min(final_crit, 100.0)

        return {
            'total': round(final_crit, 2),
            'base': round(total_base, 2),
            'increased': round(inc_crit, 1)
        }

    @classmethod
    def calculate_crit_multiplier(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает множитель критического урона

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с информацией о множителе крита
        """
        # 1. Базовый множитель
        base_multi = cls.BASE_CRIT_MULTI

        # 2. Added crit multi (BASE моды) - например, "+30% to Critical Strike Multiplier"
        added_multi = mod_db.sum(ModType.BASE, 'CritMultiplier')

        # 3. Общий множитель
        total_multi = base_multi + added_multi

        return {
            'total': int(total_multi),
            'base': int(base_multi),
            'added': int(added_multi)
        }

    @classmethod
    def calculate_attack_speed(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает скорость атаки

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с информацией о скорости атаки
        """
        # 1. Базовая скорость атаки (зависит от оружия, упрощаем)
        base_speed = cls.BASE_ATTACK_SPEED

        # 2. Increased/Reduced Attack Speed
        inc_speed = mod_db.sum(ModType.INC, 'AttackSpeed')

        # 3. Применяем increased
        speed_after_inc = base_speed * (1 + inc_speed / 100)

        # 4. More/Less Attack Speed
        final_speed = mod_db.more(speed_after_inc, 'AttackSpeed')

        return {
            'total': round(final_speed, 2),
            'base': round(base_speed, 2),
            'increased': round(inc_speed, 1)
        }

    @classmethod
    def calculate_cast_speed(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает скорость каста

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с информацией о скорости каста
        """
        # 1. Базовая скорость каста
        base_speed = cls.BASE_ATTACK_SPEED

        # 2. Increased/Reduced Cast Speed
        inc_speed = mod_db.sum(ModType.INC, 'CastSpeed')

        # 3. Применяем increased
        speed_after_inc = base_speed * (1 + inc_speed / 100)

        # 4. More/Less Cast Speed
        final_speed = mod_db.more(speed_after_inc, 'CastSpeed')

        return {
            'total': round(final_speed, 2),
            'base': round(base_speed, 2),
            'increased': round(inc_speed, 1)
        }

    @classmethod
    def calculate_damage(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает увеличения урона (не сам урон, а модификаторы)

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с модификаторами урона
        """
        damage_types = {
            'physical': 'PhysicalDamage',
            'fire': 'FireDamage',
            'cold': 'ColdDamage',
            'lightning': 'LightningDamage',
            'chaos': 'ChaosDamage',
            'elemental': 'ElementalDamage',
            'spell': 'SpellDamage'
        }

        result = {}

        for name, stat_name in damage_types.items():
            inc_damage = mod_db.sum(ModType.INC, stat_name)
            result[name] = {
                'increased': round(inc_damage, 1)
            }

        return result

    @classmethod
    def estimate_dps(cls, mod_db: ModDB) -> Dict:
        """
        Примерная оценка DPS

        ВАЖНО: Это очень упрощённая оценка!
        Реальный расчёт DPS требует:
        - Знать активный skill
        - Базовый урон оружия/скилла
        - Конверсию урона
        - Ailments
        - И многое другое

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с оценкой DPS (или None если недостаточно данных)
        """
        # Для реального расчёта нужно больше информации
        # Пока возвращаем None
        return {
            'note': 'DPS calculation requires skill gem data and weapon information',
            'estimated': None
        }

    @classmethod
    def calculate_all(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает все атакующие характеристики

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь со всеми атакующими характеристиками
        """
        return {
            'crit_chance': cls.calculate_crit_chance(mod_db),
            'crit_multiplier': cls.calculate_crit_multiplier(mod_db),
            'attack_speed': cls.calculate_attack_speed(mod_db),
            'cast_speed': cls.calculate_cast_speed(mod_db),
            'damage_modifiers': cls.calculate_damage(mod_db),
            'dps': cls.estimate_dps(mod_db)
        }
