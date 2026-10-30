"""Hand-checked hours for Night Honor Score v2. Run: python -m pytest -q"""
from app.services.scoring import components, weighted


def hour(**kw):
    base = dict(cloud_cover=0, cloud_cover_low=0, cloud_cover_mid=0, cloud_cover_high=0,
                visibility=30000, temperature_2m=15, dew_point_2m=5,
                wind_speed_10m=5, precipitation_probability=0)
    base.update(kw)
    return base


def test_clear_moonless_dark():
    c = components(hour(), sun_alt=-30, moon_alt=-10, moon_ill=0.0, lp_pen=0)
    assert (c["C"], c["T"], c["D"], c["S"], c["G"]) == (100, 100, 100, 100, 1.0)
    s, missing = weighted(c, "casual")
    assert round(s) == 100 and missing == []


def test_half_cloud_full_moon_high():
    # low 50%: C = 50; moon full at 90 deg: D = 100 - 60 = 40
    c = components(hour(cloud_cover_low=50), sun_alt=-30, moon_alt=90, moon_ill=1.0, lp_pen=0)
    assert round(c["C"]) == 50 and round(c["D"]) == 40
    s, _ = weighted(c, "casual")
    # 0.5*50 + 0.2*100 + 0.2*40 + 0.1*100 = 63
    assert round(s) == 63
    # moon mode likes a high moon: 0.45*50 + 0.15*100 + 0.25*100 + 0.15*100 = 77.5
    assert round(weighted(c, "moon")[0], 1) == 77.5


def test_rain_gate_and_missing_visibility():
    c = components(hour(precipitation_probability=80, visibility=None), sun_alt=-30, moon_alt=-5, moon_ill=0, lp_pen=0)
    assert c["G"] == 0.2 and "T" not in c
    s, missing = weighted(c, "casual")
    assert missing == ["T"] and round(s) == 20  # 100 renormalised, x0.2
