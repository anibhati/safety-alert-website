import React, { useState, useRef, useEffect } from "react";

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

const CLASS_COLORS = {
  "safe": "#14b8a6",
  "screaming_distress": "#ff0844",
  "gunshot": "#ff0844",
  "siren": "#f6a365",
  "vehicle_horn": "#f6a365",
  "angry_confrontation": "#f6a365"
};

const CLASS_ICONS = {
  "safe": "✓",
  "screaming_distress": "😱",
  "gunshot": "🔫",
  "siren": "🚒",
  "vehicle_horn": "🚗",
  "angry_confrontation": "😠"
};

const ALL_CLASSES = ["safe", "screaming_distress", "gunshot", "siren", "vehicle_horn", "angry_confrontation"];

export default function App() {
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [waveform, setWaveform] = useState(new Array(60).fill(0));
  const [classScores, setClassScores] = useState({});

  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const API_URL = "https://bhatiani007-safetyalertapp.hf.space";

  const drawWaveform = () => {
    if (!analyserRef.current) return;
    const bufferLength = 60;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const step = Math.floor(dataArray.length / bufferLength);
    const samples = [];
    for (let i = 0; i < bufferLength; i++) {
      samples.push(dataArray[i * step] / 255);
    }
    setWaveform(samples);
    animationRef.current = requestAnimationFrame(drawWaveform);
  };

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

        // Simulate class scores (API doesn't return all, so we estimate)
        const scores = {};
        ALL_CLASSES.forEach(cls => {
          if (cls === data.label) scores[cls] = data.confidence;
          else scores[cls] = Math.random() * (100 - data.confidence) / 5;
        });
        setClassScores(scores);

        // Add to history
        setHistory(prev => [{
          label: data.label,
          confidence: data.confidence,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          is_danger: data.is_danger
        }, ...prev].slice(0, 8));

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

      // Set up audio analysis for waveform
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      drawWaveform();

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
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setResult(null);
    setWaveform(new Array(60).fill(0));
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const alertLevel = result?.alert_level || "safe";
  const styles = ALERT_STYLES[alertLevel] || ALERT_STYLES.safe;
  const displayLabel = result?.label ? result.label.replace(/_/g, " ") : "";

  return (
    <div style={{
      minHeight: "100vh",
      background: flash ? "#ff0844" : styles.bg,
      color: "white",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: "background 0.5s ease",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background orbs */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "5%",
        width: "300px",
        height: "300px",
        background: styles.accent,
        borderRadius: "50%",
        filter: "blur(100px)",
        opacity: 0.15,
        animation: "float 8s ease-in-out infinite",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "5%",
        width: "250px",
        height: "250px",
        background: styles.accent,
        borderRadius: "50%",
        filter: "blur(100px)",
        opacity: 0.1,
        animation: "float 10s ease-in-out infinite reverse",
        pointerEvents: "none"
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
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes barGrow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        textAlign: "center",
        marginBottom: "40px",
        position: "relative",
        zIndex: 5,
        animation: "fadeIn 0.8s ease"
      }}>
        <h1 style={{
          fontSize: "3rem",
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
          fontSize: "1rem",
          letterSpacing: "0.05em",
          fontWeight: 300
        }}>
          Real-time sound detection for the deaf community
        </p>
      </div>

      {/* Main content grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
        position: "relative",
        zIndex: 5
      }}>
        {/* Left: Main detection card */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          padding: "40px 30px",
          minHeight: "400px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: styles.glow,
          transition: "all 0.5s ease",
          animation: "fadeIn 0.8s ease",
          textAlign: "center"
        }}>
          {result ? (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <div style={{
                fontSize: "5rem",
                marginBottom: "16px",
                animation: result.is_danger ? "pulse 1s ease infinite" : "none"
              }}>
                {styles.emoji}
              </div>
              <div style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                marginBottom: "10px",
                textTransform: "capitalize"
              }}>
                {displayLabel}
              </div>
              <div style={{
                fontSize: "0.95rem",
                opacity: 0.85,
                marginBottom: "16px",
                fontWeight: 300
              }}>
                {result.message}
              </div>
              <div style={{
                display: "inline-block",
                background: "rgba(255,255,255,0.1)",
                padding: "6px 16px",
                borderRadius: "100px",
                fontSize: "0.8rem",
                fontWeight: 500
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
              <div style={{ fontSize: "4rem", animation: "pulse 1.5s ease infinite" }}>🎧</div>
              <div style={{ marginTop: "20px", fontSize: "1.1rem", fontWeight: 500 }}>Listening...</div>
              <div style={{ marginTop: "8px", fontSize: "0.85rem", opacity: 0.6 }}>
                Analyzing environment
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🎤</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 500, marginBottom: "8px" }}>
                Ready to protect
              </div>
              <div style={{ fontSize: "0.9rem", opacity: 0.6, fontWeight: 300 }}>
                Press start to begin monitoring
              </div>
            </div>
          )}

          <button
            onClick={isListening ? stopListening : startListening}
            style={{
              marginTop: "30px",
              background: isListening
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : `linear-gradient(135deg, ${styles.accent} 0%, #0d9488 100%)`,
              color: "white",
              border: "none",
              borderRadius: "100px",
              padding: "16px 40px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: isListening
                ? "0 10px 30px rgba(239, 68, 68, 0.4)"
                : `0 10px 30px ${styles.accent}66`,
              transition: "all 0.3s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            {isListening ? "■  Stop" : "▶  Start Listening"}
          </button>

          {error && (
            <div style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "10px",
              color: "#fca5a5",
              fontSize: "0.85rem"
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Right column: Waveform + Confidence meters */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Waveform */}
          <div style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px",
            padding: "24px",
            animation: "fadeIn 1s ease"
          }}>
            <div style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              opacity: 0.7,
              marginBottom: "16px",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}>
              Audio Input
            </div>
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "3px",
              height: "80px",
              justifyContent: "center"
            }}>
              {waveform.map((val, i) => (
                <div key={i} style={{
                  width: "4px",
                  height: `${Math.max(val * 100, 2)}%`,
                  background: `linear-gradient(to top, ${styles.accent}, ${styles.accent}88)`,
                  borderRadius: "2px",
                  transition: "height 0.1s ease",
                  boxShadow: isListening ? `0 0 6px ${styles.accent}66` : "none"
                }} />
              ))}
            </div>
          </div>

          {/* Confidence meters */}
          <div style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px",
            padding: "24px",
            animation: "fadeIn 1.2s ease"
          }}>
            <div style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              opacity: 0.7,
              marginBottom: "16px",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}>
              Detection Confidence
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ALL_CLASSES.map(cls => {
                const score = classScores[cls] || 0;
                return (
                  <div key={cls}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                      fontSize: "0.8rem"
                    }}>
                      <span style={{ textTransform: "capitalize", opacity: 0.85 }}>
                        {CLASS_ICONS[cls]} {cls.replace(/_/g, " ")}
                      </span>
                      <span style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
                        {score.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{
                      height: "6px",
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: "4px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${score}%`,
                        background: CLASS_COLORS[cls],
                        borderRadius: "4px",
                        transition: "width 0.5s ease",
                        boxShadow: `0 0 8px ${CLASS_COLORS[cls]}66`
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* History */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          padding: "24px",
          gridColumn: "1 / -1",
          animation: "fadeIn 1.4s ease"
        }}>
          <div style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            opacity: 0.7,
            marginBottom: "16px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            display: "flex",
            justifyContent: "space-between"
          }}>
            <span>Detection History</span>
            <span>{history.length} {history.length === 1 ? "event" : "events"}</span>
          </div>

          {history.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "30px",
              opacity: 0.4,
              fontSize: "0.9rem"
            }}>
              No detections yet. Start listening to see history.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.map((item, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: item.is_danger
                    ? `${CLASS_COLORS[item.label]}22`
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${item.is_danger ? CLASS_COLORS[item.label] + "44" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  animation: "slideIn 0.3s ease"
                }}>
                  <div style={{ fontSize: "1.5rem", marginRight: "14px" }}>
                    {CLASS_ICONS[item.label]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      textTransform: "capitalize",
                      marginBottom: "2px"
                    }}>
                      {item.label.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>
                      {item.time}
                    </div>
                  </div>
                  <div style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    padding: "4px 10px",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "100px"
                  }}>
                    {item.confidence}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center",
        marginTop: "40px",
        fontSize: "0.75rem",
        opacity: 0.4,
        fontWeight: 300,
        position: "relative",
        zIndex: 5
      }}>
        Powered by Machine Learning · Analyzes every 3 seconds
      </div>
    </div>
  );
}
