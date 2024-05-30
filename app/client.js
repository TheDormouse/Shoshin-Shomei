'use client';
import { useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Stats, StatsGl, OrbitControls } from '@react-three/drei';
import * as THREE from 'three'
const Scene = () => {
    const gltf = useLoader(GLTFLoader, './untitled.glb');
    const { camera, scene } = useThree();

    useEffect(() => {
        const spawn = scene && scene.children[0]?.children?.find((val) => val.name === "Spawn")
        if (spawn) {
            const geometry = new THREE.SphereGeometry(1, 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.copy(spawn.position);
            scene.add(sphere);
        }
    }, [scene]);
    useEffect(() => {
        if (gltf.scene && gltf.cameras.length > 0) {
            const mainCamera = gltf.cameras[0]; // Assuming the main camera is the first one
            console.log(gltf)
            camera.copy(mainCamera);
            console.debug('Active camera set to main camera from GLB');
        }
    }, [gltf]);

    useEffect(() => {
        if (gltf.scene) {
            console.debug('GLB file loaded into the scene:', gltf.scene);
        }
    }, [gltf]);

    return (
        <>
            <primitive object={gltf.scene} position={[0, 0, 0]} />
        </>
    );
}

const Avatar = async ({api}) => {
    const { leftShoulder, rightShoulder } = useControls({
      leftShoulder: { value: 0, min: -1, max: 1 },
      rightShoulder: { value: 0, min: -1, max: 1 }
    })
    const { scene, camera } = useThree()
    const gltf = useGLTF('/three-vrm-girl.vrm')
    const avatar = useRef()
    const [bonesStore, setBones] = useState({})
    const res = await fetch(api.url, {
        headers: {
            'Api-Key': api.token
        }
    });
    const data = await res.json();
  
    useEffect(() => {
      if (gltf) {
        VRMUtils.removeUnnecessaryJoints(gltf.scene)
        VRM.from(gltf).then((vrm) => {
          avatar.current = vrm
          vrm.lookAt.target = camera
          vrm.humanoid.getBoneNode(VRMSchema.HumanoidBoneName.Hips).rotation.y = Math.PI
  
          const bones = {
            neck: vrm.humanoid.getBoneNode(VRMSchema.HumanoidBoneName.Neck),
            hips: vrm.humanoid.getBoneNode(VRMSchema.HumanoidBoneName.Hips),
            LeftShoulder: vrm.humanoid.getBoneNode(VRMSchema.HumanoidBoneName.LeftShoulder),
            RightShoulder: vrm.humanoid.getBoneNode(VRMSchema.HumanoidBoneName.RightShoulder)
          }
  
          // bones.RightShoulder.rotation.z = -Math.PI / 4
  
          setBones(bones)
        })
      }
    }, [scene, gltf, camera])
  
    useFrame(({ clock }, delta) => {
      if (avatar.current) {
        avatar.current.update(delta)
      }
      if (bonesStore.neck) {
        const t = clock.getElapsedTime()
        bonesStore.neck.rotation.y = (Math.PI / 4) * Math.sin(t * Math.PI)
      }
      if (bonesStore.LeftShoulder) {
        bonesStore.LeftShoulder.position.y = leftShoulder
        bonesStore.LeftShoulder.rotation.z = leftShoulder * Math.PI
      }
      if (bonesStore.RightShoulder) {
        bonesStore.RightShoulder.rotation.z = rightShoulder * Math.PI
      }
    })
    return <primitive object={gltf.scene}></primitive>
  }

export default function Client({api}) {
    return (
        <Canvas style={{ background: '#333F47', width: '100vw', height: '100vh' }} orthographic>
            <Scene/>
            <OrbitControls />
            <Stats />
            <StatsGl />
        </Canvas>
    );
}