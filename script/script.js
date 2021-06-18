/* global THREE, ResonanceAudio */

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
            
            case "matrix":
                value = new THREE.Matrix4().set(...data.value)
                break
            case "screen":
                value = data.value
                break
        }

        if (value) {
            window.dispatchEvent(new CustomEvent("sidemission", {
                detail: {type, value, timestamp}
            }))
        }
    }
})

const AudioContext = window.AudioContext || window.webkitAudioContext
const audioContext = new AudioContext()
audioContext.addEventListener('statechange', event => {
    if (audioContext.state !== 'running') {
        document.addEventListener('click', event => {
            console.log("resumed audio context")
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

const screenDimensions = {
    width: 1,
    height: 1,
    distance: 1
}
function getElementPositionRelativeToWindow(element) {
    let {x, y, width, height} = element.getBoundingClientRect()
    x += width/2
    y += height/2
    return {x, y}
}
function getElementPositionRelativeToScreen(element) {
    let {x, y} = getElementPositionRelativeToWindow(element)
    const {screenX, screenY, outerHeight, innerHeight} = window
    const windowHeightDifference = outerHeight - innerHeight
    x += screenX
    y += screenY
    y += windowHeightDifference // doesn't work if console is open
    return {x, y}
}
function getInterpolatedElementPositionRelativeToScreen(element) {
    let {x, y} =getElementPositionRelativeToScreen(element)

    x /= screen.width
    y /= screen.height
    y = 1 - y
    
    return {x, y}
}
function get3DPositionOfElementRelativeToScreen(element) {
    let {x, y} = getInterpolatedElementPositionRelativeToScreen(element)
    x -= 0.5
    x *= screenDimensions.width

    y -= 0.5
    y *= screenDimensions.height

    const z = screenDimensions.distance
    return {x, y, z}
}

window.addEventListener("sidemission", event => {
    const {type, value} = event.detail
    switch(type) {
        case "matrix":
            const matrix = value
            resonanceAudioScene.setListenerFromMatrix(matrix)
            break
        case "screen":
            Object.assign(screenDimensions, value)
            spatializedMediaElements.forEach(mediaElement => updateSpatilizedMediaElement(mediaElement))
            break
    }
})

const spatializedMediaElements = []
function spatializeMediaElement(mediaElement) {
    if (!spatializedMediaElements.includes(mediaElement) && mediaElement instanceof HTMLMediaElement) {
        console.log("new media element", mediaElement)
        const mediaElementSource = mediaElement.srcObject?
            audioContext.createMediaStreamSource(mediaElement.srcObject):
            audioContext.createMediaElementSource(mediaElement)
        if (mediaElement instanceof HTMLVideoElement && mediaElement.srcObject) {
            mediaElement.muted = true
        }
        const source = resonanceAudioScene.createSource()
        mediaElementSource.connect(source.input)
        const positionalElement = (mediaElement instanceof HTMLVideoElement)?
            mediaElement:
            document.body;

        mediaElement.spatialization = {
            source,
            mediaElementSource,
            positionalElement,
            screenPosition: getElementPositionRelativeToScreen(positionalElement)
        }
        spatializedMediaElements.push(mediaElement)
        updateSpatilizedMediaElement(mediaElement)
    }
}

function didSpatializedElementMove(mediaElement) {
    const currentScreenPosition = getElementPositionRelativeToScreen(mediaElement.spatialization.positionalElement)
    const storedScreenPosition = mediaElement.spatialization.screenPosition

    const {x, y} = currentScreenPosition

    const _x = storedScreenPosition.x
    const _y = storedScreenPosition.y

    if ((Math.abs(x - _x)) > 2 || (Math.abs(y - _y)) > 2) {
        Object.assign(mediaElement.spatialization.screenPosition, currentScreenPosition)
        return true
    }
}

function checkSpatilizedMediaElement(mediaElement) {
    if (didSpatializedElementMove(mediaElement)) {
        updateSpatilizedMediaElement(mediaElement)
    }
}

function updateSpatilizedMediaElement(mediaElement) {
    const {x, y, z} =  get3DPositionOfElementRelativeToScreen(mediaElement)
    mediaElement.spatialization.source.setPosition(x, y, z)
}

function step() {
    spatializedMediaElements.forEach(mediaElement => checkSpatilizedMediaElement(mediaElement))
    requestAnimationFrame(step)
}
requestAnimationFrame(step)

const mutationObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(addedNode => {
            if (addedNode instanceof HTMLMediaElement) {
                const mediaElement = addedNode
                spatializeMediaElement(mediaElement)
            }
        })
    })
})
mutationObserver.observe(document, {childList: true, subtree: true})

document.querySelectorAll("video, audio").forEach(mediaElement => {
    spatializeMediaElement(mediaElement)
})