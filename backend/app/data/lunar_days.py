"""Traditional Japanese names for nights of the lunar month (day 1 = new moon)."""

NAMES = {
    1: ("Shingetsu", "新月", "new moon"),
    2: ("Futsukazuki", "二日月", "second-day moon"),
    3: ("Mikazuki", "三日月", "three-day crescent"),
    7: ("Jōgen", "上弦", "first quarter"),
    8: ("Jōgen", "上弦", "first quarter"),
    10: ("Tōkanya", "十日夜", "tenth night"),
    13: ("Jūsanya", "十三夜", "thirteenth night"),
    14: ("Komochizuki", "小望月", "little full moon"),
    15: ("Jūgoya", "十五夜", "full moon, fifteenth night"),
    16: ("Izayoi", "十六夜", "hesitating moon"),
    17: ("Tachimachizuki", "立待月", "moon waited for standing"),
    18: ("Imachizuki", "居待月", "moon waited for sitting"),
    19: ("Nemachizuki", "寝待月", "moon waited for lying down"),
    20: ("Fukemachizuki", "更待月", "late-night moon"),
    22: ("Kagen", "下弦", "last quarter"),
    23: ("Kagen", "下弦", "last quarter"),
    26: ("Nijūrokuya", "二十六夜", "twenty-sixth night"),
    30: ("Misoka", "晦", "last night of the month"),
}
KANJI_NUM = "〇一二三四五六七八九十"


def _kanji(n: int) -> str:
    if n <= 10:
        return KANJI_NUM[n]
    if n < 20:
        return "十" + KANJI_NUM[n - 10]
    tens, ones = divmod(n, 10)
    return KANJI_NUM[tens] + "十" + (KANJI_NUM[ones] if ones else "")


def lunar_day_name(day: int) -> dict:
    day = max(1, min(30, day))
    if day in NAMES:
        romaji, kanji, meaning = NAMES[day]
    else:
        romaji, kanji, meaning = f"Day {day}", f"{_kanji(day)}日目の月", f"moon of day {day}"
    return {"day": day, "romaji": romaji, "kanji": kanji, "meaning": meaning}
