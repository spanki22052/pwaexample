import React from 'react';

const NetworkStatus = ({ isOnline }) => {
  return (
    <div className={`status-indicator ${isOnline ? 'status-online' : 'status-offline'}`}>
      {isOnline ? '🟢 Онлайн' : '🔴 Офлайн'}
    </div>
  );
};

export default NetworkStatus;
