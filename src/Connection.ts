import { spawn } from 'child_process';

interface ConnectionConfig {
  xmlservicePath?: string;
  stateful?: boolean;
}

export class Connection {
  #xmlservicePath: string;
  stateful: boolean;

  constructor(config: ConnectionConfig) {
    this.stateful = config.stateful || false;
    this.#xmlservicePath = config.xmlservicePath || '/QOpenSys/pkgs/bin/xmlservice-cli';
  }

  execute(xmlIn: string) {
    return new Promise((resolve, reject) => {
      console.log(this.#xmlservicePath);
      const xmlservice = spawn(this.#xmlservicePath);
      let data: Buffer[] = [];

      xmlservice.stdout.on('data', (chunk) => {
        data.push(chunk);
      });

      xmlservice.on('close', (code, signal) => {
        const output = Buffer.concat(data).toString();

        if (code === 0) {
          resolve(output);
        } else {
          reject(output);
        }
      });

      xmlservice.stdin.write(`${xmlIn}\n`);
      xmlservice.stdin.end();
    });
  }
}
