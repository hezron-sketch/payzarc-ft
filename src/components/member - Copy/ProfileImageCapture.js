import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../../utility/axiosInstance';
import styles from './ProfileImageCapture.module.css';

function ProfileImageCapture({ user, onRefreshUser, onBack }) {
  const [cameraError, setCameraError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setCameraError('');
    } catch (err) {
      setCameraError('Camera access denied. Please allow permission and refresh.');
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/png');
    setCapturedImage(imageData);
    stopCamera();
  };

  const uploadImage = async () => {
    if (!capturedImage) return;
    setUploading(true);
    try {
      const blob = await fetch(capturedImage).then(r => r.blob());
      const file = new File([blob], "profile.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("image", file);
      const response = await axiosInstance.post('/api/upload-profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        onRefreshUser();
        alert('Profile image updated successfully!');
        onBack();
      }
    } catch (err) {
      alert('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Update Profile Image</h2>

        <div className={styles.cameraWrapper}>
          {!capturedImage ? (
            <>
              {cameraError ? (
                <div className={styles.errorMessage}>
                  <p>{cameraError}</p>
                  <button onClick={startCamera} className={styles.retryButton}>
                    Retry Camera
                  </button>
                </div>
              ) : (
                <div className={styles.videoContainer}>
                  <video ref={videoRef} autoPlay playsInline muted className={styles.video} />
                  <div className={styles.faceGuide}>
                    <svg viewBox="0 0 350 460" className={styles.guideSvg}>
                      {/* Soft outer glow */}
                      <ellipse cx="175" cy="230" rx="175" ry="230" fill="none" stroke="#ecc94b" strokeWidth="25" strokeOpacity="0.2" />
                      {/* Medium inner glow */}
                      <ellipse cx="175" cy="230" rx="165" ry="215" fill="none" stroke="#ecc94b" strokeWidth="15" strokeOpacity="0.4" />
                      {/* Crisp main dashed oval */}
                      <ellipse cx="175" cy="230" rx="155" ry="205" fill="none" stroke="#ecc94b" strokeWidth="7" strokeDasharray="16,12" />
                    </svg>
                    <p className={styles.guideText}>Position your face inside the oval</p>
                  </div>
                </div>
              )}

              <button
                onClick={captureImage}
                disabled={!isCameraActive || !!cameraError}
                className={styles.captureButton}
              >
                Capture Photo
              </button>
            </>
          ) : (
            <>
              <img src={capturedImage} alt="Captured" className={styles.preview} />
              <div className={styles.actionButtons}>
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    startCamera();
                  }}
                  className={styles.retakeButton}
                >
                  Retake Photo
                </button>
                <button
                  onClick={uploadImage}
                  disabled={uploading}
                  className={styles.updateButton}
                >
                  {uploading ? 'Uploading...' : 'Update Profile'}
                </button>
              </div>
            </>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <button onClick={onBack} className={styles.backButton}>
          ← Back to Profile
        </button>
      </div>
    </div>
  );
}

export default ProfileImageCapture;