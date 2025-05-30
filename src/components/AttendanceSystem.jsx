import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  User,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Clock,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";

const AttendanceSystem = () => {
  const [currentView, setCurrentView] = useState("login");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [registrationData, setRegistrationData] = useState({
    name: "",
    employeeId: "",
    email: "",
    aadhaarNumber: "",
    phone: "",
    password: "",
  });
  const [loginData, setLoginData] = useState({
    employeeId: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [faceCapture, setFaceCapture] = useState(false);
  const [faceImageCaptured, setFaceImageCaptured] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

 
  useEffect(() => {
    const storedUsers = localStorage.getItem("attendanceUsers");
    const storedAttendance = localStorage.getItem("attendanceRecords");

    if (storedAttendance) {
      try {
        setAttendanceData(JSON.parse(storedAttendance));
      } catch (error) {
        console.error("Error parsing stored attendance data:", error);
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  
  const saveUsersToStorage = (users) => {
    try {
      localStorage.setItem("attendanceUsers", JSON.stringify(users));
    } catch (error) {
      console.error("Error saving users to localStorage:", error);
    }
  };

  const getUsersFromStorage = () => {
    try {
      const storedUsers = localStorage.getItem("attendanceUsers");
      return storedUsers ? JSON.parse(storedUsers) : [];
    } catch (error) {
      console.error("Error reading users from localStorage:", error);
      return [];
    }
  };

  const saveAttendanceToStorage = (attendance) => {
    try {
      localStorage.setItem("attendanceRecords", JSON.stringify(attendance));
    } catch (error) {
      console.error("Error saving attendance to localStorage:", error);
    }
  };

  const apiCall = async (endpoint, method = "GET", data = null) => {
    setLoading(true);
    try {
    
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (endpoint === "register" && method === "POST") {
        const existingUsers = getUsersFromStorage();

    
        const userExists = existingUsers.find(
          (u) => u.employeeId === data.employeeId
        );
        if (userExists) {
          throw new Error("Employee ID already exists");
        }

        
        const newUser = {
          ...data,
          id: Date.now(),
          createdAt: new Date().toISOString(),
        };

        const updatedUsers = [...existingUsers, newUser];
        saveUsersToStorage(updatedUsers);

        return { success: true, user: newUser };
      }

      if (endpoint === "login" && method === "POST") {
        const users = getUsersFromStorage();
        const user = users.find(
          (u) =>
            u.employeeId === data.employeeId && u.password === data.password
        );

        if (user) {
        
          user.lastLogin = new Date().toISOString();
          const updatedUsers = users.map((u) => (u.id === user.id ? user : u));
          saveUsersToStorage(updatedUsers);

          return { success: true, user };
        }
        throw new Error("Invalid employee ID or password");
      }

      if (endpoint === "attendance" && method === "POST") {
        const attendance = {
          id: Date.now(),
          userId: data.userId,
          userName: user?.name || "Unknown",
          employeeId: user?.employeeId || "Unknown",
          timestamp: new Date().toISOString(),
          status: "present",
          faceData: data.faceData,
        };

        const updatedAttendance = [attendance, ...attendanceData];
        setAttendanceData(updatedAttendance);
        saveAttendanceToStorage(updatedAttendance);

        return { success: true, attendance };
      }

      return { success: true };
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setFaceCapture(true);
    } catch (error) {
      setMessage("Camera access denied or not available");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setFaceCapture(false);
    setFaceImageCaptured(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      
      const imageData = canvas.toDataURL("image/jpeg");
      setFaceImageCaptured(true);
      setMessage("Face captured successfully!");
      return imageData;
    }
    return null;
  };

  const handleRegister = async () => {
    try {
    
      if (
        !registrationData.name ||
        !registrationData.employeeId ||
        !registrationData.email ||
        !registrationData.phone ||
        !registrationData.password
      ) {
        setMessage("Please fill all required fields");
        return;
      }

      if (!faceImageCaptured) {
        setMessage("Please capture your face first");
        return;
      }

      const faceData = captureImage();

      const response = await apiCall("register", "POST", {
        ...registrationData,
        faceData,
      });

      if (response.success) {
        setMessage("Registration successful! You can now login.");
        setCurrentView("login");
        stopCamera();
        setRegistrationData({
          name: "",
          employeeId: "",
          email: "",
          aadhaarNumber: "",
          phone: "",
          password: "",
        });
        setFaceImageCaptured(false);
      }
    } catch (error) {
      setMessage("Registration failed: " + error.message);
    }
  };

  const handleLogin = async () => {
    try {
      if (!loginData.employeeId || !loginData.password) {
        setMessage("Please enter both Employee ID and Password");
        return;
      }

      const response = await apiCall("login", "POST", loginData);

      if (response.success) {
        setUser(response.user);
        setCurrentView("dashboard");
        setMessage("Login successful!");

        
        const storedAttendance = localStorage.getItem("attendanceRecords");
        if (storedAttendance) {
          const allAttendance = JSON.parse(storedAttendance);
          const userAttendance = allAttendance.filter(
            (a) => a.userId === response.user.id
          );
          setAttendanceData(userAttendance);
        }
      }
    } catch (error) {
      setMessage("Login failed: " + error.message);
    }
  };

  const markAttendance = async () => {
    try {
      const faceData = captureImage();
      if (!faceData) {
        setMessage("Please capture your face for attendance");
        return;
      }

      const response = await apiCall("attendance", "POST", {
        userId: user.id,
        faceData,
        timestamp: new Date().toISOString(),
      });

      if (response.success) {
        setMessage("Attendance marked successfully!");
        stopCamera();
      }
    } catch (error) {
      setMessage("Failed to mark attendance: " + error.message);
    }
  };

  const clearAllData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all stored data? This action cannot be undone."
      )
    ) {
      localStorage.removeItem("attendanceUsers");
      localStorage.removeItem("attendanceRecords");
      setAttendanceData([]);
      setMessage("All data cleared successfully");
    }
  };

  const renderLogin = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance System
          </h1>
          <p className="text-gray-600 mt-2">Sign in to mark your attendance</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee ID
            </label>
            <input
              type="text"
              required
              value={loginData.employeeId}
              onChange={(e) =>
                setLoginData({ ...loginData, employeeId: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your employee ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentView("register")}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Don't have an account? Register here
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={clearAllData}
            className="text-red-600 hover:text-red-700 text-sm"
          >
            Clear All Data
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes("successful")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );

  const renderRegister = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            User Registration
          </h1>
          <p className="text-gray-600 mt-2">
            Create your account with face recognition
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={registrationData.name}
                onChange={(e) =>
                  setRegistrationData({
                    ...registrationData,
                    name: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={registrationData.employeeId}
                onChange={(e) =>
                  setRegistrationData({
                    ...registrationData,
                    employeeId: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={registrationData.email}
                onChange={(e) =>
                  setRegistrationData({
                    ...registrationData,
                    email: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                required
                value={registrationData.password}
                onChange={(e) =>
                  setRegistrationData({
                    ...registrationData,
                    password: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aadhaar Number (Optional)
              </label>
              <input
                type="text"
                pattern="[0-9]{12}"
                maxLength="12"
                value={registrationData.aadhaarNumber}
                onChange={(e) =>
                  setRegistrationData({
                    ...registrationData,
                    aadhaarNumber: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="12-digit Aadhaar number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={registrationData.phone}
                onChange={(e) =>
                  setRegistrationData({
                    ...registrationData,
                    phone: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Registering..." : "Register Account"}
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Face Capture
            </h3>

            {!faceCapture ? (
              <div className="text-center">
                <div className="bg-gray-100 rounded-lg p-8 mb-4">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Click to start camera for face capture
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Camera
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-64 bg-black rounded-lg"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex space-x-3">
                  <button
                    onClick={captureImage}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {faceImageCaptured ? "Recapture Face" : "Capture Face"}
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Stop Camera
                  </button>
                </div>
                {faceImageCaptured && (
                  <div className="text-center text-green-600 text-sm font-medium">
                    ✓ Face captured successfully! You can now register.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentView("login")}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Already have an account? Sign in here
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes("successful")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
    
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Attendance Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  isOnline
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>{isOnline ? "Online" : "Offline"}</span>
              </div>
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={() => {
                  setUser(null);
                  setCurrentView("login");
                  stopCamera();
                  setAttendanceData([]);
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Mark Attendance
                </h2>

                {!faceCapture ? (
                  <div className="text-center">
                    <div className="bg-indigo-50 rounded-lg p-8 mb-4">
                      <Camera className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        Start camera to mark your attendance
                      </p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Start Face Recognition
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-64 bg-black rounded-lg"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex space-x-3">
                      <button
                        onClick={markAttendance}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? "Processing..." : "Mark Attendance"}
                      </button>
                      <button
                        onClick={stopCamera}
                        className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Stop Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Today's Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Employee ID</span>
                    <span className="font-medium">{user?.employeeId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Present
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Date</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Time</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Attendance
                </h3>
                <div className="space-y-3">
                  {attendanceData.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No attendance records yet
                    </p>
                  ) : (
                    attendanceData.slice(0, 5).map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(record.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {message && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <div
            className={`p-4 rounded-lg shadow-lg ${
              message.includes("successful")
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            <div className="flex items-center">
              {message.includes("successful") ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <XCircle className="w-5 h-5 mr-2" />
              )}
              <span className="text-sm">{message}</span>
              <button
                onClick={() => setMessage("")}
                className="ml-2 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="font-sans">
      {currentView === "login" && renderLogin()}
      {currentView === "register" && renderRegister()}
      {currentView === "dashboard" && renderDashboard()}
    </div>
  );
};

export default AttendanceSystem;
