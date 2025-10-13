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

interface InstalledModulesChanged {
  connect: (
    callback: (installedModules: Record<string, string>) => void,
  ) => void;
  disconnect: (
    callback: (installedModules: Record<string, string>) => void,
  ) => void;
}

interface JaspObject {
  uninstall: (module: string) => Promise<void>;
  info: () => Promise<Info>;
  installedModulesChanged: InstalledModulesChanged;
}

interface JaspQtObject {
  __id__: string;
  uninstall: (module: string, callback: () => void) => void;
  info: (callback: (info: Info) => void) => void;
  installedModulesChanged: InstalledModulesChanged;
}

interface JaspQWebChannel {
  objects: {
    moduleStore: JaspQtObject;
  };
}

export async function jaspQtObject(): Promise<JaspObject | null> {
  const insideQt = typeof qt !== 'undefined';
  if (!insideQt) {
    return null;
  }
  const channel = await createQtWebChannel(qt.webChannelTransport);
  const jasp = channel.objects.moduleStore;
  const ainfo = () => {
    return new Promise<Info>((resolve, reject) => {
      try {
        jasp.info((info: Info) => {
          resolve(info);
        });
      } catch (error) {
        reject(error);
      }
    });
  };
  return {
    info: ainfo,
    uninstall: (module: string) => {
      return new Promise<void>((resolve, reject) => {
        try {
          jasp.uninstall(module, () => {
            resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
    },
    installedModulesChanged: jasp.installedModulesChanged,
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
