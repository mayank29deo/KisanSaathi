// Master list of commodities for the Earn screen.
// IDs are stable, names are localised. Server-side validates against `id`.

export const COMMODITIES = [
  // Vegetables
  { id: "onion",        category: "vegetable", emoji: "🧅", en: "Onion",        hi: "प्याज",       bn: "পেঁয়াজ" },
  { id: "tomato",       category: "vegetable", emoji: "🍅", en: "Tomato",       hi: "टमाटर",      bn: "টমেটো" },
  { id: "potato",       category: "vegetable", emoji: "🥔", en: "Potato",       hi: "आलू",         bn: "আলু" },
  { id: "garlic",       category: "vegetable", emoji: "🧄", en: "Garlic",       hi: "लहसुन",      bn: "রসুন" },
  { id: "ginger",       category: "vegetable", emoji: "🫚", en: "Ginger",       hi: "अदरक",       bn: "আদা" },
  { id: "carrot",       category: "vegetable", emoji: "🥕", en: "Carrot",       hi: "गाजर",       bn: "গাজর" },
  { id: "cauliflower",  category: "vegetable", emoji: "🥦", en: "Cauliflower",  hi: "फूलगोभी",    bn: "ফুলকপি" },
  { id: "cabbage",      category: "vegetable", emoji: "🥬", en: "Cabbage",      hi: "पत्तागोभी",   bn: "বাঁধাকপি" },
  { id: "brinjal",      category: "vegetable", emoji: "🍆", en: "Brinjal",      hi: "बैंगन",      bn: "বেগুন" },
  { id: "okra",         category: "vegetable", emoji: "🌶️", en: "Okra (Bhindi)", hi: "भिंडी",     bn: "ভেন্ডি" },
  { id: "spinach",      category: "vegetable", emoji: "🥬", en: "Spinach",      hi: "पालक",       bn: "পালং শাক" },
  { id: "green_chilli", category: "vegetable", emoji: "🌶️", en: "Green Chilli",  hi: "हरी मिर्च",  bn: "কাঁচা লঙ্কা" },
  { id: "capsicum",     category: "vegetable", emoji: "🫑", en: "Capsicum",     hi: "शिमला मिर्च", bn: "ক্যাপসিকাম" },
  { id: "cucumber",     category: "vegetable", emoji: "🥒", en: "Cucumber",     hi: "खीरा",       bn: "শসা" },
  { id: "pumpkin",      category: "vegetable", emoji: "🎃", en: "Pumpkin",      hi: "कद्दू",      bn: "কুমড়ো" },
  { id: "bottle_gourd", category: "vegetable", emoji: "🥒", en: "Bottle Gourd", hi: "लौकी",       bn: "লাউ" },
  { id: "bitter_gourd", category: "vegetable", emoji: "🥒", en: "Bitter Gourd", hi: "करेला",      bn: "করলা" },
  { id: "radish",       category: "vegetable", emoji: "🥕", en: "Radish",       hi: "मूली",       bn: "মুলো" },
  { id: "beans",        category: "vegetable", emoji: "🫘", en: "Beans",        hi: "बीन्स",      bn: "শিম" },
  { id: "peas",         category: "vegetable", emoji: "🟢", en: "Green Peas",   hi: "मटर",        bn: "মটরশুটি" },

  // Fruits
  { id: "banana",       category: "fruit",     emoji: "🍌", en: "Banana",       hi: "केला",       bn: "কলা" },
  { id: "apple",        category: "fruit",     emoji: "🍎", en: "Apple",        hi: "सेब",        bn: "আপেল" },
  { id: "mango",        category: "fruit",     emoji: "🥭", en: "Mango",        hi: "आम",         bn: "আম" },
  { id: "orange",       category: "fruit",     emoji: "🍊", en: "Orange",       hi: "संतरा",      bn: "কমলা" },
  { id: "grapes",       category: "fruit",     emoji: "🍇", en: "Grapes",       hi: "अंगूर",      bn: "আঙ্গুর" },
  { id: "papaya",       category: "fruit",     emoji: "🍈", en: "Papaya",       hi: "पपीता",      bn: "পেঁপে" },
  { id: "pomegranate",  category: "fruit",     emoji: "🥝", en: "Pomegranate",  hi: "अनार",       bn: "ডালিম" },
  { id: "guava",        category: "fruit",     emoji: "🍐", en: "Guava",        hi: "अमरूद",      bn: "পেয়ারা" },
  { id: "watermelon",   category: "fruit",     emoji: "🍉", en: "Watermelon",   hi: "तरबूज",      bn: "তরমুজ" },
  { id: "lemon",        category: "fruit",     emoji: "🍋", en: "Lemon",        hi: "नींबू",      bn: "লেবু" },

  // Grains & Pulses
  { id: "rice",         category: "grain",     emoji: "🍚", en: "Rice",         hi: "चावल",       bn: "চাল" },
  { id: "wheat",        category: "grain",     emoji: "🌾", en: "Wheat",        hi: "गेहूँ",      bn: "গম" },
  { id: "atta",         category: "grain",     emoji: "🌾", en: "Wheat Flour",  hi: "आटा",        bn: "আটা" },
  { id: "bajra",        category: "grain",     emoji: "🌾", en: "Bajra",        hi: "बाजरा",      bn: "বাজরা" },
  { id: "jowar",        category: "grain",     emoji: "🌾", en: "Jowar",        hi: "ज्वार",      bn: "জোয়ার" },
  { id: "ragi",         category: "grain",     emoji: "🌾", en: "Ragi",         hi: "रागी",       bn: "রাগি" },
  { id: "maize",        category: "grain",     emoji: "🌽", en: "Maize",        hi: "मक्का",      bn: "ভুট্টা" },
  { id: "tur_dal",      category: "pulse",     emoji: "🫘", en: "Tur Dal",      hi: "तुअर दाल",   bn: "তুর ডাল" },
  { id: "moong_dal",    category: "pulse",     emoji: "🫘", en: "Moong Dal",    hi: "मूँग दाल",   bn: "মুগ ডাল" },
  { id: "urad_dal",     category: "pulse",     emoji: "🫘", en: "Urad Dal",     hi: "उड़द दाल",   bn: "মাষকলাই ডাল" },
  { id: "chana_dal",    category: "pulse",     emoji: "🫘", en: "Chana Dal",    hi: "चना दाल",    bn: "ছোলার ডাল" },
  { id: "masoor_dal",   category: "pulse",     emoji: "🫘", en: "Masoor Dal",   hi: "मसूर दाल",   bn: "মসুর ডাল" },
  { id: "rajma",        category: "pulse",     emoji: "🫘", en: "Rajma",        hi: "राजमा",      bn: "রাজমা" },
  { id: "chickpea",     category: "pulse",     emoji: "🫘", en: "Chickpea",     hi: "चना",        bn: "ছোলা" },

  // Spices
  { id: "turmeric",     category: "spice",     emoji: "🟡", en: "Turmeric",     hi: "हल्दी",      bn: "হলুদ" },
  { id: "red_chilli",   category: "spice",     emoji: "🌶️", en: "Red Chilli",    hi: "लाल मिर्च",  bn: "শুকনো লঙ্কা" },
  { id: "coriander",    category: "spice",     emoji: "🌿", en: "Coriander",    hi: "धनिया",      bn: "ধনে" },
  { id: "cumin",        category: "spice",     emoji: "🟤", en: "Cumin",        hi: "जीरा",       bn: "জিরে" },
  { id: "mustard_seed", category: "spice",     emoji: "🟡", en: "Mustard Seed", hi: "सरसों",      bn: "সরিষা" },

  // Oils & Sugar
  { id: "mustard_oil",  category: "oil",       emoji: "🛢️", en: "Mustard Oil",   hi: "सरसों तेल",  bn: "সরিষার তেল" },
  { id: "sunflower_oil",category: "oil",       emoji: "🛢️", en: "Sunflower Oil", hi: "सूरजमुखी तेल",bn: "সূর্যমুখী তেল" },
  { id: "groundnut_oil",category: "oil",       emoji: "🛢️", en: "Groundnut Oil", hi: "मूँगफली तेल",bn: "চিনাবাদাম তেল" },
  { id: "sugar",        category: "other",     emoji: "🍬", en: "Sugar",        hi: "चीनी",       bn: "চিনি" },
  { id: "jaggery",      category: "other",     emoji: "🟫", en: "Jaggery",      hi: "गुड़",        bn: "গুড়" },

  // Dairy
  { id: "milk",         category: "dairy",     emoji: "🥛", en: "Milk",         hi: "दूध",        bn: "দুধ" },
  { id: "ghee",         category: "dairy",     emoji: "🧈", en: "Ghee",         hi: "घी",         bn: "ঘি" },
  { id: "paneer",       category: "dairy",     emoji: "🧀", en: "Paneer",       hi: "पनीर",       bn: "পনির" },
];

export const UNITS = [
  { id: "kg",      en: "per kg",     hi: "प्रति किलो",  bn: "প্রতি কেজি" },
  { id: "quintal", en: "per quintal",hi: "प्रति क्विंटल",bn: "প্রতি কুইন্টাল" },
  { id: "litre",   en: "per litre",  hi: "प्रति लीटर",  bn: "প্রতি লিটার" },
  { id: "dozen",   en: "per dozen",  hi: "प्रति दर्जन",  bn: "প্রতি ডজন" },
  { id: "piece",   en: "per piece",  hi: "प्रति नग",    bn: "প্রতি পিস" },
  { id: "bunch",   en: "per bunch",  hi: "प्रति गुच्छा", bn: "প্রতি গোছা" },
];

export const SOURCE_TYPES = [
  { id: "mandi",       icon: "🏛️", labelKey: "earnSourceMandi" },
  { id: "local_market",icon: "🏪", labelKey: "earnSourceMarket" },
  { id: "veg_seller",  icon: "🥬", labelKey: "earnSourceVeg" },
  { id: "grocery",     icon: "🛒", labelKey: "earnSourceGrocery" },
];

export function getCommodityName(id, lang = "en") {
  const c = COMMODITIES.find((x) => x.id === id);
  if (!c) return id;
  return c[lang] || c.en;
}

export function getUnitLabel(id, lang = "en") {
  const u = UNITS.find((x) => x.id === id);
  if (!u) return id;
  return u[lang] || u.en;
}
