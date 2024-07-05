// Initialize the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // Background color white

// Initialize the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 100; // Position camera further back

// Initialize the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lighting to the scene
const ambientLight = new THREE.AmbientLight(0x808080); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Decreased darkness
directionalLight.position.set(10, 10, 10).normalize();
scene.add(directionalLight);

// Create an array to hold dots and lines
const interactiveDots = [];
const nonInteractiveDots = [];
const lines = [];

// Normal and fast speeds
const normalSpeed = 0.005;
const hoverSpeed = 0.001; // Slower speed on hover
const smallDotFastSpeed = 0.08;

// Function to create dots
function createDot(x, y, z, text, size = 2, interactable = true) {
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: interactable ? 0xffd700 : 0xd3d3d3 }); // Gold for interactive, light gray for non-interactive
    const dot = new THREE.Mesh(geometry, material);

    dot.position.set(x, y, z);
    dot.userData = {
        text,
        direction: new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(),
        moving: true,
        speed: normalSpeed,
        originalSize: size
    };

    if (interactable) {
        interactiveDots.push(dot);
    } else {
        nonInteractiveDots.push(dot);
    }

    scene.add(dot);
}

// Function to create lines
function createLine(dot1, dot2, isThin = false) {
    const material = new THREE.LineBasicMaterial({ color: 0xd3d3d3, linewidth: isThin ? 0.5 : 1, opacity: isThin ? 0.5 : 1, transparent: true }); // Light gray lines
    const geometry = new THREE.BufferGeometry().setFromPoints([dot1.position, dot2.position]);
    const line = new THREE.Line(geometry, material);

    lines.push({ geometry, line, dot1, dot2 });
    scene.add(line);
}

// Create 5 interactive dots
for (let i = 0; i < 5; i++) {
    createDot(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50, `Dot ${i + 1}`);
}

// Create 15 non-interactive dots
for (let i = 0; i < 15; i++) {
    createDot(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50, '', 1, false);
}

// Create additional non-interactive dots groups on the edges
for (let i = 0; i < 15; i++) {
    createDot(Math.random() * 50 - 100, Math.random() * 50 - 100, Math.random() * 50 - 100, '', 0.5, false);
}
for (let i = 0; i < 15; i++) {
    createDot(Math.random() * 50 + 50, Math.random() * 50 + 50, Math.random() * 50 + 50, '', 0.5, false);
}

// Function to create more lines between dots
function createAllLines() {
    const allDots = interactiveDots.concat(nonInteractiveDots);
    for (let i = 0; i < allDots.length; i++) {
        for (let j = i + 1; j < allDots.length; j++) {
            if (Math.random() > 0.5) { // Increased number of lines
                createLine(allDots[i], allDots[j], !interactiveDots.includes(allDots[i]) || !interactiveDots.includes(allDots[j]));
            }
        }
    }
}

// Create all lines between dots
createAllLines();

// Add raycaster for interactivity
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let INTERSECTED;

// Mouse move event
function onDocumentMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Mouse click event
function onDocumentMouseClick(event) {
    if (INTERSECTED) {
        const popup = document.getElementById('popup');
        const popupText = document.getElementById('popup-text');
        popupText.innerText = INTERSECTED.userData.text;

        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(INTERSECTED.matrixWorld);
        vector.project(camera);
        vector.x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        vector.y = -(vector.y * 0.5 - 0.5) * window.innerHeight;

        popup.style.left = `${vector.x}px`;
        popup.style.top = `${vector.y}px`;
        popup.style.display = 'block';
        popup.style.opacity = '0';
        setTimeout(() => { popup.style.opacity = '1'; }, 10);
        INTERSECTED.userData.moving = false;
    }
}

// Close popup function
function closePopup() {
    const popup = document.getElementById('popup');
    popup.style.opacity = '0';
    setTimeout(() => {
        popup.style.display = 'none';
        if (INTERSECTED) INTERSECTED.userData.moving = true;
        INTERSECTED = null;
    }, 300);
}

document.addEventListener('mousemove', onDocumentMouseMove, false);
document.addEventListener('click', onDocumentMouseClick, false);

// Close popup by clicking outside
document.addEventListener('click', (event) => {
    const popup = document.getElementById('popup');
    if (popup.style.display === 'block' && !popup.contains(event.target) && INTERSECTED) {
        closePopup();
    }
});

// Function to update the lines to follow the moving dots
function updateLines() {
    lines.forEach(({ geometry, dot1, dot2 }) => {
        geometry.setFromPoints([dot1.position, dot2.position]);
    });
}

// Function to move dots in random directions
function moveDots(dotsArray) {
    dotsArray.forEach((dot) => {
        if (dot.userData.moving) {
            // Update position
            dot.position.addScaledVector(dot.userData.direction, dot.userData.speed);

            // Reverse direction if out of bounds
            if (dot.position.x < -100 || dot.position.x > 100) dot.userData.direction.x *= -1;
            if (dot.position.y < -100 || dot.position.y > 100) dot.userData.direction.y *= -1;
            if (dot.position.z < -100 || dot.position.z > 100) dot.userData.direction.z *= -1;
        }
    });
}

// Function to highlight lines connected to hovered dot
function highlightLines(dot) {
    lines.forEach(line => {
        if (line.dot1 === dot || line.dot2 === dot) {
            new TWEEN.Tween(line.line.material).to({ color: new THREE.Color(0xffd700) }, 500).easing(TWEEN.Easing.Quadratic.Out).start();
            new TWEEN.Tween(line.line.material).to({ linewidth: 2 }, 500).easing(TWEEN.Easing.Quadratic.Out).start();
            setTimeout(() => {
                new TWEEN.Tween(line.line.material).to({ color: new THREE.Color(0xd3d3d3) }, 500).easing(TWEEN.Easing.Quadratic.Out).start();
                new TWEEN.Tween(line.line.material).to({ linewidth: 1 }, 500).easing(TWEEN.Easing.Quadratic.Out).start();
            }, 1000); // Return to normal after 1 second
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Move dots
    moveDots(interactiveDots);
    moveDots(nonInteractiveDots);

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveDots);

    if (intersects.length > 0) {
        if (INTERSECTED != intersects[0].object) {
            if (INTERSECTED) {
                INTERSECTED.userData.moving = true;  // Resume movement for previously intersected dot
                new TWEEN.Tween(INTERSECTED.scale).to({ x: 1, y: 1, z: 1 }, 300).start(); // Smooth transition back
                new TWEEN.Tween(INTERSECTED.material.emissive).to({ r: 0, g: 0, b: 0 }, 300).start(); // Remove outer glow
                interactiveDots.forEach(dot => {
                    if (dot !== INTERSECTED) dot.userData.speed = normalSpeed; // Reset speed for interactive dots
                });
                nonInteractiveDots.forEach(dot => {
                    dot.userData.speed = normalSpeed; // Reset speed for non-interactive dots
                });
                document.body.style.cursor = 'auto'; // Reset cursor
            }
            INTERSECTED = intersects[0].object;
            INTERSECTED.userData.moving = false;   // Stop movement for currently intersected dot
            new TWEEN.Tween(INTERSECTED.scale).to({ x: 2.5, y: 2.5, z: 2.5 }, 300).start(); // Smooth transition grow
            new TWEEN.Tween(INTERSECTED.material.emissive).to({ r: 1, g: 0.84, b: 0 }, 300).start(); // Outer glow gold
            document.body.style.cursor = 'pointer'; // Change cursor to pointer
            interactiveDots.forEach(dot => {
                if (dot !== INTERSECTED) dot.userData.speed = hoverSpeed; // Slow down interactive dots
            });
            nonInteractiveDots.forEach(dot => {
                dot.userData.speed = hoverSpeed; // Slow down non-interactive dots
            });

            // Highlight lines connected to hovered dot
            highlightLines(INTERSECTED);
        }
    } else {
        if (INTERSECTED) {
            INTERSECTED.userData.moving = true;  // Resume movement if no dot is intersected
            new TWEEN.Tween(INTERSECTED.scale).to({ x: 1, y: 1, z: 1 }, 300).start(); // Smooth transition back
            new TWEEN.Tween(INTERSECTED.material.emissive).to({ r: 0, g: 0, b: 0 }, 300).start(); // Remove outer glow
            interactiveDots.forEach(dot => dot.userData.speed = normalSpeed); // Reset speed for interactive dots
            nonInteractiveDots.forEach(dot => dot.userData.speed = normalSpeed); // Reset speed for non-interactive dots
            document.body.style.cursor = 'auto'; // Reset cursor
        }
        INTERSECTED = null;
    }

    // Update lines to follow the dots
    updateLines();

    TWEEN.update();

    renderer.render(scene, camera);
}

animate();

// Zoom in and out with scroll
document.addEventListener('wheel', (event) => {
    camera.position.z += event.deltaY * 0.1;
    camera.position.z = Math.max(50, Math.min(200, camera.position.z)); // Min zoom 50, max zoom 200
});
