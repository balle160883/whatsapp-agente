"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  WhatsappLogo,
  User,
  EnvelopeSimple,
  Lock,
  Buildings,
  ArrowRight,
  CircleNotch,
  CheckCircle,
} from "@phosphor-icons/react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json() as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Error al crear la cuenta");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  const fieldStyle = {
    display: "block" as const,
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    marginBottom: "0.5rem",
  };

  const iconStyle = {
    position: "absolute" as const,
    left: "0.75rem",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--color-text-muted)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 80% 50%, rgba(97, 114, 243, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 20% 20%, rgba(37, 211, 102, 0.05) 0%, transparent 50%), #0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div className="animate-fade-in" style={{ width: "100%", maxWidth: "440px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              background: "linear-gradient(135deg, #6172f3 0%, #25d366 100%)",
              borderRadius: "1rem",
              marginBottom: "1.25rem",
              boxShadow: "0 8px 32px rgba(97, 114, 243, 0.35)",
            }}
          >
            <WhatsappLogo size={32} color="#fff" weight="fill" />
          </div>
          <h1
            className="gradient-text"
            style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}
          >
            Crear cuenta
          </h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.5rem", fontSize: "0.875rem" }}>
            Empieza tu prueba gratuita hoy
          </p>
        </div>

        <div className="card" style={{ padding: "2rem" }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <CheckCircle size={48} color="#22c55e" style={{ marginBottom: "1rem" }} />
              <p style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                ¡Cuenta creada con éxito!
              </p>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                Redirigiendo al inicio de sesión...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label htmlFor="orgName" style={fieldStyle}>Nombre de la empresa</label>
                <div style={{ position: "relative" }}>
                  <Buildings size={16} style={iconStyle} />
                  <input id="orgName" type="text" className="input" style={{ paddingLeft: "2.25rem" }}
                    placeholder="Mi Empresa S.A." value={form.organizationName} onChange={update("organizationName")} required />
                </div>
              </div>

              <div>
                <label htmlFor="name" style={fieldStyle}>Tu nombre</label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={iconStyle} />
                  <input id="name" type="text" className="input" style={{ paddingLeft: "2.25rem" }}
                    placeholder="Juan Pérez" value={form.name} onChange={update("name")} required />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" style={fieldStyle}>Correo electrónico</label>
                <div style={{ position: "relative" }}>
                  <EnvelopeSimple size={16} style={iconStyle} />
                  <input id="signup-email" type="email" className="input" style={{ paddingLeft: "2.25rem" }}
                    placeholder="tu@empresa.com" value={form.email} onChange={update("email")} required autoComplete="email" />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" style={fieldStyle}>Contraseña</label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={iconStyle} />
                  <input id="signup-password" type="password" className="input" style={{ paddingLeft: "2.25rem" }}
                    placeholder="Mínimo 8 caracteres" value={form.password} onChange={update("password")}
                    required minLength={8} autoComplete="new-password" />
                </div>
              </div>

              {error && (
                <div style={{
                  padding: "0.75rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "var(--radius-md)",
                  color: "#ef4444",
                  fontSize: "0.8125rem",
                }}>
                  {error}
                </div>
              )}

              <button id="signup-submit" type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}>
                {loading ? (
                  <CircleNotch size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <>Crear cuenta gratuita <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          )}

          {!success && (
            <div style={{
              textAlign: "center",
              marginTop: "1.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--color-border)",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" style={{ color: "#8098f9", textDecoration: "none", fontWeight: 500 }}>
                Inicia sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
