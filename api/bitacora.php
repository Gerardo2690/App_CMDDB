<?php
// ============================================================
//  API BITACORA DE MOVIMIENTOS
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $id = getParam('id');

    if ($id) {
        $stmt = $db->prepare('SELECT * FROM bitacora_movimientos WHERE id = ?');
        $stmt->execute([$id]);
        $bit = $stmt->fetch();
        if (!$bit) jsonResponse(404, ['error' => 'Registro no encontrado']);

        // Cargar archivos adjuntos
        $stmtA = $db->prepare('SELECT * FROM bitacora_archivos WHERE bitacora_id = ?');
        $stmtA->execute([$id]);
        $bit['archivos'] = $stmtA->fetchAll();

        jsonResponse(200, $bit);
    }

    $where = ['1=1'];
    $params = [];

    if ($v = getParam('movimiento')) { $where[] = 'movimiento = ?'; $params[] = $v; }
    if ($v = getParam('ticket')) { $where[] = 'ticket = ?'; $params[] = $v; }
    if ($v = getParam('serie')) { $where[] = 'serie = ?'; $params[] = $v; }
    if ($v = getParam('activo_id')) { $where[] = 'activo_id = ?'; $params[] = $v; }
    if ($v = getParam('search')) {
        $where[] = '(serie LIKE ? OR ticket LIKE ? OR modelo LIKE ? OR colaborador_nombre LIKE ? OR motivo LIKE ?)';
        $like = sanitizeLike($v);
        $params = array_merge($params, [$like, $like, $like, $like, $like]);
    }

    $sql = 'SELECT * FROM bitacora_movimientos WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC';

    $page = (int)getParam('page', 0);
    $limit = (int)getParam('limit', 0);
    if ($limit > 0) {
        $offset = $page > 0 ? ($page - 1) * $limit : 0;
        $sql .= " LIMIT $limit OFFSET $offset";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    $countStmt = $db->prepare('SELECT COUNT(*) as total FROM bitacora_movimientos WHERE ' . implode(' AND ', $where));
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];

    jsonResponse(200, ['data' => $data, 'total' => (int)$total]);

case 'POST':
    $body = getRequestBody();

    $items = isset($body[0]) ? $body : [$body];
    $insertedIds = [];

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO bitacora_movimientos
            (activo_id, gestor_id, movimiento, almacen, tipo_equipo, equipo, marca, modelo,
             serie, cod_inv, motivo, ticket, colaborador_nombre, correo_colab,
             estado_asignacion, acta_correlativo, acta_ruta, fecha)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

        foreach ($items as $b) {
            $stmt->execute([
                $b['activo_id'] ?? $b['activoId'] ?? null,
                $b['gestor_id'] ?? $b['gestorId'] ?? null,
                $b['movimiento'] ?? '',
                $b['almacen'] ?? null,
                $b['tipo_equipo'] ?? $b['tipoEquipo'] ?? null,
                $b['equipo'] ?? null,
                $b['marca'] ?? null,
                $b['modelo'] ?? null,
                $b['serie'] ?? null,
                $b['cod_inv'] ?? $b['codInv'] ?? null,
                $b['motivo'] ?? null,
                $b['ticket'] ?? null,
                $b['colaborador_nombre'] ?? $b['colaboradorNombre'] ?? null,
                $b['correo_colab'] ?? $b['correoColab'] ?? null,
                $b['estado_asignacion'] ?? $b['estadoAsignacion'] ?? 'PENDIENTE',
                $b['acta_correlativo'] ?? $b['actaCorrelativo'] ?? null,
                $b['acta_ruta'] ?? $b['actaRuta'] ?? null,
                $b['fecha'] ?? date('Y-m-d H:i:s')
            ]);
            $insertedIds[] = (int)$db->lastInsertId();
        }

        $db->commit();
        jsonResponse(201, ['ids' => $insertedIds, 'message' => count($insertedIds) . ' registro(s) creado(s)']);
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
    $allowed = ['estado_asignacion', 'acta_correlativo', 'acta_ruta', 'motivo'];

    foreach ($allowed as $f) {
        $camel = lcfirst(str_replace('_', '', ucwords($f, '_')));
        if (isset($body[$f])) { $fields[] = "$f = ?"; $values[] = $body[$f]; }
        elseif (isset($body[$camel])) { $fields[] = "$f = ?"; $values[] = $body[$camel]; }
    }

    if (empty($fields)) jsonResponse(400, ['error' => 'No hay campos para actualizar']);

    $values[] = $id;
    $stmt = $db->prepare('UPDATE bitacora_movimientos SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($values);

    jsonResponse(200, ['message' => 'Registro actualizado']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
