// src/App.jsx
import React, { useState, useEffect } from 'react';
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
  const [currentUser, setCurrentUser] = useState({ firstName: '', profilePicUrl: '' });

  // --- TOKEN HELPER ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  // --- LOGOUT FUNCTION ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setPage('auth');
    setAlert({ message: 'Logged out successfully.', type: 'success' });
  };

  // --- FETCH USER PROFILE (NEW) ---
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:3000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user profile.');
      }

      const userData = await response.json();

      // Adjust key names based on your backend
      setCurrentUser({
        firstName: userData.firstName || userData.name?.split(' ')[0] || 'User',
        profilePicUrl: userData.profilePicUrl || userData.photo || '',
      });
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  // --- LOGIN SUCCESS HANDLER ---
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setPage('dashboard');
    window.location.hash = 'dashboard';
    fetchApplications();
    fetchUserProfile(); // ✅ Fetch user info on login
  };

  // --- FETCH APPLICATIONS ---
  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token && isAuthenticated) return;

      const response = await fetch('http://localhost:3000/api/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired. Please log in again.');
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
  };

  // --- CRUD HANDLERS ---
  const handleAddApplication = async (newApp) => {
    try {
      const response = await fetch('http://localhost:3000/api/applications', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newApp),
      });

      if (response.status === 401) return handleLogout();

      if (response.ok) {
        setAlert({ message: 'Application added successfully!', type: 'success' });
        fetchApplications();
        setShowModal(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add application.');
      }
    } catch (error) {
      setAlert({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

  const handleEditApplication = async (updatedApp) => {
    try {
      const response = await fetch(`http://localhost:3000/api/applications/${updatedApp._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedApp),
      });

      if (response.status === 401) return handleLogout();

      if (response.ok) {
        setAlert({ message: 'Application updated successfully!', type: 'success' });
        fetchApplications();
        setShowModal(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update application.');
      }
    } catch (error) {
      setAlert({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

  const handleDeleteApplication = async (appId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/applications/${appId}`, {
        method: 'DELETE',
        headers: { Authorization: getAuthHeaders().Authorization },
      });

      if (response.status === 401) return handleLogout();

      if (response.ok) {
        setAlert({ message: 'Application deleted successfully!', type: 'success' });
        fetchApplications();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete application.');
      }
    } catch (error) {
      setAlert({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

  const handleBulkUpload = async (data, fileType) => {
    try {
      const response = await fetch('http://localhost:3000/api/applications/bulk', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (response.status === 401) return handleLogout();

      const result = await response.json();
      if (response.ok) {
        setAlert({ message: result.message, type: 'success' });
        fetchApplications();
      } else {
        throw new Error(result.message || 'Failed to complete bulk upload.');
      }
    } catch (error) {
      setAlert({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

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
      fetchUserProfile(); // ✅ Fetch user data when page reloads and token exists
    }
  }, [isAuthenticated]);

  // --- HASH CHANGE HANDLER ---
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
      return <AuthPage onLoginSuccess={handleLoginSuccess} setErrorAlert={setAlert} />;
    }

    switch (page) {
      case 'dashboard':
        return (
          <Dashboard
            applications={applications}
            isLoading={isLoading}
            error={error}
            onAppClick={handleAppClick}
            onAddAppClick={onAddAppClick}
            onJSONUploadClick={onJSONUploadClick}
            onExcelUploadClick={onExcelUploadClick}
          />
        );

      case 'applications':
        return (
          <ApplicationsPage
            applications={applications}
            searchTerm={searchTerm}
            onAppClick={handleAppClick}
            onEdit={(app) => {
              setEditingApp(app);
              setShowModal(true);
              setModalContent('form');
            }}
            onDelete={handleDeleteApplication}
          />
        );

      case 'settings':
        return <SettingsPage setAlert={setAlert} onLogout={handleLogout} />;

      case 'details':
        return (
          <ApplicationDetailsPage
            app={selectedApp}
            onClose={() => {
              setPage('dashboard');
              window.location.hash = 'dashboard';
            }}
          />
        );

      default:
        return (
          <Dashboard
            applications={applications}
            isLoading={isLoading}
            error={error}
            searchTerm={searchTerm}
            onAppClick={handleAppClick}
            onAddAppClick={onAddAppClick}
            onJSONUploadClick={onJSONUploadClick}
            onExcelUploadClick={onExcelUploadClick}
          />
        );
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
        {/* TopBar only if authenticated */}
        {isAuthenticated && (
          <TopBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onLogout={handleLogout}
            firstName={currentUser.firstName}
            profilePicUrl={currentUser.profilePicUrl}
          />
        )}

        {renderPage()}
      </div>

      {/* Modal */}
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
