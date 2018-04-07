import { Injectable } from '@angular/core';
import { WebUsbPort } from './webusb.port';
import { SettingsService } from '../../pages/editor/settings.service';

/**
 * This class provides the WebUsb service.
 */
@Injectable()
export class WebUsbService {
    public usb: any = null;
    public port: WebUsbPort = null;
    private incomingData = [];
    private incomingDataStr = "";
    private incomingCB: any = null;
    private fileCount: number = 0;
    private fileArray = [];
    private fileData = "";
    private replyState: string;

    constructor(private settingsService: SettingsService) {
        this.usb = (navigator as any).usb;
    }

    public consolePrint(data: string) {
        // To be set once connected
    }

    // Handle incoming data from the device
    public onReceive(data: string) {
        // Check if this is a reply message
        let replyType = this.incomingReply(data);
        if (replyType && replyType !== "none") {
            this.incomingDataStr = "";
            this.replyState = replyType;
        }
        // If currenly receiving a reply message stream, handle it
        if (this.replyState) {
            switch(this.replyState) {
                case "cat":
                    // Skip the reply lines by only recording stuff between
                    if (replyType === null)
                        this.fileData += data;
                break;
                case "list":
                    this.incomingDataStr += data;
                break;
                case "save":
                    this.port.sendIdeSave();
                break;
                default:
                break;
            }
        }
        else if (replyType === null){
            // This is a console print message
            if (this.consolePrint) {
                this.consolePrint(data);
            }
            console.log(data);
        }

        if (this.replyState && this.replyDone(data)) {
            switch(this.replyState) {
                case "cat":
                    if (this.incomingCB)
                        this.incomingCB(this.fileData);
                    this.fileData = "";
                break;
                case "list":
                    let replyObj = this.parseJSON(this.incomingDataStr);
                    if (this.incomingCB)
                        this.incomingCB(replyObj);
                    this.incomingDataStr = "";
                break;
                case "rm":
                    if (this.incomingCB)
                        this.incomingCB(replyObj);
                break;
                default:
                break;
            }
            this.replyState = null;
            this.incomingCB = null;
        }
    }

    public onReceiveError(error: DOMException) {
        // tslint:disable-next-line:no-empty
    }

    public requestPort(): Promise<WebUsbPort> {
        return new Promise<WebUsbPort>((resolve, reject) => {
            const filters = [
                {'vendorId': 0x8086, 'productId': 0xF8A1},
                {'vendorId': 0xDEAD, 'productId': 0xBEEF}
            ];

            if (this.usb === undefined) {
                reject('WebUSB not available');
            }

            this.usb.requestDevice({'filters': filters})
            .then((device: any) => {
                resolve(new WebUsbPort(device));
            })
            .catch((error: string) => {
                reject(error);
            });
        });
    }

    public connect(): Promise<void> {
        let _doConnect = (): Promise<void> => {
            return this.port.connect().then(() => {
                this.port.onReceive = (data: string) => {
                    this.onReceive(data);
                };

                this.port.onReceiveError = (error: DOMException) => {
                    this.onReceiveError(error);
                };
                // Go ahead and get the file list / count
                this.lsArray();
            });
        };

        if (this.port !== null) {
            return _doConnect();
        }

        return new Promise<void>((resolve, reject) => {
            let _onError = (error: DOMException) => {
                this.port = null;
                reject(error);
            };

            this.requestPort()
            .then((p: WebUsbPort) => {
                this.port = p;
                _doConnect()
                .then(() => resolve())
                .catch((error: DOMException) => _onError(error));
            })
            .catch((error: DOMException) => _onError(error));
        });
    }

    public disconnect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.port === null) {
                resolve();
            } else {
                this.port.disconnect()
                .then(() => {
                    this.port = null;
                    resolve();
                })
                .catch((error: DOMException) => {
                    this.port = null;
                    reject(error);
                });
            }
        });
    }

    public isConnected(): boolean {
        return this.port !== null && this.port.isConnected();
    }

    public isAshellReady(): boolean {
        return this.port.isAshellReady();
    }

    public send(data: string): Promise<string> {
        return this.port.send(data);
    }

    public init() {
        this.port.init();
    }

    public run(data: string): Promise<string> {
        let throttle = this.settingsService.getDeviceThrottle();
        return this.port.run(data, throttle);
    }

    public stop(): Promise<string> {
        return this.port.stop();
    }

    public load(data: string) : Promise<string> {
        let webusbThis = this;
        let loadStr = '';
        return( new Promise<string> ((resolve, reject) => {
            webusbThis.sendWithCB('{cat ' + data + '}\n', function (retStr: string) {
                resolve(retStr);
            });
        }));
    }

    // Send a command 'data' and resolve using 'cb' once the device replies
    public sendWithCB(data: string, cb: any) {
        this.incomingCB = cb;
        this.send(data);
    }

    public rm(data: string) : Promise<string> {
        let webusbThis = this;
        return (new Promise<string> ((resolve, reject) => {
            webusbThis.sendWithCB('{rm ' + data + '}\n', function() {
                resolve('rm ' + data + ' done');
            });
        }));
    }

    // Returns an array of the files on the device
    public lsArray(): Promise<Array<string>> {
        if (this.port) {
            let retArray = [];
            let webusbThis = this;
            webusbThis.fileArray = [];
            return( new Promise<Array<string>> ((resolve, reject) => {
                webusbThis.sendWithCB('{ls}\n', function (retObj: {"data":Array<object>}) {
                    webusbThis.fileArray = retObj.data;
                    webusbThis.fileCount = webusbThis.fileArray.length;
                    resolve(webusbThis.fileArray);
                });
            }));
        } else {
            return new Promise((resolve, reject) => {
                resolve([]);
            });
        }
    }

    public save(filename: string, data: string): Promise<string> {
        if (this.port === null) {
            return new Promise<string>((resolve, reject) => {
                reject('No device connection established');
            });
        }

        let throttle = this.settingsService.getDeviceThrottle();
        return this.port.save(filename, data, throttle);
    }

    public deviceFileCount(): number {
        return this.fileCount;
    }

    // Returns true if the reply is properly closed.
    private replyDone(str: string) {
        if (this.replyState === "cat") {
            return (/"data":[\s\S]"end"/).test(str);
        }
        return (/.*"status"\s*:\s*([0-9]+).*$/m).test(str);
    }

    // Returns the reply type if its a reply, null if it is not a reply
    private incomingReply(str: string): string {
        let replyObj = ((/"reply"(.*?)"(.*?)"/).exec(str));
        if (replyObj) {
            let replyStr = replyObj[0];
            let splitObj = replyStr.split(':').map(item => item.trim());
            if (splitObj.length == 2)
                return splitObj[1].replace(/['"]+/g, '');
            else
                return null;
        }
        return null;
    }

    private parseJSON = function (str: string): object {
        let retVal = null;
        try {
            retVal = JSON.parse(str);
            return retVal;
        } catch (e) {
            return retVal;
        }
    }
}
