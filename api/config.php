<?php
// ============================================================
//  CONFIGURACION DE BASE DE DATOS - App CMDDB
//  Compatible: XAMPP / MariaDB 10.x / MySQL 8.x
// ============================================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'BD_CMDB');
define('DB_USER', 'root');
define('DB_PASS', '');       // XAMPP por defecto no tiene password
define('DB_CHARSET', 'utf8mb4');

// Directorio para uploads (actas, documentos)
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10 MB

// CORS - permitir peticiones desde el frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Conexion PDO con conexion persistente (mejor performance: reusa la conexion MySQL)
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_PERSISTENT         => true,
            ]);
        } catch (PDOException $e) {
            jsonResponse(500, ['error' => 'Error de conexion: ' . $e->getMessage()]);
        }
    }
    return $pdo;
}

// Respuesta JSON estandar
function jsonResponse($code, $data) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Leer body JSON del request
function getRequestBody() {
    $body = file_get_contents('php://input');
    return json_decode($body, true) ?: [];
}

// Obtener parametro GET con default
function getParam($key, $default = null) {
    return isset($_GET[$key]) ? $_GET[$key] : $default;
}

// Sanitizar para LIKE (incluye la barra invertida, carácter de escape por defecto de LIKE)
function sanitizeLike($str) {
    return '%' . addcslashes($str, '\\%_') . '%';
}
