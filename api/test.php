<?php
// ============================================================
//  TEST DE CONEXION - Verificar que todo funciona
//  Acceder desde: http://localhost/App_CMDDB/api/test.php
// ============================================================
require_once __DIR__ . '/config.php';

echo "<h1>Test de Conexion - App CMDDB</h1>";

try {
    $db = getDB();
    echo "<p style='color:green'>&#10004; Conexion a MySQL exitosa</p>";

    // Verificar tablas
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "<p>Tablas encontradas: <strong>" . count($tables) . "</strong></p>";
    echo "<ul>";
    foreach ($tables as $t) {
        $countStmt = $db->query("SELECT COUNT(*) FROM `$t`");
        $count = $countStmt->fetchColumn();
        echo "<li><strong>$t</strong> — $count registro(s)</li>";
    }
    echo "</ul>";

    // Verificar catalogos
    $stmt = $db->query("SELECT categoria, COUNT(*) as total FROM catalogos WHERE activo = 1 GROUP BY categoria ORDER BY categoria");
    $cats = $stmt->fetchAll();
    echo "<h2>Catalogos</h2><ul>";
    foreach ($cats as $c) {
        echo "<li><strong>{$c['categoria']}</strong> — {$c['total']} valores</li>";
    }
    echo "</ul>";

    echo "<p style='color:green; font-size:18px'>&#10004; <strong>Todo OK - API lista para usar</strong></p>";

} catch (Exception $e) {
    echo "<p style='color:red'>&#10008; Error: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<h3>Pasos para solucionar:</h3>";
    echo "<ol>";
    echo "<li>Verificar que XAMPP (Apache + MySQL) este ejecutandose</li>";
    echo "<li>Importar <code>BD_CMDB.sql</code> en phpMyAdmin (http://localhost/phpmyadmin)</li>";
    echo "<li>Verificar usuario/password en <code>api/config.php</code></li>";
    echo "</ol>";
}
