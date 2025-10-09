import { motion } from "framer-motion";

export default function Card({ children, className = "", hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={"rounded-2xl shadow-sm border p-4 bg-white " + className}
    >
      {children}
    </motion.div>
  );
}
