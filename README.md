# App_CMDDB — Sistema de Gestión de Activos TI (CMDB)

Aplicación web para el inventario y la gestión del ciclo de vida de activos de TI:
ingreso de equipos, asignación a colaboradores, repuestos, movimientos de almacén,
bitácora, bajas y tableros de control.

Proyecto de tesis — Gerardo Reátegui y Renzo Núñez (UPC, EPE).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript vanilla (sin framework ni build) |
| Lectura de Excel | SheetJS (`xlsx`) por CDN |
| Backend | PHP 8 plano, un archivo por recurso en `api/` |
| Base de datos | MySQL / MariaDB (XAMPP) |
| Servidor | Apache (XAMPP) |

No hay `package.json` ni proceso de build: los archivos se sirven tal cual desde Apache.

---

## Requisitos

- [XAMPP](https://www.apachefriends.org/es/index.html) con PHP 8.x, Apache y MySQL.
- [Git](https://git-scm.com/download/win).
- Un navegador moderno.

---

## Instalación local

### 1. Clonar el repositorio

Clónalo en `C:\App_CMDDB` para que las rutas coincidan entre los dos desarrolladores:

```bash
git clone https://github.com/Gerardo2690/App_CMDDB.git C:/App_CMDDB
```

> **Importante:** no clonar dentro de OneDrive, Dropbox ni Google Drive. La sincronización
> bloquea archivos internos de `.git` mientras Git escribe y termina corrompiendo el repo.

### 2. Publicar la carpeta en Apache

La aplicación debe responder en `http://localhost/App_CMDDB/`. Edita
`C:\xampp\apache\conf\extra\httpd-vhosts.conf` (o `httpd.conf`) y agrega:

```apache
Alias /App_CMDDB "C:/App_CMDDB"
<Directory "C:/App_CMDDB">
    Require local
    AllowOverride All
</Directory>
```

Reinicia Apache desde el panel de XAMPP.

### 3. Crear e importar la base de datos

1. Inicia **Apache** y **MySQL** en el panel de XAMPP.
2. Abre `http://localhost/phpmyadmin`.
3. Crea la base de datos **`BD_CMDB`** con cotejamiento `utf8mb4_general_ci`.
4. Importa el dump (`BD_CMDB.sql`). Pesa ~30 MB, así que antes de importar sube los
   límites en `C:\xampp\php\php.ini`:

   ```ini
   upload_max_filesize = 128M
   post_max_size = 128M
   max_execution_time = 600
   memory_limit = 512M
   ```

   Reinicia Apache después de editar el `php.ini`.

   Alternativa por consola, más rápida y sin límites de subida:

   ```bash
   C:/xampp/mysql/bin/mysql -u root BD_CMDB < C:/App_CMDDB/BD_CMDB.sql
   ```

### 4. Verificar la conexión

`api/config.php` trae los valores por defecto de XAMPP (`localhost`, usuario `root`,
sin contraseña, base `BD_CMDB`). Si tu MySQL tiene contraseña, ajústala **solo en tu
copia local** y no la subas al repositorio.

Prueba que el backend responde:

```bash
curl http://localhost/App_CMDDB/api/test.php
```

### 5. Abrir la aplicación

`http://localhost/App_CMDDB/`

Las credenciales de acceso salen de la tabla `gestores` de la base de datos.

---

## Estructura del proyecto

```
App_CMDDB/
├── index.html          Shell de la app: login, sidebar, topbar, modal, contenedor
├── css/styles.css      Estilos completos (~2.3k líneas)
├── js/app.js           TODA la lógica del frontend (~14k líneas, ver nota abajo)
├── api/
│   ├── config.php      Conexión PDO a MySQL + cabeceras CORS
│   ├── sync.php        Endpoint principal: carga y persistencia masiva
│   ├── activos.php     …un archivo por recurso (colaboradores, tiendas, bajas, etc.)
│   └── uploads/        Actas y documentos subidos por la app
├── BD_CMDB.sql         Dump de la base de datos
└── DATOS DE PRUEBA/    Plantillas y archivos Excel de carga masiva
```

### Cómo fluyen los datos

El frontend nunca habla con MySQL directamente. Todo pasa por el objeto `DB`, definido al
inicio de `js/app.js`:

- `DB.init()` intenta cargar todo desde `api/sync.php`. Si la API no responde, cae a
  `localStorage` y la app sigue funcionando en modo offline.
- `DB.get(clave)` lee de la caché en memoria; `DB.set(clave, datos)` la actualiza y envía
  los cambios a la API con un *debounce* de 800 ms.
- `sync.php` traduce cada clave del frontend a su tabla MySQL (`activos`, `colaboradores`,
  `asignaciones`, `bitacora_movimientos`…) mediante el arreglo `$TABLE_MAP`.
- Las tablas grandes o críticas (`gestores`, `bitacoraMovimientos`) están excluidas del
  sync masivo y se modifican registro a registro con `addOne` / `updateOne` / `bulkInsert`.

---

## Módulos de la aplicación

| Módulo | Qué hace |
|---|---|
| Dashboards 1-3 | Indicadores generales, de asignaciones y financieros |
| Activos TI | Ingreso de equipos, series, carga masiva desde Excel |
| Repuestos | Registro de partes, stock y asignación de repuestos |
| Colaboradores | Padrón, carga masiva, asignaciones, sitios móviles, ceses |
| Tiendas | Gestión de sedes |
| CMDB | Inventario consolidado y cambio de estado de series |
| Bitácora | Movimientos y pendientes de retorno |
| Bajas | Bajas pendientes, valorización e historial |
| Configuración | Gestores (usuarios) y parámetros del sistema |

---

## Flujo de trabajo del equipo

1. `main` siempre debe quedar funcionando. Nadie hace push directo a `main`.
2. Cada tarea nace como *issue* y se trabaja en su propia rama:
   `feature/…`, `fix/…`, `docs/…`.
3. Al terminar, se abre un *pull request* y lo revisa el otro integrante antes del merge.
4. Antes de empezar el día: `git pull` sobre `main` y rebase o merge de tu rama.

Como `js/app.js` es un solo archivo enorme, **avisen en qué módulo va a trabajar cada uno**
antes de empezar. Dos personas editando secciones distintas del mismo archivo generan
conflictos de merge constantes.

---

## Qué NO se sube al repositorio

- Dumps de base de datos con datos productivos (`*.sql` grandes).
- Archivos Excel con inventario o padrón real (`*.xlsx`).
- Actas y documentos subidos por los usuarios (`api/uploads/`).
- Configuración personal de Claude Code (`.claude/settings.local.json`).
- Credenciales de cualquier tipo.

Esos archivos se comparten por el OneDrive del equipo, no por Git.
