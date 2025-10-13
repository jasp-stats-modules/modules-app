import { useQuery } from '@tanstack/react-query';
import { QWebChannel } from './qwebchannel';

export interface Info {
  version: string;
  arch: string;
  theme: string;
  developerMode: boolean;
  font: string;
  language: string;
  installedModules: Record<string, string>;
}

interface QtSignal<T> {
  connect: (callback: (data: T) => void) => void;
  disconnect: (callback: (data: T) => void) => void;
}

type EnvironmentInfoChanged = QtSignal<Info>;

// Interface as used in react
interface JaspObject {
  uninstall: (module: string) => Promise<void>;
  info: () => Promise<Info>;
  environmentInfoChanged: EnvironmentInfoChanged;
}

// Interface as provided by Qt
interface JaspQtObject {
  __id__: string;
  uninstall: (module: string, callback: () => void) => void;
  info: (callback: (info: Info) => void) => void;
  environmentInfoChanged: EnvironmentInfoChanged;
}

interface JaspQWebChannel {
  objects: {
    moduleStore: JaspQtObject;
  };
}

export const insideQt = typeof qt !== 'undefined';

export async function jaspQtObject(): Promise<JaspObject | null> {
  if (!insideQt) {
    return null;
  }
  const channel = await createQtWebChannel(qt.webChannelTransport);
  const moduleStoreApi = channel.objects.moduleStore;
  return {
    info: () => {
      return new Promise<Info>((resolve, reject) => {
        try {
          moduleStoreApi.info((info: Info) => {
            resolve(info);
          });
        } catch (error) {
          reject(error);
        }
      });
    },
    uninstall: (module: string) => {
      return new Promise<void>((resolve, reject) => {
        try {
          moduleStoreApi.uninstall(module, () => {
            resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
    },
    environmentInfoChanged: moduleStoreApi.environmentInfoChanged,
  };
}

async function createQtWebChannel(
  transport: WebSocket,
): Promise<JaspQWebChannel> {
  return new Promise<JaspQWebChannel>((resolve, reject) => {
    try {
      // @ts-expect-error
      new QWebChannel(transport, (channel: JaspQWebChannel) => {
        resolve(channel);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function useJaspQtObject() {
  return useQuery({
    queryKey: ['jaspQtObject'],
    queryFn: jaspQtObject,
  });
}
