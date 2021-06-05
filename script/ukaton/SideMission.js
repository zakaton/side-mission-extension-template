/* global THREE */

class SideMission {
  constructor() {
    this.quaternion = new THREE.Quaternion()
    this.euler = new THREE.Euler()
    this.acceleration = new THREE.Vector3()
    this.linearAcceleration = new THREE.Vector3()
    this.rotationRate = new THREE.Euler()

    // Service 1: IMU Data Characteristics
    this.IMU_DATA_SERVICE_UUID = "a84a7896-9d7a-41c8-8d46-7d530266c930"
    this.ACCEL_DATA_CHARACTERISTIC_UUID =
      "71eb1b54-f492-42bf-b31c-abd6d4a78626"
    this.LIN_ACCEL_DATA_CHARACTERISTIC_UUID =
      "3011e95c-f428-4ecc-b8fe-b478c0ffc9af"
    this.GYRO_DATA_CHARACTERISTIC_UUID = "ff5ca46e-d2ac-4fdb-bb1d-d398f15df5a9"

    // Service 2: Configuration Characteristics
    this.CONFIGURATION_SERVICE_UUID = "ca51b65e-1c92-4e54-9bd7-fc1088f48832"
    this.CONFIGURATION_CHARACTERISTIC_UUID =
      "816ad53c-29df-4699-b25a-4acdf89699d6"
    this.QUAT_DATA_CHARACTERISTIC_UUID = "bb52dc35-1a47-41c1-ae97-ce138dbf2cab"

    window.addEventListener("beforeunload", event => {
      this.configureSensors({
        accelerometer: false,
        gyroscope: false,
        quaternion: false
      })
    })
  }
  connect() {
    if (this.isConnected()) {
      return Promise.resolve()
    } else {
      return navigator.bluetooth
        .requestDevice({
          filters: [
            {
              services: [
                this.IMU_DATA_SERVICE_UUID,
                this.CONFIGURATION_SERVICE_UUID
              ]
            }
          ]
        })
        .then(device => {
          console.log("got device")
          this.device = device
          this.device.addEventListener(
            "gattserverdisconnected",
            this.onGattServerDisconnected.bind(this)
          )
        })
        .then(() => {
          return this.device.gatt.connect()
        })
        .then(server => {
          console.log("got server")
          this.server = server
        })
        .then(() => {
          return this.server.getPrimaryService(this.IMU_DATA_SERVICE_UUID)
        })
        .then(imuDataService => {
          console.log("got imu data service")
          this.imuDataService = imuDataService
        })
        .then(() => {
          return this.imuDataService.getCharacteristic(
            this.ACCEL_DATA_CHARACTERISTIC_UUID
          )
        })
        .then(accelerometerDataCharacteristic => {
          console.log("got accelerometer data characteristic")
          this.accelerometerDataCharacteristic = accelerometerDataCharacteristic
          this.accelerometerDataCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onAccelerometerDataCharacteristicValueChanged.bind(this)
          )
          return this.accelerometerDataCharacteristic
            .startNotifications()
            .catch(error => console.log(error))
        })
        .then(() => {
          console.log("started accelerometer data notifications")
        })
        .then(() => {
          return this.imuDataService.getCharacteristic(
            this.LIN_ACCEL_DATA_CHARACTERISTIC_UUID
          )
        })
        .then(linearAccelerometerDataCharacteristic => {
          console.log("got linear accelerometer data characteristic")
          this.linearAccelerometerDataCharacteristic = linearAccelerometerDataCharacteristic
          this.linearAccelerometerDataCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onLinearAccelerometerDataCharacteristicValueChanged.bind(this)
          )
          return this.linearAccelerometerDataCharacteristic
            .startNotifications()
            .catch(error => console.log(error))
        })
        .then(() => {
          console.log("started linear accelerometer data notifications")
        })
        .then(() => {
          return this.imuDataService.getCharacteristic(
            this.GYRO_DATA_CHARACTERISTIC_UUID
          )
        })
        .then(gyroscopeDataCharacteristic => {
          console.log("got gyroscope data characteristic")
          this.gyroscopeDataCharacteristic = gyroscopeDataCharacteristic
          this.gyroscopeDataCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onGyroscopeDataCharacteristicValueChanged.bind(this)
          )
          return this.gyroscopeDataCharacteristic
            .startNotifications()
            .catch(error => console.log(error))
        })
        .then(() => {
          console.log("started gyroscope data notifications")
        })
        .then(() => {
          return this.server.getPrimaryService(this.CONFIGURATION_SERVICE_UUID)
        })
        .then(configurationService => {
          console.log("get config service")
          this.configurationService = configurationService
        })
        .then(() => {
          return this.configurationService.getCharacteristic(
            this.CONFIGURATION_CHARACTERISTIC_UUID
          )
        })
        .then(configurationCharacteristic => {
          console.log("got config characteristic")
          this.configurationCharacteristic = configurationCharacteristic
          this.configurationCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onConfigurationCharacteristicValueChanged.bind(this)
          )
          return this.configurationCharacteristic
            .startNotifications()
            .catch(error => console.log(error))
        })
        .then(() => {
          console.log("started config notifications")
        })
        .then(() => {
          return this.configurationService.getCharacteristic(
            this.QUAT_DATA_CHARACTERISTIC_UUID
          )
        })
        .then(quaternionDataCharacteristic => {
          console.log("got quaternion data characteristic")
          this.quaternionDataCharacteristic = quaternionDataCharacteristic
          this.quaternionDataCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onQuaternionDataCharacteristicValueChanged.bind(this)
          )
          return this.quaternionDataCharacteristic
            .startNotifications()
            .catch(error => console.log(error))
        })
        .then(() => {
          console.log("started quaternion data notifications")
        })
        .then(() => {
          console.log("done")
          this.dispatchEvent({ type: "connect" })
        })
    }
  }
  isConnected() {
    return this.device && this.device.gatt.connected
  }

  onGattServerDisconnected(event) {
    console.log("gettserverdisconnected")
    this.device.gatt.connect()
  }

  onQuaternionDataCharacteristicValueChanged(event) {
    const dataView = event.target.value

    const quaternion = new THREE.Quaternion()
    const x = dataView.getFloat32(0, true)
    const y = dataView.getFloat32(4, true)
    const z = dataView.getFloat32(8, true)
    const w = dataView.getFloat32(12, true)
    quaternion.set(y, w, -z, x)

    const euler = new THREE.Euler()
    euler.order = "YXZ"
    euler.setFromQuaternion(quaternion)

    this.quaternion.copy(quaternion)
    this.euler.copy(euler)

    const timestamp = dataView.getUint32(16, true)

    this.dispatchEvent({
      type: "quaternion",
      message: { quaternion, timestamp }
    })

    this.dispatchEvent({
      type: "euler",
      message: { euler, timestamp }
    })
  }
  onAccelerometerDataCharacteristicValueChanged(event) {
    const dataView = event.target.value

    const acceleration = new THREE.Vector3()
    const x = dataView.getFloat32(0, true)
    const y = dataView.getFloat32(4, true)
    const z = dataView.getFloat32(8, true)
    acceleration.set(-x, -z, y)
    this.acceleration.copy(acceleration)

    const timestamp = dataView.getUint32(12, true)

    this.dispatchEvent({
      type: "acceleration",
      message: { acceleration, timestamp }
    })
  }
  onLinearAccelerometerDataCharacteristicValueChanged(event) {
    const dataView = event.target.value

    const linearAcceleration = new THREE.Vector3()
    const x = dataView.getFloat32(0, true)
    const y = dataView.getFloat32(4, true)
    const z = dataView.getFloat32(8, true)
    linearAcceleration.set(-x, -z, y)
    this.linearAcceleration.copy(linearAcceleration)

    const timestamp = dataView.getUint32(12, true)

    this.dispatchEvent({
      type: "linearAcceleration",
      message: { linearAcceleration, timestamp }
    })
  }
  onGyroscopeDataCharacteristicValueChanged(event) {
    const dataView = event.target.value

    const rotationRate = new THREE.Euler()
    const x = dataView.getFloat32(0, true)
    const y = dataView.getFloat32(4, true)
    const z = dataView.getFloat32(8, true)
    rotationRate.set(-x, z, -y)
    this.rotationRate.copy(rotationRate)

    const timestamp = dataView.getUint32(12, true)

    this.dispatchEvent({
      type: "rotationRate",
      message: { rotationRate, timestamp }
    })
  }

  onConfigurationCharacteristicValueChanged(event) {
    console.log(event)
  }

  configureSensors(options = {}) {
    if (this.isConnected()) {
      const dataView = this.configurationCharacteristic.value?.byteLength
        ? this.configurationCharacteristic.value
        : new DataView(new Uint8Array([0]).buffer)

      let byte = dataView && dataView.byteLength ? dataView.getUint8(0) : 0

      if (byte == 1) byte = 0

      for (const key in options) {
        let enabled = options[key] || false

        switch (key) {
          case "accelerometer":
            if (enabled) byte |= this.enumeration.ACCELEROMETER
            else byte &= this.enumeration.ACCELEROMETER ^ this.enumeration.ALL
            break
          case "gyroscope":
            if (enabled) byte |= this.enumeration.GYROSCOPE
            else byte &= this.enumeration.GYROSCOPE ^ this.enumeration.ALL
            break
          case "quaternion":
            if (enabled) byte |= this.enumeration.QUATERNION
            else byte &= this.enumeration.QUATERNION ^ this.enumeration.ALL
            break

          default:
            break
        }
      }

      byte = byte || this.enumeration.NONE

      dataView.setUint8(0, byte)

      console.log(byte.toString(2))

      return this.configurationCharacteristic.writeValue(dataView)
    } else {
      return Promise.resolve()
    }
  }

  get enumeration() {
    return this.constructor.enumeration
  }
}

Object.assign(SideMission, {
  enumeration: {
    QUATERNION: 0b1000 << 4,
    GYROSCOPE: 0b0100 << 4,
    ACCELEROMETER: 0b0010 << 4,

    NONE: 0b1,
    ALL: 0b1110 << 4
  }
})

Object.assign(SideMission.prototype, THREE.EventDispatcher.prototype)
