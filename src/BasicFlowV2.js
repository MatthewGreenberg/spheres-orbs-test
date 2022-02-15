import * as THREE from 'three'
import { useRef, useMemo, useEffect, Suspense, useState } from 'react'
import {
    Canvas,
    useFrame,
    extend,
    useThree,
    useLoader,
} from '@react-three/fiber'
import * as dat from 'dat.gui'
import { MeshLine, MeshLineMaterial } from './meshline'
import { EffectComposer, SSAO, ToneMapping } from '@react-three/postprocessing'
import { OrbitControls } from '@react-three/drei'
import { TextureLoader } from 'three'
import niceColors from 'nice-color-palettes'
import tex3 from './gradient.jpg'
const tempObject = new THREE.Object3D()

const LINE_TEXTURE = tex3
const random = require('canvas-sketch-util/random')

extend({ MeshLine, MeshLineMaterial })

function parabola(x, k) {
    // return 1
    return Math.pow(4 * x * (1 - x), k)
}

const { MathUtils } = THREE
const numParticles = 150
const particleStopDuration = -20

let particles = []
let startTime = 0
let elapsedTime = 0
let lineWidth = 0.05
let lineOpacity = 0.4
let lineColor = new THREE.Color('#412f2f')
let ballColor = new THREE.Color('#4949e8')

var flowSettings = {
    speed: 0.005,
    frequency: 0.0001,
    baseXVelocity: 0,
    baseYVelocity: 0,
    BaseZVelocity: 0,
    playtime: 50,
    speedVariance: 1,
    scaleVariance: 1,
    lineColor: '#412f2f',
    lineOpacity: 0.4,
    lineWidth: 0.05,
    backgroundColor: '#774c6a',
    ballColor: '#4949e8',
    run_animation: function () {
        resetParticles()
    },
}

function setupGUI() {
    const gui = new dat.GUI()
    gui.add(flowSettings, 'run_animation')

    gui.add(flowSettings, 'frequency', 0.0001, 0.1)
    gui.add(flowSettings, 'speed', 0.0001, 0.01)
    gui.add(flowSettings, 'baseXVelocity', -0.1, 0.1, 0.01)
    gui.add(flowSettings, 'baseYVelocity', -0.1, 0.1, 0.01)
    gui.add(flowSettings, 'BaseZVelocity', -0.1, 0.1, 0.01)
    gui.add(flowSettings, 'lineWidth', 0.01, 1.1, 0.01).onChange(() => {
        lineWidth = flowSettings.lineWidth
    })
    gui.add(flowSettings, 'lineOpacity', 0.1, 1, 0.1).onChange(() => {
        lineOpacity = flowSettings.lineOpacity
    })
    gui.add(flowSettings, 'playtime', 30, 1000, 1)
    gui.add(flowSettings, 'speedVariance', 1, 10)
    gui.add(flowSettings, 'scaleVariance', 1, 10)
    gui.addColor(flowSettings, 'lineColor').onChange(() => {
        lineColor = new THREE.Color(flowSettings.lineColor)
    })
    gui.addColor(flowSettings, 'ballColor').onChange(() => {
        ballColor = new THREE.Color(flowSettings.ballColor)
    })
    // gui.addColor(flowSettings, 'backgroundColor').onChange(() => {
    //     document.body.style.background = flowSettings.backgroundColor
    // })
    return gui
}

function resetParticles(xIn, yIn) {
    startTime = elapsedTime
    particles = Array.from({ length: numParticles }, () => {
        const mouseX = xIn ? xIn : 0
        const mouseY = yIn ? yIn : 0

        const x = mouseX + MathUtils.randFloatSpread(2.5)
        const y = mouseY + MathUtils.randFloatSpread(2.5)
        const z = MathUtils.randFloatSpread(2.5)

        return {
            points: new Array(25).fill().map((_) => new THREE.Vector3(x, y, z)),
            x,
            y,
            z,
            vx: 0,
            vy: 0,
            vz: 0,
            zRange: MathUtils.randFloatSpread(10),
            zSpeed: MathUtils.randFloatSpread(3),
            currentLife: flowSettings.playtime,
            totalLife: flowSettings.playtime,
            baseScale: Math.max(
                Math.random() * flowSettings.scaleVariance - 0.6,
                0.25
            ),
            baseSpeed: Math.random() * flowSettings.speedVariance,
        }
    })
}
resetParticles()

export default function BasicFlowV2() {
    useEffect(() => {
        const gui = setupGUI()
        return () => {
            gui.destroy()
        }
    }, [])
    return (
        <Canvas
            dpr={[1, 2]}
            style={{
                background:
                    'linear-gradient(0deg, rgba(101,66,80,1) 0%, rgba(73,107,143,1) 0%, rgba(63,87,117,1) 60%, rgba(47,64,87,1) 98%)',
                boxShadow: 'inset 0 0 300px  rgba(0, 0, 0, 0.5)',
            }}
            camera={{ fov: 50, position: [0, 0, 20], near: 1, far: 300 }}
        >
            <Suspense fallback={null}>
                {/* <fog attach="fog" args={['#4c5d77', 70, 100]} /> */}
                <OrbitControls />
                <ambientLight intensity={1} />
                <pointLight color="red" position={[-0, 20, 30]} intensity={2} />
                <pointLight
                    castShadows={true}
                    color="green"
                    position={[0, 0, 0]}
                    intensity={2}
                />

                <Bubbles />
            </Suspense>
            <EffectComposer multisampling={0}>
                <SSAO
                    samples={21}
                    radius={5}
                    intensity={30}
                    luminanceInfluence={0.6}
                    color="red"
                />
                <ToneMapping
                    adaptive={true} // toggle adaptive luminance map usage
                    resolution={256} // texture resolution of the luminance map
                    middleGrey={0.2} // middle grey factor
                    maxLuminance={16.0} // maximum luminance
                    averageLuminance={1.0} // average luminance
                    adaptationRate={1.0} // luminance adaptation rate
                />
            </EffectComposer>
        </Canvas>
    )
}

function Bubbles() {
    const { camera, mouse, viewport } = useThree()

    const [hovered, set] = useState()

    const dummy = useMemo(() => new THREE.Object3D(), [])
    const mesh = useRef()

    const ref = useRef()
    const previous = useRef()

    const bubbleMatRef = useRef()

    useFrame((state, delta) => {
        // PARTICLES UPDATE
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            const t = state.clock.elapsedTime
            elapsedTime = state.clock.elapsedTime
            if (p.currentLife < particleStopDuration - 10) {
                return
            }
            if (p.currentLife < 0) {
                p.vx *= 0.95
                p.vy *= 0.95
                p.vz *= 0.95

                p.x += p.vx
                p.y += p.vy
                p.z += p.vz
            } else {
                const speed = flowSettings.speed * p.baseSpeed

                const noiseVal = random.noise4D(
                    p.x,
                    p.y,
                    p.z,
                    t * 2,
                    flowSettings.frequency,
                    100
                )

                p.vx += Math.cos(noiseVal) * speed
                p.vy += Math.sin(noiseVal) * speed
                p.vz += Math.sin(noiseVal * 5 + 1000) * speed

                p.x += p.vx + flowSettings.baseXVelocity
                p.y += p.vy + flowSettings.baseYVelocity
                p.z += p.vz + flowSettings.baseXVelocity
                p.vx *= 0.999
                p.vy *= 0.999
                p.vz *= 0.999
            }

            dummy.position.set(p.x, p.y, p.z)

            const scale =
                Math.min(state.clock.elapsedTime - startTime, 1) * p.baseScale

            dummy.scale.set(scale, scale, scale)
            dummy.updateMatrix()
            // And apply the matrix to the instanced item
            mesh.current.setMatrixAt(i, dummy.matrix)
            p.currentLife -= 1
        }
        mesh.current.material.color.set(ballColor)
        mesh.current.instanceMatrix.needsUpdate = true
    })
    return (
        <group ref={ref}>
            <instancedMesh
                ref={mesh}
                args={[null, null, particles.length]}
                position={[0, 0, 0]}
            >
                <meshPhongMaterial
                    ref={bubbleMatRef}
                    metalness={0.25}
                    roughness={0.1}
                />
                <sphereBufferGeometry args={[0.3, 10, 10]} />
            </instancedMesh>

            {particles.map((p, i) => (
                <Line index={i} key={`line${i}`} />
            ))}
        </group>
    )
}

const Line = ({ index }) => {
    const meshLineRef = useRef()
    const updateLineCount = useRef(0)
    const meshMatRef = useRef()
    const texMap = useLoader(TextureLoader, LINE_TEXTURE)
    useFrame((state) => {
        const { r, g, b } = lineColor
        meshMatRef.current.uniforms.color.value = { r, g, b }
        meshMatRef.current.uniforms.lineWidth.value = lineWidth
        meshMatRef.current.uniforms.opacity.value = lineOpacity

        meshMatRef.current.transparent = true
        updateLineCount.current += 1
        if (particles[index].currentLife < particleStopDuration - 10) {
            return
        }
        if (updateLineCount.current % 2 !== 0) {
            meshLineRef.current.setPoints(particles[index].points, (p) =>
                parabola(p, 1)
            )
            return
        }

        const { x, y, z } = particles[index]

        const last = particles[index].points.shift()
        last.set(x, y, z)

        particles[index].points.push(last)
    })
    return (
        <mesh>
            <meshLine
                attach="geometry"
                points={particles[index].points}
                ref={meshLineRef}
            />
            <meshLineMaterial
                ref={meshMatRef}
                attach="material"
                depthTest={true}
                lineWidth={flowSettings.lineWidth}
                color={flowSettings.lineColor}
                dashArray={0}
                dashRatio={0}
                blending={THREE.AdditiveBlending}
                useMap={true}
                map={texMap}
                opacity={flowSettings.lineOpacity}
            />
        </mesh>
    )
}
