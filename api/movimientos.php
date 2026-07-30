<?php
// ============================================================
//  API MOVIMIENTOS (log de actividad)
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $where = ['1=1'];
    $params = [];

    if ($v = getParam('tipo')) { $where[] = 'tipo = ?'; $params[] = $v; }
    if ($v = getParam('gestor_id')) { $where[] = 'gestor_id = ?'; $params[] = $v; }
    if ($v = getParam('fecha')) { $where[] = 'fecha = ?'; $params[] = $v; }
    if ($v = getParam('search')) {
        $where[] = '(tipo LIKE ? OR detalle LIKE ?)';
        $like = sanitizeLike($v);
        $params = array_merge($params, [$like, $like]);
    }

    $sql = 'SELECT * FROM movimientos WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC';

    $page = (int)getParam('page', 0);
    $limit = (int)getParam('limit', 0);
    if ($limit > 0) {
        $offset = $page > 0 ? ($page - 1) * $limit : 0;
        $sql .= " LIMIT $limit OFFSET $offset";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    $countStmt = $db->prepare('SELECT COUNT(*) as total FROM movimientos WHERE ' . implode(' AND ', $where));
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];

    jsonResponse(200, ['data' => $data, 'total' => (int)$total]);

case 'POST':
    $body = getRequestBody();

    $items = isset($body[0]) ? $body : [$body];
    $ids = [];

    $stmt = $db->prepare('INSERT INTO movimientos (gestor_id, tipo, detalle, fecha) VALUES (?,?,?,?)');
    foreach ($items as $b) {
        $stmt->execute([
            $b['gestor_id'] ?? $b['gestorId'] ?? null,
            $b['tipo'] ?? '',
            $b['detalle'] ?? null,
            $b['fecha'] ?? date('Y-m-d')
        ]);
        $ids[] = (int)$db->lastInsertId();
    }

    jsonResponse(201, ['ids' => $ids, 'message' => count($ids) . ' movimiento(s) registrado(s)']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
