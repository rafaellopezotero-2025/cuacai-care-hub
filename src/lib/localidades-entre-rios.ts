/** Departamentos y localidades de Entre Ríos (fuente: github.com/rafaellopezotero-2025/localidades_entre_rios). */
export const LOCALIDADES_POR_DEPARTAMENTO: Record<string, string[]> = {
  "COLÓN": [
    "ARROYO BARÚ",
    "COLÓN",
    "LA CLARITA",
    "PUEBLO CAZES",
    "PUEBLO LIEBIG",
    "SAN JOSÉ",
    "UBAJAY",
    "VILLA ELISA"
  ],
  "CONCORDIA": [
    "COLONIA AYUI",
    "CONCORDIA",
    "ESTANCIA GRANDE",
    "LA CRIOLLA",
    "LOS CHARRÚAS",
    "PEDERMONTE",
    "PUERTO YERUÁ"
  ],
  "DIAMANTE": [
    "ALDEA BRASILERA",
    "ALDEA PROTESTANTE",
    "ALDEA SPATZENKUTTER",
    "COLONIA ENSAYO",
    "DIAMANTE",
    "GENERAL RACEDO",
    "GENERAL RAMÍREZ",
    "STROBEL",
    "VALLE MARÍA"
  ],
  "FEDERACIÓN": [
    "CHAJARÍ",
    "FEDERACIÓN",
    "SAN JAIME DE LA FRONTERA",
    "SANTA ANA",
    "VILLA DEL ROSARIO"
  ],
  "FEDERAL": [
    "CONSCRIPTO BERNARDI",
    "FEDERAL",
    "SAUCE DE LUNA"
  ],
  "FELICIANO": [
    "SAN JOSÉ DE FELICIANO",
    "SAN VÍCTOR"
  ],
  "GUALEGUAY": [
    "GENERAL GALARZA",
    "GUALEGUAY",
    "PUERTO RUIZ"
  ],
  "GUALEGUAYCHÚ": [
    "ALDEA SAN ANTONIO",
    "ENRIQUE CARBÓ",
    "GILBERT",
    "GUALEGUAYCHÚ",
    "LARROQUE",
    "PUEBLO GENERAL BELGRANO",
    "URDINARRAIN"
  ],
  "ISLAS DEL IBICUY": [
    "CEIBAS",
    "IBICUY",
    "MÉDANOS",
    "VILLA PARANACITO"
  ],
  "LA PAZ": [
    "BOVRIL",
    "LA PAZ",
    "PIEDRAS BLANCAS",
    "SAN GUSTAVO",
    "SANTA ELENA",
    "SIR LEONARD"
  ],
  "NOGOYÁ": [
    "ARANGUREN",
    "DON CRISTÓBAL SEGUNDA",
    "HERNÁNDEZ",
    "LUCAS GONZÁLEZ",
    "NOGOYÁ"
  ],
  "PARANÁ": [
    "ALCARAZ",
    "CERRITO",
    "COLONIA AVELLANEDA",
    "CRESPO",
    "HASENKAMP",
    "MARÍA GRANDE",
    "ORO VERDE",
    "PARANÁ",
    "SAN BENITO",
    "SAUCE MONTRULL",
    "SAUCE PINTO",
    "SEGUÍ",
    "SOSA",
    "TABOSSI",
    "TEZANOS PINTO",
    "TIRO FEDERAL",
    "VIALE",
    "VILLA URQUIZA"
  ],
  "SAN SALVADOR": [
    "GENERAL CAMPOS",
    "SAN SALVADOR"
  ],
  "TALA": [
    "GOBERNADOR SOLA",
    "MACIÁ",
    "MANSILLA",
    "ROSARIO DEL TALA"
  ],
  "URUGUAY": [
    "BASAVILBASO",
    "CASEROS",
    "COLONIA ELÍA",
    "CONCEPCIÓN DEL URUGUAY",
    "HERRERA",
    "SAN JUSTO",
    "SANTA ANITA",
    "VILLA MANTERO"
  ],
  "VICTORIA": [
    "ANTELO",
    "MOLINO DOLL",
    "VICTORIA"
  ],
  "VILLAGUAY": [
    "PASO DE LA LAGUNA",
    "VILLA CLARA",
    "VILLA DOMÍNGUEZ",
    "VILLAGUAY"
  ]
};

export const DEPARTAMENTOS = Object.keys(LOCALIDADES_POR_DEPARTAMENTO);

export function departamentoDeLocalidad(localidad: string): string {
  const l = localidad.trim().toUpperCase();
  return DEPARTAMENTOS.find((d) => LOCALIDADES_POR_DEPARTAMENTO[d]?.includes(l)) ?? "";
}
