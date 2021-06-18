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

            case "slouch":
                value = data.value
                break
        }

        if (value != undefined) {
            window.dispatchEvent(new CustomEvent("sidemission", {
                detail: {type, value, timestamp}
            }))
        }
    }
})

window.addEventListener("sidemission", event => {
    const {type, value} = event.detail
    if (type === "slouch") {
        const slouch = value
        document.body.style.filter = `blur(${slouch*40}px)`
    }
})