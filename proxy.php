<?php
// =====================================================
// NEMESIS AI PROXY — ИСПРАВЛЕННАЯ ВЕРСИЯ
// =====================================================

// Разрешаем CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// === ОБРАБОТКА OPTIONS (preflight) ===
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// === ПРОВЕРКА METHOD ===
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// === ПОЛУЧАЕМ ДАННЫЕ ===
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// === API КЛЮЧ ===
$apiKey = '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';

// === ОТПРАВКА ЗАПРОСА К OPENROUTER ===
$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey,
    'HTTP-Referer: https://nemesisx.fun',
    'X-Title: Nemesis AI'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

curl_close($ch);

// === ПРОВЕРКА ОШИБОК ===
if ($error) {
    http_response_code(500);
    echo json_encode(['error' => 'CURL Error: ' . $error]);
    exit;
}

// === ВОЗВРАЩАЕМ ОТВЕТ ===
http_response_code($httpCode);
echo $response;
?>
