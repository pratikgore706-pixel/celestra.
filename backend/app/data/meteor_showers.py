"""Major annual meteor showers. Peak dates are approximate (they shift by about a day year
to year); source: International Meteor Organization working list, https://www.imo.net/.
Radiant RA in degrees, Dec in degrees, ZHR = ideal hourly rate under perfect dark skies."""

SOURCE = "International Meteor Organization (approx. dates)"
SOURCE_URL = "https://www.imo.net/resources/calendar/"

SHOWERS = [
    {"code": "QUA", "name": "Quadrantids", "start": (12, 28), "peak": (1, 3), "end": (1, 12), "ra": 230, "dec": 49, "zhr": 80},
    {"code": "LYR", "name": "Lyrids", "start": (4, 14), "peak": (4, 22), "end": (4, 30), "ra": 271, "dec": 34, "zhr": 18},
    {"code": "ETA", "name": "Eta Aquariids", "start": (4, 19), "peak": (5, 6), "end": (5, 28), "ra": 338, "dec": -1, "zhr": 50},
    {"code": "SDA", "name": "Southern Delta Aquariids", "start": (7, 12), "peak": (7, 31), "end": (8, 23), "ra": 340, "dec": -16, "zhr": 25},
    {"code": "PER", "name": "Perseids", "start": (7, 17), "peak": (8, 12), "end": (8, 24), "ra": 48, "dec": 58, "zhr": 100},
    {"code": "DRA", "name": "Draconids", "start": (10, 6), "peak": (10, 8), "end": (10, 10), "ra": 262, "dec": 54, "zhr": 10},
    {"code": "ORI", "name": "Orionids", "start": (10, 2), "peak": (10, 21), "end": (11, 7), "ra": 95, "dec": 16, "zhr": 20},
    {"code": "STA", "name": "Southern Taurids", "start": (9, 10), "peak": (10, 10), "end": (11, 20), "ra": 32, "dec": 9, "zhr": 5},
    {"code": "NTA", "name": "Northern Taurids", "start": (10, 20), "peak": (11, 12), "end": (12, 10), "ra": 58, "dec": 22, "zhr": 5},
    {"code": "LEO", "name": "Leonids", "start": (11, 6), "peak": (11, 17), "end": (11, 30), "ra": 152, "dec": 22, "zhr": 15},
    {"code": "GEM", "name": "Geminids", "start": (12, 4), "peak": (12, 14), "end": (12, 20), "ra": 112, "dec": 33, "zhr": 150},
    {"code": "URS", "name": "Ursids", "start": (12, 17), "peak": (12, 22), "end": (12, 26), "ra": 217, "dec": 76, "zhr": 10},
]
