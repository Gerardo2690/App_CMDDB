<?php
// ============================================================
//  API BAJAS - Pendientes + Historial
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$tipo = getParam('tipo', 'pendientes'); // pendientes | historial

// ── BAJAS PENDIENTES ────────────────────────────────────────
if ($tipo === 'pendientes') {
    switch ($method) {

    case 'GET':
        $where = ['1=1'];
        $params = [];

        if ($v = getParam('valorizado')) { $where[] = 'bp.valorizado = ?'; $params[] = $v; }
        if ($v = getParam('activo_id')) { $where[] = 'bp.activo_id = ?'; $params[] = $v; }
        if ($v = getParam('search')) {
            $where[] = '(bp.serie LIKE ? OR bp.cod_inv LIKE ? OR bp.motivo LIKE ? OR bp.modelo LIKE ?)';
            $like = sanitizeLike($v);
            $params = array_merge($params, [$like, $like, $like, $like]);
        }

        $sql = 'SELECT bp.* FROM bajas_pendientes bp WHERE ' . implode(' AND ', $where) . ' ORDER BY bp.id DESC';

        $page = (int)getParam('page', 0);
        $limit = (int)getParam('limit', 0);
        if ($limit > 0) {
            $offset = $page > 0 ? ($page - 1) * $limit : 0;
            $sql .= " LIMIT $limit OFFSET $offset";
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();

        $countStmt = $db->prepare('SELECT COUNT(*) as total FROM bajas_pendientes bp WHERE ' . implode(' AND ', $where));
        $countStmt->execute($params);
        $total = $countStmt->fetch()['total'];

        jsonResponse(200, ['data' => $data, 'total' => (int)$total]);

    case 'POST':
        $body = getRequestBody();
        $items = isset($body[0]) ? $body : [$body];
        $ids = [];

        $db->beginTransaction();
        try {
            $stmt = $db->prepare('INSERT INTO bajas_pendientes
                (activo_id, gestor_id, serie, cod_inv, tipo, marca, modelo,
                 motivo, valorizado, etapa_baja, fecha_solicitud, fecha_valorizacion, observaciones)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');

            foreach ($items as $b) {
                $stmt->execute([
                    $b['activo_id'] ?? $b['activoId'] ?? 0,
                    $b['gestor_id'] ?? $b['gestorId'] ?? null,
                    $b['serie'] ?? null,
                    $b['cod_inv'] ?? $b['codInv'] ?? null,
                    $b['tipo'] ?? null,
                    $b['marca'] ?? null,
                    $b['modelo'] ?? null,
                    $b['motivo'] ?? null,
                    $b['valorizado'] ?? 'PENDIENTE',
                    $b['etapa_baja'] ?? $b['etapaBaja'] ?? null,
                    $b['fecha_solicitud'] ?? $b['fechaSolicitud'] ?? date('Y-m-d'),
                    $b['fecha_valorizacion'] ?? $b['fechaValorizacion'] ?? null,
                    $b['observaciones'] ?? null
                ]);
                $ids[] = (int)$db->lastInsertId();
            }
            $db->commit();
            jsonResponse(201, ['ids' => $ids, 'message' => count($ids) . ' baja(s) pendiente(s) creada(s)']);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(500, ['error' => $e->getMessage()]);
        }
        break;

    case 'PUT':
        $body = getRequestBody();
        $id = $body['id'] ?? getParam('id');
        if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

        $fields = [];
        $values = [];
        $allowed = ['valorizado', 'etapa_baja', 'fecha_valorizacion', 'motivo', 'observaciones'];

        foreach ($allowed as $f) {
            $camel = lcfirst(str_replace('_', '', ucwords($f, '_')));
            if (isset($body[$f])) { $fields[] = "$f = ?"; $values[] = $body[$f]; }
            elseif (isset($body[$camel])) { $fields[] = "$f = ?"; $values[] = $body[$camel]; }
        }

        if (empty($fields)) jsonResponse(400, ['error' => 'No hay campos para actualizar']);

        $values[] = $id;
        $stmt = $db->prepare('UPDATE bajas_pendientes SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($values);
        jsonResponse(200, ['message' => 'Baja pendiente actualizada']);

    case 'DELETE':
        $id = getParam('id');
        if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

        $stmt = $db->prepare('DELETE FROM bajas_pendientes WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(200, ['message' => 'Baja pendiente eliminada']);

    default:
        jsonResponse(405, ['error' => 'Metodo no permitido']);
    }
}

// ── HISTORIAL DE BAJAS ──────────────────────────────────────
if ($tipo === 'historial') {
    switch ($method) {

    case 'GET':
        $where = ['1=1'];
        $params = [];

        if ($v = getParam('motivo')) { $where[] = 'motivo LIKE ?'; $params[] = sanitizeLike($v); }
        if ($v = getParam('search')) {
            $where[] = '(serie LIKE ? OR cod_inv LIKE ? OR motivo LIKE ? OR modelo LIKE ? OR activo_codigo LIKE ?)';
            $like = sanitizeLike($v);
            $params = array_merge($params, [$like, $like, $like, $like, $like]);
        }

        $sql = 'SELECT * FROM historial_bajas WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC';

        $page = (int)getParam('page', 0);
        $limit = (int)getParam('limit', 0);
        if ($limit > 0) {
            $offset = $page > 0 ? ($page - 1) * $limit : 0;
            $sql .= " LIMIT $limit OFFSET $offset";
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();

        $countStmt = $db->prepare('SELECT COUNT(*) as total FROM historial_bajas WHERE ' . implode(' AND ', $where));
        $countStmt->execute($params);
        $total = $countStmt->fetch()['total'];

        jsonResponse(200, ['data' => $data, 'total' => (int)$total]);

    case 'POST':
        $body = getRequestBody();
        $items = isset($body[0]) ? $body : [$body];
        $ids = [];

        $db->beginTransaction();
        try {
            $stmt = $db->prepare('INSERT INTO historial_bajas
                (activo_id, activo_codigo, tipo, marca, modelo, serie, cod_inv,
                 motivo, etapa_baja, valorizado, fecha_baja, fecha_salida, guia, gestor_id, observaciones)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

            foreach ($items as $b) {
                $stmt->execute([
                    $b['activo_id'] ?? $b['activoId'] ?? null,
                    $b['activo_codigo'] ?? $b['activoCodigo'] ?? null,
                    $b['tipo'] ?? null,
                    $b['marca'] ?? null,
                    $b['modelo'] ?? null,
                    $b['serie'] ?? null,
                    $b['cod_inv'] ?? $b['codInv'] ?? null,
                    $b['motivo'] ?? null,
                    $b['etapa_baja'] ?? $b['etapaBaja'] ?? null,
                    $b['valorizado'] ?? null,
                    $b['fecha_baja'] ?? $b['fechaBaja'] ?? date('Y-m-d'),
                    $b['fecha_salida'] ?? $b['fechaSalida'] ?? null,
                    $b['guia'] ?? null,
                    $b['gestor_id'] ?? $b['gestorId'] ?? null,
                    $b['observaciones'] ?? null
                ]);
                $ids[] = (int)$db->lastInsertId();
            }
            $db->commit();
            jsonResponse(201, ['ids' => $ids, 'message' => count($ids) . ' registro(s) de baja creado(s)']);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(500, ['error' => $e->getMessage()]);
        }
        break;

    default:
        jsonResponse(405, ['error' => 'Metodo no permitido']);
    }
}
