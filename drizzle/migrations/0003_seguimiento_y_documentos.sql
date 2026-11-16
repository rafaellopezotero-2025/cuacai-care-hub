CREATE TABLE public.paciente_seguimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id),
  fecha date NOT NULL DEFAULT current_date,
  texto text NOT NULL CHECK (length(texto) BETWEEN 1 AND 4000),
  usuario text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX ON public.paciente_seguimientos(paciente_id, fecha DESC);
GRANT SELECT, INSERT, UPDATE ON public.paciente_seguimientos TO authenticated;
GRANT ALL ON public.paciente_seguimientos TO service_role;
ALTER TABLE public.paciente_seguimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seguimientos: ver" ON public.paciente_seguimientos FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'pacientes.ver'));
CREATE POLICY "seguimientos: crear" ON public.paciente_seguimientos FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'pacientes.editar'));
CREATE POLICY "seguimientos: editar" ON public.paciente_seguimientos FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'pacientes.editar')) WITH CHECK (public.has_permission(auth.uid(),'pacientes.editar'));

CREATE TABLE public.paciente_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id),
  nombre text NOT NULL,
  ruta text NOT NULL UNIQUE,
  tipo_mime text,
  tamano bigint,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX ON public.paciente_documentos(paciente_id);
GRANT SELECT, INSERT, UPDATE ON public.paciente_documentos TO authenticated;
GRANT ALL ON public.paciente_documentos TO service_role;
ALTER TABLE public.paciente_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos: ver" ON public.paciente_documentos FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'pacientes.ver'));
CREATE POLICY "documentos: crear" ON public.paciente_documentos FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(),'pacientes.editar') OR public.has_permission(auth.uid(),'pacientes.crear'));
CREATE POLICY "documentos: editar" ON public.paciente_documentos FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'pacientes.editar')) WITH CHECK (public.has_permission(auth.uid(),'pacientes.editar'));

CREATE POLICY "docs pacientes: ver" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documentos-pacientes' AND public.has_permission(auth.uid(),'pacientes.ver'));
CREATE POLICY "docs pacientes: subir" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos-pacientes' AND (public.has_permission(auth.uid(),'pacientes.editar') OR public.has_permission(auth.uid(),'pacientes.crear')));