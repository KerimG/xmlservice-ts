import { randomUUID } from 'crypto';
import { LocalTransport } from './Transports/LocalTransport';

export type IBMiTransport = LocalTransport;

export interface IBMiConnectionConfig {
  xmlservicePath?: string;
  stateful?: boolean;
  ipcPath?: string;
  transport?: 'local';
}

export interface XmlserviceResult {
  output: string | null;
  signal: string | null;
  code: number | null;
}

export class IBMiConnection {
  #xmlservicePath: string;
  #stateful: boolean;
  #ipcPath: string;
  #transport: string;

  #xmlserviceParams: string[];
  #transporter: IBMiTransport;

  constructor(config?: IBMiConnectionConfig) {
    this.#xmlservicePath = config?.xmlservicePath || '/QOpenSys/pkgs/bin/xmlservice-cli';
    this.#stateful = config?.stateful || false;
    this.#ipcPath = '';
    this.#transport = config?.transport || 'local';

    this.#xmlserviceParams = [];

    if (this.#stateful) {
      this.#ipcPath = config?.ipcPath || `/tmp/xmlservice-${randomUUID()}`;
      this.#xmlserviceParams.push('-c', '*sbmjob', '-i', this.#ipcPath);
    }

    this.#transporter = new LocalTransport();
  }

  connect(): Promise<void> {
    return this.#transporter.connect();
  }

  execute(xmlIn?: string): Promise<XmlserviceResult> {
    return this.#transporter.execute(this.#xmlservicePath, this.#xmlserviceParams, xmlIn);
  }

  end(): Promise<XmlserviceResult> {
    return this.#transporter.execute(this.#xmlservicePath, ['-c', '*immed', '-i', this.#ipcPath]);
  }

  disconnect(): Promise<void> {
    return this.#transporter.disconnect();
  }
}
