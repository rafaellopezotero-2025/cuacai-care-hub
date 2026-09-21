/**
 * Parser client-safe de planillas Excel/CSV para la importación masiva
 * (fase 8). No accede a la base de datos: sólo lee el archivo y produce
 * filas tipadas + errores/advertencias de formato. La validación contra
 * las tablas maestras y la existencia de pacientes se hace en el servidor
 * (`src/lib/importar.functions.ts`).
 */
import * as XLSX from "xlsx";

export interface FilaPaciente {
  /** Clave temporal de la fila dentro de la planilla (id_paciente si existe, si no el n° de fila). */
  clave: string;
  fila: number;
  nombres: string;
  apellidos: string;
  dni: string;
  fechaNacimiento: string | null;
  sexo: string | null;
  localidad: string | null;
  telefono: string | null;
  telefonoAlternativo: string | null;
  email: string | null;
  domicilio: string | null;
  observaciones: string | null;
}

export interface FilaTrasplante {
  fila: number;
  pacienteClave: string;
  diagnostico: string | null;
  tipoTx: string | null;
  estadoTx: string | null;
  viaAdmin: string | null;
  cobertura: string | null;
  centroTx: string | null;
  medico: string | null;
  fechaTx: string | null;
  observaciones: string | null;
}

export interface ErrorFila {
  hoja: string;
  fila: number;
  columna?: string;
  mensaje: string;
}

export interface ResultadoParseo {
  pacientes: FilaPaciente[];
  trasplantes: FilaTrasplante[];
  errores: ErrorFila[];
  advertencias: ErrorFila[];
  columnasFaltantes: string[];
}

function normalizarEncabezado(h: string): string {
  return h
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buscarHoja(libro: XLSX.WorkBook, candidatos: string[]): string | null {
  const nombres = libro.SheetNames;
  for (const candidato of candidatos) {
    const encontrada = nombres.find((n) => normalizarEncabezado(n) === normalizarEncabezado(candidato));
    if (encontrada) return encontrada;
  }
  return null;
}

/** Convierte una fila (objeto por encabezado normalizado) buscando por varios alias posibles. */
function valor(fila: Record<string, unknown>, ...alias: string[]): string | null {
  for (const a of alias) {
    const clave = Object.keys(fila).find((k) => normalizarEncabezado(k) === normalizarEncabezado(a));
    if (clave !== undefined) {
      const v = fila[clave];
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s.length > 0) return s;
    }
  }
  return null;
}

const RE_DNI = /^[0-9]{6,9}$/;

/** Convierte serial de Excel o dd/mm/yyyy a 'YYYY-MM-DD'. Devuelve null si no se puede interpretar. */
function convertirFecha(v: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    let [, d, m, a] = match as [string, string, string, string];
    if (a.length === 2) a = `20${a}`;
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    return `${a}-${mm}-${dd}`;
  }
  const num = Number(s);
  if (Number.isFinite(num) && num > 20000 && num < 60000) {
    const fecha = XLSX.SSF.parse_date_code(num);
    if (fecha) {
      const yyyy = String(fecha.y).padStart(4, "0");
      const mm = String(fecha.m).padStart(2, "0");
      const dd = String(fecha.d).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return null;
}

/** Heurística simple: separa "Apellido Nombre" o "Apellido, Nombre" en apellidos/nombres. */
function separarNombreYApellido(nomYApe: string): { nombres: string; apellidos: string } {
  if (nomYApe.includes(",")) {
    const [ape, nom] = nomYApe.split(",");
    return { apellidos: (ape ?? "").trim(), nombres: (nom ?? "").trim() };
  }
  const partes = nomYApe.trim().split(/\s+/);
  if (partes.length <= 1) return { apellidos: nomYApe.trim(), nombres: "" };
  const mitad = Math.ceil(partes.length / 2);
  return { apellidos: partes.slice(0, mitad).join(" "), nombres: partes.slice(mitad).join(" ") };
}

export async function parsearPlanilla(archivo: File): Promise<ResultadoParseo> {
  const buffer = await archivo.arrayBuffer();
  const libro = XLSX.read(buffer, { type: "array", cellDates: false });

  const errores: ErrorFila[] = [];
  const advertencias: ErrorFila[] = [];
  const columnasFaltantes: string[] = [];

  const hojaPacientes = buscarHoja(libro, ["Pacientes", "Paciente"]);
  const hojaTrasplantes = buscarHoja(libro, ["Trasplantes", "Trasplante"]);

  const pacientes: FilaPaciente[] = [];
  const trasplantes: FilaTrasplante[] = [];
  const dnisVistos = new Map<string, number>();
  const clavesPacientes = new Set<string>();

  if (!hojaPacientes) {
    columnasFaltantes.push("Hoja 'Pacientes' no encontrada");
  } else {
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets[hojaPacientes]!, { defval: "" });
    filas.forEach((fila, idx) => {
      const numeroFila = idx + 2; // +1 encabezado, +1 base 1
      const idPaciente = valor(fila, "id_paciente");
      const clave = idPaciente ?? String(numeroFila);
      let nombres = valor(fila, "nombres");
      let apellidos = valor(fila, "apellidos");
      const nomYApe = valor(fila, "nom_y_ape", "nombre_y_apellido");
      if ((!nombres || !apellidos) && nomYApe) {
        const separado = separarNombreYApellido(nomYApe);
        nombres = nombres ?? separado.nombres;
        apellidos = apellidos ?? separado.apellidos;
        advertencias.push({
          hoja: hojaPacientes,
          fila: numeroFila,
          columna: "nom_y_ape",
          mensaje: "Nombres/apellidos derivados heurísticamente de 'nom_y_ape'. Verifique el resultado.",
        });
      }
      if (valor(fila, "edad")) {
        advertencias.push({
          hoja: hojaPacientes,
          fila: numeroFila,
          columna: "edad",
          mensaje: "La columna 'edad' se ignora: se calcula a partir de la fecha de nacimiento y nunca se almacena.",
        });
      }
      const dni = valor(fila, "dni") ?? "";
      if (!nombres || !apellidos) {
        errores.push({ hoja: hojaPacientes, fila: numeroFila, mensaje: "Faltan nombres y/o apellidos." });
      }
      if (!dni) {
        errores.push({ hoja: hojaPacientes, fila: numeroFila, columna: "dni", mensaje: "Falta el DNI." });
      } else if (!RE_DNI.test(dni)) {
        errores.push({ hoja: hojaPacientes, fila: numeroFila, columna: "dni", mensaje: "El DNI debe tener entre 6 y 9 dígitos." });
      } else {
        const previa = dnisVistos.get(dni);
        if (previa) {
          errores.push({ hoja: hojaPacientes, fila: numeroFila, columna: "dni", mensaje: `DNI duplicado en el archivo (también en la fila ${previa}).` });
        } else {
          dnisVistos.set(dni, numeroFila);
        }
      }
      clavesPacientes.add(clave);
      pacientes.push({
        clave,
        fila: numeroFila,
        nombres: nombres ?? "",
        apellidos: apellidos ?? "",
        dni,
        fechaNacimiento: null,
        sexo: null,
        localidad: valor(fila, "localidad"),
        telefono: valor(fila, "telefono"),
        telefonoAlternativo: valor(fila, "telefono_alternativo"),
        email: valor(fila, "email"),
        domicilio: valor(fila, "domicilio"),
        observaciones: valor(fila, "observaciones"),
      });
    });
  }

  if (!hojaTrasplantes) {
    columnasFaltantes.push("Hoja 'Trasplantes' no encontrada");
  } else {
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets[hojaTrasplantes]!, { defval: "" });
    filas.forEach((fila, idx) => {
      const numeroFila = idx + 2;
      const pacienteClave = valor(fila, "paciente_tx", "id_paciente") ?? "";
      if (!pacienteClave) {
        errores.push({ hoja: hojaTrasplantes, fila: numeroFila, columna: "paciente_tx", mensaje: "Falta la referencia al paciente." });
      } else if (!clavesPacientes.has(pacienteClave)) {
        errores.push({ hoja: hojaTrasplantes, fila: numeroFila, columna: "paciente_tx", mensaje: `No se encontró el paciente '${pacienteClave}' en la hoja Pacientes.` });
      }
      const estado = valor(fila, "estado_tx");
      if (!estado) {
        errores.push({ hoja: hojaTrasplantes, fila: numeroFila, columna: "estado_tx", mensaje: "Falta el estado del trasplante." });
      }
      const fechaOriginal = valor(fila, "fecha_tx");
      let fechaTx: string | null = null;
      if (fechaOriginal) {
        fechaTx = convertirFecha(fechaOriginal);
        if (!fechaTx) {
          errores.push({ hoja: hojaTrasplantes, fila: numeroFila, columna: "fecha_tx", mensaje: `Fecha inválida: '${fechaOriginal}'.` });
        }
      }
      trasplantes.push({
        fila: numeroFila,
        pacienteClave,
        diagnostico: valor(fila, "diagnostico"),
        tipoTx: valor(fila, "tipo_tx"),
        estadoTx: estado,
        viaAdmin: valor(fila, "via_tx", "via_admin"),
        cobertura: valor(fila, "cobertura", "id_cobertura"),
        centroTx: valor(fila, "centro_tx"),
        medico: valor(fila, "medico_ref"),
        fechaTx,
        observaciones: valor(fila, "obs", "observaciones"),
      });
    });
  }

  return { pacientes, trasplantes, errores, advertencias, columnasFaltantes };
}
