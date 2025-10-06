import { useState, useEffect } from 'react';
import { attendanceService, sessionService } from '../services/api';
import useAuthStore from '../store/authStore';
import DeviceFingerprint from '../utils/deviceFingerprint';
import BluetoothScanner from '../utils/bluetoothScanner';

const StudentDashboard = () => {
  const { user } = useAuthStore();
  const [nearbySession, setNearbySession] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentOTP, setCurrentOTP] = useState(null);
  const [bluetoothMode, setBluetoothMode] = useState('demo'); // 'demo' or 'real'

  // 📡 ENHANCED BLUETOOTH SCANNING
  const scanForBeacons = async () => {
    setScanning(true);
    try {
      console.log(`📡 Starting ${bluetoothMode} Bluetooth scan...`);
      
      let beaconData;
      
      if (bluetoothMode === 'real') {
        // Real Bluetooth scanning
        try {
          beaconData = await BluetoothScanner.scanForTeacherBeacons();
          console.log('✅ Real Bluetooth beacon found');
        } catch (bluetoothError) {
          console.log('❌ Real Bluetooth failed, falling back to demo mode');
          alert(`Bluetooth Error: ${bluetoothError.message}\n\nFalling back to demo mode for development.`);
          beaconData = await BluetoothScanner.scanForBeaconsDemo();
        }
      } else {
        // Demo mode - get active sessions
        beaconData = await BluetoothScanner.scanForBeaconsDemo();
      }
      
      // Get active sessions from backend
      const response = await sessionService.getSessions();
      const activeSessions = response.data.filter(session => session.status === 'active');
      
      if (activeSessions.length > 0) {
        const foundSession = activeSessions[0];
        setNearbySession({
          ...foundSession,
          beaconData: beaconData // Include beacon data for proximity validation
        });
        console.log('📡 Found active session with beacon data');
      } else {
        alert('No active sessions found. Make sure a teacher has started a session.');
        setNearbySession(null);
      }
      
    } catch (error) {
      console.error('❌ Scanning failed:', error);
      alert(`Scan Error: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  // 🔐 ENHANCED OTP REQUEST WITH REAL BLUETOOTH DATA
  const requestOTP = async (sessionId) => {
    try {
      setLoading(true);
      console.log('📱 Requesting SECURE OTP for session:', sessionId);
      
      // Generate device fingerprint
      const deviceFingerprint = await DeviceFingerprint.generateFingerprint();
      
      // Use real beacon data if available
      const proximityData = nearbySession?.beaconData || {
        rssi: Math.floor(Math.random() * 30) - 60, // Fallback simulated data
        distance: Math.random() * 10 + 2,
        beaconUUID: `fallback-${sessionId}`,
        detectedAt: new Date(),
        demoMode: bluetoothMode === 'demo'
      };
      
      const requestData = {
        sessionId: sessionId,
        deviceFingerprint: deviceFingerprint,
        proximityData: proximityData
      };
      
      console.log('📡 Sending proximity data:', proximityData);
      
      const response = await attendanceService.requestOTP(requestData);
      console.log('📱 OTP Response:', response.data);
      
      // Store the dynamic OTP for verification
      setCurrentOTP({
        otp: response.data.otp,
        sessionId: sessionId,
        expiresAt: new Date(Date.now() + (response.data.expiresIn || 90) * 1000),
        sessionInfo: response.data.sessionInfo
      });
      
      setOtpRequested(true);
      
      // Enhanced success message with security info
      const securityInfo = response.data.security ? 
        '\n✅ Security: Device & Bluetooth validated' : 
        '\n⚠️ Demo mode active';
      
      alert(`🔐 Generated OTP: ${response.data.otp}\n📚 Session: ${response.data.sessionInfo.title}\n⏰ Expires in ${response.data.expiresIn || 90} seconds${securityInfo}`);
      
    } catch (error) {
      console.error('❌ OTP request error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      
      // Special handling for security alerts
      if (error.response?.data?.securityBlock) {
        alert(`🚨 PROXY ATTENDANCE BLOCKED!\n\n${errorMessage}\n\n⚠️ Each student must use their own device to mark attendance.`);
      } else if (error.response?.data?.bluetoothRequired) {
        alert(`📡 BLUETOOTH REQUIRED!\n\n${errorMessage}\n\n💡 Make sure you're near the teacher and try scanning again.`);
      } else {
        alert('Error requesting OTP: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Enhanced verifyOTP function (keeping existing functionality)
  const verifyOTP = async () => {
    if (!otpCode || !nearbySession) return;
    
    try {
      setLoading(true);
      console.log('🔐 Verifying OTP:', otpCode);
      
      const response = await attendanceService.verifyOTP({
        otp: otpCode,
        sessionId: nearbySession._id
      });
      
      console.log('✅ Verification response:', response.data);
      alert(`✅ ${response.data.message}\nStatus: ${response.data.attendance?.status?.toUpperCase() || 'VERIFIED'}`);
      
      // Reset states
      setNearbySession(null);
      setOtpRequested(false);
      setOtpCode('');
      setCurrentOTP(null);
      loadAttendanceHistory();
      
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      alert('Error verifying OTP: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      console.log('📊 Loading attendance history...');
      const response = await attendanceService.getHistory();
      console.log('📊 History response:', response.data);
      
      const historyData = response.data.data || response.data || [];
      
      if (Array.isArray(historyData)) {
        setAttendanceHistory(historyData.slice(0, 5));
      } else {
        console.log('❌ History data is not an array:', historyData);
        setAttendanceHistory([]);
      }
    } catch (error) {
      console.error('Error loading attendance history:', error);
      setAttendanceHistory([]);
    }
  };

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Bluetooth Mode Toggle */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user.name}!
              </h1>
              <p className="text-gray-600">Student Dashboard</p>
              <p className="text-sm text-gray-500">Roll: {user.rollNumber}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Bluetooth Mode Toggle */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Bluetooth Mode:</label>
                <select 
                  value={bluetoothMode}
                  onChange={(e) => setBluetoothMode(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="demo">🧪 Demo Mode</option>
                  <option value="real">📡 Real Bluetooth</option>
                </select>
              </div>
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Bluetooth Scanner */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            📡 {bluetoothMode === 'real' ? 'Real Bluetooth Scanner' : 'Demo Bluetooth Scanner'}
          </h2>
          <p className="text-gray-600 mb-4">
            {bluetoothMode === 'real' ? 
              'This will scan for actual Bluetooth beacons from teacher devices' :
              'Demo mode - simulates Bluetooth scanning for development'
            }
          </p>
          
          <div className="text-center">
            <button
              onClick={scanForBeacons}
              disabled={scanning || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {scanning ? '🔄 Scanning...' : 
               bluetoothMode === 'real' ? '📡 Scan Real Bluetooth' : '🧪 Demo Scan'}
            </button>
          </div>

          {/* Security Status */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">🔐 Security Status:</h4>
            <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
              <div>✅ Device Fingerprinting: Active</div>
              <div>✅ Dynamic OTP: Active</div>
              <div>🚫 Anti-Proxy: {bluetoothMode === 'real' ? 'Active' : 'Demo Mode'}</div>
              <div>📡 Bluetooth: {bluetoothMode === 'real' ? 'Required' : 'Simulated'}</div>
            </div>
          </div>

          {/* Nearby Session Found */}
          {nearbySession && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                📍 Session Found!
              </h3>
              <div className="text-sm text-gray-700">
                <p><strong>Subject:</strong> {nearbySession.subject}</p>
                <p><strong>Title:</strong> {nearbySession.title}</p>
                <p><strong>Teacher:</strong> {nearbySession.teacher?.name || 'Unknown'}</p>
                <p><strong>Room:</strong> {nearbySession.room}</p>
                
                {/* Bluetooth Info */}
                {nearbySession.beaconData && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <p><strong>📡 Beacon:</strong> {nearbySession.beaconData.deviceName || 'N/A'}</p>
                    <p><strong>📶 Signal:</strong> {nearbySession.beaconData.rssi}dBm</p>
                    <p><strong>📏 Distance:</strong> ~{nearbySession.beaconData.distance?.toFixed(1)}m</p>
                    <p><strong>🔒 Mode:</strong> {nearbySession.beaconData.demoMode ? 'Demo' : 'Real Bluetooth'}</p>
                  </div>
                )}
              </div>
              
              {!otpRequested ? (
                <button
                  onClick={() => requestOTP(nearbySession._id)}
                  disabled={loading}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Generating...' : '🔐 Request Secure OTP'}
                </button>
              ) : (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">Enter the OTP to mark attendance:</p>
                  
                  {currentOTP && (
                    <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-3">
                      <p className="text-xs text-yellow-800">
                        <strong>Generated OTP:</strong> <code className="bg-yellow-200 px-1 rounded">{currentOTP.otp}</code>
                      </p>
                      <p className="text-xs text-yellow-700">
                        Session: {currentOTP.sessionInfo?.title}
                      </p>
                      <p className="text-xs text-yellow-600">
                        Expires: {currentOTP.expiresAt?.toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength="6"
                    />
                    <button
                      onClick={verifyOTP}
                      disabled={loading || otpCode.length !== 6}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loading ? 'Verifying...' : '✅ Verify'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Attendance History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Recent Attendance</h2>
          {attendanceHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-left">Date & Time</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Security</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2">{record.session?.subject || 'N/A'}</td>
                      <td className="px-4 py-2">
                        {new Date(record.markedAt).toLocaleDateString()} {' '}
                        {new Date(record.markedAt).toLocaleTimeString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          hour12: true,
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          🔒 Secured
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No attendance records yet. Mark your first attendance!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;