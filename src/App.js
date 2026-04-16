import React, { useState, useRef } from "react";

const ALERT_STYLES = {
  critical: {
    bg: "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)",
    accent: "#ff0844",
    emoji: "🚨",
    glow: "0 0 60px rgba(255, 8, 68, 0.6)"
  },
  warning: {
    bg: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    accent: "#f6a365",
    emoji: "⚠️",
    glow: "0 0 60px rgba(246, 163, 101, 0.5)"
  },
  safe: {
    bg: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    accent: "#14b8a6",
    emoji: "✓",
    glow: "0 0 60px rgba(20, 184, 166, 0.3)"
  }
};

export default function App() {
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const API_URL = "https://bhatiani007-safetyalertapp.hf.space";

  const sendAudio = async (blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "audio.wav");
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data && data.label) {
        setResult(data);
        if (data.is_danger) {
          setFlash(true);
          if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
          setTimeout(() => setFlash(false), 1000);
        }
      }
    } catch (err) {
      console.error("API error:", err);
    }
  };

  const startListening = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsListening(true);

      const record = () => {
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/wav" });
          sendAudio(blob);
        };
        recorder.start();
        setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, 3000);
      };

      record();
      intervalRef.current = setInterval(record, 3500);
    } catch (err) {
      setError("Microphone access denied. Please allow mic access in your browser settings.");
    }
  };

  const stopListening = () => {
    clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsListening(false);
    setResult(null);
  };

  const alertLevel = result?.alert_level || "safe";
  const styles = ALERT_STYLES[alertLevel] || ALERT_STYLES.safe;
  const displayLabel = result?.label ? result.label.replace(/_/g, " ") : "";

  return (
    <div style={{
      minHeight: "100vh",
      background: flash ? "#ff0844" : styles.bg,
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: "background 0.5s ease",
      padding: "20px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "10%",
        width: "300px",
        height: "300px",
        background: styles.accent,
        borderRadius: "50%",
        filter: "blur(100px)",
        opacity: 0.15,
        animation: "float 8s ease-in-out infinite"
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "10%",
        width: "250px",
        height: "250px",
        background: styles.accent,
        borderRadius: "50%",
        filter: "blur(100px)",
        opacity: 0.1,
        animation: "float 10s ease-in-out infinite reverse"
      }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        position: "absolute",
        top: "40px",
        zIndex: 10,
        animation: "fadeIn 0.8s ease"
      }}>
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: 800,
          margin: 0,
          letterSpacing: "-0.02em",
          background: `linear-gradient(135deg, ${styles.accent} 0%, #ffffff 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          SafetyAlert
        </h1>
        <p style={{
          opacity: 0.7,
          margin: "8px 0 0 0",
          fontSize: "0.95rem",
          letterSpacing: "0.05em",
          fontWeight: 300
        }}>
          Real-time sound detection for the deaf community
        </p>
      </div>

      {/* Main card */}
      <div style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "32px",
        padding: "60px 40px",
        marginBottom: "40px",
        width: "100%",
        maxWidth: "480px",
        minHeight: "300px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: styles.glow,
        transition: "all 0.5s ease",
        animation: "fadeIn 0.8s ease",
        position: "relative",
        zIndex: 5
      }}>
        {result ? (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{
              fontSize: "5rem",
              marginBottom: "20px",
              animation: result.is_danger ? "pulse 1s ease infinite" : "none"
            }}>
              {styles.emoji}
            </div>
            <div style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              marginBottom: "12px",
              textTransform: "capitalize",
              letterSpacing: "-0.01em"
            }}>
              {displayLabel}
            </div>
            <div style={{
              fontSize: "1.05rem",
              opacity: 0.85,
              marginBottom: "20px",
              fontWeight: 300,
              lineHeight: 1.5
            }}>
              {result.message}
            </div>
            <div style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.1)",
              padding: "8px 20px",
              borderRadius: "100px",
              fontSize: "0.85rem",
              fontWeight: 500,
              letterSpacing: "0.05em"
            }}>
              {result.confidence}% confidence
            </div>
          </div>
        ) : isListening ? (
          <div style={{ position: "relative" }}>
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${styles.accent}44 0%, transparent 70%)`,
              position: "absolute",
              top: "-30px",
              left: "50%",
              transform: "translateX(-50%)",
              animation: "ripple 2s ease-out infinite"
            }} />
            <div style={{
              fontSize: "4rem",
              animation: "pulse 1.5s ease infinite"
            }}>
              🎧
            </div>
            <div style={{
              marginTop: "20px",
              fontSize: "1.1rem",
              fontWeight: 500,
              opacity: 0.9
            }}>
              Listening...
            </div>
            <div style={{
              marginTop: "8px",
              fontSize: "0.85rem",
              opacity: 0.6
            }}>
              Analyzing environment in real-time
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🎤</div>
            <div style={{
              fontSize: "1.15rem",
              fontWeight: 500,
              opacity: 0.9,
              marginBottom: "8px"
            }}>
              Ready to protect
            </div>
            <div style={{
              fontSize: "0.9rem",
              opacity: 0.6,
              fontWeight: 300
            }}>
              Press start to begin monitoring your surroundings
            </div>
          </div>
        )}
      </div>

      {/* Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        style={{
          background: isListening
            ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            : `linear-gradient(135deg, ${styles.accent} 0%, #0d9488 100%)`,
          color: "white",
          border: "none",
          borderRadius: "100px",
          padding: "18px 48px",
          fontSize: "1.05rem",
          fontWeight: 600,
          letterSpacing: "0.03em",
          cursor: "pointer",
          boxShadow: isListening
            ? "0 10px 40px rgba(239, 68, 68, 0.4)"
            : `0 10px 40px ${styles.accent}66`,
          transition: "all 0.3s ease",
          zIndex: 5
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
      >
        {isListening ? "■  Stop Monitoring" : "▶  Start Listening"}
      </button>

      {error && (
        <div style={{
          marginTop: "24px",
          padding: "12px 24px",
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "12px",
          color: "#fca5a5",
          fontSize: "0.9rem",
          maxWidth: "400px"
        }}>
          {error}
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: "30px",
        display: "flex",
        alignItems: "center",
        gap: "24px",
        fontSize: "0.8rem",
        opacity: 0.5,
        fontWeight: 300,
        zIndex: 5
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{
            width: "6px",
            height: "6px",
            background: "#14b8a6",
            borderRadius: "50%",
            animation: isListening ? "pulse 1s ease infinite" : "none"
          }} />
          {isListening ? "Active" : "Inactive"}
        </div>
        <div>Powered by Machine Learning</div>
        <div>Analyzes every 3s</div>
      </div>
    </div>
  );
}
