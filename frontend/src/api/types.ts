export type Mode = "casual" | "deep" | "moon" | "meteor";
export type Band = "shogun" | "clear" | "mist" | "storm";

export type Hour = {
  t: string; local: string; score: number;
  C: number | null; T: number | null; D: number; S: number | null; M: number; G: number;
  sun_alt: number; moon_alt: number;
  cloud: number | null; humidity: number | null; visibility_km: number | null;
  wind_kmh: number | null; rain_pct: number | null; temp_c: number | null;
};

export type Score = {
  headline: number; band: Band;
  window: { start: string; end: string } | null;
  breakdown: Record<"C" | "T" | "D" | "S" | "M" | "G", number | null>;
  weights: Record<string, number>;
  confidence: "high" | "medium" | "low";
  missing: string[];
  light_pollution_penalty: number;
  hours: Hour[];
  elevation: number | null;
  formula_version: string;
  night?: { sunset: string; sunrise: string };
};

export type Spot = {
  id: string; name: string;
  type: "here" | "viewpoint" | "peak" | "shrine" | "observatory" | "park";
  lat: number; lon: number; dist_km: number;
  lp_penalty: number; lp_near: string | null; osm_url: string | null; curated?: boolean;
  score: Score;
};

export type WatchtowerData = {
  here: Spot; spots: Spot[];
  night: { sunset: string; sunrise: string; utc_offset_seconds: number; timezone: string };
  mode: Mode; date: string; warnings: string[];
};

export type GeoResult = { name: string; admin?: string; country?: string; lat: number; lon: number };

export type MoonInfo = {
  phase_angle: number; phase_name: string; illumination: number; waxing: boolean; age_days: number;
  altitude: number; azimuth: number; rise: string | null; set: string | null;
  lunar_day: { day: number; romaji: string; kanji: string; meaning: string };
  next_phases: Record<"new" | "first_quarter" | "full" | "last_quarter", string | null>;
};

export type EventType = "moon" | "meteor" | "eclipse" | "iss" | "planet" | "launch";
export type SkyEvent = {
  id: string; type: EventType; title: string; start: string;
  visible: boolean | null; detail: Record<string, any>;
  source: string; url: string; status: string;
};
export type CalDay = {
  date: string; phase_angle: number; illumination: number; phase_name: string;
  lunar_day: { day: number; romaji: string; kanji: string; meaning: string };
  moonrise: string | null; moonset: string | null;
};
export type IssPass = {
  start: string; peak: string; end: string; max_alt: number;
  start_az: number; peak_az: number; end_az: number; start_dir: string; end_dir: string;
  sun_alt: number; sunlit: boolean | null; visible: boolean; duration_s: number;
};
export type Alert = { id: number; event_id: string; kind: string; title: string; at: string };

export type Source = {
  id: number; x: number; y: number; flux: number; inst_mag: number; snr: number; fwhm: number;
  area: number; ellipticity: number; orientation: number; saturated: boolean; class: "star" | "extended";
  ra?: number; dec?: number; size_arcsec?: number;
  gaia_id?: string; g_mag?: number; bp_rp?: number; match_arcsec?: number;
};
export type SealCheck = { key: string; pass: boolean; value: number; rule: string; range?: number[]; blobs?: number; n?: number };
export type LensResult = {
  id: string; name: string; width: number; height: number;
  info: { format: string; original_size: number[]; downscaled_to?: number[]; has_wcs?: boolean; arcsec_per_px?: number };
  noise_sigma: number; method: string; drunet_available: boolean; star_protection: boolean;
  psf: { fwhm_px: number | null; n_stars: number; used_for_deblur: boolean };
  attempts: { strength: number; deblur_iters: number; sealed: boolean; failed?: string[] }[];
  seal: { sealed: boolean; checks: SealCheck[]; invented: { x: number; y: number; orig_snr: number }[]; revealed: number;
          counts: { original: number; restored: number; matched: number } };
  fake_star: { x: number; y: number } | null;
  sources: Source[]; counts: { stars: number; extended: number };
  files: { original: string; restored: string; mist: string }; seconds: number;
  gaia?: { requested: boolean; matched: number; error: string | null };
  source?: { kind: string; target: string; survey: string; url: string } | null;
};
export type LensJob = { id: string; status: "queued" | "running" | "done" | "error"; step: string | null; progress: number; error: string | null; result: LensResult | null };

export type BlinkCand = { x: number; y: number; kind: "new" | "vanished" | "brightened" | "faded"; change_sigma: number; snr_a: number; snr_b: number; flux_ratio: number | null };
export type BlinkResult = {
  id: string; name: string; width: number; height: number; labels: [string, string];
  shift_px: number[]; flux_scale: number; fwhm: number[]; candidates: BlinkCand[];
  files: { a: string; b: string; diff: string }; seconds: number;
};
export type Badge = { key: string; kanji: string; romaji: string; virtue: string; rule: string; have: number; need: number; earned: boolean };
export type HonorTx = { id: number; action: string; ref: string; points: number; label: string; created_at: string };
export type HonorSummary = { total: number; rank: string; ledger: HonorTx[]; badges: Badge[]; observations: any[]; points_table: Record<string, number> };
