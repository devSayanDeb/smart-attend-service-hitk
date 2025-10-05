# Smart Attendance Service - HITK

🎓 **A robust online smart attendance management platform for educational institutions**

## Overview

Smart Attendance Service is a comprehensive attendance management system designed for educational institutions. It leverages Bluetooth beacon technology, real-time monitoring, and advanced anti-proxy security features to ensure authentic attendance tracking.

## 🚀 Key Features

### Teacher Portal
- 🔐 **Secure Authentication** - JWT-based login system
- 📅 **Session Management** - Create and configure attendance sessions
- 📡 **Bluetooth Integration** - Host beacon signals via Android app
- 📊 **Real-time Monitoring** - Live attendance tracking dashboard
- 📈 **Analytics & Reports** - Comprehensive attendance statistics
- 📤 **Data Export** - CSV/Excel export functionality

### Student Portal
- 🔑 **Student Authentication** - Roll number/email based login
- 📱 **Proximity Detection** - Bluetooth beacon scanning via web browser
- 🔢 **OTP Verification** - Time-limited one-time passcodes (90 seconds)
- 📋 **Attendance History** - Personal attendance records and trends
- 🔔 **Real-time Notifications** - Session updates and confirmations

### Security Features
- 🛡️ **Anti-Proxy Protection** - Device fingerprinting and proximity validation
- 🔐 **Encrypted Sessions** - Unique session-specific UUIDs
- ⏰ **Time-bound OTPs** - Prevents replay attacks
- 📍 **RSSI Validation** - Signal strength-based proximity checking
- 🔒 **JWT Authentication** - Secure API access

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Web     │    │   Android App   │    │   Backend API   │
│   Application   │◄──►│  (BLE Beacon)   │◄──►│   (Node.js)     │
│   (Vercel)      │    │                 │    │   (Railway)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────────┐
                    │     Database        │
                    │  (MongoDB Atlas)    │
                    └─────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   n8n Workflows     │
                    │  (Self-hosted)      │
                    └─────────────────────┘
```

## 📁 Project Structure

```
smart-attend-service-hitk/
├── frontend/                 # React Web Application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   └── store/          # State management
│   └── package.json
├── backend/                 # Node.js API Server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   └── package.json
├── android-beacon/          # React Native Beacon App
│   ├── src/
│   │   ├── components/     # React Native components
│   │   ├── services/       # Bluetooth services
│   │   └── utils/          # Utility functions
│   └── package.json
├── n8n-workflows/           # Automation workflows
│   ├── notifications/       # Notification workflows
│   ├── reports/            # Report generation
│   └── integrations/       # Third-party integrations
└── docs/                   # Documentation
    ├── api/                # API documentation
    ├── setup/              # Setup guides
    └── deployment/         # Deployment instructions
```

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io Client
- **Bluetooth**: Web Bluetooth API
- **State Management**: Zustand
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **Real-time**: Socket.io
- **Validation**: Joi

### Android App
- **Framework**: React Native
- **Bluetooth**: React Native BLE Manager
- **Background Tasks**: React Native Background Job
- **State Management**: Zustand

### DevOps & Deployment
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway
- **Database**: MongoDB Atlas (Free Tier)
- **Automation**: n8n (Self-hosted)
- **Version Control**: Git & GitHub

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account
- Android Studio (for mobile app)
- n8n instance (optional)

### 1. Clone Repository
```bash
git clone https://github.com/devSayanDeb/smart-attend-service-hitk.git
cd smart-attend-service-hitk
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your environment variables
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Configure your environment variables
npm run dev
```

### 4. Android App Setup
```bash
cd android-beacon
npm install
npx react-native run-android
```

## 📱 How It Works

1. **Teacher Session Creation**
   - Teacher logs into web portal
   - Creates new attendance session with course details
   - Opens Android beacon app to start broadcasting

2. **Student Attendance Process**
   - Student opens web app on mobile browser
   - App scans for nearby Bluetooth beacons
   - When teacher's beacon is detected, student requests OTP
   - Student enters OTP within 90-second time limit
   - Attendance is marked and confirmed in real-time

3. **Security Validation**
   - System validates proximity using RSSI signal strength
   - Checks device fingerprint for duplicate attempts
   - Verifies OTP authenticity and expiration
   - Logs all attempts for audit trail

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

#### Frontend (.env.local)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_ENVIRONMENT=development
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh

### Session Management
- `POST /api/sessions` - Create attendance session
- `GET /api/sessions` - List user sessions
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - End session

### Attendance Operations
- `POST /api/attendance/request-otp` - Request OTP for attendance
- `POST /api/attendance/verify` - Verify OTP and mark attendance
- `GET /api/attendance/history` - Get attendance history

For detailed API documentation, see [docs/api/README.md](docs/api/README.md)

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Android app tests
cd android-beacon && npm test
```

## 🚀 Deployment

### Vercel (Frontend)
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy with automatic CI/CD

### Railway (Backend)
1. Connect GitHub repository to Railway
2. Configure environment variables
3. Deploy with automatic builds

### MongoDB Atlas
1. Create cluster and database
2. Configure IP whitelist and users
3. Update connection string in backend

For detailed deployment instructions, see [docs/deployment/README.md](docs/deployment/README.md)

## 🤖 n8n Integration

Leverage your self-hosted n8n instance for:
- **Automated Notifications**: Email/SMS alerts for low attendance
- **Report Generation**: Weekly/monthly attendance reports
- **Data Synchronization**: Integration with existing school systems
- **Workflow Automation**: Custom business logic triggers

Sample workflows are available in the `n8n-workflows/` directory.

## 🔒 Security Considerations

- **HTTPS Enforcement**: All production traffic uses HTTPS
- **Input Validation**: Comprehensive validation on all endpoints
- **Rate Limiting**: Prevents abuse and DoS attacks
- **SQL Injection Protection**: Parameterized queries and ORM
- **CORS Configuration**: Restricted cross-origin requests
- **JWT Security**: Secure token generation and validation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- 📧 Email: [contact@example.com](mailto:contact@example.com)
- 💬 Issues: [GitHub Issues](https://github.com/devSayanDeb/smart-attend-service-hitk/issues)
- 📚 Documentation: [docs/](docs/)

## 🎯 Roadmap

- [ ] **v1.0**: Core attendance system with Bluetooth beacons
- [ ] **v1.1**: Advanced analytics and reporting
- [ ] **v1.2**: Mobile app for students (iOS/Android)
- [ ] **v1.3**: Facial recognition integration
- [ ] **v1.4**: Multi-campus support
- [ ] **v1.5**: API for third-party integrations

---

**Built with ❤️ for educational institutions**

*Empowering educators with smart, secure, and seamless attendance management.*