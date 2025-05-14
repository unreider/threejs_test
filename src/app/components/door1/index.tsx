'use client';
import * as THREE from 'three';
import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, ThreeElements, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

const Door1 = (props: ThreeElements['mesh']) => {
	const meshRef = useRef<THREE.Group>(null!);
	const doorRef = useRef<THREE.Object3D>(null!);
	const { camera, raycaster, gl } = useThree();

	const dragStateRef = useRef({
		isDragging: false,
		isRotating: false,
		dragOffset: new THREE.Vector3(),
		lastMouseX: 0,
		rotationVelocity: 0,
		targetRotationY: 0,
		targetScale: 1.7,
		targetPosition: new THREE.Vector3(),
		currentScale: 1.7,
	});

	const [scale, setScale] = useState(1.7);
	const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

	const { scene: doorScene } = useGLTF('/models/Mijsenyakayin_Drner/11.NEPTUN/11_NEPTUN_Door.glb');
	const { scene: frameScene } = useGLTF('/models/Mijsenyakayin_Drner/11.NEPTUN/11_NEPTUN_Frame.glb');
	const { scene: handleScene } = useGLTF('/models/Mijsenyakayin_Drner/11.NEPTUN/11_NEPTUN_Brnak.glb');
	// const { scene: handleScene } = useGLTF('/models/handles/handle3/1.MANCHESTER_Brnak.glb');
	// const { scene: frame3 } = useGLTF('/models/frames/frame3/1.MANCHESTER_Frame.glb');

	// const handle3 = useMemo(() => handleScene.clone(), [handleScene]);
	// const handle4 = useMemo(() => handleScene.clone(), [handleScene]);

	useEffect(() => {
		if (doorRef.current && frameScene && handleScene) {
			// handle4.position.set(0, 0, -0.001);
			// handle4.rotation.set(0, -Math.PI, 0);
			// handle4.scale.set(-1, 1, 1);
			// doorRef.current.add(handle3);
			// doorRef.current.add(handle4);
			doorRef.current.add(frameScene);
			doorRef.current.add(handleScene);
		}
	}, [doorScene, frameScene, handleScene]);

	const calculateDragPoint = (clientX: number, clientY: number) => {
		const normalizedMouse = new THREE.Vector2(
			(clientX / gl.domElement.clientWidth) * 2 - 1,
			-(clientY / gl.domElement.clientHeight) * 2 + 1
		);
		raycaster.setFromCamera(normalizedMouse, camera);
		const intersectionPoint = new THREE.Vector3();
		raycaster.ray.intersectPlane(dragPlane, intersectionPoint);
		return intersectionPoint;
	};

	useEffect(() => {
		const canvas = gl.domElement;

		const handlePointerDown = (event: PointerEvent) => {
			const state = dragStateRef.current;
			const intersectionPoint = calculateDragPoint(event.clientX, event.clientY);

			if (event.button === 1) {
				state.isDragging = true;
				state.dragOffset.copy(intersectionPoint).sub(meshRef.current.position);
			} else if (event.button === 0) {
				state.isRotating = true;
				state.lastMouseX = event.clientX;
				state.targetRotationY = meshRef.current.rotation.y;
			}
		};

		canvas.addEventListener('pointerdown', handlePointerDown);
		return () => canvas.removeEventListener('pointerdown', handlePointerDown);
	}, [gl]);

	const handlePointerMove = (event: any) => {
		const state = dragStateRef.current;

		if (state.isRotating) {
			const deltaX = event.clientX - state.lastMouseX;
			state.rotationVelocity = deltaX * 0.005;
			state.lastMouseX = event.clientX;
		}
	};

	const handlePointerUp = () => {
		const state = dragStateRef.current;
		state.isDragging = false;
		state.isRotating = false;
		state.rotationVelocity = 0;
	};

	useEffect(() => {
		const canvas = gl.domElement;
		const handleGlobalPointerUp = () => handlePointerUp();
		canvas.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handleGlobalPointerUp);
		window.addEventListener('pointercancel', handleGlobalPointerUp);

		return () => {
			canvas.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handleGlobalPointerUp);
			window.removeEventListener('pointercancel', handleGlobalPointerUp);
		};
	}, [gl]);

	// Mouse-centered zoom with smooth interpolation
	useEffect(() => {
		const state = dragStateRef.current;
		state.targetPosition.copy(meshRef.current?.position || new THREE.Vector3());

		const handleWheel = (event: WheelEvent) => {
			event.preventDefault();
			if (!meshRef.current) return;

			const zoomSpeed = 0.1;
			const direction = event.deltaY > 0 ? -1 : 1;
			state.targetScale = Math.max(1, Math.min(5, state.targetScale + direction * zoomSpeed));

			// Calculate mouse position and adjust target position
			const mousePos = calculateDragPoint(event.clientX, event.clientY);
			const currentPos = meshRef.current.position.clone();
			const offset = mousePos.clone().sub(currentPos);
			const scaleFactor = state.targetScale / state.currentScale;
			state.targetPosition.copy(mousePos.clone().sub(offset.clone().multiplyScalar(scaleFactor)));
		};

		const canvas = gl.domElement;
		canvas.addEventListener('wheel', handleWheel, { passive: false });

		return () => canvas.removeEventListener('wheel', handleWheel);
	}, [gl]);

	useFrame((state, delta) => {
		if (!meshRef.current) return;
		const dragState = dragStateRef.current;
		const frameDelta = Math.min(delta, 0.1);

		// Smooth zoom interpolation
		if (Math.abs(dragState.currentScale - dragState.targetScale) > 0.001) {
			const scaleDiff = dragState.targetScale - dragState.currentScale;
			dragState.currentScale += scaleDiff * frameDelta * 10; // Adjust speed with multiplier
			setScale(dragState.currentScale);

			// Smooth position interpolation
			meshRef.current.position.lerp(dragState.targetPosition, frameDelta * 10);
		}

		if (dragState.isDragging) {
			const target = calculateDragPoint(
				(state.mouse.x * window.innerWidth) / 2 + window.innerWidth / 2,
				(-state.mouse.y * window.innerHeight) / 2 + window.innerHeight / 2
			);
			const newPosition = target.clone().sub(dragState.dragOffset);
			meshRef.current.position.lerp(newPosition, 0.3);
			meshRef.current.position.z = 0;
		}

		if (dragState.isRotating) {
			dragState.targetRotationY += dragState.rotationVelocity;
		} else if (Math.abs(dragState.rotationVelocity) > 0.001) {
			dragState.rotationVelocity *= 0.95;
		}

		const rotationDiff = dragState.targetRotationY - meshRef.current.rotation.y;
		meshRef.current.rotation.y += rotationDiff * Math.min(frameDelta * 10, 1);
	});

	return (
		<group {...props} ref={meshRef} scale={scale}>
			<primitive object={doorScene} ref={doorRef} />
		</group>
	);
};

export default Door1;

useGLTF.preload('/models/doors/door3/1.MANCHESTER_Door.glb');
useGLTF.preload('/models/handles/handle3/1.MANCHESTER_Brnak.glb');
useGLTF.preload('/models/frames/frame3/1.MANCHESTER_Frame.glb');
