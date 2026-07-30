<?php
// ============================================================
//  API REPUESTOS - CRUD completo
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $id = getParam('id');

    if ($id) {
        $stmt = $db->prepare('SELECT * FROM repuestos WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $rep = $stmt->fetch();
        if (!$rep) jsonResponse(404, ['error' => 'Repuesto no encontrado']);
        jsonResponse(200, $rep);
    }

    $where = ['deleted_at IS NULL'];
    $params = [];

    if ($v = getParam('equipo')) { $where[] = 'equipo = ?'; $params[] = $v; }
    if ($v = getParam('marca')) { $where[] = 'marca = ?'; $params[] = $v; }
    if ($v = getParam('estado')) { $where[] = 'estado = ?'; $params[] = $v; }
    if ($v = getParam('almacen')) { $where[] = 'almacen = ?'; $params[] = $v; }
    if ($v = getParam('search')) {
        $where[] = '(codigo LIKE ? OR equipo LIKE ? OR marca LIKE ? OR modelo LIKE ? OR serie LIKE ? OR part_number LIKE ?)';
        $like = sanitizeLike($v);
        $params = array_merge($params, [$like, $like, $like, $like, $like, $like]);
    }

    $sql = 'SELECT * FROM repuestos WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC';

    $page = (int)getParam('page', 0);
    $limit = (int)getParam('limit', 0);
    if ($limit > 0) {
        $offset = $page > 0 ? ($page - 1) * $limit : 0;
        $sql .= " LIMIT $limit OFFSET $offset";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    $countStmt = $db->prepare('SELECT COUNT(*) as total FROM repuestos WHERE ' . implode(' AND ', $where));
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];

    jsonResponse(200, ['data' => $data, 'total' => (int)$total]);

case 'POST':
    $body = getRequestBody();

    // Soporte masivo
    $items = isset($body[0]) ? $body : [$body];
    $insertedIds = [];

    $db->beginTransaction();
    try {
        // Generar codigo auto (REP-XXXXX)
        $stmtMax = $db->query("SELECT codigo FROM repuestos ORDER BY id DESC LIMIT 1");
        $last = $stmtMax->fetch();
        $nextNum = 1;
        if ($last && preg_match('/REP-(\d+)/', $last['codigo'], $m)) {
            $nextNum = (int)$m[1] + 1;
        }

        $stmt = $db->prepare('INSERT INTO repuestos
            (codigo, tipo, equipo, marca, modelo, serie, part_number, sku,
             n_documento, tipo_documento, almacen, estado, observaciones, fecha_ingreso)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

        foreach ($items as $b) {
            $codigo = $b['codigo'] ?? ('REP-' . str_pad($nextNum++, 5, '0', STR_PAD_LEFT));
            $stmt->execute([
                $codigo,
                $b['tipo'] ?? 'REPUESTO',
                $b['equipo'] ?? '',
                $b['marca'] ?? null,
                $b['modelo'] ?? null,
                $b['serie'] ?? null,
                $b['part_number'] ?? $b['partNumber'] ?? null,
                $b['sku'] ?? null,
                $b['n_documento'] ?? $b['nDocumento'] ?? null,
                $b['tipo_documento'] ?? $b['tipoDocumento'] ?? null,
                $b['almacen'] ?? null,
                $b['estado'] ?? 'Disponible',
                $b['observaciones'] ?? null,
                $b['fecha_ingreso'] ?? $b['fechaIngreso'] ?? date('Y-m-d')
            ]);
            $insertedIds[] = (int)$db->lastInsertId();
        }

        $db->commit();
        jsonResponse(201, ['ids' => $insertedIds, 'message' => count($insertedIds) . ' repuesto(s) creado(s)']);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(500, ['error' => $e->getMessage()]);
    }
    break;

case 'PUT':
    $body = getRequestBody();
    $id = $body['id'] ?? getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE repuestos SET
        equipo=?, marca=?, modelo=?, serie=?, part_number=?, sku=?,
        n_documento=?, tipo_documento=?, almacen=?, activo_asignado_id=?,
        estado=?, observaciones=?, fecha_ingreso=?
        WHERE id=?');

    $stmt->execute([
        $body['equipo'] ?? '',
        $body['marca'] ?? null,
        $body['modelo'] ?? null,
        $body['serie'] ?? null,
        $body['part_number'] ?? $body['partNumber'] ?? null,
        $body['sku'] ?? null,
        $body['n_documento'] ?? $body['nDocumento'] ?? null,
        $body['tipo_documento'] ?? $body['tipoDocumento'] ?? null,
        $body['almacen'] ?? null,
        $body['activo_asignado_id'] ?? $body['activoAsignadoId'] ?? null,
        $body['estado'] ?? 'Disponible',
        $body['observaciones'] ?? null,
        $body['fecha_ingreso'] ?? $body['fechaIngreso'] ?? null,
        $id
    ]);

    jsonResponse(200, ['message' => 'Repuesto actualizado']);

case 'DELETE':
    $id = getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE repuestos SET deleted_at = NOW() WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(200, ['message' => 'Repuesto eliminado']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
