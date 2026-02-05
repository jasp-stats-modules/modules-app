import { type Dictionary, insert, md, t } from 'intlayer';

const appContent = {
  key: 'app',
  content: {
    install: t({
      en: 'Install',
      nl: 'Installeer',
      fr: 'Installer',
      de: 'Installieren',
      es: 'Instalar',
      it: 'Installa',
      ar: 'تثبيت',
      cs: 'Instalovat',
      et: 'Paigalda',
      eu: 'Instalatu',
      gl: 'Instalar',
      hu: 'Telepítés',
      id: 'Pasang',
      ja: 'インストール',
      lt: 'Įdiegti',
      pl: 'Zainstaluj',
      pt: 'Instalar',
      ru: 'Установить',
      sq: 'Instalo',
      sr: 'Instaliraj',
      tr: 'Yükle',
      'zh-Hans': '安装',
      'zh-Hant': '安裝',
    }),
    loading: t({
      en: 'Loading list of available modules',
      nl: 'Lijst met beschikbare modules aan het laden',
      fr: 'Chargement de la liste des modules disponibles',
      de: 'Liste verfügbarer Module wird geladen',
      es: 'Cargando la lista de módulos disponibles',
      it: 'Caricamento elenco dei moduli disponibili',
      ar: 'جارٍ تحميل قائمة الوحدات المتاحة',
      cs: 'Načítání seznamu dostupných modulů',
      et: 'Saadaval moodulite nimekirja laadimine',
      eu: 'Modulu erabilgarrien zerrenda kargatzen',
      gl: 'Cargando a lista de módulos dispoñibles',
      hu: 'Elérhető modulok listájának betöltése',
      id: 'Memuat daftar modul yang tersedia',
      ja: '利用可能なモジュールのリストを読み込み中',
      lt: 'Įkeliamas galimų modulių sąrašas',
      pl: 'Ładowanie listy dostępnych modułów',
      pt: 'Carregando lista de módulos disponíveis',
      ru: 'Загрузка списка доступных модулей',
      sq: 'Duke ngarkuar listën e moduleve të disponueshme',
      sr: 'Učitavanje liste dostupnih modula',
      tr: 'Mevcut modüllerin listesi yükleniyor',
      'zh-Hans': '正在加载可用模块列表',
      'zh-Hant': '正在載入可用模組清單',
    }),
    select_channel: t({
      en: 'Select channel',
      nl: 'Selecteer kanaal',
      fr: 'Sélectionner un canal',
      de: 'Kanal auswählen',
      es: 'Seleccionar canal',
      it: 'Seleziona canale',
      ar: 'اختر قناة',
      cs: 'Vyberte kanál',
      et: 'Vali kanal',
      eu: 'Hautatu kanala',
      gl: 'Seleccione o canal',
      hu: 'Csatorna kiválasztása',
      id: 'Pilih saluran',
      ja: 'チャンネルを選択',
      lt: 'Pasirinkite kanalą',
      pl: 'Wybierz kanał',
      pt: 'Selecionar canal',
      ru: 'Выберите канал',
      sq: 'Zgjidhni kanalin',
      sr: 'Izaberite kanal',
      tr: 'Kanalı seçin',
      'zh-Hans': '选择频道',
      'zh-Hant': '選擇頻道',
    }),
    checkmark: t({
      en: 'Checkmark',
      nl: 'Vinkje',
      fr: 'Coche',
      de: 'Häkchen',
      es: 'Marca de verificación',
      it: 'Segno di spunta',
      ar: 'علامة اختيار',
      cs: 'Zaškrtnutí',
      et: 'Märge',
      eu: 'Marka',
      gl: 'Marca de verificación',
      hu: 'Pipa',
      id: 'Tanda centang',
      ja: 'チェックマーク',
      lt: 'Žymeklis',
      pl: 'Zaznaczenie',
      pt: 'Marca de seleção',
      ru: 'Галочка',
      sq: 'Shenjë kontrolli',
      sr: 'Potvrda',
      tr: 'Onay işareti',
      'zh-Hans': '对号',
      'zh-Hant': '勾選標記',
    }),
    update: t({
      en: 'Update',
      nl: 'Bijwerken',
      fr: 'Mettre à jour',
      de: 'Aktualisieren',
      es: 'Actualizar',
      it: 'Aggiorna',
      ar: 'تحديث',
      cs: 'Aktualizovat',
      et: 'Uuenda',
      eu: 'Eguneratu',
      gl: 'Actualizar',
      hu: 'Frissítés',
      id: 'Perbarui',
      ja: 'アップデート',
      lt: 'Atnaujinti',
      pl: 'Aktualizuj',
      pt: 'Atualizar',
      ru: 'Обновить',
      sq: 'Përditëso',
      sr: 'Ažuriraj',
      tr: 'Güncelle',
      'zh-Hans': '更新',
      'zh-Hant': '更新',
    }),
    uninstall: t({
      en: 'Uninstall',
      nl: 'Verwijderen',
      fr: 'Désinstaller',
      de: 'Deinstallieren',
      es: 'Desinstalar',
      it: 'Disinstalla',
      ar: 'إلغاء التثبيت',
      cs: 'Odinstalovat',
      et: 'Eemalda',
      eu: 'Desinstalatu',
      gl: 'Desinstalar',
      hu: 'Eltávolítás',
      id: 'Hapus pemasangan',
      ja: 'アンインストール',
      lt: 'Pašalinti',
      pl: 'Odinstaluj',
      pt: 'Desinstalar',
      ru: 'Удалить',
      sq: 'Çinstalo',
      sr: 'Deinstaliraj',
      tr: 'Kaldır',
      'zh-Hans': '卸载',
      'zh-Hant': '解除安裝',
    }),
    pre_release: t({
      en: 'Beta',
      nl: 'Beta',
      fr: 'Pré-version',
      de: 'Vorabversion',
      es: 'Prelanzamiento',
      it: 'Pre-rilascio',
      ar: 'إصدار تجريبي',
      cs: 'Předběžné vydání',
      et: 'Eelväljaanne',
      eu: 'Aurre-bertsioa',
      gl: 'Pre-lanzamento',
      hu: 'Előzetes kiadás',
      id: 'Pra-rilis',
      ja: 'プレリリース',
      lt: 'Priešleidimas',
      pl: 'Wersja przedpremierowa',
      pt: 'Pré-lançamento',
      ru: 'Предрелиз',
      sq: 'Parapublikim',
      sr: 'Prethodno izdanje',
      tr: 'Ön sürüm',
      'zh-Hans': '预发布',
      'zh-Hant': '預發布',
    }),
    installed: t({
      en: 'Installed',
      nl: 'Geïnstalleerd',
      fr: 'Installé',
      de: 'Installiert',
      es: 'Instalado',
      it: 'Installato',
      ar: 'مثبت',
      cs: 'Nainstalováno',
      et: 'Paigaldatud',
      eu: 'Instalatuta',
      gl: 'Instalado',
      hu: 'Telepítve',
      id: 'Terpasang',
      ja: 'インストール済み',
      lt: 'Įdiegta',
      pl: 'Zainstalowano',
      pt: 'Instalado',
      ru: 'Установлено',
      sq: 'Instaluar',
      sr: 'Instalirano',
      tr: 'Yüklendi',
      'zh-Hans': '已安装',
      'zh-Hant': '已安裝',
    }),
    uninstall_this_module: t({
      en: 'Uninstall this module',
      nl: 'Verwijder deze module',
      fr: 'Désinstaller ce module',
      de: 'Dieses Modul deinstallieren',
      es: 'Desinstalar este módulo',
      it: 'Disinstalla questo modulo',
      ar: 'إلغاء تثبيت هذه الوحدة',
      cs: 'Odinstalovat tento modul',
      et: 'Eemalda see moodul',
      eu: 'Desinstalatu modulua',
      gl: 'Desinstalar este módulo',
      hu: 'Távolítsa el ezt a modult',
      id: 'Hapus modul ini',
      ja: 'このモジュールをアンインストール',
      lt: 'Pašalinti šį modulį',
      pl: 'Odinstaluj ten moduł',
      pt: 'Desinstalar este módulo',
      ru: 'Удалить этот модуль',
      sq: 'Çinstalo këtë modul',
      sr: 'Deinstaliraj ovaj modul',
      tr: 'Bu modülü kaldır',
      'zh-Hans': '卸载此模块',
      'zh-Hant': '解除安裝此模組',
    }),
    latest_version_installed: t({
      en: 'Latest version is installed',
      nl: 'Nieuwste versie is geïnstalleerd',
      fr: 'La dernière version est installée',
      de: 'Neueste Version ist installiert',
      es: 'La última versión está instalada',
      it: 'L’ultima versione è installata',
      ar: 'أحدث إصدار مثبت',
      cs: 'Nejnovější verze je nainstalována',
      et: 'Viimane versioon on paigaldatud',
      eu: 'Azken bertsioa instalatuta dago',
      gl: 'A última versión está instalada',
      hu: 'A legújabb verzió telepítve van',
      id: 'Versi terbaru telah terpasang',
      ja: '最新バージョンがインストールされています',
      lt: 'Naujausia versija įdiegta',
      pl: 'Najnowsza wersja jest zainstalowana',
      pt: 'A versão mais recente está instalada',
      ru: 'Установлена последняя версия',
      sq: 'Versioni më i fundit është instaluar',
      sr: 'Najnovija verzija je instalirana',
      tr: 'En son sürüm yüklendi',
      'zh-Hans': '已安装最新版本',
      'zh-Hant': '已安裝最新版本',
    }),
    go_to_home_page_of_module: t({
      en: 'Go to home page of module',
      nl: 'Ga naar de homepage van de module',
      fr: 'Aller à la page d’accueil du module',
      de: 'Zur Startseite des Moduls gehen',
      es: 'Ir a la página principal del módulo',
      it: 'Vai alla home page del modulo',
      ar: 'اذهب إلى الصفحة الرئيسية للوحدة',
      cs: 'Přejít na domovskou stránku modulu',
      et: 'Mine mooduli avalehele',
      eu: 'Joan moduluko orri nagusira',
      gl: 'Ir á páxina de inicio do módulo',
      hu: 'Ugrás a modul kezdőlapjára',
      id: 'Buka halaman utama modul',
      ja: 'モジュールのホームページへ',
      lt: 'Eiti į modulio pagrindinį puslapį',
      pl: 'Przejdź do strony głównej modułu',
      pt: 'Ir para a página inicial do módulo',
      ru: 'Перейти на главную страницу модуля',
      sq: 'Shko te faqja kryesore e modulit',
      sr: 'Idi na početnu stranicu modula',
      tr: 'Modülün ana sayfasına git',
      'zh-Hans': '前往模块主页',
      'zh-Hant': '前往模組主頁',
    }),
    channel: t({
      en: 'Channel',
      nl: 'Kanaal',
      fr: 'Canal',
      de: 'Kanal',
      es: 'Canal',
      it: 'Canale',
      ar: 'قناة',
      cs: 'Kanál',
      et: 'Kanal',
      eu: 'Kanala',
      gl: 'Canle',
      hu: 'Csatorna',
      id: 'Saluran',
      ja: 'チャンネル',
      lt: 'Kanalas',
      pl: 'Kanał',
      pt: 'Canal',
      ru: 'Канал',
      sq: 'Kanal',
      sr: 'Kanal',
      tr: 'Kanal',
      'zh-Hans': '频道',
      'zh-Hant': '頻道',
    }),
    show_prereleases: t({
      en: 'Show Betas',
      nl: 'Toon Betas',
      fr: 'Afficher les pré-versions',
      de: 'Vorabversionen anzeigen',
      es: 'Mostrar pre-lanzamientos',
      it: 'Mostra pre-release',
      ar: 'إظهار الإصدارات التجريبية',
      cs: 'Zobrazit předběžná vydání',
      et: 'Kuva eeltõmmised',
      eu: 'Erakutsi aurre-bertsioak',
      gl: 'Mostrar pre-lanzamentos',
      hu: 'Előzetes kiadások megjelenítése',
      id: 'Tampilkan pra-rilis',
      ja: 'プレリリースを表示',
      lt: 'Rodyti priešleidimus',
      pl: 'Pokaż wersje przedpremierowe',
      pt: 'Mostrar pré-lançamentos',
      ru: 'Показать предрелизы',
      sq: 'Shfaq parapublikimet',
      sr: 'Prikaži prethodna izdanja',
      tr: 'Ön sürümleri göster',
      'zh-Hans': '显示预发布版本',
      'zh-Hant': '顯示預發布版本',
    }),
    allow_prereleases_checkbox_description: t({
      en: 'When checked shows Betas. Betas are releases that a module developer has not yet marked as stable.',
      nl: 'Indien aangevinkt worden Betas getoond. Betas zijn versies die een moduleontwikkelaar nog niet als stabiel heeft gemarkeerd.',
      fr: 'Si coché, affiche les pré-versions. Les pré-versions sont des versions qu’un développeur de module n’a pas encore marquées comme stables.',
      de: 'Wenn aktiviert, werden Vorabversionen angezeigt. Vorabversionen sind Versionen, die ein Modul-Entwickler noch nicht als stabil markiert hat.',
      es: 'Si está marcado, muestra pre-lanzamientos. Los pre-lanzamientos son versiones que el desarrollador del módulo aún no ha marcado como estables.',
      it: 'Se selezionato mostra le pre-release. Le pre-release sono versioni che lo sviluppatore del modulo non ha ancora contrassegnato come stabili.',
      ar: 'عند التحديد تظهر الإصدارات التجريبية. الإصدارات التجريبية هي إصدارات لم يتم اعتبارها مستقرة بعد من قبل مطور الوحدة.',
      cs: 'Pokud je zaškrtnuto, zobrazí se předběžná vydání. Předběžná vydání jsou verze, které vývojář modulu ještě neoznačil jako stabilní.',
      et: 'Kui märgitud, kuvatakse eeltõmmised. Eeltõmmised on versioonid, mida mooduli arendaja pole veel stabiilseks märkinud.',
      eu: 'Hautatuta, aurre-bertsioak erakusten dira. Aurre-bertsioak modulu-garatzaileak oraindik egonkortzat jo ez dituen bertsioak dira.',
      gl: 'Se está marcado, móstranse pre-lanzamentos. Os pre-lanzamentos son versións que o desenvolvedor do módulo aínda non marcou como estables.',
      hu: 'Ha be van jelölve, előzetes kiadások jelennek meg. Az előzetes kiadások olyan verziók, amelyeket a modul fejlesztője még nem jelölt stabilnak.',
      id: 'Jika dicentang, menampilkan pra-rilis. Pra-rilis adalah rilis yang belum dianggap stabil oleh pengembang modul.',
      ja: 'チェックするとプレリリースが表示されます。プレリリースは、モジュール開発者がまだ安定版とみなしていないリリースです。',
      lt: 'Pažymėjus rodomi priešleidimai. Priešleidimai yra leidimai, kurių modulio kūrėjas dar nepažymėjo kaip stabilių.',
      pl: 'Po zaznaczeniu pokazuje wersje przedpremierowe. Wersje przedpremierowe to wersje, które deweloper modułu nie oznaczył jeszcze jako stabilne.',
      pt: 'Quando marcado, mostra pré-lançamentos. Pré-lançamentos são versões que o desenvolvedor do módulo ainda não marcou como estáveis.',
      ru: 'Если отмечено, показываются предрелизы. Предрелизы — это версии, которые разработчик модуля ещё не отметил как стабильные.',
      sq: 'Kur është i zgjedhur, shfaq parapublikimet. Parapublikimet janë versione që zhvilluesi i modulit nuk i ka shënuar ende si të qëndrueshme.',
      sr: 'Kada je označeno, prikazuje prethodna izdanja. Prethodna izdanja su izdanja koja programer modula još nije označio kao stabilna.',
      tr: 'Seçildiğinde ön sürümler gösterilir. Ön sürümler, modül geliştiricisinin henüz kararlı olarak işaretlemediği sürümlerdir.',
      'zh-Hans':
        '选中时显示预发布版本。预发布版本是模块开发者尚未标记为稳定的版本。',
      'zh-Hant':
        '勾選時顯示預發布版本。預發布版本是模組開發者尚未標記為穩定的版本。',
    }),
    search_for_a_module: t({
      en: 'Search for a module',
      nl: 'Zoek een module',
      fr: 'Rechercher un module',
      de: 'Nach einem Modul suchen',
      es: 'Buscar un módulo',
      it: 'Cerca un modulo',
      ar: 'ابحث عن وحدة',
      cs: 'Hledat modul',
      et: 'Otsi moodulit',
      eu: 'Bilatu modulua',
      gl: 'Buscar un módulo',
      hu: 'Modul keresése',
      id: 'Cari modul',
      ja: 'モジュールを検索',
      lt: 'Ieškoti modulio',
      pl: 'Szukaj modułu',
      pt: 'Pesquisar um módulo',
      ru: 'Поиск модуля',
      sq: 'Kërko për një modul',
      sr: 'Pretraži modul',
      tr: 'Modül ara',
      'zh-Hans': '搜索模块',
      'zh-Hant': '搜尋模組',
    }),
    no_modules_found: t({
      en: 'No modules found',
      nl: 'Geen modules gevonden',
      fr: 'Aucun module trouvé',
      de: 'Keine Module gefunden',
      es: 'No se encontraron módulos',
      it: 'Nessun modulo trovato',
      ar: 'لم يتم العثور على وحدات',
      cs: 'Nebyly nalezeny žádné moduly',
      et: 'Mooduleid ei leitud',
      eu: 'Ez da modulurik aurkitu',
      gl: 'Non se atoparon módulos',
      hu: 'Nem található modul',
      id: 'Tidak ada modul ditemukan',
      ja: 'モジュールが見つかりません',
      lt: 'Modulių nerasta',
      pl: 'Nie znaleziono modułów',
      pt: 'Nenhum módulo encontrado',
      ru: 'Модули не найдены',
      sq: 'Nuk u gjet asnjë modul',
      sr: 'Nema pronađenih modula',
      tr: 'Modül bulunamadı',
      'zh-Hans': '未找到模块',
      'zh-Hant': '找不到模組',
    }),
    installed_version: t({
      en: insert('Installed {{version}}'),
      nl: insert('Geïnstalleerd {{version}}'),
      fr: insert('Installé {{version}}'),
      de: insert('Installiert {{version}}'),
      es: insert('Instalado {{version}}'),
      it: insert('Installato {{version}}'),
      ar: insert('تم التثبيت {{version}}'),
      cs: insert('Nainstalováno {{version}}'),
      et: insert('Paigaldatud {{version}}'),
      eu: insert('Instalatuta {{version}}'),
      gl: insert('Instalado {{version}}'),
      hu: insert('Telepítve {{version}}'),
      id: insert('Terpasang {{version}}'),
      ja: insert('インストール済み {{version}}'),
      lt: insert('Įdiegta {{version}}'),
      pl: insert('Zainstalowano {{version}}'),
      pt: insert('Instalado {{version}}'),
      ru: insert('Установлено {{version}}'),
      sq: insert('Instaluar {{version}}'),
      sr: insert('Instalirano {{version}}'),
      tr: insert('Yüklendi {{version}}'),
      'zh-Hans': insert('已安装 {{version}}'),
      'zh-Hant': insert('已安裝 {{version}}'),
    }),
    latest_installed_version: t({
      en: insert('Latest installed {{version}}'),
      nl: insert('Nieuwste geïnstalleerde {{version}}'),
      fr: insert('Dernière version installée {{version}}'),
      de: insert('Neueste installierte {{version}}'),
      es: insert('Última instalada {{version}}'),
      it: insert('Ultima installata {{version}}'),
      ar: insert('أحدث إصدار مثبت {{version}}'),
      cs: insert('Nejnovější nainstalovaná {{version}}'),
      et: insert('Viimane paigaldatud {{version}}'),
      eu: insert('Instalatuta azkena {{version}}'),
      gl: insert('Última instalada {{version}}'),
      hu: insert('Legutóbb telepített {{version}}'),
      id: insert('Terbaru terpasang {{version}}'),
      ja: insert('最新インストール済み {{version}}'),
      lt: insert('Naujausia įdiegta {{version}}'),
      pl: insert('Najnowsza zainstalowana {{version}}'),
      pt: insert('Mais recente instalada {{version}}'),
      ru: insert('Последняя установленная {{version}}'),
      sq: insert('Versioni më i fundit i instaluar {{version}}'),
      sr: insert('Najnovije instalirano {{version}}'),
      tr: insert('En son yüklenen {{version}}'),
      'zh-Hans': insert('最新已安装 {{version}}'),
      'zh-Hant': insert('最新已安裝 {{version}}'),
    }),
    latest_version_on_with_downloads: t({
      en: insert(
        'Latest {{latestVersion}} on {{publishedAt}} with {{downloads}} downloads',
      ),
      nl: insert(
        'Laatste {{latestVersion}} op {{publishedAt}} met {{downloads}} downloads',
      ),
      fr: insert(
        'Dernière {{latestVersion}} le {{publishedAt}} avec {{downloads}} téléchargements',
      ),
      de: insert(
        'Neueste {{latestVersion}} am {{publishedAt}} mit {{downloads}} Downloads',
      ),
      es: insert(
        'Última {{latestVersion}} el {{publishedAt}} con {{downloads}} descargas',
      ),
      it: insert(
        'Ultima {{latestVersion}} il {{publishedAt}} con {{downloads}} download',
      ),
      ar: insert(
        'الأحدث {{latestVersion}} في {{publishedAt}} مع {{downloads}} تنزيلات',
      ),
      cs: insert(
        'Nejnovější {{latestVersion}} dne {{publishedAt}} s {{downloads}} staženími',
      ),
      et: insert(
        'Viimane {{latestVersion}} kuupäeval {{publishedAt}} koos {{downloads}} allalaadimisega',
      ),
      eu: insert(
        'Azkena {{latestVersion}} {{publishedAt}}an {{downloads}} deskarga',
      ),
      gl: insert(
        'Última {{latestVersion}} o {{publishedAt}} con {{downloads}} descargas',
      ),
      hu: insert(
        'Legújabb: {{latestVersion}} ekkor: {{publishedAt}}, letöltések száma: {{downloads}}',
      ),
      id: insert(
        'Terbaru {{latestVersion}} pada {{publishedAt}} dengan {{downloads}} unduhan',
      ),
      ja: insert(
        '最新 {{latestVersion}}（{{publishedAt}}、{{downloads}} ダウンロード）',
      ),
      lt: insert(
        'Naujausia {{latestVersion}} {{publishedAt}} su {{downloads}} atsisiuntimų',
      ),
      pl: insert(
        'Najnowsza {{latestVersion}} w dniu {{publishedAt}} z {{downloads}} pobrań',
      ),
      pt: insert(
        'Última {{latestVersion}} em {{publishedAt}} com {{downloads}} downloads',
      ),
      ru: insert(
        'Последняя {{latestVersion}} от {{publishedAt}}, {{downloads}} загрузок',
      ),
      sq: insert(
        'Më e fundit {{latestVersion}} më {{publishedAt}} me {{downloads}} shkarkime',
      ),
      sr: insert(
        'Najnovije {{latestVersion}} dana {{publishedAt}} sa {{downloads}} preuzimanja',
      ),
      tr: insert(
        'En son {{latestVersion}} {{publishedAt}} tarihinde {{downloads}} indirme ile',
      ),
      'zh-Hans': insert(
        '最新 {{latestVersion}} 于 {{publishedAt}}，下载量 {{downloads}}',
      ),
      'zh-Hant': insert(
        '最新 {{latestVersion}} 於 {{publishedAt}}，下載次數 {{downloads}}',
      ),
    }),
    latest_beta_version_on_with_downloads: t({
      en: insert(
        'Latest beta {{latestVersion}} on {{publishedAt}} with {{downloads}} downloads',
      ),
      nl: insert(
        'Laatste beta {{latestVersion}} op {{publishedAt}} met {{downloads}} downloads',
      ),
      fr: insert(
        'Dernière bêta {{latestVersion}} le {{publishedAt}} avec {{downloads}} téléchargements',
      ),
      de: insert(
        'Neueste Beta {{latestVersion}} am {{publishedAt}} mit {{downloads}} Downloads',
      ),
      es: insert(
        'Última beta {{latestVersion}} el {{publishedAt}} con {{downloads}} descargas',
      ),
      it: insert(
        'Ultima beta {{latestVersion}} il {{publishedAt}} con {{downloads}} download',
      ),
      ar: insert(
        'أحدث إصدار تجريبي {{latestVersion}} في {{publishedAt}} مع {{downloads}} تنزيلات',
      ),
      cs: insert(
        'Nejnovější beta {{latestVersion}} dne {{publishedAt}} s {{downloads}} staženími',
      ),
      et: insert(
        'Viimane beetaversioon {{latestVersion}} kuupäeval {{publishedAt}} koos {{downloads}} allalaadimisega',
      ),
      eu: insert(
        'Azken beta {{latestVersion}} {{publishedAt}}an {{downloads}} deskarga',
      ),
      gl: insert(
        'Última beta {{latestVersion}} o {{publishedAt}} con {{downloads}} descargas',
      ),
      hu: insert(
        'Legújabb béta: {{latestVersion}} ekkor: {{publishedAt}}, letöltések száma: {{downloads}}',
      ),
      id: insert(
        'Beta terbaru {{latestVersion}} pada {{publishedAt}} dengan {{downloads}} unduhan',
      ),
      ja: insert(
        '最新ベータ {{latestVersion}}（{{publishedAt}}、{{downloads}} ダウンロード）',
      ),
      lt: insert(
        'Naujausia beta {{latestVersion}} {{publishedAt}} su {{downloads}} atsisiuntimų',
      ),
      pl: insert(
        'Najnowsza beta {{latestVersion}} w dniu {{publishedAt}} z {{downloads}} pobrań',
      ),
      pt: insert(
        'Última beta {{latestVersion}} em {{publishedAt}} com {{downloads}} downloads',
      ),
      ru: insert(
        'Последняя бета {{latestVersion}} от {{publishedAt}}, {{downloads}} загрузок',
      ),
      sq: insert(
        'Beta më e fundit {{latestVersion}} më {{publishedAt}} me {{downloads}} shkarkime',
      ),
      sr: insert(
        'Najnovija beta {{latestVersion}} dana {{publishedAt}} sa {{downloads}} preuzimanja',
      ),
      tr: insert(
        'En son beta {{latestVersion}} {{publishedAt}} tarihinde {{downloads}} indirme ile',
      ),
      'zh-Hans': insert(
        '最新测试版 {{latestVersion}} 于 {{publishedAt}}，下载量 {{downloads}}',
      ),
      'zh-Hant': insert(
        '最新測試版 {{latestVersion}} 於 {{publishedAt}}，下載次數 {{downloads}}',
      ),
    }),
    latest_stable_with_download_and_beta: t({
      en: insert(
        'Latest stable {{latestVersion}} on {{publishedAt}} with {{downloads}} downloads, latest beta {{latestBetaVersion}} on {{latestBetaPublishedAt}}',
      ),
      nl: insert(
        'Laatste stable {{latestVersion}} op {{publishedAt}} met {{downloads}} downloads, laatste beta {{latestBetaVersion}} op {{latestBetaPublishedAt}}',
      ),
      fr: insert(
        'Dernière stable {{latestVersion}} le {{publishedAt}} avec {{downloads}} téléchargements, dernière bêta {{latestBetaVersion}} le {{latestBetaPublishedAt}}',
      ),
      de: insert(
        'Neueste stabile {{latestVersion}} am {{publishedAt}} mit {{downloads}} Downloads, neueste Beta {{latestBetaVersion}} am {{latestBetaPublishedAt}}',
      ),
      es: insert(
        'Última estable {{latestVersion}} el {{publishedAt}} con {{downloads}} descargas, última beta {{latestBetaVersion}} el {{latestBetaPublishedAt}}',
      ),
      it: insert(
        'Ultima stabile {{latestVersion}} il {{publishedAt}} con {{downloads}} download, ultima beta {{latestBetaVersion}} il {{latestBetaPublishedAt}}',
      ),
      ar: insert(
        'أحدث إصدار مستقر {{latestVersion}} في {{publishedAt}} مع {{downloads}} تنزيلات، أحدث إصدار تجريبي {{latestBetaVersion}} في {{latestBetaPublishedAt}}',
      ),
      cs: insert(
        'Nejnovější stabilní {{latestVersion}} dne {{publishedAt}} s {{downloads}} staženími, nejnovější beta {{latestBetaVersion}} dne {{latestBetaPublishedAt}}',
      ),
      et: insert(
        'Viimane stabiilne {{latestVersion}} kuupäeval {{publishedAt}} koos {{downloads}} allalaadimisega, viimane beetaversioon {{latestBetaVersion}} kuupäeval {{latestBetaPublishedAt}}',
      ),
      eu: insert(
        'Azken egonkorra {{latestVersion}} {{publishedAt}}an {{downloads}} deskargarekin, azken beta {{latestBetaVersion}} {{latestBetaPublishedAt}}',
      ),
      gl: insert(
        'Última estable {{latestVersion}} o {{publishedAt}} con {{downloads}} descargas, última beta {{latestBetaVersion}} o {{latestBetaPublishedAt}}',
      ),
      hu: insert(
        'Legújabb stabil: {{latestVersion}} ekkor: {{publishedAt}}, letöltések: {{downloads}}; legújabb béta: {{latestBetaVersion}} ekkor: {{latestBetaPublishedAt}}',
      ),
      id: insert(
        'Stabil terbaru {{latestVersion}} pada {{publishedAt}} dengan {{downloads}} unduhan, beta terbaru {{latestBetaVersion}} pada {{latestBetaPublishedAt}}',
      ),
      ja: insert(
        '最新安定版 {{latestVersion}}（{{publishedAt}}、{{downloads}} ダウンロード）、最新ベータ {{latestBetaVersion}}（{{latestBetaPublishedAt}}）',
      ),
      lt: insert(
        'Naujausia stabili {{latestVersion}} {{publishedAt}} su {{downloads}} atsisiuntimų, naujausia beta {{latestBetaVersion}} {{latestBetaPublishedAt}}',
      ),
      pl: insert(
        'Najnowsza stabilna {{latestVersion}} w dniu {{publishedAt}} z {{downloads}} pobrań, najnowsza beta {{latestBetaVersion}} w dniu {{latestBetaPublishedAt}}',
      ),
      pt: insert(
        'Última estável {{latestVersion}} em {{publishedAt}} com {{downloads}} downloads, última beta {{latestBetaVersion}} em {{latestBetaPublishedAt}}',
      ),
      ru: insert(
        'Последняя стабильная {{latestVersion}} от {{publishedAt}}, {{downloads}} загрузок, последняя бета {{latestBetaVersion}} от {{latestBetaPublishedAt}}',
      ),
      sq: insert(
        'Stabile më e fundit {{latestVersion}} më {{publishedAt}} me {{downloads}} shkarkime, beta më e fundit {{latestBetaVersion}} më {{latestBetaPublishedAt}}',
      ),
      sr: insert(
        'Najnovija stabilna {{latestVersion}} dana {{publishedAt}} sa {{downloads}} preuzimanja, najnovija beta {{latestBetaVersion}} dana {{latestBetaPublishedAt}}',
      ),
      tr: insert(
        'En son kararlı {{latestVersion}} {{publishedAt}} tarihinde {{downloads}} indirme ile, en son beta {{latestBetaVersion}} {{latestBetaPublishedAt}}',
      ),
      'zh-Hans': insert(
        '最新稳定版 {{latestVersion}} 于 {{publishedAt}}，下载量 {{downloads}}，最新测试版 {{latestBetaVersion}} 于 {{latestBetaPublishedAt}}',
      ),
      'zh-Hant': insert(
        '最新穩定版 {{latestVersion}} 於 {{publishedAt}}，下載次數 {{downloads}}，最新測試版 {{latestBetaVersion}} 於 {{latestBetaPublishedAt}}',
      ),
    }),
    latest_stable_and_beta_with_downloads: t({
      en: insert(
        'Latest stable {{latestVersion}} on {{publishedAt}}, latest beta {{latestBetaVersion}} on {{latestBetaPublishedAt}} with {{downloads}} downloads',
      ),
      nl: insert(
        'Laatste stable {{latestVersion}} op {{publishedAt}}, laatste beta {{latestBetaVersion}} op {{latestBetaPublishedAt}} met {{downloads}} downloads',
      ),
      fr: insert(
        'Dernière stable {{latestVersion}} le {{publishedAt}}, dernière bêta {{latestBetaVersion}} le {{latestBetaPublishedAt}} avec {{downloads}} téléchargements',
      ),
      de: insert(
        'Neueste stabile {{latestVersion}} am {{publishedAt}}, neueste Beta {{latestBetaVersion}} am {{latestBetaPublishedAt}} mit {{downloads}} Downloads',
      ),
      es: insert(
        'Última estable {{latestVersion}} el {{publishedAt}}, última beta {{latestBetaVersion}} el {{latestBetaPublishedAt}} con {{downloads}} descargas',
      ),
      it: insert(
        'Ultima stabile {{latestVersion}} il {{publishedAt}}, ultima beta {{latestBetaVersion}} il {{latestBetaPublishedAt}} con {{downloads}} download',
      ),
      ar: insert(
        'أحدث إصدار مستقر {{latestVersion}} في {{publishedAt}}، أحدث إصدار تجريبي {{latestBetaVersion}} في {{latestBetaPublishedAt}} مع {{downloads}} تنزيلات',
      ),
      cs: insert(
        'Nejnovější stabilní {{latestVersion}} dne {{publishedAt}}, nejnovější beta {{latestBetaVersion}} dne {{latestBetaPublishedAt}} s {{downloads}} staženími',
      ),
      et: insert(
        'Viimane stabiilne {{latestVersion}} kuupäeval {{publishedAt}}, viimane beetaversioon {{latestBetaVersion}} kuupäeval {{latestBetaPublishedAt}} koos {{downloads}} allalaadimisega',
      ),
      eu: insert(
        'Azken egonkorra {{latestVersion}} {{publishedAt}}an, azken beta {{latestBetaVersion}} {{latestBetaPublishedAt}}an {{downloads}} deskargarekin',
      ),
      gl: insert(
        'Última estable {{latestVersion}} o {{publishedAt}}, última beta {{latestBetaVersion}} o {{latestBetaPublishedAt}} con {{downloads}} descargas',
      ),
      hu: insert(
        'Legújabb stabil: {{latestVersion}} ekkor: {{publishedAt}}, legújabb béta: {{latestBetaVersion}} ekkor: {{latestBetaPublishedAt}}, letöltések: {{downloads}}',
      ),
      id: insert(
        'Stabil terbaru {{latestVersion}} pada {{publishedAt}}, beta terbaru {{latestBetaVersion}} pada {{latestBetaPublishedAt}} dengan {{downloads}} unduhan',
      ),
      ja: insert(
        '最新安定版 {{latestVersion}}（{{publishedAt}}）、最新ベータ {{latestBetaVersion}}（{{latestBetaPublishedAt}}、{{downloads}} ダウンロード）',
      ),
      lt: insert(
        'Naujausia stabili {{latestVersion}} {{publishedAt}}, naujausia beta {{latestBetaVersion}} {{latestBetaPublishedAt}} su {{downloads}} atsisiuntimų',
      ),
      pl: insert(
        'Najnowsza stabilna {{latestVersion}} w dniu {{publishedAt}}, najnowsza beta {{latestBetaVersion}} w dniu {{latestBetaPublishedAt}} z {{downloads}} pobrań',
      ),
      pt: insert(
        'Última estável {{latestVersion}} em {{publishedAt}}, última beta {{latestBetaVersion}} em {{latestBetaPublishedAt}} com {{downloads}} downloads',
      ),
      ru: insert(
        'Последняя стабильная {{latestVersion}} от {{publishedAt}}, последняя бета {{latestBetaVersion}} от {{latestBetaPublishedAt}}, {{downloads}} загрузок',
      ),
      sq: insert(
        'Stabile më e fundit {{latestVersion}} më {{publishedAt}}, beta më e fundit {{latestBetaVersion}} më {{latestBetaPublishedAt}} me {{downloads}} shkarkime',
      ),
      sr: insert(
        'Najnovija stabilna {{latestVersion}} dana {{publishedAt}}, najnovija beta {{latestBetaVersion}} dana {{latestBetaPublishedAt}} sa {{downloads}} preuzimanja',
      ),
      tr: insert(
        'En son kararlı {{latestVersion}} {{publishedAt}} tarihinde, en son beta {{latestBetaVersion}} {{latestBetaPublishedAt}} tarihinde {{downloads}} indirme ile',
      ),
      'zh-Hans': insert(
        '最新稳定版 {{latestVersion}} 于 {{publishedAt}}，最新测试版 {{latestBetaVersion}} 于 {{latestBetaPublishedAt}}，下载量 {{downloads}}',
      ),
      'zh-Hant': insert(
        '最新穩定版 {{latestVersion}} 於 {{publishedAt}}，最新測試版 {{latestBetaVersion}} 於 {{latestBetaPublishedAt}}，下載次數 {{downloads}}',
      ),
    }),
    by_maintainer: t({
      en: insert('by {{maintainer}}'),
      nl: insert('door {{maintainer}}'),
      fr: insert('par {{maintainer}}'),
      de: insert('von {{maintainer}}'),
      es: insert('por {{maintainer}}'),
      it: insert('da {{maintainer}}'),
      ar: insert('بواسطة {{maintainer}}'),
      cs: insert('od {{maintainer}}'),
      et: insert('{{maintainer}} poolt'),
      eu: insert('{{maintainer}} arabera'),
      gl: insert('por {{maintainer}}'),
      hu: insert('{{maintainer}} által'),
      id: insert('oleh {{maintainer}}'),
      ja: insert('{{maintainer}} 作成者'),
      lt: insert('{{maintainer}} sukūrė'),
      pl: insert('przez {{maintainer}}'),
      pt: insert('por {{maintainer}}'),
      ru: insert('от {{maintainer}}'),
      sq: insert('nga {{maintainer}}'),
      sr: insert('od {{maintainer}}'),
      tr: insert('{{maintainer}} tarafından'),
      'zh-Hans': insert('由 {{maintainer}}'),
      'zh-Hant': insert('由 {{maintainer}}'),
    }),
    information_panel: t({
      en: md(`### Information on the module library panel

Use it to browse and search for available JASP modules and to install, update, uninstall JASP modules.

The modules are divided into channels:

- **Official** - Modules officially supported by the JASP team
- **Community** - Modules contributed by the JASP community

A module can have a beta version of it. A beta version is used for testing new modules or new features in existing modules before they are released as a stable version.
Use the "Show betas" checkbox to show or hide beta versions.

This panel was made as part of the [JASP-MOD project](https://research-software-directory.org/projects/jasp-mod).`),
      nl: md(`### Informatie over het modulebibliotheekpaneel
  
Gebruik het om beschikbare JASP-modules te bekijken en te zoeken en om JASP-modules te installeren, bij te werken en te verwijderen.

De modules zijn verdeeld in kanalen:

- **Officieel** - Modules die officieel door het JASP-team worden ondersteund
- **Community** - Modules die door de JASP-community worden bijgedragen

Een module kan een bètaversie hebben. Een bètaversie wordt gebruikt om nieuwe modules of nieuwe functies in bestaande modules te testen voordat ze als stabiele versie worden uitgebracht.
Gebruik het selectievakje "Toon Betas" om bètaversies te tonen of te verbergen.

Dit paneel is gemaakt als onderdeel van het [JASP-MOD project](https://research-software-directory.org/projects/jasp-mod).`),
      fr: md(`### Informations sur le panneau de bibliothèque de modules

Utilisez-le pour parcourir et rechercher les modules JASP disponibles et pour installer, mettre à jour et désinstaller les modules JASP.

Les modules sont répartis en canaux :

- **Officiel** - Modules officiellement pris en charge par l’équipe JASP
- **Communauté** - Modules contribué par la communauté JASP

Un module peut avoir une version bêta. Une version bêta est utilisée pour tester de nouveaux modules ou de nouvelles fonctionnalités dans des modules existants avant leur sortie en version stable.
Utilisez la case « Afficher les pré-versions » pour afficher ou masquer les versions bêta.

Ce panneau a été réalisé dans le cadre du [projet JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      de: md(`### Informationen zum Modulbibliothek-Panel

Verwenden Sie es, um verfügbare JASP-Module zu durchsuchen und zu suchen sowie JASP-Module zu installieren, zu aktualisieren und zu deinstallieren.

Die Module sind in Kanäle unterteilt:

- **Offiziell** - Module, die vom JASP-Team offiziell unterstützt werden
- **Community** - Module, die von der JASP-Community beigesteuert werden

Ein Modul kann eine Beta-Version haben. Eine Beta-Version wird verwendet, um neue Module oder neue Funktionen in bestehenden Modulen zu testen, bevor sie als stabile Version veröffentlicht werden.
Verwenden Sie das Kontrollkästchen „Vorabversionen anzeigen“, um Beta-Versionen ein- oder auszublenden.

Dieses Panel wurde im Rahmen des [JASP-MOD-Projekts](https://research-software-directory.org/projects/jasp-mod) erstellt.`),
      es: md(`### Información sobre el panel de la biblioteca de módulos

Úselo para explorar y buscar módulos JASP disponibles y para instalar, actualizar y desinstalar módulos JASP.

Los módulos se dividen en canales:

- **Oficial** - Módulos oficialmente respaldados por el equipo de JASP
- **Comunidad** - Módulos aportados por la comunidad de JASP

Un módulo puede tener una versión beta. Una versión beta se usa para probar nuevos módulos o nuevas funciones en módulos existentes antes de que se publiquen como versión estable.
Use la casilla "Mostrar pre-lanzamientos" para mostrar u ocultar las versiones beta.

Este panel se creó como parte del [proyecto JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      it: md(`### Informazioni sul pannello della libreria dei moduli

Usalo per sfogliare e cercare i moduli JASP disponibili e per installare, aggiornare e disinstallare i moduli JASP.

I moduli sono divisi in canali:

- **Ufficiale** - Moduli ufficialmente supportati dal team JASP
- **Community** - Moduli contribuiti dalla community JASP

Un modulo può avere una versione beta. Una versione beta viene usata per testare nuovi moduli o nuove funzionalità in moduli esistenti prima che vengano rilasciati come versione stabile.
Usa la casella "Mostra pre-release" per mostrare o nascondere le versioni beta.

Questo pannello è stato realizzato come parte del [progetto JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      ar: md(`### معلومات حول لوحة مكتبة الوحدات

استخدمها لاستعراض وحدات JASP المتاحة والبحث عنها ولتثبيت وحدات JASP وتحديثها وإلغاء تثبيتها.

تنقسم الوحدات إلى قنوات:

- **رسمي** - وحدات مدعومة رسميًا من فريق JASP
- **مجتمعي** - وحدات ساهمت بها مجتمع JASP

يمكن أن تمتلك الوحدة إصدارًا تجريبيًا. يُستخدم الإصدار التجريبي لاختبار وحدات جديدة أو ميزات جديدة في وحدات موجودة قبل إصدارها كنسخة مستقرة.
استخدم مربع الاختيار "إظهار الإصدارات التجريبية" لإظهار أو إخفاء الإصدارات التجريبية.

تم إنشاء هذه اللوحة كجزء من [مشروع JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      cs: md(`### Informace o panelu knihovny modulů

Použijte jej k procházení a vyhledávání dostupných modulů JASP a k instalaci, aktualizaci a odinstalaci modulů JASP.

Moduly jsou rozděleny do kanálů:

- **Oficiální** - Moduly oficiálně podporované týmem JASP
- **Community** - Moduly přispěné komunitou JASP

Modul může mít beta verzi. Beta verze slouží k testování nových modulů nebo nových funkcí ve stávajících modulech před jejich vydáním jako stabilní verze.
Použijte zaškrtávací políčko „Zobrazit předběžná vydání“ k zobrazení nebo skrytí beta verzí.

Tento panel byl vytvořen jako součást [projektu JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      et: md(`### Teave mooduliteekogu paneeli kohta

Kasutage seda saadaolevate JASP-moodulite sirvimiseks ja otsimiseks ning JASP-moodulite installimiseks, värskendamiseks ja eemaldamiseks.

Moodulid on jaotatud kanalitesse:

- **Ametlik** - JASP-tiimi poolt ametlikult toetatud moodulid
- **Community** - JASP-kogukonna panustatud moodulid

Moodulil võib olla beetaversioon. Beetaversiooni kasutatakse uute moodulite või uute funktsioonide testimiseks olemasolevates moodulites enne nende väljaandmist stabiilse versioonina.
Kasutage märkeruutu "Kuva eeltõmmised", et kuvada või peita beetaversioonid.

See paneel loodi [JASP-MOD projekti](https://research-software-directory.org/projects/jasp-mod) osana.`),
      eu: md(`### Moduluen liburutegi panelari buruzko informazioa

Erabili eskuragarri dauden JASP moduluak arakatzeko eta bilatzeko, eta JASP moduluak instalatzeko, eguneratzeko eta desinstalatzeko.

Moduluak kanaletan banatuta daude:

- **Ofiziala** - JASP taldeak ofizialki babestutako moduluak
- **Community** - JASP komunitateak ekarritako moduluak

Modulu batek beta bertsioa izan dezake. Beta bertsioa modulu berriak edo lehendik dauden moduluetako funtzio berriak probatzeko erabiltzen da, bertsio egonkor gisa argitaratu aurretik.
Erabili "Erakutsi aurre-bertsioak" kontrol-laukia beta bertsioak erakusteko edo ezkutatzeko.

Panel hau [JASP-MOD proiektuaren](https://research-software-directory.org/projects/jasp-mod) barruan egin da.`),
      gl: md(`### Información sobre o panel da biblioteca de módulos

Úsao para explorar e buscar módulos JASP dispoñibles e para instalar, actualizar e desinstalar módulos JASP.

Os módulos divídense en canles:

- **Oficial** - Módulos oficialmente apoiados polo equipo de JASP
- **Community** - Módulos contribuídos pola comunidade de JASP

Un módulo pode ter unha versión beta. Unha versión beta úsase para probar novos módulos ou novas funcións en módulos existentes antes de que se publiquen como versión estable.
Usa a caixa "Mostrar pre-lanzamentos" para mostrar ou ocultar as versións beta.

Este panel fíxose como parte do [proxecto JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      hu: md(`### Információ a modulkönyvtár panelről

Használja az elérhető JASP modulok böngészésére és keresésére, valamint a JASP modulok telepítésére, frissítésére és eltávolítására.

A modulok csatornákra vannak osztva:

- **Hivatalos** - A JASP csapata által hivatalosan támogatott modulok
- **Közösségi** - A JASP közösség által hozzájárult modulok

Egy modulnak lehet béta verziója. A béta verziót új modulok vagy meglévő modulok új funkcióinak tesztelésére használják, mielőtt stabil verzióként megjelennének.
Az "Előzetes kiadások megjelenítése" jelölőnégyzettel jelenítheti meg vagy rejtheti el a béta verziókat.

Ez a panel a [JASP-MOD projekt](https://research-software-directory.org/projects/jasp-mod) részeként készült.`),
      id: md(`### Informasi tentang panel pustaka modul

Gunakan panel ini untuk menelusuri dan mencari modul JASP yang tersedia serta untuk memasang, memperbarui, dan menghapus pemasangan modul JASP.

Modul dibagi ke dalam saluran:

- **Resmi** - Modul yang didukung secara resmi oleh tim JASP
- **Community** - Modul yang disumbangkan oleh komunitas JASP

Sebuah modul dapat memiliki versi beta. Versi beta digunakan untuk menguji modul baru atau fitur baru pada modul yang ada sebelum dirilis sebagai versi stabil.
Gunakan kotak centang "Tampilkan pra-rilis" untuk menampilkan atau menyembunyikan versi beta.

Panel ini dibuat sebagai bagian dari [proyek JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      ja: md(`### モジュールライブラリパネルについて

利用可能なJASPモジュールを閲覧・検索し、JASPモジュールのインストール、更新、アンインストールを行うために使用します。

モジュールはチャネルに分かれています：

- **Official** - JASPチームが公式にサポートするモジュール
- **Community** - JASPコミュニティが提供するモジュール

モジュールにはベータ版がある場合があります。ベータ版は、新しいモジュールや既存モジュールの新機能を、安定版としてリリースする前にテストするために使われます。
「プレリリースを表示」のチェックボックスでベータ版の表示/非表示を切り替えます。

このパネルは[JASP-MODプロジェクト](https://research-software-directory.org/projects/jasp-mod)の一環として作成されました。`),
      lt: md(`### Informacija apie modulių bibliotekos skydelį

Naudokite jį norėdami naršyti ir ieškoti prieinamų JASP modulių bei diegti, atnaujinti ir pašalinti JASP modulius.

Moduliai skirstomi į kanalus:

- **Oficialūs** - Oficialiai JASP komandos palaikomi moduliai
- **Community** - JASP bendruomenės pateikti moduliai

Modulis gali turėti beta versiją. Beta versija naudojama naujiems moduliams ar naujoms funkcijoms esamuose moduliuose testuoti prieš išleidžiant kaip stabilią versiją.
Naudokite žymimąjį langelį „Rodyti priešleidimus“, kad rodytumėte arba paslėptumėte beta versijas.

Šis skydelis buvo sukurtas kaip [JASP-MOD projekto](https://research-software-directory.org/projects/jasp-mod) dalis.`),
      pl: md(`### Informacje o panelu biblioteki modułów

Użyj go do przeglądania i wyszukiwania dostępnych modułów JASP oraz do instalowania, aktualizowania i odinstalowywania modułów JASP.

Moduły są podzielone na kanały:

- **Oficjalne** - Moduły oficjalnie wspierane przez zespół JASP
- **Społeczność** - Moduły wniesione przez społeczność JASP

Moduł może mieć wersję beta. Wersja beta służy do testowania nowych modułów lub nowych funkcji w istniejących modułach przed wydaniem jako wersja stabilna.
Użyj pola wyboru „Pokaż wersje przedpremierowe”, aby pokazać lub ukryć wersje beta.

Ten panel został utworzony jako część [projektu JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      pt: md(`### Informações sobre o painel da biblioteca de módulos

Use-o para navegar e procurar módulos JASP disponíveis e para instalar, atualizar e desinstalar módulos JASP.

Os módulos são divididos em canais:

- **Oficial** - Módulos oficialmente suportados pela equipe JASP
- **Community** - Módulos contribuídos pela comunidade JASP

Um módulo pode ter uma versão beta. Uma versão beta é usada para testar novos módulos ou novos recursos em módulos existentes antes de serem lançados como versão estável.
Use a caixa de seleção "Mostrar pré-lançamentos" para mostrar ou ocultar versões beta.

Este painel foi feito como parte do [projeto JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      ru: md(`### Информация о панели библиотеки модулей

Используйте её для просмотра и поиска доступных модулей JASP, а также для установки, обновления и удаления модулей JASP.

Модули разделены на каналы:

- **Официальные** - Модули, официально поддерживаемые командой JASP
- **Community** - Модули, внесённые сообществом JASP

Модуль может иметь бета-версию. Бета-версия используется для тестирования новых модулей или новых функций в существующих модулях перед выпуском в стабильной версии.
Используйте флажок «Показать предрелизы», чтобы показывать или скрывать бета-версии.

Эта панель создана в рамках [проекта JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      sq: md(`### Informacion mbi panelin e bibliotekës së moduleve

Përdoreni për të shfletuar dhe kërkuar modulet JASP të disponueshme dhe për të instaluar, përditësuar dhe çinstaluar modulet JASP.

Modulet ndahen në kanale:

- **Zyrtar** - Module të mbështetura zyrtarisht nga ekipi i JASP
- **Community** - Module të kontribuara nga komuniteti i JASP

Një modul mund të ketë një version beta. Versioni beta përdoret për të testuar module të reja ose veçori të reja në module ekzistuese para se të publikohen si version i qëndrueshëm.
Përdorni kutinë e zgjedhjes "Shfaq parapublikimet" për të shfaqur ose fshehur versionet beta.

Ky panel u krijua si pjesë e [projektit JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      sr: md(`### Информације о панелу библиотеке модула

Користите га за преглед и претрагу доступних JASP модула и за инсталацију, ажурирање и деинсталацију JASP модула.

Модули су подељени у канале:

- **Званични** - Модули које званично подржава JASP тим
- **Community** - Модули које је допринела JASP заједница

Модул може имати бета верзију. Бета верзија се користи за тестирање нових модула или нових функција у постојећим модулима пре него што буду објављени као стабилна верзија.
Користите поље за потврду „Прикажи претходна издања“ да бисте приказали или сакрили бета верзије.

Овај панел је направљен као део [пројекта JASP-MOD](https://research-software-directory.org/projects/jasp-mod).`),
      tr: md(`### Modül kitaplığı paneli hakkında bilgi

Mevcut JASP modüllerini göz atmak ve aramak, ayrıca JASP modüllerini yüklemek, güncellemek ve kaldırmak için kullanın.

Modüller kanallara ayrılmıştır:

- **Resmî** - JASP ekibi tarafından resmî olarak desteklenen modüller
- **Community** - JASP topluluğu tarafından katkıda bulunulan modüller

Bir modülün beta sürümü olabilir. Beta sürümü, yeni modülleri veya mevcut modüllerdeki yeni özellikleri kararlı sürüm olarak yayımlanmadan önce test etmek için kullanılır.
Beta sürümlerini göstermek veya gizlemek için "Ön sürümleri göster" onay kutusunu kullanın.

Bu panel [JASP-MOD projesinin](https://research-software-directory.org/projects/jasp-mod) bir parçası olarak yapılmıştır.`),
      'zh-Hans': md(`### 关于模块库面板的信息

使用它来浏览和搜索可用的 JASP 模块，并安装、更新或卸载 JASP 模块。

模块分为以下渠道：

- **官方** - 由 JASP 团队官方支持的模块
- **社区** - 由 JASP 社区贡献的模块

模块可能有测试版。测试版用于在作为稳定版发布之前测试新模块或现有模块的新功能。
使用“显示预发布版本”复选框来显示或隐藏测试版。

此面板是 [JASP-MOD 项目](https://research-software-directory.org/projects/jasp-mod) 的一部分。`),
      'zh-Hant': md(`### 關於模組庫面板的資訊

使用它來瀏覽和搜尋可用的 JASP 模組，並安裝、更新或解除安裝 JASP 模組。

模組分為以下頻道：

- **官方** - 由 JASP 團隊官方支援的模組
- **社群** - 由 JASP 社群貢獻的模組

模組可能有測試版。測試版用於在作為穩定版發佈前測試新模組或現有模組的新功能。
使用「顯示預發布版本」核取方塊來顯示或隱藏測試版。

此面板是 [JASP-MOD 專案](https://research-software-directory.org/projects/jasp-mod) 的一部分。`),
    }),
  },
} satisfies Dictionary;

export default appContent;
