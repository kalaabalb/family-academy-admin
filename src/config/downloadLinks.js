const trimSlash = (value) => value.replace(/\/+$/, '');

const baseUrl = process.env.REACT_APP_DOWNLOAD_BASE_URL?.trim() || '';
const clientReleaseBase =
  process.env.REACT_APP_CLIENT_RELEASE_BASE_URL?.trim() ||
  'https://github.com/kalaabalb/family-academy-client/releases/download/v1.0.1';
const tvReleaseBase =
  process.env.REACT_APP_TV_RELEASE_BASE_URL?.trim() ||
  'https://github.com/kalaabalb/family-academy-client-tv/releases/download/v1.0.1';

const resolveDownloadUrl = (explicitUrl, relativePath, releaseBaseUrl) => {
  const explicit = explicitUrl?.trim();
  if (explicit) return explicit;

  if (baseUrl) {
    return `${trimSlash(baseUrl)}/${relativePath}`;
  }

  if (releaseBaseUrl) {
    return `${trimSlash(releaseBaseUrl)}/${relativePath}`;
  }

  return `/${relativePath}`;
};

export const downloadGroups = [
  {
    title: 'Client App',
    subtitle: 'For students, parents, and desktop users',
    accent: 'Client',
    items: [
      {
        label: 'Windows Installer',
        note: 'Best for most Windows users.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_CLIENT_WINDOWS_INSTALLER_URL,
          'downloads/client/FamilyAcademyInstaller.exe',
          clientReleaseBase,
        ),
      },
      {
        label: 'Windows Portable Zip',
        note: 'Portable build for manual extraction.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_CLIENT_WINDOWS_ZIP_URL,
          'downloads/client/family-academy-windows.zip',
          clientReleaseBase,
        ),
      },
      {
        label: 'macOS Zip',
        note: 'Native desktop bundle for Apple laptops.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_CLIENT_MACOS_URL,
          'downloads/client/family-academy-macos.zip',
          clientReleaseBase,
        ),
      },
      {
        label: 'Linux Tarball',
        note: 'Linux release bundle.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_CLIENT_LINUX_URL,
          'downloads/client/family-academy-linux.tar.gz',
          clientReleaseBase,
        ),
      },
      {
        label: 'Android APK Pack',
        note: 'Split APKs for direct install.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_CLIENT_ANDROID_ZIP_URL,
          'downloads/client/family-academy-android-apks.zip',
          clientReleaseBase,
        ),
      },
      {
        label: 'Play Store Bundle',
        note: 'AAB for store submission.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_CLIENT_ANDROID_AAB_URL,
          'downloads/client/family-academy-play-store.aab',
          clientReleaseBase,
        ),
      },
    ],
  },
  {
    title: 'TV App',
    subtitle: 'For Android TV and living-room displays',
    accent: 'TV',
    items: [
      {
        label: 'Android TV APK',
        note: 'Install on Android TV devices.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_TV_ANDROID_URL,
          'downloads/tv/tvapp-android-universal.apk',
          tvReleaseBase,
        ),
      },
      {
        label: 'Android TV Bundle',
        note: 'Store-ready bundle for TV release.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_TV_ANDROID_AAB_URL,
          'downloads/tv/tvapp-play-store.aab',
          tvReleaseBase,
        ),
      },
      {
        label: 'Linux TV Bundle',
        note: 'Desktop and kiosk-friendly release.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_TV_LINUX_URL,
          'downloads/tv/tvapp-linux.tar.gz',
          tvReleaseBase,
        ),
      },
      {
        label: 'macOS TV Zip',
        note: 'Apple desktop bundle for testing.',
        url: resolveDownloadUrl(
          process.env.REACT_APP_TV_MACOS_URL,
          'downloads/tv/tvapp-macos.zip',
          tvReleaseBase,
        ),
      },
    ],
  },
];
