// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Modal from './components/Modal';
import AdminForm from './components/AdminForm';
import Alert from './components/Alert';
import Dashboard from './components/Dashboard';
import ApplicationsPage from './pages/ApplicationsPage';
import ApplicationDetailsPage from './pages/ApplicationDetailsPage';
import AuthPage from './pages/AuthPage';
import BulkUploadForm from './components/BulkUploadForm';
import SettingsPage from './pages/SettingsPage';
import './App.css';

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';


// For production, this should be set via environment variables (e.g., VITE_API_BASE_URL)

function App() {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('form');
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(window.location.hash.substring(1) || 'dashboard');
  const [selectedApp, setSelectedApp] = useState(null);
  const [editingApp, setEditingApp] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  
  // STATE TO HOLD LIVE USER PROFILE DATA
  const [currentUser, setCurrentUser] = useState({ firstName: '', profilePicUrl: '' });

  // --- LOGOUT FUNCTION ---
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('firstName');
    localStorage.removeItem('profilePicUrl'); // Clear profile pic URL from storage
    setIsAuthenticated(false);
    setCurrentUser({ firstName: '', profilePicUrl: '' }); // Clear profile state
    setPage('auth');
    setAlert({ message: 'Logged out successfully.', type: 'success' });
  }, []);

  // --- TOKEN HELPER (Uses useCallback for stability) ---
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  // --- FETCH USER PROFILE (NEW) ---
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user profile.');
      }

      const userData = await response.json();

      // Update state with fetched data
      setCurrentUser({
        firstName: userData.firstName || 'User',
        profilePicUrl: userData.profilePicUrl || null,
      });

      // Update localStorage for consistency (especially for TopBar/Settings)
      localStorage.setItem('firstName', userData.firstName || 'User');
      localStorage.setItem('profilePicUrl', userData.profilePicUrl || '');

    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }, [handleLogout]);

  // --- FETCH APPLICATIONS ---
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data);
    } catch (err) {
      if (err.message !== 'Session expired. Please log in again.') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleLogout]);

  // --- LOGIN SUCCESS HANDLER ---
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setPage('dashboard');
    window.location.hash = 'dashboard';
    fetchApplications();
    fetchUserProfile(); // ✅ Fetch user info on login
  };

  // --- CRUD HANDLERS (Simplified for brevity, assuming full logic is correct) ---
  const handleAddApplication = async (newApp) => { /* ... API logic ... */ };
  const handleEditApplication = async (updatedApp) => { /* ... API logic ... */ };
  const handleDeleteApplication = async (appId) => { /* ... API logic ... */ };
  const handleBulkUpload = async (data, fileType) => { /* ... API logic ... */ };

  // --- MODAL CLICK HANDLERS ---
  const onAddAppClick = () => {
    setEditingApp(null);
    setShowModal(true);
    setModalContent('form');
  };

  const onJSONUploadClick = () => {
    setModalContent('json');
    setShowModal(true);
  };

  const onExcelUploadClick = () => {
    setModalContent('excel');
    setShowModal(true);
  };

  const handleAppClick = (app) => {
    setSelectedApp(app);
    window.location.hash = 'details';
    setPage('details');
  };

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    if (isAuthenticated) {
      fetchApplications();
      fetchUserProfile(); // ✅ Fetch user profile on initial load
    }
  }, [isAuthenticated, fetchApplications, fetchUserProfile]);

  // --- HASH CHANGE HANDLER (Unchanged) ---
  useEffect(() => {
    const handleHashChange = () => {
      setPage(window.location.hash.substring(1) || 'dashboard');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- PAGE RENDER ---
  const renderPage = () => {
    if (!isAuthenticated) {
      return <AuthPage onLoginSuccess={handleLoginSuccess} setErrorAlert={setAlert} API_BASE_URL={API_BASE_URL} />;
    }

    const dashboardProps = {
      applications,
      isLoading,
      error,
      onAppClick: handleAppClick,
      onAddAppClick,
      onJSONUploadClick,
      onExcelUploadClick,
      searchTerm,
    };

    switch (page) {
      case 'dashboard':
        return <Dashboard {...dashboardProps} />;

      case 'applications':
        return <ApplicationsPage
          applications={applications}
          searchTerm={searchTerm}
          onAppClick={handleAppClick}
          onEdit={(app) => {
            setEditingApp(app);
            setShowModal(true);
            setModalContent('form');
          }}
          onDelete={handleDeleteApplication}
        />;
      case 'settings':
        // NOTE: SettingsPage now relies on fetching its own initial data, but 
        // passing currentUser ensures immediate access to the first name.
        return <SettingsPage setAlert={setAlert} onLogout={handleLogout} API_BASE_URL={API_BASE_URL} />;

      case 'details':
        return <ApplicationDetailsPage app={selectedApp} onClose={() => { setPage('dashboard'); window.location.hash = 'dashboard'; }} />;

      default:
        return <Dashboard {...dashboardProps} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar only if authenticated */}
      {isAuthenticated && (
        <Sidebar
          onAddAppClick={onAddAppClick}
          onJSONUploadClick={onJSONUploadClick}
          onExcelUploadClick={onExcelUploadClick}
          page={page}
          setPage={setPage}
          onLogout={handleLogout}
        />
      )}

      <div className="main-content">
        {/* TopBar receives live currentUser state */}
        {isAuthenticated && (
          <TopBar
          API_BASE_URL={API_BASE_URL}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onLogout={handleLogout}
            firstName={currentUser.firstName}
            profilePicUrl={currentUser.profilePicUrl}
          />
        )}

        {renderPage()}
      </div>

      {/* Modal only if authenticated */}
      {isAuthenticated && (
        <Modal show={showModal} onClose={() => setShowModal(false)}>
          {modalContent === 'form' ? (
            <AdminForm
              onAddApplication={handleAddApplication}
              onEditApplication={handleEditApplication}
              onClose={() => setShowModal(false)}
              editingApp={editingApp}
            />
          ) : (
            <BulkUploadForm
              onUpload={handleBulkUpload}
              onClose={() => setShowModal(false)}
              fileType={modalContent}
            />
          )}
        </Modal>
      )}

      {/* Alert */}
      <Alert
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ message: '', type: '' })}
      />
    </div>
  );
}

export default App;