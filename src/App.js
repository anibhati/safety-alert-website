import React, { useState, useRef } from "react";

const ALERT_COLORS = {
  critical: { bg: "#cc0000", text: "white", emoji: "🚨" },
  warning:  { bg: "#cc6600", text: "white", emoji: "⚠️" },
  safe:     { bg: "#1a1a2e", text: "white", emoji: "✅" }
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
      setError("Microphone access denied. Please allow mic access.");
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
  const colors = ALERT_COLORS[alertLevel] || ALERT_COLORS.safe;
  const displayLabel = result?.label ? result.label.replace(/_/g, " ").toUpperCase() : "";

  return (
    <div style={{
      minHeight: "100vh",
      background: flash ? "#ff0000" : colors.bg,
      color: colors.text,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif",
      transition: "background 0.2s",
      padding: "20px",
      textAlign: "center"
    }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "10px" }}>🦻 SafetyAlert</h1>
      <p style={{ opacity: 0.8, marginBottom: "40px" }}>
        Sound detection for the deaf community
      </p>

      <div style={{
        background: "rgba(255,255,255,0.15)",
        borderRadius: "20px",
        padding: "30px",
        marginBottom: "30px",
        width: "100%",
        maxWidth: "400px",
        minHeight: "160px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {result ? (
          <>
            <div style={{ fontSize: "4rem" }}>{colors.emoji}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "bold", margin: "10px 0" }}>
              {displayLabel}
            </div>
            <div style={{ fontSize: "1rem", opacity: 0.9, marginBottom: "10px" }}>
              {result.message}
            </div>
            <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>
              Confidence: {result.confidence}%
            </div>
          </>
        ) : isListening ? (
          <>
            <div style={{ fontSize: "4rem" }}>👂</div>
            <div>Listening...</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "4rem" }}>🎤</div>
            <div style={{ opacity: 0.7 }}>Press start to begin monitoring</div>
          </>
        )}
      </div>

      <button
        onClick={isListening ? stopListening : startListening}
        style={{
          background: isListening ? "#ff4444" : "#00cc66",
          color: "white",
          border: "none",
          borderRadius: "50px",
          padding: "20px 50px",
          fontSize: "1.2rem",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
        }}
      >
        {isListening ? "⏹ Stop" : "▶ Start Listening"}
      </button>

      {error && (
        <p style={{ color: "#ff8888", marginTop: "20px" }}>{error}</p>
      )}

      <p style={{ opacity: 0.4, marginTop: "40px", fontSize: "0.8rem" }}>
        Analyzes audio every 3 seconds
      </p>
    </div>
  );
}
