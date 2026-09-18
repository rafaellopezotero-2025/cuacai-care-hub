-- =====================================================================
-- CUCAIER - Sistema de Gestión de Pacientes Trasplantados
-- Migración base: roles/permisos, perfiles, tablas maestras, pacientes,
-- trasplantes, auditoría, funciones de consulta y datos demo FICTICIOS.
-- =====================================================================

-- ---------- Utilidades ----------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_set_audit_cols()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    NEW.updated_by := auth.uid();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- ---------- Roles y permisos (RBAC) ----------
CREATE TYPE public.app_role AS ENUM ('administrador', 'operador', 'consulta');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  usuario text NOT NULL UNIQUE CHECK (usuario ~ '^[a-z0-9._-]{3,32}$'),
  nombre text NOT NULL,
  apellido text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  ultimo_acceso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rol_permisos (
  role public.app_role NOT NULL,
  permiso text NOT NULL,
  PRIMARY KEY (role, permiso)
);
GRANT SELECT, INSERT, DELETE ON public.rol_permisos TO authenticated;
GRANT ALL ON public.rol_permisos TO service_role;
ALTER TABLE public.rol_permisos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.permisos (
  permiso text PRIMARY KEY,
  descripcion text NOT NULL,
  grupo text NOT NULL
);
GRANT SELECT ON public.permisos TO authenticated;
GRANT ALL ON public.permisos TO service_role;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;

INSERT INTO public.permisos (permiso, descripcion, grupo) VALUES
 ('dashboard.ver', 'Consultar dashboard', 'Dashboard'),
 ('pacientes.ver', 'Consultar pacientes', 'Pacientes'),
 ('pacientes.crear', 'Crear pacientes', 'Pacientes'),
 ('pacientes.editar', 'Modificar pacientes', 'Pacientes'),
 ('pacientes.desactivar', 'Dar de baja lógica pacientes', 'Pacientes'),
 ('trasplantes.ver', 'Consultar procesos de trasplante', 'Trasplantes'),
 ('trasplantes.crear', 'Registrar procesos de trasplante', 'Trasplantes'),
 ('trasplantes.editar', 'Modificar procesos de trasplante', 'Trasplantes'),
 ('historial.ver', 'Ver historial de un paciente', 'Pacientes'),
 ('maestros.ver', 'Consultar tablas maestras', 'Configuración'),
 ('maestros.editar', 'Administrar tablas maestras', 'Configuración'),
 ('usuarios.administrar', 'Administrar usuarios y roles', 'Sistema'),
 ('auditoria.ver', 'Consultar auditoría completa', 'Sistema'),
 ('importar.ejecutar', 'Importar datos desde Excel', 'Sistema'),
 ('exportar.ejecutar', 'Exportar información (CSV/Excel)', 'Sistema');

INSERT INTO public.rol_permisos (role, permiso)
SELECT 'administrador', permiso FROM public.permisos;
INSERT INTO public.rol_permisos (role, permiso) VALUES
 ('operador','dashboard.ver'),('operador','pacientes.ver'),('operador','pacientes.crear'),
 ('operador','pacientes.editar'),('operador','trasplantes.ver'),('operador','trasplantes.crear'),
 ('operador','trasplantes.editar'),('operador','historial.ver'),('operador','maestros.ver'),
 ('consulta','dashboard.ver'),('consulta','pacientes.ver'),('consulta','trasplantes.ver'),('consulta','maestros.ver');

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = _role AND p.activo
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permiso text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.rol_permisos rp ON rp.role = ur.role
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND rp.permiso = _permiso AND p.activo
  )
$$;

CREATE OR REPLACE FUNCTION public.mis_permisos()
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT rp.permiso FROM public.user_roles ur
  JOIN public.rol_permisos rp ON rp.role = ur.role
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.user_id = auth.uid() AND p.activo
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.mis_permisos() FROM public, anon;

-- Políticas RBAC
CREATE POLICY "profiles: propio o admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_permission(auth.uid(), 'usuarios.administrar'));
CREATE POLICY "profiles: admin actualiza" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'usuarios.administrar'))
  WITH CHECK (public.has_permission(auth.uid(), 'usuarios.administrar'));

CREATE POLICY "user_roles: propio o admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'usuarios.administrar'));
CREATE POLICY "user_roles: admin inserta" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'usuarios.administrar'));
CREATE POLICY "user_roles: admin actualiza" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'usuarios.administrar'));
CREATE POLICY "user_roles: admin elimina" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'usuarios.administrar'));

CREATE POLICY "permisos: lectura autenticados" ON public.permisos FOR SELECT TO authenticated USING (true);
CREATE POLICY "rol_permisos: lectura autenticados" ON public.rol_permisos FOR SELECT TO authenticated USING (true);
CREATE POLICY "rol_permisos: admin inserta" ON public.rol_permisos FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'usuarios.administrar'));
CREATE POLICY "rol_permisos: admin elimina" ON public.rol_permisos FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'usuarios.administrar') AND NOT (role = 'administrador' AND permiso = 'usuarios.administrar'));

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ---------- Intentos de login (protección fuerza bruta) ----------
CREATE TABLE public.login_intentos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario text NOT NULL,
  ip_address text,
  exitoso boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_intentos_usuario ON public.login_intentos (usuario, created_at DESC);
CREATE INDEX idx_login_intentos_ip ON public.login_intentos (ip_address, created_at DESC);
GRANT ALL ON public.login_intentos TO service_role;
ALTER TABLE public.login_intentos ENABLE ROW LEVEL SECURITY;

-- ---------- Tablas maestras ----------
CREATE TABLE public.diagnosticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tipos_tx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_tx text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.estados_tx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estado_tx text NOT NULL UNIQUE,
  codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z_]{2,32}$'),
  requiere_fecha_tx boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vias_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.coberturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.medicos_ref (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres text NOT NULL,
  apellidos text NOT NULL,
  matricula text,
  telefono text,
  email text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_medicos_matricula ON public.medicos_ref (matricula) WHERE matricula IS NOT NULL;
CREATE TABLE public.centros_tx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  localidad text,
  provincia text,
  telefono text,
  email text,
  observaciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['diagnosticos','tipos_tx','estados_tx','vias_admin','coberturas','medicos_ref','centros_tx'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s: ver" ON public.%I FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), ''maestros.ver''))', t, t);
    EXECUTE format('CREATE POLICY "%s: crear" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), ''maestros.editar''))', t, t);
    EXECUTE format('CREATE POLICY "%s: editar" ON public.%I FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), ''maestros.editar'')) WITH CHECK (public.has_permission(auth.uid(), ''maestros.editar''))', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at()', t, t);
  END LOOP;
END $$;

-- ---------- Pacientes ----------
CREATE TABLE public.pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres text NOT NULL CHECK (length(trim(nombres)) BETWEEN 1 AND 120),
  apellidos text NOT NULL CHECK (length(trim(apellidos)) BETWEEN 1 AND 120),
  dni text CHECK (dni IS NULL OR dni ~ '^[0-9]{6,9}$'),
  fecha_nacimiento date,
  sexo text CHECK (sexo IS NULL OR sexo IN ('F','M','X')),
  localidad text,
  telefono text,
  telefono_alternativo text,
  email text CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  domicilio text,
  observaciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE UNIQUE INDEX uq_pacientes_dni ON public.pacientes (dni) WHERE dni IS NOT NULL;
CREATE INDEX idx_pacientes_apellidos ON public.pacientes (lower(apellidos), lower(nombres));
CREATE INDEX idx_pacientes_localidad ON public.pacientes (localidad);
CREATE INDEX idx_pacientes_activo ON public.pacientes (activo);
GRANT SELECT, INSERT, UPDATE ON public.pacientes TO authenticated;
GRANT ALL ON public.pacientes TO service_role;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pacientes: ver" ON public.pacientes FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'pacientes.ver'));
CREATE POLICY "pacientes: crear" ON public.pacientes FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'pacientes.crear'));
CREATE POLICY "pacientes: editar" ON public.pacientes FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'pacientes.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'pacientes.editar'));

CREATE OR REPLACE FUNCTION public.fn_validar_paciente()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.nombres := trim(NEW.nombres);
  NEW.apellidos := trim(NEW.apellidos);
  IF NEW.fecha_nacimiento IS NOT NULL AND (NEW.fecha_nacimiento > current_date OR NEW.fecha_nacimiento < current_date - interval '120 years') THEN
    RAISE EXCEPTION 'Fecha de nacimiento inválida' USING ERRCODE = '23514';
  END IF;
  -- La baja lógica requiere permiso específico
  IF TG_OP = 'UPDATE' AND OLD.activo AND NOT NEW.activo AND NOT public.has_permission(auth.uid(), 'pacientes.desactivar') THEN
    RAISE EXCEPTION 'No autorizado para dar de baja pacientes' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pacientes_validar BEFORE INSERT OR UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_paciente();
CREATE TRIGGER trg_pacientes_audit_cols BEFORE INSERT OR UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_audit_cols();

-- ---------- Trasplantes ----------
CREATE TABLE public.trasplantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  diagnostico_id uuid REFERENCES public.diagnosticos(id) ON DELETE RESTRICT,
  tipo_tx_id uuid REFERENCES public.tipos_tx(id) ON DELETE RESTRICT,
  estado_tx_id uuid NOT NULL REFERENCES public.estados_tx(id) ON DELETE RESTRICT,
  via_admin_id uuid REFERENCES public.vias_admin(id) ON DELETE RESTRICT,
  cobertura_id uuid REFERENCES public.coberturas(id) ON DELETE RESTRICT,
  centro_tx_id uuid REFERENCES public.centros_tx(id) ON DELETE RESTRICT,
  medico_ref_id uuid REFERENCES public.medicos_ref(id) ON DELETE RESTRICT,
  fecha_tx date,
  observaciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX idx_tx_paciente ON public.trasplantes (paciente_id);
CREATE INDEX idx_tx_estado ON public.trasplantes (estado_tx_id);
CREATE INDEX idx_tx_tipo ON public.trasplantes (tipo_tx_id);
CREATE INDEX idx_tx_centro ON public.trasplantes (centro_tx_id);
CREATE INDEX idx_tx_cobertura ON public.trasplantes (cobertura_id);
CREATE INDEX idx_tx_fecha ON public.trasplantes (fecha_tx);
GRANT SELECT, INSERT, UPDATE ON public.trasplantes TO authenticated;
GRANT ALL ON public.trasplantes TO service_role;
ALTER TABLE public.trasplantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trasplantes: ver" ON public.trasplantes FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'trasplantes.ver'));
CREATE POLICY "trasplantes: crear" ON public.trasplantes FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'trasplantes.crear'));
CREATE POLICY "trasplantes: editar" ON public.trasplantes FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'trasplantes.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'trasplantes.editar'));

CREATE OR REPLACE FUNCTION public.fn_validar_trasplante()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_req boolean;
BEGIN
  SELECT requiere_fecha_tx INTO v_req FROM public.estados_tx WHERE id = NEW.estado_tx_id;
  IF v_req AND NEW.fecha_tx IS NULL THEN
    RAISE EXCEPTION 'El estado seleccionado requiere fecha de trasplante' USING ERRCODE = '23514';
  END IF;
  IF NEW.fecha_tx IS NOT NULL AND (NEW.fecha_tx > current_date OR NEW.fecha_tx < date '1950-01-01') THEN
    RAISE EXCEPTION 'Fecha de trasplante inválida' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = NEW.paciente_id) THEN
    RAISE EXCEPTION 'Paciente inexistente' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_tx_validar BEFORE INSERT OR UPDATE ON public.trasplantes
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_trasplante();
CREATE TRIGGER trg_tx_audit_cols BEFORE INSERT OR UPDATE ON public.trasplantes
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_audit_cols();

-- ---------- Auditoría ----------
CREATE TABLE public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  usuario text,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  paciente_id uuid,
  old_values jsonb,
  new_values jsonb,
  detalle jsonb,
  ip_address text,
  user_agent text
);
CREATE INDEX idx_audit_ts ON public.audit_log ("timestamp" DESC);
CREATE INDEX idx_audit_user ON public.audit_log (user_id);
CREATE INDEX idx_audit_entity ON public.audit_log (entity, entity_id);
CREATE INDEX idx_audit_paciente ON public.audit_log (paciente_id) WHERE paciente_id IS NOT NULL;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Sólo lectura: auditoría completa para 'auditoria.ver'; historial de paciente para 'historial.ver'.
-- No existen políticas de UPDATE/DELETE: nadie puede alterar la auditoría desde la API.
CREATE POLICY "audit: ver" ON public.audit_log FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'auditoria.ver')
    OR (paciente_id IS NOT NULL AND public.has_permission(auth.uid(), 'historial.ver'))
  );

CREATE OR REPLACE FUNCTION public.fn_request_header(p_name text)
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE v jsonb;
BEGIN
  BEGIN
    v := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  RETURN v ->> p_name;
END $$;

CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old jsonb; v_new jsonb; v_action text; v_id text; v_pac uuid; v_usuario text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW); v_action := 'CREATE';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_action := 'UPDATE';
    IF (v_old ? 'activo') AND (v_old->>'activo')::boolean AND NOT (v_new->>'activo')::boolean THEN v_action := 'DEACTIVATE'; END IF;
    IF (v_old ? 'activo') AND NOT (v_old->>'activo')::boolean AND (v_new->>'activo')::boolean THEN v_action := 'REACTIVATE'; END IF;
  ELSE
    v_old := to_jsonb(OLD); v_action := 'DELETE';
  END IF;
  v_id := coalesce(v_new->>'id', v_old->>'id');
  IF TG_TABLE_NAME = 'pacientes' THEN v_pac := v_id::uuid;
  ELSIF TG_TABLE_NAME = 'trasplantes' THEN v_pac := coalesce(v_new->>'paciente_id', v_old->>'paciente_id')::uuid;
  END IF;
  SELECT usuario INTO v_usuario FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_log (user_id, usuario, action, entity, entity_id, paciente_id, old_values, new_values, ip_address, user_agent)
  VALUES (auth.uid(), v_usuario, v_action, TG_TABLE_NAME, v_id, v_pac, v_old, v_new,
          coalesce(public.fn_request_header('x-forwarded-for'), public.fn_request_header('cf-connecting-ip')),
          public.fn_request_header('user-agent'));
  RETURN coalesce(NEW, OLD);
END $$;

-- Eventos de auditoría no ligados a triggers (LOGIN, LOGOUT, VIEW, EXPORT, IMPORT)
CREATE OR REPLACE FUNCTION public.registrar_evento_auditoria(
  p_action text, p_entity text, p_entity_id text DEFAULT NULL,
  p_detalle jsonb DEFAULT NULL, p_paciente_id uuid DEFAULT NULL,
  p_ip text DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_usuario text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501'; END IF;
  IF p_action NOT IN ('LOGIN','LOGOUT','VIEW','EXPORT','IMPORT') THEN
    RAISE EXCEPTION 'Acción de auditoría no permitida' USING ERRCODE = '22023';
  END IF;
  SELECT usuario INTO v_usuario FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_log (user_id, usuario, action, entity, entity_id, paciente_id, detalle, ip_address, user_agent)
  VALUES (auth.uid(), v_usuario, p_action, p_entity, p_entity_id, p_paciente_id, p_detalle,
          coalesce(p_ip, public.fn_request_header('x-forwarded-for')), coalesce(p_user_agent, public.fn_request_header('user-agent')));
  IF p_action = 'LOGIN' THEN
    UPDATE public.profiles SET ultimo_acceso = now() WHERE id = auth.uid();
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.registrar_evento_auditoria(text, text, text, jsonb, uuid, text, text) FROM public, anon;

-- ---------- Vista: estado actual del paciente (último proceso) ----------
CREATE VIEW public.v_paciente_estado_actual WITH (security_invoker = true) AS
SELECT DISTINCT ON (t.paciente_id)
  t.paciente_id, t.id AS trasplante_id, t.estado_tx_id, e.estado_tx, e.codigo AS estado_codigo,
  t.tipo_tx_id, ti.tipo_tx, t.centro_tx_id, c.nombre AS centro_tx, t.cobertura_id, co.descripcion AS cobertura,
  t.via_admin_id, t.fecha_tx
FROM public.trasplantes t
JOIN public.estados_tx e ON e.id = t.estado_tx_id
LEFT JOIN public.tipos_tx ti ON ti.id = t.tipo_tx_id
LEFT JOIN public.centros_tx c ON c.id = t.centro_tx_id
LEFT JOIN public.coberturas co ON co.id = t.cobertura_id
WHERE t.activo
ORDER BY t.paciente_id, t.fecha_tx DESC NULLS LAST, t.created_at DESC;
GRANT SELECT ON public.v_paciente_estado_actual TO authenticated;

-- ---------- Búsqueda paginada server-side ----------
CREATE OR REPLACE FUNCTION public.buscar_pacientes(
  p_busqueda text DEFAULT NULL, p_localidad text DEFAULT NULL,
  p_diagnostico_id uuid DEFAULT NULL, p_tipo_tx_id uuid DEFAULT NULL, p_estado_id uuid DEFAULT NULL,
  p_cobertura_id uuid DEFAULT NULL, p_via_id uuid DEFAULT NULL, p_medico_id uuid DEFAULT NULL,
  p_centro_id uuid DEFAULT NULL, p_desde date DEFAULT NULL, p_hasta date DEFAULT NULL,
  p_incluir_inactivos boolean DEFAULT false,
  p_orden text DEFAULT 'apellidos', p_dir text DEFAULT 'asc',
  p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid, nombres text, apellidos text, dni text, localidad text, telefono text, fecha_nacimiento date, activo boolean,
  estado_tx text, estado_codigo text, tipo_tx text, centro_tx text, fecha_tx date, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_q text; v_filtra_tx boolean; v_orden text; v_dir text;
BEGIN
  v_q := nullif(trim(coalesce(p_busqueda, '')), '');
  v_filtra_tx := p_diagnostico_id IS NOT NULL OR p_tipo_tx_id IS NOT NULL OR p_estado_id IS NOT NULL
    OR p_cobertura_id IS NOT NULL OR p_via_id IS NOT NULL OR p_medico_id IS NOT NULL OR p_centro_id IS NOT NULL
    OR p_desde IS NOT NULL OR p_hasta IS NOT NULL;
  v_orden := CASE p_orden WHEN 'nombres' THEN 'p.nombres' WHEN 'dni' THEN 'p.dni' WHEN 'localidad' THEN 'p.localidad'
                          WHEN 'estado' THEN 'a.estado_tx' WHEN 'fecha_tx' THEN 'a.fecha_tx' WHEN 'created_at' THEN 'p.created_at' ELSE 'p.apellidos' END;
  v_dir := CASE WHEN lower(p_dir) = 'desc' THEN 'DESC NULLS LAST' ELSE 'ASC NULLS LAST' END;
  RETURN QUERY EXECUTE format($q$
    SELECT p.id, p.nombres, p.apellidos, p.dni, p.localidad, p.telefono, p.fecha_nacimiento, p.activo,
           a.estado_tx, a.estado_codigo, a.tipo_tx, a.centro_tx, a.fecha_tx, count(*) OVER() AS total_count
    FROM public.pacientes p
    LEFT JOIN public.v_paciente_estado_actual a ON a.paciente_id = p.id
    WHERE ($1 OR p.activo)
      AND ($2 IS NULL OR p.dni ILIKE '%%' || $2 || '%%' OR p.nombres ILIKE '%%' || $2 || '%%' OR p.apellidos ILIKE '%%' || $2 || '%%'
           OR (p.apellidos || ' ' || p.nombres) ILIKE '%%' || $2 || '%%' OR (p.nombres || ' ' || p.apellidos) ILIKE '%%' || $2 || '%%')
      AND ($3 IS NULL OR p.localidad ILIKE $3)
      AND (NOT $4 OR EXISTS (
            SELECT 1 FROM public.trasplantes t WHERE t.paciente_id = p.id AND t.activo
              AND ($5::uuid IS NULL OR t.diagnostico_id = $5) AND ($6::uuid IS NULL OR t.tipo_tx_id = $6)
              AND ($7::uuid IS NULL OR t.estado_tx_id = $7) AND ($8::uuid IS NULL OR t.cobertura_id = $8)
              AND ($9::uuid IS NULL OR t.via_admin_id = $9) AND ($10::uuid IS NULL OR t.medico_ref_id = $10)
              AND ($11::uuid IS NULL OR t.centro_tx_id = $11)
              AND ($12::date IS NULL OR t.fecha_tx >= $12) AND ($13::date IS NULL OR t.fecha_tx <= $13)))
    ORDER BY %s %s, p.apellidos ASC, p.nombres ASC
    LIMIT $14 OFFSET $15
  $q$, v_orden, v_dir)
  USING p_incluir_inactivos, v_q, p_localidad, v_filtra_tx, p_diagnostico_id, p_tipo_tx_id, p_estado_id,
        p_cobertura_id, p_via_id, p_medico_id, p_centro_id, p_desde, p_hasta, least(greatest(p_limit,1),100), greatest(p_offset,0);
END $$;
REVOKE EXECUTE ON FUNCTION public.buscar_pacientes(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,date,date,boolean,text,text,integer,integer) FROM public, anon;

-- ---------- Dashboard agregado (sin datos identificables) ----------
CREATE OR REPLACE FUNCTION public.dashboard_resumen(
  p_desde date DEFAULT NULL, p_hasta date DEFAULT NULL, p_estado_id uuid DEFAULT NULL,
  p_tipo_tx_id uuid DEFAULT NULL, p_cobertura_id uuid DEFAULT NULL, p_centro_id uuid DEFAULT NULL,
  p_localidad text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v jsonb; v_filtrado boolean;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'dashboard.ver') THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  v_filtrado := p_desde IS NOT NULL OR p_hasta IS NOT NULL OR p_estado_id IS NOT NULL OR p_tipo_tx_id IS NOT NULL
                OR p_cobertura_id IS NOT NULL OR p_centro_id IS NOT NULL;
  WITH tx AS (
    SELECT t.*, p.localidad FROM public.trasplantes t JOIN public.pacientes p ON p.id = t.paciente_id
    WHERE t.activo AND p.activo
      AND (p_desde IS NULL OR t.fecha_tx >= p_desde) AND (p_hasta IS NULL OR t.fecha_tx <= p_hasta)
      AND (p_estado_id IS NULL OR t.estado_tx_id = p_estado_id) AND (p_tipo_tx_id IS NULL OR t.tipo_tx_id = p_tipo_tx_id)
      AND (p_cobertura_id IS NULL OR t.cobertura_id = p_cobertura_id) AND (p_centro_id IS NULL OR t.centro_tx_id = p_centro_id)
      AND (p_localidad IS NULL OR p.localidad = p_localidad)
  ),
  pac AS (
    SELECT p.id, p.localidad FROM public.pacientes p WHERE p.activo
      AND (p_localidad IS NULL OR p.localidad = p_localidad)
      AND (NOT v_filtrado OR EXISTS (SELECT 1 FROM tx WHERE tx.paciente_id = p.id))
  ),
  actual AS (
    SELECT DISTINCT ON (t.paciente_id) t.paciente_id, t.estado_tx_id, t.cobertura_id, t.via_admin_id
    FROM public.trasplantes t JOIN pac ON pac.id = t.paciente_id
    WHERE t.activo AND (NOT v_filtrado OR t.id IN (SELECT id FROM tx))
    ORDER BY t.paciente_id, t.fecha_tx DESC NULLS LAST, t.created_at DESC
  ),
  por_estado AS (
    SELECT e.id, e.estado_tx AS nombre, e.codigo, count(a.paciente_id) AS valor
    FROM public.estados_tx e LEFT JOIN actual a ON a.estado_tx_id = e.id WHERE e.activo GROUP BY e.id, e.estado_tx, e.codigo, e.orden ORDER BY e.orden
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_pacientes', (SELECT count(*) FROM pac),
      'total_trasplantes', (SELECT count(*) FROM tx),
      'por_estado', (SELECT coalesce(jsonb_object_agg(codigo, valor), '{}'::jsonb) FROM por_estado)
    ),
    'por_estado', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'codigo', codigo, 'valor', valor)), '[]'::jsonb) FROM por_estado WHERE valor > 0),
    'por_tipo', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', ti.id, 'nombre', ti.tipo_tx, 'valor', s.c) ORDER BY s.c DESC), '[]'::jsonb)
                 FROM (SELECT tipo_tx_id, count(*) c FROM tx WHERE tipo_tx_id IS NOT NULL GROUP BY 1) s JOIN public.tipos_tx ti ON ti.id = s.tipo_tx_id),
    'por_cobertura', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', co.id, 'nombre', coalesce(co.descripcion, 'Sin cobertura'), 'valor', s.c) ORDER BY s.c DESC), '[]'::jsonb)
                 FROM (SELECT cobertura_id, count(*) c FROM actual GROUP BY 1) s LEFT JOIN public.coberturas co ON co.id = s.cobertura_id),
    'por_via', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', vi.id, 'nombre', coalesce(vi.descripcion, 'Sin vía'), 'valor', s.c) ORDER BY s.c DESC), '[]'::jsonb)
                 FROM (SELECT via_admin_id, count(*) c FROM actual GROUP BY 1) s LEFT JOIN public.vias_admin vi ON vi.id = s.via_admin_id),
    'por_centro', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', ce.id, 'nombre', coalesce(ce.nombre, 'Sin centro'), 'valor', s.c) ORDER BY s.c DESC), '[]'::jsonb)
                 FROM (SELECT centro_tx_id, count(*) c FROM tx GROUP BY 1) s LEFT JOIN public.centros_tx ce ON ce.id = s.centro_tx_id),
    'por_localidad', (SELECT coalesce(jsonb_agg(jsonb_build_object('nombre', coalesce(localidad, 'Sin localidad'), 'valor', c) ORDER BY c DESC), '[]'::jsonb)
                 FROM (SELECT localidad, count(*) c FROM pac GROUP BY 1) s),
    'evolucion', (SELECT coalesce(jsonb_agg(jsonb_build_object('mes', to_char(m, 'YYYY-MM'), 'valor', c) ORDER BY m), '[]'::jsonb)
                 FROM (SELECT date_trunc('month', fecha_tx) m, count(*) c FROM tx WHERE fecha_tx IS NOT NULL GROUP BY 1) s)
  ) INTO v;
  RETURN v;
END $$;
REVOKE EXECUTE ON FUNCTION public.dashboard_resumen(date,date,uuid,uuid,uuid,uuid,text) FROM public, anon;

-- Localidades distintas (para filtros)
CREATE OR REPLACE FUNCTION public.localidades_pacientes()
RETURNS SETOF text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT DISTINCT localidad FROM public.pacientes WHERE localidad IS NOT NULL AND activo ORDER BY 1
$$;
REVOKE EXECUTE ON FUNCTION public.localidades_pacientes() FROM public, anon;

-- ---------- Datos iniciales de tablas maestras (provenientes de la planilla) ----------
INSERT INTO public.diagnosticos (diagnostico) VALUES
 ('Cirrosis Biliar Primaria'), ('Colestasis intrahepática familiar progresiva'), ('Queratocono bilateral'),
 ('Cirrosis etílica'), ('Cirrosis colestática');
INSERT INTO public.tipos_tx (tipo_tx) VALUES ('Médula'), ('Hepático'), ('Cardíaco'), ('Hepatorenal'), ('Renal');
INSERT INTO public.estados_tx (estado_tx, codigo, requiere_fecha_tx, orden) VALUES
 ('Lista Espera', 'LISTA_ESPERA', false, 1), ('Transplantado', 'TRASPLANTADO', true, 2),
 ('Revisar', 'REVISAR', false, 3), ('Excluido', 'EXCLUIDO', false, 4), ('Fallecido', 'FALLECIDO', false, 5);
INSERT INTO public.vias_admin (descripcion) VALUES ('Subsidio'), ('Convenio'), ('Cont. directa'), ('Obra Social');
INSERT INTO public.coberturas (descripcion) VALUES ('MSER'), ('Incluir Salud'), ('IOSPER');
INSERT INTO public.medicos_ref (nombres, apellidos, matricula) VALUES ('Liliana', 'Bustos', '2222'), ('Rafael', 'Lopez Otero', '1111');
INSERT INTO public.centros_tx (nombre, localidad, provincia) VALUES
 ('HSM', 'Paraná', 'Entre Ríos'), ('Fundación Zambrano', 'CABA', 'Buenos Aires'),
 ('Hospital Gutiérrez', 'CABA', 'Buenos Aires'), ('Hospital Garrahan', 'CABA', 'Buenos Aires');

-- ---------- DATOS DEMO FICTICIOS (no corresponden a personas reales) ----------
INSERT INTO public.pacientes (nombres, apellidos, dni, fecha_nacimiento, sexo, localidad, telefono, email, domicilio) VALUES
 ('Demo Ana', 'Prueba Uno', '90000001', '1985-03-12', 'F', 'Paraná', '0343-4000001', NULL, 'Calle Ficticia 101'),
 ('Demo Bruno', 'Prueba Dos', '90000002', '1972-07-25', 'M', 'Concordia', '0345-4000002', NULL, 'Calle Ficticia 102'),
 ('Demo Carla', 'Prueba Tres', '90000003', '1990-11-02', 'F', 'Gualeguaychú', '03446-400003', NULL, 'Calle Ficticia 103'),
 ('Demo Diego', 'Prueba Cuatro', '90000004', '1968-01-30', 'M', 'Concepción del Uruguay', '03442-400004', NULL, 'Calle Ficticia 104'),
 ('Demo Elena', 'Prueba Cinco', '90000005', '2010-05-19', 'F', 'Villaguay', '03455-400005', NULL, 'Calle Ficticia 105'),
 ('Demo Facundo', 'Prueba Seis', '90000006', '1979-09-09', 'M', 'Victoria', '03436-400006', NULL, 'Calle Ficticia 106'),
 ('Demo Gabriela', 'Prueba Siete', '90000007', '1995-12-24', 'F', 'La Paz', '03437-400007', NULL, 'Calle Ficticia 107'),
 ('Demo Hernán', 'Prueba Ocho', '90000008', '1960-04-04', 'M', 'Federación', '0345-4000008', NULL, 'Calle Ficticia 108'),
 ('Demo Inés', 'Prueba Nueve', '90000009', '1988-08-15', 'F', 'Chajarí', '03456-400009', NULL, 'Calle Ficticia 109'),
 ('Demo Julián', 'Prueba Diez', '90000010', '2005-02-28', 'M', 'Diamante', '0343-4000010', NULL, 'Calle Ficticia 110'),
 ('Demo Karina', 'Prueba Once', '90000011', '1975-06-06', 'F', 'Nogoyá', '03435-400011', NULL, 'Calle Ficticia 111'),
 ('Demo Leandro', 'Prueba Doce', '90000012', '1982-10-10', 'M', 'Colón', '03447-400012', NULL, 'Calle Ficticia 112'),
 ('Demo Marta', 'Prueba Trece', '90000013', '1958-03-03', 'F', 'Crespo', '0343-4000013', NULL, 'Calle Ficticia 113'),
 ('Demo Nicolás', 'Prueba Catorce', '90000014', '1999-07-07', 'M', 'Gualeguay', '03444-400014', NULL, 'Calle Ficticia 114'),
 ('Demo Olga', 'Prueba Quince', '90000015', '1965-11-11', 'F', 'San José', '03447-400015', NULL, 'Calle Ficticia 115'),
 ('Demo Pablo', 'Prueba Dieciséis', '90000016', '1992-01-01', 'M', 'Paraná', '0343-4000016', NULL, 'Calle Ficticia 116'),
 ('Demo Rocío', 'Prueba Diecisiete', '90000017', '2015-09-21', 'F', 'Concordia', '0345-4000017', NULL, 'Calle Ficticia 117'),
 ('Demo Sergio', 'Prueba Dieciocho', '90000018', '1970-05-05', 'M', 'Gualeguaychú', '03446-400018', NULL, 'Calle Ficticia 118'),
 ('Demo Teresa', 'Prueba Diecinueve', '90000019', '1984-12-12', 'F', 'Paraná', '0343-4000019', NULL, 'Calle Ficticia 119'),
 ('Demo Ulises', 'Prueba Veinte', '90000020', '1977-08-08', 'M', 'Concepción del Uruguay', '03442-400020', NULL, 'Calle Ficticia 120'),
 ('Demo Valeria', 'Prueba Veintiuno', '90000021', '2001-04-17', 'F', 'Villaguay', '03455-400021', NULL, 'Calle Ficticia 121'),
 ('Demo Walter', 'Prueba Veintidós', '90000022', '1963-02-14', 'M', 'Paraná', '0343-4000022', NULL, 'Calle Ficticia 122');

INSERT INTO public.trasplantes (paciente_id, diagnostico_id, tipo_tx_id, estado_tx_id, via_admin_id, cobertura_id, centro_tx_id, medico_ref_id, fecha_tx, observaciones)
SELECT p.id,
  (SELECT id FROM public.diagnosticos WHERE diagnostico = d.diag),
  (SELECT id FROM public.tipos_tx WHERE tipo_tx = d.tipo),
  (SELECT id FROM public.estados_tx WHERE codigo = d.estado),
  (SELECT id FROM public.vias_admin WHERE descripcion = d.via),
  (SELECT id FROM public.coberturas WHERE descripcion = d.cob),
  (SELECT id FROM public.centros_tx WHERE nombre = d.centro),
  (SELECT id FROM public.medicos_ref WHERE matricula = d.mat),
  d.fecha, d.obs
FROM (VALUES
 ('90000001','Cirrosis Biliar Primaria','Hepático','TRASPLANTADO','Subsidio','IOSPER','Fundación Zambrano','2222', date '2023-04-18', 'Evolución favorable (demo)'),
 ('90000002','Cirrosis etílica','Hepático','LISTA_ESPERA','Obra Social','IOSPER','HSM','1111', NULL, 'En evaluación pretrasplante (demo)'),
 ('90000003','Queratocono bilateral','Renal','TRASPLANTADO','Convenio','MSER','HSM','2222', date '2024-02-05', NULL),
 ('90000004','Cirrosis colestática','Hepatorenal','FALLECIDO','Subsidio','Incluir Salud','Hospital Gutiérrez','1111', date '2021-09-30', 'Registro histórico (demo)'),
 ('90000005','Colestasis intrahepática familiar progresiva','Hepático','TRASPLANTADO','Subsidio','Incluir Salud','Hospital Garrahan','2222', date '2022-11-11', 'Paciente pediátrico (demo)'),
 ('90000006','Cirrosis etílica','Hepático','REVISAR','Cont. directa','MSER','HSM','1111', NULL, 'Falta documentación (demo)'),
 ('90000007','Queratocono bilateral','Médula','LISTA_ESPERA','Obra Social','IOSPER','Hospital Gutiérrez','2222', NULL, NULL),
 ('90000008','Cirrosis Biliar Primaria','Cardíaco','TRASPLANTADO','Convenio','MSER','Fundación Zambrano','1111', date '2023-08-22', NULL),
 ('90000009','Cirrosis colestática','Renal','EXCLUIDO','Subsidio','IOSPER','HSM','2222', NULL, 'Excluido por criterio médico (demo)'),
 ('90000010','Colestasis intrahepática familiar progresiva','Hepático','TRASPLANTADO','Subsidio','Incluir Salud','Hospital Garrahan','2222', date '2024-06-14', NULL),
 ('90000011','Cirrosis etílica','Renal','LISTA_ESPERA','Obra Social','IOSPER','HSM','1111', NULL, NULL),
 ('90000012','Queratocono bilateral','Renal','TRASPLANTADO','Cont. directa','MSER','HSM','1111', date '2025-01-20', NULL),
 ('90000013','Cirrosis Biliar Primaria','Hepático','FALLECIDO','Convenio','IOSPER','Fundación Zambrano','2222', date '2020-03-03', NULL),
 ('90000014','Cirrosis colestática','Médula','TRASPLANTADO','Subsidio','Incluir Salud','Hospital Gutiérrez','1111', date '2024-10-09', NULL),
 ('90000015','Cirrosis etílica','Hepático','REVISAR','Obra Social','IOSPER','HSM','2222', NULL, NULL),
 ('90000016','Queratocono bilateral','Renal','LISTA_ESPERA','Convenio','MSER','HSM','1111', NULL, NULL),
 ('90000017','Colestasis intrahepática familiar progresiva','Hepático','TRASPLANTADO','Subsidio','Incluir Salud','Hospital Garrahan','2222', date '2025-05-30', NULL),
 ('90000018','Cirrosis etílica','Hepatorenal','TRASPLANTADO','Subsidio','IOSPER','Fundación Zambrano','1111', date '2023-12-01', NULL),
 ('90000019','Cirrosis Biliar Primaria','Hepático','LISTA_ESPERA','Obra Social','IOSPER','Fundación Zambrano','2222', NULL, NULL),
 ('90000020','Cirrosis colestática','Cardíaco','EXCLUIDO','Cont. directa','MSER','Fundación Zambrano','1111', NULL, NULL),
 ('90000021','Queratocono bilateral','Renal','TRASPLANTADO','Convenio','IOSPER','HSM','2222', date '2026-02-12', NULL),
 ('90000022','Cirrosis etílica','Hepático','TRASPLANTADO','Subsidio','MSER','Fundación Zambrano','1111', date '2022-05-17', NULL),
 -- Segundo proceso para un paciente (historial múltiple)
 ('90000003','Queratocono bilateral','Renal','LISTA_ESPERA','Convenio','MSER','HSM','2222', NULL, 'Primer proceso, previo al trasplante (demo)'),
 ('90000012','Queratocono bilateral','Renal','REVISAR','Cont. directa','MSER','HSM','1111', NULL, 'Proceso inicial (demo)')
) AS d(dni, diag, tipo, estado, via, cob, centro, mat, fecha, obs)
JOIN public.pacientes p ON p.dni = d.dni;

-- ---------- Triggers de auditoría (después del seed, para no auditar datos demo) ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pacientes','trasplantes','diagnosticos','tipos_tx','estados_tx','vias_admin','coberturas','medicos_ref','centros_tx','profiles','user_roles','rol_permisos'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit()', t, t);
  END LOOP;
END $$;
