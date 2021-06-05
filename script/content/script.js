/* global chrome */

// relay any messages from the context menu (background.js) to 
chrome.runtime.onMessage.addListener(message => {
    if (message.ukaton === "sideMission") {
        window.postMessage(message)
    }
})

const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement

// for injecting any custom scripts into the webpage's context
function importScript ({src, type, defer, onload}) {
    const script = document.createElement("script")
    script.src = chrome.extension.getURL(`script/${src}.js`)
    
    if(type) script.type = type
    if(defer) script.defer = defer
    if(onload) script.onload = onload
        
    head.insertBefore(script, head.lastChild)
}

function importScripts(...scriptImports) {
    const [scriptImport] = scriptImports
    if (scriptImport) {
        importScript({...scriptImport, onload: () => importScripts(...scriptImports.slice(1))})
    }
}

window.addEventListener("load", () => {
    importScripts(
        {src: "three/three.min"},
        {src: "script"}
    )
})
