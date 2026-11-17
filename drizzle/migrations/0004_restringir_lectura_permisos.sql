DROP POLICY IF EXISTS "permisos: lectura autenticados" ON public.permisos;
DROP POLICY IF EXISTS "rol_permisos: lectura autenticados" ON public.rol_permisos;
CREATE POLICY "permisos: lectura propia o admin" ON public.permisos FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'usuarios.administrar') OR public.has_permission(auth.uid(), permiso));
CREATE POLICY "rol_permisos: lectura propia o admin" ON public.rol_permisos FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'usuarios.administrar') OR public.has_role(auth.uid(), role));