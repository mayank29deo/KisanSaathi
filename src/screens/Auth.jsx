import { useState } from "react";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";

export default function Auth({ t, onLogin }) {
  const [name, setName] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  function handleLogin() {
    if (name.trim() !== "") {
      onLogin(name);
    }
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-bold">{t.account} 👤</h2>

      <Card>
        {!isRegistered ? (
          <>
            <h3 className="font-semibold mb-2">Register</h3>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded p-2 w-full mb-3"
            />
            <PrimaryButton onClick={handleLogin}>Register</PrimaryButton>
            <p
              className="text-xs text-gray-500 mt-3 cursor-pointer"
              onClick={() => setIsRegistered(true)}
            >
              Already registered? Login here
            </p>
          </>
        ) : (
          <>
            <h3 className="font-semibold mb-2">Login</h3>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded p-2 w-full mb-3"
            />
            <PrimaryButton onClick={handleLogin}>Login</PrimaryButton>
            <p
              className="text-xs text-gray-500 mt-3 cursor-pointer"
              onClick={() => setIsRegistered(false)}
            >
              New user? Register here
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
