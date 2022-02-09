import * as THREE from 'three'
import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber'
import * as dat from 'dat.gui'
import { MeshLine, MeshLineMaterial } from './meshline'
import { EffectComposer, SSAO } from '@react-three/postprocessing'
import { OrbitControls } from '@react-three/drei'
const random = require('canvas-sketch-util/random')

extend({ MeshLine, MeshLineMaterial })

function parabola(x, k) {
    return Math.pow(4 * x * (1 - x), k)
}

const { MathUtils } = THREE
const numParticles = 100
const particleStopDuration = -20

let particles = []
let startTime = 0
let elapsedTime = 0
let lineColor = new THREE.Color('#557799')
let ballColor = new THREE.Color('#f0f0f0')

var flowSettings = {
    speed: 0.005,
    frequency: 0.0001,
    baseXVelocity: 0,
    baseYVelocity: 0,
    BaseZVelocity: 0,
    playtime: 100,
    speedVariance: 1,
    scaleVariance: 1,
    lineColor: '#557799',
    backgroundColor: '#4c5d77',
    ballColor: '#f0f0f0',
    run_animation: function () {
        resetParticles()
    },
}

// cheap-o bk
document.body.style.background = flowSettings.backgroundColor
document.body.style.boxShadow = 'inset 0 0 300px  rgba(0, 0, 0, 0.5)'

function setupGUI() {
    const gui = new dat.GUI()
    gui.add(flowSettings, 'run_animation')

    gui.add(flowSettings, 'frequency', 0.0001, 0.1)
    gui.add(flowSettings, 'speed', 0.0001, 0.01)
    gui.add(flowSettings, 'baseXVelocity', -0.1, 0.1, 0.01)
    gui.add(flowSettings, 'baseYVelocity', -0.1, 0.1, 0.01)
    gui.add(flowSettings, 'BaseZVelocity', -0.1, 0.1, 0.01)
    gui.add(flowSettings, 'playtime', 30, 1000, 1)
    gui.add(flowSettings, 'speedVariance', 1, 10)
    gui.add(flowSettings, 'scaleVariance', 1, 10)
    gui.addColor(flowSettings, 'lineColor').onChange(() => {
        lineColor = new THREE.Color(flowSettings.lineColor)
    })
    gui.addColor(flowSettings, 'ballColor').onChange(() => {
        ballColor = new THREE.Color(flowSettings.ballColor)
    })
    gui.addColor(flowSettings, 'backgroundColor').onChange(() => {
        document.body.style.background = flowSettings.backgroundColor
    })
    return gui
}

function resetParticles(xIn, yIn) {
    //  var vec = new THREE.Vector3()
    //  var pos = new THREE.Vector3()
    //  vec.set(mouse.x, mouse.y, 0.5)
    //  vec.unproject(camera)
    //  vec.sub(camera.position).normalize()
    //  var distance = -camera.position.z / vec.z
    //  pos.copy(camera.position).add(vec.multiplyScalar(distance))
    //  resetParticles(pos.x, pos.y)
    startTime = elapsedTime
    particles = Array.from({ length: numParticles }, () => {
        const mouseX = xIn ? xIn : 0
        const mouseY = yIn ? yIn : 0

        const x = mouseX + MathUtils.randFloatSpread(10)
        const y = mouseY + MathUtils.randFloatSpread(10)
        const z = MathUtils.randFloatSpread(10)

        return {
            points: new Array(50).fill().map((_) => new THREE.Vector3(x, y, z)),
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
            baseScale: Math.random() * flowSettings.scaleVariance,
            baseSpeed: Math.random() * flowSettings.speedVariance,
        }
    })
}
resetParticles()

export default function BasicFlow() {
    useEffect(() => {
        const gui = setupGUI()
        return () => {
            gui.destroy()
        }
    }, [])
    return (
        <Canvas
            // linear
            // shadows
            colorManagement
            flat
            dpr={[1, 2]}
            camera={{ fov: 50, position: [0, 0, 70], near: 10, far: 150 }}
        >
            <fog attach="fog" args={['#4c5d77', 70, 100]} />
            <OrbitControls />
            <ambientLight intensity={1} />
            <pointLight position={[-0, 20, 30]} intensity={2} />
            <Bubbles />
        </Canvas>
    )
}

function Bubbles() {
    const { camera, mouse, viewport } = useThree()

    useEffect(() => {
        window.addEventListener('click', () => {})
    }, [])

    const dummy = useMemo(() => new THREE.Object3D(), [])
    const mesh = useRef()

    const ref = useRef()
    const bubbleMatRef = useRef()
    // const activeParticles = useRef(particles);
    useFrame((state, delta) => {
        // ----
        // MOUSE LERPY ROTATION FOR GROUP
        // ref.current.rotation.y = MathUtils.damp(
        //     ref.current.rotation.y,
        //     (-state.mouse.x * Math.PI) / 5,
        //     0.75,
        //     delta
        // )
        // ref.current.rotation.x = MathUtils.damp(
        //     ref.current.rotation.x,
        //     (state.mouse.y * Math.PI) / 5,
        //     0.75,
        //     delta
        // )

        // ----
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
            // dummy.rotation.set(s * 5, s * 5, s * 5);
            dummy.updateMatrix()
            // And apply the matrix to the instanced item
            mesh.current.setMatrixAt(i, dummy.matrix)
            p.currentLife -= 1
        }

        mesh.current.instanceMatrix.needsUpdate = true
        bubbleMatRef.current.color.set(ballColor)
    })
    return (
        <group ref={ref}>
            <instancedMesh
                ref={mesh}
                args={[null, null, particles.length]}
                castShadow
                receiveShadow
                position={[0, 0, 0]}
            >
                <meshPhongMaterial
                    color="#f0f0f0"
                    ref={bubbleMatRef}
                    shininess={0.25}
                />
                <sphereGeometry args={[0.5, 5, 5]} />
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
    useFrame((state) => {
        const { r, g, b } = lineColor
        meshMatRef.current.uniforms.color.value = { r, g, b }

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
                lineWidth={0.2}
                color={flowSettings.lineColor}
                dashArray={0}
                dashRatio={0}
                blending={THREE.NormalBlending}
            />
        </mesh>
    )
}
