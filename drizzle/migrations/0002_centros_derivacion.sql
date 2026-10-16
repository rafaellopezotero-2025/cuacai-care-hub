CREATE TABLE public.centros_derivacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 200),
  direccion text,
  telefono text,
  email text CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  localidad text,
  provincia text DEFAULT 'Entre Ríos',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.centros_derivacion TO authenticated;
GRANT ALL ON public.centros_derivacion TO service_role;
ALTER TABLE public.centros_derivacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "centros_derivacion: ver" ON public.centros_derivacion FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'maestros.ver'));
CREATE POLICY "centros_derivacion: crear" ON public.centros_derivacion FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'maestros.editar'));
CREATE POLICY "centros_derivacion: editar" ON public.centros_derivacion FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'maestros.editar')) WITH CHECK (public.has_permission(auth.uid(), 'maestros.editar'));
CREATE TRIGGER trg_centros_derivacion_updated BEFORE UPDATE ON public.centros_derivacion FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_centros_derivacion_audit AFTER INSERT OR UPDATE OR DELETE ON public.centros_derivacion FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

ALTER TABLE public.pacientes ADD COLUMN centro_derivacion_id uuid REFERENCES public.centros_derivacion(id) ON DELETE RESTRICT;
CREATE INDEX idx_pacientes_centro_derivacion ON public.pacientes(centro_derivacion_id);