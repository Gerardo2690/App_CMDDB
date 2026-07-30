<?php
// ============================================================
//  API COLABORADORES - CRUD completo
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $id = getParam('id');

    if ($id) {
        $stmt = $db->prepare('SELECT * FROM colaboradores WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $colab = $stmt->fetch();
        if (!$colab) jsonResponse(404, ['error' => 'Colaborador no encontrado']);
        jsonResponse(200, $colab);
    }

    $where = ['deleted_at IS NULL'];
    $params = [];

    if ($v = getParam('estado')) { $where[] = 'estado = ?'; $params[] = $v; }
    if ($v = getParam('area')) { $where[] = 'area = ?'; $params[] = $v; }
    if ($v = getParam('modalidad')) { $where[] = 'modalidad_contratacion = ?'; $params[] = $v; }
    if ($v = getParam('search')) {
        $where[] = '(nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? OR email LIKE ? OR CONCAT(nombre, " ", apellido) LIKE ?)';
        $like = sanitizeLike($v);
        $params = array_merge($params, [$like, $like, $like, $like, $like]);
    }

    $sql = 'SELECT * FROM colaboradores WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC';

    $page = (int)getParam('page', 0);
    $limit = (int)getParam('limit', 0);
    if ($limit > 0) {
        $offset = $page > 0 ? ($page - 1) * $limit : 0;
        $sql .= " LIMIT $limit OFFSET $offset";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    $countStmt = $db->prepare('SELECT COUNT(*) as total FROM colaboradores WHERE ' . implode(' AND ', $where));
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];

    jsonResponse(200, ['data' => $data, 'total' => (int)$total]);

case 'POST':
    $body = getRequestBody();

    // Validar duplicados
    if (!empty($body['dni'])) {
        $check = $db->prepare('SELECT id FROM colaboradores WHERE dni = ? AND deleted_at IS NULL');
        $check->execute([$body['dni']]);
        if ($check->fetch()) jsonResponse(409, ['error' => 'DNI ya registrado']);
    }
    if (!empty($body['email'])) {
        $check = $db->prepare('SELECT id FROM colaboradores WHERE email = ? AND deleted_at IS NULL');
        $check->execute([$body['email']]);
        if ($check->fetch()) jsonResponse(409, ['error' => 'Email ya registrado']);
    }

    $stmt = $db->prepare('INSERT INTO colaboradores
        (nombre, apellido, dni, email, telefono, modalidad_contratacion, area,
         vicepresidencia, centro_costo, ubicacion_fisica, puesto, tipo_puesto,
         correo_supervisor, fecha_ingreso, estado, fecha_cese)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

    $stmt->execute([
        $body['nombre'] ?? '',
        $body['apellido'] ?? '',
        $body['dni'] ?? null,
        $body['email'] ?? null,
        $body['telefono'] ?? null,
        $body['modalidad_contratacion'] ?? $body['modalidadContratacion'] ?? null,
        $body['area'] ?? null,
        $body['vicepresidencia'] ?? null,
        $body['centro_costo'] ?? $body['centroCosto'] ?? null,
        $body['ubicacion_fisica'] ?? $body['ubicacionFisica'] ?? null,
        $body['puesto'] ?? null,
        $body['tipo_puesto'] ?? $body['tipoPuesto'] ?? null,
        $body['correo_supervisor'] ?? $body['correoSupervisor'] ?? null,
        $body['fecha_ingreso'] ?? $body['fechaIngreso'] ?? null,
        $body['estado'] ?? 'Activo',
        $body['fecha_cese'] ?? $body['fechaCese'] ?? null
    ]);

    jsonResponse(201, ['id' => (int)$db->lastInsertId(), 'message' => 'Colaborador creado']);

case 'PUT':
    $body = getRequestBody();
    $id = $body['id'] ?? getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE colaboradores SET
        nombre=?, apellido=?, dni=?, email=?, telefono=?, modalidad_contratacion=?, area=?,
        vicepresidencia=?, centro_costo=?, ubicacion_fisica=?, puesto=?, tipo_puesto=?,
        correo_supervisor=?, fecha_ingreso=?, estado=?, fecha_cese=?
        WHERE id=?');

    $stmt->execute([
        $body['nombre'] ?? '',
        $body['apellido'] ?? '',
        $body['dni'] ?? null,
        $body['email'] ?? null,
        $body['telefono'] ?? null,
        $body['modalidad_contratacion'] ?? $body['modalidadContratacion'] ?? null,
        $body['area'] ?? null,
        $body['vicepresidencia'] ?? null,
        $body['centro_costo'] ?? $body['centroCosto'] ?? null,
        $body['ubicacion_fisica'] ?? $body['ubicacionFisica'] ?? null,
        $body['puesto'] ?? null,
        $body['tipo_puesto'] ?? $body['tipoPuesto'] ?? null,
        $body['correo_supervisor'] ?? $body['correoSupervisor'] ?? null,
        $body['fecha_ingreso'] ?? $body['fechaIngreso'] ?? null,
        $body['estado'] ?? 'Activo',
        $body['fecha_cese'] ?? $body['fechaCese'] ?? null,
        $id
    ]);

    jsonResponse(200, ['message' => 'Colaborador actualizado']);

case 'DELETE':
    $id = getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    $stmt = $db->prepare('UPDATE colaboradores SET deleted_at = NOW() WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(200, ['message' => 'Colaborador eliminado']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
