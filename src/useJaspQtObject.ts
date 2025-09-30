import { useEffect, useState } from 'react';
import { QWebChannel } from './qwebchannel';

/*

rm -r ../jasp-desktop/Desktop/html/store/
BASE_URL=/html/store/ pnpm build
cp -r dist ../jasp-desktop/Desktop/html/store/


rm -r jasp-build/Desktop/.qt/rcc/html.qrc 
cmake --build jasp-build --target all -j6
QTWEBENGINE_REMOTE_DEBUGGING=8123 ./jasp-build/Desktop/JASP --safeGraphics 
*/

interface ModuleInfo {
  name: string;
  version: string;
}

interface JaspQtObject {
  uninstall: (module: string) => void;
  listOfModules: () => Promise<ModuleInfo[]>;
}

interface JaspQWebChannel {
  objects: {
    // When in ModuleMenu.qml the url is http://<ipaddress>:3000
    // then WebChannel.id is 'undefined'
    undefined: JaspQtObject;
  };
}

export async function jaspQtObject(): Promise<JaspQtObject | null> {
  const insideQt = typeof qt !== 'undefined';
  if (!insideQt) {
    return null;
  }
  const channel = await createQtWebChannel(qt.webChannelTransport);
  console.log('Created Qt WebChannel', channel.objects);
  return channel.objects.undefined;
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

export function useJaspQtObject(): JaspQtObject | null {
  const [jasp, setJasp] = useState<JaspQtObject | null>(null);

  useEffect(() => {
    jaspQtObject().then((d) => {
      console.log('Got jaspQtObject', d);
      setJasp(d);
    });
  }, []);

  return jasp;
}
