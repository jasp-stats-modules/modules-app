import { useQuery } from '@tanstack/react-query';
import { QWebChannel } from './qwebchannel';

/*

rm -r ../jasp-desktop/Desktop/html/catalog/
BASE_URL=/html/catalog/ pnpm build
cp -r dist ../jasp-desktop/Desktop/html/catalog/


rm -r jasp-build/Desktop/.qt/rcc/html.qrc 
cmake --build jasp-build --target all -j6
QTWEBENGINE_REMOTE_DEBUGGING=8123 ./jasp-build/Desktop/JASP --safeGraphics 
*/

export interface Info {
  version: string;
  arch: string;
  theme: string;
  developerMode: boolean;
  font: string;
  language: string;
  installedModules: Record<string, string>;
}

interface JaspObject {
  uninstall: (module: string) => Promise<void>;
  info: () => Promise<Info>;
}

interface JaspQtObject {
  __id__: string;
  uninstall: (module: string, callback: () => void) => void;
  info: (callback: (info: Info) => void) => void;
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
  };
}

async function createQtWebChannel(
  transport: WebSocket,
): Promise<JaspQWebChannel> {
  return new Promise<JaspQWebChannel>((resolve, reject) => {
    try {
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
