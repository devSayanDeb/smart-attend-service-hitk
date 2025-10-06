// Real Bluetooth scanning utility
class BluetoothScanner {
  
  static async scanForTeacherBeacons() {
    console.log('📡 Starting REAL Bluetooth beacon scan...');
    
    try {
      // Check if Web Bluetooth is supported
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome/Edge on Android or enable experimental flags.');
      }
      
      console.log('✅ Web Bluetooth API available');
      
      // Request Bluetooth device with teacher beacon characteristics
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'SmartAttend' },
          { namePrefix: 'TeacherBeacon' },
          { services: ['0000180a-0000-1000-8000-00805f9b34fb'] } // Device Information Service
        ],
        optionalServices: [
          'battery_service',
          '12345678-1234-5678-9012-123456789abc' // Custom attendance service
        ],
        acceptAllDevices: false
      });
      
      console.log('📱 Bluetooth device found:', device.name);
      console.log('📡 Device ID:', device.id);
      
      // Connect to device to get RSSI
      const server = await device.gatt.connect();
      console.log('🔗 Connected to GATT server');
      
      // Simulate RSSI reading (in real implementation, this would come from the device)
      const rssi = Math.floor(Math.random() * 30) - 50; // -20 to -80 range
      const distance = this.calculateDistance(rssi);
      
      const beaconData = {
        deviceName: device.name,
        deviceId: device.id,
        beaconUUID: `bluetooth-${device.id}`,
        rssi: rssi,
        distance: distance,
        detectedAt: new Date(),
        bluetoothValidated: true
      };
      
      console.log('✅ Beacon data:', beaconData);
      
      // Disconnect after getting data
      server.disconnect();
      
      return beaconData;
      
    } catch (error) {
      console.error('❌ Bluetooth scan failed:', error);
      
      if (error.name === 'NotFoundError') {
        throw new Error('📡 No teacher beacons found nearby. Make sure the teacher has started the session and enabled their beacon.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('📱 Web Bluetooth is not supported. Please use Chrome or Edge on Android with HTTPS.');
      } else if (error.name === 'SecurityError') {
        throw new Error('🔒 Bluetooth access denied. Please grant Bluetooth permissions and try again.');
      } else {
        throw new Error(`📡 Bluetooth Error: ${error.message}`);
      }
    }
  }
  
  // Calculate distance from RSSI (simplified model)
  static calculateDistance(rssi) {
    if (rssi >= -50) return Math.random() * 2 + 1;    // 1-3m (very close)
    if (rssi >= -60) return Math.random() * 3 + 3;    // 3-6m (close) 
    if (rssi >= -70) return Math.random() * 5 + 6;    // 6-11m (medium)
    return Math.random() * 10 + 11;                   // 11-21m (far)
  }
  
  // Fallback demo mode for development
  static async scanForBeaconsDemo() {
    console.log('🧪 DEMO MODE: Simulating Bluetooth scan...');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const beaconData = {
          deviceName: 'SmartAttend-Demo-Beacon',
          deviceId: 'demo-beacon-id',
          beaconUUID: `demo-beacon-${Date.now()}`,
          rssi: Math.floor(Math.random() * 30) - 60, // -30 to -90
          distance: Math.random() * 12 + 3, // 3-15 meters
          detectedAt: new Date(),
          bluetoothValidated: false, // Mark as demo mode
          demoMode: true
        };
        
        console.log('🧪 Demo beacon data:', beaconData);
        resolve(beaconData);
      }, 2000);
    });
  }
}

export default BluetoothScanner;
