import React from 'react';
import { MdDns } from "react-icons/md";
import { FaTimesCircle } from "react-icons/fa";
import { FaCheckCircle } from "react-icons/fa";
import './SummaryCards.css';

const SummaryCards = ({ applications }) => {
  const apps = Array.isArray(applications) ? applications : [];

  const totalApps = apps.length;
  const upApps = apps.filter(app => app.status === 'up').length;
  const downApps = apps.filter(app => app.status === 'down').length;

  return (
    <div className="summary-cards">
      <div className="card total">
        <div className="card-text">
          <h4>Total Applications</h4>
        <h2>{totalApps}</h2>
        </div>
        <div className='icon-container icon-total-container'>
        <MdDns className="total-app-icon"/>
        </div>
      </div>
      <div className="card up">
        <div className="card-text">
        <h4>Applications Up</h4>
        <h2>{upApps}</h2>
        </div>
        <div className='icon-container icon-up-container'>
        <FaCheckCircle className="icon-up" />
        </div>
      </div>
      <div className="card down">
        <div className="card-text">
        <h4>Applications Down</h4>
        <h2>{downApps}</h2>
        </div>
        <div className='icon-container icon-down-container'>
        <FaTimesCircle className="icon-down" />
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;