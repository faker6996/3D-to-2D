"use client";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader";

export default function PCDBoxTool() {
  const mountRef = useRef();
  const [raycaster] = useState(new THREE.Raycaster());
  const [mouse] = useState(new THREE.Vector2());
  const [intersectedObject, setIntersectedObject] = useState(null);

  useEffect(() => {
    let scene, camera, renderer, controls, transformControls;
    let box;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);

    // Load PCD
    const loader = new PCDLoader();
    loader.load("CMR_GT_Lidar.pcd", (points) => {
      points.geometry.center();
      scene.add(points);
    });
    // Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enablePan = false;
    controls.enableZoom = true;

    // Add grid helper
    scene.add(new THREE.GridHelper(10, 10));

    // Add box to the scene
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    box = new THREE.Mesh(geometry, material);
    scene.add(box);

    // TransformControls
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.attach(box);
    scene.add(transformControls);

    // Listen to mouse events
    window.addEventListener("mousemove", onMouseMove, false);
    window.addEventListener("click", onMouseClick, false);

    // Resize
    window.addEventListener("resize", onWindowResize);
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Keyboard switch
    window.addEventListener("keydown", (e) => {
      if (e.key === "t") transformControls.setMode("translate");
      if (e.key === "s") transformControls.setMode("scale");
    });

    // Raycasting logic
    function onMouseMove(event) {
      // Normalize mouse coordinates to (-1 to 1)
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update the raycaster
      raycaster.update(camera, renderer.domElement);
    }

    function onMouseClick() {
      // Perform raycasting
      raycaster.setFromCamera(mouse, camera);

      // Check for intersections with the scene
      const intersects = raycaster.intersectObject(scene, true);

      if (intersects.length > 0) {
        // Set position of box to the intersected point
        const intersect = intersects[0];
        box.position.copy(intersect.point); // Move the box to the point where ray intersects
      }
    }

    // Animate
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      mountRef.current.removeChild(renderer.domElement);
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onMouseClick);
    };
  }, [raycaster, mouse]);

  return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
}
