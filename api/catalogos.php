<?php
// ============================================================
//  API CATALOGOS - Parametros del sistema
//  Reemplaza DB.getConfig() / DB.setConfig()
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $categoria = getParam('categoria');

    if ($categoria) {
        // Retornar valores de una categoria especifica
        $stmt = $db->prepare('SELECT valor, orden FROM catalogos WHERE categoria = ? AND activo = 1 ORDER BY orden, valor');
        $stmt->execute([$categoria]);
        $rows = $stmt->fetchAll();
        $valores = array_column($rows, 'valor');
        jsonResponse(200, ['categoria' => $categoria, 'valores' => $valores]);
    }

    // Retornar TODOS los catalogos agrupados (para carga inicial del frontend)
    $stmt = $db->query('SELECT categoria, valor, orden FROM catalogos WHERE activo = 1 ORDER BY categoria, orden, valor');
    $rows = $stmt->fetchAll();
    $grouped = [];
    foreach ($rows as $r) {
        $grouped[$r['categoria']][] = $r['valor'];
    }
    jsonResponse(200, $grouped);

case 'POST':
    $body = getRequestBody();
    $categoria = $body['categoria'] ?? null;
    $valor = $body['valor'] ?? null;
    if (!$categoria || !$valor) jsonResponse(400, ['error' => 'categoria y valor requeridos']);

    // Obtener siguiente orden
    $stmtOrd = $db->prepare('SELECT MAX(orden) as mx FROM catalogos WHERE categoria = ?');
    $stmtOrd->execute([$categoria]);
    $nextOrd = ($stmtOrd->fetch()['mx'] ?? 0) + 1;

    $stmt = $db->prepare('INSERT INTO catalogos (categoria, valor, orden) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE activo = 1');
    $stmt->execute([$categoria, $valor, $nextOrd]);

    jsonResponse(201, ['message' => 'Valor agregado', 'id' => (int)$db->lastInsertId()]);

case 'PUT':
    $body = getRequestBody();
    $categoria = $body['categoria'] ?? null;
    $valorViejo = $body['valor_viejo'] ?? $body['valorViejo'] ?? null;
    $valorNuevo = $body['valor_nuevo'] ?? $body['valorNuevo'] ?? null;

    if (!$categoria || !$valorViejo || !$valorNuevo) {
        jsonResponse(400, ['error' => 'categoria, valor_viejo y valor_nuevo requeridos']);
    }

    $stmt = $db->prepare('UPDATE catalogos SET valor = ? WHERE categoria = ? AND valor = ?');
    $stmt->execute([$valorNuevo, $categoria, $valorViejo]);

    jsonResponse(200, ['message' => 'Valor actualizado']);

case 'DELETE':
    $categoria = getParam('categoria');
    $valor = getParam('valor');
    if (!$categoria || !$valor) jsonResponse(400, ['error' => 'categoria y valor requeridos']);

    // Soft delete (desactivar)
    $stmt = $db->prepare('UPDATE catalogos SET activo = 0 WHERE categoria = ? AND valor = ?');
    $stmt->execute([$categoria, $valor]);

    jsonResponse(200, ['message' => 'Valor eliminado']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
