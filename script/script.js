/* global THREE */

window.addEventListener("message", event => {
    const {data} = event
    if (data.ukaton === "sideMission") {
        const {type, timestamp} = data

        let value
        switch(type) {
            case "acceleration":
                value = new THREE.Vector3().set(...data.value)
                break
            case "gravity":
                value = new THREE.Vector3().set(...data.value)
                break
            case "linearAcceleration":
                value = new THREE.Vector3().set(...data.value)
                break
            case "rotationRate":
                value = new THREE.Euler().set(...data.value)
                break
            case "magnetometer":
                value = new THREE.Vector3().set(...data.value)
                break
            case "quaternion":
                value = new THREE.Quaternion().set(...data.value)
                break
            case "euler":
                value = new THREE.Euler().set(...data.value)
                break

            case "callibratedEuler":
                value = new THREE.Euler().set(...data.value)
                break
        }

        if (value) {
            window.dispatchEvent(new CustomEvent("sidemission", {
                detail: {type, value, timestamp}
            }))
        }
    }
})

const modelViewers = Array.from(document.querySelectorAll("model-viewer"))
modelViewers.forEach(modelViewer => {
    modelViewer.removeAttribute("auto-rotate")
    modelViewer.setAttribute("interaction-prompt", "none")
})

window.addEventListener("sidemission", event => {
    const {type, value}  = event.detail
    if (type === "callibratedEuler") {
        const euler = value
        modelViewers.forEach(modelViewer => {
            modelViewer.setAttribute("camera-orbit", `${euler.y}rad ${euler.x+(Math.PI/2)}rad`);
        })
    }
})