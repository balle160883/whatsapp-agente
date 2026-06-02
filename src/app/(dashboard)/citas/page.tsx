"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarCheck,
  CalendarX,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Hourglass,
  GoogleLogo,
} from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Appointment {
  id: string;
  service: string;
  startsAt: string;
  endsAt: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  googleEventId: string | null;
  contact: { fullName: string | null; phone: string };
}

const STATUS_CONFIG = {
  SCHEDULED: { label: "Programada", badgeClass: "badge-info", icon: Hourglass },
  CONFIRMED: { label: "Confirmada", badgeClass: "badge-success", icon: CheckCircle },
  CANCELLED: { label: "Cancelada", badgeClass: "badge-danger", icon: XCircle },
  COMPLETED: { label: "Completada", badgeClass: "badge-muted", icon: CheckCircle },
};

export default function CitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json() as { appointments: Appointment[] };
      setAppointments(data.appointments ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const filtered =
    filter === "all"
      ? appointments
      : appointments.filter((a) => a.status === filter);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
          Citas
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
          Gestión de citas sincronizadas con Google Calendar
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        {(["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED"] as const).map((status) => {
          const count = appointments.filter((a) => a.status === status).length;
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? "all" : status)}
              className="card"
              style={{
                flex: 1,
                cursor: "pointer",
                background: filter === status ? "var(--color-bg-elevated)" : "var(--color-bg-surface)",
                border: filter === status ? "1px solid rgba(97,114,243,0.4)" : "1px solid var(--color-border)",
                textAlign: "left",
                padding: "1rem",
              }}
            >
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{count}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }}>
                {cfg.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "5rem 2rem", color: "var(--color-text-muted)" }}>
          <CalendarX size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
          <p>No hay citas {filter !== "all" ? "con este estado" : "registradas"}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["Paciente", "Servicio", "Fecha y hora", "Duración", "Estado", "Google Calendar"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.875rem 1.25rem",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((apt) => {
                const cfg = STATUS_CONFIG[apt.status];
                const StatusIcon = cfg.icon;
                const start = parseISO(apt.startsAt);
                const end = parseISO(apt.endsAt);
                const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

                return (
                  <tr
                    key={apt.id}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "var(--color-bg-elevated)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "transparent")
                    }
                  >
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #6172f3, #a4bbfc)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <User size={14} color="#fff" weight="fill" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                            {apt.contact.fullName ?? "Sin nombre"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {apt.contact.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", fontSize: "0.875rem" }}>
                      {apt.service}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", fontSize: "0.875rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        <CalendarCheck size={14} color="#6172f3" />
                        {format(start, "EEEE d MMM", { locale: es })}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.125rem" }}>
                        <Clock size={14} color="var(--color-text-muted)" />
                        <span style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                          {format(start, "HH:mm")} – {format(end, "HH:mm")}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                      {durationMin} min
                    </td>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <span className={`badge ${cfg.badgeClass}`}>
                        <StatusIcon size={10} />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      {apt.googleEventId ? (
                        <span className="badge badge-success" style={{ fontSize: "0.6875rem" }}>
                          <GoogleLogo size={10} weight="fill" />
                          Sincronizada
                        </span>
                      ) : (
                        <span className="badge badge-muted" style={{ fontSize: "0.6875rem" }}>
                          No sync
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
