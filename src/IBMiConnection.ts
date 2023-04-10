import { randomUUID } from 'crypto';
import { LocalTransport } from './Transports/LocalTransport';
import { Client, ConnectConfig } from 'ssh2';
import { SshTransport } from './Transports/SshTransport';

export type IBMiTransport = LocalTransport | SshTransport;

export type IBMiConnectionConfig = {
  xmlservicePath?: string;
  stateful?: boolean;
  ipcPath?: string;
} & TransportOptions;

type TransportOptions =
  | {
      transport?: 'local';
    }
  | {
      transport: 'ssh'; // if transport is ssh, sshConfig is required
      sshConfig: ConnectConfig;
    }
  | {
      transport: 'ssh';
      sshConfig?: never;
      sshClient: Client; // it's also possible to pass one's own SSH Connection to the transport
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

  #xmlserviceParams: string[];
  #transporter: IBMiTransport;

  constructor(config?: IBMiConnectionConfig) {
    this.#xmlservicePath = config?.xmlservicePath || '/QOpenSys/pkgs/bin/xmlservice-cli';
    this.#stateful = config?.stateful || false;
    this.#ipcPath = '';

    this.#xmlserviceParams = [];

    if (this.#stateful) {
      this.#ipcPath = config?.ipcPath || `/tmp/xmlservice-${randomUUID()}`;
      this.#xmlserviceParams.push('-c', '*sbmjob', '-i', this.#ipcPath);
    }

    if (config?.transport === 'ssh' && config?.sshConfig) {
      this.#transporter = new SshTransport(config.sshConfig);
    } else if (config?.transport === 'ssh' && config?.sshClient) {
      this.#transporter = new SshTransport(config?.sshClient);
    } else if (config?.transport === 'local' || !config?.transport) {
      this.#transporter = new LocalTransport();
    } else {
      throw new Error(`Invalid transport: ${config?.transport}`);
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
