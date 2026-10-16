import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { maestrosQueryOptions } from "@/lib/maestros.functions";
import { calcularEdad } from "@/types/dominio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIN_CENTRO = "__sin_centro__";
const soloDigitos = /^[0-9]+$/;

const pacienteFormSchema = z.object({
  nombres: z.string().trim().min(1, "El nombre es obligatorio.").max(120, "Máximo 120 caracteres."),
  apellidos: z.string().trim().min(1, "El apellido es obligatorio.").max(120, "Máximo 120 caracteres."),
  dni: z.string().trim().refine((v) => v === "" || (soloDigitos.test(v) && v.length >= 6 && v.length <= 9), "El DNI debe tener entre 6 y 9 dígitos."),
  fecha_nacimiento: z.string().trim().refine((v) => v === "" || new Date(v) <= new Date(), "La fecha no puede ser futura."),
  sexo: z.enum(["", "F", "M", "X"]),
  localidad: z.string().trim(),
  telefono: z.string().trim().max(30, "Máximo 30 caracteres."),
  telefono_alternativo: z.string().trim().max(30, "Máximo 30 caracteres."),
  email: z.string().trim().refine((v) => v === "" || z.string().email().safeParse(v).success, "El email no es válido."),
  domicilio: z.string().trim(),
  observaciones: z.string().trim(),
  centro_derivacion_id: z.string(),
});

export type PacienteFormValues = z.infer<typeof pacienteFormSchema>;

export const PACIENTE_FORM_DEFAULTS: PacienteFormValues = {
  nombres: "",
  apellidos: "",
  dni: "",
  fecha_nacimiento: "",
  sexo: "",
  localidad: "",
  telefono: "",
  telefono_alternativo: "",
  email: "",
  domicilio: "",
  observaciones: "",
  centro_derivacion_id: "",
};

interface PacienteFormProps {
  valoresIniciales?: PacienteFormValues;
  enviando: boolean;
  onSubmit: (valores: PacienteFormValues) => void;
  textoBoton: string;
}

/** Formulario compartido de alta/edición de paciente. */
export function PacienteForm({ valoresIniciales, enviando, onSubmit, textoBoton }: PacienteFormProps) {
  const { data: maestros } = useQuery(maestrosQueryOptions);
  const form = useForm<PacienteFormValues>({
    resolver: zodResolver(pacienteFormSchema),
    defaultValues: valoresIniciales ?? PACIENTE_FORM_DEFAULTS,
  });

  const fechaNacimiento = form.watch("fecha_nacimiento");
  const edad = useMemo(() => calcularEdad(fechaNacimiento || null), [fechaNacimiento]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nombres"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombres</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="off" maxLength={120} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apellidos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellidos</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="off" maxLength={120} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dni"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DNI</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" className="font-mono" placeholder="Recomendado" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fecha_nacimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de nacimiento{edad !== null ? ` (${edad} años)` : ""}</FormLabel>
                <FormControl>
                  <Input {...field} type="date" max={new Date().toISOString().slice(0, 10)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sexo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="F">Femenino</SelectItem>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="X">Otro / no informado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="localidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Localidad</FormLabel>
                <FormControl>
                  <Input {...field} list="localidades-paciente" autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <datalist id="localidades-paciente">
            {(maestros?.localidades ?? []).map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="telefono_alternativo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono alternativo</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="domicilio"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Domicilio</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="off" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="centro_derivacion_id"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Centro de derivación</FormLabel>
                <Select value={field.value || SIN_CENTRO} onValueChange={(v) => field.onChange(v === SIN_CENTRO ? "" : v)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SIN_CENTRO}>Sin centro de derivación</SelectItem>
                    {(maestros?.centrosDerivacion ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Observaciones</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={enviando}>
          {enviando ? <Loader2 className="animate-spin" /> : null}
          {textoBoton}
        </Button>
      </form>
    </Form>
  );
}
