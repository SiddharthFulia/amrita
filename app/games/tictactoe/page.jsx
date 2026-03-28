"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function calcWinner(board) {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every(Boolean)) return { winner: "draw", line: [] };
  return null;
}

const CONFETTI = ["🎉", "✨", "💖", "🌟", "💫", "🎊", "💝", "🌸"];

export default function TicTacToePage() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [result, setResult] = useState(null);
  const [winLine, setWinLine] = useState([]);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [gameCount, setGameCount] = useState(0);
  const [confettiItems, setConfettiItems] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ttt_scores");
      if (saved) {
        const parsed = JSON.parse(saved);
        setScores(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ttt_scores", JSON.stringify(scores));
    } catch {}
  }, [scores]);

  function handleClick(idx) {
    if (board[idx] || result) return;
    const newBoard = [...board];
    newBoard[idx] = currentPlayer;
    setBoard(newBoard);

    const res = calcWinner(newBoard);
    if (res) {
      setResult(res.winner);
      setWinLine(res.line);
      if (res.winner !== "draw") {
        setScores((prev) => {
          const next = { ...prev, [res.winner]: prev[res.winner] + 1 };
          return next;
        });
        const items = Array.from({ length: 18 }, (_, i) => ({
          id: i,
          emoji: CONFETTI[i % CONFETTI.length],
          left: Math.random() * 100,
          delay: Math.random() * 1.2,
          duration: 1.5 + Math.random() * 1,
        }));
        setConfettiItems(items);
      }
    } else {
      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
    }
  }

  function playAgain() {
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setResult(null);
    setWinLine([]);
    setConfettiItems([]);
    setGameCount((c) => c + 1);
  }

  function resetScores() {
    setScores({ X: 0, O: 0 });
    try { localStorage.removeItem("ttt_scores"); } catch {}
  }

  const playerLabel = {
    X: "Siddharth 💙",
    O: "Amrita 🩷",
  };
  const playerColor = { X: "#64b5f6", O: "#e91e8c" };

  function getCellStyle(idx, value) {
    const isWin = winLine.includes(idx);
    return {
      width: "80px",
      height: "80px",
      border: "2px solid #e91e8c",
      borderRadius: "12px",
      background: isWin ? "#c9a227" : "#0f0f2e",
      cursor: value || result ? "default" : "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "2.2rem",
      fontWeight: "bold",
      color: value === "X" ? "#64b5f6" : value === "O" ? "#e91e8c" : "transparent",
      transform: isWin ? "scale(1.1)" : "scale(1)",
      transition: "transform 0.2s, background 0.3s",
      fontFamily: "Inter, sans-serif",
      boxShadow: isWin ? "0 0 18px #c9a227" : "none",
    };
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07071a",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Dancing+Script:wght@700&family=Inter:wght@400;600;700&display=swap');
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-120px) scale(1.4); }
        }
        @keyframes cellPop {
          0% { transform: scale(0.7); }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .cell-animate { animation: cellPop 0.22s ease; }
        @keyframes overlayIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Confetti */}
      {confettiItems.map((c) => (
        <div
          key={c.id}
          style={{
            position: "fixed",
            left: `${c.left}%`,
            bottom: "10%",
            fontSize: "1.8rem",
            animation: `floatUp ${c.duration}s ${c.delay}s ease forwards`,
            pointerEvents: "none",
            zIndex: 999,
          }}
        >
          {c.emoji}
        </div>
      ))}

      {/* Back + Title */}
      <div style={{ width: "100%", maxWidth: "400px", marginBottom: "8px" }}>
        <Link
          href="/games"
          style={{
            color: "#b388ff",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontFamily: "Inter, sans-serif",
          }}
        >
          ← Games
        </Link>
      </div>

      <h1
        style={{
          fontFamily: "Dancing Script, cursive",
          fontSize: "2.4rem",
          color: "#e91e8c",
          margin: "0 0 4px",
          textShadow: "0 0 20px #e91e8c80",
        }}
      >
        Tic Tac Toe 💝
      </h1>

      {/* Score bar */}
      <div
        style={{
          display: "flex",
          gap: "32px",
          marginBottom: "16px",
          background: "#0f0f2e",
          borderRadius: "20px",
          padding: "8px 28px",
          border: "1px solid #b388ff40",
        }}
      >
        <span style={{ color: "#64b5f6", fontWeight: 700, fontSize: "1rem" }}>
          💙 Siddharth: {scores.X}
        </span>
        <span style={{ color: "#b388ff", fontSize: "1rem" }}>|</span>
        <span style={{ color: "#e91e8c", fontWeight: 700, fontSize: "1rem" }}>
          🩷 Amrita: {scores.O}
        </span>
      </div>

      {/* Turn indicator */}
      {!result && (
        <div
          style={{
            marginBottom: "20px",
            fontSize: "1.05rem",
            color: playerColor[currentPlayer],
            fontWeight: 600,
            background: "#0f0f2e",
            padding: "8px 20px",
            borderRadius: "12px",
            border: `1px solid ${playerColor[currentPlayer]}60`,
          }}
        >
          {currentPlayer === "X" ? "💙" : "🩷"} {playerLabel[currentPlayer]}'s turn
        </div>
      )}

      {/* Board */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 80px)",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {board.map((val, idx) => (
          <button
            key={idx}
            className={val ? "cell-animate" : ""}
            style={getCellStyle(idx, val)}
            onClick={() => handleClick(idx)}
            aria-label={`Cell ${idx}`}
          >
            {val}
          </button>
        ))}
      </div>

      {/* Player labels */}
      <div
        style={{
          display: "flex",
          gap: "32px",
          marginTop: "4px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#64b5f6",
            fontFamily: "Playfair Display, serif",
            fontSize: "1rem",
          }}
        >
          X = {playerLabel.X}
        </div>
        <div
          style={{
            textAlign: "center",
            color: "#e91e8c",
            fontFamily: "Playfair Display, serif",
            fontSize: "1rem",
          }}
        >
          O = {playerLabel.O}
        </div>
      </div>

      {/* Win/Draw Overlay */}
      {result && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#07071aCC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "#0f0f2e",
              border: "2px solid #e91e8c",
              borderRadius: "24px",
              padding: "40px 48px",
              textAlign: "center",
              animation: "overlayIn 0.3s ease",
              boxShadow: "0 0 60px #e91e8c40",
              maxWidth: "320px",
              width: "90%",
            }}
          >
            {result === "draw" ? (
              <div
                style={{
                  fontSize: "2rem",
                  fontFamily: "Dancing Script, cursive",
                  color: "#b388ff",
                  marginBottom: "12px",
                }}
              >
                🤝 It's a tie!
              </div>
            ) : (
              <div
                style={{
                  fontSize: "2rem",
                  fontFamily: "Dancing Script, cursive",
                  color: result === "X" ? "#64b5f6" : "#e91e8c",
                  marginBottom: "12px",
                }}
              >
                🎉 {playerLabel[result]} wins!
              </div>
            )}

            <div style={{ fontSize: "1.5rem", marginBottom: "20px" }}>
              {result === "draw"
                ? "Nobody won this round 🤷"
                : result === "X"
                ? "Well played! 💙"
                : "So cute! 🩷"}
            </div>

            <button
              onClick={playAgain}
              style={{
                background: "linear-gradient(135deg, #e91e8c, #b388ff)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "12px 32px",
                fontSize: "1.1rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                display: "block",
                width: "100%",
                marginBottom: "12px",
              }}
            >
              Play Again
            </button>

            <button
              onClick={() => { resetScores(); playAgain(); }}
              style={{
                background: "transparent",
                color: "#b388ff80",
                border: "none",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontFamily: "Inter, sans-serif",
                textDecoration: "underline",
              }}
            >
              Reset Scores
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
