export default function PrimaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
    >
      {children}
    </button>
  );
}
