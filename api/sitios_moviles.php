<?php
// ============================================================
//  API SITIOS MOVILES
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $id = getParam('id');

    if ($id) {
        $stmt = $db->prepare('SELECT * FROM sitios_moviles WHERE id = ?');
        $stmt->execute([$id]);
        $sitio = $stmt->fetch();
        if (!$sitio) jsonResponse(404, ['error' => 'Sitio no encontrado']);
        jsonResponse(200, $sitio);
    }

    $where = ['1=1'];
    $params = [];

    if ($v = getParam('estado')) { $where[] = 'estado = ?'; $params[] = $v; }
    if ($v = getParam('sede')) { $where[] = 'sede = ?'; $params[] = $v; }
    if ($v = getParam('search')) {
        $where[] = '(codigo LIKE ? OR sede LIKE ? OR area LIKE ? OR piso LIKE ? OR ubicacion LIKE ?)';
        $like = sanitizeLike($v);
        $params = array_merge($params, [$like, $like, $like, $like, $like]);
    }

    $sql = 'SELECT * FROM sitios_moviles WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    jsonResponse(200, ['data' => $data, 'total' => count($data)]);

case 'POST':
    $body = getRequestBody();

    // Auto-generar codigo
    $stmtMax = $db->query("SELECT codigo FROM sitios_moviles ORDER BY id DESC LIMIT 1");
    $last = $stmtMax->fetch();
    $nextNum = 1;
    if ($last && preg_match('/SM-(\d+)/', $last['codigo'], $m)) {
        $nextNum = (int)$m[1] + 1;
    }
    $codigo = $body['codigo'] ?? ('SM-' . str_pad($nextNum, 5, '0', STR_PAD_LEFT));

    $stmt = $db->prepare('INSERT INTO sitios_moviles (codigo, sede, area, piso, ubicacion, estado, observacion)
        VALUES (?,?,?,?,?,?,?)');

    $stmt->execute([
        $codigo,
        $body['sede'] ?? null,
        $body['area'] ?? null,
        $body['piso'] ?? null,
        $body['ubicacion'] ?? null,
        $body['estado'] ?? 'Activo',
        $body['observacion'] ?? null
    ]);

    jsonResponse(201, ['id' => (int)$db->lastInsertId(), 'codigo' => $codigo, 'message' => 'Sitio creado']);

case 'PUT':
    $body = getRequestBody();
    $id = $body['id'] ?? getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE sitios_moviles SET sede=?, area=?, piso=?, ubicacion=?, estado=?, observacion=? WHERE id=?');
    $stmt->execute([
        $body['sede'] ?? null,
        $body['area'] ?? null,
        $body['piso'] ?? null,
        $body['ubicacion'] ?? null,
        $body['estado'] ?? 'Activo',
        $body['observacion'] ?? null,
        $id
    ]);

    jsonResponse(200, ['message' => 'Sitio actualizado']);

case 'DELETE':
    $id = getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('DELETE FROM sitios_moviles WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(200, ['message' => 'Sitio eliminado']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
