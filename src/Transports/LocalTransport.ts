import { spawn } from 'child_process';
import { XmlserviceResult } from '../IBMiConnection';

export class LocalTransport {
  connect(): Promise<void> {
    return Promise.resolve();
  }

  execute(xmlIn, xmlservicePath, xmlserviceParams): Promise<XmlserviceResult> {
    return new Promise((resolve, reject) => {
      const inputBuffer = xmlIn ? Buffer.from(xmlIn) : null;
      const outputBuffer: Buffer[] = [];
      const result: XmlserviceResult = {
        output: null,
        signal: null,
        code: null,
      };

      const xmlservice = spawn(xmlservicePath, xmlserviceParams);

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
      }
      xmlservice.stdin.end();
    });
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }
}
