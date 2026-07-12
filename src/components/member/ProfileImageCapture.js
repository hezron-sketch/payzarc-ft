import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import axiosInstance from '../../utility/axiosInstance';
import { cn } from '@/lib/utils';

// Restyled to match the rest of the dashboard (rounded-xl, active:scale
// press feedback, translucent white/[0.0X] surfaces, gold shadow accents)
// instead of the older rounded-md/hover-lift look these predate.
const uniformBtnClass =
  "w-full max-w-[300px] p-3.5 rounded-xl font-bold text-[1.1rem] transition-all duration-200 cursor-pointer active:scale-[0.97]";
const goldBtnClass = cn(
  uniformBtnClass,
  "bg-gold text-black enabled:hover:bg-gold-dark shadow-lg shadow-gold/10 enabled:hover:shadow-gold/20 disabled:bg-white/[0.06] disabled:text-muted-foreground disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100",
);
const outlineLiftBtnClass = cn(
  uniformBtnClass,
  "bg-white/[0.03] text-foreground border border-white/[0.08] hover:bg-white/[0.06] hover:border-gold/20",
);
const outlineBtnClass = cn(
  uniformBtnClass,
  "bg-white/[0.03] text-foreground border border-white/[0.08] hover:bg-white/[0.06] hover:border-gold/20 mt-4",
);

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
    <div className="flex justify-center items-center p-4 box-border">
      {/* ponytail: the face-guide oval's pulse isn't among the globally
          registered animate-* utilities, so it's kept as a tiny scoped
          @keyframes here rather than touching tailwind.config.js. */}
      <style>{`
        @keyframes profileGuidePulse {
          0% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 0.7; transform: scale(1); }
        }
      `}</style>
      <div className="bg-card rounded-2xl shadow-2xl shadow-black/20 w-full max-w-[420px] py-8 px-6 max-[480px]:px-4 max-[480px]:py-6 flex flex-col items-center gap-6">
        <h2 className="text-[1.6rem] max-[480px]:text-[1.4rem] font-semibold text-gold text-center m-0">
          Update Profile Image
        </h2>

        <div className="w-full flex flex-col items-center gap-[1.2rem]">
          {!capturedImage ? (
            <>
              {cameraError ? (
                <div className="text-destructive text-base text-center p-4 bg-destructive/10 border border-destructive/20 rounded-xl max-w-[300px]">
                  <p>{cameraError}</p>
                  <button onClick={startCamera} className={outlineLiftBtnClass}>
                    Retry Camera
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-[380px] max-[480px]:max-w-[340px] rounded-xl overflow-hidden ring-1 ring-white/[0.06]">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto block" />
                  <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                    <svg
                      viewBox="0 0 350 460"
                      className="w-[350px] h-[460px] max-[480px]:w-[300px] max-[480px]:h-[400px]"
                      style={{ animation: 'profileGuidePulse 3s infinite ease-in-out' }}
                    >
                      {/* Soft outer glow */}
                      <ellipse cx="175" cy="230" rx="175" ry="230" fill="none" stroke="#ecc94b" strokeWidth="25" strokeOpacity="0.2" />
                      {/* Medium inner glow */}
                      <ellipse cx="175" cy="230" rx="165" ry="215" fill="none" stroke="#ecc94b" strokeWidth="15" strokeOpacity="0.4" />
                      {/* Crisp main dashed oval */}
                      <ellipse cx="175" cy="230" rx="155" ry="205" fill="none" stroke="#ecc94b" strokeWidth="7" strokeDasharray="16,12" />
                    </svg>
                    <p className="text-gold text-[1.1rem] max-[480px]:text-base font-medium mt-[15px] text-center [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]">
                      Position your face inside the oval
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={captureImage}
                disabled={!isCameraActive || !!cameraError}
                className={goldBtnClass}
              >
                Capture Photo
              </button>
            </>
          ) : (
            <>
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full max-w-[380px] max-[480px]:max-w-[340px] h-auto rounded-xl ring-2 ring-gold/30"
              />
              <div className="flex flex-col gap-4 w-full max-w-[300px]">
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    startCamera();
                  }}
                  className={outlineLiftBtnClass}
                >
                  Retake Photo
                </button>
                <button
                  onClick={uploadImage}
                  disabled={uploading}
                  className={goldBtnClass}
                >
                  {uploading ? 'Uploading...' : 'Update Profile'}
                </button>
              </div>
            </>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <button
          onClick={onBack}
          className={cn(outlineBtnClass, "flex items-center justify-center gap-2")}
        >
          <ArrowLeft size={18} /> Back to Profile
        </button>
      </div>
    </div>
  );
}

export default ProfileImageCapture;
