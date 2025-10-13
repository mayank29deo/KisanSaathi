import { motion } from "framer-motion";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";

export default function Sell() {
  const tips = [
    {
      title: "Start Small, Grow Gradually (छोटे स्तर से शुरू करें, धीरे-धीरे बढ़ें)",
      desc: "Begin with a few local produce items and increase your listings as you gain experience. (कुछ स्थानीय उत्पादों से शुरुआत करें और अनुभव के साथ अपनी सूची बढ़ाएं।)",
    },
    {
      title: "Use High-Quality Photos (उच्च गुणवत्ता वाली तस्वीरें उपयोग करें)",
      desc: "Upload clear, bright photos of your produce to attract more buyers. (स्पष्ट और अच्छी रोशनी वाली तस्वीरें अपलोड करें ताकि अधिक खरीदार आकर्षित हों।)",
    },
    {
      title: "Maintain Fresh Inventory (ताज़ा सूची बनाए रखें)",
      desc: "Update your product list regularly to reflect availability and new harvests. (अपनी फसल की उपलब्धता और नई कटाई के अनुसार नियमित रूप से सूची अपडेट करें।)",
    },
    {
      title: "Deliver on Time (समय पर डिलीवरी करें)",
      desc: "On-time delivery builds trust and helps you grow as a reliable seller. (समय पर डिलीवरी से भरोसा बढ़ता है और आपको विश्वसनीय विक्रेता बनने में मदद मिलती है।)",
    },
  ];

  const registrationSteps = [
    {
      platform: "Hyperpure (Zomato)",
      link: "https://hyperpure.com/partners",
      buttonText: "🔗 Visit Hyperpure (हाइपरप्योर)",
      steps: [
        "1️⃣ Visit the official Hyperpure Partner site — https://hyperpure.com/partners",
        "   (Hyperpure की आधिकारिक वेबसाइट पर जाएं)",
        "2️⃣ Click on 'Register as Supplier' (सप्लायर के रूप में पंजीकरण करें)",
        "3️⃣ Fill your details: Name, Contact Number, Farm / Business Info (अपनी जानकारी भरें: नाम, संपर्क नंबर, व्यवसाय की जानकारी)",
        "4️⃣ Submit required documents (जैसे GST / FSSAI, यदि लागू हो)",
        "✅ Wait for verification and start supplying to Zomato Hyperpure (सत्यापन के बाद अपनी फसल की आपूर्ति शुरू करें)",
      ],
    },
    {
      platform: "Amazon Seller",
      link: "https://sellercentral.amazon.in",
      buttonText: "🛍️ Amazon Seller (अमेज़न विक्रेता)",
      steps: [
        "1️⃣ Go to https://sellercentral.amazon.in (Amazon Seller Central वेबसाइट पर जाएं)",
        "2️⃣ Click on ‘Register Now’ (अभी पंजीकरण करें)",
        "3️⃣ Enter your business details, upload PAN / GSTIN (व्यवसाय की जानकारी और PAN / GSTIN अपलोड करें)",
        "4️⃣ Add your product categories and delivery preferences (अपने उत्पाद श्रेणियां और डिलीवरी विकल्प चुनें)",
        "✅ Start listing and selling your farm products online (अपनी फसलें ऑनलाइन बेचने की शुरुआत करें)",
      ],
    },
    {
      platform: "eNAM (National Agriculture Market)",
      link: "https://enam.gov.in/web/",
      buttonText: "🌾 eNAM Portal (ई-नाम पोर्टल)",
      steps: [
        "1️⃣ Visit the official eNAM website — https://enam.gov.in/web/",
        "   (eNAM की आधिकारिक वेबसाइट पर जाएं)",
        "2️⃣ Click on 'Farmer Registration' (किसान पंजीकरण पर क्लिक करें)",
        "3️⃣ Enter your Aadhaar number, mobile number, and basic details (अपना आधार नंबर, मोबाइल नंबर और बुनियादी जानकारी भरें)",
        "4️⃣ Select your state and preferred mandi (अपना राज्य और मंडी चुनें)",
        "✅ Once verified, you can trade your produce digitally through eNAM (सत्यापन के बाद आप eNAM के माध्यम से अपनी फसल डिजिटल रूप से बेच सकते हैं)",
      ],
    },
  ];

  return (
    <div className="p-5 space-y-6">
      <motion.h2
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-2xl font-bold text-brand-dark"
      >
        🛒 Sell Your Produce (अपनी फसल बेचें)
      </motion.h2>

      {/* Tips Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
        }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {tips.map((tip, idx) => (
          <motion.div
            key={idx}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Card>
              <h3 className="font-semibold text-lg text-brand-dark mb-2">
                {tip.title}
              </h3>
              <p className="text-sm text-gray-700">{tip.desc}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Registration Guidance */}
      <Card delay={0.1} className="space-y-3">
        <h3 className="text-xl font-semibold text-emerald-700 mb-2">
          🌾 Step-by-Step Guide to Register as a Seller  
          <br />
          (विक्रेता के रूप में पंजीकरण करने की प्रक्रिया)
        </h3>
        <p className="text-sm text-gray-600">
          Follow these simple steps to start selling your farm produce on trusted platforms:  
          <br />
          (विश्वसनीय प्लेटफ़ॉर्म पर अपनी फसल बेचने के लिए नीचे दिए गए सरल चरणों का पालन करें:)
        </p>

        <div className="space-y-6 mt-3">
          {registrationSteps.map((section, i) => (
            <div
              key={i}
              className="border-t border-gray-200 pt-3 pb-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all p-3"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-lg text-brand-dark">
                  {section.platform}
                </h4>
                <a
                  href={section.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 text-sm underline hover:text-emerald-700"
                >
                  Visit Website (वेबसाइट देखें)
                </a>
              </div>

              {/* Steps */}
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 mb-3">
                {section.steps.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ul>

              {/* Right-aligned Button */}
              <div className="flex justify-end">
                <PrimaryButton onClick={() => window.open(section.link, "_blank")}>
                  {section.buttonText}
                </PrimaryButton>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
