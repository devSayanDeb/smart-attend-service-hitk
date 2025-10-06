import { useState, useEffect } from 'react';
import { sessionService, attendanceService } from '../services/api';
import useAuthStore from '../store/authStore';

const TeacherDashboard = () => {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState(null);
  const [newSession, setNewSession] = useState({
    title: '',
    subject: '',
    course: '',
    room: '',
    duration: 60
  });

  const loadSessions = async () => {
    try {
      const response = await sessionService.getSessions();
      setSessions(response.data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createSession = async (e) => {
    e.preventDefault();
    try {
      const sessionData = {
        ...newSession,
        startTime: new Date(),
        endTime: new Date(Date.now() + newSession.duration * 60000)
      };

      const response = await sessionService.createSession(sessionData);
      setSessions([response.data, ...sessions]);
      setShowCreateForm(false);
      setNewSession({ title: '', subject: '', course: '', room: '', duration: 60 });
      alert('Session created successfully!');
    } catch (error) {
      alert('Error creating session: ' + error.response?.data?.message);
    }
  };

  const startSession = async (sessionId) => {
    try {
      await sessionService.startSession(sessionId);
      setActiveSession(sessionId);
      loadSessions();
      alert('Session started! Students can now mark attendance.');
    } catch (error) {
      alert('Error starting session: ' + error.response?.data?.message);
    }
  };

  const endSession = async (sessionId) => {
    try {
      await sessionService.endSession(sessionId);
      setActiveSession(null);
      loadSessions();
      alert('Session ended successfully!');
    } catch (error) {
      alert('Error ending session: ' + error.response?.data?.message);
    }
  };

  // FIXED viewAttendance function
  const viewAttendance = async (sessionId) => {
    try {
      console.log('📊 Fetching attendance for session:', sessionId);
      const response = await attendanceService.getSessionAttendance(sessionId);
      console.log('📊 Loaded attendance response:', response.data);
      
      // FIXED: Handle the response structure properly
      const attendanceData = response.data.data || response.data;
      
      console.log('📊 Processed attendance data:', attendanceData);
      
      if (attendanceData && attendanceData.session) {
        setSelectedSessionData({
          session: attendanceData.session,
          attendance: attendanceData.attendance || [],
          stats: attendanceData.stats || { total: 0, present: 0, late: 0, absent: 0 }
        });
        setShowAttendanceModal(true);
      } else {
        console.log('❌ Invalid attendance data structure');
        // Create default structure if data is missing
        setSelectedSessionData({
          session: { title: 'Unknown Session', subject: 'N/A', room: 'N/A' },
          attendance: [],
          stats: { total: 0, present: 0, late: 0, absent: 0 }
        });
        setShowAttendanceModal(true);
        alert('No attendance data found for this session.');
      }
    } catch (error) {
      console.error('❌ Error loading attendance:', error);
      alert('Error loading attendance: ' + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user.name}!
              </h1>
              <p className="text-gray-600">Teacher Dashboard</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                📝 Create Session
              </button>
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Create Session Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📝 Create New Session</h2>
            <form onSubmit={createSession} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Session Title"
                value={newSession.title}
                onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Subject"
                value={newSession.subject}
                onChange={(e) => setNewSession({ ...newSession, subject: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Course"
                value={newSession.course}
                onChange={(e) => setNewSession({ ...newSession, course: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Room"
                value={newSession.room}
                onChange={(e) => setNewSession({ ...newSession, room: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <select
                value={newSession.duration}
                onChange={(e) => setNewSession({ ...newSession, duration: parseInt(e.target.value) })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  ✅ Create Session
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📚 Your Sessions</h2>
          {sessions.length > 0 ? (
            <div className="grid gap-4">
              {sessions.map((session) => (
                <div key={session._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{session.title}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        <p><strong>Subject:</strong> {session.subject}</p>
                        <p><strong>Course:</strong> {session.course}</p>
                        <p><strong>Room:</strong> {session.room}</p>
                        <p><strong>Duration:</strong> {session.duration} minutes</p>
                        <p><strong>Status:</strong>
                          <span className={`ml-1 px-2 py-1 rounded-full text-xs ${session.status === 'active' ? 'bg-green-100 text-green-800' :
                              session.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {session.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => startSession(session._id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                        >
                          ▶️ Start Session
                        </button>
                      )}
                      {session.status === 'active' && (
                        <button
                          onClick={() => endSession(session._id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                        >
                          ⏹️ End Session
                        </button>
                      )}
                      <button
                        onClick={() => viewAttendance(session._id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        👥 View Attendance
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No sessions yet. Create your first session to get started!
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
            <div className="text-gray-600">Total Sessions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {sessions.filter(s => s.status === 'active').length}
            </div>
            <div className="text-gray-600">Active Sessions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {sessions.filter(s => s.status === 'ended').length}
            </div>
            <div className="text-gray-600">Completed Sessions</div>
          </div>
        </div>

        {/* FIXED: Attendance Modal */}
        {showAttendanceModal && selectedSessionData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">📊 Attendance Report</h2>
                <button
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setSelectedSessionData(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Session Info */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-lg">{selectedSessionData.session?.title || 'Unknown Session'}</h3>
                <p className="text-gray-600">Subject: {selectedSessionData.session?.subject || 'N/A'}</p>
                <p className="text-gray-600">Room: {selectedSessionData.session?.room || 'N/A'}</p>
              </div>

              {/* Statistics - FIXED: Safe access with fallbacks */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-100 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedSessionData.stats?.total || 0}</div>
                  <div className="text-sm text-blue-800">Total</div>
                </div>
                <div className="bg-green-100 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedSessionData.stats?.present || 0}</div>
                  <div className="text-sm text-green-800">Present</div>
                </div>
                <div className="bg-yellow-100 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{selectedSessionData.stats?.late || 0}</div>
                  <div className="text-sm text-yellow-800">Late</div>
                </div>
                <div className="bg-red-100 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{selectedSessionData.stats?.absent || 0}</div>
                  <div className="text-sm text-red-800">Absent</div>
                </div>
              </div>

              {/* Attendance Table */}
              {selectedSessionData.attendance && selectedSessionData.attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Student Name</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Roll Number</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Time</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Device ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSessionData.attendance.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2">{record.student?.name || 'Unknown'}</td>
                          <td className="border border-gray-300 px-4 py-2">{record.student?.rollNumber || 'N/A'}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${record.status === 'present' ? 'bg-green-100 text-green-800' :
                                record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                              }`}>
                              {record.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div>{record.markedTime}</div>
                            <div className="text-xs text-gray-500">{new Date(record.markedAt).toLocaleDateString()}</div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <code className="text-xs bg-gray-100 px-1 rounded">
                              {record.deviceFingerprint?.deviceId ? 
                                record.deviceFingerprint.deviceId.substring(0, 8) + '...' : 
                                'N/A'
                              }
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg">📭 No attendance records found</p>
                  <p className="text-sm">Students haven't marked attendance for this session yet.</p>
                </div>
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setSelectedSessionData(null);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TeacherDashboard;