import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PERMISOS } from "@/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · CUCAIER Gestión de Pacientes" },
      { name: "description", content: "Resumen de pacientes y trasplantes del CUCAIER." },
      { property: "og:title", content: "Dashboard · CUCAIER" },
      { property: "og:description", content: "Resumen de pacientes y trasplantes del CUCAIER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <RequierePermiso permiso={PERMISOS.dashboardVer}>
      <PageHeader titulo="Resumen de pacientes y trasplantes" descripcion="Dashboard en construcción." />
    </RequierePermiso>
  );
}
