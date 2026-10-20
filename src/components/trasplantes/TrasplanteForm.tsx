import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { maestrosQueryOptions } from "@/lib/maestros.functions";
import { buscarPacientes } from "@/lib/pacientes.functions";
import { nombreCompleto } from "@/types/dominio";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const SIN_VALOR = "__ninguno__";

const trasplanteFormSchema = z.object({
  paciente_id: z.string().uuid("Debe seleccionar un paciente."),
  diagnostico_id: z.string(),
  tipo_tx_id: z.string(),
  estado_tx_id: z.string().min(1, "El estado es obligatorio."),
  via_admin_id: z.string(),
  cobertura_id: z.string(),
  centro_tx_id: z.string(),
  medico_ref_id: z.string(),
  centro_derivacion_id: z.string().optional(),
  fecha_tx: z.string().trim().refine((v) => v === "" || new Date(v) <= new Date(), "La fecha no puede ser futura."),
  observaciones: z.string().trim(),
});

export type TrasplanteFormValues = z.infer<typeof trasplanteFormSchema>;

export const TRASPLANTE_FORM_DEFAULTS: TrasplanteFormValues = {
  paciente_id: "",
  diagnostico_id: SIN_VALOR,
  tipo_tx_id: SIN_VALOR,
  estado_tx_id: "",
  via_admin_id: SIN_VALOR,
  cobertura_id: SIN_VALOR,
  centro_tx_id: SIN_VALOR,
  medico_ref_id: SIN_VALOR,
  centro_derivacion_id: SIN_VALOR,
  fecha_tx: "",
  observaciones: "",
};

interface PacientePreseleccionado {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string | null;
}

interface TrasplanteFormProps {
  valoresIniciales?: TrasplanteFormValues;
  pacientePreseleccionado?: PacientePreseleccionado;
  pacienteBloqueado?: boolean;
  enviando: boolean;
  onSubmit: (valores: TrasplanteFormValues) => void;
  textoBoton: string;
  mostrarCentroDerivacion?: boolean;
}

/** Formulario compartido de alta/edición de un proceso de trasplante. */
export function TrasplanteForm({ valoresIniciales, pacientePreseleccionado, pacienteBloqueado, enviando, onSubmit, textoBoton, mostrarCentroDerivacion }: TrasplanteFormProps) {
  const { data: maestros } = useQuery(maestrosQueryOptions);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacientePreseleccionado | undefined>(pacientePreseleccionado);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [popoverAbierto, setPopoverAbierto] = useState(false);
  const busquedaDebounced = useDebounce(busquedaPaciente, 400);

  const form = useForm<TrasplanteFormValues>({
    resolver: zodResolver(trasplanteFormSchema),
    defaultValues: valoresIniciales ?? TRASPLANTE_FORM_DEFAULTS,
  });

  const estadoSeleccionadoId = form.watch("estado_tx_id");
  const estadoSeleccionado = useMemo(() => maestros?.estadosTx.find((e) => e.id === estadoSeleccionadoId), [maestros, estadoSeleccionadoId]);

  const { data: resultadoBusqueda, isFetching } = useQuery({
    queryKey: ["buscar-pacientes-combobox", busquedaDebounced],
    queryFn: () => buscarPacientes({ data: { q: busquedaDebounced, pagina: 1 } }),
    enabled: busquedaDebounced.trim().length >= 2,
  });

  const opcionesSelect: { grupo: keyof NonNullable<typeof maestros>; label: string; field: keyof TrasplanteFormValues }[] = [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="paciente_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Paciente</FormLabel>
              {pacienteBloqueado && pacienteSeleccionado ? (
                <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
                  {nombreCompleto(pacienteSeleccionado)} · <span className="font-mono">{pacienteSeleccionado.dni ?? "sin DNI"}</span>
                </div>
              ) : (
                <Popover open={popoverAbierto} onOpenChange={setPopoverAbierto}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" role="combobox" className="justify-between font-normal">
                        {pacienteSeleccionado ? (
                          <span>
                            {nombreCompleto(pacienteSeleccionado)} · <span className="font-mono">{pacienteSeleccionado.dni ?? "s/d"}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Buscar paciente por apellido o DNI…</span>
                        )}
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Escriba al menos 2 letras…" value={busquedaPaciente} onValueChange={setBusquedaPaciente} />
                      <CommandList>
                        {isFetching ? <div className="p-3 text-sm text-muted-foreground">Buscando…</div> : null}
                        <CommandEmpty>Sin resultados.</CommandEmpty>
                        <CommandGroup>
                          {(resultadoBusqueda?.filas ?? []).map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.id}
                              onSelect={() => {
                                field.onChange(p.id);
                                setPacienteSeleccionado({ id: p.id, nombres: p.nombres, apellidos: p.apellidos, dni: p.dni });
                                setPopoverAbierto(false);
                              }}
                            >
                              <Check className={cn("mr-2 size-4", field.value === p.id ? "opacity-100" : "opacity-0")} />
                              {nombreCompleto(p)} · <span className="ml-1 font-mono">{p.dni ?? "s/d"}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectMaestro control={form.control} name="diagnostico_id" label="Diagnóstico" opciones={maestros?.diagnosticos ?? []} />
          <SelectMaestro control={form.control} name="tipo_tx_id" label="Tipo de trasplante" opciones={maestros?.tiposTx ?? []} />
          <FormField
            control={form.control}
            name="estado_tx_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(maestros?.estadosTx ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombre}
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
            name="fecha_tx"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de trasplante{estadoSeleccionado?.requiereFechaTx ? " *" : ""}</FormLabel>
                <FormControl>
                  <Input {...field} type="date" max={new Date().toISOString().slice(0, 10)} />
                </FormControl>
                {estadoSeleccionado?.requiereFechaTx ? (
                  <FormDescription>Este estado requiere fecha de trasplante.</FormDescription>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          <SelectMaestro control={form.control} name="via_admin_id" label="Vía" opciones={maestros?.viasAdmin ?? []} />
          <SelectMaestro control={form.control} name="cobertura_id" label="Cobertura" opciones={maestros?.coberturas ?? []} />
          <SelectMaestro control={form.control} name="centro_tx_id" label="Centro" opciones={maestros?.centrosTx ?? []} />
          <SelectMaestro control={form.control} name="medico_ref_id" label="Médico referente" opciones={maestros?.medicosRef ?? []} />
          {mostrarCentroDerivacion ? (
            <SelectMaestro control={form.control} name="centro_derivacion_id" label="Centro de derivación del paciente" opciones={maestros?.centrosDerivacion ?? []} />
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={enviando}>
          {enviando ? <Loader2 className="animate-spin" /> : null}
          {textoBoton}
        </Button>
      </form>
    </Form>
  );
}

interface SelectMaestroProps {
  control: ReturnType<typeof useForm<TrasplanteFormValues>>["control"];
  name: keyof TrasplanteFormValues;
  label: string;
  opciones: { id: string; nombre: string }[];
}

function SelectMaestro({ control, name, label, opciones }: SelectMaestroProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value ?? SIN_VALOR} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={SIN_VALOR}>Sin especificar</SelectItem>
              {opciones.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
