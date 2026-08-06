
import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Toast, useToast } from '../hooks/useToast';

interface ToastComponentProps {
  toast: Toast;
}

export const ToastComponent: React.FC<ToastComponentProps> = ({ toast }) => {
  const { hideToast } = useToast();
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="toast-icon success" />;
      case 'error':
        return <AlertCircle className="toast-icon error" />;
      case 'warning':
        return <AlertTriangle className="toast-icon warning" />;
      case 'info':
      default:
        return <Info className="toast-icon info" />;
    }
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      hideToast(toast.id);
    }, 300); // Match CSS animation duration
  };

  useEffect(() => {
    if (!toast.duration || toast.duration === Infinity) return;

    const interval = 10;
    const step = (interval / toast.duration) * 100;
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.duration]);

  return (
    <div className={`toast-item ${toast.type} ${isExiting ? 'exit' : 'enter'}`}>
      <div className="toast-content">
        <div className="toast-icon-wrapper">
          {getIcon()}
        </div>
        <div className="toast-message">
          {toast.message}
        </div>
        <button className="toast-close-btn" onClick={handleClose}>
          <X size={16} />
        </button>
      </div>
      {toast.duration && toast.duration !== Infinity && (
        <div className="toast-progress-bar">
          <div 
            className="toast-progress-fill" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();
  
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
