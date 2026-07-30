<?php
// ============================================================
//  API TIPO EQUIPOS (mapa tipo -> equipo)
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $tipo = getParam('tipo');

    if ($tipo) {
        $stmt = $db->prepare('SELECT * FROM tipo_equipos WHERE tipo = ? ORDER BY equipo');
        $stmt->execute([$tipo]);
        jsonResponse(200, ['tipo' => $tipo, 'equipos' => array_column($stmt->fetchAll(), 'equipo')]);
    }

    // Retornar todos agrupados
    $stmt = $db->query('SELECT * FROM tipo_equipos ORDER BY tipo, equipo');
    $rows = $stmt->fetchAll();
    $grouped = [];
    foreach ($rows as $r) {
        $grouped[$r['tipo']][] = $r['equipo'];
    }
    jsonResponse(200, $grouped);

case 'POST':
    $body = getRequestBody();
    $tipo = $body['tipo'] ?? null;
    $equipo = $body['equipo'] ?? null;
    if (!$tipo || !$equipo) jsonResponse(400, ['error' => 'tipo y equipo requeridos']);

    $stmt = $db->prepare('INSERT IGNORE INTO tipo_equipos (tipo, equipo) VALUES (?, ?)');
    $stmt->execute([$tipo, $equipo]);

    jsonResponse(201, ['id' => (int)$db->lastInsertId(), 'message' => 'Equipo agregado']);

case 'DELETE':
    $tipo = getParam('tipo');
    $equipo = getParam('equipo');
    if (!$tipo || !$equipo) jsonResponse(400, ['error' => 'tipo y equipo requeridos']);

    $stmt = $db->prepare('DELETE FROM tipo_equipos WHERE tipo = ? AND equipo = ?');
    $stmt->execute([$tipo, $equipo]);
    jsonResponse(200, ['message' => 'Equipo eliminado']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
