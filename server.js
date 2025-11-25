const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 30000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Konfigurasi dari environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const AUTHORIZED_CHAT_IDS = process.env.AUTHORIZED_CHAT_IDS ? process.env.AUTHORIZED_CHAT_IDS.split(',') : [];

// Validasi konfigurasi
if (!TELEGRAM_BOT_TOKEN) {
    console.error('ERROR: TELEGRAM_BOT_TOKEN tidak ditemukan di environment variables!');
    process.exit(1);
}

if (AUTHORIZED_CHAT_IDS.length === 0) {
    console.warn('WARNING: Tidak ada AUTHORIZED_CHAT_IDS yang dikonfigurasi!');
}

// Helper function untuk mengirim pesan ke Telegram
async function sendTelegramMessage(chatId, message, replyToMessageId = null) {
    try {
        const payload = {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        };

        if (replyToMessageId) {
            payload.reply_to_message_id = replyToMessageId;
        }

        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            payload
        );
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error sending Telegram message:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// Helper function untuk mengirim foto ke Telegram
async function sendTelegramPhoto(chatId, photoUrl, caption = '') {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
            {
                chat_id: chatId,
                photo: photoUrl,
                caption: caption
            }
        );
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error sending Telegram photo:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// Helper function untuk mengirim lokasi ke Telegram
async function sendTelegramLocation(chatId, latitude, longitude) {
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendLocation`,
            {
                chat_id: chatId,
                latitude: latitude,
                longitude: longitude
            }
        );
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error sending Telegram location:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// Endpoint untuk menerima webhook dari Telegram
app.post('/webhook/telegram', async (req, res) => {
    try {
        const update = req.body;
        
        // Log incoming update
        console.log('Received Telegram update:', JSON.stringify(update, null, 2));
        
        // Handle different types of updates
        if (update.message) {
            await handleMessage(update.message);
        } else if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Error processing webhook');
    }
});

// Handle incoming messages dari Telegram
async function handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    const messageId = message.message_id;

    // Cek authorization
    if (!AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
        await sendTelegramMessage(chatId, '❌ Anda tidak diizinkan mengakses perangkat ini.');
        return;
    }

    // Handle commands
    if (text.startsWith('/')) {
        await handleCommand(chatId, text, messageId);
    } else {
        // Handle regular messages
        await sendTelegramMessage(chatId, 'Perintah tidak dikenali. Gunakan /help untuk melihat daftar perintah.');
    }
}

// Handle commands dari Telegram
async function handleCommand(chatId, command, messageId) {
    switch (command) {
        case '/start':
            await sendTelegramMessage(chatId, 
                '🤖 <b>Remote Device Controller Bot</b>\n\n' +
                'Gunakan perintah berikut untuk mengontrol perangkat:\n\n' +
                '📱 <b>Informasi Perangkat</b>\n' +
                '/battery - Cek status baterai\n' +
                '/location - Dapatkan lokasi perangkat\n' +
                '/deviceinfo - Informasi perangkat\n\n' +
                '📸 <b>Kamera & Media</b>\n' +
                '/screenshot - Ambil screenshot\n' +
                '/camera - Ambil foto dari kamera\n' +
                '/flash - Nyalakan/matikan flash\n\n' +
                '⚙️ <b>Sistem</b>\n' +
                '/apps - Daftar aplikasi terinstall\n' +
                '/notifications - Notifikasi terbaru\n' +
                '/reboot - Restart perangkat\n\n' +
                '📞 <b>Pesan & Panggilan</b>\n' +
                '/sms [nomor] [pesan] - Kirim SMS\n' +
                '/call [nomor] - Lakukan panggilan\n\n' +
                '🆘 <b>Lainnya</b>\n' +
                '/help - Tampilkan bantuan ini\n' +
                '/status - Status koneksi'
            , messageId);
            break;

        case '/help':
            await sendTelegramMessage(chatId, 
                '🆘 <b>Bantuan Perintah</b>\n\n' +
                'Gunakan format berikut:\n\n' +
                '• <code>/sms +628123456789 Pesan Anda</code>\n' +
                '• <code>/call +628123456789</code>\n\n' +
                'Perintah lainnya langsung ketik tanpa parameter.',
                messageId
            );
            break;

        case '/status':
            await sendTelegramMessage(chatId, '✅ Perangkat terhubung dan siap menerima perintah.', messageId);
            break;

        case '/battery':
            // Simulasi informasi baterai
            const batteryLevel = Math.floor(Math.random() * 100);
            const isCharging = Math.random() > 0.5;
            await sendTelegramMessage(chatId, 
                `🔋 <b>Status Baterai</b>\n` +
                `Level: ${batteryLevel}%\n` +
                `Status: ${isCharging ? 'Sedang diisi' : 'Tidak diisi'}\n` +
                `Kesehatan: Baik`,
                messageId
            );
            break;

        case '/location':
            // Simulasi lokasi (dalam implementasi nyata, ini akan mengambil lokasi sebenarnya)
            const lat = -6.2088 + (Math.random() - 0.5) * 0.01;
            const lng = 106.8456 + (Math.random() - 0.5) * 0.01;
            await sendTelegramLocation(chatId, lat, lng);
            await sendTelegramMessage(chatId, 
                `📍 <b>Lokasi Perangkat</b>\n` +
                `Latitude: ${lat.toFixed(6)}\n` +
                `Longitude: ${lng.toFixed(6)}\n` +
                `Akurasi: ±20 meter\n\n` +
                `<a href="https://maps.google.com/?q=${lat},${lng}">Lihat di Google Maps</a>`,
                messageId
            );
            break;

        case '/deviceinfo':
            // Simulasi informasi perangkat
            await sendTelegramMessage(chatId,
                `📱 <b>Informasi Perangkat</b>\n\n` +
                `Model: Samsung Galaxy S21\n` +
                `Android: 13.0\n` +
                `RAM: 8 GB\n` +
                `Storage: 128 GB\n` +
                `IMEI: 123456789012345\n` +
                `IP Address: 192.168.1.100`,
                messageId
            );
            break;

        case '/screenshot':
            // Simulasi screenshot (dalam implementasi nyata, ini akan mengambil screenshot sebenarnya)
            await sendTelegramMessage(chatId, '📸 Mengambil screenshot...', messageId);
            // Delay simulasi
            setTimeout(async () => {
                await sendTelegramPhoto(chatId, 
                    'https://via.placeholder.com/400x800/2a5298/ffffff?text=Screenshot+Simulasi',
                    'Screenshot perangkat'
                );
            }, 2000);
            break;

        case '/camera':
            // Simulasi foto kamera
            await sendTelegramMessage(chatId, '📷 Mengambil foto dari kamera...', messageId);
            setTimeout(async () => {
                await sendTelegramPhoto(chatId,
                    'https://via.placeholder.com/400x600/1e3c72/ffffff?text=Foto+Kamera+Simulasi',
                    'Foto dari kamera perangkat'
                );
            }, 3000);
            break;

        case '/flash':
            await sendTelegramMessage(chatId, '🔦 Flash telah di-toggle', messageId);
            break;

        case '/apps':
            // Simulasi daftar aplikasi
            const apps = ['WhatsApp', 'Instagram', 'Facebook', 'Chrome', 'YouTube', 'Gmail'];
            const appList = apps.slice(0, 5).map(app => `• ${app}`).join('\n');
            await sendTelegramMessage(chatId,
                `📲 <b>Aplikasi Terinstall</b>\n\n${appList}\n\n...dan ${apps.length - 5} aplikasi lainnya.`,
                messageId
            );
            break;

        case '/notifications':
            // Simulasi notifikasi
            await sendTelegramMessage(chatId,
                `🔔 <b>Notifikasi Terbaru</b>\n\n` +
                `• WhatsApp: Pesan baru dari John\n` +
                `• Instagram: Ada yang menyukai foto Anda\n` +
                `• Gmail: Email penting dari bank`,
                messageId
            );
            break;

        case '/reboot':
            await sendTelegramMessage(chatId, '🔄 Merestart perangkat...', messageId);
            setTimeout(async () => {
                await sendTelegramMessage(chatId, '✅ Perangkat telah direstart.', messageId);
            }, 5000);
            break;

        default:
            if (command.startsWith('/sms')) {
                const parts = command.split(' ');
                if (parts.length >= 3) {
                    const number = parts[1];
                    const message = parts.slice(2).join(' ');
                    await sendTelegramMessage(chatId, 
                        `📱 <b>SMS Terkirim</b>\n\n` +
                        `Ke: ${number}\n` +
                        `Pesan: ${message}`,
                        messageId
                    );
                } else {
                    await sendTelegramMessage(chatId, 
                        'Format: /sms [nomor] [pesan]\nContoh: /sms +628123456789 Halo, ini pesan tes',
                        messageId
                    );
                }
            } else if (command.startsWith('/call')) {
                const parts = command.split(' ');
                if (parts.length >= 2) {
                    const number = parts[1];
                    await sendTelegramMessage(chatId, 
                        `📞 <b>Memanggil</b>\n\nNomor: ${number}`,
                        messageId
                    );
                } else {
                    await sendTelegramMessage(chatId, 
                        'Format: /call [nomor]\nContoh: /call +628123456789',
                        messageId
                    );
                }
            } else {
                await sendTelegramMessage(chatId, 'Perintah tidak dikenali. Gunakan /help untuk bantuan.', messageId);
            }
            break;
    }
}

// Handle callback queries (untuk inline keyboard)
async function handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    
    await sendTelegramMessage(chatId, `Anda memilih: ${data}`);
    
    // Answer the callback query
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: callbackQuery.id
        });
    } catch (error) {
        console.error('Error answering callback query:', error);
    }
}

// Endpoint untuk menerima perintah dari frontend web
app.post('/api/command', async (req, res) => {
    try {
        const { command, data, telegram_chat_id } = req.body;
        
        if (!telegram_chat_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Telegram chat ID diperlukan' 
            });
        }

        if (!AUTHORIZED_CHAT_IDS.includes(telegram_chat_id.toString())) {
            return res.status(403).json({ 
                success: false, 
                error: 'Chat ID tidak diizinkan' 
            });
        }

        console.log(`Received command from web: ${command}`, data);

        // Kirim perintah ke Telegram sebagai simulasi
        // Dalam implementasi nyata, ini akan mengirim perintah ke perangkat target
        let message = `🖥️ <b>Perintah dari Web</b>\n\nPerintah: <code>${command}</code>`;
        
        if (data && Object.keys(data).length > 0) {
            message += `\nData: <code>${JSON.stringify(data)}</code>`;
        }

        const result = await sendTelegramMessage(telegram_chat_id, message);

        if (result.success) {
            res.json({ success: true, message: 'Perintah berhasil dikirim' });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('Error processing command:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        authorized_chats: AUTHORIZED_CHAT_IDS.length
    });
});

// Setup webhook Telegram
async function setupWebhook() {
    try {
        const webhookUrl = `${process.env.VERCEL_URL || 'https://your-app.vercel.app'}/webhook/telegram`;
        
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
            { url: webhookUrl }
        );
        
        console.log('Webhook setup result:', response.data);
    } catch (error) {
        console.error('Error setting up webhook:', error.response?.data || error.message);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`Telegram Bot Token: ${TELEGRAM_BOT_TOKEN ? '✅ Terkonfigurasi' : '❌ Tidak ada'}`);
    console.log(`Authorized Chat IDs: ${AUTHORIZED_CHAT_IDS.join(', ') || 'Tidak ada'}`);
    
    // Setup webhook saat server start
    if (process.env.VERCEL_URL) {
        setupWebhook();
    }
});

module.exports = app;
