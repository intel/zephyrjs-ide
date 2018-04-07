// Suppress warning TS2304 for known objects
declare const ALLOC_NORMAL: number;
declare function intArrayFromString(s: string): number[];
declare function allocate(array: number[], type: string, strategy: number): any;
declare function _convert_ihex(ptr: any): any;
declare function Pointer_stringify(ptr: any): string;
declare function _free(ptr: any): any;

const WEBUSB_RAW = 0;

export class WebUsbPort {
    device: any;
    decoder: any;
    encoder: any;
    ashellReady: boolean;
    // IDE protocol related
    state: string;  // init, idle, save, run, stop, list, move, remove, boot, reboot
    webusb_iface: number;  // 0 for raw WebUSB
    reading: boolean;
    message: string;
    saveData: Array<string>;
    runAfterSave: boolean;

    constructor(device: any) {
        this.device = device;
        this.decoder = new (window as any).TextDecoder();
        this.encoder = new (window as any).TextEncoder('utf-8');
        // IDE protocol related
        this.state = 'init';
        this.webusb_iface = WEBUSB_RAW;
        this.runAfterSave = false;
    }

    public onReceive(data: string) {
        // tslint:disable-next-line:no-empty
    }

    public onReceiveError(error: DOMException) {
        // tslint:disable-next-line:no-empty
    }

    public connect(): Promise<void> {
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
                    this.ashellReady = true;
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

    public sleep (time: number) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    public save(filename: string, data: string, throttle: boolean): Promise<string> {
        this.state = 'save';
        return this.sendIdeSaveStart(filename, data);
    }

    public run(data: string, throttle: boolean): Promise<string> {
            let webusbThis = this;
            // Save the file first. Once thats done, it will run temp.dat
            this.runAfterSave = true;
            return webusbThis.save('temp.dat', data, false);
    }

    public stop(): Promise<string> {
        this.state = 'stop';
        return this.send('{stop}\n');
    }

    public init(): Promise<string>  {
        this.state = 'init';
        return this.send('{init}\n');
    }

    public sendIdeSaveStart(filename: string, data: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.saveData = data.split('\n');
            this.send('{save ' + filename + ' ' + '$')
            .then(() => {
                 resolve("Saving to file");
             })
            .catch((error:string) => { reject(error); });
        });
    }

    public sendIdeSaveEnd(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.send('#}')
            .then(() => {
                this.state = 'idle';
                resolve(true);
            })
            .catch((error:string) => { reject(false); });
        });
    }

    public sendIdeSave() {
        if (this.saveData.length === 0 && this.state === 'save') {
            this.sendIdeSaveEnd().then(async () => {
                // Check if we need to run the file
                if (this.runAfterSave) {
                    this.runAfterSave = false;
                    // Delay run to ensure device is done with the save
                    await this.sleep(1500);
                    this.sendIdeRun('temp.dat');
                }
            });
            // Done saving file, return and exit.
            return;
        }

        let str = this.saveData.shift();
        if (typeof(str) === 'string') {
            this.send(str + '\n');
        }
    }

    public sendIdeRun(filename: string): Promise<string> {
        this.state = 'run';
        return this.send('{run ' + filename + '}\n');
    }

    public sendIdeMove(oldName: string, newName: string): Promise<string> {
        this.state = 'move';
        return this.send('{mv ' + oldName + ' ' + newName + '}\n');
    }

    public sendIdeBoot(filename: string): Promise<string> {
        this.state = 'boot';
        return this.send('{boot ' + filename + '}\n');
    }

    public sendIdeReboot(): Promise<string> {
        this.state = 'reboot';
        return this.send('{reboot}\n');
    }

    private handleInput(input: any): boolean {
        try {
            let str = this.decoder.decode(input.data); // may be partial JSON
            this.onReceive(str);  // For now, just echo whatever is received
            // TODO: wait until a full this.message is received, then JSON.parse.
        } catch (err) {
            return false;
        }
        return true;
    }
}
