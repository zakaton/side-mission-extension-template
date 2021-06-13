window.isExtension = true

const AudioContext = window.AudioContext || window.webkitAudioContext
const audioContext = new AudioContext()
audioContext.addEventListener('statechange', event => {
    if (audioContext.state !== 'running') {
        document.addEventListener('click', event => {
            audioContext.resume()
        }, {once: true})
    }
})
audioContext.dispatchEvent(new Event('statechange'))
const resonanceAudioScene = new ResonanceAudio(audioContext)
resonanceAudioScene.output.connect(audioContext.destination)
resonanceAudioScene.setRoomProperties({
    // room dimensions
}, {
    // room materials
})

const source = resonanceAudioScene.createSource()
const oscillator = audioContext.createOscillator()
oscillator.frequency = 440
oscillator.type = "triangle"
const gain = audioContext.createGain()
gain.gain.value = 0
oscillator.connect(gain).connect(source.input)
oscillator.start()

const callibrationScreen = {
    width: 1,
    height: 1,
    distance: 1
}

document.addEventListener("mousedown", event => {
    if (event.metaKey) {
        gain.gain.value = 1
    }
})
document.addEventListener("mousemove", event => {
    if (gain.gain.value) {
        let x = event.x
        let y = event.y

        x /= document.body.clientWidth
        x -= 0.5

        y /= document.body.clientHeight
        y = 1 - y
        y -= 0.5

        x *= callibrationScreen.width
        y *= callibrationScreen.height

        source.setPosition(x, y, -callibrationScreen.distance)
    }
})
document.addEventListener("mouseup", event => {
    gain.gain.value = 0
})

let currentTab
chrome.tabs.getCurrent(tab => {
    currentTab = tab
})

// https://github.com/mrdoob/three.js/blob/342946c8392639028da439b6dc0597e58209c696/src/math/MathUtils.js#L54
function inverseLerp( x, y, value ) {
    return (x !== y)?
        ( value - x ) / ( y - x ):
        0
}

function feetToMeters(feet) {
    return feet / 3.281
}
function inchesToMeters(inches) {
    return feetToMeters(inches / 12)
}

const ranges = {
    acceleration: {
        min: -20,
        max: 20
    },
    linearAcceleration: {
        min: -20,
        max: 20
    },
    rotationRate: {
        min: -360,
        max: 360
    },

    quaternion: {
        min: -1,
        max: 1
    },
    euler: {
        min: -Math.PI,
        max: Math.PI
    },
}

const titles = {
    acceleration: "Acceleration",
    linearAcceleration: "Linear Acceleration",
    rotationRate: "Rotation Rate",
    quaternion: "Quaternion",
    euler: "Euler Angles"
}
const types = ["acceleration", "linearAcceleration", "rotationRate", "quaternion", "euler"]

const legends = {
    euler: ["pitch", "yaw", "roll", "defaultPitch", "defaultYaw", "defaultRoll"]
}

const colors = {
    x: "red",
    y: "green",
    z: "blue",
    w: "purple",
    
    defaultPitch: "darkred",
    defaultYaw: "darkgreen",
    defaultRoll: "darkblue",    
}

let sideMissions = []
const sideMissionsObjectPool = []

const sideMissionsContainer = document.getElementById("sideMissions")
const sideMissionTemplate = document.getElementById("sideMissionTemplate")

let numberOfSideMissions
function updateNumberOfSideMissions(newNumberOfSideMissions) {
    if (!isNaN(newNumberOfSideMissions) && numberOfSideMissions != newNumberOfSideMissions) {
        numberOfSideMissions = Number(newNumberOfSideMissions)

        while (sideMissionsObjectPool.length < numberOfSideMissions) {
            const sideMissionIndex = sideMissionsObjectPool.length

            const sideMissionContainer = sideMissionTemplate.content.cloneNode(true).querySelector(".sideMission")
            sideMissionContainer.querySelector(".title .index").innerText = sideMissionIndex + 1
            sideMissionsContainer.appendChild(sideMissionContainer)

            const sideMission = new SideMission()

            const matrix = new THREE.Matrix4()

            const monkeyEntity = sideMissionContainer.querySelector("a-scene #monkey")
            sideMission.addEventListener("quaternion", event => {
                const { message } = event
                const { quaternion } = message
                callibratedQuaternion.multiplyQuaternions(callibrationQuaternion, quaternion)
                monkeyEntity.object3D.quaternion.multiplyQuaternions(yawQuaternion, callibratedQuaternion)

                matrix.makeRotationFromQuaternion(callibratedQuaternion)

                resonanceAudioScene.setListenerFromMatrix(matrix)

                chrome.tabs.query({active: true}, tabs => {
                    if (tabs) {
                        tabs.forEach(tab => {
                            if (tab.id !== currentTab.id) {
                                chrome.tabs.sendMessage(tab.id, {
                                    ukaton: "sideMission",
                                    type: "matrix",
                                    value: matrix.toArray(),
                                    index: sideMissionIndex
                                })
                            }
                        })
                    }
                })
            })

            const scene = sideMissionContainer.querySelector("a-scene")
            let stream
            const video = document.createElement("video")
            video.autoplay = true
            video.muted = true
            document.addEventListener("keypress", event => {
                if (event.key === "p") {
                    if (!stream) {
                        const {canvas} = scene
                        stream = canvas.captureStream()
                        video.srcObject = stream
                        const {width, height} = canvas
                        video.width = width
                        video.height = height
                        video.play()
                    }
                    else {
                        video.requestPictureInPicture()
                    }
                }
            })

            const sensorsContainer = sideMissionContainer.querySelector(".sensors")
            sensorsContainer.addEventListener("input", event => {
                const sensorName = event.target.closest("label").className
                const enabled = event.target.checked
                sideMission.configureSensors({ [sensorName]: enabled })
            })


            const callibrationEuler = new THREE.Euler()
            const callibrationQuaternion = new THREE.Quaternion()
            const callibratedQuaternion = new THREE.Quaternion()
            const yawEuler = new THREE.Euler()
            yawEuler.y = Math.PI
            const yawQuaternion = new THREE.Quaternion()
            yawQuaternion.setFromEuler(yawEuler)

            function onScreenUpdate() {
                chrome.tabs.query({}, tabs => {
                    if (tabs) {
                        tabs.forEach(tab => {
                            if (tab.id !== currentTab.id) {
                                chrome.tabs.sendMessage(tab.id, {
                                    ukaton: "sideMission",
                                    type: "screen",
                                    value: callibrationScreen,
                                    index: sideMissionIndex
                                })
                            }
                        })
                    }
                })
            }

            const onTabUpdated = (tabId, info) => {
                if (info.status === "complete") {
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, {
                            ukaton: "sideMission",
                            type: "screen",
                            value: callibrationScreen,
                            index: sideMissionIndex
                        })
                    }, 100)
                }
            }
            chrome.tabs.onUpdated.addListener(onTabUpdated)

            const callibrateButton = sideMissionContainer.querySelector(".settings .callibration .callibrate")
            callibrateButton.addEventListener("click", event => {
                callibrationEuler.copy(sideMission.euler)
                callibrationQuaternion.copy(sideMission.quaternion).invert()
                samples.euler.defaultPitch.fill(callibrationEuler.x)
                samples.euler.defaultYaw.fill(callibrationEuler.y)
                samples.euler.defaultRoll.fill(callibrationEuler.z)
                draw("euler")
            })
            

            for (const dimension in callibrationScreen) {
                const input = sideMissionContainer.querySelector(`.settings .screen .${dimension} input`)
                input.addEventListener("input", event => {
                    const dimensionValue = inchesToMeters(Number(event.target.value))
                    callibrationScreen[dimension] = dimensionValue
                    onScreenUpdate()
                })
                input.dispatchEvent(new Event("input"))
            }

            const connectButton = sideMissionContainer.querySelector(".settings .connect")
            connectButton.addEventListener("click", () => sideMission.connect())
            sideMission.addEventListener("connect", () => {
                connectButton.remove()
                sideMissionContainer.classList.add("connected")
            })
            sideMissionsObjectPool.push(sideMission)

            const canvases = {}
            const contexts = {}

            const samples = {}
            const numberOfSamples = 100
            types.forEach(
                type => {
                    canvases[type] = sideMissionContainer.querySelector(`.${type} canvas`)
                    contexts[type] = canvases[type].getContext("2d")

                    samples[type] = {
                        x: new Array(numberOfSamples).fill(0),
                        y: new Array(numberOfSamples).fill(0),
                        z: new Array(numberOfSamples).fill(0)
                    }
                    if (type === "quaternion") {
                        samples[type].w = new Array(numberOfSamples).fill(0)
                    }
                    if (type === "euler") {
                        samples[type].defaultPitch = new Array(numberOfSamples).fill(0)
                        samples[type].defaultYaw = new Array(numberOfSamples).fill(0)
                        samples[type].defaultRoll = new Array(numberOfSamples).fill(0)
                    }

                    sideMission.addEventListener(type, event => {
                        const { message } = event
                        const { timestamp } = message

                        if (!document.hidden) {
                            const components = ["x", "y", "z"]
                            if (type === "quaternion") {
                                components.push("w")
                            }
                            components.forEach(_ => {
                                samples[type][_].unshift(message[type][_])
                                samples[type][_].pop()
                            })
                            draw(type)
                        }

                        chrome.tabs.query({active: true}, tabs => {
                            if (tabs) {
                                tabs.forEach(tab => {
                                    if (tab.id !== currentTab.id) {
                                        chrome.tabs.sendMessage(tab.id, {
                                            ukaton: "sideMission",
                                            type,
                                            value: message[type].toArray(),
                                            timestamp,
                                            index: sideMissionIndex
                                        })
                                    }
                                })
                            }
                        })
                    })
                }
            )

            function draw(type) {
                const canvas = canvases[type]
                const context = contexts[type]
                context.clearRect(0, 0, canvas.width, canvas.height)

                const title = titles[type] || type
                context.font = "26px serif"
                context.textAlign = "right"
                context.textBaseline = "top"
                context.fillStyle = "black"
                context.fillText(title, canvas.width - 10, 10)

                context.font = "26px serif"
                context.textAlign = "left"
                context.textBaseline = "bottom"
                const legend = ["x", "y", "z"]
                if (type === "quaternion") {
                    legend.push("w")
                }
                if (type === "euler") {
                    legend.push("defaultPitch", "defaultYaw", "defaultRoll")
                    context.font = "22px serif"
                }
                const texts = legend.map((key, index) => legends[type]?.[index] || key)
                const legendMeasurement = context.measureText(texts.join(" "))
                let legendOffset = 0
                legend.forEach((component, index) => {
                    context.fillStyle = colors[component]
                    const text = texts[index]
                    const componentMeasurement = context.measureText(text + " ")
                    let x = canvas.width - 10
                    x -= legendMeasurement.width
                    x += legendOffset
                    context.fillText(text, x, canvas.height - 10)
                    legendOffset += componentMeasurement.width
                })

                for (const component in samples[type]) {
                    const range = ranges[type]

                    const componentSamples = samples[type][component]
                    context.strokeStyle = colors[component]
                    context.beginPath()
                    context.lineWidth = 1
                    const width = canvas.width / componentSamples.length
                    componentSamples.forEach((value, index) => {
                        const x = width * index
                        value = Math.min(Math.max(range.min, value), range.max)
                        const y =
                            canvas.height * (1 - (value - range.min) / (range.max - range.min))
                        if (index === 0) {
                            context.moveTo(x, y)
                        } else {
                            context.lineTo(x, y)
                        }
                        context.stroke()
                    })
                }
            }

            function drawAll() {
                types.forEach(type => draw(type))
            }

            window.addEventListener("resize", event => {
                for (const type in canvases) {
                    const canvas = canvases[type]
                    const { clientWidth, clientHeight } = document.body
                    canvas.width = clientWidth / 3
                    canvas.height = 200
                }
                drawAll()
            })
            window.dispatchEvent(new Event("resize"))
        }

        sideMissions = sideMissionsObjectPool.slice(0, numberOfSideMissions)

        const sideMissionContainers = Array.from(sideMissionsContainer.querySelectorAll(".sideMission"))
        sideMissionContainers.forEach((sideMissionContainer, index) => {
            sideMissionContainer.style.display = (index < numberOfSideMissions)?
                "":
                "none"
        })
    }
}
updateNumberOfSideMissions(1)

const numberOfSideMissionsInput = document.getElementById("numberOfSideMissions")
numberOfSideMissionsInput.addEventListener("input", event => {
    updateNumberOfSideMissions(event.target.value)
})
updateNumberOfSideMissions(numberOfSideMissionsInput.value)