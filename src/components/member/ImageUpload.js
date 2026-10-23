import React, { useState, useRef, useEffect } from 'react';
import styles from './ImageUpload.module.css';

function ImageUpload({ onBack }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    if (isCameraActive) {
      if (!videoRef.current) {
        setError('Video element not available. Please try again.');
      }
    }
  }, [isCameraActive]);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access is not supported in this browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });

      setIsCameraActive(true);
      setTimeout(() => {
        if (!videoRef.current) {
          setError('Video element not found after stream acquisition. Please try again.');
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(err => {
            setError('Failed to start video playback: ' + err.message);
            console.error('Video playback error:', err);
          });
        };
      }, 100);
    } catch (err) {
      setError('Failed to access camera: ' + err.message);
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      }
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvasRef.current.toDataURL('image/png');
      setSelectedImage(imageData);
      stopCamera();
    } else {
      setError('Cannot capture image: Video or canvas element missing');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      setError('Please select or capture an image');
      return;
    }
    try {
      // Not wired to a real upload endpoint yet.
      onBack();
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
      console.error('Submit error:', err);
    }
  };

  return (
    <div className={styles.imageUploadContainer}>
      <h2>Update Profile Image</h2>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.imagePreview}>
        {selectedImage ? (
          <img src={selectedImage} alt="Preview" className={styles.previewImage} />
        ) : (
          <p>No image selected</p>
        )}
      </div>

      <div className={styles.cameraContainer}>
        <video
          ref={videoRef}
          autoPlay
          className={styles.video}
          style={{ display: isCameraActive ? 'block' : 'none' }}
        ></video>
        {isCameraActive ? (
          <>
            <button onClick={captureImage} className={styles.captureButton}>Capture Image</button>
            <button onClick={stopCamera} className={styles.stopButton}>Stop Camera</button>
          </>
        ) : (
          <button onClick={startCamera} className={styles.startButton}>Use Camera</button>
        )}
      </div>

      <div className={styles.uploadContainer}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className={styles.fileInput}
        />
      </div>

      <div className={styles.actionButtons}>
        <button onClick={handleSubmit} className={styles.submitButton}>Save Image</button>
        <button onClick={onBack} className={styles.cancelButton}>Cancel</button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
}

export default ImageUpload;