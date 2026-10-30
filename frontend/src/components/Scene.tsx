/**
 * Page header art: flat stepped sky bands, a large moon disc,
 * three hill layers and a black foreground silhouette that changes per page.
 * All flat fills. No gradients, no blur.
 */
export type SceneVariant = "dojo" | "watchtower" | "scroll" | "lens" | "guide";

const SKIES: Record<SceneVariant, string[]> = {
  // top -> horizon
  dojo: ["#07090e", "#0a0d14", "#0e121b", "#131823", "#1a1f2c", "#262434"],
  watchtower: ["#07090e", "#0a0d15", "#0d121c", "#121825", "#18202e", "#212a3a"],
  scroll: ["#07090e", "#0a0d14", "#0e121a", "#141822", "#1d1f2b", "#2c2230"],
  lens: ["#07090e", "#0a0c15", "#0e111d", "#131726", "#1a1e30", "#23253b"],
  guide: ["#07090e", "#0a0c14", "#0e111b", "#141824", "#1b1f2d", "#272534"],
};
const HILLS: Record<SceneVariant, [string, string, string]> = {
  dojo: ["#1b1f2a", "#12151d", "#0a0c11"],
  watchtower: ["#1a2030", "#121621", "#0a0c12"],
  scroll: ["#1d1e2a", "#13151d", "#0a0c11"],
  lens: ["#1a1d2c", "#12141f", "#0a0b12"],
  guide: ["#1b1e2b", "#12151e", "#0a0c11"],
};

const W = 1440, H = 240;

function Sky({ v }: { v: SceneVariant }) {
  const bands = SKIES[v];
  const bh = 150 / bands.length;
  return (
    <g>
      {bands.map((c, i) => <rect key={i} x={0} y={i * bh} width={W} height={bh + 1} fill={c} />)}
      <rect x={0} y={150} width={W} height={H - 150} fill={bands[bands.length - 1]} />
    </g>
  );
}

function Stars() {
  const pts = [[80, 22], [210, 48], [330, 18], [470, 60], [610, 30], [760, 14], [905, 44], [1040, 20], [1180, 52], [1320, 26], [1400, 70], [150, 90], [560, 96], [1250, 92]];
  return <g className="stars" fill="#f1dca6">{pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} opacity={0.75} />)}</g>;
}

function Hills({ v }: { v: SceneVariant }) {
  const [h1, h2, h3] = HILLS[v];
  return (
    <g>
      <path fill={h1} d="M0 168 L120 140 L210 156 L330 118 L470 150 L560 132 L700 160 L820 122 L960 150 L1080 128 L1220 158 L1330 136 L1440 150 L1440 240 L0 240Z" />
      <path fill={h2} d="M0 192 L90 176 L200 190 L310 164 L430 186 L560 170 L690 194 L800 172 L930 190 L1060 168 L1190 192 L1310 174 L1440 186 L1440 240 L0 240Z" />
      <path fill={h3} d="M0 214 L160 204 L320 214 L480 202 L640 212 L800 204 L960 214 L1120 202 L1280 212 L1440 204 L1440 240 L0 240Z" />
    </g>
  );
}

function Foreground({ v }: { v: SceneVariant }) {
  const ink = "#07060b";
  if (v === "dojo") {
    // samurai on a rock, katana drawn, facing the moon
    return (
      <g fill={ink}>
        <path d="M1060 240 L1090 206 L1150 198 L1210 210 L1240 240Z" />
        <circle cx="1146" cy="128" r="9" />
        <path d="M1138 120 L1152 112 L1156 120Z" />
        <path d="M1134 138 L1160 138 L1166 176 L1172 204 L1160 204 L1150 180 L1144 204 L1130 204 L1136 176Z" />
        <path d="M1124 150 L1160 140 L1162 146 L1128 158Z" />
        <path d="M1160 142 L1186 132 L1188 137 L1162 148Z" />
        <path d="M1186 133 L1262 96 L1264 99 L1189 137Z" />
        <path d="M0 240 L0 208 Q40 200 70 214 L110 240Z" />
      </g>
    );
  }
  if (v === "watchtower") {
    // pagoda watchtower on a cliff
    return (
      <g fill={ink}>
        <path d="M1000 240 L1030 196 L1090 186 L1160 192 L1250 180 L1300 196 L1340 240Z" />
        <rect x="1146" y="70" width="4" height="22" />
        <path d="M1108 98 L1188 98 L1200 108 L1096 108Z" />
        <rect x="1118" y="108" width="60" height="18" />
        <path d="M1098 126 L1198 126 L1212 138 L1084 138Z" />
        <rect x="1110" y="138" width="76" height="20" />
        <path d="M1088 158 L1208 158 L1224 172 L1072 172Z" />
        <rect x="1104" y="172" width="88" height="16" />
        <path d="M120 240 L150 214 Q170 206 196 216 L230 240Z" />
      </g>
    );
  }
  if (v === "scroll") {
    // torii gate with cranes crossing the moon
    return (
      <g fill={ink}>
        <path d="M1020 98 Q1130 88 1240 98 L1246 88 Q1130 74 1014 88Z" />
        <rect x="1032" y="102" width="196" height="9" />
        <rect x="1060" y="96" width="13" height="144" />
        <rect x="1188" y="96" width="13" height="144" />
        <rect x="1125" y="111" width="10" height="16" />
        <rect x="1040" y="128" width="180" height="7" />
        <path d="M880 70 q14 -10 26 -2 q-10 2 -14 8 q12 -4 22 2 q-14 2 -20 10 l-4 -8 q-6 -2 -10 -10Z" />
        <path d="M940 50 q10 -7 18 -1 q-7 1 -10 6 q9 -3 16 1 q-10 1 -14 7 l-3 -6 q-4 -1 -7 -7Z" />
        <path d="M0 240 L60 216 L130 222 L170 240Z" />
      </g>
    );
  }
  if (v === "guide") {
    // stone lantern (toro) lighting a path, with a small walking figure
    return (
      <g fill={ink}>
        <path d="M900 240 L940 214 L1220 210 L1300 240Z" />
        <rect x="1104" y="200" width="44" height="12" />
        <rect x="1116" y="176" width="20" height="26" />
        <rect x="1100" y="166" width="52" height="10" />
        <rect x="1106" y="138" width="40" height="28" />
        <rect x="1116" y="146" width="20" height="14" fill="#e2b54e" opacity=".85" />
        <path d="M1090 138 L1126 112 L1162 138Z" />
        <rect x="1122" y="102" width="8" height="12" />
        <circle cx="1010" cy="178" r="7" />
        <path d="M1002 186 L1018 186 L1024 214 L1016 214 L1010 198 L1004 214 L996 214Z" />
        <path d="M1018 190 L1030 204 L1027 207 L1015 195Z" />
      </g>
    );
  }
  // lens: a lone figure under a pine branch with a telescope on a tripod
  return (
    <g fill={ink}>
      <path d="M1440 0 L1440 70 Q1360 64 1300 84 Q1340 60 1290 56 Q1250 54 1210 70 Q1240 44 1200 36 L1320 20Z" />
      <path d="M980 240 L1010 214 L1180 208 L1260 240Z" />
      <circle cx="1090" cy="158" r="8" />
      <path d="M1082 168 L1100 168 L1106 208 L1076 208Z" />
      <path d="M1098 176 L1122 170 L1124 175 L1100 182Z" />
      <path d="M1118 160 L1170 136 L1174 144 L1122 168Z" />
      <path d="M1140 156 L1132 208 L1136 208 L1144 160Z" />
      <path d="M1146 156 L1160 208 L1164 207 L1150 156Z" />
    </g>
  );
}

export default function Scene({ variant, moonX = 1180 }: { variant: SceneVariant; moonX?: number }) {
  return (
    <svg className="art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" role="img" aria-hidden="true">
      <Sky v={variant} />
      <Stars />
      <g className="moon-rise">
        <circle cx={moonX} cy={112} r={82} fill="none" stroke="#f1dca6" strokeOpacity="0.08" strokeWidth="10" />
        <circle cx={moonX} cy={112} r={70} fill="none" stroke="#f1dca6" strokeOpacity="0.12" strokeWidth="3" />
        <circle cx={moonX} cy={112} r={56} fill="#f1dca6" />
        <circle cx={moonX - 16} cy={100} r={9} fill="#e2c98c" />
        <circle cx={moonX + 18} cy={122} r={12} fill="#e2c98c" />
        <circle cx={moonX + 6} cy={90} r={4} fill="#e2c98c" />
      </g>
      <Hills v={variant} />
      <Foreground v={variant} />
    </svg>
  );
}
