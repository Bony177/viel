import { useMemo } from "react";
import "./DustParticles.css";

export default function DustParticles({ count = 80 }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,

      x: Math.random() * 100,

      y: Math.random() * 100,

      size: Math.random() * 4 + 1,

      delay: Math.random() * 20,

      duration: Math.random() * 30 + 30,

      opacity: Math.random() * 0.15 + 0.03,
    }));
  }, [count]);

  return (
    <div className="dust-container">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="dust-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,

            width: `${particle.size}px`,
            height: `${particle.size}px`,

            opacity: particle.opacity,

            animationDelay: `${particle.delay}s`,

            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
