# CUCAIER Patient Care

Necesito hacer aplicacion de Gestión de Pacientes Trasplantados y en Proceso de Trasplante para el CUCAIER

1. CONTEXTO DEL PROYECTO

Desarrollar una aplicación web institucional para el CUCAIER — Centro Único Coordinador de Ablación e Implante de Entre Ríos, organismo provincial dependiente del Ministerio de Salud de Entre Ríos.

Sitio institucional de referencia:

https://www.cucaier.gob.ar/

La aplicación tendrá como objetivo administrar de manera centralizada la información de:

pacientes trasplantados;

pacientes en lista de espera;

pacientes en proceso de trasplante;

pacientes excluidos;

pacientes fallecidos;

información administrativa relacionada con el trasplante;

profesionales y centros de referencia;

diagnósticos;

coberturas;

vías administrativas.

La aplicación debe reemplazar la gestión basada en planillas Excel por un sistema web seguro, relacional, auditable y con dashboard interactivo.

2. IMPORTANTE: INFORMACIÓN SENSIBLE

La aplicación manejará información personal y sanitaria sensible.

Por lo tanto, diseñar toda la aplicación bajo el principio de:

mínimo privilegio;

mínimo acceso necesario;

confidencialidad;

trazabilidad;

autenticación fuerte;

autorización por roles;

auditoría;

protección contra acceso no autorizado;

validación de entradas;

protección contra SQL Injection;

protección contra XSS;

protección contra CSRF cuando corresponda;

protección contra ataques de fuerza bruta;

sesiones seguras;

HTTPS;

cookies seguras;

no almacenar contraseñas en texto plano;

no exponer datos clínicos en URLs;

no exponer información sensible innecesariamente en logs.

NO generar datos reales de pacientes en el frontend, código fuente, ejemplos públicos ni documentación.

Utilizar datos ficticios para seed/demo.

3. OBJETIVO PRINCIPAL

La aplicación debe permitir:

Registrar pacientes.

Consultar pacientes.

Modificar pacientes.

Dar de baja lógica pacientes cuando corresponda.

Registrar uno o varios procesos de trasplante por paciente.

Asociar diagnósticos.

Asociar tipo de trasplante.

Asociar estado del trasplante.

Asociar vía administrativa.

Asociar cobertura.

Asociar médico de referencia.

Asociar centro de trasplante.

Registrar fecha de trasplante.

Registrar observaciones.

Consultar el historial de trasplantes de un paciente.

Realizar búsquedas y filtros.

Mostrar indicadores mediante un dashboard.

Registrar auditoría de las operaciones realizadas.

Administrar usuarios y roles.

Permitir autenticación sin depender obligatoriamente de envío de emails.

4. TECNOLOGÍA

Utilizar una arquitectura moderna y mantenible.

Frontend:

React

TypeScript

Vite

Tailwind CSS

componentes UI modernos

diseño responsive

accesibilidad básica

formularios con validación

Backend / persistencia:

PostgreSQL

API segura

migraciones de base de datos

Row Level Security cuando la arquitectura lo permita

Si se utiliza Supabase:

PostgreSQL

Supabase Auth únicamente si es necesario como alternativa

Supabase Storage solamente si posteriormente se requieren documentos

Row Level Security obligatoria para proteger los datos.

La aplicación debe quedar preparada para poder desplegarse posteriormente en infraestructura propia de CUCAIER.

NO asumir que los datos deben alojarse en servicios cloud públicos.

La arquitectura debe permitir posteriormente un despliegue on-premise o en un servidor institucional.

5. MODELO DE DATOS

Crear una base de datos relacional normalizada.

TABLA: pacientes

Campos sugeridos:

id_paciente

nombres

apellidos

dni

fecha_nacimiento

sexo

localidad

telefono

telefono_alternativo

email

domicilio

observaciones

activo

created_at

updated_at

created_by

updated_by

IMPORTANTE:

No utilizar "edad" como campo permanente.

Calcular la edad a partir de fecha_nacimiento.

El DNI debe tener índice y debe poder configurarse como único cuando corresponda.

6. TABLA: trasplantes

Debe existir una relación:

paciente 1 ---- N trasplantes

Un paciente puede tener más de un registro de trasplante/proceso.

Campos:

id_tx

paciente_id

diagnostico_id

tipo_tx_id

estado_tx_id

via_admin_id

cobertura_id

centro_tx_id

medico_ref_id

fecha_tx

observaciones

created_at

updated_at

created_by

updated_by

No almacenar textos repetidos cuando exista una entidad relacionada.

Por ejemplo:

NO guardar:

"Hospital Garrahan"

dentro de trasplantes.

Guardar:

centro_tx_id

y relacionarlo con la tabla correspondiente.

7. TABLA: diagnosticos

Campos:

id_diag

diagnostico

activo

created_at

updated_at

Datos iniciales provenientes de la planilla:

Cirrosis Biliar Primaria

Colestasis intrahepatica familiar progresiva

Queratocono bilateral

Cirrosis etílica

Cirrosis colestática

Permitir ABM completo.

8. TABLA: tipo_tx

Campos:

id_tipo_tx

tipo_tx

activo

created_at

updated_at

Datos iniciales de la planilla:

Médula

Hepático

Cardíaco

Hepatorenal

Renal

Permitir ABM completo.

9. TABLA: estado_tx

Campos:

id_estado

estado_tx

activo

created_at

updated_at

Datos iniciales:

Transplantado

Fallecido

Revisar

Excluido

Lista Espera

Permitir ABM completo.

El estado debe ser una entidad configurable y no un texto libre.

10. TABLA: via_admin

Campos:

id_via

descripcion

activo

created_at

updated_at

Datos iniciales:

Subsidio

Convenio

Cont. directa

Obra Social

Permitir ABM completo.

11. TABLA: cobertura

Campos:

id_cobertura

descripcion

activo

created_at

updated_at

Datos iniciales:

MSER

Incluir Salud

IOSPER

Permitir ABM completo.

12. TABLA: medico_ref

Campos:

id_medico

nombres

apellidos

matricula

telefono

email

activo

created_at

updated_at

Datos iniciales de la planilla:

Liliana Bustos — matrícula 2222

Rafael Lopez Otero — matrícula 1111

Permitir ABM completo.

13. TABLA: centro_tx

Campos:

id_centro

nombre

localidad

provincia

telefono

email

activo

observaciones

created_at

updated_at

Datos iniciales:

HSM

Fundación Zambrano

Hospital Gutiérrez

Hospital Garrahan

Permitir ABM completo.

14. AUDITORÍA

Crear una tabla:

audit_log

Campos:

id

user_id

timestamp

action

entity

entity_id

old_values

new_values

ip_address

user_agent

Registrar al menos:

LOGIN

LOGOUT

CREATE

UPDATE

DELETE

VIEW cuando corresponda para información especialmente sensible.

La auditoría debe permitir saber:

QUIÉN hizo la operación.

QUÉ hizo.

SOBRE QUÉ registro.

CUÁNDO.

Desde dónde.

No permitir que un usuario común pueda eliminar o modificar los registros de auditoría.

15. BAJA LÓGICA

No eliminar físicamente pacientes ni información clínica mediante el ABM normal.

Implementar:

activo = true/false

o un mecanismo equivalente de soft delete.

Las operaciones destructivas deben estar restringidas a administradores.

Cuando se desactive un registro, conservar su trazabilidad.

16. USUARIOS

Crear gestión de usuarios internos.

No quiero que la creación de usuarios dependa obligatoriamente del envío de emails.

La aplicación debe permitir que un administrador cree usuarios directamente desde el panel administrativo.

Campos mínimos:

usuario

nombre

apellido

rol

activo

fecha de creación

último acceso

La contraseña nunca debe almacenarse en texto plano.

17. ROLES

Implementar RBAC.

Roles iniciales:

ADMINISTRADOR

Puede:

administrar usuarios;

administrar roles;

realizar ABM de todas las entidades;

consultar todos los pacientes;

consultar dashboard;

consultar auditoría;

modificar configuraciones.

OPERADOR

Puede:

alta de pacientes;

modificación de pacientes;

alta/modificación de trasplantes;

consultar pacientes;

consultar dashboard operativo;

consultar entidades maestras.

No puede:

administrar usuarios;

modificar auditoría;

cambiar configuraciones críticas.

CONSULTA

Puede:

consultar pacientes según permisos;

consultar trasplantes;

consultar dashboard autorizado.

No puede modificar información.

Diseñar el sistema para poder agregar nuevos roles posteriormente.

18. AUTENTICACIÓN Y OPENAUTH

Quiero evaluar la integración con este proyecto:

https://github.com/rafaellopezotero-2025/openauth

IMPORTANTE:

NO asumir que OpenAuth debe utilizarse inmediatamente en producción.

Primero analizar técnicamente su compatibilidad con la arquitectura.

La aplicación debe abstraer la autenticación mediante una capa de autenticación independiente.

Diseñar algo similar a:

AuthProvider

con métodos conceptuales:

login()

logout()

getCurrentUser()

refreshSession()

hasRole()

hasPermission()

Esto permitirá utilizar posteriormente OpenAuth sin tener que modificar toda la aplicación.

Si se integra OpenAuth:

utilizar OAuth 2.0;

Authorization Code Flow;

PKCE;

state;

validación estricta de redirect_uri;

expiración de tokens;

refresh tokens seguros;

validación de issuer;

validación de audience;

validación de firma;

HTTPS obligatorio;

cookies HttpOnly/Secure/SameSite cuando corresponda;

no guardar tokens sensibles en localStorage si puede evitarse;

rate limiting;

protección contra brute force;

revocación de sesiones;

logout seguro.

NO implementar implicit flow.

NO confiar únicamente en que un usuario esté autenticado: verificar autorización/RBAC también en backend.

Si OpenAuth no cumple todos los requisitos de seguridad necesarios para producción, implementar inicialmente autenticación local segura y dejar una interfaz preparada para OpenAuth.

NO incorporar una dependencia experimental simplemente porque sea Open Source.

19. PANTALLA DE LOGIN

Diseño institucional sobrio.

Mostrar:

CUCAIER

Sistema de Gestión de Pacientes

Campos:

Usuario

Contraseña

Botón:

Ingresar

Mostrar mensajes de error genéricos.

NO indicar si el usuario existe o no.

Después de autenticarse:

redirigir al Dashboard.

20. DASHBOARD

Crear un dashboard interactivo y profesional.

Debe ser la pantalla principal después del login.

Mostrar tarjetas KPI:

Total de pacientes

Pacientes en lista de espera

Pacientes trasplantados

Pacientes fallecidos

Pacientes excluidos

Pacientes a revisar

Trasplantes registrados

Agregar gráficos interactivos.

Gráfico 1

Pacientes por estado del trasplante.

Tipo:

donut/pie.

Gráfico 2

Trasplantes por tipo.

Ejemplo:

Renal

Hepático

Cardíaco

Hepatorenal

Médula

Gráfico 3

Pacientes por cobertura.

Gráfico 4

Pacientes por vía administrativa.

Gráfico 5

Trasplantes por centro de trasplante.

Gráfico 6

Pacientes por localidad.

Gráfico 7

Evolución temporal de trasplantes.

Utilizar fecha_tx.

Permitir seleccionar:

año;

rango de fechas.

Todos los gráficos deben ser interactivos.

Al hacer clic en una categoría, permitir filtrar el dashboard cuando tenga sentido.

21. DASHBOARD Y PRIVACIDAD

El dashboard no debe mostrar información clínica identificable innecesariamente.

No mostrar:

DNI;

teléfono;

domicilio;

información clínica individual;

en gráficos generales.

Los datos individuales solamente deben aparecer en las pantallas autorizadas.

Aplicar RBAC también al dashboard.

22. ABM DE PACIENTES

Crear una pantalla:

"Pacientes"

Debe contener:

buscador;

filtros;

tabla;

paginación;

ordenamiento;

botón "Nuevo paciente".

Buscar por:

DNI;

nombre;

apellido;

localidad.

La tabla debe mostrar:

Nombre y apellido

DNI

localidad

teléfono

estado actual

tipo de trasplante

centro de trasplante

No cargar todos los registros de una sola vez.

Utilizar paginación/server-side cuando corresponda.

23. FICHA DEL PACIENTE

Al seleccionar un paciente abrir:

"Ficha del paciente"

Diseño tipo historia administrativa/registro institucional.

Secciones:

Datos personales

nombre

apellido

DNI

fecha de nacimiento

edad calculada

localidad

teléfono

teléfono alternativo

email

domicilio

Información de trasplante

Mostrar todos los procesos/trasplantes relacionados.

Tabla:

fecha

diagnóstico

tipo

estado

vía administrativa

cobertura

centro

médico referente

observaciones

Permitir:

"Nuevo proceso de trasplante"

24. HISTORIAL

Cada paciente debe tener historial.

Mostrar cronológicamente:

creación del paciente;

modificaciones;

procesos de trasplante;

cambios de estado;

cambios administrativos.

El historial de auditoría completo solamente estará disponible para roles autorizados.

25. ABM DE TRASPLANTES

Formulario:

Paciente

Diagnóstico

Tipo de trasplante

Estado

Vía administrativa

Cobertura

Centro de trasplante

Médico de referencia

Fecha de trasplante

Observaciones

Validar campos.

Fecha de trasplante puede ser NULL cuando el paciente todavía está en lista de espera.

No permitir seleccionar pacientes inexistentes.

26. REGLAS DE NEGOCIO

Implementar reglas básicas:

Si estado = "Lista Espera":

fecha_tx puede quedar vacía.

Si estado = "Transplantado":

solicitar fecha de trasplante.

Si estado = "Fallecido":

mantener historial;

no eliminar el paciente.

Si estado = "Excluido":

conservar registro;

no eliminar información histórica.

No permitir inconsistencias referenciales.

Las reglas deben poder evolucionar posteriormente.

27. TABLAS MAESTRAS

Crear una sección:

"Configuración / Tablas maestras"

Con:

Diagnósticos

Tipos de trasplante

Estados

Vías administrativas

Coberturas

Médicos de referencia

Centros de trasplante

Cada una con:

listado;

búsqueda;

alta;

edición;

activación/desactivación.

Evitar eliminación física cuando existan relaciones históricas.

28. IMPORTACIÓN DE DATOS DESDE EXCEL

Crear una funcionalidad administrativa:

"Importar datos"

Permitir importar posteriormente la planilla Excel proporcionada por CUCAIER.

El sistema debe poder:

cargar Excel;

validar columnas;

detectar duplicados;

validar relaciones;

mostrar errores;

mostrar preview;

permitir confirmar importación;

ejecutar transacción;

generar reporte de registros importados;

generar reporte de registros rechazados.

NO insertar directamente datos sin validación.

Antes de importar:

mostrar:

registros válidos;

registros con errores;

posibles duplicados.

29. IMPORTANTE SOBRE LOS DATOS DE LA PLANILLA

La planilla original contiene una estructura similar a:

Trasplantes:

id_tx

paciente_tx

diagnostico

tipo_tx

estado_tx

via_tx

obs

id_cobertura

centro_tx

medico_ref

fecha_tx

Paciente:

id_paciente

nom_y_ape

nombres

apellidos

dni

edad

localidad

telefono

Y tablas maestras:

diagnostico

tipo_tx

estado_tx

via_admin

cobertura

medico_ref

centro_tx

Normalizar correctamente estos datos.

No mantener nombres duplicados como:

nom_y_ape

si pueden derivarse de:

nombres + apellidos.

No mantener edad como dato almacenado.

No guardar nombres de relaciones como texto dentro de la tabla de trasplantes.

30. BÚSQUEDA AVANZADA

Crear filtros:

nombre;

apellido;

DNI;

localidad;

diagnóstico;

tipo de trasplante;

estado;

cobertura;

vía administrativa;

médico;

centro;

rango de fechas.

Permitir combinar múltiples filtros.

Agregar botón:

"Limpiar filtros"

31. EXPORTACIÓN

Permitir exportar información a:

CSV

Excel

Pero solamente según permisos.

La exportación debe quedar registrada en auditoría:

usuario

fecha

filtros utilizados

cantidad de registros exportados.

No permitir exportaciones masivas a usuarios sin permisos.

32. SEGURIDAD

Implementar como mínimo:

HTTPS;

autenticación segura;

RBAC;

protección de rutas;

protección de API;

validación backend;

validación frontend;

consultas parametrizadas;

protección XSS;

protección CSRF donde corresponda;

rate limiting;

expiración de sesión;

cierre de sesión;

protección contra enumeración de usuarios;

headers de seguridad;

Content Security Policy cuando sea compatible;

logs de seguridad;

auditoría;

backups de base de datos;

recuperación ante fallos.

No mostrar errores internos del servidor al usuario.

No colocar secretos en el frontend.

No colocar claves de base de datos en código fuente.

Utilizar variables de entorno.

33. PRIVACIDAD

Los datos de pacientes deben considerarse información altamente sensible.

No utilizar servicios de terceros para analytics que puedan transmitir datos de pacientes.

No utilizar Google Analytics sobre las pantallas clínicas.

No enviar datos personales a APIs externas innecesariamente.

No incluir datos reales en logs.

No incluir datos reales en mensajes de error.

34. INTERFAZ

Diseño institucional.

Estética:

profesional;

limpia;

sobria;

moderna;

accesible;

orientada a personal administrativo y sanitario.

Utilizar como referencia visual el sitio oficial de CUCAIER:

https://www.cucaier.gob.ar/

No copiar literalmente el sitio.

Tomar como referencia:

identidad institucional;

colores;

estilo;

carácter público/sanitario.

El sistema debe sentirse como una aplicación institucional del Ministerio de Salud/CUCAIER, no como una aplicación comercial.

35. MENÚ PRINCIPAL

Crear sidebar:

Dashboard

Pacientes

Trasplantes

Administración

Diagnósticos
Tipos de trasplante
Estados
Vías administrativas
Coberturas
Médicos de referencia
Centros de trasplante

Administración del sistema

Usuarios
Roles
Auditoría
Importar datos

Perfil

Mi perfil
Cerrar sesión

Mostrar únicamente las opciones autorizadas para cada rol.

36. NOTIFICACIONES

Utilizar toast notifications para:

registro creado;

registro actualizado;

registro desactivado;

error;

importación finalizada.

No mostrar información clínica sensible en las notificaciones.

37. VALIDACIONES

DNI:

formato válido;

evitar duplicados.

Campos obligatorios:

nombres;

apellidos;

DNI, si se define como obligatorio;

estado del proceso;

tipo de trasplante cuando corresponda.

Validar fechas.

Evitar fechas imposibles.

38. RESPONSIVE

La aplicación debe funcionar correctamente en:

desktop;

notebook;

tablet.

La prioridad de uso es desktop.

39. PERFORMANCE

Implementar:

paginación;

búsqueda server-side;

índices PostgreSQL;

consultas optimizadas;

carga diferida;

componentes reutilizables.

No traer toda la tabla de pacientes al navegador.

40. ARQUITECTURA

Mantener separación clara:

Frontend

↓

API / servicios

↓

Base de datos

Autenticación

↓

Auth Provider

La autenticación debe estar desacoplada para poder utilizar:

OpenAuth;

autenticación local;

eventualmente otro proveedor institucional.

41. NO HACER

NO:

almacenar contraseñas en texto plano;

utilizar localStorage para secretos sensibles;

poner credenciales en el frontend;

permitir acceso directo a PostgreSQL desde el navegador;

eliminar pacientes físicamente desde el ABM;

guardar edad permanentemente;

duplicar información de entidades relacionadas;

usar datos reales en seed;

usar datos reales en logs;

exponer DNI en URLs;

permitir que cualquier usuario vea auditoría;

permitir que cualquier usuario exporte toda la base;

implementar autenticación únicamente en frontend.

42. DATOS DEMO

Crear datos ficticios para poder probar:

al menos:

20 pacientes;

diferentes localidades de Entre Ríos;

diferentes tipos de trasplante;

diferentes estados;

diferentes coberturas;

diferentes centros;

diferentes médicos;

diferentes diagnósticos.

IMPORTANTE:

Todos los datos de prueba deben ser claramente ficticios.

NO reutilizar los nombres/DNI reales de la planilla como datos de demostración.

43. DASHBOARD DE EJEMPLO

El dashboard debe comenzar mostrando:

"Resumen de pacientes y trasplantes"

KPI:

Total pacientes

Lista de espera

Trasplantados

Fallecidos

A revisar

Total procesos de trasplante

Y gráficos:

Estado de pacientes

Tipos de trasplante

Cobertura

Centro de trasplante

Localidad

Evolución temporal

Agregar filtros superiores:

Desde

Hasta

Estado

Tipo de trasplante

Cobertura

Centro

Localidad

44. EXPERIENCIA DE USUARIO

El flujo principal debe ser muy sencillo:

Login

↓

Dashboard

↓

Pacientes

↓

Buscar paciente

↓

Abrir ficha

↓

Ver historial

↓

Agregar/modificar proceso de trasplante

Debe ser posible llegar desde el dashboard a los datos correspondientes mediante interacción con gráficos y filtros.

45. CALIDAD DEL CÓDIGO

Utilizar:

TypeScript estricto;

componentes reutilizables;

hooks;

servicios separados;

tipos/interfaces;

validación de formularios;

manejo centralizado de errores;

nombres claros;

comentarios únicamente donde aporten valor.

No generar un único archivo gigante.

Separar:

components/

pages/

services/

hooks/

types/

lib/

auth/

database/

46. README

Generar README.md explicando:

arquitectura;

tecnologías;

instalación;

variables de entorno;

configuración PostgreSQL/Supabase;

autenticación;

roles;

migraciones;

seed;

despliegue;

backups;

configuración HTTPS;

integración futura con OpenAuth.

47. MIGRACIONES

Generar migraciones SQL completas.

Crear:

tablas;

PK;

FK;

índices;

constraints;

timestamps;

soft delete;

auditoría;

roles/permisos.

No depender únicamente de la estructura visual del frontend.

La base de datos debe ser consistente por sí misma.

48. CRITERIOS DE ACEPTACIÓN

Considerar terminada la primera versión cuando:

Puedo iniciar sesión.

Puedo crear usuarios desde un administrador.

Puedo asignar roles.

Puedo crear un paciente.

Puedo editar un paciente.

Puedo buscar un paciente.

Puedo abrir la ficha.

Puedo registrar un proceso de trasplante.

Puedo asociar diagnóstico.

Puedo asociar tipo.

Puedo asociar estado.

Puedo asociar cobertura.

Puedo asociar vía administrativa.

Puedo asociar centro.

Puedo asociar médico.

Puedo registrar fecha.

Puedo consultar el historial.

Puedo administrar tablas maestras.

Puedo consultar dashboard.

Los gráficos se actualizan según filtros.

Las acciones quedan auditadas.

Los permisos funcionan por rol.

No puedo acceder a información no autorizada modificando manualmente la URL.

Los datos no se exponen en el frontend innecesariamente.

La aplicación puede desplegarse en infraestructura propia.

49. PRIORIDAD DE DESARROLLO

Construir en este orden:

FASE 1

Base de datos + migraciones + modelo relacional.

FASE 2

Autenticación + usuarios + roles.

FASE 3

Pacientes.

FASE 4

Trasplantes.

FASE 5

Tablas maestras.

FASE 6

Dashboard.

FASE 7

Auditoría.

FASE 8

Importación Excel.

FASE 9

Exportaciones.

FASE 10

Hardening de seguridad.

FASE 11

Preparación para integración con OpenAuth.

50. INSTRUCCIÓN FINAL PARA LOVABLE

No generar solamente una maqueta visual.

Construir una aplicación funcional con:

frontend;

backend;

base de datos;

relaciones;

validaciones;

autenticación;

autorización;

auditoría;

dashboard;

migraciones;

datos demo;

documentación.

Antes de modificar la estructura de la base de datos, analizar las relaciones entre las entidades.

Priorizar integridad referencial y seguridad por encima de la simplicidad del frontend.

La información de pacientes debe tratarse como información sanitaria sensible.

No realizar cambios que permitan acceder a los datos sin autenticación y autorización.

No considerar que ocultar elementos del menú es suficiente para implementar seguridad.

Las restricciones de seguridad deben implementarse también en backend/base de datos.

El sistema debe quedar preparado para ser desplegado en infraestructura propia de CUCAIER y para integrar posteriormente OpenAuth como proveedor de identidad, siempre que una revisión de seguridad confirme que la versión utilizada resulta adecuada para producción.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/63b1734f-fd5a-4209-8834-7c4a2ff35576).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
