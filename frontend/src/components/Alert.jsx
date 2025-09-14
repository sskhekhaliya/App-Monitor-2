import React, { useEffect, useState } from 'react';
import './Alert.css';

const Alert = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 3000); // Alert disappears after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!visible) return null;

  return (
    <div className={`alert ${type}`}>
      <span>{message}</span>
      <button className="alert-close-button" onClick={() => {
        setVisible(false);
        onClose();
      }}>
        &times;
      </button>
    </div>
  );
};

export default Alert;