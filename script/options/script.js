let currentTab
chrome.tabs.getCurrent(tab => {
    currentTab = tab
})

document.querySelectorAll("[onclick]").forEach(element => {
    element.removeAttribute("onclick");
    element.addEventListener("click", event => {
        window[element.id](event);
    })
})
document.querySelectorAll("[oninput]").forEach(element => {
    element.removeAttribute("oninput");
    element.addEventListener("input", event => {
        setRate(event);
    })
})

// DEFAULT

const sideMission = new SideMission();
    window.sideMission = sideMission;

    function connect(event) {
      sideMission.connect().then(() => {
        event.target.remove();
        sideMission.getName().then(name => {
          document.querySelector(".name input").value = name;
        });
      });
    }

    sideMission.addEventListener("sensorConfiguration", event => {
      const { sensorConfiguration, rate } = event.message;
      document.querySelector(".rate input").value = rate;
      for (const type in sensorConfiguration) {
        const isEnabled = sensorConfiguration[type];
        document.querySelector(
          `[data-type="${type}"] input`
        ).checked = isEnabled;
      }
    });

    function setName(event) {
      const name = document.querySelector(".name input").value;
      event.target.disabled = true;
      sideMission.setName(name).then(() => {
        event.target.disabled = false;
      });
    }

    function setRate(event) {
      const dataType = event.target.closest("[data-type]").dataset.type;
      const rate = Number(event.target.value);
      sideMission.configureImu({ [dataType]: rate });
    }
    
    sideMission.addEventListener("batterylevel", event => {
      document.querySelector(".batteryLevel span").innerText = sideMission.batteryLevel
    })

    sideMission.addEventListener("calibration", event => {
      for (const type in sideMission.calibration) {
        document.querySelector(`[data-calibration="${type}"] span`).innerText =
          sideMission.calibration[type];
      }
      document.querySelector(
        `[data-calibration="fully"] span`
      ).innerText = sideMission.isFullyCalibrated ? "true" : "false";
    });

    const sideMissionEntity = document.getElementById("sideMission");
    sideMission.addEventListener("quaternion", event => {
      const { message } = event;
      const { quaternion, timestamp } = message;
      sideMissionEntity.object3D.quaternion.copy(quaternion);
    });

    const dataComponents = {
      default: ["x", "y", "z"],
      quaternion: ["x", "y", "z", "w"]
    };

    const canvases = {};
    const contexts = {};

    const samples = {};
    const numberOfSamples = 100;
    sideMission.dataTypes.forEach(type => {
      canvases[type] = document.querySelector(`#${type} canvas`);
      contexts[type] = canvases[type].getContext("2d");

      const components = dataComponents[type] || dataComponents.default;

      samples[type] = {};
      components.forEach(
        component =>
          (samples[type][component] = new Array(numberOfSamples).fill(0))
      );

      sideMission.addEventListener(type, event => {
        const { message } = event;
        const { timestamp } = message;
        components.forEach(component => {
          samples[type][component].unshift(message[type][component]);
          samples[type][component].pop();
        });

        draw(type);

        chrome.tabs.query({active: true}, tabs => {
            if (tabs) {
                tabs.forEach(tab => {
                    if (tab.id !== currentTab.id) {
                        chrome.tabs.sendMessage(tab.id, {
                            ukaton: "sideMission",
                            type,
                            value: message[type].toArray(),
                            timestamp
                        })
                    }
                })
            }
        })
      });
    });

    const ranges = {
      default: {
        min: -20,
        max: 20
      },
      magnetometer: {
        min: -70,
        max: 70
      },
      rotationRate: {
        min: -2 * Math.PI,
        max: 2 * Math.PI
      },
      quaternion: {
        min: -1,
        max: 1
      },
      euler: {
        min: -Math.PI,
        max: Math.PI
      }
    };

    const titles = {
      acceleration: "Acceleration",
      gravity: "Gravity",
      linearAcceleration: "Linear Acceleration",
      rotationRate: "Rotation Rate",
      magnetometer: "Magnetometer",
      quaternion: "Quaternion",
      euler: "Euler Angles"
    };

    const legends = {
      euler: ["pitch", "yaw", "roll"],
      rotationRate: ["pitch", "yaw", "roll"]
    };

    const colors = {
      x: "red",
      y: "green",
      z: "blue",
      w: "purple"
    };

    function draw(type) {
      const canvas = canvases[type];
      const context = contexts[type];
      context.clearRect(0, 0, canvas.width, canvas.height);

      const title = titles[type] || type;
      context.font = "26px serif";
      context.textAlign = "right";
      context.textBaseline = "top";
      context.fillStyle = "black";
      context.fillText(title, canvas.width - 10, 10);

      context.font = "26px serif";
      context.textAlign = "left";
      context.textBaseline = "bottom";
      const legend = dataComponents[type] || dataComponents.default;
      const texts = legend.map((key, index) => legends[type]?.[index] || key);
      const legendMeasurement = context.measureText(texts.join(" "));
      let legendOffset = 0;
      legend.forEach((component, index) => {
        context.fillStyle = colors[component];
        const text = texts[index];
        const componentMeasurement = context.measureText(text + " ");
        let x = canvas.width - 10;
        x -= legendMeasurement.width;
        x += legendOffset;
        context.fillText(text, x, canvas.height - 10);
        legendOffset += componentMeasurement.width;
      });

      for (const component in samples[type]) {
        const range = ranges[type] || ranges.default;

        const componentSamples = samples[type][component];
        context.strokeStyle = colors[component];
        context.beginPath();
        context.lineWidth = 1;
        const width = canvas.width / componentSamples.length;
        componentSamples.forEach((value, index) => {
          const x = width * index;
          value = Math.min(Math.max(range.min, value), range.max);
          const y =
            canvas.height * (1 - (value - range.min) / (range.max - range.min));
          if (index === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
          context.stroke();
        });
      }
    }

    function drawAll() {
      sideMission.dataTypes.forEach(type => draw(type));
    }

    window.addEventListener("resize", event => {
      for (const type in canvases) {
        const canvas = canvases[type];
        const { clientWidth, clientHeight } = document.body;
        const isNarrow = document.body.clientWidth < 800;
        canvas.width = isNarrow ? document.body.clientWidth : clientWidth / 3;
        canvas.height = isNarrow ? 200 : clientHeight / 3;
      }
      drawAll();
    });
    window.dispatchEvent(new Event("resize"));

    drawAll();