import * as THREE from 'three';
import{OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { Const } from 'three/src/nodes/core/VarNode.js';
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
for(let i = 0; i < 2500; i++){
    starVertices.push(
        (Math.random()-0.5)*300,
        (Math.random()-0.5)*300,
        (Math.random()-0.5)*300
    );
}
starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starVertices,3)
);
const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({
        color:0xffffff,
        size:0.5
    })
);
scene.add(stars);
function particle(color){
    const geometry = new THREE.SphereGeometry(.38,32,32);
    const material = new THREE.MeshStandardMaterial({
        color,
        emissiveIntensity:.3,
        metalness:.2,
        roughness:.3
    });
    return new THREE.Mesh(geometry,material);
}
const nucleus = new THREE.Group();
for(let i=0;i<12;1++){
    const atom = i<6
    ? particle(0xff3333)
    : particle(0x3399ff);
    atom.position.set(
        (Math.random()-5)*1.6,
        (Math.random()-5)*1.6,
        (Math.random()-5)*1.6
    );
    nucleus.add(atom);
}
scene.add(nucleus);
function createShell(radius){
    const curve = new THREE.EllipseCurve(
        0,
        0,
        radius,
        radius,
        0,
        Math.PI*2
    );
    const points = curve.getPoints(180);
    const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map(p=>new THREE.Vector3(p.x,0,p.y))
    );
    const material = new THREE.LineBasicMaterial({
        color:0xffffff,
        transparent:true,
        opacity:.35
    });
    const shell = new THREE.LineLoop(
        geometry,
        material
    );
    shell.rotation.x = Math.PI/2;
    scene.add(shell);
}
createShell(3);
createShell(5);
