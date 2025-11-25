// Device Controller Script
class DeviceController {
    constructor() {
        this.socket = null;
        this.deviceId = this.generateDeviceId();
        this.isConnected = false;
        this.permissions = {
            location: false,
            camera: false,
            notifications: false
        };
        
        this.init();
    }
    
    generateDeviceId() {
        return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    init() {
        this.initializeSocket();
        this.setupEventListeners();
        this.loadDeviceInfo();
        this.addLog('Aplikasi dimulai');
    }
    
    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.updateConnectionStatus('Terhubung', '#4CAF50');
            this.registerDevice();
            this.addLog('Terhubung ke server');
        });
        
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.updateConnectionStatus('Terputus', '#ff4444');
            this.addLog('Terputus dari server');
        });
        
        this.socket.on('telegram_command', (data) => {
            this.handleTelegramCommand(data);
        });
        
        this.socket.on('device_connected', (data) => {
            this.addLog(`Perangkat terhubung: ${data.deviceId}`);
        });
        
        this.socket.on('device_disconnected', (data) => {
            this.addLog(`Perangkat terputus: ${data.deviceId}`);
        });
    }
    
    registerDevice() {
        const deviceInfo = {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: `${screen.width}x${screen.height}`,
            battery: null,
            location: null
        };
        
        this.socket.emit('device_register', {
            deviceId: this.deviceId,
            deviceInfo: deviceInfo
        });
        
        // Update device info periodically
        this.updateDeviceInfo();
        setInterval(() => this.updateDeviceInfo(), 30000);
    }
    
    async updateDeviceInfo() {
        const deviceInfo = {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: `${screen.width}x${screen.height}`,
            battery: await this.getBatteryInfo(),
            location: await this.getLocationInfo(),
            timestamp: new Date().toISOString()
        };
        
        if (this.socket && this.isConnected) {
            this.socket.emit('device_data', {
                deviceId: this.deviceId,
                type: 'device_info',
                data: deviceInfo
            });
        }
    }
    
    setupEventListeners() {
        // Permission request
        document.getElementById('requestPermission').addEventListener('click', () => {
            this.requestPermissions();
        });
        
        // Control buttons
        document.getElementById('getLocation').addEventListener('click', () => {
            this.getLocation();
        });
        
        document.getElementById('takeScreenshot').addEventListener('click', () => {
            this.takeScreenshot();
        });
        
        document.getElementById('flashOn').addEventListener('click', () => {
            this.toggleFlash(true);
        });
        
        document.getElementById('flashOff').addEventListener('click', () => {
            this.toggleFlash(false);
        });
        
        document.getElementById('getBattery').addEventListener('click', () => {
            this.getBattery();
        });
        
        document.getElementById('vibrate').addEventListener('click', () => {
            this.vibrateDevice();
        });
        
        document.getElementById('openDashboard').addEventListener('click', () => {
            window.open('/dashboard', '_blank');
        });
        
        // Battery API
        if ('getBattery' in navigator || 'battery' in navigator) {
            this.setupBatteryMonitoring();
        }
    }
    
    async requestPermissions() {
        try {
            // Request location permission
            if ('geolocation' in navigator) {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                this.permissions.location = true;
                this.addLog('Izin lokasi diberikan');
            }
            
            // Request notification permission
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                this.permissions.notifications = permission === 'granted';
                this.addLog(`Izin notifikasi: ${permission}`);
            }
            
            // Update permission status
            document.getElementById('permissionStatus').textContent = 'Status: Izin diberikan';
            document.getElementById('permissionStatus').style.color = '#4CAF50';
            
            this.addLog('Semua izin akses diberikan');
            
        } catch (error) {
            this.addLog(`Error meminta izin: ${error.message}`);
        }
    }
    
    async getLocation() {
        if (!this.permissions.location) {
            this.addLog('Error: Izin lokasi belum diberikan');
            return;
        }
        
        try {
            this.addLog('Mendapatkan lokasi...');
            
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
            
            const { latitude, longitude } = position.coords;
            document.getElementById('locationStatus').textContent = 'Aktif';
            document.getElementById('locationStatus').style.color = '#4CAF50';
            
            this.addLog(`Lokasi berhasil: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            
            // Send to server
            if (this.socket && this.isConnected) {
                this.socket.emit('device_data', {
                    deviceId: this.deviceId,
                    type: 'location',
                    data: {
                        lat: latitude,
                        lng: longitude,
                        accuracy: position.coords.accuracy
                    }
                });
            }
            
        } catch (error) {
            this.addLog(`Error mendapatkan lokasi: ${error.message}`);
        }
    }
    
    async takeScreenshot() {
        try {
            this.addLog('Mengambil screenshot...');
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                throw new Error('API screenshot tidak didukung');
            }
            
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: false
            });
            
            const track = stream.getVideoTracks()[0];
            const imageCapture = new ImageCapture(track);
            const bitmap = await imageCapture.grabFrame();
            
            track.stop();
            
            // Convert to blob (simulasi)
            this.addLog('Screenshot berhasil diambil');
            
            if (this.socket && this.isConnected) {
                this.socket.emit('device_data', {
                    deviceId: this.deviceId,
                    type: 'screenshot',
                    data: {
                        message: 'Screenshot captured successfully'
                    }
                });
            }
            
        } catch (error) {
            this.addLog(`Error mengambil screenshot: ${error.message}`);
        }
    }
    
    toggleFlash(state) {
        // Simulasi kontrol flash (di real implementation butuh akses hardware)
        const statusElement = document.getElementById('flashStatus');
        
        if (state) {
            statusElement.textContent = 'Menyala';
            statusElement.style.color = '#FFD700';
            this.addLog('Lampu flash dinyalakan');
        } else {
            statusElement.textContent = 'Mati';
            statusElement.style.color = '#FFFFFF';
            this.addLog('Lampu flash dimatikan');
        }
        
        if (this.socket && this.isConnected) {
            this.socket.emit('device_data', {
                deviceId: this.deviceId,
                type: 'flash_status',
                data: {
                    status: state
                }
            });
        }
    }
    
    async getBattery() {
        try {
            const batteryInfo = await this.getBatteryInfo();
            document.getElementById('batteryStatus').textContent = batteryInfo;
            this.addLog(`Status baterai: ${batteryInfo}`);
            
            if (this.socket && this.isConnected) {
                this.socket.emit('device_data', {
                    deviceId: this.deviceId,
                    type: 'battery',
                    data: {
                        level: batteryInfo
                    }
                });
            }
            
        } catch (error) {
            this.addLog(`Error mendapatkan status baterai: ${error.message}`);
        }
    }
    
    async getBatteryInfo() {
        if ('getBattery' in navigator) {
            const battery = await navigator.getBattery();
            return `${Math.round(battery.level * 100)}%`;
        } else if ('battery' in navigator) {
            const battery = navigator.battery;
            return battery ? `${Math.round(battery.level * 100)}%` : 'Tidak diketahui';
        } else {
            return 'API tidak didukung';
        }
    }
    
    setupBatteryMonitoring() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                const updateBatteryStatus = () => {
                    const level = Math.round(battery.level * 100);
                    document.getElementById('batteryStatus').textContent = `${level}%`;
                };
                
                battery.addEventListener('levelchange', updateBatteryStatus);
                updateBatteryStatus();
            });
        }
    }
    
    async getLocationInfo() {
        if (!this.permissions.location) return null;
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            
            return {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
        } catch (error) {
            return null;
        }
    }
    
    vibrateDevice() {
        if (navigator.vibrate) {
            navigator.vibrate(200);
            this.addLog('Perangkat digetarkan');
        } else {
            this.addLog('Vibration API tidak didukung');
        }
    }
    
    handleTelegramCommand(data) {
        const { command, chatId } = data;
        
        this.addLog(`Perintah dari Telegram: ${command}`);
        
        switch (command) {
            case 'get_location':
                this.getLocation();
                break;
            case 'take_screenshot':
                this.takeScreenshot();
                break;
            case 'flash_on':
                this.toggleFlash(true);
                break;
            case 'flash_off':
                this.toggleFlash(false);
                break;
            case 'get_battery':
                this.getBattery();
                break;
        }
    }
    
    updateConnectionStatus(status, color) {
        const element = document.getElementById('connectionStatus');
        element.textContent = status;
        element.style.color = color;
    }
    
    addLog(message) {
        const logEntries = document.getElementById('logEntries');
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
        logEntries.appendChild(logEntry);
        logEntries.scrollTop = logEntries.scrollHeight;
        
        // Keep only last 50 entries
        while (logEntries.children.length > 50) {
            logEntries.removeChild(logEntries.firstChild);
        }
    }
    
    loadDeviceInfo() {
        // Load saved device info
        const savedDeviceId = localStorage.getItem('deviceId');
        if (savedDeviceId) {
            this.deviceId = savedDeviceId;
        } else {
            localStorage.setItem('deviceId', this.deviceId);
        }
        
        this.addLog(`ID Perangkat: ${this.deviceId}`);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.deviceController = new DeviceController();
});
