import { useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import useAuthStore from './store/authStore';

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const { user } = useAuthStore();

  // If user is logged in, show appropriate dashboard
  if (user) {
    if (user.role === 'student') {
      return <StudentDashboard />;
    } else if (user.role === 'teacher') {
      return <TeacherDashboard />;
    }
  }

  // Show login/register forms
  if (showRegister) {
    return (
      <Register 
        onSwitchToLogin={() => setShowRegister(false)} 
      />
    );
  }

  return (
    <Login 
      onSwitchToRegister={() => setShowRegister(true)} 
    />
  );
}

export default App;
