<?php
// ============================================================
//  API ACTIVOS - CRUD completo con series
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

// ── GET: Listar activos (con series embebidas) ──────────────
case 'GET':
    $id = getParam('id');

    if ($id) {
        // Un activo con sus series
        $stmt = $db->prepare('SELECT * FROM activos WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $activo = $stmt->fetch();
        if (!$activo) jsonResponse(404, ['error' => 'Activo no encontrado']);

        $stmtS = $db->prepare('SELECT * FROM series WHERE activo_id = ?');
        $stmtS->execute([$id]);
        $activo['series'] = $stmtS->fetchAll();
        jsonResponse(200, $activo);
    }

    // Listado con filtros opcionales
    $where = ['a.deleted_at IS NULL'];
    $params = [];

    if ($v = getParam('tipo')) { $where[] = 'a.tipo = ?'; $params[] = $v; }
    if ($v = getParam('marca')) { $where[] = 'a.marca = ?'; $params[] = $v; }
    if ($v = getParam('estado')) { $where[] = 'a.estado = ?'; $params[] = $v; }
    if ($v = getParam('ubicacion')) { $where[] = 'a.ubicacion = ?'; $params[] = $v; }
    if ($v = getParam('search')) {
        $where[] = '(a.codigo LIKE ? OR a.marca LIKE ? OR a.modelo LIKE ? OR EXISTS (SELECT 1 FROM series s2 WHERE s2.activo_id = a.id AND (s2.serie LIKE ? OR s2.cod_inv LIKE ?)))';
        $like = sanitizeLike($v);
        $params = array_merge($params, [$like, $like, $like, $like, $like]);
    }

    $sql = 'SELECT a.* FROM activos a WHERE ' . implode(' AND ', $where) . ' ORDER BY a.id DESC';

    // Paginacion opcional
    $page = (int)getParam('page', 0);
    $limit = (int)getParam('limit', 0);
    if ($limit > 0) {
        $offset = $page > 0 ? ($page - 1) * $limit : 0;
        $sql .= " LIMIT $limit OFFSET $offset";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $activos = $stmt->fetchAll();

    // Cargar series para cada activo
    $ids = array_column($activos, 'id');
    $seriesMap = [];
    if (count($ids) > 0) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmtS = $db->prepare("SELECT * FROM series WHERE activo_id IN ($placeholders)");
        $stmtS->execute($ids);
        foreach ($stmtS->fetchAll() as $s) {
            $seriesMap[$s['activo_id']][] = $s;
        }
    }
    foreach ($activos as &$a) {
        $a['series'] = $seriesMap[$a['id']] ?? [];
    }

    // Count total
    $sqlCount = 'SELECT COUNT(*) FROM activos a WHERE ' . implode(' AND ', array_map(function($w) { return str_replace('a.', '', $w); }, $where));
    // Simplified count
    $countStmt = $db->prepare('SELECT COUNT(*) as total FROM activos a WHERE ' . implode(' AND ', $where));
    $countParams = array_slice($params, 0); // same params without limit
    $countStmt->execute($countParams);
    $total = $countStmt->fetch()['total'];

    jsonResponse(200, ['data' => $activos, 'total' => (int)$total]);

// ── POST: Crear activo con series ───────────────────────────
case 'POST':
    $body = getRequestBody();

    // Generar codigo auto (ATI-XXXXX)
    $stmtMax = $db->query("SELECT codigo FROM activos ORDER BY id DESC LIMIT 1");
    $last = $stmtMax->fetch();
    $nextNum = 1;
    if ($last && preg_match('/ATI-(\d+)/', $last['codigo'], $m)) {
        $nextNum = (int)$m[1] + 1;
    }
    $codigo = $body['codigo'] ?? ('ATI-' . str_pad($nextNum, 5, '0', STR_PAD_LEFT));

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO activos
            (codigo, tipo, equipo, marca, modelo, sku, procesador, ram, disco, gama,
             sistema_operativo, origen_equipo, adenda, adenda_fecha_inicio, adenda_fecha_fin,
             estado_equipo, costo, ubicacion, tipo_documento, n_documento,
             fecha_ingreso, fecha_compra, estado, responsable, observaciones, guia_ruta)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

        $stmt->execute([
            $codigo,
            $body['tipo'] ?? '',
            $body['equipo'] ?? null,
            $body['marca'] ?? null,
            $body['modelo'] ?? null,
            $body['sku'] ?? null,
            $body['procesador'] ?? null,
            $body['ram'] ?? null,
            $body['disco'] ?? null,
            $body['gama'] ?? null,
            $body['sistema_operativo'] ?? null,
            $body['origen_equipo'] ?? null,
            $body['adenda'] ?? null,
            $body['adenda_fecha_inicio'] ?? null,
            $body['adenda_fecha_fin'] ?? null,
            $body['estado_equipo'] ?? null,
            $body['costo'] ?? 0,
            $body['ubicacion'] ?? null,
            $body['tipo_documento'] ?? null,
            $body['n_documento'] ?? null,
            $body['fecha_ingreso'] ?? null,
            $body['fecha_compra'] ?? null,
            $body['estado'] ?? 'Disponible',
            $body['responsable'] ?? null,
            $body['observaciones'] ?? null,
            $body['guia_ruta'] ?? null
        ]);

        $activoId = $db->lastInsertId();

        // Insertar series
        if (!empty($body['series'])) {
            $stmtS = $db->prepare('INSERT INTO series (activo_id, serie, cod_inv, estado_cmdb, estado_equipo_serie, ram, disco, uso_equipo) VALUES (?,?,?,?,?,?,?,?)');
            foreach ($body['series'] as $s) {
                $stmtS->execute([
                    $activoId,
                    $s['serie'] ?? '',
                    $s['cod_inv'] ?? $s['codInv'] ?? null,
                    $s['estado_cmdb'] ?? $s['estadoCMDB'] ?? 'Disponible',
                    $s['estado_equipo_serie'] ?? $s['estadoEquipoSerie'] ?? null,
                    $s['ram'] ?? null,
                    $s['disco'] ?? null,
                    $s['uso_equipo'] ?? null
                ]);
            }
        }

        $db->commit();
        jsonResponse(201, ['id' => (int)$activoId, 'codigo' => $codigo, 'message' => 'Activo creado']);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(500, ['error' => $e->getMessage()]);
    }
    break;

// ── PUT: Actualizar activo ──────────────────────────────────
case 'PUT':
    $body = getRequestBody();
    $id = $body['id'] ?? getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('UPDATE activos SET
            tipo=?, equipo=?, marca=?, modelo=?, sku=?, procesador=?, ram=?, disco=?, gama=?,
            sistema_operativo=?, origen_equipo=?, adenda=?, adenda_fecha_inicio=?, adenda_fecha_fin=?,
            estado_equipo=?, costo=?, ubicacion=?, tipo_documento=?, n_documento=?,
            fecha_ingreso=?, fecha_compra=?, estado=?, motivo_baja=?, responsable=?, observaciones=?, guia_ruta=?
            WHERE id=?');

        $stmt->execute([
            $body['tipo'] ?? '',
            $body['equipo'] ?? null,
            $body['marca'] ?? null,
            $body['modelo'] ?? null,
            $body['sku'] ?? null,
            $body['procesador'] ?? null,
            $body['ram'] ?? null,
            $body['disco'] ?? null,
            $body['gama'] ?? null,
            $body['sistema_operativo'] ?? null,
            $body['origen_equipo'] ?? null,
            $body['adenda'] ?? null,
            $body['adenda_fecha_inicio'] ?? null,
            $body['adenda_fecha_fin'] ?? null,
            $body['estado_equipo'] ?? null,
            $body['costo'] ?? 0,
            $body['ubicacion'] ?? null,
            $body['tipo_documento'] ?? null,
            $body['n_documento'] ?? null,
            $body['fecha_ingreso'] ?? null,
            $body['fecha_compra'] ?? null,
            $body['estado'] ?? 'Disponible',
            $body['motivo_baja'] ?? null,
            $body['responsable'] ?? null,
            $body['observaciones'] ?? null,
            $body['guia_ruta'] ?? null,
            $id
        ]);

        // Actualizar series si vienen
        if (isset($body['series'])) {
            // Eliminar series existentes y reinsertar
            $db->prepare('DELETE FROM series WHERE activo_id = ?')->execute([$id]);
            $stmtS = $db->prepare('INSERT INTO series (activo_id, serie, cod_inv, estado_cmdb, estado_equipo_serie, ram, disco, uso_equipo) VALUES (?,?,?,?,?,?,?,?)');
            foreach ($body['series'] as $s) {
                $stmtS->execute([
                    $id,
                    $s['serie'] ?? '',
                    $s['cod_inv'] ?? $s['codInv'] ?? null,
                    $s['estado_cmdb'] ?? $s['estadoCMDB'] ?? 'Disponible',
                    $s['estado_equipo_serie'] ?? $s['estadoEquipoSerie'] ?? null,
                    $s['ram'] ?? null,
                    $s['disco'] ?? null,
                    $s['uso_equipo'] ?? null
                ]);
            }
        }

        $db->commit();
        jsonResponse(200, ['message' => 'Activo actualizado']);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(500, ['error' => $e->getMessage()]);
    }
    break;

// ── DELETE: Soft delete ─────────────────────────────────────
case 'DELETE':
    $id = getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE activos SET deleted_at = NOW() WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(200, ['message' => 'Activo eliminado']);
    break;

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
