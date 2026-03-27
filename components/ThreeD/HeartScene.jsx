"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeartScene({ height = '500px' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const mountWidth = mount.clientWidth;
    const mountHeight = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mountWidth / mountHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountWidth, mountHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Heart shape
    const heartShape = new THREE.Shape();
    const x = 0, y = 0;
    heartShape.moveTo(x + 0.5, y + 0.5);
    heartShape.bezierCurveTo(x + 0.5, y + 0.5, x + 0.4, y, x, y);
    heartShape.bezierCurveTo(x - 0.6, y, x - 0.6, y + 0.7, x - 0.6, y + 0.7);
    heartShape.bezierCurveTo(x - 0.6, y + 1.1, x - 0.3, y + 1.54, x + 0.5, y + 1.9);
    heartShape.bezierCurveTo(x + 1.2, y + 1.54, x + 1.6, y + 1.1, x + 1.6, y + 0.7);
    heartShape.bezierCurveTo(x + 1.6, y + 0.7, x + 1.6, y, x + 1.0, y);
    heartShape.bezierCurveTo(x + 0.7, y, x + 0.5, y + 0.5, x + 0.5, y + 0.5);

    const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 2,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    });
    heartGeo.center();

    const heartMat = new THREE.MeshPhysicalMaterial({
      color: 0xe91e8c,
      emissive: 0xc2185b,
      emissiveIntensity: 0.5,
      metalness: 0.2,
      roughness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });

    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.scale.setScalar(1.8);
    scene.add(heart);

    // Glow halo (back-side of heart, slightly larger)
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xe91e8c,
      emissive: 0xe91e8c,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(heartGeo, glowMat);
    glowMesh.scale.setScalar(1.96);
    scene.add(glowMesh);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pinkLight = new THREE.PointLight(0xe91e8c, 2, 20);
    pinkLight.position.set(5, 5, 5);
    scene.add(pinkLight);
    const lavLight = new THREE.PointLight(0xb388ff, 1.5, 20);
    lavLight.position.set(-5, -5, 5);
    scene.add(lavLight);
    const frontLight = new THREE.PointLight(0xffffff, 1, 20);
    frontLight.position.set(0, 0, 8);
    scene.add(frontLight);

    // Star particles
    const starPositions = new Float32Array(400 * 3);
    for (let starIndex = 0; starIndex < 400; starIndex++) {
      starPositions[starIndex * 3] = (Math.random() - 0.5) * 22;
      starPositions[starIndex * 3 + 1] = (Math.random() - 0.5) * 22;
      starPositions[starIndex * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xb388ff, size: 0.05, transparent: true, opacity: 0.8, sizeAttenuation: true });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Small orbiting hearts
    const smallHeartShape = new THREE.Shape();
    smallHeartShape.moveTo(0.5, 0.5);
    smallHeartShape.bezierCurveTo(0.5, 0.5, 0.4, 0, 0, 0);
    smallHeartShape.bezierCurveTo(-0.6, 0, -0.6, 0.7, -0.6, 0.7);
    smallHeartShape.bezierCurveTo(-0.6, 1.1, -0.3, 1.54, 0.5, 1.9);
    smallHeartShape.bezierCurveTo(1.2, 1.54, 1.6, 1.1, 1.6, 0.7);
    smallHeartShape.bezierCurveTo(1.6, 0.7, 1.6, 0, 1.0, 0);
    smallHeartShape.bezierCurveTo(0.7, 0, 0.5, 0.5, 0.5, 0.5);
    const smallHeartGeo = new THREE.ExtrudeGeometry(smallHeartShape, { depth: 0.1, bevelEnabled: false });
    smallHeartGeo.center();
    const smallHeartMat = new THREE.MeshStandardMaterial({
      color: 0xff6baa,
      emissive: 0xe91e8c,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.7,
    });

    const orbitingHearts = Array.from({ length: 6 }, (_, heartIndex) => {
      const mesh = new THREE.Mesh(smallHeartGeo, smallHeartMat);
      mesh.scale.setScalar(0.1);
      mesh.userData = {
        angle: (heartIndex / 6) * Math.PI * 2,
        radius: 3.5 + Math.random() * 1,
        yOffset: (Math.random() - 0.5) * 1.5,
        speed: 0.3 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      };
      scene.add(mesh);
      return mesh;
    });

    // Mouse / touch rotation
    let isDragging = false;
    let previousMouseX = 0;
    let autoRotateSpeed = 0.004;
    let targetRotationY = 0;

    const onMouseDown = (mouseEvent) => { isDragging = true; previousMouseX = mouseEvent.clientX; };
    const onMouseMove = (mouseEvent) => {
      if (!isDragging) return;
      targetRotationY += (mouseEvent.clientX - previousMouseX) * 0.01;
      previousMouseX = mouseEvent.clientX;
    };
    const onMouseUp = () => { isDragging = false; };

    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation loop
    let animationId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Pulse scale
      const pulse = 1 + Math.sin(elapsed * 1.5) * 0.05;
      heart.scale.setScalar(1.8 * pulse);
      glowMesh.scale.setScalar(1.96 * pulse);

      // Float up/down
      heart.position.y = Math.sin(elapsed * 0.9) * 0.22;
      glowMesh.position.y = heart.position.y;

      // Rotation
      if (!isDragging) {
        targetRotationY += autoRotateSpeed;
      }
      heart.rotation.y += (targetRotationY - heart.rotation.y) * 0.08;
      glowMesh.rotation.y = heart.rotation.y;

      // Stars slow rotation
      stars.rotation.y = elapsed * 0.04;
      stars.rotation.x = elapsed * 0.02;

      // Orbiting hearts
      orbitingHearts.forEach((orbiter) => {
        const orbitData = orbiter.userData;
        const currentAngle = orbitData.angle + elapsed * orbitData.speed;
        orbiter.position.x = Math.cos(currentAngle) * orbitData.radius;
        orbiter.position.z = Math.sin(currentAngle) * orbitData.radius;
        orbiter.position.y = orbitData.yOffset + Math.sin(elapsed + orbitData.phase) * 0.3;
        orbiter.rotation.y = currentAngle;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      if (!mount) return;
      const newWidth = mount.clientWidth;
      const newHeight = mount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      mount.removeEventListener('mousedown', onMouseDown);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height, cursor: 'grab' }} />;
}
