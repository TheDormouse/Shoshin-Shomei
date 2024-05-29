'use client';
import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrthographicCamera, GridHelper, Stats, StatsGl, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

const mixamoVRMRigMap = {
    mixamorigHips: 'hips',
    mixamorigSpine: 'spine',
    mixamorigSpine1: 'chest',
    mixamorigSpine2: 'upperChest',
    mixamorigNeck: 'neck',
    mixamorigHead: 'head',
    mixamorigLeftShoulder: 'leftShoulder',
    mixamorigLeftArm: 'leftUpperArm',
    mixamorigLeftForeArm: 'leftLowerArm',
    mixamorigLeftHand: 'leftHand',
    mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
    mixamorigLeftHandThumb2: 'leftThumbProximal',
    mixamorigLeftHandThumb3: 'leftThumbDistal',
    mixamorigLeftHandIndex1: 'leftIndexProximal',
    mixamorigLeftHandIndex2: 'leftIndexIntermediate',
    mixamorigLeftHandIndex3: 'leftIndexDistal',
    mixamorigLeftHandMiddle1: 'leftMiddleProximal',
    mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
    mixamorigLeftHandMiddle3: 'leftMiddleDistal',
    mixamorigLeftHandRing1: 'leftRingProximal',
    mixamorigLeftHandRing2: 'leftRingIntermediate',
    mixamorigLeftHandRing3: 'leftRingDistal',
    mixamorigLeftHandPinky1: 'leftLittleProximal',
    mixamorigLeftHandPinky2: 'leftLittleIntermediate',
    mixamorigLeftHandPinky3: 'leftLittleDistal',
    mixamorigRightShoulder: 'rightShoulder',
    mixamorigRightArm: 'rightUpperArm',
    mixamorigRightForeArm: 'rightLowerArm',
    mixamorigRightHand: 'rightHand',
    mixamorigRightHandPinky1: 'rightLittleProximal',
    mixamorigRightHandPinky2: 'rightLittleIntermediate',
    mixamorigRightHandPinky3: 'rightLittleDistal',
    mixamorigRightHandRing1: 'rightRingProximal',
    mixamorigRightHandRing2: 'rightRingIntermediate',
    mixamorigRightHandRing3: 'rightRingDistal',
    mixamorigRightHandMiddle1: 'rightMiddleProximal',
    mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
    mixamorigRightHandMiddle3: 'rightMiddleDistal',
    mixamorigRightHandIndex1: 'rightIndexProximal',
    mixamorigRightHandIndex2: 'rightIndexIntermediate',
    mixamorigRightHandIndex3: 'rightIndexDistal',
    mixamorigRightHandThumb1: 'rightThumbMetacarpal',
    mixamorigRightHandThumb2: 'rightThumbProximal',
    mixamorigRightHandThumb3: 'rightThumbDistal',
    mixamorigLeftUpLeg: 'leftUpperLeg',
    mixamorigLeftLeg: 'leftLowerLeg',
    mixamorigLeftFoot: 'leftFoot',
    mixamorigLeftToeBase: 'leftToes',
    mixamorigRightUpLeg: 'rightUpperLeg',
    mixamorigRightLeg: 'rightLowerLeg',
    mixamorigRightFoot: 'rightFoot',
    mixamorigRightToeBase: 'rightToes',
};

function loadMixamoAnimation(asset, vrm) {
    console.log("Loading Mixamo Animation");
    const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com');
    if (!clip) {
        console.error("No 'mixamo.com' animation found in the asset");
        return null;
    }
    const tracks = [];

    clip.tracks.forEach((track) => {
        const trackSplitted = track.name.split('.');
        const mixamoRigName = trackSplitted[0];
        const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
        const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;

        if (vrmNodeName != null) {
            const propertyName = trackSplitted[1];
            if (track instanceof THREE.QuaternionKeyframeTrack) {
                tracks.push(new THREE.QuaternionKeyframeTrack(
                    `${vrmNodeName}.${propertyName}`,
                    track.times,
                    track.values.map((v, i) => ((vrm.meta?.metaVersion === '0' && (i % 2) === 0) ? -v : v)),
                ));
            } else if (track instanceof THREE.VectorKeyframeTrack) {
                tracks.push(new THREE.VectorKeyframeTrack(
                    `${vrmNodeName}.${propertyName}`,
                    track.times,
                    track.values.map((v, i) => ((vrm.meta?.metaVersion === '0' && (i % 3) !== 1) ? -v : v) * 0.01),
                ));
            }
        }
    });

    return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
}

const Scene = ({api}) => {
    const { scene, camera } = useThree();
    const gridSize = 5;
    const [objects, setObjects] = useState([]);
    const clock = new THREE.Clock();

    console.log({api})

    useFrame(() => {
        camera.updateProjectionMatrix();
        const delta = clock.getDelta();
        objects.forEach((vrm) => {
            vrm.userData.mixer.update(delta);
            vrm.userData.vrm.update();
        });
    });

    useEffect(() => {
        const loadVRM = async (url, index) => {
            console.log(`Loading VRM from URL: ${url}`);
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMLoaderPlugin(parser));
        
            loader.load(url, (vrm) => {
                console.log("VRM loaded successfully");
                const walkClip = loadMixamoAnimation(window.anim, vrm.userData.vrm);
                if (!walkClip) {
                    console.error("Failed to load Mixamo animation for VRM");
                    return;
                }
        
                vrm.scene.scale.set(0.5, 0.5, 0.5);
                const x = index % gridSize;
                const z = Math.floor(index / gridSize);
                vrm.scene.position.set(x - (gridSize / 2) + 0.5, 0, z - (gridSize / 2) + 0.5);
        
                vrm.userData.mixer = new THREE.AnimationMixer(vrm.scene);
                vrm.userData.action = vrm.userData.mixer.clipAction(walkClip);
                vrm.userData.action.play();
                vrm.scene.rotateY(Math.PI);
        
                setObjects((prevObjects) => [...prevObjects, vrm]);
        
                // Add the VRM to the scene
                scene.add(vrm.scene);
            }, undefined, (error) => {
                console.error(`Failed to load VRM from URL: ${url}`, error);
            });
        };

        const fetchData = async () => {
            console.log("Fetching data from API");
            const response = await fetch(api.url, {
                headers: {
                    'Api-Key': api.token
                }
            });

            const data = await response.json();
            const fbxLoader = new FBXLoader();
            window.anim = await fbxLoader.loadAsync("./Rumba Dancing.fbx");

            for (let i = 0; i < (gridSize * gridSize); i++) {
                const vrm = data[Math.floor(Math.random() * data.length)];
                loadVRM(vrm["metadata"]["assets"][0]["files"][0]["url"], i);
            }
        };

        fetchData();
    }, []);

    return (
        <>
            <ambientLight intensity={1.0} />
            <directionalLight intensity={0.5} position={[0, 1, 0]} target-position={[-5, 0, -5]} />
            <OrbitControls />
            <gridHelper args={[gridSize, gridSize]} />
        </>
    );
};

export default function Client({api}) {
    return (
        <Canvas style={{ background: '#333F47', width: '100vw', height: '100vh' }} orthographic>
            <Scene api={api}/>
            <Stats />
            <StatsGl />
        </Canvas>
    );
}
