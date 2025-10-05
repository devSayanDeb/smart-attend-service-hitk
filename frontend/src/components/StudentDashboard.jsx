import { useState, useEffect } from 'react';
import { attendanceService, sessionService } from '../services/api';
import useAuthStore from '../store/authStore';

const StudentDashboard = () => {
  const { user } = useAuthStore();
  const [nearbySession, setNearbySession] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [scanning, setScanning] = useState(false);

  // Replace the existing scanForBeacons function with this:
  const scanForBeacons = async () => {
    setScanning(true);
    try {
      // Get actual active sessions from the backend
      const response = await sessionService.getSessions();
      const activeSessions = response.data.filter(session => session.status === 'active');

      setTimeout(() => {
        if (activeSessions.length > 0) {
          // Use the first active session found
          const foundSession = activeSessions[0];
          setNearbySession({
            _id: foundSession._id,
            title: foundSession.title,
            subject: foundSession.subject,
            teacher: foundSession.teacher,
            room: foundSession.room,
            startTime: foundSession.startTime,
            sessionCode: foundSession.sessionCode,
            beaconUUID: foundSession.beaconUUID
          });
        } else {
          alert('No active sessions found nearby. Make sure a teacher has started a session.');
          setNearbySession(null);
        }
        setScanning(false);
      }, 2000);
    } catch (error) {
      console.error('Error scanning for sessions:', error);
      alert('Error scanning for sessions. Please try again.');
      setScanning(false);
    }
  };

  const requestOTP = async () => {
    if (!nearbySession) return;

    try {
      const response = await attendanceService.requestOTP({
        sessionId: nearbySession._id, // Use real session ID
        deviceInfo: {
          userAgent: navigator.userAgent,
          ipAddress: 'auto-detected'
        },
        location: {
          latitude: 22.5726,
          longitude: 88.3639
        },
        proximity: {
          rssi: -45,
          distance: 8,
          beaconUUID: nearbySession.beaconUUID
        }
      });

      setOtpRequested(true);
      alert('OTP sent! Check your notification or use demo OTP: 123456');
    } catch (error) {
      alert('Error requesting OTP: ' + error.response?.data?.message);
    }
  };

  const verifyOTP = async () => {
    if (!otpCode || !nearbySession) return;

    try {
      const response = await attendanceService.verifyOTP({
        otp: otpCode,
        sessionId: nearbySession._id
      });

      alert('Attendance marked successfully!');
      setNearbySession(null);
      setOtpRequested(false);
      setOtpCode('');
      loadAttendanceHistory();
    } catch (error) {
      alert('Error verifying OTP: ' + error.response?.data?.message);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      const response = await attendanceService.getHistory();
      setAttendanceHistory(response.data.slice(0, 5)); // Show last 5
    } catch (error) {
      console.error('Error loading attendance history:', error);
    }
  };

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user.name}!
              </h1>
              <p className="text-gray-600">Student Dashboard</p>
            </div>
            <button
              onClick={() => useAuthStore.getState().logout()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Scan for Sessions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📡 Scan for Attendance Sessions</h2>

          {!nearbySession ? (
            <div className="text-center">
              <button
                onClick={scanForBeacons}
                disabled={scanning}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {scanning ? '🔄 Scanning...' : '🔍 Scan for Nearby Sessions'}
              </button>
              <p className="text-gray-500 mt-2">
                Make sure you're near your teacher and Bluetooth is enabled
              </p>
            </div>
          ) : (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800">📍 Session Found!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p><strong>Subject:</strong> {nearbySession.subject}</p>
                <p><strong>Title:</strong> {nearbySession.title}</p>
                <p><strong>Teacher:</strong> {nearbySession.teacher.name}</p>
                <p><strong>Room:</strong> {nearbySession.room}</p>
              </div>

              {!otpRequested ? (
                <button
                  onClick={requestOTP}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  📱 Request Attendance OTP
                </button>
              ) : (
                <div className="mt-4">
                  <p className="text-green-700 mb-2">Enter the OTP to mark attendance:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={verifyOTP}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      ✅ Mark Attendance
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Demo OTP: 123456</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Recent Attendance</h2>
          {attendanceHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{record.session?.subject || 'N/A'}</td>
                      <td className="px-4 py-2">
                        <div>
                          <div>{new Date(record.markedAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(record.markedAt).toLocaleTimeString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              hour12: true,
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {record.status}
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
