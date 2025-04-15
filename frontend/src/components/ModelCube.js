import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Shared resources for maximum performance
const materialCache = {};
let atomGeometries = null;
const setupDone = { value: false };

const ModelCube = ({ className = '', size = 'md', color = '#3B82F6' }) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const atomRef = useRef(null);
  const electronsRef = useRef([]);
  const frameIdRef = useRef(null);
  const timeRef = useRef(0);

  // Set dimensions based on size prop
  const getDimensions = () => {
    switch (size) {
      case 'sm': return { height: 70, width: 70 };
      case 'lg': return { height: 140, width: 140 };
      case 'xl': return { height: 170, width: 170 };
      case 'md':
      default: return { height: 100, width: 100 };
    }
  };

  const dimensions = getDimensions();

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(35, dimensions.width / dimensions.height, 0.1, 1000);
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer - minimal settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      alpha: true,
      powerPreference: 'low-power'
    });
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.setPixelRatio(1); // Force lowest pixel ratio for better performance
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Get cached material
    const getMaterial = (colorHex, type = 'line') => {
      const key = `${colorHex}-${type}`;
      if (!materialCache[key]) {
        if (type === 'line') {
          materialCache[key] = new THREE.LineBasicMaterial({ 
            color: colorHex,
            transparent: true,
            opacity: 0.35
          });
        } else if (type === 'nucleus') {
          materialCache[key] = new THREE.MeshBasicMaterial({
            color: colorHex,
            wireframe: true
          });
        } else if (type === 'electron') {
          materialCache[key] = new THREE.MeshBasicMaterial({
            color: colorHex
          });
        }
      }
      return materialCache[key];
    };

    // Initialize shared geometries if not already created
    if (!setupDone.value) {
      atomGeometries = {
        // Ultra low-poly nucleus (tetrahedron is lower poly than icosahedron)
        nucleus: new THREE.TetrahedronGeometry(0.6, 0),
        // Very minimal electron (lower segment count)
        electron: new THREE.SphereGeometry(0.2, 3, 2),
        orbits: []
      };
      
      // Create orbits with minimal segments
      const createOrbitPath = (radius, segments) => {
        const points = [];
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const x = radius * Math.cos(theta);
          const y = radius * Math.sin(theta);
          points.push(new THREE.Vector3(x, y, 0));
        }
        return new THREE.BufferGeometry().setFromPoints(points);
      };
      
      // Create orbits with very low segment count for performance
      const orbitSegments = 24; // Even fewer segments than before
      atomGeometries.orbits = [
        createOrbitPath(2.8, orbitSegments),
        createOrbitPath(2.2, orbitSegments),
        createOrbitPath(1.6, orbitSegments)
      ];
      
      setupDone.value = true;
    }

    // Create atom group
    const atom = new THREE.Group();
    atomRef.current = atom;
    scene.add(atom);
    
    // Create nucleus
    const nucleusColor = new THREE.Color(color).getHex();
    const nucleus = new THREE.Mesh(
      atomGeometries.nucleus, 
      getMaterial(nucleusColor, 'nucleus')
    );
    atom.add(nucleus);
    
    // Create orbits and electrons
    const electrons = [];
    const brightColor = new THREE.Color(color).multiplyScalar(1.4).getHex();
    
    // Create 3 orbits at different rotations
    atomGeometries.orbits.forEach((geometry, i) => {
      const orbit = new THREE.Line(geometry, getMaterial(color, 'line'));
      
      // Rotate orbits to different planes around all axes for 3D effect
      if (i === 0) {
        orbit.rotation.x = Math.PI / 2;
      } else if (i === 1) {
        orbit.rotation.x = Math.PI / 3;
        orbit.rotation.y = Math.PI / 4;
      } else {
        orbit.rotation.x = Math.PI / 6;
        orbit.rotation.z = Math.PI / 3;
      }
      
      atom.add(orbit);
      
      // Add an electron to each orbit
      const electron = new THREE.Mesh(
        atomGeometries.electron,
        getMaterial(brightColor, 'electron')
      );
      
      atom.add(electron);
      electrons.push({
        mesh: electron,
        orbit: i,
        phase: Math.random() * Math.PI * 2 // Random starting position
      });
    });
    
    // Store electrons for animation
    electronsRef.current = electrons;

    // Animation loop - ultra optimized
    const animate = () => {
      if (!atomRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      
      frameIdRef.current = requestAnimationFrame(animate);
      
      // Very slow, gentle rotation for entire atom
      timeRef.current += 0.004;
      atomRef.current.rotation.y = timeRef.current * 0.08;
      atomRef.current.rotation.x = Math.sin(timeRef.current * 0.1) * 0.15;
      
      // Update electron positions
      electronsRef.current.forEach((electron, i) => {
        // Different speeds based on orbit (outer electrons move slower)
        const speed = 0.6 - (i * 0.15);
        const theta = timeRef.current * speed + electron.phase;
        
        // Orbit radius matches the orbit geometry
        const radius = 1.6 + (i * 0.6);
        
        // Position electrons based on their orbit orientation
        if (electron.orbit === 0) {
          electron.mesh.position.x = radius * Math.cos(theta);
          electron.mesh.position.z = radius * Math.sin(theta);
          electron.mesh.position.y = 0;
        } else if (electron.orbit === 1) {
          electron.mesh.position.x = radius * Math.cos(theta);
          electron.mesh.position.y = radius * Math.sin(theta) * Math.cos(Math.PI / 4);
          electron.mesh.position.z = radius * Math.sin(theta) * Math.sin(Math.PI / 4);
        } else {
          electron.mesh.position.x = radius * Math.cos(theta) * Math.cos(Math.PI / 6);
          electron.mesh.position.y = radius * Math.sin(theta);
          electron.mesh.position.z = radius * Math.cos(theta) * Math.sin(Math.PI / 6);
        }
      });
      
      // Render
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      atomRef.current = null;
      electronsRef.current = [];
      timeRef.current = 0;
    };
  }, [color, dimensions.width, dimensions.height]);

  return (
    <div 
      ref={mountRef} 
      className={`model-cube-container flex justify-center items-center ${className}`}
      style={{ width: dimensions.width, height: dimensions.height }}
    />
  );
};

export default ModelCube; 