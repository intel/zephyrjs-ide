// Suppress warning TS2304 for known objects
declare const ALLOC_NORMAL: number;
declare function intArrayFromString(s: string): number[];
declare function allocate(array: number[], type: string, strategy: number): any;
declare function _convert_ihex(ptr: any): any;
declare function Pointer_stringify(ptr: any): string;
declare function _free(ptr: any): any;


export class WebUsbPort {
    device: any;
    decoder: any;
    encoder: any;
    rawMode: boolean;
    echoMode: boolean;
    previousRead: string;
    ashellReady: boolean;

    constructor(device: any) {
        this.device = device;
        this.decoder = new (window as any).TextDecoder();
        this.encoder = new (window as any).TextEncoder('utf-8');
    }

    public onReceive(data: string) {
        // tslint:disable-next-line:no-empty
    }

    public onReceiveError(error: DOMException) {
        // tslint:disable-next-line:no-empty
    }

    public connect(): Promise<void> {
        this.rawMode = true;
        this.echoMode = true;
        this.ashellReady = false;

        return new Promise<void>((resolve, reject) => {
            let readLoop = () => {
                this.device.transferIn(3, 64).then((result: any) => {
                    let skip = true,
                        skip_prompt = true,
                        str = this.decoder.decode(result.data);

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

                    if (this.device.opened) {
                        readLoop();
                    }
                }, (error: DOMException) => {
                    this.onReceiveError(error);
                });
            };

            this.device.open()
            .then(() => {
                if (this.device.configuration === null) {
                    this.device.selectConfiguration(1);
                }

                this.device.claimInterface(2)
                .then(() => {
                    this.device.controlTransferOut({
                        requestType: 'class',
                        recipient: 'interface',
                        request: 0x22,
                        value: 0x01,
                        index: 0x02})
                    .then(() => {
                        readLoop();
                        resolve();
                    })
                    .catch((error: DOMException) => {
                        reject('Unable to send control data to the device');
                    });
                })
                .catch((error: DOMException) => {
                    reject('Unable to claim device interface');
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

            this.device.releaseInterface(2)
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

    public save(filename: string, data: string): Promise<string> {
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
                .then(() => {
                    for (let line of data.split('\n')) {
                        this.send(line + '\n');
                    }
                })
                .then(() => this.send('\x1A\n'))
                .then(() => this.send('echo on\n'))
                .then((warning: string) => resolve(warning))
                .catch((error: string) => reject(error));
        });
    }


public sleep (time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

    public run(data: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (data.length === 0) {
                reject('Empty data');
            }

            this.send('echo off\n')
                .then(() => this.send('set transfer ihex\n'))
                .then(() => this.send('stop\n'))
                .then(() => this.send('load\n'))
                .then(() => {
                    let ihex =
                        this.convIHex(data);
                    var count = 0;
                    for (let line of ihex.split('\n')) {
                        // Every 20 lines sleep for a moment to let ashell
                        // catch up.  This prevents overflowing the UART
                        if (count < 20) {
                            this.send(line + '\n');
                        } else {
                            this.sleep(700).then(() => {
                            this.send(line + '\n');
                            count = 0;
                            });
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

    public stop(): Promise<string> {
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
