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

try {
    if (mapboxgl && map) {
        window.addEventListener("sidemission", event => {
            const {type, value} = event.detail
            if (type === "euler") {
                const euler = value
                const heading = THREE.Math.radToDeg(euler.y)
                map.setBearing(heading)
            }
        })
    }
}
catch (error) {
    // a mapbox map isn't defined in this scope
}