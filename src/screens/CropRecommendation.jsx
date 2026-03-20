import React, { useState } from "react";

export default function CropRecommendation({ t }) {

  const [formData, setFormData] = useState({
    state: "",
    season: "",
    N: "",
    P: "",
    K: "",
    pH: "",
    rainfall: "",
    soil_moisture: "",
    min_temp: "",
    max_temp: ""
  });

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle Enter key navigation
  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const form = e.target.form;
      const next = form.elements[index + 1];

      if (next) {
        next.focus();
      } else {
        handleSubmit();
      }
    }
  };

  // Submit handler
  const handleSubmit = async () => {

    console.log("Function triggered");

    const {
      state,
      season,
      N,
      P,
      K,
      pH,
      rainfall,
      soil_moisture,
      min_temp,
      max_temp
    } = formData;

    // Validation
    if (!state || !season) {
      alert("Please fill all fields");
      return;
    }

    const data = {
      state: state.toLowerCase().trim(),
      season: season,
      N: parseFloat(N),
      P: parseFloat(P),
      K: parseFloat(K),
      pH: parseFloat(pH),
      rainfall: parseFloat(rainfall),
      soil_moisture: parseFloat(soil_moisture),
      min_temp: parseFloat(min_temp),
      max_temp: parseFloat(max_temp)
    };

    console.log("Sending data:", data);

    try {
      const API_URL = "https://crop-recommendation-backend-lwng.onrender.com";

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      setResult(result.recommended_crop);

    } catch (err) {
      console.error(err);
      setResult("Error fetching prediction");
    }
  };

  return (
    <div className="flex justify-center py-10 bg-gradient-to-br from-green-100 to-lime-100 min-h-full">

      <div className="w-[420px] bg-white p-8 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.15)]">

        <h2 className="text-center text-xl font-bold text-green-700 mb-6">
          🌾 {t?.crop_title || "Crop Recommendation"}
        </h2>

        <form>

          {/* State */}
          <div className="mt-3">
            <label className="block text-sm text-green-700 font-semibold mb-1">
              {t?.state || "State"}
            </label>
            <select
              name="state"
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, 0)}
              className="w-full h-[45px] px-3 rounded-xl bg-gradient-to-br from-white to-gray-100 shadow-inner outline-none"
            >
              <option value="">Select State</option>
              <option>Andhra Pradesh</option>
              <option>Karnataka</option>
              <option>Punjab</option>
              <option>Maharashtra</option>
              <option>Uttar Pradesh</option>
              <option>Rajasthan</option>
              <option>Gujarat</option>
              <option>Tamil Nadu</option>
            </select>
          </div>

          {/* Season */}
          <div className="mt-3">
            <label className="block text-sm text-green-700 font-semibold mb-1">
              {t?.season || "Season"}
            </label>
            <select
              name="season"
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, 1)}
              className="w-full h-[45px] px-3 rounded-xl bg-gradient-to-br from-white to-gray-100 shadow-inner outline-none"
            >
              <option value="">Select Season</option>
              <option>Kharif</option>
              <option>Rabi</option>
              <option>Zaid</option>
            </select>
          </div>

          {/* Dynamic Inputs */}
          {[
            { label: t?.nitrogen || "Nitrogen (N)", name: "N" },
            { label: t?.phosphorus || "Phosphorus (P)", name: "P" },
            { label: t?.potassium || "Potassium (K)", name: "K" },
            { label: t?.ph || "Soil pH", name: "pH" },
            { label: t?.rainfall || "Rainfall (mm)", name: "rainfall" },
            { label: t?.soil_moisture || "Soil Moisture", name: "soil_moisture" },
            { label: t?.min_temp || "Minimum Temperature", name: "min_temp" },
            { label: t?.max_temp || "Maximum Temperature", name: "max_temp" }
          ].map((field, index) => (
            <div className="mt-3" key={field.name}>
              <label className="block text-sm text-green-700 font-semibold mb-1">
                {field.label}
              </label>
              <input
                type="number"
                name={field.name}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, index + 2)}
                className="w-full h-[45px] px-3 rounded-xl bg-gradient-to-br from-white to-gray-100 shadow-inner outline-none"
              />
            </div>
          ))}

        </form>

        {/* Button */}
        <button
          onClick={handleSubmit}
          className="w-full h-[48px] mt-5 rounded-xl text-white font-semibold bg-gradient-to-br from-green-500 to-green-700 hover:scale-[1.02] transition"
        >
          {loading ? "Predicting..." : (t?.predict || "Recommend Crop")}
        </button>

        {/* Result */}
        {result && (
          <div className="mt-5 text-center text-lg font-semibold text-green-800">
            🌾 {t?.result || "Recommended Crop"}: {result}
          </div>
        )}

      </div>
    </div>
  );
}