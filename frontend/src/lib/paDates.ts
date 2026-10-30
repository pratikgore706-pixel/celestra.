/**
 * Many browsers ship without Punjabi date data, so "pa-IN" falls back to "M11 2".
 * When that happens we format in en-IN and swap month/weekday names for Gurmukhi.
 */
const ML = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MP = ["ਜਨਵਰੀ","ਫ਼ਰਵਰੀ","ਮਾਰਚ","ਅਪ੍ਰੈਲ","ਮਈ","ਜੂਨ","ਜੁਲਾਈ","ਅਗਸਤ","ਸਤੰਬਰ","ਅਕਤੂਬਰ","ਨਵੰਬਰ","ਦਸੰਬਰ"];
const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Sep","Oct","Nov","Dec"];
const MSP = ["ਜਨ","ਫ਼ਰ","ਮਾਰਚ","ਅਪ੍ਰੈ","ਮਈ","ਜੂਨ","ਜੁਲਾ","ਅਗ","ਸਤੰ","ਸਤੰ","ਅਕਤੂ","ਨਵੰ","ਦਸੰ"];
const WL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WP = ["ਐਤਵਾਰ","ਸੋਮਵਾਰ","ਮੰਗਲਵਾਰ","ਬੁੱਧਵਾਰ","ਵੀਰਵਾਰ","ਸ਼ੁੱਕਰਵਾਰ","ਸ਼ਨਿੱਚਰਵਾਰ"];
const WS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const WSP = ["ਐਤ","ਸੋਮ","ਮੰਗਲ","ਬੁੱਧ","ਵੀਰ","ਸ਼ੁੱਕਰ","ਸ਼ਨਿੱਚਰ"];

function swap(s: string): string {
  const rep = (from: string[], to: string[]) => from.forEach((w, i) => { s = s.replace(new RegExp(`\\b${w}\\b`, "g"), to[i]); });
  rep(ML, MP); rep(WL, WP); rep(MS, MSP); rep(WS, WSP);
  return s;
}

function isPa(loc: unknown) { return typeof loc === "string" && loc.toLowerCase().startsWith("pa"); }

export function installPunjabiDates() {
  let supported = false;
  try { supported = !/M\d/.test(new Date(2026, 10, 2).toLocaleDateString("pa-IN", { month: "short" })); } catch { /* ignore */ }
  if (supported) return;
  const P = Date.prototype as any;
  for (const fn of ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"] as const) {
    const orig = P[fn];
    P[fn] = function (this: Date, loc?: any, opts?: any) {
      return isPa(loc) ? swap(orig.call(this, "en-IN", opts)) : orig.call(this, loc, opts);
    };
  }
}
