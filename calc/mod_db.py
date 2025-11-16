"""
ModDB - Modifier Database
Система хранения и агрегации модификаторов по образцу PathOfBuilding
"""
from typing import Dict, List, Optional, Any, Set
from enum import Enum


class ModType(Enum):
    """Типы модификаторов"""
    BASE = "BASE"           # Базовые значения
    INC = "INC"             # Increased/Reduced (аддитивные)
    MORE = "MORE"           # More/Less (мультипликативные)
    OVERRIDE = "OVERRIDE"   # Переопределение значений
    FLAG = "FLAG"           # Булевые флаги


class ModFlag:
    """
    Флаги для категоризации модификаторов
    Используются битовые маски для эффективной фильтрации
    """
    # Damage types
    ATTACK = 1 << 0
    SPELL = 1 << 1
    HIT = 1 << 2
    DOT = 1 << 3  # Damage over Time

    # Weapon types
    AXE = 1 << 10
    BOW = 1 << 11
    CLAW = 1 << 12
    DAGGER = 1 << 13
    MACE = 1 << 14
    STAFF = 1 << 15
    SWORD = 1 << 16
    WAND = 1 << 17
    UNARMED = 1 << 18

    # Damage elements
    PHYSICAL = 1 << 20
    FIRE = 1 << 21
    COLD = 1 << 22
    LIGHTNING = 1 << 23
    CHAOS = 1 << 24

    # Defence
    ARMOUR = 1 << 30
    EVASION = 1 << 31
    ENERGY_SHIELD = 1 << 32

    @staticmethod
    def matches(mod_flags: int, required_flags: int) -> bool:
        """Проверяет, соответствует ли модификатор требуемым флагам"""
        if required_flags == 0:
            return True
        return (mod_flags & required_flags) != 0


class Modifier:
    """Представление одного модификатора"""

    def __init__(
        self,
        name: str,
        mod_type: ModType,
        value: float,
        flags: int = 0,
        source: str = "",
        tags: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.mod_type = mod_type
        self.value = value
        self.flags = flags
        self.source = source
        self.tags = tags or {}

    def __repr__(self):
        return f"Modifier({self.name}, {self.mod_type.value}, {self.value}, source={self.source})"


class ModDB:
    """
    База данных модификаторов
    Хранит и агрегирует все модификаторы персонажа
    """

    def __init__(self, parent: Optional['ModDB'] = None):
        """
        Args:
            parent: Родительская ModDB для иерархического наследования
        """
        self.mods: Dict[str, List[Modifier]] = {}
        self.parent = parent

    def add(
        self,
        name: str,
        mod_type: ModType,
        value: float,
        flags: int = 0,
        source: str = "",
        tags: Optional[Dict[str, Any]] = None
    ) -> None:
        """Добавляет модификатор в базу данных"""
        if name not in self.mods:
            self.mods[name] = []

        mod = Modifier(name, mod_type, value, flags, source, tags)
        self.mods[name].append(mod)

    def sum(
        self,
        mod_type: ModType,
        *names: str,
        flags: int = 0,
        source_filter: Optional[str] = None
    ) -> float:
        """
        Суммирует значения модификаторов

        Args:
            mod_type: Тип модификатора (BASE, INC, MORE)
            *names: Названия модификаторов для суммирования
            flags: Флаги для фильтрации
            source_filter: Фильтр по источнику

        Returns:
            Сумма значений модификаторов
        """
        total = 0.0

        for name in names:
            # Сначала проверяем локальные моды
            if name in self.mods:
                for mod in self.mods[name]:
                    if mod.mod_type != mod_type:
                        continue
                    if flags and not ModFlag.matches(mod.flags, flags):
                        continue
                    if source_filter and source_filter not in mod.source:
                        continue

                    total += mod.value

            # Затем проверяем родительскую базу
            if self.parent:
                parent_sum = self.parent.sum(mod_type, name, flags=flags, source_filter=source_filter)
                total += parent_sum

        return total

    def more(
        self,
        base_value: float,
        *names: str,
        flags: int = 0,
        source_filter: Optional[str] = None
    ) -> float:
        """
        Применяет MORE/LESS модификаторы к базовому значению
        MORE моды применяются мультипликативно: value * (1 + mod1/100) * (1 + mod2/100)

        Args:
            base_value: Базовое значение
            *names: Названия модификаторов
            flags: Флаги для фильтрации
            source_filter: Фильтр по источнику

        Returns:
            Значение после применения MORE модов
        """
        result = base_value

        for name in names:
            if name in self.mods:
                for mod in self.mods[name]:
                    if mod.mod_type != ModType.MORE:
                        continue
                    if flags and not ModFlag.matches(mod.flags, flags):
                        continue
                    if source_filter and source_filter not in mod.source:
                        continue

                    # MORE моды применяются мультипликативно
                    result *= (1 + mod.value / 100)

            if self.parent:
                # Рекурсивно применяем из родителя
                result = self.parent.more(result, name, flags=flags, source_filter=source_filter)

        return result

    def override(
        self,
        *names: str,
        flags: int = 0,
        default: Optional[float] = None
    ) -> Optional[float]:
        """
        Возвращает переопределённое значение (первое найденное)

        Args:
            *names: Названия модификаторов
            flags: Флаги для фильтрации
            default: Значение по умолчанию

        Returns:
            Переопределённое значение или default
        """
        for name in names:
            if name in self.mods:
                for mod in self.mods[name]:
                    if mod.mod_type != ModType.OVERRIDE:
                        continue
                    if flags and not ModFlag.matches(mod.flags, flags):
                        continue

                    return mod.value

            if self.parent:
                result = self.parent.override(name, flags=flags, default=None)
                if result is not None:
                    return result

        return default

    def flag(
        self,
        *names: str,
        flags: int = 0
    ) -> bool:
        """
        Проверяет наличие флага

        Args:
            *names: Названия флагов
            flags: Флаги для фильтрации

        Returns:
            True если флаг найден
        """
        for name in names:
            if name in self.mods:
                for mod in self.mods[name]:
                    if mod.mod_type != ModType.FLAG:
                        continue
                    if flags and not ModFlag.matches(mod.flags, flags):
                        continue

                    return True

            if self.parent:
                if self.parent.flag(name, flags=flags):
                    return True

        return False

    def calc(
        self,
        base_name: str,
        inc_name: str,
        more_name: Optional[str] = None,
        flags: int = 0
    ) -> float:
        """
        Стандартный расчёт по формуле: BASE * (1 + INC/100) * MORE

        Args:
            base_name: Название BASE модификатора
            inc_name: Название INC модификатора
            more_name: Название MORE модификатора (опционально)
            flags: Флаги для фильтрации

        Returns:
            Рассчитанное значение
        """
        # 1. Получаем базовое значение
        base = self.sum(ModType.BASE, base_name, flags=flags)

        # 2. Применяем INC модификаторы
        inc = self.sum(ModType.INC, inc_name, flags=flags)
        result = base * (1 + inc / 100)

        # 3. Применяем MORE модификаторы
        if more_name:
            result = self.more(result, more_name, flags=flags)

        return result

    def get_all_mods(self) -> Dict[str, List[Modifier]]:
        """Возвращает все модификаторы"""
        return self.mods

    def debug_print(self, limit: int = 10):
        """Печатает первые N модификаторов для отладки"""
        print(f"\n=== ModDB Debug (showing first {limit} types) ===")
        count = 0
        for name, mods in self.mods.items():
            if count >= limit:
                break
            print(f"\n{name}:")
            for mod in mods[:3]:  # Показываем первые 3 мода каждого типа
                print(f"  {mod}")
            if len(mods) > 3:
                print(f"  ... и ещё {len(mods) - 3} модов")
            count += 1

        if self.parent:
            print("\n[Parent ModDB exists]")
