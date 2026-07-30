<?php
// ============================================================
//  API TIENDAS / SEDES
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $id = getParam('id');

    if ($id) {
        $stmt = $db->prepare('SELECT * FROM tiendas WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $tienda = $stmt->fetch();
        if (!$tienda) jsonResponse(404, ['error' => 'Tienda no encontrada']);
        jsonResponse(200, $tienda);
    }

    $where = ['deleted_at IS NULL'];
    $params = [];

    if ($v = getParam('estado')) { $where[] = 'estado = ?'; $params[] = $v; }
    if ($v = getParam('tipo_local')) { $where[] = 'tipo_local = ?'; $params[] = $v; }
    if ($v = getParam('region')) { $where[] = 'region = ?'; $params[] = $v; }
    if ($v = getParam('search')) {
        $where[] = '(codigo LIKE ? OR nombre LIKE ? OR distrito LIKE ? OR responsable LIKE ?)';
        $like = sanitizeLike($v);
        $params = array_merge($params, [$like, $like, $like, $like]);
    }

    $sql = 'SELECT * FROM tiendas WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    jsonResponse(200, ['data' => $data, 'total' => count($data)]);

case 'POST':
    $body = getRequestBody();

    // Auto-generar codigo
    $stmtMax = $db->query("SELECT codigo FROM tiendas ORDER BY id DESC LIMIT 1");
    $last = $stmtMax->fetch();
    $nextNum = 1;
    if ($last && preg_match('/TDA-(\d+)/', $last['codigo'], $m)) {
        $nextNum = (int)$m[1] + 1;
    }
    $codigo = $body['codigo'] ?? ('TDA-' . str_pad($nextNum, 5, '0', STR_PAD_LEFT));

    $stmt = $db->prepare('INSERT INTO tiendas
        (codigo, nombre, tipo_local, estado, region, departamento, provincia, distrito,
         direccion, responsable, telefono_responsable, email_responsable, telefono,
         fecha_apertura, observaciones)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

    $stmt->execute([
        $codigo,
        $body['nombre'] ?? '',
        $body['tipo_local'] ?? $body['tipoLocal'] ?? null,
        $body['estado'] ?? 'Activa',
        $body['region'] ?? null,
        $body['departamento'] ?? null,
        $body['provincia'] ?? null,
        $body['distrito'] ?? null,
        $body['direccion'] ?? null,
        $body['responsable'] ?? null,
        $body['telefono_responsable'] ?? $body['telefonoResponsable'] ?? null,
        $body['email_responsable'] ?? $body['emailResponsable'] ?? null,
        $body['telefono'] ?? null,
        $body['fecha_apertura'] ?? $body['fechaApertura'] ?? null,
        $body['observaciones'] ?? null
    ]);

    jsonResponse(201, ['id' => (int)$db->lastInsertId(), 'codigo' => $codigo, 'message' => 'Tienda creada']);

case 'PUT':
    $body = getRequestBody();
    $id = $body['id'] ?? getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE tiendas SET
        nombre=?, tipo_local=?, estado=?, region=?, departamento=?, provincia=?, distrito=?,
        direccion=?, responsable=?, telefono_responsable=?, email_responsable=?, telefono=?,
        fecha_apertura=?, observaciones=?
        WHERE id=?');

    $stmt->execute([
        $body['nombre'] ?? '',
        $body['tipo_local'] ?? $body['tipoLocal'] ?? null,
        $body['estado'] ?? 'Activa',
        $body['region'] ?? null,
        $body['departamento'] ?? null,
        $body['provincia'] ?? null,
        $body['distrito'] ?? null,
        $body['direccion'] ?? null,
        $body['responsable'] ?? null,
        $body['telefono_responsable'] ?? $body['telefonoResponsable'] ?? null,
        $body['email_responsable'] ?? $body['emailResponsable'] ?? null,
        $body['telefono'] ?? null,
        $body['fecha_apertura'] ?? $body['fechaApertura'] ?? null,
        $body['observaciones'] ?? null,
        $id
    ]);

    jsonResponse(200, ['message' => 'Tienda actualizada']);

case 'DELETE':
    $id = getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE tiendas SET deleted_at = NOW() WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(200, ['message' => 'Tienda eliminada']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
