if (!window.spatialCall) {
    window.spatialCall = {}
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
    
    function getPositionOfElement(element) {
        let {x, y, width, height, left, top} = element.getBoundingClientRect()
        const {screenX, screenY, outerHeight, innerHeight} = window
        
        const navHeight = outerHeight-innerHeight
        
        x = screenX + x
        y = screenY + navHeight + top
        
        x += width/2
        y += height/2
        
        x /= screen.width
        y /= screen.height
        
        return {x, y}
    }
    
    const screenToSpaceConfig = {
        width: 10,
        height: 10,
    }
    const clamp = (value, min = 0, max = 1) => {
        if (value > max)
            return max
        else if (value < min)
            return min
        else
            return value
    }
    const screenPositionToSpacePosition = ({x, y}) => {
        x = clamp(x)
        
        const _x = screenToSpaceConfig.width * (2 * (x - 0.5))
        
        y = clamp(y)
        y = 1-y
        const _y = screenToSpaceConfig.height * (2 * (y - 0.5))
        
        return [_x, _y, -2]
    }
    
    const spatializedMediaElements = []
    function spatializeMediaElement(mediaElement) {
        if (mediaElement instanceof HTMLMediaElement && !spatializedMediaElements.includes(mediaElement)) {
            console.log('new spatial media element', mediaElement)
            const mediaElementSource = mediaElement.srcObject?
                audioContext.createMediaStreamSource(mediaElement.srcObject):
                audioContext.createMediaElementSource(mediaElement)
            if (mediaElement instanceof HTMLVideoElement && mediaElement.srcObject)
                mediaElement.muted = true
            const source = resonanceAudioScene.createSource()
            mediaElementSource.connect(source.input)
            spatializedMediaElements.push(mediaElement)
            mediaElement.__didMove = ({x, y}) => {
                const _x = mediaElement.__position.x
                const _y = mediaElement.__position.y
                return (screen.width * Math.abs(x - _x)) > 2 || (screen.height * Math.abs(y - _y)) > 2
            }
            mediaElement.__update = () => {
                const {x, y} = getPositionOfElement(mediaElement)
                if (mediaElement.__didMove({x, y})) {
                    source.setPosition(...screenPositionToSpacePosition({x, y}))
                    mediaElement.__position = {x, y}
                }
            }
            mediaElement.__position = getPositionOfElement(mediaElement)
            mediaElement.__update()
        }
    }
    
    document.querySelectorAll('video, audio').forEach(mediaElement => {
        spatializeMediaElement(mediaElement)
    })
    
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
        
    function step() {
        spatializedMediaElements.forEach(mediaElement => mediaElement.__update())
        requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    
    Object.assign(window.spatialCall, {audioContext, resonanceAudioScene})
}