/* global THREE */

window.addEventListener("message", event => {
    const {data} = event
    if (data.ukaton === "sideMission") {
        const {index, type, timestamp} = data

        let value
        switch(type) {
            case "acceleration":
                value = new THREE.Vector3().set(...data.value)
                break
            case "linearAcceleration":
                value = new THREE.Vector3().set(...data.value)
                break
            case "rotationRate":
                value = new THREE.Euler().set(...data.value)
                break
            case "euler":
                value = new THREE.Euler().set(...data.value)
                break
            case "quaternion":
                value = new THREE.Quaternion().set(...data.value)
                break
        }

        if (value) {
            window.dispatchEvent(new CustomEvent("sidemission", {
                detail: {index, type, value, timestamp}
            }))
        }
    }
})

const modelViewers = Array.from(document.querySelectorAll("model-viewer"))
modelViewers.forEach(modelViewer => {
    modelViewer.removeAttribute("auto-rotate")
    modelViewer.setAttribute("interaction-prompt", "none")
})

let yawOffset = 0
let currentYaw = 0

document.addEventListener("keypress", event => {
    if (event.key === "c") {
        yawOffset = currentYaw
    }
})

window.addEventListener("sidemission", event => {
    const {type, value}  = event.detail
    if (type === "euler") {
        const euler = value
        modelViewers.forEach(modelViewer => {
            currentYaw = euler.y
            modelViewer.setAttribute("camera-orbit", `${euler.y - yawOffset}rad ${euler.x+(Math.PI/2)}rad`);
        })
    }
})