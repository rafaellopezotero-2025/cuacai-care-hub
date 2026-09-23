CREATE OR REPLACE FUNCTION public.importar_lote(p_pacientes jsonb, p_trasplantes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_paciente jsonb;
  v_tx jsonb;
  v_clave text;
  v_dni text;
  v_paciente_id uuid;
  v_pacientes_creados integer := 0;
  v_pacientes_existentes integer := 0;
  v_trasplantes_creados integer := 0;
  v_mapa jsonb := '{}'::jsonb;
  v_diagnostico_id uuid;
  v_tipo_tx_id uuid;
  v_estado_tx_id uuid;
  v_via_admin_id uuid;
  v_cobertura_id uuid;
  v_centro_tx_id uuid;
  v_medico_ref_id uuid;
  v_nombre text;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'importar.ejecutar') THEN
    RAISE EXCEPTION 'No tiene permisos para ejecutar importaciones' USING ERRCODE = '42501';
  END IF;

  IF p_pacientes IS NULL OR jsonb_typeof(p_pacientes) <> 'array' THEN
    RAISE EXCEPTION 'p_pacientes debe ser un array jsonb' USING ERRCODE = '22023';
  END IF;
  IF p_trasplantes IS NULL OR jsonb_typeof(p_trasplantes) <> 'array' THEN
    RAISE EXCEPTION 'p_trasplantes debe ser un array jsonb' USING ERRCODE = '22023';
  END IF;

  FOR v_paciente IN SELECT * FROM jsonb_array_elements(p_pacientes)
  LOOP
    v_clave := v_paciente ->> 'clave';
    IF v_clave IS NULL OR length(trim(v_clave)) = 0 THEN
      RAISE EXCEPTION 'Fila de paciente sin clave identificadora' USING ERRCODE = '22023';
    END IF;
    v_dni := NULLIF(trim(v_paciente ->> 'dni'), '');
    v_paciente_id := NULL;

    IF v_dni IS NOT NULL THEN
      SELECT id INTO v_paciente_id FROM public.pacientes WHERE dni = v_dni;
    END IF;

    IF v_paciente_id IS NOT NULL THEN
      v_pacientes_existentes := v_pacientes_existentes + 1;
    ELSE
      INSERT INTO public.pacientes (
        nombres, apellidos, dni, fecha_nacimiento, sexo, localidad,
        telefono, telefono_alternativo, email, domicilio, observaciones
      ) VALUES (
        v_paciente ->> 'nombres',
        v_paciente ->> 'apellidos',
        v_dni,
        NULLIF(v_paciente ->> 'fecha_nacimiento', '')::date,
        NULLIF(v_paciente ->> 'sexo', ''),
        NULLIF(v_paciente ->> 'localidad', ''),
        NULLIF(v_paciente ->> 'telefono', ''),
        NULLIF(v_paciente ->> 'telefono_alternativo', ''),
        NULLIF(v_paciente ->> 'email', ''),
        NULLIF(v_paciente ->> 'domicilio', ''),
        NULLIF(v_paciente ->> 'observaciones', '')
      ) RETURNING id INTO v_paciente_id;
      v_pacientes_creados := v_pacientes_creados + 1;
    END IF;

    v_mapa := v_mapa || jsonb_build_object(v_clave, v_paciente_id::text);
  END LOOP;

  FOR v_tx IN SELECT * FROM jsonb_array_elements(p_trasplantes)
  LOOP
    v_clave := v_tx ->> 'paciente_clave';
    IF v_clave IS NULL OR NOT (v_mapa ? v_clave) THEN
      RAISE EXCEPTION 'Trasplante referencia un paciente inexistente en el lote (clave %)', v_clave USING ERRCODE = '23503';
    END IF;
    v_paciente_id := (v_mapa ->> v_clave)::uuid;

    v_diagnostico_id := NULL;
    v_nombre := NULLIF(trim(v_tx ->> 'diagnostico'), '');
    IF v_nombre IS NOT NULL THEN
      SELECT id INTO v_diagnostico_id FROM public.diagnosticos WHERE lower(trim(diagnostico)) = lower(v_nombre);
      IF v_diagnostico_id IS NULL THEN
        RAISE EXCEPTION 'Diagnostico "%" no existe en tablas maestras', v_nombre USING ERRCODE = '23503';
      END IF;
    END IF;

    v_tipo_tx_id := NULL;
    v_nombre := NULLIF(trim(v_tx ->> 'tipo_tx'), '');
    IF v_nombre IS NOT NULL THEN
      SELECT id INTO v_tipo_tx_id FROM public.tipos_tx WHERE lower(trim(tipo_tx)) = lower(v_nombre);
      IF v_tipo_tx_id IS NULL THEN
        RAISE EXCEPTION 'Tipo de trasplante "%" no existe en tablas maestras', v_nombre USING ERRCODE = '23503';
      END IF;
    END IF;

    v_estado_tx_id := NULL;
    v_nombre := NULLIF(trim(v_tx ->> 'estado_codigo'), '');
    IF v_nombre IS NOT NULL THEN
      SELECT id INTO v_estado_tx_id FROM public.estados_tx WHERE lower(trim(codigo)) = lower(v_nombre);
    END IF;
    IF v_estado_tx_id IS NULL THEN
      v_nombre := NULLIF(trim(v_tx ->> 'estado_tx'), '');
      IF v_nombre IS NOT NULL THEN
        SELECT id INTO v_estado_tx_id FROM public.estados_tx WHERE lower(trim(estado_tx)) = lower(v_nombre);
      END IF;
    END IF;
    IF v_estado_tx_id IS NULL THEN
      RAISE EXCEPTION 'Estado de trasplante "%" no existe en tablas maestras', coalesce(v_tx ->> 'estado_tx', v_tx ->> 'estado_codigo') USING ERRCODE = '23503';
    END IF;

    v_via_admin_id := NULL;
    v_nombre := NULLIF(trim(v_tx ->> 'via_admin'), '');
    IF v_nombre IS NOT NULL THEN
      SELECT id INTO v_via_admin_id FROM public.vias_admin WHERE lower(trim(descripcion)) = lower(v_nombre);
      IF v_via_admin_id IS NULL THEN
        RAISE EXCEPTION 'Via administrativa "%" no existe en tablas maestras', v_nombre USING ERRCODE = '23503';
      END IF;
    END IF;

    v_cobertura_id := NULL;
    v_nombre := NULLIF(trim(v_tx ->> 'cobertura'), '');
    IF v_nombre IS NOT NULL THEN
      SELECT id INTO v_cobertura_id FROM public.coberturas WHERE lower(trim(descripcion)) = lower(v_nombre);
      IF v_cobertura_id IS NULL THEN
        RAISE EXCEPTION 'Cobertura "%" no existe en tablas maestras', v_nombre USING ERRCODE = '23503';
      END IF;
    END IF;

    v_centro_tx_id := NULL;
    v_nombre := NULLIF(trim(v_tx ->> 'centro_tx'), '');
    IF v_nombre IS NOT NULL THEN
      SELECT id INTO v_centro_tx_id FROM public.centros_tx WHERE lower(trim(nombre)) = lower(v_nombre);
      IF v_centro_tx_id IS NULL THEN
        RAISE EXCEPTION 'Centro de trasplante "%" no existe en tablas maestras', v_nombre USING ERRCODE = '23503';
      END IF;
    END IF;

    v_medico_ref_id := NULL;
    v_nombre := NULLIF(trim(v_tx ->> 'medico_matricula'), '');
    IF v_nombre IS NOT NULL THEN
      SELECT id INTO v_medico_ref_id FROM public.medicos_ref WHERE lower(trim(matricula)) = lower(v_nombre);
    END IF;
    IF v_medico_ref_id IS NULL THEN
      v_nombre := NULLIF(trim(v_tx ->> 'medico'), '');
      IF v_nombre IS NOT NULL THEN
        SELECT id INTO v_medico_ref_id FROM public.medicos_ref
        WHERE lower(trim(apellidos || ', ' || nombres)) = lower(v_nombre)
           OR lower(trim(nombres || ' ' || apellidos)) = lower(v_nombre);
        IF v_medico_ref_id IS NULL THEN
          RAISE EXCEPTION 'Medico de referencia "%" no existe en tablas maestras', v_nombre USING ERRCODE = '23503';
        END IF;
      END IF;
    END IF;

    INSERT INTO public.trasplantes (
      paciente_id, diagnostico_id, tipo_tx_id, estado_tx_id, via_admin_id,
      cobertura_id, centro_tx_id, medico_ref_id, fecha_tx, observaciones
    ) VALUES (
      v_paciente_id, v_diagnostico_id, v_tipo_tx_id, v_estado_tx_id, v_via_admin_id,
      v_cobertura_id, v_centro_tx_id, v_medico_ref_id,
      NULLIF(v_tx ->> 'fecha_tx', '')::date,
      NULLIF(v_tx ->> 'observaciones', '')
    );
    v_trasplantes_creados := v_trasplantes_creados + 1;
  END LOOP;

  PERFORM public.registrar_evento_auditoria(
    'IMPORT', 'importacion', NULL,
    jsonb_build_object(
      'pacientes_creados', v_pacientes_creados,
      'pacientes_existentes', v_pacientes_existentes,
      'trasplantes_creados', v_trasplantes_creados
    )
  );

  RETURN jsonb_build_object(
    'pacientes_creados', v_pacientes_creados,
    'pacientes_existentes', v_pacientes_existentes,
    'trasplantes_creados', v_trasplantes_creados
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.importar_lote(jsonb, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.importar_lote(jsonb, jsonb) TO authenticated;