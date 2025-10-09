import Card from "../components/Card";

export default function Sell({ t }) {
  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-bold">{t.sell} 🛒</h2>

      <Card>
        <h3 className="font-semibold">Sell via Local Mandi</h3>
        <p className="text-sm text-gray-600">
          Visit your nearest mandi to sell crops at government-declared MSP.
        </p>
        <a
          href="https://enam.gov.in/web/"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-600 underline text-sm"
        >
          Open eNAM Portal →
        </a>
      </Card>

      <Card>
        <h3 className="font-semibold">Sell Online (e-commerce)</h3>
        <p className="text-sm text-gray-600">
          Register as a seller on Amazon, Flipkart, or BigBasket for direct online sales.
        </p>
        <a
          href="https://sellercentral.amazon.in/"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 underline text-sm"
        >
          Amazon Seller →
        </a>
      </Card>

      <Card>
        <h3 className="font-semibold">Sell Direct to Restaurants</h3>
        <p className="text-sm text-gray-600">
          Platforms like Hyperpure (Zomato) allow farmers to supply directly to restaurants.
        </p>
        <a
          href="https://www.hyperpure.com/"
          target="_blank"
          rel="noreferrer"
          className="text-teal-600 underline text-sm"
        >
          Hyperpure →
        </a>
      </Card>

      <Card>
        <h3 className="font-semibold">Tips</h3>
        <ul className="text-sm text-gray-600 list-disc pl-4">
          <li>Ensure your crops are FSSAI compliant before selling.</li>
          <li>Check market rates daily for better negotiation.</li>
          <li>Maintain records for GST compliance if selling online.</li>
        </ul>
      </Card>
    </div>
  );
}
