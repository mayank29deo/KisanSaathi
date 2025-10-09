import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";

const SAMPLE_MANDI_DATA = [
  { crop: "Wheat", crop_hi: "गेहूं", price: 2150, market: "Karnal", state: "Haryana", city: "Karnal" },
  { crop: "Rice", crop_hi: "धान", price: 2350, market: "Lucknow", state: "Uttar Pradesh", city: "Lucknow" },
  { crop: "Maize", crop_hi: "मक्का", price: 1850, market: "Patna", state: "Bihar", city: "Patna" },
  { crop: "Cotton", crop_hi: "कपास", price: 6200, market: "Nagpur", state: "Maharashtra", city: "Nagpur" },
  { crop: "Sugarcane", crop_hi: "गन्ना", price: 340, market: "Meerut", state: "Uttar Pradesh", city: "Meerut" },
  { crop: "Soybean", crop_hi: "सोयाबीन", price: 4750, market: "Indore", state: "Madhya Pradesh", city: "Indore" },
  { crop: "Mustard", crop_hi: "सरसों", price: 5300, market: "Jaipur", state: "Rajasthan", city: "Jaipur" },
  { crop: "Barley", crop_hi: "जौ", price: 1900, market: "Ajmer", state: "Rajasthan", city: "Ajmer" },
  { crop: "Chana (Gram)", crop_hi: "चना", price: 5300, market: "Bhopal", state: "Madhya Pradesh", city: "Bhopal" },
  { crop: "Paddy", crop_hi: "पैडी", price: 2200, market: "Chandigarh", state: "Punjab", city: "Chandigarh" },
  { crop: "Groundnut", crop_hi: "मूंगफली", price: 6100, market: "Rajkot", state: "Gujarat", city: "Rajkot" },
  { crop: "Tur (Arhar)", crop_hi: "अरहर (तूर)", price: 6600, market: "Hyderabad", state: "Telangana", city: "Hyderabad" },
  { crop: "Moong", crop_hi: "मूंग", price: 7250, market: "Jodhpur", state: "Rajasthan", city: "Jodhpur" },
  { crop: "Urad", crop_hi: "उड़द", price: 7200, market: "Guntur", state: "Andhra Pradesh", city: "Guntur" },
  { crop: "Masoor (Lentil)", crop_hi: "मसूर", price: 6800, market: "Kanpur", state: "Uttar Pradesh", city: "Kanpur" },
  { crop: "Potato", crop_hi: "आलू", price: 1350, market: "Agra", state: "Uttar Pradesh", city: "Agra" },
  { crop: "Onion", crop_hi: "प्याज", price: 1750, market: "Nashik", state: "Maharashtra", city: "Nashik" },
  { crop: "Tomato", crop_hi: "टमाटर", price: 1450, market: "Bengaluru", state: "Karnataka", city: "Bengaluru" },
  { crop: "Banana", crop_hi: "केला", price: 1550, market: "Coimbatore", state: "Tamil Nadu", city: "Coimbatore" },
  { crop: "Tea Leaves", crop_hi: "चाय की पत्तियाँ", price: 230, market: "Darjeeling", state: "West Bengal", city: "Darjeeling" },
  { crop: "Coffee", crop_hi: "कॉफी", price: 310, market: "Chikmagalur", state: "Karnataka", city: "Chikmagalur" },
  { crop: "Coconut", crop_hi: "नारियल", price: 9500, market: "Alappuzha", state: "Kerala", city: "Alappuzha" },
  { crop: "Cardamom", crop_hi: "इलायची", price: 145000, market: "Idukki", state: "Kerala", city: "Idukki" },
];

const STATES = [
  "All States",
  "Haryana",
  "Uttar Pradesh",
  "Bihar",
  "Maharashtra",
  "Madhya Pradesh",
  "Rajasthan",
  "Punjab",
  "Gujarat",
  "Telangana",
  "Andhra Pradesh",
  "Karnataka",
  "Tamil Nadu",
  "West Bengal",
  "Kerala",
];

export default function Mandi({ t }) {
  const [crop, setCrop] = useState("");
  const [state, setState] = useState("All States");
  const [city, setCity] = useState("All Cities");

  const cities = useMemo(() => {
    if (state === "All States") return ["All Cities"];
    const citySet = new Set(
      SAMPLE_MANDI_DATA.filter((x) => x.state === state).map((x) => x.city)
    );
    return ["All Cities", ...Array.from(citySet)];
  }, [state]);

  const filteredData = SAMPLE_MANDI_DATA.filter((x) => {
    const cropMatch =
      !crop ||
      x.crop.toLowerCase().includes(crop.toLowerCase()) ||
      x.crop_hi.toLowerCase().includes(crop.toLowerCase());
    const stateMatch = state === "All States" || x.state === state;
    const cityMatch = city === "All Cities" || x.city === city;
    return cropMatch && stateMatch && cityMatch;
  });

  return (
    <div className="p-5 space-y-5">
      <motion.h2
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-2xl font-bold text-brand-dark"
      >
        📊 {t?.mandi || "Mandi Prices (मंडी भाव)"}
      </motion.h2>

      <Card delay={0.1} className="space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search crop (e.g., Wheat / गेहूं)"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            className="px-3 py-2 rounded-xl border bg-white/70 w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setCity("All Cities");
            }}
            className="px-3 py-2 rounded-xl border bg-white/70 w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-2 rounded-xl border bg-white/70 w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end">
          <PrimaryButton onClick={() => setCrop("")}>Clear Filters</PrimaryButton>
        </div>
      </Card>

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
        {filteredData.length ? (
          filteredData.map((item, idx) => (
            <motion.div
              key={`${item.crop}-${idx}`}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Card>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-brand-dark">
                      {item.crop} ({item.crop_hi})
                    </h3>
                    <p className="text-sm text-gray-500">
                      {item.city}, {item.state}
                    </p>
                    <p className="text-xs text-gray-400">Market: {item.market}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-700">
                      ₹{item.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">per quintal (प्रति क्विंटल)</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card>
            <p className="text-center text-gray-500">
              No results found / कोई परिणाम नहीं मिला।
            </p>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
