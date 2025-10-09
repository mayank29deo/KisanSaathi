const STRINGS = {
  en: {
    // App & Navigation
    app: "Kisan Saathi",
    home: "Home",
    mandi: "Mandi",
    finance: "Finance",
    advisory: "Advisory",
    detect: "Detect",
    health: "Health",
    sell: "Sell",
    account: "Account",
    settings: "Settings",

    // Home screen
    welcome: "Welcome to Kisan Saathi",
    weatherToday: "Today's Weather",
    useMyLocation: "Use my location",
    weatherUnavailable: "Weather unavailable",
    nearbyHealthMap: "Nearby Health Map",
    exploreMap: "Explore map",
    mandiPrices: "Mandi Prices",
    financeTools: "Finance Tools",
    cropAdvisory: "Crop Advisory",
    soilHealth: "Soil & Crop Health",
    detectPrompt: "Use camera or upload a photo to detect leaf issues",
    openMandi: "Open Mandi →",
    openFinance: "Open Finance →",
    openAdvisory: "Open Advisory →",
    openHealth: "Open Health →",
    openDetector: "Open Detector →",

    // Finance
    location: "Location (city or PIN)",
    radiusKm: "Radius (km)",
    search: "Search",
    useMyLocationBtn: "Use my location",
    findBanks: "Find banks",
    banksNear: "Banks near you",
    noneFound: "No centres found in this area.",
    bank: "Bank",
    atm: "ATM",

    // Health
    findCenters: "Find centres",
    types: "Types",
    services: "Services",
    govtOnly: "Govt only (PHC/CHC)",
    hospitalsNear: "Hospitals & clinics near you",
    clearFilters: "Clear filters",
    heatstroke: "Heatstroke",
    poisoning: "Poisoning/Toxicology",
    trauma: "Trauma/Burns",
    cachedBanner: "Showing cached results (offline). May be outdated.",
    healthAdvisory: "Nearest hospitals, clinics, and pharmacies.",

    // Detector
    startCamera: "Start Camera",
    stopCamera: "Stop Camera",
    uploadPhoto: "Upload Photo",
    analyze: "Analyze",
    predictedDisease: "Predicted Issue",
    confidence: "Confidence",
    recommendation: "Recommendation",
    healthyLeaf: "Healthy Leaf",
    nutrientDeficiency: "Possible Nutrient Deficiency",
    possibleDisease: "Possible Disease Infection",
    detectorDisclaimer:
      "This is early guidance. Confirm with your local KVK or agriculture officer.",

    // Advisory
    cropRotation: "Crop Rotation Tips",
    fertilizerGuide: "Fertilizer Guide",
    pestControl: "Pest & Disease Control",
    irrigation: "Irrigation Schedule",
    soilCare: "Soil Care",

    // Mandi
    mandiUpdates: "Latest Mandi Updates",
    mandiUnavailable: "Mandi data not available right now.",

    // Account / Auth
    register: "Register",
    login: "Login",
    namePlaceholder: "Enter your name",
    alreadyRegistered: "Already registered? Login here",
    newUser: "New user? Register here",
  },

  hi: {
    // App & Navigation
    app: "किसान साथी",
    home: "मुख्य पृष्ठ",
    mandi: "मंडी",
    finance: "वित्तीय सहायता",
    advisory: "सलाह",
    detect: "फसल पहचान",
    health: "स्वास्थ्य केंद्र",
    sell: "बेचना",
    account: "खाता",
    settings: "सेटिंग्स",

    // Home screen
    welcome: "किसान साथी में आपका स्वागत है",
    weatherToday: "आज का मौसम",
    useMyLocation: "मेरी लोकेशन का उपयोग करें",
    weatherUnavailable: "मौसम की जानकारी उपलब्ध नहीं है",
    nearbyHealthMap: "पास के स्वास्थ्य केंद्र",
    exploreMap: "मानचित्र देखें",
    mandiPrices: "मंडी के भाव",
    financeTools: "वित्तीय साधन",
    cropAdvisory: "फसल सलाह",
    soilHealth: "मिट्टी एवं फसल की सेहत",
    detectPrompt: "फसल की पत्तियों की फोटो लेकर समस्या पहचानें",
    openMandi: "मंडी देखें →",
    openFinance: "वित्तीय सहायता देखें →",
    openAdvisory: "सलाह देखें →",
    openHealth: "स्वास्थ्य केंद्र देखें →",
    openDetector: "फसल पहचान खोलें →",

    // Finance
    location: "स्थान (शहर या पिनकोड)",
    radiusKm: "त्रिज्या (किमी)",
    search: "खोजें",
    useMyLocationBtn: "मेरी लोकेशन का उपयोग करें",
    findBanks: "बैंक खोजें",
    banksNear: "पास के बैंक",
    noneFound: "इस क्षेत्र में कोई केंद्र नहीं मिला।",
    bank: "बैंक",
    atm: "एटीएम",

    // Health
    findCenters: "केंद्र खोजें",
    types: "प्रकार",
    services: "सेवाएँ",
    govtOnly: "केवल सरकारी (PHC/CHC)",
    hospitalsNear: "आपके पास के अस्पताल और क्लिनिक",
    clearFilters: "फ़िल्टर हटाएं",
    heatstroke: "लू / हीटस्ट्रोक",
    poisoning: "जहर / विषविज्ञान",
    trauma: "घाव / जलन / दुर्घटना",
    cachedBanner: "ऑफ़लाइन डेटा दिखाया जा रहा है (पुराना हो सकता है)।",
    healthAdvisory: "पास के अस्पताल, क्लिनिक और दवा दुकानों की जानकारी।",

    // Detector
    startCamera: "कैमरा चालू करें",
    stopCamera: "कैमरा बंद करें",
    uploadPhoto: "फोटो अपलोड करें",
    analyze: "विश्लेषण करें",
    predictedDisease: "संभावित रोग / समस्या",
    confidence: "विश्वास स्तर",
    recommendation: "सुझाव",
    healthyLeaf: "स्वस्थ पत्ती",
    nutrientDeficiency: "संभावित पोषक तत्व की कमी",
    possibleDisease: "संभावित रोग संक्रमण",
    detectorDisclaimer:
      "यह केवल प्रारंभिक सलाह है। कृपया नजदीकी कृषि विशेषज्ञ से पुष्टि करें।",

    // Advisory
    cropRotation: "फसल चक्र सुझाव",
    fertilizerGuide: "उर्वरक मार्गदर्शन",
    pestControl: "कीट एवं रोग नियंत्रण",
    irrigation: "सिंचाई समय-सारणी",
    soilCare: "मिट्टी की देखभाल",

    // Mandi
    mandiUpdates: "नवीनतम मंडी भाव",
    mandiUnavailable: "मंडी डेटा अभी उपलब्ध नहीं है।",

    // Account / Auth
    register: "पंजीकरण करें",
    login: "लॉगिन करें",
    namePlaceholder: "अपना नाम दर्ज करें",
    alreadyRegistered: "पहले से पंजीकृत हैं? यहाँ लॉगिन करें",
    newUser: "नए उपयोगकर्ता हैं? यहाँ पंजीकरण करें",
  },
};

export default STRINGS;
