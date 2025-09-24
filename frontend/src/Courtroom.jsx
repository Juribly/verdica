import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

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

function Audience({ count = 10, radius = 4 }) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 1.5 - Math.PI * 0.75;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    items.push(
      <mesh key={i} position={[x, 0.2, z]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="skyblue" />
      </mesh>
    );
  }
  return <>{items}</>;
}

export default function Courtroom() {
  return (
    <Canvas camera={{ position: [6, 5, 6], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />
      <Accused />
      <Judge position={[0, 0.3, -3]} />
      <Judge position={[-2, 0.3, -3]} />
      <Judge position={[2, 0.3, -3]} />
      <Audience count={12} />
      <OrbitControls />
    </Canvas>
  );
}
