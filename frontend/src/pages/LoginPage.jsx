import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { authUser, loading, login, register } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "elderly",
    linkedDeviceId: "",
  });

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-medical-50 text-medical-900">
        Checking your session...
      </main>
    );
  }

  if (authUser) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      if (isSignup) {
        await register(form);
      } else {
        await login({ email: form.email, password: form.password });
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    }
  };

  return (
    <main className="min-h-screen bg-medical-50 p-4 md:p-8">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        <section className="rounded-3xl bg-gradient-to-br from-medical-700 to-medical-500 p-8 text-white">
          <h1 className="text-3xl font-bold">Smart Medicine System</h1>
          <p className="mt-3 text-sm text-medical-50">
            Schedule doses, monitor dispensing in real time, and keep caretakers connected from anywhere.
          </p>
        </section>

        <section className="card p-6">
          <h2 className="text-2xl font-bold text-medical-900">{isSignup ? "Create account" : "Welcome back"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {isSignup && (
              <input className="input" placeholder="Full name" name="name" value={form.name} onChange={handleChange} required />
            )}
            <input className="input" placeholder="Email" type="email" name="email" value={form.email} onChange={handleChange} required />
            <input
              className="input"
              placeholder="Password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />

            {isSignup && (
              <>
                <select className="input" name="role" value={form.role} onChange={handleChange}>
                  <option value="elderly">Elderly User</option>
                  <option value="caretaker">Caretaker</option>
                </select>
                <input
                  className="input"
                  name="linkedDeviceId"
                  value={form.linkedDeviceId}
                  onChange={handleChange}
                  placeholder="Linked device ID (optional)"
                />
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button className="button-primary w-full" type="submit">
              {isSignup ? "Sign up" : "Login"}
            </button>
          </form>

          <button className="mt-4 text-sm font-semibold text-medical-700" onClick={() => setIsSignup((prev) => !prev)}>
            {isSignup ? "Already have an account? Login" : "Need an account? Sign up"}
          </button>
        </section>
      </div>
    </main>
  );
}
