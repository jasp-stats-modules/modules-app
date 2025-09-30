import { useEffect, useState } from 'react';
import { QWebChannel } from './qwebchannel';
import { useQuery } from '@tanstack/react-query';

/*

rm -r ../jasp-desktop/Desktop/html/store/
BASE_URL=/html/store/ pnpm build
cp -r dist ../jasp-desktop/Desktop/html/store/


rm -r jasp-build/Desktop/.qt/rcc/html.qrc 
cmake --build jasp-build --target all -j6
QTWEBENGINE_REMOTE_DEBUGGING=8123 ./jasp-build/Desktop/JASP --safeGraphics 
*/

interface Info {
  version: string;
  arch: string;
  theme: string;
  developerMode: boolean;
  font: string;
  language: string;
  installedModules: Record<string, string>;
}

interface JaspObject {
  uninstall: (module: string) => void;
  info: () => Promise<Info>;
}

interface JaspQtObject {
  uninstall: (module: string) => void;
  info: (callback: (info: Info) => void) => void;
}


interface JaspQWebChannel {
  objects: {
    // When in ModuleMenu.qml the url is http://<ipaddress>:3000
    // then WebChannel.id is 'undefined'
    undefined: JaspQtObject;
  };
}

export async function jaspQtObject(): Promise<JaspObject | null> {
  const insideQt = typeof qt !== 'undefined';
  console.log(qt)
  if (!insideQt) {
    return null;
  }
  const channel = await createQtWebChannel(qt.webChannelTransport);
  console.log('Created Qt WebChannel', channel.objects);
  const jasp = channel.objects.undefined;
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
    uninstall: jasp.uninstall,
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
