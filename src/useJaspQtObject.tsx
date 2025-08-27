import { useEffect, useState } from 'react';
import { QWebChannel } from './qwebchannel';

interface JaspQtObject {
  uninstall: (module: string) => void;
}
interface JaspQWebChannel {
  objects: {
    jasp: JaspQtObject;
  };
}

async function jaspQtObject(): Promise<JaspQtObject | null> {
  const insideQt = typeof qt !== 'undefined';
  if (!insideQt) {
    return null;
  }
  const channel = await createQtWebChannel(qt.webChannelTransport);
  return channel.objects.jasp;
}

async function createQtWebChannel(
  transport: WebSocket
): Promise<JaspQWebChannel> {
  return new Promise<JaspQWebChannel>((resolve, reject) => {
    try {
      QWebChannel(transport, (channel: JaspQWebChannel) => {
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
    jaspQtObject().then(setJasp);
  }, []);

  return jasp;
}
