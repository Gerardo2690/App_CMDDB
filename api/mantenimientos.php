<?php
// ============================================================
//  API MANTENIMIENTOS
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $id = getParam('id');

    if ($id) {
        $stmt = $db->prepare('SELECT * FROM mantenimientos WHERE id = ?');
        $stmt->execute([$id]);
        $mant = $stmt->fetch();
        if (!$mant) jsonResponse(404, ['error' => 'Mantenimiento no encontrado']);
        jsonResponse(200, $mant);
    }

    $where = ['1=1'];
    $params = [];

    if ($v = getParam('estado')) { $where[] = 'estado = ?'; $params[] = $v; }
    if ($v = getParam('tipo')) { $where[] = 'tipo = ?'; $params[] = $v; }
    if ($v = getParam('activo_id')) { $where[] = 'activo_id = ?'; $params[] = $v; }
    if ($v = getParam('search')) {
        $where[] = '(serie LIKE ? OR ticket LIKE ? OR tecnico LIKE ? OR descripcion LIKE ?)';
        $like = sanitizeLike($v);
        $params = array_merge($params, [$like, $like, $like, $like]);
    }

    $sql = 'SELECT * FROM mantenimientos WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    jsonResponse(200, ['data' => $data, 'total' => count($data)]);

case 'POST':
    $body = getRequestBody();

    $stmt = $db->prepare('INSERT INTO mantenimientos
        (activo_id, gestor_id, tipo, serie, ticket, tecnico, parte_afectada,
         descripcion, fecha_inicio, fecha_fin, estado, costo, observaciones)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');

    $stmt->execute([
        $body['activo_id'] ?? $body['activoId'] ?? 0,
        $body['gestor_id'] ?? $body['gestorId'] ?? null,
        $body['tipo'] ?? 'CORRECTIVO',
        $body['serie'] ?? null,
        $body['ticket'] ?? null,
        $body['tecnico'] ?? null,
        $body['parte_afectada'] ?? $body['parteAfectada'] ?? null,
        $body['descripcion'] ?? null,
        $body['fecha_inicio'] ?? $body['fechaInicio'] ?? date('Y-m-d'),
        $body['fecha_fin'] ?? $body['fechaFin'] ?? null,
        $body['estado'] ?? 'En Proceso',
        $body['costo'] ?? 0,
        $body['observaciones'] ?? null
    ]);

    jsonResponse(201, ['id' => (int)$db->lastInsertId(), 'message' => 'Mantenimiento creado']);

case 'PUT':
    $body = getRequestBody();
    $id = $body['id'] ?? getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE mantenimientos SET
        tipo=?, serie=?, ticket=?, tecnico=?, parte_afectada=?,
        descripcion=?, fecha_inicio=?, fecha_fin=?, estado=?, costo=?, observaciones=?
        WHERE id=?');

    $stmt->execute([
        $body['tipo'] ?? 'CORRECTIVO',
        $body['serie'] ?? null,
        $body['ticket'] ?? null,
        $body['tecnico'] ?? null,
        $body['parte_afectada'] ?? $body['parteAfectada'] ?? null,
        $body['descripcion'] ?? null,
        $body['fecha_inicio'] ?? $body['fechaInicio'] ?? null,
        $body['fecha_fin'] ?? $body['fechaFin'] ?? null,
        $body['estado'] ?? 'En Proceso',
        $body['costo'] ?? 0,
        $body['observaciones'] ?? null,
        $id
    ]);

    jsonResponse(200, ['message' => 'Mantenimiento actualizado']);

case 'DELETE':
    $id = getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('DELETE FROM mantenimientos WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(200, ['message' => 'Mantenimiento eliminado']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
