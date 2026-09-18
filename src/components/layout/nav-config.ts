import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Stethoscope,
  ListTree,
  Flag,
  Route as RouteIcon,
  ShieldCheck,
  UserRound,
  Building2,
  UserCog,
  KeyRound,
  ScrollText,
  FileUp,
  type LucideIcon,
} from "lucide-react";
import { PERMISOS } from "@/auth/types";

export interface NavItem {
  titulo: string;
  to: string;
  icono: LucideIcon;
  /** Alguno de estos permisos habilita el ítem. */
  permisos: string[];
}

export interface NavGrupo {
  titulo: string;
  items: NavItem[];
}

export const NAV_GRUPOS: NavGrupo[] = [
  {
    titulo: "Gestión",
    items: [
      { titulo: "Dashboard", to: "/dashboard", icono: LayoutDashboard, permisos: [PERMISOS.dashboardVer] },
      { titulo: "Pacientes", to: "/pacientes", icono: Users, permisos: [PERMISOS.pacientesVer] },
      { titulo: "Trasplantes", to: "/trasplantes", icono: HeartPulse, permisos: [PERMISOS.trasplantesVer] },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { titulo: "Diagnósticos", to: "/configuracion/diagnosticos", icono: Stethoscope, permisos: [PERMISOS.maestrosVer] },
      { titulo: "Tipos de trasplante", to: "/configuracion/tipos-trasplante", icono: ListTree, permisos: [PERMISOS.maestrosVer] },
      { titulo: "Estados", to: "/configuracion/estados", icono: Flag, permisos: [PERMISOS.maestrosVer] },
      { titulo: "Vías administrativas", to: "/configuracion/vias-administrativas", icono: RouteIcon, permisos: [PERMISOS.maestrosVer] },
      { titulo: "Coberturas", to: "/configuracion/coberturas", icono: ShieldCheck, permisos: [PERMISOS.maestrosVer] },
      { titulo: "Médicos de referencia", to: "/configuracion/medicos", icono: UserRound, permisos: [PERMISOS.maestrosVer] },
      { titulo: "Centros de trasplante", to: "/configuracion/centros", icono: Building2, permisos: [PERMISOS.maestrosVer] },
    ],
  },
  {
    titulo: "Administración del sistema",
    items: [
      { titulo: "Usuarios", to: "/sistema/usuarios", icono: UserCog, permisos: [PERMISOS.usuariosAdministrar] },
      { titulo: "Roles", to: "/sistema/roles", icono: KeyRound, permisos: [PERMISOS.usuariosAdministrar] },
      { titulo: "Auditoría", to: "/sistema/auditoria", icono: ScrollText, permisos: [PERMISOS.auditoriaVer] },
      { titulo: "Importar datos", to: "/sistema/importar", icono: FileUp, permisos: [PERMISOS.importarEjecutar] },
    ],
  },
];
