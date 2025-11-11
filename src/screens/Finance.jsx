import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { HandCoins, Landmark, Building2 } from "lucide-react";

export default function Finance({ t }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-green-800">
        {t.finance || "Finance & Subsidy Assistance (वित्तीय सहायता)"}
      </h1>

      {/* Existing Cards */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
          <HandCoins className="w-5 h-5" />
          <span>{t.banksNear || "Find Banks & ATMs Near You"}</span>
        </div>
        <p className="text-sm text-gray-600">
          Locate nearby banking services, agricultural finance offices, or ATMs for easy transactions.
        </p>
        <PrimaryButton onClick={() => window.open("https://maps.google.com/search/banks+near+me", "_blank")}>
          {t.openMap || "Open in Google Maps"}
        </PrimaryButton>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
          <Landmark className="w-5 h-5" />
          <span>{t.agriLoans || "Agriculture Loans (कृषि ऋण)"}</span>
        </div>
        <p className="text-sm text-gray-600">
          Explore different loan options available for farmers via NABARD and commercial banks.
        </p>
        <PrimaryButton onClick={() => window.open("https://www.nabard.org", "_blank")}>
          {t.learnMore || "Visit NABARD Website"}
        </PrimaryButton>
      </Card>

      {/* 🌿 NEW SECTION: Government Scheme Posters */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border border-emerald-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="text-lg font-bold text-green-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-green-700" />
          <span>Government Schemes & Subsidies (सरकारी योजनाएँ)</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* PM-Kisan Yojana */}
          <div className="bg-white rounded-xl p-4 border border-green-200 hover:shadow-lg transition">
            <div className="text-green-800 font-semibold mb-1">PM-KISAN (प्रधानमंत्री किसान सम्मान निधि)</div>
            <p className="text-sm text-gray-600 mb-2">
              ₹6,000 annual income support directly transferred to eligible farmer accounts in 3 installments.
            </p>
            <PrimaryButton onClick={() => window.open("https://pmkisan.gov.in", "_blank")}>
              Visit Official Portal →
            </PrimaryButton>
          </div>

          {/* Kisan Credit Card */}
          <div className="bg-white rounded-xl p-4 border border-green-200 hover:shadow-lg transition">
            <div className="text-green-800 font-semibold mb-1">Kisan Credit Card (किसान क्रेडिट कार्ड)</div>
            <p className="text-sm text-gray-600 mb-2">
              Instant access to short-term credit for seeds, fertilizers, and machinery at low interest rates.
            </p>
            <PrimaryButton onClick={() => window.open("https://www.mygov.in/kcc", "_blank")}>
              Apply Now →
            </PrimaryButton>
          </div>

          {/* PMFBY */}
          <div className="bg-white rounded-xl p-4 border border-green-200 hover:shadow-lg transition">
            <div className="text-green-800 font-semibold mb-1">PMFBY (प्रधानमंत्री फसल बीमा योजना)</div>
            <p className="text-sm text-gray-600 mb-2">
              Crop insurance coverage against natural calamities with simplified claim process and low premium.
            </p>
            <PrimaryButton onClick={() => window.open("https://pmfby.gov.in", "_blank")}>
              Learn More →
            </PrimaryButton>
          </div>

          {/* Soil Health Card */}
          <div className="bg-white rounded-xl p-4 border border-green-200 hover:shadow-lg transition">
            <div className="text-green-800 font-semibold mb-1">Soil Health Card (मृदा स्वास्थ्य कार्ड योजना)</div>
            <p className="text-sm text-gray-600 mb-2">
              Free soil testing and reports for better fertilizer use and yield improvement.
            </p>
            <PrimaryButton onClick={() => window.open("https://soilhealth.dac.gov.in", "_blank")}>
              Check Details →
            </PrimaryButton>
          </div>
        </div>

        {/* Note */}
        <div className="text-xs text-gray-600 italic text-center pt-2">
          For latest government updates, visit <a href="https://agricoop.gov.in" className="text-green-700 underline">agricoop.gov.in</a>
        </div>
      </Card>
    </div>
  );
}
