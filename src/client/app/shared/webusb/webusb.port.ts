// Suppress warning TS2304 for known objects
declare const ALLOC_NORMAL: number;
declare function intArrayFromString(s: string): number[];
declare function allocate(array: number[], type: string, strategy: number): any;
declare function _convert_ihex(ptr: any): any;
declare function Pointer_stringify(ptr: any): string;
declare function _free(ptr: any): any;

const WEBUSB_UART = 2;
const WEBUSB_RAW = 0;

export class WebUsbPort {
    device: any;
    decoder: any;
    encoder: any;
    rawMode: boolean;
    echoMode: boolean;
    previousRead: string;
    ashellReady: boolean;
    // IDE protocol related
    ideMode: boolean;
    ideVersion: string;
    state: string;  // init, idle, save, run, stop, list, move, remove, boot, reboot
    webusb_iface: number;  // 0 for raw WebUSB and 2 for UART WebUSB
    reading: boolean;
    message: string;
    command: any;

    constructor(device: any) {
        this.device = device;
        this.decoder = new (window as any).TextDecoder();
        this.encoder = new (window as any).TextEncoder('utf-8');
        // IDE protocol related
        this.ideMode = true;  // by default, switch on IDE protocol
        this.ideVersion = '0.0.1';
        this.state = 'init';
        this.message = '';
        this.reading = false;
        this.command = null;
        this.webusb_iface = this.ideMode ? WEBUSB_RAW : WEBUSB_UART;
    }

    public onReceive(data: string) {
        // tslint:disable-next-line:no-empty
    }

    public onReceiveError(error: DOMException) {
        // tslint:disable-next-line:no-empty
    }

    public checkIdeMode() {
        return this.ideMode;
    }

    public connect(): Promise<void> {
        this.rawMode = true;
        this.echoMode = true;
        this.ashellReady = false;

        return new Promise<void>((resolve, reject) => {
            let readLoop = () => {
                // args: endpoint number, buffer size
                // result is of type USBInTransferResult
                this.device.transferIn(3, 64)
                .then((result: any) => {
                    this.handleInput(result);
                    if (this.device.opened) {
                        readLoop();
                    }
                })
                .catch((error: any) => {
                    this.onReceiveError(error);
                });
            };

            let finish = () => {
                this.device.controlTransferOut({
                    requestType: 'class',
                    recipient: 'interface',
                    request: 0x22,
                    value: 0x01,  // connect
                    index: this.webusb_iface})
                .then(() => {
                    if (this.ideMode) {
                        this.ashellReady = true;
                    }
                    readLoop();
                    resolve();
                })
                .catch((error: any) => {
                    reject('Unable to send control data to the device');
                });
            };

            this.device.open()
            .then(() => {
                if (this.device.configuration === null) {
                    this.device.selectConfiguration(1);
                }
                this.device.claimInterface(this.webusb_iface)
                .then(() => {
                    finish();
                }).catch((error: DOMException) => {
                        // fall back to the other webusb interface (uart vs raw)
                        this.webusb_iface = this.webusb_iface === WEBUSB_RAW ?
                                                WEBUSB_UART : WEBUSB_RAW;
                        this.device.claimInterface(this.webusb_iface)
                        .then(() => {
                            finish();
                        }).catch((error: DOMException) => {
                            reject('Unable to claim device interface');
                        });
                });
             })
             .catch((error: DOMException) => {
                 reject('Unable to open the device');
             });
        });
    }

    public disconnect(): Promise<void> {
        // Mute the 'device unavailable' error because of previously
        // pending `transferIn` operation

        // tslint:disable-next-line:no-empty
        this.onReceiveError = () => {};

        return new Promise<void>((resolve, reject) => {
            if (this.device === null || !this.device.opened) {
                // Already disconnected.
                resolve();
                return;
            }

            this.device.releaseInterface(this.webusb_iface)
            .then(() => {
                this.device.close()
                .then(() => { resolve(); })
                .catch(() => { reject(); });
            })
            .catch(() => { reject(); });
        });
    }


    public isConnected(): boolean {
        return this.device && this.device.opened;
    }

    public isAshellReady(): boolean {
        return this.ashellReady;
    }

    public read(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.device.transferIn(3, 64).then((response: any) => {
                let decoded = this.decoder.decode(response.data);
                resolve(decoded);
            });
        });
    }

    public init() {
        if (this.webusb_iface === WEBUSB_UART) {
            this.send('\n');
        }
    }

    public send(data: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (data.length === 0) {
                reject('Empty data');
            }
            this.device.transferOut(2, this.encoder.encode(data))
            .then(() => { resolve(); })
            .catch((error: string) => { reject(error); });
        });
    }

    public async sendSync(data: string) {
        if (data.length === 0) {
            return;
        }
        await this.device.transferOut(2, this.encoder.encode(data));
    }

    public sleep (time: number) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    public save(filename: string, data: string, throttle: boolean): Promise<string> {
        if (this.ideMode) {
            return  this.sendIdeSave(filename, data, throttle);
        }
        return this.sendConsoleSave(filename, data, throttle);
    }

    public run(data: string, throttle: boolean): Promise<string> {
        if (this.ideMode) {
            return  this.sendIdeRun(data);  // data: a file name
        }
        return this.sendConsoleRun(data, throttle);  // data: stream (program)
    }

    public stop(): Promise<string> {
        if (this.ideMode) {
            return  this.sendIdeStop();  // takes a file name
        }
        return this.sendConsoleStop();  // takes a stream (program)
    }

    public sendIdeInit(): Promise<string>  {
        this.state = 'init';
        return this.send('{init}\n');
        // TODO: start timer for reply
    }

    public sendIdeSave(filename: string, data: string, throttle: boolean): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (data.length === 0) {
                reject('Empty data');
            }

            if (filename.length === 0) {
                reject('Empty file name');
            }

            this.state = 'save';
            let first = '{save ' + filename + ' ' + '$';  // stream start
            let last = '#}\n';  // stream end
            this.send(first)
                .then(async () => {
                    var count = 0;
                    for (let line of data.split('\n')) {
                        // Every 20 lines sleep for a moment to let ashell
                        // catch up if throttle is enabled.
                        if (!throttle || count < 20) {
                            this.send(line + '\n');
                        } else {
                            await this.sleep(700);
                            this.send(line + '\n');
                            count = 0;
                        }
                        count ++;
                    }
                })
                .then(() => this.send(last))
                .then(() => { resolve(); })
                .catch((error:string) => { reject(error); });
        });
    }

    public sendIdeRun(filename: string): Promise<string> {
        this.state = 'run';
        return this.send('{run ' + filename + '}\n');
    }

    public sendIdeStop(): Promise<string> {
        this.state = 'stop';
        return this.send('{stop}\n');
    }

    public sendIdeList(): Promise<string> {
        this.state = 'list';
        return this.send('{ls}\n');
    }

    public sendIdeMove(oldName: string, newName: string): Promise<string> {
        this.state = 'move';
        return this.send('{mv ' + oldName + ' ' + newName + '}\n');
    }

    public sendIdeRemove(filename: string): Promise<string> {
        this.state = 'remove';
        return this.send('{rm ' + filename + '}\n');
    }

    public sendIdeBoot(filename: string): Promise<string> {
        this.state = 'boot';
        return this.send('{boot ' + filename + '}\n');
    }

    public sendIdeReboot(): Promise<string> {
        this.state = 'reboot';
        return this.send('{reboot}\n');
    }

    private sendConsoleSave(filename: string, data: string, throttle: boolean): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (data.length === 0) {
                reject('Empty data');
            }

            if (filename.length === 0) {
                reject('Empty File Name');
            }

            this.send('echo off\n')
                .then(() => this.send('set transfer raw\n'))
                .then(() => this.send('stop\n'))
                .then(() => this.send('load ' + filename + '\n'))
                .then(async () => {
                    var count = 0;
                    for (let line of data.split('\n')) {
                        // Every 20 lines sleep for a moment to let ashell
                        // catch up if throttle is enabled. This prevents
                        // overflowing the UART.
                        if (!throttle || count < 20) {
                            this.send(line + '\n');
                        } else {
                            await this.sleep(700);
                            this.send(line + '\n');
                            count = 0;
                        }
                        count ++;
                    }
                })
                .then(() => this.send('\x1A\n'))
                .then(() => this.send('echo on\n'))
                .then((warning: string) => resolve(warning))
                .catch((error: string) => reject(error));
        });
    }

    private ideHandler(input: any): boolean {
        try {
            let str = this.decoder.decode(input.data); // may be partial JSON
            this.onReceive(str);  // For now, just echo whatever is received
            // TODO: wait until a full this.message is received, then JSON.parse.
        } catch (err) {
            return false;
        }
        return true;
    }

    private terminalHandler(input: any) {
        let skip = true,
            skip_prompt = true,
            str = this.decoder.decode(input.data);


        if (!this.ashellReady)
            this.ashellReady = /^(\x1b\[33macm)/.test(str);

        if (str === 'raw') {
            this.rawMode = true;
            str = '';
        } else if (str === 'ihex') {
            this.rawMode = false;
            str = '';
        }

        skip = !this.rawMode && /^(\n|\[.*\])/.test(str);

        if (str === 'echo_off') {
            this.echoMode = false;
            str = '';
        } else if (str === 'echo_on') {
            this.echoMode = true;
            str = '';
        }

        skip_prompt = !this.echoMode && /^(\r|\n|\x1b\[33macm)/.test(str);

        if (!skip && !skip_prompt) {
            if (str.length === 1 &&
                str.charCodeAt(0) !== 13 &&
                str.charCodeAt(0) !== 10 &&
                this.previousRead !== undefined &&
                this.previousRead.charCodeAt(
                    this.previousRead.length - 1) === 13) {
                str = '\r\n' + str;
            }

            this.onReceive(str);
        }

        if (!skip)
            this.previousRead = str;
    }

    private handleInput(result: any) {
        // TODO: check status: "ok", "stall", "babble"
        if (this.ideMode) {
            this.ideHandler(result);
        } else {
            this.terminalHandler(result);
        }
    }

    private sendConsoleRun(data: string, throttle: boolean): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (data.length === 0) {
                reject('Empty data');
            }

            this.send('echo off\n')
                .then(() => this.send('set transfer ihex\n'))
                .then(() => this.send('stop\n'))
                .then(() => this.send('load\n'))
                .then(async () => {
                    let ihex =
                        this.convIHex(data);
                    var count = 0;
                    for (let line of ihex.split('\n')) {
                        // Every 20 lines sleep for a moment to let ashell
                        // catch up if throttle is enabled. This prevents
                        // overflowing the UART
                        if (!throttle || count < 20) {
                            this.send(line + '\n');
                        } else {
                            await this.sleep(700);
                            this.send(line + '\n');
                            count = 0;
                        }
                        count ++;
                    }
                })
                .then(() => this.send('run temp.dat\n'))
                .then(() => this.send('set transfer raw\n'))
                .then(() => this.send('echo on\n'))
                .then((warning: string) => resolve(warning))
                .catch((error: string) => reject(error));
        });
    }

    private sendConsoleStop(): Promise<string> {
        return this.send('stop\n');
    }

    private convIHex(source: string): string {
      let array = intArrayFromString(source);
      let ptr = allocate(array, 'i8', ALLOC_NORMAL);
      let output = _convert_ihex(ptr);
      let iHexString = Pointer_stringify(output);
      _free(ptr);
      return iHexString;
    }
}
