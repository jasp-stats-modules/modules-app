import i18n from 'i18next';

import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'Search for a module': 'Search for a module',
    },
  },
  ar: {
    translation: {
      'Search for a module': 'ابحث عن وحدة',
    },
  },
  cs: {
    translation: {
      'Search for a module': 'Hledat modul',
    },
  },
  de: {
    translation: {
      'Search for a module': 'Modul suchen',
    },
  },
  es: {
    translation: {
      'Search for a module': 'Buscar un módulo',
    },
  },
  et: {
    translation: {
      'Search for a module': 'Otsi moodulit',
    },
  },
  eu: {
    translation: {
      'Search for a module': 'Bilatu modulua',
    },
  },
  fr: {
    translation: {
      'Search for a module': 'Rechercher un module',
    },
  },
  gl: {
    translation: {
      'Search for a module': 'Buscar un módulo',
    },
  },
  hu: {
    translation: {
      'Search for a module': 'Modul keresése',
    },
  },
  id: {
    translation: {
      'Search for a module': 'Cari modul',
    },
  },
  it: {
    translation: {
      'Search for a module': 'Cerca un modulo',
    },
  },
  ja: {
    translation: {
      'Search for a module': 'モジュールを検索',
    },
  },
  lt: {
    translation: {
      'Search for a module': 'Ieškoti modulio',
    },
  },
  nl: {
    translation: {
      'Search for a module': 'Zoek een module',
    },
  },
  pl: {
    translation: {
      'Search for a module': 'Szukaj modułu',
    },
  },
  pt: {
    translation: {
      'Search for a module': 'Procurar um módulo',
    },
  },
  ru: {
    translation: {
      'Search for a module': 'Поиск модуля',
    },
  },
  sq: {
    translation: {
      'Search for a module': 'Kërko një modul',
    },
  },
  sr: {
    translation: {
      'Search for a module': 'Претражи модул',
    },
  },
  tr: {
    translation: {
      'Search for a module': 'Bir modül ara',
    },
  },
  zh_Hans: {
    translation: {
      'Search for a module': '搜索模块',
    },
  },
  zh_Hant: {
    translation: {
      'Search for a module': '搜尋模組',
    },
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
