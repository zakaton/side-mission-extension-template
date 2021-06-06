let currentTab
chrome.tabs.getCurrent(tab => {
    currentTab = tab
})

// https://github.com/mrdoob/three.js/blob/342946c8392639028da439b6dc0597e58209c696/src/math/MathUtils.js#L54
function inverseLerp( x, y, value ) {

	if ( x !== y ) {

		return ( value - x ) / ( y - x );

		 } else {

		return 0;

		 }

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
    euler: ["pitch", "yaw", "roll", "pitchMin", "pitchMax"]
}

const colors = {
    x: "red",
    y: "green",
    z: "blue",
    w: "purple",
    
    pitchMin: "black",
    pitchMax: "black"
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

            const sideMissionCaseEntity = sideMissionContainer.querySelector("a-scene .case")
            sideMission.addEventListener("quaternion", event => {
                const { message } = event
                const { quaternion } = message
                sideMissionCaseEntity.object3D.quaternion.copy(quaternion)
            })

            const sensorsContainer = sideMissionContainer.querySelector(".sensors")
            sensorsContainer.addEventListener("input", event => {
                const sensorName = event.target.closest("label").className
                const enabled = event.target.checked
                sideMission.configureSensors({ [sensorName]: enabled })
            })


            const callibration = {
                pitch: {
                    min: -Math.PI,
                    max: Math.PI
                }
            }
            const callibratePitchMinButton = sideMissionContainer.querySelector(".settings .callibration .pitchMin")
            callibratePitchMinButton.addEventListener("click", event => {
                if (sideMission.euler.x < callibration.pitch.max) {
                    callibration.pitch.min = sideMission.euler.x
                    samples.euler.pitchMin.fill(callibration.pitch.min)
                    draw("euler")
                }
            })
            const callibratePitchMaxButton = sideMissionContainer.querySelector(".settings .callibration .pitchMax")
            callibratePitchMaxButton.addEventListener("click", event => {
                if (sideMission.euler.x > callibration.pitch.min) {
                    callibration.pitch.max = sideMission.euler.x
                    samples.euler.pitchMax.fill(callibration.pitch.max)
                    draw("euler")
                }
            })

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
                        samples[type].pitchMin = new Array(numberOfSamples).fill(-Math.PI)
                        samples[type].pitchMax = new Array(numberOfSamples).fill(Math.PI)
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

                        let slouch
                        if (type === "euler") {
                            const euler = message[type]
                            let pitch = euler.x
                            pitch = THREE.Math.clamp(pitch, callibration.pitch.min, callibration.pitch.max)
                            slouch = inverseLerp(callibration.pitch.max, callibration.pitch.min, pitch)
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

                                        if (type === "euler") {
                                            chrome.tabs.sendMessage(tab.id, {
                                                ukaton: "sideMission",
                                                type: "slouch",
                                                value: slouch,
                                                timestamp,
                                                index: sideMissionIndex
                                            })
                                        }
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
                    legend.push("pitchMin", "pitchMax")
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