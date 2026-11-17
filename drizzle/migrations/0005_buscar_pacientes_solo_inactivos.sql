-- Reemplaza buscar_pacientes por una versión que permite listar solo los pacientes inactivos.
DROP FUNCTION IF EXISTS public.buscar_pacientes(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,date,date,boolean,text,text,integer,integer);

CREATE OR REPLACE FUNCTION public.buscar_pacientes(
  p_busqueda text DEFAULT NULL, p_localidad text DEFAULT NULL,
  p_diagnostico_id uuid DEFAULT NULL, p_tipo_tx_id uuid DEFAULT NULL, p_estado_id uuid DEFAULT NULL,
  p_cobertura_id uuid DEFAULT NULL, p_via_id uuid DEFAULT NULL, p_medico_id uuid DEFAULT NULL,
  p_centro_id uuid DEFAULT NULL, p_desde date DEFAULT NULL, p_hasta date DEFAULT NULL,
  p_incluir_inactivos boolean DEFAULT false, p_solo_inactivos boolean DEFAULT false,
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
    WHERE (CASE WHEN $16 THEN NOT p.activo ELSE ($1 OR p.activo) END)
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
        p_cobertura_id, p_via_id, p_medico_id, p_centro_id, p_desde, p_hasta, least(greatest(p_limit,1),100), greatest(p_offset,0), p_solo_inactivos;
END $$;

REVOKE EXECUTE ON FUNCTION public.buscar_pacientes(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,date,date,boolean,boolean,text,text,integer,integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.buscar_pacientes(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,date,date,boolean,boolean,text,text,integer,integer) TO authenticated, service_role;