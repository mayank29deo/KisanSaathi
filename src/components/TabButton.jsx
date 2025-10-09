export default function TabButton({ active, label, onClick, icon }) {
  return (
    <button
      className={`flex flex-col items-center text-xs ${
        active ? "text-green-600 font-bold" : "text-gray-600"
      }`}
      onClick={onClick}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}
