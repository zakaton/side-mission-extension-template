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
            case "callibratedQuaternion":
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

let scene, camera, entity, cameraHeight, cameraRadius, cursor, mode, vector, quaternion
if (window.AFRAME) {
    scene = document.querySelector("a-scene")
    camera = scene.querySelector("a-camera, a-entity[camera]")

    cursor = document.createElement("a-cursor")
    camera.appendChild(cursor)

    cameraHeight = camera.object3D.position.y

    vector = new THREE.Vector3()

    window.addEventListener("sidemission", event => {
        const {type, value} = event.detail
        switch(type) {
            case "callibratedQuaternion":
                quaternion = value
                switch(mode) {
                    case "nothing":

                        break
                    case "camera":
                        camera.object3D.quaternion.copy(quaternion)
                        break
                    case "object":
                        if (entity) {
                            entity.object3D.quaternion.copy(quaternion)
                        }
                        break
                    case "orbit":
                        if (entity && cameraRadius > 0) {
                            vector.set(0, 0, cameraRadius).applyQuaternion(quaternion).add(entity.object3D.position)
                            camera.object3D.position.copy(vector)
                            camera.object3D.quaternion.copy(quaternion)
                        }
                        break
                }
                break
        }
    })

    const modes = ["nothing", "camera", "object", "orbit"]
    mode = modes[0]
    document.addEventListener("keypress", event => {
        if (!isNaN(event.key)) {
            const index = Number(event.key)-1
            if (modes[index]) {
                mode = modes[index]
                console.log("new mode", mode)
                switch(mode) {
                    case "nothing":
                        camera.setAttribute("look-controls", {enabled: true})
                        camera.object3D.position.y = cameraHeight
                        break
                    case "camera":
                        camera.setAttribute("look-controls", {enabled: false})
                        camera.object3D.position.y = cameraHeight
                        break
                    case "object":
                        camera.setAttribute("look-controls", {enabled: true})
                        camera.object3D.position.y = cameraHeight
                        if (cursor.components.raycaster.intersectedEls.length) {
                            entity = cursor.components.raycaster.intersectedEls[0]
                        }
                        break
                    case "orbit":
                        camera.setAttribute("look-controls", {enabled: false})
                        cameraHeight = camera.object3D.position.y
                        if (cursor.components.raycaster.intersectedEls.length) {
                            entity = cursor.components.raycaster.intersectedEls[0]
                            cameraRadius = camera.object3D.position.distanceTo(entity.object3D.position)
                        }
                        break
                }
            }
        }
    })
}