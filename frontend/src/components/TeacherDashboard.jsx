import { useState, useEffect } from 'react';
import { sessionService, attendanceService } from '../services/api';
import useAuthStore from '../store/authStore';
import './TeacherDashboard.css'; // Add this CSS import

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

  const [mobileBeaconActive, setMobileBeaconActive] = useState(false);
  const [mobileAuthData, setMobileAuthData] = useState(null);
  const [teacher, setTeacher] = useState(user);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authData = urlParams.get('auth');
    
    if (authData) {
      try {
        const decoded = JSON.parse(atob(authData));
        const { token, teacherId, email, name, timestamp } = decoded;
        
        console.log('📱 Mobile auth data received:', { teacherId, email, name });
        
        if (Date.now() - timestamp < 3600000) {
          setMobileAuthData({
            id: teacherId,
            email,
            name,
            token,
            fromMobile: true
          });
          
          setMobileBeaconActive(true);
          
          if (!teacher || !teacher.id) {
            const teacherData = {
              id: teacherId,
              email,
              name,
              token,
              fromMobile: true
            };
            
            setTeacher(teacherData);
            localStorage.setItem('teacherToken', token);
            localStorage.setItem('teacherData', JSON.stringify(teacherData));
          }
          
          alert('🎉 Successfully connected from mobile app!\nBeacon is active and ready.');
          
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } else {
          alert('⚠️ Mobile authentication expired. Please re-authenticate from the mobile app.');
        }
      } catch (error) {
        console.error('Invalid auth data from mobile app:', error);
        alert('❌ Invalid authentication data from mobile app.');
      }
    }
  }, [teacher]);

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
        teacherId: teacher?.id || user?.id,
        teacherName: teacher?.name || user?.name,
        startTime: new Date(),
        endTime: new Date(Date.now() + newSession.duration * 60000)
      };
      
      const response = await sessionService.createSession(sessionData);
      setSessions([response.data, ...sessions]);
      setShowCreateForm(false);
      setNewSession({
        title: '',
        subject: '',
        course: '',
        room: '',
        duration: 60
      });
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

  const viewAttendance = async (sessionId) => {
    try {
      const response = await attendanceService.getSessionAttendance(sessionId);
      const attendanceData = response.data.data || response.data;
      
      if (attendanceData && attendanceData.session) {
        setSelectedSessionData({
          session: attendanceData.session,
          attendance: attendanceData.attendance || [],
          stats: attendanceData.stats || {
            total: 0,
            present: 0,
            late: 0,
            absent: 0
          }
        });
        setShowAttendanceModal(true);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      alert('Error loading attendance: ' + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <span className="title-icon">👩‍🏫</span>
          Teacher Dashboard
        </h1>
        
        {mobileBeaconActive && (
          <div className="mobile-beacon-status">
            <div className="beacon-icon">📡</div>
            <div className="beacon-info">
              <h4>Mobile Beacon Active</h4>
              <p>
                Connected from mobile app • Students can detect your presence
                {mobileAuthData && (
                  <span> • Teacher: <strong>{mobileAuthData.name}</strong></span>
                )}
              </p>
            </div>
          </div>
        )}

        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="create-session-btn"
          >
            ➕ Create New Session
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="create-session-form">
          <div className="form-header">
            <h3>📝 Create New Attendance Session</h3>
            <button 
              className="close-form-btn"
              onClick={() => setShowCreateForm(false)}
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={createSession} className="session-form">
            <div className="form-grid">
              <div className="form-group">
                <label>📚 Session Title:</label>
                <input
                  type="text"
                  value={newSession.title}
                  onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                  placeholder="e.g., Morning Lecture"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>📖 Subject:</label>
                <select
                  value={newSession.subject}
                  onChange={(e) => setNewSession({...newSession, subject: e.target.value})}
                  required
                >
                  <option value="">Select Subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="English">English</option>
                  <option value="Biology">Biology</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                </select>
              </div>

              <div className="form-group">
                <label>🎓 Course/Class:</label>
                <select
                  value={newSession.course}
                  onChange={(e) => setNewSession({...newSession, course: e.target.value})}
                  required
                >
                  <option value="">Select Course</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                  <option value="BSc 1st Year">BSc 1st Year</option>
                  <option value="BSc 2nd Year">BSc 2nd Year</option>
                  <option value="BSc 3rd Year">BSc 3rd Year</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>🏫 Room:</label>
                <input
                  type="text"
                  value={newSession.room}
                  onChange={(e) => setNewSession({...newSession, room: e.target.value})}
                  placeholder="e.g., Room 101, Lab-A"
                  required
                />
              </div>

              <div className="form-group">
                <label>⏱️ Duration:</label>
                <select
                  value={newSession.duration}
                  onChange={(e) => setNewSession({...newSession, duration: parseInt(e.target.value)})}
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>👨‍🏫 Teacher:</label>
                <input
                  type="text"
                  value={mobileAuthData?.name || teacher?.name || user?.name || ''}
                  disabled
                  className="disabled-input"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                ✅ Create Session
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="cancel-btn"
              >
                ❌ Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sessions-section">
        <h3 className="section-title">
          📊 Your Sessions ({sessions.length})
        </h3>
        
        {sessions.length > 0 ? (
          <div className="sessions-grid">
            {sessions.map(session => (
              <div key={session._id} className="session-card">
                <div className="session-header">
                  <h4>{session.title}</h4>
                  <span className={`status-badge ${session.status}`}>
                    {session.status}
                  </span>
                </div>
                
                <div className="session-details">
                  <p><strong>📖 Subject:</strong> {session.subject}</p>
                  <p><strong>🎓 Course:</strong> {session.course}</p>
                  <p><strong>🏫 Room:</strong> {session.room}</p>
                  <p><strong>⏱️ Duration:</strong> {session.duration} minutes</p>
                </div>
                
                <div className="session-actions">
                  {session.status === 'scheduled' && (
                    <button
                      onClick={() => startSession(session._id)}
                      className="action-btn start-btn"
                    >
                      ▶️ Start
                    </button>
                  )}
                  {session.status === 'active' && (
                    <button
                      onClick={() => endSession(session._id)}
                      className="action-btn end-btn"
                    >
                      ⏹️ End
                    </button>
                  )}
                  <button
                    onClick={() => viewAttendance(session._id)}
                    className="action-btn view-btn"
                  >
                    👥 Attendance
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-sessions">
            <div className="no-sessions-icon">📋</div>
            <h4>No sessions yet</h4>
            <p>Create your first session to get started!</p>
          </div>
        )}
      </div>

      {showAttendanceModal && selectedSessionData && (
        <div className="modal-overlay" onClick={() => setShowAttendanceModal(false)}>
          <div className="attendance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 Attendance Details</h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowAttendanceModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="session-info">
                <p><strong>📖 Subject:</strong> {selectedSessionData.session?.subject || 'N/A'}</p>
                <p><strong>🏫 Room:</strong> {selectedSessionData.session?.room || 'N/A'}</p>
              </div>
              
              <div className="attendance-table-container">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>👤 Student</th>
                      <th>🔢 Roll No.</th>
                      <th>✅ Status</th>
                      <th>⏰ Time</th>
                      <th>📱 Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSessionData.attendance && selectedSessionData.attendance.length > 0 ? (
                      selectedSessionData.attendance.map((record, index) => (
                        <tr key={index}>
                          <td>{record.student?.name || 'Unknown'}</td>
                          <td>{record.student?.rollNumber || 'N/A'}</td>
                          <td>
                            <span className={`status-tag ${record.status}`}>
                              {record.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(record.markedAt).toLocaleString()}</td>
                          <td>
                            <code className="device-id">
                              {record.deviceFingerprint?.deviceId 
                                ? record.deviceFingerprint.deviceId.substring(0, 8) + '...'
                                : 'N/A'
                              }
                            </code>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="no-attendance">
                          📭 No attendance records found
                          <br />
                          <small>Students haven't marked attendance yet.</small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;