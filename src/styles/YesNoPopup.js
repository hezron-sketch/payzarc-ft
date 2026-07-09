import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './YesNoPopup.module.css';

const YesNoPopup = ({ isOpen, onClose, onSubmit, title, message, type = 'default', isNotification = false }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Clear input every time it opens
      setInput('');
      setError('');
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={() => onClose()}>
      <div
        className={`${styles.popup} ${styles[type] || ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        {/* Hide input if it's just a notification */}
        {!isNotification && (
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
            placeholder="Type exactly 1, then click Yes"
            className={styles.input}
            ref={inputRef}
            maxLength={1}
            autoComplete="off"
          />
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.buttons}>
          {/* Hide "No" button if it's just a notification */}
          {!isNotification && (
            <button
              onClick={() => {
                onSubmit(input, 'no');
                onClose();
              }}
              className={styles.cancel}
            >
              No (2)
            </button>
          )}

          <button
            onClick={() => {
              if (isNotification) {
                onClose(); // Just close for notifications
              } else if (input === '1') {
                onSubmit(input, 'yes');
                onClose();
              } else {
                setError('You must type exactly 1 before clicking Yes');
              }
            }}
            className={styles.send}
          >
            {isNotification ? 'OK' : 'Yes (1)'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

YesNoPopup.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['default', 'warning', 'error']),
  isNotification: PropTypes.bool,
};

export default YesNoPopup;

