# Ukaton Side Mission Extension Template

How to connect to the Ukaton Side Mission motion module in chrome (desktop only):
1. go to `chrome://bluetooth-internals`
2. go to `devices`
3. click `start scan`
4. look for any devices starting with `SIDE_MISSIONS`, e.g. `SIDE_MISSIONS_1`
5. click `Inspect`

How to install on chrome (desktop only):
1. clone
2. go to `chrome://extensions`
3. click `Load unpacked` and select the this repo's folder (after installing you'll see an icon in the toolbar)
4. go to the Options page (click the extension icon in the toolbar and select `Options`)
5. connect to the Ukaton Side Missions motion module
6. after connecting, toggle the motion sensors you want to enable (acclerometer, gyroscope, and quaternion for quaternion/euler)
7. on any page listen for `"sidemission"` window event:

```javascript
window.addEventListener("sidemission", event => {
  const {detail} = event
  const {type, value, timestamp, index} = detail
  // index refers to the nth side mission dispatching sensor data - useful for connecting multiple motion modules
  switch(type) {
    case "acceleration":
      console.log("received acceleration data", value)
      break
    case "linearAcceleration":
      console.log("received linear acceleration data", value)
      break
    case "rotationRate":
      console.log("received rotation rate data", value)
      break
    case "quaternion":
      console.log("received quaternion data", value)
      break
    case "euler":
      console.log("received euler data", value)
      break
  }
})
```
