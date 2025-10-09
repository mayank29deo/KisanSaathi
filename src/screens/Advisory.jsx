import { useState } from "react";
import { motion } from "framer-motion";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";

/**
 * 🌾 Season-wise Crop Advisory (English + Hindi)
 */
const ADVISORY_DATA = {
  "Rabi (रबी)": [
    {
      crop: "Wheat (गेहूं)",
      en: "Sow certified seed in mid-November to early December. Keep moisture during tillering. Apply balanced NPK. Avoid waterlogging.",
      hi: "प्रमाणित बीज को नवंबर मध्य से दिसंबर प्रारंभ तक बोएं। टिलरिंग के समय नमी बनाए रखें। संतुलित एनपीके उर्वरक दें। जलभराव से बचें।",
    },
    {
      crop: "Barley (जौ)",
      en: "Sow in well-drained loam soil. Apply nitrogen in two splits. Control yellow rust disease timely.",
      hi: "अच्छी जल निकासी वाली दोमट मिट्टी में बोएं। नाइट्रोजन दो बार में दें। पीली जंग रोग से समय पर सुरक्षा करें।",
    },
    {
      crop: "Gram / Chana (चना)",
      en: "Sow in residual moisture after rice harvest. Apply Rhizobium culture and irrigate at flowering and pod filling stages.",
      hi: "धान कटाई के बाद बचे हुए नमी में बुवाई करें। राइजोबियम कल्चर लगाएं और फूल आने व फली भरने पर सिंचाई करें।",
    },
    {
      crop: "Mustard (सरसों)",
      en: "Sow early in November. Maintain 30 cm spacing. Apply potash and nitrogen. Protect from aphids.",
      hi: "नवंबर के प्रारंभ में बुवाई करें। पौधों के बीच 30 सेमी की दूरी रखें। पोटाश और नाइट्रोजन दें। माहू से फसल की रक्षा करें।",
    },
    {
      crop: "Lentil (मसूर)",
      en: "Sow in well-drained loam. Apply phosphate at sowing. Control weeds early.",
      hi: "अच्छी जल निकासी वाली मिट्टी में बुवाई करें। बुवाई के समय फास्फेट दें। शुरुआती अवस्था में खरपतवार नियंत्रण करें।",
    },
    {
      crop: "Peas (मटर)",
      en: "Sow in loam soil with good drainage. Provide bamboo support. Apply phosphate fertilizer.",
      hi: "अच्छी जल निकासी वाली मिट्टी में बुवाई करें। पौधों को सहारा देने के लिए बांस लगाएं। फास्फेट उर्वरक दें।",
    },
    {
      crop: "Potato (आलू)",
      en: "Use healthy tubers. Apply nitrogen in two splits. Protect against late blight.",
      hi: "स्वस्थ बीज कंदों का उपयोग करें। नाइट्रोजन दो बार में दें। लेट ब्लाइट रोग से फसल की रक्षा करें।",
    },
    {
      crop: "Onion (प्याज)",
      en: "Use 45-day-old seedlings. Maintain 10 cm spacing. Cure bulbs before storage.",
      hi: "45 दिन की पौध लगाएं। पौधों के बीच 10 सेमी दूरी रखें। भंडारण से पहले प्याज को सुखाएं।",
    },
  ],

  "Kharif (खरीफ)": [
    {
      crop: "Rice (धान)",
      en: "Transplant 25–30-day-old seedlings. Maintain 3–5 cm water. Apply nitrogen in three splits.",
      hi: "25–30 दिन पुरानी पौध रोपें। खेत में 3–5 सेमी पानी बनाए रखें। नाइट्रोजन तीन बार में दें।",
    },
    {
      crop: "Maize (मक्का)",
      en: "Use hybrid seed. Keep 20–25 cm spacing. Apply nitrogen at knee-high stage.",
      hi: "उच्च गुणवत्ता वाले हाइब्रिड बीज का प्रयोग करें। पौधों के बीच 20–25 सेमी की दूरी रखें। घुटने की ऊँचाई पर नाइट्रोजन डालें।",
    },
    {
      crop: "Soybean (सोयाबीन)",
      en: "Ensure good drainage. Apply Rhizobium inoculant. Avoid excess irrigation during flowering.",
      hi: "अच्छी जल निकासी सुनिश्चित करें। राइजोबियम इनोकुलेंट का प्रयोग करें। फूल आने पर अधिक सिंचाई न करें।",
    },
    {
      crop: "Groundnut (मूंगफली)",
      en: "Treat seeds with Trichoderma. Maintain moisture during pegging. Avoid harvest during rains.",
      hi: "बीजों को ट्राइकोडर्मा से उपचारित करें। पेगिंग के समय नमी बनाए रखें। वर्षा के समय कटाई न करें।",
    },
    {
      crop: "Cotton (कपास)",
      en: "Use Bt or recommended hybrid. Maintain spacing. Apply potash for boll development.",
      hi: "बीटी या अनुशंसित हाइब्रिड बीज लगाएं। उचित दूरी बनाए रखें। बॉल विकास के लिए पोटाश का प्रयोग करें।",
    },
    {
      crop: "Pigeon Pea / Arhar (अरहर)",
      en: "Use early varieties. Maintain 60–75 cm spacing. Irrigate at flowering stage.",
      hi: "प्रारंभिक किस्में लगाएं। पौधों के बीच 60–75 सेमी दूरी रखें। फूल आने पर सिंचाई करें।",
    },
    {
      crop: "Moong (मूंग)",
      en: "Use Rhizobium-treated seed. Provide irrigation during pod filling.",
      hi: "राइजोबियम उपचारित बीज लगाएं। फली बनने पर सिंचाई करें।",
    },
    {
      crop: "Urad (उड़द)",
      en: "Apply organic manure. Avoid excess nitrogen. Harvest timely to avoid shattering.",
      hi: "जैविक खाद का प्रयोग करें। नाइट्रोजन अधिक मात्रा में न दें। फली टूटने से बचने के लिए समय पर कटाई करें।",
    },
    {
      crop: "Sugarcane (गन्ना)",
      en: "Plant 3-budded setts. Keep soil moist. Apply nitrogen in 3–4 splits.",
      hi: "तीन गाँठ वाले टुकड़े लगाएं। मिट्टी नम रखें। नाइट्रोजन 3–4 बार में दें।",
    },
    {
      crop: "Sorghum (ज्वार)",
      en: "Select drought-tolerant variety. Apply organic manure. Provide irrigation at booting stage.",
      hi: "सूखा सहनशील किस्में चुनें। जैविक खाद दें। बूटिंग अवस्था में सिंचाई करें।",
    },
  ],

  "Zaid (जायद)": [
    {
      crop: "Watermelon (तरबूज)",
      en: "Sow in sandy loam soil. Maintain 1.5–2 m spacing. Irrigate at fruit setting stage.",
      hi: "रेतीली दोमट मिट्टी में बुवाई करें। पौधों के बीच 1.5–2 मीटर की दूरी रखें। फल बनने पर सिंचाई करें।",
    },
    {
      crop: "Cucumber (खीरा)",
      en: "Sow on ridges. Apply organic manure. Spray neem oil for pest control.",
      hi: "मेड़ों पर बुवाई करें। जैविक खाद दें। कीट नियंत्रण हेतु नीम तेल का छिड़काव करें।",
    },
    {
      crop: "Bitter Gourd (करेला)",
      en: "Provide trellis support. Apply cow dung manure. Irrigate every 4–5 days.",
      hi: "जाल या बेल समर्थन दें। गोबर खाद डालें। 4–5 दिन के अंतराल पर सिंचाई करें।",
    },
    {
      crop: "Pumpkin (कद्दू)",
      en: "Maintain 2–3 m spacing. Use FYM before sowing. Apply potash fertilizer.",
      hi: "पौधों के बीच 2–3 मीटर की दूरी रखें। बुवाई से पहले गोबर की खाद डालें। पोटाश उर्वरक दें।",
    },
    {
      crop: "Okra / Bhindi (भिंडी)",
      en: "Sow in well-drained soil. Apply nitrogen after 25 days. Control fruit borer.",
      hi: "अच्छी जल निकासी वाली मिट्टी में बुवाई करें। 25 दिन बाद नाइट्रोजन डालें। फलछेदक कीट से बचाव करें।",
    },
    {
      crop: "Tomato (टमाटर)",
      en: "Use hybrid seedlings. Avoid water stagnation. Stake plants for support.",
      hi: "हाइब्रिड पौध लगाएं। पानी रुकने से बचाएं। पौधों को सहारा दें।",
    },
    {
      crop: "Chilli (मिर्च)",
      en: "Spray neem oil for thrips. Maintain uniform irrigation.",
      hi: "थ्रिप्स से बचाव हेतु नीम तेल का छिड़काव करें। समान रूप से सिंचाई करें।",
    },
  ],
};

export default function Advisory({ t }) {
  const [search, setSearch] = useState("");

  const filterCrop = (list) =>
    list.filter((c) =>
      c.crop.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="p-5 space-y-5">
      <motion.h2
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-2xl font-bold text-brand-dark"
      >
        🌱 {t?.advisory || "Crop Advisory"}
      </motion.h2>

      <Card delay={0.1} className="space-y-3">
        <input
          type="text"
          placeholder="Search crop (e.g., Wheat / गेहूं)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-xl border bg-white/70 w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <div className="flex justify-end">
          <PrimaryButton onClick={() => setSearch("")}>Clear Search</PrimaryButton>
        </div>
      </Card>

      {Object.entries(ADVISORY_DATA).map(([season, crops]) => {
        const filtered = filterCrop(crops);
        if (!filtered.length) return null;
        return (
          <div key={season}>
            <h3 className="text-xl font-semibold text-emerald-700 mb-2">
              🌾 {season} Season Crops
            </h3>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 },
                },
              }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filtered.map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <Card>
                    <h4 className="font-semibold text-lg text-brand-dark mb-2">
                      {item.crop}
                    </h4>
                    <p className="text-sm text-gray-700 leading-snug">
                      <span className="font-medium text-emerald-700">English:</span> {item.en}
                    </p>
                    <p className="text-sm text-gray-700 leading-snug mt-1">
                      <span className="font-medium text-emerald-700">हिन्दी:</span> {item.hi}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
