<?php
// ============================================================
//  API UPLOAD - Subida de archivos (actas, documentos)
// ============================================================
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['error' => 'Solo POST permitido']);
}

if (empty($_FILES['archivo'])) {
    jsonResponse(400, ['error' => 'No se recibio archivo']);
}

$file = $_FILES['archivo'];
$bitacoraId = $_POST['bitacora_id'] ?? null;
$categoria = $_POST['categoria'] ?? 'general'; // acta, documento, valorizacion
// Whitelist de categoria: evita path traversal (../../) al construir la ruta destino.
$catPermitidas = ['acta', 'documento', 'valorizacion', 'general'];
if (!in_array($categoria, $catPermitidas, true)) {
    $categoria = 'general';
}

// Validar tamano
if ($file['size'] > MAX_UPLOAD_SIZE) {
    jsonResponse(413, ['error' => 'Archivo demasiado grande (max ' . (MAX_UPLOAD_SIZE / 1024 / 1024) . ' MB)']);
}

// Validar tipo (por contenido) y derivar la extension de un mapa fijo MIME->ext.
// NUNCA usar la extension del nombre del cliente: un polyglot podria guardarse como .php.
$mimeExt = [
    'application/pdf' => 'pdf',
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
    'application/vnd.ms-excel' => 'xls',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
    'application/msword' => 'doc',
];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!isset($mimeExt[$mimeType])) {
    jsonResponse(415, ['error' => 'Tipo de archivo no permitido: ' . $mimeType]);
}

// Crear subdirectorio por categoria y fecha
$subDir = $categoria . '/' . date('Y/m');
$targetDir = UPLOAD_DIR . $subDir;
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

// Generar nombre unico (extension derivada del MIME validado, no del cliente)
$ext = $mimeExt[$mimeType];
$safeName = date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$targetPath = $targetDir . '/' . $safeName;
$relativePath = 'api/uploads/' . $subDir . '/' . $safeName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    jsonResponse(500, ['error' => 'Error al guardar archivo']);
}

// Si viene bitacora_id, registrar en bitacora_archivos
$archivoId = null;
if ($bitacoraId) {
    $db = getDB();
    $stmt = $db->prepare('INSERT INTO bitacora_archivos (bitacora_id, nombre_archivo, ruta_archivo, tipo_mime, tamano_bytes) VALUES (?,?,?,?,?)');
    $stmt->execute([
        $bitacoraId,
        $file['name'],
        $relativePath,
        $mimeType,
        $file['size']
    ]);
    $archivoId = (int)$db->lastInsertId();
}

jsonResponse(201, [
    'message' => 'Archivo subido correctamente',
    'archivo_id' => $archivoId,
    'nombre' => $file['name'],
    'ruta' => $relativePath,
    'tipo' => $mimeType,
    'tamano' => $file['size']
]);
