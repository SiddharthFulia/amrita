"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const BEAR_BROWN = 0xc8860a;
const BEAR_LIGHT = 0xe8a030;
const BEAR_DARK = 0x1a1a1a;
const BEAR_WHITE = 0xffffff;

function addSphere(scene, parent, position, radius, color, emissive, emissiveIntensity = 0) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshStandardMaterial({ color, emissive: emissive ?? color, emissiveIntensity, roughness: 0.85 })
  );
  mesh.position.set(...position);
  if (parent) parent.add(mesh);
  else scene.add(mesh);
  return mesh;
}

function addCapsule(parent, position, rotation, radiusTop, length, color) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radiusTop, length, 6, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
  );
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
}

function buildBear(scene, xPosition, facingSign) {
  const bearGroup = new THREE.Group();
  bearGroup.position.set(xPosition, 0, 0);
  bearGroup.rotation.y = facingSign > 0 ? -0.4 : 0.4;
  scene.add(bearGroup);

  // Torso
  addSphere(scene, bearGroup, [0, 0, 0], 0.55, BEAR_BROWN, BEAR_BROWN);
  // Belly
  addSphere(scene, bearGroup, [0, -0.05, 0.38], 0.32, BEAR_LIGHT, BEAR_LIGHT);
  // Head
  addSphere(scene, bearGroup, [0, 0.82, 0], 0.42, BEAR_BROWN, BEAR_BROWN);
  // Ears
  addSphere(scene, bearGroup, [-0.28, 1.18, 0], 0.14, BEAR_BROWN, BEAR_BROWN);
  addSphere(scene, bearGroup, [-0.28, 1.18, 0.06], 0.085, BEAR_LIGHT, BEAR_LIGHT);
  addSphere(scene, bearGroup, [0.28, 1.18, 0], 0.14, BEAR_BROWN, BEAR_BROWN);
  addSphere(scene, bearGroup, [0.28, 1.18, 0.06], 0.085, BEAR_LIGHT, BEAR_LIGHT);
  // Snout
  addSphere(scene, bearGroup, [0, 0.72, 0.34], 0.18, BEAR_LIGHT, BEAR_LIGHT);
  // Nose
  addSphere(scene, bearGroup, [0, 0.79, 0.5], 0.055, BEAR_DARK, BEAR_DARK);
  // Eyes
  addSphere(scene, bearGroup, [-0.16, 0.92, 0.37], 0.045, BEAR_DARK, BEAR_DARK);
  addSphere(scene, bearGroup, [0.16, 0.92, 0.37], 0.045, BEAR_DARK, BEAR_DARK);
  // Eye shine
  addSphere(scene, bearGroup, [-0.145, 0.935, 0.41], 0.012, BEAR_WHITE, BEAR_WHITE, 1);
  addSphere(scene, bearGroup, [0.175, 0.935, 0.41], 0.012, BEAR_WHITE, BEAR_WHITE, 1);
  // Legs
  addCapsule(bearGroup, [-0.24, -0.62, 0], [0.15, 0, 0.1], 0.14, 0.35, BEAR_BROWN);
  addCapsule(bearGroup, [0.24, -0.62, 0], [0.15, 0, -0.1], 0.14, 0.35, BEAR_BROWN);
  // Arms — one reaching toward other bear, one wrapping back
  addCapsule(bearGroup, [facingSign * 0.52, 0.25, 0.1], [0.3, 0, facingSign * (-Math.PI * 0.28)], 0.11, 0.42, BEAR_BROWN);
  addCapsule(bearGroup, [facingSign * -0.52, 0.15, 0], [0.2, 0, facingSign * (Math.PI * 0.2)], 0.11, 0.4, BEAR_BROWN);

  return bearGroup;
}

export default function BearsScene({ height = '420px' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const mountWidth = mount.clientWidth;
    const mountHeight = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, mountWidth / mountHeight, 0.1, 100);
    camera.position.set(0, 0.5, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountWidth, mountHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const goldLight = new THREE.PointLight(0xffd700, 2, 20);
    goldLight.position.set(3, 4, 3);
    scene.add(goldLight);
    const pinkLight = new THREE.PointLight(0xff6baa, 1.5, 20);
    pinkLight.position.set(-3, 2, 3);
    scene.add(pinkLight);
    const lavLight = new THREE.PointLight(0xb388ff, 0.8, 20);
    lavLight.position.set(0, -2, 4);
    scene.add(lavLight);

    // Bears
    const leftBear = buildBear(scene, -0.85, 1);   // Siddharth
    const rightBear = buildBear(scene, 0.85, -1);  // Amrita

    // Floating heart above
    const heartGeo = new THREE.TorusGeometry(0.28, 0.1, 14, 36);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xe91e8c,
      emissive: 0xe91e8c,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.9,
    });
    const floatingHeart = new THREE.Mesh(heartGeo, heartMat);
    floatingHeart.position.set(0, 2.1, 0);
    floatingHeart.scale.setScalar(0.25);
    scene.add(floatingHeart);

    // Sparkle particles
    const sparkleCount = 60;
    const sparklePositions = new Float32Array(sparkleCount * 3);
    for (let sparkleIndex = 0; sparkleIndex < sparkleCount; sparkleIndex++) {
      sparklePositions[sparkleIndex * 3] = (Math.random() - 0.5) * 8;
      sparklePositions[sparkleIndex * 3 + 1] = (Math.random() - 0.5) * 8;
      sparklePositions[sparkleIndex * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const sparkleGeo = new THREE.BufferGeometry();
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMat = new THREE.PointsMaterial({ color: 0xe91e8c, size: 0.06, transparent: true, opacity: 0.6, sizeAttenuation: true });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkles);

    // Auto rotation
    let autoRotateAngle = 0;

    let animationId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Bears gentle sway
      leftBear.position.y = Math.sin(elapsed * 0.8) * 0.06;
      leftBear.rotation.z = Math.sin(elapsed * 0.5) * 0.02;
      rightBear.position.y = Math.sin(elapsed * 0.8 + 0.85) * 0.06;
      rightBear.rotation.z = Math.sin(elapsed * 0.5 + 0.85) * 0.02;

      // Floating heart bob + rotation
      floatingHeart.position.y = 2.1 + Math.sin(elapsed * 1.2) * 0.15;
      floatingHeart.rotation.y = elapsed * 0.8;
      const heartPulse = 1 + Math.sin(elapsed * 2.5) * 0.08;
      floatingHeart.scale.setScalar(0.25 * heartPulse);

      // Slow scene auto-rotation
      autoRotateAngle += 0.005;
      const sceneGroup = [leftBear, rightBear, floatingHeart, sparkles];
      sceneGroup.forEach((sceneObject) => {
        // rotate around world Y by orbiting their X/Z
      });
      // Gentle camera orbit
      camera.position.x = Math.sin(autoRotateAngle * 0.3) * 1.2;
      camera.position.z = 5.5 + Math.cos(autoRotateAngle * 0.3) * 0.5;
      camera.lookAt(0, 0.5, 0);

      sparkles.rotation.y = elapsed * 0.1;

      renderer.render(scene, camera);
    };
    animate();

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
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height }} />;
}
