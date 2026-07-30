<?php
// ============================================================
//  API GESTORES - Login + CRUD
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$action = getParam('action');

// ── LOGIN ───────────────────────────────────────────────────
if ($action === 'login' && $method === 'POST') {
    $body = getRequestBody();
    $usuario = $body['usuario'] ?? '';
    $password = $body['password'] ?? '';

    $stmt = $db->prepare('SELECT * FROM gestores WHERE usuario = ? AND estado = ?');
    $stmt->execute([$usuario, 'Activo']);
    $gestor = $stmt->fetch();

    if (!$gestor) jsonResponse(401, ['error' => 'Usuario no encontrado']);

    // Verificar password (vacio = sin password como en XAMPP dev)
    if ($gestor['password'] !== '' && $gestor['password'] !== $password) {
        jsonResponse(401, ['error' => 'Contrasena incorrecta']);
    }

    // No enviar password al frontend
    unset($gestor['password']);
    jsonResponse(200, ['message' => 'Login exitoso', 'gestor' => $gestor]);
}

switch ($method) {

case 'GET':
    $id = getParam('id');

    if ($id) {
        $stmt = $db->prepare('SELECT id, nombre, email, rol, perfil, usuario, estado, created_at FROM gestores WHERE id = ?');
        $stmt->execute([$id]);
        $gestor = $stmt->fetch();
        if (!$gestor) jsonResponse(404, ['error' => 'Gestor no encontrado']);
        jsonResponse(200, $gestor);
    }

    $stmt = $db->query('SELECT id, nombre, email, rol, perfil, usuario, estado, created_at FROM gestores ORDER BY id');
    jsonResponse(200, ['data' => $stmt->fetchAll()]);

case 'POST':
    $body = getRequestBody();

    $stmt = $db->prepare('INSERT INTO gestores (nombre, email, rol, perfil, usuario, password, estado) VALUES (?,?,?,?,?,?,?)');
    $stmt->execute([
        $body['nombre'] ?? '',
        $body['email'] ?? '',
        $body['rol'] ?? 'Gestor',
        $body['perfil'] ?? 'Administrativo',
        $body['usuario'] ?? '',
        $body['password'] ?? '',
        $body['estado'] ?? 'Activo'
    ]);

    jsonResponse(201, ['id' => (int)$db->lastInsertId(), 'message' => 'Gestor creado']);

case 'PUT':
    $body = getRequestBody();
    $id = $body['id'] ?? getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE gestores SET nombre=?, email=?, rol=?, perfil=?, usuario=?, estado=? WHERE id=?');
    $stmt->execute([
        $body['nombre'] ?? '',
        $body['email'] ?? '',
        $body['rol'] ?? 'Gestor',
        $body['perfil'] ?? 'Administrativo',
        $body['usuario'] ?? '',
        $body['estado'] ?? 'Activo',
        $id
    ]);

    // Actualizar password solo si viene
    if (!empty($body['password'])) {
        $stmtP = $db->prepare('UPDATE gestores SET password = ? WHERE id = ?');
        $stmtP->execute([$body['password'], $id]);
    }

    jsonResponse(200, ['message' => 'Gestor actualizado']);

case 'DELETE':
    $id = getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare("UPDATE gestores SET estado = 'Inactivo' WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(200, ['message' => 'Gestor desactivado']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
