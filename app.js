import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { OrbitControls } from '/OrbitControls.js';




function init() {
  // Add score text to the scene
  scoreText = createScoreText(snake.body.length);
  scoreText.position.set(-0.95, -0.45, 0);
  scene.add(scoreText);

  // Start the animation loop
  animate();
  [foodX, foodY, food] = spawnFood();
}

function onTouchMoveSnake(event) {
  if (event.touches.length !== 1) return;
  event.stopPropagation(); // Add this line to prevent the default behavior

  const touch = event.touches[0];
  const width = window.innerWidth;
  const height = window.innerHeight;
  const currentDirection = snake.direction;

  if (touch.clientY < height / 3 && currentDirection !== 'down' && currentDirection !== 'up') {
    snake.direction = 'up';
  } else if (touch.clientY > (2 * height) / 3 && currentDirection !== 'up' && currentDirection !== 'down') {
    snake.direction = 'down';
  } else if (touch.clientX < width / 3 && currentDirection !== 'right' && currentDirection !== 'left') {
    snake.direction = 'left';
  } else if (touch.clientX > (2 * width) / 3 && currentDirection !== 'left' && currentDirection !== 'right') {
    snake.direction = 'right';
  }
}

document.addEventListener('touchstart', onTouchMoveSnake);
document.addEventListener('touchmove', onTouchMoveSnake);

function createScoreText(score) {
  const scoreTextGeometry = new THREE.TextGeometry(`Score: ${score}`, {
    font: font,
    size: 0.1,
    height: 0.01,
  });

  // Center the text geometry based on its bounding box
  scoreTextGeometry.computeBoundingBox();
  const textWidth = scoreTextGeometry.boundingBox.max.x - scoreTextGeometry.boundingBox.min.x;
  scoreTextGeometry.translate(-textWidth / 2, 0, 0);

  const scoreTextMaterial = new THREE.MeshStandardMaterial({ color: 0xff8800 });
  const scoreTextMesh = new THREE.Mesh(scoreTextGeometry, scoreTextMaterial);

  return scoreTextMesh;
}

// Vertex shader
const rainbowVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader
const rainbowFragmentShader = `
  uniform float time;
  varying vec2 vUv;

  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    float hue = mod(vUv.y * 10.0 + time * 0.5, 1.0);
    vec3 color = hsv2rgb(vec3(hue, 1.0, 1.0));
    gl_FragColor = vec4(color, 1.0);
  }
`;

function createSnakeHeadMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: rainbowVertexShader,
    fragmentShader: rainbowFragmentShader,
    uniforms: {
      time: { value: 0.0 },
    },
  });
}

function createRedMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xff0000});
}


// Define Snake class
class Snake {
  constructor() {
    this.body = [[15, 15]];
    this.direction = 'right';
    this.grow = 0;
  }

  checkCollision() {
    const [headX, headY] = this.body[0];

    for (let i = 1; i < this.body.length; i++) {
      const [bodyX, bodyY] = this.body[i];
      if (headX === bodyX && headY === bodyY) {
        return true;
      }
    }

    return false;
  }

  move() {
    const head = this.body[0].slice(); // Get the current head position

    switch (this.direction) {
      case 'up':
        head[1]--;
        break;
      case 'down':
        head[1]++;
        break;
      case 'left':
        head[0]--;
        break;
      case 'right':
        head[0]++;
        break;
    }

    // Wrap the head position around the grid
    head[0] = (head[0] + gridSize) % gridSize;
    head[1] = (head[1] + gridSize) % gridSize;
    this.body.unshift(head); // Add new head to the body
    if (this.grow > 0) {
      this.grow--; // Decrease grow counter
    } else {
      this.body.pop(); // Remove the tail
    }
    // console.log("Snake Head Location: ", head[0], " ", head[1]);
    // console.log("Snake Body Coords: ", this.body);
  }
}
// Calculate the size and gap of the small cubes
const gridSize = 30;
const cubeSize = 1.5 / gridSize;
const gap = 0.01;
let foodX, foodY, food;

const snake = new Snake();



// Create an array to store the cube references
var cubes = [];

function spawnFood() {
  const x = Math.floor(Math.random() * gridSize);
  const y = Math.floor(Math.random() * gridSize);

  // Create a white cube as food
  const foodGeometry = new THREE.BoxGeometry(cubeSize - gap, 0.1 - gap, 2.0 / gridSize - gap);
  const foodMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const food = new THREE.Mesh(foodGeometry, foodMaterial);
  food.position.x = -0.75 + x * cubeSize + cubeSize / 2;
  food.position.y = 0.05;
  food.position.z = -1.0 + y * (2.0 / gridSize) + (2.0 / gridSize) / 2;
  scene.add(food);

  return [x, y, food];
}


// Handle keyboard input
document.addEventListener('keydown', (event) => {
  const { key } = event;
  const currentDirection = snake.direction;

  if (key === 'ArrowUp' && currentDirection !== 'down' && currentDirection !== 'up') {
    snake.direction = 'up';
  } else if (key === 'ArrowDown' && currentDirection !== 'up' && currentDirection !== 'down') {
    snake.direction = 'down';
  } else if (key === 'ArrowLeft' && currentDirection !== 'right' && currentDirection !== 'left') {
    snake.direction = 'left';
  } else if (key === 'ArrowRight' && currentDirection !== 'left' && currentDirection !== 'right') {
    snake.direction = 'right';
  }
});

let gameOverText;
let gameOver = false;
let previousHead;

// Update snake position
function updateSnake() {
  if (snake.body.length > 0) {
    previousHead = [...snake.body[0]];
  }
  if (!gameOver) {
  // Clear previous snake body
  snake.body.forEach(([x, y]) => {
    cubes[x][y].material.opacity = 0.07;
  });



  // Move the snake
  snake.move();

  // Draw new snake body
  snake.body.forEach(([x, y]) => {
    cubes[x][y].material.opacity = 1.00;
  });
  // Check if the snake eats the food
  if (snake.body[0][0] === foodX && snake.body[0][1] === foodY) {
    snake.grow += 3; // Increase grow counter
    scene.remove(food); // Remove the eaten food
    [foodX, foodY, food] = spawnFood(); // Spawn new food
  }
    // Update the score text
    scene.remove(scoreText);
    scoreText = createScoreText(snake.body.length);
    scoreText.position.set(-0.95, -0.45, 0);
    scene.add(scoreText);
  }

  // Update the snake body opacity
  for (let i = 0; i < snake.body.length; i++) {
    const [x, y] = snake.body[i];
    const cube = cubes[x][y];
    if (i === 0) {
      cube.material = createSnakeHeadMaterial(); // Set the custom material for the snake head
      
      // Set the material of the previous head cube back to the transparent blue material
      if (previousHead) {
        const [prevHeadX, prevHeadY] = previousHead;
        const prevHeadCube = cubes[prevHeadX][prevHeadY];
        prevHeadCube.material = new THREE.MeshStandardMaterial({ color: 0x0000ff, transparent: true, opacity: 0.07 });
      }
    } else {
      cube.material.opacity = gameOver ? 1 : 0.99; // Keep the snake body opaque when the game is over
    }
  }
  // Check if the snake touches its tail
  if (snake.checkCollision()) {
    const [collisionX, collisionY] = snake.body[0];
    const collisionCube = cubes[collisionX][collisionY];
    collisionCube.material = createRedMaterial();
    // collisionCube.material.opacity = 0.90;
    collisionCube.material.color.set(0xff0000); // Set the collision cube color to red

    if (!gameOverText) {
      gameOverText = createGameOverText();
      scene.add(gameOverText);
    }
    gameOver = true; // Set the game over state
    // return; // Pause the game
    
    
  }
  
}

function createGameOverText() {
  const gameOverTextGeometry = new THREE.TextGeometry('Game Over', {
    font: font,
    size: 0.2,
    height: 0.01,
  });

  // Center the text geometry based on its bounding box
  gameOverTextGeometry.computeBoundingBox();
  const textWidth = gameOverTextGeometry.boundingBox.max.x - gameOverTextGeometry.boundingBox.min.x;
  gameOverTextGeometry.translate(-textWidth / 2, 0, 0);

  const gameOverTextMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const gameOverTextMesh = new THREE.Mesh(gameOverTextGeometry, gameOverTextMaterial);
  gameOverTextMesh.position.set(0, 0.3, 0);

  return gameOverTextMesh;
}



// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const aspectRatio = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(-1 * aspectRatio, 1 * aspectRatio, 1, -1, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create the cube
const width = 2.0;
const height = 0.01;
const depth = 2.0;
const geometry = new THREE.BoxGeometry(width, height, depth);
const material = new THREE.MeshLambertMaterial({ color: 0x808080, transparent: false, opacity: 1.00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Create translucent blue material
const blueMaterial = () => {
  return new THREE.MeshStandardMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0.07,
  });
};



// Add cubes in a 30x30 grid
for (let i = 0; i < gridSize; i++) {
  cubes[i] = [];
  for (let j = 0; j < gridSize; j++) {
    const smallCubeGeometry = new THREE.BoxGeometry( cubeSize - gap, 0.1 - gap, 2.0 / gridSize - gap);
    const smallCube = new THREE.Mesh(smallCubeGeometry, blueMaterial());
    smallCube.position.x = -0.75 + i * cubeSize + cubeSize / 2;
    smallCube.position.y = 0.05;
    smallCube.position.z = -1.0 + j * (2.0 / gridSize) + (2.0 / gridSize) / 2; // Fix Z-axis position calculation
    
    scene.add(smallCube);
    cubes[i][j] = smallCube;
  }
}

// Set up isometric camera
const isoAngle = Math.PI / 4;
camera.position.set(1, 1, 1).multiplyScalar(Math.sqrt(2));
camera.rotation.order = 'YXZ';
camera.rotation.y = Math.atan(Math.sin(isoAngle));
camera.rotation.x = Math.atan(Math.sin(isoAngle));
camera.lookAt(scene.position);

// Add lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(-1, 2, 1);
scene.add(light);

// Load sky texture
// const skyboxLoader = new THREE.CubeTextureLoader();
// const skyboxTexture = skyboxLoader.load([
//   'textures/sky_texture.jpg',
//   'textures/sky_texture.jpg',
//   'textures/sky_texture.jpg',
//   'textures/sky_texture.jpg',
//   'textures/sky_texture.jpg',
//   'textures/sky_texture.jpg',
// ]);
// scene.background = skyboxTexture;

// Load sky texture
const skyTextureLoader = new THREE.TextureLoader();
const skyTexture = skyTextureLoader.load('textures/sky_texture.jpg', () => {
  skyTexture.wrapS = THREE.RepeatWrapping;
  skyTexture.wrapT = THREE.RepeatWrapping;
  skyTexture.repeat.set(3000, 500);
});

// Create a large background plane
// const skyPlaneGeometry = new THREE.PlaneGeometry(1000, 1000);
// const skyPlaneMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.DoubleSide });
// const skyPlane = new THREE.Mesh(skyPlaneGeometry, skyPlaneMaterial);
// skyPlane.position.set(0, 0, -100);
// scene.add(skyPlane);

// Create a large background plane
const skyPlaneGeometry = new THREE.PlaneGeometry(1000, 1000);
const skyPlaneMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.DoubleSide });
const skyPlane = new THREE.Mesh(skyPlaneGeometry, skyPlaneMaterial);
skyPlane.position.copy(camera.position); // Position the plane at the center of the camera's view
skyPlane.position.z -= 180; // Move the plane away from the camera along the Z-axis
skyPlane.lookAt(camera.position); // Rotate the plane to face the camera
scene.add(skyPlane);

// Render the scene
function animate() {
  requestAnimationFrame(animate);
  // Update time uniform for the snake head material
  if (snake.body.length > 0) {
    const [headX, headY] = snake.body[0];
    const headCube = cubes[headX][headY];
    if (headCube.material.uniforms) {
      headCube.material.uniforms.time.value += 0.01;
    }
  }
  updateSnake(); // Update the snake position.  If you disable this you get your clear grid back
  renderer.render(scene, camera);

}

const controls = new OrbitControls(camera, renderer.domElement);
document.getElementById('toggleCameraLock').addEventListener('click', () => {
  controls.enabled = !controls.enabled;
});

controls.target.copy(scene.position);
controls.update();

// Load font
let font;
let scoreText;

const fontLoader = new THREE.FontLoader();
fontLoader.load('fonts/helvetiker_regular.typeface.json', (loadedFont) => {
  font = loadedFont;
  init();
});

