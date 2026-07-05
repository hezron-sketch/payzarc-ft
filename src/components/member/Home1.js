// import axios from 'axios';
// import React, { useState, useEffect } from 'react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import {
//   faSearch,
//   faArrowLeft,
//   faPaperPlane,
//   faMoneyBillWave,
//   faPlus,
//   faMinus,
//   faMobileAlt,
//   faCreditCard,
//   faUniversity,
//   faEnvelope, faTv,
//   faGlobe,
//   faHandshake,
//   faUsers,
//   faBriefcase,
//   faChevronRight,
//   faUserPlus,
//   faEye,
//   faEyeSlash,
//   faHome,
//   faBolt,
// } from '@fortawesome/free-solid-svg-icons';
// import YesNoPopup from '../../styles/YesNoPopup';
// import styles from './Home.module.css';
// import { countries } from '../../utility/countries';
// //import { djangoAxios } from '../../utility/axiosInstance';
// import { djangoApis } from '../../utility/axiosInstance';
// import { API_URL } from '../../utility/constants';

// function Option({ icon, text, onClick }) {
//   return (
//     <div className={styles.option} onClick={onClick}>
//       <FontAwesomeIcon icon={icon} className={styles.optionIcon} />
//       <span className={styles.optionText}>{text}</span>
//     </div>
//   );
// }

// function Home({ onPageChange, user }) {
//   const [activeSection, setActiveSection] = useState('dashboard');
//   const [withdrawOption, setWithdrawOption] = useState('');
//   const [emailSearchTerm, setEmailSearchTerm] = useState('');
//   const [selectedEmail, setSelectedEmail] = useState('');
//   const [sendAmount, setSendAmount] = useState('');
//   const [withdrawAmount, setWithdrawAmount] = useState('');
//   const [agentNumber, setAgentNumber] = useState('');
//   const [selectedAccount, setSelectedAccount] = useState('');
//   const [addAmount, setAddAmount] = useState('');
//   const [addSelectedAccount, setAddSelectedAccount] = useState('');
//   const [errorWallet, setErrorWallet] = useState('');
//   const [openDialog, setOpenDialog] = useState(false);
//   const [dialogTitle, setDialogTitle] = useState('');
//   const [dialogMessage, setDialogMessage] = useState('');
//   const [dialogAction, setDialogAction] = useState(null);
//   const [selectedAddOption, setSelectedAddOption] = useState('');
//   const [showAddInput, setShowAddInput] = useState(false);
//   const [showWithdrawOptions, setShowWithdrawOptions] = useState(false);
//   const [sendMethod, setSendMethod] = useState('');
//   const [selectedCountryCode, setSelectedCountryCode] = useState('');
//   const [phoneSearchTerm, setPhoneSearchTerm] = useState('');
//   const [fullPhone, setFullPhone] = useState('');
//   const [mobileMoneySelected, setMobileMoneySelected] = useState(false);
//   const [mobileMoneyWithdrawSelected, setMobileMoneyWithdrawSelected] = useState(false);
//   const [showBalance, setShowBalance] = useState(false);
//   const [animateKey, setAnimateKey] = useState(0);
//   const [bottomView, setBottomView] = useState('transactions');
//   // ───────────────────────────────────────────────
//   // States for real balance from Django
//   // ───────────────────────────────────────────────
//   const [balanceData, setBalanceData] = useState(null);
//   const [loadingBalance, setLoadingBalance] = useState(true);
//   const [balanceError, setBalanceError] = useState(null);

//   //---------------------------------------------------
//   const [quickRecipient, setQuickRecipient] = useState('');
//   const [quickAmount, setQuickAmount] = useState('');

//   //-----------------------------------------------------------
//   // Add Recipient states
//   const [recipientName, setRecipientName] = useState('');
//   const [recipientLabel, setRecipientLabel] = useState('');
//   const [recipientCountryCode, setRecipientCountryCode] = useState('+254'); // Default Kenya
//   const [recipientPhone, setRecipientPhone] = useState('');
//   const [recipientType, setRecipientType] = useState('email'); // 'email' | 'phone'
//   const [recipientEmail, setRecipientEmail] = useState('');
//   const [emailError, setEmailError] = useState('');
//   const [labelError, setLabelError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [myPhone, setMyPhone] = useState(null);

//   // Replace or add these lines near your other useState declarations

//   const [recipientSearchTerm, setRecipientSearchTerm] = useState('');
//   const [selectedRecipient, setSelectedRecipient] = useState(null);   // { type: 'email'|'phone', value: string }

//   const [favourites, setFavourites] = useState([]);          // list from API
//   const [loadingFavourites, setLoadingFavourites] = useState(false);
//   const [favouritesError, setFavouritesError] = useState(null);

//   // PIN Verification for transactions
//   const [pinVerificationError, setPinVerificationError] = useState('');
//   const [verifyingPin, setVerifyingPin] = useState(false);
//   const [showPinInput, setShowPinInput] = useState(false);    // Eye toggle
//   const [notificationOnly, setNotificationOnly] = useState(false);
//   const [inputPin, setInputPin] = useState('');
//   const [showInputPin, setShowInputPin] = useState(false);

//   //const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));
//   // Sort countries by dial code numerically ascending
//   const sortedCountries = [...countries].sort((a, b) => {
//     const codeA = parseInt(a.code.slice(1)); // Remove '+' and convert to number
//     const codeB = parseInt(b.code.slice(1));
//     return codeA - codeB;
//   });

//   const [quickDestinationCountry, setQuickDestinationCountry] = useState(sortedCountries.find(c => c.name === 'Kenya') || sortedCountries[0]);

//   // Mock exchange rates and currency codes (add more as needed)
//   const exchangeRates = {
//     'Kenya': { rate: 129.5, currency: 'KES' },
//     'United States': { rate: 1, currency: 'USD' },
//     'United Kingdom': { rate: 0.78, currency: 'GBP' },
//     'Canada': { rate: 1.36, currency: 'CAD' },
//     // Add more countries here if desired
//   };

//   // Get rate and currency for selected country (fallback to USD)
//   const destInfo = exchangeRates[quickDestinationCountry.name] || { rate: 1, currency: 'USD' };
//   const equivalentAmount = quickAmount ? (parseFloat(quickAmount) * destInfo.rate).toFixed(2) : '0.00';

//   const emails = [
//     'ahi.appoli@gmail.com',
//     'ajoseph@payzarc.com',
//     'amogezi@payzarc.com',
//   ];
//   const phonesByCountry = {
//     '+1': ['8323302962', '8323302963'],
//     '+254': ['711194068', '703133119'],
//   };

//   const emailFilteredEmails = emails.filter((email) =>
//     email.toLowerCase().startsWith(emailSearchTerm.toLowerCase())
//   );
//   const filteredPhones = (phonesByCountry[selectedCountryCode] || []).filter((phone) =>
//     phone.toLowerCase().startsWith(phoneSearchTerm.toLowerCase())
//   );

//   const toggleBalance = () => {
//     setShowBalance(prev => !prev);
//     setAnimateKey(prev => prev + 1); // forces remount / re-animation
//   };

//   // Helper to format balance safely
//   const formattedBalance = balanceData
//     ? Number(balanceData.balance).toLocaleString(undefined, {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     })
//     : '0.00';

//   // Reset form fields when user changes
//   useEffect(() => {
//     setActiveSection('dashboard');
//     setWithdrawOption('');
//     setEmailSearchTerm('');
//     setSelectedEmail('');
//     setSendAmount('');
//     setWithdrawAmount('');
//     setAgentNumber('');
//     setSelectedAccount('');
//     setAddAmount('');
//     setAddSelectedAccount('');
//     setErrorWallet('');
//     setOpenDialog(false);
//     setDialogTitle('');
//     setDialogMessage('');
//     setDialogAction(null);
//     setSelectedAddOption('');
//     setShowAddInput(false);
//     setShowWithdrawOptions(false);
//     setSendMethod('');
//     setSelectedCountryCode('');
//     setPhoneSearchTerm('');
//     setFullPhone('');
//     setMobileMoneySelected(false);
//     setMobileMoneyWithdrawSelected(false);
//   }, [user]);

//   useEffect(() => {
//     const fetchMyContact = async () => {
//       try {
//         // const res = await djangoAxios.get('/api/my-contact/');
//         const res = await djangoApis.system2.get('/api/my-contact/');
//         if (res.data.success) {
//           setMyPhone(res.data.phone);
//         }
//       } catch (e) { }
//     };
//     fetchMyContact();
//   }, []);

//   const handleSavePhoneRecipient = async () => {
//     const fullPhone = recipientCountryCode + recipientPhone.replace(/^0+/, '');
//     if (!fullPhone || fullPhone.length < 10) {
//       alert('Please enter a valid phone number (at least 10 digits after country code)');
//       return;
//     }
//     if (myPhone && fullPhone === myPhone) {
//       alert("You cannot add your own phone number as a favorite.");
//       return;
//     }

//     setLoading(true);

//     try {
//       // Step 1: Check
//       //const checkRes = await djangoAxios.post('/api/check/', {
//       const checkRes = await djangoApis.system2.post('/api/check/', {
//         type: 'phone',
//         value: fullPhone
//       });
//       alert(checkRes.data.message || 'Check complete');

//       // Step 2: Save
//       //const saveRes = await djangoAxios.post('/api/favorite/add/', {
//       const saveRes = await djangoApis.system2.post('/api/favorite/add/', {
//         favourite_type: 'phone',
//         favourite_detail: fullPhone,
//         label: recipientLabel.trim(),
//       });

//       if (saveRes.status === 201) {
//         alert('Phone recipient added successfully!');
//         handleAddRecipientBack();
//       } else {
//         alert(`Unexpected status: ${saveRes.status}`);
//       }
//     } catch (err) {
//       console.error('SAVE PHONE ERROR:', err);  // ← see full details in browser console (F12)
//       let errorMessage = 'Failed to save phone recipient';
//       if (err.response?.data) {
//         const data = err.response.data;
//         // Try to extract the first useful error message
//         if (typeof data === 'object' && data !== null) {
//           // Common Django patterns
//           if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
//             errorMessage = data.non_field_errors[0];
//           } else if (data.favourite_detail && Array.isArray(data.favourite_detail)) {
//             errorMessage = data.favourite_detail[0];
//           } else if (data.favourite_type && Array.isArray(data.favourite_type)) {
//             errorMessage = data.favourite_type[0];
//           } else if (data.label && Array.isArray(data.label)) {
//             errorMessage = data.label[0];
//           } else if (data.error) {
//             errorMessage = data.error;
//           } else if (data.detail) {
//             errorMessage = data.detail;
//           } else {
//             // Fallback: show the whole object as string
//             errorMessage = JSON.stringify(data, null, 2);
//           }
//         } else {
//           errorMessage = String(data) || err.message || 'Server returned unknown error';
//         }

//         // Add status code for context
//         errorMessage += ` (HTTP ${err.response.status})`;
//       } else if (err.request) {
//         errorMessage = 'No response from server – is Django running? Network issue?';
//       } else {
//         errorMessage = err.message || 'Unknown error';
//       }

//       alert(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const validateEmailField = () => {
//     if (!recipientEmail) {
//       setEmailError('Email is required');
//       return false;
//     }
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(recipientEmail)) {
//       setEmailError('Please enter a valid email');
//       return false;
//     }
//     if (recipientEmail.length < 10 || recipientEmail.length > 30) {
//       setEmailError('Email must be 10–30 characters');
//       return false;
//     }
//     setEmailError('');
//     return true;
//   };

//   const validateLabel = () => {
//     const trimmed = recipientLabel.trim();
//     if (!trimmed) {
//       setLabelError('Label is required');
//       return false;
//     }
//     if (trimmed.length < 3 || trimmed.length > 15) {
//       setLabelError('Label must be 3–15 characters');
//       return false;
//     }
//     if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
//       setLabelError('Only letters, numbers and spaces allowed');
//       return false;
//     }
//     setLabelError('');
//     return true;
//   };

//   const handleSaveEmailRecipient = async () => {
//     if (!validateEmailField() || !validateLabel()) return;

//     setLoading(true);

//     try {
//       // Step 1: Check
//       //const checkRes = await djangoAxios.post('/api/check/', {
//       const checkRes = await djangoApis.system2.post('/api/check/', {

//         type: 'email',
//         value: recipientEmail,   // ← consistent format
//       });
//       const { is_registered, message } = checkRes.data;
//       alert(message || (is_registered ? 'Email already registered' : 'Email not registered'));

//       // Step 2: Save
//       //const saveRes = await djangoAxios.post('/api/favorite/add/', {
//       const saveRes = await djangoApis.system2.post('/api/favorite/add/', {
//         favourite_type: 'email',
//         favourite_detail: recipientEmail,
//         label: recipientLabel.trim(),
//       });

//       if (saveRes.status === 201) {
//         alert('Recipient added successfully!');
//         setRecipientEmail('');
//         setRecipientLabel('');
//         setEmailError('');
//         setLabelError('');
//         handleAddRecipientBack();
//       } else {
//         alert(`Unexpected status: ${saveRes.status}`);
//       }
//     } catch (err) {
//       console.error('SAVE EMAIL ERROR:', err);

//       let errorMessage = 'Failed to add email recipient';

//       if (err.response?.data) {
//         const data = err.response.data;

//         if (typeof data === 'object' && data !== null) {
//           if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
//             errorMessage = data.non_field_errors[0];
//           } else if (data.favourite_detail && Array.isArray(data.favourite_detail)) {
//             errorMessage = data.favourite_detail[0];
//           } else if (data.favourite_type && Array.isArray(data.favourite_type)) {
//             errorMessage = data.favourite_type[0];
//           } else if (data.label && Array.isArray(data.label)) {
//             errorMessage = data.label[0];
//           } else if (data.error) {
//             errorMessage = data.error;
//           } else if (data.detail) {
//             errorMessage = data.detail;
//           } else {
//             errorMessage = JSON.stringify(data, null, 2);
//           }
//         } else {
//           errorMessage = String(data) || err.message || 'Server returned unknown error';
//         }

//         errorMessage += ` (HTTP ${err.response.status})`;
//       } else if (err.request) {
//         errorMessage = 'No response from server – check Django is running';
//       } else {
//         errorMessage = err.message || 'Unknown error';
//       }

//       alert(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ───────────────────────────────────────────────
//   // Fetch real wallet balance from Django
//   // ───────────────────────────────────────────────
//   //--------------------------------------------------------------------------
//   // Define fetchBalance as a normal function in the component
//   const fetchBalance = async () => {
//     if (!user?.email) {
//       setLoadingBalance(false);
//       return;
//     }
//     try {
//       console.log('Sending request to /api/balance/');
//       console.log('Token from localStorage:', localStorage.getItem('accessToken'));
//       console.log('Full headers:', djangoApis.system1.defaults.headers);
//       const response = await djangoApis.system1.get('/api/balance/');
//       const data = response.data;
//       if (data.success !== undefined) {
//         setBalanceData(data);
//       } else {
//         setBalanceError(data.error || 'Failed to load balance');
//       }
//     } catch (err) {
//       console.error('Balance fetch failed:', err);
//       if (err.response?.status === 404) {
//         setBalanceError('No wallet found for this account.');
//       } else {
//         setBalanceError('Could not load wallet balance');
//       }
//     } finally {
//       setLoadingBalance(false);
//     }
//   };

//   // Now call it in useEffect (initial load + user change)
//   useEffect(() => {
//     setLoadingBalance(true);
//     setBalanceError(null);
//     setBalanceData(null);
//     fetchBalance();
//   }, [user]);

//   const fetchFavourites = async (searchQuery = '') => {
//     if (!searchQuery.trim()) {
//       setFavourites([]);
//       return;
//     }

//     setLoadingFavourites(true);
//     setFavouritesError(null);

//     try {
//       // Decide type based on input pattern
//       let favType = 'phone';
//       if (
//         /^[a-zA-Z]/.test(searchQuery) ||           // starts with letter
//         searchQuery.includes('@')                   // contains @
//       ) {
//         favType = 'email';
//       } else if (
//         searchQuery.startsWith('+') ||
//         /^\d/.test(searchQuery)                     // starts with digit
//       ) {
//         favType = 'phone';
//       } else {
//         // unclear → skip fetch or default to phone
//         setFavourites([]);
//         setLoadingFavourites(false);
//         return;
//       }

//       const response = await djangoApis.system2.get('/api/favorites/', {
//         params: {
//           type: favType,
//           query: searchQuery,
//         },
//       });

//       if (response.data.success) {
//         setFavourites(response.data.favourites || []);
//       } else {
//         setFavouritesError(response.data.message || 'Failed to load favourites');
//         setFavourites([]);
//       }
//     } catch (err) {
//       console.error('Favourites fetch error:', err);
//       setFavouritesError('Could not load favourite contacts');
//       setFavourites([]);
//     } finally {
//       setLoadingFavourites(false);
//     }
//   };

//   //------------///////////////////////////////////////
//   const handleAddRecipientBack = () => {
//     setActiveSection('dashboard');
//     // Clear form
//     setRecipientName('');
//     setRecipientLabel('');
//     setRecipientCountryCode('+254');
//     setRecipientPhone('');
//   };

//   const handleSaveRecipient = () => {
//     if (!recipientName.trim() || !recipientPhone.trim() || recipientPhone.length < 9) {
//       alert('Please enter a valid name and phone number');
//       return;
//     }
//     const fullPhone = recipientCountryCode + recipientPhone;

//     // Placeholder save (you can later connect to backend or localStorage array)
//     alert(`Recipient saved!\nName: ${recipientName}\nPhone: ${fullPhone}\nLabel: ${recipientLabel || 'None'}`);

//     // Clear and go back
//     handleAddRecipientBack();
//   };

//   // ───────────────────────────────────────────────
//   // Your existing handlers (unchanged)
//   // ───────────────────────────────────────────────
//   const handleQuickSend = () => {
//     const amount = parseFloat(quickAmount);
//     if (!quickRecipient.trim() || isNaN(amount) || amount <= 0) {
//       alert('Please enter a valid recipient and amount');
//       return;
//     }
//     openConfirmationDialog(
//       'Confirm Quick Send',
//       `Send ${amount.toFixed(2)} USD (${equivalentAmount} ${destInfo.currency}) to ${quickRecipient} in ${quickDestinationCountry.name}?`,
//       () => alert('Quick Send processed! (Connect to backend API here)')
//     );
//   };

//   const handleEmailSearchChange = (e) => {
//     setErrorWallet('');
//     setEmailSearchTerm(e.target.value);
//     setSendAmount('');
//     setSelectedEmail('');
//   };

//   const handleWithdrawOption = (option) => {
//     if (option === 'mobileMoney') {
//       setMobileMoneyWithdrawSelected(true);
//     } else {
//       setWithdrawOption(option);
//       setMobileMoneyWithdrawSelected(false);
//       setShowWithdrawOptions(false);
//       setWithdrawAmount('');
//       setAgentNumber('');
//       setSelectedAccount('');
//       setSelectedCountryCode('');
//       setPhoneSearchTerm('');
//       setFullPhone('');
//     }
//   };

//   const handleMobileMoneyWithdrawOptionSelect = (option) => {
//     setWithdrawOption(option);
//     setMobileMoneyWithdrawSelected(false);
//     setShowWithdrawOptions(false);
//     setWithdrawAmount('');
//     setAgentNumber('');
//     setSelectedAccount('');
//     setSelectedCountryCode('');
//     setPhoneSearchTerm('');
//     setFullPhone('');
//   };

//   const handleEmailSelect = (email) => {
//     setSelectedEmail(email);
//     setEmailSearchTerm('');
//   };

//   const handleAddOptionSelect = (option) => {
//     if (option === 'mobileMoney') {
//       setMobileMoneySelected(true);
//     } else {
//       setSelectedAddOption(option);
//       setShowAddInput(true);
//       setMobileMoneySelected(false);
//       setAgentNumber('');
//       setAddAmount('');
//       setAddSelectedAccount('');
//     }
//   };

//   const handleMobileMoneyOptionSelect = (option) => {
//     setSelectedAddOption(option);
//     setShowAddInput(true);
//     setMobileMoneySelected(false);
//     setAgentNumber('');
//     setAddAmount('');
//     setAddSelectedAccount('');
//   };

//   const handleAddMoneyBack = () => {
//     if (showAddInput && (selectedAddOption === 'mpesa' || selectedAddOption === 'airtel')) {
//       setShowAddInput(false);
//       setSelectedAddOption('');
//       setAddAmount('');
//       setAddSelectedAccount('');
//       setAgentNumber('');
//       setSelectedCountryCode('');
//       setPhoneSearchTerm('');
//       setFullPhone('');
//       setMobileMoneySelected(true);
//     } else if (showAddInput) {
//       setShowAddInput(false);
//       setSelectedAddOption('');
//       setAddAmount('');
//       setAddSelectedAccount('');
//       setAgentNumber('');
//       setMobileMoneySelected(false);
//     } else if (mobileMoneySelected) {
//       setMobileMoneySelected(false);
//     } else {
//       setActiveSection('dashboard');
//     }
//   };

//   const handleWithdrawBack = () => {
//     if (withdrawOption && (withdrawOption === 'safiricom' || withdrawOption === 'airtel')) {
//       setWithdrawOption('');
//       setMobileMoneyWithdrawSelected(true);
//       setShowWithdrawOptions(false);
//       setWithdrawAmount('');
//       setAgentNumber('');
//       setSelectedAccount('');
//       setSelectedCountryCode('');
//       setPhoneSearchTerm('');
//       setFullPhone('');
//     } else if (withdrawOption) {
//       setWithdrawOption('');
//       setShowWithdrawOptions(true);
//       setWithdrawAmount('');
//       setAgentNumber('');
//       setSelectedAccount('');
//       setSelectedCountryCode('');
//       setPhoneSearchTerm('');
//       setFullPhone('');
//     } else if (mobileMoneyWithdrawSelected) {
//       setMobileMoneyWithdrawSelected(false);
//       setShowWithdrawOptions(true);
//     } else {
//       setActiveSection('dashboard');
//       setShowWithdrawOptions(false);
//     }
//   };

//   const handleSendBack = () => {
//     setRecipientSearchTerm('');
//     setSelectedRecipient(null);
//     setSendAmount('');
//     setErrorWallet('');
//     setActiveSection('dashboard');
//   };

//   const openConfirmationDialog = (title, message, action) => {
//     setDialogTitle(title);
//     setDialogMessage(message);
//     setDialogAction(() => action);
//     setOpenDialog(true);
//   };

//   const handleDialogConfirm = (typedValue, buttonChoice) => {
//     setOpenDialog(false);

//     const isConfirmed = typedValue === '1' && buttonChoice === 'yes';

//     if (isConfirmed && dialogAction) {
//       dialogAction(inputPin); // ✅ PASS PIN HERE
//     } else {
//       alert('Transaction cancelled');
//       clearFields();
//     }
//   };

//   const handleDialogCancel = () => {
//     setOpenDialog(false);
//     setNotificationOnly(false); // 👈 reset
//     if (!notificationOnly) {
//       showNotification('error', 'Transaction cancelled');
//       // alert('Transaction cancelled');
//     }

//     clearFields();
//   };

//   const clearFields = () => {
//     setErrorWallet('');
//     setEmailSearchTerm('');
//     setSendAmount('');
//     setSelectedEmail('');
//     setPhoneSearchTerm('');
//     setFullPhone('');
//     setSelectedCountryCode('');
//   };

//   const isValidAmount = (amount) => {
//     return amount && !isNaN(parseInt(amount)) && parseInt(amount) >= 1 && parseInt(amount) <= 500000;
//   };

//   const isValidRecipient = (value) => {
//     if (!value) return false;
//     // very basic check – improve later with real validation
//     return value.length >= 6 && value.length <= 60;
//   };

//   const isSendButtonDisabled = () => {
//     if (sendMethod === 'email') {
//       return !isValidAmount(sendAmount) || !isValidRecipient(selectedEmail);
//     } else if (sendMethod === 'phone') {
//       return !isValidAmount(sendAmount) || !isValidRecipient(fullPhone);
//     }
//     return true;
//   };

//   const isAddMoneyButtonDisabled = () => {
//     if (selectedAddOption === 'bank') {
//       return !isValidAmount(addAmount) || !addSelectedAccount;
//     } else if (selectedAddOption === 'payzarc') {
//       return !isValidAmount(addAmount) || !agentNumber;
//     } else if (selectedAddOption === 'mpesa' || selectedAddOption === 'airtel') {
//       return !isValidAmount(addAmount) || !isValidRecipient(fullPhone);
//     }
//     return !isValidAmount(addAmount);
//   };

//   const isWithdrawButtonDisabled = () => {
//     if (withdrawOption === 'atm') {
//       return !isValidAmount(withdrawAmount) || !selectedAccount;
//     } else if (withdrawOption === 'safiricom' || withdrawOption === 'airtel') {
//       return !isValidAmount(withdrawAmount) || !isValidRecipient(fullPhone);
//     } else if (withdrawOption === 'payzarcAgent') {
//       return !isValidAmount(withdrawAmount) || !agentNumber;
//     }
//     return true;
//   };

//   // ==================== SEND MONEY ====================
//   // const handleSendMoney = async () => {
//   //   if (!selectedRecipient || !isValidAmount(sendAmount) || inputPin.length !== 4) {
//   //     setErrorWallet('Enter recipient, valid amount and 4-digit PIN');
//   //     return;
//   //   }
//   //   const recipient = selectedRecipient.value;
//   //   openConfirmationDialog(
//   //     'Confirm Send Money',
//   //     `Please confirm:\n\nSending ${sendAmount} to ${recipient}\n\nEnter:\n1 → Yes\n2 → No`,
//   //     // (inputPin) => async () => {
//   //     async (inputPin) => {
//   //       try {
//   //         // const response = await djangoApis.system1.post('/api/send-money/', {
//   //         //   recipient: recipient,
//   //         //   amount: parseFloat(sendAmount),
//   //         //   recipient_type: selectedRecipient.type,
//   //         //   pin: inputPin

//   //         // if (recipient.startsWith("+254")) {
//   //         //   recipient = recipient.replace("+254", "0");
//   //         // }

//   //         console.log('Sending money with:', inputPin, recipient, sendAmount);
//   //         const response = await djangoApis.system1.post('/api/send-money/', {
//   //           recipient_number: recipient,
//   //           amount: parseFloat(sendAmount),
//   //           transaction_pin: inputPin
//   //         });
//   //         if (response.data.success) {
//   //           //alert('Money sent successfully!');
//   //           showNotification('success', 'Money sent successfully!');
//   //           fetchBalance();
//   //           setRecipientSearchTerm('');
//   //           setSelectedRecipient(null);
//   //           setSendAmount('');
//   //           setErrorWallet('');
//   //           setInputPin('');
//   //         } else {
//   //           // alert(response.data.message || 'Send failed');
//   //           // showNotification('error', 'Failed to send money.');
//   //           showNotification('error', response.data.message || 'Failed to send money.');
//   //         }
//   //       } catch (err) {
//   //         console.error('Send error:', err);
//   //         // alert('Error sending money: ' +(err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error'));
//   //         const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
//   //         showNotification('error', `Error sending money: ${errorMsg}`);
//   //         //alert(`Error sending money: ${errorMsg}`);
//   //       }
//   //     }
//   //   );
//   // };

//   const handleSendMoney = async () => {
//     const token = localStorage.getItem('accessToken');

//     const pho=selectedRecipient.value;//.replace("+254", "0");
//     try {
//       console.log('Attempting to send money to: '+pho, 'Amount: ',sendAmount, 'Pin: ',inputPin, 'Token: ', token);
//         const response = await axios.post('http://localhost:8001/api/send-money/', {
//         recipient_number: pho,
//         amount: parseFloat(sendAmount),
//         transaction_pin: inputPin
//       }, {
//         headers: { Authorization: `Bearer ${token}` }
//       });

//       alert(response.data.message);
//       // Refresh balance after success
//       showNotification('success', 'Money sent successfully!');
//       fetchBalance();
//       setRecipientSearchTerm('');
//       setSelectedRecipient(null);
//       setSendAmount('');
//       setErrorWallet('');
//       setInputPin('');

//     } catch (error) {
//       alert(error.response?.data?.error || "Transfer failed");
//     }
//   };

//   const showNotification = (type, message) => {
//     setDialogTitle(type === 'success' ? 'Success' : 'Error');
//     setDialogMessage(message);
//     setNotificationOnly(true);
//     setOpenDialog(true);
//   };

//   // ==================== PAYZARC AGENT WITHDRAW ====================
//   const handlePayzarcAgentWithdraw = async () => {
//     if (!agentNumber || !isValidAmount(withdrawAmount) || inputPin.length !== 4) {
//       alert('Please enter a valid agent number, amount and pin');
//       return;
//     }
//     openConfirmationDialog(
//       'Confirm Payzarc Agent Withdrawal',
//       `Are you sure you want to withdraw ${withdrawAmount} via Payzarc Agent ${agentNumber}?\n\nType 1 and click Yes to confirm.`,
//       //(enteredPin) => async () => {
//       async (inputPin) => {
//         try {
//           const response = await djangoApis.system1.post('/api/withdraw/', {
//             // method: 'payzarc_agent',
//             agent_number: agentNumber.trim(),
//             amount: parseFloat(withdrawAmount),
//             pin: inputPin
//           });

//           if (response.data.success) {
//             // alert('Withdrawal request submitted successfully!');
//             showNotification('success', 'Withdrawal request submitted successfully!');
//             fetchBalance();
//             setWithdrawAmount('');
//             setAgentNumber('');
//             setActiveSection('dashboard');
//             setInputPin('');
//           } else {
//             // alert(response.data.message || 'Withdrawal failed');
//             showNotification('error', 'Failed to submit withdrawal request.');
//           }
//         } catch (err) {
//           console.error('Withdrawal error:', err);
//           alert('Error processing withdrawal: ' +
//             (err.response?.data?.message ||
//               err.response?.data?.error ||
//               err.message || 'Unknown error'));
//         }
//       }
//     );
//   };

//   // ==================== GENERAL WITHDRAW (for other types) ====================
//   const handleWithdraw = () => {
//     if (withdrawOption === 'payzarcAgent' && !agentNumber) {
//       handlePayzarcAgentWithdraw();
//       return;
//     }

//     if (
//       !withdrawAmount ||
//       (withdrawOption === 'safiricom' && !isValidRecipient(fullPhone)) ||
//       (withdrawOption === 'airtel' && !isValidRecipient(fullPhone)) ||
//       (withdrawOption === 'atm' && !selectedAccount)
//     ) {
//       alert('Please fill in all required fields');
//       return;
//     }

//     openConfirmationDialog(
//       'Confirm Withdrawal',
//       `Are you withdrawing money worth ${withdrawAmount} via ${withdrawOption}?\nYes or 1 to confirm,\nNo or 2 to cancel.`,
//       //(enteredPin) => async () => {
//       async (enteredPin) => {
//         // TODO: Replace alert with real API call when backend is ready
//         alert(`Withdrawal of ${withdrawAmount} via ${withdrawOption} with PIN ${enteredPin} — Backend call goes here`);
//         fetchBalance();
//       }
//     );
//   };

//   const handleAddMoney = () => {
//     if (
//       !addAmount ||
//       (selectedAddOption === 'bank' && !addSelectedAccount) ||
//       (selectedAddOption === 'payzarc' && !agentNumber) ||
//       ((selectedAddOption === 'mpesa' || selectedAddOption === 'airtel') && !isValidRecipient(fullPhone))
//     ) {
//       alert('Please fill in all required fields');
//       return;
//     }
//     openConfirmationDialog(
//       'Confirm Add Money',
//       `Are you adding ${addAmount} from ${selectedAddOption}${selectedAddOption === 'bank'
//         ? ` account ${addSelectedAccount}`
//         : selectedAddOption === 'payzarc'
//           ? ` agent ${agentNumber}`
//           : ` phone ${fullPhone}`
//       }?\nYes or 1 to confirm,\nNo or 2 to cancel.`,
//       () => alert('Connecting to backend API')
//     );
//   };

//   const getWithdrawTitle = () => {
//     switch (withdrawOption) {
//       case 'atm':
//         return 'ATM Withdrawal';
//       case 'safiricom':
//         return 'Safaricom Withdrawal';
//       case 'airtel':
//         return 'Airtel Withdrawal';
//       case 'payzarcAgent':
//         return 'Payzarc Agent Withdrawal';
//       default:
//         return mobileMoneyWithdrawSelected ? 'Mobile Money' : 'Withdraw Money';
//     }
//   };

//   const getAddMoneyTitle = () => {
//     switch (selectedAddOption) {
//       case 'bank':
//         return 'Bank Deposit';
//       case 'mpesa':
//         return 'Mpesa Deposit';
//       case 'airtel':
//         return 'Airtel Deposit';
//       case 'payzarc':
//         return 'Payzarc Deposit';
//       default:
//         return mobileMoneySelected ? 'Mobile Money' : 'Add Money';
//     }
//   };

//   const getSendMoneyTitle = () => {
//     switch (sendMethod) {
//       case 'email':
//         return 'Send Money via Email';
//       case 'phone':
//         return 'Send Money via Phone';
//       default:
//         return 'Send Money';
//     }
//   };

//   return (
//     <div className={`${styles.section} ${styles.active}`}>

//       {activeSection === 'dashboard' && (
//         <div className={styles.homeDashboard}>
//           {/* Wallet – always visible at top (full width on mobile, left column on desktop) */}
//           <div className={styles.divWallet}>
//             <h4>Wallet Balance</h4>

//             {loadingBalance ? (
//               <div className={styles.loading}>Loading balance...</div>
//             ) : balanceError ? (
//               <p className={styles.errorWallet}>{balanceError}</p>
//             ) : (
//               <div className={styles.walletBalanceContainer}>
//                 <div
//                   key={animateKey}
//                   className={`${styles.balanceDisplay} ${showBalance ? styles.visible : styles.hidden}`}
//                 >
//                   {showBalance ? (
//                     <span className={styles.balanceReveal}>
//                       {balanceData?.currency || 'USD'} {formattedBalance}
//                     </span>
//                   ) : (
//                     <span className={styles.balanceHidden}>****.**</span>
//                   )}
//                 </div>

//                 <button
//                   className={styles.eyeToggle}
//                   onClick={toggleBalance}
//                   type="button"
//                   aria-label={showBalance ? "Hide balance" : "Show balance"}
//                 >
//                   <FontAwesomeIcon
//                     icon={showBalance ? faEyeSlash : faEye}
//                     className={styles.eyeIcon}
//                   />
//                 </button>
//               </div>
//             )}

//             {errorWallet && <p className={styles.errorWallet}>{errorWallet}</p>}

//             <div className={styles.walletButtons}>
//               <button
//                 className={styles.actionBtn}
//                 onClick={() => setActiveSection('addMoney')}
//               >
//                 Add Money <FontAwesomeIcon icon={faPlus} className={styles.buttonIcon} />
//               </button>

//               <button
//                 className={styles.actionBtn}
//                 onClick={() => {
//                   setActiveSection('withdraw');
//                   setShowWithdrawOptions(true);
//                 }}
//               >
//                 Withdraw <FontAwesomeIcon icon={faMinus} className={styles.buttonIcon} />
//               </button>

//               <button
//                 className={styles.actionBtn}
//                 onClick={() => setActiveSection('addRecipient')}
//               >
//                 Add Recipient <FontAwesomeIcon icon={faUserPlus} className={styles.buttonIcon} />
//               </button>
//             </div>
//           </div>

//           {/* Mobile navigation – visible only on small screens */}
//           <div className={styles.mobileNavBar}>
//             <button
//               className={`${styles.navIconBtn} ${bottomView === 'transactions' ? styles.active : ''}`}
//               onClick={() => setBottomView('transactions')}
//             >
//               <FontAwesomeIcon icon={faHome} />
//               <span>Home</span>
//             </button>

//             <button
//               className={`${styles.navIconBtn} ${bottomView === 'quickSend' ? styles.active : ''}`}
//               onClick={() => setBottomView('quickSend')}
//             >
//               <FontAwesomeIcon icon={faPaperPlane} />
//               <span>Quick Send</span>
//             </button>

//             <button
//               className={`${styles.navIconBtn} ${bottomView === 'chamas' ? styles.active : ''}`}
//               onClick={() => setBottomView('chamas')}
//             >
//               <FontAwesomeIcon icon={faUsers} />
//               <span>Chamas</span>
//             </button>

//             <button
//               className={`${styles.navIconBtn} ${bottomView === 'quickActions' ? styles.active : ''}`}
//               onClick={() => setBottomView('quickActions')}
//             >
//               <FontAwesomeIcon icon={faBolt} />
//               <span>Actions</span>
//             </button>
//           </div>

//           {/* ────────────────────────────────────────────── */}
//           {/* MOBILE LAYOUT: dynamic switching content       */}
//           {/* ────────────────────────────────────────────── */}
//           <div className={styles.dynamicBottomContent}>
//             {bottomView === 'transactions' && (
//               <div className={styles.divTransactions}>
//                 <h4>Latest Transactions</h4>
//                 <div className={styles.transactionsList}>
//                   <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
//                     <div className={styles.itemLeft}>
//                       <div className={`${styles.itemIcon} ${styles.netflixIcon}`}>
//                         <FontAwesomeIcon icon={faTv} />
//                       </div>
//                       <div className={styles.itemInfo}>
//                         <div className={styles.itemTitle}>DsTV</div>
//                         <div className={styles.itemTime}>Today · 09:32 AM</div>
//                       </div>
//                     </div>
//                     <div className={`${styles.itemAmount} ${styles.negative}`}>- USD 142.99</div>
//                   </div>

//                   <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
//                     <div className={styles.itemLeft}>
//                       <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
//                         <FontAwesomeIcon icon={faGlobe} />
//                       </div>
//                       <div className={styles.itemInfo}>
//                         <div className={styles.itemTitle}>Payzarc Club Contribution</div>
//                         <div className={styles.itemTime}>Yesterday · 4:18 PM</div>
//                       </div>
//                     </div>
//                     <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 2,400</div>
//                   </div>

//                   <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
//                     <div className={styles.itemLeft}>
//                       <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
//                         <FontAwesomeIcon icon={faHandshake} />
//                       </div>
//                       <div className={styles.itemInfo}>
//                         <div className={styles.itemTitle}>Dubai Partners</div>
//                         <div className={styles.itemTime}>Today · 9:41 AM</div>
//                       </div>
//                     </div>
//                     <div className={`${styles.itemAmount} ${styles.negative}`}>- KES 10,000</div>
//                   </div>
//                 </div>

//                 <p className={styles.seeAll} onClick={() => onPageChange('history')}>
//                   See all
//                 </p>
//               </div>
//             )}

//             {bottomView === 'quickSend' && (
//               <div className={styles.userDetails}>
//                 <div className={styles.quickSendContainer}>
//                   <h4 className={styles.quickSendTitle}>Quick Send</h4>

//                   <div className={styles.quickRecipientWrapper}>
//                     <div className={styles.prefix}>🇺🇸 +1 ▼</div>
//                     <input
//                       type="text"
//                       placeholder="Phone number or Email"
//                       className={styles.quickRecipientInput}
//                       value={quickRecipient}
//                       onChange={(e) => setQuickRecipient(e.target.value)}
//                     />
//                   </div>

//                   <select
//                     className={styles.quickCountrySelect}
//                     value={quickDestinationCountry.name}
//                     onChange={(e) => {
//                       const selected = sortedCountries.find((c) => c.name === e.target.value);
//                       setQuickDestinationCountry(selected);
//                     }}
//                   >
//                     {sortedCountries.map((country) => (
//                       <option key={country.code} value={country.name}>
//                         {country.flag} {country.name}
//                       </option>
//                     ))}
//                   </select>

//                   <div className={styles.quickAmounts}>
//                     <div className={styles.amountGroup}>
//                       <input
//                         type="number"
//                         min="0"
//                         max="1000000"
//                         step="1"
//                         placeholder="0.00"
//                         className={styles.quickAmountInput}
//                         value={quickAmount}
//                         onChange={(e) => setQuickAmount(e.target.value)}
//                       />
//                       <span className={styles.currencyLabel}>USD</span>
//                     </div>

//                     <div className={styles.amountGroup}>
//                       <input
//                         type="text"
//                         className={styles.quickAmountInput}
//                         value={equivalentAmount}
//                         readOnly
//                       />
//                       <span className={styles.currencyLabel}>{destInfo.currency}</span>
//                     </div>
//                   </div>

//                   <button className={styles.actionBtn} onClick={handleQuickSend}>
//                     Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
//                   </button>
//                 </div>
//               </div>
//             )}

//             {bottomView === 'chamas' && (
//               <div className={styles.divGroups}>
//                 <h4>CHAMAS & GROUPS</h4>
//                 <div className={styles.groupsList}>
//                   <div className={styles.groupItem} onClick={() => onPageChange('groups')}>
//                     <div className={styles.itemLeft}>
//                       <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
//                         <FontAwesomeIcon icon={faUsers} />
//                       </div>
//                       <div className={styles.itemInfo}>
//                         <div className={styles.itemTitle}>Savers Club</div>
//                         <div className={styles.itemTime}>12 Members</div>
//                       </div>
//                     </div>
//                     <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 62,500</div>
//                     <FontAwesomeIcon icon={faChevronRight} className={styles.arrowIcon} />
//                   </div>

//                   <div className={styles.groupItem} onClick={() => onPageChange('groups')}>
//                     <div className={styles.itemLeft}>
//                       <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
//                         <FontAwesomeIcon icon={faBriefcase} />
//                       </div>
//                       <div className={styles.itemInfo}>
//                         <div className={styles.itemTitle}>Business Partners</div>
//                         <div className={styles.itemTime}>8 Members</div>
//                       </div>
//                     </div>
//                     <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 150,000</div>
//                     <FontAwesomeIcon icon={faChevronRight} className={styles.arrowIcon} />
//                   </div>
//                 </div>

//                 <p className={styles.createGroup} onClick={() => onPageChange('groups')}>
//                   + Create or Send to Group
//                 </p>
//               </div>
//             )}

//             {bottomView === 'quickActions' && (
//               <div className={styles.divQuick}>
//                 <h4>Quick Actions</h4>
//                 <div className={styles.quickButtons}>
//                   <button
//                     className={styles.actionBtn}
//                     onClick={() => {
//                       setActiveSection('withdraw');
//                       setShowWithdrawOptions(true);
//                     }}
//                   >
//                     Withdraw Money <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
//                   </button>

//                   <button
//                     className={styles.actionBtn}
//                     onClick={() => setActiveSection('wallet')}
//                   >
//                     Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* ────────────────────────────────────────────── */}
//           {/* DESKTOP LAYOUT: individual positioned cards    */}
//           {/* ────────────────────────────────────────────── */}

//           {/* Quick Send – top right (grid-column: 2, grid-row: 1) */}
//           <div className={styles.userDetails}>
//             <div className={styles.quickSendContainer}>
//               <h4 className={styles.quickSendTitle}>Quick Send</h4>

//               <div className={styles.quickRecipientWrapper}>
//                 <div className={styles.prefix}>🇺🇸 +1 ▼</div>
//                 <input
//                   type="text"
//                   placeholder="Phone number or Email"
//                   className={styles.quickRecipientInput}
//                   value={quickRecipient}
//                   onChange={(e) => setQuickRecipient(e.target.value)}
//                 />
//               </div>

//               <select
//                 className={styles.quickCountrySelect}
//                 value={quickDestinationCountry.name}
//                 onChange={(e) => {
//                   const selected = sortedCountries.find((c) => c.name === e.target.value);
//                   setQuickDestinationCountry(selected);
//                 }}
//               >
//                 {sortedCountries.map((country) => (
//                   <option key={country.code} value={country.name}>
//                     {country.flag} {country.name}
//                   </option>
//                 ))}
//               </select>

//               <div className={styles.quickAmounts}>
//                 <div className={styles.amountGroup}>
//                   <input
//                     type="number"
//                     min="0"
//                     max="1000000"
//                     step="1"
//                     placeholder="0.00"
//                     className={styles.quickAmountInput}
//                     value={quickAmount}
//                     onChange={(e) => setQuickAmount(e.target.value)}
//                   />
//                   <span className={styles.currencyLabel}>USD</span>
//                 </div>

//                 <div className={styles.amountGroup}>
//                   <input
//                     type="text"
//                     className={styles.quickAmountInput}
//                     value={equivalentAmount}
//                     readOnly
//                   />
//                   <span className={styles.currencyLabel}>{destInfo.currency}</span>
//                 </div>
//               </div>

//               <button className={styles.actionBtn} onClick={handleQuickSend}>
//                 Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
//               </button>
//             </div>
//           </div>

//           {/* Quick Actions – bottom left, row 2 */}
//           <div className={styles.divQuick}>
//             <h4>Quick Actions</h4>
//             <div className={styles.quickButtons}>
//               <button
//                 className={styles.actionBtn}
//                 onClick={() => {
//                   setActiveSection('withdraw');
//                   setShowWithdrawOptions(true);
//                 }}
//               >
//                 Withdraw Money <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
//               </button>

//               <button
//                 className={styles.actionBtn}
//                 onClick={() => setActiveSection('wallet')}
//               >
//                 Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
//               </button>
//             </div>
//           </div>

//           {/* Chamas & Groups – bottom left, row 3 */}
//           <div className={styles.divGroups}>
//             <h4>CHAMAS & GROUPS</h4>
//             <div className={styles.groupsList}>
//               <div className={styles.groupItem} onClick={() => onPageChange('groups')}>
//                 <div className={styles.itemLeft}>
//                   <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
//                     <FontAwesomeIcon icon={faUsers} />
//                   </div>
//                   <div className={styles.itemInfo}>
//                     <div className={styles.itemTitle}>Savers Club</div>
//                     <div className={styles.itemTime}>12 Members</div>
//                   </div>
//                 </div>
//                 <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 62,500</div>
//                 <FontAwesomeIcon icon={faChevronRight} className={styles.arrowIcon} />
//               </div>

//               <div className={styles.groupItem} onClick={() => onPageChange('groups')}>
//                 <div className={styles.itemLeft}>
//                   <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
//                     <FontAwesomeIcon icon={faBriefcase} />
//                   </div>
//                   <div className={styles.itemInfo}>
//                     <div className={styles.itemTitle}>Business Partners</div>
//                     <div className={styles.itemTime}>8 Members</div>
//                   </div>
//                 </div>
//                 <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 150,000</div>
//                 <FontAwesomeIcon icon={faChevronRight} className={styles.arrowIcon} />
//               </div>
//             </div>

//             <p className={styles.createGroup} onClick={() => onPageChange('groups')}>
//               + Create or Send to Group
//             </p>
//           </div>

//           {/* Latest Transactions – right column, spans rows 2–4 */}
//           <div className={styles.divTransactions}>
//             <h4>Latest Transactions</h4>
//             <div className={styles.transactionsList}>
//               <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
//                 <div className={styles.itemLeft}>
//                   <div className={`${styles.itemIcon} ${styles.netflixIcon}`}>
//                     <FontAwesomeIcon icon={faTv} />
//                   </div>
//                   <div className={styles.itemInfo}>
//                     <div className={styles.itemTitle}>DsTV</div>
//                     <div className={styles.itemTime}>Today · 09:32 AM</div>
//                   </div>
//                 </div>
//                 <div className={`${styles.itemAmount} ${styles.negative}`}>- USD 142.99</div>
//               </div>

//               <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
//                 <div className={styles.itemLeft}>
//                   <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
//                     <FontAwesomeIcon icon={faGlobe} />
//                   </div>
//                   <div className={styles.itemInfo}>
//                     <div className={styles.itemTitle}>Payzarc Club Contribution</div>
//                     <div className={styles.itemTime}>Yesterday · 4:18 PM</div>
//                   </div>
//                 </div>
//                 <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 2,400</div>
//               </div>

//               <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
//                 <div className={styles.itemLeft}>
//                   <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
//                     <FontAwesomeIcon icon={faHandshake} />
//                   </div>
//                   <div className={styles.itemInfo}>
//                     <div className={styles.itemTitle}>Dubai Partners</div>
//                     <div className={styles.itemTime}>Today · 9:41 AM</div>
//                   </div>
//                 </div>
//                 <div className={`${styles.itemAmount} ${styles.negative}`}>- KES 10,000</div>
//               </div>
//             </div>

//             <p className={styles.seeAll} onClick={() => onPageChange('history')}>
//               See all
//             </p>
//           </div>
//         </div>
//       )}

//       {activeSection === 'wallet' && (
//         <div className={styles.walletContent}>
//           <div className={styles.header}>
//             <FontAwesomeIcon
//               icon={faArrowLeft}
//               className={styles.backIcon}
//               onClick={handleSendBack}
//             />
//             <h3>Send Money</h3>
//           </div>

//           {errorWallet && <p className={styles.errorWallet}>{errorWallet}</p>}

//           <div className={styles.addMoneyForm}>
//             {/* Unified search field – email or phone */}
//             <div className={styles.recipient} style={{ position: 'relative' }}>
//               <input
//                 type="text"
//                 className={styles.search}
//                 placeholder="Enter recipient email or phone no..."
//                 value={recipientSearchTerm}
//                 onChange={(e) => {
//                   const value = e.target.value.trim();  // Trim whitespace for clean queries
//                   setRecipientSearchTerm(value);        // Keep your existing state update
//                   setSelectedRecipient(null);           // Reset any previous selection (as before)

//                   if (value) {
//                     fetchFavourites(value);             // Call the API with the typed value
//                   } else {
//                     setFavourites([]);                  // Clear suggestions if not phone-like
//                   }
//                 }}
//               />
//               <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
//               {/*///////////////////////////////////////////////////////////////////////////////*/}
//               <div
//                 className={styles.userAvatarWrapper}
//                 title="Add recipient"
//                 onClick={() => setActiveSection('addRecipient')}
//               >
//                 <FontAwesomeIcon
//                   icon={faUserPlus}
//                   className={styles.addUserIcon}
//                 />
//               </div>
//               {/*///////////////////////////////////////////////////////////////////////////////*/}

//               {/* Dropdown suggestions – both emails and phones */}
//               {recipientSearchTerm && (
//                 <ul className={styles.suggestions}>
//                   {loadingFavourites ? (
//                     <li className={styles.loadingItem}>Loading favourites...</li>
//                   ) : favouritesError ? (
//                     <li className={styles.errorItem}>{favouritesError}</li>
//                   ) : favourites.length === 0 ? (
//                     <li>No matching favourites found</li>
//                   ) : (
//                     favourites.map((fav, index) => (
//                       <li
//                         key={index}
//                         onClick={() => {
//                           setSelectedRecipient({
//                             type: fav.detail.includes('@') ? 'email' : 'phone',
//                             value: fav.detail
//                           });
//                           setRecipientSearchTerm('');
//                           setFavourites([]);
//                         }}
//                       >
//                         {fav.detail}
//                         <small>
//                           ({fav.label || 'no label'} · {fav.detail.includes('@') ? 'email' : 'phone'})
//                         </small>
//                       </li>
//                     ))
//                   )}
//                 </ul>
//               )}
//             </div>

//             {/* Shows the finally selected value (read-only) with label */}
//             {selectedRecipient && (
//               <>
//                 <label
//                   style={{
//                     color: '#94a3b8',
//                     fontSize: '0.9rem',
//                     margin: '0 0 6px 2px',
//                     fontWeight: '500',
//                     display: 'block',
//                   }}
//                 >
//                   Selected recipient
//                 </label>
//                 <input
//                   type="text"
//                   className={styles.email}
//                   placeholder="Selected recipient"
//                   value={`${selectedRecipient.value} (${selectedRecipient.type})`}
//                   readOnly
//                 />
//               </>
//             )}

//             {/* Amount field */}
//             <input
//               type="number"
//               min="1"
//               max="500000"
//               className={styles.amount}
//               placeholder="Amount"
//               value={sendAmount}
//               onChange={(e) => setSendAmount(e.target.value)}
//             />
//             <div style={{ position: 'relative', marginTop: '10px' }}>
//               <input
//                 type={showInputPin ? "text" : "password"}
//                 maxLength="4"
//                 className={styles.amount}
//                 placeholder="Enter PIN"
//                 value={inputPin}
//                 onChange={(e) => {
//                   const val = e.target.value.replace(/\D/g, '').slice(0, 4);
//                   setInputPin(val);
//                 }}
//               />

//               <button
//                 type="button"
//                 onClick={() => setShowInputPin(!showInputPin)}
//                 style={{
//                   position: 'absolute',
//                   right: '12px',
//                   top: '50%',
//                   transform: 'translateY(-50%)',
//                   border: 'none',
//                   background: 'none',
//                   cursor: 'pointer'
//                 }}
//               >
//                 {showInputPin ? '🙈' : '👁️'}
//               </button>
//             </div>

//             {/* Send button */}
//             <button
//               className={styles.sendBtn}
//               onClick={handleSendMoney}
//               disabled={!selectedRecipient || !sendAmount || !isValidAmount(sendAmount) || inputPin.length !== 4}
//             >
//               Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
//             </button>
//           </div>
//         </div>
//       )}

//       {activeSection === 'addMoney' && (
//         <div className={styles.addMoneyContent}>
//           <div className={styles.header}>
//             <FontAwesomeIcon
//               icon={faArrowLeft}
//               className={styles.backIcon}
//               onClick={handleAddMoneyBack}
//             />
//             <h3>{getAddMoneyTitle()}</h3>
//           </div>
//           {!showAddInput && !mobileMoneySelected ? (
//             <div className={styles.optionsList}>
//               <Option icon={faUniversity} text="Bank" onClick={() => handleAddOptionSelect('bank')} />
//               <Option icon={faMobileAlt} text="Mobile Money" onClick={() => handleAddOptionSelect('mobileMoney')} />
//               <Option icon={faMoneyBillWave} text="Payzarc" onClick={() => handleAddOptionSelect('payzarc')} />
//             </div>
//           ) : mobileMoneySelected ? (
//             <div className={styles.optionsList}>
//               <Option icon={faMobileAlt} text="Mpesa" onClick={() => handleMobileMoneyOptionSelect('mpesa')} />
//               <Option icon={faCreditCard} text="Airtel" onClick={() => handleMobileMoneyOptionSelect('airtel')} />
//             </div>
//           ) : (
//             <div className={styles.addMoneyForm}>
//               {selectedAddOption === 'bank' && (
//                 <select
//                   className={styles.accountSelect}
//                   value={addSelectedAccount}
//                   onChange={(e) => setAddSelectedAccount(e.target.value)}
//                 >
//                   <option value="">Select Bank Account</option>
//                   <option value="123456789">123456789</option>
//                   <option value="987654321">987654321</option>
//                 </select>
//               )}
//               {selectedAddOption === 'payzarc' && (
//                 <input
//                   type="text"
//                   className={styles.agentNo}
//                   placeholder="Agent Number"
//                   value={agentNumber}
//                   onChange={(e) => setAgentNumber(e.target.value)}
//                 />
//               )}
//               {(selectedAddOption === 'mpesa' || selectedAddOption === 'airtel') && (
//                 <div className={styles.mobileMoneyForm}>
//                   <select
//                     className={styles.accountSelect}
//                     value={selectedCountryCode}
//                     onChange={(e) => setSelectedCountryCode(e.target.value)}
//                   >
//                     <option value="">Select Country Code</option>
//                     {sortedCountries.map((country) => (
//                       <option key={country.code} value={country.code}>
//                         {country.flag} {country.code} {country.name}
//                       </option>
//                     ))}
//                   </select>
//                   <div className={styles.recipient}>
//                     <input
//                       type="text"
//                       className={styles.search}
//                       placeholder="Type phone number ..."
//                       value={phoneSearchTerm}
//                       onChange={(e) => setPhoneSearchTerm(e.target.value)}
//                       disabled={!selectedCountryCode}
//                     />
//                     <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
//                     {phoneSearchTerm && selectedCountryCode && (
//                       <ul className={styles.suggestions}>
//                         {filteredPhones.map((phone) => (
//                           <li
//                             key={phone}
//                             onClick={() => {
//                               setFullPhone(`${selectedCountryCode}${phone}`);
//                               setPhoneSearchTerm('');
//                             }}
//                           >
//                             {phone}
//                           </li>
//                         ))}
//                       </ul>
//                     )}
//                   </div>
//                   <input
//                     type="text"
//                     className={styles.email}
//                     placeholder="Full Phone Number"
//                     value={fullPhone}
//                     readOnly
//                   />
//                   <input
//                     type="number"
//                     min="1"
//                     max="500000"
//                     className={styles.amount}
//                     placeholder="Amount"
//                     value={addAmount}
//                     onChange={(e) => setAddAmount(e.target.value)}
//                   />
//                 </div>
//               )}
//               {selectedAddOption !== 'mpesa' && selectedAddOption !== 'airtel' && (
//                 <input
//                   type="number"
//                   min="1"
//                   max="500000"
//                   className={styles.amount}
//                   placeholder="Amount"
//                   value={addAmount}
//                   onChange={(e) => setAddAmount(e.target.value)}
//                 />
//               )}
//               <button
//                 className={styles.addMoneyBtn}
//                 onClick={handleAddMoney}
//                 disabled={isAddMoneyButtonDisabled()}
//               >
//                 Add Money <FontAwesomeIcon icon={faPlus} className={styles.buttonIcon} />
//               </button>
//             </div>
//           )}
//         </div>
//       )}
//       {activeSection === 'withdraw' && (
//         <div className={styles.withdrawContent}>
//           <div className={styles.header}>
//             <FontAwesomeIcon
//               icon={faArrowLeft}
//               className={styles.backIcon}
//               onClick={handleWithdrawBack}
//             />
//             <h3>{getWithdrawTitle()}</h3>
//           </div>
//           {showWithdrawOptions && !mobileMoneyWithdrawSelected ? (
//             <div className={styles.optionsList}>
//               <Option icon={faUniversity} text="ATM" onClick={() => handleWithdrawOption('atm')} />
//               <Option icon={faMobileAlt} text="Mobile Money" onClick={() => handleWithdrawOption('mobileMoney')} />
//               <Option icon={faMoneyBillWave} text="Payzarc Agent" onClick={() => handleWithdrawOption('payzarcAgent')} />
//             </div>
//           ) : mobileMoneyWithdrawSelected ? (
//             <div className={styles.optionsList}>
//               <Option icon={faMobileAlt} text="Safaricom" onClick={() => handleMobileMoneyWithdrawOptionSelect('safiricom')} />
//               <Option icon={faCreditCard} text="Airtel" onClick={() => handleMobileMoneyWithdrawOptionSelect('airtel')} />
//             </div>
//           ) : (
//             <div className={styles.withdrawForm}>
//               {withdrawOption === 'atm' && (
//                 <div className={styles.atmWithdraw}>
//                   <select
//                     className={styles.accountSelect}
//                     value={selectedAccount}
//                     onChange={(e) => setSelectedAccount(e.target.value)}
//                   >
//                     <option value="">Select Card Number</option>
//                     <option value="123456789">Card ending 6789</option>
//                     <option value="987654321">Card ending 4321</option>
//                   </select>
//                   <input
//                     type="number"
//                     min="1"
//                     max="500000"
//                     className={styles.amount}
//                     placeholder="Amount"
//                     value={withdrawAmount}
//                     onChange={(e) => setWithdrawAmount(e.target.value)}
//                   />
//                   <button
//                     className={styles.withdrawBtn}
//                     onClick={handleWithdraw}
//                     disabled={isWithdrawButtonDisabled()}
//                   >
//                     Withdraw <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
//                   </button>
//                 </div>
//               )}
//               {(withdrawOption === 'safiricom' || withdrawOption === 'airtel') && (
//                 <div className={styles.mobileMoneyForm}>
//                   <select
//                     className={styles.accountSelect}
//                     value={selectedCountryCode}
//                     onChange={(e) => setSelectedCountryCode(e.target.value)}
//                   >
//                     <option value="">Select Country Code</option>
//                     {sortedCountries.map((country) => (
//                       <option key={country.code} value={country.code}>
//                         {country.flag} {country.code} {country.name}
//                       </option>
//                     ))}
//                   </select>
//                   <div className={styles.recipient}>
//                     <input
//                       type="text"
//                       className={styles.search}
//                       placeholder="Type phone number ..."
//                       value={phoneSearchTerm}
//                       onChange={(e) => setPhoneSearchTerm(e.target.value)}
//                       disabled={!selectedCountryCode}
//                     />
//                     <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
//                     {phoneSearchTerm && selectedCountryCode && (
//                       <ul className={styles.suggestions}>
//                         {filteredPhones.map((phone) => (
//                           <li
//                             key={phone}
//                             onClick={() => {
//                               setFullPhone(`${selectedCountryCode}${phone}`);
//                               setPhoneSearchTerm('');
//                             }}
//                           >
//                             {phone}
//                           </li>
//                         ))}
//                       </ul>
//                     )}
//                   </div>
//                   <input
//                     type="text"
//                     className={styles.email}
//                     placeholder="Full Phone Number"
//                     value={fullPhone}
//                     readOnly
//                   />
//                   <input
//                     type="number"
//                     min="1"
//                     max="500000"
//                     className={styles.amount}
//                     placeholder="Amount"
//                     value={withdrawAmount}
//                     onChange={(e) => setWithdrawAmount(e.target.value)}
//                   />
//                   <button
//                     className={styles.withdrawBtn}
//                     onClick={handleWithdraw}
//                     disabled={isWithdrawButtonDisabled()}
//                   >
//                     Withdraw <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
//                   </button>
//                 </div>
//               )}
//               {withdrawOption === 'payzarcAgent' && (
//                 <div className={styles.agentWithdraw}>
//                   <input
//                     type="text"
//                     className={styles.agentNo}
//                     placeholder="Agent Number"
//                     value={agentNumber}
//                     onChange={(e) => setAgentNumber(e.target.value)}
//                   />
//                   <input
//                     type="number"
//                     min="1"
//                     max="500000"
//                     className={styles.amount}
//                     placeholder="Amount"
//                     value={withdrawAmount}
//                     onChange={(e) => setWithdrawAmount(e.target.value)}
//                   />
//                   <div style={{ position: 'relative', marginTop: '10px' }}>
//                     <input
//                       type={showInputPin ? "text" : "password"}
//                       maxLength="4"
//                       className={styles.amount}
//                       placeholder="Enter PIN"
//                       value={inputPin}
//                       onChange={(e) => {
//                         const val = e.target.value.replace(/\D/g, '').slice(0, 4);
//                         setInputPin(val);
//                       }}
//                     />

//                     <button
//                       type="button"
//                       onClick={() => setShowInputPin(!showInputPin)}
//                       style={{
//                         position: 'absolute',
//                         right: '12px',
//                         top: '50%',
//                         transform: 'translateY(-50%)',
//                         border: 'none',
//                         background: 'none',
//                         cursor: 'pointer'
//                       }}
//                     >
//                       {showInputPin ? '🙈' : '👁️'}
//                     </button>
//                   </div>

//                   <button
//                     className={styles.withdrawBtn}
//                     onClick={handleWithdraw}           // This now calls the new logic
//                     disabled={!agentNumber || !isValidAmount(withdrawAmount) || inputPin.length !== 4}
//                   >
//                     Withdraw via Agent <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       )}

//       {activeSection === 'addRecipient' && (
//         <div className={styles.addMoneyContent}>
//           <div className={styles.header}>
//             <FontAwesomeIcon icon={faArrowLeft} className={styles.backIcon} onClick={handleAddRecipientBack} />
//             <h3>Add Recipient</h3>
//           </div>

//           <div className={styles.recipientTypeTabs}>
//             <button
//               className={`${styles.tabButton} ${recipientType === 'email' ? styles.activeTab : ''}`}
//               onClick={() => setRecipientType('email')}
//             >
//               <div className={styles.tabIconWrapper}>
//                 <FontAwesomeIcon
//                   icon={faEnvelope}
//                   className={styles.tabIcon}           // ← new class
//                 />
//               </div>
//               <span>Email</span>
//             </button>

//             <button
//               className={`${styles.tabButton} ${recipientType === 'phone' ? styles.activeTab : ''}`}
//               onClick={() => setRecipientType('phone')}
//             >
//               <div className={styles.tabIconWrapper}>
//                 <FontAwesomeIcon
//                   icon={faMobileAlt}
//                   className={styles.tabIcon}           // ← new class
//                 />
//               </div>
//               <span>Phone</span>
//             </button>
//           </div>

//           <div className={styles.addMoneyForm}>
//             {recipientType === 'email' && (
//               <>
//                 <label className={styles.fieldLabel}>Recipient Email</label>
//                 <input
//                   type="email"
//                   className={`${styles.amount} ${styles.recipientField} ${emailError ? styles.inputError : ''}`}
//                   placeholder="friend@example.com"
//                   value={recipientEmail}
//                   onChange={(e) => {
//                     setRecipientEmail(e.target.value.trim().toLowerCase());
//                     setEmailError('');
//                   }}
//                 />
//                 <label className={styles.fieldLabel}>Label (Nickname)</label>
//                 <input
//                   type="text"
//                   className={`${styles.amount} ${labelError ? styles.inputError : ''}`}
//                   placeholder="Friend, Business..."
//                   value={recipientLabel}
//                   onChange={(e) => {
//                     setRecipientLabel(e.target.value);
//                     setLabelError('');
//                   }}
//                 />
//                 <button className={styles.addMoneyBtn} onClick={handleSaveEmailRecipient} disabled={loading || !recipientEmail || !recipientLabel}>
//                   {loading ? 'Saving...' : 'Save & Continue'}
//                 </button>
//               </>
//             )}

//             {recipientType === 'phone' && (
//               <>
//                 <label className={styles.fieldLabel}>Phone Number</label>
//                 <div className={`${styles.quickRecipientWrapper} ${styles.recipientField}`}>
//                   <select
//                     className={styles.quickCountrySelect}
//                     value={recipientCountryCode}
//                     onChange={(e) => setRecipientCountryCode(e.target.value)}
//                   >
//                     {sortedCountries.map(c => (
//                       <option key={c.code} value={c.code}>
//                         {c.flag} {c.code}
//                       </option>
//                     ))}
//                   </select>
//                   <input
//                     type="tel"
//                     className={styles.phoneInput}
//                     placeholder="712 345 678"
//                     value={recipientPhone}
//                     onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
//                   />
//                 </div>
//                 <label className={styles.fieldLabel}>Label (Nickname)</label>
//                 <input
//                   type="text"
//                   className={`${styles.amount} ${labelError ? styles.inputError : ''}`}
//                   placeholder="Friend, Business..."
//                   value={recipientLabel}
//                   onChange={(e) => {
//                     setRecipientLabel(e.target.value);
//                     setLabelError('');
//                   }}
//                 />
//                 <button className={styles.addMoneyBtn} onClick={handleSavePhoneRecipient} disabled={loading || !recipientPhone || !recipientLabel}>
//                   {loading ? 'Saving...' : 'Save & Continue'}
//                 </button>
//               </>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Yes/No Confirmation Dialog */}
//       <YesNoPopup
//         isOpen={openDialog}
//         onClose={handleDialogCancel}
//         onSubmit={notificationOnly ? () => { } : handleDialogConfirm}
//         title={dialogTitle}
//         message={dialogMessage}
//         type={dialogTitle === 'Error' ? 'error' : 'warning'}
//         isNotification={notificationOnly}
//       />

//     </div>
//   );
// }

// export default Home;

// My try
// added
// import { djangoApis } from '../../utility/axiosInstance';
import { transactionsApi, contactsApi } from "../../utility/axiosInstance";
// to here
import axios from "axios";
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faArrowLeft,
  faPaperPlane,
  faMoneyBillWave,
  faPlus,
  faMinus,
  faMobileAlt,
  faCreditCard,
  faUniversity,
  faEnvelope,
  faTv,
  faGlobe,
  faHandshake,
  faUsers,
  faBriefcase,
  faChevronRight,
  faUserPlus,
  faEye,
  faEyeSlash,
  faHome,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import YesNoPopup from "../../styles/YesNoPopup";
import styles from "./Home.module.css";
import { countries } from "../../utility/countries";
//import { djangoAxios } from '../../utility/axiosInstance';
import { djangoApis } from "../../utility/axiosInstance";
import { API_URL } from "../../utility/constants";

function Option({ icon, text, onClick }) {
  return (
    <div className={styles.option} onClick={onClick}>
      <FontAwesomeIcon icon={icon} className={styles.optionIcon} />
      <span className={styles.optionText}>{text}</span>
    </div>
  );
}

function Home({ onPageChange, user }) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [withdrawOption, setWithdrawOption] = useState("");
  const [emailSearchTerm, setEmailSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [agentNumber, setAgentNumber] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addSelectedAccount, setAddSelectedAccount] = useState("");
  const [errorWallet, setErrorWallet] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogAction, setDialogAction] = useState(null);
  const [selectedAddOption, setSelectedAddOption] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [showWithdrawOptions, setShowWithdrawOptions] = useState(false);
  const [sendMethod, setSendMethod] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [phoneSearchTerm, setPhoneSearchTerm] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [mobileMoneySelected, setMobileMoneySelected] = useState(false);
  const [mobileMoneyWithdrawSelected, setMobileMoneyWithdrawSelected] =
    useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [animateKey, setAnimateKey] = useState(0);
  const [bottomView, setBottomView] = useState("transactions");
  // ───────────────────────────────────────────────
  // States for real balance from Django
  // ───────────────────────────────────────────────
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState(null);

  //---------------------------------------------------
  const [quickRecipient, setQuickRecipient] = useState("");
  const [quickAmount, setQuickAmount] = useState("");

  //-----------------------------------------------------------
  // Add Recipient states
  const [recipientName, setRecipientName] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [recipientCountryCode, setRecipientCountryCode] = useState("+254"); // Default Kenya
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientType, setRecipientType] = useState("email"); // 'email' | 'phone'
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [labelError, setLabelError] = useState("");
  const [loading, setLoading] = useState(false);
  const [myPhone, setMyPhone] = useState(null);

  // Replace or add these lines near your other useState declarations

  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null); // { type: 'email'|'phone', value: string }

  const [favourites, setFavourites] = useState([]); // list from API
  const [loadingFavourites, setLoadingFavourites] = useState(false);
  const [favouritesError, setFavouritesError] = useState(null);

  // PIN Verification for transactions
  const [pinVerificationError, setPinVerificationError] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false); // Eye toggle
  const [notificationOnly, setNotificationOnly] = useState(false);
  const [inputPin, setInputPin] = useState("");
  const [showInputPin, setShowInputPin] = useState(false);

  //const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));
  // Sort countries by dial code numerically ascending
  const sortedCountries = [...countries].sort((a, b) => {
    const codeA = parseInt(a.code.slice(1)); // Remove '+' and convert to number
    const codeB = parseInt(b.code.slice(1));
    return codeA - codeB;
  });

  const [quickDestinationCountry, setQuickDestinationCountry] = useState(
    sortedCountries.find((c) => c.name === "Kenya") || sortedCountries[0],
  );

  // Mock exchange rates and currency codes (add more as needed)
  const exchangeRates = {
    Kenya: { rate: 129.5, currency: "KES" },
    "United States": { rate: 1, currency: "USD" },
    "United Kingdom": { rate: 0.78, currency: "GBP" },
    Canada: { rate: 1.36, currency: "CAD" },
    // Add more countries here if desired
  };

  // Get rate and currency for selected country (fallback to USD)
  const destInfo = exchangeRates[quickDestinationCountry.name] || {
    rate: 1,
    currency: "USD",
  };
  const equivalentAmount = quickAmount
    ? (parseFloat(quickAmount) * destInfo.rate).toFixed(2)
    : "0.00";

  const emails = [
    "ahi.appoli@gmail.com",
    "ajoseph@payzarc.com",
    "amogezi@payzarc.com",
  ];
  const phonesByCountry = {
    "+1": ["8323302962", "8323302963"],
    "+254": ["711194068", "703133119"],
  };

  const emailFilteredEmails = emails.filter((email) =>
    email.toLowerCase().startsWith(emailSearchTerm.toLowerCase()),
  );
  const filteredPhones = (phonesByCountry[selectedCountryCode] || []).filter(
    (phone) => phone.toLowerCase().startsWith(phoneSearchTerm.toLowerCase()),
  );

  const toggleBalance = () => {
    setShowBalance((prev) => !prev);
    setAnimateKey((prev) => prev + 1); // forces remount / re-animation
  };

  // Helper to format balance safely
  const formattedBalance = balanceData
    ? Number(balanceData.balance).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  // Reset form fields when user changes
  useEffect(() => {
    setActiveSection("dashboard");
    setWithdrawOption("");
    setEmailSearchTerm("");
    setSelectedEmail("");
    setSendAmount("");
    setWithdrawAmount("");
    setAgentNumber("");
    setSelectedAccount("");
    setAddAmount("");
    setAddSelectedAccount("");
    setErrorWallet("");
    setOpenDialog(false);
    setDialogTitle("");
    setDialogMessage("");
    setDialogAction(null);
    setSelectedAddOption("");
    setShowAddInput(false);
    setShowWithdrawOptions(false);
    setSendMethod("");
    setSelectedCountryCode("");
    setPhoneSearchTerm("");
    setFullPhone("");
    setMobileMoneySelected(false);
    setMobileMoneyWithdrawSelected(false);
  }, [user]);

  useEffect(() => {
    const fetchMyContact = async () => {
      try {
        // const res = await djangoAxios.get('/api/my-contact/');
        const res = await contactsApi.get("/api/my-contact/");
        if (res.data.success) {
          setMyPhone(res.data.phone);
        }
      } catch (e) {}
    };
    fetchMyContact();
  }, []);

  const handleSavePhoneRecipient = async () => {
    const fullPhone = recipientCountryCode + recipientPhone.replace(/^0+/, "");
    if (!fullPhone || fullPhone.length < 10) {
      alert(
        "Please enter a valid phone number (at least 10 digits after country code)",
      );
      return;
    }
    if (myPhone && fullPhone === myPhone) {
      alert("You cannot add your own phone number as a favorite.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Check
      //const checkRes = await djangoAxios.post('/api/check/', {
      const checkRes = await contactsApi.post("/api/check/", {
        type: "phone",
        value: fullPhone,
      });
      alert(checkRes.data.message || "Check complete");

      // Step 2: Save
      //const saveRes = await djangoAxios.post('/api/favorite/add/', {
      const saveRes = await contactsApi.post("/api/favorite/add/", {
        favourite_type: "phone",
        favourite_detail: fullPhone,
        label: recipientLabel.trim(),
      });

      if (saveRes.status === 201) {
        alert("Phone recipient added successfully!");
        handleAddRecipientBack();
      } else {
        alert(`Unexpected status: ${saveRes.status}`);
      }
    } catch (err) {
      console.error("SAVE PHONE ERROR:", err); // ← see full details in browser console (F12)
      let errorMessage = "Failed to save phone recipient";
      if (err.response?.data) {
        const data = err.response.data;
        // Try to extract the first useful error message
        if (typeof data === "object" && data !== null) {
          // Common Django patterns
          if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
            errorMessage = data.non_field_errors[0];
          } else if (
            data.favourite_detail &&
            Array.isArray(data.favourite_detail)
          ) {
            errorMessage = data.favourite_detail[0];
          } else if (
            data.favourite_type &&
            Array.isArray(data.favourite_type)
          ) {
            errorMessage = data.favourite_type[0];
          } else if (data.label && Array.isArray(data.label)) {
            errorMessage = data.label[0];
          } else if (data.error) {
            errorMessage = data.error;
          } else if (data.detail) {
            errorMessage = data.detail;
          } else {
            // Fallback: show the whole object as string
            errorMessage = JSON.stringify(data, null, 2);
          }
        } else {
          errorMessage =
            String(data) || err.message || "Server returned unknown error";
        }

        // Add status code for context
        errorMessage += ` (HTTP ${err.response.status})`;
      } else if (err.request) {
        errorMessage =
          "No response from server – is Django running? Network issue?";
      } else {
        errorMessage = err.message || "Unknown error";
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validateEmailField = () => {
    if (!recipientEmail) {
      setEmailError("Email is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    if (recipientEmail.length < 10 || recipientEmail.length > 30) {
      setEmailError("Email must be 10–30 characters");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validateLabel = () => {
    const trimmed = recipientLabel.trim();
    if (!trimmed) {
      setLabelError("Label is required");
      return false;
    }
    if (trimmed.length < 3 || trimmed.length > 15) {
      setLabelError("Label must be 3–15 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
      setLabelError("Only letters, numbers and spaces allowed");
      return false;
    }
    setLabelError("");
    return true;
  };

  const handleSaveEmailRecipient = async () => {
    if (!validateEmailField() || !validateLabel()) return;

    setLoading(true);

    try {
      // Step 1: Check
      //const checkRes = await djangoAxios.post('/api/check/', {
      const checkRes = await contactsApi.post("/api/check/", {
        type: "email",
        value: recipientEmail, // ← consistent format
      });
      const { is_registered, message } = checkRes.data;
      alert(
        message ||
          (is_registered ? "Email already registered" : "Email not registered"),
      );

      // Step 2: Save
      //const saveRes = await djangoAxios.post('/api/favorite/add/', {
      const saveRes = await contactsApi.post("/api/favorite/add/", {
        favourite_type: "email",
        favourite_detail: recipientEmail,
        label: recipientLabel.trim(),
      });

      if (saveRes.status === 201) {
        alert("Recipient added successfully!");
        setRecipientEmail("");
        setRecipientLabel("");
        setEmailError("");
        setLabelError("");
        handleAddRecipientBack();
      } else {
        alert(`Unexpected status: ${saveRes.status}`);
      }
    } catch (err) {
      console.error("SAVE EMAIL ERROR:", err);

      let errorMessage = "Failed to add email recipient";

      if (err.response?.data) {
        const data = err.response.data;

        if (typeof data === "object" && data !== null) {
          if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
            errorMessage = data.non_field_errors[0];
          } else if (
            data.favourite_detail &&
            Array.isArray(data.favourite_detail)
          ) {
            errorMessage = data.favourite_detail[0];
          } else if (
            data.favourite_type &&
            Array.isArray(data.favourite_type)
          ) {
            errorMessage = data.favourite_type[0];
          } else if (data.label && Array.isArray(data.label)) {
            errorMessage = data.label[0];
          } else if (data.error) {
            errorMessage = data.error;
          } else if (data.detail) {
            errorMessage = data.detail;
          } else {
            errorMessage = JSON.stringify(data, null, 2);
          }
        } else {
          errorMessage =
            String(data) || err.message || "Server returned unknown error";
        }

        errorMessage += ` (HTTP ${err.response.status})`;
      } else if (err.request) {
        errorMessage = "No response from server – check Django is running";
      } else {
        errorMessage = err.message || "Unknown error";
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────
  // Fetch real wallet balance from Django
  // ───────────────────────────────────────────────
  //--------------------------------------------------------------------------
  // Define fetchBalance as a normal function in the component
  const fetchBalance = async () => {
    if (!user?.email) {
      setLoadingBalance(false);
      return;
    }
    try {
      console.log("Sending request to /api/balance/");
      console.log(
        "Token from localStorage:",
        localStorage.getItem("accessToken"),
      );
      console.log("Full headers:", transactionsApi.defaults.headers);
      const response = await transactionsApi.get("/api/balance/");
      const data = response.data;
      if (data.success !== undefined) {
        setBalanceData(data);
      } else {
        setBalanceError(data.error || "Failed to load balance");
      }
    } catch (err) {
      console.error("Balance fetch failed:", err);
      if (err.response?.status === 404) {
        setBalanceError("No wallet found for this account.");
      } else {
        setBalanceError("Could not load wallet balance");
      }
    } finally {
      setLoadingBalance(false);
    }
  };

  // Now call it in useEffect (initial load + user change)
  useEffect(() => {
    setLoadingBalance(true);
    setBalanceError(null);
    setBalanceData(null);
    fetchBalance();
  }, [user]);

  const fetchFavourites = async (searchQuery = "") => {
    if (!searchQuery.trim()) {
      setFavourites([]);
      return;
    }

    setLoadingFavourites(true);
    setFavouritesError(null);

    try {
      // Decide type based on input pattern
      let favType = "phone";
      if (
        /^[a-zA-Z]/.test(searchQuery) || // starts with letter
        searchQuery.includes("@") // contains @
      ) {
        favType = "email";
      } else if (
        searchQuery.startsWith("+") ||
        /^\d/.test(searchQuery) // starts with digit
      ) {
        favType = "phone";
      } else {
        // unclear → skip fetch or default to phone
        setFavourites([]);
        setLoadingFavourites(false);
        return;
      }

      const response = await contactsApi.get("/api/favorites/", {
        params: {
          type: favType,
          query: searchQuery,
        },
      });

      if (response.data.success) {
        setFavourites(response.data.favourites || []);
      } else {
        setFavouritesError(
          response.data.message || "Failed to load favourites",
        );
        setFavourites([]);
      }
    } catch (err) {
      console.error("Favourites fetch error:", err);
      setFavouritesError("Could not load favourite contacts");
      setFavourites([]);
    } finally {
      setLoadingFavourites(false);
    }
  };

  //------------///////////////////////////////////////
  const handleAddRecipientBack = () => {
    setActiveSection("dashboard");
    // Clear form
    setRecipientName("");
    setRecipientLabel("");
    setRecipientCountryCode("+254");
    setRecipientPhone("");
  };

  const handleSaveRecipient = () => {
    if (
      !recipientName.trim() ||
      !recipientPhone.trim() ||
      recipientPhone.length < 9
    ) {
      alert("Please enter a valid name and phone number");
      return;
    }
    const fullPhone = recipientCountryCode + recipientPhone;

    // Placeholder save (you can later connect to backend or localStorage array)
    alert(
      `Recipient saved!\nName: ${recipientName}\nPhone: ${fullPhone}\nLabel: ${recipientLabel || "None"}`,
    );

    // Clear and go back
    handleAddRecipientBack();
  };

  // ───────────────────────────────────────────────
  // Your existing handlers (unchanged)
  // ───────────────────────────────────────────────
  const handleQuickSend = () => {
    const amount = parseFloat(quickAmount);
    if (!quickRecipient.trim() || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid recipient and amount");
      return;
    }
    openConfirmationDialog(
      "Confirm Quick Send",
      `Send ${amount.toFixed(2)} USD (${equivalentAmount} ${destInfo.currency}) to ${quickRecipient} in ${quickDestinationCountry.name}?`,
      () => alert("Quick Send processed! (Connect to backend API here)"),
    );
  };

  const handleEmailSearchChange = (e) => {
    setErrorWallet("");
    setEmailSearchTerm(e.target.value);
    setSendAmount("");
    setSelectedEmail("");
  };

  const handleWithdrawOption = (option) => {
    if (option === "mobileMoney") {
      setMobileMoneyWithdrawSelected(true);
    } else {
      setWithdrawOption(option);
      setMobileMoneyWithdrawSelected(false);
      setShowWithdrawOptions(false);
      setWithdrawAmount("");
      setAgentNumber("");
      setSelectedAccount("");
      setSelectedCountryCode("");
      setPhoneSearchTerm("");
      setFullPhone("");
    }
  };

  const handleMobileMoneyWithdrawOptionSelect = (option) => {
    setWithdrawOption(option);
    setMobileMoneyWithdrawSelected(false);
    setShowWithdrawOptions(false);
    setWithdrawAmount("");
    setAgentNumber("");
    setSelectedAccount("");
    setSelectedCountryCode("");
    setPhoneSearchTerm("");
    setFullPhone("");
  };

  const handleEmailSelect = (email) => {
    setSelectedEmail(email);
    setEmailSearchTerm("");
  };

  const handleAddOptionSelect = (option) => {
    if (option === "mobileMoney") {
      setMobileMoneySelected(true);
    } else {
      setSelectedAddOption(option);
      setShowAddInput(true);
      setMobileMoneySelected(false);
      setAgentNumber("");
      setAddAmount("");
      setAddSelectedAccount("");
    }
  };

  const handleMobileMoneyOptionSelect = (option) => {
    setSelectedAddOption(option);
    setShowAddInput(true);
    setMobileMoneySelected(false);
    setAgentNumber("");
    setAddAmount("");
    setAddSelectedAccount("");
  };

  const handleAddMoneyBack = () => {
    if (
      showAddInput &&
      (selectedAddOption === "mpesa" || selectedAddOption === "airtel")
    ) {
      setShowAddInput(false);
      setSelectedAddOption("");
      setAddAmount("");
      setAddSelectedAccount("");
      setAgentNumber("");
      setSelectedCountryCode("");
      setPhoneSearchTerm("");
      setFullPhone("");
      setMobileMoneySelected(true);
    } else if (showAddInput) {
      setShowAddInput(false);
      setSelectedAddOption("");
      setAddAmount("");
      setAddSelectedAccount("");
      setAgentNumber("");
      setMobileMoneySelected(false);
    } else if (mobileMoneySelected) {
      setMobileMoneySelected(false);
    } else {
      setActiveSection("dashboard");
    }
  };

  const handleWithdrawBack = () => {
    if (
      withdrawOption &&
      (withdrawOption === "safiricom" || withdrawOption === "airtel")
    ) {
      setWithdrawOption("");
      setMobileMoneyWithdrawSelected(true);
      setShowWithdrawOptions(false);
      setWithdrawAmount("");
      setAgentNumber("");
      setSelectedAccount("");
      setSelectedCountryCode("");
      setPhoneSearchTerm("");
      setFullPhone("");
    } else if (withdrawOption) {
      setWithdrawOption("");
      setShowWithdrawOptions(true);
      setWithdrawAmount("");
      setAgentNumber("");
      setSelectedAccount("");
      setSelectedCountryCode("");
      setPhoneSearchTerm("");
      setFullPhone("");
    } else if (mobileMoneyWithdrawSelected) {
      setMobileMoneyWithdrawSelected(false);
      setShowWithdrawOptions(true);
    } else {
      setActiveSection("dashboard");
      setShowWithdrawOptions(false);
    }
  };

  const handleSendBack = () => {
    setRecipientSearchTerm("");
    setSelectedRecipient(null);
    setSendAmount("");
    setErrorWallet("");
    setActiveSection("dashboard");
  };

  const openConfirmationDialog = (title, message, action) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogAction(() => action);
    setOpenDialog(true);
  };

  const handleDialogConfirm = (typedValue, buttonChoice) => {
    setOpenDialog(false);

    if (dialogAction) {
      dialogAction(typedValue, buttonChoice); // Pass both values
    } else {
      showNotification("error", "Transaction cancelled");
      clearFields();
    }
  };

  const handleDialogCancel = () => {
    setOpenDialog(false);
    setNotificationOnly(false); // 👈 reset
    if (!notificationOnly) {
      showNotification("error", "Transaction cancelled");
      // alert('Transaction cancelled');
    }

    clearFields();
  };

  const clearFields = () => {
    setErrorWallet("");
    setEmailSearchTerm("");
    setSendAmount("");
    setSelectedEmail("");
    setPhoneSearchTerm("");
    setFullPhone("");
    setSelectedCountryCode("");
  };

  const isValidAmount = (amount) => {
    return (
      amount &&
      !isNaN(parseInt(amount)) &&
      parseInt(amount) >= 1 &&
      parseInt(amount) <= 500000
    );
  };

  const isValidRecipient = (value) => {
    if (!value) return false;
    // very basic check – improve later with real validation
    return value.length >= 6 && value.length <= 60;
  };

  const isSendButtonDisabled = () => {
    if (sendMethod === "email") {
      return !isValidAmount(sendAmount) || !isValidRecipient(selectedEmail);
    } else if (sendMethod === "phone") {
      return !isValidAmount(sendAmount) || !isValidRecipient(fullPhone);
    }
    return true;
  };

  const isAddMoneyButtonDisabled = () => {
    if (selectedAddOption === "bank") {
      return !isValidAmount(addAmount) || !addSelectedAccount;
    } else if (selectedAddOption === "payzarc") {
      return !isValidAmount(addAmount) || !agentNumber;
    } else if (
      selectedAddOption === "mpesa" ||
      selectedAddOption === "airtel"
    ) {
      return !isValidAmount(addAmount) || !isValidRecipient(fullPhone);
    }
    return !isValidAmount(addAmount);
  };

  const isWithdrawButtonDisabled = () => {
    if (withdrawOption === "atm") {
      return !isValidAmount(withdrawAmount) || !selectedAccount;
    } else if (withdrawOption === "safiricom" || withdrawOption === "airtel") {
      return !isValidAmount(withdrawAmount) || !isValidRecipient(fullPhone);
    } else if (withdrawOption === "payzarcAgent") {
      return !isValidAmount(withdrawAmount) || !agentNumber;
    }
    return true;
  };

  const handleSendMoney = async () => {
    if (
      !selectedRecipient ||
      !isValidAmount(sendAmount) ||
      inputPin.length !== 4
    ) {
      setErrorWallet("Enter recipient, valid amount and 4-digit PIN");
      return;
    }
    const token = localStorage.getItem("accessToken");
    const pho = selectedRecipient.value; //.replace("+254", "0");
    openConfirmationDialog(
      "Confirm Send Money",
      `Send ${sendAmount} to ${pho}?\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        // Only proceed if user typed 1 and clicked Yes
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }
        try {
          console.log(
            "Attempting to send money to: " + pho,
            "Amount: ",
            sendAmount,
            "Pin: ",
            inputPin,
            "Token: ",
            token,
          );
          const response = await transactionsApi.post(
            "/api/send-money/",
            {
              recipient_number: pho,
              amount: parseFloat(sendAmount),
              transaction_pin: inputPin,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          // alert(response.data.message);
          showNotification(
            "success",
            response.data.message || "Money sent successfully!",
          );
          fetchBalance();
          setRecipientSearchTerm("");
          setSelectedRecipient(null);
          setSendAmount("");
          setErrorWallet("");
          setInputPin("");
        } catch (error) {
          // alert(error.response?.data?.error || "Transfer failed");
          const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            "Unknown error";
          showNotification("error", `Transfer failed: ${errorMsg}`);
        }
      },
    );
  };

  const showNotification = (type, message) => {
    setDialogTitle(type === "success" ? "Success" : "Error");
    setDialogMessage(message);
    setNotificationOnly(true);
    setOpenDialog(true);
  };

  // ==================== PAYZARC AGENT WITHDRAW ====================
  const handlePayzarcAgentWithdraw = async () => {
    // Validation before opening confirmation
    if (
      !agentNumber ||
      !isValidAmount(withdrawAmount) ||
      inputPin.length !== 4
    ) {
      alert(
        "Please enter a valid agent number, amount (at least 1) and 4-digit PIN",
      );
      return;
    }

    openConfirmationDialog(
      "Confirm Payzarc Agent Withdrawal",
      `Withdraw ${withdrawAmount} via Payzarc Agent ${agentNumber}?\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        // Receive both parameters
        // Only proceed if user typed 1 and clicked Yes
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }

        try {
          console.log("=== PAYZARC WITHDRAW REQUEST ===");
          console.log("Transaction PIN used:", inputPin);
          console.log("Payload being sent:", {
            agent_number: agentNumber.trim(),
            amount: Number(withdrawAmount),
            transaction_pin: inputPin,
          });

          // const response = await djangoApis.system1.post('/api/withdraw/', {
          //   agent_number: agentNumber.trim(),
          //   amount: Number(withdrawAmount),
          //   transaction_pin: inputPin,
          // });
          const token = localStorage.getItem("accessToken");
          const response = await transactionsApi.post(
            "/api/withdraw/",
            {
              agent_number: agentNumber.trim(),
              amount: Number(withdrawAmount),
              transaction_pin: inputPin,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          console.log("Backend Response:", response.data);

          // Handle current placeholder response from backend
          const msg = response.data.message || "Withdrawal request submitted";

          showNotification("success", msg);

          // Clear form on success
          fetchBalance();
          setWithdrawAmount("");
          setAgentNumber("");
          setInputPin("");
          setActiveSection("dashboard");
        } catch (err) {
          console.error("Withdrawal Error:", err);

          let errorMsg = "Server error";
          if (err.response?.data?.message) {
            errorMsg = err.response.data.message;
          } else if (err.response?.data) {
            errorMsg = JSON.stringify(err.response.data);
          } else if (err.message) {
            errorMsg = err.message;
          }
          showNotification("error", `Withdrawal failed: ${errorMsg}`);
        }
      },
    );
  };

  const handleWithdraw = () => {
    if (withdrawOption === "payzarcAgent") {
      handlePayzarcAgentWithdraw();
      return;
    }
    // Other withdrawal types (ATM, Safaricom, etc.) - keep placeholder for now
    alert(
      `Withdrawal of ${withdrawAmount} via ${withdrawOption} — Backend call goes here`,
    );
  };

  const handleAddMoney = () => {
    if (
      !addAmount ||
      (selectedAddOption === "bank" && !addSelectedAccount) ||
      (selectedAddOption === "payzarc" && !agentNumber) ||
      ((selectedAddOption === "mpesa" || selectedAddOption === "airtel") &&
        !isValidRecipient(fullPhone))
    ) {
      alert("Please fill in all required fields");
      return;
    }
    openConfirmationDialog(
      "Confirm Add Money",
      `Are you adding ${addAmount} from ${selectedAddOption}${
        selectedAddOption === "bank"
          ? ` account ${addSelectedAccount}`
          : selectedAddOption === "payzarc"
            ? ` agent ${agentNumber}`
            : ` phone ${fullPhone}`
      }?\nYes or 1 to confirm,\nNo or 2 to cancel.`,
      () => alert("Connecting to backend API"),
    );
  };

  const getWithdrawTitle = () => {
    switch (withdrawOption) {
      case "atm":
        return "ATM Withdrawal";
      case "safiricom":
        return "Safaricom Withdrawal";
      case "airtel":
        return "Airtel Withdrawal";
      case "payzarcAgent":
        return "Payzarc Agent Withdrawal";
      default:
        return mobileMoneyWithdrawSelected ? "Mobile Money" : "Withdraw Money";
    }
  };

  const getAddMoneyTitle = () => {
    switch (selectedAddOption) {
      case "bank":
        return "Bank Deposit";
      case "mpesa":
        return "Mpesa Deposit";
      case "airtel":
        return "Airtel Deposit";
      case "payzarc":
        return "Payzarc Deposit";
      default:
        return mobileMoneySelected ? "Mobile Money" : "Add Money";
    }
  };

  const getSendMoneyTitle = () => {
    switch (sendMethod) {
      case "email":
        return "Send Money via Email";
      case "phone":
        return "Send Money via Phone";
      default:
        return "Send Money";
    }
  };

  return (
    <div className={`${styles.section} ${styles.active}`}>
      {activeSection === "dashboard" && (
        <div className={styles.homeDashboard}>
          {/* Wallet – always visible at top (full width on mobile, left column on desktop) */}
          <div className={styles.divWallet}>
            <h4>Wallet Balance</h4>

            {loadingBalance ? (
              <div className={styles.loading}>Loading balance...</div>
            ) : balanceError ? (
              <p className={styles.errorWallet}>{balanceError}</p>
            ) : (
              <div className={styles.walletBalanceContainer}>
                <div
                  key={animateKey}
                  className={`${styles.balanceDisplay} ${showBalance ? styles.visible : styles.hidden}`}
                >
                  {showBalance ? (
                    <span className={styles.balanceReveal}>
                      {balanceData?.currency || "USD"} {formattedBalance}
                    </span>
                  ) : (
                    <span className={styles.balanceHidden}>****.**</span>
                  )}
                </div>

                <button
                  className={styles.eyeToggle}
                  onClick={toggleBalance}
                  type="button"
                  aria-label={showBalance ? "Hide balance" : "Show balance"}
                >
                  <FontAwesomeIcon
                    icon={showBalance ? faEyeSlash : faEye}
                    className={styles.eyeIcon}
                  />
                </button>
              </div>
            )}

            {errorWallet && <p className={styles.errorWallet}>{errorWallet}</p>}

            <div className={styles.walletButtons}>
              <button
                className={styles.actionBtn}
                onClick={() => setActiveSection("addMoney")}
              >
                Add Money{" "}
                <FontAwesomeIcon icon={faPlus} className={styles.buttonIcon} />
              </button>

              <button
                className={styles.actionBtn}
                onClick={() => {
                  setActiveSection("withdraw");
                  setShowWithdrawOptions(true);
                }}
              >
                Withdraw{" "}
                <FontAwesomeIcon icon={faMinus} className={styles.buttonIcon} />
              </button>

              <button
                className={styles.actionBtn}
                onClick={() => setActiveSection("addRecipient")}
              >
                Add Recipient{" "}
                <FontAwesomeIcon
                  icon={faUserPlus}
                  className={styles.buttonIcon}
                />
              </button>
            </div>
          </div>

          {/* Mobile navigation – visible only on small screens */}
          <div className={styles.mobileNavBar}>
            <button
              className={`${styles.navIconBtn} ${bottomView === "transactions" ? styles.active : ""}`}
              onClick={() => setBottomView("transactions")}
            >
              <FontAwesomeIcon icon={faHome} />
              <span>Home</span>
            </button>

            <button
              className={`${styles.navIconBtn} ${bottomView === "quickSend" ? styles.active : ""}`}
              onClick={() => setBottomView("quickSend")}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              <span>Quick Send</span>
            </button>

            <button
              className={`${styles.navIconBtn} ${bottomView === "chamas" ? styles.active : ""}`}
              onClick={() => setBottomView("chamas")}
            >
              <FontAwesomeIcon icon={faUsers} />
              <span>Chamas</span>
            </button>

            <button
              className={`${styles.navIconBtn} ${bottomView === "quickActions" ? styles.active : ""}`}
              onClick={() => setBottomView("quickActions")}
            >
              <FontAwesomeIcon icon={faBolt} />
              <span>Actions</span>
            </button>
          </div>

          {/* ────────────────────────────────────────────── */}
          {/* MOBILE LAYOUT: dynamic switching content       */}
          {/* ────────────────────────────────────────────── */}
          <div className={styles.dynamicBottomContent}>
            {bottomView === "transactions" && (
              <div className={styles.divTransactions}>
                <h4>Latest Transactions</h4>
                <div className={styles.transactionsList}>
                  <div
                    className={styles.transactionItem}
                    onClick={() => onPageChange("history")}
                  >
                    <div className={styles.itemLeft}>
                      <div
                        className={`${styles.itemIcon} ${styles.netflixIcon}`}
                      >
                        <FontAwesomeIcon icon={faTv} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>DsTV</div>
                        <div className={styles.itemTime}>Today · 09:32 AM</div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.negative}`}>
                      - USD 142.99
                    </div>
                  </div>

                  <div
                    className={styles.transactionItem}
                    onClick={() => onPageChange("history")}
                  >
                    <div className={styles.itemLeft}>
                      <div
                        className={`${styles.itemIcon} ${styles.saversIcon}`}
                      >
                        <FontAwesomeIcon icon={faGlobe} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>
                          Payzarc Club Contribution
                        </div>
                        <div className={styles.itemTime}>
                          Yesterday · 4:18 PM
                        </div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.positive}`}>
                      + KES 2,400
                    </div>
                  </div>

                  <div
                    className={styles.transactionItem}
                    onClick={() => onPageChange("history")}
                  >
                    <div className={styles.itemLeft}>
                      <div
                        className={`${styles.itemIcon} ${styles.businessIcon}`}
                      >
                        <FontAwesomeIcon icon={faHandshake} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>Dubai Partners</div>
                        <div className={styles.itemTime}>Today · 9:41 AM</div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.negative}`}>
                      - KES 10,000
                    </div>
                  </div>
                </div>

                <p
                  className={styles.seeAll}
                  onClick={() => onPageChange("history")}
                >
                  See all
                </p>
              </div>
            )}

            {bottomView === "quickSend" && (
              <div className={styles.userDetails}>
                <div className={styles.quickSendContainer}>
                  <h4 className={styles.quickSendTitle}>Quick Send</h4>

                  <div className={styles.quickRecipientWrapper}>
                    <div className={styles.prefix}>🇺🇸 +1 ▼</div>
                    <input
                      type="text"
                      placeholder="Phone number or Email"
                      className={styles.quickRecipientInput}
                      value={quickRecipient}
                      onChange={(e) => setQuickRecipient(e.target.value)}
                    />
                  </div>

                  <select
                    className={styles.quickCountrySelect}
                    value={quickDestinationCountry.name}
                    onChange={(e) => {
                      const selected = sortedCountries.find(
                        (c) => c.name === e.target.value,
                      );
                      setQuickDestinationCountry(selected);
                    }}
                  >
                    {sortedCountries.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>

                  <div className={styles.quickAmounts}>
                    <div className={styles.amountGroup}>
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        step="1"
                        placeholder="0.00"
                        className={styles.quickAmountInput}
                        value={quickAmount}
                        onChange={(e) => setQuickAmount(e.target.value)}
                      />
                      <span className={styles.currencyLabel}>USD</span>
                    </div>

                    <div className={styles.amountGroup}>
                      <input
                        type="text"
                        className={styles.quickAmountInput}
                        value={equivalentAmount}
                        readOnly
                      />
                      <span className={styles.currencyLabel}>
                        {destInfo.currency}
                      </span>
                    </div>
                  </div>

                  <button
                    className={styles.actionBtn}
                    onClick={handleQuickSend}
                  >
                    Send Money{" "}
                    <FontAwesomeIcon
                      icon={faPaperPlane}
                      className={styles.buttonIcon}
                    />
                  </button>
                </div>
              </div>
            )}

            {bottomView === "chamas" && (
              <div className={styles.divGroups}>
                <h4>CHAMAS & GROUPS</h4>
                <div className={styles.groupsList}>
                  <div
                    className={styles.groupItem}
                    onClick={() => onPageChange("groups")}
                  >
                    <div className={styles.itemLeft}>
                      <div
                        className={`${styles.itemIcon} ${styles.saversIcon}`}
                      >
                        <FontAwesomeIcon icon={faUsers} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>Savers Club</div>
                        <div className={styles.itemTime}>12 Members</div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.positive}`}>
                      + KES 62,500
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className={styles.arrowIcon}
                    />
                  </div>

                  <div
                    className={styles.groupItem}
                    onClick={() => onPageChange("groups")}
                  >
                    <div className={styles.itemLeft}>
                      <div
                        className={`${styles.itemIcon} ${styles.businessIcon}`}
                      >
                        <FontAwesomeIcon icon={faBriefcase} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>
                          Business Partners
                        </div>
                        <div className={styles.itemTime}>8 Members</div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.positive}`}>
                      + KES 150,000
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className={styles.arrowIcon}
                    />
                  </div>
                </div>

                <p
                  className={styles.createGroup}
                  onClick={() => onPageChange("groups")}
                >
                  + Create or Send to Group
                </p>
              </div>
            )}

            {bottomView === "quickActions" && (
              <div className={styles.divQuick}>
                <h4>Quick Actions</h4>
                <div className={styles.quickButtons}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => {
                      setActiveSection("withdraw");
                      setShowWithdrawOptions(true);
                    }}
                  >
                    Withdraw Money{" "}
                    <FontAwesomeIcon
                      icon={faMoneyBillWave}
                      className={styles.buttonIcon}
                    />
                  </button>

                  <button
                    className={styles.actionBtn}
                    onClick={() => setActiveSection("wallet")}
                  >
                    Send Money{" "}
                    <FontAwesomeIcon
                      icon={faPaperPlane}
                      className={styles.buttonIcon}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ────────────────────────────────────────────── */}
          {/* DESKTOP LAYOUT: individual positioned cards    */}
          {/* ────────────────────────────────────────────── */}

          {/* Quick Send – top right (grid-column: 2, grid-row: 1) */}
          <div className={styles.userDetails}>
            <div className={styles.quickSendContainer}>
              <h4 className={styles.quickSendTitle}>Quick Send</h4>

              <div className={styles.quickRecipientWrapper}>
                <div className={styles.prefix}>🇺🇸 +1 ▼</div>
                <input
                  type="text"
                  placeholder="Phone number or Email"
                  className={styles.quickRecipientInput}
                  value={quickRecipient}
                  onChange={(e) => setQuickRecipient(e.target.value)}
                />
              </div>

              <select
                className={styles.quickCountrySelect}
                value={quickDestinationCountry.name}
                onChange={(e) => {
                  const selected = sortedCountries.find(
                    (c) => c.name === e.target.value,
                  );
                  setQuickDestinationCountry(selected);
                }}
              >
                {sortedCountries.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>

              <div className={styles.quickAmounts}>
                <div className={styles.amountGroup}>
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    placeholder="0.00"
                    className={styles.quickAmountInput}
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                  />
                  <span className={styles.currencyLabel}>USD</span>
                </div>

                <div className={styles.amountGroup}>
                  <input
                    type="text"
                    className={styles.quickAmountInput}
                    value={equivalentAmount}
                    readOnly
                  />
                  <span className={styles.currencyLabel}>
                    {destInfo.currency}
                  </span>
                </div>
              </div>

              <button className={styles.actionBtn} onClick={handleQuickSend}>
                Send Money{" "}
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  className={styles.buttonIcon}
                />
              </button>
            </div>
          </div>

          {/* Quick Actions – bottom left, row 2 */}
          <div className={styles.divQuick}>
            <h4>Quick Actions</h4>
            <div className={styles.quickButtons}>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  setActiveSection("withdraw");
                  setShowWithdrawOptions(true);
                }}
              >
                Withdraw Money{" "}
                <FontAwesomeIcon
                  icon={faMoneyBillWave}
                  className={styles.buttonIcon}
                />
              </button>

              <button
                className={styles.actionBtn}
                onClick={() => setActiveSection("wallet")}
              >
                Send Money{" "}
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  className={styles.buttonIcon}
                />
              </button>
            </div>
          </div>

          {/* Chamas & Groups – bottom left, row 3 */}
          <div className={styles.divGroups}>
            <h4>CHAMAS & GROUPS</h4>
            <div className={styles.groupsList}>
              <div
                className={styles.groupItem}
                onClick={() => onPageChange("groups")}
              >
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>Savers Club</div>
                    <div className={styles.itemTime}>12 Members</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.positive}`}>
                  + KES 62,500
                </div>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className={styles.arrowIcon}
                />
              </div>

              <div
                className={styles.groupItem}
                onClick={() => onPageChange("groups")}
              >
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
                    <FontAwesomeIcon icon={faBriefcase} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>Business Partners</div>
                    <div className={styles.itemTime}>8 Members</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.positive}`}>
                  + KES 150,000
                </div>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className={styles.arrowIcon}
                />
              </div>
            </div>

            <p
              className={styles.createGroup}
              onClick={() => onPageChange("groups")}
            >
              + Create or Send to Group
            </p>
          </div>

          {/* Latest Transactions – right column, spans rows 2–4 */}
          <div className={styles.divTransactions}>
            <h4>Latest Transactions</h4>
            <div className={styles.transactionsList}>
              <div
                className={styles.transactionItem}
                onClick={() => onPageChange("history")}
              >
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.netflixIcon}`}>
                    <FontAwesomeIcon icon={faTv} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>DsTV</div>
                    <div className={styles.itemTime}>Today · 09:32 AM</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.negative}`}>
                  - USD 142.99
                </div>
              </div>

              <div
                className={styles.transactionItem}
                onClick={() => onPageChange("history")}
              >
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
                    <FontAwesomeIcon icon={faGlobe} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>
                      Payzarc Club Contribution
                    </div>
                    <div className={styles.itemTime}>Yesterday · 4:18 PM</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.positive}`}>
                  + KES 2,400
                </div>
              </div>

              <div
                className={styles.transactionItem}
                onClick={() => onPageChange("history")}
              >
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
                    <FontAwesomeIcon icon={faHandshake} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>Dubai Partners</div>
                    <div className={styles.itemTime}>Today · 9:41 AM</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.negative}`}>
                  - KES 10,000
                </div>
              </div>
            </div>

            <p
              className={styles.seeAll}
              onClick={() => onPageChange("history")}
            >
              See all
            </p>
          </div>
        </div>
      )}

      {activeSection === "wallet" && (
        <div className={styles.walletContent}>
          <div className={styles.header}>
            <FontAwesomeIcon
              icon={faArrowLeft}
              className={styles.backIcon}
              onClick={handleSendBack}
            />
            <h3>Send Money</h3>
          </div>

          {errorWallet && <p className={styles.errorWallet}>{errorWallet}</p>}

          <div className={styles.addMoneyForm}>
            {/* Unified search field – email or phone */}
            <div className={styles.recipient} style={{ position: "relative" }}>
              <input
                type="text"
                className={styles.search}
                placeholder="Enter recipient email or phone no..."
                value={recipientSearchTerm}
                onChange={(e) => {
                  const value = e.target.value.trim(); // Trim whitespace for clean queries
                  setRecipientSearchTerm(value); // Keep your existing state update
                  setSelectedRecipient(null); // Reset any previous selection (as before)

                  if (value) {
                    fetchFavourites(value); // Call the API with the typed value
                  } else {
                    setFavourites([]); // Clear suggestions if not phone-like
                  }
                }}
              />
              <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
              {/*///////////////////////////////////////////////////////////////////////////////*/}
              <div
                className={styles.userAvatarWrapper}
                title="Add recipient"
                onClick={() => setActiveSection("addRecipient")}
              >
                <FontAwesomeIcon
                  icon={faUserPlus}
                  className={styles.addUserIcon}
                />
              </div>
              {/*///////////////////////////////////////////////////////////////////////////////*/}

              {/* Dropdown suggestions – both emails and phones */}
              {recipientSearchTerm && (
                <ul className={styles.suggestions}>
                  {loadingFavourites ? (
                    <li className={styles.loadingItem}>
                      Loading favourites...
                    </li>
                  ) : favouritesError ? (
                    <li className={styles.errorItem}>{favouritesError}</li>
                  ) : favourites.length === 0 ? (
                    <li>No matching favourites found</li>
                  ) : (
                    favourites.map((fav, index) => (
                      <li
                        key={index}
                        onClick={() => {
                          setSelectedRecipient({
                            type: fav.detail.includes("@") ? "email" : "phone",
                            value: fav.detail,
                          });
                          setRecipientSearchTerm("");
                          setFavourites([]);
                        }}
                      >
                        {fav.detail}
                        <small>
                          ({fav.label || "no label"} ·{" "}
                          {fav.detail.includes("@") ? "email" : "phone"})
                        </small>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            {/* Shows the finally selected value (read-only) with label */}
            {selectedRecipient && (
              <>
                <label
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                    margin: "0 0 6px 2px",
                    fontWeight: "500",
                    display: "block",
                  }}
                >
                  Selected recipient
                </label>
                <input
                  type="text"
                  className={styles.email}
                  placeholder="Selected recipient"
                  value={`${selectedRecipient.value} (${selectedRecipient.type})`}
                  readOnly
                />
              </>
            )}

            {/* Amount field */}
            <input
              type="number"
              min="1"
              max="500000"
              className={styles.amount}
              placeholder="Amount"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
            />
            <div style={{ position: "relative", marginTop: "10px" }}>
              <input
                type={showInputPin ? "text" : "password"}
                maxLength="4"
                className={styles.amount}
                placeholder="Enter PIN"
                value={inputPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setInputPin(val);
                }}
              />

              <button
                type="button"
                onClick={() => setShowInputPin(!showInputPin)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                {showInputPin ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Send button */}
            <button
              className={styles.sendBtn}
              onClick={handleSendMoney}
              disabled={
                !selectedRecipient ||
                !sendAmount ||
                !isValidAmount(sendAmount) ||
                inputPin.length !== 4
              }
            >
              Send Money{" "}
              <FontAwesomeIcon
                icon={faPaperPlane}
                className={styles.buttonIcon}
              />
            </button>
          </div>
        </div>
      )}

      {activeSection === "addMoney" && (
        <div className={styles.addMoneyContent}>
          <div className={styles.header}>
            <FontAwesomeIcon
              icon={faArrowLeft}
              className={styles.backIcon}
              onClick={handleAddMoneyBack}
            />
            <h3>{getAddMoneyTitle()}</h3>
          </div>
          {!showAddInput && !mobileMoneySelected ? (
            <div className={styles.optionsList}>
              <Option
                icon={faUniversity}
                text="Bank"
                onClick={() => handleAddOptionSelect("bank")}
              />
              <Option
                icon={faMobileAlt}
                text="Mobile Money"
                onClick={() => handleAddOptionSelect("mobileMoney")}
              />
              <Option
                icon={faMoneyBillWave}
                text="Payzarc"
                onClick={() => handleAddOptionSelect("payzarc")}
              />
            </div>
          ) : mobileMoneySelected ? (
            <div className={styles.optionsList}>
              <Option
                icon={faMobileAlt}
                text="Mpesa"
                onClick={() => handleMobileMoneyOptionSelect("mpesa")}
              />
              <Option
                icon={faCreditCard}
                text="Airtel"
                onClick={() => handleMobileMoneyOptionSelect("airtel")}
              />
            </div>
          ) : (
            <div className={styles.addMoneyForm}>
              {selectedAddOption === "bank" && (
                <select
                  className={styles.accountSelect}
                  value={addSelectedAccount}
                  onChange={(e) => setAddSelectedAccount(e.target.value)}
                >
                  <option value="">Select Bank Account</option>
                  <option value="123456789">123456789</option>
                  <option value="987654321">987654321</option>
                </select>
              )}
              {selectedAddOption === "payzarc" && (
                <input
                  type="text"
                  className={styles.agentNo}
                  placeholder="Agent Number"
                  value={agentNumber}
                  onChange={(e) => setAgentNumber(e.target.value)}
                />
              )}
              {(selectedAddOption === "mpesa" ||
                selectedAddOption === "airtel") && (
                <div className={styles.mobileMoneyForm}>
                  <select
                    className={styles.accountSelect}
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                  >
                    <option value="">Select Country Code</option>
                    {sortedCountries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code} {country.name}
                      </option>
                    ))}
                  </select>
                  <div className={styles.recipient}>
                    <input
                      type="text"
                      className={styles.search}
                      placeholder="Type phone number ..."
                      value={phoneSearchTerm}
                      onChange={(e) => setPhoneSearchTerm(e.target.value)}
                      disabled={!selectedCountryCode}
                    />
                    <FontAwesomeIcon
                      icon={faSearch}
                      className={styles.searchIcon}
                    />
                    {phoneSearchTerm && selectedCountryCode && (
                      <ul className={styles.suggestions}>
                        {filteredPhones.map((phone) => (
                          <li
                            key={phone}
                            onClick={() => {
                              setFullPhone(`${selectedCountryCode}${phone}`);
                              setPhoneSearchTerm("");
                            }}
                          >
                            {phone}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <input
                    type="text"
                    className={styles.email}
                    placeholder="Full Phone Number"
                    value={fullPhone}
                    readOnly
                  />
                  <input
                    type="number"
                    min="1"
                    max="500000"
                    className={styles.amount}
                    placeholder="Amount"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                  />
                </div>
              )}
              {selectedAddOption !== "mpesa" &&
                selectedAddOption !== "airtel" && (
                  <input
                    type="number"
                    min="1"
                    max="500000"
                    className={styles.amount}
                    placeholder="Amount"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                  />
                )}
              <button
                className={styles.addMoneyBtn}
                onClick={handleAddMoney}
                disabled={isAddMoneyButtonDisabled()}
              >
                Add Money{" "}
                <FontAwesomeIcon icon={faPlus} className={styles.buttonIcon} />
              </button>
            </div>
          )}
        </div>
      )}
      {activeSection === "withdraw" && (
        <div className={styles.withdrawContent}>
          <div className={styles.header}>
            <FontAwesomeIcon
              icon={faArrowLeft}
              className={styles.backIcon}
              onClick={handleWithdrawBack}
            />
            <h3>{getWithdrawTitle()}</h3>
          </div>
          {showWithdrawOptions && !mobileMoneyWithdrawSelected ? (
            <div className={styles.optionsList}>
              <Option
                icon={faUniversity}
                text="ATM"
                onClick={() => handleWithdrawOption("atm")}
              />
              <Option
                icon={faMobileAlt}
                text="Mobile Money"
                onClick={() => handleWithdrawOption("mobileMoney")}
              />
              <Option
                icon={faMoneyBillWave}
                text="Payzarc Agent"
                onClick={() => handleWithdrawOption("payzarcAgent")}
              />
            </div>
          ) : mobileMoneyWithdrawSelected ? (
            <div className={styles.optionsList}>
              <Option
                icon={faMobileAlt}
                text="Safaricom"
                onClick={() =>
                  handleMobileMoneyWithdrawOptionSelect("safiricom")
                }
              />
              <Option
                icon={faCreditCard}
                text="Airtel"
                onClick={() => handleMobileMoneyWithdrawOptionSelect("airtel")}
              />
            </div>
          ) : (
            <div className={styles.withdrawForm}>
              {withdrawOption === "atm" && (
                <div className={styles.atmWithdraw}>
                  <select
                    className={styles.accountSelect}
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                  >
                    <option value="">Select Card Number</option>
                    <option value="123456789">Card ending 6789</option>
                    <option value="987654321">Card ending 4321</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="500000"
                    className={styles.amount}
                    placeholder="Amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <button
                    className={styles.withdrawBtn}
                    onClick={handleWithdraw}
                    disabled={isWithdrawButtonDisabled()}
                  >
                    Withdraw{" "}
                    <FontAwesomeIcon
                      icon={faMoneyBillWave}
                      className={styles.buttonIcon}
                    />
                  </button>
                </div>
              )}
              {(withdrawOption === "safiricom" ||
                withdrawOption === "airtel") && (
                <div className={styles.mobileMoneyForm}>
                  <select
                    className={styles.accountSelect}
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                  >
                    <option value="">Select Country Code</option>
                    {sortedCountries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code} {country.name}
                      </option>
                    ))}
                  </select>
                  <div className={styles.recipient}>
                    <input
                      type="text"
                      className={styles.search}
                      placeholder="Type phone number ..."
                      value={phoneSearchTerm}
                      onChange={(e) => setPhoneSearchTerm(e.target.value)}
                      disabled={!selectedCountryCode}
                    />
                    <FontAwesomeIcon
                      icon={faSearch}
                      className={styles.searchIcon}
                    />
                    {phoneSearchTerm && selectedCountryCode && (
                      <ul className={styles.suggestions}>
                        {filteredPhones.map((phone) => (
                          <li
                            key={phone}
                            onClick={() => {
                              setFullPhone(`${selectedCountryCode}${phone}`);
                              setPhoneSearchTerm("");
                            }}
                          >
                            {phone}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <input
                    type="text"
                    className={styles.email}
                    placeholder="Full Phone Number"
                    value={fullPhone}
                    readOnly
                  />
                  <input
                    type="number"
                    min="1"
                    max="500000"
                    className={styles.amount}
                    placeholder="Amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <button
                    className={styles.withdrawBtn}
                    onClick={handleWithdraw}
                    disabled={isWithdrawButtonDisabled()}
                  >
                    Withdraw{" "}
                    <FontAwesomeIcon
                      icon={faMoneyBillWave}
                      className={styles.buttonIcon}
                    />
                  </button>
                </div>
              )}
              {withdrawOption === "payzarcAgent" && (
                <div className={styles.agentWithdraw}>
                  <input
                    type="text"
                    className={styles.agentNo}
                    placeholder="Agent Number"
                    value={agentNumber}
                    onChange={(e) => setAgentNumber(e.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    max="500000"
                    className={styles.amount}
                    placeholder="Amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <div style={{ position: "relative", marginTop: "10px" }}>
                    <input
                      type={showInputPin ? "text" : "password"}
                      maxLength="4"
                      className={styles.amount}
                      placeholder="Enter PIN"
                      value={inputPin}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4);
                        setInputPin(val);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowInputPin(!showInputPin)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                      }}
                    >
                      {showInputPin ? "🙈" : "👁️"}
                    </button>
                  </div>

                  <button
                    className={styles.withdrawBtn}
                    onClick={handlePayzarcAgentWithdraw}
                    disabled={
                      !agentNumber ||
                      !isValidAmount(withdrawAmount) ||
                      inputPin.length !== 4
                    }
                  >
                    Withdraw via Agent{" "}
                    <FontAwesomeIcon
                      icon={faMoneyBillWave}
                      className={styles.buttonIcon}
                    />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeSection === "addRecipient" && (
        <div className={styles.addMoneyContent}>
          <div className={styles.header}>
            <FontAwesomeIcon
              icon={faArrowLeft}
              className={styles.backIcon}
              onClick={handleAddRecipientBack}
            />
            <h3>Add Recipient</h3>
          </div>

          <div className={styles.recipientTypeTabs}>
            <button
              className={`${styles.tabButton} ${recipientType === "email" ? styles.activeTab : ""}`}
              onClick={() => setRecipientType("email")}
            >
              <div className={styles.tabIconWrapper}>
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className={styles.tabIcon} // ← new class
                />
              </div>
              <span>Email</span>
            </button>

            <button
              className={`${styles.tabButton} ${recipientType === "phone" ? styles.activeTab : ""}`}
              onClick={() => setRecipientType("phone")}
            >
              <div className={styles.tabIconWrapper}>
                <FontAwesomeIcon
                  icon={faMobileAlt}
                  className={styles.tabIcon} // ← new class
                />
              </div>
              <span>Phone</span>
            </button>
          </div>

          <div className={styles.addMoneyForm}>
            {recipientType === "email" && (
              <>
                <label className={styles.fieldLabel}>Recipient Email</label>
                <input
                  type="email"
                  className={`${styles.amount} ${styles.recipientField} ${emailError ? styles.inputError : ""}`}
                  placeholder="friend@example.com"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value.trim().toLowerCase());
                    setEmailError("");
                  }}
                />
                <label className={styles.fieldLabel}>Label (Nickname)</label>
                <input
                  type="text"
                  className={`${styles.amount} ${labelError ? styles.inputError : ""}`}
                  placeholder="Friend, Business..."
                  value={recipientLabel}
                  onChange={(e) => {
                    setRecipientLabel(e.target.value);
                    setLabelError("");
                  }}
                />
                <button
                  className={styles.addMoneyBtn}
                  onClick={handleSaveEmailRecipient}
                  disabled={loading || !recipientEmail || !recipientLabel}
                >
                  {loading ? "Saving..." : "Save & Continue"}
                </button>
              </>
            )}

            {recipientType === "phone" && (
              <>
                <label className={styles.fieldLabel}>Phone Number</label>
                <div
                  className={`${styles.quickRecipientWrapper} ${styles.recipientField}`}
                >
                  <select
                    className={styles.quickCountrySelect}
                    value={recipientCountryCode}
                    onChange={(e) => setRecipientCountryCode(e.target.value)}
                  >
                    {sortedCountries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    className={styles.phoneInput}
                    placeholder="712 345 678"
                    value={recipientPhone}
                    onChange={(e) =>
                      setRecipientPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 15),
                      )
                    }
                  />
                </div>
                <label className={styles.fieldLabel}>Label (Nickname)</label>
                <input
                  type="text"
                  className={`${styles.amount} ${labelError ? styles.inputError : ""}`}
                  placeholder="Friend, Business..."
                  value={recipientLabel}
                  onChange={(e) => {
                    setRecipientLabel(e.target.value);
                    setLabelError("");
                  }}
                />
                <button
                  className={styles.addMoneyBtn}
                  onClick={handleSavePhoneRecipient}
                  disabled={loading || !recipientPhone || !recipientLabel}
                >
                  {loading ? "Saving..." : "Save & Continue"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Yes/No Confirmation Dialog */}
      <YesNoPopup
        isOpen={openDialog}
        onClose={handleDialogCancel}
        onSubmit={notificationOnly ? () => {} : handleDialogConfirm}
        title={dialogTitle}
        message={dialogMessage}
        type={dialogTitle === "Error" ? "error" : "warning"}
        isNotification={notificationOnly}
      />
    </div>
  );
}

export default Home;

// .section {
//   width: 100%;
//   max-width: 600px;
//   margin: 0;
//   padding: 1rem;
//   display: none;
//   flex-direction: column;
//   gap: 5px;
//   opacity: 0;
//   transform: translateY(20px);
//   transition: opacity 0.5s ease, transform 0.5s ease;
//   background-color: var(--primary-dashboard-bgcolor, #f2f6ff);
//   max-height: 90vh;
//   overflow-y: auto;
//   overflow-x: hidden;
//   scrollbar-width: thin;
//   scrollbar-color: #64748b #1e293b;
//   box-sizing: border-box;
// }

// .section::-webkit-scrollbar {
//   width: 6px;
// }

// .section::-webkit-scrollbar-track {
//   background: #1e293b;
//   border-radius: 12px;
// }

// .section::-webkit-scrollbar-thumb {
//   background: #64748b;
//   border-radius: 12px;
// }

// .section::-webkit-scrollbar-thumb:hover {
//   background: #94a3b8;
// }

// .section.active {
//   display: flex;
//   opacity: 1;
//   transform: translateY(0);
// }

// @media (max-width: 399px) {
//   .section {
//     width: 100%;
//     max-width: none;
//     padding: 8px;
//     max-height: calc(100vh - 180px);
//     overflow-y: auto;
//     scrollbar-width: thin;
//     scrollbar-color: #64748b #1e293b;
//   }

//   .section::-webkit-scrollbar {
//     width: 6px;
//   }

//   .homeDashboard {
//     padding: 0 8px;
//   }

//   .userDetails,
//   .divWallet,
//   .divQuick,
//   .divTransactions {
//     padding: 1rem;
//   }

//   .walletContent,
//   .withdrawContent,
//   .addMoneyContent {
//     padding: 12px;
//   }
// }

// @media (min-width: 400px) and (max-width: 767px) {
//   .section {
//     width: 100%;
//     max-width: 500px;
//     padding: 12px;
//   }

//   .homeDashboard {
//     padding: 0 12px;
//   }

//   .userDetails,
//   .divWallet,
//   .divQuick,
//   .divTransactions {
//     padding: 16px;
//   }

//   .walletContent,
//   .withdrawContent,
//   .addMoneyContent {
//     padding: 16px;
//   }
// }

// @media (min-width: 768px) {
//   .section {
//     width: 100%;
//     max-width: 600px;
//     padding: 16px;
//   }
// }

// .homeDashboard {
//   display: flex;
//   flex-direction: column;
//   gap: 16px;
//   padding: 0 16px;
//   /* background-color: var(--primary-immediate-component-bgcolor, #333333); */
// }

// /* New row wrapper for pairing cards */
// .row {
//   display: flex;
//   flex-direction: column;
//   gap: 16px;
//   align-items: stretch;
//   /* default – keep for mobile */
// }

// /* User details card – always column layout with improved typography */
// .userDetails {
//   display: flex;
//   flex-direction: column;
//   gap: 8px;
//   align-items: center;
//   justify-content: center;
//   padding: 20px;
//   background: linear-gradient(145deg, #334155, #475569);
//   border-radius: 12px;
//   color: #e2e8f0;
//   box-sizing: border-box;
//   text-align: center;
//   transition: transform 0.3s ease, box-shadow 0.3s ease;
// }

// .userName {
//   font-size: 1.5rem;
//   font-weight: 700;
//   color: #f59e0b;
// }

// .userEmail {
//   font-size: 1rem;
//   color: #e2e8f0;
// }

// .userPhone {
//   font-size: 1.2rem;
//   color: #3b82f6;
//   cursor: pointer;
// }

// .userPhone:hover {
//   color: #60a5fa;
// }

// /* Shared styles for all dashboard cards */
// .userDetails,
// .divWallet,
// .divQuick,
// .divTransactions {
//   background: linear-gradient(145deg, #334155, #475569);
//   padding: 20px;
//   border-radius: 12px;
//   color: #e2e8f0;
//   transition: transform 0.3s ease, box-shadow 0.3s ease;
//   position: relative;
//   overflow: hidden;
//   box-sizing: border-box;
// }

// .userDetails:hover,
// .divWallet:hover,
// .divQuick:hover,
// .divTransactions:hover {
//   transform: translateY(-4px);
//   box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
// }

// .divWallet {
//   cursor: pointer;
// }

// .divWallet h4,
// .divQuick h4,
// .divTransactions h4 {
//   text-align: center;
//   margin: 0 0 16px 0;
//   color: #ffffff;
//   font-size: 1.3rem;
//   font-weight: 700;
//   text-transform: uppercase;
//   letter-spacing: 0.8px;
// }

// .walletBalance {
//   text-align: center;
//   font-weight: 600;
//   font-size: 1.75rem;
//   background: linear-gradient(90deg, #2563eb, #3b82f6);
//   color: #f0f9ff;
//   border-radius: 10px;
//   padding: 20px;
//   margin-bottom: 20px;
//   transition: background 0.3s ease;
//   box-sizing: border-box;
// }

// .walletButtons {
//   display: flex;
//   flex-direction: row;
//   gap: 16px;
//   justify-content: space-between;
// }

// @media (max-width: 1023px) {
//   .walletButtons {
//     flex-wrap: wrap;
//   }
// }

// .actionBtn {
//   flex: 1;
//   padding: 14px 20px;
//   background: linear-gradient(90deg, #f59e0b, #fbbf24);
//   color: #1e293b;
//   border-radius: 10px;
//   font-weight: 600;
//   border: none;
//   cursor: pointer;
//   transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
//   text-transform: uppercase;
//   letter-spacing: 0.8px;
//   display: flex;
//   align-items: center;
//   justify-content: space-between;
//   gap: 10px;
//   box-sizing: border-box;
//   min-width: 0;
// }

// @media (max-width: 767px) {
//   .actionBtn {
//     flex: 1 1 45%;
//     margin-bottom: 8px;
//   }
// }

// .actionBtn:hover {
//   background: linear-gradient(90deg, #fbbf24, #fed7aa);
//   transform: translateY(-2px);
//   box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
// }

// .buttonIcon {
//   font-size: 1rem;
//   color: #1e293b;
// }

// .quickButtons {
//   display: flex;
//   flex-direction: row;
//   flex-wrap: wrap;
//   justify-content: space-between;
//   gap: 16px;
//   margin-bottom: 20px;
// }

// @media (max-width: 767px) {
//   .quickButtons {
//     flex-direction: column;
//     align-items: center;
//   }
// }

// .quickButtons .actionBtn {
//   flex: 1 1 45%;
//   min-width: 150px;
// }

// /* Latest Transactions List Styles */
// .transactionsList {
//   display: flex;
//   flex-direction: column;
//   gap: 12px;
//   margin-top: 8px;
// }

// .transactionItem {
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
//   padding: 12px;
//   background: rgba(51, 65, 85, 0.6);
//   border-radius: 10px;
//   cursor: pointer;
//   transition: background 0.2s ease;
// }

// .transactionItem:hover {
//   background: rgba(71, 85, 105, 0.8);
// }

// .itemLeft {
//   display: flex;
//   align-items: center;
//   gap: 16px;
// }

// .itemIcon {
//   width: 44px;
//   height: 44px;
//   border-radius: 10px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   font-size: 1.6rem;
//   flex-shrink: 0;
// }

// .itemIcon.netflixIcon {
//   background: rgba(239, 68, 68, 0.2);
//   color: #ef4444;
// }

// .itemIcon.saversIcon {
//   background: rgba(34, 197, 94, 0.2);
//   color: #22c55e;
// }

// .itemIcon.businessIcon {
//   background: rgba(251, 146, 60, 0.2);
//   color: #fb923c;
// }

// .itemInfo {
//   display: flex;
//   flex-direction: column;
//   gap: 4px;
// }

// .itemTitle {
//   font-weight: 600;
//   font-size: 1rem;
//   color: #e2e8f0;
// }

// .itemTime {
//   font-size: 0.85rem;
//   color: #94a3b8;
// }

// .itemAmount {
//   font-weight: 700;
//   font-size: 1.1rem;
// }

// .itemAmount.positive {
//   color: #22c55e;
// }

// .itemAmount.negative {
//   color: #ef4444;
// }

// .seeAll {
//   text-align: center;
//   color: #f59e0b;
//   font-weight: 600;
//   cursor: pointer;
//   margin-top: 12px;
//   font-size: 0.95rem;
//   transition: color 0.3s ease;
// }

// .seeAll:hover {
//   color: #fbbf24;
// }

// /* Large screen layout – fully use the 90% container width */
// @media (min-width: 1024px) {
//   .section {
//     max-width: none;
//     width: 100%;
//     padding: 32px;
//     margin: 0 auto;
//   }

//   .homeDashboard {
//     display: grid;
//     grid-template-columns: 1fr 1fr;
//     /* perfect equal columns */
//     gap: 16px;
//     /* small, consistent gap horizontally and vertically */
//     padding: 0;
//   }

//   /* Place widgets in grid */
//   .divWallet {
//     grid-column: 1;
//     grid-row: 1;
//   }

//   .userDetails {
//     /* Quick Send */
//     grid-column: 2;
//     grid-row: 1;
//   }

//   .divQuick {
//     grid-column: 1;
//     grid-row: 2;
//   }

//   .divGroups {
//     grid-column: 1;
//     grid-row: 3;
//   }

//   .divTransactions {
//     grid-column: 2;
//     grid-row: 2 / 4;
//     /* span rows 2-3 to align bottom with Groups */
//   }

//   /* Keep content-based height, no stretching needed */
//   .userDetails,
//   .divWallet,
//   .divQuick,
//   .divGroups,
//   .divTransactions {
//     justify-content: flex-start;
//     align-items: flex-start;
//   }
// }

// /* Remove old per-card centering on large screens */
// @media (max-width: 1023px) {

//   .userDetails,
//   .divWallet,
//   .divQuick,
//   .divTransactions {
//     width: 100%;
//     max-width: 100%;
//   }
// }

// /* Rest of your existing styles (unchanged) */
// .transactionTable {
//   width: 100%;
//   border-collapse: collapse;
//   background: #334155;
//   font-size: 0.95rem;
//   border-radius: 10px;
//   overflow: hidden;
// }

// .transactionTable th,
// .transactionTable td {
//   padding: 12px;
//   text-align: left;
//   border-bottom: 1px solid #475569;
//   white-space: nowrap;
//   overflow: hidden;
//   text-overflow: ellipsis;
// }

// .transactionTable th {
//   background: linear-gradient(90deg, #475569, #64748b);
//   font-weight: 600;
//   color: #e2e8f0;
// }

// .transactionTable td {
//   color: #d1d5db;
// }

// .seeMore {
//   text-align: center;
//   color: #f59e0b;
//   cursor: pointer;
//   font-weight: 600;
//   transition: color 0.3s ease;
// }

// .seeMore:hover {
//   color: #fbbf24;
//   text-decoration: none;
//   cursor: pointer;
// }

// .header {
//   width: 100%;
//   display: flex;
//   align-items: center;
//   position: relative;
//   margin-bottom: 16px;
// }

// .backIcon {
//   color: #f59e0b;
//   font-size: 1.75rem;
//   cursor: pointer;
//   transition: color 0.3s ease, transform 0.2s ease;
// }

// .backIcon:hover {
//   color: #fbbf24;
//   transform: scale(1.15);
// }

// .header h3 {
//   font-size: 1.5rem;
//   text-align: center;
//   color: #e2e8f0;
//   margin: 0 auto;
//   font-weight: 700;
// }

// .walletContent,
// .withdrawContent,
// .addMoneyContent {
//   width: 100%;
//   max-width: 500px;
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   justify-content: center;
//   gap: 16px;
//   padding: 20px;
//   max-height: 70vh;
//   overflow-y: auto;
//   box-sizing: border-box;
// }

// .agentWithdraw,
// .atmWithdraw,
// .addMoneyForm,
// .withdrawForm {
//   width: 100%;
//   display: flex;
//   flex-direction: column;
//   gap: 8px;
// }

// .mobileMoneyForm {
//   width: 100%;
//   display: flex;
//   flex-direction: column;
//   gap: 32px;
// }

// .recipient {
//   position: relative;
//   width: 100%;
// }

// .search,
// .email,
// .amount,
// .pin,
// .agentNo,
// .storeCode,
// .accountSelect,
// .withdrawSelect,
// .addMoneyBtn,
// .withdrawBtn,
// .sendBtn {
//   width: 100%;
//   max-width: 100%;
//   padding: 16px 14px;
//   border-radius: 10px;
//   background: #475569;
//   color: #e2e8f0;
//   border: none;
//   font-size: 1.1rem;
//   outline: none;
//   transition: box-shadow 0.3s ease, border-color 0.3s ease;
//   box-sizing: border-box;
// }

// .search {
//   padding-left: 48px;
// }

// .searchIcon {
//   position: absolute;
//   left: 16px;
//   top: 50%;
//   transform: translateY(-50%);
//   color: #5eead4;
//   font-size: 1.2rem;
// }

// .suggestions {
//   position: absolute;
//   top: 100%;
//   left: 0;
//   width: 100%;
//   background: #475569;
//   color: #e2e8f0;
//   border-radius: 10px;
//   box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
//   max-height: 220px;
//   overflow-y: auto;
//   z-index: 10;
//   list-style: none;
//   padding: 0;
//   margin: 8px 0 0 0;
//   scrollbar-width: thin;
//   scrollbar-color: #9ca3af #4b5563;
// }

// .suggestions::-webkit-scrollbar {
//   width: 2px;
// }

// .suggestions::-webkit-scrollbar-track {
//   background: #4b5563;
//   border-radius: 8px;
// }

// .suggestions::-webkit-scrollbar-thumb {
//   background: #9ca3af;
//   border-radius: 8px;
// }

// .suggestions::-webkit-scrollbar-thumb:hover {
//   background: #d1d5db;
// }

// .suggestions li {
//   padding: 14px;
//   cursor: pointer;
//   transition: background 0.2s ease;
// }

// .suggestions li:hover {
//   background: #64748b;
// }

// .email[readonly] {
//   background: #475569;
//   border: 1px solid #64748b;
//   border-radius: 20px;
//   padding: 12px 16px;
//   text-align: center;
//   font-weight: 500;
//   cursor: default;
// }

// .sendBtn,
// .withdrawBtn,
// .addMoneyBtn {
//   width: 100%;
//   max-width: 500px;
//   padding: 14px 20px;
//   background: linear-gradient(90deg, #f59e0b, #fbbf24);
//   color: #1e293b;
//   border-radius: 10px;
//   font-weight: 600;
//   border: none;
//   cursor: pointer;
//   transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
//   text-transform: uppercase;
//   display: flex;
//   align-items: center;
//   justify-content: space-between;
//   gap: 10px;
//   box-sizing: border-box;
// }

// .sendBtn:disabled,
// .withdrawBtn:disabled,
// .addMoneyBtn:disabled {
//   background: #64748b;
//   cursor: not-allowed;
//   transform: none;
//   box-shadow: none;
// }

// .sendBtn:hover:not(:disabled),
// .withdrawBtn:hover:not(:disabled),
// .addMoneyBtn:hover:not(:disabled) {
//   background: linear-gradient(90deg, #fbbf24, #fed7aa);
//   transform: translateY(-2px);
//   box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
// }

// input:focus,
// select:focus {
//   box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
//   border-color: #f59e0b;
// }

// input::placeholder {
//   color: #94a3b8;
// }

// input:disabled {
//   background: #334155;
//   cursor: not-allowed;
//   color: #94a3b8;
// }

// .errorWallet {
//   color: #ef4444;
//   font-size: 0.95rem;
//   text-align: center;
//   margin-top: 12px;
// }

// .optionsList {
//   width: 100%;
//   display: flex;
//   flex-direction: column;
//   gap: 16px;
// }

// .option {
//   display: flex;
//   align-items: center;
//   gap: 16px;
//   padding: 14px;
//   background: #475569;
//   border-radius: 10px;
//   cursor: pointer;
//   transition: background 0.3s ease, transform 0.2s ease;
//   box-sizing: border-box;
// }

// .option:hover {
//   background: #64748b;
//   transform: translateY(-2px);
// }

// .optionIcon {
//   font-size: 1.5rem;
//   color: #e2e8f0;
// }

// .optionText {
//   font-size: 1rem;
//   color: #e2e8f0;
//   font-weight: 500;
// }

// .transactionTile {
//   width: 100%;
//   background: #334155;
//   font-size: 0.95rem;
//   border-radius: 10px;
//   overflow: hidden;
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   box-sizing: border-box;
// }

// .tileHeader {
//   padding: 12px;
//   text-align: center;
//   background: linear-gradient(90deg, #475569, #64748b);
//   font-weight: 600;
//   color: #e2e8f0;
//   width: 100%;
// }

// .tileContent {
//   padding: 12px;
//   width: 100%;
//   display: none;
//   flex-direction: column;
//   align-items: center;
// }

// .transactionTile:hover .tileContent {
//   display: flex;
// }

// .tileMeta {
//   width: 100%;
//   display: flex;
//   justify-content: space-between;
//   margin-bottom: 8px;
// }

// .transactionDate {
//   color: rgb(2, 245, 2);
//   font-weight: 600;
//   font-size: 0.9rem;
// }

// .transactionAmount {
//   color: rgb(250, 3, 250);
//   font-weight: 600;
//   font-size: 0.9rem;
// }

// .tileDetails {
//   text-align: center;
//   color: white;
//   font-weight: 700;
//   font-size: 1.1rem;
//   margin-bottom: 8px;
// }

// .tileFooter {
//   width: 100%;
//   display: flex;
//   justify-content: space-between;
//   padding: 0 12px;
// }

// .transactionBalance {
//   color: rgb(203, 145, 232);
//   font-weight: 600;
//   font-size: 1rem;
// }

// .quickSendContainer {
//   width: 100%;
//   display: flex;
//   flex-direction: column;
//   gap: 18px;
//   padding: 0 4px;
//   /* small side padding to match card feel without overflow */
// }

// .quickSendTitle {
//   color: #f59e0b;
//   font-size: 1.3rem;
//   font-weight: 700;
//   text-transform: uppercase;
//   letter-spacing: 0.8px;
//   text-align: center;
//   margin: 0;
// }

// /* Recipient input – now flex layout to perfectly fit and prevent overflow */
// .quickRecipientWrapper {
//   display: flex;
//   align-items: center;
//   width: 100%;
//   background: #475569;
//   border-radius: 10px;
//   overflow: hidden;
//   margin-bottom: 20px;
//   /* safety */
// }
// .recipientField {
//   margin-bottom: 16px;
//   min-height: 56px;          /* same as your .search / .amount height */
//   display: flex;
//   align-items: center;
// }

// .prefix {
//   padding: 0 16px;
//   height: 100%;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   background: #475569;
//   color: #e2e8f0;
//   font-size: 1rem;
//   font-weight: 600;
//   white-space: nowrap;
//   flex-shrink: 0;
// }

// .quickRecipientInput {
//   flex: 1;
//   min-width: 0;
//   /* allows shrinking in flex */
//   padding: 16px;
//   background: transparent;
//   color: #e2e8f0;
//   border: none;
//   font-size: 1.1rem;
// }

// /* Country dropdown – full width, consistent */
// .quickCountrySelect {
//   width: auto;
//   min-width: 110px;
//   padding: 16px 12px;
//   border-radius: 10px;
//   background: #475569;
//   color: #05c1f5;
//   border: none;
//   font-size: 1.05rem;
//   box-sizing: border-box;
//   border-right: 1px solid #64748b;
// }

// .phoneInput {
//   /* new class for the number input */
//   flex: 1;
//   /* take all remaining space */
//   min-width: 0;
//   padding: 16px 20px;
//   background: transparent;
//   color: #e2e8f0;
//   border: none;
//   font-size: 1.1rem;
//   outline: none;
// }

// .phoneInput::placeholder {
//   color: #94a3b8;
// }

// .phoneInput:focus {
//   box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
// }

// /* Amounts row – equal width, no overflow */
// .quickAmounts {
//   display: flex;
//   gap: 16px;
//   width: 100%;
// }

// .amountGroup {
//   flex: 1;
//   display: flex;
//   align-items: center;
//   background: #475569;
//   border-radius: 10px;
//   padding: 0 16px;
//   overflow: hidden;
//   /* prevent long numbers from overflowing */
//   box-sizing: border-box;
// }

// .quickAmountInput {
//   flex: 1;
//   min-width: 0;
//   padding: 16px 8px;
//   background: transparent;
//   border: none;
//   color: #e2e8f0;
//   font-size: 1.4rem;
//   font-weight: 600;
//   text-align: center;
// }

// .quickAmountInput:focus {
//   outline: none;
// }

// .quickAmountInput[readOnly] {
//   opacity: 0.8;
// }

// .currencyLabel {
//   color: #94a3b8;
//   font-size: 1.1rem;
//   font-weight: 600;
//   flex-shrink: 0;
// }

// /* Focus styles to match other inputs in the app */
// .quickRecipientInput:focus,
// .quickCountrySelect:focus,
// .quickAmountInput:focus {
//   box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
// }

// /* Bottom left container – stacks Quick Actions + Groups on desktop */
// .bottomLeft {
//   flex: 1;
//   display: flex;
//   flex-direction: column;
//   gap: 40px;
// }

// /* Groups widget – same styling as other cards */
// .divGroups {
//   background: linear-gradient(145deg, #334155, #475569);
//   padding: 20px;
//   border-radius: 12px;
//   color: #e2e8f0;
//   transition: transform 0.3s ease, box-shadow 0.3s ease;
//   cursor: pointer;
// }

// .divGroups:hover {
//   transform: translateY(-4px);
//   box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
// }

// .divGroups h4 {
//   text-align: center;
//   margin: 0 0 16px 0;
//   color: #f59e0b;
//   font-size: 1.3rem;
//   font-weight: 700;
//   text-transform: uppercase;
//   letter-spacing: 0.8px;
// }

// /* Reuse transaction list styles for groups */
// .groupsList {
//   display: flex;
//   flex-direction: column;
//   gap: 12px;
//   margin-top: 8px;
// }

// .groupItem {
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
//   padding: 12px;
//   background: rgba(51, 65, 85, 0.6);
//   border-radius: 10px;
//   cursor: pointer;
//   transition: background 0.2s ease;
// }

// .groupItem:hover {
//   background: rgba(71, 85, 105, 0.8);
// }

// .arrowIcon {
//   color: #f59e0b;
//   font-size: 1.2rem;
//   margin-left: 8px;
// }

// .createGroup {
//   text-align: center;
//   color: #f59e0b;
//   font-weight: 600;
//   cursor: pointer;
//   margin-top: 16px;
//   font-size: 1.1rem;
//   transition: color 0.3s ease;
// }

// .createGroup:hover {
//   color: #fbbf24;
// }

// .walletBalanceContainer {
//   position: relative;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   background: linear-gradient(90deg, #46556d, #aaafba);
//   color: #f0f9ff;
//   border-radius: 10px;
//   padding: 10px 12px;
//   margin-bottom: 20px;
//   font-weight: 600;
//   font-size: 1.4rem;
//   min-height: 58px;
//   overflow: hidden;
//   box-sizing: border-box;
// }

// .balanceDisplay {
//   flex: 1;
//   text-align: center;
//   letter-spacing: 1.2px;
//   font-variant-numeric: tabular-nums;
//   /* better digit alignment */
//   transition: all 0.4s ease;
// }

// .balanceReveal,
// .balanceHidden {
//   display: inline-block;
// }

// /* ── Shown state ── */
// .balanceReveal {
//   opacity: 0;
//   transform: translateY(8px);
//   animation: revealBalance 0.7s forwards ease-out;
// }

// /* Character-by-character reveal feel */
// @keyframes revealBalance {
//   0% {
//     opacity: 0;
//     transform: translateY(12px) scale(0.96);
//     filter: blur(4px);
//   }

//   60% {
//     opacity: 1;
//     transform: translateY(0) scale(1.02);
//     filter: blur(0);
//   }

//   100% {
//     opacity: 1;
//     transform: translateY(0) scale(1);
//   }
// }

// /* ── Hidden state ── */
// .balanceHidden {
//   font-size: 1.1rem;;
//   letter-spacing: 1px;
// }

// .hidden .balanceHidden {
//   letter-spacing: 1px;
//   opacity: 0.4;
//   filter: blur(3px);
// }

// .eyeToggle {
//   background: none;
//   border: none;
//   color: white;
//   font-size: 1.5rem;
//   cursor: pointer;
//   padding: 8px 12px;
//   margin-left: 16px;
//   opacity: 0.85;
//   transition: all 0.2s ease;
// }

// .eyeToggle:hover {
//   opacity: 1;
//   transform: scale(1.2) rotate(8deg);
//   filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
// }

// .eyeIcon {
//   transition: transform 0.3s ease;
// }

// /* Optional: slight pulse when visible */
// .visible .eyeIcon {
//   animation: subtlePulse 2s infinite ease-in-out;
// }

// @keyframes subtlePulse {

//   0%,
//   100% {
//     opacity: 0.9;
//   }

//   50% {
//     opacity: 1;
//   }
// }

// .mobileNavBar {
//   display: flex;
//   justify-content: space-around;
//   background: #2d3748;
//   border-radius: 12px;
//   padding: 10px 8px;
//   margin: 12px 0;
//   box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
// }

// .navIconBtn {
//   background: none;
//   border: none;
//   color: #94a3b8;
//   font-size: 0.85rem;
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   gap: 4px;
//   padding: 8px 10px;
//   border-radius: 10px;
//   transition: all 0.2s ease;
//   flex: 1;
//   max-width: 85px;
// }

// .navIconBtn svg {
//   font-size: 1.4rem;
// }

// .navIconBtn.active,
// .navIconBtn:hover {
//   color: #fbbf24;
//   background: rgba(251, 191, 36, 0.15);
// }

// .dynamicBottomContent {
//   flex: 1;
//   min-height: 320px;
// }

// /*/////////////////////////////////////////////*/
// /* ============================================= */
// /*               MOBILE ONLY (< 1024px)         */
// /* ============================================= */
// @media (max-width: 1023px) {

//   /* Hide original card classes on mobile */
//   .userDetails,
//   .divQuick,
//   .divGroups,
//   .divTransactions {
//     display: none !important;
//   }

//   /* Ensure dynamic content is visible and takes space */
//   .dynamicBottomContent {
//     display: block !important;
//     min-height: 400px;
//   }

//   .homeDashboard {
//     display: flex !important;
//     flex-direction: column;
//     gap: 16px;
//   }

//   .walletButtons {
//     flex-wrap: wrap;
//     gap: 12px;
//     justify-content: center;
//   }

//   .actionBtn {
//     flex: 1 1 45%;
//     min-width: 140px;
//   }

//   /* Make nav bar more visible */
//   .mobileNavBar {
//     display: flex !important;
//     margin: 16px 0;
//   }
// }

// /* ============================================= */
// /*               DESKTOP ONLY (≥ 1024px)        */
// /* ============================================= */
// @media (min-width: 1024px) {

//   /* Hide mobile-only elements */
//   .mobileNavBar {
//     display: none !important;
//   }

//   .dynamicBottomContent {
//     display: none !important;
//   }

//   /* Force full grid layout */
//   .homeDashboard {
//     display: grid !important;
//     grid-template-columns: 1fr 1fr !important;
//     gap: 20px !important;
//     padding: 0 !important;
//   }

//   /* Explicitly restore and position EVERY original card */
//   .divWallet {
//     display: block !important;
//     grid-column: 1;
//     grid-row: 1;
//   }

//   .userDetails {
//     display: block !important;
//     grid-column: 2;
//     grid-row: 1;
//   }

//   .divQuick {
//     display: block !important;
//     grid-column: 1;
//     grid-row: 2;
//   }

//   .divGroups {
//     display: block !important;
//     grid-column: 1;
//     grid-row: 3;
//   }

//   .divTransactions {
//     display: block !important;
//     grid-column: 2;
//     grid-row: 2 / 4;
//   }
// }

// /* ────────────────────────────────────────────── */
// /* FIXES for mobile + desktop layout conflict     */
// /* Add this at the VERY END of Home.module.css    */
// /* ────────────────────────────────────────────── */

// /* 1. Mobile: make sure dynamic content is visible + has space */
// @media (max-width: 1023px) {
//   .dynamicBottomContent {
//     display: block !important;
//     min-height: 50vh;
//     /* ← forces height so you see something */
//     background: #2d3748;
//     /* ← temporary debug color – remove later */
//     border-radius: 12px;
//     padding: 16px;
//     box-sizing: border-box;
//   }

//   /* Ensure nav is always visible on mobile */
//   .mobileNavBar {
//     display: flex !important;
//   }
// }

// /* 2. Desktop: force ALL original cards to show + position correctly */
// @media (min-width: 1024px) {

//   /* Hide mobile stuff */
//   .mobileNavBar,
//   .dynamicBottomContent {
//     display: none !important;
//   }

//   /* Make sure ALL cards are visible */
//   .userDetails,
//   .divQuick,
//   .divGroups,
//   .divTransactions {
//     display: block !important;
//   }

//   /* Reinforce grid (your existing rule + !important for override) */
//   .homeDashboard {
//     display: grid !important;
//     grid-template-columns: 1fr 1fr !important;
//     gap: 16px !important;
//     padding: 0 !important;
//   }

//   .divWallet {
//     grid-column: 1;
//     grid-row: 1;
//   }

//   .userDetails {
//     grid-column: 2;
//     grid-row: 1;
//   }

//   .divQuick {
//     grid-column: 1;
//     grid-row: 2;
//   }

//   .divGroups {
//     grid-column: 1;
//     grid-row: 3;
//   }

//   .divTransactions {
//     grid-column: 2;
//     grid-row: 2 / 4;
//   }
// }

// /* ────────────────────────────────────────────── */
// /* FINAL OVERRIDES — replace the previous fix blocks with this */
// /* Place at the VERY END of Home.module.css       */
// /* ────────────────────────────────────────────── */

// /* Mobile: unhide cards ONLY when inside dynamic content + nice styling */
// @media (max-width: 1023px) {

//   /* Targeted unhide for dynamic content children */
//   .dynamicBottomContent .userDetails,
//   .dynamicBottomContent .divQuick,
//   .dynamicBottomContent .divGroups,
//   .dynamicBottomContent .divTransactions {
//     display: block !important;
//   }

//   .dynamicBottomContent {
//     display: block !important;
//     min-height: 60vh !important;
//     /* generous space */
//     background: #2d3748;
//     /* remove later if you don't like */
//     border-radius: 12px;
//     padding: 20px;
//     margin: 16px 0;
//     box-sizing: border-box;
//   }

//   .mobileNavBar {
//     display: flex !important;
//     margin: 20px 0 16px;
//   }
// }

// /* Desktop: stronger force-show + grid reinforcement */
// @media (min-width: 1024px) {

//   /* Hide mobile elements */
//   .mobileNavBar,
//   .dynamicBottomContent {
//     display: none !important;
//   }

//   /* Force ALL dashboard cards visible (override any !important hide) */
//   .userDetails,
//   .divQuick,
//   .divGroups,
//   .divTransactions,
//   .divWallet {
//     display: block !important;
//   }

//   /* Reinforce grid layout */
//   .homeDashboard {
//     display: grid !important;
//     grid-template-columns: 1fr 1fr !important;
//     gap: 24px !important;
//     padding: 0 !important;
//     width: 100% !important;
//     max-width: none !important;
//   }

//   /* Explicit grid positions with !important */
//   .divWallet {
//     grid-column: 1 !important;
//     grid-row: 1 !important;
//   }

//   .userDetails {
//     grid-column: 2 !important;
//     grid-row: 1 !important;
//   }

//   .divQuick {
//     grid-column: 1 !important;
//     grid-row: 2 !important;
//   }

//   .divGroups {
//     grid-column: 1 !important;
//     grid-row: 3 !important;
//   }

//   .divTransactions {
//     grid-column: 2 !important;
//     grid-row: 2 / 4 !important;
//   }
// }

// /* Hide desktop cards on mobile */
// @media (max-width: 1023px) {
//   .desktopCards {
//     display: none !important;
//   }
// }

// /* Hide mobile dynamic content on desktop */
// @media (min-width: 1024px) {
//   .dynamicBottomContent {
//     display: none !important;
//   }

//   .mobileNavBar {
//     display: none !important;
//   }
// }

// /* Make sure desktop cards are positioned correctly */
// @media (min-width: 1024px) {

//   /* Remove wrapper if you added .desktopCards – or don't use wrapper at all */
//   .desktopCards {
//     display: contents;
//     /* lets children participate directly in parent grid */
//   }

//   /* Force correct placement – these override anything else */
//   .divWallet {
//     grid-area: 1 / 1 / 2 / 2 !important;
//   }

//   .userDetails {
//     grid-area: 1 / 2 / 2 / 3 !important;
//   }

//   .divQuick {
//     grid-area: 2 / 1 / 3 / 2 !important;
//   }

//   .divGroups {
//     grid-area: 3 / 1 / 4 / 2 !important;
//   }

//   .divTransactions {
//     grid-area: 2 / 2 / 4 / 3 !important;
//   }

//   /* spans 3 rows */
// }

// .loadingItem,
// .errorItem {
//   padding: 14px;
//   color: #94a3b8;
//   font-style: italic;
// }

// .recipient {
//   position: relative;
//   width: 100%;
//   height: 56px;
//   /* fixed height prevents shifting */
// }

// .search {
//   width: 100%;
//   height: 56px;
//   padding: 0 70px 0 60px !important;
//   /* left: icon space, right: avatar space */
//   border-radius: 12px;
//   background: #475569;
//   color: #e2e8f0;
//   border: none;
//   font-size: 1.05rem;
//   box-sizing: border-box;
//   line-height: 56px;
// }

// .searchIcon {
//   position: absolute !important;
//   left: 20px !important;
//   top: 50% !important;
//   transform: translateY(-50%) !important;
//   color: #f59e0b !important;
//   font-size: 1.4rem !important;
//   pointer-events: none !important;
//   z-index: 5 !important;
//   /* below avatar */
// }

// .recipient:focus-within .searchIcon,
// .recipient:has(input:not(:placeholder-shown)) .searchIcon {
//   color: #fbbf24 !important;
//   filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.7));
// }

// .userAvatarWrapper {
//   position: absolute !important;
//   right: 10px !important;
//   top: 50% !important;
//   transform: translateY(-50%) !important;
//   width: 35px !important;
//   height: 35px !important;
//   border-radius: 50% !important;
//   overflow: hidden !important;
//   cursor: pointer !important;
//   background: #334155 !important;
//   /* dark background */
//   border: 2.5px solid #f59e0b !important;
//   /* gold border like before */
//   display: flex !important;
//   align-items: center !important;
//   justify-content: center !important;
//   box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
//   transition: all 0.25s ease !important;
//   z-index: 20 !important;
// }

// .userAvatarWrapper:hover {
//   transform: translateY(-50%) scale(1.1) !important;
//   box-shadow: 0 0 0 5px rgba(28, 25, 20, 0.35) !important;
//   background: #475569 !important;
// }

// .addUserIcon {
//   font-size: 1.2rem !important;
//   /* slightly bigger than before */
//   color: #f59e0b !important;
//   /* gold color to match theme */
//   transition: all 0.2s ease;
// }

// .userAvatarWrapper:hover .addUserIcon {
//   transform: scale(1.1);
//   color: #fbbf24 !important;
//   /* brighter on hover */
// }

// .userAvatarInSearch {
//   width: 100% !important;
//   height: 100% !important;
//   object-fit: cover !important;
//   border-radius: 50% !important;
//   display: block !important;
//   position: absolute !important;
//   inset: 0 !important;
//   z-index: 15 !important;
// }

// .userInitials {
//   position: absolute !important;
//   inset: 0 !important;
//   display: flex !important;
//   align-items: center !important;
//   justify-content: center !important;
//   background: linear-gradient(135deg, #f59e0b, #fbbf24) !important;
//   color: #1e293b !important;
//   font-weight: 900 !important;
//   font-size: 1.6rem !important;
//   border-radius: 50% !important;
//   z-index: 5 !important;
// }

// .recipientTypeTabs {
//   display: flex;
//   margin-bottom: 20px;
//   border-bottom: 1px solid #475569;
// }

// .fieldLabel {
//   color: #e2e8f0;
//   font-size: 1rem;
//   margin-bottom: 6px;
//   display: block;
//   font-weight: 500;
// }

// .fieldError {
//   color: #ef4444;
//   font-size: 0.85rem;
//   margin-top: 4px;
//   display: block;
// }

// .inputError {
//   border: 1px solid #ef4444 !important;
//   box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
// }

// .recipientTypeTabs {
//   display: flex;
//   margin-bottom: 24px;
//   border-bottom: 1px solid #475569;
//   gap: 8px;
//   /* small gap between tabs */
// }

// .tabButton {
//   flex: 1;
//   padding: 12px 8px;
//   background: none;
//   border: none;
//   color: #94a3b8;
//   font-weight: 600;
//   cursor: pointer;
//   transition: all 0.2s;
//   transition: color 0.25s ease;
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   gap: 4px;
// }

// .tabButton.active {
//   color: #f59e0b;
//   border-bottom: 3px solid #f59e0b;
// }

// .tabIconWrapper {
//   font-size: 1.4rem;
// }

// .tabButton span {
//   font-size: 0.95rem;
// }

// .tabIcon {
//   font-size: 1.5rem;
//   color: #e2e8f0;
//   transition: color 0.25s ease;
// }

// .tabButton:hover .tabIcon {
//   color: #fbbf24 !important;
// }

// .tabButton.activeTab .tabIcon {
//   color: #f59e0b !important;
// }

// .tabButton.activeTab {
//   color: #f59e0b;
//   border-bottom: 3px solid #f59e0b;
// }

// .tabButton:hover {
//   background: rgba(245, 158, 11, 0.08);
//   border-radius: 8px 8px 0 0;
//   color: #e2e8f0;
// }

// .tabButton:disabled {
//   color: #475569;
//   cursor: not-allowed;
// }
