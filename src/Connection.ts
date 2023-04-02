import { Client, ConnectConfig } from 'ssh2';

export class Connection {
  #client: Client;
  #config: ConnectConfig;

  constructor(config: ConnectConfig) {
    this.#client = new Client();
    this.#config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.#client.on('ready', () => {
        resolve();
      });

      this.#client.on('error', (error) => {
        reject(new Error(`Could not connect to server. Error: ${error}`));
      });
      this.#client.connect(this.#config);
    });
  }

  runShellCommand(command: string, stdin?: string) {
    return new Promise((resolve, reject) => {
      const stdoutBufferChunks: Buffer[] = [];
      const stderrBufferChunks: Buffer[] = [];
      const stdinBuffer = stdin ? Buffer.from(stdin) : undefined;

      this.#client.exec(command, (error, stream) => {
        if (error) {
          reject(error);
        }

        stream.on('close', (code: number, signal: string | undefined) => {
          const result = {
            code,
            signal,
            output: Buffer.concat(stdoutBufferChunks).toString(),
            error: Buffer.concat(stderrBufferChunks).toString(),
          };

          if (stderrBufferChunks.length > 0) {
            reject(result);
          }
          resolve(result);
        });

        stream.on('data', (data: Buffer) => {
          stdoutBufferChunks.push(Buffer.from(data));
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderrBufferChunks.push(Buffer.from(data));
        });

        if (stdinBuffer) {
          stream.stdin.write(stdinBuffer);
          stream.stdin.end();
        }
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
