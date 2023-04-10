import { Client, ConnectConfig } from 'ssh2';
import { XmlserviceResult } from '../IBMiConnection';

export type SshTransportParameter = ConnectConfig | Client;

export class SshTransport {
  #client: Client;
  #config: ConnectConfig | undefined;

  constructor(parameter: SshTransportParameter) {
    if (parameter instanceof Client) {
      this.#client = parameter;
      return;
    }
    this.#client = new Client();
    this.#config = parameter;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.#config) {
        this.#client.on('ready', () => {
          resolve();
        });

        this.#client.on('error', (error) => {
          reject(new Error(`Could not connect to server. Error: ${error}`));
        });
        this.#client.connect(this.#config);
      }

      resolve();
    });
  }

  execute(xmlservicePath: string, xmlserviceParams: string[], xmlIn?: string): Promise<XmlserviceResult> {
    return new Promise((resolve, reject) => {
      const inputBuffer = xmlIn ? Buffer.from(xmlIn) : null;
      const outputBuffer: Buffer[] = [];
      const errorBuffer: Buffer[] = [];
      const result: XmlserviceResult = {
        output: null,
        signal: null,
        code: null,
      };

      this.#client.exec(`${xmlservicePath} ${xmlserviceParams.join(' ')}`, (error, stream) => {
        if (error) {
          reject(error);
        }

        stream.on('data', (chunk: Buffer) => {
          outputBuffer.push(chunk);
        });

        stream.on('close', (code: number, signal: string) => {
          result.output = Buffer.concat(outputBuffer).toString();
          result.code = code;
          result.signal = signal;

          if (code === 0) {
            resolve(result);
          } else {
            reject(Buffer.concat(errorBuffer).toString());
          }
        });

        stream.stderr.on('data', (chunk) => {
          errorBuffer.push(chunk);
        });

        if (inputBuffer) {
          stream.stdin.write(inputBuffer);
        }
        stream.stdin.end();
      });
    });
  }

  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.#client.end();
      resolve();
    });
  }
}
