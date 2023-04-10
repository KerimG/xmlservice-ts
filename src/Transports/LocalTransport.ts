import { spawn } from 'child_process';
import { XmlserviceResult } from '../IBMiConnection';

export class LocalTransport {
  connect(): Promise<void> {
    return Promise.resolve();
  }

  execute(xmlservicePath: string, xmlserviceParams: string[], xmlIn?: string): Promise<XmlserviceResult> {
    return new Promise((resolve, reject) => {
      const inputBuffer = xmlIn ? Buffer.from(xmlIn) : null;
      const outputBuffer: Buffer[] = [];
      const result: XmlserviceResult = {
        output: null,
        signal: null,
        code: null,
      };

      const subprocess = spawn(xmlservicePath, xmlserviceParams);

      subprocess.stdout.on('data', (chunk) => {
        outputBuffer.push(chunk);
      });

      // if starting the subprocess fails. It's not the same as the subprocess returning an error
      subprocess.on('error', (err) => {
        reject(err);
      });

      subprocess.on('close', (code, signal) => {
        result.output = Buffer.concat(outputBuffer).toString();
        result.code = code;
        result.signal = signal;

        if (code === 0) {
          resolve(result);
        } else {
          reject(result);
        }
      });

      if (inputBuffer) {
        subprocess.stdin.write(inputBuffer);
      }
      subprocess.stdin.end();
    });
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }
}
