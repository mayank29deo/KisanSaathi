import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { HandCoins, Landmark, Building2 } from "lucide-react";

export default function Finance({ t }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-green-800">
        {t.finance || "Finance & Subsidy Assistance (वित्तीय सहायता)"}
      </h1>

      {/* Existing finance cards */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
          <HandCoins className="w-5 h-5" />
          <span>{t.banksNear || "Find Banks & ATMs Near You"}</span>
        </div>
        <p className="text-sm text-gray-600">
          Locate nearby banking services, agricultural finance offices, or ATMs for easy transactions.
        </p>
        <PrimaryButton
          onClick={() =>
            window.open("https://maps.google.com/search/banks+near+me", "_blank")
          }
        >
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

      {/* 🌿 New Poster Section */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-2xl shadow-md p-6 space-y-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Building2 className="w-6 h-6 text-green-800" />
          <h2 className="text-xl font-extrabold text-green-900">
            {t.govtSchemes || "Government Schemes & Subsidies (सरकारी योजनाएँ)"}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* PM-Kisan */}
          <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm hover:shadow-lg transition relative overflow-hidden">
            <img
              src="https://upload.wikimedia.org/wikipedia/en/8/8f/PM-Kisan_logo.png"
              alt="PM Kisan"
              className="absolute opacity-10 right-2 top-2 w-20"
            />
            <div className="text-green-800 font-bold text-lg mb-1">
              प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)
            </div>
            <p className="text-sm text-gray-700 mb-3">
              ₹6,000 annual income support credited in 3 installments directly to eligible farmer accounts.
            </p>
            <PrimaryButton onClick={() => window.open("https://pmkisan.gov.in", "_blank")}>
              Visit Official Portal →
            </PrimaryButton>
          </div>

          {/* KCC */}
          <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm hover:shadow-lg transition relative overflow-hidden">
            <img
              src="https://upload.wikimedia.org/wikipedia/en/2/2d/Indian_Bank_logo.png"
              alt="KCC Logo"
              className="absolute opacity-10 right-2 top-2 w-16"
            />
            <div className="text-green-800 font-bold text-lg mb-1">
              किसान क्रेडिट कार्ड (Kisan Credit Card)
            </div>
            <p className="text-sm text-gray-700 mb-3">
              Instant access to credit for seeds, fertilizers, and machinery at low interest rates.
            </p>
            <PrimaryButton onClick={() => window.open("https://www.mygov.in/kcc", "_blank")}>
              Apply Now →
            </PrimaryButton>
          </div>

          {/* PMFBY */}
          <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm hover:shadow-lg transition relative overflow-hidden">
            <img
              src="https://pmfby.gov.in/images/pmfby_logo.png"
              alt="PMFBY Logo"
              className="absolute opacity-10 right-2 top-2 w-20"
            />
            <div className="text-green-800 font-bold text-lg mb-1">
              प्रधानमंत्री फसल बीमा योजना (PMFBY)
            </div>
            <p className="text-sm text-gray-700 mb-3">
              Crop insurance protection against natural calamities with easy claims and low premiums.
            </p>
            <PrimaryButton onClick={() => window.open("https://pmfby.gov.in", "_blank")}>
              Learn More →
            </PrimaryButton>
          </div>

          {/* Soil Health */}
          <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm hover:shadow-lg transition relative overflow-hidden">
            <img
              src="https://soilhealth.dac.gov.in/assets/images/logo.png"
              alt="Soil Health"
              className="absolute opacity-10 right-2 top-2 w-16"
            />
            <div className="text-green-800 font-bold text-lg mb-1">
              मृदा स्वास्थ्य कार्ड योजना (Soil Health Card)
            </div>
            <p className="text-sm text-gray-700 mb-3">
              Free soil testing and nutrient reports for improving productivity and reducing cost.
            </p>
            <PrimaryButton onClick={() => window.open("https://soilhealth.dac.gov.in", "_blank")}>
              Check Details →
            </PrimaryButton>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-xs text-gray-700 text-center italic border-t border-green-300 pt-3">
          For more government updates, visit{" "}
          <a
            href="https://agricoop.gov.in"
            target="_blank"
            className="text-green-700 underline font-semibold"
            rel="noreferrer"
          >
            agricoop.gov.in
          </a>{" "}
          | Ministry of Agriculture & Farmers Welfare
        </div>
      </Card>
    </div>
  );
}
