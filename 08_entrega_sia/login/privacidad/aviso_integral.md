# Aviso de privacidad integral

## Sistema de datos personales «Cuentas de acceso y bitácora de uso de la herramienta Modelo de priorización de reforestación urbana»

> **BORRADOR para revisión de la Unidad de Transparencia y del área jurídica de la SEDEMA.** Lo que está entre corchetes debe completarse o confirmarse. El contenido describe exactamente lo que registra el sistema (`08_entrega_sia/login/`): si el sistema cambia, este aviso debe cambiar con él.

**Responsable.** La Secretaría del Medio Ambiente de la Ciudad de México (SEDEMA), por medio de la Oficina de la Secretaría · Sistema de Información Ambiental (SIA), con domicilio en [domicilio de la SEDEMA], es responsable del tratamiento de los datos personales que se recaban en el sistema de datos personales «[nombre con el que se registre el sistema]», conforme a la Ley de Protección de Datos Personales en Posesión de Sujetos Obligados de la Ciudad de México y demás normativa aplicable.

### ¿Qué datos personales se recaban?

**Para la cuenta de acceso** (los registra quien administra la herramienta en la SEDEMA, a solicitud de la institución de la persona). El correo **solo** sirve para identificar la cuenta y dar acceso a la herramienta: no se usa para enviar comunicaciones ni para ningún otro fin:
- Nombre completo.
- Correo electrónico, personal o institucional, a elección de la persona.
- Institución (alcaldía, dependencia del Gobierno de la Ciudad o SEDEMA) y, en su caso, alcaldía.
- Permiso en la herramienta (consulta o administración).
- La contraseña **no se conserva**: solo se guarda una huella cifrada que no permite recuperarla.

**Al usar la herramienta** (se registran de forma automática):
- Fecha y hora de cada inicio de sesión, de cada intento fallido y de cada cierre de sesión.
- Fecha y hora de las visitas a la herramienta.
- Territorio consultado: alcaldía, colonia, avenida o calle, red consultada (alcaldías o Gobierno Central) y filtro de banqueta.
- Archivos descargados: tipo (Excel, ficha PDF, mapa KML o GeoJSON) y nombre del archivo.
- Dirección IP desde la que se accede.
- Una cookie técnica de sesión, indispensable para mantener la sesión abierta; no sirve para publicidad ni para seguimiento fuera de la herramienta.

**No se recaban datos personales sensibles.** La función «Mi ubicación» de la herramienta calcula la posición en el propio teléfono: la ubicación no se envía ni se guarda.

### ¿Para qué se usan?

1. **Controlar el acceso:** identificar y autenticar a las personas autorizadas, y dar de alta, modificar, suspender o dar de baja sus cuentas.
2. **Seguridad de la información:** detener el acceso tras intentos fallidos, detectar usos indebidos y atender incidentes de seguridad.
3. **Seguimiento del uso:** conocer qué instituciones y alcaldías usan la herramienta, qué territorios consultan y qué información descargan, para planear la reforestación urbana, evaluar la herramienta y mejorarla. Los reportes que se difundan se presentan de forma agregada, sin identificar a las personas.

### Fundamento

[Confirmar con el área jurídica.] Artículo 7 de la Ley Ambiental de la Ciudad de México (atribución de la SEDEMA para desarrollar el Sistema de Información Ambiental); [Reglamento Interior del Poder Ejecutivo y de la Administración Pública de la Ciudad de México, artículo aplicable]; Ley de Protección de Datos Personales en Posesión de Sujetos Obligados de la Ciudad de México; [acuerdo de creación del sistema de datos personales, una vez publicado].

### ¿Con quién se comparten?

Los datos **no se transfieren** a terceros, salvo las transferencias que la ley prevé sin necesidad de consentimiento, por ejemplo a autoridades competentes que los requieran de forma fundada y motivada.

La infraestructura en la que se alojan pertenece a la Administración Pública de la Ciudad de México [confirmar la redacción sobre la Agencia Digital de Innovación Pública como proveedora de la infraestructura].

### ¿Cuánto tiempo se conservan?

| Dato | Plazo |
|---|---|
| Datos de la cuenta | Mientras la cuenta esté vigente. Al darla de baja se conserva desactivada [plazo a definir con el área de archivo] para dar seguimiento a la bitácora |
| Bitácora de uso (accesos, visitas, consultas, descargas) | 24 meses; después se elimina de forma automática |
| Dirección IP | 6 meses; después se borra de la bitácora de forma automática |
| Cookie de sesión | Hasta cerrar sesión, tras 12 horas sin actividad o a los 7 días, lo que ocurra primero |

### Medidas de seguridad

- La base de datos está en una red aislada, sin salida a internet, y solo acepta conexiones cifradas desde el servidor de aplicaciones.
- El sistema usa una cuenta de servicio propia, restringida a su esquema.
- Las contraseñas se guardan con una función de huella resistente a ataques (scrypt).
- La cookie de sesión solo viaja cifrada y no es accesible para programas de la página.
- Hay respaldos cifrados.
- Las direcciones IP no se incluyen en los reportes ni en las exportaciones de la bitácora.

### Derechos ARCO y revocación del consentimiento

Puede ejercer sus derechos de acceso, rectificación, cancelación y oposición (ARCO) ante la Unidad de Transparencia de la SEDEMA:
- En [domicilio de la Unidad de Transparencia].
- Por correo electrónico a [correo de la Unidad de Transparencia].
- Por medio de la Plataforma Nacional de Transparencia ([confirmar el medio vigente]).

Para cualquier duda sobre este aviso: [teléfono y correo de la Unidad de Transparencia].

Si considera que su derecho a la protección de datos personales fue vulnerado, puede acudir ante [órgano garante de la Ciudad de México en materia de protección de datos personales — confirmar denominación vigente].

### Cambios a este aviso

Cualquier cambio a este aviso se publicará en la pantalla de acceso de la herramienta (`sedema.sia.cdmx.gob.mx/acceso/calles/`).

Última actualización: [fecha de aprobación].
