"use client";

import styles from "./page.module.css";
import Door1 from "@/app/components/door1";
import { Canvas } from "@react-three/fiber";

export default function Home() {
  return (
    <div className={styles.page}>
        <Canvas>
            <ambientLight intensity={Math.PI / 2} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
            <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
            <Door1 position={[0, -1.8, 1]} />
        </Canvas>
    </div>
  );
}
