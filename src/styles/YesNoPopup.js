// import React, { useState, useEffect, useRef } from 'react';
// import { createPortal } from 'react-dom';
// import PropTypes from 'prop-types';
// import styles from './YesNoPopup.module.css';

// /**
//  * Yes/No confirmation popup with strict rule:
//  * - Confirmation (send) only happens when:
//  *   1. User types EXACTLY "1" (no spaces, no other characters)
//  *   2. AND clicks the "Yes (1)" button
//  * - Any other combination → cancel
//  */
// const YesNoPopup = ({ isOpen, onClose, onSubmit, title, message, type = 'default' }) => {
//   const [input, setInput] = useState('');
//   const [error, setError] = useState('');
//   const inputRef = useRef(null);

//   useEffect(() => {
//     if (isOpen) {
//       inputRef.current?.focus();
//       document.body.style.overflow = 'hidden';
//       const handleEscape = (e) => {
//         if (e.key === 'Escape') onClose();
//       };
//       document.addEventListener('keydown', handleEscape);
//       return () => {
//         document.body.style.overflow = '';
//         document.removeEventListener('keydown', handleEscape);
//       };
//     }
//   }, [isOpen, onClose]);

//   const clearError = () => setError('');

//   if (!isOpen) return null;

//   return createPortal(
//     <div className={styles.overlay} onClick={() => onClose()}>
//       <div
//         className={`${styles.popup} ${styles[type] || ''}`}
//         onClick={(e) => e.stopPropagation()}
//       >
//         <h2 className={styles.title}>{title}</h2>
//         <p className={styles.message}>{message}</p>
//         <input
//           type="text"
//           value={input}
//           onChange={(e) => {
//             setInput(e.target.value);
//             clearError();
//           }}
//           placeholder="Type exactly 1, then click Yes"
//           className={styles.input}
//           ref={inputRef}
//           maxLength={1}           // ← only allow 1 character
//           autoComplete="off"
//         />

//         {error && <p className={styles.error}>{error}</p>}

//         <div className={styles.buttons}>
//           <button
//             onClick={() => {
//               onSubmit(input, 'no');   // pass typed value + button choice
//               onClose();
//             }}
//             className={styles.cancel}
//           >
//             No (2)
//           </button>

//           <button
//             onClick={() => {
//               // Only allow send if typed exactly "1"
//               if (input === '1') {
//                 onSubmit(input, 'yes');
//                 onClose(); 
//               } else {
//                 setError('You must type exactly 1 before clicking Yes');
//               }
//               }}
//             className={styles.send}
//           >
//             Yes (1)
//           </button>
//         </div>
//       </div>
//     </div>,
//     document.body
//   );
// };

// YesNoPopup.propTypes = {
//   isOpen: PropTypes.bool.isRequired,
//   onClose: PropTypes.func.isRequired,
//   onSubmit: PropTypes.func.isRequired, // receives (typedValue, buttonChoice)
//   title: PropTypes.string.isRequired,
//   message: PropTypes.string.isRequired,
//   type: PropTypes.oneOf(['default', 'warning', 'error']),
// };

// export default YesNoPopup;

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
  isNotification: PropTypes.bool, // New Prop
};

export default YesNoPopup;