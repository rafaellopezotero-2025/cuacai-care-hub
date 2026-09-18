# Convenciones del proyecto CUCAIER (leer antes de programar)

Stack: TanStack Start v1 (React 19, file-based routing en `src/routes`), Tailwind v4 (`src/styles.css`), shadcn/ui en `src/components/ui`, TanStack Query, zod, react-hook-form, sonner (toast), lucide-react, recharts. Backend: Lovable Cloud (Supabase Postgres + RLS). Idioma de la UI: español (Argentina). NO editar `src/integrations/supabase/*` ni `src/routeTree.gen.ts`.

## Acceso a datos (OBLIGATORIO)
- El navegador NUNCA consulta la base directamente. Todo pasa por server functions `createServerFn` (de `@tanstack/react-start`) en archivos `src/lib/<modulo>.functions.ts` con `.middleware([requireSupabaseAuth])` (import de `@/integrations/supabase/auth-middleware`). En el handler usar `context.supabase` (cliente con RLS como el usuario) y `context.userId`.
- Validar entradas con zod en `.inputValidator((input: unknown) => schema.parse(input))`.
- Errores: convertir errores de Supabase con `aAppError(error)` de `@/lib/errores` y lanzarlos (`throw aAppError(error)`); en el cliente mostrar `toast.error(mensajeDeError(err))`. Nunca mostrar mensajes internos ni datos de pacientes en toasts/errores.
- `supabaseAdmin` (service role) SOLO para gestión de usuarios (auth admin API); cargarlo dentro del handler con `await import("@/integrations/supabase/client.server")` y siempre después de verificar el permiso del llamador con `context.supabase.rpc("has_permission", { _user_id: context.userId, _permiso: "usuarios.administrar" })`.
- Verificación de permisos en server functions para operaciones sensibles: `const { data: ok } = await context.supabase.rpc("has_permission", {...}); if (!ok) throw new AppError("No tiene permisos...", "NO_AUTORIZADO")`. RLS es la última barrera, pero verificar explícitamente igual.
- Lectura en componentes: `useQuery`/`useSuspenseQuery` de TanStack Query llamando a la server function (`queryFn: () => miFn({ data })`). Mutaciones: `useMutation` + `queryClient.invalidateQueries`.
- IP/user-agent para auditoría: `getRequestMeta()` de `@/lib/request-meta.server` (solo en handlers).
- Eventos de auditoría manuales (VIEW, EXPORT, IMPORT): `context.supabase.rpc("registrar_evento_auditoria", { p_action, p_entity, p_entity_id?, p_detalle?, p_paciente_id? })`. Los CREATE/UPDATE/DELETE/DEACTIVATE los registran triggers automáticamente.

## Esquema de base de datos (ya creado; tipos en `src/integrations/supabase/types.ts`, alias en `src/types/dominio.ts`)
- `profiles(id, usuario, nombre, apellido, activo, ultimo_acceso, created_at, updated_at)`; `user_roles(id, user_id, role app_role)`; enum `app_role = administrador|operador|consulta`; `permisos(permiso, descripcion, grupo)`; `rol_permisos(role, permiso)`.
- Maestras: `diagnosticos(id, diagnostico, activo)`, `tipos_tx(id, tipo_tx, activo)`, `estados_tx(id, estado_tx, codigo, requiere_fecha_tx, orden, activo)`, `vias_admin(id, descripcion, activo)`, `coberturas(id, descripcion, activo)`, `medicos_ref(id, nombres, apellidos, matricula, telefono, email, activo)`, `centros_tx(id, nombre, localidad, provincia, telefono, email, observaciones, activo)`. Todas con created_at/updated_at. No se eliminan físicamente: se desactivan (`activo=false`).
- `pacientes(id uuid, nombres, apellidos, dni (6-9 dígitos, único), fecha_nacimiento, sexo F|M|X, localidad, telefono, telefono_alternativo, email, domicilio, observaciones, activo, created_at, updated_at, created_by, updated_by)`. La edad se calcula con `calcularEdad()` de `@/types/dominio`, nunca se guarda.
- `trasplantes(id uuid, paciente_id, diagnostico_id, tipo_tx_id, estado_tx_id NOT NULL, via_admin_id, cobertura_id, centro_tx_id, medico_ref_id, fecha_tx date|null, observaciones, activo, created_at, updated_at, created_by, updated_by)`. Trigger valida: si `estados_tx.requiere_fecha_tx` entonces fecha obligatoria; fechas imposibles rechazadas.
- `audit_log(id, user_id, usuario, "timestamp", action, entity, entity_id, paciente_id, old_values, new_values, detalle, ip_address, user_agent)`. Solo lectura vía API; actions: CREATE, UPDATE, DEACTIVATE, REACTIVATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT, IMPORT.
- Vista `v_paciente_estado_actual(paciente_id, trasplante_id, estado_tx_id, estado_tx, estado_codigo, tipo_tx_id, tipo_tx, centro_tx_id, centro_tx, cobertura_id, cobertura, via_admin_id, fecha_tx)` = último proceso de cada paciente.
- RPCs: `buscar_pacientes(p_busqueda, p_localidad, p_diagnostico_id, p_tipo_tx_id, p_estado_id, p_cobertura_id, p_via_id, p_medico_id, p_centro_id, p_desde, p_hasta, p_incluir_inactivos, p_orden, p_dir, p_limit, p_offset)` → filas con `total_count`; `dashboard_resumen(p_desde, p_hasta, p_estado_id, p_tipo_tx_id, p_cobertura_id, p_centro_id, p_localidad)` → jsonb `{kpis:{total_pacientes,total_trasplantes,por_estado:{CODIGO:n}}, por_estado:[{id,nombre,codigo,valor}], por_tipo:[{id,nombre,valor}], por_cobertura, por_via, por_centro, por_localidad:[{nombre,valor}], evolucion:[{mes:'YYYY-MM',valor}]}`; `localidades_pacientes()`; `mis_permisos()`; `has_permission(_user_id,_permiso)`.
- Permisos (constantes en `PERMISOS` de `@/auth`): dashboard.ver, pacientes.ver/crear/editar/desactivar, trasplantes.ver/crear/editar, historial.ver, maestros.ver/editar, usuarios.administrar, auditoria.ver, importar.ejecutar, exportar.ejecutar.
- Códigos de estado (`CODIGOS_ESTADO`): LISTA_ESPERA, TRASPLANTADO, REVISAR, EXCLUIDO, FALLECIDO.

## Frontend
- Autenticación/permisos: `const { user, hasPermission, hasAnyPermission, hasRole } = useAuth()` de `@/auth`. Envolver el contenido de cada página con `<RequierePermiso permiso={PERMISOS.x}>` (de `@/components/shared/RequierePermiso`) y ocultar botones de acción con `hasPermission(...)`.
- Rutas privadas en `src/routes/_authenticated/...` (el layout `_authenticated/route.tsx` ya existe, NO tocarlo; ya renderiza sidebar y `<Outlet/>`). Cada ruta define `head()` con title/description/og:title/og:description/og:type/twitter:card únicos.
- Catálogos para selects/filtros: `useQuery(maestrosQueryOptions)` de `@/lib/maestros.functions` → `Maestros` (`@/types/dominio`).
- Componentes compartidos: `PageHeader` (`@/components/shared/PageHeader`), `EstadoBadge` (`@/components/shared/EstadoBadge`, props `codigo`, `nombre`), utilidades `formatearFecha`, `formatearFechaHora`, `nombreCompleto`, `calcularEdad` en `@/types/dominio`.
- Diseño: institucional, sobrio. Usar SOLO tokens semánticos (bg-card, text-muted-foreground, bg-primary, text-primary, bg-primary-soft, text-success, text-info, text-warm, text-destructive, border-border, chart-1..chart-7 vía `var(--chart-n)`), clase `card-surface` para paneles. Prohibido `text-white`, `bg-[#...]`, colores literales. Tablas con `@/components/ui/table`, formularios con `@/components/ui/form` + react-hook-form + zod, diálogos con `@/components/ui/dialog`, confirmaciones con `alert-dialog`, notificaciones con `toast` de `sonner`.
- IDs (uuid) en URLs están permitidos; DNI y datos clínicos NUNCA en URLs. Búsqueda/filtros en search params validados con `validateSearch`.
- No usar `useEffect` para fetch. TypeScript estricto; no usar `any` ni casts innecesarios. Verificar con `tsgo --noEmit -p tsconfig.json` al terminar (ignorar errores de rutas que pertenecen a otros módulos aún no creados: FileRoutesByPath de rutas ajenas).

## Rutas y responsables
- `/dashboard` (módulo dashboard). Al hacer clic en un gráfico navega a `/pacientes` con search params.
- `/pacientes` search params (validateSearch, todos opcionales): `q, localidad, diagnostico, tipo, estado, cobertura, via, medico, centro, desde, hasta, orden, dir, pagina (number), inactivos (boolean)`. Ids son uuid string; desde/hasta 'YYYY-MM-DD'.
- `/pacientes/nuevo`, `/pacientes/$pacienteId` (ficha + historial), `/pacientes/$pacienteId/editar`.
- `/trasplantes` (listado global con filtros), `/trasplantes/nuevo` (search param opcional `paciente` uuid), `/trasplantes/$trasplanteId/editar`.
- `/configuracion/$tabla` con tabla ∈ diagnosticos | tipos-trasplante | estados | vias-administrativas | coberturas | medicos | centros.
- `/sistema/usuarios`, `/sistema/roles`, `/sistema/auditoria`, `/sistema/importar`, `/perfil` (ya existe).
