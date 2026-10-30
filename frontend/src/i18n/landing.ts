import type { Lang } from "./strings";

export type Chapter = { kj: string; eyebrow: string; title: string; body: string };
export type LandingText = { tag: string; scroll: string; chapters: Chapter[]; stats: [string, string][]; enter: string; guide: string };

const en: LandingText = {
  tag: "Read the heavens. Honor the night.",
  scroll: "Scroll",
  chapters: [
    { kj: "空", eyebrow: "The problem", title: "The sky is open. Most nights, we miss it.",
      body: "Clouds, haze, city glow and bad timing waste our nights out. And when we finally take a photo, AI \"enhancers\" quietly paint in stars that were never there." },
    { kj: "望楼", eyebrow: "Watchtower · where and when", title: "Find the clearest sky near you.",
      body: "Celestra finds temples, peaks and viewpoints around you and scores every hour from dusk to dawn. Cloud, haze, darkness, wind, the Moon and rain become one honest number, with its best two-hour window." },
    { kj: "天巻", eyebrow: "Celestial Scroll · what's up there", title: "Know what you can actually see.",
      body: "One lunar calendar for Moon phases, meteor showers, eclipses, planets, Space Station passes and rocket launches, each checked against your own horizon, with reminders." },
    { kj: "霊眼", eyebrow: "Spirit Lens · proof, not pixels", title: "Clean images. Proven true.",
      body: "It removes noise and sharpens with blur measured from your own stars. Then the Seal of Truth checks that nothing was invented, lost, moved or dimmed. If it can't prove that, it tells you." },
    { kj: "誉", eyebrow: "Honor · your journey", title: "Go out. Look up. Earn your honor.",
      body: "Log what you see and earn Honor when the sky confirms it. Built to run on a laptop, with free open science data, in English, हिन्दी, ਪੰਜਾਬੀ and 日本語." },
  ],
  stats: [["4", "tools in one place"], ["4", "languages"], ["0", "invented stars"]],
  enter: "Enter the Dojo",
  guide: "Read the guide",
};

const hi: LandingText = {
  tag: "आकाश को पढ़ो। रात का सम्मान करो।",
  scroll: "स्क्रॉल करें",
  chapters: [
    { kj: "空", eyebrow: "समस्या", title: "आकाश खुला है। पर ज़्यादातर रातें हम चूक जाते हैं।",
      body: "बादल, धुंध, शहर की रोशनी और गलत समय हमारी रातें बर्बाद करते हैं। और जब आख़िरकार फ़ोटो लेते हैं, तो AI \"एन्हांसर\" चुपचाप ऐसे तारे जोड़ देते हैं जो थे ही नहीं।" },
    { kj: "望楼", eyebrow: "वॉचटावर · कहाँ और कब", title: "अपने पास सबसे साफ़ आकाश खोजें।",
      body: "सेलेस्ट्रा आपके आसपास के मंदिर, चोटियाँ और दृश्य स्थल खोजता है और शाम से सुबह तक हर घंटे का स्कोर देता है। बादल, धुंध, अँधेरा, हवा, चंद्रमा और बारिश, एक ईमानदार संख्या में, सबसे अच्छे दो घंटों के साथ।" },
    { kj: "天巻", eyebrow: "खगोलीय पत्र · ऊपर क्या है", title: "जानें आप सच में क्या देख सकते हैं।",
      body: "चंद्र कलाएँ, उल्का वर्षा, ग्रहण, ग्रह, अंतरिक्ष स्टेशन और रॉकेट लॉन्च, एक चंद्र कैलेंडर में, हर एक आपके अपने क्षितिज से जाँचा हुआ, अनुस्मारक के साथ।" },
    { kj: "霊眼", eyebrow: "स्पिरिट लेंस · पिक्सेल नहीं, प्रमाण", title: "साफ़ तस्वीरें। सच साबित।",
      body: "यह शोर हटाता है और आपके अपने तारों से मापे धुंधलेपन से तस्वीर तीखी करता है। फिर सत्य की मुहर जाँचती है कि कुछ भी जोड़ा, खोया, खिसका या फीका नहीं हुआ। साबित न कर सके तो साफ़ बताता है।" },
    { kj: "誉", eyebrow: "सम्मान · आपकी यात्रा", title: "बाहर निकलें। ऊपर देखें। सम्मान कमाएँ।",
      body: "जो देखा उसे दर्ज करें और आकाश पुष्टि करे तो सम्मान अंक पाएँ। लैपटॉप पर चलता है, मुफ़्त खुले विज्ञान आँकड़ों के साथ, English, हिन्दी, ਪੰਜਾਬੀ और 日本語 में।" },
  ],
  stats: [["4", "उपकरण एक जगह"], ["4", "भाषाएँ"], ["0", "नकली तारे"]],
  enter: "दोजो में प्रवेश करें",
  guide: "गाइड पढ़ें",
};

const pa: LandingText = {
  tag: "ਅਸਮਾਨ ਨੂੰ ਪੜ੍ਹੋ। ਰਾਤ ਦਾ ਮਾਣ ਕਰੋ।",
  scroll: "ਸਕ੍ਰੋਲ ਕਰੋ",
  chapters: [
    { kj: "空", eyebrow: "ਸਮੱਸਿਆ", title: "ਅਸਮਾਨ ਖੁੱਲ੍ਹਾ ਹੈ। ਪਰ ਬਹੁਤੀਆਂ ਰਾਤਾਂ ਅਸੀਂ ਖੁੰਝ ਜਾਂਦੇ ਹਾਂ।",
      body: "ਬੱਦਲ, ਧੁੰਦ, ਸ਼ਹਿਰ ਦੀ ਰੌਸ਼ਨੀ ਅਤੇ ਗ਼ਲਤ ਸਮਾਂ ਸਾਡੀਆਂ ਰਾਤਾਂ ਬਰਬਾਦ ਕਰਦੇ ਹਨ। ਅਤੇ ਜਦੋਂ ਆਖ਼ਰਕਾਰ ਫ਼ੋਟੋ ਲੈਂਦੇ ਹਾਂ, ਤਾਂ AI \"ਐਨਹਾਂਸਰ\" ਚੁੱਪਚਾਪ ਅਜਿਹੇ ਤਾਰੇ ਜੋੜ ਦਿੰਦੇ ਹਨ ਜੋ ਕਦੇ ਸਨ ਹੀ ਨਹੀਂ।" },
    { kj: "望楼", eyebrow: "ਵਾਚਟਾਵਰ · ਕਿੱਥੇ ਅਤੇ ਕਦੋਂ", title: "ਆਪਣੇ ਨੇੜੇ ਸਭ ਤੋਂ ਸਾਫ਼ ਅਸਮਾਨ ਲੱਭੋ।",
      body: "ਸੈਲੇਸਟ੍ਰਾ ਤੁਹਾਡੇ ਆਲੇ-ਦੁਆਲੇ ਮੰਦਰ, ਚੋਟੀਆਂ ਅਤੇ ਨਜ਼ਾਰਾ ਥਾਵਾਂ ਲੱਭਦਾ ਹੈ ਅਤੇ ਸ਼ਾਮ ਤੋਂ ਸਵੇਰ ਤੱਕ ਹਰ ਘੰਟੇ ਦਾ ਸਕੋਰ ਦਿੰਦਾ ਹੈ। ਬੱਦਲ, ਧੁੰਦ, ਹਨੇਰਾ, ਹਵਾ, ਚੰਨ ਅਤੇ ਮੀਂਹ, ਇੱਕ ਇਮਾਨਦਾਰ ਅੰਕ ਵਿੱਚ, ਸਭ ਤੋਂ ਵਧੀਆ ਦੋ ਘੰਟਿਆਂ ਨਾਲ।" },
    { kj: "天巻", eyebrow: "ਖਗੋਲੀ ਪੱਤਰ · ਉੱਪਰ ਕੀ ਹੈ", title: "ਜਾਣੋ ਤੁਸੀਂ ਸੱਚਮੁੱਚ ਕੀ ਵੇਖ ਸਕਦੇ ਹੋ।",
      body: "ਚੰਦਰ ਕਲਾਵਾਂ, ਉਲਕਾ ਵਰਖਾ, ਗ੍ਰਹਿਣ, ਗ੍ਰਹਿ, ਪੁਲਾੜ ਸਟੇਸ਼ਨ ਅਤੇ ਰਾਕੇਟ ਲਾਂਚ, ਇੱਕ ਚੰਦਰ ਕੈਲੰਡਰ ਵਿੱਚ, ਹਰ ਇੱਕ ਤੁਹਾਡੇ ਆਪਣੇ ਦਿਸਹੱਦੇ ਤੋਂ ਜਾਂਚਿਆ, ਯਾਦ-ਦਹਾਨੀਆਂ ਨਾਲ।" },
    { kj: "霊眼", eyebrow: "ਸਪਿਰਿਟ ਲੈਂਸ · ਪਿਕਸਲ ਨਹੀਂ, ਸਬੂਤ", title: "ਸਾਫ਼ ਤਸਵੀਰਾਂ। ਸੱਚ ਸਾਬਤ।",
      body: "ਇਹ ਸ਼ੋਰ ਹਟਾਉਂਦਾ ਹੈ ਅਤੇ ਤੁਹਾਡੇ ਆਪਣੇ ਤਾਰਿਆਂ ਤੋਂ ਮਾਪੇ ਧੁੰਦਲੇਪਨ ਨਾਲ ਤਸਵੀਰ ਤਿੱਖੀ ਕਰਦਾ ਹੈ। ਫਿਰ ਸੱਚ ਦੀ ਮੋਹਰ ਜਾਂਚਦੀ ਹੈ ਕਿ ਕੁਝ ਵੀ ਜੋੜਿਆ, ਗੁਆਚਿਆ, ਹਿੱਲਿਆ ਜਾਂ ਫਿੱਕਾ ਨਹੀਂ ਹੋਇਆ। ਸਾਬਤ ਨਾ ਕਰ ਸਕੇ ਤਾਂ ਸਾਫ਼ ਦੱਸਦਾ ਹੈ।" },
    { kj: "誉", eyebrow: "ਮਾਣ · ਤੁਹਾਡਾ ਸਫ਼ਰ", title: "ਬਾਹਰ ਨਿਕਲੋ। ਉੱਪਰ ਵੇਖੋ। ਮਾਣ ਕਮਾਓ।",
      body: "ਜੋ ਵੇਖਿਆ ਉਹ ਦਰਜ ਕਰੋ ਅਤੇ ਅਸਮਾਨ ਪੁਸ਼ਟੀ ਕਰੇ ਤਾਂ ਮਾਣ ਅੰਕ ਪਾਓ। ਲੈਪਟਾਪ 'ਤੇ ਚੱਲਦਾ ਹੈ, ਮੁਫ਼ਤ ਖੁੱਲ੍ਹੇ ਵਿਗਿਆਨ ਅੰਕੜਿਆਂ ਨਾਲ, English, हिन्दी, ਪੰਜਾਬੀ ਅਤੇ 日本語 ਵਿੱਚ।" },
  ],
  stats: [["4", "ਸੰਦ ਇੱਕ ਥਾਂ"], ["4", "ਭਾਸ਼ਾਵਾਂ"], ["0", "ਨਕਲੀ ਤਾਰੇ"]],
  enter: "ਦੋਜੋ ਵਿੱਚ ਦਾਖਲ ਹੋਵੋ",
  guide: "ਗਾਈਡ ਪੜ੍ਹੋ",
};

const ja: LandingText = {
  tag: "天を読み、夜を敬え。",
  scroll: "スクロール",
  chapters: [
    { kj: "空", eyebrow: "課題", title: "空は開いている。それでも多くの夜を逃している。",
      body: "雲、もや、街明かり、そして時機の悪さが夜を無駄にします。ようやく撮った写真にも、AIの「補正」がそこになかった星をこっそり描き足します。" },
    { kj: "望楼", eyebrow: "望楼・どこで、いつ", title: "近くで最も澄んだ空を見つける。",
      body: "周辺の寺社・山・展望地を探し、夕暮れから夜明けまで一時間ごとに採点。雲・もや・暗さ・風・月・雨をひとつの正直な数字にし、最良の二時間を示します。" },
    { kj: "天巻", eyebrow: "天巻・空で起きること", title: "本当に見えるものを知る。",
      body: "月相・流星群・食・惑星・宇宙ステーション・ロケット打ち上げをひとつの月の暦に。すべてあなたの地平線で見えるかを確かめ、通知も届けます。" },
    { kj: "霊眼", eyebrow: "霊眼・画素ではなく証明", title: "きれいな画像。真実の証明。",
      body: "ノイズを除き、あなた自身の星から測ったぼけで鮮鋭化。そして真実の印が、何も捏造・消失・移動・減光していないことを検査します。証明できなければ、そう伝えます。" },
    { kj: "誉", eyebrow: "誉れ・あなたの道", title: "外へ。見上げよ。誉れを得よ。",
      body: "見たものを記録し、空が裏付ければ誉れを得ます。ノートPCで動き、無料の公開科学データを使用。English・हिन्दी・ਪੰਜਾਬੀ・日本語に対応。" },
  ],
  stats: [["4", "ひとつにまとめた道具"], ["4", "言語"], ["0", "捏造された星"]],
  enter: "道場へ入る",
  guide: "手引きを読む",
};

export const LANDING: Record<Lang, LandingText> = { en, hi, pa, ja };
