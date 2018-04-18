import { Injectable } from '@angular/core';


// We mask the 'require' keyword in the examples because Karma parses those,
// ignoring the fact that they're just hardcoded strings, and split out errors
// about missing modules.
const REQUIRE: string = 'require';


@Injectable()
export class ExampleService {
    private _examples = [
        {
            filename: 'Accelerometer',
            code:
`// Copyright (c) 2016-2017, Intel Corporation.

// Test code to use the Accelerometer (subclass of Generic Sensor) API
// to communicate with the BMI160 inertia sensor on the Arduino 101
// and obtaining information about acceleration applied to the X, Y and Z axis
console.log("BMI160 accelerometer test...");

var updateFrequency = 20; // maximum is 100Hz, but in ashell maximum is 20Hz

var sensor = new Accelerometer({
    frequency: updateFrequency
});

sensor.onreading = function() {
    console.log("acceleration (m/s^2): " +
                " x=" + sensor.x +
                " y=" + sensor.y +
                " z=" + sensor.z);
};

sensor.onactivate = function() {
    console.log("activated");
};

sensor.onerror = function(event) {
    console.log("error: " + event.error.name +
                " - " + event.error.message);
};

sensor.start();`
        },
        {
            filename: 'BLE',
            code:
`// Copyright (c) 2016, Intel Corporation.

// Register a BLE echo service that expose read/write capabilities
// write will allow client to send bytes to be stored
// read will allow client to read back the stored value, or 0 if not found

var ble = ` + REQUIRE + `("ble");

var deviceName = 'BLE Test';

var echoValue = new Buffer(1);
echoValue.writeUInt8(0);

ble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
        ble.startAdvertising(deviceName, ['ab00']);
    }
});

ble.on('accept', function(clientAddress) {
    console.log("Accepted Connection: " + clientAddress);
    ble.updateRssi();
});

ble.on('disconnect', function(clientAddress) {
    console.log("Disconnected Connection: " + clientAddress);
});

ble.on('rssiUpdate', function(rssi) {
    console.log("RSSI value: " + rssi + "dBm");
});

ble.on('advertisingStart', function(error) {
    if (error) {
        console.log("Advertising start error: " + error);
        return;
    }

    ble.setServices([
        new ble.PrimaryService({
            uuid: 'ab00',
            characteristics: [
                new ble.Characteristic({
                    uuid: 'ab01',
                    properties: ['read', 'write'],
                    descriptors: [
                        new ble.Descriptor({
                            uuid: '2901',
                            value: 'Echo'
                        })
                    ],
                    onReadRequest: function(offset, callback) {
                        console.log("Read value: " + echoValue.toString('hex'));
                        callback(this.RESULT_SUCCESS, echoValue);
                    },
                    onWriteRequest: function(data, offset, withoutResponse,
                                             callback) {
                        console.log("Write value: " + data.toString('hex'));
                        echoValue = data;
                        callback(this.RESULT_SUCCESS);
                    }
                })
            ]
        })
    ], function(error) {
        if (error) {
            console.log("Set services error: " + error);
        }
    });
});

console.log("BLE sample...");`
        },
        {
            filename: 'Blink',
            code:
`// Copyright (c) 2016-2017, Intel Corporation.

// Reimplementation of Arduino - Basics - Blink example
//   - Toggles an onboard LED on and off every second

// Hardware Requirements:
//   - None, to use the onboard LED
//   - Otherwise, an LED and a resistor
// Wiring:
//   For an external LED:
//     - Wire its long lead to the IO pin you choose below
//     - Wire its short lead to one end of a resistor
//     - Wire the other end of the resistor to Arduino GND
// Note: For a completely safe resistor size, find the LED's actual forward
//   voltage (or lowest reported), subtract from 3.3V, and divide by the
//   desired current. For example:
//     (3.3V - 1.8V) / 20 mA = 1.5 V / 0.02 A = 75 Ohms.
//   Larger resistors will make the LED dimmer. Smaller ones could reduce its
//     life.

console.log('Starting Blink sample...');

// import gpio module
var gpio = ` + REQUIRE + `('gpio');

// LED0 is one of the onboard LEDs on the Arduino 101
// 'out' mode is default, could be left out
var pin = gpio.open({pin: 'LED0', mode: 'out', activeLow: true});

// remember the current state of the LED
var toggle = 0;

// schedule a function to run every 1s (1000ms)
setInterval(function () {
    toggle = 1 - toggle;
    pin.write(toggle);
}, 1000);`
        },
        {
            filename: 'Gyroscope',
            code:
`// Copyright (c) 2016-2017, Intel Corporation.

// Test code to use the Gyroscope (subclass of Generic Sensor) API
// to communicate with the BMI160 inertia sensor on the Arduino 101
// and monitor the rate of rotation around the the X, Y and Z axis
console.log("BMI160 gyroscope test...");

var updateFrequency = 20; // maximum is 100Hz, but in ashell maximum is 20Hz

var sensor = new Gyroscope({
    frequency: updateFrequency
});

sensor.onreading = function() {
    console.log("rotation (rad/s): " +
                " x=" + sensor.x +
                " y=" + sensor.y +
                " z=" + sensor.z);
};

sensor.onactivate = function() {
    console.log("activated");
};

sensor.onerror = function(event) {
    console.log("error: " + event.error.name +
                " - " + event.error.message);
};

sensor.start();`
        },
        {
            filename: 'Sensor BLE Demo',
            code:
`// Copyright (c) 2017, Intel Corporation.

// Demo code for Arduino 101/Tinytile that uses BLE to
// advertise Accelerometer and Gyroscope data to web app

var ble = ` + REQUIRE + `("ble");

var DEVICE_NAME = 'Intel Curie';

var updateFrequency = 20; // maximum is 100Hz, but in ashell maximum is 20Hz

var SensorCharacteristic = new ble.Characteristic({
    uuid: 'fc0a',
    properties: ['read', 'notify'],
    descriptors: [
        new ble.Descriptor({
            uuid: '2901',
            value: 'BMI160 Sensor'
        })
    ]
});

SensorCharacteristic._onChange = null;

SensorCharacteristic.onSubscribe = function(maxValueSize, updateValueCallback) {
    console.log("Subscribed to bmi160 sensor change");
    this._onChange = updateValueCallback;
};

SensorCharacteristic.onUnsubscribe = function() {
    console.log("Unsubscribed to bmi160 sensor change");
    this._onChange = null;
};

SensorCharacteristic.valueChange = function(isAccel, x, y, z) {
    var multi = 262144; // 2 ** (32 - 14bit precision).

    var xval = (x * multi) >> 1;
    var yval = (y * multi) >> 1;
    var zval = (z * multi) >> 1;

    var data = new Buffer(13);
    data.writeUInt8(isAccel, 0);

    data.writeUInt32BE(xval, 1);
    data.writeUInt32BE(yval, 5);
    data.writeUInt32BE(zval, 9);

    if (this._onChange) {
        this._onChange(data);
    }
};

ble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
        ble.startAdvertising(DEVICE_NAME, ['fc00'], "https:/" + "/goo.gl/pw8HvI");
    } else {
        if (state === 'unsupported') {
            console.log("BLE not enabled on board");
        }
        ble.stopAdvertising();
    }
});

ble.on('advertisingStart', function(error) {
    if (error) {
        console.log("Failed to advertise Physical Web URL");
        return;
    }

    ble.setServices([
        new ble.PrimaryService({
            uuid: 'fc00',
            characteristics: [
                SensorCharacteristic,
            ]
        })
    ]);

    console.log("Advertising as Physical Web device");
});

ble.on('accept', function(clientAddress) {
    console.log("Client connected: " + clientAddress);
    setTimeout(function() {
        accel.start();
        gyro.start();
    }, 2000);
});

ble.on('disconnect', function(clientAddress) {
    console.log("Client disconnected: " + clientAddress);
    accel.stop();
    gyro.stop();
});

var accel = new Accelerometer({
    frequency: updateFrequency
});

var gyro = new Gyroscope({
    frequency: updateFrequency
});

accel.onreading = function() {
    SensorCharacteristic.valueChange(1, accel.x, accel.y, accel.z);
};

gyro.onreading = function() {
    SensorCharacteristic.valueChange(0, gyro.x, gyro.y, gyro.z);
};

accel.onerror = function(event) {
    console.log("error: " + event.error.name +
                " - " + event.error.message);
};

gyro.onerror = function(event) {
    console.log("error: " + event.error.name +
                " - " + event.error.message);
};

console.log("Sensor (Accelerometer/Gyroscope) BLE Demo...");`
        }
    ];

    public exists(filename: string): boolean {
        return this.load(filename) !== null;
    }

    public load(filename: string): string {
        for (let i of this._examples) {
            if (i.filename === filename) {
                return i.code;
            }
        }

        return null;
    }

    public ls(): Array<string> {
        let filenames: Array<string> = [];
        for (let i of this._examples) {
            filenames.push(i.filename);
        }

        return filenames;
    }

    public count(): number {
        return this.ls().length;
    }
}
