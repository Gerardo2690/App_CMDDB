<?php
// ============================================================
//  API DASHBOARD - Estadisticas generales
// ============================================================
require_once __DIR__ . '/config.php';
$db = getDB();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(405, ['error' => 'Solo GET permitido']);
}

$stats = [];

// Total activos por estado
$stmt = $db->query("SELECT estado, COUNT(*) as total FROM activos WHERE deleted_at IS NULL GROUP BY estado");
$stats['activos_por_estado'] = $stmt->fetchAll();

// Total activos
$stmt = $db->query("SELECT COUNT(*) as total FROM activos WHERE deleted_at IS NULL");
$stats['total_activos'] = (int)$stmt->fetch()['total'];

// Total series
$stmt = $db->query("SELECT COUNT(*) as total FROM series s JOIN activos a ON a.id = s.activo_id WHERE a.deleted_at IS NULL");
$stats['total_series'] = (int)$stmt->fetch()['total'];

// Total colaboradores activos
$stmt = $db->query("SELECT COUNT(*) as total FROM colaboradores WHERE estado = 'Activo' AND deleted_at IS NULL");
$stats['total_colaboradores'] = (int)$stmt->fetch()['total'];

// Asignaciones vigentes
$stmt = $db->query("SELECT COUNT(*) as total FROM asignaciones WHERE estado = 'Vigente'");
$stats['asignaciones_vigentes'] = (int)$stmt->fetch()['total'];

// Asignaciones por motivo
$stmt = $db->query("SELECT motivo, COUNT(*) as total FROM asignaciones GROUP BY motivo ORDER BY total DESC");
$stats['asignaciones_por_motivo'] = $stmt->fetchAll();

// Activos por tipo
$stmt = $db->query("SELECT tipo, COUNT(*) as total FROM activos WHERE deleted_at IS NULL GROUP BY tipo ORDER BY total DESC");
$stats['activos_por_tipo'] = $stmt->fetchAll();

// Activos por marca
$stmt = $db->query("SELECT marca, COUNT(*) as total FROM activos WHERE deleted_at IS NULL GROUP BY marca ORDER BY total DESC LIMIT 10");
$stats['activos_por_marca'] = $stmt->fetchAll();

// Activos por almacen
$stmt = $db->query("SELECT ubicacion, COUNT(*) as total FROM activos WHERE deleted_at IS NULL AND ubicacion IS NOT NULL GROUP BY ubicacion ORDER BY total DESC");
$stats['activos_por_almacen'] = $stmt->fetchAll();

// Bajas pendientes
$stmt = $db->query("SELECT COUNT(*) as total FROM bajas_pendientes");
$stats['bajas_pendientes'] = (int)$stmt->fetch()['total'];

// Repuestos disponibles
$stmt = $db->query("SELECT COUNT(*) as total FROM repuestos WHERE estado = 'Disponible' AND deleted_at IS NULL");
$stats['repuestos_disponibles'] = (int)$stmt->fetch()['total'];

// Mantenimientos en proceso
$stmt = $db->query("SELECT COUNT(*) as total FROM mantenimientos WHERE estado = 'En Proceso'");
$stats['mantenimientos_en_proceso'] = (int)$stmt->fetch()['total'];

// Ultimos movimientos (bitacora)
$stmt = $db->query("SELECT * FROM bitacora_movimientos ORDER BY id DESC LIMIT 10");
$stats['ultimos_movimientos'] = $stmt->fetchAll();

jsonResponse(200, $stats);
