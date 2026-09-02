# CLAUDE.md — Contexto del proyecto App_CMDDB

Este archivo lo leen automáticamente las sesiones de Claude Code de **ambos** integrantes
del equipo. Sirve para que las dos tomen las mismas decisiones sobre el mismo código.
Si cambias una convención, actualiza este archivo en el mismo PR.

---

## Qué es este proyecto

CMDB / sistema de gestión de activos de TI: inventario de equipos, asignación a
colaboradores, repuestos, movimientos de almacén, bitácora, bajas y dashboards.
Es el proyecto de tesis de Gerardo Reátegui y Renzo Núñez (UPC, EPE).

La instalación local está documentada en [README.md](README.md). Léelo antes de sugerir
comandos de arranque.

## Stack y restricciones

- Frontend: **HTML + CSS + JavaScript vanilla**. Sin framework, sin bundler, sin
  `package.json`, sin paso de build. Los archivos se sirven tal cual desde Apache.
- Backend: **PHP 8 plano** con PDO. Un archivo por recurso en `api/`. Sin Composer,
  sin framework, sin autoloader.
- Base de datos: **MySQL** (XAMPP), base `BD_CMDB`.
- Única dependencia externa: **SheetJS** por CDN, para leer y escribir Excel.

**No introduzcas dependencias, frameworks ni pasos de build sin acordarlo antes con el
equipo.** Una propuesta de React, Vue, Composer o Webpack se discute en un issue, no se
mete de contrabando en un PR de otra cosa.

## Cómo está organizado el código

```
index.html        Shell: login, sidebar, topbar, modal, contenedor de contenido
css/styles.css    Todos los estilos (~2.3k líneas)
js/app.js         TODA la lógica del frontend (~14k líneas)
api/*.php         Endpoints; sync.php es el principal
api/config.php    Conexión PDO + CORS
```

### `js/app.js` — archivo monolítico

Son ~14.000 líneas en un solo archivo. Está dividido en secciones marcadas con banners
de comentario:

```javascript
/* ═══════════════════════════════════════════════════════
   NOMBRE DEL MÓDULO
   ═══════════════════════════════════════════════════════ */
```

**Antes de editar, ubica la sección buscando su banner** (por ejemplo, `grep -n "CMDB -
INVENTARIO" js/app.js`). No leas el archivo completo: gasta contexto sin necesidad.

Secciones en orden: capa de datos (`DB`), jerarquía de estados, datos de ejemplo,
autenticación, navegación, sidebar, toasts, notificaciones, modal, utilidades,
paginación, gráficos, router, Dashboards 1-3, Activos TI, carga masiva desde Excel,
series, repuestos, asignación de repuestos, colaboradores (padrón, carga masiva,
asignación, reemplazo de equipo, sitios móviles, ceses), tiendas, CMDB, bitácora,
bajas, configuración (gestores y parámetros), inicialización.

**Reglas al editar este archivo:**

1. Haz ediciones **quirúrgicas**, acotadas a la sección que te toca. Ambos desarrolladores
   trabajan sobre el mismo archivo y cada línea tocada de más es un conflicto de merge.
2. No reordenes, reformatees ni "limpies" secciones ajenas a tu tarea.
3. Las funciones son globales y se invocan desde atributos `onclick` en el HTML que
   genera el propio JS. Si renombras una función, busca sus llamadas en las cadenas de
   texto, no solo en el código.

### Capa de datos

El frontend no consulta MySQL directamente. Todo pasa por el objeto `DB` (inicio de
`app.js`), que es dual:

- `DB.init()` carga desde `api/sync.php`; si falla, cae a `localStorage` y la app sigue
  operando offline.
- `DB.get(clave)` lee de la caché en memoria. `DB.set(clave, datos)` la actualiza y envía
  a la API con *debounce* de 800 ms.
- `sync.php` mapea cada clave del frontend a su tabla MySQL en `$TABLE_MAP`.
- `gestores` y `bitacoraMovimientos` están fuera del sync masivo (`_NO_AUTO_SYNC`) porque
  un sync con arreglo vacío borraría la tabla entera. Se modifican con
  `addOne` / `updateOne` / `bulkInsert`.

Si agregas una entidad nueva, hay que tocar tres puntos: la clave en `DB`, la entrada en
`$TABLE_MAP` de `sync.php` y la tabla en MySQL.

## Convenciones

- **Todo en español**: nombres de funciones, variables, comentarios, mensajes de UI,
  ramas y commits. El código existente mezcla algo de inglés en helpers genéricos; al
  escribir código nuevo, sigue el estilo del archivo que estás tocando.
- Sin tildes en identificadores ni en claves de datos (`asignacionesRep`, no
  `asignacionesRép`).
- Indentación de 2 espacios en JS y en PHP.
- En PHP, consultas **siempre** con sentencias preparadas de PDO. Nunca concatenes valores
  de entrada en el SQL.
- Los mensajes al usuario se muestran con `toast(...)`, no con `alert(...)`.

## Reglas duras

1. **Nunca commitear datos**: dumps `.sql`, archivos `.xlsx` con inventario o padrón real,
   ni el contenido de `api/uploads/`. Son datos de una empresa real. Se comparten por el
   OneDrive del equipo.
2. **Nunca commitear credenciales.** `api/config.php` usa los valores por defecto de XAMPP;
   si necesitas otros, cámbialos solo en tu copia local y no los subas.
3. **Nunca hacer push directo a `main`.** Rama por tarea y PR revisado por el otro
   integrante.
4. **No commitear `.claude/settings.local.json`**: es configuración personal de cada
   máquina y está en `.gitignore`.
5. Antes de borrar o sobrescribir archivos de datos, pregunta. Varios son irrecuperables.

## Verificaciones antes de un commit

No hay tests automatizados. Como mínimo:

```bash
php -l api/<archivo-que-tocaste>.php
node --check js/app.js
```

Y prueba a mano el módulo afectado en `http://localhost/App_CMDDB/`.

## Deuda técnica conocida

Está documentada aquí para que no la "descubran" una y otra vez, y porque parte de ella
puede convertirse en capítulo de la tesis:

- `js/app.js` de 14k líneas debería dividirse en módulos por dominio.
- El login compara usuario y contraseña **en el cliente**, contra la tabla `gestores`, con
  las contraseñas en texto plano. No hay sesión de servidor: cualquiera puede llamar a los
  endpoints de `api/` sin autenticarse.
- `api/config.php` expone `Access-Control-Allow-Origin: *`.
- El repositorio arrastra ~30 MB de datos en su historial.
- El componente de inteligencia artificial del proyecto todavía no está implementado.

Estos puntos son mejoras planificadas, no cosas que arreglar de paso dentro de un PR de
otro tema. Cada uno merece su propio issue.
