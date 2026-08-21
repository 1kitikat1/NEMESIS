// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// ============================================================
//  КОНФИГУРАЦИЯ ROLLYPAY
// ============================================================

const ROLLYPAY_API_KEY = "7kqcOdQ8aqRZc-RKo8vEYSI5Jys9WSMSSr42DlKcmtk";
const ROLLYPAY_TERMINAL_ID = "cc6d8171-c6f4-471d-90e5-44611400a7c6";
const ROLLYPAY_URL = "https://api.rollypay.io/api/v1";

const PLANS = {
    elite: { name: 'ELITE', price: 199, role: 'elite' },
    ai_plus: { name: 'AI+', price: 99, role: 'ai_basic' },
    ai_max: { name: 'AI MAX', price: 299, role: 'ai_max' }
};

// ============================================================
//  CORS ХЕЛПЕР
// ============================================================

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ============================================================
//  СОЗДАНИЕ ПЛАТЕЖА
// ============================================================

exports.createPayment = onRequest(
    { cors: true, maxInstances: 10 },
    async (req, res) => {
        setCorsHeaders(res);

        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== "POST") {
            return res.status(405).send("Method not allowed");
        }

        try {
            const { plan, email, username } = req.body || {};

            // Проверка авторизации через Firebase
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: "Не авторизован" });
            }

            const token = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
            } catch (e) {
                return res.status(401).json({ error: "Недействительный токен" });
            }

            const userId = decodedToken.uid;

            const planData = PLANS[plan];
            if (!planData) {
                return res.status(400).json({ error: "Неверный тариф" });
            }

            // Создаём платёж в RollyPay
            const response = await axios.post(
                `${ROLLYPAY_URL}/payments/create`,
                {
                    terminal_id: ROLLYPAY_TERMINAL_ID,
                    amount: String(planData.price),
                    order_id: `NEM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    description: `Подписка ${planData.name} для ${username}`,
                    customer_email: email,
                    payment_method: "sbp",
                    redirect_url: "https://nemesisx.fun/payment/success",
                    webhook_url: "https://nemesisx.fun/api/webhook"
                },
                {
                    headers: {
                        'X-API-Key': ROLLYPAY_API_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const paymentId = response.data.payment_id;

            // Сохраняем в Firebase
            await admin.database().ref(`payments/${paymentId}`).set({
                user_id: userId,
                plan: plan,
                role: planData.role,
                amount: planData.price,
                status: 'pending',
                created_at: new Date().toISOString(),
                email: email,
                username: username
            });

            return res.json({
                payment_id: paymentId,
                pay_url: response.data.pay_url,
                amount: planData.price
            });

        } catch (error) {
            console.error('RollyPay error:', error.response?.data || error.message);
            return res.status(500).json({ error: 'Ошибка создания платежа' });
        }
    }
);

// ============================================================
//  ВЕБХУК ДЛЯ ROLLYPAY
// ============================================================

exports.webhook = onRequest(
    { cors: true, maxInstances: 10 },
    async (req, res) => {
        setCorsHeaders(res);

        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== "POST") {
            return res.status(405).send("Method not allowed");
        }

        try {
            const { payment_id, status } = req.body;

            if (!payment_id) {
                return res.status(400).json({ error: 'No payment_id' });
            }

            const paymentRef = admin.database().ref(`payments/${payment_id}`);
            const snapshot = await paymentRef.once('value');
            const paymentData = snapshot.val();

            if (!paymentData) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            if (status === 'succeeded') {
                // Активируем подписку
                await admin.database().ref(`users/${paymentData.user_id}`).update({
                    role: paymentData.role,
                    tariff_activated_at: new Date().toISOString(),
                    tariff_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                });

                await paymentRef.update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                });

                console.log(`✅ Подписка активирована для пользователя ${paymentData.user_id}`);
            } else if (status === 'failed' || status === 'cancelled') {
                await paymentRef.update({
                    status: status,
                    completed_at: new Date().toISOString()
                });
            }

            return res.json({ status: 'ok' });

        } catch (error) {
            console.error('Webhook error:', error);
            return res.status(500).json({ error: 'Internal error' });
        }
    }
);

// ============================================================
//  ПРОВЕРКА СТАТУСА ПЛАТЕЖА
// ============================================================

exports.getPaymentStatus = onRequest(
    { cors: true, maxInstances: 10 },
    async (req, res) => {
        setCorsHeaders(res);

        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== "GET") {
            return res.status(405).send("Method not allowed");
        }

        try {
            const paymentId = req.query.payment_id;
            if (!paymentId) {
                return res.status(400).json({ error: 'Не указан payment_id' });
            }

            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: "Не авторизован" });
            }

            const token = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
            } catch (e) {
                return res.status(401).json({ error: "Недействительный токен" });
            }

            const userId = decodedToken.uid;

            const snapshot = await admin.database().ref(`payments/${paymentId}`).once('value');
            const paymentData = snapshot.val();

            if (!paymentData) {
                return res.status(404).json({ error: 'Платёж не найден' });
            }

            if (paymentData.user_id !== userId) {
                return res.status(403).json({ error: 'Нет доступа' });
            }

            return res.json({
                status: paymentData.status,
                role: paymentData.role,
                amount: paymentData.amount,
                created_at: paymentData.created_at,
                completed_at: paymentData.completed_at || null
            });

        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Ошибка получения статуса' });
        }
    }
);
