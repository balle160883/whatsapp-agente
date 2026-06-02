"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PaintBrush,
  Robot,
  FloppyDisk,
  Plus,
  Trash,
  Play,
  CircleNotch,
  CheckCircle,
  PaperPlaneTilt,
} from "@phosphor-icons/react";

interface FAQ { q: string; a: string; }

interface AgentConfig {
  provider: string;
  hasApiKey: boolean;
  systemPrompt: string;
  tone: string;
  services: string[];
  faqs: FAQ[];
  botActive: boolean;
}

interface SandboxMessage {
  role: "user" | "assistant";
  content: string;
}

export default function PersonalizacionPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("profesional");
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Sandbox
  const [sandboxMessages, setSandboxMessages] = useState<SandboxMessage[]>([]);
  const [sandboxInput, setSandboxInput] = useState("");
  const [sandboxLoading, setSandboxLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/agent-config");
      const data = await res.json() as AgentConfig;
      if (data) {
        setConfig(data);
        setPrompt(data.systemPrompt ?? "");
        setTone(data.tone ?? "profesional");
        setServices(Array.isArray(data.services) ? data.services as string[] : []);
        setFaqs(Array.isArray(data.faqs) ? data.faqs as FAQ[] : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchConfig(); }, [fetchConfig]);

  async function saveConfig() {
    setSaving(true);
    try {
      await fetch("/api/agent-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: prompt, tone, services, faqs }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function runSandbox(e: React.FormEvent) {
    e.preventDefault();
    if (!sandboxInput.trim() || sandboxLoading) return;
    const userMsg = sandboxInput;
    setSandboxInput("");
    setSandboxMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSandboxLoading(true);

    try {
      const res = await fetch("/api/agent-config/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: sandboxMessages }),
      });
      const data = await res.json() as { response: string };
      setSandboxMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setSandboxMessages((prev) => [...prev, { role: "assistant", content: "Error al conectar con el agente." }]);
    } finally {
      setSandboxLoading(false);
    }
  }

  const labelStyle = {
    display: "block" as const,
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    marginBottom: "0.5rem",
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Personalización</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
            Configura el comportamiento del agente IA
          </p>
        </div>
        <button id="save-config" onClick={saveConfig} className="btn btn-primary" disabled={saving}>
          {saving ? (
            <CircleNotch size={16} style={{ animation: "spin 0.8s linear infinite" }} />
          ) : saved ? (
            <><CheckCircle size={16} /> Guardado</>
          ) : (
            <><FloppyDisk size={16} /> Guardar cambios</>
          )}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* System Prompt */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <Robot size={18} color="#6172f3" weight="duotone" />
              <span style={{ fontWeight: 600 }}>Prompt del Agente</span>
            </div>
            <label htmlFor="system-prompt" style={labelStyle}>Instrucciones del sistema</label>
            <textarea
              id="system-prompt"
              className="input"
              style={{ minHeight: 140 }}
              placeholder="Eres un asistente de atención al cliente amigable y profesional de..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div style={{ marginTop: "1rem" }}>
              <label htmlFor="tone-select" style={labelStyle}>Tono</label>
              <select
                id="tone-select"
                className="input"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                {["profesional", "amigable", "formal", "casual", "empático"].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Services */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <PaintBrush size={18} color="#25d366" weight="duotone" />
              <span style={{ fontWeight: 600 }}>Servicios</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <input
                id="new-service"
                type="text"
                className="input"
                placeholder="Agregar servicio..."
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newService.trim()) {
                      setServices((prev) => [...prev, newService.trim()]);
                      setNewService("");
                    }
                  }
                }}
              />
              <button
                id="add-service"
                className="btn btn-secondary"
                style={{ flexShrink: 0 }}
                onClick={() => {
                  if (newService.trim()) {
                    setServices((prev) => [...prev, newService.trim()]);
                    setNewService("");
                  }
                }}
              >
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem" }}>
              {services.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.25rem 0.625rem",
                    background: "rgba(97,114,243,0.12)",
                    border: "1px solid rgba(97,114,243,0.25)",
                    borderRadius: "9999px",
                    fontSize: "0.8125rem",
                    color: "#8098f9",
                  }}
                >
                  {s}
                  <button
                    onClick={() => setServices((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", display: "flex" }}
                  >
                    <Trash size={12} />
                  </button>
                </div>
              ))}
              {services.length === 0 && (
                <span style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                  Ningún servicio agregado
                </span>
              )}
            </div>
          </div>

          {/* FAQs */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <span style={{ fontWeight: 600 }}>Preguntas Frecuentes</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setFaqs((prev) => [...prev, { q: "", a: "" }])}
              >
                <Plus size={14} /> Agregar FAQ
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {faqs.map((faq, i) => (
                <div key={i} style={{ background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", padding: "0.875rem", border: "1px solid var(--color-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500 }}>FAQ #{i + 1}</span>
                    <button onClick={() => setFaqs((prev) => prev.filter((_, idx) => idx !== i))}
                      className="btn btn-ghost btn-sm" style={{ padding: "0.125rem 0.25rem", color: "#ef4444" }}>
                      <Trash size={13} />
                    </button>
                  </div>
                  <input className="input" placeholder="Pregunta..." value={faq.q}
                    onChange={(e) => setFaqs((prev) => prev.map((f, idx) => idx === i ? { ...f, q: e.target.value } : f))}
                    style={{ marginBottom: "0.5rem" }} />
                  <textarea className="input" placeholder="Respuesta..." value={faq.a}
                    onChange={(e) => setFaqs((prev) => prev.map((f, idx) => idx === i ? { ...f, a: e.target.value } : f))}
                    style={{ minHeight: 70 }} />
                </div>
              ))}
              {faqs.length === 0 && (
                <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                  Sin FAQs. Agrega preguntas frecuentes para mejorar al agente.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Sandbox */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "fit-content", position: "sticky", top: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <Play size={18} color="#f59e0b" weight="duotone" />
            <span style={{ fontWeight: 600 }}>Sandbox — Probar agente</span>
            <span className="badge badge-warning" style={{ marginLeft: "auto", fontSize: "0.6875rem" }}>Vista previa</span>
          </div>

          {/* Chat area */}
          <div
            style={{
              minHeight: 320,
              maxHeight: 420,
              overflowY: "auto",
              padding: "0.5rem",
              background: "var(--color-bg-elevated)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              marginBottom: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {sandboxMessages.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                <Robot size={32} style={{ marginBottom: "0.5rem", opacity: 0.3 }} />
                <p>Escribe un mensaje para probar el agente con la configuración actual</p>
              </div>
            )}
            {sandboxMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  className={msg.role === "user" ? "chat-bubble chat-bubble-client" : "chat-bubble chat-bubble-bot"}
                  style={{ maxWidth: "85%" }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sandboxLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem" }}>
                <div className="spinner" />
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>Pensando...</span>
              </div>
            )}
          </div>

          <form onSubmit={runSandbox} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="sandbox-input"
              type="text"
              className="input"
              placeholder="Escribe un mensaje de prueba..."
              value={sandboxInput}
              onChange={(e) => setSandboxInput(e.target.value)}
              disabled={sandboxLoading}
              style={{ flex: 1 }}
            />
            <button
              id="sandbox-send"
              type="submit"
              className="btn btn-primary"
              disabled={sandboxLoading || !sandboxInput.trim()}
              style={{ flexShrink: 0 }}
            >
              <PaperPlaneTilt size={16} weight="fill" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
