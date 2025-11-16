"""
CalcDefence - Расчёт защитных характеристик
По образцу PathOfBuilding
"""
from typing import Dict
from calc.mod_db import ModDB, ModType


class CalcDefence:
    """Калькулятор защитных характеристик"""

    # Базовые значения для персонажа
    BASE_LIFE_PER_LEVEL = 12  # Life за уровень
    BASE_MANA_PER_LEVEL = 6   # Mana за уровень

    # Начальные значения
    INITIAL_LIFE = 38  # Базовая жизнь на 1 уровне
    INITIAL_MANA = 34  # Базовая мана на 1 уровне

    # Капы сопротивлений
    RESIST_CAP = 75    # Максимальное сопротивление
    RESIST_MIN = -60   # Минимальное сопротивление (для отображения)

    @classmethod
    def calculate_life(cls, mod_db: ModDB, level: int) -> Dict:
        """
        Рассчитывает максимальную жизнь

        Формула:
        Base Life = INITIAL_LIFE + (level - 1) * BASE_LIFE_PER_LEVEL
        Final Life = Base * (1 + INC/100) * MORE

        Args:
            mod_db: База данных модификаторов
            level: Уровень персонажа

        Returns:
            Словарь с информацией о жизни
        """
        # 1. Базовая жизнь от уровня
        base_from_level = cls.INITIAL_LIFE + (level - 1) * cls.BASE_LIFE_PER_LEVEL

        # 2. Добавленная жизнь от предметов/пассивок (BASE моды)
        added_life = mod_db.sum(ModType.BASE, 'Life')

        # 3. Общая базовая жизнь
        total_base = base_from_level + added_life

        # 4. Increased/Reduced Life (INC моды)
        inc_life = mod_db.sum(ModType.INC, 'Life')

        # 5. Применяем increased
        life_after_inc = total_base * (1 + inc_life / 100)

        # 6. More/Less Life (MORE моды)
        final_life = mod_db.more(life_after_inc, 'Life')

        return {
            'total': int(final_life),
            'base': int(total_base),
            'increased': int(inc_life),
            'from_level': int(base_from_level),
            'from_gear': int(added_life)
        }

    @classmethod
    def calculate_energy_shield(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает максимальный Energy Shield

        Формула:
        Base ES = сумма BASE модов
        Final ES = Base * (1 + INC/100) * MORE

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с информацией об ES
        """
        # 1. Базовый ES от предметов
        base_es = mod_db.sum(ModType.BASE, 'EnergyShield')

        # 2. Increased/Reduced ES
        inc_es = mod_db.sum(ModType.INC, 'EnergyShield')

        # 3. Применяем increased
        es_after_inc = base_es * (1 + inc_es / 100)

        # 4. More/Less ES
        final_es = mod_db.more(es_after_inc, 'EnergyShield')

        return {
            'total': int(final_es),
            'base': int(base_es),
            'increased': int(inc_es)
        }

    @classmethod
    def calculate_mana(cls, mod_db: ModDB, level: int) -> Dict:
        """
        Рассчитывает максимальную ману

        Args:
            mod_db: База данных модификаторов
            level: Уровень персонажа

        Returns:
            Словарь с информацией о мане
        """
        # 1. Базовая мана от уровня
        base_from_level = cls.INITIAL_MANA + (level - 1) * cls.BASE_MANA_PER_LEVEL

        # 2. Добавленная мана
        added_mana = mod_db.sum(ModType.BASE, 'Mana')

        # 3. Общая базовая мана
        total_base = base_from_level + added_mana

        # 4. Increased/Reduced Mana
        inc_mana = mod_db.sum(ModType.INC, 'Mana')

        # 5. Применяем increased
        mana_after_inc = total_base * (1 + inc_mana / 100)

        # 6. More/Less Mana
        final_mana = mod_db.more(mana_after_inc, 'Mana')

        return {
            'total': int(final_mana),
            'base': int(total_base),
            'increased': int(inc_mana),
            'from_level': int(base_from_level),
            'from_gear': int(added_mana)
        }

    @classmethod
    def calculate_resistances(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает сопротивления

        В PoE сопротивления:
        - Начинаются с -60% (на Merciless/Maps)
        - Имеют cap в 75% (может быть увеличен)
        - Складываются аддитивно

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с сопротивлениями
        """
        resist_types = ['FireResist', 'ColdResist', 'LightningResist', 'ChaosResist']
        resistances = {}

        for resist_type in resist_types:
            # 1. Суммируем все BASE сопротивления (от предметов, дерева)
            total_resist = mod_db.sum(ModType.BASE, resist_type)

            # 2. Применяем кап
            # TODO: В будущем учитывать +max resist моды
            max_cap = cls.RESIST_CAP
            final_resist = max(min(total_resist, max_cap), cls.RESIST_MIN)

            resist_name = resist_type.replace('Resist', '').lower()
            resistances[resist_name] = {
                'total': int(final_resist),
                'uncapped': int(total_resist),
                'cap': max_cap
            }

        return resistances

    @classmethod
    def calculate_armour(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает броню

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с информацией о броне
        """
        # 1. Базовая броня от предметов
        base_armour = mod_db.sum(ModType.BASE, 'Armour')

        # 2. Increased/Reduced Armour
        inc_armour = mod_db.sum(ModType.INC, 'Armour')

        # 3. Применяем increased
        armour_after_inc = base_armour * (1 + inc_armour / 100)

        # 4. More/Less Armour
        final_armour = mod_db.more(armour_after_inc, 'Armour')

        return {
            'total': int(final_armour),
            'base': int(base_armour),
            'increased': int(inc_armour)
        }

    @classmethod
    def calculate_evasion(cls, mod_db: ModDB) -> Dict:
        """
        Рассчитывает уклонение

        Args:
            mod_db: База данных модификаторов

        Returns:
            Словарь с информацией об уклонении
        """
        # 1. Базовое уклонение от предметов
        base_evasion = mod_db.sum(ModType.BASE, 'Evasion')

        # 2. Increased/Reduced Evasion
        inc_evasion = mod_db.sum(ModType.INC, 'Evasion')

        # 3. Применяем increased
        evasion_after_inc = base_evasion * (1 + inc_evasion / 100)

        # 4. More/Less Evasion
        final_evasion = mod_db.more(evasion_after_inc, 'Evasion')

        return {
            'total': int(final_evasion),
            'base': int(base_evasion),
            'increased': int(inc_evasion)
        }

    @classmethod
    def calculate_all(cls, mod_db: ModDB, level: int) -> Dict:
        """
        Рассчитывает все защитные характеристики

        Args:
            mod_db: База данных модификаторов
            level: Уровень персонажа

        Returns:
            Словарь со всеми защитными характеристиками
        """
        return {
            'life': cls.calculate_life(mod_db, level),
            'energy_shield': cls.calculate_energy_shield(mod_db),
            'mana': cls.calculate_mana(mod_db, level),
            'resistances': cls.calculate_resistances(mod_db),
            'armour': cls.calculate_armour(mod_db),
            'evasion': cls.calculate_evasion(mod_db)
        }
