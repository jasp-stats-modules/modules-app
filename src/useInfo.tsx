import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getHTMLTextDir } from 'intlayer';
import {
  parseAsBoolean,
  parseAsJson,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocale } from 'react-intlayer';
import * as v from 'valibot';
import { type Info, insideQt, useJaspQtObject } from '@/useJaspQtObject';

const defaultArchitecture = 'Windows_x86-64';
const defaultInstalledVersion = '0.95.1';
const defaultInstalledModules = () => ({});
const defaultUninstallableModules = () => [];
const installedModulesSchema = v.record(v.string(), v.string());
const uninstallableModulesSchema = v.array(v.string());
const themeSchema = ['dark', 'light', 'system'] as const;
const infoSearchParamKeys = {
  version: parseAsString.withDefault(defaultInstalledVersion),
  arch: parseAsString.withDefault(defaultArchitecture),
  installedModules: parseAsJson(installedModulesSchema).withDefault(
    defaultInstalledModules(),
  ),
  uninstallableModules: parseAsJson(uninstallableModulesSchema).withDefault(
    defaultUninstallableModules(),
  ),
  developerMode: parseAsBoolean.withDefault(false),
  theme: parseAsStringLiteral(themeSchema).withDefault('system'),
  language: parseAsString.withDefault('en'),
  font: parseAsString,
};

function useInfoFromSearchParams(): Info {
  const [queryStates, setQueryStates] = useQueryStates(infoSearchParamKeys, {
    urlKeys: {
      version: 'v',
      arch: 'a',
      theme: 't',
      developerMode: 'p',
      installedModules: 'i',
      uninstallableModules: 'u',
      language: 'l',
      font: 'f',
    },
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: On mount show defaults in address bar
  useEffect(() => {
    setQueryStates(queryStates);
  }, []);
  return queryStates as Info;
}

interface JaspInfoContextValue {
  info: Info;
  isInfoFetched: boolean;
  error: unknown;
}

const JaspInfoContext = createContext<JaspInfoContextValue | undefined>(
  undefined,
);

export function JaspInfoProvider({ children }: { children: ReactNode }) {
  // if app is running inside JASP, then
  // info from Qt webchannel is used otherwise
  // info from search params is used.
  const infoFromSearchParams = useInfoFromSearchParams();
  const {
    data: jasp,
    isFetched: isJaspFetched,
    error: jaspError,
  } = useJaspQtObject();

  // Subscribe to environmentInfoChanged signal to update info
  const queryClient = useQueryClient();
  const callback = (data: Info) => {
    queryClient.setQueryData(['jaspInfo'], data);
  };
  useEffect(() => {
    if (!jasp?.environmentInfoChanged) return;
    jasp.environmentInfoChanged.connect(callback);
    return () => {
      jasp.environmentInfoChanged.disconnect(callback);
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: callback is memoized by react compiler
  }, [jasp?.environmentInfoChanged, callback]);

  // Fetch info
  const {
    data: infoFromQt,
    isFetched: isInfoFetched,
    error: infoError,
  } = useQuery({
    queryKey: ['jaspInfo'],
    queryFn: () => jasp?.info(),
    enabled: insideQt && !!jasp && isJaspFetched,
  });

  const { setLocale } = useLocale();
  useEffect(() => {
    const lang =
      (insideQt && infoFromQt?.language) || infoFromSearchParams.language;
    setLocale(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = getHTMLTextDir(lang);
    }
  }, [infoFromQt?.language, infoFromSearchParams.language, setLocale]);

  const value = useMemo<JaspInfoContextValue>(() => {
    if (!insideQt) {
      return { info: infoFromSearchParams, isInfoFetched: true, error: null };
    }
    if (infoFromQt === undefined) {
      return { info: infoFromSearchParams, isInfoFetched: true, error: null };
    }
    return {
      info: infoFromQt,
      isInfoFetched,
      error: jaspError ?? infoError ?? null,
    };
  }, [infoFromQt, infoFromSearchParams, infoError, isInfoFetched, jaspError]);

  return (
    <JaspInfoContext.Provider value={value}>
      {children}
    </JaspInfoContext.Provider>
  );
}

export function useInfo(): JaspInfoContextValue {
  const context = useContext(JaspInfoContext);
  if (!context) {
    throw new Error('useInfo must be used within a JaspInfoProvider');
  }
  return context;
}
