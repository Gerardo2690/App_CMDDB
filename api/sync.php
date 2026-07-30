<?php
// ============================================================
//  API SYNC - Carga/Guardado masivo (puente localStorage → MySQL)
//  GET  → retorna toda la data en formato compatible con el frontend
//  POST → guarda data de una tabla (upsert inteligente)
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Mapeo: clave frontend → tabla MySQL
$TABLE_MAP = [
    'activos'              => 'activos',
    'colaboradores'        => 'colaboradores',
    'asignaciones'         => 'asignaciones',
    'repuestos'            => 'repuestos',
    'sitiosMoviles'        => 'sitios_moviles',
    'tiendas'              => 'tiendas',
    'movimientos'          => 'movimientos',
    'bitacoraMovimientos'  => 'bitacora_movimientos',
    'bajasPendientes'      => 'bajas_pendientes',
    'historialBajas'       => 'historial_bajas',
    'mantenimientos'       => 'mantenimientos',
    'asignacionesRep'      => 'asignaciones_rep',
];

// Tablas con soft-delete
$SOFT_DELETE = ['activos', 'colaboradores', 'tiendas', 'repuestos'];

// ── GET: Cargar toda la data ────────────────────────────────
if ($method === 'GET') {
    $key = getParam('key');

    // Si piden una tabla específica
    if ($key && isset($TABLE_MAP[$key])) {
        @set_time_limit(300);
        @ini_set('memory_limit', '2048M');

        $table = $TABLE_MAP[$key];
        $where = in_array($table, $SOFT_DELETE) ? 'WHERE deleted_at IS NULL' : '';

        // Paginacion opcional via ?limit=N&offset=O — util para tablas grandes (bitacora)
        $limit = isset($_GET['limit']) ? max(0, (int)$_GET['limit']) : 0;
        $offset = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : 0;
        // Skip COUNT por defecto (mas rapido). Solo hacer COUNT con ?withCount=1
        $withCount = isset($_GET['withCount']) ? (int)$_GET['withCount'] : 0;
        // Para bitacora se ordena DESC (mas recientes primero) si hay paginacion
        $orderBy = ($key === 'bitacoraMovimientos' && $limit > 0) ? 'ORDER BY id DESC' : 'ORDER BY id';
        $limitSql = $limit > 0 ? "LIMIT $limit OFFSET $offset" : '';

        $totalCount = null;
        if ($limit > 0 && $withCount) {
            $cntStmt = $db->query("SELECT COUNT(*) FROM `$table` $where");
            $totalCount = (int)$cntStmt->fetchColumn();
        }

        $data = $db->query("SELECT * FROM `$table` $where $orderBy $limitSql")->fetchAll();

        // Para activos, cargar series embebidas
        if ($key === 'activos' && count($data) > 0) {
            $ids = array_column($data, 'id');
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $seriesStmt = $db->prepare("SELECT * FROM series WHERE activo_id IN ($ph)");
            $seriesStmt->execute($ids);
            $seriesMap = [];
            foreach ($seriesStmt->fetchAll() as $s) {
                $seriesMap[$s['activo_id']][] = _mapSerieToFrontend($s);
            }
            foreach ($data as &$a) {
                $a = _mapActivoToFrontend($a, $seriesMap[$a['id']] ?? []);
            }
        }
        if ($key === 'bitacoraMovimientos') {
            foreach ($data as &$b) $b = _mapBitacoraToFrontend($b);
        }
        if ($key === 'asignaciones') {
            foreach ($data as &$a) $a = _mapAsigToFrontend($a);
        }
        if ($key === 'colaboradores') {
            foreach ($data as &$c) $c = _mapColabToFrontend($c);
        }
        if ($key === 'repuestos') {
            foreach ($data as &$r) $r = _mapRepuestoToFrontend($r);
        }

        if ($limit > 0) {
            jsonResponse(200, ['data' => $data, 'total' => $totalCount, 'limit' => $limit, 'offset' => $offset]);
        }
        jsonResponse(200, $data);
    }

    // Cargar TODO (para init del frontend)
    @set_time_limit(300);
    @ini_set('memory_limit', '2048M');

    $result = [];

    // Bitacora se carga bajo demanda (208K+ registros agotan la memoria en GET full).
    // El frontend puede pedirla con ?key=bitacoraMovimientos cuando entre a ese modulo.
    $LAZY_ON_FULL = ['bitacoraMovimientos'];

    foreach ($TABLE_MAP as $feKey => $table) {
        if (in_array($feKey, $LAZY_ON_FULL)) {
            $result[$feKey] = [];
            continue;
        }
        $where = in_array($table, $SOFT_DELETE) ? 'WHERE deleted_at IS NULL' : '';
        $result[$feKey] = $db->query("SELECT * FROM `$table` $where ORDER BY id")->fetchAll();
    }

    // Cargar series y embeber en activos
    if (count($result['activos']) > 0) {
        $ids = array_column($result['activos'], 'id');
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $seriesStmt = $db->prepare("SELECT * FROM series WHERE activo_id IN ($ph)");
        $seriesStmt->execute($ids);
        $seriesMap = [];
        foreach ($seriesStmt->fetchAll() as $s) {
            $seriesMap[$s['activo_id']][] = _mapSerieToFrontend($s);
        }
        foreach ($result['activos'] as &$a) {
            $a = _mapActivoToFrontend($a, $seriesMap[$a['id']] ?? []);
        }
    }

    // Mapear colaboradores
    foreach ($result['colaboradores'] as &$c) {
        $c = _mapColabToFrontend($c);
    }

    // Mapear asignaciones
    foreach ($result['asignaciones'] as &$a) {
        $a = _mapAsigToFrontend($a);
    }

    // Mapear bitacora
    foreach ($result['bitacoraMovimientos'] as &$b) {
        $b = _mapBitacoraToFrontend($b);
    }

    // Mapear bajas pendientes
    foreach ($result['bajasPendientes'] as &$bp) {
        $bp = _mapBajaPendToFrontend($bp);
    }

    // Mapear historial bajas
    foreach ($result['historialBajas'] as &$hb) {
        $hb = _mapHistBajaToFrontend($hb);
    }

    // Mapear repuestos
    foreach ($result['repuestos'] as &$r) {
        $r = _mapRepuestoToFrontend($r);
    }

    // Mapear asignaciones de repuestos
    foreach ($result['asignacionesRep'] as &$ar) {
        $ar = _mapAsigRepToFrontend($ar);
    }

    // Mapear sitios moviles
    foreach ($result['sitiosMoviles'] as &$sm) {
        $sm = _mapSitioToFrontend($sm);
    }

    // Mapear tiendas
    foreach ($result['tiendas'] as &$t) {
        $t = _mapTiendaToFrontend($t);
    }

    // Cargar catalogos (config)
    $catStmt = $db->query("SELECT categoria, valor FROM catalogos WHERE activo = 1 ORDER BY categoria, orden, valor");
    $config = [];
    foreach ($catStmt->fetchAll() as $r) {
        $config[$r['categoria']][] = $r['valor'];
    }
    $result['_config'] = $config;

    // Cargar tipo_equipos
    $teStmt = $db->query("SELECT tipo, equipo FROM tipo_equipos ORDER BY tipo, equipo");
    $tipoEquipos = [];
    foreach ($teStmt->fetchAll() as $r) {
        $tipoEquipos[$r['tipo']][] = $r['equipo'];
    }
    $result['_tipoEquipos'] = $tipoEquipos;

    // Cargar gestores
    // Incluye password porque el login se valida en el frontend (BD local, ambiente dev)
    $gestStmt = $db->query("SELECT id, nombre, email, rol, perfil, usuario, password, estado FROM gestores WHERE estado = 'Activo'");
    $result['gestores'] = $gestStmt->fetchAll();

    jsonResponse(200, $result);
}

// ── POST: Guardar data de una tabla ─────────────────────────
if ($method === 'POST') {
    // Permitir mas tiempo/memoria para sync de tablas grandes
    @set_time_limit(300);
    @ini_set('memory_limit', '1024M');

    $body = getRequestBody();
    $key = $body['key'] ?? getParam('key');
    $data = $body['data'] ?? [];
    $action = $body['action'] ?? 'sync'; // sync | add | update | delete

    if (!$key) jsonResponse(400, ['error' => 'key requerido']);

    // Ignorar 'gestores' silenciosamente (no esta en TABLE_MAP, se sincroniza aparte)
    if ($key === 'gestores') jsonResponse(200, ['message' => 'gestores skipped (read-only sync)']);

    // ── Config (catalogos) — debe ir ANTES de los checks de TABLE_MAP ──
    if ($key === '_config') {
        $db->beginTransaction();
        try {
            foreach ($data as $cat => $valores) {
                $db->prepare("UPDATE catalogos SET activo = 0 WHERE categoria = ?")->execute([$cat]);
                $stmtIns = $db->prepare("INSERT INTO catalogos (categoria, valor, orden, activo) VALUES (?,?,?,1)
                    ON DUPLICATE KEY UPDATE activo = 1, orden = VALUES(orden)");
                foreach ($valores as $i => $val) {
                    $stmtIns->execute([$cat, $val, $i + 1]);
                }
            }
            $db->commit();
            jsonResponse(200, ['message' => 'Config sincronizada']);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(500, ['error' => $e->getMessage()]);
        }
    }

    // ── Tipo Equipos — antes de TABLE_MAP checks ──
    if ($key === '_tipoEquipos') {
        $db->beginTransaction();
        try {
            $db->exec("DELETE FROM tipo_equipos");
            $stmt = $db->prepare("INSERT INTO tipo_equipos (tipo, equipo) VALUES (?, ?)");
            foreach ($data as $tipo => $equipos) {
                foreach ($equipos as $eq) {
                    $stmt->execute([$tipo, $eq]);
                }
            }
            $db->commit();
            jsonResponse(200, ['message' => 'Tipo equipos sincronizados']);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(500, ['error' => $e->getMessage()]);
        }
    }

    // ── Acciones individuales ──
    if ($action === 'add' || $action === 'update' || $action === 'delete') {
        $record = $body['record'] ?? $data;
        $table = $TABLE_MAP[$key] ?? null;
        if (!$table) jsonResponse(400, ['error' => 'key no valido: ' . $key]);

        if ($action === 'delete') {
            $id = $record['id'] ?? 0;
            if (in_array($table, $SOFT_DELETE)) {
                $db->prepare("UPDATE `$table` SET deleted_at = NOW() WHERE id = ?")->execute([$id]);
            } else {
                $db->prepare("DELETE FROM `$table` WHERE id = ?")->execute([$id]);
            }
            jsonResponse(200, ['message' => 'Eliminado']);
        }

        // Add / Update: delegar al metodo especifico
        $result = _upsertRecord($db, $key, $table, $record);
        jsonResponse(200, $result);
    }

    // ── Sync completo: reemplazar toda la tabla ──
    if ($action === 'sync') {
        $table = $TABLE_MAP[$key] ?? null;
        if (!$table) jsonResponse(400, ['error' => 'key no valido: ' . $key]);

        $db->beginTransaction();
        try {
            $count = _syncTable($db, $key, $table, $data);
            $db->commit();
            jsonResponse(200, ['message' => "Sync $key: $count registros", 'count' => $count]);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(500, ['error' => 'Error sync ' . $key . ': ' . $e->getMessage()]);
        }
    }

    // ── BulkInsert: SOLO inserta registros nuevos (no borra, no compara IDs) ──
    if ($action === 'bulkInsert') {
        $table = $TABLE_MAP[$key] ?? null;
        if (!$table) jsonResponse(400, ['error' => 'key no valido: ' . $key]);
        if (!is_array($data) || count($data) === 0) jsonResponse(400, ['error' => 'data vacio']);

        $db->beginTransaction();
        try {
            $insertedIds = [];
            foreach ($data as $record) {
                // Forzar INSERT removiendo id
                unset($record['id']);
                $result = _upsertRecord($db, $key, $table, $record);
                $insertedIds[] = $result['id'] ?? null;
            }
            $db->commit();
            jsonResponse(200, ['message' => count($insertedIds) . ' registros insertados', 'ids' => $insertedIds, 'count' => count($insertedIds)]);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(500, ['error' => 'Error bulkInsert ' . $key . ': ' . $e->getMessage()]);
        }
    }

    jsonResponse(400, ['error' => 'Operacion no reconocida']);
}

jsonResponse(405, ['error' => 'Metodo no permitido']);

// ============================================================
//  FUNCIONES DE MAPEO: MySQL → Frontend (camelCase)
// ============================================================

function _mapActivoToFrontend($a, $series = []) {
    return [
        'id'              => (int)$a['id'],
        'codigo'          => $a['codigo'],
        'tipo'            => $a['tipo'],
        'equipo'          => $a['equipo'],
        'marca'           => $a['marca'],
        'modelo'          => $a['modelo'],
        'sku'             => $a['sku'],
        'procesador'      => $a['procesador'],
        'ram'             => $a['ram'],
        'disco'           => $a['disco'],
        'gama'            => $a['gama'],
        'sistemaOperativo'=> $a['sistema_operativo'],
        'origenEquipo'    => $a['origen_equipo'],
        'adenda'          => $a['adenda'],
        'adendaFechaInicio'=> $a['adenda_fecha_inicio'],
        'adendaFechaFin'  => $a['adenda_fecha_fin'],
        'estadoEquipo'    => $a['estado_equipo'],
        'costo'           => (float)$a['costo'],
        'ubicacion'       => $a['ubicacion'],
        'tipoDocumento'   => $a['tipo_documento'],
        'nDocumento'      => $a['n_documento'],
        'fechaIngreso'    => $a['fecha_ingreso'],
        'fechaCompra'     => $a['fecha_compra'],
        'estado'          => $a['estado'],
        'motivoBaja'      => $a['motivo_baja'],
        'responsable'     => $a['responsable'],
        'observaciones'   => $a['observaciones'],
        'guiaRuta'        => $a['guia_ruta'],
        'series'          => $series,
    ];
}

function _mapSerieToFrontend($s) {
    return [
        'id'                => (int)$s['id'],
        'serie'             => $s['serie'],
        'codInv'            => $s['cod_inv'],
        'estadoCMDB'        => $s['estado_cmdb'],
        'estadoSerie'       => $s['estado_cmdb'],   // alias usado por el frontend legacy
        'estadoEquipoSerie' => $s['estado_equipo_serie'],
        'ram'               => $s['ram'],
        'disco'             => $s['disco'],
        'usoEquipo'         => $s['uso_equipo'],
    ];
}

function _mapColabToFrontend($c) {
    return [
        'id'                    => (int)$c['id'],
        'nombre'                => $c['nombre'],
        'apellido'              => $c['apellido'],
        'dni'                   => $c['dni'],
        'email'                 => $c['email'],
        'telefono'              => $c['telefono'],
        'modalidadContratacion' => $c['modalidad_contratacion'],
        'area'                  => $c['area'],
        'vicepresidencia'       => $c['vicepresidencia'],
        'centroCosto'           => $c['centro_costo'],
        'ubicacionFisica'       => $c['ubicacion_fisica'],
        'puesto'                => $c['puesto'],
        'tipoPuesto'            => $c['tipo_puesto'],
        'correoSupervisor'      => $c['correo_supervisor'],
        'fechaIngreso'          => $c['fecha_ingreso'],
        'estado'                => $c['estado'],
        'fechaCese'             => $c['fecha_cese'],
    ];
}

function _mapAsigToFrontend($a) {
    return [
        'id'                => (int)$a['id'],
        'activoId'          => (int)$a['activo_id'],
        'sitioId'           => $a['sitio_id'] ? (int)$a['sitio_id'] : null,
        'colaboradorId'     => $a['colaborador_id'] ? (int)$a['colaborador_id'] : null,
        'gestorId'          => $a['gestor_id'] ? (int)$a['gestor_id'] : null,
        'reemplazaAsigId'   => $a['reemplaza_asig_id'] ? (int)$a['reemplaza_asig_id'] : null,
        'serieAsignada'     => $a['serie_asignada'],
        'colaboradorNombre' => $a['colaborador_nombre'],
        'correoColab'       => $a['correo_colab'],
        'area'              => $a['area'],
        'sede'              => $a['sede'],
        'tipoDest'          => $a['tipo_dest'],
        'sitioNombre'       => $a['sitio_nombre'],
        'tipoAsignacion'    => $a['tipo_asignacion'],
        'motivo'            => $a['motivo'],
        'usoEquipo'         => $a['uso_equipo'],
        'ticket'            => $a['ticket'],
        'fechaAsignacion'   => $a['fecha_asignacion'],
        'fechaRetorno'      => $a['fecha_retorno'],
        'fechaFinPrestamo'  => $a['fecha_fin_prestamo'],
        'jefe'              => $a['jefe'],
        'actaEntrega'       => $a['acta_entrega'],
        'estado'            => $a['estado'],
        'estadoAsignacion'  => $a['estado_asignacion'],
        'pendienteRetorno'  => (int)$a['pendiente_retorno'],
        'isPrincipal'       => (int)$a['is_principal'],
        'observaciones'     => $a['observaciones'],
        'ticketReemplazo'   => $a['ticket_reemplazo'] ?? null,
        'fechaReemplazo'    => $a['fecha_reemplazo'] ?? null,
        'motivoReemplazo'   => $a['motivo_reemplazo'] ?? null,
        'ticketCese'        => $a['ticket_cese'] ?? null,
        'motivoCese'        => $a['motivo_cese'] ?? null,
    ];
}

function _mapBitacoraToFrontend($b) {
    return [
        'id'                => (int)$b['id'],
        'activoId'          => $b['activo_id'] ? (int)$b['activo_id'] : null,
        'gestorId'          => $b['gestor_id'] ? (int)$b['gestor_id'] : null,
        'movimiento'        => $b['movimiento'],
        'almacen'           => $b['almacen'],
        'tipoEquipo'        => $b['tipo_equipo'],
        'equipo'            => $b['equipo'],
        'marca'             => $b['marca'],
        'modelo'            => $b['modelo'],
        'serie'             => $b['serie'],
        'codInv'            => $b['cod_inv'],
        'motivo'            => $b['motivo'],
        'ticket'            => $b['ticket'],
        'colaboradorNombre' => $b['colaborador_nombre'],
        'correoColab'       => $b['correo_colab'],
        'estadoAsignacion'  => $b['estado_asignacion'],
        'actaCorrelativo'   => $b['acta_correlativo'],
        'actaRuta'          => $b['acta_ruta'],
        'fecha'             => $b['fecha'],
        'fechaRegistro'     => $b['fecha'],
        'correo'            => $b['correo_colab'],
        'gestor'            => $b['gestor'] ?? null,
    ];
}

function _mapBajaPendToFrontend($bp) {
    return [
        'id'                => (int)$bp['id'],
        'activoId'          => (int)$bp['activo_id'],
        'gestorId'          => $bp['gestor_id'] ? (int)$bp['gestor_id'] : null,
        'serie'             => $bp['serie'],
        'codInv'            => $bp['cod_inv'],
        'tipo'              => $bp['tipo'],
        'marca'             => $bp['marca'],
        'modelo'            => $bp['modelo'],
        'motivo'            => $bp['motivo'],
        'valorizado'        => $bp['valorizado'],
        'etapaBaja'         => $bp['etapa_baja'],
        'fechaSolicitud'    => $bp['fecha_solicitud'],
        'fechaValorizacion' => $bp['fecha_valorizacion'],
        'observaciones'     => $bp['observaciones'],
    ];
}

function _mapHistBajaToFrontend($hb) {
    return [
        'id'            => (int)$hb['id'],
        'activoId'      => $hb['activo_id'] ? (int)$hb['activo_id'] : null,
        'activoCodigo'  => $hb['activo_codigo'],
        'tipo'          => $hb['tipo'],
        'marca'         => $hb['marca'],
        'modelo'        => $hb['modelo'],
        'serie'         => $hb['serie'],
        'codInv'        => $hb['cod_inv'],
        'motivo'        => $hb['motivo'],
        'etapaBaja'     => $hb['etapa_baja'],
        'valorizado'    => $hb['valorizado'],
        'fechaBaja'     => $hb['fecha_baja'],
        'fechaSalida'   => $hb['fecha_salida'],
        'guia'          => $hb['guia'],
        'gestorId'      => $hb['gestor_id'] ? (int)$hb['gestor_id'] : null,
        'observaciones' => $hb['observaciones'],
    ];
}

function _mapRepuestoToFrontend($r) {
    return [
        'id'              => (int)$r['id'],
        'codigo'          => $r['codigo'],
        'tipo'            => $r['tipo'],
        'categoria'       => $r['categoria'],
        'equipo'          => $r['equipo'],
        'capacidad'       => $r['capacidad'],
        'marca'           => $r['marca'],
        'modelo'          => $r['modelo'],
        'serie'           => $r['serie'],
        'partNumber'      => $r['part_number'],
        'sku'             => $r['sku'],
        'nDocumento'      => $r['n_documento'],
        'tipoDocumento'   => $r['tipo_documento'],
        'almacen'         => $r['almacen'],
        'activoAsignadoId'=> $r['activo_asignado_id'] ? (int)$r['activo_asignado_id'] : null,
        'estado'          => $r['estado'],
        'estadoDisp'      => $r['estado_disp'],
        'estadoUso'       => $r['estado_uso'],
        'estadoCMDB'      => $r['estado_cmdb'],
        'usoEquipo'       => $r['uso_equipo'],
        'observaciones'   => $r['observaciones'],
        'fechaIngreso'    => $r['fecha_ingreso'],
    ];
}

function _mapAsigRepToFrontend($ar) {
    return [
        'id'              => (int)$ar['id'],
        'repuestoId'      => (int)$ar['repuesto_id'],
        'activoId'        => $ar['activo_id'] ? (int)$ar['activo_id'] : null,
        'colaboradorId'   => $ar['colaborador_id'] ? (int)$ar['colaborador_id'] : null,
        'gestorId'        => $ar['gestor_id'] ? (int)$ar['gestor_id'] : null,
        'ticket'          => $ar['ticket'],
        'categoria'       => $ar['categoria'],
        'fechaAsignacion' => $ar['fecha_asignacion'],
        'fechaRetorno'    => $ar['fecha_retorno'],
        'estado'          => $ar['estado'],
        'observaciones'   => $ar['observaciones'],
    ];
}

function _mapSitioToFrontend($s) {
    return [
        'id'          => (int)$s['id'],
        'codigo'      => $s['codigo'],
        'sede'        => $s['sede'],
        'area'        => $s['area'],
        'piso'        => $s['piso'],
        'ubicacion'   => $s['ubicacion'],
        'estado'      => $s['estado'],
        'observacion' => $s['observacion'],
    ];
}

function _mapTiendaToFrontend($t) {
    return [
        'id'                  => (int)$t['id'],
        'codigo'              => $t['codigo'],
        'nombre'              => $t['nombre'],
        'tipoLocal'           => $t['tipo_local'],
        'estado'              => $t['estado'],
        'region'              => $t['region'],
        'departamento'        => $t['departamento'],
        'provincia'           => $t['provincia'],
        'distrito'            => $t['distrito'],
        'direccion'           => $t['direccion'],
        'responsable'         => $t['responsable'],
        'telefonoResponsable' => $t['telefono_responsable'],
        'emailResponsable'    => $t['email_responsable'],
        'telefono'            => $t['telefono'],
        'fechaApertura'       => $t['fecha_apertura'],
        'observaciones'       => $t['observaciones'],
    ];
}

// ============================================================
//  FUNCIONES DE SYNC: Frontend → MySQL
// ============================================================

function _upsertRecord($db, $key, $table, $record) {
    switch ($key) {
        case 'activos':
            return _upsertActivo($db, $record);
        case 'colaboradores':
            return _upsertColab($db, $record);
        case 'asignaciones':
            return _upsertAsig($db, $record);
        case 'bitacoraMovimientos':
            return _upsertBitacora($db, $record);
        case 'bajasPendientes':
            return _upsertBajaPend($db, $record);
        case 'historialBajas':
            return _upsertHistBaja($db, $record);
        case 'repuestos':
            return _upsertRepuesto($db, $record);
        case 'asignacionesRep':
            return _upsertAsigRep($db, $record);
        case 'movimientos':
            return _upsertMovimiento($db, $record);
        case 'tiendas':
            return _upsertTienda($db, $record);
        case 'sitiosMoviles':
            return _upsertSitio($db, $record);
        default:
            return _upsertGeneric($db, $table, $record);
    }
}

function _upsertActivo($db, $r) {
    $id = $r['id'] ?? null;
    if ($id) {
        $stmt = $db->prepare('UPDATE activos SET tipo=?,equipo=?,marca=?,modelo=?,sku=?,procesador=?,ram=?,disco=?,gama=?,sistema_operativo=?,origen_equipo=?,adenda=?,adenda_fecha_inicio=?,adenda_fecha_fin=?,estado_equipo=?,costo=?,ubicacion=?,tipo_documento=?,n_documento=?,fecha_ingreso=?,fecha_compra=?,estado=?,motivo_baja=?,responsable=?,observaciones=?,guia_ruta=? WHERE id=?');
        $stmt->execute([$r['tipo']??'',$r['equipo']??null,$r['marca']??null,$r['modelo']??null,$r['sku']??null,$r['procesador']??null,$r['ram']??null,$r['disco']??null,$r['gama']??null,$r['sistemaOperativo']??$r['sistema_operativo']??null,$r['origenEquipo']??$r['origen_equipo']??null,$r['adenda']??null,$r['adendaFechaInicio']??$r['adenda_fecha_inicio']??null,$r['adendaFechaFin']??$r['adenda_fecha_fin']??null,$r['estadoEquipo']??$r['estado_equipo']??null,$r['costo']??0,$r['ubicacion']??null,$r['tipoDocumento']??$r['tipo_documento']??null,$r['nDocumento']??$r['n_documento']??null,$r['fechaIngreso']??$r['fecha_ingreso']??null,$r['fechaCompra']??$r['fecha_compra']??null,$r['estado']??'Disponible',$r['motivoBaja']??$r['motivo_baja']??null,$r['responsable']??null,$r['observaciones']??null,$r['guiaRuta']??$r['guia_ruta']??null,$id]);
    } else {
        $stmt = $db->prepare('INSERT INTO activos (codigo,tipo,equipo,marca,modelo,sku,procesador,ram,disco,gama,sistema_operativo,origen_equipo,adenda,adenda_fecha_inicio,adenda_fecha_fin,estado_equipo,costo,ubicacion,tipo_documento,n_documento,fecha_ingreso,fecha_compra,estado,responsable,observaciones,guia_ruta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$r['codigo']??'',$r['tipo']??'',$r['equipo']??null,$r['marca']??null,$r['modelo']??null,$r['sku']??null,$r['procesador']??null,$r['ram']??null,$r['disco']??null,$r['gama']??null,$r['sistemaOperativo']??null,$r['origenEquipo']??null,$r['adenda']??null,$r['adendaFechaInicio']??null,$r['adendaFechaFin']??null,$r['estadoEquipo']??null,$r['costo']??0,$r['ubicacion']??null,$r['tipoDocumento']??null,$r['nDocumento']??null,$r['fechaIngreso']??null,$r['fechaCompra']??null,$r['estado']??'Disponible',$r['responsable']??null,$r['observaciones']??null,$r['guiaRuta']??null]);
        $id = $db->lastInsertId();
    }
    // Sync series
    if (isset($r['series'])) {
        $db->prepare('DELETE FROM series WHERE activo_id = ?')->execute([$id]);
        $stmtS = $db->prepare('INSERT INTO series (activo_id,serie,cod_inv,estado_cmdb,estado_equipo_serie,ram,disco,uso_equipo) VALUES (?,?,?,?,?,?,?,?)');
        foreach ($r['series'] as $s) {
            $stmtS->execute([$id,$s['serie']??'',$s['codInv']??$s['cod_inv']??null,$s['estadoCMDB']??$s['estado_cmdb']??$s['estadoSerie']??'Disponible',$s['estadoEquipoSerie']??$s['estado_equipo_serie']??null,$s['ram']??null,$s['disco']??null,$s['usoEquipo']??$s['uso_equipo']??null]);
        }
    }
    return ['id' => (int)$id, 'message' => 'Activo sincronizado'];
}

function _upsertColab($db, $r) {
    $id = $r['id'] ?? null;
    $fields = [$r['nombre']??'',$r['apellido']??'',$r['dni']??null,$r['email']??null,$r['telefono']??null,$r['modalidadContratacion']??$r['modalidad_contratacion']??null,$r['area']??null,$r['vicepresidencia']??null,$r['centroCosto']??$r['centro_costo']??null,$r['ubicacionFisica']??$r['ubicacion_fisica']??null,$r['puesto']??null,$r['tipoPuesto']??$r['tipo_puesto']??null,$r['correoSupervisor']??$r['correo_supervisor']??null,$r['fechaIngreso']??$r['fecha_ingreso']??null,$r['estado']??'Activo',$r['fechaCese']??$r['fecha_cese']??null];
    if ($id) {
        $fields[] = $id;
        $db->prepare('UPDATE colaboradores SET nombre=?,apellido=?,dni=?,email=?,telefono=?,modalidad_contratacion=?,area=?,vicepresidencia=?,centro_costo=?,ubicacion_fisica=?,puesto=?,tipo_puesto=?,correo_supervisor=?,fecha_ingreso=?,estado=?,fecha_cese=? WHERE id=?')->execute($fields);
    } else {
        $db->prepare('INSERT INTO colaboradores (nombre,apellido,dni,email,telefono,modalidad_contratacion,area,vicepresidencia,centro_costo,ubicacion_fisica,puesto,tipo_puesto,correo_supervisor,fecha_ingreso,estado,fecha_cese) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($fields);
        $id = $db->lastInsertId();
    }
    return ['id' => (int)$id, 'message' => 'Colaborador sincronizado'];
}

function _upsertAsig($db, $r) {
    $id = $r['id'] ?? null;
    $vals = [
        $r['activoId']??$r['activo_id']??0,
        $r['sitioId']??$r['sitio_id']??null,
        $r['colaboradorId']??$r['colaborador_id']??null,
        $r['gestorId']??$r['gestor_id']??null,
        $r['serieAsignada']??$r['serie_asignada']??null,
        $r['colaboradorNombre']??$r['colaborador_nombre']??null,
        $r['correoColab']??$r['correo_colab']??null,
        $r['area']??null,
        $r['sede']??null,
        $r['tipoDest']??$r['tipo_dest']??'COLABORADOR',
        $r['sitioNombre']??$r['sitio_nombre']??null,
        $r['tipoAsignacion']??$r['tipo_asignacion']??null,
        $r['motivo']??null,
        $r['usoEquipo']??$r['uso_equipo']??null,
        $r['ticket']??null,
        $r['fechaAsignacion']??$r['fecha_asignacion']??null,
        $r['fechaRetorno']??$r['fecha_retorno']??null,
        $r['fechaFinPrestamo']??$r['fecha_fin_prestamo']??null,
        $r['jefe']??null,
        $r['actaEntrega']??$r['acta_entrega']??null,
        $r['estado']??'Vigente',
        $r['estadoAsignacion']??$r['estado_asignacion']??'PENDIENTE',
        $r['pendienteRetorno']??$r['pendiente_retorno']??0,
        $r['isPrincipal']??$r['is_principal']??1,
        $r['observaciones']??null,
        $r['ticketReemplazo']??$r['ticket_reemplazo']??null,
        $r['fechaReemplazo']??$r['fecha_reemplazo']??null,
        $r['motivoReemplazo']??$r['motivo_reemplazo']??null,
        $r['ticketCese']??$r['ticket_cese']??null,
        $r['motivoCese']??$r['motivo_cese']??null,
    ];
    if ($id) {
        $vals[] = $id;
        $db->prepare('UPDATE asignaciones SET activo_id=?,sitio_id=?,colaborador_id=?,gestor_id=?,serie_asignada=?,colaborador_nombre=?,correo_colab=?,area=?,sede=?,tipo_dest=?,sitio_nombre=?,tipo_asignacion=?,motivo=?,uso_equipo=?,ticket=?,fecha_asignacion=?,fecha_retorno=?,fecha_fin_prestamo=?,jefe=?,acta_entrega=?,estado=?,estado_asignacion=?,pendiente_retorno=?,is_principal=?,observaciones=?,ticket_reemplazo=?,fecha_reemplazo=?,motivo_reemplazo=?,ticket_cese=?,motivo_cese=? WHERE id=?')->execute($vals);
    } else {
        $db->prepare('INSERT INTO asignaciones (activo_id,sitio_id,colaborador_id,gestor_id,serie_asignada,colaborador_nombre,correo_colab,area,sede,tipo_dest,sitio_nombre,tipo_asignacion,motivo,uso_equipo,ticket,fecha_asignacion,fecha_retorno,fecha_fin_prestamo,jefe,acta_entrega,estado,estado_asignacion,pendiente_retorno,is_principal,observaciones,ticket_reemplazo,fecha_reemplazo,motivo_reemplazo,ticket_cese,motivo_cese) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($vals);
        $id = $db->lastInsertId();
    }
    return ['id' => (int)$id, 'message' => 'Asignacion sincronizada'];
}

function _upsertBitacora($db, $r) {
    $correoColab = $r['correoColab'] ?? $r['correo_colab'] ?? $r['correo'] ?? null;
    $gestor      = $r['gestor'] ?? $r['gestor_nombre'] ?? null;
    $id = $r['id'] ?? null;
    $vals = [
        $r['activoId']??$r['activo_id']??null,
        $r['gestorId']??$r['gestor_id']??null,
        $gestor,
        $r['movimiento']??'',
        $r['almacen']??null,
        $r['tipoEquipo']??$r['tipo_equipo']??null,
        $r['equipo']??null,
        $r['marca']??null,
        $r['modelo']??null,
        $r['serie']??null,
        $r['codInv']??$r['cod_inv']??null,
        $r['motivo']??null,
        $r['ticket']??null,
        $r['colaboradorNombre']??$r['colaborador_nombre']??null,
        $correoColab,
        $r['estadoAsignacion']??$r['estado_asignacion']??'PENDIENTE',
        $r['actaCorrelativo']??$r['acta_correlativo']??null,
        $r['actaRuta']??$r['acta_ruta']??null,
        $r['fecha']??$r['fechaRegistro']??date('Y-m-d H:i:s')
    ];
    if ($id) {
        $vals[] = $id;
        $db->prepare('UPDATE bitacora_movimientos SET activo_id=?,gestor_id=?,gestor=?,movimiento=?,almacen=?,tipo_equipo=?,equipo=?,marca=?,modelo=?,serie=?,cod_inv=?,motivo=?,ticket=?,colaborador_nombre=?,correo_colab=?,estado_asignacion=?,acta_correlativo=?,acta_ruta=?,fecha=? WHERE id=?')->execute($vals);
    } else {
        $db->prepare('INSERT INTO bitacora_movimientos (activo_id,gestor_id,gestor,movimiento,almacen,tipo_equipo,equipo,marca,modelo,serie,cod_inv,motivo,ticket,colaborador_nombre,correo_colab,estado_asignacion,acta_correlativo,acta_ruta,fecha) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($vals);
        $id = $db->lastInsertId();
    }
    return ['id' => (int)$id, 'message' => 'Bitacora sincronizada'];
}

function _upsertBajaPend($db, $r) {
    $id = $r['id'] ?? null;
    $vals = [$r['activoId']??$r['activo_id']??0,$r['gestorId']??$r['gestor_id']??null,$r['serie']??null,$r['codInv']??$r['cod_inv']??null,$r['tipo']??null,$r['marca']??null,$r['modelo']??null,$r['motivo']??null,$r['valorizado']??'PENDIENTE',$r['etapaBaja']??$r['etapa_baja']??null,$r['fechaSolicitud']??$r['fecha_solicitud']??date('Y-m-d'),$r['fechaValorizacion']??$r['fecha_valorizacion']??null,$r['observaciones']??null];
    if ($id) {
        $vals[] = $id;
        $db->prepare('UPDATE bajas_pendientes SET activo_id=?,gestor_id=?,serie=?,cod_inv=?,tipo=?,marca=?,modelo=?,motivo=?,valorizado=?,etapa_baja=?,fecha_solicitud=?,fecha_valorizacion=?,observaciones=? WHERE id=?')->execute($vals);
    } else {
        $db->prepare('INSERT INTO bajas_pendientes (activo_id,gestor_id,serie,cod_inv,tipo,marca,modelo,motivo,valorizado,etapa_baja,fecha_solicitud,fecha_valorizacion,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($vals);
        $id = $db->lastInsertId();
    }
    return ['id' => (int)$id];
}

function _upsertHistBaja($db, $r) {
    $db->prepare('INSERT INTO historial_bajas (activo_id,activo_codigo,tipo,marca,modelo,serie,cod_inv,motivo,etapa_baja,valorizado,fecha_baja,fecha_salida,guia,gestor_id,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([
        $r['activoId']??$r['activo_id']??null,$r['activoCodigo']??$r['activo_codigo']??null,$r['tipo']??null,$r['marca']??null,$r['modelo']??null,$r['serie']??null,$r['codInv']??$r['cod_inv']??null,$r['motivo']??null,$r['etapaBaja']??$r['etapa_baja']??null,$r['valorizado']??null,$r['fechaBaja']??$r['fecha_baja']??date('Y-m-d'),$r['fechaSalida']??$r['fecha_salida']??null,$r['guia']??null,$r['gestorId']??$r['gestor_id']??null,$r['observaciones']??null
    ]);
    return ['id' => (int)$db->lastInsertId()];
}

function _upsertRepuesto($db, $r) {
    $id = $r['id'] ?? null;
    $vals = [$r['tipo']??'REPUESTO',$r['categoria']??'PARTE',$r['equipo']??'',$r['capacidad']??$r['capacidad']??null,$r['marca']??null,$r['modelo']??null,$r['serie']??null,$r['partNumber']??$r['part_number']??null,$r['sku']??null,$r['nDocumento']??$r['n_documento']??null,$r['tipoDocumento']??$r['tipo_documento']??null,$r['almacen']??null,$r['activoAsignadoId']??$r['activo_asignado_id']??null,$r['estado']??'Disponible',$r['estadoDisp']??$r['estado_disp']??'DISPONIBLE',$r['estadoUso']??$r['estado_uso']??'NUEVO',$r['estadoCMDB']??$r['estado_cmdb']??null,$r['usoEquipo']??$r['uso_equipo']??null,$r['observaciones']??null,$r['fechaIngreso']??$r['fecha_ingreso']??date('Y-m-d')];
    if ($id) {
        $vals[] = $id;
        $db->prepare('UPDATE repuestos SET tipo=?,categoria=?,equipo=?,capacidad=?,marca=?,modelo=?,serie=?,part_number=?,sku=?,n_documento=?,tipo_documento=?,almacen=?,activo_asignado_id=?,estado=?,estado_disp=?,estado_uso=?,estado_cmdb=?,uso_equipo=?,observaciones=?,fecha_ingreso=? WHERE id=?')->execute($vals);
    } else {
        $last = $db->query("SELECT codigo FROM repuestos ORDER BY id DESC LIMIT 1")->fetch();
        $n = 1; if ($last && preg_match('/REP-(\d+)/', $last['codigo'], $m)) $n = (int)$m[1]+1;
        $codigo = $r['codigo'] ?? ('REP-'.str_pad($n,5,'0',STR_PAD_LEFT));
        array_unshift($vals, $codigo);
        $db->prepare('INSERT INTO repuestos (codigo,tipo,categoria,equipo,capacidad,marca,modelo,serie,part_number,sku,n_documento,tipo_documento,almacen,activo_asignado_id,estado,estado_disp,estado_uso,estado_cmdb,uso_equipo,observaciones,fecha_ingreso) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($vals);
        $id = $db->lastInsertId();
    }
    return ['id' => (int)$id];
}

function _upsertAsigRep($db, $r) {
    $id = $r['id'] ?? null;
    $vals = [$r['repuestoId']??$r['repuesto_id']??0,$r['activoId']??$r['activo_id']??null,$r['colaboradorId']??$r['colaborador_id']??null,$r['gestorId']??$r['gestor_id']??null,$r['ticket']??null,$r['categoria']??null,$r['fechaAsignacion']??$r['fecha_asignacion']??date('Y-m-d H:i:s'),$r['fechaRetorno']??$r['fecha_retorno']??null,$r['estado']??'Vigente',$r['observaciones']??null];
    if ($id) {
        $vals[] = $id;
        $db->prepare('UPDATE asignaciones_rep SET repuesto_id=?,activo_id=?,colaborador_id=?,gestor_id=?,ticket=?,categoria=?,fecha_asignacion=?,fecha_retorno=?,estado=?,observaciones=? WHERE id=?')->execute($vals);
    } else {
        $db->prepare('INSERT INTO asignaciones_rep (repuesto_id,activo_id,colaborador_id,gestor_id,ticket,categoria,fecha_asignacion,fecha_retorno,estado,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?)')->execute($vals);
        $id = $db->lastInsertId();
    }
    return ['id' => (int)$id];
}

function _upsertMovimiento($db, $r) {
    $db->prepare('INSERT INTO movimientos (gestor_id,tipo,detalle,fecha) VALUES (?,?,?,?)')->execute([
        $r['gestorId']??$r['gestor_id']??null,$r['tipo']??'',$r['detalle']??null,$r['fecha']??date('Y-m-d')
    ]);
    return ['id' => (int)$db->lastInsertId()];
}

function _upsertTienda($db, $r) {
    $id = $r['id'] ?? null;
    $fa = ($r['fechaApertura'] ?? $r['fecha_apertura'] ?? '') ?: null; // '' → NULL (columna DATE)
    $vals = [
        $r['nombre'] ?? '', $r['tipoLocal'] ?? $r['tipo_local'] ?? null, $r['estado'] ?? 'Activa',
        $r['region'] ?? null, $r['departamento'] ?? null, $r['provincia'] ?? null, $r['distrito'] ?? null,
        $r['direccion'] ?? null, $r['responsable'] ?? null,
        $r['telefonoResponsable'] ?? $r['telefono_responsable'] ?? null,
        $r['emailResponsable'] ?? $r['email_responsable'] ?? null,
        $r['telefono'] ?? null, $fa, $r['observaciones'] ?? null
    ];
    if ($id) {
        $vals[] = $id;
        $db->prepare('UPDATE tiendas SET nombre=?,tipo_local=?,estado=?,region=?,departamento=?,provincia=?,distrito=?,direccion=?,responsable=?,telefono_responsable=?,email_responsable=?,telefono=?,fecha_apertura=?,observaciones=? WHERE id=?')->execute($vals);
    } else {
        $codigo = $r['codigo'] ?? null;
        if (!$codigo) {
            $last = $db->query("SELECT codigo FROM tiendas ORDER BY id DESC LIMIT 1")->fetch();
            $n = 1; if ($last && preg_match('/TDA-(\d+)/', $last['codigo'], $m)) $n = (int)$m[1] + 1;
            $codigo = 'TDA-' . str_pad($n, 5, '0', STR_PAD_LEFT);
        }
        array_unshift($vals, $codigo);
        $db->prepare('INSERT INTO tiendas (codigo,nombre,tipo_local,estado,region,departamento,provincia,distrito,direccion,responsable,telefono_responsable,email_responsable,telefono,fecha_apertura,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($vals);
        $id = $db->lastInsertId();
    }
    return ['id' => (int)$id];
}

function _upsertSitio($db, $r) {
    $id = $r['id'] ?? null;
    $vals = [
        $r['sede'] ?? null, $r['area'] ?? null, $r['piso'] ?? null, $r['ubicacion'] ?? null,
        $r['estado'] ?? 'Activo', $r['observacion'] ?? $r['observaciones'] ?? null
    ];
    if ($id) {
        $vals[] = $id;
        $db->prepare('UPDATE sitios_moviles SET sede=?,area=?,piso=?,ubicacion=?,estado=?,observacion=? WHERE id=?')->execute($vals);
    } else {
        $codigo = $r['codigo'] ?? null;
        if (!$codigo) {
            $last = $db->query("SELECT codigo FROM sitios_moviles ORDER BY id DESC LIMIT 1")->fetch();
            $n = 1; if ($last && preg_match('/SIT-(\d+)/', $last['codigo'], $m)) $n = (int)$m[1] + 1;
            $codigo = 'SIT-' . str_pad($n, 5, '0', STR_PAD_LEFT);
        }
        array_unshift($vals, $codigo);
        $db->prepare('INSERT INTO sitios_moviles (codigo,sede,area,piso,ubicacion,estado,observacion) VALUES (?,?,?,?,?,?,?)')->execute($vals);
        $id = $db->lastInsertId();
    }
    return ['id' => (int)$id];
}

function _upsertGeneric($db, $table, $r) {
    $id = $r['id'] ?? null;
    // Construir INSERT/UPDATE dinamico. Se validan los nombres de columna contra un patrón
    // seguro (bloquea inyección SQL vía claves con backticks u otros caracteres).
    $cols = array_keys($r);
    $cols = array_filter($cols, function($c) { return $c !== 'id' && !str_starts_with($c, '_') && preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $c); });
    $vals = array_map(function($c) use ($r) { return $r[$c]; }, $cols);

    if ($id) {
        $set = implode(', ', array_map(function($c) { return "`$c` = ?"; }, $cols));
        $vals[] = $id;
        $db->prepare("UPDATE `$table` SET $set WHERE id = ?")->execute($vals);
    } else {
        $colStr = implode(', ', array_map(function($c) { return "`$c`"; }, $cols));
        $ph = implode(', ', array_fill(0, count($cols), '?'));
        $db->prepare("INSERT INTO `$table` ($colStr) VALUES ($ph)")->execute($vals);
        $id = $db->lastInsertId();
    }
    return ['id' => (int)$id];
}

function _syncTable($db, $key, $table, $data) {
    // Guarda anti-borrado masivo: un payload vacio o no-array NO debe vaciar la tabla.
    // (Protege contra un cache incompleto en el cliente que borraria todos los registros.)
    if (!is_array($data) || count($data) === 0) {
        return 0;
    }
    // Para sync completo: obtener IDs existentes, comparar, upsert
    $existing = $db->query("SELECT id FROM `$table`")->fetchAll(PDO::FETCH_COLUMN);
    $existingSet = array_flip($existing);
    $incomingIds = [];
    $count = 0;

    foreach ($data as $record) {
        _upsertRecord($db, $key, $table, $record);
        if (isset($record['id'])) $incomingIds[] = $record['id'];
        $count++;
    }

    // Soft-delete registros que ya no estan
    global $SOFT_DELETE;
    $toDelete = array_diff($existing, $incomingIds);
    if (count($toDelete) > 0) {
        $ph = implode(',', array_fill(0, count($toDelete), '?'));
        if (in_array($table, $SOFT_DELETE)) {
            $db->prepare("UPDATE `$table` SET deleted_at = NOW() WHERE id IN ($ph)")->execute(array_values($toDelete));
        } else {
            $db->prepare("DELETE FROM `$table` WHERE id IN ($ph)")->execute(array_values($toDelete));
        }
    }

    return $count;
}
