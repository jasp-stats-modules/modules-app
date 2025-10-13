import i18n from 'i18next';

import { initReactI18next } from 'react-i18next';

const defaultTranslations = {
  'Search for a module': 'Search for a module',
  'Loading list of available modules': 'Loading list of available modules',
  'Select channel': 'Select channel',
  Install: 'Install',
  Update: 'Update',
  Uninstall: 'Uninstall',
  'Uninstall this module': 'Uninstall this module',
  'Pre release': 'Pre release',
  Installed: 'Installed',
  'Latest version is installed': 'Latest version is installed',
  'Go to home page of module': 'Go to home page of module',
  Channel: 'Channel',
  'Show pre-releases': 'Show pre-releases',
  'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
    'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.',
  'Release stats with installed':
    'Installed {{installedVersion}}, latest {{latestVersion}} on {{publishedAt}} with {{downloads}} downloads',
  'Release stats without installed':
    'Latest {{latestVersion}} on {{publishedAt}} with {{downloads}} downloads',
  'Maintainer label': 'by {{maintainer}}',
  'No modules found. Please clear search, change channel or upgrade JASP.':
    'No modules found. Please clear search, change channel or upgrade JASP.',
  'Error fetching environment info':
    'Error fetching environment info: {{error}}',
  'Error fetching catalog': 'Error fetching catalog: {{error}}',
  Checkmark: 'Checkmark',
};

const resources = {
  en: {
    translation: {
      ...defaultTranslations,
    },
  },
  ar: {
    translation: {
      'Search for a module': 'ابحث عن وحدة',
      'Loading list of available modules': 'جاري تحميل قائمة الوحدات المتاحة',
      'Select channel': 'اختر القناة',
      Install: 'تثبيت',
      Update: 'تحديث',
      Uninstall: 'إزالة التثبيت',
      'Uninstall this module': 'إزالة تثبيت هذه الوحدة',
      'Pre release': 'إصدار تجريبي',
      Installed: 'مثبت',
      'Latest version is installed': 'أحدث إصدار مثبت',
      'Go to home page of module': 'انتقل إلى الصفحة الرئيسية للوحدة',
      Channel: 'قناة',
      'Show pre-releases': 'عرض الإصدارات التجريبية',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'عند التحديد يتم عرض الإصدارات التجريبية. الإصدارات التجريبية هي إصدارات لم يعتبرها مطور الوحدة مستقرة بعد.',
      'Release stats with installed':
        'تم تثبيت {{installedVersion}}، أحدث إصدار {{latestVersion}} بتاريخ {{publishedAt}} مع {{downloads}} تنزيلًا',
      'Release stats without installed':
        'أحدث إصدار {{latestVersion}} بتاريخ {{publishedAt}} مع {{downloads}} تنزيلًا',
      'Maintainer label': 'بواسطة {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'لم يتم العثور على وحدات. يرجى مسح البحث أو تغيير القناة أو ترقية JASP.',
      'Error fetching environment info':
        'خطأ في جلب معلومات البيئة: {{error}}',
      'Error fetching catalog': 'خطأ في جلب الكتالوج: {{error}}',
      Checkmark: 'علامة اختيار',
    },
  },
  cs: {
    translation: {
      'Search for a module': 'Hledat modul',
      'Loading list of available modules': 'Načítání seznamu dostupných modulů',
      'Select channel': 'Vyberte kanál',
      Install: 'Instalovat',
      Update: 'Aktualizovat',
      Uninstall: 'Odinstalovat',
      'Uninstall this module': 'Odinstalovat tento modul',
      'Pre release': 'Předběžné vydání',
      Installed: 'Nainstalováno',
      'Latest version is installed': 'Nejnovější verze je nainstalována',
      'Go to home page of module': 'Přejít na domovskou stránku modulu',
      Channel: 'Kanál',
      'Show pre-releases': 'Zobrazit předběžná vydání',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Po zaškrtnutí se zobrazí předběžná vydání. Jsou to verze, které vývojář modulu ještě neoznačil jako stabilní.',
      'Release stats with installed':
        'Nainstalováno {{installedVersion}}, nejnovější {{latestVersion}} dne {{publishedAt}} s {{downloads}} staženími',
      'Release stats without installed':
        'Nejnovější {{latestVersion}} dne {{publishedAt}} s {{downloads}} staženími',
      'Maintainer label': 'od {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Nenalezeny žádné moduly. Vymažte hledání, změňte kanál nebo aktualizujte JASP.',
      'Error fetching environment info':
        'Chyba při načítání informací o prostředí: {{error}}',
      'Error fetching catalog': 'Chyba při načítání katalogu: {{error}}',
      Checkmark: 'Zaškrtnutí',
    },
  },
  de: {
    translation: {
      'Search for a module': 'Modul suchen',
      'Loading list of available modules': 'Liste verfügbarer Module wird geladen',
      'Select channel': 'Kanal auswählen',
      Install: 'Installieren',
      Update: 'Aktualisieren',
      Uninstall: 'Deinstallieren',
      'Uninstall this module': 'Dieses Modul deinstallieren',
      'Pre release': 'Vorabversion',
      Installed: 'Installiert',
      'Latest version is installed': 'Neueste Version ist installiert',
      'Go to home page of module': 'Zur Modul-Homepage',
      Channel: 'Kanal',
      'Show pre-releases': 'Vorabversionen anzeigen',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Wenn aktiviert, werden Vorabversionen angezeigt. Vorabversionen sind Veröffentlichungen, die vom Modulentwickler noch nicht als stabil markiert wurden.',
      'Release stats with installed':
        'Installiert {{installedVersion}}, neueste {{latestVersion}} am {{publishedAt}} mit {{downloads}} Downloads',
      'Release stats without installed':
        'Neueste {{latestVersion}} am {{publishedAt}} mit {{downloads}} Downloads',
      'Maintainer label': 'von {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Keine Module gefunden. Bitte Suche löschen, Kanal wechseln oder JASP aktualisieren.',
      'Error fetching environment info':
        'Fehler beim Abrufen der Umgebungsinformationen: {{error}}',
      'Error fetching catalog': 'Fehler beim Abrufen des Katalogs: {{error}}',
      Checkmark: 'Häkchen',
    },
  },
  es: {
    translation: {
      'Search for a module': 'Buscar un módulo',
      'Loading list of available modules': 'Cargando la lista de módulos disponibles',
      'Select channel': 'Seleccionar canal',
      Install: 'Instalar',
      Update: 'Actualizar',
      Uninstall: 'Desinstalar',
      'Uninstall this module': 'Desinstalar este módulo',
      'Pre release': 'Versión preliminar',
      Installed: 'Instalado',
      'Latest version is installed': 'La última versión está instalada',
      'Go to home page of module': 'Ir a la página principal del módulo',
      Channel: 'Canal',
      'Show pre-releases': 'Mostrar versiones preliminares',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Al activarlo se muestran las versiones preliminares. Son versiones que el desarrollador del módulo aún no ha marcado como estables.',
      'Release stats with installed':
        'Instalada {{installedVersion}}, última {{latestVersion}} el {{publishedAt}} con {{downloads}} descargas',
      'Release stats without installed':
        'Última {{latestVersion}} el {{publishedAt}} con {{downloads}} descargas',
      'Maintainer label': 'por {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'No se encontraron módulos. Limpia la búsqueda, cambia de canal o actualiza JASP.',
      'Error fetching environment info':
        'Error al obtener la información del entorno: {{error}}',
      'Error fetching catalog': 'Error al obtener el catálogo: {{error}}',
      Checkmark: 'Marca de verificación',
    },
  },
  et: {
    translation: {
      'Search for a module': 'Otsi moodulit',
      'Loading list of available modules': 'Laadin saadaval olevate moodulite nimekirja',
      'Select channel': 'Vali kanal',
      Install: 'Paigalda',
      Update: 'Uuenda',
      Uninstall: 'Eemalda',
      'Uninstall this module': 'Eemalda see moodul',
      'Pre release': 'Eelväljalase',
      Installed: 'Paigaldatud',
      'Latest version is installed': 'Viimane versioon on paigaldatud',
      'Go to home page of module': 'Ava mooduli avaleht',
      Channel: 'Kanal',
      'Show pre-releases': 'Näita eelväljalaskeid',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Kui märgitud, kuvatakse eelväljalasked. Need on versioonid, mida mooduli arendaja pole veel stabiilseks märkinud.',
      'Release stats with installed':
        'Paigaldatud {{installedVersion}}, viimane {{latestVersion}} kuupäeval {{publishedAt}} {{downloads}} allalaadimisega',
      'Release stats without installed':
        'Viimane {{latestVersion}} kuupäeval {{publishedAt}} {{downloads}} allalaadimisega',
      'Maintainer label': 'autor: {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Mooduleid ei leitud. Palun tühjenda otsing, vali muu kanal või uuenda JASP-i.',
      'Error fetching environment info':
        'Viga keskkonnainfo toomisel: {{error}}',
      'Error fetching catalog': 'Viga kataloogi toomisel: {{error}}',
      Checkmark: 'Linnuke',
    },
  },
  eu: {
    translation: {
      'Search for a module': 'Bilatu modulua',
      'Loading list of available modules': 'Modulu erabilgarrien zerrenda kargatzen',
      'Select channel': 'Hautatu kanala',
      Install: 'Instalatu',
      Update: 'Eguneratu',
      Uninstall: 'Desinstalatu',
      'Uninstall this module': 'Desinstalatu modulu hau',
      'Pre release': 'Aurre-bertsioa',
      Installed: 'Instalatuta',
      'Latest version is installed': 'Azken bertsioa instalatuta dago',
      'Go to home page of module': 'Joan moduluko orri nagusira',
      Channel: 'Kanala',
      'Show pre-releases': 'Erakutsi aurre-bertsioak',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Markatuta dagoenean aurre-bertsioak erakusten dira. Aurre-bertsioak moduluaren garatzaileak oraindik egonkortzat jo ez dituen argitalpenak dira.',
      'Release stats with installed':
        'Instalatuta {{installedVersion}}, azkena {{latestVersion}} {{publishedAt}} egunean {{downloads}} deskargarekin',
      'Release stats without installed':
        'Azkena {{latestVersion}} {{publishedAt}} egunean {{downloads}} deskargarekin',
      'Maintainer label': '{{maintainer}}-k',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Ez da modulurik aurkitu. Garbitu bilaketa, aldatu kanala edo eguneratu JASP.',
      'Error fetching environment info':
        'Errorea ingurune-informazioa eskuratzean: {{error}}',
      'Error fetching catalog': 'Errorea katalogoa eskuratzean: {{error}}',
      Checkmark: 'Marka',
    },
  },
  fr: {
    translation: {
      'Search for a module': 'Rechercher un module',
      'Loading list of available modules': 'Chargement de la liste des modules disponibles',
      'Select channel': 'Sélectionner un canal',
      Install: 'Installer',
      Update: 'Mettre à jour',
      Uninstall: 'Désinstaller',
      'Uninstall this module': 'Désinstaller ce module',
      'Pre release': 'Version préliminaire',
      Installed: 'Installé',
      'Latest version is installed': 'La dernière version est installée',
      'Go to home page of module': "Aller à la page d'accueil du module",
      Channel: 'Canal',
      'Show pre-releases': 'Afficher les versions préliminaires',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        "Lorsque cette option est cochée, les versions préliminaires sont affichées. Ce sont des versions que le développeur du module n'a pas encore marquées comme stables.",
      'Release stats with installed':
        'Installé {{installedVersion}}, dernière {{latestVersion}} le {{publishedAt}} avec {{downloads}} téléchargements',
      'Release stats without installed':
        'Dernière {{latestVersion}} le {{publishedAt}} avec {{downloads}} téléchargements',
      'Maintainer label': 'par {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Aucun module trouvé. Veuillez effacer la recherche, changer de canal ou mettre à jour JASP.',
      'Error fetching environment info':
        "Erreur lors de la récupération des informations d'environnement : {{error}}",
      'Error fetching catalog': 'Erreur lors de la récupération du catalogue : {{error}}',
      Checkmark: 'Coche',
    },
  },
  gl: {
    translation: {
      'Search for a module': 'Buscar un módulo',
      'Loading list of available modules': 'Cargando a lista de módulos dispoñibles',
      'Select channel': 'Seleccionar canle',
      Install: 'Instalar',
      Update: 'Actualizar',
      Uninstall: 'Desinstalar',
      'Uninstall this module': 'Desinstalar este módulo',
      'Pre release': 'Versión preliminar',
      Installed: 'Instalado',
      'Latest version is installed': 'A última versión está instalada',
      'Go to home page of module': 'Ir á páxina principal do módulo',
      Channel: 'Canle',
      'Show pre-releases': 'Mostrar versións preliminares',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Ao marcarse móstranse as versións preliminares. Son versións que o desenvolvedor do módulo aínda non marcou como estábeis.',
      'Release stats with installed':
        'Instalouse {{installedVersion}}, última {{latestVersion}} o {{publishedAt}} con {{downloads}} descargas',
      'Release stats without installed':
        'Última {{latestVersion}} o {{publishedAt}} con {{downloads}} descargas',
      'Maintainer label': 'por {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Non se atoparon módulos. Limpe a busca, cambie a canle ou actualice JASP.',
      'Error fetching environment info':
        'Erro ao obter a información do contorno: {{error}}',
      'Error fetching catalog': 'Erro ao obter o catálogo: {{error}}',
      Checkmark: 'Marca de verificación',
    },
  },
  hu: {
    translation: {
      'Search for a module': 'Modul keresése',
      'Loading list of available modules': 'Elérhető modulok listájának betöltése',
      'Select channel': 'Csatorna kiválasztása',
      Install: 'Telepítés',
      Update: 'Frissítés',
      Uninstall: 'Eltávolítás',
      'Uninstall this module': 'Modul eltávolítása',
      'Pre release': 'Előzetes kiadás',
      Installed: 'Telepítve',
      'Latest version is installed': 'A legújabb verzió telepítve van',
      'Go to home page of module': 'Ugrás a modul honlapjára',
      Channel: 'Csatorna',
      'Show pre-releases': 'Előzetes kiadások megjelenítése',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Bejelölés esetén megjelennek az előzetes kiadások. Ezek olyan verziók, amelyeket a modul fejlesztője még nem jelölt stabilnak.',
      'Release stats with installed':
        'Telepítve: {{installedVersion}}, legújabb: {{latestVersion}} ({{publishedAt}}), {{downloads}} letöltéssel',
      'Release stats without installed':
        'Legújabb: {{latestVersion}} ({{publishedAt}}), {{downloads}} letöltéssel',
      'Maintainer label': '{{maintainer}} készítette',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Nem találhatók modulok. Törölje a keresést, váltson csatornát vagy frissítse a JASP-ot.',
      'Error fetching environment info':
        'Hiba a környezeti információ lekérésekor: {{error}}',
      'Error fetching catalog': 'Hiba a katalógus lekérésekor: {{error}}',
      Checkmark: 'Pipa',
    },
  },
  id: {
    translation: {
      'Search for a module': 'Cari modul',
      'Loading list of available modules': 'Memuat daftar modul yang tersedia',
      'Select channel': 'Pilih kanal',
      Install: 'Pasang',
      Update: 'Perbarui',
      Uninstall: 'Copot',
      'Uninstall this module': 'Copot modul ini',
      'Pre release': 'Pra-rilis',
      Installed: 'Terpasang',
      'Latest version is installed': 'Versi terbaru sudah terpasang',
      'Go to home page of module': 'Buka halaman utama modul',
      Channel: 'Kanal',
      'Show pre-releases': 'Tampilkan pra-rilis',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Jika dipilih akan menampilkan pra-rilis. Pra-rilis adalah rilis yang belum ditandai stabil oleh pengembang modul.',
      'Release stats with installed':
        'Terpasang {{installedVersion}}, terbaru {{latestVersion}} pada {{publishedAt}} dengan {{downloads}} unduhan',
      'Release stats without installed':
        'Terbaru {{latestVersion}} pada {{publishedAt}} dengan {{downloads}} unduhan',
      'Maintainer label': 'oleh {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Tidak ada modul yang ditemukan. Hapus pencarian, ganti kanal, atau perbarui JASP.',
      'Error fetching environment info':
        'Kesalahan mengambil informasi lingkungan: {{error}}',
      'Error fetching catalog': 'Kesalahan mengambil katalog: {{error}}',
      Checkmark: 'Tanda centang',
    },
  },
  it: {
    translation: {
      'Search for a module': 'Cerca un modulo',
      'Loading list of available modules': "Caricamento dell'elenco dei moduli disponibili",
      'Select channel': 'Seleziona canale',
      Install: 'Installa',
      Update: 'Aggiorna',
      Uninstall: 'Disinstalla',
      'Uninstall this module': 'Disinstalla questo modulo',
      'Pre release': 'Versione preliminare',
      Installed: 'Installato',
      'Latest version is installed': 'L\'ultima versione è installata',
      'Go to home page of module': 'Vai alla pagina principale del modulo',
      Channel: 'Canale',
      'Show pre-releases': 'Mostra versioni preliminari',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Se selezionata, mostra le versioni preliminari. Sono versioni che lo sviluppatore del modulo non ha ancora contrassegnato come stabili.',
      'Release stats with installed':
        'Installata {{installedVersion}}, ultima {{latestVersion}} il {{publishedAt}} con {{downloads}} download',
      'Release stats without installed':
        'Ultima {{latestVersion}} il {{publishedAt}} con {{downloads}} download',
      'Maintainer label': 'di {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Nessun modulo trovato. Cancella la ricerca, cambia canale o aggiorna JASP.',
      'Error fetching environment info':
        "Errore durante il recupero delle informazioni sull'ambiente: {{error}}",
      'Error fetching catalog': 'Errore durante il recupero del catalogo: {{error}}',
      Checkmark: 'Segno di spunta',
    },
  },
  ja: {
    translation: {
      'Search for a module': 'モジュールを検索',
      'Loading list of available modules': '利用可能なモジュールの一覧を読み込み中',
      'Select channel': 'チャンネルを選択',
      Install: 'インストール',
      Update: '更新',
      Uninstall: 'アンインストール',
      'Uninstall this module': 'このモジュールをアンインストール',
      'Pre release': 'プレリリース',
      Installed: 'インストール済み',
      'Latest version is installed': '最新バージョンがインストールされています',
      'Go to home page of module': 'モジュールのホームページへ移動',
      Channel: 'チャンネル',
      'Show pre-releases': 'プレリリースを表示',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        '選択するとプレリリースを表示します。プレリリースは、モジュール開発者がまだ安定版としてマークしていないリリースです。',
      'Release stats with installed':
        'インストール済み {{installedVersion}}、最新 {{latestVersion}} は {{publishedAt}} に公開され、ダウンロード数 {{downloads}}',
      'Release stats without installed':
        '最新 {{latestVersion}} は {{publishedAt}} に公開され、ダウンロード数 {{downloads}}',
      'Maintainer label': '{{maintainer}} によって',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'モジュールが見つかりません。検索をクリアするか、チャンネルを変更するか、JASP をアップグレードしてください。',
      'Error fetching environment info':
        '環境情報の取得中にエラーが発生しました: {{error}}',
      'Error fetching catalog': 'カタログの取得中にエラーが発生しました: {{error}}',
      Checkmark: 'チェックマーク',
    },
  },
  lt: {
    translation: {
      'Search for a module': 'Ieškoti modulio',
      'Loading list of available modules': 'Įkeliamas galimų modulių sąrašas',
      'Select channel': 'Pasirinkti kanalą',
      Install: 'Įdiegti',
      Update: 'Atnaujinti',
      Uninstall: 'Pašalinti',
      'Uninstall this module': 'Pašalinti šį modulį',
      'Pre release': 'Išankstinė versija',
      Installed: 'Įdiegta',
      'Latest version is installed': 'Įdiegta naujausia versija',
      'Go to home page of module': 'Eiti į modulio pagrindinį puslapį',
      Channel: 'Kanalas',
      'Show pre-releases': 'Rodyti išankstines versijas',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Pažymėjus rodomos išankstinės versijos. Tai versijos, kurių modulio kūrėjas dar nepažymėjo kaip stabilių.',
      'Release stats with installed':
        'Įdiegta {{installedVersion}}, naujausia {{latestVersion}} {{publishedAt}} su {{downloads}} atsisiuntimų',
      'Release stats without installed':
        'Naujausia {{latestVersion}} {{publishedAt}} su {{downloads}} atsisiuntimų',
      'Maintainer label': 'autorius {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Modulių nerasta. Išvalykite paiešką, pakeiskite kanalą arba atnaujinkite JASP.',
      'Error fetching environment info':
        'Klaida gaunant aplinkos informaciją: {{error}}',
      'Error fetching catalog': 'Klaida gaunant katalogą: {{error}}',
      Checkmark: 'Žymėjimo ženklas',
    },
  },
  nl: {
    translation: {
      'Search for a module': 'Zoek een module',
      'Loading list of available modules': 'Lijst met beschikbare modules wordt geladen',
      'Select channel': 'Selecteer kanaal',
      Install: 'Installeren',
      Update: 'Bijwerken',
      Uninstall: 'Verwijderen',
      'Uninstall this module': 'Deze module verwijderen',
      'Pre release': 'Pre-release',
      Installed: 'Geïnstalleerd',
      'Latest version is installed': 'Nieuwste versie is geïnstalleerd',
      'Go to home page of module': 'Ga naar de homepage van de module',
      Channel: 'Kanaal',
      'Show pre-releases': 'Pre-releases tonen',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Wanneer ingeschakeld worden pre-releases getoond. Dit zijn uitgaven die door de moduleontwikkelaar nog niet als stabiel zijn gemarkeerd.',
      'Release stats with installed':
        'Geïnstalleerd {{installedVersion}}, nieuwste {{latestVersion}} op {{publishedAt}} met {{downloads}} downloads',
      'Release stats without installed':
        'Nieuwste {{latestVersion}} op {{publishedAt}} met {{downloads}} downloads',
      'Maintainer label': 'door {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Geen modules gevonden. Wis de zoekopdracht, wijzig het kanaal of upgrade JASP.',
      'Error fetching environment info':
        'Fout bij ophalen van omgevingsinformatie: {{error}}',
      'Error fetching catalog': 'Fout bij ophalen van catalogus: {{error}}',
      Checkmark: 'Vinkje',
    },
  },
  pl: {
    translation: {
      'Search for a module': 'Szukaj modułu',
      'Loading list of available modules': 'Wczytywanie listy dostępnych modułów',
      'Select channel': 'Wybierz kanał',
      Install: 'Zainstaluj',
      Update: 'Aktualizuj',
      Uninstall: 'Odinstaluj',
      'Uninstall this module': 'Odinstaluj ten moduł',
      'Pre release': 'Wersja wstępna',
      Installed: 'Zainstalowano',
      'Latest version is installed': 'Najnowsza wersja jest zainstalowana',
      'Go to home page of module': 'Przejdź do strony modułu',
      Channel: 'Kanał',
      'Show pre-releases': 'Pokaż wersje wstępne',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Po zaznaczeniu pokazuje wersje wstępne. Są to wydania, które deweloper modułu nie oznaczył jeszcze jako stabilne.',
      'Release stats with installed':
        'Zainstalowano {{installedVersion}}, najnowsza {{latestVersion}} z {{publishedAt}} z {{downloads}} pobraniami',
      'Release stats without installed':
        'Najnowsza {{latestVersion}} z {{publishedAt}} z {{downloads}} pobraniami',
      'Maintainer label': 'autor {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Nie znaleziono modułów. Wyczyść wyszukiwanie, zmień kanał lub zaktualizuj JASP.',
      'Error fetching environment info':
        'Błąd podczas pobierania informacji o środowisku: {{error}}',
      'Error fetching catalog': 'Błąd podczas pobierania katalogu: {{error}}',
      Checkmark: 'Znak wyboru',
    },
  },
  pt: {
    translation: {
      'Search for a module': 'Procurar um módulo',
      'Loading list of available modules': 'A carregar a lista de módulos disponíveis',
      'Select channel': 'Selecionar canal',
      Install: 'Instalar',
      Update: 'Atualizar',
      Uninstall: 'Desinstalar',
      'Uninstall this module': 'Desinstalar este módulo',
      'Pre release': 'Pré-lançamento',
      Installed: 'Instalado',
      'Latest version is installed': 'A versão mais recente está instalada',
      'Go to home page of module': 'Ir para a página inicial do módulo',
      Channel: 'Canal',
      'Show pre-releases': 'Mostrar pré-lançamentos',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Quando selecionado mostra os pré-lançamentos. São versões que o desenvolvedor do módulo ainda não marcou como estáveis.',
      'Release stats with installed':
        'Instalado {{installedVersion}}, última {{latestVersion}} em {{publishedAt}} com {{downloads}} transferências',
      'Release stats without installed':
        'Última {{latestVersion}} em {{publishedAt}} com {{downloads}} transferências',
      'Maintainer label': 'por {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Nenhum módulo encontrado. Limpe a pesquisa, mude de canal ou atualize o JASP.',
      'Error fetching environment info':
        'Erro ao obter informações do ambiente: {{error}}',
      'Error fetching catalog': 'Erro ao obter o catálogo: {{error}}',
      Checkmark: 'Marca de seleção',
    },
  },
  ru: {
    translation: {
      'Search for a module': 'Поиск модуля',
      'Loading list of available modules': 'Загрузка списка доступных модулей',
      'Select channel': 'Выберите канал',
      Install: 'Установить',
      Update: 'Обновить',
      Uninstall: 'Удалить',
      'Uninstall this module': 'Удалить этот модуль',
      'Pre release': 'Предварительный релиз',
      Installed: 'Установлено',
      'Latest version is installed': 'Установлена последняя версия',
      'Go to home page of module': 'Перейти на домашнюю страницу модуля',
      Channel: 'Канал',
      'Show pre-releases': 'Показать предварительные релизы',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'При включении отображаются предварительные релизы. Это версии, которые разработчик модуля ещё не отметил как стабильные.',
      'Release stats with installed':
        'Установлено {{installedVersion}}, последняя {{latestVersion}} от {{publishedAt}}, загрузок: {{downloads}}',
      'Release stats without installed':
        'Последняя {{latestVersion}} от {{publishedAt}}, загрузок: {{downloads}}',
      'Maintainer label': 'от {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Модули не найдены. Очистите поиск, смените канал или обновите JASP.',
      'Error fetching environment info':
        'Ошибка при получении сведений об окружении: {{error}}',
      'Error fetching catalog': 'Ошибка при получении каталога: {{error}}',
      Checkmark: 'Флажок',
    },
  },
  sq: {
    translation: {
      'Search for a module': 'Kërko një modul',
      'Loading list of available modules': 'Po ngarkohet lista e moduleve të disponueshme',
      'Select channel': 'Zgjidh kanalin',
      Install: 'Instalo',
      Update: 'Përditëso',
      Uninstall: 'Çinstalo',
      'Uninstall this module': 'Çinstalo këtë modul',
      'Pre release': 'Version paraprak',
      Installed: 'I instaluar',
      'Latest version is installed': 'Versioni më i fundit është instaluar',
      'Go to home page of module': 'Shko në faqen kryesore të modulit',
      Channel: 'Kanal',
      'Show pre-releases': 'Shfaq versionet paraprake',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Kur përzgjidhet shfaq versionet paraprake. Këto janë versione që zhvilluesi i modulit ende nuk i ka shënuar si të qëndrueshme.',
      'Release stats with installed':
        'I instaluar {{installedVersion}}, më i fundit {{latestVersion}} më {{publishedAt}} me {{downloads}} shkarkime',
      'Release stats without installed':
        'Më i fundit {{latestVersion}} më {{publishedAt}} me {{downloads}} shkarkime',
      'Maintainer label': 'nga {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Nuk u gjetën module. Pastro kërkimin, ndrysho kanalin ose përmirëso JASP.',
      'Error fetching environment info':
        'Gabim gjatë marrjes së informacionit të ambientit: {{error}}',
      'Error fetching catalog': 'Gabim gjatë marrjes së katalogut: {{error}}',
      Checkmark: 'Shenjë kontrolli',
    },
  },
  sr: {
    translation: {
      'Search for a module': 'Претражи модул',
      'Loading list of available modules': 'Учитавање списка доступних модула',
      'Select channel': 'Изаберите канал',
      Install: 'Инсталирај',
      Update: 'Ажурирај',
      Uninstall: 'Деинсталирај',
      'Uninstall this module': 'Деинсталирај овај модул',
      'Pre release': 'Пре-релиз',
      Installed: 'Инсталирано',
      'Latest version is installed': 'Најновија верзија је инсталирана',
      'Go to home page of module': 'Отвори почетну страницу модула',
      Channel: 'Канал',
      'Show pre-releases': 'Прикажи пре-релизе',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Када је означено приказују се пре-релиз издања. То су издања која програмер модула још није означио као стабилна.',
      'Release stats with installed':
        'Инсталирано {{installedVersion}}, најновије {{latestVersion}} {{publishedAt}} са {{downloads}} преузимања',
      'Release stats without installed':
        'Најновије {{latestVersion}} {{publishedAt}} са {{downloads}} преузимања',
      'Maintainer label': 'аутор {{maintainer}}',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        'Ниједан модул није пронађен. Обришите претрагу, промените канал или ажурирајте JASP.',
      'Error fetching environment info':
        'Грешка при добављању информација о окружењу: {{error}}',
      'Error fetching catalog': 'Грешка при добављању каталога: {{error}}',
      Checkmark: 'Ознака',
    },
  },
  tr: {
    translation: {
      'Search for a module': 'Bir modül ara',
      'Loading list of available modules': 'Kullanılabilir modüller listesi yükleniyor',
      'Select channel': 'Kanal seç',
      Install: 'Yükle',
      Update: 'Güncelle',
      Uninstall: 'Kaldır',
      'Uninstall this module': 'Bu modülü kaldır',
      'Pre release': 'Ön sürüm',
      Installed: 'Yüklendi',
      'Latest version is installed': 'En son sürüm yüklü',
      'Go to home page of module': 'Modül ana sayfasına git',
      Channel: 'Kanal',
      'Show pre-releases': 'Ön sürümleri göster',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        'Seçildiğinde ön sürümler gösterilir. Ön sürümler, modül geliştiricisinin henüz kararlı olarak işaretlemediği sürümlerdir.',
      'Release stats with installed':
        'Yüklü {{installedVersion}}, en son {{latestVersion}} {{publishedAt}} tarihinde {{downloads}} indirme ile',
      'Release stats without installed':
        'En son {{latestVersion}} {{publishedAt}} tarihinde {{downloads}} indirme ile',
      'Maintainer label': '{{maintainer}} tarafından',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        "Modül bulunamadı. Aramayı temizleyin, kanalı değiştirin veya JASP'ı güncelleyin.",
      'Error fetching environment info':
        'Ortam bilgisi alınırken hata oluştu: {{error}}',
      'Error fetching catalog': 'Katalog alınırken hata oluştu: {{error}}',
      Checkmark: 'Onay işareti',
    },
  },
  zh_Hans: {
    translation: {
      'Search for a module': '搜索模块',
      'Loading list of available modules': '正在加载可用模块列表',
      'Select channel': '选择渠道',
      Install: '安装',
      Update: '更新',
      Uninstall: '卸载',
      'Uninstall this module': '卸载此模块',
      'Pre release': '预发布',
      Installed: '已安装',
      'Latest version is installed': '已安装最新版本',
      'Go to home page of module': '前往模块主页',
      Channel: '渠道',
      'Show pre-releases': '显示预发布版本',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        '选中后会显示预发布版本。预发布是模块开发者尚未标记为稳定的版本。',
      'Release stats with installed':
        '已安装 {{installedVersion}}，最新 {{latestVersion}} 于 {{publishedAt}} 发布，下载量 {{downloads}}',
      'Release stats without installed':
        '最新 {{latestVersion}} 于 {{publishedAt}} 发布，下载量 {{downloads}}',
      'Maintainer label': '由 {{maintainer}} 提供',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        '未找到模块。请清除搜索、切换渠道或升级 JASP。',
      'Error fetching environment info':
        '获取环境信息时出错：{{error}}',
      'Error fetching catalog': '获取目录时出错：{{error}}',
      Checkmark: '复选标记',
    },
  },
  zh_Hant: {
    translation: {
      'Search for a module': '搜尋模組',
      'Loading list of available modules': '正在載入可用模組清單',
      'Select channel': '選擇通道',
      Install: '安裝',
      Update: '更新',
      Uninstall: '移除',
      'Uninstall this module': '移除此模組',
      'Pre release': '預先發佈',
      Installed: '已安裝',
      'Latest version is installed': '已安裝最新版本',
      'Go to home page of module': '前往模組首頁',
      Channel: '通道',
      'Show pre-releases': '顯示預先發佈版本',
      'When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable.':
        '勾選後會顯示預先發佈版本。預先發佈是模組開發者尚未標記為穩定的版本。',
      'Release stats with installed':
        '已安裝 {{installedVersion}}，最新 {{latestVersion}} 於 {{publishedAt}} 發佈，共 {{downloads}} 次下載',
      'Release stats without installed':
        '最新 {{latestVersion}} 於 {{publishedAt}} 發佈，共 {{downloads}} 次下載',
      'Maintainer label': '由 {{maintainer}} 提供',
      'No modules found. Please clear search, change channel or upgrade JASP.':
        '找不到模組。請清除搜尋、變更通道或升級 JASP。',
      'Error fetching environment info':
        '取得環境資訊時發生錯誤：{{error}}',
      'Error fetching catalog': '取得目錄時發生錯誤：{{error}}',
      Checkmark: '核取記號',
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
