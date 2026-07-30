<?php
// ============================================================
//  API ASIGNACIONES - CRUD completo
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

case 'GET':
    $id = getParam('id');

    if ($id) {
        $stmt = $db->prepare('SELECT * FROM asignaciones WHERE id = ?');
        $stmt->execute([$id]);
        $asig = $stmt->fetch();
        if (!$asig) jsonResponse(404, ['error' => 'Asignacion no encontrada']);
        jsonResponse(200, $asig);
    }

    $where = ['1=1'];
    $params = [];

    if ($v = getParam('estado')) { $where[] = 'a.estado = ?'; $params[] = $v; }
    if ($v = getParam('colaborador_id')) { $where[] = 'a.colaborador_id = ?'; $params[] = $v; }
    if ($v = getParam('activo_id')) { $where[] = 'a.activo_id = ?'; $params[] = $v; }
    if ($v = getParam('motivo')) { $where[] = 'a.motivo = ?'; $params[] = $v; }
    if ($v = getParam('pendiente_retorno')) { $where[] = 'a.pendiente_retorno = ?'; $params[] = $v; }
    if ($v = getParam('search')) {
        $where[] = '(a.colaborador_nombre LIKE ? OR a.serie_asignada LIKE ? OR a.ticket LIKE ? OR a.correo_colab LIKE ?)';
        $like = sanitizeLike($v);
        $params = array_merge($params, [$like, $like, $like, $like]);
    }

    $sql = 'SELECT a.* FROM asignaciones a WHERE ' . implode(' AND ', $where) . ' ORDER BY a.id DESC';

    $page = (int)getParam('page', 0);
    $limit = (int)getParam('limit', 0);
    if ($limit > 0) {
        $offset = $page > 0 ? ($page - 1) * $limit : 0;
        $sql .= " LIMIT $limit OFFSET $offset";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    $countStmt = $db->prepare('SELECT COUNT(*) as total FROM asignaciones a WHERE ' . implode(' AND ', $where));
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];

    jsonResponse(200, ['data' => $data, 'total' => (int)$total]);

case 'POST':
    $body = getRequestBody();

    // Soporte para insercion masiva
    $items = isset($body[0]) ? $body : [$body];
    $insertedIds = [];

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO asignaciones
            (activo_id, sitio_id, colaborador_id, gestor_id, reemplaza_asig_id,
             serie_asignada, colaborador_nombre, correo_colab, area, sede,
             tipo_dest, sitio_nombre, tipo_asignacion, motivo, uso_equipo, ticket,
             fecha_asignacion, fecha_retorno, fecha_fin_prestamo, jefe, acta_entrega,
             estado, estado_asignacion, pendiente_retorno, is_principal, observaciones)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

        foreach ($items as $b) {
            $stmt->execute([
                $b['activo_id'] ?? $b['activoId'] ?? 0,
                $b['sitio_id'] ?? $b['sitioId'] ?? null,
                $b['colaborador_id'] ?? $b['colaboradorId'] ?? null,
                $b['gestor_id'] ?? $b['gestorId'] ?? null,
                $b['reemplaza_asig_id'] ?? $b['reemplazaAsigId'] ?? null,
                $b['serie_asignada'] ?? $b['serieAsignada'] ?? null,
                $b['colaborador_nombre'] ?? $b['colaboradorNombre'] ?? null,
                $b['correo_colab'] ?? $b['correoColab'] ?? null,
                $b['area'] ?? null,
                $b['sede'] ?? null,
                $b['tipo_dest'] ?? $b['tipoDest'] ?? 'COLABORADOR',
                $b['sitio_nombre'] ?? $b['sitioNombre'] ?? null,
                $b['tipo_asignacion'] ?? $b['tipoAsignacion'] ?? null,
                $b['motivo'] ?? null,
                $b['uso_equipo'] ?? $b['usoEquipo'] ?? null,
                $b['ticket'] ?? null,
                $b['fecha_asignacion'] ?? $b['fechaAsignacion'] ?? date('Y-m-d H:i:s'),
                $b['fecha_retorno'] ?? $b['fechaRetorno'] ?? null,
                $b['fecha_fin_prestamo'] ?? $b['fechaFinPrestamo'] ?? null,
                $b['jefe'] ?? null,
                $b['acta_entrega'] ?? $b['actaEntrega'] ?? null,
                $b['estado'] ?? 'Vigente',
                $b['estado_asignacion'] ?? $b['estadoAsignacion'] ?? 'PENDIENTE',
                $b['pendiente_retorno'] ?? $b['pendienteRetorno'] ?? 0,
                $b['is_principal'] ?? $b['isPrincipal'] ?? 1,
                $b['observaciones'] ?? null
            ]);
            $insertedIds[] = (int)$db->lastInsertId();
        }

        $db->commit();
        jsonResponse(201, ['ids' => $insertedIds, 'message' => count($insertedIds) . ' asignacion(es) creada(s)']);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(500, ['error' => $e->getMessage()]);
    }
    break;

case 'PUT':
    $body = getRequestBody();
    $id = $body['id'] ?? getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    // Actualizacion flexible: solo campos que vienen
    $fields = [];
    $values = [];
    $allowed = [
        'estado', 'estado_asignacion', 'pendiente_retorno', 'fecha_retorno',
        'acta_entrega', 'observaciones', 'uso_equipo', 'motivo', 'ticket'
    ];

    foreach ($allowed as $f) {
        $camel = lcfirst(str_replace('_', '', ucwords($f, '_')));
        if (isset($body[$f])) { $fields[] = "$f = ?"; $values[] = $body[$f]; }
        elseif (isset($body[$camel])) { $fields[] = "$f = ?"; $values[] = $body[$camel]; }
    }

    if (empty($fields)) jsonResponse(400, ['error' => 'No hay campos para actualizar']);

    $values[] = $id;
    $stmt = $db->prepare('UPDATE asignaciones SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($values);

    jsonResponse(200, ['message' => 'Asignacion actualizada']);

case 'DELETE':
    $id = getParam('id');
    if (!$id) jsonResponse(400, ['error' => 'ID requerido']);

    // Anular (no eliminar fisicamente)
    $stmt = $db->prepare("UPDATE asignaciones SET estado = 'Devuelto', estado_asignacion = 'ANULADO' WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(200, ['message' => 'Asignacion anulada']);

default:
    jsonResponse(405, ['error' => 'Metodo no permitido']);
}
