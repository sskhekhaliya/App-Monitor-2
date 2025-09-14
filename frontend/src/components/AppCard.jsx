// frontend/src/components/AppCard.jsx
import React from 'react';
import './AppCard.css';
import { MdPersonOutline } from 'react-icons/md';

function AppCard({ app, onClick }) {
  const statusColor = app.status === 'up' ? 'status-up-dot' : 'status-down-dot';
  const textColor = app.status === 'up' ? 'status-up-text' : 'status-down-text';

  return (
    <div className={`app-card`}>
      <div className="card-header">
        <h3 className="app-name-text">{app.name}</h3>
        <div className="status-indicator-text">
          <span className={`status-dot ${statusColor}`}></span>
          <span className={`status-text ${textColor}`}>{app.status.toUpperCase()}</span>
        </div>
      </div>
      <p className="domain">{app.domain}</p>
      <div className="metadata-row owner">
        <MdPersonOutline className="inline-icon" />
        <p className="owner-text"><strong>{app.technicalOwner}</strong></p>
      </div>
      <div className="card-actions">
        <button className="view-details-button" onClick={() => onClick(app)}>View Details →</button>
      </div>
    </div>
  );
}
export default AppCard;