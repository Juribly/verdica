import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import React from "react";

function Judge({ position }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial color="gold" />
    </mesh>
  );
}

function Accused() {
  return (
    <mesh position={[0, 0.3, 0]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}

function AudienceMember({ position }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="steelblue" />
    </mesh>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="lightgray" />
    </mesh>
  );
}

export default function Courtroom() {
  const audience = [];
  const radius = 5;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 1.2 + Math.PI * 0.2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    audience.push([x, 0.3, z]);
  }

  return (
    <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
      {/* Licht */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />

      {/* Objekte */}
      <Floor />
      <Accused />
      <Judge position={[0, 0.3, -3]} />
      <Judge position={[2, 0.3, -3]} />
      <Judge position={[-2, 0.3, -3]} />

      {audience.map((pos, i) => (
        <AudienceMember key={i} position={pos} />
      ))}

      {/* Kamera-Steuerung */}
      <OrbitControls />
    </Canvas>
  );
}
