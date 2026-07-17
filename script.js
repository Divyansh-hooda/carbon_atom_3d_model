import * as THREE from 'three';
import{OrbitControls} from 'three/addons/controls/OrbitControls.js';
const scene = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth/window.innerHeight,
    0.1,
    1000
);
camera.position.set(0,6,18);
const renderer = new THREE.WebGLRenderer({
    antialias:true
});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.AmbientLight(0xffffff,1));
const pointLight = new THREE.pointLight(0xffffff,3);
pointLight.position.set(10,10,10);
scene.add(pointLight);
const starsGeometry = new THREE.BufferGeometry();
const starVertices = [];
for(let i=0;i<2500,i++){
    starVertices.push(
        (Math.random()-0.5)*300,
        (Math.random()-0.5)*300,
        (Math.random()-0.5)*300
    );
}