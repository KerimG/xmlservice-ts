import { randomUUID } from 'crypto';
import { LocalTransport } from './Transports/LocalTransport';
import { ConnectConfig } from 'ssh2';
import { SshTransport } from './Transports/SshTransport';

export type IBMiTransport = LocalTransport | SshTransport;

export type IBMiConnectionConfig =
  | {
      xmlservicePath?: string;
      stateful?: boolean;
      ipcPath?: string;
      transport?: 'local';
      sshConfig?: never;
    }
  | {
      xmlservicePath?: string;
      stateful?: boolean;
      ipcPath?: string;
      transport: 'ssh'; // if transport is ssh, sshConfig is required
      sshConfig: ConnectConfig;
    };

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

    if (this.#transport === 'local') {
      this.#transporter = new LocalTransport();
    } else if (this.#transport === 'ssh' && config?.sshConfig) {
      this.#transporter = new SshTransport(config.sshConfig);
    } else {
      throw new Error('Invalid transport. Must be "local" or "ssh" with corresponding config.');
    }
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
