<?php
// ============================================================
//  API ASIGNACIONES DE REPUESTOS
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $where = ['1=1'];
    $params = [];

    if ($v = getParam('estado')) { $where[] = 'ar.estado = ?'; $params[] = $v; }
    if ($v = getParam('repuesto_id')) { $where[] = 'ar.repuesto_id = ?'; $params[] = $v; }
    if ($v = getParam('activo_id')) { $where[] = 'ar.activo_id = ?'; $params[] = $v; }

    $sql = 'SELECT ar.*, r.codigo as rep_codigo, r.equipo as rep_equipo, r.serie as rep_serie
            FROM asignaciones_rep ar
            LEFT JOIN repuestos r ON r.id = ar.repuesto_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY ar.id DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(200, ['data' => $stmt->fetchAll()]);

case 'POST':
    $body = getRequestBody();

    $stmt = $db->prepare('INSERT INTO asignaciones_rep
        (repuesto_id, activo_id, colaborador_id, gestor_id, ticket,
         fecha_asignacion, estado, observaciones)
        VALUES (?,?,?,?,?,?,?,?)');

    $stmt->execute([
        $body['repuesto_id'] ?? $body['repuestoId'] ?? 0,
        $body['activo_id'] ?? $body['activoId'] ?? null,
        $body['colaborador_id'] ?? $body['colaboradorId'] ?? null,
        $body['gestor_id'] ?? $body['gestorId'] ?? null,
        $body['ticket'] ?? null,
        $body['fecha_asignacion'] ?? $body['fechaAsignacion'] ?? date('Y-m-d H:i:s'),
        $body['estado'] ?? 'Vigente',
        $body['observaciones'] ?? null
    ]);

    jsonResponse(201, ['id' => (int)$db->lastInsertId(), 'message' => 'Asignacion de repuesto creada']);

case 'PUT':
    $body = getRequestBody();
    $id = $body['id'] ?? getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $fields = [];
    $values = [];
    $allowed = ['estado', 'fecha_retorno', 'observaciones'];

    foreach ($allowed as $f) {
        $camel = lcfirst(str_replace('_', '', ucwords($f, '_')));
        if (isset($body[$f])) { $fields[] = "$f = ?"; $values[] = $body[$f]; }
        elseif (isset($body[$camel])) { $fields[] = "$f = ?"; $values[] = $body[$camel]; }
    }

    if (empty($fields)) jsonResponse(400, ['error' => 'No hay campos para actualizar']);

    $values[] = $id;
    $stmt = $db->prepare('UPDATE asignaciones_rep SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($values);

    jsonResponse(200, ['message' => 'Asignacion de repuesto actualizada']);

case 'DELETE':
    $id = getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('DELETE FROM asignaciones_rep WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(200, ['message' => 'Asignacion de repuesto eliminada']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
