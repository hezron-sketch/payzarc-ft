import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
  faEnvelope, faTv,
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
} from '@fortawesome/free-solid-svg-icons';
import YesNoPopup from '../../styles/YesNoPopup';
import styles from './Home.module.css';
import { countries } from '../../utility/countries';
//import { djangoAxios } from '../../utility/axiosInstance';
import { djangoApis } from '../../utility/axiosInstance';
import { API_URL } from '../../utility/constants';


function Option({ icon, text, onClick }) {
  return (
    <div className={styles.option} onClick={onClick}>
      <FontAwesomeIcon icon={icon} className={styles.optionIcon} />
      <span className={styles.optionText}>{text}</span>
    </div>
  );
}

function Home({ onPageChange, user }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [withdrawOption, setWithdrawOption] = useState('');
  const [emailSearchTerm, setEmailSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [agentNumber, setAgentNumber] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addSelectedAccount, setAddSelectedAccount] = useState('');
  const [errorWallet, setErrorWallet] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogAction, setDialogAction] = useState(null);
  const [selectedAddOption, setSelectedAddOption] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [showWithdrawOptions, setShowWithdrawOptions] = useState(false);
  const [sendMethod, setSendMethod] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [phoneSearchTerm, setPhoneSearchTerm] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [mobileMoneySelected, setMobileMoneySelected] = useState(false);
  const [mobileMoneyWithdrawSelected, setMobileMoneyWithdrawSelected] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [animateKey, setAnimateKey] = useState(0);
  const [bottomView, setBottomView] = useState('transactions');
  // ───────────────────────────────────────────────
  // States for real balance from Django
  // ───────────────────────────────────────────────
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState(null);

  //---------------------------------------------------
  const [quickRecipient, setQuickRecipient] = useState('');
  const [quickAmount, setQuickAmount] = useState('');


  //-----------------------------------------------------------
  // Add Recipient states
  const [recipientName, setRecipientName] = useState('');
  const [recipientLabel, setRecipientLabel] = useState('');
  const [recipientCountryCode, setRecipientCountryCode] = useState('+254'); // Default Kenya
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientType, setRecipientType] = useState('email'); // 'email' | 'phone'
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [labelError, setLabelError] = useState('');
  const [loading, setLoading] = useState(false);
  const [myPhone, setMyPhone] = useState(null);


  // Replace or add these lines near your other useState declarations

  const [recipientSearchTerm, setRecipientSearchTerm] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);   // { type: 'email'|'phone', value: string }

  const [favourites, setFavourites] = useState([]);          // list from API
  const [loadingFavourites, setLoadingFavourites] = useState(false);
  const [favouritesError, setFavouritesError] = useState(null);

  // PIN Verification for transactions
  const [pinVerificationError, setPinVerificationError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);    // Eye toggle
  const [notificationOnly, setNotificationOnly] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [showInputPin, setShowInputPin] = useState(false);


  //const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));
  // Sort countries by dial code numerically ascending
  const sortedCountries = [...countries].sort((a, b) => {
    const codeA = parseInt(a.code.slice(1)); // Remove '+' and convert to number
    const codeB = parseInt(b.code.slice(1));
    return codeA - codeB;
  });

  const [quickDestinationCountry, setQuickDestinationCountry] = useState(sortedCountries.find(c => c.name === 'Kenya') || sortedCountries[0]);

  // Mock exchange rates and currency codes (add more as needed)
  const exchangeRates = {
    'Kenya': { rate: 129.5, currency: 'KES' },
    'United States': { rate: 1, currency: 'USD' },
    'United Kingdom': { rate: 0.78, currency: 'GBP' },
    'Canada': { rate: 1.36, currency: 'CAD' },
    // Add more countries here if desired
  };

  // Get rate and currency for selected country (fallback to USD)
  const destInfo = exchangeRates[quickDestinationCountry.name] || { rate: 1, currency: 'USD' };
  const equivalentAmount = quickAmount ? (parseFloat(quickAmount) * destInfo.rate).toFixed(2) : '0.00';

  const emails = [
    'ahi.appoli@gmail.com',
    'ajoseph@payzarc.com',
    'amogezi@payzarc.com',
  ];
  const phonesByCountry = {
    '+1': ['8323302962', '8323302963'],
    '+254': ['711194068', '703133119'],
  };


  const emailFilteredEmails = emails.filter((email) =>
    email.toLowerCase().startsWith(emailSearchTerm.toLowerCase())
  );
  const filteredPhones = (phonesByCountry[selectedCountryCode] || []).filter((phone) =>
    phone.toLowerCase().startsWith(phoneSearchTerm.toLowerCase())
  );

  const toggleBalance = () => {
    setShowBalance(prev => !prev);
    setAnimateKey(prev => prev + 1); // forces remount / re-animation
  };

  // Helper to format balance safely
  const formattedBalance = balanceData
    ? Number(balanceData.balance).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    : '0.00';


  // Reset form fields when user changes
  useEffect(() => {
    setActiveSection('dashboard');
    setWithdrawOption('');
    setEmailSearchTerm('');
    setSelectedEmail('');
    setSendAmount('');
    setWithdrawAmount('');
    setAgentNumber('');
    setSelectedAccount('');
    setAddAmount('');
    setAddSelectedAccount('');
    setErrorWallet('');
    setOpenDialog(false);
    setDialogTitle('');
    setDialogMessage('');
    setDialogAction(null);
    setSelectedAddOption('');
    setShowAddInput(false);
    setShowWithdrawOptions(false);
    setSendMethod('');
    setSelectedCountryCode('');
    setPhoneSearchTerm('');
    setFullPhone('');
    setMobileMoneySelected(false);
    setMobileMoneyWithdrawSelected(false);
  }, [user]);


  useEffect(() => {
    const fetchMyContact = async () => {
      try {
        // const res = await djangoAxios.get('/api/my-contact/');
        const res = await djangoApis.system2.get('/api/my-contact/');
        if (res.data.success) {
          setMyPhone(res.data.phone);
        }
      } catch (e) { }
    };
    fetchMyContact();
  }, []);



  const handleSavePhoneRecipient = async () => {
    const fullPhone = recipientCountryCode + recipientPhone.replace(/^0+/, '');
    if (!fullPhone || fullPhone.length < 10) {
      alert('Please enter a valid phone number (at least 10 digits after country code)');
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
      const checkRes = await djangoApis.system2.post('/api/check/', {
        type: 'phone',
        value: fullPhone
      });
      alert(checkRes.data.message || 'Check complete');

      // Step 2: Save
      //const saveRes = await djangoAxios.post('/api/favorite/add/', {
      const saveRes = await djangoApis.system2.post('/api/favorite/add/', {
        favourite_type: 'phone',
        favourite_detail: fullPhone,
        label: recipientLabel.trim(),
      });

      if (saveRes.status === 201) {
        alert('Phone recipient added successfully!');
        handleAddRecipientBack();
      } else {
        alert(`Unexpected status: ${saveRes.status}`);
      }
    } catch (err) {
      console.error('SAVE PHONE ERROR:', err);  // ← see full details in browser console (F12)
      let errorMessage = 'Failed to save phone recipient';
      if (err.response?.data) {
        const data = err.response.data;
        // Try to extract the first useful error message
        if (typeof data === 'object' && data !== null) {
          // Common Django patterns
          if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
            errorMessage = data.non_field_errors[0];
          } else if (data.favourite_detail && Array.isArray(data.favourite_detail)) {
            errorMessage = data.favourite_detail[0];
          } else if (data.favourite_type && Array.isArray(data.favourite_type)) {
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
          errorMessage = String(data) || err.message || 'Server returned unknown error';
        }

        // Add status code for context
        errorMessage += ` (HTTP ${err.response.status})`;
      } else if (err.request) {
        errorMessage = 'No response from server – is Django running? Network issue?';
      } else {
        errorMessage = err.message || 'Unknown error';
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validateEmailField = () => {
    if (!recipientEmail) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    if (recipientEmail.length < 10 || recipientEmail.length > 30) {
      setEmailError('Email must be 10–30 characters');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validateLabel = () => {
    const trimmed = recipientLabel.trim();
    if (!trimmed) {
      setLabelError('Label is required');
      return false;
    }
    if (trimmed.length < 3 || trimmed.length > 15) {
      setLabelError('Label must be 3–15 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
      setLabelError('Only letters, numbers and spaces allowed');
      return false;
    }
    setLabelError('');
    return true;
  };

  const handleSaveEmailRecipient = async () => {
    if (!validateEmailField() || !validateLabel()) return;

    setLoading(true);

    try {
      // Step 1: Check
      //const checkRes = await djangoAxios.post('/api/check/', {
      const checkRes = await djangoApis.system2.post('/api/check/', {

        type: 'email',
        value: recipientEmail,   // ← consistent format
      });
      const { is_registered, message } = checkRes.data;
      alert(message || (is_registered ? 'Email already registered' : 'Email not registered'));

      // Step 2: Save
      //const saveRes = await djangoAxios.post('/api/favorite/add/', {
      const saveRes = await djangoApis.system2.post('/api/favorite/add/', {
        favourite_type: 'email',
        favourite_detail: recipientEmail,
        label: recipientLabel.trim(),
      });

      if (saveRes.status === 201) {
        alert('Recipient added successfully!');
        setRecipientEmail('');
        setRecipientLabel('');
        setEmailError('');
        setLabelError('');
        handleAddRecipientBack();
      } else {
        alert(`Unexpected status: ${saveRes.status}`);
      }
    } catch (err) {
      console.error('SAVE EMAIL ERROR:', err);

      let errorMessage = 'Failed to add email recipient';

      if (err.response?.data) {
        const data = err.response.data;

        if (typeof data === 'object' && data !== null) {
          if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
            errorMessage = data.non_field_errors[0];
          } else if (data.favourite_detail && Array.isArray(data.favourite_detail)) {
            errorMessage = data.favourite_detail[0];
          } else if (data.favourite_type && Array.isArray(data.favourite_type)) {
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
          errorMessage = String(data) || err.message || 'Server returned unknown error';
        }

        errorMessage += ` (HTTP ${err.response.status})`;
      } else if (err.request) {
        errorMessage = 'No response from server – check Django is running';
      } else {
        errorMessage = err.message || 'Unknown error';
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
      console.log('Sending request to /api/balance/');
      console.log('Token from localStorage:', localStorage.getItem('accessToken'));
      console.log('Full headers:', djangoApis.system1.defaults.headers);
      const response = await djangoApis.system1.get('/api/balance/');
      const data = response.data;
      if (data.success !== undefined) {
        setBalanceData(data);
      } else {
        setBalanceError(data.error || 'Failed to load balance');
      }
    } catch (err) {
      console.error('Balance fetch failed:', err);
      if (err.response?.status === 404) {
        setBalanceError('No wallet found for this account.');
      } else {
        setBalanceError('Could not load wallet balance');
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

  const fetchFavourites = async (searchQuery = '') => {
    if (!searchQuery.trim()) {
      setFavourites([]);
      return;
    }

    setLoadingFavourites(true);
    setFavouritesError(null);

    try {
      // Decide type based on input pattern
      let favType = 'phone';
      if (
        /^[a-zA-Z]/.test(searchQuery) ||           // starts with letter
        searchQuery.includes('@')                   // contains @
      ) {
        favType = 'email';
      } else if (
        searchQuery.startsWith('+') ||
        /^\d/.test(searchQuery)                     // starts with digit
      ) {
        favType = 'phone';
      } else {
        // unclear → skip fetch or default to phone
        setFavourites([]);
        setLoadingFavourites(false);
        return;
      }

      const response = await djangoApis.system2.get('/api/favorites/', {
        params: {
          type: favType,
          query: searchQuery,
        },
      });

      if (response.data.success) {
        setFavourites(response.data.favourites || []);
      } else {
        setFavouritesError(response.data.message || 'Failed to load favourites');
        setFavourites([]);
      }
    } catch (err) {
      console.error('Favourites fetch error:', err);
      setFavouritesError('Could not load favourite contacts');
      setFavourites([]);
    } finally {
      setLoadingFavourites(false);
    }
  };


  //------------///////////////////////////////////////
  const handleAddRecipientBack = () => {
    setActiveSection('dashboard');
    // Clear form
    setRecipientName('');
    setRecipientLabel('');
    setRecipientCountryCode('+254');
    setRecipientPhone('');
  };

  const handleSaveRecipient = () => {
    if (!recipientName.trim() || !recipientPhone.trim() || recipientPhone.length < 9) {
      alert('Please enter a valid name and phone number');
      return;
    }
    const fullPhone = recipientCountryCode + recipientPhone;

    // Placeholder save (you can later connect to backend or localStorage array)
    alert(`Recipient saved!\nName: ${recipientName}\nPhone: ${fullPhone}\nLabel: ${recipientLabel || 'None'}`);

    // Clear and go back
    handleAddRecipientBack();
  };


  // ───────────────────────────────────────────────
  // Your existing handlers (unchanged)
  // ───────────────────────────────────────────────
  const handleQuickSend = () => {
    const amount = parseFloat(quickAmount);
    if (!quickRecipient.trim() || isNaN(amount) || amount <= 0) {
      alert('Please enter a valid recipient and amount');
      return;
    }
    openConfirmationDialog(
      'Confirm Quick Send',
      `Send ${amount.toFixed(2)} USD (${equivalentAmount} ${destInfo.currency}) to ${quickRecipient} in ${quickDestinationCountry.name}?`,
      () => alert('Quick Send processed! (Connect to backend API here)')
    );
  };

  const handleEmailSearchChange = (e) => {
    setErrorWallet('');
    setEmailSearchTerm(e.target.value);
    setSendAmount('');
    setSelectedEmail('');
  };

  const handleWithdrawOption = (option) => {
    if (option === 'mobileMoney') {
      setMobileMoneyWithdrawSelected(true);
    } else {
      setWithdrawOption(option);
      setMobileMoneyWithdrawSelected(false);
      setShowWithdrawOptions(false);
      setWithdrawAmount('');
      setAgentNumber('');
      setSelectedAccount('');
      setSelectedCountryCode('');
      setPhoneSearchTerm('');
      setFullPhone('');
    }
  };

  const handleMobileMoneyWithdrawOptionSelect = (option) => {
    setWithdrawOption(option);
    setMobileMoneyWithdrawSelected(false);
    setShowWithdrawOptions(false);
    setWithdrawAmount('');
    setAgentNumber('');
    setSelectedAccount('');
    setSelectedCountryCode('');
    setPhoneSearchTerm('');
    setFullPhone('');
  };

  const handleEmailSelect = (email) => {
    setSelectedEmail(email);
    setEmailSearchTerm('');
  };

  const handleAddOptionSelect = (option) => {
    if (option === 'mobileMoney') {
      setMobileMoneySelected(true);
    } else {
      setSelectedAddOption(option);
      setShowAddInput(true);
      setMobileMoneySelected(false);
      setAgentNumber('');
      setAddAmount('');
      setAddSelectedAccount('');
    }
  };

  const handleMobileMoneyOptionSelect = (option) => {
    setSelectedAddOption(option);
    setShowAddInput(true);
    setMobileMoneySelected(false);
    setAgentNumber('');
    setAddAmount('');
    setAddSelectedAccount('');
  };

  const handleAddMoneyBack = () => {
    if (showAddInput && (selectedAddOption === 'mpesa' || selectedAddOption === 'airtel')) {
      setShowAddInput(false);
      setSelectedAddOption('');
      setAddAmount('');
      setAddSelectedAccount('');
      setAgentNumber('');
      setSelectedCountryCode('');
      setPhoneSearchTerm('');
      setFullPhone('');
      setMobileMoneySelected(true);
    } else if (showAddInput) {
      setShowAddInput(false);
      setSelectedAddOption('');
      setAddAmount('');
      setAddSelectedAccount('');
      setAgentNumber('');
      setMobileMoneySelected(false);
    } else if (mobileMoneySelected) {
      setMobileMoneySelected(false);
    } else {
      setActiveSection('dashboard');
    }
  };

  const handleWithdrawBack = () => {
    if (withdrawOption && (withdrawOption === 'safiricom' || withdrawOption === 'airtel')) {
      setWithdrawOption('');
      setMobileMoneyWithdrawSelected(true);
      setShowWithdrawOptions(false);
      setWithdrawAmount('');
      setAgentNumber('');
      setSelectedAccount('');
      setSelectedCountryCode('');
      setPhoneSearchTerm('');
      setFullPhone('');
    } else if (withdrawOption) {
      setWithdrawOption('');
      setShowWithdrawOptions(true);
      setWithdrawAmount('');
      setAgentNumber('');
      setSelectedAccount('');
      setSelectedCountryCode('');
      setPhoneSearchTerm('');
      setFullPhone('');
    } else if (mobileMoneyWithdrawSelected) {
      setMobileMoneyWithdrawSelected(false);
      setShowWithdrawOptions(true);
    } else {
      setActiveSection('dashboard');
      setShowWithdrawOptions(false);
    }
  };

  const handleSendBack = () => {
    setRecipientSearchTerm('');
    setSelectedRecipient(null);
    setSendAmount('');
    setErrorWallet('');
    setActiveSection('dashboard');
  };

  const openConfirmationDialog = (title, message, action) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogAction(() => action);
    setOpenDialog(true);
  };

  const handleDialogConfirm = (typedValue, buttonChoice) => {
    setOpenDialog(false);

    const isConfirmed = typedValue === '1' && buttonChoice === 'yes';

    if (isConfirmed && dialogAction) {
      dialogAction(inputPin); // ✅ PASS PIN HERE
    } else {
      alert('Transaction cancelled');
      clearFields();
    }
  };

  const handleDialogCancel = () => {
    setOpenDialog(false);
    setNotificationOnly(false); // 👈 reset
    if (!notificationOnly) {
      showNotification('error', 'Transaction cancelled');
      // alert('Transaction cancelled');
    }

    clearFields();
  };


  const clearFields = () => {
    setErrorWallet('');
    setEmailSearchTerm('');
    setSendAmount('');
    setSelectedEmail('');
    setPhoneSearchTerm('');
    setFullPhone('');
    setSelectedCountryCode('');
  };

  const isValidAmount = (amount) => {
    return amount && !isNaN(parseInt(amount)) && parseInt(amount) >= 1 && parseInt(amount) <= 500000;
  };

  const isValidRecipient = (value) => {
    if (!value) return false;
    // very basic check – improve later with real validation
    return value.length >= 6 && value.length <= 60;
  };

  const isSendButtonDisabled = () => {
    if (sendMethod === 'email') {
      return !isValidAmount(sendAmount) || !isValidRecipient(selectedEmail);
    } else if (sendMethod === 'phone') {
      return !isValidAmount(sendAmount) || !isValidRecipient(fullPhone);
    }
    return true;
  };

  const isAddMoneyButtonDisabled = () => {
    if (selectedAddOption === 'bank') {
      return !isValidAmount(addAmount) || !addSelectedAccount;
    } else if (selectedAddOption === 'payzarc') {
      return !isValidAmount(addAmount) || !agentNumber;
    } else if (selectedAddOption === 'mpesa' || selectedAddOption === 'airtel') {
      return !isValidAmount(addAmount) || !isValidRecipient(fullPhone);
    }
    return !isValidAmount(addAmount);
  };

  const isWithdrawButtonDisabled = () => {
    if (withdrawOption === 'atm') {
      return !isValidAmount(withdrawAmount) || !selectedAccount;
    } else if (withdrawOption === 'safiricom' || withdrawOption === 'airtel') {
      return !isValidAmount(withdrawAmount) || !isValidRecipient(fullPhone);
    } else if (withdrawOption === 'payzarcAgent') {
      return !isValidAmount(withdrawAmount) || !agentNumber;
    }
    return true;
  };

  // ==================== SEND MONEY ====================
  // const handleSendMoney = async () => {
  //   if (!selectedRecipient || !isValidAmount(sendAmount) || inputPin.length !== 4) {
  //     setErrorWallet('Enter recipient, valid amount and 4-digit PIN');
  //     return;
  //   }
  //   const recipient = selectedRecipient.value;
  //   openConfirmationDialog(
  //     'Confirm Send Money',
  //     `Please confirm:\n\nSending ${sendAmount} to ${recipient}\n\nEnter:\n1 → Yes\n2 → No`,
  //     // (inputPin) => async () => {    
  //     async (inputPin) => {
  //       try {
  //         // const response = await djangoApis.system1.post('/api/send-money/', {
  //         //   recipient: recipient,
  //         //   amount: parseFloat(sendAmount),
  //         //   recipient_type: selectedRecipient.type,
  //         //   pin: inputPin

  //         // if (recipient.startsWith("+254")) {
  //         //   recipient = recipient.replace("+254", "0");
  //         // }

  //         console.log('Sending money with:', inputPin, recipient, sendAmount);
  //         const response = await djangoApis.system1.post('/api/send-money/', {
  //           recipient_number: recipient,
  //           amount: parseFloat(sendAmount),
  //           transaction_pin: inputPin
  //         });
  //         if (response.data.success) {
  //           //alert('Money sent successfully!');
  //           showNotification('success', 'Money sent successfully!');
  //           fetchBalance();
  //           setRecipientSearchTerm('');
  //           setSelectedRecipient(null);
  //           setSendAmount('');
  //           setErrorWallet('');
  //           setInputPin('');
  //         } else {
  //           // alert(response.data.message || 'Send failed');
  //           // showNotification('error', 'Failed to send money.');
  //           showNotification('error', response.data.message || 'Failed to send money.');
  //         }
  //       } catch (err) {
  //         console.error('Send error:', err);
  //         // alert('Error sending money: ' +(err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error'));
  //         const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
  //         showNotification('error', `Error sending money: ${errorMsg}`);
  //         //alert(`Error sending money: ${errorMsg}`);
  //       }
  //     }
  //   );
  // };

  const handleSendMoney = async () => {
    const token = localStorage.getItem('accessToken');

    const pho=selectedRecipient.value;//.replace("+254", "0"); 
    try {
      console.log('Attempting to send money to: '+pho, 'Amount: ',sendAmount, 'Pin: ',inputPin, 'Token: ', token);
        const response = await axios.post('http://localhost:8001/api/send-money/', {
        recipient_number: pho,
        amount: parseFloat(sendAmount),
        transaction_pin: inputPin
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(response.data.message);
      // Refresh balance after success
      showNotification('success', 'Money sent successfully!');
      fetchBalance();
      setRecipientSearchTerm('');
      setSelectedRecipient(null);
      setSendAmount('');
      setErrorWallet('');
      setInputPin('');

    } catch (error) {
      alert(error.response?.data?.error || "Transfer failed");
    }
  };

  const showNotification = (type, message) => {
    setDialogTitle(type === 'success' ? 'Success' : 'Error');
    setDialogMessage(message);
    setNotificationOnly(true);
    setOpenDialog(true);
  };

  // ==================== PAYZARC AGENT WITHDRAW ====================
  const handlePayzarcAgentWithdraw = async () => {
    if (!agentNumber || !isValidAmount(withdrawAmount) || inputPin.length !== 4) {
      alert('Please enter a valid agent number, amount and pin');
      return;
    }
    openConfirmationDialog(
      'Confirm Payzarc Agent Withdrawal',
      `Are you sure you want to withdraw ${withdrawAmount} via Payzarc Agent ${agentNumber}?\n\nType 1 and click Yes to confirm.`,
      //(enteredPin) => async () => {
      async (inputPin) => {
        try {
          const response = await djangoApis.system1.post('/api/withdraw/', {
            // method: 'payzarc_agent',
            agent_number: agentNumber.trim(),
            amount: parseFloat(withdrawAmount),
            pin: inputPin
          });

          if (response.data.success) {
            // alert('Withdrawal request submitted successfully!');
            showNotification('success', 'Withdrawal request submitted successfully!');
            fetchBalance();
            setWithdrawAmount('');
            setAgentNumber('');
            setActiveSection('dashboard');
            setInputPin('');
          } else {
            // alert(response.data.message || 'Withdrawal failed');
            showNotification('error', 'Failed to submit withdrawal request.');
          }
        } catch (err) {
          console.error('Withdrawal error:', err);
          alert('Error processing withdrawal: ' +
            (err.response?.data?.message ||
              err.response?.data?.error ||
              err.message || 'Unknown error'));
        }
      }
    );
  };

  // ==================== GENERAL WITHDRAW (for other types) ====================
  const handleWithdraw = () => {
    if (withdrawOption === 'payzarcAgent' && !agentNumber) {
      handlePayzarcAgentWithdraw();
      return;
    }

    if (
      !withdrawAmount ||
      (withdrawOption === 'safiricom' && !isValidRecipient(fullPhone)) ||
      (withdrawOption === 'airtel' && !isValidRecipient(fullPhone)) ||
      (withdrawOption === 'atm' && !selectedAccount)
    ) {
      alert('Please fill in all required fields');
      return;
    }

    openConfirmationDialog(
      'Confirm Withdrawal',
      `Are you withdrawing money worth ${withdrawAmount} via ${withdrawOption}?\nYes or 1 to confirm,\nNo or 2 to cancel.`,
      //(enteredPin) => async () => {
      async (enteredPin) => {
        // TODO: Replace alert with real API call when backend is ready
        alert(`Withdrawal of ${withdrawAmount} via ${withdrawOption} with PIN ${enteredPin} — Backend call goes here`);
        fetchBalance();
      }
    );
  };


  const handleAddMoney = () => {
    if (
      !addAmount ||
      (selectedAddOption === 'bank' && !addSelectedAccount) ||
      (selectedAddOption === 'payzarc' && !agentNumber) ||
      ((selectedAddOption === 'mpesa' || selectedAddOption === 'airtel') && !isValidRecipient(fullPhone))
    ) {
      alert('Please fill in all required fields');
      return;
    }
    openConfirmationDialog(
      'Confirm Add Money',
      `Are you adding ${addAmount} from ${selectedAddOption}${selectedAddOption === 'bank'
        ? ` account ${addSelectedAccount}`
        : selectedAddOption === 'payzarc'
          ? ` agent ${agentNumber}`
          : ` phone ${fullPhone}`
      }?\nYes or 1 to confirm,\nNo or 2 to cancel.`,
      () => alert('Connecting to backend API')
    );
  };

  const getWithdrawTitle = () => {
    switch (withdrawOption) {
      case 'atm':
        return 'ATM Withdrawal';
      case 'safiricom':
        return 'Safaricom Withdrawal';
      case 'airtel':
        return 'Airtel Withdrawal';
      case 'payzarcAgent':
        return 'Payzarc Agent Withdrawal';
      default:
        return mobileMoneyWithdrawSelected ? 'Mobile Money' : 'Withdraw Money';
    }
  };

  const getAddMoneyTitle = () => {
    switch (selectedAddOption) {
      case 'bank':
        return 'Bank Deposit';
      case 'mpesa':
        return 'Mpesa Deposit';
      case 'airtel':
        return 'Airtel Deposit';
      case 'payzarc':
        return 'Payzarc Deposit';
      default:
        return mobileMoneySelected ? 'Mobile Money' : 'Add Money';
    }
  };

  const getSendMoneyTitle = () => {
    switch (sendMethod) {
      case 'email':
        return 'Send Money via Email';
      case 'phone':
        return 'Send Money via Phone';
      default:
        return 'Send Money';
    }
  };

  return (
    <div className={`${styles.section} ${styles.active}`}>

      {activeSection === 'dashboard' && (
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
                      {balanceData?.currency || 'USD'} {formattedBalance}
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
                onClick={() => setActiveSection('addMoney')}
              >
                Add Money <FontAwesomeIcon icon={faPlus} className={styles.buttonIcon} />
              </button>

              <button
                className={styles.actionBtn}
                onClick={() => {
                  setActiveSection('withdraw');
                  setShowWithdrawOptions(true);
                }}
              >
                Withdraw <FontAwesomeIcon icon={faMinus} className={styles.buttonIcon} />
              </button>

              <button
                className={styles.actionBtn}
                onClick={() => setActiveSection('addRecipient')}
              >
                Add Recipient <FontAwesomeIcon icon={faUserPlus} className={styles.buttonIcon} />
              </button>
            </div>
          </div>

          {/* Mobile navigation – visible only on small screens */}
          <div className={styles.mobileNavBar}>
            <button
              className={`${styles.navIconBtn} ${bottomView === 'transactions' ? styles.active : ''}`}
              onClick={() => setBottomView('transactions')}
            >
              <FontAwesomeIcon icon={faHome} />
              <span>Home</span>
            </button>

            <button
              className={`${styles.navIconBtn} ${bottomView === 'quickSend' ? styles.active : ''}`}
              onClick={() => setBottomView('quickSend')}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              <span>Quick Send</span>
            </button>

            <button
              className={`${styles.navIconBtn} ${bottomView === 'chamas' ? styles.active : ''}`}
              onClick={() => setBottomView('chamas')}
            >
              <FontAwesomeIcon icon={faUsers} />
              <span>Chamas</span>
            </button>

            <button
              className={`${styles.navIconBtn} ${bottomView === 'quickActions' ? styles.active : ''}`}
              onClick={() => setBottomView('quickActions')}
            >
              <FontAwesomeIcon icon={faBolt} />
              <span>Actions</span>
            </button>
          </div>

          {/* ────────────────────────────────────────────── */}
          {/* MOBILE LAYOUT: dynamic switching content       */}
          {/* ────────────────────────────────────────────── */}
          <div className={styles.dynamicBottomContent}>
            {bottomView === 'transactions' && (
              <div className={styles.divTransactions}>
                <h4>Latest Transactions</h4>
                <div className={styles.transactionsList}>
                  <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
                    <div className={styles.itemLeft}>
                      <div className={`${styles.itemIcon} ${styles.netflixIcon}`}>
                        <FontAwesomeIcon icon={faTv} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>DsTV</div>
                        <div className={styles.itemTime}>Today · 09:32 AM</div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.negative}`}>- USD 142.99</div>
                  </div>

                  <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
                    <div className={styles.itemLeft}>
                      <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
                        <FontAwesomeIcon icon={faGlobe} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>Payzarc Club Contribution</div>
                        <div className={styles.itemTime}>Yesterday · 4:18 PM</div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 2,400</div>
                  </div>

                  <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
                    <div className={styles.itemLeft}>
                      <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
                        <FontAwesomeIcon icon={faHandshake} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>Dubai Partners</div>
                        <div className={styles.itemTime}>Today · 9:41 AM</div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.negative}`}>- KES 10,000</div>
                  </div>
                </div>

                <p className={styles.seeAll} onClick={() => onPageChange('history')}>
                  See all
                </p>
              </div>
            )}

            {bottomView === 'quickSend' && (
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
                      const selected = sortedCountries.find((c) => c.name === e.target.value);
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
                      <span className={styles.currencyLabel}>{destInfo.currency}</span>
                    </div>
                  </div>

                  <button className={styles.actionBtn} onClick={handleQuickSend}>
                    Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
                  </button>
                </div>
              </div>
            )}

            {bottomView === 'chamas' && (
              <div className={styles.divGroups}>
                <h4>CHAMAS & GROUPS</h4>
                <div className={styles.groupsList}>
                  <div className={styles.groupItem} onClick={() => onPageChange('groups')}>
                    <div className={styles.itemLeft}>
                      <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
                        <FontAwesomeIcon icon={faUsers} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>Savers Club</div>
                        <div className={styles.itemTime}>12 Members</div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 62,500</div>
                    <FontAwesomeIcon icon={faChevronRight} className={styles.arrowIcon} />
                  </div>

                  <div className={styles.groupItem} onClick={() => onPageChange('groups')}>
                    <div className={styles.itemLeft}>
                      <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
                        <FontAwesomeIcon icon={faBriefcase} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitle}>Business Partners</div>
                        <div className={styles.itemTime}>8 Members</div>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 150,000</div>
                    <FontAwesomeIcon icon={faChevronRight} className={styles.arrowIcon} />
                  </div>
                </div>

                <p className={styles.createGroup} onClick={() => onPageChange('groups')}>
                  + Create or Send to Group
                </p>
              </div>
            )}

            {bottomView === 'quickActions' && (
              <div className={styles.divQuick}>
                <h4>Quick Actions</h4>
                <div className={styles.quickButtons}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => {
                      setActiveSection('withdraw');
                      setShowWithdrawOptions(true);
                    }}
                  >
                    Withdraw Money <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
                  </button>

                  <button
                    className={styles.actionBtn}
                    onClick={() => setActiveSection('wallet')}
                  >
                    Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
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
                  const selected = sortedCountries.find((c) => c.name === e.target.value);
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
                  <span className={styles.currencyLabel}>{destInfo.currency}</span>
                </div>
              </div>

              <button className={styles.actionBtn} onClick={handleQuickSend}>
                Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
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
                  setActiveSection('withdraw');
                  setShowWithdrawOptions(true);
                }}
              >
                Withdraw Money <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
              </button>

              <button
                className={styles.actionBtn}
                onClick={() => setActiveSection('wallet')}
              >
                Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
              </button>
            </div>
          </div>

          {/* Chamas & Groups – bottom left, row 3 */}
          <div className={styles.divGroups}>
            <h4>CHAMAS & GROUPS</h4>
            <div className={styles.groupsList}>
              <div className={styles.groupItem} onClick={() => onPageChange('groups')}>
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>Savers Club</div>
                    <div className={styles.itemTime}>12 Members</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 62,500</div>
                <FontAwesomeIcon icon={faChevronRight} className={styles.arrowIcon} />
              </div>

              <div className={styles.groupItem} onClick={() => onPageChange('groups')}>
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
                    <FontAwesomeIcon icon={faBriefcase} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>Business Partners</div>
                    <div className={styles.itemTime}>8 Members</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 150,000</div>
                <FontAwesomeIcon icon={faChevronRight} className={styles.arrowIcon} />
              </div>
            </div>

            <p className={styles.createGroup} onClick={() => onPageChange('groups')}>
              + Create or Send to Group
            </p>
          </div>

          {/* Latest Transactions – right column, spans rows 2–4 */}
          <div className={styles.divTransactions}>
            <h4>Latest Transactions</h4>
            <div className={styles.transactionsList}>
              <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.netflixIcon}`}>
                    <FontAwesomeIcon icon={faTv} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>DsTV</div>
                    <div className={styles.itemTime}>Today · 09:32 AM</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.negative}`}>- USD 142.99</div>
              </div>

              <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.saversIcon}`}>
                    <FontAwesomeIcon icon={faGlobe} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>Payzarc Club Contribution</div>
                    <div className={styles.itemTime}>Yesterday · 4:18 PM</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.positive}`}>+ KES 2,400</div>
              </div>

              <div className={styles.transactionItem} onClick={() => onPageChange('history')}>
                <div className={styles.itemLeft}>
                  <div className={`${styles.itemIcon} ${styles.businessIcon}`}>
                    <FontAwesomeIcon icon={faHandshake} />
                  </div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>Dubai Partners</div>
                    <div className={styles.itemTime}>Today · 9:41 AM</div>
                  </div>
                </div>
                <div className={`${styles.itemAmount} ${styles.negative}`}>- KES 10,000</div>
              </div>
            </div>

            <p className={styles.seeAll} onClick={() => onPageChange('history')}>
              See all
            </p>
          </div>
        </div>
      )}


      {activeSection === 'wallet' && (
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
            <div className={styles.recipient} style={{ position: 'relative' }}>
              <input
                type="text"
                className={styles.search}
                placeholder="Enter recipient email or phone no..."
                value={recipientSearchTerm}
                onChange={(e) => {
                  const value = e.target.value.trim();  // Trim whitespace for clean queries
                  setRecipientSearchTerm(value);        // Keep your existing state update
                  setSelectedRecipient(null);           // Reset any previous selection (as before)

                  if (value) {
                    fetchFavourites(value);             // Call the API with the typed value
                  } else {
                    setFavourites([]);                  // Clear suggestions if not phone-like
                  }
                }}
              />
              <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
              {/*///////////////////////////////////////////////////////////////////////////////*/}
              <div
                className={styles.userAvatarWrapper}
                title="Add recipient"
                onClick={() => setActiveSection('addRecipient')}
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
                    <li className={styles.loadingItem}>Loading favourites...</li>
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
                            type: fav.detail.includes('@') ? 'email' : 'phone',
                            value: fav.detail
                          });
                          setRecipientSearchTerm('');
                          setFavourites([]);
                        }}
                      >
                        {fav.detail}
                        <small>
                          ({fav.label || 'no label'} · {fav.detail.includes('@') ? 'email' : 'phone'})
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
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    margin: '0 0 6px 2px',
                    fontWeight: '500',
                    display: 'block',
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
            <div style={{ position: 'relative', marginTop: '10px' }}>
              <input
                type={showInputPin ? "text" : "password"}
                maxLength="4"
                className={styles.amount}
                placeholder="Enter PIN"
                value={inputPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setInputPin(val);
                }}
              />

              <button
                type="button"
                onClick={() => setShowInputPin(!showInputPin)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer'
                }}
              >
                {showInputPin ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Send button */}
            <button
              className={styles.sendBtn}
              onClick={handleSendMoney}
              disabled={!selectedRecipient || !sendAmount || !isValidAmount(sendAmount) || inputPin.length !== 4}
            >
              Send Money <FontAwesomeIcon icon={faPaperPlane} className={styles.buttonIcon} />
            </button>
          </div>
        </div>
      )}




      {activeSection === 'addMoney' && (
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
              <Option icon={faUniversity} text="Bank" onClick={() => handleAddOptionSelect('bank')} />
              <Option icon={faMobileAlt} text="Mobile Money" onClick={() => handleAddOptionSelect('mobileMoney')} />
              <Option icon={faMoneyBillWave} text="Payzarc" onClick={() => handleAddOptionSelect('payzarc')} />
            </div>
          ) : mobileMoneySelected ? (
            <div className={styles.optionsList}>
              <Option icon={faMobileAlt} text="Mpesa" onClick={() => handleMobileMoneyOptionSelect('mpesa')} />
              <Option icon={faCreditCard} text="Airtel" onClick={() => handleMobileMoneyOptionSelect('airtel')} />
            </div>
          ) : (
            <div className={styles.addMoneyForm}>
              {selectedAddOption === 'bank' && (
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
              {selectedAddOption === 'payzarc' && (
                <input
                  type="text"
                  className={styles.agentNo}
                  placeholder="Agent Number"
                  value={agentNumber}
                  onChange={(e) => setAgentNumber(e.target.value)}
                />
              )}
              {(selectedAddOption === 'mpesa' || selectedAddOption === 'airtel') && (
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
                    <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
                    {phoneSearchTerm && selectedCountryCode && (
                      <ul className={styles.suggestions}>
                        {filteredPhones.map((phone) => (
                          <li
                            key={phone}
                            onClick={() => {
                              setFullPhone(`${selectedCountryCode}${phone}`);
                              setPhoneSearchTerm('');
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
              {selectedAddOption !== 'mpesa' && selectedAddOption !== 'airtel' && (
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
                Add Money <FontAwesomeIcon icon={faPlus} className={styles.buttonIcon} />
              </button>
            </div>
          )}
        </div>
      )}
      {activeSection === 'withdraw' && (
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
              <Option icon={faUniversity} text="ATM" onClick={() => handleWithdrawOption('atm')} />
              <Option icon={faMobileAlt} text="Mobile Money" onClick={() => handleWithdrawOption('mobileMoney')} />
              <Option icon={faMoneyBillWave} text="Payzarc Agent" onClick={() => handleWithdrawOption('payzarcAgent')} />
            </div>
          ) : mobileMoneyWithdrawSelected ? (
            <div className={styles.optionsList}>
              <Option icon={faMobileAlt} text="Safaricom" onClick={() => handleMobileMoneyWithdrawOptionSelect('safiricom')} />
              <Option icon={faCreditCard} text="Airtel" onClick={() => handleMobileMoneyWithdrawOptionSelect('airtel')} />
            </div>
          ) : (
            <div className={styles.withdrawForm}>
              {withdrawOption === 'atm' && (
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
                    Withdraw <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
                  </button>
                </div>
              )}
              {(withdrawOption === 'safiricom' || withdrawOption === 'airtel') && (
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
                    <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
                    {phoneSearchTerm && selectedCountryCode && (
                      <ul className={styles.suggestions}>
                        {filteredPhones.map((phone) => (
                          <li
                            key={phone}
                            onClick={() => {
                              setFullPhone(`${selectedCountryCode}${phone}`);
                              setPhoneSearchTerm('');
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
                    Withdraw <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
                  </button>
                </div>
              )}
              {withdrawOption === 'payzarcAgent' && (
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
                  <div style={{ position: 'relative', marginTop: '10px' }}>
                    <input
                      type={showInputPin ? "text" : "password"}
                      maxLength="4"
                      className={styles.amount}
                      placeholder="Enter PIN"
                      value={inputPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setInputPin(val);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowInputPin(!showInputPin)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {showInputPin ? '🙈' : '👁️'}
                    </button>
                  </div>

                  <button
                    className={styles.withdrawBtn}
                    onClick={handleWithdraw}           // This now calls the new logic
                    disabled={!agentNumber || !isValidAmount(withdrawAmount) || inputPin.length !== 4}
                  >
                    Withdraw via Agent <FontAwesomeIcon icon={faMoneyBillWave} className={styles.buttonIcon} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeSection === 'addRecipient' && (
        <div className={styles.addMoneyContent}>
          <div className={styles.header}>
            <FontAwesomeIcon icon={faArrowLeft} className={styles.backIcon} onClick={handleAddRecipientBack} />
            <h3>Add Recipient</h3>
          </div>

          <div className={styles.recipientTypeTabs}>
            <button
              className={`${styles.tabButton} ${recipientType === 'email' ? styles.activeTab : ''}`}
              onClick={() => setRecipientType('email')}
            >
              <div className={styles.tabIconWrapper}>
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className={styles.tabIcon}           // ← new class
                />
              </div>
              <span>Email</span>
            </button>

            <button
              className={`${styles.tabButton} ${recipientType === 'phone' ? styles.activeTab : ''}`}
              onClick={() => setRecipientType('phone')}
            >
              <div className={styles.tabIconWrapper}>
                <FontAwesomeIcon
                  icon={faMobileAlt}
                  className={styles.tabIcon}           // ← new class
                />
              </div>
              <span>Phone</span>
            </button>
          </div>

          <div className={styles.addMoneyForm}>
            {recipientType === 'email' && (
              <>
                <label className={styles.fieldLabel}>Recipient Email</label>
                <input
                  type="email"
                  className={`${styles.amount} ${styles.recipientField} ${emailError ? styles.inputError : ''}`}
                  placeholder="friend@example.com"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value.trim().toLowerCase());
                    setEmailError('');
                  }}
                />
                <label className={styles.fieldLabel}>Label (Nickname)</label>
                <input
                  type="text"
                  className={`${styles.amount} ${labelError ? styles.inputError : ''}`}
                  placeholder="Friend, Business..."
                  value={recipientLabel}
                  onChange={(e) => {
                    setRecipientLabel(e.target.value);
                    setLabelError('');
                  }}
                />
                <button className={styles.addMoneyBtn} onClick={handleSaveEmailRecipient} disabled={loading || !recipientEmail || !recipientLabel}>
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </>
            )}

            {recipientType === 'phone' && (
              <>
                <label className={styles.fieldLabel}>Phone Number</label>
                <div className={`${styles.quickRecipientWrapper} ${styles.recipientField}`}>
                  <select
                    className={styles.quickCountrySelect}
                    value={recipientCountryCode}
                    onChange={(e) => setRecipientCountryCode(e.target.value)}
                  >
                    {sortedCountries.map(c => (
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
                    onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  />
                </div>
                <label className={styles.fieldLabel}>Label (Nickname)</label>
                <input
                  type="text"
                  className={`${styles.amount} ${labelError ? styles.inputError : ''}`}
                  placeholder="Friend, Business..."
                  value={recipientLabel}
                  onChange={(e) => {
                    setRecipientLabel(e.target.value);
                    setLabelError('');
                  }}
                />
                <button className={styles.addMoneyBtn} onClick={handleSavePhoneRecipient} disabled={loading || !recipientPhone || !recipientLabel}>
                  {loading ? 'Saving...' : 'Save & Continue'}
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
        onSubmit={notificationOnly ? () => { } : handleDialogConfirm}
        title={dialogTitle}
        message={dialogMessage}
        type={dialogTitle === 'Error' ? 'error' : 'warning'}
        isNotification={notificationOnly}
      />

    </div>
  );
}

export default Home;
