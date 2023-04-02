import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

export interface ConnectionConfig {
  xmlservicePath?: string;
  stateful?: boolean;
  ipcPath?: string;
}

export interface XmlserviceResult {
  output: string | null;
  signal: string | null;
  code: number | null;
}

export class Connection {
  #xmlservicePath: string;
  #stateful: boolean;
  #ipcPath: string;

  #xmlserviceParams: string[];

  constructor(config?: ConnectionConfig) {
    this.#xmlservicePath = config?.xmlservicePath || '/QOpenSys/pkgs/bin/xmlservice-cli';
    this.#ipcPath = '';
    this.#stateful = config?.stateful || false;
    this.#xmlserviceParams = [];

    if (this.#stateful) {
      this.#ipcPath = config?.ipcPath || `/tmp/xmlservice-${randomUUID()}`;
      this.#xmlserviceParams.push('-c', '*sbmjob', '-i', this.#ipcPath);
    }
  }

  execute(xmlIn?: string): Promise<XmlserviceResult> {
    return new Promise((resolve, reject) => {
      const inputBuffer = xmlIn ? Buffer.from(xmlIn) : null;
      const outputBuffer: Buffer[] = [];
      const result: XmlserviceResult = {
        output: null,
        signal: null,
        code: null,
      };

      const xmlservice = spawn(this.#xmlservicePath, this.#xmlserviceParams);

      xmlservice.stdout.on('data', (chunk) => {
        outputBuffer.push(chunk);
      });

      xmlservice.on('close', (code, signal) => {
        result.output = Buffer.concat(outputBuffer).toString();
        result.code = code;
        result.signal = signal;

        if (code === 0) {
          resolve(result);
        } else {
          reject(result);
        }
      });

      if (xmlIn) {
        xmlservice.stdin.write(inputBuffer);
        xmlservice.stdin.end();
      }
    });
  }

  end(): Promise<XmlserviceResult> {
    return new Promise((resolve, reject) => {
      const result: XmlserviceResult = {
        output: null,
        signal: null,
        code: null,
      };
      if (this.#stateful) {
        const xmlservice = spawn(this.#xmlservicePath, ['-c', '*immed', '-i', this.#ipcPath]);

        xmlservice.on('close', (code, signal) => {
          result.code = code;
          result.signal = signal;

          if (code === 0) {
            resolve(result);
          } else {
            reject(result);
          }

          xmlservice.stdin.end();
        });
      } else {
        result.code = 0;
        resolve(result);
      }
    });
  }
}
