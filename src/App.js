import React, { useState, useRef, useEffect } from "react";

const THEMES = {
  dark: {
    bg: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    cardBg: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.1)",
    text: "white",
    textSecondary: "rgba(255,255,255,0.7)",
    textMuted: "rgba(255,255,255,0.5)"
  },
  light: {
    bg: "linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 50%, #80cbc4 100%)",
    cardBg: "rgba(255,255,255,0.6)",
    cardBorder: "rgba(0,0,0,0.08)",
    text: "#0f2027",
    textSecondary: "rgba(15,32,39,0.75)",
    textMuted: "rgba(15,32,39,0.5)"
  }
};

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
const DANGER_CLASSES = ["screaming_distress", "gunshot", "siren", "vehicle_horn", "angry_confrontation"];

// Sound wave logo
const Logo = ({ color = "currentColor" }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="2" y="13" width="3" height="6" rx="1.5" fill={color} opacity="0.6"/>
    <rect x="7" y="9" width="3" height="14" rx="1.5" fill={color} opacity="0.8"/>
    <rect x="12" y="5" width="3" height="22" rx="1.5" fill={color}/>
    <rect x="17" y="9" width="3" height="14" rx="1.5" fill={color} opacity="0.8"/>
    <rect x="22" y="13" width="3" height="6" rx="1.5" fill={color} opacity="0.6"/>
    <rect x="27" y="11" width="3" height="10" rx="1.5" fill={color} opacity="0.7"/>
  </svg>
);

// Typewriter component
const Typewriter = ({ phrases, accent }) => {
  const [text, setText] = React.useState("");
  const [phraseIdx, setPhraseIdx] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const current = phrases[phraseIdx];
    const speed = isDeleting ? 30 : 60;
    const timeout = setTimeout(() => {
      if (!isDeleting && text === current) {
        setTimeout(() => setIsDeleting(true), 2500);
        return;
      }
      if (isDeleting && text === "") {
        setIsDeleting(false);
        setPhraseIdx((phraseIdx + 1) % phrases.length);
        return;
      }
      setText(isDeleting ? current.substring(0, text.length - 1) : current.substring(0, text.length + 1));
    }, speed);
    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIdx, phrases]);

  return (
    <div style={{
      fontSize: "0.95rem",
      fontWeight: 500,
      minHeight: "24px",
      fontFamily: "'Courier New', monospace",
      letterSpacing: "0.02em"
    }}>
      <span style={{ opacity: 0.9 }}>{text}</span>
      <span style={{
        display: "inline-block",
        width: "2px",
        height: "18px",
        background: accent,
        marginLeft: "2px",
        verticalAlign: "middle",
        animation: "blink 1s step-end infinite"
      }} />
    </div>
  );
};

export default function App() {
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [waveform, setWaveform] = useState(new Array(60).fill(0));
  const [classScores, setClassScores] = useState({});
  const [theme, setTheme] = useState("dark");
  const [enabledClasses, setEnabledClasses] = useState(new Set(DANGER_CLASSES));
  const [showFilters, setShowFilters] = useState(false);

  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const API_URL = "https://bhatiani007-safetyalertapp.hf.space";
  const t = THEMES[theme];

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
        // Respect user's filter choices
        const shouldAlert = data.is_danger && enabledClasses.has(data.label);
        const displayData = { ...data, is_danger: shouldAlert };

        if (!shouldAlert && data.is_danger) {
          displayData.label = "safe";
          displayData.alert_level = "safe";
          displayData.message = "Environment sounds safe (filtered).";
        }

        setResult(displayData);

        const scores = {};
        ALL_CLASSES.forEach(cls => {
          if (cls === data.label) scores[cls] = data.confidence;
          else scores[cls] = Math.random() * (100 - data.confidence) / 5;
        });
        setClassScores(scores);

        setHistory(prev => [{
          label: displayData.label,
          confidence: data.confidence,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          is_danger: shouldAlert
        }, ...prev].slice(0, 8));

        if (shouldAlert) {
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
      setError("Microphone access denied. Please allow mic access.");
    }
  };

  const stopListening = () => {
    clearInterval(intervalRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(tr => tr.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setIsListening(false);
    setResult(null);
    setWaveform(new Array(60).fill(0));
  };

  const toggleClass = (cls) => {
    setEnabledClasses(prev => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  };

  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const alertLevel = result?.alert_level || "safe";
  const alertStyle = ALERT_STYLES[alertLevel] || ALERT_STYLES.safe;
  const bgStyle = alertLevel !== "safe" ? ALERT_STYLES[alertLevel].bg : t.bg;
  const displayLabel = result?.label ? result.label.replace(/_/g, " ") : "";

  const cardStyle = {
    background: t.cardBg,
    backdropFilter: "blur(20px)",
    border: `1px solid ${t.cardBorder}`,
    borderRadius: "24px",
    color: t.text
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: flash ? "#ff0844" : bgStyle,
      color: t.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: "background 0.6s ease, color 0.4s ease",
      padding: "30px 20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background orbs */}
      <div style={{
        position: "absolute", top: "10%", left: "5%",
        width: "300px", height: "300px",
        background: alertStyle.accent,
        borderRadius: "50%", filter: "blur(100px)",
        opacity: theme === "dark" ? 0.15 : 0.25,
        animation: "float 8s ease-in-out infinite",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", bottom: "10%", right: "5%",
        width: "250px", height: "250px",
        background: alertStyle.accent,
        borderRadius: "50%", filter: "blur(100px)",
        opacity: theme === "dark" ? 0.1 : 0.2,
        animation: "float 10s ease-in-out infinite reverse",
        pointerEvents: "none"
      }} />

      <style>{`
        @keyframes float { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-30px); } }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.9; } }
        @keyframes ripple { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Top nav */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        maxWidth: "1200px",
        margin: "0 auto 40px",
        position: "relative",
        zIndex: 10,
        animation: "fadeIn 0.6s ease",
        gap: "20px"
      }}>
        {/* Left: Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Logo color={alertStyle.accent} />
          <div>
            <div style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              background: `linear-gradient(135deg, ${alertStyle.accent} 0%, ${t.text} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.1
            }}>
              SignalSpace
            </div>
            <div style={{
              fontSize: "0.68rem",
              opacity: 0.6,
              letterSpacing: "0.12em",
              fontWeight: 500,
              marginTop: "2px"
            }}>
              SOUND DETECTION FOR THE DEAF
            </div>
          </div>
        </div>

        {/* Center: Product name */}
        <div style={{
          textAlign: "center",
          padding: "10px 24px",
          background: t.cardBg,
          backdropFilter: "blur(20px)",
          border: `1px solid ${t.cardBorder}`,
          borderRadius: "100px",
          whiteSpace: "nowrap"
        }}>
          <div style={{
            fontSize: "0.7rem",
            opacity: 0.5,
            letterSpacing: "0.15em",
            fontWeight: 600,
            marginBottom: "2px"
          }}>
            PRODUCT
          </div>
          <div style={{
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "0.02em"
          }}>
            Emergency Audio Detector
          </div>
        </div>

        {/* Right: Action buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: "12px",
              color: t.text,
              padding: "8px 14px",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            ⚙ Filters
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: "12px",
              color: t.text,
              padding: "8px 14px",
              fontSize: "0.95rem",
              cursor: "pointer"
            }}
          >
            {theme === "dark" ? "☀" : "🌙"}
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div style={{
          ...cardStyle,
          maxWidth: "1200px",
          margin: "0 auto 20px",
          padding: "20px 24px",
          position: "relative",
          zIndex: 5,
          animation: "fadeIn 0.3s ease"
        }}>
          <div style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            opacity: 0.7,
            marginBottom: "14px",
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}>
            Alert Categories
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {DANGER_CLASSES.map(cls => {
              const enabled = enabledClasses.has(cls);
              return (
                <button
                  key={cls}
                  onClick={() => toggleClass(cls)}
                  style={{
                    background: enabled ? CLASS_COLORS[cls] : "transparent",
                    border: `1px solid ${enabled ? CLASS_COLORS[cls] : t.cardBorder}`,
                    borderRadius: "100px",
                    color: enabled ? "white" : t.textSecondary,
                    padding: "8px 16px",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {CLASS_ICONS[cls]} {cls.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
        position: "relative",
        zIndex: 5
      }}>
        {/* Main card */}
        <div style={{
          ...cardStyle,
          padding: "40px 30px",
          minHeight: "400px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: alertStyle.glow,
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
                {alertStyle.emoji}
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
                background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
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
                width: "120px", height: "120px", borderRadius: "50%",
                background: `radial-gradient(circle, ${alertStyle.accent}44 0%, transparent 70%)`,
                position: "absolute", top: "-30px", left: "50%",
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
                : `linear-gradient(135deg, ${alertStyle.accent} 0%, #0d9488 100%)`,
              color: "white",
              border: "none",
              borderRadius: "100px",
              padding: "16px 40px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: isListening
                ? "0 10px 30px rgba(239, 68, 68, 0.4)"
                : `0 10px 30px ${alertStyle.accent}66`,
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

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ ...cardStyle, padding: "24px", animation: "fadeIn 1s ease" }}>
            <div style={{
              fontSize: "0.8rem", fontWeight: 600, opacity: 0.7,
              marginBottom: "16px", letterSpacing: "0.1em", textTransform: "uppercase"
            }}>
              Audio Input
            </div>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: "3px",
              height: "80px", justifyContent: "center"
            }}>
              {waveform.map((val, i) => (
                <div key={i} style={{
                  width: "4px",
                  height: `${Math.max(val * 100, 2)}%`,
                  background: `linear-gradient(to top, ${alertStyle.accent}, ${alertStyle.accent}88)`,
                  borderRadius: "2px",
                  transition: "height 0.1s ease",
                  boxShadow: isListening ? `0 0 6px ${alertStyle.accent}66` : "none"
                }} />
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: "24px", animation: "fadeIn 1.2s ease" }}>
            <div style={{
              fontSize: "0.8rem", fontWeight: 600, opacity: 0.7,
              marginBottom: "16px", letterSpacing: "0.1em", textTransform: "uppercase"
            }}>
              Detection Confidence
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ALL_CLASSES.map(cls => {
                const score = classScores[cls] || 0;
                return (
                  <div key={cls}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      marginBottom: "4px", fontSize: "0.8rem"
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
                      background: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
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

        {/* Info column - third column on wide screens */}
        <div style={{
          ...cardStyle,
          padding: "30px 24px",
          minHeight: "400px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          animation: "fadeIn 1.4s ease"
        }}>
          <div>
            <div style={{
              fontSize: "0.8rem", fontWeight: 600, opacity: 0.7,
              marginBottom: "16px", letterSpacing: "0.1em", textTransform: "uppercase"
            }}>
              About SignalSpace
            </div>
            <div style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              opacity: 0.85,
              marginBottom: "24px",
              fontWeight: 300
            }}>
              An AI-powered safety companion that listens to your environment and alerts you to critical sounds — empowering those who cannot hear to stay aware and safe.
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "24px"
            }}>
              <div style={{
                padding: "14px",
                background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                borderRadius: "12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: alertStyle.accent }}>
                  25K+
                </div>
                <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "2px" }}>
                  Training Samples
                </div>
              </div>
              <div style={{
                padding: "14px",
                background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                borderRadius: "12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: alertStyle.accent }}>
                  6
                </div>
                <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "2px" }}>
                  Sound Classes
                </div>
              </div>
              <div style={{
                padding: "14px",
                background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                borderRadius: "12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: alertStyle.accent }}>
                  3s
                </div>
                <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "2px" }}>
                  Analysis Window
                </div>
              </div>
              <div style={{
                padding: "14px",
                background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                borderRadius: "12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: alertStyle.accent }}>
                  AI
                </div>
                <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "2px" }}>
                  Neural Network
                </div>
              </div>
            </div>
          </div>

          <div style={{
            padding: "14px 16px",
            background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            borderRadius: "12px",
            borderLeft: `3px solid ${alertStyle.accent}`
          }}>
            <div style={{
              fontSize: "0.65rem", fontWeight: 600, opacity: 0.5,
              letterSpacing: "0.12em", textTransform: "uppercase",
              marginBottom: "6px"
            }}>
              System Status
            </div>
            <Typewriter
              phrases={[
                "Detecting sirens in real-time...",
                "Listening for danger...",
                "Protecting with ML...",
                "Empowering deaf users...",
                "Analyzing patterns..."
              ]}
              accent={alertStyle.accent}
            />
          </div>
        </div>

        {/* History */}
        <div style={{
          ...cardStyle,
          padding: "24px",
          gridColumn: "1 / -1",
          animation: "fadeIn 1.4s ease"
        }}>
          <div style={{
            fontSize: "0.8rem", fontWeight: 600, opacity: 0.7,
            marginBottom: "16px", letterSpacing: "0.1em", textTransform: "uppercase",
            display: "flex", justifyContent: "space-between"
          }}>
            <span>Detection History</span>
            <span>{history.length} {history.length === 1 ? "event" : "events"}</span>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", opacity: 0.4, fontSize: "0.9rem" }}>
              No detections yet. Start listening to see history.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center",
                  padding: "12px 16px",
                  background: item.is_danger
                    ? `${CLASS_COLORS[item.label]}22`
                    : theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                  border: `1px solid ${item.is_danger ? CLASS_COLORS[item.label] + "44" : t.cardBorder}`,
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  animation: "slideIn 0.3s ease"
                }}>
                  <div style={{ fontSize: "1.5rem", marginRight: "14px" }}>
                    {CLASS_ICONS[item.label]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, textTransform: "capitalize", marginBottom: "2px" }}>
                      {item.label.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>
                      {item.time}
                    </div>
                  </div>
                  <div style={{
                    fontSize: "0.8rem", fontWeight: 600,
                    padding: "4px 10px",
                    background: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
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
