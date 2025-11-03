// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import './AuthPage.css'; // We'll define simple CSS here

const AuthPage = ({ onLoginSuccess, setErrorAlert, API_BASE_URL }) => {
    const [isLogin, setIsLogin] = useState(true); // Toggle between Login/Signup
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState(''); // New state for First Name
    const [lastName, setLastName] = useState('');   // New state for Last Name

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

        // Prepare the payload based on whether we are logging in or signing up
        const payload = isLogin
            ? { username, password }
            : { username, password, firstName, lastName };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Authentication failed.');
            }

            if (isLogin) {
    // Store the token and user info (e.g., in localStorage)
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.user.username);
    localStorage.setItem('firstName', data.user.firstName); 
    onLoginSuccess();
} else {
                // Signup Success
                setErrorAlert({ message: 'Signup successful! Please log in.', type: 'success' });
                setIsLogin(true); // Switch to login view
            }
        } catch (error) {
            setErrorAlert({ message: error.message, type: 'error' });
        }
    };

    return (
        <>
        <h1 className='login-page-heading'>Welcome to App Monitor</h1>
        <div className="auth-page-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>

                {!isLogin && (
                    <>
                        <div className="form-group">
                            <label>First Name</label>
                            <input 
                                type="text" 
                                value={firstName} 
                                onChange={(e) => setFirstName(e.target.value)} 
                                required={!isLogin}
                            />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input 
                                type="text" 
                                value={lastName} 
                                onChange={(e) => setLastName(e.target.value)} 
                                required={!isLogin}
                            />
                        </div>
                    </>
                )}

                <div className="form-group">
                    <label>Username</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                    />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                </div>
                
                <button type="submit" className="submit-button">
                    {isLogin ? 'Log In' : 'Sign Up'}
                </button>
                
                <p className="toggle-auth">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="toggle-button">
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
            </form>
        </div>
        </>
    );
};

export default AuthPage;