import * as THREE from 'three'
import { useRef, Suspense } from 'react'
import { Canvas, useFrame, extend } from '@react-three/fiber'
import {
    Instances,
    Instance,
    Environment,
    OrbitControls,
} from '@react-three/drei'
import { EffectComposer, SSAO } from '@react-three/postprocessing'
import SimplexNoise from 'simplex-noise'

import { MeshLine, MeshLineMaterial } from './meshline'
const simplex = new SimplexNoise()

extend({ MeshLine, MeshLineMaterial })

let pointsGroup = []

const radius = 10
const r = () => Math.max(0.2, Math.random())

const pos = new THREE.Vector3(
    Math.sin(0) * radius * r(),
    Math.cos(0) * radius * r(),
    0
)

const points = new Array(30).fill().map((_, index) => {
    const angle = (index / 20) * Math.PI * 2
    return pos
        .add(
            new THREE.Vector3(
                Math.sin(angle) * radius * r(),
                Math.cos(angle) * radius * r(),
                0
            )
        )
        .clone()
})
const curve = new THREE.CatmullRomCurve3(points).getPoints(100)

const { MathUtils } = THREE

const particles = Array.from({ length: 100 }, () => ({
    baseX: MathUtils.randFloatSpread(50),
    factor: MathUtils.randInt(10, 100),
    speed: MathUtils.randFloat(1, 1),
    xFactor: MathUtils.randFloatSpread(10),
    yFactor: MathUtils.randFloatSpread(60),
    zFactor: MathUtils.randFloatSpread(40),
}))

export default function Basic() {
    return (
        <Canvas
            //   linear
            shadows
            dpr={[1, 2]}
            gl={{ alpha: false, antialias: true }}
            camera={{ fov: 75, position: [0, 0, 80], near: 10, far: 150 }}
        >
            <color attach="background" args={['#fff']} />
            <fog attach="fog" args={['black', 60, 150]} />
            <ambientLight intensity={1.5} />
            <pointLight position={[50, 100, 20]} intensity={2} castShadow />
            {/* <pointLight position={[-100, 100, -100]} intensity={10} color="red" /> */}
            <Bubbles />
            <OrbitControls />

            <EffectComposer multisampling={1}>
                <SSAO
                    samples={5}
                    radius={3}
                    intensity={20}
                    luminanceInfluence={0.1}
                    color="red"
                />
            </EffectComposer>
            <Suspense fallback={null}>
                <Environment preset="city" />
            </Suspense>
        </Canvas>
    )
}

function Bubbles() {
    const ref = useRef()
    useFrame(
        (state, delta) =>
            void (ref.current.rotation.y = MathUtils.damp(
                ref.current.rotation.y,
                (-state.mouse.x * Math.PI) / 6,
                0.75,
                delta
            ))
    )
    return (
        <group ref={ref}>
            <Line />
            <Instances
                limit={particles.length}
                castShadow
                receiveShadow
                position={[0, 0, 0]}
            >
                <sphereGeometry args={[0.5, 8, 8]} />
                <meshStandardMaterial roughness={0.8} color="#f0f0f0" />
                {particles.map((data, i) => (
                    <Bubble key={i} {...data} />
                ))}
            </Instances>
        </group>
    )
}
const Line = () => {
    const meshLineRef = useRef()

    useFrame((state) => {
        const { factor, speed, baseX, xFactor, yFactor, zFactor } = particles[0]
        const t = factor + state.clock.elapsedTime * speed

        const p = new THREE.Vector3(
            baseX +
                Math.cos(t) +
                Math.sin(t * 1) / 10 +
                xFactor +
                Math.cos((t / 10) * factor) +
                (Math.sin(t * 1) * factor) / 10,
            // y
            Math.sin(t) +
                Math.cos(t * 2) / 10 +
                yFactor +
                Math.sin((t / 10) * factor) +
                (Math.cos(t * 2) * factor) / 10,
            // z
            //   Math.sin(t) +
            //     Math.cos(t * 2) / 10 +
            //     zFactor +
            //     Math.cos((t / 10) * factor) +
            //     (Math.sin(t * 3) * factor) / 10
            -60
        )

        curve.shift()
        curve.push(p)
        meshLineRef.current.setPoints(curve)
    })
    return (
        <mesh>
            <meshLine attach="geometry" points={curve} ref={meshLineRef} />
            <meshLineMaterial
                attach="material"
                transparent
                depthTest={true}
                lineWidth={0.25}
                color={'#ff0000'}
                dashArray={0}
                dashRatio={0}
            />
        </mesh>
    )
}

function Bubble({ factor, speed, xFactor, baseX, yFactor, zFactor }) {
    const ref = useRef()
    useFrame((state) => {
        const t = factor + state.clock.elapsedTime * speed
        ref.current.scale.setScalar(Math.max(0.2, Math.cos(t) * 2))
        const noiseVal = simplex.noise4D(
            baseX + xFactor,
            yFactor,
            zFactor,
            t / 2
        )
        const currentPos = ref.current.position.clone()
        console.log(noiseVal, currentPos)
        currentPos.y += noiseVal / 2
        ref.current.position.set(currentPos.x, currentPos.y, currentPos.z)

        //   // x
        //   baseX +
        //     Math.cos(t) +
        //     Math.sin(t * 1) / 10 +
        //     xFactor +
        //     Math.cos((t / 10) * factor) +
        //     (Math.sin(t * 1) * factor) / 10,
        //   // y
        //   Math.sin(t) +
        //     Math.cos(t * 2) / 10 +
        //     yFactor +
        //     Math.sin((t / 10) * factor) +
        //     (Math.cos(t * 2) * factor) / 10,
        //   // z
        //   Math.sin(t) +
        //     Math.cos(t * 2) / 10 +
        //     zFactor +
        //     Math.cos((t / 10) * factor) +
        //     (Math.sin(t * 3) * factor) / 10
        // );
    })
    return <Instance ref={ref} position={[baseX + xFactor, yFactor, zFactor]} />
}
