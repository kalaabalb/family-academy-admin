import React from 'react';

const SuccessAlert = ({ message, onClose }) => {
  if (!message) return null;
  
  return (
    <div style={{
      backgroundColor: '#e8f5e9',
      color: '#2e7d32',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span>{message}</span>
      {onClose && (
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#2e7d32',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SuccessAlert;