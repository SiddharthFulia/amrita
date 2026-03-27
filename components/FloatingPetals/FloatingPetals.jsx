"use client";

import { useEffect, useState } from 'react';

const PETAL_COUNT = 18;

const petalShapes = [
  '♥',
  '❤',
  '✿',
  '❀',
  '✦',
  '✧',
  '★',
];

function generatePetalStyle(index) {
  const leftPercent = Math.random() * 95 + 2;
  const animationDuration = Math.random() * 12 + 10;
  const animationDelay = Math.random() * 15;
  const fontSize = Math.random() * 14 + 8;
  const opacity = Math.random() * 0.35 + 0.1;
  const colorIndex = index % 4;
  const colors = ['#e91e8c', '#b388ff', '#ff6baa', '#ffd700'];

  return {
    position: 'fixed',
    left: `${leftPercent}%`,
    top: '-30px',
    fontSize: `${fontSize}px`,
    color: colors[colorIndex],
    opacity: opacity,
    animation: `petal-fall ${animationDuration}s linear ${animationDelay}s infinite`,
    pointerEvents: 'none',
    zIndex: 1,
    userSelect: 'none',
    filter: `drop-shadow(0 0 4px ${colors[colorIndex]}60)`,
  };
}

export default function FloatingPetals() {
  const [petals, setPetals] = useState([]);

  useEffect(() => {
    const generatedPetals = Array.from({ length: PETAL_COUNT }, (_, index) => ({
      id: index,
      symbol: petalShapes[index % petalShapes.length],
      style: generatePetalStyle(index),
    }));
    setPetals(generatedPetals);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {petals.map((petal) => (
        <div key={petal.id} style={petal.style}>
          {petal.symbol}
        </div>
      ))}
    </div>
  );
}
